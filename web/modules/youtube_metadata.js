/**
 * YouTube Metadata & Chapter Sync ES Module for Genshin Abyss Studio.
 * Handles automatic chapter generation, BGM track credit lists,
 * title tag chips, and CapCut draft project synchronization.
 */

// Setup YouTube Studio Title & Description Modal Listeners
function setupYouTubeMetadataListeners() {
  const btnOpen = document.getElementById('btnOpenYTModal');
  const modal = document.getElementById('ytMetadataModal');
  const btnClose = document.getElementById('ytModalCloseBtn');
  const btnDone = document.getElementById('btnDoneYTModal');
  const btnCopyTitle = document.getElementById('btnCopyTitle');
  const btnCopyDesc = document.getElementById('btnCopyDesc');
  const chipsContainer = document.getElementById('ytTitleChips');

  // Mode Switcher function (Spiral Abyss vs Stygian Onslaught)
  function setYTMetadataMode(mode) {
    state.ytMetaMode = mode || 'abyss';
    const btnYTAbyss = document.getElementById('btnYTModeAbyss');
    const btnYTStygian = document.getElementById('btnYTModeStygian');
    const diffToggle = document.getElementById('ytDifficultyToggle');
    const chipsAbyss = document.getElementById('ytTitleChipsAbyss');
    const chipsStygian = document.getElementById('ytTitleChipsStygian');

    if (state.ytMetaMode === 'stygian') {
      if (btnYTStygian) btnYTStygian.classList.add('active');
      if (btnYTAbyss) btnYTAbyss.classList.remove('active');
      if (diffToggle) diffToggle.style.display = 'inline-flex';
      if (chipsStygian) chipsStygian.style.display = 'flex';
      if (chipsAbyss) chipsAbyss.style.display = 'none';
    } else {
      if (btnYTAbyss) btnYTAbyss.classList.add('active');
      if (btnYTStygian) btnYTStygian.classList.remove('active');
      if (diffToggle) diffToggle.style.display = 'none';
      if (chipsAbyss) chipsAbyss.style.display = 'flex';
      if (chipsStygian) chipsStygian.style.display = 'none';
    }

    loadCapcutProjectsForYTModal();
    generateYouTubeMetadata();
  }
  window.setYTMetadataMode = setYTMetadataMode;

  const btnYTAbyss = document.getElementById('btnYTModeAbyss');
  const btnYTStygian = document.getElementById('btnYTModeStygian');
  if (btnYTAbyss) {
    btnYTAbyss.addEventListener('click', () => setYTMetadataMode('abyss'));
  }
  if (btnYTStygian) {
    btnYTStygian.addEventListener('click', () => setYTMetadataMode('stygian'));
  }

  // Difficulty Selector for Stygian (Fearless vs Dire)
  const btnDiffFearless = document.getElementById('btnDiffFearless');
  const btnDiffDire = document.getElementById('btnDiffDire');
  if (btnDiffFearless) {
    btnDiffFearless.addEventListener('click', () => {
      state.ytDifficulty = 'Fearless';
      btnDiffFearless.classList.add('active');
      if (btnDiffDire) btnDiffDire.classList.remove('active');
      generateYouTubeMetadata();
    });
  }
  if (btnDiffDire) {
    btnDiffDire.addEventListener('click', () => {
      state.ytDifficulty = 'Dire';
      btnDiffDire.classList.add('active');
      if (btnDiffFearless) btnDiffFearless.classList.remove('active');
      generateYouTubeMetadata();
    });
  }

  if (btnOpen && modal) {
    btnOpen.addEventListener('click', async () => {
      const autoMode = (state.layoutMode === 'stygian' || (typeof arrangerMode !== 'undefined' && arrangerMode === 'stygian')) ? 'stygian' : 'abyss';
      setYTMetadataMode(autoMode);
      modal.classList.add('open');
    });
  }

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => { modal.classList.remove('open'); modal.style.display = ''; });
  }

  if (btnDone && modal) {
    btnDone.addEventListener('click', () => modal.classList.remove('open'));
  }

  // Preset pills click handling (Spiral Abyss)
  const chipsAbyssEl = document.getElementById('ytTitleChipsAbyss') || document.getElementById('ytTitleChips');
  if (chipsAbyssEl) {
    chipsAbyssEl.querySelectorAll('.yt-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        state.selectedYTPreset = pill.dataset.preset || 'tgozaru';
        chipsAbyssEl.querySelectorAll('.yt-pill').forEach(c => c.classList.remove('active'));
        pill.classList.add('active');
        generateYouTubeMetadata();
      });
    });
  }

  // Preset pills click handling (Stygian Onslaught)
  const chipsStygianEl = document.getElementById('ytTitleChipsStygian');
  if (chipsStygianEl) {
    chipsStygianEl.querySelectorAll('.yt-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        state.selectedYTPresetStygian = pill.dataset.preset || 'stygian_meta';
        chipsStygianEl.querySelectorAll('.yt-pill').forEach(c => c.classList.remove('active'));
        pill.classList.add('active');
        generateYouTubeMetadata();
      });
    });
  }

  // Copy Title button
  if (btnCopyTitle) {
    btnCopyTitle.addEventListener('click', async () => {
      const titleInput = document.getElementById('ytTitleOutput');
      if (!titleInput) return;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(titleInput.value);
        } else {
          titleInput.select();
          document.execCommand('copy');
        }
        showToast('📋 Title copied to clipboard!');
      } catch (e) {
        showToast('📋 Title copied!');
      }
    });
  }

  // Copy Both (Title + Description)
  const btnCopyBoth = document.getElementById('btnCopyBoth');
  if (btnCopyBoth) {
    btnCopyBoth.addEventListener('click', async () => {
      const titleInput = document.getElementById('ytTitleOutput');
      const descInput = document.getElementById('ytDescriptionOutput');
      if (!titleInput || !descInput) return;
      const combined = `${titleInput.value}\n\n${descInput.value}`;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(combined);
        } else {
          descInput.select();
          document.execCommand('copy');
        }
        showToast('📋 Title & Description copied!');
      } catch (e) {
        showToast('📋 Copied to clipboard!');
      }
    });
  }


  // CapCut Draft Project Discovery for YouTube Metadata Hub
  async function loadCapcutProjectsForYTModal() {
    const sel = document.getElementById('selCapcutProject');
    if (!sel) return;
    sel.innerHTML = '<option value="">Scanning CapCut drafts...</option>';

    try {
      const res = await fetch('/api/capcut/projects');
      const data = await res.json();
      if (data.status === 'ok' && Array.isArray(data.projects) && data.projects.length > 0) {
        sel.innerHTML = '';
        
        const isStygian = state.ytMetaMode === 'stygian';
        const c1 = (state.side1 && state.side1.character ? state.side1.character.toLowerCase() : '');
        const c2 = (state.side2 && state.side2.character ? state.side2.character.toLowerCase() : '');
        const c3 = (state.side3 && state.side3.character ? state.side3.character.toLowerCase() : '');
        let autoMatched = '';

        data.projects.forEach((proj) => {
          const opt = document.createElement('option');
          opt.value = proj.name;
          opt.textContent = `${proj.name} (${proj.duration_formatted} • ${proj.segments_count} cuts)`;
          sel.appendChild(opt);

          const lowerName = proj.name.toLowerCase();
          if (!autoMatched) {
            if (isStygian && lowerName.includes('stygian')) {
              autoMatched = proj.name;
            } else if (!isStygian && !lowerName.includes('stygian') && ((c1 && lowerName.includes(c1)) || (c2 && lowerName.includes(c2)))) {
              autoMatched = proj.name;
            }
          }
        });

        // Fallback for Stygian mode if character name match wasn't found
        if (!autoMatched && isStygian) {
          const stygianProj = data.projects.find(p => p.name.toLowerCase().includes('stygian'));
          if (stygianProj) autoMatched = stygianProj.name;
        }

        if (autoMatched) {
          sel.value = autoMatched;
          if (!state.syncedSegments || state.syncedSegmentsProject !== autoMatched) {
            syncCapcutProjectTimestamps(autoMatched);
          }
        }
      } else {
        sel.innerHTML = '<option value="">No CapCut projects found</option>';
      }
    } catch (e) {
      sel.innerHTML = '<option value="">Error connecting to CapCut drafts API</option>';
    }
  }

  async function syncCapcutProjectTimestamps(projectName) {
    const btnSyncProject = document.getElementById('btnSyncCapcutProject');
    const btnSyncChapters = document.getElementById('btnSyncChapters');
    const sel = document.getElementById('selCapcutProject');
    const targetProject = projectName || (sel ? sel.value : '');

    if (!targetProject) {
      showToast('⚠️ Please select a CapCut project from the dropdown first');
      return;
    }

    if (btnSyncProject) btnSyncProject.textContent = '⏳ Syncing...';
    if (btnSyncChapters) btnSyncChapters.textContent = '⏳ Syncing...';

    try {
      const modeParam = state.ytMetaMode === 'stygian' ? '&mode=stygian' : '';
      const res = await fetch(`/api/capcut/project-chapters?project_name=${encodeURIComponent(targetProject)}${modeParam}`);
      const data = await res.json();
      if (data.status === 'ok' && data.segments) {
        state.syncedSegments = data.segments;
        state.syncedBgmTracks = data.bgm_tracks || [];
        state.syncedVideoDuration = data.total_duration_formatted || '00:00';
        const badge = document.getElementById('ytChaptersBadge');
        if (badge) {
          badge.style.display = 'inline-flex';
          badge.innerHTML = `<span class="badge-dot"></span> Synced from CapCut: <strong>${data.project_name}</strong> (${state.syncedVideoDuration})`;
        }
        // Force unlock so fresh CapCut timestamps populate into description
        state.descriptionLocked = false;
        const lockIndicator = document.getElementById('descLockIndicator');
        if (lockIndicator) lockIndicator.style.display = 'none';
        generateYouTubeMetadata();
        
        // Highlight textarea briefly to signal fresh content
        const descArea = document.getElementById('ytDescriptionOutput');
        if (descArea) {
          descArea.classList.add('flash-highlight');
          setTimeout(() => descArea.classList.remove('flash-highlight'), 1200);
        }
        showToast(`⚡ Synced ${data.segments.length} chapters from "${data.project_name}" (${state.syncedVideoDuration})!`);
      } else {
        showToast(`⚠️ ${data.message || 'Could not parse project timeline'}`);
      }
    } catch (e) {
      showToast('⚠️ Could not connect to CapCut chapters API');
    } finally {
      if (btnSyncProject) btnSyncProject.textContent = '⚡ Sync Timestamps';
      if (btnSyncChapters) btnSyncChapters.textContent = '⚡ Sync Video Chapters';
    }
  }


  // Sync Chapters from CapCut Video Editor
  const btnSync = document.getElementById('btnSyncChapters');
  const btnSyncCapcut = document.getElementById('btnSyncCapcutProject');
  const btnRefreshProjects = document.getElementById('btnRefreshCapcutProjects');
  const selCapcutProject = document.getElementById('selCapcutProject');

  if (btnSyncCapcut) {
    btnSyncCapcut.addEventListener('click', () => syncCapcutProjectTimestamps());
  }

  if (btnSync) {
    btnSync.addEventListener('click', () => syncCapcutProjectTimestamps());
  }

  if (btnRefreshProjects) {
    btnRefreshProjects.addEventListener('click', () => {
      loadCapcutProjectsForYTModal();
      showToast('🔄 Refreshed CapCut drafts list');
    });
  }

  if (selCapcutProject) {
    selCapcutProject.addEventListener('change', () => {
      if (selCapcutProject.value) {
        syncCapcutProjectTimestamps(selCapcutProject.value);
      }
    });
  }

  // Paste Custom Timestamps button
  const btnPaste = document.getElementById('btnPasteChapters');
  if (btnPaste) {
    btnPaste.addEventListener('click', async () => {
      let text = '';
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          text = await navigator.clipboard.readText();
        }
      } catch (e) {}

      const input = prompt('Paste your raw cut timestamps (from video description or editor):', text);
      if (!input) return;

      const lines = input.split('\n').filter(Boolean);
      const parsedSegs = [];
      const tsRegex = /(\d{1,2}:\d{2})/;

      lines.forEach((line, idx) => {
        const match = line.match(tsRegex);
        if (match) {
          const time = match[1];
          let chamber = '1-1';
          let side = 1;
          if (idx === 0) { chamber = '1-1'; side = 1; }
          else if (idx === 1) { chamber = '1-2'; side = 2; }
          else if (idx === 2) { chamber = '2-1'; side = 1; }
          else if (idx === 3) { chamber = '2-2'; side = 2; }
          else if (idx === 4) { chamber = '3-1'; side = 1; }
          else if (idx === 5) { chamber = '3-2'; side = 2; }
          else { chamber = 'builds'; side = null; }

          parsedSegs.push({
            id: `c${chamber.replace('-', '_')}`,
            time: time,
            chamber: chamber,
            side: side,
            label: idx === 6 ? 'Character Builds, Weapons & Artifacts' : undefined
          });
        }
      });

      if (parsedSegs.length > 0) {
        state.syncedSegments = parsedSegs;
        const lastSeg = parsedSegs[parsedSegs.length - 1];
        state.syncedVideoDuration = lastSeg ? lastSeg.time : '00:00';
        const badge = document.getElementById('ytChaptersBadge');
        const durTxt = document.getElementById('ytChaptersDurationText');
        if (badge) badge.style.display = 'inline-flex';
        if (durTxt) durTxt.textContent = state.syncedVideoDuration;
        generateYouTubeMetadata();
        showToast(`📋 Loaded ${parsedSegs.length} custom timestamps!`);
      } else {
        showToast('⚠️ No valid timestamps found in pasted text');
      }
    });
  }

  // Teams in Chapters Toggle
  const chkTeams = document.getElementById('chkIncludeActiveTeams');
  if (chkTeams) {
    chkTeams.checked = state.includeTeamsInChapters !== false;
    chkTeams.addEventListener('change', (e) => {
      state.includeTeamsInChapters = e.target.checked;
      generateYouTubeMetadata();
    });
  }

  // User edit lock on description textarea
  const descTextarea = document.getElementById('ytDescriptionOutput');
  if (descTextarea) {
    descTextarea.addEventListener('input', () => {
      state.descriptionLocked = true;
      const lockIndicator = document.getElementById('descLockIndicator');
      if (lockIndicator) lockIndicator.style.display = 'inline-block';
    });
  }

  // Auto reset description button
  const btnUnlockDesc = document.getElementById('btnUnlockDesc');
  if (btnUnlockDesc) {
    btnUnlockDesc.addEventListener('click', () => {
      state.descriptionLocked = false;
      const lockIndicator = document.getElementById('descLockIndicator');
      if (lockIndicator) lockIndicator.style.display = 'none';
      generateYouTubeMetadata();
      showToast('🔄 Description reset to auto-generated chapters & lineups');
    });
  }

  // Copy Description button
  if (btnCopyDesc) {
    btnCopyDesc.addEventListener('click', async () => {
      const descInput = document.getElementById('ytDescriptionOutput');
      if (!descInput) return;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(descInput.value);
        } else {
          descInput.select();
          document.execCommand('copy');
        }
        showToast('📋 Description copied to clipboard!');
      } catch (e) {
        showToast('📋 Description copied!');
      }
    });
  }
}


