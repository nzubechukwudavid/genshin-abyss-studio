/**
 * QuickStart Workflow Guide ES Module for Genshin Abyss Studio.
 * Controls the zero-scroll 4-card horizontal banner spread and Arranger modes reference.
 */

export function initQuickStartGuide() {
  const modal = document.getElementById('modalQuickStart');
  const btnOpen = document.getElementById('btnOpenQuickStartGuide');
  const btnClose = document.getElementById('quickStartCloseBtn') || document.getElementById('btnCloseQuickStart');
  const btnDismiss = document.getElementById('btnDismissQuickStart');
  const chkDontShow = document.getElementById('chkDontShowQuickStart');
  const pathVideo = document.getElementById('qsPathVideo');
  const pathThumbnail = document.getElementById('qsPathThumbnail');

  if (btnOpen) {
    btnOpen.addEventListener('click', () => openQuickStartGuide());
  }

  if (btnClose) {
    btnClose.addEventListener('click', () => closeQuickStartGuide());
  }

  if (btnDismiss) {
    btnDismiss.addEventListener('click', () => closeQuickStartGuide());
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeQuickStartGuide();
    });
  }

  if (pathVideo) {
    pathVideo.addEventListener('click', () => {
      closeQuickStartGuide();
      const btnArranger = document.getElementById('btnNavArranger');
      if (btnArranger) btnArranger.click();
    });
  }

  if (pathThumbnail) {
    pathThumbnail.addEventListener('click', () => {
      closeQuickStartGuide();
      const btnThumb = document.getElementById('btnNavThumbnail');
      if (btnThumb) btnThumb.click();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('open')) {
      closeQuickStartGuide();
    }
  });

  // Auto-show on first visit unless disabled by user or URL parameter
  try {
    const hasSeen = localStorage.getItem('abyss_has_seen_quickstart');
    const params = new URLSearchParams(window.location.search);
    if (!hasSeen && !params.has('mode') && !params.has('nomodal') && !params.has('settings')) {
      setTimeout(() => openQuickStartGuide(), 500);
    }
  } catch (e) {}
}

export function openQuickStartGuide() {
  const modal = document.getElementById('modalQuickStart');
  if (!modal) return;
  modal.classList.add('open');
  modal.style.display = 'flex';
}

export function closeQuickStartGuide() {
  const modal = document.getElementById('modalQuickStart');
  const chkDontShow = document.getElementById('chkDontShowQuickStart');
  if (chkDontShow && chkDontShow.checked) {
    try {
      localStorage.setItem('abyss_has_seen_quickstart', 'true');
    } catch (e) {}
  }
  if (!modal) return;
  modal.classList.remove('open');
  modal.style.display = 'none';
}

window.openQuickStartGuide = openQuickStartGuide;
window.closeQuickStartGuide = closeQuickStartGuide;
