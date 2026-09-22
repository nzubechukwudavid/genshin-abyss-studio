/**
 * Spotlight Mode Canvas Effects Engine
 * High-performance 60FPS silhouette dilation shader, gaussian blur, and angled typography.
 */

// Offscreen silhouette cache to avoid re-generating masks on every mouse move
const silhouetteCache = {
  key: null,
  canvas: null
};

/**
 * Creates or retrieves a cached solid-color silhouette mask of a transparent PNG.
 */
function getSolidSilhouette(img, color) {
  const cacheKey = `${img.src}_${color}_${img.naturalWidth}x${img.naturalHeight}`;
  if (silhouetteCache.key === cacheKey && silhouetteCache.canvas) {
    return silhouetteCache.canvas;
  }

  const off = document.createElement('canvas');
  off.width = img.naturalWidth || img.width;
  off.height = img.naturalHeight || img.height;
  const octx = off.getContext('2d');

  octx.drawImage(img, 0, 0);
  octx.globalCompositeOperation = 'source-in';
  octx.fillStyle = color;
  octx.fillRect(0, 0, off.width, off.height);

  silhouetteCache.key = cacheKey;
  silhouetteCache.canvas = off;
  return off;
}

/**
 * Renders Canva-style 100% intensity silhouette outline/glow.
 * Multi-pass radial dilation in 16 directions around the contour.
 */
export function drawCanvaOutline(ctx, img, w, h, thickness, color = '#000000') {
  if (!thickness || thickness <= 0 || !color || color === 'transparent') {
    return;
  }

  const mask = getSolidSilhouette(img, color);
  ctx.save();

  // Multi-pass dilation for solid, gapless contour outline
  const steps = Math.max(1, Math.ceil(thickness / 3));
  const stepDist = thickness / steps;

  for (let s = 1; s <= steps; s++) {
    const dist = s * stepDist;
    // 16-point circular radial offset
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const ox = Math.cos(a) * dist;
      const oy = Math.sin(a) * dist;
      ctx.drawImage(mask, -w / 2 + ox, -h / 2 + oy, w, h);
    }
  }

  ctx.restore();
}

/**
 * Renders the background layer with optional Gaussian blur, brightness, and contrast.
 */
export function drawBackgroundLayer(ctx, bgImg, panX, panY, scale, blurPx, brightness = 100, contrast = 100) {
  if (!bgImg || !bgImg.complete || bgImg.naturalWidth === 0) {
    // Elegant fallback cosmic gradient
    const grad = ctx.createRadialGradient(960, 540, 120, 960, 540, 1200);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(0.45, '#0f172a');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1920, 1080);
    return;
  }

  ctx.save();
  let filterStr = `brightness(${brightness}%) contrast(${contrast}%)`;
  if (blurPx && blurPx > 0) {
    filterStr += ` blur(${blurPx}px)`;
  }
  ctx.filter = filterStr;

  const canvasAspect = 1920 / 1080;
  const imgAspect = bgImg.naturalWidth / bgImg.naturalHeight;

  let baseW = 1920;
  let baseH = 1080;
  if (imgAspect > canvasAspect) {
    baseW = 1080 * imgAspect;
  } else {
    baseH = 1920 / imgAspect;
  }

  const dw = baseW * scale;
  const dh = baseH * scale;
  const dx = (1920 - dw) / 2 + panX;
  const dy = (1080 - dh) / 2 + panY;

  ctx.drawImage(bgImg, dx, dy, dw, dh);
  ctx.restore();
}

/**
 * Renders multi-line punchy typography at an angle with miter stroke and drop shadow.
 */
export function drawPunchyText(ctx, layer) {
  const lines = Array.isArray(layer.lines) ? layer.lines : (layer.text || '').split('\n');
  if (!lines || lines.length === 0 || lines.every(l => !l.trim())) return;

  const fontSize = layer.fontSize || 86;
  const fontFamily = layer.fontFamily || 'Norwester';
  const angle = layer.angle !== undefined ? layer.angle : -5.0;
  const fillColor = layer.fillColor || '#ffffff';
  const strokeColor = layer.strokeColor || '#000000';
  const strokeWidth = layer.strokeWidth !== undefined ? layer.strokeWidth : 16;
  const lineHeight = fontSize * (layer.lineHeightMultiplier || 1.05);

  ctx.save();
  ctx.translate(layer.x, layer.y);
  if (angle !== 0) {
    ctx.rotate((angle * Math.PI) / 180);
  }

  ctx.textAlign = layer.textAlign || 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${fontSize}px "${fontFamily}", "Anton", "Impact", "Montserrat", sans-serif`;

  const totalHeight = lines.length * lineHeight;
  const startY = -(totalHeight / 2) + lineHeight / 2;

  // 1. Draw Drop Shadow pass
  if (layer.shadow) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.90)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 8;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = strokeColor;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], 0, startY + i * lineHeight);
    }
    ctx.restore();
  }

  // 2. Heavy Miter Stroke Outline
  if (strokeWidth > 0) {
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 2.5;
    for (let i = 0; i < lines.length; i++) {
      ctx.strokeText(lines[i], 0, startY + i * lineHeight);
    }
    ctx.restore();
  }

  // 3. Crisp Fill
  ctx.fillStyle = fillColor;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], 0, startY + i * lineHeight);
  }

  ctx.restore();
}