// Helper to extract segments from legacy chapter objects
function extractSegmentsFromLegacyChapters(chapters) {
  if (!Array.isArray(chapters) || chapters.length === 0) return null;
  return chapters.map((ch, idx) => {
    let chamber = '1-1';
    let side = 1;
    if (idx === 0) { chamber = '1-1'; side = 1; }
    else if (idx === 1) { chamber = '1-2'; side = 2; }
    else if (idx === 2) { chamber = '2-1'; side = 1; }
    else if (idx === 3) { chamber = '2-2'; side = 2; }
    else if (idx === 4) { chamber = '3-1'; side = 1; }
    else if (idx === 5) { chamber = '3-2'; side = 2; }
    else { chamber = 'builds'; side = null; }
    return {
      id: `c${chamber.replace('-', '_')}`,
      time: ch.timestamp || '00:00',
      seconds: ch.seconds || 0,
      chamber: chamber,
      side: side,
      label: idx === 6 ? 'Character Builds, Weapons & Artifacts' : undefined
    };
  });
}

// Build live formatted YouTube BGM track list from CapCut draft audio tracks
function buildFormattedBgmTracks(bgmTracks) {
  if (!bgmTracks || !Array.isArray(bgmTracks) || bgmTracks.length === 0) {
    return '';
  }
  const lines = bgmTracks.map(t => `${t.timestamp} - ${t.title}`);
  return `\n\n?? BACKGROUND MUSIC:\n${lines.join('\n')}`;
}

