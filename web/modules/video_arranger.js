/**
 * Desktop Nav Switcher & Video Arranger ES Module for Genshin Abyss Studio.
 * Handles top navigation view switching (Thumbnail / Arranger / BGM),
 * session auto-clustering, timeline slot cards, and standard run CapCut assembly.
 */

// ==========================================================================
// Desktop Mode Navigation Switcher & Video Arranger Controllers
// ==========================================================================
let arrangerDataCache = null;
let switchStudioView = null;

function setupDesktopNavSwitcher() {
  const btnThumbnail = document.getElementById('btnNavThumbnail');
  const btnArranger = document.getElementById('btnNavArranger');
  const btnBGM = document.getElementById('btnNavBGM');
  const viewThumbnail = document.getElementById('viewThumbnailStudio');
  const viewArranger = document.getElementById('viewVideoArranger');
  const viewBGM = document.getElementById('viewBGMStudio');

  window.switchStudioView = switchStudioView = function(mode) {
    document.body.dataset.activeView = mode;
    [btnThumbnail, btnArranger, btnBGM].forEach(btn => {
      if (btn) btn.classList.toggle('active', btn.dataset.view === mode);
    });

    if (mode === 'thumbnail') {
      if (viewThumbnail) viewThumbnail.style.display = 'flex';
      if (viewArranger) viewArranger.style.display = 'none';
      if (viewBGM) viewBGM.style.display = 'none';
      const dualTabs = document.getElementById('dualPanelTabs');
      const dualContent = document.getElementById('dualSidebarContent');
      if (dualTabs) dualTabs.style.display = 'flex';
      if (dualContent) dualContent.style.display = 'block';
      state.layoutMode = 'dual';
      renderCanvas();
    } else if (mode === 'arranger') {
      if (viewThumbnail) viewThumbnail.style.display = 'none';
      if (viewArranger) viewArranger.style.display = 'flex';
      if (viewBGM) viewBGM.style.display = 'none';

      let savedMode = 'basic';
      try {
        savedMode = localStorage.getItem('abyss_arranger_mode') || 'basic';
        if (savedMode === 'spotlight' || savedMode === 'showcase') savedMode = 'showcase';
        else if (savedMode === 'stygian') savedMode = 'stygian';
        else savedMode = 'basic';
      } catch (e) {}
      setArrangerMode(savedMode);
      if (viewThumbnail) viewThumbnail.style.display = 'none';
      if (viewArranger) viewArranger.style.display = 'flex';
      if (viewBGM) viewBGM.style.display = 'none';

      // Arranger runs in its own pipeline mode without affecting Thumbnail studio
      if (savedMode === 'showcase') {
        if (typeof populateShowcaseSessions === 'function') {
          populateShowcaseSessions(true);
        }
      } else if (savedMode === 'stygian') {
        if (typeof initStygianArranger === 'function') {
          initStygianArranger();
        }
      } else {
        if (typeof loadVideoArrangerData === 'function') {
          loadVideoArrangerData(true);
        }
      }
    } else if (mode === 'bgm') {
      if (viewThumbnail) viewThumbnail.style.display = 'none';
      if (viewArranger) viewArranger.style.display = 'none';
      if (viewBGM) viewBGM.style.display = 'flex';
      if (typeof window.refreshBGMView === 'function') {
        window.refreshBGMView();
      } else if (typeof window.loadBGMData === 'function') {
        window.loadBGMData();
      }
    }
  };

  if (btnThumbnail) btnThumbnail.addEventListener('click', () => switchStudioView('thumbnail'));
  if (btnArranger) btnArranger.addEventListener('click', () => switchStudioView('arranger'));
  if (btnBGM) btnBGM.addEventListener('click', () => switchStudioView('bgm'));

  const btnArrangerOpenBGM = document.getElementById('btnArrangerOpenBGM');
  if (btnArrangerOpenBGM) {
    btnArrangerOpenBGM.addEventListener('click', () => switchStudioView('bgm'));
  }
}

