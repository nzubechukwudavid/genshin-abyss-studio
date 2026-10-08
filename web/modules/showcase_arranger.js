/**
 * Showcase & Video Preview Arranger ES Module for Genshin Abyss Studio.
 * Handles Dual-Run 8-Slot project synthesis, CapCut showcase pipeline,
 * and high-fidelity video auditioning / preview player.
 */

// ==========================================================================
// Showcase / Inverse Dual-Run Video Arranger (7-8 Clips Dual Project Mode)
// ==========================================================================

const showcaseState = {
  run1: [
    { chamber: 1, label: 'Chamber 1', path: '', filename: 'Not selected', duration: 0, duration_formatted: '00:00', thumbnail_url: '' },
    { chamber: 2, label: 'Chamber 2', path: '', filename: 'Not selected', duration: 0, duration_formatted: '00:00', thumbnail_url: '' },
    { chamber: 3, label: 'Chamber 3', path: '', filename: 'Not selected', duration: 0, duration_formatted: '00:00', thumbnail_url: '' }
  ],
  run2: [
    { chamber: 1, label: 'Chamber 1', path: '', filename: 'Not selected', duration: 0, duration_formatted: '00:00', thumbnail_url: '' },
    { chamber: 2, label: 'Chamber 2', path: '', filename: 'Not selected', duration: 0, duration_formatted: '00:00', thumbnail_url: '' },
    { chamber: 3, label: 'Chamber 3', path: '', filename: 'Not selected', duration: 0, duration_formatted: '00:00', thumbnail_url: '' }
  ],
  buildsMode: 'combined', // 'combined' | 'separate'
  combinedBuilds: {
    path: '',
    filename: 'No clip selected',
    duration: 60,
    duration_formatted: '01:00',
    splitSeconds: 30
  },
  teamABuilds: {
    path: '',
    filename: 'No clip selected',
    duration: 0,
    duration_formatted: '00:00'
  },
  teamBBuilds: {
    path: '',
    filename: 'No clip selected',
    duration: 0,
    duration_formatted: '00:00'
  }
};
window.showcaseState = showcaseState;

function formatTimecodeSec(secs) {
  const s = Math.max(0, Math.floor(secs));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
}

function setupArrangerModeSwitcher() {
  setupArrangerModeListeners();

  let savedMode = 'basic';
  try {
    savedMode = localStorage.getItem('abyss_arranger_mode') || 'basic';
    if (savedMode === 'spotlight' || savedMode === 'showcase') savedMode = 'showcase';
    else savedMode = 'basic';
  } catch (e) {}
  setArrangerMode(savedMode);

  // Setup showcase event listeners once
  setupShowcaseEventListeners();
}

let showcaseListenersBound = false;
function setupShowcaseEventListeners() {
  if (showcaseListenersBound) return;
  showcaseListenersBound = true;

  // Session selector
  const sessionSelect = document.getElementById('showcaseSessionSelect');
  if (sessionSelect) {
    sessionSelect.addEventListener('change', () => {
      loadShowcaseSession(sessionSelect.value);
    });
  }

  // Rescan button
  const btnRescan = document.getElementById('btnShowcaseRescan');
  if (btnRescan) {
    btnRescan.addEventListener('click', () => {
      populateShowcaseSessions(true);
      showToast('🔄 Rescanned showcase recording sessions!');
    });
  }

  // Batch pick button
  const btnBatch = document.getElementById('btnShowcaseBatchPick');
  if (btnBatch) {
    btnBatch.addEventListener('click', pickShowcaseBatchFiles);
  }

  // Sync names from thumbnail characters
  const btnSync = document.getElementById('btnShowcaseSyncTeams');
  if (btnSync) {
    btnSync.addEventListener('click', syncShowcaseTeamNames);
  }

  // Builds radio mode toggle
  const radios = document.querySelectorAll('input[name="buildsModeRadio"]');
  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      showcaseState.buildsMode = radio.value;
      const combSec = document.getElementById('showcaseCombinedBuildsSection');
      const sepSec = document.getElementById('showcaseSeparateBuildsSection');
      if (radio.value === 'combined') {
        if (combSec) combSec.style.display = 'block';
        if (sepSec) sepSec.style.display = 'none';
      } else {
        if (combSec) combSec.style.display = 'none';
        if (sepSec) sepSec.style.display = 'block';
      }
    });
  });

  // Combined builds browse
  const btnBrowseComb = document.getElementById('btnBrowseCombinedBuilds');
  if (btnBrowseComb) {
    btnBrowseComb.addEventListener('click', () => {
      if (typeof window.openVisualClipPicker === 'function') {
        window.openVisualClipPicker({
          type: 'showcase_builds',
          title: 'Select Combined Builds Outro Video'
        });
      } else {
        showToast('Clip picker loading...');
      }
    });
  }

  // Combined builds split slider
  const slider = document.getElementById('showcaseBuildsSplitSlider');
  if (slider) {
    slider.addEventListener('input', () => {
      showcaseState.combinedBuilds.splitSeconds = parseFloat(slider.value);
      updateBuildsSliderLabels();
    });
  }

  // Separate builds browse buttons
  const btnBrowseA = document.getElementById('btnBrowseTeamABuilds');
  if (btnBrowseA) {
    btnBrowseA.addEventListener('click', () => {
      if (typeof window.openVisualClipPicker === 'function') {
        window.openVisualClipPicker({
          type: 'showcase_builds_a',
          title: 'Select Team A Character Builds Video'
        });
      }
    });
  }

  const btnBrowseB = document.getElementById('btnBrowseTeamBBuilds');
  if (btnBrowseB) {
    btnBrowseB.addEventListener('click', () => {
      if (typeof window.openVisualClipPicker === 'function') {
        window.openVisualClipPicker({
          type: 'showcase_builds_b',
          title: 'Select Team B Character Builds Video'
        });
      }
    });
  }

  // 1-Click Launch CapCut Showcase
  const btnLaunch = document.getElementById('btnShowcaseLaunchCapCut');
  if (btnLaunch) {
    btnLaunch.addEventListener('click', launchCapCutShowcasePipeline);
  }
}

