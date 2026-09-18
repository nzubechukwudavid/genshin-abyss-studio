/**
 * Genshin Impact Spiral Abyss Studio - Client Engine
 * Features Canva-style direct touch/mouse manipulation, 60fps local rendering,
 * dynamic HoYoWiki official gallery filmstrip, keyboard shortcuts, and clipboard export.
 * Version: 2.1.0 (Production Hardened)
 */

// Canvas & Context
const canvas = document.getElementById('thumbnailCanvas');
const ctx = canvas.getContext('2d');

// State
const state = {
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
  }
};

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

  // Ensure custom Anton & Inter fonts are ready before initial rendering
  try {
    await document.fonts.ready;
  } catch (e) {
    console.warn('Font loading check skipped:', e);
  }

  await loadCharactersCatalog();

  // Check runtime environment capabilities (Desktop vs Cloud Sandbox)
  checkEnvironmentCapabilities();

  // Setup DOM Event Listeners & Keyboard Shortcuts
  setupDOMListeners();
  setupCanvasInteraction();
  setupKeyboardShortcuts();

  // Load default characters (Mavuika & Chasca)
  await selectCharacterForSlot(1, 'Mavuika', false);
  await selectCharacterForSlot(2, 'Chasca', false);

  updateSidebarUI();
  updateZoomUI();
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
  const slot = slotNum === 1 ? state.side1 : state.side2;
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
  const slot = slotNum === 1 ? state.side1 : state.side2;
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
    const slot = slotNum === 1 ? state.side1 : state.side2;
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
    }
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
      side2_archetypeColor: state.side2.archetypeColor
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
function setupCanvasInteraction() {
  const getCanvasCoords = (e) => {
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    return {
      x: (e.clientX - rect.left) * scale,
      y: (e.clientY - rect.top) * scale
    };
  };

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointerState.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const coords = getCanvasCoords(e);

    // Switch active slot depending on left or right click
    if (coords.x < 960) {
      setActiveSlot(1);
    } else {
      setActiveSlot(2);
    }

    const slot = state.activeSlot === 1 ? state.side1 : state.side2;
    pointerState.isDragging = true;
    pointerState.startPanX = slot.panX;
    pointerState.startPanY = slot.panY;
    pointerState.lastClientX = e.clientX;
    pointerState.lastClientY = e.clientY;
    canvas.classList.add('grabbing');
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointerState.pointers.has(e.pointerId)) return;
    pointerState.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const slot = state.activeSlot === 1 ? state.side1 : state.side2;
    const rect = canvas.getBoundingClientRect();
    const scaleFactor = canvas.width / rect.width;

    if (pointerState.pointers.size === 1 && pointerState.isDragging) {
      // Single touch / mouse drag -> Pan
      const dx = (e.clientX - pointerState.lastClientX) * scaleFactor;
      const dy = (e.clientY - pointerState.lastClientY) * scaleFactor;

      slot.panX += dx;
      slot.panY += dy;

      pointerState.lastClientX = e.clientX;
      pointerState.lastClientY = e.clientY;
      renderCanvas();
    } else if (pointerState.pointers.size === 2) {
      // Multi-touch Pinch -> Zoom
      const pts = Array.from(pointerState.pointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);

      if (pointerState.lastPinchDist > 0) {
        const ratio = dist / pointerState.lastPinchDist;
        slot.scale = Math.min(Math.max(slot.scale * ratio, 0.25), 4.5);
        updateZoomUI();
        renderCanvas();
      }
      pointerState.lastPinchDist = dist;
    }
  });

  const endPointer = (e) => {
    pointerState.pointers.delete(e.pointerId);
    if (pointerState.pointers.size === 0) {
      pointerState.isDragging = false;
      pointerState.lastPinchDist = 0;
      canvas.classList.remove('grabbing');
      pushUndoState();
    } else if (pointerState.pointers.size === 1) {
      pointerState.lastPinchDist = 0;
      const remaining = Array.from(pointerState.pointers.values())[0];
      pointerState.lastClientX = remaining.x;
      pointerState.lastClientY = remaining.y;
    }
  };

  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  // Mouse Wheel Zoom
  let wheelUndoTimer = null;
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const slot = state.activeSlot === 1 ? state.side1 : state.side2;
    const zoomFactor = e.deltaY < 0 ? 1.06 : 0.94;
    slot.scale = Math.min(Math.max(slot.scale * zoomFactor, 0.25), 4.5);
    updateZoomUI();
    renderCanvas();
    clearTimeout(wheelUndoTimer);
    wheelUndoTimer = setTimeout(() => {
      pushUndoState();
    }, 250);
  }, { passive: false });

  // Canvas Drag & Drop Dropzone for .abyss Projects
  canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.abyss') || file.name.endsWith('.json')) {
        openProjectFile(file);
      }
    }
  });
}

// Switch Active Slot
function setActiveSlot(slotNum) {
  if (state.activeSlot === slotNum) return;
  state.activeSlot = slotNum;

  const tab1 = document.getElementById('tabSide1');
  const tab2 = document.getElementById('tabSide2');
  const pill = document.getElementById('activeSlotPill');

  if (slotNum === 1) {
    tab1.className = 'panel-tab active-left';
    tab2.className = 'panel-tab';
    pill.textContent = '👈 Selected Side 1 (Left) — Drag with finger/mouse, pinch or scroll to zoom (Hot-keys: 1, 2)';
  } else {
    tab1.className = 'panel-tab';
    tab2.className = 'panel-tab active-right';
    pill.textContent = '👉 Selected Side 2 (Right) — Drag with finger/mouse, pinch or scroll to zoom (Hot-keys: 1, 2)';
  }

  updateSidebarUI();
  updateZoomUI();
  renderCanvas();
}

// Update Zoom UI Display
function updateZoomUI() {
  const slot = state.activeSlot === 1 ? state.side1 : state.side2;
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
  const slot = state.activeSlot === 1 ? state.side1 : state.side2;
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
  const slot = state.activeSlot === 1 ? state.side1 : state.side2;
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

  const slot = state.activeSlot === 1 ? state.side1 : state.side2;
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

// Filmstrip Scoped IntersectionObserver for Zero-Waste On-Demand Loading
let filmstripObserver = null;

function setupFilmstripObserver(container) {
  if (filmstripObserver) {
    filmstripObserver.disconnect();
  }
  filmstripObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src && !img.src) {
          img.src = img.dataset.src;
        }
        observer.unobserve(img);
      }
    });
  }, {
    root: container,
    rootMargin: '120px 0px'
  });
}

// Render Gallery Filmstrip (using fast lightweight WebP thumbnails with scoped on-demand loading)
function renderGalleryFilmstrip(images, currentUrl) {
  const container = document.getElementById('galleryFilmstrip');
  const countTag = document.getElementById('galleryCountTag');
  container.innerHTML = '';

  if (!images || images.length === 0) {
    countTag.textContent = '0 Images';
    container.innerHTML = '<div style="grid-column: 1/-1; padding: 20px; text-align: center; color: var(--text-dim); font-size: 0.8rem;">No gallery images found</div>';
    return;
  }

  countTag.textContent = `${images.length} Illustrations`;
  setupFilmstripObserver(container);

  images.forEach((item, idx) => {
    const url = typeof item === 'string' ? item : (item.url || '');
    const type = typeof item === 'object' && item.type ? item.type : (idx === 0 ? 'portrait' : (idx === 1 ? 'splash' : (url.toLowerCase().includes('.jpg') ? 'scene' : 'art')));
    const badgeText = typeof item === 'object' && item.badge ? item.badge : (idx === 0 ? '👑 1800p Portrait' : (idx === 1 ? '✨ 2K Splash' : (type === 'scene' ? '🖼️ Scene / Wallpaper' : `🎨 Art #${idx + 1}`)));

    const itemEl = document.createElement('div');
    itemEl.className = 'gallery-thumb-item' + (url === currentUrl ? ' active' : '');
    itemEl.dataset.url = url;

    const img = document.createElement('img');
    const thumbUrl = `/api/proxy-image?url=${encodeURIComponent(url)}&thumb=true`;
    img.dataset.src = thumbUrl;
    img.alt = badgeText;

    img.onerror = () => {
      // Retry once without thumb parameter in case thumbnail generation had a transient failure
      if (img.src && img.src.includes('&thumb=true')) {
        img.src = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      } else {
        // Render fallback placeholder gracefully if offline and not in cache
        img.style.display = 'none';
        if (!itemEl.querySelector('.gallery-fallback-placeholder')) {
          const fallback = document.createElement('div');
          fallback.className = 'gallery-fallback-placeholder';
          fallback.innerHTML = `<span>🖼️</span><div>Art #${idx + 1}</div>`;
          itemEl.insertBefore(fallback, badge);
        }
      }
    };

    // Load first 6 immediately; subsequent items load on-demand when scrolled into view
    if (idx < 6) {
      img.src = thumbUrl;
    } else {
      filmstripObserver.observe(img);
    }

    const badge = document.createElement('div');
    badge.className = `gallery-badge badge-${type}`;
    badge.textContent = badgeText;

    itemEl.appendChild(img);
    itemEl.appendChild(badge);

    itemEl.addEventListener('click', () => {
      // Highlight active item immediately
      container.querySelectorAll('.gallery-thumb-item').forEach(el => el.classList.remove('active'));
      itemEl.classList.add('active');

      // Load full-resolution image to canvas
      loadImageToSlot(state.activeSlot, url);
    });

    container.appendChild(itemEl);
  });
}

