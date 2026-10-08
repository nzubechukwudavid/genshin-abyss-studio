/**
 * Stygian Onslaught Arranger ES Module for Genshin Abyss Studio.
 * Handles 3-Boss + Builds video ingestion, HTML5 drag-and-drop, slot re-ordering,
 * BGM multi-topology recommendations, and native CapCut PC draft synthesis.
 */

// --- Stygian Onslaught Arranger Controller (Complete Robust Implementation) ---
let stygianRunState = {
  slots: [null, null, null, null], // [Boss1, Boss2, Boss3, Builds] full file paths
  slotMeta: [null, null, null, null], // [Boss1, Boss2, Boss3, Builds] { path, filename, duration, duration_formatted, thumbnail_url }
  activeTopology: 'topology_2x2',
  topologiesData: null
};
let activePickerSlot = 0;
let stygianClipsCache = [];

async function initStygianArranger() {
  // Sync boss names from active cycle if available
  updateStygianBossTitles();

  // If all slots are empty, auto-detect recordings
  if (stygianRunState.slots.every(s => !s)) {
    await autoDetectStygianClips(false);
  } else {
    updateStygianSlotCards();
    await fetchStygianBgmRecommendations();
  }
}
window.initStygianArranger = initStygianArranger;

function updateStygianBossTitles() {
  try {
    const defaultLabels = ['BOSS 1 (Battlefield 1)', 'BOSS 2 (Battlefield 2)', 'BOSS 3 (Battlefield 3)', 'BUILDS SHOWCASE'];
    for (let idx = 0; idx < 4; idx++) {
      const titleEl = document.getElementById(`stygianBossName${idx}`);
      if (titleEl) {
        if (idx < 3 && state && state.stygianBosses && state.stygianBosses[idx] && state.stygianBosses[idx].short_name) {
          titleEl.textContent = `${state.stygianBosses[idx].short_name} (Battlefield ${idx + 1})`;
        } else {
          titleEl.textContent = defaultLabels[idx];
        }
      }
    }
  } catch (e) {}
}

async function autoDetectStygianClips(userInitiated = false) {
  const refreshBtn = document.getElementById('btnStygianRefresh');
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '⏳ Scanning...';
  }

  try {
    // 1. Fetch recording sessions & all clips in parallel
    const [sessRes, clipsRes] = await Promise.all([
      fetch('/api/recordings/sessions').then(r => r.ok ? r.json() : { sessions: [] }),
      fetch('/api/recordings/all-clips').then(r => r.ok ? r.json() : { clips: [] })
    ]);

    const sessions = sessRes.sessions || [];
    const allClips = clipsRes.clips || [];
    stygianClipsCache = allClips;

    let matchedClips = [];
    let detectedSource = '';

    // Priority 1: Check for a session with exactly 4 clips (chronological run)
    const fourClipSession = sessions.find(s => s.clip_count === 4 && s.session_id !== 'session_all');
    if (fourClipSession && fourClipSession.clips && fourClipSession.clips.length === 4) {
      matchedClips = fourClipSession.clips;
      detectedSource = fourClipSession.label || '4-clip recording session';
    }

    // Priority 2: Check for sample clips (in sample directory or containing 'sample')
    if (matchedClips.length === 0) {
      const sampleClips = allClips.filter(c => c.path && c.path.toLowerCase().includes('sample'));
      if (sampleClips.length >= 4) {
        matchedClips = sampleClips.slice(0, 4);
        detectedSource = 'Sample folder recordings';
      }
    }

    // Priority 3: Fall back to chronological 4 clips from any session
    if (matchedClips.length === 0 && allClips.length >= 4) {
      matchedClips = allClips.slice(0, 4);
      detectedSource = 'Recent recordings';
    } else if (matchedClips.length === 0 && allClips.length > 0) {
      matchedClips = allClips;
      detectedSource = `${allClips.length} available recording(s)`;
    }

    if (matchedClips.length > 0) {
      for (let i = 0; i < 4; i++) {
        if (matchedClips[i]) {
          stygianRunState.slots[i] = matchedClips[i].path;
          stygianRunState.slotMeta[i] = matchedClips[i];
        } else {
          stygianRunState.slots[i] = null;
          stygianRunState.slotMeta[i] = null;
        }
      }
      updateStygianSlotCards();
      await fetchStygianBgmRecommendations();

      if (userInitiated) {
        showToast(`✓ Auto-detected Stygian run from ${detectedSource}!`);
      }
    } else {
      if (userInitiated) {
        showToast('ℹ No MP4 recordings found in screen recorder folder. Use "Choose Video" to browse.');
      }
    }
  } catch (err) {
    console.error('Error auto-detecting stygian clips:', err);
    if (userInitiated) {
      showToast('⚠️ Failed to scan recordings: ' + err.message);
    }
  } finally {
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.textContent = '🔄 Auto-Detect Run';
    }
  }
}
window.autoDetectStygianClips = autoDetectStygianClips;

