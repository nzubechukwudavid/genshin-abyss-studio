/**
 * Spotlight Studio ES Module for Genshin Abyss Studio.
 * Handles solo character spotlight thumbnail creation, framing presets,
 * particle / aura rendering, custom backdrop layers, and YouTube safe zone guides.
 */

/* ==========================================================================
   SPOTLIGHT THUMBNAIL STUDIO IMPLEMENTATION (v2.2 Complete Overhaul)
   ========================================================================== */

function setLayoutMode(mode) {
  state.layoutMode = 'dual';
  // Thumbnail Studio is 100% Split-Screen dual mode
  const dualTabs = document.getElementById('dualPanelTabs');
  const dualContent = document.getElementById('dualSidebarContent');
  const spotlightContent = document.getElementById('spotlightSidebarContent');

  if (dualTabs) dualTabs.style.display = 'flex';
  if (dualContent) dualContent.style.display = 'block';
  if (spotlightContent) spotlightContent.style.display = 'none';

  // 3. Arranger Studio Views (Both Dual & Spotlight Showcase)
  const standardArrangerView = document.getElementById('standardArrangerView');
  const showcaseArrangerView = document.getElementById('showcaseArrangerView');
  const badge = document.getElementById('arrangerModeBadge');
  const infoText = document.getElementById('arrangerModeInfoText');

  if (mode === 'spotlight') {
    if (standardArrangerView) standardArrangerView.style.display = 'none';
    if (showcaseArrangerView) showcaseArrangerView.style.display = 'block';
    if (badge) {
      badge.textContent = 'INVERSE SHOWCASE';
      badge.style.background = 'rgba(124, 58, 237, 0.25)';
      badge.style.borderColor = 'rgba(168, 85, 247, 0.5)';
      badge.style.color = '#c084fc';
    }
    if (infoText) {
      infoText.textContent = 'Assemble 2 inverse dual-run CapCut drafts (Lead Team & Second Team) with micro-fades and synced builds.';
    }
    if (typeof initShowcaseArranger === 'function') {
      initShowcaseArranger();
    }
  } else {
    if (standardArrangerView) standardArrangerView.style.display = 'block';
    if (showcaseArrangerView) showcaseArrangerView.style.display = 'none';
    if (badge) {
      badge.textContent = 'STANDARD MODE';
      badge.style.background = 'rgba(13, 148, 136, 0.2)';
      badge.style.borderColor = 'rgba(13, 148, 136, 0.4)';
      badge.style.color = '#2dd4bf';
    }
    if (infoText) {
      infoText.textContent = 'Floor 12 Chamber 1-3 & Builds stitched into 1 seamless CapCut project.';
    }
    if (typeof loadVideoArrangerData === 'function') {
      loadVideoArrangerData();
    }
  }

  renderCanvas();
}

function ensureSpotlightDefaultBackground() {
  if (!state.spotlight.bgImg && state.spotlight.bgImgUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      state.spotlight.bgImg = img;
      renderCanvas();
    };
    img.src = state.spotlight.bgImgUrl;
  }
}

function updateSpotlightSidebarUI() {
  const hero = state.side1;
  const nameEl = document.getElementById('spotlightCharNameDisplay');
  const elemEl = document.getElementById('spotlightCharElementDisplay');
  const avatarImg = document.getElementById('spotlightCharAvatarImg');

  if (nameEl) nameEl.textContent = hero.character || 'Venti';
  const charData = state.charactersCatalog[hero.character] || {};
  const vision = charData.vision || charData.element || 'Anemo';
  const weapon = charData.weapon || 'Bow';
  if (elemEl) {
    elemEl.textContent = `${vision} • ${weapon}`;
  }
  if (avatarImg) {
    avatarImg.src = `/api/avatar/${encodeURIComponent(hero.character)}?v=4.0.1`;
  }

  // Auto-adapt elemental rim glow preset to match character vision
  const visionLower = vision.toLowerCase();
  const matchedGlow = ['anemo', 'pyro', 'electro', 'hydro', 'cryo', 'dendro', 'geo'].includes(visionLower) ? visionLower : 'anemo';
  const glowColors = {
    anemo: '#2dd4bf',
    pyro: '#f97316',
    electro: '#c084fc',
    hydro: '#38bdf8',
    cryo: '#7dd3fc',
    dendro: '#4ade80',
    geo: '#f59e0b'
  };
  state.spotlight.glowPreset = matchedGlow;
  state.spotlight.glowColor = glowColors[matchedGlow];

  const glowChips = document.querySelectorAll('#spotlightGlowBar .color-chip');
  glowChips.forEach(chip => {
    chip.classList.toggle('active', chip.dataset.glow === matchedGlow);
  });
  const glowLbl = document.getElementById('spotlightGlowLabel');
  if (glowLbl) {
    const activeChip = Array.from(glowChips).find(c => c.dataset.glow === matchedGlow);
    if (activeChip) {
      glowLbl.textContent = activeChip.title;
      glowLbl.style.color = glowColors[matchedGlow];
    }
  }

  renderSpotlightGalleryFilmstrip(hero.gallery, hero.imgUrl);
  renderSpotlightRosterGrid();
}

