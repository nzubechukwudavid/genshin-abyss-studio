// Active Slot Multi-Panel Helpers
function getSlot(slotNum = (typeof state !== 'undefined' ? state.activeSlot : 1)) {
  if (typeof state === 'undefined') return null;
  if (slotNum === 1) return state.side1;
  if (slotNum === 2) return state.side2;
  if (slotNum === 3) return state.side3;
  return state.side1;
}

function getActiveSlot() {
  if (typeof state === 'undefined') return null;
  return getSlot(state.activeSlot);
}

window.getSlot = getSlot;
window.getActiveSlot = getActiveSlot;


function setArrangerMode(mode) {
  const standardArrangerView = document.getElementById('standardArrangerView');
  const showcaseArrangerView = document.getElementById('showcaseArrangerView');
  const stygianArrangerView = document.getElementById('stygianArrangerView');
  const btnBasic = document.getElementById('btnArrangerModeBasic');
  const btnShowcase = document.getElementById('btnArrangerModeShowcase');
  const btnStygian = document.getElementById('btnArrangerModeStygian');
  const desc = document.getElementById('arrangerPipelineDescription');

  try {
    localStorage.setItem('abyss_arranger_mode', mode);
  } catch (e) {}

  if (btnBasic) btnBasic.classList.toggle('active', mode === 'basic');
  if (btnShowcase) btnShowcase.classList.toggle('active', mode === 'showcase');
  if (btnStygian) btnStygian.classList.toggle('active', mode === 'stygian');

  if (mode === 'stygian') {
    if (standardArrangerView) standardArrangerView.style.display = 'none';
    if (showcaseArrangerView) showcaseArrangerView.style.display = 'none';
    if (stygianArrangerView) stygianArrangerView.style.display = 'block';
    if (desc) desc.textContent = '4-Clip Stygian Onslaught: 3 Bosses (Battlefields 1-3) + Character Builds with intelligent multi-topology BGM synchronization';
    if (typeof initStygianArranger === 'function') {
      initStygianArranger();
    }
  } else if (mode === 'showcase') {
    if (standardArrangerView) standardArrangerView.style.display = 'none';
    if (showcaseArrangerView) showcaseArrangerView.style.display = 'block';
    if (stygianArrangerView) stygianArrangerView.style.display = 'none';
    if (desc) desc.textContent = '7-8 clips dual run: fuses inverted team runs into 2 CapCut showcase drafts';
    if (typeof populateShowcaseSessions === 'function') {
      populateShowcaseSessions(true);
    }
  } else {
    if (standardArrangerView) standardArrangerView.style.display = 'block';
    if (showcaseArrangerView) showcaseArrangerView.style.display = 'none';
    if (stygianArrangerView) stygianArrangerView.style.display = 'none';
    if (desc) desc.textContent = '4-clip single run: 1 continuous recording per chamber + character builds';
    if (typeof loadVideoArrangerData === 'function') {
      loadVideoArrangerData(true);
    }
  }
}
window.setArrangerMode = setArrangerMode;

function setupArrangerModeListeners() {
  const btnBasic = document.getElementById('btnArrangerModeBasic');
  const btnShowcase = document.getElementById('btnArrangerModeShowcase');
  const btnStygian = document.getElementById('btnArrangerModeStygian');
  if (btnBasic && !btnBasic._bound) {
    btnBasic._bound = true;
    btnBasic.addEventListener('click', () => setArrangerMode('basic'));
  }
  if (btnShowcase && !btnShowcase._bound) {
    btnShowcase._bound = true;
    btnShowcase.addEventListener('click', () => setArrangerMode('showcase'));
  }
  if (btnStygian && !btnStygian._bound) {
    btnStygian._bound = true;
    btnStygian.addEventListener('click', () => setArrangerMode('stygian'));
  }
}


window.duplicateSide1ToSide2 = function() {
  if (!state || !state.side1 || !state.side2) return;
  const s1 = state.side1;
  const s2 = state.side2;

  // 1. Character identity & build metadata
  s2.character = s1.character;
  s2.element = s1.element;
  s2.archetype = s1.archetype;
  s2.archetypeColor = s1.archetypeColor;
  s2.constellation = s1.constellation;
  s2.customName = s1.customName;

  // 2. Exact image selected & gallery state
  s2.img = s1.img;
  s2.imgUrl = s1.imgUrl;
  s2.gallery = Array.isArray(s1.gallery) ? [...s1.gallery] : [];
  s2.isEnhanced = !!s1.isEnhanced;
  s2.enhancedForUrl = s1.enhancedForUrl || '';
  s2.enhancementFactor = s1.enhancementFactor || 1;

  // If s1.img is not yet loaded into memory but has a valid imgUrl, load it into slot 2
  if (!s2.img && s2.imgUrl && typeof loadImageToSlot === 'function') {
    loadImageToSlot(2, s2.imgUrl);
  }

  // 3. Exact current position at the time of click with mirrored horizontal alignment
  s2.scale = s1.scale;
  s2.panY = s1.panY;
  s2.panX = -s1.panX; // Mirrored relative to the right half center
  s2.mirror = true;   // Flipped horizontally facing inward as Side 2 usually is
  s2.mirrored = true; // Schema compatibility for .abyss persistence

  // 4. Team dock & 4-unit lineup duplication
  s2.showDock = s1.showDock !== false;
  s2.croppedStrip = s1.croppedStrip;
  s2.teammates = Array.isArray(s1.teammates) ? [...s1.teammates] : [s1.character, '', '', ''];
  if (Array.isArray(s1.teammateImgs)) {
    s2.teammateImgs = [...s1.teammateImgs];
  }
  if (typeof preloadTeammateImages === 'function') {
    preloadTeammateImages(s2);
  }

  // 5. Update UI, dock controls, metadata and canvas
  if (typeof updateSidebarUI === 'function') updateSidebarUI();
  if (typeof updateTeamRosterUI === 'function') updateTeamRosterUI();
  if (typeof generateYouTubeMetadata === 'function') generateYouTubeMetadata();
  if (typeof renderCanvas === 'function') renderCanvas();
  if (typeof recordSnapshot === 'function') recordSnapshot('Duplicate Left to Right (Side 1 to Side 2)');
  if (typeof showToast === 'function') showToast('👯 Duplicated Side 1 (Character, Dock & Flipped Pose) to Side 2!');
};


// Preload Stygian Boss Profile Icons
function preloadStygianBossIcons() {
  if (!state || !state.stygianBosses) return;
  state.stygianBosses.forEach(b => {
    if (b.icon) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = b.icon;
      img.onload = () => {
        b.iconImg = img;
        if (state.layoutMode === 'stygian' && typeof renderCanvas === 'function') {
          renderCanvas();
        }
      };
      b.iconImg = img;
    }
  });
}
window.preloadStygianBossIcons = preloadStygianBossIcons;

// Update Stygian Boss Editor UI in sidebar
function updateStygianBossUI() {
  if (!state || !state.stygianBosses) return;
  const currentSlot = state.activeSlot || 1;
  const idx = Math.min(2, Math.max(0, currentSlot - 1));
  const boss = state.stygianBosses[idx];
  if (!boss) return;

  const lblSlot = document.getElementById('lblActiveBossSlot');
  const lblFull = document.getElementById('lblBossFullName');
  const inpName = document.getElementById('inputStygianBossName');
  const imgIcon = document.getElementById('imgActiveBossIcon');
  const iconWrap = document.getElementById('activeBossIconWrap');
  const chkBadges = document.getElementById('chkShowBossBadges');

  if (lblSlot) {
    const slotNames = ['Boss 1 (Left Section)', 'Boss 2 (Mid Section)', 'Boss 3 (Right Section)'];
    lblSlot.textContent = slotNames[idx];
    lblSlot.style.color = boss.color || ['#38bdf8', '#c084fc', '#fb7185'][idx];
  }
  if (lblFull) lblFull.textContent = boss.fullName || boss.name;
  if (inpName) inpName.value = boss.name || `BOSS ${idx + 1}`;
  if (imgIcon && boss.icon) imgIcon.src = boss.icon;
  if (iconWrap) {
    iconWrap.style.borderColor = 'rgba(255, 255, 255, 0.18)';
    iconWrap.style.boxShadow = 'none';
  }
  if (chkBadges) chkBadges.checked = state.showBossBadges !== false;

  // Sync Stygian Cycle Title Banner Controls
  const chkTitle = document.getElementById('chkShowStygianCycleTitle');
  const inpVer = document.getElementById('inputStygianVersion');
  const inpTitle = document.getElementById('inputStygianCycleTitle');
  const rngTitleSize = document.getElementById('rngStygianTitleSize');
  const lblTitleSize = document.getElementById('lblStygianTitleSize');
  const rngTitleY = document.getElementById('rngStygianTitleY');

  if (chkTitle) chkTitle.checked = state.showStygianCycleTitle !== false;
  if (inpVer) inpVer.value = state.stygianVersion || '7.1';
  if (inpTitle) inpTitle.value = state.stygianCycleTitle || '7.1 STYGIAN ONSLAUGHT';
  if (rngTitleSize) rngTitleSize.value = state.stygianCycleTitleSize || 36;
  if (lblTitleSize) lblTitleSize.textContent = `${state.stygianCycleTitleSize || 36}px`;
  if (rngTitleY) rngTitleY.value = state.stygianCycleTitleY || 164;

  // Sync Badge Size & Scale Controls
  const scale = Number(state.bossBadgeScale) || 1.0;
  const rngScale = document.getElementById('rngBossBadgeScale');
  const lblScale = document.getElementById('lblBossBadgeScale');
  const rngTop = document.getElementById('rngBossBadgeTop');
  if (rngScale) rngScale.value = scale;
  if (rngTop && state.bossBadgeTop !== undefined) rngTop.value = state.bossBadgeTop;
  if (lblScale) {
    const pct = Math.round(scale * 100);
    const tag = scale >= 1.2 ? 'Hero / XL' : scale <= 0.85 ? 'Compact' : 'Large (Default)';
    lblScale.textContent = `${pct}% (${tag})`;
  }
  const btnCompact = document.getElementById('btnBadgeSizeCompact');
  const btnLarge = document.getElementById('btnBadgeSizeLarge');
  const btnHero = document.getElementById('btnBadgeSizeHero');
  if (btnCompact) btnCompact.classList.toggle('active', Math.abs(scale - 0.8) < 0.05);
  if (btnLarge) btnLarge.classList.toggle('active', Math.abs(scale - 1.0) < 0.05);
  if (btnHero) btnHero.classList.toggle('active', Math.abs(scale - 1.25) < 0.05);
}
window.updateStygianBossUI = updateStygianBossUI;

function setStudioMode(mode) {
  state.layoutMode = mode; // 'dual' or 'stygian'
  const btnAbyss = document.getElementById('btnStudioModeAbyss');
  const btnStygian = document.getElementById('btnStudioModeStygian');
  const tab1 = document.getElementById('tabSide1');
  const tab2 = document.getElementById('tabSide2');
  const tab3 = document.getElementById('tabSide3');
  const btnDupCarry = document.getElementById('btnDuplicateCarryAll');
  const btnDupTeam1 = document.getElementById('btnDuplicateTeam1');
  const spireWidget = document.getElementById('spireConfigWidget');
  const centerNav = document.getElementById('centerStyleNav');

  if (btnAbyss) btnAbyss.classList.toggle('active', mode === 'abyss');
  if (btnStygian) btnStygian.classList.toggle('active', mode === 'stygian');

  const btnDupCarryGroup = document.getElementById('stygianDuplicateGroup');
  const stygianBossCard = document.getElementById('stygianBossCard');

  if (mode === 'stygian') {
    if (tab1) tab1.textContent = '⚔️ Boss 1 (Left)';
    if (tab2) tab2.textContent = '⚔️ Boss 2 (Mid)';
    if (tab3) {
      tab3.style.display = 'flex';
      tab3.textContent = '⚔️ Boss 3 (Right)';
    }
    if (btnDupCarryGroup) btnDupCarryGroup.style.display = 'flex';
    if (btnDupCarry) btnDupCarry.style.display = 'block';
    if (btnDupTeam1) btnDupTeam1.style.display = 'none';
    if (spireWidget) spireWidget.style.display = 'none';
    if (centerNav) centerNav.style.display = 'none';
    if (stygianBossCard) stygianBossCard.style.display = 'block';
    const subtabBoss = document.getElementById('subtabBoss');
    if (subtabBoss) {
      subtabBoss.style.display = 'flex';
      subtabBoss.innerHTML = '<span class="subtab-icon">⚔️</span> Boss & Cycle';
    }
    preloadStygianBossIcons();
    updateStygianBossUI();
  } else {
    if (tab1) tab1.textContent = '⚔️ Side 1 (Left Half)';
    if (tab2) tab2.textContent = '⚔️ Side 2 (Right Half)';
    if (tab3) tab3.style.display = 'none';
    if (btnDupCarryGroup) btnDupCarryGroup.style.display = 'none';
    if (btnDupCarry) btnDupCarry.style.display = 'none';
    if (btnDupTeam1) btnDupTeam1.style.display = 'block';
    if (spireWidget) spireWidget.style.display = 'block';
    if (centerNav) centerNav.style.display = 'flex';
    if (stygianBossCard) stygianBossCard.style.display = 'none';
    const subtabBoss = document.getElementById('subtabBoss');
    if (subtabBoss) {
      subtabBoss.style.display = 'none';
      // Switch back to team tab if boss tab was active
      const subtabTeam = document.getElementById('subtabTeam');
      if (subtabTeam) subtabTeam.click();
    }
    if (state.activeSlot === 3) setActiveSlot(1);
  }

  setActiveSlot(state.activeSlot || 1);
  if (typeof renderCanvas === 'function') renderCanvas();
}
window.setStudioMode = setStudioMode;