function updateBuildsSliderLabels() {
  const slider = document.getElementById('showcaseBuildsSplitSlider');
  if (!slider) return;
  const splitSec = parseFloat(slider.value) || 30;
  const maxSec = parseFloat(slider.max) || 60;

  const lblAEnd = document.getElementById('lblSplitAEnd');
  const lblBStart = document.getElementById('lblSplitBStart');
  const lblBEnd = document.getElementById('lblSplitBEnd');

  if (lblAEnd) lblAEnd.textContent = formatTimecodeSec(splitSec);
  if (lblBStart) lblBStart.textContent = formatTimecodeSec(splitSec);
  if (lblBEnd) lblBEnd.textContent = formatTimecodeSec(maxSec);
}

function initShowcaseArranger() {
  renderShowcaseSlots();
  populateShowcaseSessions();
  updateBuildsSliderLabels();
}

function renderShowcaseSlots() {
  renderRunSlotsList('run1', document.getElementById('showcaseRun1Slots'));
  renderRunSlotsList('run2', document.getElementById('showcaseRun2Slots'));
  renderShowcaseBuildSlots();
}

function renderShowcaseBuildSlots() {
  const container = document.getElementById('showcaseSeparateBuildsContainer');
  if (container) {
    const slotA = showcaseState.teamABuilds || {};
    const slotB = showcaseState.teamBBuilds || {};
    const hasA = !!slotA.path;
    const hasB = !!slotB.path;

    const thumbA = slotA.thumbnail_url
      ? `<img class="slot-thumb-img" src="${slotA.thumbnail_url}" alt="Team 1 Builds" onerror="this.src='/static/icons/genshin_impact.ico'"/>`
      : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:1.2rem;">⚔️</div>`;

    const thumbB = slotB.thumbnail_url
      ? `<img class="slot-thumb-img" src="${slotB.thumbnail_url}" alt="Team 2 Builds" onerror="this.src='/static/icons/genshin_impact.ico'"/>`
      : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:1.2rem;">⚔️</div>`;

    container.innerHTML = `
      <div class="separate-build-card team-a-border">
        <div class="separate-card-top">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="team-badge team-a-badge">Team 1 Builds</span>
            <span class="slot-dur-pill">${slotA.duration_formatted || '00:00'}</span>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn-slot-icon" onclick="window.swapTeamBuilds()" title="Swap clip with Team 2 Builds" style="color:#38bdf8;font-weight:700;border-color:rgba(56,189,248,0.4);">⇄ Swap A &amp; B</button>
            <button class="btn-slot-icon" onclick="window.pickShowcaseBuildsFile('teamA')" title="Browse clip for Team 1 Builds">📁 Browse</button>
            <button class="btn-slot-icon" onclick="window.initiateSlotSwap('builds_teamA')" title="Swap with any other slot">⇄</button>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="slot-thumb-wrap" onclick="window.auditionSeparateBuilds('a')" title="${hasA ? 'Click to preview video' : 'No clip selected'}">
            ${thumbA}
            ${hasA ? '<div class="slot-thumb-play">▶</div>' : ''}
          </div>
          <div class="slot-meta" style="flex:1;min-width:0;">
            <div class="slot-filename" title="${slotA.path || slotA.filename}">
              ${slotA.filename || 'No clip selected'}
            </div>
            <div style="font-size:0.72rem;color:#94a3b8;">
              ${hasA ? 'Click thumbnail to preview' : 'Click Browse to select video'}
            </div>
          </div>
        </div>
      </div>

      <div class="separate-build-card team-b-border">
        <div class="separate-card-top">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="team-badge team-b-badge">Team 2 Builds</span>
            <span class="slot-dur-pill">${slotB.duration_formatted || '00:00'}</span>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn-slot-icon" onclick="window.swapTeamBuilds()" title="Swap clip with Team 1 Builds" style="color:#38bdf8;font-weight:700;border-color:rgba(56,189,248,0.4);">⇄ Swap A &amp; B</button>
            <button class="btn-slot-icon" onclick="window.pickShowcaseBuildsFile('teamB')" title="Browse clip for Team 2 Builds">📁 Browse</button>
            <button class="btn-slot-icon" onclick="window.initiateSlotSwap('builds_teamB')" title="Swap with any other slot">⇄</button>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="slot-thumb-wrap" onclick="window.auditionSeparateBuilds('b')" title="${hasB ? 'Click to preview video' : 'No clip selected'}">
            ${thumbB}
            ${hasB ? '<div class="slot-thumb-play">▶</div>' : ''}
          </div>
          <div class="slot-meta" style="flex:1;min-width:0;">
            <div class="slot-filename" title="${slotB.path || slotB.filename}">
              ${slotB.filename || 'No clip selected'}
            </div>
            <div style="font-size:0.72rem;color:#94a3b8;">
              ${hasB ? 'Click thumbnail to preview' : 'Click Browse to select video'}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Update Combined Builds card thumbnail
  const combSlot = showcaseState.combinedBuilds || {};
  const combThumbWrap = document.getElementById('showcaseCombinedBuildsThumbWrap');
  if (combThumbWrap) {
    const hasComb = !!combSlot.path;
    const thumbComb = combSlot.thumbnail_url
      ? `<img class="slot-thumb-img" src="${combSlot.thumbnail_url}" alt="Combined Builds" onerror="this.src='/static/icons/genshin_impact.ico'"/>`
      : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:1.2rem;">📹</div>`;
    combThumbWrap.innerHTML = `
      ${thumbComb}
      ${hasComb ? '<div class="slot-thumb-play">▶</div>' : ''}
    `;
    combThumbWrap.title = hasComb ? 'Click to preview combined builds video' : 'No clip selected';
  }
}