function renderSpotlightGalleryFilmstrip(images, currentUrl) {
  const container = document.getElementById('spotlightGalleryFilmstrip');
  const countTag = document.getElementById('spotlightGalleryCountTag');
  if (!container) return;

  if (!images || images.length === 0) {
    container.innerHTML = '<div style="color:var(--text-dim);font-size:0.75rem;padding:8px;text-align:center;">No official gallery assets loaded</div>';
    if (countTag) countTag.textContent = '0 Art';
    return;
  }

  if (countTag) countTag.textContent = `${images.length} Official Art`;
  container.innerHTML = '';

  images.forEach((item, idx) => {
    const url = typeof item === 'string' ? item : item.url;
    const badge = typeof item === 'object' && item.badge ? item.badge : (idx === 0 ? '👑 1800p Portrait' : idx === 1 ? '✨ 2K Splash' : `Art #${idx + 1}`);

    const card = document.createElement('div');
    card.className = `gallery-thumb-item ${url === currentUrl ? 'active' : ''}`;
    card.dataset.url = url;
    card.title = badge;

    const img = document.createElement('img');
    img.src = url;
    img.loading = 'lazy';
    img.alt = `Illustration ${idx + 1}`;

    const badgeSpan = document.createElement('span');
    badgeSpan.className = 'gallery-thumb-badge';
    badgeSpan.textContent = badge;

    card.appendChild(img);
    card.appendChild(badgeSpan);

    card.addEventListener('click', () => {
      container.querySelectorAll('.gallery-thumb-item').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      loadImageToSlot(1, url).then(() => {
        renderCanvas();
      });
    });

    container.appendChild(card);
  });
}

function applyFramingPreset(preset) {
  state.spotlight.framingPreset = preset;
  const hero = state.side1;

  if (preset === 'headshot') {
    hero.scale = 2.45;
    hero.panX = -30;
    hero.panY = 240;
  } else if (preset === 'bust') {
    hero.scale = 1.75;
    hero.panX = 0;
    hero.panY = 120;
  } else if (preset === 'action') {
    hero.scale = 1.30;
    hero.panX = 0;
    hero.panY = 20;
  } else if (preset === 'full') {
    hero.scale = 1.05;
    hero.panX = 0;
    hero.panY = -40;
  }

  const btns = document.querySelectorAll('#framingPresetsBar .framing-btn');
  btns.forEach(b => b.classList.toggle('active', b.dataset.preset === preset));

  updateZoomUI();
  renderCanvas();
}

function renderSpotlightRosterGrid() {
  const container = document.getElementById('spotlightTeamRosterGrid');
  if (!container) return;
  container.innerHTML = '';

  const teammates = state.side1.teammates || ['Venti', 'Faruzan', 'Bennett', 'Furina'];
  const teammateImgs = state.side1.teammateImgs || [];

  for (let idx = 0; idx < 4; idx++) {
    const card = document.createElement('div');
    card.className = `teammate-slot-card ${idx === 0 ? 'active-main' : ''}`;
    card.title = idx === 0 ? 'Slot 1: Main Carry' : `Slot ${idx + 1}: Teammate`;

    const inner = document.createElement('div');
    inner.className = 'teammate-slot-inner';

    const name = teammates[idx] || `Teammate ${idx + 1}`;
    const img = teammateImgs[idx];

    if (img && img.src) {
      const avatar = document.createElement('img');
      avatar.className = 'teammate-slot-img';
      avatar.src = img.src;
      inner.appendChild(avatar);
    } else {
      const placeholder = document.createElement('span');
      placeholder.className = 'teammate-slot-placeholder';
      placeholder.textContent = idx === 0 ? '★' : '+';
      inner.appendChild(placeholder);
    }

    if (idx === 0) {
      const badge = document.createElement('span');
      badge.className = 'teammate-slot-badge';
      badge.textContent = 'CARRY';
      inner.appendChild(badge);
    }

    const nameLbl = document.createElement('span');
    nameLbl.className = 'teammate-slot-name';
    nameLbl.textContent = name;

    card.appendChild(inner);
    card.appendChild(nameLbl);
    container.appendChild(card);
  }
}