// Check and update character-specific offline cache status in UI
async function updateUnitCacheStatus(characterName) {
  const btnCacheUnit = document.getElementById('btnCacheCurrentUnit');
  if (!btnCacheUnit || !characterName) return;
  try {
    const res = await fetch(`/api/assets/character-cache-status/${encodeURIComponent(characterName)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.is_complete && data.total > 0) {
        btnCacheUnit.classList.add('is-cached');
        btnCacheUnit.innerHTML = `<span>✓</span> Stored (${data.cached}/${data.total})`;
        btnCacheUnit.title = `All ${data.total} illustrations are cached locally on disk for offline use.`;
      } else {
        btnCacheUnit.classList.remove('is-cached');
        btnCacheUnit.innerHTML = `<span>📥</span> Cache Unit (${data.cached}/${data.total})`;
        btnCacheUnit.title = `${data.cached} of ${data.total} illustrations cached. Click to download all ${data.total} illustrations for offline use.`;
      }
    }
  } catch (e) {
    console.debug('Unit cache status error:', e);
  }
}

// Populate Modal Grid for 130 Characters with Element Filtering
function populateModalCharGrid(query = '', elementFilter = state.activeElementFilter) {
  const grid = document.getElementById('modalCharGrid');
  grid.innerHTML = '';
  const cleanQ = query.trim().toLowerCase();
  const ef = (elementFilter || 'all').toLowerCase();

  const entries = Object.entries(state.charactersCatalog).filter(([name, info]) => {
    const matchesQuery = !cleanQ || name.toLowerCase().includes(cleanQ);
    const matchesElement = ef === 'all' || (info.vision && info.vision.toLowerCase() === ef);
    return matchesQuery && matchesElement;
  });

  if (entries.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-dim);">No characters match search or filter</div>';
    return;
  }

  entries.forEach(([name, info]) => {
    const card = document.createElement('div');
    card.className = 'char-grid-card';
    card.style.position = 'relative';

    // Rarity Badge (5★ Gold / 4★ Purple)
    const rarity = info.rarity || 5;
    const rBadge = document.createElement('span');
    rBadge.textContent = rarity === 4 ? '4★' : '5★';
    rBadge.style.cssText = `position: absolute; top: 4px; left: 4px; font-size: 0.58rem; font-weight: 800; padding: 1px 4px; border-radius: 3px; background: ${rarity === 4 ? '#8e57b7' : '#d4a64d'}; color: #fff; z-index: 2;`;

    const avatar = document.createElement('img');
    avatar.loading = 'lazy';
    avatar.src = `/api/avatar/${encodeURIComponent(name)}?v=4.0.1`;
    avatar.onerror = () => {
      if (info.icon && !avatar._triedProxy) {
        avatar._triedProxy = true;
        avatar.src = `/api/proxy-image?url=${encodeURIComponent(info.icon)}&thumb=true`;
      }
    };
    avatar.alt = name;

    const label = document.createElement('span');
    label.textContent = name;

    card.appendChild(rBadge);
    card.appendChild(avatar);
    card.appendChild(label);

    card.addEventListener('click', () => {
      if (teammateSelectionTarget) {
        const targetSlot = teammateSelectionTarget.slot === 1 ? state.side1 : state.side2;
        targetSlot.teammates[teammateSelectionTarget.teammateIdx] = name;
        preloadTeammateImages(targetSlot);
        updateTeamRosterUI();
        teammateSelectionTarget = null;
        document.getElementById('charModal').classList.remove('open');
        renderCanvas();
        showToast(`Added ${name} to lineup!`);
        return;
      }
      selectCharacterForSlot(state.activeSlot, name, true);
      document.getElementById('charModal').classList.remove('open');
    });

    grid.appendChild(card);
  });
}