window.swapTeamBuilds = function() {
  const temp = { ...showcaseState.teamABuilds };
  showcaseState.teamABuilds = { ...showcaseState.teamBBuilds };
  showcaseState.teamBBuilds = temp;
  renderShowcaseBuildSlots();
  if (typeof showToast === 'function') {
    showToast('⇄ Swapped Team 1 and Team 2 Builds!');
  }
  if (typeof recordSnapshot === 'function') {
    recordSnapshot('Swap Team Builds');
  }
};

window.pickShowcaseBuildsFile = function(teamKey) {
  const isA = teamKey === 'teamA';
  const label = isA ? 'Team 1 Builds' : (teamKey === 'teamB' ? 'Team 2 Builds' : 'Combined Builds');
  if (typeof window.openVisualClipPicker === 'function') {
    window.openVisualClipPicker({
      type: 'showcase_builds',
      buildTeam: teamKey,
      title: `Select Video for ${label}`
    });
  }
};

window.renderShowcaseBuildSlots = renderShowcaseBuildSlots;
window.renderShowcaseSlots = renderShowcaseSlots;
window.updateBuildsSliderLabels = updateBuildsSliderLabels;
window.populateShowcaseSessions = populateShowcaseSessions;

function renderRunSlotsList(runKey, container) {
  if (!container) return;
  const slots = showcaseState[runKey];
  const isRun1 = runKey === 'run1';

  container.innerHTML = slots.map((slot, idx) => {
    const hasFile = !!slot.path;
    const thumbHtml = slot.thumbnail_url
      ? `<img class="slot-thumb-img" src="${slot.thumbnail_url}" alt="${slot.label}" onerror="this.src='/static/icons/genshin_impact.ico'"/>`
      : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:1.2rem;">🎬</div>`;

    const toBuildsBtn = (!isRun1 && idx === 2)
      ? `<button class="btn-slot-icon" onclick="window.moveRun2C3ToBuilds()" title="Swap clip with Builds Outro" style="color:#f59e0b;font-weight:700;">▼ To Builds</button>`
      : '';

    return `
      <div class="showcase-slot-card" data-run="${runKey}" data-index="${idx}">
        <div class="slot-num-badge">${idx + 1}</div>
        <div class="slot-thumb-wrap" onclick="auditionShowcaseSlot('${runKey}', ${idx})" title="${hasFile ? 'Click to preview' : 'No clip selected'}">
          ${thumbHtml}
          ${hasFile ? '<div class="slot-thumb-play">▶</div>' : ''}
        </div>
        <div class="slot-meta">
          <div class="slot-title-row">
            <span class="slot-label">${slot.label}</span>
            <span class="slot-dur-pill">${slot.duration_formatted || '00:00'}</span>
          </div>
          <div class="slot-filename" title="${slot.path || slot.filename}">
            ${slot.filename || 'Not selected'}
          </div>
        </div>
        <div class="slot-actions">
          <button class="btn-slot-icon" onclick="pickShowcaseSlotFile('${runKey}', ${idx})" title="Choose or swap MP4 video for this chamber">
            📁 Browse
          </button>
          <button class="btn-slot-icon" onclick="window.initiateSlotSwap('run', '${runKey}', ${idx})" title="Swap with any other slot">
            ⇄ Swap
          </button>
          ${idx > 0 ? `<button class="btn-slot-icon" onclick="swapShowcaseSlots('${runKey}', ${idx}, ${idx - 1})" title="Move Up">▲</button>` : ''}
          ${idx < slots.length - 1 ? `<button class="btn-slot-icon" onclick="swapShowcaseSlots('${runKey}', ${idx}, ${idx + 1})" title="Move Down">▼</button>` : ''}
          ${toBuildsBtn}
        </div>
      </div>
    `;
  }).join('');
}