// 60FPS Spotlight Canvas Rendering
function renderSpotlightMode() {
  ctx.clearRect(0, 0, 1920, 1080);

  // 1. Action Combat Screenshot Background
  if (state.spotlight.bgImg && state.spotlight.bgImg.complete && state.spotlight.bgImg.naturalWidth > 0) {
    ctx.save();
    const br = state.spotlight.bgBrightness || 100;
    const ct = state.spotlight.bgContrast || 110;
    ctx.filter = `brightness(${br}%) contrast(${ct}%)`;

    const bg = state.spotlight.bgImg;
    const scale = state.spotlight.bgScale || 1.0;
    const canvasAspect = 1920 / 1080;
    const imgAspect = bg.naturalWidth / bg.naturalHeight;

    let baseW = 1920;
    let baseH = 1080;
    if (imgAspect > canvasAspect) {
      baseW = 1080 * imgAspect;
    } else {
      baseH = 1920 / imgAspect;
    }

    const dw = baseW * scale;
    const dh = baseH * scale;
    const dx = (1920 - dw) / 2 + (state.spotlight.bgPanX || 0);
    const dy = (1080 - dh) / 2 + (state.spotlight.bgPanY || 0);

    ctx.drawImage(bg, dx, dy, dw, dh);
    ctx.restore();
  } else {
    // Elegant fallback cosmic starry arena gradient
    const grad = ctx.createRadialGradient(960, 540, 120, 960, 540, 1200);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(0.45, '#0f172a');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1920, 1080);
  }

  // 2. Cinematic Contrast Shading (Deep Left Shadow to make Hero Pop)
  if (state.spotlight.showDamageVignette) {
    ctx.save();
    const leftGrad = ctx.createLinearGradient(0, 0, 1000, 0);
    leftGrad.addColorStop(0, 'rgba(2, 6, 23, 0.90)');
    leftGrad.addColorStop(0.38, 'rgba(2, 6, 23, 0.55)');
    leftGrad.addColorStop(0.75, 'rgba(2, 6, 23, 0.20)');
    leftGrad.addColorStop(1, 'rgba(2, 6, 23, 0.0)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, 0, 1000, 1080);

    const botGrad = ctx.createLinearGradient(0, 700, 0, 1080);
    botGrad.addColorStop(0, 'rgba(2, 6, 23, 0.0)');
    botGrad.addColorStop(0.65, 'rgba(2, 6, 23, 0.75)');
    botGrad.addColorStop(1, 'rgba(2, 6, 23, 0.96)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, 700, 1920, 380);
    ctx.restore();
  }

  // 3. Hero Cutout Character (Left Foreground with Multi-Layered Rim Glow)
  const hero = state.side1;
  if (hero.img && hero.img.complete && hero.img.naturalWidth > 0) {
    const baseCx = 460 + (hero.panX || 0);
    const baseCy = 540 + (hero.panY || 0);
    const w = hero.img.naturalWidth * (hero.scale || 1.0);
    const h = hero.img.naturalHeight * (hero.scale || 1.0);

    ctx.save();
    // Multi-layer glowing elemental aura
    if (state.spotlight.glowPreset !== 'none' && state.spotlight.glowColor && state.spotlight.glowColor !== 'transparent') {
      ctx.shadowColor = state.spotlight.glowColor;
      ctx.shadowBlur = (state.spotlight.glowRadius || 32) * 1.2;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    ctx.translate(baseCx, baseCy);
    if (hero.mirror) {
      ctx.scale(-1, 1);
    }
    ctx.drawImage(hero.img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // 4. Floor 12 Team Dock
  if (state.spotlight.showTeamDock) {
    renderSpotlightTeamDock();
  }

  // 5. High-Impact Slanted 3D Action Typography
  renderSpotlightTypography();
}

function renderSpotlightTypography() {
  const primaryText = (state.spotlight.hookBadgeText || 'YOU NEED TO TRY THIS!').toUpperCase();
  const subText = (state.spotlight.hookBadgeSub || 'VENTI HYPERCARRY').toUpperCase();
  const ribbonText = (state.spotlight.ribbonText || 'FLOOR 12 9-STAR CLEAR').toUpperCase();
  const style = state.spotlight.typoStyle || 'slanted_3d';
  const theme = state.spotlight.hookTheme || 'gold';

  if (style === 'capsule') {
    // Render classic frosted capsule
    renderClassicCapsuleHook(primaryText, subText, ribbonText);
    return;
  }

  ctx.save();
  const cx = 1320;
  const cy = 200;

  ctx.translate(cx, cy);
  if (style === 'slanted_3d') {
    ctx.rotate(-4.5 * Math.PI / 180); // Dynamic -4.5deg slant
  }

  // A. Top Slanted Ribbon Banner
  if (ribbonText) {
    ctx.save();
    ctx.font = '900 20px "Segoe UI", "Impact", "Montserrat", sans-serif';
    const ribW = ctx.measureText(ribbonText).width + 36;
    const ribH = 34;
    const ribX = -ribW / 2;
    const ribY = -85;

    // Slanted polygon ribbon
    ctx.fillStyle = '#e11d48'; // intense crimson
    ctx.beginPath();
    ctx.moveTo(ribX + 10, ribY);
    ctx.lineTo(ribX + ribW, ribY);
    ctx.lineTo(ribX + ribW - 10, ribY + ribH);
    ctx.lineTo(ribX, ribY + ribH);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ribbonText, 0, ribY + ribH / 2);
    ctx.restore();
  }

  // B. Primary Hook Line (Line 1)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 86px "Anton", "Impact", "Montserrat", sans-serif';

  // 16px deep black stroke + heavy drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 6;
  ctx.shadowOffsetY = 10;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 16;
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 2;
  ctx.strokeText(primaryText, 0, 0);

  // Gradient Fill
  const textGrad = ctx.createLinearGradient(0, -45, 0, 45);
  if (theme === 'gold') {
    textGrad.addColorStop(0, '#fffbeb'); // cream white
    textGrad.addColorStop(0.3, '#fde047'); // electric gold
    textGrad.addColorStop(1, '#ea580c'); // amber flame
  } else if (theme === 'white') {
    textGrad.addColorStop(0, '#ffffff');
    textGrad.addColorStop(1, '#cbd5e1');
  } else if (theme === 'cyan') {
    textGrad.addColorStop(0, '#e0f2fe');
    textGrad.addColorStop(0.4, '#38bdf8');
    textGrad.addColorStop(1, '#0284c7');
  } else if (theme === 'coral') {
    textGrad.addColorStop(0, '#ffedd5');
    textGrad.addColorStop(0.4, '#f97316');
    textGrad.addColorStop(1, '#dc2626');
  } else {
    textGrad.addColorStop(0, '#f5d0fe');
    textGrad.addColorStop(0.4, '#c084fc');
    textGrad.addColorStop(1, '#7c3aed');
  }

  ctx.fillStyle = textGrad;
  ctx.fillText(primaryText, 0, 0);
  ctx.restore();

  // C. Secondary Punchline (Line 2)
  if (subText) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 48px "Anton", "Impact", "Montserrat", sans-serif';

    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 8;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 12;
    ctx.lineJoin = 'miter';
    ctx.strokeText(subText, 0, 78);

    // High-visibility glowing fill
    ctx.fillStyle = state.spotlight.glowColor && state.spotlight.glowColor !== 'transparent' ? state.spotlight.glowColor : '#ffffff';
    ctx.fillText(subText, 0, 78);
    ctx.restore();
  }

  ctx.restore();
}

function renderClassicCapsuleHook(primaryText, subText, ribbonText) {
  ctx.save();
  const cx = 1260;
  const cy = 110;
  const accentColor = state.spotlight.hookColor || '#ffd54f';

  ctx.font = '900 64px "Anton", "Impact", "Outfit", sans-serif';
  const textWidth = Math.max(ctx.measureText(primaryText).width, 580);
  const pillW = textWidth + 70;
  const pillH = 145;
  const pillX = cx - pillW / 2;
  const pillY = cy - 20;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 18;

  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 20);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(pillX, pillY, pillW, pillH);
    ctx.strokeRect(pillX, pillY, pillW, pillH);
  }

  // Primary Text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 8;
  ctx.strokeText(primaryText, cx, cy + 24);
  ctx.fillStyle = accentColor;
  ctx.fillText(primaryText, cx, cy + 24);

  // Subtitle
  if (subText) {
    ctx.font = '800 32px "Segoe UI", "Outfit", sans-serif';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.strokeText(subText, cx, cy + 85);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subText, cx, cy + 85);
  }

  // Ribbon tag
  if (ribbonText) {
    ctx.fillStyle = '#e11d48';
    const tagW = 160;
    const tagH = 28;
    const tagX = pillX + 24;
    const tagY = pillY - 14;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagW, tagH, 6);
      ctx.fill();
    } else {
      ctx.fillRect(tagX, tagY, tagW, tagH);
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillText(ribbonText, tagX + tagW / 2, tagY + tagH / 2);
  }

  ctx.restore();
}

