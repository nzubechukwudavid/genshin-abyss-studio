/**
 * Module: web/modules/ab_compare_modal.js
 * Purpose: Interactive Thumbnail A/B Test Variant Comparison Modal.
 * Enables creators to capture two thumbnail variants, compare them side-by-side
 * in realistic YouTube desktop and mobile feed mockups, inspect CTR elements,
 * and download both variants in one click.
 */

let variantA = null;
let variantB = null;

export function captureVariant(which = 'A', canvas, title = '', state = null) {
  if (!canvas) return null;
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const snapData = state ? JSON.parse(JSON.stringify(state)) : null;

  const variant = {
    which,
    dataUrl,
    title: title || (which === 'A' ? 'Variant A (Default)' : 'Variant B (Test)'),
    timestamp: Date.now(),
    state: snapData
  };

  if (which === 'A') {
    variantA = variant;
  } else {
    variantB = variant;
  }

  updateABCompareModalUI();
  return variant;
}

export function openABCompareModal(canvas, currentTitle = '', state = null) {
  // If Variant A is not yet captured, auto-capture current canvas as Variant A
  if (!variantA && canvas) {
    captureVariant('A', canvas, currentTitle, state);
  } else if (variantA && !variantB && canvas) {
    // If Variant A exists but Variant B doesn't, capture current as Variant B
    captureVariant('B', canvas, currentTitle, state);
  }

  const modal = document.getElementById('modalABCompare');
  if (modal) {
    modal.style.display = 'flex';
    updateABCompareModalUI();
  }
}

export function closeABCompareModal() {
  const modal = document.getElementById('modalABCompare');
  if (modal) modal.style.display = 'none';
}

export function updateABCompareModalUI() {
  const imgA = document.getElementById('abPreviewImgA');
  const imgB = document.getElementById('abPreviewImgB');
  const titleA = document.getElementById('abTitlePreviewA');
  const titleB = document.getElementById('abTitlePreviewB');
  const btnCaptureA = document.getElementById('btnCaptureVariantA');
  const btnCaptureB = document.getElementById('btnCaptureVariantB');
  const btnDownloadBoth = document.getElementById('btnDownloadBothAB');

  if (imgA) {
    if (variantA) {
      imgA.src = variantA.dataUrl;
      imgA.style.display = 'block';
      if (titleA) titleA.textContent = variantA.title;
    } else {
      imgA.style.display = 'none';
      if (titleA) titleA.textContent = 'Variant A: Not captured yet';
    }
  }

  if (imgB) {
    if (variantB) {
      imgB.src = variantB.dataUrl;
      imgB.style.display = 'block';
      if (titleB) titleB.textContent = variantB.title;
    } else {
      imgB.style.display = 'none';
      if (titleB) titleB.textContent = 'Variant B: Not captured yet (Tweak canvas & click Capture B)';
    }
  }

  if (btnDownloadBoth) {
    btnDownloadBoth.disabled = !variantA || !variantB;
    btnDownloadBoth.style.opacity = (!variantA || !variantB) ? '0.5' : '1';
  }
}

export function downloadBothVariants() {
  if (variantA && variantA.dataUrl) {
    const a = document.createElement('a');
    a.href = variantA.dataUrl;
    a.download = 'abyss_thumbnail_variant_A.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  setTimeout(() => {
    if (variantB && variantB.dataUrl) {
      const b = document.createElement('a');
      b.href = variantB.dataUrl;
      b.download = 'abyss_thumbnail_variant_B.jpg';
      document.body.appendChild(b);
      b.click();
      document.body.removeChild(b);
    }
  }, 400);
}

export function initABCompareModal(canvas, getTitleFn, getStateFn, showToastFn) {
  const btnOpen = document.getElementById('tbABCompare');
  const btnClose = document.getElementById('abModalCloseBtn');
  const btnDone = document.getElementById('btnDoneABModal');
  const btnCapA = document.getElementById('btnCaptureVariantA');
  const btnCapB = document.getElementById('btnCaptureVariantB');
  const btnDlBoth = document.getElementById('btnDownloadBothAB');

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      const title = getTitleFn ? getTitleFn() : '';
      const st = getStateFn ? getStateFn() : null;
      openABCompareModal(canvas, title, st);
    });
  }

  if (btnClose) btnClose.addEventListener('click', closeABCompareModal);
  if (btnDone) btnDone.addEventListener('click', closeABCompareModal);

  if (btnCapA) {
    btnCapA.addEventListener('click', () => {
      const title = getTitleFn ? getTitleFn() : '';
      const st = getStateFn ? getStateFn() : null;
      captureVariant('A', canvas, title, st);
      if (showToastFn) showToastFn('📸 Captured current canvas as Variant A!');
    });
  }

  if (btnCapB) {
    btnCapB.addEventListener('click', () => {
      const title = getTitleFn ? getTitleFn() : '';
      const st = getStateFn ? getStateFn() : null;
      captureVariant('B', canvas, title, st);
      if (showToastFn) showToastFn('📸 Captured current canvas as Variant B!');
    });
  }

  if (btnDlBoth) {
    btnDlBoth.addEventListener('click', () => {
      downloadBothVariants();
      if (showToastFn) showToastFn('✨ Downloaded both Variant A & Variant B!');
    });
  }
}