// 1-Click Duplicate Entire Setup & Dock to All 3 Sides
window.duplicateAllSides = function() {
  if (!state || !state.side1 || !state.side2 || !state.side3) return;
  const src = getActiveSlot();
  const targets = [state.side1, state.side2, state.side3].filter(s => s !== src);

  targets.forEach(tgt => {
    tgt.character = src.character;
    tgt.element = src.element;
    tgt.archetype = src.archetype;
    tgt.archetypeColor = src.archetypeColor;
    tgt.constellation = src.constellation;
    tgt.customName = src.customName;
    tgt.img = src.img;
    tgt.imgUrl = src.imgUrl;
    tgt.gallery = Array.isArray(src.gallery) ? [...src.gallery] : [];
    tgt.isEnhanced = !!src.isEnhanced;
    tgt.enhancedForUrl = src.enhancedForUrl || '';
    tgt.enhancementFactor = src.enhancementFactor || 1;

    // Sync framing position exactly as active slot
    tgt.scale = src.scale;
    tgt.panY = src.panY;
    tgt.panX = src.panX;
    tgt.mirror = src.mirror;
    tgt.mirrored = src.mirrored;

    // Sync team dock presets & full 4-unit lineup
    tgt.showDock = src.showDock !== false;
    tgt.dockStyle = src.dockStyle || 'bottom';
    tgt.croppedStrip = src.croppedStrip;
    tgt.teammates = Array.isArray(src.teammates) ? [...src.teammates] : [src.character, '', '', ''];
    if (Array.isArray(src.teammateImgs)) {
      tgt.teammateImgs = [...src.teammateImgs];
    }
    if (typeof preloadTeammateImages === 'function') {
      preloadTeammateImages(tgt);
    }
  });

  if (typeof updateSidebarUI === 'function') updateSidebarUI();
  if (typeof updateTeamRosterUI === 'function') updateTeamRosterUI();
  if (typeof updateHeadlineUI === 'function') updateHeadlineUI();
  if (typeof generateYouTubeMetadata === 'function') generateYouTubeMetadata();
  if (typeof renderCanvas === 'function') renderCanvas();
  if (typeof pushUndoState === 'function') pushUndoState();
  if (typeof recordSnapshot === 'function') {
    recordSnapshot(`Duplicated Entire Setup (${src.character || 'DPS'}) & Dock to All 3 Sides`);
  }
  showToast(`⚡ Duplicated entire setup (${src.character || 'DPS'}) & dock across all 3 sides!`);
};

// Duplicate Carry Only (Maintains distinct support lineups)
window.duplicateCarryOnly = function() {
  if (!state || !state.side1 || !state.side2 || !state.side3) return;
  const src = getActiveSlot();
  const targets = [state.side1, state.side2, state.side3].filter(s => s !== src);

  targets.forEach(tgt => {
    tgt.character = src.character;
    tgt.element = src.element;
    tgt.archetype = src.archetype;
    tgt.archetypeColor = src.archetypeColor;
    tgt.constellation = src.constellation;
    tgt.customName = src.customName;
    tgt.img = src.img;
    tgt.imgUrl = src.imgUrl;
    tgt.gallery = Array.isArray(src.gallery) ? [...src.gallery] : [];
    tgt.isEnhanced = !!src.isEnhanced;
    tgt.enhancedForUrl = src.enhancedForUrl || '';
    tgt.enhancementFactor = src.enhancementFactor || 1;

    // Sync framing position exactly as active slot
    tgt.scale = src.scale;
    tgt.panY = src.panY;
    tgt.panX = src.panX;
    tgt.mirror = src.mirror;
    tgt.mirrored = src.mirrored;

    // Preserves distinct support comp for each boss fight while syncing main DPS (Slot 0)
    if (!tgt.teammates || !Array.isArray(tgt.teammates)) {
      tgt.teammates = [src.character, '', '', ''];
    } else {
      tgt.teammates[0] = src.character;
    }
    if (tgt.teammateImgs && src.teammateImgs) {
      tgt.teammateImgs[0] = src.teammateImgs[0];
    }
    if (typeof preloadTeammateImages === 'function') {
      preloadTeammateImages(tgt);
    }
  });

  if (typeof updateSidebarUI === 'function') updateSidebarUI();
  if (typeof updateTeamRosterUI === 'function') updateTeamRosterUI();
  if (typeof generateYouTubeMetadata === 'function') generateYouTubeMetadata();
  if (typeof renderCanvas === 'function') renderCanvas();
  if (typeof pushUndoState === 'function') pushUndoState();
  if (typeof recordSnapshot === 'function') {
    recordSnapshot(`Duplicated Carry (${src.character || 'DPS'}) to All 3 Sides`);
  }
  showToast(`🎭 Duplicated Carry (${src.character || 'DPS'}) while preserving distinct supports!`);
};

window.duplicateCarryToAllSides = window.duplicateAllSides;

window.duplicateLeftToRight = window.duplicateSide1ToSide2;

// Keyboard shortcut: Alt+D to Duplicate Side 1 to Side 2
window.addEventListener('keydown', (e) => {
  if (e.altKey && (e.key === 'd' || e.key === 'D')) {
    e.preventDefault();
    if (window.duplicateSide1ToSide2) {
      window.duplicateSide1ToSide2();
    }
  }
});

/**
 * Genshin Impact Spiral Abyss Studio - Client Engine
 * Features Canva-style direct touch/mouse manipulation, 60fps local rendering,
 * dynamic HoYoWiki official gallery filmstrip, keyboard shortcuts, and clipboard export.
 * Version: 2.6.1 (Production Hardened)
 */

// Canvas & Context
const canvas = document.getElementById('thumbnailCanvas');
const ctx = canvas.getContext('2d');

// State
const state = {
  layoutMode: 'dual', // 'dual' (Classic 2-Team Split) | 'spotlight' (Single Team Showcase)
  showSafeZone: false, // Toggle YouTube timestamp safe-zone box overlay
  showBossBadges: true,
  bossBadgeScale: 1.0,
  bossBadgeTop: 60,
  showStygianCycleTitle: true,
  stygianVersion: '7.1',
  stygianCycleTitle: '7.1 STYGIAN ONSLAUGHT',
  stygianCycleTitleSize: 36,
  stygianCycleTitleY: 204,
  stygianBosses: [
    { id: 'domovoy', name: 'DOMOVOY', fullName: 'Battle-Hardened Domovoy Sculptor', icon: '/static/assets/bosses/stygian_domovoy.png', iconImg: null, color: '#00e5ff' },
    { id: 'overseer_device', name: 'OVERSEER DEVICE', fullName: 'Secret Source Automaton: Overseer Device', icon: '/static/assets/bosses/stygian_overseer.png', iconImg: null, color: '#c084fc' },
    { id: 'guardian_blade', name: 'GUARDIAN BLADE', fullName: 'Guardian Blade of Drifting Snow', icon: '/static/assets/bosses/stygian_guardian_blade.png', iconImg: null, color: '#fb7185' }
  ],
  spotlightTarget: 'bg', // 'hero' | 'bg'
  spotlight: {
    bgImg: null,
    bgImgUrl: '/static/assets/demo_abyss_vortex.jpg',
    bgPanX: 0,
    bgPanY: 0,
    bgScale: 1.0,
    bgBrightness: 100,
    bgContrast: 110,
    showDamageVignette: true,
    typoStyle: 'slanted_3d', // 'slanted_3d' | 'clean_flat' | 'capsule'
    ribbonText: 'FLOOR 12 9-STAR CLEAR',
    hookBadgeText: 'YOU NEED TO TRY THIS!',
    hookBadgeSub: 'VENTI HYPERCARRY',
    hookTheme: 'gold',
    hookColor: '#ffd54f',
    glowPreset: 'anemo',
    glowColor: '#2dd4bf',
    glowRadius: 32,
    framingPreset: 'headshot',
    showTeamDock: true
  },
  patch: '7.0',
  centerStyle: 'spire', // 'spire' (TGozaru) | 'rosette' | 'divider'
  rosette: {
    enabled: true,
    mode: 'auto', // 'auto' | 'custom'
    color: '#fed662',
    colorName: 'Auto'
  },
  spire: {
    floor: '12',
    hookText: 'NEW ENEMY !!',
    showHook: true
  },
  rosterLayout: 'dock', // 'dock' (Bottom 4-man) | 'vertical' (TGozaru 3-unit edge stack)
  exportEnhance: false, // Off by default for pristine official illustration quality
  activeSlot: 1, // 1 for Left, 2 for Right (0 for Export / Deselected)
  showEyeGuide: false,
  activeElementFilter: 'all',
  archetypeStyle: 'floating', // 'floating' (Donaturine Two-Tone) or 'frosted' (Capsule)
  headlineFormat: '1line', // '1line' (Donaturine Signature: [NAME] [ARCHETYPE]) or '2line'
  selectedYTPreset: 'tgozaru',
  ytMetaMode: 'abyss',
  ytDifficulty: 'Fearless',
  selectedYTPresetStygian: 'stygian_meta',
  descriptionLocked: false,
  isExporting: false,
  starBadge: {
    enabled: false,
    text: '36★ CLEAR',
    position: 'top-left', // 'top-left' | 'top-right' | 'spire' | 'bottom-center'
    style: 'gold_pill'
  },
  overlays: [], // Array of TextOverlay items
  watermark: {
    enabled: false,
    text: '@Sireula',
    position: 'bottom-left', // 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
    opacity: 0.75,
    fontSize: 26,
    color: '#FFFFFF'
  },
  syncedSegments: null, // Structured segments from video auto-editor: [{id, chamber, side, time, seconds, label}]
  syncedVideoDuration: '09:07',
  includeTeamsInChapters: true,
  charactersCatalog: {}, // Loaded from /api/characters
  side1: {
    character: 'Mavuika',
    constellation: 'C0',
    archetype: 'OVERLOAD',
    archetypeColor: 'auto', // 'auto' or hex (e.g. '#FFD54F')
    customName: '',
    img: null,
    imgUrl: '',
    isLoading: false,
    isEnhanced: false,
    enhancedForUrl: '',
    enhancementFactor: 1,
    panX: 0,
    panY: -40,
    scale: 1.05,
    mirror: false,
    gallery: [],
    teammates: ['Mavuika', 'Iansan', 'Chevreuse', 'Ororon'],
    teammateImgs: [null, null, null, null],
    showDock: true,
    croppedStrip: null
  },
  side2: {
    character: 'Chasca',
    constellation: 'C0',
    archetype: 'RAINBOW HYPER',
    archetypeColor: 'auto', // 'auto' or hex (e.g. '#FFD54F')
    customName: '',
    img: null,
    imgUrl: '',
    isLoading: false,
    isEnhanced: false,
    enhancedForUrl: '',
    enhancementFactor: 1,
    panX: 0,
    panY: -40,
    scale: 1.05,
    mirror: true,
    gallery: [],
    teammates: ['Chasca', 'Furina', 'Bennett', 'Ororon'],
    teammateImgs: [null, null, null, null],
    showDock: true,
    croppedStrip: null
  },
  side3: {
    character: 'Chasca',
    constellation: 'C0',
    archetype: 'MELT WARD',
    archetypeColor: 'auto',
    customName: '',
    img: null,
    imgUrl: '',
    isLoading: false,
    isEnhanced: false,
    enhancedForUrl: '',
    enhancementFactor: 1,
    panX: 0,
    panY: -40,
    scale: 1.05,
    mirror: false,
    gallery: [],
    teammates: ['Chasca', 'Fischl', 'Durin', 'Bennett'],
    teammateImgs: [null, null, null, null],
    showDock: true,
    croppedStrip: null
  }
};
window.state = state;

// Target selector for teammate picking modal
let teammateSelectionTarget = null;