// Centralized, Pristine Character & Teammate Picker Modal Opener
function openCharacterPickerModal(target = null) {
  teammateSelectionTarget = target;

  // 1. Clear search input & hide clear button
  const searchInput = document.getElementById('modalSearchInput');
  const clearBtn = document.getElementById('modalSearchClearBtn');
  if (searchInput) {
    searchInput.value = '';
  }
  if (clearBtn) {
    clearBtn.style.display = 'none';
  }

  // 2. Reset element filter back to 'all'
  state.activeElementFilter = 'all';
  document.querySelectorAll('.filter-pill').forEach(pill => {
    const el = (pill.getAttribute('data-element') || '').toLowerCase();
    pill.classList.toggle('active', el === 'all');
  });

  // 3. Set contextual header title
  const titleEl = document.querySelector('#charModal .modal-header h2');
  if (titleEl) {
    if (target) {
      const slotNum = target.slot;
      const tIdx = target.teammateIdx;
      titleEl.textContent = `Select Teammate for Side ${slotNum} (Slot ${tIdx + 1})`;
    } else {
      titleEl.textContent = `Select Main Character for Side ${state.activeSlot}`;
    }
  }

  // 4. Populate modal grid with all 130 characters cleanly
  populateModalCharGrid('', 'all');

  // 5. Open modal and auto-focus search box ready for instant typing
  const modal = document.getElementById('charModal');
  if (modal) {
    modal.classList.add('open');
    setTimeout(() => {
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }, 40);
  }
}

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

    const slot = state.activeSlot === 1 ? state.side1 : state.side2;
    const nudge = e.shiftKey ? 25 : 5;

    switch (e.key) {
      case '1':
        setActiveSlot(1);
        break;
      case '2':
        setActiveSlot(2);
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
  document.getElementById('tabSide1').addEventListener('click', () => setActiveSlot(1));
  document.getElementById('tabSide2').addEventListener('click', () => setActiveSlot(2));

  // Global Floor & Patch Inputs (Desktop & Mobile Sync)
  const patchInput = document.getElementById('patchInput');
  const mobilePatchInput = document.getElementById('mobilePatchInput');
  const handlePatchChange = (val) => {
    state.patch = val;
    if (patchInput && patchInput.value !== val) patchInput.value = val;
    if (mobilePatchInput && mobilePatchInput.value !== val) mobilePatchInput.value = val;
    renderCanvas();
  };
  if (patchInput) patchInput.addEventListener('input', (e) => handlePatchChange(e.target.value));
  if (mobilePatchInput) mobilePatchInput.addEventListener('input', (e) => handlePatchChange(e.target.value));

  // Adaptive Patch Rosette Color Controls
  const btnRosettePicker = document.getElementById('btnRosettePicker');
  const rosettePopover = document.getElementById('rosettePopover');
  const rosettePreviewDot = document.getElementById('rosettePreviewDot');
  const rosetteBtnLabel = document.getElementById('rosetteBtnLabel');
  const btnRosetteAuto = document.getElementById('btnRosetteAuto');
  const rosetteCustomColor = document.getElementById('rosetteCustomColor');
  const rosetteHexVal = document.getElementById('rosetteHexVal');
  const rosetteSwatchChips = document.querySelectorAll('.rosette-swatch-chip');

  const updateRosetteWidgetUI = () => {
    const theme = getActiveRosetteTheme();
    if (rosettePreviewDot) rosettePreviewDot.style.background = theme.main;
    if (rosetteBtnLabel) rosetteBtnLabel.textContent = state.rosette.mode === 'auto' ? 'Auto' : (state.rosette.colorName || 'Custom');
    if (btnRosetteAuto) btnRosetteAuto.classList.toggle('active', state.rosette.mode === 'auto');
    if (rosetteCustomColor) rosetteCustomColor.value = theme.main.startsWith('#') ? theme.main : '#fed662';
    if (rosetteHexVal) rosetteHexVal.textContent = (theme.main.startsWith('#') ? theme.main : '#FED662').toUpperCase();

    rosetteSwatchChips.forEach(chip => {
      const isMatch = state.rosette.mode !== 'auto' && chip.dataset.color.toLowerCase() === (state.rosette.color || '').toLowerCase();
      chip.classList.toggle('active', isMatch);
    });
  };

  window.updateRosetteWidgetUI = updateRosetteWidgetUI;

  if (btnRosettePicker && rosettePopover) {
    btnRosettePicker.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = rosettePopover.style.display === 'none';
      rosettePopover.style.display = isHidden ? 'flex' : 'none';
      btnRosettePicker.classList.toggle('open', isHidden);
    });

    document.addEventListener('click', (e) => {
      if (!rosettePopover.contains(e.target) && !btnRosettePicker.contains(e.target)) {
        rosettePopover.style.display = 'none';
        btnRosettePicker.classList.remove('open');
      }
    });
  }

  if (btnRosetteAuto) {
    btnRosetteAuto.addEventListener('click', () => {
      state.rosette.mode = 'auto';
      updateRosetteWidgetUI();
      renderCanvas();
    });
  }

  rosetteSwatchChips.forEach(chip => {
    chip.addEventListener('click', () => {
      state.rosette.mode = 'custom';
      state.rosette.color = chip.dataset.color;
      state.rosette.colorName = chip.dataset.name;
      updateRosetteWidgetUI();
      renderCanvas();
    });
  });

  if (rosetteCustomColor) {
    rosetteCustomColor.addEventListener('input', (e) => {
      state.rosette.mode = 'custom';
      state.rosette.color = e.target.value;
      state.rosette.colorName = 'Custom';
      updateRosetteWidgetUI();
      renderCanvas();
    });
  }

  // Center Style Navigation (Spire vs Rosette vs Line)
  const centerNavBtns = document.querySelectorAll('.center-nav-btn');
  const rosetteWidget = document.getElementById('rosetteColorWidget');
  const spireWidget = document.getElementById('spireConfigWidget');

  const updateCenterStyleUI = () => {
    centerNavBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.style === state.centerStyle);
    });
    if (rosetteWidget) rosetteWidget.style.display = state.centerStyle === 'rosette' ? 'block' : 'none';
    if (spireWidget) spireWidget.style.display = state.centerStyle === 'spire' ? 'block' : 'none';
  };

  centerNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      state.centerStyle = btn.dataset.style;
      updateCenterStyleUI();
      renderCanvas();
    });
  });
  updateCenterStyleUI();

  // Rosette Visibility Toggle Switch
  const chkShowRosette = document.getElementById('chkShowRosette');
  if (chkShowRosette) {
    chkShowRosette.checked = state.rosette.enabled !== false;
    chkShowRosette.addEventListener('change', (e) => {
      state.rosette.enabled = e.target.checked;
      renderCanvas();
    });
  }

  // Abyss Spire Configuration (TGozaru Signature)
  const btnSpirePicker = document.getElementById('btnSpirePicker');
  const spirePopover = document.getElementById('spirePopover');
  const spireFloorBadge = document.getElementById('spireFloorBadge');
  const spireHookLabel = document.getElementById('spireHookLabel');
  const spireHookInput = document.getElementById('spireHookInput');
  const spireChips = document.querySelectorAll('.spire-chip');

  if (btnSpirePicker && spirePopover) {
    btnSpirePicker.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = spirePopover.style.display === 'none';
      spirePopover.style.display = isHidden ? 'flex' : 'none';
      btnSpirePicker.classList.toggle('open', isHidden);
    });

    document.addEventListener('click', (e) => {
      if (!spirePopover.contains(e.target) && !btnSpirePicker.contains(e.target)) {
        spirePopover.style.display = 'none';
        btnSpirePicker.classList.remove('open');
      }
    });
  }

  spireChips.forEach(chip => {
    chip.addEventListener('click', () => {
      state.spire.floor = chip.dataset.floor;
      spireChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      if (spireFloorBadge) spireFloorBadge.textContent = state.spire.floor;
      if (spireHookLabel) spireHookLabel.textContent = 'Fl. ' + state.spire.floor;
      renderCanvas();
    });
  });

  if (spireHookInput) {
    spireHookInput.value = state.spire.hookText;
    spireHookInput.addEventListener('input', (e) => {
      state.spire.hookText = e.target.value;
      renderCanvas();
    });
  }

  document.querySelectorAll('.suggestion-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const val = tag.dataset.tag;
      state.spire.hookText = val;
      if (spireHookInput) spireHookInput.value = val;
      renderCanvas();
    });
  });

  // Team Roster Layout Pills (Bottom Dock vs Vertical Outer Edges)
  const btnRosterDock = document.getElementById('btnRosterDock');
  const btnRosterVertical = document.getElementById('btnRosterVertical');
  if (btnRosterDock && btnRosterVertical) {
    btnRosterDock.addEventListener('click', () => {
      state.rosterLayout = 'dock';
      btnRosterDock.classList.add('active');
      btnRosterVertical.classList.remove('active');
      renderCanvas();
    });
    btnRosterVertical.addEventListener('click', () => {
      state.rosterLayout = 'vertical';
      btnRosterVertical.classList.add('active');
      btnRosterDock.classList.remove('active');
      renderCanvas();
    });
  }

  // Export Super-Sampling HD Toggle (Off by default for pristine quality)
  const chkExportHD = document.getElementById('chkExportHD');
  if (chkExportHD) {
    chkExportHD.checked = state.exportEnhance === true;
    chkExportHD.addEventListener('change', (e) => {
      state.exportEnhance = e.target.checked;
    });
  }

  // Offline HoYoWiki Asset Cache Pre-Downloader
  const btnSyncOffline = document.getElementById('btnSyncOfflineCache');
  const btnCacheUnit = document.getElementById('btnCacheCurrentUnit');
  const cacheProgressWrap = document.getElementById('cacheProgressContainer');
  const cacheProgressFill = document.getElementById('cacheProgressFill');
  const cacheProgressLabel = document.getElementById('cacheProgressLabel');

  // 1. Single Character Cache Downloader
  if (btnCacheUnit) {
    btnCacheUnit.addEventListener('click', async () => {
      const slot = state.activeSlot === 1 ? state.side1 : state.side2;
      const charName = slot.character;
      if (!charName) return;

      btnCacheUnit.disabled = true;
      btnCacheUnit.innerHTML = `<span>⏳</span> Caching ${charName}...`;
      if (cacheProgressWrap) {
        cacheProgressWrap.style.display = 'flex';
        if (cacheProgressFill) cacheProgressFill.style.width = '30%';
        if (cacheProgressLabel) cacheProgressLabel.textContent = `Downloading all ${charName} illustrations...`;
      }

      try {
        const res = await fetch(`/api/assets/cache-character/${encodeURIComponent(charName)}`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (cacheProgressFill) cacheProgressFill.style.width = '100%';
          if (cacheProgressLabel) cacheProgressLabel.textContent = `All ${data.cached} images for ${charName} cached locally!`;
          btnCacheUnit.classList.add('is-cached');
          btnCacheUnit.innerHTML = `<span>✓</span> Stored (${data.cached}/${data.total})`;
          showToast(`✅ All ${data.cached} illustrations for ${charName} saved to local disk!`);
          // Re-render gallery filmstrip so newly generated thumbnails display immediately
          renderGalleryFilmstrip(slot.gallery, slot.imgUrl);
          setTimeout(() => {
            if (cacheProgressWrap) cacheProgressWrap.style.display = 'none';
          }, 3000);
        } else {
          showToast(`⚠️ Failed to cache ${charName}`);
        }
      } catch (err) {
        console.error(err);
        showToast(`⚠️ Network error while caching ${charName}`);
      } finally {
        btnCacheUnit.disabled = false;
      }
    });
  }

  // 2. Full HoYoWiki Offline Cache Downloader
  if (btnSyncOffline) {
    btnSyncOffline.addEventListener('click', async () => {
      btnSyncOffline.disabled = true;
      btnSyncOffline.innerHTML = '<span>⏳</span> Starting Sync...';
      if (cacheProgressWrap) cacheProgressWrap.style.display = 'flex';

      try {
        await fetch('/api/assets/cache-hoyowiki?full=true', { method: 'POST' });
        const pollInterval = setInterval(async () => {
          try {
            const res = await fetch('/api/assets/cache-status');
            const data = await res.json();
            if (cacheProgressFill) cacheProgressFill.style.width = `${data.percentage}%`;
            if (cacheProgressLabel) cacheProgressLabel.textContent = `${data.message} (${data.cached_mb} MB stored)`;

            if (data.status === 'completed') {
              clearInterval(pollInterval);
              btnSyncOffline.disabled = false;
              btnSyncOffline.innerHTML = '<span>✓</span> Full Wiki Cached';
              showToast('✅ Complete HoYoWiki artwork catalog cached locally!');
              const slot = state.activeSlot === 1 ? state.side1 : state.side2;
              updateUnitCacheStatus(slot.character);
              setTimeout(() => {
                btnSyncOffline.innerHTML = '<span>🌐</span> Full Cache';
                if (cacheProgressWrap) cacheProgressWrap.style.display = 'none';
              }, 4000);
            } else if (data.status === 'error') {
              clearInterval(pollInterval);
              btnSyncOffline.disabled = false;
              btnSyncOffline.innerHTML = '<span>❌</span> Retry Sync';
              showToast(`⚠️ Cache error: ${data.message}`);
            }
          } catch (e) {
            console.warn('Cache poll error:', e);
          }
        }, 1200);
      } catch (err) {
        btnSyncOffline.disabled = false;
        btnSyncOffline.innerHTML = '<span>🌐</span> Full Cache';
        showToast('⚠️ Could not start cache sync');
      }
    });
  }

  // Toggle Sidebar Panel for Zen / Full Canvas View
  const toggleSidebarBtn = document.getElementById('btnToggleSidebar');
  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', () => {
      const panel = document.querySelector('.sidebar-panel');
      if (panel) {
        panel.classList.toggle('collapsed');
        const isCollapsed = panel.classList.contains('collapsed');
        toggleSidebarBtn.classList.toggle('active', isCollapsed);
        toggleSidebarBtn.innerHTML = isCollapsed ? '◨ Exit Focus' : '◨ Focus View';
      }
    });
  }

  // Swap Sides Buttons (Desktop, Mobile Quick Settings, and Mobile Toolbar)
  const swapSidesHandler = () => {
    const temp = state.side1;
    state.side1 = state.side2;
    state.side2 = temp;
    updateSidebarUI();
    updateZoomUI();
    renderCanvas();
  };
  const swapBtn = document.getElementById('btnSwapSides');
  if (swapBtn) swapBtn.addEventListener('click', swapSidesHandler);
  const mobileSwapBtn = document.getElementById('mobileBtnSwapSides');
  if (mobileSwapBtn) mobileSwapBtn.addEventListener('click', swapSidesHandler);
  const tbSwapMobileBtn = document.getElementById('tbSwapMobile');
  if (tbSwapMobileBtn) tbSwapMobileBtn.addEventListener('click', swapSidesHandler);

  // Floating Zoom Controls
  document.getElementById('btnZoomIn').addEventListener('click', () => {
    const slot = state.activeSlot === 1 ? state.side1 : state.side2;
    slot.scale = Math.min(slot.scale + 0.05, 4.5);
    updateZoomUI();
    renderCanvas();
  });
  document.getElementById('btnZoomOut').addEventListener('click', () => {
    const slot = state.activeSlot === 1 ? state.side1 : state.side2;
    slot.scale = Math.max(slot.scale - 0.05, 0.25);
    updateZoomUI();
    renderCanvas();
  });
  document.getElementById('btnZoomFit').addEventListener('click', () => {
    const slot = state.activeSlot === 1 ? state.side1 : state.side2;
    slot.scale = 1.05;
    slot.panX = 0;
    slot.panY = -40;
    updateZoomUI();
    renderCanvas();
  });

  // Segmented Constellation Controls
  document.querySelectorAll('.const-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const slot = state.activeSlot === 1 ? state.side1 : state.side2;
      slot.constellation = btn.dataset.val;
      document.getElementById('constInput').value = slot.constellation;
      document.querySelectorAll('.const-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCanvas();
    });
  });

  // Archetype Input
  document.getElementById('archetypeInput').addEventListener('input', (e) => {
    const slot = state.activeSlot === 1 ? state.side1 : state.side2;
    slot.archetype = e.target.value;
    renderCanvas();
  });

  // Archetype Accent Color Swatch Bar
  const colorBar = document.getElementById('archetypeColorBar');
  if (colorBar) {
    colorBar.querySelectorAll('.color-chip[data-color]').forEach(chip => {
      chip.addEventListener('click', () => {
        const slot = state.activeSlot === 1 ? state.side1 : state.side2;
        slot.archetypeColor = chip.dataset.color;
        colorBar.querySelectorAll('.color-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        renderCanvas();
      });
    });

    const customColorInput = document.getElementById('archetypeCustomColor');
    if (customColorInput) {
      customColorInput.addEventListener('input', (e) => {
        const slot = state.activeSlot === 1 ? state.side1 : state.side2;
        slot.archetypeColor = e.target.value;
        colorBar.querySelectorAll('.color-chip').forEach(c => c.classList.remove('active'));
        customColorInput.closest('.color-chip').classList.add('active');
        renderCanvas();
      });
    }
  }

  // Archetype Style Toggles (Floating Donaturine vs Frosted Capsule)
  const styleToggles = document.getElementById('archetypeStyleToggles');
  if (styleToggles) {
    styleToggles.querySelectorAll('.btn-style-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        styleToggles.querySelectorAll('.btn-style-toggle').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.archetypeStyle = btn.dataset.style;
        renderCanvas();
      });
    });
  }

  // Headline Format Toggles (Donaturine 1-Line vs 2-Line Stacked)
  const formatToggles = document.getElementById('headlineFormatToggles');
  if (formatToggles) {
    formatToggles.querySelectorAll('.btn-style-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        formatToggles.querySelectorAll('.btn-style-toggle').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.headlineFormat = btn.dataset.format || '1line';
        renderCanvas();
      });
    });
  }
  document.getElementById('customNameInput').addEventListener('input', (e) => {
    const slot = state.activeSlot === 1 ? state.side1 : state.side2;
    slot.customName = e.target.value;
    renderCanvas();
  });

  // Toolbar Action Buttons
  document.getElementById('tbFlip').addEventListener('click', () => {
    const slot = state.activeSlot === 1 ? state.side1 : state.side2;
    slot.mirror = !slot.mirror;
    renderCanvas();
  });
  document.getElementById('tbHead').addEventListener('click', () => {
    const slot = state.activeSlot === 1 ? state.side1 : state.side2;
    slot.panY = -180;
    slot.scale = 1.15;
    updateZoomUI();
    renderCanvas();
  });
  document.getElementById('tbTorso').addEventListener('click', () => {
    const slot = state.activeSlot === 1 ? state.side1 : state.side2;
    slot.panY = 0;
    slot.scale = 1.0;
    updateZoomUI();
    renderCanvas();
  });
  document.getElementById('tbReset').addEventListener('click', () => {
    const slot = state.activeSlot === 1 ? state.side1 : state.side2;
    slot.panX = 0;
    slot.panY = -40;
    slot.scale = 1.05;
    updateZoomUI();
    renderCanvas();
  });

  // HD Super-Sampling Clarity Buttons
  const tbEnhance = document.getElementById('tbEnhance');
  if (tbEnhance) {
    tbEnhance.addEventListener('click', () => {
      enhanceSlotHD(state.activeSlot);
    });
  }
  const btnSlotEnhance = document.getElementById('btnSlotEnhance');
  if (btnSlotEnhance) {
    btnSlotEnhance.addEventListener('click', () => {
      enhanceSlotHD(state.activeSlot);
    });
  }

  // Eye-Level Guide Line Toggle
  const guideBtn = document.getElementById('tbGuide');
  guideBtn.addEventListener('click', () => {
    state.showEyeGuide = !state.showEyeGuide;
    guideBtn.classList.toggle('active-guide', state.showEyeGuide);
    renderCanvas();
  });

  // Undo / Redo Toolbar Controls
  const tbUndo = document.getElementById('tbUndo');
  if (tbUndo) tbUndo.addEventListener('click', () => performUndo());
  const tbRedo = document.getElementById('tbRedo');
  if (tbRedo) tbRedo.addEventListener('click', () => performRedo());

  // Project Save & Open Controls (.abyss)
  const tbSaveProject = document.getElementById('tbSaveProject');
  if (tbSaveProject) tbSaveProject.addEventListener('click', () => saveProjectFile());
  const tbOpenProject = document.getElementById('tbOpenProject');
  const projectFileInput = document.getElementById('projectFileInput');
  if (tbOpenProject && projectFileInput) {
    tbOpenProject.addEventListener('click', () => projectFileInput.click());
    projectFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        openProjectFile(e.target.files[0]);
        e.target.value = '';
      }
    });
  }

  document.getElementById('tbBrowse').addEventListener('click', () => {
    document.getElementById('galleryFilmstrip').scrollIntoView({ behavior: 'smooth' });
  });

  // 1-Click Official HD Portrait Button
  const btnQuickHD = document.getElementById('btnQuickHDArt');
  if (btnQuickHD) {
    btnQuickHD.addEventListener('click', () => {
      const slot = state.activeSlot === 1 ? state.side1 : state.side2;
      if (!slot.gallery || slot.gallery.length === 0) {
        showToast('⚠️ No gallery assets loaded yet');
        return;
      }
      // Find top portrait card
      const portraitItem = slot.gallery.find(item => typeof item === 'object' && (item.type === 'portrait' || (item.badge && item.badge.includes('Portrait'))));
      const targetUrl = portraitItem ? (typeof portraitItem === 'string' ? portraitItem : portraitItem.url) : (typeof slot.gallery[0] === 'string' ? slot.gallery[0] : slot.gallery[0].url);

      if (slot.imgUrl === targetUrl) {
        showToast(`👑 Already displaying official 1800p HD Portrait!`);
        return;
      }

      loadImageToSlot(state.activeSlot, targetUrl).then(() => {
        const container = document.getElementById('galleryFilmstrip');
        if (container) {
          container.querySelectorAll('.gallery-thumb-item').forEach(el => {
            el.classList.toggle('active', el.dataset.url === targetUrl);
          });
        }
        showToast(`👑 Switched to Official 1800p HD Portrait!`);
      });
    });
  }

  // Modal Picker Open / Close / Filter
  const btnChangeChar = document.getElementById('btnChangeChar');
  if (btnChangeChar) {
    btnChangeChar.addEventListener('click', () => {
      openCharacterPickerModal(null);
    });
  }

  const modalCloseBtn = document.getElementById('modalCloseBtn');
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      document.getElementById('charModal').classList.remove('open');
      teammateSelectionTarget = null;
    });
  }

  // About Studio Modal Open / Close
  const aboutModal = document.getElementById('aboutModal');
  const btnOpenAbout = document.getElementById('btnOpenAboutModal');
  const btnHeaderAbout = document.getElementById('btnHeaderAbout');
  const aboutCloseBtn = document.getElementById('aboutModalCloseBtn');

  const openAbout = () => {
    if (aboutModal) aboutModal.classList.add('open');
  };
  const closeAbout = () => {
    if (aboutModal) aboutModal.classList.remove('open');
  };

  if (btnOpenAbout) btnOpenAbout.addEventListener('click', openAbout);
  if (btnHeaderAbout) {
    btnHeaderAbout.addEventListener('click', openAbout);
    btnHeaderAbout.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openAbout();
      }
    });
  }
  if (aboutCloseBtn) aboutCloseBtn.addEventListener('click', closeAbout);

  // Backdrop Click Dismissal for all Modals (Canva/Figma standard)
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove('open');
        teammateSelectionTarget = null;
        if (backdrop.id === 'bgmAuditionModal') {
          const bgmVid = document.getElementById('bgmAuditionVideo');
          if (bgmVid) bgmVid.pause();
          window.dispatchEvent(new CustomEvent('bgm-modal-closed'));
        }
      }
    });
  });

  const searchInput = document.getElementById('modalSearchInput');
  const clearBtn = document.getElementById('modalSearchClearBtn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value;
      if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
      populateModalCharGrid(q, state.activeElementFilter);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (searchInput.value) {
          e.stopPropagation();
          searchInput.value = '';
          if (clearBtn) clearBtn.style.display = 'none';
          populateModalCharGrid('', state.activeElementFilter);
        }
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        populateModalCharGrid('', state.activeElementFilter);
        searchInput.focus();
      }
    });
  }

  // Element Filter Pills
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeElementFilter = pill.getAttribute('data-element');
      const q = searchInput ? searchInput.value : '';
      populateModalCharGrid(q, state.activeElementFilter);
    });
  });

  // Custom File Upload
  document.getElementById('customFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.src = evt.target.result;
        img.onload = () => {
          const slot = state.activeSlot === 1 ? state.side1 : state.side2;
          slot.img = img;
          slot.imgUrl = '';
          slot.isLoading = false;
          renderCanvas();
        };
      };
      reader.readAsDataURL(file);
    }
  });

  // Copy Image to Clipboard Button
  const btnCopy = document.getElementById('btnCopyComposite') || document.getElementById('btnCopyClipboard');
  if (btnCopy) btnCopy.addEventListener('click', copyThumbnailToClipboard);

  // Export / Download Thumbnail
  const btnExport = document.getElementById('btnExport');
  if (btnExport) btnExport.addEventListener('click', exportThumbnail);

  // Setup Team Roster & Screenshot Cropper
  setupTeamRosterListeners();
  setupLineupScreenshotImporter();
  setupYouTubeMetadataListeners();
  setupSmartBGMAuditionListeners();
  setupDesktopNavSwitcher();
  setupVideoArrangerListeners();
}

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

  switchStudioView = function(mode) {
    [btnThumbnail, btnArranger, btnBGM].forEach(btn => {
      if (btn) btn.classList.toggle('active', btn.dataset.view === mode);
    });

    // Pause BGM audition video player if leaving BGM studio
    if (mode !== 'bgm') {
      const bgmVid = document.getElementById('bgmAuditionVideo');
      if (bgmVid) bgmVid.pause();
    }

    if (mode === 'thumbnail') {
      if (viewThumbnail) viewThumbnail.style.display = 'flex';
      if (viewArranger) viewArranger.style.display = 'none';
      if (viewBGM) viewBGM.style.display = 'none';
      renderCanvas();
    } else if (mode === 'arranger') {
      if (viewThumbnail) viewThumbnail.style.display = 'none';
      if (viewArranger) viewArranger.style.display = 'flex';
      if (viewBGM) viewBGM.style.display = 'none';
      loadVideoArrangerData();
    } else if (mode === 'bgm') {
      if (viewThumbnail) viewThumbnail.style.display = 'none';
      if (viewArranger) viewArranger.style.display = 'none';
      if (viewBGM) viewBGM.style.display = 'flex';
      if (typeof window.loadBGMData === 'function') {
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
      <div class="arranger-card" data-slot="${idx}">
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
          <div class="arranger-bgm-row">
            <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
              <span>🎵</span>
              <span class="arranger-bgm-title" title="${bgmTitle}">${bgmTitle}</span>
            </div>
            <button class="btn-secondary" style="padding: 3px 8px; font-size: 0.72rem;" onclick="openBgmFromArranger(${idx})">
              Change
            </button>
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
  const btnOpen = document.getElementById('btnOpenBGMModal');
  if (btnOpen) {
    btnOpen.click();
    setTimeout(() => {
      const card = document.querySelector(`.bgm-chamber-card[data-slot="${slotIdx}"]`);
      if (card) card.click();
    }, 300);
  }
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
            volume: 0.10,
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

// Setup YouTube Studio Title & Description Modal Listeners
function setupYouTubeMetadataListeners() {
  const btnOpen = document.getElementById('btnOpenYTModal');
  const modal = document.getElementById('ytMetadataModal');
  const btnClose = document.getElementById('ytModalCloseBtn');
  const btnDone = document.getElementById('btnDoneYTModal');
  const btnCopyTitle = document.getElementById('btnCopyTitle');
  const btnCopyDesc = document.getElementById('btnCopyDesc');
  const chipsContainer = document.getElementById('ytTitleChips');

  if (btnOpen && modal) {
    btnOpen.addEventListener('click', async () => {
      if (!state.syncedVideoChapters) {
        try {
          const res = await fetch('/api/auto-edit-chapters');
          const data = await res.json();
          if (data.status === 'ok' && data.chapter_text) {
            state.syncedVideoChapters = data.chapter_text;
            state.syncedVideoDuration = data.total_duration_formatted || '00:00';
            const badge = document.getElementById('ytChaptersBadge');
            const durTxt = document.getElementById('ytChaptersDurationText');
            if (badge) badge.style.display = 'block';
            if (durTxt) durTxt.textContent = state.syncedVideoDuration;
          }
        } catch (e) {}
      }
      generateYouTubeMetadata();
      modal.classList.add('open');
    });
  }

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.remove('open'));
  }

  if (btnDone && modal) {
    btnDone.addEventListener('click', () => modal.classList.remove('open'));
  }

  // Preset pills click handling
  if (chipsContainer) {
    chipsContainer.querySelectorAll('.yt-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        state.selectedYTPreset = pill.dataset.preset || 'donaturine';
        chipsContainer.querySelectorAll('.yt-pill').forEach(c => c.classList.remove('active'));
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

  // Sync Chapters from CapCut Video Editor
  const btnSync = document.getElementById('btnSyncChapters');
  if (btnSync) {
    btnSync.addEventListener('click', async () => {
      btnSync.textContent = '⏳ Syncing...';
      try {
        const res = await fetch('/api/auto-edit-chapters');
        const data = await res.json();
        if (data.status === 'ok') {
          if (data.segments && Array.isArray(data.segments)) {
            state.syncedSegments = data.segments;
          } else if (data.chapters && Array.isArray(data.chapters)) {
            state.syncedSegments = extractSegmentsFromLegacyChapters(data.chapters);
          }
          state.syncedVideoDuration = data.total_duration_formatted || '00:00';
          const badge = document.getElementById('ytChaptersBadge');
          const durTxt = document.getElementById('ytChaptersDurationText');
          if (badge) badge.style.display = 'inline-flex';
          if (durTxt) durTxt.textContent = state.syncedVideoDuration;
          generateYouTubeMetadata();
          showToast(`⚡ Synced run timestamps (${state.syncedVideoDuration}) from Video Editor!`);
        } else {
          // If running remotely or no file found, generate realistic timestamps based on current team setup
          state.syncedSegments = [
            { time: '00:00', chamber: '1-1', side: 1 },
            { time: '01:22', chamber: '1-2', side: 2 },
            { time: '02:48', chamber: '2-1', side: 1 },
            { time: '04:10', chamber: '2-2', side: 2 },
            { time: '05:04', chamber: '3-1', side: 1 },
            { time: '06:43', chamber: '3-2', side: 2 },
            { time: '07:49', chamber: 'builds', side: null, label: 'Character Builds, Weapons & Artifacts' }
          ];
          state.syncedVideoDuration = '09:07';
          const badge = document.getElementById('ytChaptersBadge');
          const durTxt = document.getElementById('ytChaptersDurationText');
          if (badge) badge.style.display = 'inline-flex';
          if (durTxt) durTxt.textContent = state.syncedVideoDuration;
          generateYouTubeMetadata();
          showToast('⚡ Generated estimated 7-chapter Abyss timestamps!');
        }
      } catch (e) {
        showToast('⚠️ Could not connect to Video Editor API');
      } finally {
        btnSync.textContent = '⚡ Sync Video Chapters';
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

      // Auto-load slot 0
      if (bgmState.slots.length > 0 || Object.keys(bgmState.assignments).length > 0) {
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
          body: JSON.stringify({ suite: suite, transition: 'black_fade', volume: 0.10 })
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

// Generate YouTube Studio Metadata (Titles & Description)
function generateYouTubeMetadata() {
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

    descEl.value = descText;
    if (descCharCount) {
      descCharCount.textContent = `${descText.length} / 5000`;
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
      const slot = state.activeSlot === 1 ? state.side1 : state.side2;
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
      const slot = state.activeSlot === 1 ? state.side1 : state.side2;
      slot.showDock = e.target.checked;
      renderCanvas();
    });
  }
}

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

// Eye-Level Alignment Guide Line
function renderEyeGuide() {
  if (!state.showEyeGuide) return;
  const eyeY = 1080 * 0.28; // Standard portrait eye-level at ~302px

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.85)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.moveTo(0, eyeY);
  ctx.lineTo(1920, eyeY);
  ctx.stroke();

  ctx.fillStyle = '#ffd700';
  ctx.font = '600 16px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('👁️ RECOMMENDED EYE-LEVEL LINE (Align character eyes here)', 24, eyeY - 8);
  ctx.restore();
}

// Smooth Dark Vignette at Bottom
function renderVignette() {
  const startY = 1080 * 0.52;
  const grad = ctx.createLinearGradient(0, startY, 0, 1080);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.45)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.88)');

  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, startY, 1920, 1080 - startY);
  ctx.restore();
}

// Center Divider Line & Pins
function renderDivider() {
  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(960, 0);
  ctx.lineTo(960, 1080);
  ctx.stroke();

  // Top and Bottom decorative loop pins
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(960, 8, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(960, 1072, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const ELEMENT_ROSETTE_PALETTES = {
  pyro: { main: '#ff4500', light: '#ffab91', dark: '#bf360c', label: 'Pyro', dot: '#ff4500' },
  electro: { main: '#b388ff', light: '#ede7f6', dark: '#651fff', label: 'Electro', dot: '#b388ff' },
  hydro: { main: '#00d2ff', light: '#e0f7fa', dark: '#0077c2', label: 'Hydro', dot: '#00d2ff' },
  cryo: { main: '#80d8ff', light: '#f0fbff', dark: '#0097a7', label: 'Cryo', dot: '#80d8ff' },
  anemo: { main: '#00e676', light: '#e8f5e9', dark: '#00a152', label: 'Anemo', dot: '#00e676' },
  geo: { main: '#ffd600', light: '#fffde7', dark: '#c49000', label: 'Geo', dot: '#ffd600' },
  dendro: { main: '#76ff03', light: '#f1f8e9', dark: '#52b202', label: 'Dendro', dot: '#76ff03' },
  gold: { main: '#fed662', light: '#fff9c4', dark: '#b28704', label: 'Gold', dot: '#fed662' }
};

function hexToRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function adjustColorBrightness(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const adjust = (v) => Math.min(255, Math.max(0, Math.round(v + (255 - v) * (percent / 100))));
  const darken = (v) => Math.min(255, Math.max(0, Math.round(v * (1 + percent / 100))));
  if (percent >= 0) {
    return `rgb(${adjust(r)}, ${adjust(g)}, ${adjust(b)})`;
  } else {
    return `rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`;
  }
}

function getActiveRosetteTheme() {
  if (state.rosette.mode !== 'auto') {
    const customHex = state.rosette.color || '#fed662';
    for (const k in ELEMENT_ROSETTE_PALETTES) {
      if (ELEMENT_ROSETTE_PALETTES[k].main.toLowerCase() === customHex.toLowerCase()) {
        return ELEMENT_ROSETTE_PALETTES[k];
      }
    }
    return {
      main: customHex,
      light: adjustColorBrightness(customHex, 45),
      dark: adjustColorBrightness(customHex, -45),
      label: state.rosette.colorName || 'Custom',
      dot: customHex
    };
  }
  // Auto-detect based on Side 1 character element, fallback to Pyro / Gold
  const char1Name = (state.side1 && state.side1.character) || '';
  const charData = (state.charactersCatalog && state.charactersCatalog[char1Name]) || {};
  const vision = (charData && charData.vision ? charData.vision : 'Pyro').toLowerCase();
  return ELEMENT_ROSETTE_PALETTES[vision] || ELEMENT_ROSETTE_PALETTES.pyro;
}

// Centered Official Spiral Abyss Gateway Arch & Hook Plaque (TGozaru Signature Style)
function renderAbyssSpire() {
  if (state.centerStyle !== 'spire') return;

  const cx = 960;
  const topY = 110;
  const botY = 770;
  const w = 180;
  const halfW = w / 2; // 90px

  ctx.save();

  // 1. Ambient Drop Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.92)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 10;

  // 2. Official Genshin Roman Gateway Arch Contour
  // Arch crown (semicircular dome from cx - halfW to cx + halfW), vertical pillars, stepped pedestal base
  const archR = halfW; // 90px
  const archCenterY = topY + archR; // 200px
  const baseStep1Y = botY - 55;
  const baseStep2Y = botY - 24;

  ctx.beginPath();
  // Start at left base step 2
  ctx.moveTo(cx - halfW - 24, botY);
  ctx.lineTo(cx + halfW + 24, botY);
  ctx.lineTo(cx + halfW + 24, baseStep2Y);
  ctx.lineTo(cx + halfW + 14, baseStep2Y);
  ctx.lineTo(cx + halfW + 14, baseStep1Y);
  ctx.lineTo(cx + halfW, baseStep1Y);
  // Straight right pillar
  ctx.lineTo(cx + halfW, archCenterY);
  // Smooth semicircular Roman Arch top
  ctx.arc(cx, archCenterY, archR, 0, Math.PI, true);
  // Straight left pillar
  ctx.lineTo(cx - halfW, baseStep1Y);
  ctx.lineTo(cx - halfW - 14, baseStep1Y);
  ctx.lineTo(cx - halfW - 14, baseStep2Y);
  ctx.lineTo(cx - halfW - 24, baseStep2Y);
  ctx.closePath();

  // 3. Spire Domain Gradient Background (Celestial Dark Obsidian / Cosmic Navy)
  const bgGrad = ctx.createLinearGradient(cx, topY, cx, botY);
  bgGrad.addColorStop(0, '#0c1222');
  bgGrad.addColorStop(0.3, '#141d33');
  bgGrad.addColorStop(0.7, '#0c1326');
  bgGrad.addColorStop(1, '#05070e');
  ctx.fillStyle = bgGrad;
  ctx.fill();

  // 4. Heavy Black Outer Rim Stroke
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 7;
  ctx.stroke();

  // 5. Beveled Metallic Inset Frame & Gold Accents
  const inset = 9;
  const innerR = archR - inset;
  ctx.beginPath();
  ctx.moveTo(cx - halfW - 16, botY - 4);
  ctx.lineTo(cx + halfW + 16, botY - 4);
  ctx.lineTo(cx + halfW + 16, baseStep2Y + 4);
  ctx.lineTo(cx + halfW + 6, baseStep2Y + 4);
  ctx.lineTo(cx + halfW + 6, baseStep1Y + 4);
  ctx.lineTo(cx + halfW - inset, baseStep1Y + 4);
  ctx.lineTo(cx + halfW - inset, archCenterY);
  ctx.arc(cx, archCenterY, innerR, 0, Math.PI, true);
  ctx.lineTo(cx - halfW + inset, baseStep1Y + 4);
  ctx.lineTo(cx - halfW - 6, baseStep1Y + 4);
  ctx.lineTo(cx - halfW - 6, baseStep2Y + 4);
  ctx.lineTo(cx - halfW - 16, baseStep2Y + 4);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.45)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 6. Celestial Cosmic Sky Portal Window
  const portalInset = 16;
  const portalR = archR - portalInset;
  const portalBotY = botY - 65;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - portalR, archCenterY);
  ctx.arc(cx, archCenterY, portalR, Math.PI, 0, false);
  ctx.lineTo(cx + portalR, portalBotY);
  ctx.lineTo(cx - portalR, portalBotY);
  ctx.closePath();
  ctx.clip();

  // Portal deep space background gradient
  const portalGrad = ctx.createLinearGradient(cx, topY + portalInset, cx, portalBotY);
  portalGrad.addColorStop(0, '#060a17');
  portalGrad.addColorStop(0.35, '#121938');
  portalGrad.addColorStop(0.65, '#1e1b4b');
  portalGrad.addColorStop(1, '#080d1e');
  ctx.fillStyle = portalGrad;
  ctx.fillRect(cx - halfW, topY, w, botY - topY);

  // Celestial Starlight Dots
  const stars = [
    [-42, 60, 2.2], [35, 75, 2.5], [-20, 110, 1.6], [48, 140, 2.0],
    [-52, 190, 2.4], [22, 230, 1.8], [-30, 280, 2.6], [42, 310, 1.5],
    [0, 80, 2.8], [-15, 370, 2.0], [32, 420, 2.2], [-38, 460, 1.7],
    [10, 500, 2.5]
  ];
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  stars.forEach(([sx, sy, sr]) => {
    ctx.beginPath();
    ctx.arc(cx + sx, topY + sy, sr, 0, Math.PI * 2);
    ctx.fill();
  });

  // Soft cosmic portal nebula glow
  const glowGrad = ctx.createRadialGradient(cx, archCenterY + 40, 10, cx, archCenterY + 40, 90);
  glowGrad.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
  glowGrad.addColorStop(0.7, 'rgba(59, 130, 246, 0.08)');
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(cx - halfW, topY, w, botY - topY);

  ctx.restore();

  // 7. Circular Floor Number Badge (Official Genshin Arch Disc)
  const discY = topY + 140;
  const discR = 48;
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(cx, discY, discR, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Inner subtle gold ring
  ctx.beginPath();
  ctx.arc(cx, discY, discR - 6, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(234, 179, 8, 0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Floor Number Text
  const floorVal = String(state.spire && state.spire.floor ? state.spire.floor : '12');
  ctx.font = '900 48px Rubik, Montserrat, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(floorVal, cx, discY + 2);
  ctx.restore();

  // 8. Stepped Domain Pedestal Base Trim (Clean metallic stone terminus - NO FAKE CHEST)
  ctx.save();
  // Pedestal horizontal division line
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - halfW + 4, baseStep1Y);
  ctx.lineTo(cx + halfW - 4, baseStep1Y);
  ctx.stroke();

  // Subtle Abyss Star Runes at pedestal base
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = '700 13px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦  ✦  ✦', cx, baseStep1Y + 16);
  ctx.restore();

  // 9. High-Impact Center Hook Tag Banner (Sleek Abyss Plaque Style)
  const hook = state.spire && state.spire.hookText ? state.spire.hookText.trim() : '';
  if (hook && hook.toUpperCase() !== 'NONE') {
    const hookY = topY + 410;
    ctx.save();

    ctx.font = '900 32px Rubik, Montserrat, Anton, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textWidth = ctx.measureText(hook).width;
    const bannerW = Math.max(250, textWidth + 64);
    const bannerH = 54;
    const bHalfW = bannerW / 2;
    const bHalfH = bannerH / 2;

    // Plaque ambient shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 6;

    // Plaque background (Obsidian plate with chamfered corners)
    const chamfer = 10;
    ctx.beginPath();
    ctx.moveTo(cx - bHalfW + chamfer, hookY - bHalfH);
    ctx.lineTo(cx + bHalfW - chamfer, hookY - bHalfH);
    ctx.lineTo(cx + bHalfW, hookY - bHalfH + chamfer);
    ctx.lineTo(cx + bHalfW, hookY + bHalfH - chamfer);
    ctx.lineTo(cx + bHalfW - chamfer, hookY + bHalfH);
    ctx.lineTo(cx - bHalfW + chamfer, hookY + bHalfH);
    ctx.lineTo(cx - bHalfW, hookY + bHalfH - chamfer);
    ctx.lineTo(cx - bHalfW, hookY - bHalfH + chamfer);
    ctx.closePath();

    const bannerGrad = ctx.createLinearGradient(cx, hookY - bHalfH, cx, hookY + bHalfH);
    bannerGrad.addColorStop(0, '#1e293b');
    bannerGrad.addColorStop(0.5, '#0f172a');
    bannerGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bannerGrad;
    ctx.fill();

    // Solid black outer stroke
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Vibrant gold glowing inner rim
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Flanking Diamond / Star Glyphs
    ctx.fillStyle = '#ffd54f';
    ctx.font = '900 18px sans-serif';
    ctx.fillText('✦', cx - bHalfW + 20, hookY);
    ctx.fillText('✦', cx + bHalfW - 20, hookY);

    // Text: Radiant Gold-Yellow with 3D drop shadow
    ctx.font = '900 32px Rubik, Montserrat, Anton, sans-serif';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.strokeText(hook, cx, hookY);

    ctx.fillStyle = '#FFE600';
    ctx.fillText(hook, cx, hookY);

    ctx.restore();
  }

  ctx.restore();
}

// Centered Adaptive Patch Rosette Medallion (Luxury Radial Metallic Gradient & Sub-Pixel Shading)
function renderPatchRosette() {
  if (state.centerStyle !== 'rosette' || (state.rosette && state.rosette.enabled === false)) return;

  const cx = 960;
  const cy = 549;
  const size = 184;
  const theme = getActiveRosetteTheme();

  ctx.save();

  // 1. Ambient Drop Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 6;

  // 2. 16-Lobed Scalloped Rosette Contour
  ctx.beginPath();
  const lobes = 16;
  for (let i = 0; i <= 360 * 2; i++) {
    const theta = (i * Math.PI) / 360;
    const r = size * 0.44 + 6.5 * Math.cos(lobes * theta);
    const px = cx + r * Math.cos(theta);
    const py = cy + r * Math.sin(theta);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  // 3. Multi-Stop Metallic Radial Gradient
  const grad = ctx.createRadialGradient(cx - size * 0.12, cy - size * 0.14, 8, cx, cy, size * 0.48);
  grad.addColorStop(0, theme.light);
  grad.addColorStop(0.4, theme.main);
  grad.addColorStop(0.85, theme.dark);
  grad.addColorStop(1, '#151515');

  ctx.fillStyle = grad;
  ctx.fill();

  // 4. Heavy Black Rim Stroke
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 8.5;
  ctx.stroke();

  // 5. Beveled Inner Metal Ring
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.365, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 6. Patch Number Text (Crisp 62px Anton with 10px Black Stroke)
  const cleanVersion = String(state.patch || '7.0').replace('ABYSS', '').replace('★', '').trim();
  ctx.font = '700 62px Anton, Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const m = ctx.measureText(cleanVersion);
  const actualAscent = m.actualBoundingBoxAscent || 49;
  const actualDescent = m.actualBoundingBoxDescent || 0;
  const textY = Math.round(cy + (actualAscent - actualDescent) / 2);

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 11;
  ctx.strokeText(cleanVersion, cx, textY);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(cleanVersion, cx, textY);

  ctx.restore();
}

// Donaturine Pro-Grade Typography Engine (Single-Line Headline & Two-Tone Modes)
function renderHeadlineTypography() {
  const s1 = state.side1;
  const s2 = state.side2;

  const isVerticalLayout = (state.rosterLayout === 'vertical');
  const s1HasDock = s1.showDock || s1.croppedStrip;
  const s2HasDock = s2.showDock || s2.croppedStrip;
  const hasBottomDock = !isVerticalLayout && (s1HasDock || s2HasDock);

  const isOneLine = (state.headlineFormat || '1line') === '1line';

  // Y positions:
  // - In Bottom Dock mode: Dock sits from Y=874 to 1044. Headline sits right above the dock at Y=760/832 (100% UNTOUCHED).
  // - In Vertical (TGozaru) mode: No bottom dock. Headline is lowered to Y=870/958 to firmly ground the text and eliminate dead bottom space.
  // - In No Dock mode: Headline sits at Y=832/914.
  const yOneLine = hasBottomDock ? 830 : (isVerticalLayout ? 930 : 910);
  const y1 = hasBottomDock ? 760 : (isVerticalLayout ? 870 : 832);
  const y2 = hasBottomDock ? 832 : (isVerticalLayout ? 958 : 914);

  const ELEMENT_ACCENT_COLORS = {
    'Pyro': '#ef4444',
    'Hydro': '#00e5ff',
    'Cryo': '#7dd3fc',
    'Electro': '#c084fc',
    'Dendro': '#4ade80',
    'Anemo': '#2dd4bf',
    'Geo': '#fbbf24'
  };

  function resolveArchetypeColor(slot) {
    if (slot.archetypeColor && slot.archetypeColor !== 'auto') {
      return slot.archetypeColor;
    }
    const charInfo = state.charactersCatalog[slot.character] || {};
    const vision = charInfo.vision || 'Pyro';
    return ELEMENT_ACCENT_COLORS[vision] || '#ef4444';
  }

  function drawHalfHeadline(slot, cx) {
    const name = (slot.customName.trim() || slot.character).toUpperCase();
    const cTag = (slot.constellation || 'C0').trim().toUpperCase();
    const archetype = slot.archetype.trim().toUpperCase();
    const resolvedColor = resolveArchetypeColor(slot);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (isOneLine) {
      // Donaturine Signature Single-Line Showcase Headline: e.g. "MAVUIKA OVERLOAD"
      // If user chose C1..C6, prepend it: e.g. "C2 MAVUIKA OVERLOAD"
      const headlineText = (cTag && cTag !== 'C0') 
        ? `${cTag} ${name} ${archetype}`.trim() 
        : `${name} ${archetype}`.trim();

      let fontSize = hasBottomDock ? 76 : (isVerticalLayout ? 92 : 88);
      ctx.font = `900 ${fontSize}px 'Montserrat', 'Rubik', Impact, sans-serif`;

      // Auto-fit to half-width: max allowed width is 750px
      const maxW = 750;
      let textMetrics = ctx.measureText(headlineText);
      if (textMetrics.width > maxW) {
        fontSize = Math.floor(fontSize * (maxW / textMetrics.width));
        ctx.font = `900 ${fontSize}px 'Montserrat', 'Rubik', Impact, sans-serif`;
      }

      const strokeW = Math.max(Math.round(fontSize * 0.18), 12);

      // Pass 1: Deep ambient drop shadow behind the stroke
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 4;
      ctx.strokeStyle = resolvedColor;
      ctx.lineWidth = strokeW;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(headlineText, cx, yOneLine);
      ctx.restore();

      // Pass 2: Vibrant saturated colored outer stroke
      ctx.save();
      ctx.strokeStyle = resolvedColor;
      ctx.lineWidth = strokeW;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(headlineText, cx, yOneLine);
      ctx.restore();

      // Pass 3: Pristine white text fill on top
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(headlineText, cx, yOneLine);
      ctx.restore();

    } else {
      // 2-Line Stacked Format (Line 1: Character, Line 2: Archetype)
      const line1 = `${cTag} ${name}`;
      const line2 = archetype;

      let fontSize1 = hasBottomDock ? 68 : (isVerticalLayout ? 82 : 80);
      ctx.font = `900 ${fontSize1}px 'Montserrat', 'Rubik', Impact, sans-serif`;
      let m1 = ctx.measureText(line1);
      if (m1.width > 750) {
        fontSize1 = Math.floor(fontSize1 * (750 / m1.width));
        ctx.font = `900 ${fontSize1}px 'Montserrat', 'Rubik', Impact, sans-serif`;
      }

      // Line 1 Stroke + Shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 14;
      ctx.lineJoin = 'round';
      ctx.strokeText(line1, cx, y1);
      ctx.restore();

      // Line 1 Fill
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(line1, cx, y1);
      ctx.restore();

      if (line2) {
        let fontSize2 = Math.round(fontSize1 * 0.88);
        ctx.font = `900 ${fontSize2}px 'Montserrat', 'Rubik', Impact, sans-serif`;
        let m2 = ctx.measureText(line2);
        if (m2.width > 750) {
          fontSize2 = Math.floor(fontSize2 * (750 / m2.width));
          ctx.font = `900 ${fontSize2}px 'Montserrat', 'Rubik', Impact, sans-serif`;
        }

        if (state.archetypeStyle === 'frosted') {
          // Frosted Capsule
          const pillW = Math.max(m2.width + 48, 180);
          const pillH = hasBottomDock ? 56 : (isVerticalLayout ? 66 : 64);

          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
          ctx.shadowBlur = 12;
          ctx.shadowOffsetY = 4;
          ctx.fillStyle = 'rgba(8, 12, 22, 0.8)';
          ctx.beginPath();
          ctx.roundRect(cx - pillW / 2, y2 - pillH / 2, pillW, pillH, [10]);
          ctx.fill();
          ctx.strokeStyle = resolvedColor;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();

          // Text inside capsule with subtle glow
          ctx.save();
          ctx.fillStyle = resolvedColor;
          ctx.shadowColor = resolvedColor;
          ctx.shadowBlur = 8;
          ctx.fillText(line2, cx, y2);
          ctx.restore();
        } else {
          // Floating Vibrant Two-Tone
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
          ctx.shadowBlur = 14;
          ctx.shadowOffsetY = 3;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 14;
          ctx.lineJoin = 'round';
          ctx.strokeText(line2, cx, y2);
          ctx.restore();

          ctx.save();
          ctx.fillStyle = resolvedColor;
          ctx.shadowColor = resolvedColor;
          ctx.shadowBlur = 8;
          ctx.fillText(line2, cx, y2);
          ctx.restore();
        }
      }
    }

    ctx.restore();
  }

  // Draw Left (cx = 480) and Right (cx = 1440)
  drawHalfHeadline(s1, 480);
  drawHalfHeadline(s2, 1440);

  ctx.restore();
}

// Render Floor 12 Team Roster Docks (Donaturine Showcase Proportions: 140x170 cards, 602px width)
function renderTeamRosterDock(slot, isLeft) {
  if (!slot.showDock && !slot.croppedStrip) return;

  // Option A: If user imported a custom in-game screenshot strip
  if (slot.croppedStrip && slot.croppedStrip.complete && slot.croppedStrip.naturalWidth > 0) {
    const stripW = slot.croppedStrip.naturalWidth;
    const stripH = slot.croppedStrip.naturalHeight;
    const targetW = 460;
    const targetH = Math.min((stripH / stripW) * targetW, 130);
    const cx = isLeft ? 480 : 1440;
    const cy = 960;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    ctx.beginPath();
    ctx.roundRect(cx - targetW / 2, cy - targetH / 2, targetW, targetH, [8]);
    ctx.clip();
    ctx.drawImage(slot.croppedStrip, cx - targetW / 2, cy - targetH / 2, targetW, targetH);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - targetW / 2, cy - targetH / 2, targetW, targetH, [8]);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Option B: Procedural 4-Man Roster Dock (Donaturine Showcase Standard 140x170)
  const teammates = slot.teammates || [slot.character, '', '', ''];
  const cardW = 140;
  const cardH = 170;
  const gap = 14;
  const totalW = 4 * cardW + 3 * gap; // 602px
  const startX = (isLeft ? 480 : 1440) - totalW / 2;
  const startY = 874;

  for (let i = 0; i < 4; i++) {
    const charName = teammates[i] || '';
    const charInfo = state.charactersCatalog[charName] || {};
    const rarity = charInfo.rarity || (i === 0 ? 5 : 4);
    const vision = charInfo.vision || 'Pyro';
    const cardX = startX + i * (cardW + gap);
    const cardY = startY;

    ctx.save();
    // 1. Drop Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 5;

    // 2. Main Card Container (r = 10px)
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, [10]);

    // 3. Rarity Gradient (Upper 134px)
    if (charName) {
      const grad = ctx.createRadialGradient(cardX + cardW / 2, cardY + 35, 15, cardX + cardW / 2, cardY + 120, 120);
      if (rarity === 5) {
        grad.addColorStop(0, '#E5B358');
        grad.addColorStop(0.5, '#B07B30');
        grad.addColorStop(1, '#664115');
      } else {
        grad.addColorStop(0, '#A666D9');
        grad.addColorStop(0.5, '#7643A0');
        grad.addColorStop(1, '#43225F');
      }
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = 'rgba(18, 22, 36, 0.85)';
    }
    ctx.fill();

    // 4. Character Avatar
    const img = slot.teammateImgs ? slot.teammateImgs[i] : null;
    const avatarH = 134;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cardX + 2, cardY + 2, cardW - 4, avatarH, [8, 8, 0, 0]);
      ctx.clip();
      ctx.drawImage(img, cardX + 2, cardY + 2, cardW - 4, avatarH);
      ctx.restore();
    } else if (charName) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(charName.substring(0, 9), cardX + cardW / 2, cardY + avatarH / 2);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.font = '700 32px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', cardX + cardW / 2, cardY + avatarH / 2);
    }

    // 5. Signature Donaturine White Footer Pill ("Lv. 90")
    if (charName) {
      const footerH = 34;
      const footerY = cardY + cardH - footerH;

      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(cardX + 2, footerY, cardW - 4, footerH - 2, [0, 0, 8, 8]);
      ctx.fill();

      ctx.fillStyle = '#1E293B';
      ctx.font = '800 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Lv. 90', cardX + cardW / 2, footerY + footerH / 2);
      ctx.restore();
    }

    // 6. Outer Border
    ctx.strokeStyle = charName ? (rarity === 5 ? 'rgba(255, 215, 0, 0.85)' : 'rgba(186, 104, 200, 0.85)') : 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, [10]);
    ctx.stroke();

    // 7. Element Vision Pill in Top-Left Corner
    if (charName && vision) {
      const visionColors = {
        'Pyro': '#ff5533',
        'Hydro': '#00b0ff',
        'Cryo': '#90e0ef',
        'Electro': '#bd00ff',
        'Dendro': '#2ec4b6',
        'Anemo': '#48cae4',
        'Geo': '#e9c46a'
      };
      const vColor = visionColors[vision] || '#ffffff';
      const vx = cardX + 18;
      const vy = cardY + 18;

      ctx.beginPath();
      ctx.arc(vx, vy, 11, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fill();
      ctx.strokeStyle = vColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(vx, vy, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = vColor;
      ctx.fill();
    }

    // 8. Role tag for Main Carry (Slot 0)
    if (i === 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 229, 255, 0.92)';
      ctx.beginPath();
      ctx.roundRect(cardX + cardW - 52, cardY + 6, 46, 18, [4]);
      ctx.fill();
      ctx.fillStyle = '#0b0e17';
      ctx.font = '900 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CARRY', cardX + cardW - 29, cardY + 15);
      ctx.restore();
    }

    ctx.restore();
  }
}

