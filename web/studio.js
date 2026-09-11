/**
 * Genshin Impact Spiral Abyss Thumbnail Studio - Client Engine
 * Features Canva-style direct touch/mouse manipulation, 60fps local rendering,
 * dynamic HoYoWiki official gallery filmstrip, keyboard shortcuts, and clipboard export.
 * Version: 2.3
 */

// Canvas & Context
const canvas = document.getElementById('thumbnailCanvas');
const ctx = canvas.getContext('2d');

// State
const state = {
  floor: '12',
  patch: '7.0',
  showFloorBadge: false, // Default: OFF for clean, modern showcase thumbnail
  activeSlot: 1, // 1 for Left, 2 for Right (0 for Export / Deselected)
  showEyeGuide: false,
  activeElementFilter: 'all',
  archetypeStyle: 'floating', // 'floating' (Donaturine Two-Tone) or 'frosted' (Capsule)
  headlineFormat: '1line', // '1line' (Donaturine Signature: [NAME] [ARCHETYPE]) or '2line'
  selectedYTPreset: 'donaturine',
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

// Meta 4-Character Roster Compositions (Sireula, Gust21, Shenhe standard)
const META_TEAMS = {
  'Skirk': ['Skirk', 'Furina', 'Escoffier', 'Kazuha'],
  'Columbina': ['Columbina', 'Furina', 'Yelan', 'Jean'],
  'Varesa': ['Varesa', 'Chevreuse', 'Fischl', 'Bennett'],
  'Escoffier': ['Escoffier', 'Skirk', 'Furina', 'Kazuha'],
  'Citlali': ['Citlali', 'Mavuika', 'Bennett', 'Xilonen'],
  'Kachina': ['Kachina', 'Mavuika', 'Xilonen', 'Bennett'],
  'Lan Yan': ['Lan Yan', 'Furina', 'Fischl', 'Bennett'],
  'Dahlia': ['Dahlia', 'Hu Tao', 'Yelan', 'Zhongli'],
  'Wriothesley': ['Wriothesley', 'Xiangling', 'Bennett', 'Shenhe'],
  'Hu Tao': ['Hu Tao', 'Xingqiu', 'Yelan', 'Zhongli'],
  'Clorinde': ['Clorinde', 'Chevreuse', 'Fischl', 'Bennett'],
  'Zhongli': ['Zhongli', 'Albedo', 'Chiori', 'Gorou'],
  'Navia': ['Navia', 'Zhongli', 'Xiangling', 'Bennett'],
  'Neuvillette': ['Neuvillette', 'Furina', 'Kazuha', 'Baizhu'],
  'Arlecchino': ['Arlecchino', 'Yelan', 'Bennett', 'Kazuha'],
  'Furina': ['Furina', 'Neuvillette', 'Kazuha', 'Baizhu'],
  'Chasca': ['Chasca', 'Furina', 'Bennett', 'Ororon'],
  'Mavuika': ['Mavuika', 'Iansan', 'Chevreuse', 'Ororon'],
  'Flins': ['Flins', 'Furina', 'Fischl', 'Jean'],
  'Lohen': ['Lohen', 'Shenhe', 'Kazuha', 'Kokomi'],
  'Sandrone': ['Sandrone', 'Mizuki', 'Furina', 'Kazuha'],
  'Raiden': ['Raiden', 'Sara', 'Kazuha', 'Bennett'],
  'Raiden Shogun': ['Raiden Shogun', 'Sara', 'Kazuha', 'Bennett'],
  'Alhaitham': ['Alhaitham', 'Nahida', 'Xingqiu', 'Kuki Shinobu'],
  'Nilou': ['Nilou', 'Nahida', 'Kokomi', 'Collei'],
  'Ayaka': ['Ayaka', 'Shenhe', 'Kazuha', 'Kokomi'],
  'Kinich': ['Kinich', 'Emilie', 'Bennett', 'Xiangling'],
  'Vesna': ['Vesna', 'Yelan', 'Bennett', 'Kazuha'],
  'Mualani': ['Mualani', 'Xiangling', 'Sucrose', 'Zhongli']
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
  'Raiden Shogun': ['NATIONAL', 'HYPERCARRY', 'HYPERBLOOM', 'AGGRO-SPREAD'],
  'Nahida': ['HYPERBLOOM', 'BURGEON', 'SPREAD', 'NILOU BLOOM'],
  'Alhaitham': ['QUICKBLOOM', 'SPREAD', 'HYPERBLOOM', 'HYPERCARRY'],
  'Kazuha': ['VV SWIRL', 'MONO ELEMENT', 'AGGRO-SPREAD', 'FREEZE'],
  'Yelan': ['DOUBLE HYDRO', 'VAPORIZE', 'HYPERBLOOM', 'TAZER'],
  'Xiao': ['HYPERCARRY', 'PLUNGE', 'FARUZAN CORE', 'DOUBLE GEO'],
  'Kinich': ['BURGEON', 'BURNING', 'HYPERCARRY', 'QUICKBLOOM'],
  'Xilonen': ['RES SHRED', 'GEO CORE', 'CRYSTALLIZE', 'HYPERCARRY']
};

const GENERIC_ARCHETYPES = ['HYPERCARRY', 'VAPORIZE', 'MELT', 'AGGRAVATE', 'BLOOM', 'MONO ELEMENT'];

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
async function initStudio() {
  await loadAssets();

  // Ensure custom Anton & Inter fonts are ready before initial rendering
  try {
    await document.fonts.ready;
  } catch (e) {
    console.warn('Font loading check skipped:', e);
  }

  await loadCharactersCatalog();

  // Setup DOM Event Listeners & Keyboard Shortcuts
  setupDOMListeners();
  setupCanvasInteraction();
  setupKeyboardShortcuts();

  // Load default characters (Mavuika & Chasca)
  await selectCharacterForSlot(1, 'Mavuika', false);
  await selectCharacterForSlot(2, 'Chasca', false);

  updateSidebarUI();
  updateZoomUI();
  renderCanvas();
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

// Load 130 Characters
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
    // Use high-speed local avatar endpoint first
    img.src = `/api/avatar/${encodeURIComponent(name)}`;
    img.onload = () => renderCanvas();
    img.onerror = () => {
      // Fallback to proxy if local file missing
      const info = state.charactersCatalog[name];
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
  slot.isLoading = true;

  // Update Teammates: Slot 0 always tracks the active main character
  if (!slot.teammates) slot.teammates = [charName, '', '', ''];
  slot.teammates[0] = charName;

  // Auto-fill meta synergy team if currently empty/single
  if (META_TEAMS[charName]) {
    slot.teammates = [...META_TEAMS[charName]];
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
    if (avatarEl) avatarEl.src = charInfo.icon || '';
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

  // 2. RENDER IMMEDIATELY so headline text ("C0 LOHEN OVERVAPE") changes in 0ms!
  updateZoomUI();
  renderCanvas();

  // 3. Asynchronously fetch Gallery Illustrations from API (<2ms from cache)
  try {
    const res = await fetch(`/api/character-images/${encodeURIComponent(charName)}`);
    if (res.ok) {
      const images = await res.json();
      slot.gallery = images || [];

      // If this slot is currently active in the sidebar, render filmstrip immediately!
      if (state.activeSlot === slotNum) {
        renderGalleryFilmstrip(slot.gallery, slot.imgUrl);
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
        slot.img = null;
        slot.imgUrl = '';
        slot.isLoading = false;
        renderCanvas();
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
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const slot = state.activeSlot === 1 ? state.side1 : state.side2;
    const zoomFactor = e.deltaY < 0 ? 1.06 : 0.94;
    slot.scale = Math.min(Math.max(slot.scale * zoomFactor, 0.25), 4.5);
    updateZoomUI();
    renderCanvas();
  }, { passive: false });
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
  document.getElementById('charAvatarImg').src = charInfo.icon || '';

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
      if (tName && info.icon) {
        img.src = info.icon;
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
  const list = META_ARCHETYPES[charName] || GENERIC_ARCHETYPES;

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
    avatar.src = info.icon || '';
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

// Setup Keyboard Shortcuts for Creator Ergonomics
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Ignore if typing in input fields
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

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
        break;
      case 'Z':
        slot.scale = Math.max(slot.scale - 0.05, 0.25);
        updateZoomUI();
        renderCanvas();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        slot.panX -= nudge;
        renderCanvas();
        break;
      case 'ArrowRight':
        e.preventDefault();
        slot.panX += nudge;
        renderCanvas();
        break;
      case 'ArrowUp':
        e.preventDefault();
        slot.panY -= nudge;
        renderCanvas();
        break;
      case 'ArrowDown':
        e.preventDefault();
        slot.panY += nudge;
        renderCanvas();
        break;
    }
  });
}

// Setup DOM Event Listeners
function setupDOMListeners() {
  document.getElementById('tabSide1').addEventListener('click', () => setActiveSlot(1));
  document.getElementById('tabSide2').addEventListener('click', () => setActiveSlot(2));

  // Global Floor & Patch Inputs (Desktop & Mobile Sync)
  const floorInput = document.getElementById('floorInput');
  const mobileFloorInput = document.getElementById('mobileFloorInput');
  const handleFloorChange = (val) => {
    state.floor = val;
    if (floorInput && floorInput.value !== val) floorInput.value = val;
    if (mobileFloorInput && mobileFloorInput.value !== val) mobileFloorInput.value = val;
    renderCanvas();
  };
  if (floorInput) floorInput.addEventListener('input', (e) => handleFloorChange(e.target.value));
  if (mobileFloorInput) mobileFloorInput.addEventListener('input', (e) => handleFloorChange(e.target.value));

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

  // Floor 12 Badge Toggle (Default: OFF)
  const floorBadgeBtn = document.getElementById('tbFloorBadge');
  const mobileFloorBadgeBtn = document.getElementById('mobileTbFloorBadge');
  const updateFloorBadgeButtons = () => {
    if (floorBadgeBtn) {
      floorBadgeBtn.classList.toggle('active', state.showFloorBadge);
      floorBadgeBtn.innerHTML = state.showFloorBadge ? '🏷️ Floor Badge: ON' : '🏷️ Floor Badge: OFF';
    }
    if (mobileFloorBadgeBtn) {
      mobileFloorBadgeBtn.classList.toggle('active', state.showFloorBadge);
      mobileFloorBadgeBtn.innerHTML = state.showFloorBadge ? '🏷️ Floor: ON' : '🏷️ Floor: OFF';
    }
  };
  const toggleFloorBadge = () => {
    state.showFloorBadge = !state.showFloorBadge;
    updateFloorBadgeButtons();
    renderCanvas();
  };
  if (floorBadgeBtn) floorBadgeBtn.addEventListener('click', toggleFloorBadge);
  if (mobileFloorBadgeBtn) mobileFloorBadgeBtn.addEventListener('click', toggleFloorBadge);

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

  // Modal Picker
  document.getElementById('btnChangeChar').addEventListener('click', () => {
    document.getElementById('charModal').classList.add('open');
    document.getElementById('modalSearchInput').focus();
  });
  document.getElementById('modalCloseBtn').addEventListener('click', () => {
    document.getElementById('charModal').classList.remove('open');
  });
  document.getElementById('modalSearchInput').addEventListener('input', (e) => {
    populateModalCharGrid(e.target.value, state.activeElementFilter);
  });

  // Element Filter Pills
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeElementFilter = pill.getAttribute('data-element');
      const q = document.getElementById('modalSearchInput').value;
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
  document.getElementById('btnCopyClipboard').addEventListener('click', copyThumbnailToClipboard);

  // Export / Download Thumbnail
  document.getElementById('btnExport').addEventListener('click', exportThumbnail);

  // Setup Team Roster & Screenshot Cropper
  setupTeamRosterListeners();
  setupLineupScreenshotImporter();
  setupYouTubeMetadataListeners();
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
    btnOpen.addEventListener('click', () => {
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

  // Preset chips click handling
  if (chipsContainer) {
    chipsContainer.querySelectorAll('.yt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        state.selectedYTPreset = chip.dataset.preset || 'donaturine';
        chipsContainer.querySelectorAll('.yt-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
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

  // 1. Title Presets
  const titleDonaturine = `${p} Spiral Abyss!! | ${c1} ${name1} ${arch1} & ${c2} ${name2} ${arch2} | Genshin Impact`;
  const titleGust21 = `${c1} ${name1} ${arch1} & ${c2} ${name2} ${arch2} | Spiral Abyss ${p} Floor 12 | Genshin Impact`;
  const titleSireula = `${c1} ${name1} ${arch1} and ${c2} ${name2} ${arch2} | Genshin Impact Abyss ${p} Floor 12 9 Stars`;
  const titleHype = `${c1} ${name1.toUpperCase()} ${arch1.toUpperCase()} & ${c2} ${name2.toUpperCase()} DESTROY FLOOR 12! | Genshin Impact ${p} Spiral Abyss 9★`;

  // Update chip text displays
  const chipD = document.getElementById('chipTitleDonaturine');
  const chipG = document.getElementById('chipTitleGust21');
  const chipS = document.getElementById('chipTitleSireula');
  const chipH = document.getElementById('chipTitleHype');
  if (chipD) chipD.textContent = titleDonaturine;
  if (chipG) chipG.textContent = titleGust21;
  if (chipS) chipS.textContent = titleSireula;
  if (chipH) chipH.textContent = titleHype;

  // Active Title Input
  const titleInput = document.getElementById('ytTitleOutput');
  if (titleInput) {
    let chosenTitle = titleDonaturine;
    if (state.selectedYTPreset === 'gust21') chosenTitle = titleGust21;
    else if (state.selectedYTPreset === 'sireula') chosenTitle = titleSireula;
    else if (state.selectedYTPreset === 'hype') chosenTitle = titleHype;
    titleInput.value = chosenTitle;
  }

  // 2. Format Description with Timestamps, Team Lineups, and Tags
  const descEl = document.getElementById('ytDescriptionOutput');
  if (descEl) {
    const t1 = (s1.teammates || []).filter(Boolean).join(' • ') || name1;
    const t2 = (s2.teammates || []).filter(Boolean).join(' • ') || name2;
    const tag1 = `#${name1.replace(/[^a-zA-Z0-9]/g, '')}`;
    const tag2 = `#${name2.replace(/[^a-zA-Z0-9]/g, '')}`;

    const descText = 
`Genshin Impact Version ${p} Spiral Abyss Floor 12 9-Star Full Clear showcase featuring ${c1} ${name1} (${arch1}) on First Half and ${c2} ${name2} (${arch2}) on Second Half!

⏱️ TIMESTAMPS:
00:00 - Chamber 1-1 (${name1} ${arch1})
00:55 - Chamber 1-2 (${name2} ${arch2})
01:50 - Chamber 2-1 (${name1} ${arch1})
02:45 - Chamber 2-2 (${name2} ${arch2})
03:40 - Chamber 3-1 (${name1} ${arch1})
04:35 - Chamber 3-2 (${name2} ${arch2})
05:30 - Builds, Artifacts & Team Stats

⚔️ FIRST HALF TEAM (${arch1}):
• Lineup: ${t1}
• Main Carry: ${c1} ${name1}

⚔️ SECOND HALF TEAM (${arch2}):
• Lineup: ${t2}
• Main Carry: ${c2} ${name2}

If you enjoyed the run or found this rotation helpful, please drop a like and subscribe for more Genshin Impact Spiral Abyss showcases and meta guide gameplay!

#GenshinImpact #SpiralAbyss #Floor12 ${tag1} ${tag2} #Genshin`;

    descEl.value = descText;
  }
}

// Setup Team Roster Controls
function setupTeamRosterListeners() {
  for (let i = 1; i <= 3; i++) {
    const card = document.querySelector(`.teammate-slot-card[data-slot="${i}"]`);
    if (card) {
      card.addEventListener('click', () => {
        teammateSelectionTarget = { slot: state.activeSlot, teammateIdx: i };
        document.getElementById('charModal').classList.add('open');
        document.getElementById('modalSearchInput').focus();
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
  const btn = document.getElementById('btnCopyClipboard');
  const origText = btn.innerHTML;
  btn.innerHTML = '⏳ Copying...';

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
    btn.innerHTML = origText;

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

  // 7. Render Floor 12 Badge (Top Left)
  renderFloorBadge();

  // 8. Render Centered Golden Patch Rosette Medallion (EXACT OPTICAL SUB-PIXEL CENTERING)
  renderPatchRosette();

  // 9. Render Bold Anton Headline Typography
  renderHeadlineTypography();

  // 10. Render Floor 12 Team Roster Docks (Sireula / Gust21 / Shenhe standard)
  renderTeamRosterDock(state.side1, true);
  renderTeamRosterDock(state.side2, false);

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

// Floor 12 Emblem (Top-Left)
function renderFloorBadge() {
  if (!state.showFloorBadge) return;
  const cx = 125;
  const cy = 135;
  const size = 142;

  ctx.save();
  if (floorBadgeImg && floorBadgeImg.complete && floorBadgeImg.naturalWidth > 0) {
    ctx.drawImage(floorBadgeImg, cx - size / 2, cy - size / 2, size, size);
  } else {
    // Procedural Fallback
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ebf0f5';
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#646e82';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = '#1e2436';
    ctx.font = '700 64px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.floor || '12', cx, cy);
  }
  ctx.restore();
}

// Centered Golden Patch Rosette Medallion (REFINED FONT SIZE & OPTICAL CENTERING)
function renderPatchRosette() {
  const cx = 960;
  const cy = 549;
  const size = 184;

  ctx.save();
  if (rosetteBadgeImg && rosetteBadgeImg.complete && rosetteBadgeImg.naturalWidth > 0) {
    ctx.drawImage(rosetteBadgeImg, cx - size / 2, cy - size / 2, size, size);
  } else {
    // Procedural 12-lobed golden rosette
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#fed662';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.beginPath();
    for (let i = 0; i <= 360 * 2; i++) {
      const theta = (i * Math.PI) / 360;
      const r = size * 0.44 + 6 * Math.cos(12 * theta);
      const px = cx + r * Math.cos(theta);
      const py = cy + r * Math.sin(theta);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Refined Font Size: 62px with 10px stroke gives generous margin inside the rosette
  const cleanVersion = String(state.patch || '7.0').replace('ABYSS', '').replace('★', '').trim();
  ctx.font = '700 62px Anton, Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const m = ctx.measureText(cleanVersion);
  const actualAscent = m.actualBoundingBoxAscent || 49;
  const actualDescent = m.actualBoundingBoxDescent || 0;
  // Visual center formula: places the exact vertical center of the glyphs at cy
  const textY = Math.round(cy + (actualAscent - actualDescent) / 2);

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 10;
  ctx.strokeText(cleanVersion, cx, textY);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(cleanVersion, cx, textY);
  ctx.restore();
}

// Donaturine Pro-Grade Typography Engine (Single-Line Headline & Two-Tone Modes)
function renderHeadlineTypography() {
  const s1 = state.side1;
  const s2 = state.side2;

  // If team dock is active or screenshot strip is loaded, adjust Y offsets for perfect visual margin
  const s1HasDock = s1.showDock || s1.croppedStrip;
  const s2HasDock = s2.showDock || s2.croppedStrip;
  const hasDock = s1HasDock || s2HasDock;

  const isOneLine = (state.headlineFormat || '1line') === '1line';

  // Y positions: Dock sits from Y=874 to 1044. Headline sits right above the dock!
  const yOneLine = hasDock ? 830 : 910;
  const y1 = hasDock ? 760 : 832;
  const y2 = hasDock ? 832 : 914;

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

      let fontSize = hasDock ? 76 : 88;
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

      let fontSize1 = hasDock ? 68 : 80;
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
          const pillH = hasDock ? 56 : 64;

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

// Export / Download 1080p Thumbnail
async function exportThumbnail() {
  const btn = document.getElementById('btnExport');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span>⏳</span> Exporting 1080p...';
  btn.disabled = true;

  // Auto-super-sample any zoomed slots (scale >= 1.25) before final export
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

  // 1. Render clean canvas without active selection highlight or guide lines
  const prevActive = state.activeSlot;
  const prevGuide = state.showEyeGuide;
  state.activeSlot = 0; // Deselect highlight temporarily
  state.showEyeGuide = false; // Never export guide line
  renderCanvas();

  // 2. Download directly from high-resolution canvas
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
    }

    // 3. Persist exact canvas render to server disk for pipeline workflows
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