function renderSpotlightTeamDock() {
  ctx.save();
  const teammates = state.side1.teammates || ['Venti', 'Faruzan', 'Bennett', 'Furina'];
  const teammateImgs = state.side1.teammateImgs || [];

  const startX = 60;
  const startY = 930;
  const cardSize = 90;
  const gap = 16;

  for (let i = 0; i < 4; i++) {
    const x = startX + i * (cardSize + gap);
    const y = startY;
    const name = teammates[i] || `Teammate ${i+1}`;
    const img = teammateImgs[i];

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = (i === 0) ? (state.spotlight.glowColor || '#2dd4bf') : 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = (i === 0) ? 3 : 1.5;

    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, cardSize, cardSize, 12);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(x, y, cardSize, cardSize);
      ctx.strokeRect(x, y, cardSize, cardSize);
    }

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x + 4, y + 4, cardSize - 8, cardSize - 8, 8);
        ctx.clip();
      }
      ctx.drawImage(img, x + 4, y + 4, cardSize - 8, cardSize - 8);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = 'bold 22px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name.charAt(0), x + cardSize / 2, y + cardSize / 2 - 8);
    }

    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    ctx.fillRect(x, y + cardSize - 20, cardSize, 20);
    ctx.fillStyle = (i === 0) ? '#fde047' : '#ffffff';
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.length > 8 ? name.slice(0, 7) + '..' : name, x + cardSize / 2, y + cardSize - 10);

    if (i === 0) {
      ctx.fillStyle = '#0d9488';
      ctx.fillRect(x, y, 46, 15);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px "Segoe UI", sans-serif';
      ctx.fillText('CARRY', x + 23, y + 8);
    }

    ctx.restore();
  }
  ctx.restore();
}