// Build live formatted YouTube chapter lines from raw segments + active thumbnail teams
function buildFormattedChapters(segments, s1, s2, includeTeams = true) {
  const name1 = s1.customName || s1.character || 'Side 1';
  const name2 = s2.customName || s2.character || 'Side 2';
  const arch1 = s1.archetype || '';
  const arch2 = s2.archetype || '';
  const t1 = [name1, arch1].filter(Boolean).join(' ');
  const t2 = [name2, arch2].filter(Boolean).join(' ');

  const defaultSegments = [
    { time: '00:00', chamber: '1-1', side: 1 },
    { time: '01:22', chamber: '1-2', side: 2 },
    { time: '02:48', chamber: '2-1', side: 1 },
    { time: '04:10', chamber: '2-2', side: 2 },
    { time: '05:04', chamber: '3-1', side: 1 },
    { time: '06:43', chamber: '3-2', side: 2 },
    { time: '07:49', chamber: 'builds', side: null, label: 'Character Builds, Weapons & Artifacts' }
  ];

  const segs = (segments && segments.length > 0) ? segments : defaultSegments;

  return segs.map(seg => {
    if (seg.chamber === 'builds') {
      return `${seg.time} - ${seg.label || 'Character Builds, Weapons & Artifacts'}`;
    }
    if (!includeTeams) {
      return `${seg.time} - Chamber ${seg.chamber}`;
    }
    const team = seg.side === 1 ? t1 : t2;
    return `${seg.time} - Chamber ${seg.chamber} (${team})`;
  }).join('\n');
}