function updateStygianSlotCards() {
  updateStygianBossTitles();
  let filledCount = 0;
  let totalDurationSec = 0;

  for (let i = 0; i < 4; i++) {
    const meta = stygianRunState.slotMeta[i];
    const path = stygianRunState.slots[i];

    const durEl = document.getElementById(`stygianSlotDur${i}`);
    const imgEl = document.getElementById(`stygianThumbImg${i}`);
    const emptyEl = document.getElementById(`stygianThumbPlaceholder${i}`);
    const playEl = document.getElementById(`stygianPlayIcon${i}`);
    const infoEl = document.getElementById(`stygianSlot${i+1}Info`);
    const clearBtn = document.getElementById(`btnStygianClear${i}`);

    if (path) {
      filledCount++;
      const dur = meta ? (meta.duration_sec || meta.duration || 0) : 0;
      totalDurationSec += dur;
      const durFormatted = meta?.duration_formatted || formatSecondsToTime(dur);

      if (durEl) {
        durEl.textContent = durFormatted;
        durEl.style.display = 'inline-block';
      }

      if (imgEl && emptyEl && playEl) {
        if (meta && meta.thumbnail_url) {
          imgEl.src = meta.thumbnail_url;
          imgEl.style.display = 'block';
          emptyEl.style.display = 'none';
          playEl.style.display = 'flex';
        } else {
          imgEl.style.display = 'none';
          emptyEl.style.display = 'flex';
          emptyEl.innerHTML = '<span style="font-size: 1.6rem; opacity: 0.8; color: #38bdf8;">🎬</span><span style="color: #38bdf8; font-weight: 600;">Clip Selected</span>';
          playEl.style.display = 'flex';
        }
      }

      if (infoEl) {
        const fname = meta?.filename || path.split(/[\\/]/).pop();
        infoEl.textContent = `📁 ${fname}`;
        infoEl.title = path;
        infoEl.style.color = '#38bdf8';
      }

      if (clearBtn) clearBtn.style.display = 'inline-flex';
    } else {
      if (durEl) durEl.style.display = 'none';
      if (imgEl) imgEl.style.display = 'none';
      if (emptyEl) {
        emptyEl.style.display = 'flex';
        emptyEl.innerHTML = '<span style="font-size: 1.6rem; opacity: 0.6;">📹</span><span>No Video Selected</span>';
      }
      if (playEl) playEl.style.display = 'none';
      if (infoEl) {
        infoEl.textContent = 'No file selected';
        infoEl.title = '';
        infoEl.style.color = '#94a3b8';
      }
      if (clearBtn) clearBtn.style.display = 'none';
    }
  }

  // Update header total duration counter
  const totalDurEl = document.getElementById('stygianRunTotalDur');
  if (totalDurEl) {
    if (filledCount === 4) {
      totalDurEl.textContent = `4 Clips Ready (${formatSecondsToTime(totalDurationSec)})`;
      totalDurEl.style.color = '#a855f7';
    } else if (filledCount > 0) {
      totalDurEl.textContent = `${filledCount}/4 Clips Loaded (${formatSecondsToTime(totalDurationSec)})`;
      totalDurEl.style.color = '#38bdf8';
    } else {
      totalDurEl.textContent = '0 Clips Loaded';
      totalDurEl.style.color = '#94a3b8';
    }
  }
}

