/**
 * Canvas Decorations & Procedural Graphics ES Module for Genshin Abyss Studio.
 * Handles procedural Abyss Spire Roman gates, elemental rosettes,
 * two-tone headline typography, 4-man roster team docks, and Stygian dividers.
 */

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

function renderStygianDividers() {
  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 6;

  // Dual divider lines at 640px and 1280px
  ctx.beginPath();
  ctx.moveTo(640, 0);
  ctx.lineTo(640, 1080);
  ctx.moveTo(1280, 0);
  ctx.lineTo(1280, 1080);
  ctx.stroke();

  // Subtle violet neon edge accent
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(639, 0);
  ctx.lineTo(639, 1080);
  ctx.moveTo(1281, 0);
  ctx.lineTo(1281, 1080);
  ctx.stroke();

  // Decorative pins
  ctx.fillStyle = '#0f172a';
  for (const x of [640, 1280]) {
    ctx.beginPath();
    ctx.arc(x, 10, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, 1070, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function renderStygianCycleTitle() {
  if (state.showStygianCycleTitle === false) return;
  const rawText = (state.stygianCycleTitle || '').trim();
  if (!rawText) return;

  const cx = 960;
  const fontSize = Number(state.stygianCycleTitleSize) || 36;

  // Calculate dynamic default Y directly below the middle boss badge if not custom
  const scale = Number(state.bossBadgeScale) || 1.0;
  const pillH = Math.round(108 * scale);
  const tagY = state.bossBadgeTop !== undefined ? state.bossBadgeTop : 60;
  const autoY = tagY + pillH + Math.round(36 * scale);

  const y = state.stygianCycleTitleY !== undefined ? Number(state.stygianCycleTitleY) : autoY;
  // Thick, bold black outline matching the visual weight of team headline names
  const strokeW = Math.max(12, Math.round(fontSize * 0.38));

  ctx.save();
  ctx.font = `900 ${fontSize}px 'Montserrat', 'Inter', 'Rubik', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 1. Ambient drop shadow behind the black outline for depth & 3D separation
  ctx.shadowColor = 'rgba(0, 0, 0, 0.96)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 5;

  // 2. Heavy Crisp Black Outline (Thick signature YouTube creator technique)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = strokeW;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.miterLimit = 2;
  ctx.strokeText(rawText, cx, y);
  ctx.strokeText(rawText, cx, y); // Double pass for deep solid black outline

  // 3. Pristine Pure White Fill on top
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(rawText, cx, y);

  ctx.restore();
}

function renderStygianBossBadges() {
  if (state.showBossBadges === false) return;

  const centers = [320, 960, 1600];
  const defaultColors = ['#00e5ff', '#c084fc', '#fb7185'];

  // Base sizing: +50% larger for crystal-clear readability on phones and mobile feeds
  const scale = Number(state.bossBadgeScale) || 1.0;
  const pillH = Math.round(108 * scale);
  const iconSize = Math.round(84 * scale);
  const fontSize = Math.round(36 * scale);
  const paddingX = Math.round(28 * scale);
  const iconGap = Math.round(18 * scale);
  const tagY = state.bossBadgeTop !== undefined ? state.bossBadgeTop : 60;

  centers.forEach((cx, idx) => {
    const boss = (state.stygianBosses && state.stygianBosses[idx]) || {
      name: `BOSS ${idx + 1}`,
      color: defaultColors[idx],
      iconImg: null
    };

    const bossName = (boss.name || `BOSS ${idx + 1}`).trim().toUpperCase();
    const accentColor = boss.color || defaultColors[idx];
    const hasIcon = boss.iconImg && boss.iconImg.complete && boss.iconImg.naturalWidth > 0;

    ctx.save();
    ctx.font = `900 ${fontSize}px 'Montserrat', 'Inter', 'Rubik', sans-serif`;
    const textMetrics = ctx.measureText(bossName);
    const textW = textMetrics.width;

    const minPillW = Math.round(315 * scale);
    const pillW = Math.max(minPillW, paddingX + (hasIcon ? iconSize + iconGap : 0) + textW + paddingX + Math.round(6 * scale));

    const tagX = cx - pillW / 2;

    // 1. Heavy drop shadow for bold separation from character art
    ctx.shadowColor = 'rgba(0, 0, 0, 0.94)';
    ctx.shadowBlur = Math.round(22 * scale);
    ctx.shadowOffsetY = Math.round(7 * scale);

    // 2. High-contrast Dark Frosted Glass Capsule Fill
    const bgGrad = ctx.createLinearGradient(tagX, tagY, tagX, tagY + pillH);
    bgGrad.addColorStop(0, 'rgba(16, 24, 44, 0.95)');
    bgGrad.addColorStop(1, 'rgba(8, 13, 26, 0.97)');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(tagX, tagY, pillW, pillH, [pillH / 2]);
    ctx.fill();

    // 3. Glowing Elemental Accent Rim
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = Math.round(16 * scale);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = Math.max(2, Math.round(3.0 * scale));
    ctx.stroke();

    // 4. Subtle Inner Specular Reflection
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tagX + 2, tagY + 2, pillW - 4, pillH - 4, [(pillH - 4) / 2]);
    ctx.stroke();

    let textStartX = tagX + paddingX;

    // 5. Boss Avatar (Floating seamlessly inside capsule without rigid circular border)
    if (hasIcon) {
      const iconX = tagX + Math.round(10 * scale);
      const iconY = tagY + (pillH - iconSize) / 2;

      const cx_icon = iconX + iconSize / 2;
      const cy_icon = iconY + iconSize / 2;
      const r_icon = iconSize / 2;

      ctx.save();
      // Clip to pill capsule boundaries so image never bleeds outside pill
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, pillW, pillH, [pillH / 2]);
      ctx.clip();

      // Soft atmospheric Stygian Crimson/Violet vortex underglow (feathered, no hard circular edge)
      const stygianGlow = ctx.createRadialGradient(cx_icon, cy_icon, r_icon * 0.1, cx_icon, cy_icon, r_icon * 1.15);
      stygianGlow.addColorStop(0, 'rgba(244, 63, 94, 0.40)');   // vivid crimson-rose
      stygianGlow.addColorStop(0.6, 'rgba(168, 85, 247, 0.22)'); // void purple
      stygianGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');        // softly blends into capsule fill
      ctx.fillStyle = stygianGlow;
      ctx.beginPath();
      ctx.arc(cx_icon, cy_icon, r_icon * 1.15, 0, Math.PI * 2);
      ctx.fill();

      // Draw portrait with centered 125% zoom directly inside capsule (no harsh circular border ring)
      const zoom = (boss.icon && boss.icon.includes('stygian_')) ? 1.25 : 1.05;
      const drawSize = iconSize * zoom;
      const drawOffset = (iconSize - drawSize) / 2;
      ctx.drawImage(boss.iconImg, iconX + drawOffset, iconY + drawOffset, drawSize, drawSize);
      ctx.restore();

      textStartX = iconX + iconSize + iconGap;
    }

    // 6. Boss Recognizable Name (Bold, Clear, High-Contrast Typography)
    ctx.save();
    ctx.font = `900 ${fontSize}px 'Montserrat', 'Inter', 'Rubik', sans-serif`;
    ctx.textAlign = hasIcon ? 'left' : 'center';
    ctx.textBaseline = 'middle';
    const textY = tagY + pillH / 2 + 1;

    // Drop shadow for pure white text
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = Math.round(8 * scale);
    ctx.shadowOffsetY = Math.round(2 * scale);
    ctx.fillStyle = '#FFFFFF';

    if (hasIcon) {
      ctx.fillText(bossName, textStartX, textY);
    } else {
      ctx.fillText(bossName, cx, textY);
    }

    ctx.restore();

    ctx.restore();
  });
}

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

  function drawHalfHeadline(slot, cx, maxAllowedW = 750) {
    if (!slot) return;
    const name = (slot.customName.trim() || slot.character).toUpperCase();
    const cTag = (slot.constellation || 'C0').trim().toUpperCase();
    const archetype = slot.archetype.trim().toUpperCase();
    const resolvedColor = resolveArchetypeColor(slot);
    const isStygian = state.layoutMode === 'stygian';
    const effectiveMaxW = isStygian ? Math.min(maxAllowedW, 540) : maxAllowedW;
    const targetYOneLine = isStygian ? 846 : yOneLine;
    const targetY1 = isStygian ? 808 : y1;
    const targetY2 = isStygian ? 856 : y2;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (isOneLine) {
      const headlineText = (cTag && cTag !== 'C0')
        ? `${cTag} ${name} ${archetype}`.trim()
        : `${name} ${archetype}`.trim();

      let fontSize = isStygian ? 52 : (hasBottomDock ? 76 : (isVerticalLayout ? 92 : 88));
      ctx.font = `900 ${fontSize}px 'Montserrat', 'Rubik', Impact, sans-serif`;

      let textMetrics = ctx.measureText(headlineText);
      if (textMetrics.width > effectiveMaxW) {
        fontSize = Math.floor(fontSize * (effectiveMaxW / textMetrics.width));
        ctx.font = `900 ${fontSize}px 'Montserrat', 'Rubik', Impact, sans-serif`;
      }

      const strokeW = Math.max(Math.round(fontSize * (isStygian ? 0.16 : 0.18)), isStygian ? 8 : 12);

      // Pass 1: Deep ambient drop shadow behind the stroke
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 4;
      ctx.strokeStyle = resolvedColor;
      ctx.lineWidth = strokeW;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(headlineText, cx, targetYOneLine);
      ctx.restore();

      // Pass 2: Vibrant saturated colored outer stroke
      ctx.save();
      ctx.strokeStyle = resolvedColor;
      ctx.lineWidth = strokeW;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(headlineText, cx, targetYOneLine);
      ctx.restore();

      // Pass 3: Pristine white text fill on top
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(headlineText, cx, targetYOneLine);
      ctx.restore();

    } else {
      // 2-Line Stacked Format (Line 1: Character, Line 2: Archetype)
      const line1 = `${cTag} ${name}`;
      const line2 = archetype;

      let fontSize1 = isStygian ? 46 : (hasBottomDock ? 68 : (isVerticalLayout ? 82 : 80));
      ctx.font = `900 ${fontSize1}px 'Montserrat', 'Rubik', Impact, sans-serif`;
      let m1 = ctx.measureText(line1);
      if (m1.width > effectiveMaxW) {
        fontSize1 = Math.floor(fontSize1 * (effectiveMaxW / m1.width));
        ctx.font = `900 ${fontSize1}px 'Montserrat', 'Rubik', Impact, sans-serif`;
      }

      // Line 1 Stroke + Shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = isStygian ? 10 : 14;
      ctx.lineJoin = 'round';
      ctx.strokeText(line1, cx, targetY1);
      ctx.restore();

      // Line 1 Fill
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(line1, cx, targetY1);
      ctx.restore();

      if (line2) {
        let fontSize2 = Math.round(fontSize1 * 0.86);
        ctx.font = `900 ${fontSize2}px 'Montserrat', 'Rubik', Impact, sans-serif`;
        let m2 = ctx.measureText(line2);
        if (m2.width > effectiveMaxW) {
          fontSize2 = Math.floor(fontSize2 * (effectiveMaxW / m2.width));
          ctx.font = `900 ${fontSize2}px 'Montserrat', 'Rubik', Impact, sans-serif`;
        }

        if (state.archetypeStyle === 'frosted') {
          // Frosted Capsule
          const pillW = Math.min(Math.max(m2.width + (isStygian ? 32 : 48), isStygian ? 130 : 180), effectiveMaxW);
          const pillH = isStygian ? 42 : (hasBottomDock ? 56 : (isVerticalLayout ? 66 : 64));

          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
          ctx.shadowBlur = 12;
          ctx.shadowOffsetY = 4;
          ctx.fillStyle = 'rgba(8, 12, 22, 0.8)';
          ctx.beginPath();
          ctx.roundRect(cx - pillW / 2, targetY2 - pillH / 2, pillW, pillH, [8]);
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
          ctx.fillText(line2, cx, targetY2);
          ctx.restore();
        } else {
          // Floating Vibrant Two-Tone
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
          ctx.shadowBlur = 14;
          ctx.shadowOffsetY = 3;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = isStygian ? 10 : 14;
          ctx.lineJoin = 'round';
          ctx.strokeText(line2, cx, targetY2);
          ctx.restore();

          ctx.save();
          ctx.fillStyle = resolvedColor;
          ctx.shadowColor = resolvedColor;
          ctx.shadowBlur = 8;
          ctx.fillText(line2, cx, targetY2);
          ctx.restore();
        }
      }
    }

    ctx.restore();
  }

  // Draw Stygian (3 columns at 320, 960, 1600) vs Abyss (2 halves at 480, 1440)
  if (state.layoutMode === 'stygian') {
    drawHalfHeadline(state.side1, 320, 540);
    drawHalfHeadline(state.side2, 960, 540);
    drawHalfHeadline(state.side3, 1600, 540);
  } else {
    drawHalfHeadline(s1, 480, 750);
    drawHalfHeadline(s2, 1440, 750);
  }

  ctx.restore();
}

// Render Floor 12 Team Roster Docks (Donaturine Showcase Proportions: 140x170 cards, 602px width)
function renderTeamRosterDock(slot, isLeft, customCx = null, customTargetW = null) {
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

  // Option B: Procedural 4-Man Roster Dock
  const teammates = slot.teammates || [slot.character, '', '', ''];
  const isStygian = state.layoutMode === 'stygian';
  // +33% larger team dock cards for crystal-clear visibility on mobile thumbnail feeds
  const cardW = isStygian ? 122 : 140;
  const cardH = isStygian ? 154 : 170;
  const gap = isStygian ? 10 : 14;
  const totalW = 4 * cardW + 3 * gap;
  const defCx = isLeft ? 480 : 1440;
  const startX = (customCx !== null ? customCx : defCx) - totalW / 2;
  const startY = isStygian ? 890 : 874;

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

    // 4. Character Avatar with proportional scaling & aspect-ratio cover crop
    const img = slot.teammateImgs ? slot.teammateImgs[i] : null;
    const footerH = isStygian ? 29 : 34;
    const footerY = cardY + cardH - footerH;
    const avatarH = cardH - footerH;

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cardX + 2, cardY + 2, cardW - 4, avatarH, [8, 8, 0, 0]);
      ctx.clip();

      // Object-fit: cover aspect ratio math
      const targetW = cardW - 4;
      const targetH = avatarH;
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const targetAspect = targetW / targetH;
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      if (imgAspect > targetAspect) {
        sw = img.naturalHeight * targetAspect;
        sx = (img.naturalWidth - sw) / 2;
      } else {
        sh = img.naturalWidth / targetAspect;
        sy = (img.naturalHeight - sh) * 0.15;
      }

      ctx.drawImage(img, sx, sy, sw, sh, cardX + 2, cardY + 2, targetW, targetH);
      ctx.restore();
    } else if (charName) {
      ctx.fillStyle = '#ffffff';
      ctx.font = isStygian ? '700 12px Inter, sans-serif' : '700 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(charName.substring(0, isStygian ? 7 : 9), cardX + cardW / 2, cardY + avatarH / 2);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.font = isStygian ? '700 24px Inter, sans-serif' : '700 32px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', cardX + cardW / 2, cardY + avatarH / 2);
    }

    // 5. Signature Donaturine White Footer Pill ("Lv. 90")
    if (charName) {
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(cardX + 2, footerY, cardW - 4, footerH - 2, [0, 0, 8, 8]);
      ctx.fill();

      ctx.fillStyle = '#1E293B';
      ctx.font = isStygian ? '800 14px Inter, sans-serif' : '800 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Lv. 90', cardX + cardW / 2, footerY + footerH / 2);
      ctx.restore();
    }

    // 6. Outer Border
    ctx.strokeStyle = charName ? (rarity === 5 ? 'rgba(255, 215, 0, 0.85)' : 'rgba(186, 104, 200, 0.85)') : 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = isStygian ? 2.0 : 2.5;
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
      const vRadius = isStygian ? 10 : 11;
      const vInner = isStygian ? 4.8 : 5.5;
      const vx = cardX + (isStygian ? 16 : 18);
      const vy = cardY + (isStygian ? 16 : 18);

      ctx.beginPath();
      ctx.arc(vx, vy, vRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fill();
      ctx.strokeStyle = vColor;
      ctx.lineWidth = isStygian ? 1.5 : 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(vx, vy, vInner, 0, Math.PI * 2);
      ctx.fillStyle = vColor;
      ctx.fill();
    }

    // 8. Role tag for Main Carry (Slot 0)
    if (i === 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 229, 255, 0.92)';
      const tagW = isStygian ? 44 : 46;
      const tagH = isStygian ? 17 : 18;
      const tagX = cardX + cardW - tagW - 5;
      const tagY = cardY + 5;
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagW, tagH, [3]);
      ctx.fill();
      ctx.fillStyle = '#0b0e17';
      ctx.font = isStygian ? '900 9px Inter, sans-serif' : '900 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CARRY', tagX + tagW / 2, tagY + tagH / 2);
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


export {
  renderEyeGuide,
  renderVignette,
  renderStygianDividers,
  renderStygianCycleTitle,
  renderStygianBossBadges,
  renderDivider,
  hexToRgb,
  adjustColorBrightness,
  getActiveRosetteTheme,
  renderAbyssSpire,
  renderPatchRosette,
  renderHeadlineTypography,
  resolveArchetypeColor,
  drawHalfHeadline,
  renderTeamRosterDock,
  renderVerticalEdgeRoster
};