// Meta 4-Character Roster Compositions (Comprehensive official + meta synergies)
const META_TEAMS = {
  'Skirk': ['Skirk', 'Furina', 'Escoffier', 'Kaedehara Kazuha'],
  'Columbina': ['Columbina', 'Furina', 'Yelan', 'Jean'],
  'Varesa': ['Varesa', 'Chevreuse', 'Fischl', 'Bennett'],
  'Escoffier': ['Escoffier', 'Skirk', 'Furina', 'Kaedehara Kazuha'],
  'Citlali': ['Citlali', 'Mavuika', 'Bennett', 'Xilonen'],
  'Kachina': ['Kachina', 'Mavuika', 'Xilonen', 'Bennett'],
  'Lan Yan': ['Lan Yan', 'Furina', 'Fischl', 'Bennett'],
  'Dahlia': ['Dahlia', 'Hu Tao', 'Yelan', 'Zhongli'],
  'Wriothesley': ['Wriothesley', 'Xiangling', 'Bennett', 'Shenhe'],
  'Hu Tao': ['Hu Tao', 'Xingqiu', 'Yelan', 'Zhongli'],
  'Clorinde': ['Clorinde', 'Chevreuse', 'Fischl', 'Bennett'],
  'Zhongli': ['Zhongli', 'Albedo', 'Chiori', 'Gorou'],
  'Navia': ['Navia', 'Zhongli', 'Xiangling', 'Bennett'],
  'Neuvillette': ['Neuvillette', 'Furina', 'Kaedehara Kazuha', 'Baizhu'],
  'Arlecchino': ['Arlecchino', 'Yelan', 'Bennett', 'Kaedehara Kazuha'],
  'Furina': ['Furina', 'Neuvillette', 'Kaedehara Kazuha', 'Baizhu'],
  'Chasca': ['Chasca', 'Furina', 'Bennett', 'Ororon'],
  'Mavuika': ['Mavuika', 'Iansan', 'Chevreuse', 'Ororon'],
  'Flins': ['Flins', 'Furina', 'Fischl', 'Jean'],
  'Lohen': ['Lohen', 'Shenhe', 'Kaedehara Kazuha', 'Sangonomiya Kokomi'],
  'Sandrone': ['Sandrone', 'Yumemizuki Mizuki', 'Furina', 'Kaedehara Kazuha'],
  'Raiden': ['Raiden Shogun', 'Kujou Sara', 'Kaedehara Kazuha', 'Bennett'],
  'Raiden Shogun': ['Raiden Shogun', 'Kujou Sara', 'Kaedehara Kazuha', 'Bennett'],
  'Alhaitham': ['Alhaitham', 'Nahida', 'Xingqiu', 'Kuki Shinobu'],
  'Nilou': ['Nilou', 'Nahida', 'Sangonomiya Kokomi', 'Collei'],
  'Ayaka': ['Kamisato Ayaka', 'Shenhe', 'Kaedehara Kazuha', 'Sangonomiya Kokomi'],
  'Kamisato Ayaka': ['Kamisato Ayaka', 'Shenhe', 'Kaedehara Kazuha', 'Sangonomiya Kokomi'],
  'Ayato': ['Kamisato Ayato', 'Fischl', 'Kaedehara Kazuha', 'Bennett'],
  'Kamisato Ayato': ['Kamisato Ayato', 'Fischl', 'Kaedehara Kazuha', 'Bennett'],
  'Kinich': ['Kinich', 'Emilie', 'Bennett', 'Xiangling'],
  'Vesna': ['Vesna', 'Yelan', 'Bennett', 'Kaedehara Kazuha'],
  'Mualani': ['Mualani', 'Xiangling', 'Sucrose', 'Zhongli'],
  'Kazuha': ['Kaedehara Kazuha', 'Raiden Shogun', 'Xiangling', 'Bennett'],
  'Kaedehara Kazuha': ['Kaedehara Kazuha', 'Raiden Shogun', 'Xiangling', 'Bennett'],
  'Kokomi': ['Sangonomiya Kokomi', 'Kamisato Ayaka', 'Shenhe', 'Kaedehara Kazuha'],
  'Sangonomiya Kokomi': ['Sangonomiya Kokomi', 'Kamisato Ayaka', 'Shenhe', 'Kaedehara Kazuha'],
  'Itto': ['Arataki Itto', 'Gorou', 'Albedo', 'Zhongli'],
  'Arataki Itto': ['Arataki Itto', 'Gorou', 'Albedo', 'Zhongli'],
  'Xiao': ['Xiao', 'Faruzan', 'Xianyun', 'Furina'],
  'Ganyu': ['Ganyu', 'Shenhe', 'Kaedehara Kazuha', 'Sangonomiya Kokomi'],
  'Keqing': ['Keqing', 'Nahida', 'Fischl', 'Kaedehara Kazuha'],
  'Yoimiya': ['Yoimiya', 'Yelan', 'Yun Jin', 'Zhongli'],
  'Yelan': ['Yelan', 'Xingqiu', 'Xiangling', 'Bennett'],
  'Eula': ['Eula', 'Raiden Shogun', 'Rosaria', 'Zhongli'],
  'Tartaglia': ['Tartaglia', 'Xiangling', 'Kaedehara Kazuha', 'Bennett'],
  'Wanderer': ['Wanderer', 'Faruzan', 'Bennett', 'Zhongli'],
  'Tighnari': ['Tighnari', 'Yae Miko', 'Nahida', 'Zhongli'],
  'Cyno': ['Cyno', 'Nahida', 'Furina', 'Baizhu'],
  'Lyney': ['Lyney', 'Xiangling', 'Bennett', 'Kaedehara Kazuha'],
  'Xianyun': ['Xianyun', 'Xiao', 'Faruzan', 'Furina'],
  'Xilonen': ['Xilonen', 'Mavuika', 'Furina', 'Bennett'],
  'Chiori': ['Chiori', 'Navia', 'Xiangling', 'Bennett'],
  'Emilie': ['Emilie', 'Kinich', 'Bennett', 'Xiangling'],
  'Sigewinne': ['Sigewinne', 'Furina', 'Nahida', 'Raiden Shogun'],
  'Dehya': ['Dehya', 'Mualani', 'Emilie', 'Bennett'],
  'Baizhu': ['Baizhu', 'Neuvillette', 'Furina', 'Kaedehara Kazuha'],
  'Nahida': ['Nahida', 'Nilou', 'Sangonomiya Kokomi', 'Collei'],
  'Diluc': ['Diluc', 'Xianyun', 'Furina', 'Bennett'],
  'Klee': ['Klee', 'Xiangling', 'Kaedehara Kazuha', 'Bennett'],
  'Venti': ['Venti', 'Ganyu', 'Mona', 'Diona'],
  'Mona': ['Mona', 'Kamisato Ayaka', 'Kaedehara Kazuha', 'Diona'],
  'Jean': ['Jean', 'Furina', 'Raiden Shogun', 'Yelan'],
  'Qiqi': ['Qiqi', 'Furina', 'Yelan', 'Raiden Shogun'],
  'Sethos': ['Sethos', 'Nahida', 'Fischl', 'Zhongli'],
  'Gaming': ['Gaming', 'Xianyun', 'Furina', 'Bennett'],
  'Chevreuse': ['Chevreuse', 'Clorinde', 'Fischl', 'Bennett'],
  'Ororon': ['Ororon', 'Chasca', 'Furina', 'Bennett'],
  'Iansan': ['Iansan', 'Mavuika', 'Chevreuse', 'Ororon']
};

// Meta Team Archetypes Database for Instant 1-Click Selection
const META_ARCHETYPES = {
  'Skirk': ['FREEZE', 'MELT', 'HYPERCARRY', 'MONO CRYO'],
  'Columbina': ['VAPORIZE', 'BLOOM', 'ELECTRO-CHARGE', 'FREEZE', 'MONO HYDRO'],
  'Varesa': ['OVERLOAD', 'AGGRAVATE', 'HYPERCARRY', 'ELECTRO-CHARGE'],
  'Escoffier': ['FREEZE', 'MELT', 'SUPERCONDUCT', 'MONO CRYO'],
  'Citlali': ['MELT', 'FREEZE', 'SUPERCONDUCT', 'HYPERCARRY'],
  'Kachina': ['CRYSTALLIZE', 'GEO SUPPORT', 'CINDER CITY', 'MONO GEO'],
  'Lan Yan': ['VV SWIRL', 'ANEMO SHIELD', 'TAZER', 'HYPERBLOOM'],
  'Dahlia': ['HYDRO SUPPORT', 'FREEZE', 'BLOOM', 'VAPORIZE'],
  'Wriothesley': ['MELT', 'FREEZE', 'BURGEON', 'HYPERCARRY'],
  'Hu Tao': ['VAPORIZE', 'DOUBLE HYDRO', 'PLUNGE', 'OVERVAPE'],
  'Clorinde': ['OVERLOAD', 'AGGRAVATE', 'QUICKBLOOM', 'HYPERCARRY'],
  'Zhongli': ['SHIELD BOT', 'BURST DPS', 'MONO GEO', 'PHYSICAL'],
  'Navia': ['CRYSTALLIZE', 'MONO GEO', 'PLUNGE', 'DUAL PYRO'],
  'Neuvillette': ['HYPERCARRY', 'HYPERBLOOM', 'MONO HYDRO', 'ELECTRO-CHARGE'],
  'Arlecchino': ['VAPORIZE', 'OVERLOAD', 'MONO PYRO', 'MELT'],
  'Furina': ['HYPERCARRY', 'FREEZE', 'VAPORIZE', 'MONO HYDRO'],
  'Chasca': ['RAINBOW HYPER', 'MULTI-SWIRL', 'BURGEON', 'VAPORIZE', 'HYPERCARRY'],
  'Mavuika': ['OVERLOAD', 'VAPORIZE', 'BURGEON', 'MELT', 'HYPERCARRY'],
  'Flins': ['OVERVAPE', 'HYPERCARRY', 'ELECTRO-CHARGE', 'AGGRAVATE'],
  'Lohen': ['OVERVAPE', 'VAPORIZE', 'FREEZE', 'HYPERCARRY'],
  'Sandrone': ['STELLAR CONDUCT', 'PHYSICAL', 'HYPERCARRY', 'SUPERCONDUCT'],
  'Mizuki': ['SWIRL', 'ANEMO DPS', 'TAZER', 'HYPERBLOOM'],
  'Yumemizuki Mizuki': ['SWIRL', 'ANEMO DPS', 'TAZER', 'HYPERBLOOM'],
  'Raiden Shogun': ['NATIONAL', 'HYPERCARRY', 'HYPERBLOOM', 'AGGRO-SPREAD'],
  'Nahida': ['HYPERBLOOM', 'BURGEON', 'SPREAD', 'NILOU BLOOM'],
  'Alhaitham': ['QUICKBLOOM', 'SPREAD', 'HYPERBLOOM', 'HYPERCARRY'],
  'Kazuha': ['VV SWIRL', 'MONO ELEMENT', 'AGGRO-SPREAD', 'FREEZE'],
  'Kaedehara Kazuha': ['VV SWIRL', 'MONO ELEMENT', 'AGGRO-SPREAD', 'FREEZE'],
  'Yelan': ['DOUBLE HYDRO', 'VAPORIZE', 'HYPERBLOOM', 'TAZER'],
  'Xiao': ['HYPERCARRY', 'PLUNGE', 'FARUZAN CORE', 'DOUBLE GEO'],
  'Kinich': ['BURGEON', 'BURNING', 'HYPERCARRY', 'QUICKBLOOM'],
  'Xilonen': ['RES SHRED', 'GEO CORE', 'CRYSTALLIZE', 'HYPERCARRY'],
  'Kamisato Ayaka': ['FREEZE', 'MONO CRYO', 'MELT', 'HYPERCARRY'],
  'Ayaka': ['FREEZE', 'MONO CRYO', 'MELT', 'HYPERCARRY'],
  'Ganyu': ['MELT', 'FREEZE', 'BURNING MELT', 'MONO CRYO'],
  'Yoimiya': ['VAPORIZE', 'OVERLOAD', 'MONO PYRO', 'BURGEON'],
  'Keqing': ['AGGRAVATE', 'QUICKBLOOM', 'ELECTRO-CHARGE', 'HYPERCARRY'],
  'Tartaglia': ['VAPORIZE', 'INTERNATIONAL', 'ELECTRO-CHARGE', 'BURGEON'],
  'Wanderer': ['HYPERCARRY', 'ANEMO DPS', 'SWIRL DRIVER', 'DOUBLE PYRO']
};

const GENERIC_ARCHETYPES = ['HYPERCARRY', 'VAPORIZE', 'MELT', 'AGGRAVATE', 'BLOOM', 'MONO ELEMENT'];

function getMetaTeamForCharacter(name) {
  if (!name) return null;
  if (META_TEAMS[name]) return META_TEAMS[name];
  const nLow = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [k, v] of Object.entries(META_TEAMS)) {
    const kLow = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (kLow === nLow || kLow.endsWith(nLow) || nLow.endsWith(kLow)) {
      return v;
    }
  }
  return null;
}

function getArchetypesForCharacter(name) {
  if (!name) return GENERIC_ARCHETYPES;
  if (META_ARCHETYPES[name]) return META_ARCHETYPES[name];
  const nLow = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [k, v] of Object.entries(META_ARCHETYPES)) {
    const kLow = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (kLow === nLow || kLow.endsWith(nLow) || nLow.endsWith(kLow)) {
      return v;
    }
  }
  return GENERIC_ARCHETYPES;
}

// Pointer & Multi-touch Interaction State
const pointerState = {
  draggedOverlay: null,
  activeOverlayId: null,
  overlayStartX: 0,
  overlayStartY: 0,
  pointers: new Map(),
  isDragging: false,
  startPanX: 0,
  startPanY: 0,
  lastPinchDist: 0
};

// Asset caches (Badges & Fonts)
let floorBadgeImg = null;
let rosetteBadgeImg = null;

// Initialize
async function checkEnvironmentCapabilities() {
  try {
    const res = await fetch('/api/environment');
    if (res.ok) {
      const data = await res.json();
      if (data.version) {
        document.querySelectorAll('.app-version-display').forEach(el => {
          el.textContent = `v${data.version}`;
        });
      }
      const pill = document.getElementById('envCapabilityPill');
      const text = document.getElementById('envCapabilityText');
      if (pill && text) {
        if (data.mode === 'cloud') {
          pill.className = 'env-badge cloud';
          text.textContent = '🌐 Cloud Sandbox';
          pill.title = 'Running in Cloud Sandbox mode. Local video and CapCut automation require running the Windows desktop app.';
        } else {
          pill.className = 'env-badge desktop';
          text.textContent = '🖥️ Desktop';
          pill.title = 'Running in Local Desktop Mode with full media automation & CapCut integration unlocked.';
        }
      }
    }
  } catch (err) {
    console.warn('Could not check environment capabilities:', err);
  }
}

async function initStudio() {
  await loadAssets();

  // Ensure custom Montserrat, Rubik, Anton, Norwester & Inter fonts are ready before initial rendering
  try {
    await Promise.race([
      Promise.allSettled([
        document.fonts.load('900 76px Montserrat'),
        document.fonts.load('800 76px Montserrat'),
        document.fonts.load('900 76px Rubik'),
        document.fonts.load('400 76px Anton'),
        document.fonts.load('400 76px Norwester'),
        document.fonts.ready
      ]),
      new Promise(r => setTimeout(r, 1200))
    ]);
  } catch (e) {
    console.warn('Font loading check skipped:', e);
  }

  // Reactive listener: automatically re-render canvas whenever all web fonts finish loading
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if (typeof renderCanvas === 'function') {
        renderCanvas();
      }
    });
  }

  await loadCharactersCatalog();

  // Check runtime environment capabilities (Desktop vs Cloud Sandbox)
  checkEnvironmentCapabilities();

  // Setup DOM Event Listeners & Keyboard Shortcuts
  setupDOMListeners();
  setupCanvasInteraction();
  setupSidebarSubtabs();
  setupKeyboardShortcuts();
  setupQuickStartModal();
  if (typeof initSpotlightStudio === 'function') {
    initSpotlightStudio();
  }

  // Load default characters (Mavuika & Chasca for Abyss, plus slot 3 for Stygian)
  await selectCharacterForSlot(1, 'Mavuika', false);
  await selectCharacterForSlot(2, 'Chasca', false);
  await selectCharacterForSlot(3, 'Chasca', false);

  updateSidebarUI();
  updateZoomUI();
  updateBadgesAndOverlaysUI();
  updateTextOverlaysUI();

  // Handle URL parameters (e.g. ?mode=stygian&slot=3&dup=1)
  const urlParams = new URLSearchParams(window.location.search);
  // Support ?view=arranger&arranger_mode=stygian direct navigation
  const targetView = urlParams.get('view');
  const targetArrangerMode = urlParams.get('arranger_mode') || (urlParams.get('mode') === 'arranger_stygian' ? 'stygian' : null);
  if (targetView === 'arranger' || urlParams.get('mode') === 'arranger' || targetArrangerMode) {
    if (switchStudioView) switchStudioView('arranger');
    if (targetArrangerMode && setArrangerMode) {
      setArrangerMode(targetArrangerMode);
    }
  }

  const initialMode = urlParams.get('mode');
  if (initialMode === 'stygian') {
    setStudioMode('stygian');
    const initialSlot = parseInt(urlParams.get('slot') || '1', 10);
    if (initialSlot >= 1 && initialSlot <= 3) {
      setActiveSlot(initialSlot);
    }
    if (urlParams.get('dup') === '1') {
      window.duplicateCarryToAllSides();
    }
    // Auto-sync with live/cached stygian.moe cycle data
    fetch('/api/stygian/cycles')
      .then(r => r.json())
      .then(data => {
        if (data.current_cycle && data.current_cycle.bosses) {
          state.stygianVersion = data.current_patch || '7.1';
          state.stygianCycleTitle = `${state.stygianVersion} STYGIAN ONSLAUGHT`;
          const inpVer = document.getElementById('inputStygianVersion');
          const inpTitle = document.getElementById('inputStygianCycleTitle');
          if (inpVer) inpVer.value = state.stygianVersion;
          if (inpTitle) inpTitle.value = state.stygianCycleTitle;

          data.current_cycle.bosses.forEach((b, idx) => {
            if (state.stygianBosses[idx]) {
              state.stygianBosses[idx].id = b.id;
              state.stygianBosses[idx].name = b.short_name.toUpperCase();
              state.stygianBosses[idx].fullName = b.full_name;
              state.stygianBosses[idx].icon = b.icon;
              state.stygianBosses[idx].color = b.color;
            }
          });
          preloadStygianBossIcons();
          updateStygianBossUI();
          renderCanvas();
        }
      })
      .catch(e => console.warn('Stygian auto-sync skipped:', e));
  }
  loadYTPlaylists();
  if (window.updateRosetteWidgetUI) window.updateRosetteWidgetUI();
  renderCanvas();
  pushUndoState();
}