window.pickShowcaseSlotFile = function(runKey, slotIndex) {
  const runNum = runKey === 'run1' ? 1 : 2;
  const chamberNum = slotIndex + 1;
  if (typeof window.openVisualClipPicker === 'function') {
    window.openVisualClipPicker({
      type: 'showcase_run',
      runKey: runKey,
      slotIdx: slotIndex,
      title: `Select Video for Run ${runNum} Chamber ${chamberNum}`
    });
  } else {
    showToast('Clip picker module is loading...');
  }
};

window.swapShowcaseSlots = function(runKey, idxA, idxB) {
  const slots = showcaseState[runKey];
  if (!slots[idxA] || !slots[idxB]) return;
  const temp = { ...slots[idxA] };
  slots[idxA] = { ...slots[idxB], chamber: slots[idxA].chamber, label: slots[idxA].label };
  slots[idxB] = { ...temp, chamber: slots[idxB].chamber, label: slots[idxB].label };
  renderShowcaseSlots();
};

window.openVideoPreview = function(options) {
  const { path, src, title, subtitle, duration } = options || {};
  const modal = document.getElementById('videoPreviewModal');
  const vid = document.getElementById('modalVideoPlayer');
  const titleEl = document.getElementById('videoPreviewTitle');
  const subEl = document.getElementById('videoPreviewSubtitle');
  const durPill = document.getElementById('videoPreviewDurPill');
  const pathEl = document.getElementById('videoPreviewFilePath');

  if (!modal || !vid) {
    console.warn('Video preview modal elements not found in DOM.');
    return;
  }

  const streamSrc = src || (path ? `/api/stream-video?path=${encodeURIComponent(path)}` : '');
  if (!streamSrc) {
    if (typeof showToast === 'function') showToast('No video source available for preview');
    return;
  }

  vid.src = streamSrc;
  if (titleEl) titleEl.textContent = title || 'Video Preview';
  if (subEl) subEl.textContent = subtitle || (path ? path.split(/[\\/]/).pop() : '');
  if (durPill) durPill.textContent = duration || '';
  if (pathEl) pathEl.textContent = path || streamSrc;

  modal.style.display = 'flex';
  vid.play().catch(err => {
    console.warn('Playback autoplay prevented:', err);
  });
};

window.closeVideoPreview = function() {
  const modal = document.getElementById('videoPreviewModal');
  const vid = document.getElementById('modalVideoPlayer');
  if (vid) {
    vid.pause();
    vid.removeAttribute('src');
    vid.load();
  }
  if (modal) {
    modal.style.display = 'none';
  }
};

window.auditionShowcaseSlot = function(runKey, slotIndex) {
  const slot = (window.showcaseState && window.showcaseState[runKey]) ? window.showcaseState[runKey][slotIndex] : null;
  if (!slot || !slot.path) {
    if (typeof showToast === 'function') showToast('No video file selected for this slot');
    return;
  }
  const runNum = runKey === 'run1' ? 1 : 2;
  const chamberNum = slotIndex + 1;
  const title = `Run ${runNum} • Chamber ${chamberNum}`;
  const subtitle = slot.filename || slot.path.split(/[\\/]/).pop();

  window.openVideoPreview({
    path: slot.path,
    title: `${title} (${slot.label || 'Chamber ' + chamberNum})`,
    subtitle: subtitle,
    duration: slot.duration_formatted || '00:00'
  });
};

window.auditionCombinedBuilds = function() {
  const b = (window.showcaseState) ? window.showcaseState.combinedBuilds : null;
  if (!b || !b.path) {
    if (typeof showToast === 'function') showToast('No combined builds video clip selected yet');
    return;
  }
  window.openVideoPreview({
    path: b.path,
    title: 'Character Builds & Artifacts Outro',
    subtitle: b.filename || b.path.split(/[\\/]/).pop(),
    duration: b.duration_formatted || '00:00'
  });
};

window.auditionSeparateBuilds = function(team) {
  const b = (window.showcaseState) ? (team === 'a' ? window.showcaseState.teamABuilds : window.showcaseState.teamBBuilds) : null;
  const teamLabel = team === 'a' ? 'Team A' : 'Team B';
  if (!b || !b.path) {
    if (typeof showToast === 'function') showToast(`No ${teamLabel} builds video clip selected yet`);
    return;
  }
  window.openVideoPreview({
    path: b.path,
    title: `${teamLabel} Builds & Artifacts Outro`,
    subtitle: b.filename || b.path.split(/[\\/]/).pop(),
    duration: b.duration_formatted || '00:00'
  });
};