function formatSecondsToTime(sec) {
  if (!sec || isNaN(sec)) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// --- Clip Picker Modal Management ---
async function openStygianClipPicker(slotIdx) {
  activePickerSlot = slotIdx;
  const modal = document.getElementById('stygianClipPickerModal');
  const titleEl = document.getElementById('stygianPickerModalTitle');
  if (!modal) return;

  const slotLabels = ['BOSS 1 (Battlefield 1)', 'BOSS 2 (Battlefield 2)', 'BOSS 3 (Battlefield 3)', 'BUILDS SHOWCASE'];
  let slotName = slotLabels[slotIdx];
  if (slotIdx < 3 && state && state.stygianBosses && state.stygianBosses[slotIdx] && state.stygianBosses[slotIdx].short_name) {
    slotName = `${state.stygianBosses[slotIdx].short_name} (Battlefield ${slotIdx + 1})`;
  }

  if (titleEl) {
    titleEl.innerHTML = `<span>📁</span> Select Video for <b style="color: #38bdf8; margin-left: 4px;">${slotName}</b>`;
  }

  modal.style.display = 'flex';
  await refreshStygianPickerClips();
}
window.openStygianClipPicker = openStygianClipPicker;

function closeStygianClipPicker() {
  const modal = document.getElementById('stygianClipPickerModal');
  if (modal) modal.style.display = 'none';
}
window.closeStygianClipPicker = closeStygianClipPicker;

async function refreshStygianPickerClips() {
  const listEl = document.getElementById('stygianClipsList');
  const dirPathEl = document.getElementById('stygianPickerDirPath');
  if (!listEl) return;

  listEl.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--accent-cyan); font-size: 0.85rem;">⏳ Scanning recordings...</div>';

  try {
    const res = await fetch('/api/recordings/all-clips');
    const data = await res.json();
    const clips = data.clips || [];
    stygianClipsCache = clips;

    if (dirPathEl && data.directory) {
      dirPathEl.textContent = data.directory;
    }

    if (clips.length === 0) {
      listEl.innerHTML = '<div style="padding: 24px; text-align: center; color: #94a3b8; font-size: 0.84rem;">No recordings found in ScreenRecorder folder.<br><span style="font-size: 0.76rem; color: #64748b;">Use "Browse Any Folder" below to choose a file from your PC.</span></div>';
      return;
    }

    const currentPath = stygianRunState.slots[activePickerSlot];
    listEl.innerHTML = clips.map((clip, idx) => {
      const isSelected = clip.path === currentPath;
      return `
        <div class="stygian-clip-list-item ${isSelected ? 'active' : ''}" onclick="window.selectStygianClip(${activePickerSlot}, ${idx})">
          <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
            <div style="width: 48px; height: 32px; border-radius: 4px; overflow: hidden; background: #000; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
              ${clip.thumbnail_url ? `<img src="${clip.thumbnail_url}" style="width: 100%; height: 100%; object-fit: cover;" alt="thumb">` : `<span style="font-size: 1rem;">📹</span>`}
            </div>
            <div style="min-width: 0; flex: 1;">
              <div style="font-size: 0.84rem; font-weight: 600; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${clip.filename}
              </div>
              <div style="font-size: 0.72rem; color: #94a3b8; font-family: monospace;">
                ${clip.duration_formatted || '00:00'} • ${clip.size_mb || 0} MB
              </div>
            </div>
          </div>
          <button type="button" class="btn-secondary" style="font-size: 0.74rem; padding: 4px 12px; ${isSelected ? 'background: #0284c7; color: #fff; border-color: #38bdf8;' : ''}">
            ${isSelected ? '✓ Selected' : 'Choose'}
          </button>
        </div>
      `;
    }).join('');
  } catch (err) {
    listEl.innerHTML = `<div style="padding: 20px; text-align: center; color: #ef4444;">Error loading clips: ${err.message}</div>`;
  }
}
window.refreshStygianPickerClips = refreshStygianPickerClips;