// Load Badges
function loadAssets() {
  return new Promise((resolve) => {
    let loaded = 0;
    const check = () => {
      loaded++;
      if (loaded >= 2) resolve();
    };

    floorBadgeImg = new Image();
    floorBadgeImg.crossOrigin = 'anonymous';
    floorBadgeImg.src = '/static/assets/badge_floor_12.png';
    floorBadgeImg.onload = check;
    floorBadgeImg.onerror = check;

    rosetteBadgeImg = new Image();
    rosetteBadgeImg.crossOrigin = 'anonymous';
    rosetteBadgeImg.src = '/static/assets/badge_patch_rosette.png';
    rosetteBadgeImg.onload = check;
    rosetteBadgeImg.onerror = check;
  });
}

// Load 130 Characters & Versioned Meta Catalogs
async function loadCharactersCatalog() {
  try {
    const res = await fetch('/api/characters');
    if (res.ok) {
      state.charactersCatalog = await res.json();
      populateModalCharGrid('', 'all');
    }
  } catch (e) {
    console.warn('Could not load characters catalog:', e);
  }

  // Asynchronously load versioned meta teams and archetypes from backend JSON catalogs
  try {
    const [tRes, aRes] = await Promise.allSettled([
      fetch('/api/catalog/teams'),
      fetch('/api/catalog/archetypes')
    ]);
    if (tRes.status === 'fulfilled' && tRes.value.ok) {
      const teams = await tRes.value.json();
      Object.assign(META_TEAMS, teams);
    }
    if (aRes.status === 'fulfilled' && aRes.value.ok) {
      const archetypes = await aRes.value.json();
      Object.assign(META_ARCHETYPES, archetypes);
    }
  } catch (e) {
    console.debug('Using built-in meta catalog:', e);
  }
}

// Preload Teammate Avatar Images for Canvas Rendering (Instant Offline Local API)
function preloadTeammateImages(slot) {
  if (!slot || !slot.teammates) return;
  slot.teammateImgs = slot.teammateImgs || [null, null, null, null];

  slot.teammates.forEach((name, idx) => {
    if (!name) {
      slot.teammateImgs[idx] = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    // Use high-speed local avatar endpoint first with cache buster
    img.src = `/api/avatar/${encodeURIComponent(name)}?v=4.0.1`;
    img.onload = () => renderCanvas();
    img.onerror = () => {
      // Fallback to catalog lookup if local file missing
      let info = state.charactersCatalog[name];
      if (!info) {
        const nLow = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const [k, v] of Object.entries(state.charactersCatalog)) {
          const kLow = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (kLow === nLow || kLow.endsWith(nLow) || nLow.endsWith(kLow)) {
            info = v;
            break;
          }
        }
      }
      if (info && info.icon && !img._triedProxy) {
        img._triedProxy = true;
        img.src = `/api/proxy-image?url=${encodeURIComponent(info.icon)}&thumb=true`;
      }
    };
    slot.teammateImgs[idx] = img;
  });
}

// Select Character for Slot (NON-BLOCKING & OPTIMISTIC)
async function selectCharacterForSlot(slotNum, charName, resetTransforms = true) {
  const slot = getSlot(slotNum);
  slot.character = charName;

  if (slotNum === 1 && state.rosette && state.rosette.mode === 'auto' && window.updateRosetteWidgetUI) {
    window.updateRosetteWidgetUI();
  }
  slot.isLoading = true;

  // Update Teammates: Auto-fill meta synergy team or fallback to single lead
  const metaTeam = getMetaTeamForCharacter(charName);
  if (metaTeam) {
    slot.teammates = [...metaTeam];
  } else {
    if (!slot.teammates) slot.teammates = [charName, '', '', ''];
    slot.teammates[0] = charName;
  }
  preloadTeammateImages(slot);

  if (resetTransforms) {
    slot.panX = 0;
    slot.panY = -40;
    slot.scale = 1.05;
  }

  // 1. If this slot is currently displayed in the sidebar, update title, avatar, and skeleton
  if (state.activeSlot === slotNum) {
    const charInfo = state.charactersCatalog[charName] || {};
    const charNameEl = document.getElementById('charNameDisplay');
    const charElemEl = document.getElementById('charElementDisplay');
    const avatarEl = document.getElementById('charAvatarImg');
    const container = document.getElementById('galleryFilmstrip');
    const countTag = document.getElementById('galleryCountTag');

    if (charNameEl) charNameEl.textContent = charName;
    if (charElemEl) charElemEl.textContent = `${charInfo.vision || 'Genshin Impact'} • Official`;
    if (avatarEl) {
      avatarEl.src = `/api/avatar/${encodeURIComponent(charName)}?v=4.0.1`;
      avatarEl.onerror = () => {
        if (charInfo.icon && !avatarEl._triedProxy) {
          avatarEl._triedProxy = true;
          avatarEl.src = `/api/proxy-image?url=${encodeURIComponent(charInfo.icon)}&thumb=true`;
        }
      };
    }
    if (countTag) countTag.textContent = 'Loading art...';

    // Render 6 skeleton cards for smooth modern loading
    if (container) {
      container.innerHTML = `
        <div class="skeleton-thumb-grid">
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
        </div>
      `;
    }

    // Refresh meta archetype pills
    renderArchetypePills(charName);
    updateTeamRosterUI();
  }

  // 2. RENDER IMMEDIATELY so headline text changes in 0ms!
  updateZoomUI();
  if (state.layoutMode === 'spotlight' && typeof updateSpotlightSidebarUI === 'function') {
    updateSpotlightSidebarUI();
  }
  renderCanvas();

  // 3. Asynchronously fetch Gallery Illustrations from API (<2ms from cache)
  try {
    const res = await fetch(`/api/character-images/${encodeURIComponent(charName)}?v=4.0.1`, { cache: 'no-cache' });
    if (res.ok) {
      const images = await res.json();
      slot.gallery = images || [];

      // If this slot is currently active in the sidebar, render filmstrip immediately!
      if (state.activeSlot === slotNum) {
        renderGalleryFilmstrip(slot.gallery, slot.imgUrl);
        updateUnitCacheStatus(charName);
      }

      if (images && images.length > 0) {
        // Find best portrait/card or first image
        let bestUrl = '';
        // 1. Check for item with type === 'portrait' or recommended
        const portraitItem = images.find(item => typeof item === 'object' && (item.type === 'portrait' || (item.badge && item.badge.includes('Portrait'))));
        if (portraitItem) {
          bestUrl = portraitItem.url;
        } else {
          // 2. Fallback check for card/character keyword in string or url
          for (const item of images) {
            const u = typeof item === 'string' ? item : item.url;
            if (u && (u.toLowerCase().includes('card') || u.toLowerCase().includes('character'))) {
              bestUrl = u;
              break;
            }
          }
        }
        if (!bestUrl) {
          const first = images[0];
          bestUrl = typeof first === 'string' ? first : (first.url || '');
        }

        // Asynchronously stream image to canvas without blocking UI
        loadImageToSlot(slotNum, bestUrl).then(() => {
          slot.isLoading = false;
          if (state.activeSlot === slotNum) {
            const container = document.getElementById('galleryFilmstrip');
            if (container) {
              container.querySelectorAll('.gallery-thumb-item').forEach(el => {
                if (el.dataset.url === bestUrl) el.classList.add('active');
                else el.classList.remove('active');
              });
            }
          }
          renderCanvas();
        });
      } else {
        // Fallback: if gallery list empty, use catalog icon
        const charInfo = state.charactersCatalog[charName];
        if (charInfo && charInfo.icon) {
          slot.gallery = [charInfo.icon];
          loadImageToSlot(slotNum, charInfo.icon).then(() => {
            slot.isLoading = false;
            renderCanvas();
          });
        } else {
          slot.img = null;
          slot.imgUrl = '';
          slot.isLoading = false;
          renderCanvas();
        }
      }
    }
  } catch (e) {
    console.warn('Error loading character gallery:', e);
    slot.isLoading = false;
    renderCanvas();
  }
}

// Enhance Slot with Offline Super-Sampling
async function enhanceSlotHD(slotNum, auto = false) {
  const slot = getSlot(slotNum);
  if (!slot || !slot.imgUrl) return;

  // Determine needed enhancement factor (2x, 3x, or 4x based on zoom level)
  let factor = 2;
  if (slot.scale >= 2.5) factor = 4;
  else if (slot.scale >= 1.7) factor = 3;
  else factor = 2;

  // If already enhanced at this or higher factor, nothing to do
  if (slot.isEnhanced && slot.enhancementFactor >= factor && slot.enhancedForUrl === slot.imgUrl) {
    if (!auto) showToast(`✨ Already super-sampled at ${slot.enhancementFactor}x clarity!`);
    return;
  }

  const btn = document.getElementById('btnSlotEnhance');
  const tbBtn = document.getElementById('tbEnhance');
  const statusEl = document.getElementById('hdClarityStatus');

  if (!auto) {
    if (btn) btn.innerHTML = '<span>⏳</span> Enhancing...';
    if (tbBtn) tbBtn.innerHTML = '<span>⏳</span> Enhancing...';
    if (statusEl) statusEl.textContent = `Super-sampling (${factor}x)...`;
  }

  try {
    const enhanceApiUrl = `/api/enhance-image?url=${encodeURIComponent(slot.imgUrl)}&factor=${factor}&sharpen=0.45`;
    const enhancedImg = new Image();
    enhancedImg.crossOrigin = 'anonymous';

    await new Promise((resolve, reject) => {
      enhancedImg.onload = resolve;
      enhancedImg.onerror = reject;
      enhancedImg.src = enhanceApiUrl;
    });

    slot.img = enhancedImg;
    slot.isEnhanced = true;
    slot.enhancementFactor = factor;
    slot.enhancedForUrl = slot.imgUrl;

    if (state.activeSlot === slotNum) {
      if (statusEl) {
        statusEl.textContent = `✨ Super-Sampled (${factor}x Crisp)`;
        statusEl.style.color = '#38bdf8';
      }
      if (btn) {
        btn.innerHTML = `✨ Enhanced ${factor}x`;
        btn.classList.add('active');
      }
      if (tbBtn) {
        tbBtn.innerHTML = `✨ HD ${factor}x Active`;
        tbBtn.classList.add('active');
      }
    }
    renderCanvas();
    if (!auto) {
      const isScene = slot.imgUrl && (slot.imgUrl.toLowerCase().includes('.jpg') || slot.imgUrl.toLowerCase().includes('.jpeg'));
      if (isScene) {
        showToast(`✨ Anime edge refinement complete! (Tip: Click "👑 HD Art" for official 1800p card)`);
      } else {
        showToast(`✨ Anime edge refinement complete: ${factor}x crystal-clear line art!`);
      }
    }
  } catch (e) {
    console.warn('Enhancement could not complete:', e);
    if (!auto) {
      if (statusEl) statusEl.textContent = 'Enhancement Failed';
      if (btn) btn.innerHTML = '<span>✨</span> Enhance HD';
      if (tbBtn) tbBtn.innerHTML = '✨ HD Boost';
      showToast('⚠️ Enhancement could not complete');
    }
  }
}

// Load Image into Slot
function loadImageToSlot(slotNum, imageUrl) {
  return new Promise((resolve) => {
    const slot = getSlot(slotNum);
    slot.imgUrl = imageUrl;
    slot.isEnhanced = false;
    slot.enhancedForUrl = '';
    slot.enhancementFactor = 1;

    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = proxyUrl;
    img.onload = () => {
      slot.img = img;
      slot.isLoading = false;
      if (state.activeSlot === slotNum) {
        updateSidebarUI();
      }
      renderCanvas();
      resolve();
    };
    img.onerror = () => {
      console.warn('Image failed to load:', imageUrl);
      slot.isLoading = false;
      resolve();
    };
  });
}

// ---------------------------------------------------------
// History & Project Persistence Engine (.abyss Save & Open)
// ---------------------------------------------------------
const undoStack = [];
const redoStack = [];
const MAX_UNDO_STATES = 40;
let isUndoRedoActive = false;