async function loadVideoArrangerData(forceRefresh = false) {
  const grid = document.getElementById('arrangerClipsGrid');
  const dirPathEl = document.getElementById('arrangerDirPath');
  const sessionSelect = document.getElementById('arrangerSessionSelect');
  if (!grid) return;

  if (!forceRefresh && arrangerDataCache) {
    renderVideoArrangerGrid(arrangerDataCache);
    return;
  }

  grid.innerHTML = '<div style="grid-column: 1/-1; padding: 60px; text-align: center; color: var(--accent-cyan); font-size: 1rem;">⏳ Scanning recording sessions & clips...</div>';

  try {
    const res = await fetch('/api/recordings/sessions');
    const data = await res.json();
    if (data.status === 'ok') {
      arrangerDataCache = data;
      if (dirPathEl) dirPathEl.textContent = data.directory || 'Videos/Captures';

      if (sessionSelect && data.sessions) {
        const activeId = data.selected_session_id || 'session_0';
        sessionSelect.innerHTML = data.sessions.map((s) => `
          <option value="${s.session_id}" ${s.session_id === activeId ? 'selected' : ''}>
            ${s.label}
          </option>
        `).join('') || '<option value="latest">Latest Session (Floor 12 Run)</option>';
      }

      renderVideoArrangerGrid(data);
    } else {
      grid.innerHTML = `<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: #ef4444;">Failed to load recordings: ${data.message}</div>`;
    }
  } catch (err) {
    grid.innerHTML = '<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: #ef4444;">Error connecting to recordings service.</div>';
  }
}

async function switchVideoArrangerSession(sessionId) {
  const grid = document.getElementById('arrangerClipsGrid');
  if (grid) {
    grid.style.opacity = '0.5';
    grid.style.pointerEvents = 'none';
  }
  try {
    const res = await fetch(`/api/recordings/sessions?session_id=${encodeURIComponent(sessionId)}`);
    const data = await res.json();
    if (data.status === 'ok') {
      arrangerDataCache = data;
      renderVideoArrangerGrid(data);
      const activeSession = (data.sessions || []).find(s => s.session_id === data.selected_session_id);
      if (activeSession) {
        showToast(`📁 Switched to ${activeSession.label}`);
      }
    } else {
      showToast(`Failed to load session: ${data.message || 'Unknown error'}`);
    }
  } catch (err) {
    showToast('Error switching recording session');
  } finally {
    if (grid) {
      grid.style.opacity = '1';
      grid.style.pointerEvents = 'auto';
    }
  }
}

