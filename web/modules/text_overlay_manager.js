/**
 * Module: web/modules/text_overlay_manager.js
 * Purpose: Modular Canvas Text Overlay Engine for Genshin Abyss Studio.
 * Allows creators to stamp challenge labels ('C0', 'SOLO', 'F12', 'NO HEALER')
 * anywhere on the 1080p canvas with live drag-to-reposition, custom typography,
 * high-contrast outlines, and full undo/redo (.abyss) persistence.
 */

export function createDefaultOverlay(text = 'C0', x = 960, y = 240) {
  return {
    id: `ov_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    text: text || 'C0',
    x: x ?? 960,
    y: y ?? 240,
    fontSize: 72,
    fontFamily: 'Anton',
    color: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 6,
    rotation: 0,
    visible: true
  };
}

/**
 * Render all user-placed text overlays onto canvas.
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Object} state 
 * @param {string|null} selectedOverlayId
 */
export function renderTextOverlays(ctx, state, selectedOverlayId = null) {
  if (!state || !Array.isArray(state.overlays) || state.overlays.length === 0) return;

  state.overlays.filter(o => o.visible !== false).forEach(overlay => {
    ctx.save();

    const text = overlay.text || '';
    const fontSize = overlay.fontSize || 72;
    const fontFamily = overlay.fontFamily || 'Anton';
    const fontSpec = `900 ${fontSize}px '${fontFamily}', 'Montserrat', 'Inter', sans-serif`;

    ctx.font = fontSpec;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Position & Rotation
    ctx.translate(overlay.x, overlay.y);
    if (overlay.rotation) {
      ctx.rotate((overlay.rotation * Math.PI) / 180);
    }

    // Measure for bounding box
    const metrics = ctx.measureText(text);
    const textW = metrics.width;
    const textH = fontSize * 0.9;

    // Deep drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;

    // High-contrast Stroke (Outline)
    const strokeWidth = overlay.strokeWidth !== undefined ? overlay.strokeWidth : 6;
    if (strokeWidth > 0) {
      ctx.strokeStyle = overlay.strokeColor || '#000000';
      ctx.lineWidth = strokeWidth;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(text, 0, 0);
    }

    // Fill Color
    ctx.fillStyle = overlay.color || '#FFFFFF';
    ctx.fillText(text, 0, 0);

    // Selected state indicator (when deselecting is active slot 0 / not exporting)
    if (state.activeSlot !== 0 && selectedOverlayId === overlay.id) {
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(-textW / 2 - 12, -textH / 2 - 8, textW + 24, textH + 16);
      ctx.setLineDash([]);
    }

    ctx.restore();
  });
}

/**
 * Hit test: find overlay under canvas coordinates (x, y).
 */
export function findOverlayAtCoords(ctx, state, canvasX, canvasY) {
  if (!state || !Array.isArray(state.overlays) || state.overlays.length === 0) return null;

  // Search in reverse order (topmost first)
  for (let i = state.overlays.length - 1; i >= 0; i--) {
    const o = state.overlays[i];
    if (o.visible === false) continue;

    ctx.save();
    ctx.font = `900 ${o.fontSize || 72}px '${o.fontFamily || 'Anton'}', sans-serif`;
    const w = ctx.measureText(o.text || '').width;
    const h = (o.fontSize || 72) * 0.9;
    ctx.restore();

    const padding = 16;
    const minX = o.x - w / 2 - padding;
    const maxX = o.x + w / 2 + padding;
    const minY = o.y - h / 2 - padding;
    const maxY = o.y + h / 2 + padding;

    if (canvasX >= minX && canvasX <= maxX && canvasY >= minY && canvasY <= maxY) {
      return o;
    }
  }

  return null;
}

/**
 * Add a new text overlay.
 */
export function addTextOverlay(state, text = 'C0', x = 960, y = 240, callbacks = {}) {
  if (!state.overlays) state.overlays = [];
  const overlay = createDefaultOverlay(text, x, y);
  state.overlays.push(overlay);

  if (callbacks.renderUI) callbacks.renderUI();
  if (callbacks.renderCanvas) callbacks.renderCanvas();
  if (callbacks.pushUndo) callbacks.pushUndo(`Add text overlay: "${text}"`);
  return overlay;
}

/**
 * Remove an overlay by id.
 */
export function removeTextOverlay(state, id, callbacks = {}) {
  if (!state.overlays) return;
  state.overlays = state.overlays.filter(o => o.id !== id);

  if (callbacks.renderUI) callbacks.renderUI();
  if (callbacks.renderCanvas) callbacks.renderCanvas();
  if (callbacks.pushUndo) callbacks.pushUndo('Remove text overlay');
}

/**
 * Update an overlay property.
 */
export function updateTextOverlay(state, id, updates = {}, callbacks = {}) {
  if (!state.overlays) return;
  const overlay = state.overlays.find(o => o.id === id);
  if (!overlay) return;

  Object.assign(overlay, updates);

  if (callbacks.renderUI) callbacks.renderUI();
  if (callbacks.renderCanvas) callbacks.renderCanvas();
}

/**
 * Render the list of overlay items in sidebar.
 */
export function renderOverlayListUI(state, callbacks = {}) {
  const listEl = document.getElementById('textOverlayList');
  if (!listEl) return;

  if (!state.overlays || state.overlays.length === 0) {
    listEl.innerHTML = '<div style="font-size: 0.72rem; color: var(--text-dim); text-align: center; padding: 6px 0;">No text overlays yet. Click a preset or "+ Add Text" below.</div>';
    return;
  }

  listEl.innerHTML = state.overlays.map((o) => `
    <div class="overlay-item-row" data-id="${o.id}">
      <input type="text" class="overlay-row-text-input" value="${(o.text || '').replace(/"/g, '&quot;')}" title="Overlay text" style="flex: 1; min-width: 70px;">
      <input type="color" class="overlay-row-color" value="${o.color || '#FFFFFF'}" title="Text Color" style="width: 26px; height: 26px; padding: 0; border: none; cursor: pointer; border-radius: 4px; background: transparent;">
      <select class="overlay-row-font-select" title="Font Family" style="font-size: 0.70rem; padding: 2px 4px; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; color: #fff;">
        <option value="Anton" ${o.fontFamily === 'Anton' ? 'selected' : ''}>Anton</option>
        <option value="Montserrat" ${o.fontFamily === 'Montserrat' ? 'selected' : ''}>Montserrat</option>
        <option value="Inter" ${o.fontFamily === 'Inter' ? 'selected' : ''}>Inter</option>
      </select>
      <input type="number" class="overlay-row-size" value="${o.fontSize || 72}" min="24" max="180" step="4" title="Font Size (px)" style="width: 44px; font-size: 0.72rem; padding: 2px 4px; text-align: center; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; color: #fff;">
      <button type="button" class="btn-remove-overlay" title="Delete overlay" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; border-radius: 4px; padding: 2px 6px; font-size: 0.72rem; cursor: pointer;">✕</button>
    </div>
  `).join('');

  // Attach event handlers to rows
  listEl.querySelectorAll('.overlay-item-row').forEach(row => {
    const id = row.dataset.id;
    const txtInput = row.querySelector('.overlay-row-text-input');
    const colorInput = row.querySelector('.overlay-row-color');
    const fontSelect = row.querySelector('.overlay-row-font-select');
    const sizeInput = row.querySelector('.overlay-row-size');
    const btnRemove = row.querySelector('.btn-remove-overlay');

    if (txtInput) {
      txtInput.addEventListener('input', (e) => {
        updateTextOverlay(state, id, { text: e.target.value }, { renderCanvas: callbacks.renderCanvas });
      });
      txtInput.addEventListener('change', () => {
        if (callbacks.pushUndo) callbacks.pushUndo('Edit text overlay');
      });
    }

    if (colorInput) {
      colorInput.addEventListener('input', (e) => {
        updateTextOverlay(state, id, { color: e.target.value }, { renderCanvas: callbacks.renderCanvas });
      });
      colorInput.addEventListener('change', () => {
        if (callbacks.pushUndo) callbacks.pushUndo('Change overlay color');
      });
    }

    if (fontSelect) {
      fontSelect.addEventListener('change', (e) => {
        updateTextOverlay(state, id, { fontFamily: e.target.value }, { renderCanvas: callbacks.renderCanvas });
        if (callbacks.pushUndo) callbacks.pushUndo('Change overlay font');
      });
    }

    if (sizeInput) {
      sizeInput.addEventListener('input', (e) => {
        const sz = parseInt(e.target.value, 10) || 72;
        updateTextOverlay(state, id, { fontSize: sz }, { renderCanvas: callbacks.renderCanvas });
      });
      sizeInput.addEventListener('change', () => {
        if (callbacks.pushUndo) callbacks.pushUndo('Change overlay size');
      });
    }

    if (btnRemove) {
      btnRemove.addEventListener('click', () => {
        removeTextOverlay(state, id, callbacks);
      });
    }
  });
}