function captureSnapshot() {
  return {
    patch: state.patch,
    centerStyle: state.centerStyle,
    rosette: JSON.parse(JSON.stringify(state.rosette || {})),
    spire: JSON.parse(JSON.stringify(state.spire || {})),
    rosterLayout: state.rosterLayout,
    activeSlot: state.activeSlot,
    showEyeGuide: !!state.showEyeGuide,
    activeElementFilter: state.activeElementFilter,
    archetypeStyle: state.archetypeStyle,
    headlineFormat: state.headlineFormat,
    selectedYTPreset: state.selectedYTPreset,
    includeTeamsInChapters: state.includeTeamsInChapters,
    starBadge: JSON.parse(JSON.stringify(state.starBadge || {})),
    watermark: JSON.parse(JSON.stringify(state.watermark || {})),
    showStygianCycleTitle: state.showStygianCycleTitle,
    stygianVersion: state.stygianVersion,
    stygianCycleTitle: state.stygianCycleTitle,
    stygianCycleTitleSize: state.stygianCycleTitleSize,
    stygianCycleTitleY: state.stygianCycleTitleY,
    overlays: JSON.parse(JSON.stringify(state.overlays || [])),
    side1: {
      character: state.side1.character,
      constellation: state.side1.constellation,
      archetype: state.side1.archetype,
      archetypeColor: state.side1.archetypeColor,
      customName: state.side1.customName,
      imgUrl: state.side1.imgUrl,
      isEnhanced: state.side1.isEnhanced,
      enhancedForUrl: state.side1.enhancedForUrl,
      enhancementFactor: state.side1.enhancementFactor,
      panX: state.side1.panX,
      panY: state.side1.panY,
      scale: state.side1.scale,
      mirror: state.side1.mirror,
      teammates: [...(state.side1.teammates || [])],
      showDock: state.side1.showDock !== false
    },
    side2: {
      character: state.side2.character,
      constellation: state.side2.constellation,
      archetype: state.side2.archetype,
      archetypeColor: state.side2.archetypeColor,
      customName: state.side2.customName,
      imgUrl: state.side2.imgUrl,
      isEnhanced: state.side2.isEnhanced,
      enhancedForUrl: state.side2.enhancedForUrl,
      enhancementFactor: state.side2.enhancementFactor,
      panX: state.side2.panX,
      panY: state.side2.panY,
      scale: state.side2.scale,
      mirror: state.side2.mirror,
      teammates: [...(state.side2.teammates || [])],
      showDock: state.side2.showDock !== false
    },
    side3: {
      character: state.side3.character,
      constellation: state.side3.constellation,
      archetype: state.side3.archetype,
      archetypeColor: state.side3.archetypeColor,
      customName: state.side3.customName,
      imgUrl: state.side3.imgUrl,
      isEnhanced: state.side3.isEnhanced,
      enhancedForUrl: state.side3.enhancedForUrl,
      enhancementFactor: state.side3.enhancementFactor,
      panX: state.side3.panX,
      panY: state.side3.panY,
      scale: state.side3.scale,
      mirror: state.side3.mirror,
      teammates: [...(state.side3.teammates || [])],
      showDock: state.side3.showDock !== false
    },
    layoutMode: state.layoutMode
  };
}

async function applySnapshot(snap) {
  if (!snap) return;

  if (snap.patch !== undefined) state.patch = snap.patch;
  if (snap.centerStyle !== undefined) state.centerStyle = snap.centerStyle;
  if (snap.rosette) state.rosette = Object.assign({}, state.rosette, snap.rosette);
  if (snap.spire) state.spire = Object.assign({}, state.spire, snap.spire);
  if (snap.rosterLayout !== undefined) state.rosterLayout = snap.rosterLayout;
  if (snap.showEyeGuide !== undefined) state.showEyeGuide = !!snap.showEyeGuide;
  if (snap.activeElementFilter !== undefined) state.activeElementFilter = snap.activeElementFilter;
  if (snap.starBadge) state.starBadge = Object.assign({}, state.starBadge, snap.starBadge);
  if (snap.watermark) state.watermark = Object.assign({}, state.watermark, snap.watermark);
  if (snap.showStygianCycleTitle !== undefined) state.showStygianCycleTitle = snap.showStygianCycleTitle;
  if (snap.stygianVersion !== undefined) state.stygianVersion = snap.stygianVersion;
  if (snap.stygianCycleTitle !== undefined) state.stygianCycleTitle = snap.stygianCycleTitle;
  if (snap.stygianCycleTitleSize !== undefined) state.stygianCycleTitleSize = snap.stygianCycleTitleSize;
  if (snap.stygianCycleTitleY !== undefined) state.stygianCycleTitleY = snap.stygianCycleTitleY;
  if (window.updateBadgesAndOverlaysUI) window.updateBadgesAndOverlaysUI();
  if (snap.overlays) state.overlays = JSON.parse(JSON.stringify(snap.overlays));
  if (window.updateTextOverlaysUI) window.updateTextOverlaysUI();
  if (snap.archetypeStyle !== undefined) state.archetypeStyle = snap.archetypeStyle;
  if (snap.headlineFormat !== undefined) state.headlineFormat = snap.headlineFormat;
  if (snap.selectedYTPreset !== undefined) state.selectedYTPreset = snap.selectedYTPreset;
  if (snap.includeTeamsInChapters !== undefined) state.includeTeamsInChapters = snap.includeTeamsInChapters;

  // Restore Side 1
  if (snap.side1) {
    const s1 = snap.side1;
    const charChanged = s1.character !== state.side1.character;
    const urlChanged = s1.imgUrl !== state.side1.imgUrl;
    state.side1.character = s1.character;
    state.side1.constellation = s1.constellation;
    state.side1.archetype = s1.archetype;
    state.side1.archetypeColor = s1.archetypeColor;
    state.side1.customName = s1.customName;
    state.side1.panX = s1.panX;
    state.side1.panY = s1.panY;
    state.side1.scale = s1.scale;
    state.side1.mirror = s1.mirror;
    state.side1.teammates = [...(s1.teammates || [])];
    state.side1.showDock = s1.showDock !== false;
    state.side1.isEnhanced = !!s1.isEnhanced;
    state.side1.enhancedForUrl = s1.enhancedForUrl || '';
    state.side1.enhancementFactor = s1.enhancementFactor || 1;

    preloadTeammateImages(state.side1);

    if (charChanged || !state.side1.gallery || state.side1.gallery.length === 0) {
      fetch(`/api/character-images/${encodeURIComponent(s1.character)}?v=4.0.1`, { cache: 'no-cache' })
        .then(r => r.ok ? r.json() : [])
        .then(imgs => {
          state.side1.gallery = imgs || [];
          if (state.activeSlot === 1) renderGalleryFilmstrip(state.side1.gallery, state.side1.imgUrl);
        }).catch(() => {});
    }

    if (urlChanged && s1.imgUrl) {
      loadImageToSlot(1, s1.imgUrl);
    }
  }

  // Restore Side 2
  if (snap.side2) {
    const s2 = snap.side2;
    const charChanged = s2.character !== state.side2.character;
    const urlChanged = s2.imgUrl !== state.side2.imgUrl;
    state.side2.character = s2.character;
    state.side2.constellation = s2.constellation;
    state.side2.archetype = s2.archetype;
    state.side2.archetypeColor = s2.archetypeColor;
    state.side2.customName = s2.customName;
    state.side2.panX = s2.panX;
    state.side2.panY = s2.panY;
    state.side2.scale = s2.scale;
    state.side2.mirror = s2.mirror;
    state.side2.teammates = [...(s2.teammates || [])];
    state.side2.showDock = s2.showDock !== false;
    state.side2.isEnhanced = !!s2.isEnhanced;
    state.side2.enhancedForUrl = s2.enhancedForUrl || '';
    state.side2.enhancementFactor = s2.enhancementFactor || 1;

    preloadTeammateImages(state.side2);

    if (charChanged || !state.side2.gallery || state.side2.gallery.length === 0) {
      fetch(`/api/character-images/${encodeURIComponent(s2.character)}?v=4.0.1`)
        .then(r => r.ok ? r.json() : [])
        .then(imgs => {
          state.side2.gallery = imgs || [];
          if (state.activeSlot === 2) renderGalleryFilmstrip(state.side2.gallery, state.side2.imgUrl);
        }).catch(() => {});
    }

    if (urlChanged && s2.imgUrl) {
      loadImageToSlot(2, s2.imgUrl);
    }
  }

  // Sync active slot and UI inputs
  if (snap.activeSlot) {
    setActiveSlot(snap.activeSlot);
  } else {
    updateSidebarUI();
  }

  // Update inputs
  const patchInput = document.getElementById('patchInput');
  const mobilePatchInput = document.getElementById('mobilePatchInput');
  if (patchInput) patchInput.value = state.patch;
  if (mobilePatchInput) mobilePatchInput.value = state.patch;

  const guideBtn = document.getElementById('tbGuide');
  if (guideBtn) guideBtn.classList.toggle('active-guide', !!state.showEyeGuide);

  if (window.updateRosetteWidgetUI) window.updateRosetteWidgetUI();
  updateZoomUI();
  renderCanvas();
}

function pushUndoState() {
  if (isUndoRedoActive) return;
  const snap = captureSnapshot();
  const serialized = JSON.stringify(snap);
  if (undoStack.length > 0) {
    const last = JSON.stringify(undoStack[undoStack.length - 1]);
    if (last === serialized) return; // Ignore no-op duplicates
  }
  undoStack.push(snap);
  if (undoStack.length > MAX_UNDO_STATES) {
    undoStack.shift();
  }
  redoStack.length = 0; // Clear redo on new action
  updateUndoRedoButtons();
}

async function performUndo() {
  if (undoStack.length <= 1) return;
  isUndoRedoActive = true;
  const current = undoStack.pop();
  redoStack.push(current);
  const previous = undoStack[undoStack.length - 1];
  await applySnapshot(previous);
  isUndoRedoActive = false;
  updateUndoRedoButtons();
  showToast('↩ Undone');
}

async function performRedo() {
  if (redoStack.length === 0) return;
  isUndoRedoActive = true;
  const next = redoStack.pop();
  undoStack.push(next);
  await applySnapshot(next);
  isUndoRedoActive = false;
  updateUndoRedoButtons();
  showToast('↪ Redone');
}

function updateUndoRedoButtons() {
  const btnUndo = document.getElementById('tbUndo');
  const btnRedo = document.getElementById('tbRedo');
  if (btnUndo) {
    btnUndo.disabled = undoStack.length <= 1;
    btnUndo.style.opacity = undoStack.length <= 1 ? '0.45' : '1';
    btnUndo.style.cursor = undoStack.length <= 1 ? 'not-allowed' : 'pointer';
  }
  if (btnRedo) {
    btnRedo.disabled = redoStack.length === 0;
    btnRedo.style.opacity = redoStack.length === 0 ? '0.45' : '1';
    btnRedo.style.cursor = redoStack.length === 0 ? 'not-allowed' : 'pointer';
  }
}

function saveProjectFile() {
  const projectName = `${state.side1.character}_${state.side2.character}_Abyss_Floor_${state.spire?.floor || 12}_v${(state.patch || '7.0').replace('.', '_')}`;
  const project = {
    $schema: "https://genshin-abyss-studio/schema/v1.json",
    version: 1,
    project_name: projectName,
    patch: state.patch || "7.0",
    floor: parseInt(state.spire?.floor || "12", 10),
    created_at: Date.now() / 1000,
    side1: {
      character: state.side1.character,
      element: (state.charactersCatalog[state.side1.character]?.vision) || "Pyro",
      img_url: state.side1.imgUrl || "",
      scale: state.side1.scale,
      offset_x: state.side1.panX,
      offset_y: state.side1.panY,
      mirrored: !!state.side1.mirror,
      archetype: state.side1.archetype,
      constellation: state.side1.constellation,
      teammates: state.side1.teammates || []
    },
    side2: {
      character: state.side2.character,
      element: (state.charactersCatalog[state.side2.character]?.vision) || "Anemo",
      img_url: state.side2.imgUrl || "",
      scale: state.side2.scale,
      offset_x: state.side2.panX,
      offset_y: state.side2.panY,
      mirrored: !!state.side2.mirror,
      archetype: state.side2.archetype,
      constellation: state.side2.constellation,
      teammates: state.side2.teammates || []
    },
    thumbnail_extra: {
      centerStyle: state.centerStyle,
      rosette: state.rosette,
      spire: state.spire,
      rosterLayout: state.rosterLayout,
      headlineFormat: state.headlineFormat,
      archetypeStyle: state.archetypeStyle,
      showEyeGuide: state.showEyeGuide,
      side1_showDock: state.side1.showDock,
      side2_showDock: state.side2.showDock,
      side1_customName: state.side1.customName,
      side2_customName: state.side2.customName,
      side1_archetypeColor: state.side1.archetypeColor,
      side2_archetypeColor: state.side2.archetypeColor,
      starBadge: state.starBadge,
      watermark: state.watermark,
      overlays: state.overlays || []
    },
    segments: state.syncedSegments || [],
    music_suite: [],
    youtube_metadata: {
      selectedYTPreset: state.selectedYTPreset,
      includeTeamsInChapters: state.includeTeamsInChapters
    }
  };

  // Asynchronously save to local server storage
  fetch('/api/project/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project)
  }).catch(() => {});

  // Direct client file download (.abyss)
  const jsonBlob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const downloadUrl = URL.createObjectURL(jsonBlob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `${projectName}.abyss`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
  showToast(`💾 Saved project: ${projectName}.abyss`);
}

function openProjectFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data || (!data.side1 && !data.side2)) {
        showToast('⚠️ Invalid .abyss project file format');
        return;
      }

      // Convert project schema to snapshot format
      const extra = data.thumbnail_extra || {};
      const snap = {
        patch: data.patch || state.patch,
        centerStyle: extra.centerStyle || state.centerStyle,
        rosette: extra.rosette || state.rosette,
        spire: extra.spire || { floor: String(data.floor || '12'), hookText: 'NEW ENEMY !!', showHook: true },
        rosterLayout: extra.rosterLayout || state.rosterLayout,
        activeSlot: 1,
        showEyeGuide: !!extra.showEyeGuide,
        activeElementFilter: 'all',
        archetypeStyle: extra.archetypeStyle || state.archetypeStyle,
        headlineFormat: extra.headlineFormat || state.headlineFormat,
        selectedYTPreset: data.youtube_metadata?.selectedYTPreset || state.selectedYTPreset,
        starBadge: extra.starBadge || state.starBadge,
        watermark: extra.watermark || state.watermark,
        overlays: extra.overlays || state.overlays || [],
        includeTeamsInChapters: data.youtube_metadata?.includeTeamsInChapters ?? state.includeTeamsInChapters,
        side1: {
          character: data.side1?.character || state.side1.character,
          constellation: data.side1?.constellation || 'C0',
          archetype: data.side1?.archetype || 'OVERLOAD',
          archetypeColor: extra.side1_archetypeColor || 'auto',
          customName: extra.side1_customName || '',
          imgUrl: data.side1?.img_url || '',
          isEnhanced: false,
          enhancedForUrl: '',
          enhancementFactor: 1,
          panX: data.side1?.offset_x ?? 0,
          panY: data.side1?.offset_y ?? -40,
          scale: data.side1?.scale ?? 1.05,
          mirror: !!data.side1?.mirrored,
          teammates: data.side1?.teammates || [data.side1?.character || 'Mavuika'],
          showDock: extra.side1_showDock !== false
        },
        side2: {
          character: data.side2?.character || state.side2.character,
          constellation: data.side2?.constellation || 'C0',
          archetype: data.side2?.archetype || 'RAINBOW HYPER',
          archetypeColor: extra.side2_archetypeColor || 'auto',
          customName: extra.side2_customName || '',
          imgUrl: data.side2?.img_url || '',
          isEnhanced: false,
          enhancedForUrl: '',
          enhancementFactor: 1,
          panX: data.side2?.offset_x ?? 0,
          panY: data.side2?.offset_y ?? -40,
          scale: data.side2?.scale ?? 1.05,
          mirror: data.side2?.mirrored !== undefined ? !!data.side2.mirrored : true,
          teammates: data.side2?.teammates || [data.side2?.character || 'Chasca'],
          showDock: extra.side2_showDock !== false
        }
      };

      if (data.segments) {
        state.syncedSegments = data.segments;
      }

      pushUndoState();
      await applySnapshot(snap);
      pushUndoState();
      showToast(`📂 Opened: ${data.project_name || file.name}`);
    } catch (err) {
      console.error('Failed to open project file:', err);
      showToast('⚠️ Could not parse project file');
    }
  };
  reader.readAsText(file);
}

// Setup Canvas Touch & Mouse Pointer Events
// ==========================================================================
// Canvas Drag & Pan Interaction (Delegated to web/modules/canvas_interaction.js)
// ==========================================================================
function setupCanvasInteraction() {
  if (typeof window.setupCanvasInteractionModule === 'function') {
    window.setupCanvasInteractionModule();
  }
  const findOverlayAtCoords = (cx, cy) => window.textOverlayManager ? window.textOverlayManager.findOverlayAtCoords(state.overlays, cx, cy) : null;
}
function setActiveSlot(slotNum) {
  if (slotNum < 1 || slotNum > 3) return;
  state.activeSlot = slotNum;

  const tab1 = document.getElementById('tabSide1');
  const tab2 = document.getElementById('tabSide2');
  const tab3 = document.getElementById('tabSide3');
  const pill = document.getElementById('activeSlotPill');

  if (state.layoutMode === 'stygian') {
    if (tab1) tab1.className = 'panel-tab' + (slotNum === 1 ? ' active-left' : '');
    if (tab2) tab2.className = 'panel-tab' + (slotNum === 2 ? ' active-mid' : '');
    if (tab3) tab3.className = 'panel-tab' + (slotNum === 3 ? ' active-right' : '');
    if (typeof updateStygianBossUI === 'function') updateStygianBossUI();
  } else {
    if (tab1) tab1.className = 'panel-tab' + (slotNum === 1 ? ' active-left' : '');
    if (tab2) tab2.className = 'panel-tab' + (slotNum === 2 ? ' active-right' : '');
    if (tab3) tab3.className = 'panel-tab';
  }

  if (pill) {
    if (state.layoutMode === 'stygian') {
      pill.textContent = slotNum === 1 ? '👈 Selected Boss 1 (Left Column) — Drag to pan, scroll to zoom (Hot-key: 1)' :
                         slotNum === 2 ? '👆 Selected Boss 2 (Mid Column) — Drag to pan, scroll to zoom (Hot-key: 2)' :
                         '👉 Selected Boss 3 (Right Column) — Drag to pan, scroll to zoom (Hot-key: 3)';
    } else {
      pill.textContent = slotNum === 1 ? '👈 Selected Side 1 (Left) — Drag with finger/mouse, pinch or scroll to zoom (Hot-key: 1)' :
                                         '👉 Selected Side 2 (Right) — Drag with finger/mouse, pinch or scroll to zoom (Hot-key: 2)';
    }
  }

  updateSidebarUI();
  updateTeamRosterUI();
  updateZoomUI();
  renderCanvas();
}

// Update Zoom UI Display
function updateZoomUI() {
  const slot = getActiveSlot();
  const zoomText = document.getElementById('zoomLevelText');
  if (zoomText) {
    zoomText.textContent = `${Math.round(slot.scale * 100)}%`;
  }

  // Update HD clarity prompt when zoom changes
  const statusEl = document.getElementById('hdClarityStatus');
  if (statusEl && !slot.isEnhanced) {
    if (slot.scale >= 1.25) {
      statusEl.textContent = `Zoomed ${Math.round(slot.scale * 100)}% (HD Boost Recommended)`;
      statusEl.style.color = '#fbbf24';
    } else {
      statusEl.textContent = `Standard Resolution (${Math.round(slot.scale * 100)}%)`;
      statusEl.style.color = 'var(--text-dim)';
    }
  }
}

// Update Sidebar Inputs & Filmstrip
function updateSidebarUI() {
  const slot = getActiveSlot();
  const charInfo = state.charactersCatalog[slot.character] || {};

  document.getElementById('charNameDisplay').textContent = slot.character;
  document.getElementById('charElementDisplay').textContent = `${charInfo.vision || 'Genshin Impact'} • Official`;
  const aImg = document.getElementById('charAvatarImg');
  if (aImg) {
    aImg.src = `/api/avatar/${encodeURIComponent(slot.character)}?v=4.0.1`;
    aImg.onerror = () => {
      if (charInfo.icon && !aImg._triedProxy) {
        aImg._triedProxy = true;
        aImg.src = `/api/proxy-image?url=${encodeURIComponent(charInfo.icon)}&thumb=true`;
      }
    };
  }

  // Update Constellation Segmented Pills
  document.getElementById('constInput').value = slot.constellation;
  document.querySelectorAll('.const-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === slot.constellation);
  });

  document.getElementById('archetypeInput').value = slot.archetype;
  document.getElementById('customNameInput').value = slot.customName;

  // Sync Archetype Accent Color Swatches
  const activeColor = slot.archetypeColor || 'auto';
  const colorBar = document.getElementById('archetypeColorBar');
  if (colorBar) {
    colorBar.querySelectorAll('.color-chip').forEach(chip => {
      if (chip.dataset.color) {
        chip.classList.toggle('active', chip.dataset.color.toLowerCase() === activeColor.toLowerCase());
      }
    });
    const customPicker = document.getElementById('archetypeCustomColor');
    if (customPicker && activeColor !== 'auto') {
      customPicker.value = activeColor;
    }
  }

  // Sync Headline Format Toggle Buttons
  const formatToggles = document.getElementById('headlineFormatToggles');
  if (formatToggles) {
    formatToggles.querySelectorAll('.btn-style-toggle').forEach(b => {
      b.classList.toggle('active', b.dataset.format === (state.headlineFormat || '1line'));
    });
  }

  // Sync HD Clarity Status & Buttons
  const statusEl = document.getElementById('hdClarityStatus');
  const btnEnhance = document.getElementById('btnSlotEnhance');
  const tbEnhance = document.getElementById('tbEnhance');
  if (statusEl) {
    if (slot.isEnhanced) {
      statusEl.textContent = `✨ Super-Sampled (${slot.enhancementFactor}x Crisp)`;
      statusEl.style.color = '#38bdf8';
    } else if (slot.scale >= 1.25) {
      statusEl.textContent = `Zoomed ${Math.round(slot.scale * 100)}% (HD Boost Recommended)`;
      statusEl.style.color = '#fbbf24';
    } else {
      statusEl.textContent = `Standard Resolution (${Math.round(slot.scale * 100)}%)`;
      statusEl.style.color = 'var(--text-dim)';
    }
  }
  if (btnEnhance) {
    btnEnhance.innerHTML = slot.isEnhanced ? `✨ Enhanced ${slot.enhancementFactor}x` : '<span>✨</span> Enhance HD';
    btnEnhance.classList.toggle('active', !!slot.isEnhanced);
  }
  if (tbEnhance) {
    tbEnhance.innerHTML = slot.isEnhanced ? `✨ HD ${slot.enhancementFactor}x Active` : '✨ HD Boost';
    tbEnhance.classList.toggle('active', !!slot.isEnhanced);
  }

  // Render Meta Archetype Quick-Pills
  renderArchetypePills(slot.character);

  // Update Team Roster Dock UI
  updateTeamRosterUI();

  // Render Gallery Filmstrip
  renderGalleryFilmstrip(slot.gallery, slot.imgUrl);
  updateUnitCacheStatus(slot.character);

  // Synchronize YouTube Studio Metadata
  generateYouTubeMetadata();
}

// Update Team Roster Dock Controls in Sidebar
function updateTeamRosterUI() {
  const slot = getActiveSlot();
  const chk = document.getElementById('chkShowTeamDock');
  if (chk) chk.checked = slot.showDock !== false;

  if (!slot.teammates) slot.teammates = [slot.character, '', '', ''];
  slot.teammates[0] = slot.character;

  for (let i = 0; i < 4; i++) {
    const card = document.querySelector(`.teammate-slot-card[data-slot="${i}"]`);
    const img = document.getElementById(`teamSlotImg${i}`);
    const nameEl = document.getElementById(`teamSlotName${i}`);
    const tName = slot.teammates[i] || '';
    const info = state.charactersCatalog[tName] || {};
    const placeholder = card ? card.querySelector('.teammate-slot-placeholder') : null;

    if (card) {
      card.dataset.rarity = info.rarity || (i === 0 ? 5 : '');
    }
    if (nameEl) {
      nameEl.textContent = tName || (i === 0 ? slot.character : `Slot ${i + 1}`);
    }
    if (img) {
      if (tName) {
        img.src = `/api/avatar/${encodeURIComponent(tName)}?v=4.0.1`;
        img.onerror = () => {
          if (info.icon && !img._triedProxy) {
            img._triedProxy = true;
            img.src = `/api/proxy-image?url=${encodeURIComponent(info.icon)}&thumb=true`;
          }
        };
        img.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
      } else {
        img.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
      }
    }
  }
}

// Render Meta Team Archetype Quick-Pills
function renderArchetypePills(charName) {
  const container = document.getElementById('archetypePills');
  if (!container) return;
  container.innerHTML = '';

  const slot = getActiveSlot();
  const list = getArchetypesForCharacter(charName);

  list.forEach(arch => {
    const pill = document.createElement('button');
    pill.className = 'archetype-pill' + (slot.archetype === arch ? ' active' : '');
    pill.textContent = arch;
    pill.addEventListener('click', () => {
      slot.archetype = arch;
      document.getElementById('archetypeInput').value = arch;
      container.querySelectorAll('.archetype-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderCanvas();
    });
    container.appendChild(pill);
  });
}
// ==========================================================================
// Character Picker Modal & Gallery Filmstrip (Delegated to web/modules/character_picker_modal.js)
// ==========================================================================
// Full implementation is modularized into /static/modules/character_picker_modal.js
// Setup Keyboard Shortcuts for Creator Ergonomics
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Ignore if typing in input fields
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    // Check Ctrl / Cmd Key combos
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) {
          performRedo();
        } else {
          performUndo();
        }
        return;
      }
      if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        performRedo();
        return;
      }
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        saveProjectFile();
        return;
      }
      if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        const fileInput = document.getElementById('projectFileInput');
        if (fileInput) fileInput.click();
        return;
      }
    }

    const slot = getActiveSlot();
    const nudge = e.shiftKey ? 25 : 5;

    switch (e.key) {
      case '1':
        setActiveSlot(1);
        break;
      case '2':
        setActiveSlot(2);
        break;
      case '3':
        if (state.layoutMode === 'stygian') setActiveSlot(3);
        break;
      case 'f':
      case 'F':
        slot.mirror = !slot.mirror;
        renderCanvas();
        pushUndoState();
        break;
      case 's':
      case 'S':
        document.getElementById('btnSwapSides').click();
        break;
      case 'g':
      case 'G':
        document.getElementById('tbGuide').click();
        break;
      case 'e':
      case 'E':
        enhanceSlotHD(state.activeSlot);
        break;
      case 'z':
        slot.scale = Math.min(slot.scale + 0.05, 4.5);
        updateZoomUI();
        renderCanvas();
        pushUndoState();
        break;
      case 'Z':
        slot.scale = Math.max(slot.scale - 0.05, 0.25);
        updateZoomUI();
        renderCanvas();
        pushUndoState();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        slot.panX -= nudge;
        renderCanvas();
        pushUndoState();
        break;
      case 'ArrowRight':
        e.preventDefault();
        slot.panX += nudge;
        renderCanvas();
        pushUndoState();
        break;
      case 'ArrowUp':
        e.preventDefault();
        slot.panY -= nudge;
        renderCanvas();
        pushUndoState();
        break;
      case 'ArrowDown':
        e.preventDefault();
        slot.panY += nudge;
        renderCanvas();
        pushUndoState();
        break;
    }
  });
}

// Setup DOM Event Listeners
function setupDOMListeners() {
  setupBadgesAndOverlaysUI();
  if (typeof window.setupSidebarControlsModule === 'function') {
    window.setupSidebarControlsModule();
  }
  // Setup Team Roster & Screenshot Cropper
  setupTeamRosterListeners();
  setupLineupScreenshotImporter();
  setupYouTubeMetadataListeners();
  setupSmartBGMAuditionListeners();
  setupDesktopNavSwitcher();
  setupVideoArrangerListeners();
  setupArrangerModeListeners();
}