function selectStygianClip(slotIdx, clipIndexOrObj) {
  let clip = null;
  if (typeof clipIndexOrObj === 'number') {
    clip = stygianClipsCache[clipIndexOrObj];
  } else {
    clip = clipIndexOrObj;
  }
  if (!clip || !clip.path) return;

  stygianRunState.slots[slotIdx] = clip.path;
  stygianRunState.slotMeta[slotIdx] = clip;
  updateStygianSlotCards();
  fetchStygianBgmRecommendations();
  closeStygianClipPicker();
  showToast(`✓ Assigned ${clip.filename} to Slot ${slotIdx + 1}`);
}
window.selectStygianClip = selectStygianClip;

async function pickStygianFileViaNative() {
  try {
    const slotLabels = ['Boss 1', 'Boss 2', 'Boss 3', 'Builds'];
    const res = await fetch('/api/pick-video-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `Select MP4 Video for ${slotLabels[activePickerSlot]}` })
    });
    if (res.ok) {
      const data = await res.json();
      const clip = data.clip || (data.file_path ? {
        path: data.file_path,
        filename: data.file_path.split(/[\\/]/).pop(),
        duration: 0,
        duration_formatted: '00:00',
        thumbnail_url: ''
      } : null);

      if (clip && clip.path) {
        selectStygianClip(activePickerSlot, clip);
      }
    }
  } catch (e) {
    console.error('Native file pick error:', e);
    showToast('⚠️ Native picker encountered an error: ' + e.message);
  }
}
window.pickStygianFileViaNative = pickStygianFileViaNative;

function handleStygianWebFilePicked(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  // Search if file exists in all-clips cache by name
  const matched = stygianClipsCache.find(c => c.filename === file.name);
  if (matched) {
    selectStygianClip(activePickerSlot, matched);
  } else {
    // Construct local reference
    const syntheticClip = {
      filename: file.name,
      path: file.name,
      duration: 0,
      duration_formatted: '00:00',
      thumbnail_url: ''
    };
    selectStygianClip(activePickerSlot, syntheticClip);
  }
  e.target.value = '';
}
window.handleStygianWebFilePicked = handleStygianWebFilePicked;

function clearStygianSlot(slotIdx) {
  stygianRunState.slots[slotIdx] = null;
  stygianRunState.slotMeta[slotIdx] = null;
  updateStygianSlotCards();
  fetchStygianBgmRecommendations();
  showToast(`Cleared Slot ${slotIdx + 1}`);
}
window.clearStygianSlot = clearStygianSlot;

function clearCurrentStygianPickerSlot() {
  clearStygianSlot(activePickerSlot);
  closeStygianClipPicker();
}
window.clearCurrentStygianPickerSlot = clearCurrentStygianPickerSlot;

let activeStygianSwapSlot = null;
let draggedStygianSlot = null;

function swapStygianSlots(idxA, idxB) {
  if (idxA < 0 || idxA > 3 || idxB < 0 || idxB > 3 || idxA === idxB) return;
  const tempSlot = stygianRunState.slots[idxA];
  const tempMeta = stygianRunState.slotMeta[idxA];
  stygianRunState.slots[idxA] = stygianRunState.slots[idxB];
  stygianRunState.slotMeta[idxA] = stygianRunState.slotMeta[idxB];
  stygianRunState.slots[idxB] = tempSlot;
  stygianRunState.slotMeta[idxB] = tempMeta;

  activeStygianSwapSlot = null;
  clearStygianSwapVisuals();
  updateStygianSlotCards();
  fetchStygianBgmRecommendations();

  const slotNames = ['Boss 1', 'Boss 2', 'Boss 3', 'Builds'];
  if (typeof showToast === 'function') {
    showToast(`✅ Swapped ${slotNames[idxA]} and ${slotNames[idxB]}!`);
  }
}
window.swapStygianSlots = swapStygianSlots;