// Build live formatted YouTube chapter lines for Stygian Onslaught (3 Bosses + Builds)
function buildFormattedStygianChapters(segments, s1, s2, s3, b1, b2, b3, includeTeams = true) {
  const name1 = (s1 && (s1.customName || s1.character)) || 'Boss 1 Team';
  const name2 = (s2 && (s2.customName || s2.character)) || 'Boss 2 Team';
  const name3 = (s3 && (s3.customName || s3.character)) || 'Boss 3 Team';
  const arch1 = (s1 && s1.archetype) || '';
  const arch2 = (s2 && s2.archetype) || '';
  const arch3 = (s3 && s3.archetype) || '';
  const t1 = [name1, arch1].filter(Boolean).join(' ');
  const t2 = [name2, arch2].filter(Boolean).join(' ');
  const t3 = [name3, arch3].filter(Boolean).join(' ');

  const defaultSegments = [
    { time: '00:00', chamber: 'boss_1', side: 1, label: `Boss 1: ${b1}` },
    { time: '01:33', chamber: 'boss_2', side: 2, label: `Boss 2: ${b2}` },
    { time: '02:58', chamber: 'boss_3', side: 3, label: `Boss 3: ${b3}` },
    { time: '04:50', chamber: 'builds', side: null, label: 'Character Builds, Weapons & Artifacts' }
  ];

  const segs = (segments && segments.length > 0) ? segments : defaultSegments;

  return segs.map(seg => {
    if (seg.chamber === 'builds') {
      return `${seg.time} - ${seg.label || 'Character Builds, Weapons & Artifacts'}`;
    }
    let bossLabel = b1;
    let team = t1;
    if (seg.chamber === 'boss_2' || seg.side === 2) {
      bossLabel = b2;
      team = t2;
    } else if (seg.chamber === 'boss_3' || seg.side === 3) {
      bossLabel = b3;
      team = t3;
    }

    if (!includeTeams) {
      return `${seg.time} - ${seg.label || `Boss: ${bossLabel}`}`;
    }
    return `${seg.time} - Boss ${seg.side || ''}: ${bossLabel} (${team})`.replace('Boss :', 'Boss:');
  }).join('\n');
}