async function pickShowcaseBatchFiles() {
  try {
    const res = await fetch('/api/pick-multiple-video-files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Select 7 or 8 Abyss Showcase Video Clips' })
    });
    const data = await res.json();
    if (data.status === 'ok' && data.clips && data.clips.length > 0) {
      const clips = data.clips;
      // Sort clips naturally by filename
      clips.sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' }));

      // Run 1: 0, 1, 2
      for (let i = 0; i < 3 && i < clips.length; i++) {
        showcaseState.run1[i] = {
          ...showcaseState.run1[i],
          path: clips[i].path,
          filename: clips[i].filename,
          duration: clips[i].duration,
          duration_formatted: clips[i].duration_formatted,
          thumbnail_url: clips[i].thumbnail_url
        };
      }

      // Run 2: 3, 4, 5
      for (let i = 0; i < 3 && (i + 3) < clips.length; i++) {
        showcaseState.run2[i] = {
          ...showcaseState.run2[i],
          path: clips[i + 3].path,
          filename: clips[i + 3].filename,
          duration: clips[i + 3].duration,
          duration_formatted: clips[i + 3].duration_formatted,
          thumbnail_url: clips[i + 3].thumbnail_url
        };
      }

      // Builds: clip 6 or 6+7
      if (clips.length === 7) {
        const c6 = clips[6];
        showcaseState.combinedBuilds.path = c6.path;
        showcaseState.combinedBuilds.filename = c6.filename;
        showcaseState.combinedBuilds.duration = c6.duration || 60;
        showcaseState.combinedBuilds.duration_formatted = c6.duration_formatted || '01:00';
        showcaseState.buildsMode = 'combined';

        const radioComb = document.querySelector('input[name="buildsModeRadio"][value="combined"]');
        if (radioComb) {
          radioComb.checked = true;
          radioComb.dispatchEvent(new Event('change'));
        }
        const textEl = document.getElementById('showcaseCombinedBuildsFileText');
        if (textEl) textEl.textContent = `${c6.filename} (${c6.duration_formatted})`;

        const slider = document.getElementById('showcaseBuildsSplitSlider');
        if (slider) {
          slider.max = c6.duration > 2 ? c6.duration : 60;
          slider.value = Math.floor(slider.max / 2);
          showcaseState.combinedBuilds.splitSeconds = parseFloat(slider.value);
        }
      } else if (clips.length >= 8) {
        // Intelligently identify build clips (<60s duration) vs combat clips
        let combatClips = [];
        let buildClips = [];
        const shortClips = clips.filter(c => (c.duration || 0) > 0 && (c.duration || 0) < 60);
        if (shortClips.length === 2 && clips.length === 8) {
          buildClips = shortClips;
          combatClips = clips.filter(c => !shortClips.includes(c));
        } else {
          combatClips = clips.slice(0, 6);
          buildClips = clips.slice(6, 8);
        }

        // Re-assign Run 1 & Run 2 with verified combat clips
        for (let i = 0; i < 3 && i < combatClips.length; i++) {
          showcaseState.run1[i] = {
            ...showcaseState.run1[i],
            path: combatClips[i].path,
            filename: combatClips[i].filename,
            duration: combatClips[i].duration,
            duration_formatted: combatClips[i].duration_formatted,
            thumbnail_url: combatClips[i].thumbnail_url
          };
        }
        for (let i = 0; i < 3 && (i + 3) < combatClips.length; i++) {
          showcaseState.run2[i] = {
            ...showcaseState.run2[i],
            path: combatClips[i + 3].path,
            filename: combatClips[i + 3].filename,
            duration: combatClips[i + 3].duration,
            duration_formatted: combatClips[i + 3].duration_formatted,
            thumbnail_url: combatClips[i + 3].thumbnail_url
          };
        }

        const cA = buildClips[0];
        const cB = buildClips[1];
        showcaseState.teamABuilds = {
          path: cA.path,
          filename: cA.filename,
          duration: cA.duration || 0,
          duration_formatted: cA.duration_formatted || '00:00',
          thumbnail_url: cA.thumbnail_url || ''
        };
        showcaseState.teamBBuilds = {
          path: cB.path,
          filename: cB.filename,
          duration: cB.duration || 0,
          duration_formatted: cB.duration_formatted || '00:00',
          thumbnail_url: cB.thumbnail_url || ''
        };
        showcaseState.buildsMode = 'separate';

        const radioSep = document.querySelector('input[name="buildsModeRadio"][value="separate"]');
        if (radioSep) {
          radioSep.checked = true;
          radioSep.dispatchEvent(new Event('change'));
        }
      }

      renderShowcaseSlots();
      updateBuildsSliderLabels();
      showToast(`🎉 Auto-arranged ${clips.length} clips into Showcase Run 1, Run 2, and Builds!`);
    }
  } catch (err) {
    showToast('Batch selection failed');
  }
}

let showcaseSessionsCache = [];

async function populateShowcaseSessions(forceRefresh = false) {
  const select = document.getElementById('showcaseSessionSelect');
  if (!select) return;

  try {
    const res = await fetch('/api/recordings/sessions');
    const data = await res.json();
    const sessions = data.sessions || [];
    showcaseSessionsCache = sessions;

    select.innerHTML = '';
    if (sessions.length === 0) {
      select.innerHTML = '<option value="">No sessions found (Use Batch Pick or Browse)</option>';
      return;
    }

    sessions.forEach(sess => {
      const opt = document.createElement('option');
      opt.value = sess.session_id;
      opt.textContent = sess.label || sess.title || `${sess.time_formatted || 'Session'} (${sess.clip_count || 0} clips)`;
      select.appendChild(opt);
    });

    // Auto-select 7/8-clip session if available, otherwise latest session
    const sevenClipSess = sessions.find(s => s.clip_count === 7 || s.clip_count === 8);
    const defaultSess = sevenClipSess || sessions[0];
    if (defaultSess) {
      select.value = defaultSess.session_id;
      loadShowcaseSession(defaultSess.session_id);
    }
  } catch (err) {
    console.error('Error fetching showcase sessions', err);
  }
}