function renderVideoArrangerGrid(data) {
  const grid = document.getElementById('arrangerClipsGrid');
  if (!grid) return;

  const slots = data.active_slots || [];
  if (slots.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-dim);">No screen recordings found in directory.</div>';
    return;
  }

  let bgmSuite = [];
  try {
    bgmSuite = JSON.parse(localStorage.getItem('abyss_active_bgm_suite')) || [];
  } catch (e) {}

  let cardsHtml = slots.map((slot, idx) => {
    const bgmTrack = bgmSuite[idx];
    const bgmTitle = bgmTrack ? (bgmTrack.title || 'Selected Track') : 'Auto-Matched BGM';
    const cutBadge = slot.cut_info ? `
      <div class="arranger-cut-badge">
        <span>✂ Trimmed ${slot.cut_info.trimmed_sec}s intermission</span>
        <span style="opacity: 0.85; font-size: 0.68rem;">Half 1: ${slot.cut_info.h1_dur_formatted} • Half 2: ${slot.cut_info.h2_dur_formatted}</span>
      </div>
    ` : `
      <div class="arranger-cut-badge" style="background: rgba(56, 189, 248, 0.1); border-color: rgba(56, 189, 248, 0.25); color: #38bdf8;">
        <span>✓ Full Clip Showcase (${slot.duration_formatted})</span>
      </div>
    `;

    return `
      <div class="arranger-card" data-slot="${idx}" draggable="true" ondragstart="window.handleArrangerDragStart(event, ${idx})" ondragover="window.handleArrangerDragOver(event)" ondragleave="window.handleArrangerDragLeave(event)" ondrop="window.handleArrangerDrop(event, ${idx})" ondragend="window.handleArrangerDragEnd(event)">
        <div class="arranger-thumb-wrap" onclick="previewArrangerVideo(${idx})">
          <img class="arranger-thumb-img" src="${slot.thumbnail_url}" alt="${slot.label}" onerror="this.src='/static/assets/studio_preview.png'">
          <div class="arranger-thumb-play">▶</div>
        </div>
        <div class="arranger-card-body">
          <div class="arranger-card-header">
            <span class="arranger-card-title">${slot.label}</span>
            <span class="arranger-dur-pill">${slot.duration_formatted}</span>
          </div>
          <div class="arranger-file-info" title="${slot.filename}">
            📄 ${slot.filename} • ${slot.filesize_mb} MB
          </div>
          ${cutBadge}
          <div class="arranger-slot-actions" style="display: flex; gap: 6px; margin-top: 10px; align-items: center; justify-content: flex-start; flex-wrap: wrap;">
            <button type="button" class="btn-slot-icon" onclick="window.assignStandardSlotFile(${idx})" title="Choose or swap MP4 video for this chamber">
              📂 Browse
            </button>
            <button type="button" class="btn-slot-icon" id="btnSwapStandard_${idx}" onclick="window.initiateStandardSlotSwap(${idx})" title="Swap clip with another slot">
              🔄 Swap
            </button>
            ${idx > 0 ? `<button type="button" class="btn-slot-icon" onclick="window.swapStandardAdjacentSlots(${idx}, ${idx - 1})" title="Move Up">▲</button>` : ''}
            ${idx < slots.length - 1 ? `<button type="button" class="btn-slot-icon" onclick="window.swapStandardAdjacentSlots(${idx}, ${idx + 1})" title="Move Down">▼</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (slots.length === 3) {
    cardsHtml += `
      <div class="arranger-card" style="opacity: 0.65; border-style: dashed; border-color: rgba(255,255,255,0.15); background: rgba(0,0,0,0.15);">
        <div class="arranger-thumb-wrap" style="background: rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 2.2rem; opacity: 0.35;">⚔️</span>
        </div>
        <div class="arranger-card-body">
          <div class="arranger-card-header">
            <span class="arranger-card-title">Character Builds & Outro</span>
            <span class="arranger-dur-pill" style="background: rgba(255,255,255,0.06); color: var(--text-dim);">Optional</span>
          </div>
          <div class="arranger-file-info" style="color: var(--text-dim);">
            No separate 4th build clip in this run
          </div>
          <div class="arranger-cut-badge" style="background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.08); color: var(--text-dim);">
            <span>Direct 3-Chamber Continuous Clean Edit</span>
          </div>
        </div>
      </div>
    `;
  }

  grid.innerHTML = cardsHtml;
}

window.previewArrangerVideo = function(slotIdx) {
  let slot = null;
  if (window.arrangerDataCache && window.arrangerDataCache.active_slots) {
    slot = window.arrangerDataCache.active_slots[slotIdx];
  }
  if (slot && (slot.path || slot.filepath)) {
    const p = slot.path || slot.filepath;
    window.openVideoPreview({
      path: p,
      title: slot.label || `Chamber Slot ${slotIdx + 1}`,
      subtitle: slot.filename || p.split(/[\\/]/).pop(),
      duration: slot.duration_formatted || '00:00'
    });
    return;
  }
  window.openVideoPreview({
    src: `/api/stream-video?slot=${slotIdx}`,
    title: `Chamber Slot ${slotIdx + 1}`,
    subtitle: `Abyss Chamber Recording ${slotIdx + 1}`,
    duration: ''
  });
};

window.openBgmFromArranger = function(slotIdx) {
  const btnOpen = document.getElementById('btnOpenBGMModal');
  if (btnOpen) {
    btnOpen.click();
    setTimeout(() => {
      const card = document.querySelector(`.bgm-chamber-card[data-slot="${slotIdx}"]`);
      if (card) card.click();
      const btnLib = document.getElementById('btnOpenBgmLibrary');
      if (btnLib) btnLib.click();
    }, 350);
  }
};

function setupVideoArrangerListeners() {
  setupArrangerModeSwitcher();
  const sessionSelect = document.getElementById('arrangerSessionSelect');
  const btnRefresh = document.getElementById('btnArrangerRefresh');
  const btnOpenBGM = document.getElementById('btnArrangerOpenBGM');
  const btnLaunchCapCut = document.getElementById('btnArrangerLaunchCapCut');
  const transSelect = document.getElementById('arrangerTransitionSelect');

  if (sessionSelect) {
    sessionSelect.addEventListener('change', () => {
      switchVideoArrangerSession(sessionSelect.value);
    });
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      loadVideoArrangerData(true);
      showToast('🔄 Rescanned recording sessions!');
    });
  }

  if (btnOpenBGM) {
    btnOpenBGM.addEventListener('click', () => {
      const b = document.getElementById('btnOpenBGMModal');
      if (b) b.click();
    });
  }

  if (btnLaunchCapCut) {
    btnLaunchCapCut.addEventListener('click', async () => {
      const origHtml = btnLaunchCapCut.innerHTML;
      btnLaunchCapCut.disabled = true;
      btnLaunchCapCut.innerHTML = '⏳ Assembling Project & Launching CapCut...';

      let suite = [];
      try {
        suite = JSON.parse(localStorage.getItem('abyss_active_bgm_suite')) || [];
      } catch (e) {}

      const trans = transSelect ? transSelect.value : 'black_fade';
      const activeSlots = (arrangerDataCache && arrangerDataCache.active_slots) ? arrangerDataCache.active_slots : [];
      const clipPaths = activeSlots.map(s => s.path);
      const currentSessionId = sessionSelect ? sessionSelect.value : (arrangerDataCache ? arrangerDataCache.selected_session_id : null);

      try {
        const res = await fetch('/api/assemble-capcut', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            suite: suite,
            transition: trans,
            clip_volume: 0.10,
            music_volume: 0.0316,
            session_id: currentSessionId,
            clip_paths: clipPaths
          })
        });
        const data = await res.json();
        if (data.status === 'ok') {
          btnLaunchCapCut.innerHTML = '✓ CapCut Opened!';
          btnLaunchCapCut.style.backgroundColor = '#10b981';
          showToast(`🎉 ${data.message || 'CapCut draft synthesized and opened!'}`);
          setTimeout(() => {
            btnLaunchCapCut.innerHTML = origHtml;
            btnLaunchCapCut.style.backgroundColor = '';
            btnLaunchCapCut.disabled = false;
          }, 5000);
        } else {
          btnLaunchCapCut.innerHTML = '⚠ Assembly Failed';
          btnLaunchCapCut.style.backgroundColor = '#ef4444';
          showToast(`Error: ${data.message || 'Failed to assemble project'}`);
          setTimeout(() => {
            btnLaunchCapCut.innerHTML = origHtml;
            btnLaunchCapCut.style.backgroundColor = '';
            btnLaunchCapCut.disabled = false;
          }, 4000);
        }
      } catch (err) {
        btnLaunchCapCut.innerHTML = origHtml;
        btnLaunchCapCut.disabled = false;
        showToast('Connection error communicating with CapCut assembler');
      }
    });
  }
}


export {
  setupDesktopNavSwitcher,
  loadVideoArrangerData,
  switchVideoArrangerSession,
  renderVideoArrangerGrid,
  setupVideoArrangerListeners
};