function renderYouTubeSafeZone() {
  ctx.save();
  const bx = 1920 - 220;
  const by = 1080 - 74;
  const bw = 200;
  const bh = 54;

  ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
  ctx.fillRect(bx, by, bw, bh);

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(bx, by, bw, bh);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⏱️ YT DURATION BADGE', bx + bw / 2, by + 24);
  ctx.font = '11px "Segoe UI", sans-serif';
  ctx.fillStyle = '#fca5a5';
  ctx.fillText('(Keep text clear of this area)', bx + bw / 2, by + 42);

  ctx.restore();
}

function initSpotlightStudio() {
  // Layout Switcher
  const btnDual = document.getElementById('btnLayoutDual');
  const btnSpotlight = document.getElementById('btnLayoutSpotlight');
  if (btnDual) btnDual.addEventListener('click', () => setLayoutMode('dual'));
  if (btnSpotlight) btnSpotlight.addEventListener('click', () => setLayoutMode('spotlight'));

  // Safe Zone
  const btnSafeZone = document.getElementById('tbSafeZone');
  if (btnSafeZone) {
    btnSafeZone.addEventListener('click', () => {
      state.showSafeZone = !state.showSafeZone;
      btnSafeZone.classList.toggle('active', state.showSafeZone);
      renderCanvas();
    });
  }

  // Framing Presets
  const framingBtns = document.querySelectorAll('#framingPresetsBar .framing-btn');
  framingBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      applyFramingPreset(btn.dataset.preset);
    });
  });

  // Custom Cutout Upload
  const cutoutInput = document.getElementById('spotlightCustomCutoutInput');
  if (cutoutInput) {
    cutoutInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            state.side1.img = img;
            state.side1.imgUrl = ev.target.result;
            showToast('✓ Custom Cutout Loaded!');
            renderCanvas();
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Spotlight Target Bar
  const targetBtns = document.querySelectorAll('.spotlight-target-btn');
  targetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      targetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.spotlightTarget = btn.dataset.target;
    });
  });

  // Background Presets
  const btnPresetVortex = document.getElementById('btnPresetVortex');
  if (btnPresetVortex) {
    btnPresetVortex.addEventListener('click', () => {
      document.querySelectorAll('#bgPresetBar .bg-preset-btn').forEach(b => b.classList.remove('active'));
      btnPresetVortex.classList.add('active');
      state.spotlight.bgImgUrl = '/static/assets/demo_abyss_vortex.jpg';
      const img = new Image();
      img.onload = () => {
        state.spotlight.bgImg = img;
        state.spotlight.bgPanX = 0;
        state.spotlight.bgPanY = 0;
        state.spotlight.bgScale = 1.0;
        const statusEl = document.getElementById('spotlightBgStatus');
        if (statusEl) statusEl.textContent = '✓ Loaded Anemo Vortex Action Screenshot';
        renderCanvas();
      };
      img.src = state.spotlight.bgImgUrl;
    });
  }

  const btnPresetArena = document.getElementById('btnPresetArena');
  if (btnPresetArena) {
    btnPresetArena.addEventListener('click', () => {
      document.querySelectorAll('#bgPresetBar .bg-preset-btn').forEach(b => b.classList.remove('active'));
      btnPresetArena.classList.add('active');
      state.spotlight.bgImg = null;
      state.spotlight.bgImgUrl = '';
      const statusEl = document.getElementById('spotlightBgStatus');
      if (statusEl) statusEl.textContent = 'Cosmic Starry Arena Active';
      renderCanvas();
    });
  }

  // Spotlight Background Upload
  const bgInput = document.getElementById('spotlightBgInput');
  if (bgInput) {
    bgInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            state.spotlight.bgImg = img;
            state.spotlight.bgImgUrl = ev.target.result;
            state.spotlight.bgPanX = 0;
            state.spotlight.bgPanY = 0;
            state.spotlight.bgScale = 1.0;
            const statusEl = document.getElementById('spotlightBgStatus');
            if (statusEl) statusEl.textContent = `✓ Loaded ${img.naturalWidth}x${img.naturalHeight} Screenshot`;
            renderCanvas();
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Glow Presets
  const glowChips = document.querySelectorAll('#spotlightGlowBar .color-chip');
  glowChips.forEach(chip => {
    chip.addEventListener('click', () => {
      glowChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.spotlight.glowPreset = chip.dataset.glow;
      state.spotlight.glowColor = chip.dataset.color;
      const lbl = document.getElementById('spotlightGlowLabel');
      if (lbl) {
        lbl.textContent = chip.title;
        lbl.style.color = chip.dataset.color === 'transparent' ? '#94a3b8' : chip.dataset.color;
      }
      renderCanvas();
    });
  });

  // Glow Radius Slider
  const glowRad = document.getElementById('spotlightGlowRadius');
  const glowRadVal = document.getElementById('spotlightGlowRadiusVal');
  if (glowRad) {
    glowRad.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.spotlight.glowRadius = val;
      if (glowRadVal) glowRadVal.textContent = `${val}px`;
      renderCanvas();
    });
  }

  // Brightness & Contrast
  const bgBr = document.getElementById('spotlightBgBrightness');
  const bgBrVal = document.getElementById('spotlightBgBrightnessVal');
  if (bgBr) {
    bgBr.addEventListener('input', (e) => {
      state.spotlight.bgBrightness = parseInt(e.target.value, 10);
      if (bgBrVal) bgBrVal.textContent = `${state.spotlight.bgBrightness}%`;
      renderCanvas();
    });
  }

  const bgCt = document.getElementById('spotlightBgContrast');
  const bgCtVal = document.getElementById('spotlightBgContrastVal');
  if (bgCt) {
    bgCt.addEventListener('input', (e) => {
      state.spotlight.bgContrast = parseInt(e.target.value, 10);
      if (bgCtVal) bgCtVal.textContent = `${state.spotlight.bgContrast}%`;
      renderCanvas();
    });
  }

  // Vignette Checkbox
  const chkVig = document.getElementById('chkSpotlightVignette');
  if (chkVig) {
    chkVig.addEventListener('change', (e) => {
      state.spotlight.showDamageVignette = e.target.checked;
      renderCanvas();
    });
  }

  // Reset Framing
  const btnResetFraming = document.getElementById('btnResetBgFraming');
  if (btnResetFraming) {
    btnResetFraming.addEventListener('click', () => {
      state.spotlight.bgPanX = 0;
      state.spotlight.bgPanY = 0;
      state.spotlight.bgScale = 1.0;
      renderCanvas();
    });
  }

  // Typography Style Bar
  const typoBtns = document.querySelectorAll('#typoStyleBar .typo-style-btn');
  typoBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      typoBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.spotlight.typoStyle = btn.dataset.style;
      renderCanvas();
    });
  });

  // Ribbon Banner Input
  const ribbonInput = document.getElementById('spotlightRibbonInput');
  if (ribbonInput) {
    ribbonInput.addEventListener('input', (e) => {
      state.spotlight.ribbonText = e.target.value;
      renderCanvas();
    });
  }

  // Hook Title Inputs
  const hookInput = document.getElementById('spotlightHookInput');
  if (hookInput) {
    hookInput.addEventListener('input', (e) => {
      state.spotlight.hookBadgeText = e.target.value;
      renderCanvas();
    });
  }

  const subInput = document.getElementById('spotlightSubInput');
  if (subInput) {
    subInput.addEventListener('input', (e) => {
      state.spotlight.hookBadgeSub = e.target.value;
      renderCanvas();
    });
  }

  // Hook Accent Colors / Theme
  const hookColors = document.querySelectorAll('#spotlightHookColorBar .color-chip');
  hookColors.forEach(chip => {
    chip.addEventListener('click', () => {
      hookColors.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.spotlight.hookTheme = chip.dataset.theme;
      state.spotlight.hookColor = chip.dataset.color;
      renderCanvas();
    });
  });

  // Team Dock Checkbox
  const chkDock = document.getElementById('chkSpotlightTeamDock');
  if (chkDock) {
    chkDock.addEventListener('change', (e) => {
      state.spotlight.showTeamDock = e.target.checked;
      renderCanvas();
    });
  }

  // Spotlight Character Controls
  const btnSpHD = document.getElementById('btnSpotlightQuickHDArt');
  if (btnSpHD) {
    btnSpHD.addEventListener('click', () => {
      state.activeSlot = 1;
      const btnQuickHD = document.getElementById('btnQuickHDArt');
      if (btnQuickHD) {
        btnQuickHD.click();
      }
    });
  }

  const btnSpChar = document.getElementById('btnSpotlightChangeChar');
  if (btnSpChar) {
    btnSpChar.addEventListener('click', () => {
      state.activeSlot = 1;
      openCharacterPickerModal();
    });
  }
}

// Ensure Spotlight studio listeners are initialized across all browser load timings
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof initSpotlightStudio === 'function') initSpotlightStudio();
  });
} else {
  if (typeof initSpotlightStudio === 'function') initSpotlightStudio();
}


export {
  setLayoutMode,
  ensureSpotlightDefaultBackground,
  updateSpotlightSidebarUI,
  renderSpotlightGalleryFilmstrip,
  applyFramingPreset,
  renderSpotlightRosterGrid,
  renderSpotlightMode,
  renderSpotlightTypography,
  renderClassicCapsuleHook,
  renderSpotlightTeamDock,
  renderYouTubeSafeZone,
  initSpotlightStudio
};
