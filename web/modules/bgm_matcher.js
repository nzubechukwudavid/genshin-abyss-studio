/**
 * Smart BGM Matcher & In-App Audition Player ES Module for Genshin Abyss Studio.
 * Handles audio-to-video synchronization, waveform playback, duration variance scoring,
 * and music catalog library browsing.
 */

// Setup Smart BGM Matcher & In-App Video Audition Player Listeners
function setupSmartBGMAuditionListeners() {
  const btnOpen = document.getElementById('btnOpenBGMModal');
  const viewBGM = document.getElementById('viewBGMStudio');
  const modal = document.getElementById('bgmAuditionModal');
  const btnClose = document.getElementById('bgmModalCloseBtn');
  const btnDone = document.getElementById('btnDoneBGMModal');
  const btnRescan = document.getElementById('btnRescanBGM');
  const btnApplyCapCut = document.getElementById('btnApplyBGMToCapCut');
  const cardsContainer = document.getElementById('bgmCardsContainer');
  const libraryBadge = document.getElementById('bgmLibraryBadge');
  const runDurationBadge = document.getElementById('bgmRunDurationBadge');

  const video = document.getElementById('bgmAuditionVideo');
  const videoWrapper = document.getElementById('bgmVideoWrapper');
  const videoOverlayPlay = document.getElementById('bgmVideoOverlayPlay');
  const videoLoading = document.getElementById('bgmVideoLoading');
  const scrubBar = document.getElementById('bgmScrubBar');
  const currentTimeLabel = document.getElementById('bgmCurrentTime');
  const totalTimeLabel = document.getElementById('bgmTotalTime');
  const btnPlayPause = document.getElementById('btnBgmPlayPause');
  const btnRestart = document.getElementById('btnBgmRestart');
  const btnDropPoint = document.getElementById('btnBgmDropPoint');
  const gameVolSlider = document.getElementById('bgmGameVolume');
  const musicVolSlider = document.getElementById('bgmMusicVolume');
  const candidateSelect = document.getElementById('bgmCandidateSelect');
  const activeSlotName = document.getElementById('bgmActiveSlotName');
  const activeTrackLabel = document.getElementById('bgmActiveTrackLabel');

  // Full Library Browser elements
  const btnOpenLibrary = document.getElementById('btnOpenBgmLibrary');
  const libModal = document.getElementById('bgmLibraryModal');
  const btnLibClose = document.getElementById('bgmLibCloseBtn');
  const btnLibDone = document.getElementById('btnDoneLibModal');
  const libSearchInput = document.getElementById('bgmLibSearchInput');
  const btnLibClearSearch = document.getElementById('btnBgmLibClearSearch');
  const libFilterChips = document.querySelectorAll('.bgm-chip');
  const libResultsList = document.getElementById('bgmLibResultsList');
  const libSlotTarget = document.getElementById('bgmLibSlotTarget');
  const libCountBadge = document.getElementById('bgmLibCountBadge');

  if (!viewBGM || !video) return;

  // Single persistent audition audio instance
  const audio = new Audio();
  audio.preload = 'auto';
  audio.loop = true;

  // Audition State
  const bgmState = {
    activeSlotIndex: 0,
    slots: [],
    assignments: {},
    currentInPoint: 0.0,
    isUpdatingScrub: false
  };

  let currentLibSlot = 0;
  let activeLibFilter = 'all';
  let searchDebounceTimer = null;
  let auditioningLibTrackId = null;

  function formatDuration(sec) {
    if (!sec || isNaN(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // Phase-locked Playback Sync
  function syncAudioToVideo() {
    if (!audio.src) return;
    let targetAudioTime = Math.max(0, video.currentTime + bgmState.currentInPoint);
    if (audio.duration && audio.duration > 0 && targetAudioTime >= audio.duration) {
      targetAudioTime = targetAudioTime % audio.duration;
    }
    if (Math.abs(audio.currentTime - targetAudioTime) > 0.15) {
      try {
        audio.currentTime = targetAudioTime;
      } catch (e) {}
    }
  }

  video.addEventListener('play', () => {
    videoWrapper.classList.add('playing');
    if (btnPlayPause) btnPlayPause.textContent = '⏸ Pause';
    syncAudioToVideo();
    if (audio.src) {
      audio.play().catch(e => console.warn('Audio play auto-policy note:', e));
    }
  });

  video.addEventListener('pause', () => {
    videoWrapper.classList.remove('playing');
    if (btnPlayPause) btnPlayPause.textContent = '▶ Play';
    if (!audio.paused) audio.pause();
  });

  video.addEventListener('ended', () => {
    videoWrapper.classList.remove('playing');
    if (btnPlayPause) btnPlayPause.textContent = '▶ Play';
    if (!audio.paused) audio.pause();
    try {
      audio.currentTime = Math.max(0, bgmState.currentInPoint);
    } catch (e) {}
  });

  video.addEventListener('seeking', () => {
    syncAudioToVideo();
  });

  video.addEventListener('timeupdate', () => {
    if (!bgmState.isUpdatingScrub && video.duration) {
      const pct = (video.currentTime / video.duration) * 100;
      scrubBar.value = pct;
      currentTimeLabel.textContent = formatDuration(video.currentTime);
      totalTimeLabel.textContent = `/ ${formatDuration(video.duration)}`;
    }
    // Periodic sync check to prevent audio clock drift
    if (!video.paused && audio.src && !audio.paused) {
      let targetAudioTime = video.currentTime + bgmState.currentInPoint;
      if (audio.duration && audio.duration > 0 && targetAudioTime >= audio.duration) {
        targetAudioTime = targetAudioTime % audio.duration;
      }
      if (Math.abs(audio.currentTime - targetAudioTime) > 0.25) {
        try {
          audio.currentTime = targetAudioTime;
        } catch (e) {}
      }
    }
  });

  video.addEventListener('waiting', () => {
    if (videoLoading) videoLoading.style.display = 'flex';
  });

  video.addEventListener('canplay', () => {
    if (videoLoading) videoLoading.style.display = 'none';
    if (video.duration) {
      totalTimeLabel.textContent = `/ ${formatDuration(video.duration)}`;
    }
  });

  // Scrub Bar interaction
  scrubBar.addEventListener('input', () => {
    bgmState.isUpdatingScrub = true;
    if (video.duration) {
      const targetTime = (scrubBar.value / 100) * video.duration;
      currentTimeLabel.textContent = formatDuration(targetTime);
    }
  });

  scrubBar.addEventListener('change', () => {
    bgmState.isUpdatingScrub = false;
    if (video.duration) {
      video.currentTime = (scrubBar.value / 100) * video.duration;
      syncAudioToVideo();
    }
  });

  // Video Overlay Play / Pause Click
  videoWrapper.addEventListener('click', (e) => {
    if (e.target === video || e.target === videoOverlayPlay) {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    }
  });

  // Play / Pause Button
  if (btnPlayPause) {
    btnPlayPause.addEventListener('click', () => {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    });
  }

  // Restart Button
  if (btnRestart) {
    btnRestart.addEventListener('click', () => {
      video.currentTime = 0;
      syncAudioToVideo();
      video.play();
    });
  }

  // Jump to Drop Point
  if (btnDropPoint) {
    btnDropPoint.addEventListener('click', () => {
      const jumpTime = Math.max(0, bgmState.currentInPoint);
      video.currentTime = Math.min(jumpTime, (video.duration || 10) - 2);
      syncAudioToVideo();
      video.play();
      showToast(`⚡ Jumped to combat drop (${formatDuration(jumpTime)})`);
    });
  }

  // Volume Mixer Controls
  if (gameVolSlider) {
    gameVolSlider.addEventListener('input', (e) => {
      video.volume = parseInt(e.target.value, 10) / 100;
    });
  }

  if (musicVolSlider) {
    musicVolSlider.addEventListener('input', (e) => {
      const gain = parseInt(e.target.value, 10) / 100;
      audio.volume = gain;
    });
  }

  // Candidate Dropdown Track Switcher
  if (candidateSelect) {
    candidateSelect.addEventListener('change', (e) => {
      const trackId = e.target.value;
      if (!trackId) return;

      const slotKey = getSlotKey(bgmState.activeSlotIndex);
      const slotData = bgmState.assignments[slotKey];
      if (!slotData) return;

      // Find candidate
      let foundTrack = null;
      if (slotData.selected && slotData.selected.id === trackId) {
        foundTrack = slotData.selected;
      } else if (slotData.alternatives) {
        foundTrack = slotData.alternatives.find(t => t.id === trackId);
      }
      if (!foundTrack && bgmState.knownTracks && bgmState.knownTracks[trackId]) {
        foundTrack = bgmState.knownTracks[trackId];
      }

      if (foundTrack) {
        slotData.selected = foundTrack;
        bgmState.currentInPoint = foundTrack.in_point_sec || 0.0;
        audio.src = `/api/stream-audio?path=${encodeURIComponent(foundTrack.path)}`;
        activeTrackLabel.textContent = `♫ ${foundTrack.title} (${foundTrack.fit_label || ''})`;

        // Rerender slot card to reflect selected track
        renderSlotCards();

        syncAudioToVideo();
        if (!video.paused) {
          audio.play().catch(() => {});
        }
        showToast(`🎵 Swapped to: ${foundTrack.title}`);
      }
    });
  }

  function getSlotKey(idx) {
    if (idx === 0) return 'chamber_1';
    if (idx === 1) return 'chamber_2';
    if (idx === 2) return 'chamber_3';
    return 'builds';
  }

  // Load and Activate a Specific Slot in the In-App Player
  function activateSlot(slotIdx, autoPlay = true) {
    if (!bgmState.slots || bgmState.slots.length === 0) return;
    bgmState.activeSlotIndex = slotIdx;
    const slotKey = getSlotKey(slotIdx);
    const slotData = bgmState.assignments[slotKey];
    const recSlot = bgmState.slots[slotIdx];

    const slotLabel = recSlot ? recSlot.label : (slotIdx === 3 ? 'Character Builds' : `Chamber ${slotIdx + 1}`);
    if (activeSlotName) activeSlotName.textContent = slotLabel;

    // Stream video via HTTP 206
    video.src = `/api/stream-video?slot=${slotIdx}`;
    video.load();

    // Stream BGM track
    if (slotData && slotData.selected && slotData.selected.path) {
      const track = slotData.selected;
      bgmState.currentInPoint = track.in_point_sec || 0.0;
      audio.src = `/api/stream-audio?path=${encodeURIComponent(track.path)}`;
      audio.load();
      if (activeTrackLabel) {
        activeTrackLabel.textContent = `♫ ${track.title} (${track.fit_label || ''})`;
      }

      // Populate Candidate Switcher Dropdown
      if (candidateSelect) {
        candidateSelect.innerHTML = '';
        const allCandidates = [track, ...(slotData.alternatives || [])];
        allCandidates.forEach((c, cIdx) => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = `${cIdx === 0 ? '★ ' : ''}${c.title} - ${c.artist} (${c.duration_formatted} | ${c.fit_label || ''})`;
          if (c.id === track.id) opt.selected = true;
          candidateSelect.appendChild(opt);
        });
      }
    } else {
      audio.removeAttribute('src');
      if (activeTrackLabel) activeTrackLabel.textContent = '♫ No BGM assigned';
      if (candidateSelect) candidateSelect.innerHTML = '<option value="">No candidate tracks</option>';
    }

    renderSlotCards();

    if (autoPlay) {
      video.play().catch(e => console.warn('Auto-play note:', e));
    }
  }

  // Render the 4 Slot Cards
  function renderSlotCards() {
    if (!cardsContainer) return;
    cardsContainer.innerHTML = '';

    if (!bgmState.slots || bgmState.slots.length === 0) {
      if (runDurationBadge) runDurationBadge.textContent = 'No Clips Loaded';
      if (activeSlotName) activeSlotName.textContent = 'No Active Video Clip';
      if (activeTrackLabel) activeTrackLabel.textContent = '♫ Open library to audition tracks';
      if (candidateSelect) candidateSelect.innerHTML = '<option value="">No combat clips to match</option>';
      if (video) video.removeAttribute('src');
      if (audio) audio.removeAttribute('src');

      const emptyCard = document.createElement('div');
      emptyCard.className = 'bgm-empty-state-card';
      emptyCard.innerHTML = `
        <div class="bgm-empty-icon">🎬</div>
        <h3 class="bgm-empty-title">No Screen Recordings Detected</h3>
        <p class="bgm-empty-desc">
          Drop your Spiral Abyss recording clips into your Captures folder to automatically match combat music against your run footage.
        </p>
        <button type="button" class="btn-primary" id="btnBgmBrowseEmpty" style="width: 100%; justify-content: center; padding: 10px 14px; font-size: 0.85rem;">
          🎵 Browse & Audition Music Library
        </button>
      `;
      cardsContainer.appendChild(emptyCard);

      const browseBtn = emptyCard.querySelector('#btnBgmBrowseEmpty');
      if (browseBtn) {
        browseBtn.addEventListener('click', () => {
          const btnLib = document.getElementById('btnOpenBgmLibrary');
          if (btnLib) btnLib.click();
        });
      }
      return;
    }

    const slotKeys = ['chamber_1', 'chamber_2', 'chamber_3', 'builds'];
    const defaultLabels = ['Chamber 1', 'Chamber 2', 'Chamber 3', 'Character Builds Outro'];
    const icons = ['⚔️', '⚔️', '⚔️', '🛡️'];

    slotKeys.forEach((key, idx) => {
      const recSlot = bgmState.slots[idx];
      const slotData = bgmState.assignments[key] || {};
      const selTrack = slotData.selected;
      const isActive = bgmState.activeSlotIndex === idx;

      const card = document.createElement('div');
      card.className = `bgm-slot-card ${isActive ? 'active-audition' : ''}`;
      card.setAttribute('data-slot-idx', idx);

      const label = recSlot ? recSlot.label : defaultLabels[idx];
      const durationFormatted = recSlot ? recSlot.duration_formatted : formatDuration(slotData.target_sec || 90);
      const rawDurBadge = (recSlot && recSlot.raw_duration_formatted && recSlot.raw_duration_formatted !== recSlot.duration_formatted)
        ? `<span class="bgm-raw-sub" title="Raw recording: ${recSlot.raw_duration_formatted} (Loading screens & intermission trimmed)">(${recSlot.raw_duration_formatted})</span>`
        : '';

      const title = selTrack ? selTrack.title : 'No Track Matched';
      const artist = selTrack ? selTrack.artist : 'Scan library to populate';
      const fitLabel = selTrack ? selTrack.fit_label : '--';
      const isNegative = selTrack && selTrack.delta_sec < 0;

      card.innerHTML = `
        <div class="bgm-card-header">
          <div class="bgm-card-name">
            <span>${icons[idx]}</span>
            <span>${label}</span>
          </div>
          <span class="bgm-card-dur">${durationFormatted}${rawDurBadge}</span>
        </div>
        <div class="bgm-card-track-info">
          <span class="bgm-track-title">${title}</span>
          <span class="bgm-track-artist">${artist}</span>
        </div>
        <div class="bgm-card-footer">
          <span class="bgm-fit-badge ${isNegative ? 'negative' : ''}">
            ${selTrack ? `Fit: ${fitLabel}` : 'Empty'}
          </span>
          <div class="bgm-card-actions">
            <button type="button" class="btn-card-change" data-slot="${idx}" title="Choose another track from your 1,295 songs">
              📂 Change
            </button>
            <button type="button" class="btn-card-audition" data-slot="${idx}">
              ${isActive && !video.paused ? '⏸ Audition' : '▶ Audition'}
            </button>
          </div>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-card-audition') && !e.target.closest('.btn-card-change')) {
          activateSlot(idx, true);
        }
      });

      const audBtn = card.querySelector('.btn-card-audition');
      if (audBtn) {
        audBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (bgmState.activeSlotIndex === idx && !video.paused) {
            video.pause();
          } else {
            activateSlot(idx, true);
          }
        });
      }

      const changeBtn = card.querySelector('.btn-card-change');
      if (changeBtn) {
        changeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openLibraryBrowser(idx);
        });
      }

      cardsContainer.appendChild(card);
    });
  }

  // Fetch BGM Data and Refresh Everything in parallel
  let isLoadingBGM = false;
  async function loadBGMData() {
    if (isLoadingBGM) return;
    isLoadingBGM = true;
    try {
      const activeSessionId = (arrangerDataCache && arrangerDataCache.selected_session_id) ? arrangerDataCache.selected_session_id : null;
      const slotsUrl = activeSessionId ? `/api/recording-slots?session_id=${encodeURIComponent(activeSessionId)}` : '/api/recording-slots';
      const [statResult, slotsResult, recResult] = await Promise.allSettled([
        fetch('/api/music-catalog/status').then(r => r.json()),
        fetch(slotsUrl).then(r => r.json()),
        fetch('/api/music-catalog/recommend').then(r => r.json())
      ]);

      // 1. Process Library Status
      if (statResult.status === 'fulfilled' && statResult.value && statResult.value.status === 'ok') {
        const d = statResult.value;
        if (libraryBadge) libraryBadge.textContent = `● ${(d.total_tracks || 0).toLocaleString()} tracks indexed`;
      } else {
        if (libraryBadge) libraryBadge.textContent = '● Library ready';
      }

      // 2. Process Recording Slots
      if (slotsResult.status === 'fulfilled' && slotsResult.value && slotsResult.value.slots) {
        bgmState.slots = slotsResult.value.slots;
        const totalSec = bgmState.slots.reduce((sum, s) => sum + (s.duration_sec || 0), 0);
        if (runDurationBadge) {
          runDurationBadge.textContent = `Combat Run: ${formatDuration(totalSec)}`;
        }
      }

      // 3. Process BGM Recommendations
      if (recResult.status === 'fulfilled' && recResult.value && recResult.value.assignments) {
        bgmState.assignments = recResult.value.assignments;
        bgmState.knownTracks = bgmState.knownTracks || {};
        Object.values(recResult.value.assignments).forEach(asg => {
          if (asg && asg.selected) bgmState.knownTracks[asg.selected.id] = asg.selected;
          if (asg && asg.alternatives) asg.alternatives.forEach(t => { bgmState.knownTracks[t.id] = t; });
        });
      }

      renderSlotCards();

      // Auto-load slot 0 only if clips exist
      if (bgmState.slots && bgmState.slots.length > 0) {
        activateSlot(0, false);
      }
    } catch (e) {
      console.warn('Error loading BGM studio data:', e);
    } finally {
      isLoadingBGM = false;
    }
  }

  // Expose loadBGMData globally for Desktop Mode navigation switcher
  window.loadBGMData = loadBGMData;

  // Expose a lightweight refresher: re-renders from cache if data is ready,
  // otherwise falls through to a full fetch. Prevents the blank-tab race where
  // isLoadingBGM=true during startup causes the tab-switch call to return early
  // and renderSlotCards() is never called when the user first opens the Music tab.
  window.refreshBGMView = function() {
    if (bgmState.slots && bgmState.slots.length > 0) {
      renderSlotCards();
      if (bgmState.activeSlotIndex == null || bgmState.activeSlotIndex < 0) {
        activateSlot(0, false);
      }
    } else {
      loadBGMData();
    }
  };

  // Open Modal / Switch View Listener
  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      if (switchStudioView) {
        switchStudioView('bgm');
      } else {
        loadBGMData();
      }
    });
  }

  // Close Modal Listener
  function closeModal() {
    if (modal) modal.classList.remove('open');
    video.pause();
    audio.pause();
    if (libModal) libModal.classList.remove('open');
  }

  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnDone) btnDone.addEventListener('click', closeModal);
  window.addEventListener('bgm-modal-closed', closeModal);

  // Rescan Library Button
  if (btnRescan) {
    btnRescan.addEventListener('click', async () => {
      btnRescan.textContent = '⏳ Scanning...';
      libraryBadge.textContent = '● Scanning Music Library...';
      try {
        const res = await fetch('/api/music-catalog/rescan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const data = await res.json();
        if (data.status === 'ok') {
          showToast(`✓ Scanned ${data.total_tracks} tracks in ${data.scan_time_sec}s!`);
          loadBGMData();
        } else {
          showToast('Scan note: ' + (data.message || 'Error scanning'));
        }
      } catch (err) {
        showToast('Error triggering scan');
      } finally {
        btnRescan.textContent = '↻ Rescan Library';
      }
    });
  }

  // 1-Click Apply BGM to CapCut
  if (btnApplyCapCut) {
    btnApplyCapCut.addEventListener('click', async () => {
      const originalHtml = btnApplyCapCut.innerHTML;
      btnApplyCapCut.disabled = true;
      btnApplyCapCut.innerHTML = '⏳ Assembling CapCut Project & Launching...';

      // Collect the 4 selected tracks
      const keys = ['chamber_1', 'chamber_2', 'chamber_3', 'builds'];
      const suite = keys.map(k => {
        const assign = bgmState.assignments[k];
        return assign && assign.selected ? assign.selected : null;
      });

      // Save locally to active BGM session
      localStorage.setItem('abyss_active_bgm_suite', JSON.stringify(suite));

      try {
        const res = await fetch('/api/assemble-capcut', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ suite: suite, transition: 'black_fade', clip_volume: 0.10, music_volume: 0.0316 })
        });
        const data = await res.json();
        if (data.status === 'ok') {
          btnApplyCapCut.innerHTML = '✓ CapCut Launched!';
          btnApplyCapCut.style.backgroundColor = '#10b981';
          showToast(`🎉 ${data.message || 'CapCut draft synthesized and launched! Check CapCut PC.'}`);
          setTimeout(() => {
            btnApplyCapCut.innerHTML = originalHtml;
            btnApplyCapCut.style.backgroundColor = '';
            btnApplyCapCut.disabled = false;
          }, 5000);
        } else {
          btnApplyCapCut.innerHTML = '⚠ Assembly Failed';
          btnApplyCapCut.style.backgroundColor = '#ef4444';
          showToast(`Error: ${data.message || 'Failed to assemble project'}`);
          setTimeout(() => {
            btnApplyCapCut.innerHTML = originalHtml;
            btnApplyCapCut.style.backgroundColor = '';
            btnApplyCapCut.disabled = false;
          }, 4000);
        }
      } catch (err) {
        btnApplyCapCut.innerHTML = originalHtml;
        btnApplyCapCut.disabled = false;
        showToast('Connection error communicating with CapCut assembler');
      }
    });
  }

  // ==========================================
  // Full Music Library Browser (1,295 Tracks)
  // ==========================================
  function openLibraryBrowser(slotIdx) {
    currentLibSlot = slotIdx !== undefined ? slotIdx : bgmState.activeSlotIndex;
    const slotKey = getSlotKey(currentLibSlot);
    const slotData = bgmState.assignments[slotKey] || {};
    const recSlot = bgmState.slots[currentLibSlot];
    const slotLabel = recSlot ? recSlot.label : (currentLibSlot === 3 ? 'Character Builds' : `Chamber ${currentLibSlot + 1}`);
    const durFormatted = recSlot ? recSlot.duration_formatted : formatDuration(slotData.target_sec || 90);

    if (libSlotTarget) {
      libSlotTarget.textContent = `Assigning to: ${slotLabel} (Target Duration: ${durFormatted})`;
    }

    if (libModal) {
      libModal.classList.add('open');
      fetchAndRenderLibraryTracks();
    }
  }

  function closeLibraryBrowser() {
    if (libModal) libModal.classList.remove('open');
  }

  if (btnOpenLibrary) {
    btnOpenLibrary.addEventListener('click', () => openLibraryBrowser(bgmState.activeSlotIndex));
  }
  if (btnLibClose) btnLibClose.addEventListener('click', closeLibraryBrowser);
  if (btnLibDone) btnLibDone.addEventListener('click', closeLibraryBrowser);

  // Search input live filtering
  if (libSearchInput) {
    libSearchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (btnLibClearSearch) {
        btnLibClearSearch.style.display = q ? 'block' : 'none';
      }
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        fetchAndRenderLibraryTracks();
      }, 200);
    });
  }

  if (btnLibClearSearch) {
    btnLibClearSearch.addEventListener('click', () => {
      libSearchInput.value = '';
      btnLibClearSearch.style.display = 'none';
      fetchAndRenderLibraryTracks();
    });
  }

  // Filter chips
  if (libFilterChips) {
    libFilterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        libFilterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeLibFilter = chip.getAttribute('data-filter') || 'all';
        fetchAndRenderLibraryTracks();
      });
    });
  }

  async function fetchAndRenderLibraryTracks() {
    if (!libResultsList) return;
    libResultsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #94a3b8;">Searching 1,295 tracks...</div>';

    const slotKey = getSlotKey(currentLibSlot);
    const slotData = bgmState.assignments[slotKey] || {};
    const recSlot = bgmState.slots[currentLibSlot];
    const targetSec = recSlot ? recSlot.duration_sec : (slotData.target_sec || 90);
    const slotLabel = recSlot ? recSlot.label : (currentLibSlot === 3 ? 'Character Builds' : `Chamber ${currentLibSlot + 1}`);

    const query = libSearchInput ? libSearchInput.value.trim() : '';
    let url = `/api/music-catalog/tracks?target_sec=${targetSec}&limit=80`;
    if (query) url += `&query=${encodeURIComponent(query)}`;
    if (activeLibFilter === 'high' || activeLibFilter === 'chill') {
      url += `&energy=${activeLibFilter}`;
    }

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.status !== 'ok' || !data.tracks) {
        libResultsList.innerHTML = `<div style="padding: 20px; text-align: center; color: #ef4444;">${data.message || 'Error loading tracks'}</div>`;
        return;
      }

      let tracks = data.tracks;
      if (activeLibFilter === 'fit') {
        tracks = tracks.filter(t => Math.abs(t.delta_sec) <= 15.0);
      }

      if (libCountBadge) {
        libCountBadge.textContent = `● Showing ${tracks.length} / ${data.total_matched.toLocaleString()} tracks`;
      }

      if (tracks.length === 0) {
        libResultsList.innerHTML = `
          <div style="padding: 30px; text-align: center; color: #94a3b8;">
            <p style="font-size: 1.1rem; margin-bottom: 6px;">🔍 No matching tracks found</p>
            <p style="font-size: 0.8rem; color: #64748b;">Try searching a different artist or clearing filters.</p>
          </div>
        `;
        return;
      }

      libResultsList.innerHTML = '';
      tracks.forEach(t => {
        bgmState.knownTracks = bgmState.knownTracks || {};
        bgmState.knownTracks[t.id] = t;

        const row = document.createElement('div');
        row.className = `bgm-lib-track-row ${auditioningLibTrackId === t.id ? 'is-auditioning' : ''}`;
        row.setAttribute('data-track-id', t.id);

        const delta = t.delta_sec || 0;
        let fitClass = 'fit-close';
        if (Math.abs(delta) <= 3.0) fitClass = 'fit-perfect';
        else if (Math.abs(delta) > 20.0) fitClass = 'fit-far';

        const fitText = t.fit_label ? `Fit: ${t.fit_label}` : '';
        const folderTag = t.folder ? `<span class="bgm-folder-badge">${t.folder}</span>` : '';
        const isCurrentlyPlaying = auditioningLibTrackId === t.id && !audio.paused;

        row.innerHTML = `
          <div class="bgm-row-left">
            <button type="button" class="btn-row-audition" title="${isCurrentlyPlaying ? 'Pause' : 'Audition with video'}">
              ${isCurrentlyPlaying ? '⏸' : '▶'}
            </button>
            <div class="bgm-row-meta">
              <div class="bgm-row-title-line">
                <span class="bgm-row-title">${t.title}</span>
                ${folderTag}
              </div>
              <span class="bgm-row-artist">${t.artist || 'Unknown Artist'}</span>
            </div>
          </div>
          <div class="bgm-row-right">
            <span class="bgm-row-dur">${t.duration_formatted}</span>
            <span class="bgm-row-fit-tag ${fitClass}">${fitText}</span>
            <button type="button" class="btn-row-select">Select Track</button>
          </div>
        `;

        // Audition button click
        const audBtn = row.querySelector('.btn-row-audition');
        audBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (auditioningLibTrackId === t.id && !audio.paused) {
            audio.pause();
            auditioningLibTrackId = null;
            row.classList.remove('is-auditioning');
            audBtn.textContent = '▶';
          } else {
            // If current active slot in video player doesn't match, switch video slot
            if (bgmState.activeSlotIndex !== currentLibSlot) {
              activateSlot(currentLibSlot, false);
            }
            auditioningLibTrackId = t.id;
            document.querySelectorAll('.bgm-lib-track-row').forEach(r => {
              r.classList.remove('is-auditioning');
              const b = r.querySelector('.btn-row-audition');
              if (b) b.textContent = '▶';
            });
            row.classList.add('is-auditioning');
            audBtn.textContent = '⏸';

            audio.src = `/api/stream-audio?path=${encodeURIComponent(t.path)}`;
            bgmState.currentInPoint = t.in_point_sec || 0.0;
            if (activeTrackLabel) activeTrackLabel.textContent = `♫ ${t.title} (${t.fit_label || ''})`;
            syncAudioToVideo();
            audio.play().catch(() => {});
            if (video.paused) video.play().catch(() => {});
            showToast(`🎧 Auditioning: ${t.title}`);
          }
        });

        // Select Track button click
        const selBtn = row.querySelector('.btn-row-select');
        selBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          // Assign track to slot
          const slotKey = getSlotKey(currentLibSlot);
          if (!bgmState.assignments[slotKey]) bgmState.assignments[slotKey] = {};
          bgmState.assignments[slotKey].selected = t;

          // If active in player, update player immediately
          if (bgmState.activeSlotIndex === currentLibSlot) {
            bgmState.currentInPoint = t.in_point_sec || 0.0;
            audio.src = `/api/stream-audio?path=${encodeURIComponent(t.path)}`;
            if (activeTrackLabel) activeTrackLabel.textContent = `♫ ${t.title} (${t.fit_label || ''})`;
            syncAudioToVideo();
            if (!video.paused) audio.play().catch(() => {});
          }

          renderSlotCards();

          // Refresh candidate switcher
          if (candidateSelect && bgmState.activeSlotIndex === currentLibSlot) {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = `★ ${t.title} - ${t.artist} (${t.duration_formatted} | ${t.fit_label || ''})`;
            opt.selected = true;
            candidateSelect.insertBefore(opt, candidateSelect.firstChild);
          }

          closeLibraryBrowser();
          showToast(`✓ Assigned "${t.title}" to ${slotLabel}`);
        });

        libResultsList.appendChild(row);
      });
    } catch (err) {
      libResultsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #ef4444;">Failed to query music catalog</div>';
    }
  }

  // Keyboard Shortcuts inside Audition Studio
  window.addEventListener('keydown', (e) => {
    if (viewBGM.style.display === 'none' && (!modal || !modal.classList.contains('open'))) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (video.paused) video.play(); else video.pause();
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      video.currentTime = 0;
      syncAudioToVideo();
      video.play();
    } else if (e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      const jumpTime = Math.max(0, bgmState.currentInPoint);
      video.currentTime = jumpTime;
      syncAudioToVideo();
      video.play();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      video.currentTime = Math.min((video.duration || 100), video.currentTime + 5);
      syncAudioToVideo();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - 5);
      syncAudioToVideo();
    } else if (e.key === 'Escape') {
      closeModal();
    }
  });

  // Pre-load BGM recommendations in background so cards are ready instantly
  loadBGMData();

  // Auto-launch Audition studio if requested via URL query: ?audition=0
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('audition')) {
      const slotNum = parseInt(urlParams.get('audition'), 10) || 0;
      setTimeout(() => {
        if (switchStudioView) switchStudioView('bgm');
        loadBGMData().then(() => {
          activateSlot(slotNum, true);
        });
      }, 400);
    }
  } catch (e) {}
}

export {
  setupSmartBGMAuditionListeners,
  formatDuration,
  syncAudioToVideo,
  activateSlot,
  renderSlotCards,
  loadBGMData,
  openLibraryBrowser,
  closeLibraryBrowser,
  fetchAndRenderLibraryTracks
};