// Generate Stygian Onslaught YouTube Studio Metadata (Fearless & Dire 3-Boss Format)
function generateStygianYouTubeMetadata() {
  const p = state.patch || '7.1';
  const diff = state.ytDifficulty || 'Fearless';
  const s1 = state.side1 || {};
  const s2 = state.side2 || {};
  const s3 = state.side3 || {};

  const name1 = s1.customName || s1.character || 'Boss 1';
  const name2 = s2.customName || s2.character || 'Boss 2';
  const name3 = s3.customName || s3.character || 'Boss 3';
  const c1 = s1.constellation || 'C0';
  const c2 = s2.constellation || 'C0';
  const c3 = s3.constellation || 'C0';
  const arch1 = s1.archetype || '';
  const arch2 = s2.archetype || '';
  const arch3 = s3.archetype || '';

  const toTitleCase = (str) => {
    return (str || '').toLowerCase().replace(/(?:^|\s|-|\/)\w/g, m => m.toUpperCase());
  };

  const title1 = toTitleCase(name1);
  const title2 = toTitleCase(name2);
  const title3 = toTitleCase(name3);
  const a1 = toTitleCase(arch1);
  const a2 = toTitleCase(arch2);
  const a3 = toTitleCase(arch3);

  // Boss names
  const b1 = (state.stygianBosses && state.stygianBosses[0]?.name) || 'Domovoy';
  const b2 = (state.stygianBosses && state.stygianBosses[1]?.name) || 'Overseer Device';
  const b3 = (state.stygianBosses && state.stygianBosses[2]?.name) || 'Guardian Blade';

  const b1_full = (state.stygianBosses && state.stygianBosses[0]?.fullName) || 'Battle-Hardened Domovoy Sculptor';
  const b2_full = (state.stygianBosses && state.stygianBosses[1]?.fullName) || 'Secret Source Automaton: Overseer Device';
  const b3_full = (state.stygianBosses && state.stygianBosses[2]?.fullName) || 'Guardian Blade of Drifting Snow';

  const b1_title = toTitleCase(b1);
  const b2_title = toTitleCase(b2);
  const b3_title = toTitleCase(b3);

  // 6 Researched High-CTR Stygian Presets
  const titleMeta = `${c1} ${title1} • ${c2} ${title2} • ${c3} ${title3} - Stygian Onslaught ${p} ${diff} Difficulty`;
  const titleHook = `${diff.toUpperCase()} ${p} !! ${c1} ${title1} • ${c2} ${title2} • ${c3} ${title3} - Stygian Onslaught Full Clear`;
  let titleBosses = `${title1} vs ${b1_title} • ${title2} vs ${b2_title} • ${title3} vs ${b3_title} | Stygian Onslaught ${p} ${diff}`;
  if (titleBosses.length > 100) {
    titleBosses = `${title1} vs ${b1_title} • ${title2} vs ${b2_title.replace(' Device', '')} • ${title3} vs ${b3_title} | Stygian Onslaught ${p}`;
  }
  if (titleBosses.length > 100) {
    titleBosses = `${title1} vs ${b1_title} • ${title2} vs ${b2_title.replace(' Device', '')} • ${title3} vs ${b3_title} | Stygian ${p}`;
  }
  const titleDonaturine = `${p} Stygian Onslaught!! | ${c1} ${title1} & ${c2} ${title2} & ${c3} ${title3} | Genshin Impact`;
  const titleDire = `${c1} ${title1} & ${c2} ${title2} & ${c3} ${title3} | DIRE Stygian Onslaught 3-Boss Full Clear`;
  const titleGuide = `[${p}] Stygian Onslaught ${diff} Guide & Showcase - ${c1} ${title1}, ${c2} ${title2}, ${c3} ${title3}`;

  const preset = state.selectedYTPresetStygian || 'stygian_meta';
  let chosenTitle = titleMeta;
  if (preset === 'stygian_hook') chosenTitle = titleHook;
  else if (preset === 'stygian_bosses') chosenTitle = titleBosses;
  else if (preset === 'stygian_donaturine') chosenTitle = titleDonaturine;
  else if (preset === 'stygian_dire') chosenTitle = titleDire;
  else if (preset === 'stygian_guide') chosenTitle = titleGuide;

  const titleInput = document.getElementById('ytTitleOutput');
  const titleCharCount = document.getElementById('ytTitleCharCount');
  if (titleInput) {
    titleInput.value = chosenTitle;
    if (titleCharCount) {
      titleCharCount.textContent = `${chosenTitle.length} / 100`;
      titleCharCount.style.color = chosenTitle.length > 100 ? '#ef4444' : 'var(--text-dim)';
    }
  }

  // Format Description with 3 Teams, Timestamps, and Stygian Tags
  const descEl = document.getElementById('ytDescriptionOutput');
  const descCharCount = document.getElementById('ytDescCharCount');
  if (descEl) {
    const t1 = (s1.teammates || []).filter(Boolean).join(' • ') || name1;
    const t2 = (s2.teammates || []).filter(Boolean).join(' • ') || name2;
    const t3 = (s3.teammates || []).filter(Boolean).join(' • ') || name3;

    const tag1 = `#${name1.replace(/[^a-zA-Z0-9]/g, '')}`;
    const tag2 = `#${name2.replace(/[^a-zA-Z0-9]/g, '')}`;
    const tag3 = `#${name3.replace(/[^a-zA-Z0-9]/g, '')}`;
    const b1_tag = `#${b1.replace(/[^a-zA-Z0-9]/g, '')}`;
    const b2_tag = `#${b2.replace(/[^a-zA-Z0-9]/g, '')}`;
    const b3_tag = `#${b3.replace(/[^a-zA-Z0-9]/g, '')}`;

    const includeTeams = state.includeTeamsInChapters !== false;
    const timestampsSection = buildFormattedStygianChapters(state.syncedSegments, s1, s2, s3, b1_title, b2_title, b3_title, includeTeams);

    const descText =
`Genshin Impact Version ${p} Stygian Onslaught (${diff} Difficulty) Full Clear showcase featuring 3 distinct boss combat teams!
Battlegrounds: ${b1_full}, ${b2_full}, and ${b3_full}.

⏱️ TIMESTAMPS:
${timestampsSection}

⚔️ BOSS 1: ${b1_full}
• Lineup: ${t1}
• Main Carry: ${c1} ${name1} (${arch1})

⚔️ BOSS 2: ${b2_full}
• Lineup: ${t2}
• Main Carry: ${c2} ${name2} (${arch2})

⚔️ BOSS 3: ${b3_full}
• Lineup: ${t3}
• Main Carry: ${c3} ${name3} (${arch3})

If you enjoyed this Stygian Onslaught run or found these rotations helpful, please drop a like and subscribe for more Genshin Impact endgame guides, boss showcases, and meta builds!

#GenshinImpact #StygianOnslaught #${diff} ${b1_tag} ${b2_tag} ${b3_tag} ${tag1} ${tag2} ${tag3} #Genshin`;

    if (!state.descriptionLocked) {
      descEl.value = descText;
    }
    if (descCharCount) {
      descCharCount.textContent = `${descEl.value.length} / 5000`;
    }

    // Render interactive chapters strip chips
    const strip = document.getElementById('ytChaptersStrip');
    const list = document.getElementById('ytChaptersList');
    if (strip && list) {
      const lines = timestampsSection.split('\n').filter(Boolean);
      if (lines.length > 0) {
        strip.style.display = 'block';
        list.innerHTML = lines.map(line => {
          const parts = line.split(' - ');
          const time = parts[0] ? parts[0].trim() : '00:00';
          const title = parts.slice(1).join(' - ') || 'Segment';
          return `<div class="chapter-chip"><span class="chapter-time">${time}</span><span>${title}</span></div>`;
        }).join('');
      } else {
        strip.style.display = 'none';
      }
    }
  }
}

