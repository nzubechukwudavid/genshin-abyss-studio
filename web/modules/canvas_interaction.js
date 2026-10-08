/**
 * Canvas Drag & Pan Interaction ES Module for Genshin Abyss Studio.
 * Handles mouse and touch drag-to-pan, pinch/scroll-to-zoom,
 * and character slot selection on the 1080p preview canvas.
 */

export function setupCanvasInteraction() {
  const getCanvasCoords = (e) => {
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    return {
      x: (e.clientX - rect.left) * scale,
      y: (e.clientY - rect.top) * scale
    };
  };

  canvas.addEventListener('pointerdown', (e) => {
    // Pointer interaction always in split-screen mode
    canvas.setPointerCapture(e.pointerId);
    pointerState.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const coords = getCanvasCoords(e);

    // Check if clicking directly on a text overlay
    const hitOverlay = window.textOverlayManager?.findOverlayAtCoords(ctx, state, coords.x, coords.y);
    if (hitOverlay) {
      pointerState.draggedOverlay = hitOverlay;
      pointerState.activeOverlayId = hitOverlay.id;
      pointerState.overlayStartX = hitOverlay.x;
      pointerState.overlayStartY = hitOverlay.y;
      pointerState.lastClientX = e.clientX;
      pointerState.lastClientY = e.clientY;
      pointerState.isDragging = false;
      canvas.classList.add('grabbing');
      renderCanvas();
      return;
    }
    pointerState.activeOverlayId = null;

    // Switch active slot depending on left, mid, or right click
    if (state.layoutMode === 'stygian') {
      if (coords.x < 640) {
        setActiveSlot(1);
      } else if (coords.x < 1280) {
        setActiveSlot(2);
      } else {
        setActiveSlot(3);
      }
    } else {
      if (coords.x < 960) {
        setActiveSlot(1);
      } else {
        setActiveSlot(2);
      }
    }

    const slot = getActiveSlot();
    pointerState.isDragging = true;
    pointerState.startPanX = slot.panX;
    pointerState.startPanY = slot.panY;
    pointerState.lastClientX = e.clientX;
    pointerState.lastClientY = e.clientY;
    canvas.classList.add('grabbing');
  });

  canvas.addEventListener('pointermove', (e) => {
    // Pointer interaction always in split-screen mode
    if (!pointerState.pointers.has(e.pointerId)) return;
    pointerState.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const slot = getActiveSlot();
    const rect = canvas.getBoundingClientRect();
    const scaleFactor = canvas.width / rect.width;

    if (pointerState.draggedOverlay) {
      // Drag active text overlay
      const dx = (e.clientX - pointerState.lastClientX) * scaleFactor;
      const dy = (e.clientY - pointerState.lastClientY) * scaleFactor;
      pointerState.draggedOverlay.x += dx;
      pointerState.draggedOverlay.y += dy;
      pointerState.lastClientX = e.clientX;
      pointerState.lastClientY = e.clientY;
      renderCanvas();
      return;
    }

    if (pointerState.pointers.size === 1 && pointerState.isDragging) {
      // Single touch / mouse drag -> Pan
      const dx = (e.clientX - pointerState.lastClientX) * scaleFactor;
      const dy = (e.clientY - pointerState.lastClientY) * scaleFactor;

      slot.panX += dx;
      slot.panY += dy;

      pointerState.lastClientX = e.clientX;
      pointerState.lastClientY = e.clientY;
      renderCanvas();
    } else if (pointerState.pointers.size === 2) {
      // Multi-touch Pinch -> Zoom
      const pts = Array.from(pointerState.pointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);

      if (pointerState.lastPinchDist > 0) {
        const ratio = dist / pointerState.lastPinchDist;
        slot.scale = Math.min(Math.max(slot.scale * ratio, 0.25), 4.5);
        updateZoomUI();
        renderCanvas();
      }
      pointerState.lastPinchDist = dist;
    }
  });

  const endPointer = (e) => {
    pointerState.pointers.delete(e.pointerId);
    if (pointerState.draggedOverlay) {
      pointerState.draggedOverlay = null;
      canvas.classList.remove('grabbing');
      pushUndoState();
      renderCanvas();
      return;
    }
    if (pointerState.pointers.size === 0) {
      pointerState.isDragging = false;
      pointerState.lastPinchDist = 0;
      canvas.classList.remove('grabbing');
      pushUndoState();
    } else if (pointerState.pointers.size === 1) {
      pointerState.lastPinchDist = 0;
      const remaining = Array.from(pointerState.pointers.values())[0];
      pointerState.lastClientX = remaining.x;
      pointerState.lastClientY = remaining.y;
    }
  };

  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  // Mouse Wheel Zoom
  let wheelUndoTimer = null;
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const slot = getActiveSlot();
    const zoomFactor = e.deltaY < 0 ? 1.06 : 0.94;
    slot.scale = Math.min(Math.max(slot.scale * zoomFactor, 0.25), 4.5);
    updateZoomUI();
    renderCanvas();
    clearTimeout(wheelUndoTimer);
    wheelUndoTimer = setTimeout(() => {
      pushUndoState();
    }, 250);
  }, { passive: false });

  // Canvas Drag & Drop Dropzone for .abyss Projects
  canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.abyss') || file.name.endsWith('.json')) {
        openProjectFile(file);
      } else if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            if (state.layoutMode === 'spotlight') {
              state.spotlight.bgImg = img;
              state.spotlight.bgImgUrl = ev.target.result;
              state.spotlight.bgPanX = 0;
              state.spotlight.bgPanY = 0;
              state.spotlight.bgScale = 1.0;
              const statusEl = document.getElementById('spotlightBgStatus');
              if (statusEl) statusEl.textContent = `✓ Loaded ${img.naturalWidth}x${img.naturalHeight} Screenshot`;
            } else {
              const slot = getActiveSlot();
              slot.img = img;
              slot.imgUrl = ev.target.result;
            }
            renderCanvas();
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      }
    }
  });
}

window.setupCanvasInteraction = setupCanvasInteraction;