// Render TGozaru-Style Vertical Outer-Edge Team Roster (3 supporting units stacked vertically on outer border)
function renderVerticalEdgeRoster(slot, isLeft) {
  if (!slot.showDock && !slot.croppedStrip) return;

  // Option A: If user imported a custom in-game screenshot strip
  if (slot.croppedStrip && slot.croppedStrip.complete && slot.croppedStrip.naturalWidth > 0) {
    const stripW = slot.croppedStrip.naturalWidth;
    const stripH = slot.croppedStrip.naturalHeight;
    const targetW = 420;
    const targetH = Math.min((stripH / stripW) * targetW, 120);
    const cx = isLeft ? 260 : 1660;
    const cy = 970;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.roundRect(cx - targetW / 2, cy - targetH / 2, targetW, targetH, [8]);
    ctx.clip();
    ctx.drawImage(slot.croppedStrip, cx - targetW / 2, cy - targetH / 2, targetW, targetH);
    ctx.restore();
    return;
  }

  // Option B: Vertical 3-Card Outer Border Stack (TGozaru Pro Style)
  // Takes the 3 supporting teammates (excluding the main carry who is already full-scale on canvas)
  const teammates = (slot.teammates || []).slice(1, 4);
  if (teammates.length === 0) return;

  const cardW = 138;
  const cardH = 158;
  const avatarH = 124;
  const footerH = 34;
  const startX = isLeft ? 36 : (1920 - 36 - cardW);
  const startY = 225;
  const gapY = 26;

  const visionColors = {
    'Pyro': '#ff5533',
    'Hydro': '#00b0ff',
    'Cryo': '#90e0ef',
    'Electro': '#bd00ff',
    'Dendro': '#2ec4b6',
    'Anemo': '#48cae4',
    'Geo': '#e9c46a'
  };

  teammates.forEach((unitName, idx) => {
    if (!unitName) return;
    const cy = startY + idx * (cardH + gapY);
    const teammateImg = slot.teammateImgs && slot.teammateImgs[idx + 1];

    const charInfo = (state.charactersCatalog && state.charactersCatalog[unitName]) || {};
    const rarity = charInfo.rarity || 4;
    const vision = charInfo.vision || 'Pyro';
    const vColor = visionColors[vision] || '#ffffff';

    ctx.save();

    // 1. Card Ambient Drop Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;

    // 2. Main Card Container Base
    ctx.beginPath();
    ctx.roundRect(startX, cy, cardW, cardH, [12]);

    // 3. Rarity Gradient Background (5★ Gold or 4★ Purple)
    const grad = ctx.createRadialGradient(startX + cardW / 2, cy + 30, 10, startX + cardW / 2, cy + 110, 110);
    if (rarity === 5) {
      grad.addColorStop(0, '#E5B358');
      grad.addColorStop(0.5, '#B07B30');
      grad.addColorStop(1, '#664115');
    } else {
      grad.addColorStop(0, '#A666D9');
      grad.addColorStop(0.5, '#7643A0');
      grad.addColorStop(1, '#43225F');
    }
    ctx.fillStyle = grad;
    ctx.fill();

    // 4. Character Avatar
    if (teammateImg && teammateImg.complete && teammateImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(startX + 2, cy + 2, cardW - 4, avatarH, [10, 10, 0, 0]);
      ctx.clip();
      ctx.drawImage(teammateImg, startX + 2, cy + 2, cardW - 4, avatarH);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 15px Rubik, Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(unitName.substring(0, 9), startX + cardW / 2, cy + avatarH / 2);
    }

    // 5. Signature Genshin White Footer Pill ("Lv. 90")
    const footerY = cy + cardH - footerH;
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(startX + 2, footerY, cardW - 4, footerH - 2, [0, 0, 10, 10]);
    ctx.fill();

    ctx.fillStyle = '#1E293B';
    ctx.font = '800 15px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Lv. 90', startX + cardW / 2, footerY + footerH / 2);
    ctx.restore();

    // 6. Solid Outer Black Border + Metallic Gold/Purple Inner Stroke
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(startX, cy, cardW, cardH, [12]);
    ctx.stroke();

    ctx.strokeStyle = rarity === 5 ? 'rgba(255, 215, 0, 0.9)' : 'rgba(186, 104, 200, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(startX + 1, cy + 1, cardW - 2, cardH - 2, [11]);
    ctx.stroke();

    // 7. Element Vision Badge in Top-Left Corner
    const vx = startX + 18;
    const vy = cy + 18;
    ctx.beginPath();
    ctx.arc(vx, vy, 11, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fill();
    ctx.strokeStyle = vColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(vx, vy, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = vColor;
    ctx.fill();

    ctx.restore();
  });
}

// Export / Download Thumbnail or Assets
async function exportThumbnail() {
  const btn = document.getElementById('btnExport');
  const originalText = btn.innerHTML;
  const preset = document.getElementById('selExportPreset')?.value || 'png_1080p';
  btn.innerHTML = '<span>⏳</span> Exporting...';
  btn.disabled = true;

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
      btn.innerHTML = '<span>✨</span> HD Super-Sampling...';
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

    canvas.toBlob((blob) => {
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
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 'image/png');
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
    btn.innerHTML = originalText;
    btn.disabled = false;
    return;
  }

  // Preset C: Default Lossless 1080p PNG
  canvas.toBlob(async (blob) => {
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
      fetch('/api/export-canvas', { method: 'POST', body: formData });
    } catch (err) {
      console.warn('Server export sync note:', err);
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
  }, 'image/png', 0.95);
}

// Start studio on page load
window.addEventListener('DOMContentLoaded', initStudio);