function moveStygianSlot(idx, dir) {
  const target = idx + dir;
  if (target >= 0 && target < 4) {
    swapStygianSlots(idx, target);
  }
}
window.moveStygianSlot = moveStygianSlot;

function initiateStygianSwap(idx) {
  if (activeStygianSwapSlot === null) {
    activeStygianSwapSlot = idx;
    applyStygianSwapVisuals();
    const slotNames = ['Boss 1', 'Boss 2', 'Boss 3', 'Builds'];
    if (typeof showToast === 'function') {
      showToast(`🎯 Swap initiated for ${slotNames[idx]} - Click any other slot to swap!`);
    }
  } else if (activeStygianSwapSlot === idx) {
    activeStygianSwapSlot = null;
    clearStygianSwapVisuals();
    if (typeof showToast === 'function') {
      showToast('Swap cancelled.');
    }
  } else {
    const src = activeStygianSwapSlot;
    swapStygianSlots(src, idx);
  }
}
window.initiateStygianSwap = initiateStygianSwap;

function applyStygianSwapVisuals() {
  for (let i = 0; i < 4; i++) {
    const card = document.getElementById(`stygianSlotCard${i}`);
    const swapBtn = document.getElementById(`btnStygianSwap${i}`);
    if (!card) continue;
    if (i === activeStygianSwapSlot) {
      card.classList.add('swap-source');
      card.classList.remove('swap-target-candidate');
      if (swapBtn) {
        swapBtn.innerHTML = '✕ Cancel';
        swapBtn.style.color = '#fbbf24';
        swapBtn.style.borderColor = 'rgba(251, 191, 36, 0.6)';
        swapBtn.style.background = 'rgba(245, 158, 11, 0.2)';
      }
    } else {
      card.classList.remove('swap-source');
      card.classList.add('swap-target-candidate');
      if (swapBtn) {
        swapBtn.innerHTML = '⇄ Swap';
        swapBtn.style.color = '#c084fc';
        swapBtn.style.borderColor = '';
        swapBtn.style.background = '';
      }
    }
  }
}

function clearStygianSwapVisuals() {
  for (let i = 0; i < 4; i++) {
    const card = document.getElementById(`stygianSlotCard${i}`);
    const swapBtn = document.getElementById(`btnStygianSwap${i}`);
    if (card) {
      card.classList.remove('swap-source');
      card.classList.remove('swap-target-candidate');
    }
    if (swapBtn) {
      swapBtn.innerHTML = '⇄ Swap';
      swapBtn.style.color = '#c084fc';
      swapBtn.style.borderColor = '';
      swapBtn.style.background = '';
    }
  }
}

function handleStygianCardClick(e, slotIdx) {
  if (activeStygianSwapSlot !== null) {
    if (e.target.closest('button') || e.target.closest('input')) return;
    if (activeStygianSwapSlot === slotIdx) {
      activeStygianSwapSlot = null;
      clearStygianSwapVisuals();
      if (typeof showToast === 'function') showToast('Swap cancelled.');
    } else {
      const src = activeStygianSwapSlot;
      swapStygianSlots(src, slotIdx);
    }
  }
}
window.handleStygianCardClick = handleStygianCardClick;