// ==========================================================================
// Desktop Mode Navigation Switcher & Video Arranger Controllers
// (Delegated to web/modules/video_arranger.js)
// ==========================================================================
// Full implementation is modularized into /static/modules/video_arranger.js
// ==========================================================================
// YouTube Metadata & Chapter Sync (Delegated to web/modules/youtube_metadata.js)
// ==========================================================================
function setupYouTubeMetadataListeners() {
  if (typeof window.setupYouTubeMetadataListenersModule === 'function') {
    window.setupYouTubeMetadataListenersModule();
  }
  const btnUnlockDesc = document.getElementById('btnUnlockDesc');
  if (btnUnlockDesc && !state.descriptionLocked) {
    // Contract stub for descriptionLocked
  }
}
// ==========================================================================
// Smart BGM Matcher & Video Audition Player (Delegated to web/modules/bgm_matcher.js)
// ==========================================================================
// Full implementation is modularized into /static/modules/bgm_matcher.js


// Setup Team Roster Controls
function setupTeamRosterListeners() {
  for (let i = 0; i <= 3; i++) {
    const card = document.querySelector(`.teammate-slot-card[data-slot="${i}"]`);
    if (card) {
      card.addEventListener('click', () => {
        openCharacterPickerModal({ slot: state.activeSlot, teammateIdx: i });
      });
    }
  }

  const autoBtn = document.getElementById('btnAutoSynergy');
  if (autoBtn) {
    autoBtn.addEventListener('click', () => {
      const slot = getActiveSlot();
      const meta = META_TEAMS[slot.character];
      if (meta && meta.length === 4) {
        slot.teammates = [...meta];
      } else {
        slot.teammates = [slot.character, 'Furina', 'Kazuha', 'Bennett'];
      }
      preloadTeammateImages(slot);
      updateTeamRosterUI();
      renderCanvas();
      showToast(`⚡ Meta team for ${slot.character} auto-filled!`);
    });
  }

  const chk = document.getElementById('chkShowTeamDock');
  if (chk) {
    chk.addEventListener('change', (e) => {
      const slot = getActiveSlot();
      slot.showDock = e.target.checked;
      renderCanvas();
    });
  }
}

// ==========================================================================
// In-Game Lineup Screenshot Importer & Cropper (Delegated to web/modules/lineup_importer.js)
// ==========================================================================
// Full implementation is modularized into /static/modules/lineup_importer.js
async function copyThumbnailToClipboard() {
  const btn = document.getElementById('btnCopyComposite') || document.getElementById('btnCopyClipboard');
  const origText = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = '⏳ Copying...';

  // 1. Temporarily deselect selection borders & guides
  const prevActive = state.activeSlot;
  const prevGuide = state.showEyeGuide;
  state.activeSlot = 0;
  state.showEyeGuide = false;
  renderCanvas();

  canvas.toBlob(async (blob) => {
    // Restore state
    state.activeSlot = prevActive;
    state.showEyeGuide = prevGuide;
    renderCanvas();
    if (btn) btn.innerHTML = origText;

    if (!blob) {
      showToast('❌ Could not generate image');
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showToast('📋 1080p Image copied to clipboard!');
      } else {
        showToast('⚠️ Clipboard image write not supported in this browser');
      }
    } catch (err) {
      console.warn('Clipboard write error:', err);
      showToast('⚠️ Clipboard permission required');
    }
  }, 'image/png', 0.95);
}

// 60FPS Client-Side Canvas Rendering
function renderCanvas() {
  ctx.clearRect(0, 0, 1920, 1080);

  if (state.layoutMode === 'stygian') {
    // 1. Render Left Section (Side 1 / Boss 1)
    renderCharacterSlot(state.side1, 0, 0, 640, 1080);

    // 2. Render Middle Section (Side 2 / Boss 2)
    renderCharacterSlot(state.side2, 640, 0, 640, 1080);

    // 3. Render Right Section (Side 3 / Boss 3)
    renderCharacterSlot(state.side3, 1280, 0, 640, 1080);

    // 4. Render Active Slot Selection Highlight
    renderSelectionHighlight();

    // 5. Eye Guide Line & Vignette
    renderEyeGuide();
    renderVignette();

    // 6. Dual Dividers at x=640 and x=1280 (Spire is completely hidden!)
    renderStygianDividers();

    // 6b. Render Stygian Boss Act Header Badges (BOSS 1, BOSS 2, BOSS 3)
    renderStygianBossBadges();
    renderStygianCycleTitle();

    // 7. Render Headlines
    renderHeadlineTypography();

    // 8. Render 3 Team Docks centered at x=320, 960, 1600
    renderTeamRosterDock(state.side1, true, 320, 518);
    renderTeamRosterDock(state.side2, false, 960, 518);
    renderTeamRosterDock(state.side3, false, 1600, 518);

    if (state.watermark && state.watermark.enabled) renderWatermark();
    if (state.showSafeZone) renderYouTubeSafeZone();
    return;
  }

  // Thumbnail studio is 100% focused on dual character split-screen

  // 1. Render Left Half (Side 1)
  renderCharacterSlot(state.side1, 0, 0, 960, 1080);

  // 2. Render Right Half (Side 2)
  renderCharacterSlot(state.side2, 960, 0, 960, 1080);

  // 3. Render Active Slot Glowing Framing Border
  renderSelectionHighlight();

  // 4. Render Eye Guide Line (if toggled on)
  renderEyeGuide();

  // 5. Render Bottom Dark Vignette
  renderVignette();

  // 6. Render Center Divider Line & Loop Pins
  renderDivider();

  // 7. Render Centered Element (Abyss Spire, Patch Rosette, or Divider Only)
  if (state.centerStyle === 'spire') {
    renderAbyssSpire();
  } else if (state.centerStyle === 'rosette') {
    renderPatchRosette();
  }
  // 9. Render Bold Anton Headline Typography
  renderHeadlineTypography();

  // 10. Render Floor 12 Team Roster (TGozaru Vertical Stack vs Classic Bottom Dock)
  if (state.rosterLayout === 'vertical') {
    renderVerticalEdgeRoster(state.side1, true);
    renderVerticalEdgeRoster(state.side2, false);
  } else {
    renderTeamRosterDock(state.side1, true);
    renderTeamRosterDock(state.side2, false);
  }

  // 11. Sync YouTube Studio Title & Description
  generateYouTubeMetadata();

  // 12. Render 36★ Clear Badge and Channel Watermark Overlays
  renderStarBadge();
  renderWatermark();

  // 13. Render User Text Overlays & Tags
  if (window.textOverlayManager && window.textOverlayManager.renderTextOverlays) {
    window.textOverlayManager.renderTextOverlays(ctx, state, pointerState.activeOverlayId);
  }

  if (state.showSafeZone) {
    renderYouTubeSafeZone();
  }
}

// Draw Character Image Clipped to Half-Frame
function renderCharacterSlot(slot, x, y, width, height) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  // High-fidelity bicubic smoothing for canvas texture rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (slot.img && slot.img.complete && slot.img.naturalWidth > 0) {
    const imgW = slot.img.naturalWidth;
    const imgH = slot.img.naturalHeight;

    // Minimum scale required to cover 100% of half frame with no black bars
    const coverScale = Math.max(width / imgW, height / imgH);
    const totalScale = coverScale * slot.scale;

    const drawW = imgW * totalScale;
    const drawH = imgH * totalScale;

    // Center of this half frame + user pan offsets
    const centerX = x + width / 2 + slot.panX;
    const centerY = y + height / 2 + slot.panY;

    ctx.save();
    ctx.translate(centerX, centerY);
    if (slot.mirror) {
      ctx.scale(-1, 1);
    }
    ctx.drawImage(slot.img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  } else {
    // Fallback background while loading
    ctx.fillStyle = '#1e2436';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = '#8c96ac';
    ctx.font = '600 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Loading ${slot.character}...`, x + width / 2, y + height / 2);
  }

  ctx.restore();
}

// Active Slot Highlight
function renderSelectionHighlight() {
  if (state.layoutMode === 'stygian') {
    if (state.activeSlot !== 1 && state.activeSlot !== 2 && state.activeSlot !== 3) return;
    const x = (state.activeSlot - 1) * 640;
    const colors = ['#00e5ff', '#c084fc', '#fb7185'];
    const color = colors[state.activeSlot - 1] || '#00e5ff';

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 2, 2, 636, 1076);
    ctx.restore();
    return;
  }
  // Only render highlight when slot 1 or slot 2 is selected.
  // During export (state.activeSlot === 0), do NOT draw any highlight!
  if (state.activeSlot !== 1 && state.activeSlot !== 2) return;

  const isLeft = state.activeSlot === 1;
  const x = isLeft ? 0 : 960;
  const color = isLeft ? '#00e5ff' : '#ffb300';

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.strokeRect(x + 2, 2, 956, 1076);

  // Corner guide dots
  const corners = [
    [x + 12, 12],
    [x + 948, 12],
    [x + 12, 1068],
    [x + 948, 1068]
  ];
  ctx.fillStyle = color;
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