// Generate YouTube Studio Metadata (Titles & Description)
function generateYouTubeMetadata() {
  if (state.ytMetaMode === 'stygian') {
    return generateStygianYouTubeMetadata();
  }
  const p = state.patch || '7.0';
  const s1 = state.side1;
  const s2 = state.side2;
  const name1 = s1.customName || s1.character || 'Side 1';
  const name2 = s2.customName || s2.character || 'Side 2';
  const c1 = s1.constellation || 'C0';
  const c2 = s2.constellation || 'C0';
  const arch1 = s1.archetype || '';
  const arch2 = s2.archetype || '';

  // Helper to ensure clean Title Case (avoids spammy ALL-CAPS titles)
  const toTitleCase = (str) => {
    return (str || '').toLowerCase().replace(/(?:^|\s|-|\/)\w/g, m => m.toUpperCase());
  };

  const title1 = toTitleCase(name1);
  const title2 = toTitleCase(name2);
  const a1 = toTitleCase(arch1);
  const a2 = toTitleCase(arch2);
  const fl = state.spire && state.spire.floor ? state.spire.floor : '12';
  const hookTag = state.spire && state.spire.hookText && state.spire.hookText !== 'NONE' ? `${state.spire.hookText} ` : 'NEW !! ';

  // 1. Title Presets
  const titleTgozaru = `${c1} ${title1} ${a1} & ${c2} ${title2} ${a2} - Spiral Abyss Floor ${fl} Genshin Impact ${p}`;
  const titleTgozaruHook = `${hookTag}${c1} ${title1} & ${c2} ${title2} - Spiral Abyss Floor ${fl} Genshin Impact ${p}`;
  const titleDonaturine = `${p} Spiral Abyss!! | ${c1} ${name1} ${arch1} & ${c2} ${name2} ${arch2} | Genshin Impact`;
  const titleGust21 = `${c1} ${name1} ${arch1} & ${c2} ${name2} ${arch2} | Spiral Abyss ${p} Floor 12 | Genshin Impact`;
  const titleSireula = `${c1} ${name1} ${arch1} and ${c2} ${name2} ${arch2} | Genshin Impact Abyss ${p} Floor 12 9 Stars`;
  const titleHype = `${c1} ${name1.toUpperCase()} ${arch1.toUpperCase()} & ${c2} ${name2.toUpperCase()} DESTROY FLOOR 12! | Genshin Impact ${p} Spiral Abyss 9★`;

  // Active Title Input
  const titleInput = document.getElementById('ytTitleOutput');
  const titleCharCount = document.getElementById('ytTitleCharCount');
  if (titleInput) {
    let chosenTitle = titleTgozaru;
    if (state.selectedYTPreset === 'tgozaru_hook') chosenTitle = titleTgozaruHook;
    else if (state.selectedYTPreset === 'donaturine') chosenTitle = titleDonaturine;
    else if (state.selectedYTPreset === 'gust21') chosenTitle = titleGust21;
    else if (state.selectedYTPreset === 'sireula') chosenTitle = titleSireula;
    else if (state.selectedYTPreset === 'hype') chosenTitle = titleHype;
    titleInput.value = chosenTitle;
    if (titleCharCount) {
      titleCharCount.textContent = `${chosenTitle.length} / 100`;
      titleCharCount.style.color = chosenTitle.length > 100 ? '#ef4444' : 'var(--text-dim)';
    }
  }

  // 2. Format Description with Timestamps, Team Lineups, and Tags
  const descEl = document.getElementById('ytDescriptionOutput');
  const descCharCount = document.getElementById('ytDescCharCount');
  if (descEl) {
    const t1 = (s1.teammates || []).filter(Boolean).join(' • ') || name1;
    const t2 = (s2.teammates || []).filter(Boolean).join(' • ') || name2;
    const tag1 = `#${name1.replace(/[^a-zA-Z0-9]/g, '')}`;
    const tag2 = `#${name2.replace(/[^a-zA-Z0-9]/g, '')}`;

    const includeTeams = state.includeTeamsInChapters !== false;
    const timestampsSection = buildFormattedChapters(state.syncedSegments, s1, s2, includeTeams);

    const descText = 
`Genshin Impact Version ${p} Spiral Abyss Floor 12 9-Star Full Clear showcase featuring ${c1} ${name1} (${arch1}) on First Half and ${c2} ${name2} (${arch2}) on Second Half!

⏱️ TIMESTAMPS:
${timestampsSection}

⚔️ FIRST HALF TEAM (${arch1}):
• Lineup: ${t1}
• Main Carry: ${c1} ${name1}

⚔️ SECOND HALF TEAM (${arch2}):
• Lineup: ${t2}
• Main Carry: ${c2} ${name2}

If you enjoyed the run or found this rotation helpful, please drop a like and subscribe for more Genshin Impact Spiral Abyss showcases and meta guide gameplay!

#GenshinImpact #SpiralAbyss #Floor12 ${tag1} ${tag2} #Genshin`;

    if (!state.descriptionLocked) {
      descEl.value = descText;
    }
    if (descCharCount) {
      descCharCount.textContent = `${descEl.value.length} / 5000`;
    }

    // 3. Render interactive chapters strip chips
    const strip = document.getElementById('ytChaptersStrip');
    const list = document.getElementById('ytChaptersList');
    if (strip && list) {
      const lines = timestampsSection.split('\n').filter(Boolean);
      if (lines.length > 0) {
        strip.style.display = 'block';
        list.innerHTML = lines.map(line => {
          const parts = line.split(' - ');
          const time = parts[0] ? parts[0].trim() : '00:00';
          const title = parts.slice(1).join(' - ') || 'Segment';
          return `<div class="chapter-chip"><span class="chapter-time">${time}</span><span>${title}</span></div>`;
        }).join('');
      } else {
        strip.style.display = 'none';
      }
    }
  }
}

export {
  setupYouTubeMetadataListeners,
  extractSegmentsFromLegacyChapters,
  buildFormattedBgmTracks,
  buildFormattedChapters,
  buildFormattedStygianChapters,
  generateStygianYouTubeMetadata,
  generateYouTubeMetadata
};