function handleStygianThumbClick(slotIdx, e) {
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation();
  }
  if (activeStygianSwapSlot !== null) {
    if (activeStygianSwapSlot === slotIdx) {
      activeStygianSwapSlot = null;
      clearStygianSwapVisuals();
      if (typeof showToast === 'function') showToast('Swap cancelled.');
    } else {
      const src = activeStygianSwapSlot;
      swapStygianSlots(src, slotIdx);
    }
    return;
  }
  const path = stygianRunState.slots[slotIdx];
  const meta = stygianRunState.slotMeta[slotIdx];
  const slotLabels = ['Boss 1 (Battlefield 1)', 'Boss 2 (Battlefield 2)', 'Boss 3 (Battlefield 3)', 'Builds Showcase'];
  if (path && typeof window.openVideoPreview === 'function') {
    window.openVideoPreview({
      path: path,
      title: slotLabels[slotIdx] || `Slot ${slotIdx + 1}`,
      subtitle: meta?.filename || path.split(/[\\/]/).pop(),
      duration: meta?.duration_formatted || '00:00'
    });
  } else {
    openStygianClipPicker(slotIdx);
  }
}
window.handleStygianThumbClick = handleStygianThumbClick;

function handleStygianDragStart(e, idx) {
  draggedStygianSlot = idx;
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', String(idx));
    e.dataTransfer.effectAllowed = 'move';
  }
  const card = document.getElementById(`stygianSlotCard${idx}`);
  if (card) card.classList.add('dragging');
}
window.handleStygianDragStart = handleStygianDragStart;

function handleStygianDragOver(e) {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
  const card = e.currentTarget;
  if (card) card.classList.add('drag-over');
}
window.handleStygianDragOver = handleStygianDragOver;


// ==========================================================================
// DESKTOP ARRANGER DRAG-AND-DROP INGESTION & RE-ORDERING
// ==========================================================================
let draggedArrangerSlot = null;

window.handleArrangerDragStart = function(e, idx) {
  draggedArrangerSlot = idx;
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', String(idx));
    e.dataTransfer.effectAllowed = 'copyMove';
  }
  const card = e.currentTarget;
  if (card) card.classList.add('dragging');
};

window.handleArrangerDragOver = function(e) {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy';
  }
  const card = e.currentTarget;
  if (card) card.classList.add('drag-over', 'slot-drag-hover');
};

window.handleArrangerDragLeave = function(e) {
  const card = e.currentTarget;
  if (card) card.classList.remove('drag-over', 'slot-drag-hover');
};

window.handleArrangerDragEnd = function(e) {
  draggedArrangerSlot = null;
  document.querySelectorAll('.arranger-card').forEach(c => {
    c.classList.remove('dragging', 'drag-over', 'slot-drag-hover');
  });
};

window.handleDirectVideoFileDrop = function(file, targetIdx, mode = 'standard') {
  const filename = file.name;
  const sizeMb = (file.size / (1024 * 1024)).toFixed(1);

  if (mode === 'standard') {
    if (window.arrangerDataCache && window.arrangerDataCache.active_slots) {
      const slot = window.arrangerDataCache.active_slots[targetIdx];
      if (slot) {
        slot.filename = filename;
        slot.path = file.path || filename;
        slot.filesize_mb = sizeMb;
        slot.is_assigned = true;
        renderArrangerCards(window.arrangerDataCache);
        if (window.showToast) {
          window.showToast(`?? Ingested "${filename}" into Slot ${targetIdx + 1}!`);
        }
      }
    }
  } else if (mode === 'stygian') {
    if (window.stygianSlots && window.stygianSlots[targetIdx]) {
      window.stygianSlots[targetIdx].filename = filename;
      window.stygianSlots[targetIdx].path = file.path || filename;
      window.stygianSlots[targetIdx].filesize_mb = sizeMb;
      window.stygianSlots[targetIdx].is_custom = true;
      if (typeof window.renderStygianCards === 'function') {
        window.renderStygianCards();
      }
      if (window.showToast) {
        window.showToast(`?? Ingested "${filename}" into Boss Slot ${targetIdx + 1}!`);
      }
    }
  }
};

