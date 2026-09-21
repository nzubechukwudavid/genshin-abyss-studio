/**
 * Module: web/modules/thumbnail_toolbar.js
 * Purpose: Controls the newly redesigned, non-clipping Thumbnail Control Bar
 * placed directly above the canvas viewport inside the Thumbnail Studio.
 */

export function initThumbnailToolbar() {
  // Bind Divider Style Switcher (Spire vs Rosette vs Line)
  const styleBtns = document.querySelectorAll('#thumbnailControlBar .center-nav-btn');
  styleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      styleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const style = btn.dataset.style;
      if (window.setCenterStyle) {
        window.setCenterStyle(style);
      }
    });
  });

  // Bind Floor Selector
  const floorSelect = document.getElementById('tbFloorSelect');
  if (floorSelect) {
    floorSelect.addEventListener('change', () => {
      if (window.state) {
        window.state.floor = floorSelect.value;
        if (window.renderCanvas) window.renderCanvas();
      }
    });
  }

  // Bind Patch Input
  const patchInput = document.getElementById('tbPatchInput') || document.getElementById('patchInput');
  if (patchInput) {
    patchInput.addEventListener('input', () => {
      if (window.state) {
        window.state.patch = patchInput.value;
        if (window.renderCanvas) window.renderCanvas();
      }
    });
  }

  // Bind Framing Presets
  const btnFlip = document.getElementById('tbFlip');
  if (btnFlip) {
    btnFlip.addEventListener('click', () => {
      if (window.flipSelectedCharacter) window.flipSelectedCharacter();
    });
  }

  const btnHead = document.getElementById('tbHead');
  if (btnHead) {
    btnHead.addEventListener('click', () => {
      if (window.applyFramingPreset) window.applyFramingPreset('headshot');
    });
  }

  const btnTorso = document.getElementById('tbTorso');
  if (btnTorso) {
    btnTorso.addEventListener('click', () => {
      if (window.applyFramingPreset) window.applyFramingPreset('bust');
    });
  }

  const btnReset = document.getElementById('tbReset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (window.resetFraming) window.resetFraming();
    });
  }

  // Bind Guides
  const btnSafeZone = document.getElementById('tbSafeZone');
  if (btnSafeZone) {
    btnSafeZone.addEventListener('click', () => {
      if (window.state) {
        window.state.showSafeZone = !window.state.showSafeZone;
        btnSafeZone.classList.toggle('active', window.state.showSafeZone);
        if (window.renderCanvas) window.renderCanvas();
      }
    });
  }

  // Bind Export Trigger
  const btnExport = document.getElementById('btnExportToolbar') || document.getElementById('btnExport');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      if (window.exportThumbnail) window.exportThumbnail();
    });
  }

  // Bind Save / Open Workspace
  const btnSave = document.getElementById('tbSave') || document.getElementById('tbSaveProject');
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      if (window.exportProjectFile) window.exportProjectFile();
    });
  }

  const btnOpen = document.getElementById('tbOpen') || document.getElementById('tbOpenProject');
  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      const fi = document.getElementById('projectFileInput');
      if (fi) fi.click();
    });
  }
}