function loadShowcaseSession(sessionId) {
  if (!sessionId) return;
  const sess = showcaseSessionsCache.find(s => s.session_id === sessionId);
  if (!sess) return;
  const clips = sess.clips || [];

  // Map clips to Run 1 and Run 2
  for (let i = 0; i < 3; i++) {
    if (i < clips.length) {
      showcaseState.run1[i] = {
        chamber: i + 1,
        label: `Chamber ${i + 1}`,
        path: clips[i].path,
        filename: clips[i].filename,
        duration: clips[i].duration_sec || 0,
        duration_formatted: clips[i].duration_formatted || '00:00',
        thumbnail_url: clips[i].thumbnail_url || ''
      };
    } else {
      showcaseState.run1[i] = {
        chamber: i + 1,
        label: `Chamber ${i + 1}`,
        path: '',
        filename: 'Not selected',
        duration: 0,
        duration_formatted: '00:00',
        thumbnail_url: ''
      };
    }
  }

  for (let i = 0; i < 3; i++) {
    const clipIdx = i + 3;
    if (clipIdx < clips.length) {
      showcaseState.run2[i] = {
        chamber: i + 1,
        label: `Chamber ${i + 1}`,
        path: clips[clipIdx].path,
        filename: clips[clipIdx].filename,
        duration: clips[clipIdx].duration_sec || 0,
        duration_formatted: clips[clipIdx].duration_formatted || '00:00',
        thumbnail_url: clips[clipIdx].thumbnail_url || ''
      };
    } else {
      showcaseState.run2[i] = {
        chamber: i + 1,
        label: `Chamber ${i + 1}`,
        path: '',
        filename: 'Not selected',
        duration: 0,
        duration_formatted: '00:00',
        thumbnail_url: ''
      };
    }
  }

  // Handle builds
  if (clips.length === 7) {
    const c6 = clips[6];
    showcaseState.combinedBuilds = {
      path: c6.path,
      filename: c6.filename,
      duration: c6.duration_sec || 60,
      duration_formatted: c6.duration_formatted || '01:00',
      splitSeconds: (c6.duration_sec || 60) * 0.5
    };
    showcaseState.buildsMode = 'combined';
    const radioComb = document.querySelector('input[name="buildsModeRadio"][value="combined"]');
    if (radioComb) {
      radioComb.checked = true;
      radioComb.dispatchEvent(new Event('change'));
    }
    const textEl = document.getElementById('showcaseCombinedBuildsFileText');
    if (textEl) textEl.textContent = `${c6.filename} (${c6.duration_formatted})`;
    const slider = document.getElementById('showcaseBuildsSplitSlider');
    if (slider) {
      slider.max = c6.duration_sec > 2 ? c6.duration_sec : 60;
      slider.value = Math.floor(slider.max / 2);
    }
  } else if (clips.length >= 8) {
    let combatClips = [];
    let buildClips = [];
    const shortClips = clips.filter(c => (c.duration_sec || 0) > 0 && (c.duration_sec || 0) < 60);
    if (shortClips.length === 2 && clips.length === 8) {
      buildClips = shortClips;
      combatClips = clips.filter(c => !shortClips.includes(c));
    } else {
      combatClips = clips.slice(0, 6);
      buildClips = clips.slice(6, 8);
    }

    // Re-assign Run 1 & Run 2 with verified combat clips
    for (let i = 0; i < 3 && i < combatClips.length; i++) {
      showcaseState.run1[i] = {
        chamber: i + 1,
        label: `Chamber ${i + 1}`,
        path: combatClips[i].path,
        filename: combatClips[i].filename,
        duration: combatClips[i].duration_sec || 0,
        duration_formatted: combatClips[i].duration_formatted || '00:00',
        thumbnail_url: combatClips[i].thumbnail_url || ''
      };
    }
    for (let i = 0; i < 3 && (i + 3) < combatClips.length; i++) {
      showcaseState.run2[i] = {
        chamber: i + 1,
        label: `Chamber ${i + 1}`,
        path: combatClips[i + 3].path,
        filename: combatClips[i + 3].filename,
        duration: combatClips[i + 3].duration_sec || 0,
        duration_formatted: combatClips[i + 3].duration_formatted || '00:00',
        thumbnail_url: combatClips[i + 3].thumbnail_url || ''
      };
    }

    const cA = buildClips[0];
    const cB = buildClips[1];
    showcaseState.teamABuilds = {
      path: cA.path,
      filename: cA.filename,
      duration: cA.duration_sec,
      duration_formatted: cA.duration_formatted,
      thumbnail_url: cA.thumbnail_url || ''
    };
    showcaseState.teamBBuilds = {
      path: cB.path,
      filename: cB.filename,
      duration: cB.duration_sec,
      duration_formatted: cB.duration_formatted,
      thumbnail_url: cB.thumbnail_url || ''
    };
    showcaseState.buildsMode = 'separate';
    const radioSep = document.querySelector('input[name="buildsModeRadio"][value="separate"]');
    if (radioSep) {
      radioSep.checked = true;
      radioSep.dispatchEvent(new Event('change'));
    }
  } else {
    showcaseState.combinedBuilds = { path: '', filename: 'No clip selected', duration: 60, duration_formatted: '01:00', splitSeconds: 30 };
    const textEl = document.getElementById('showcaseCombinedBuildsFileText');
    if (textEl) textEl.textContent = 'No clip selected (Click Browse to choose combined builds video)';
  }

  renderShowcaseSlots();
  updateBuildsSliderLabels();
  showToast(`✓ Loaded ${clips.length} clips into Showcase Arranger!`);
}