window.handleArrangerDrop = function(e, targetIdx) {
  e.preventDefault();
  const card = e.currentTarget;
  if (card) card.classList.remove('drag-over', 'slot-drag-hover');

  // Case 1: External video file dropped from Windows Explorer
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    if (file && file.name.match(/\.(mp4|mkv|mov|avi|webm)$/i)) {
      window.handleDirectVideoFileDrop(file, targetIdx, 'standard');
      return;
    }
  }

  // Case 2: Internal slot swapping / re-ordering
  let srcIdx = draggedArrangerSlot;
  if (srcIdx === null && e.dataTransfer) {
    srcIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
  }
  if (srcIdx !== null && !isNaN(srcIdx) && srcIdx !== targetIdx && srcIdx >= 0) {
    window.swapStandardAdjacentSlots(srcIdx, targetIdx);
  }
  draggedArrangerSlot = null;
};

function handleStygianDrop(e, targetIdx) {
  e.preventDefault();
  const card = e.currentTarget;
  if (card) {
    card.classList.remove('drag-over', 'slot-drag-hover');
  }

  // Case 1: External file dropped from OS desktop / explorer
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    if (file && file.name.match(/\.(mp4|mkv|mov|avi|webm)$/i)) {
      window.handleDirectVideoFileDrop(file, targetIdx, 'stygian');
      return;
    }
  }

  // Case 2: Slot reordering
  let srcIdx = draggedStygianSlot;
  if (srcIdx === null && e.dataTransfer) {
    srcIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
  }
  if (srcIdx !== null && !isNaN(srcIdx) && srcIdx !== targetIdx && srcIdx >= 0 && srcIdx < 4) {
    swapStygianSlots(srcIdx, targetIdx);
  }
  draggedStygianSlot = null;
}
window.handleStygianDrop = handleStygianDrop;

function handleStygianDragEnd(e) {
  draggedStygianSlot = null;
  for (let i = 0; i < 4; i++) {
    const card = document.getElementById(`stygianSlotCard${i}`);
    if (card) {
      card.classList.remove('dragging');
      card.classList.remove('drag-over');
    }
  }
}
window.handleStygianDragEnd = handleStygianDragEnd;

// Fallback legacy function called by any remaining onclick="window.pickStygianFile(idx)"
window.pickStygianFile = function(slotIdx) {
  openStygianClipPicker(slotIdx);
};

// --- BGM Multi-Topology Recommender ---
async function fetchStygianBgmRecommendations() {
  const statusEl = document.getElementById('stygianBgmStatus');
  if (statusEl) {
    statusEl.textContent = 'Evaluating music catalog across 4 candidate topologies...';
    statusEl.style.color = '#a855f7';
  }

  const b1 = Math.round(stygianRunState.slotMeta[0]?.duration_sec || stygianRunState.slotMeta[0]?.duration || 85);
  const b2 = Math.round(stygianRunState.slotMeta[1]?.duration_sec || stygianRunState.slotMeta[1]?.duration || 76);
  const b3 = Math.round(stygianRunState.slotMeta[2]?.duration_sec || stygianRunState.slotMeta[2]?.duration || 105);
  const builds = Math.round(stygianRunState.slotMeta[3]?.duration_sec || stygianRunState.slotMeta[3]?.duration || 90);

  try {
    const res = await fetch(`/api/music-catalog/recommend-stygian?b1=${b1}&b2=${b2}&b3=${b3}&builds=${builds}`);
    if (res.ok) {
      const data = await res.json();
      stygianRunState.topologiesData = data.topologies;
      stygianRunState.activeTopology = data.recommended_topology || stygianRunState.activeTopology || 'topology_2x2';

      if (statusEl) {
        statusEl.textContent = `Recommended: ${stygianRunState.activeTopology} (Optimal catalog fit)`;
        statusEl.style.color = '#4ade80';
      }
      selectStygianTopology(stygianRunState.activeTopology);
    }
  } catch (e) {
    if (statusEl) {
      statusEl.textContent = 'Default multi-topology active';
      statusEl.style.color = '#94a3b8';
    }
  }
}

