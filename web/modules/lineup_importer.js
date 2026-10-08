/**
 * Lineup Screenshot Importer & Cropper ES Module for Genshin Abyss Studio.
 * Allows importing in-game HoyoLab or combat party screenshots, cropping
 * custom character lineup strips, and assigning them to Slot 1 or Slot 2.
 */

// In-Game Lineup Screenshot Importer & Interactive Cropper
function setupLineupScreenshotImporter() {
  const modal = document.getElementById('lineupCropModal');
  const btnOpen = document.getElementById('tbLineupScreenshot');
  const btnClose = document.getElementById('lineupModalCloseBtn');
  const btnCancel = document.getElementById('btnCancelLineupCrop');
  const btnApply = document.getElementById('btnApplyLineupCrop');
  const fileInput = document.getElementById('lineupFileInput');
  const cropCanvas = document.getElementById('lineupCropCanvas');
  const cropCtx = cropCanvas ? cropCanvas.getContext('2d') : null;
  const placeholder = document.getElementById('lineupPlaceholder');

  let targetSide = 1;
  let sourceImg = null;
  let cropBox = null;
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      modal.classList.add('open');
    });
  }
  if (btnClose) btnClose.addEventListener('click', () => modal.classList.remove('open'));
  if (btnCancel) btnCancel.addEventListener('click', () => modal.classList.remove('open'));

  const btnSide1 = document.getElementById('btnLineupApplySide1');
  const btnSide2 = document.getElementById('btnLineupApplySide2');
  if (btnSide1 && btnSide2) {
    btnSide1.addEventListener('click', () => {
      targetSide = 1;
      btnSide1.classList.add('active');
      btnSide2.classList.remove('active');
    });
    btnSide2.addEventListener('click', () => {
      targetSide = 2;
      btnSide2.classList.add('active');
      btnSide1.classList.remove('active');
    });
  }

  function loadLineupImage(src) {
    const img = new Image();
    img.onload = () => {
      sourceImg = img;
      cropCanvas.width = img.naturalWidth;
      cropCanvas.height = img.naturalHeight;
      cropCanvas.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
      drawCropCanvas();
      if (btnApply) btnApply.disabled = false;
      showToast('📷 Screenshot loaded! Drag a box over your 4 characters');
    };
    img.src = src;
  }

  function drawCropCanvas() {
    if (!sourceImg || !cropCtx) return;
    cropCtx.drawImage(sourceImg, 0, 0);

    if (cropBox) {
      cropCtx.save();
      cropCtx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      cropCtx.fillRect(0, 0, cropCanvas.width, cropBox.y);
      cropCtx.fillRect(0, cropBox.y + cropBox.h, cropCanvas.width, cropCanvas.height - (cropBox.y + cropBox.h));
      cropCtx.fillRect(0, cropBox.y, cropBox.x, cropBox.h);
      cropCtx.fillRect(cropBox.x + cropBox.w, cropBox.y, cropCanvas.width - (cropBox.x + cropBox.w), cropBox.h);

      cropCtx.strokeStyle = '#00e5ff';
      cropCtx.lineWidth = 4;
      cropCtx.setLineDash([10, 8]);
      cropCtx.strokeRect(cropBox.x, cropBox.y, cropBox.w, cropBox.h);
      cropCtx.restore();
    }
  }

  // Paste Listener (Ctrl+V)
  window.addEventListener('paste', (e) => {
    if (!modal.classList.contains('open')) return;
    const items = e.clipboardData ? e.clipboardData.items : [];
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = (evt) => loadLineupImage(evt.target.result);
        reader.readAsDataURL(blob);
        break;
      }
    }
  });

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => loadLineupImage(evt.target.result);
        reader.readAsDataURL(file);
      }
    });
  }

  // Interactive Drag-to-Crop on Canvas
  if (cropCanvas) {
    cropCanvas.addEventListener('mousedown', (e) => {
      if (!sourceImg) return;
      const rect = cropCanvas.getBoundingClientRect();
      const scaleX = cropCanvas.width / rect.width;
      const scaleY = cropCanvas.height / rect.height;
      startX = (e.clientX - rect.left) * scaleX;
      startY = (e.clientY - rect.top) * scaleY;
      isDragging = true;
      cropBox = { x: startX, y: startY, w: 0, h: 0 };
    });

    cropCanvas.addEventListener('mousemove', (e) => {
      if (!isDragging || !sourceImg) return;
      const rect = cropCanvas.getBoundingClientRect();
      const scaleX = cropCanvas.width / rect.width;
      const scaleY = cropCanvas.height / rect.height;
      const curX = (e.clientX - rect.left) * scaleX;
      const curY = (e.clientY - rect.top) * scaleY;

      cropBox = {
        x: Math.min(startX, curX),
        y: Math.min(startY, curY),
        w: Math.abs(curX - startX),
        h: Math.abs(curY - startY)
      };
      drawCropCanvas();
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        if (cropBox && cropBox.w > 20 && cropBox.h > 20 && btnApply) {
          btnApply.disabled = false;
        }
      }
    });
  }

  if (btnApply) {
    btnApply.addEventListener('click', () => {
      if (!sourceImg || !cropBox || cropBox.w <= 0 || cropBox.h <= 0) return;
      const off = document.createElement('canvas');
      off.width = cropBox.w;
      off.height = cropBox.h;
      const offCtx = off.getContext('2d');
      offCtx.drawImage(sourceImg, cropBox.x, cropBox.y, cropBox.w, cropBox.h, 0, 0, cropBox.w, cropBox.h);

      const croppedImg = new Image();
      croppedImg.src = off.toDataURL('image/png');
      croppedImg.onload = () => {
        const slot = targetSide === 1 ? state.side1 : state.side2;
        slot.croppedStrip = croppedImg;
        modal.classList.remove('open');
        renderCanvas();
        showToast(`✂️ Applied in-game lineup strip to Side ${targetSide}!`);
      };
    });
  }
}

// Show Toast Notification
function showToast(message) {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// Copy Thumbnail to Clipboard

export {
  setupLineupScreenshotImporter,
  loadLineupImage,
  drawCropCanvas
};