function syncShowcaseTeamNames() {
  let char1 = 'Team A';
  let char2 = 'Team B';

  if (state && state.character) {
    char1 = state.character;
  }
  if (state && state.team1 && state.team1[0]) {
    char1 = state.team1[0];
  }
  if (state && state.team2 && state.team2[0]) {
    char2 = state.team2[0];
  }

  const teamAInput = document.getElementById('showcaseTeamAName');
  const teamBInput = document.getElementById('showcaseTeamBName');

  if (teamAInput) teamAInput.value = `${char1} Floor 12 Showcase`;
  if (teamBInput) teamBInput.value = `${char2} Floor 12 Showcase`;

  showToast(`✓ Synced team showcase titles with ${char1} & ${char2}!`);
}

async function launchCapCutShowcasePipeline() {
  const btnLaunch = document.getElementById('btnShowcaseLaunchCapCut');
  const origHtml = btnLaunch.innerHTML;

  // Validate Run 1
  const r1Files = showcaseState.run1.map(s => s.path).filter(Boolean);
  if (r1Files.length < 3) {
    showToast('⚠ Run 1 requires all 3 Chamber clips to be selected.');
    return;
  }

  // Validate Run 2
  const r2Files = showcaseState.run2.map(s => s.path).filter(Boolean);
  if (r2Files.length < 3) {
    showToast('⚠ Run 2 requires all 3 Chamber clips to be selected.');
    return;
  }

  const teamAName = document.getElementById('showcaseTeamAName')?.value?.trim() || 'Team A Showcase';
  const teamBName = document.getElementById('showcaseTeamBName')?.value?.trim() || 'Team B Showcase';
  const transSelect = document.getElementById('showcaseTransitionSelect');
  const transition = transSelect ? transSelect.value : 'black_fade';

  const payload = {
    run1_files: r1Files,
    run2_files: r2Files,
    team_a_name: teamAName,
    team_b_name: teamBName,
    builds_mode: showcaseState.buildsMode,
    builds_split_seconds: showcaseState.combinedBuilds.splitSeconds,
    combined_builds_file: showcaseState.combinedBuilds.path,
    team_a_builds_file: showcaseState.teamABuilds.path,
    team_b_builds_file: showcaseState.teamBBuilds.path,
    transition: transition,
    clip_volume: 0.10,
    music_volume: 0.0316,
    open_capcut: true
  };

  btnLaunch.disabled = true;
  btnLaunch.innerHTML = '⏳ Synthesizing 2 CapCut Projects...';

  try {
    const res = await fetch('/api/assemble-showcase-capcut', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.status === 'ok') {
      btnLaunch.innerHTML = '✓ 2 CapCut Drafts Generated!';
      btnLaunch.style.background = '#10b981';
      showToast(`🎉 ${data.message || 'Both CapCut showcase drafts synthesized and launched!'}`);
      setTimeout(() => {
        btnLaunch.innerHTML = origHtml;
        btnLaunch.style.background = '';
        btnLaunch.disabled = false;
      }, 5000);
    } else {
      btnLaunch.innerHTML = '⚠ Generation Failed';
      btnLaunch.style.background = '#ef4444';
      showToast(`Error: ${data.message || 'Could not synthesize showcase drafts'}`);
      setTimeout(() => {
        btnLaunch.innerHTML = origHtml;
        btnLaunch.style.background = '';
        btnLaunch.disabled = false;
      }, 4000);
    }
  } catch (err) {
    btnLaunch.innerHTML = origHtml;
    btnLaunch.disabled = false;
    showToast('Network error while communicating with CapCut showcase engine');
  }
}


window.initiateStandardSlotSwap = function(slotIdx) {
  if (window._activeStandardSwapIdx === null || window._activeStandardSwapIdx === undefined) {
    window._activeStandardSwapIdx = slotIdx;
    if (typeof showToast === 'function') {
      showToast(`🔄 Swap initiated for Slot ${slotIdx + 1} — Click any other slot to swap!`);
    }
    document.querySelectorAll('.arranger-card').forEach((el, i) => {
      if (i === slotIdx) {
        el.style.boxShadow = '0 0 0 2px #38bdf8';
      } else {
        el.style.boxShadow = '0 0 0 2px #f59e0b';
        el.style.cursor = 'pointer';
      }
    });
  } else {
    const fromIdx = window._activeStandardSwapIdx;
    window._activeStandardSwapIdx = null;
    document.querySelectorAll('.arranger-card').forEach(el => {
      el.style.boxShadow = '';
      el.style.cursor = '';
    });
    if (fromIdx !== slotIdx) {
      window.swapStandardSlots(fromIdx, slotIdx);
    } else {
      if (typeof showToast === 'function') showToast('Swap cancelled.');
    }
  }
};