function selectStygianTopology(topoKey) {
  stygianRunState.activeTopology = topoKey;
  const container = document.getElementById('stygianTopologyButtons');
  if (container) {
    const btns = container.querySelectorAll('button');
    btns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-topo') === topoKey);
    });
  }
}
window.selectStygianTopology = selectStygianTopology;

// --- Synthesize CapCut PC Project ---
// --- Open YouTube Metadata Hub with Specific Mode ---
window.openYTMetadataModalWithMode = function(mode) {
  const modal = document.getElementById('ytMetadataModal');
  if (modal) {
    modal.classList.add('open');
    if (mode === 'stygian') {
      const btnStygian = document.getElementById('btnYTModeStygian');
      if (btnStygian) btnStygian.click();
    } else if (mode === 'abyss') {
      const btnAbyss = document.getElementById('btnYTModeAbyss');
      if (btnAbyss) btnAbyss.click();
    }
  }
};

async function synthesizeStygianRun() {
  const btn = document.getElementById('btnSynthesizeStygian');
  const bossFiles = stygianRunState.slots.slice(0, 3).filter(Boolean);

  if (bossFiles.length === 0) {
    showToast('⚠️ Please select at least one boss video clip before synthesizing!');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Analyzing & Generating CapCut Draft...';
  }

  let bossNames = ["Battlefield 1", "Battlefield 2", "Battlefield 3"];
  if (state && state.stygianBosses) {
    bossNames = state.stygianBosses.map(b => b.short_name || b.name || "Boss");
  }

  const payload = {
    boss_files: bossFiles,
    builds_file: stygianRunState.slots[3] || null,
    topology: stygianRunState.activeTopology,
    transition_type: 'black_fade',
    project_name: 'Stygian Onslaught Fearless Run',
    boss_names: bossNames,
    auto_launch: true
  };

  try {
    const res = await fetch('/api/assemble-stygian-capcut', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.status === 'success') {
      const projName = result.result?.project_name || 'Stygian Onslaught Fearless Run';
      state.syncedSegmentsProject = projName;
      state.metadataMode = 'stygian';
      showToast(`⚡ CapCut Draft "${projName}" synthesized! Opening YouTube Hub...`, 4000);
      setTimeout(() => {
        window.openYTMetadataModalWithMode('stygian');
        const selDraft = document.getElementById('selCapcutProject');
        if (selDraft) {
          for (let opt of selDraft.options) {
            if (opt.value === projName || opt.text.includes(projName)) {
              selDraft.value = opt.value;
              break;
            }
          }
          const syncBtn = document.getElementById('btnSyncCapcutProject');
          if (syncBtn) syncBtn.click();
        }
      }, 700);
    } else {
      showToast('⚠️ Generation status: ' + (result.message || 'Draft initialized.'));
      alert(`⚠️ Generation note: ${result.message || 'Draft initialized.'}`);
    }
  } catch (e) {
    showToast('⚠️ Synthesis error: ' + e.message);
    alert(`Generation error: ${e.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🚀 Synthesize CapCut PC Project';
    }
  }
}
window.synthesizeStygianRun = synthesizeStygianRun;


export {
  initStygianArranger,
  updateStygianSlotCards,
  autoDetectStygianClips,
  openStygianClipPicker,
  closeStygianClipPicker,
  refreshStygianPickerClips,
  selectStygianClip,
  pickStygianFileViaNative,
  handleStygianWebFilePicked,
  clearStygianSlot,
  clearCurrentStygianPickerSlot,
  swapStygianSlots,
  moveStygianSlot,
  initiateStygianSwap,
  handleStygianCardClick,
  handleStygianThumbClick,
  handleStygianDragStart,
  handleStygianDragOver,
  handleStygianDrop,
  handleStygianDragEnd,
  fetchStygianBgmRecommendations,
  selectStygianTopology,
  synthesizeStygianRun
};