// ==========================================================================
// Canvas Decorations & Procedural Graphics (Delegated to web/modules/canvas_decorations.js)
// ==========================================================================
// Full implementation is modularized into /static/modules/canvas_decorations.js
// Export / Download Thumbnail or Assets (Concurrency-Safe with Re-entrancy Lock)
async function exportThumbnail() {
  if (state.isExporting) {
    console.warn('[Export] Export already in progress. Ignoring duplicate trigger.');
    return;
  }
  state.isExporting = true;

  const btn = document.getElementById('btnExport');
  const originalText = btn ? btn.innerHTML : 'Export';
  const preset = document.getElementById('selExportPreset')?.value || 'png_1080p';

  if (btn) {
    btn.innerHTML = '<span>⏳</span> Exporting...';
    btn.disabled = true;
  }

  try {
    // Super-sample zoomed slots ONLY if user explicitly enabled HD Upscale (default OFF for pristine native art)
    if (state.exportEnhance && preset !== 'roster_strip') {
      const enhanceTasks = [];
      if (state.side1.scale >= 1.25 && !state.side1.isEnhanced && state.side1.imgUrl) {
        enhanceTasks.push(enhanceSlotHD(1, true));
      }
      if (state.side2.scale >= 1.25 && !state.side2.isEnhanced && state.side2.imgUrl) {
        enhanceTasks.push(enhanceSlotHD(2, true));
      }
      if (enhanceTasks.length > 0) {
        if (btn) btn.innerHTML = '<span>✨</span> HD Super-Sampling...';
        try {
          await Promise.all(enhanceTasks);
        } catch (err) {
          console.warn('Auto-enhancement note:', err);
        }
      }
    }

    // Preset A: Transparent Roster Overlay Strip (PNG)
    if (preset === 'roster_strip') {
      const prevActive = state.activeSlot;
      const prevGuide = state.showEyeGuide;
      const prevImg1 = state.side1.img;
      const prevImg2 = state.side2.img;

      state.activeSlot = 0;
      state.showEyeGuide = false;
      state.side1.img = null;
      state.side2.img = null;

      ctx.clearRect(0, 0, 1920, 1080);
      if (state.rosterLayout === 'vertical') {
        renderVerticalEdgeRoster(state.side1, true);
        renderVerticalEdgeRoster(state.side2, false);
      } else {
        renderTeamRosterDock(state.side1, true);
        renderTeamRosterDock(state.side2, false);
      }

      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      state.activeSlot = prevActive;
      state.showEyeGuide = prevGuide;
      state.side1.img = prevImg1;
      state.side2.img = prevImg2;
      renderCanvas();

      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `abyss_roster_overlay_${state.side1.character}_${state.side2.character}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('✨ Exported Transparent Roster Overlay PNG');
      }
      return;
    }

    // 1. Render clean canvas without active selection highlight or guide lines
    const prevActive = state.activeSlot;
    const prevGuide = state.showEyeGuide;
    state.activeSlot = 0; // Deselect highlight temporarily
    state.showEyeGuide = false; // Never export guide line
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    renderCanvas();

    // Preset B: Web-Optimized JPEG (<2MB YouTube Strict Cap)
    if (preset === 'jpeg_yt') {
      const qualities = [0.92, 0.88, 0.82, 0.76, 0.70];
      let selectedBlob = null;
      for (const q of qualities) {
        selectedBlob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', q));
        if (selectedBlob && selectedBlob.size < 2000000) {
          break;
        }
      }

      state.activeSlot = prevActive;
      state.showEyeGuide = prevGuide;
      renderCanvas();

      if (selectedBlob) {
        const url = URL.createObjectURL(selectedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `abyss_thumbnail_${state.side1.character}_vs_${state.side2.character}_yt.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        const sizeMb = (selectedBlob.size / (1024 * 1024)).toFixed(2);
        showToast(`✨ Exported YouTube JPEG (${sizeMb} MB < 2MB limit)`);
      }
      return;
    }

    // Preset C: Default Lossless 1080p PNG
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png', 0.95));

    // Restore selection highlight and guide line
    state.activeSlot = prevActive;
    state.showEyeGuide = prevGuide;
    renderCanvas();

    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `abyss_thumbnail_${state.side1.character}_vs_${state.side2.character}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('✨ Exported Lossless 1080p PNG');
    }

    // Persist exact canvas render to server disk for pipeline workflows
    try {
      const formData = new FormData();
      formData.append('image', blob, 'latest_abyss_thumbnail.png');
      await fetch('/api/export-canvas', { method: 'POST', body: formData });
    } catch (err) {
      console.warn('Server export sync note:', err);
    }
  } catch (err) {
    console.error('[Export Error]', err);
    showToast('❌ Export failed. Check console for details.');
  } finally {
    state.isExporting = false;
    if (btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
}
window.exportThumbnail = exportThumbnail;

// Start studio on page load
window.addEventListener('DOMContentLoaded', initStudio);

// ==========================================================================
// Spotlight Thumbnail Studio (Delegated to web/modules/spotlight_studio.js)
// ==========================================================================
// Full implementation is modularized into /static/modules/spotlight_studio.js

// ==========================================================================
// Showcase / Inverse Dual-Run Video Arranger (Delegated to web/modules/showcase_arranger.js)
// ==========================================================================
// Full implementation is modularized into /static/modules/showcase_arranger.js

// Render 36★ / Clear Achievement Badge Overlay
function renderStarBadge() {
  if (!state.starBadge || !state.starBadge.enabled) return;

  const text = (state.starBadge.text || '36★ CLEAR').trim();
  if (!text) return;

  ctx.save();

  // Position calculation (1920x1080 canvas coordinates)
  let bx = 120;
  let by = 90;
  const pos = state.starBadge.position || 'top-left';

  if (pos === 'top-left') {
    bx = 120;
    by = 90;
  } else if (pos === 'top-right') {
    bx = 1800;
    by = 90;
  } else if (pos === 'spire') {
    bx = 960;
    by = 720;
  } else if (pos === 'bottom-center') {
    bx = 960;
    by = 920;
  }

  // Typography & Metrics
  ctx.font = "900 34px 'Inter', 'Montserrat', sans-serif";
  const metrics = ctx.measureText(text);
  const textW = metrics.width;
  const starIconW = 34;
  const paddingX = 22;
  const paddingY = 12;
  const totalW = textW + starIconW + paddingX * 2;
  const totalH = 54;
  const radius = 27;

  let startX = bx - totalW / 2;
  if (pos === 'top-left') startX = 60;
  if (pos === 'top-right') startX = 1860 - totalW;

  const startY = by - totalH / 2;

  // Drop shadow for the badge
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 6;

  // Background Fill
  if (state.starBadge.style === 'dark_gold') {
    ctx.fillStyle = 'rgba(15, 17, 26, 0.92)';
  } else {
    const bgGrad = ctx.createLinearGradient(startX, startY, startX, startY + totalH);
    bgGrad.addColorStop(0, 'rgba(26, 22, 14, 0.94)');
    bgGrad.addColorStop(1, 'rgba(12, 10, 8, 0.96)');
    ctx.fillStyle = bgGrad;
  }

  ctx.beginPath();
  ctx.roundRect(startX, startY, totalW, totalH, [radius]);
  ctx.fill();

  // Outer Glowing Border
  ctx.shadowBlur = 10;
  ctx.shadowColor = 'rgba(255, 215, 0, 0.45)';
  const borderGrad = ctx.createLinearGradient(startX, startY, startX + totalW, startY + totalH);
  borderGrad.addColorStop(0, '#FFE082');
  borderGrad.addColorStop(0.5, '#FFB300');
  borderGrad.addColorStop(1, '#FF8F00');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Reset shadow for text and icon
  ctx.shadowBlur = 6;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowOffsetY = 2;

  // Draw Gold Star Icon ★
  const iconX = startX + paddingX + 14;
  const iconY = startY + totalH / 2 + 1;
  ctx.font = "900 30px 'Segoe UI Emoji', sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFD700';
  ctx.fillText('★', iconX, iconY);

  // Draw Text
  const txtX = iconX + 22;
  ctx.font = "900 30px 'Inter', 'Montserrat', sans-serif";
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(text, txtX, iconY);

  ctx.restore();
}

// Render Anti-Theft Channel Watermark / Social Tag
function renderWatermark() {
  if (!state.watermark || !state.watermark.enabled) return;

  const text = (state.watermark.text || '').trim();
  if (!text) return;

  ctx.save();

  const pos = state.watermark.position || 'bottom-left';
  const fontSize = state.watermark.fontSize || 26;
  const opacity = state.watermark.opacity !== undefined ? state.watermark.opacity : 0.75;

  ctx.font = `700 ${fontSize}px 'Inter', sans-serif`;
  ctx.globalAlpha = Math.max(0.1, Math.min(1.0, opacity));

  // Determine coordinates with safe zone spacing
  let wx = 60;
  let wy = 1030;
  let align = 'left';

  if (pos === 'bottom-left') {
    wx = 50;
    // Avoid dock if bottom dock is present
    wy = state.rosterLayout === 'vertical' ? 1040 : 860;
    align = 'left';
  } else if (pos === 'bottom-right') {
    // Avoid YouTube duration timestamp overlay
    wx = 1680;
    wy = 960;
    align = 'right';
  } else if (pos === 'top-left') {
    wx = 50;
    wy = 60;
    align = 'left';
  } else if (pos === 'top-right') {
    wx = 1870;
    wy = 60;
    align = 'right';
  }

  ctx.textAlign = align;
  ctx.textBaseline = 'middle';

  // Crisp black outline & shadow for readability against any background
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.strokeText(text, wx, wy);

  ctx.fillStyle = state.watermark.color || '#FFFFFF';
  ctx.fillText(text, wx, wy);

  ctx.restore();
}

// Setup and Synchronize Badges & Overlays Sidebar Controls
function updateTextOverlaysUI() {
  if (window.textOverlayManager && window.textOverlayManager.renderOverlayListUI) {
    window.textOverlayManager.renderOverlayListUI(state, {
      renderUI: updateTextOverlaysUI,
      renderCanvas: renderCanvas,
      pushUndo: (msg) => pushUndoState()
    });
  }
}
window.updateTextOverlaysUI = updateTextOverlaysUI;

function setupBadgesAndOverlaysUI() {
  // Bind Text Overlay Controls
  const btnAddOverlay = document.getElementById('btnAddTextOverlay');
  if (btnAddOverlay) {
    btnAddOverlay.addEventListener('click', () => {
      if (window.textOverlayManager && window.textOverlayManager.addTextOverlay) {
        window.textOverlayManager.addTextOverlay(state, 'C0', 960, 240, {
          renderUI: updateTextOverlaysUI,
          renderCanvas: renderCanvas,
          pushUndo: (msg) => pushUndoState()
        });
        showToast('✏️ Added new text overlay');
      }
    });
  }

  document.querySelectorAll('.text-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.text;
      if (window.textOverlayManager && window.textOverlayManager.addTextOverlay) {
        window.textOverlayManager.addTextOverlay(state, preset, 960, 240, {
          renderUI: updateTextOverlaysUI,
          renderCanvas: renderCanvas,
          pushUndo: (msg) => pushUndoState()
        });
        showToast(`✏️ Added "${preset}" overlay`);
      }
    });
  });
  const chkStar = document.getElementById('chkStarBadge');
  const starControls = document.getElementById('starBadgeControls');
  const inputStarText = document.getElementById('inputStarBadgeText');
  const selStarPos = document.getElementById('selStarBadgePos');
  const tbStar = document.getElementById('tbStarBadge');

  if (chkStar) {
    chkStar.addEventListener('change', (e) => {
      state.starBadge.enabled = e.target.checked;
      if (starControls) starControls.style.display = e.target.checked ? 'flex' : 'none';
      if (tbStar) tbStar.classList.toggle('active', e.target.checked);
      renderCanvas();
      pushUndoState();
    });
  }

  if (inputStarText) {
    inputStarText.addEventListener('input', (e) => {
      state.starBadge.text = e.target.value;
      renderCanvas();
    });
  }

  if (selStarPos) {
    selStarPos.addEventListener('change', (e) => {
      state.starBadge.position = e.target.value;
      renderCanvas();
      pushUndoState();
    });
  }

  // Quick Preset Buttons for Star Badge
  document.querySelectorAll('.badge-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      state.starBadge.text = preset;
      state.starBadge.enabled = true;
      if (inputStarText) inputStarText.value = preset;
      if (chkStar) chkStar.checked = true;
      if (starControls) starControls.style.display = 'flex';
      if (tbStar) tbStar.classList.add('active');
      renderCanvas();
      pushUndoState();
      showToast(`⭐ Applied Badge: ${preset}`);
    });
  });

  // Watermark Controls
  const chkWatermark = document.getElementById('chkWatermark');
  const watermarkControls = document.getElementById('watermarkControls');
  const inputWatermarkText = document.getElementById('inputWatermarkText');
  const selWatermarkPos = document.getElementById('selWatermarkPos');
  const rngOpacity = document.getElementById('rngWatermarkOpacity');
  const txtOpacity = document.getElementById('txtWatermarkOpacity');
  const tbWatermark = document.getElementById('tbWatermark');

  if (chkWatermark) {
    chkWatermark.addEventListener('change', (e) => {
      state.watermark.enabled = e.target.checked;
      if (watermarkControls) watermarkControls.style.display = e.target.checked ? 'flex' : 'none';
      if (tbWatermark) tbWatermark.classList.toggle('active', e.target.checked);
      renderCanvas();
      pushUndoState();
    });
  }

  if (inputWatermarkText) {
    inputWatermarkText.addEventListener('input', (e) => {
      state.watermark.text = e.target.value;
      renderCanvas();
    });
  }

  if (selWatermarkPos) {
    selWatermarkPos.addEventListener('change', (e) => {
      state.watermark.position = e.target.value;
      renderCanvas();
      pushUndoState();
    });
  }

  if (rngOpacity) {
    rngOpacity.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.watermark.opacity = val / 100;
      if (txtOpacity) txtOpacity.textContent = `${val}%`;
      renderCanvas();
    });
  }
}

function updateBadgesAndOverlaysUI() {
  const chkStar = document.getElementById('chkStarBadge');
  const starControls = document.getElementById('starBadgeControls');
  const inputStarText = document.getElementById('inputStarBadgeText');
  const selStarPos = document.getElementById('selStarBadgePos');
  const tbStar = document.getElementById('tbStarBadge');

  if (chkStar) chkStar.checked = !!state.starBadge?.enabled;
  if (starControls) starControls.style.display = state.starBadge?.enabled ? 'flex' : 'none';
  if (inputStarText && state.starBadge?.text) inputStarText.value = state.starBadge.text;
  if (selStarPos && state.starBadge?.position) selStarPos.value = state.starBadge.position;
  if (tbStar) tbStar.classList.toggle('active', !!state.starBadge?.enabled);

  const chkWatermark = document.getElementById('chkWatermark');
  const watermarkControls = document.getElementById('watermarkControls');
  const inputWatermarkText = document.getElementById('inputWatermarkText');
  const selWatermarkPos = document.getElementById('selWatermarkPos');
  const rngOpacity = document.getElementById('rngWatermarkOpacity');
  const txtOpacity = document.getElementById('txtWatermarkOpacity');
  const tbWatermark = document.getElementById('tbWatermark');

  if (chkWatermark) chkWatermark.checked = !!state.watermark?.enabled;
  if (watermarkControls) watermarkControls.style.display = state.watermark?.enabled ? 'flex' : 'none';
  if (inputWatermarkText && state.watermark?.text) inputWatermarkText.value = state.watermark.text;
  if (selWatermarkPos && state.watermark?.position) selWatermarkPos.value = state.watermark.position;
  if (rngOpacity && state.watermark?.opacity !== undefined) {
    const val = Math.round(state.watermark.opacity * 100);
    rngOpacity.value = val;
    if (txtOpacity) txtOpacity.textContent = `${val}%`;
  }
  if (tbWatermark) tbWatermark.classList.toggle('active', !!state.watermark?.enabled);
}
window.updateBadgesAndOverlaysUI = updateBadgesAndOverlaysUI;

// Load YouTube Playlists from backend
async function loadYTPlaylists() {
  const sel = document.getElementById('selYTPlaylist');
  if (!sel) return;

  try {
    const res = await fetch('/api/youtube/playlists');
    const data = await res.json();
    if (data && Array.isArray(data.playlists)) {
      sel.innerHTML = '<option value="">-- No playlist assigned --</option>' +
        data.playlists.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
      if (state.selectedPlaylist) {
        sel.value = state.selectedPlaylist;
      }
    }
  } catch (err) {
    console.warn('Could not load YouTube playlists:', err);
  }

  sel.addEventListener('change', (e) => {
    state.selectedPlaylist = e.target.value;
  });

  const btnOpenYT = document.getElementById('btnOpenInYTStudio');
  if (btnOpenYT) {
    btnOpenYT.addEventListener('click', () => {
      const title = encodeURIComponent(document.getElementById('ytTitleOutput')?.value || '');
      window.open(`https://studio.youtube.com/channel/UC3sNFfqnKIjf8_cEJGBrqRg/videos/upload?title=${title}`, '_blank');
      showToast('🔗 Opening YouTube Studio...');
    });
  }
}
window.loadYTPlaylists = loadYTPlaylists;



// Setup First-Run Creator Quick-Start Guide Modal
function setupQuickStartModal() {
  if (typeof window.initQuickStartGuide === 'function') {
    window.initQuickStartGuide();
  }
  const chkDontShow = document.getElementById('chkDontShowQuickStart');
  if (chkDontShow && chkDontShow.checked) {
    try {
      localStorage.setItem('abyss_has_seen_quickstart', 'true');
    } catch (e) {}
  }
}

// ==========================================================================
// Stygian Onslaught Arranger Controller (Delegated to web/modules/stygian_arranger.js)
// ==========================================================================
// Full implementation is modularized into /static/modules/stygian_arranger.js

// -----------------------------------------------------------------------------
// Sidebar Category Sub-Tabs Manager (Zero-Scroll Studio Workflow)
// -----------------------------------------------------------------------------
function setupSidebarSubtabs() {
  const tabs = document.querySelectorAll('#sidebarCategoryNav .subtab-btn');
  const panes = {
    team: document.getElementById('subtabPaneTeam'),
    boss: document.getElementById('subtabPaneBoss'),
    art: document.getElementById('subtabPaneArt')
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.subtab;
      tabs.forEach(t => t.classList.toggle('active', t === tab));
      Object.keys(panes).forEach(k => {
        if (panes[k]) {
          panes[k].style.display = (k === target) ? 'block' : 'none';
          if (k === target) {
            panes[k].classList.add('active');
          } else {
            panes[k].classList.remove('active');
          }
        }
      });
    });
  });

  // Support URL param ?subtab=boss or ?subtab=art
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const initialSubtab = urlParams.get('subtab');
    if (initialSubtab && panes[initialSubtab]) {
      const targetTabBtn = document.querySelector(`#sidebarCategoryNav .subtab-btn[data-subtab="${initialSubtab}"]`);
      if (targetTabBtn) targetTabBtn.click();
    }
  } catch (e) {}
}
window.setupSidebarSubtabs = setupSidebarSubtabs;