window.swapStandardSlots = function(idxA, idxB) {
  if (!arrangerDataCache || !arrangerDataCache.active_slots) return;
  const slots = arrangerDataCache.active_slots;
  if (!slots[idxA] || !slots[idxB]) return;

  const temp = {
    path: slots[idxA].path,
    filename: slots[idxA].filename,
    duration_sec: slots[idxA].duration_sec,
    duration_formatted: slots[idxA].duration_formatted,
    thumbnail_url: slots[idxA].thumbnail_url,
    cut_info: slots[idxA].cut_info,
    filesize_mb: slots[idxA].filesize_mb,
    is_assigned: slots[idxA].is_assigned
  };

  slots[idxA].path = slots[idxB].path;
  slots[idxA].filename = slots[idxB].filename;
  slots[idxA].duration_sec = slots[idxB].duration_sec;
  slots[idxA].duration_formatted = slots[idxB].duration_formatted;
  slots[idxA].thumbnail_url = slots[idxB].thumbnail_url;
  slots[idxA].cut_info = slots[idxB].cut_info;
  slots[idxA].filesize_mb = slots[idxB].filesize_mb;
  slots[idxA].is_assigned = slots[idxB].is_assigned;

  slots[idxB].path = temp.path;
  slots[idxB].filename = temp.filename;
  slots[idxB].duration_sec = temp.duration_sec;
  slots[idxB].duration_formatted = temp.duration_formatted;
  slots[idxB].thumbnail_url = temp.thumbnail_url;
  slots[idxB].cut_info = temp.cut_info;
  slots[idxB].filesize_mb = temp.filesize_mb;
  slots[idxB].is_assigned = temp.is_assigned;

  renderVideoArrangerGrid(arrangerDataCache);
  if (typeof showToast === 'function') {
    showToast(`✅ Swapped Slot ${idxA + 1} and Slot ${idxB + 1}!`);
  }
};

window.swapStandardAdjacentSlots = function(fromIdx, toIdx) {
  window.swapStandardSlots(fromIdx, toIdx);
};

window.renderVideoArrangerGrid = renderVideoArrangerGrid;

window.assignStandardSlotFile = function(slotIdx) {
  if (typeof window.openVisualClipPicker === 'function') {
    window.openVisualClipPicker({
      type: 'standard',
      slotIdx: slotIdx,
      title: `Select Clip for Slot ${slotIdx + 1}`
    });
  }
};

function roundFileSizeMb(filePath) {
  return 100; // placeholder display
}

window.processStandardRunCuts = async function() {
  const btn = document.getElementById('btnStandardProcessCuts');
  const origHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Analyzing Loading Screens...';
  }

  const activeSlots = (arrangerDataCache && arrangerDataCache.active_slots) ? arrangerDataCache.active_slots : [];
  const paths = activeSlots.map(s => s.path).filter(Boolean);

  if (paths.length === 0) {
    showToast('No active clips to process.');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
    return;
  }

  try {
    const res = await fetch('/api/recordings/process-cuts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clip_paths: paths })
    });
    const data = await res.json();
    if (data.status === 'ok' && data.cuts) {
      activeSlots.forEach(s => {
        if (data.cuts[s.path]) {
          s.cut_info = data.cuts[s.path];
        }
      });
      renderVideoArrangerGrid(arrangerDataCache);
      showToast(`✓ Processed loading screens for ${data.processed_count} clips!`);
    } else {
      showToast('Processing complete.');
    }
  } catch (err) {
    showToast('Failed to process cuts.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
  }
};

window.processShowcaseRunCuts = async function() {
  const btn = document.getElementById('btnShowcaseProcessCuts');
  const origHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Analyzing Loading Screens...';
  }

  const r1Files = (showcaseState.run1 || []).map(s => s.path).filter(Boolean);
  const r2Files = (showcaseState.run2 || []).map(s => s.path).filter(Boolean);
  const allPaths = [...r1Files, ...r2Files];

  if (allPaths.length === 0) {
    showToast('No showcase clips selected.');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
    return;
  }

  try {
    const res = await fetch('/api/recordings/process-cuts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clip_paths: allPaths })
    });
    const data = await res.json();
    if (data.status === 'ok') {
      showToast(`✓ Analyzed cuts for ${data.processed_count} showcase chambers!`);
    }
  } catch (err) {
    showToast('Processing failed.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
  }
};

// Setup video preview modal backdrop and Escape key dismissal
document.addEventListener('DOMContentLoaded', () => {
  const previewModal = document.getElementById('videoPreviewModal');
  if (previewModal) {
    previewModal.addEventListener('click', (e) => {
      if (e.target === previewModal) {
        window.closeVideoPreview();
      }
    });
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('videoPreviewModal');
      if (modal && modal.style.display === 'flex') {
        window.closeVideoPreview();
      }
    }
  });
});

export {
  showcaseState,
  initShowcaseArranger,
  setupArrangerModeSwitcher,
  setupShowcaseEventListeners,
  updateBuildsSliderLabels,
  renderShowcaseSlots,
  renderShowcaseBuildSlots,
  populateShowcaseSessions,
  loadShowcaseSession,
  launchCapCutShowcasePipeline
};
