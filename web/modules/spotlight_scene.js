/**
 * Spotlight Mode Scene Graph & Interactive Transform Gizmo Engine
 * Object-oriented multi-layer manipulation: Drag, Scale, Rotate, and Keyboard Nudge.
 */

import { drawCanvaOutline, drawBackgroundLayer, drawPunchyText } from './spotlight_effects.js';

export class SpotlightScene {
  constructor(canvas, ctx, onStateChange = null) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.onStateChange = onStateChange;

    // Layer Stack
    this.layers = {
      bg: {
        id: 'bg',
        type: 'bg',
        img: null,
        panX: 0,
        panY: 0,
        scale: 1.0,
        blur: 5,
        brightness: 100,
        contrast: 105
      },
      char: {
        id: 'char',
        type: 'char',
        img: null,
        charName: 'Venti',
        poseTitle: 'Official Render',
        x: 1380,
        y: 550,
        scale: 1.05,
        rotation: 0,
        mirror: false,
        outline: true,
        outlineColor: '#000000',
        outlineThickness: 14
      },
      text: {
        id: 'text',
        type: 'text',
        lines: ['DPS VENTI IS', 'AMAZING!'],
        x: 420,
        y: 780,
        fontSize: 88,
        fontFamily: 'Norwester',
        angle: -5.0,
        fillColor: '#ffffff',
        strokeColor: '#000000',
        strokeWidth: 16,
        shadow: true,
        textAlign: 'left'
      }
    };

    this.selectedId = 'char'; // 'bg', 'char', 'text', or null
    this.interaction = null; // { mode: 'drag'|'scale'|'rot', handle: '', startX, startY, origLayer: {} }
    this.isExporting = false;

    this.initEvents();
  }

  initEvents() {
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', () => this.onPointerUp());

    // Keyboard Arrow Nudging & Deletion
    window.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (!this.selectedId || this.selectedId === 'bg') return;
      const step = e.shiftKey ? 10 : 2;
      const layer = this.layers[this.selectedId];
      if (!layer) return;

      let changed = false;
      if (e.key === 'ArrowLeft') { layer.x -= step; changed = true; }
      else if (e.key === 'ArrowRight') { layer.x += step; changed = true; }
      else if (e.key === 'ArrowUp') { layer.y -= step; changed = true; }
      else if (e.key === 'ArrowDown') { layer.y += step; changed = true; }
      else if (e.key.toLowerCase() === 'f' && this.selectedId === 'char') {
        layer.mirror = !layer.mirror;
        changed = true;
      }

      if (changed) {
        e.preventDefault();
        this.render();
        this.notifyChange();
      }
    });
  }

  getPointerCanvasPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = 1920 / rect.width;
    const scaleY = 1080 / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  measureLayerBounds(layer) {
    if (layer.type === 'char') {
      const w = (layer.img?.naturalWidth || 600) * (layer.scale || 1.0);
      const h = (layer.img?.naturalHeight || 800) * (layer.scale || 1.0);
      return { cx: layer.x, cy: layer.y, w, h, angle: layer.rotation || 0 };
    }
    if (layer.type === 'text') {
      this.ctx.save();
      this.ctx.font = `900 ${layer.fontSize}px "${layer.fontFamily}", "Anton", sans-serif`;
      const lines = layer.lines || [''];
      let maxW = 0;
      for (const line of lines) {
        const m = this.ctx.measureText(line);
        if (m.width > maxW) maxW = m.width;
      }
      this.ctx.restore();
      const pad = 24;
      const w = maxW + pad * 2;
      const lineHeight = layer.fontSize * 1.05;
      const h = lines.length * lineHeight + pad;
      // In text alignment left, cx is x + w/2
      const cx = layer.textAlign === 'left' ? layer.x + w / 2 - pad : layer.x;
      const cy = layer.y;
      return { cx, cy, w, h, angle: layer.angle || 0 };
    }
    return null;
  }

  hitTestGizmo(pos, bounds) {
    const rad = (-bounds.angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = pos.x - bounds.cx;
    const dy = pos.y - bounds.cy;
    const localX = cos * dx - sin * dy;
    const localY = sin * dx + cos * dy;

    const hw = bounds.w / 2;
    const hh = bounds.h / 2;
    const handleRadius = 24; // Generous touch/mouse target

    // 1. Rotation handle (extends 40px above top center)
    const rotHandleY = -hh - 45;
    if (Math.hypot(localX - 0, localY - rotHandleY) <= handleRadius) {
      return 'rot';
    }

    // 2. Corner scale handles
    if (Math.hypot(localX - (-hw), localY - (-hh)) <= handleRadius) return 'tl';
    if (Math.hypot(localX - hw, localY - (-hh)) <= handleRadius) return 'tr';
    if (Math.hypot(localX - (-hw), localY - hh) <= handleRadius) return 'bl';
    if (Math.hypot(localX - hw, localY - hh) <= handleRadius) return 'br';

    // 3. Body hit
    if (Math.abs(localX) <= hw && Math.abs(localY) <= hh) {
      return 'body';
    }

    return null;
  }

  onPointerDown(e) {
    const pos = this.getPointerCanvasPos(e);

    // 1. Check if clicking handles on currently selected layer
    if (this.selectedId && this.selectedId !== 'bg') {
      const activeLayer = this.layers[this.selectedId];
      const bounds = this.measureLayerBounds(activeLayer);
      if (bounds) {
        const hit = this.hitTestGizmo(pos, bounds);
        if (hit) {
          this.interaction = {
            mode: hit === 'rot' ? 'rot' : (hit === 'body' ? 'drag' : 'scale'),
            handle: hit,
            startX: pos.x,
            startY: pos.y,
            origLayer: { ...activeLayer },
            bounds
          };
          return;
        }
      }
    }

    // 2. Hit-test layers in reverse order (top to bottom: text -> char)
    const checkOrder = ['text', 'char'];
    for (const id of checkOrder) {
      const layer = this.layers[id];
      const bounds = this.measureLayerBounds(layer);
      if (bounds && this.hitTestGizmo(pos, bounds)) {
        this.selectedId = id;
        this.interaction = {
          mode: 'drag',
          handle: 'body',
          startX: pos.x,
          startY: pos.y,
          origLayer: { ...layer },
          bounds
        };
        this.render();
        this.notifyChange();
        return;
      }
    }

    // 3. If clicking background, select background for pan/zoom
    this.selectedId = 'bg';
    this.interaction = {
      mode: 'drag_bg',
      startX: pos.x,
      startY: pos.y,
      origPanX: this.layers.bg.panX,
      origPanY: this.layers.bg.panY
    };
    this.render();
    this.notifyChange();
  }

  onPointerMove(e) {
    if (!this.interaction) return;
    const pos = this.getPointerCanvasPos(e);
    const { mode, handle, startX, startY, origLayer, bounds } = this.interaction;

    if (mode === 'drag_bg') {
      this.layers.bg.panX = this.interaction.origPanX + (pos.x - startX);
      this.layers.bg.panY = this.interaction.origPanY + (pos.y - startY);
      this.render();
      return;
    }

    const layer = this.layers[this.selectedId];
    if (!layer) return;

    if (mode === 'drag') {
      layer.x = origLayer.x + (pos.x - startX);
      layer.y = origLayer.y + (pos.y - startY);
    } else if (mode === 'scale') {
      const origDist = Math.hypot(bounds.w / 2, bounds.h / 2);
      const currentDist = Math.hypot(pos.x - bounds.cx, pos.y - bounds.cy);
      const ratio = currentDist / Math.max(10, origDist);
      if (layer.type === 'char') {
        layer.scale = Math.max(0.2, Math.min(3.5, origLayer.scale * ratio));
      } else if (layer.type === 'text') {
        layer.fontSize = Math.round(Math.max(32, Math.min(200, origLayer.fontSize * ratio)));
      }
    } else if (mode === 'rot') {
      const angleRad = Math.atan2(pos.y - bounds.cy, pos.x - bounds.cx);
      let deg = (angleRad * 180) / Math.PI + 90; // offset so top knob is 0 deg
      // Normalize to -180 to 180
      while (deg > 180) deg -= 360;
      while (deg < -180) deg += 360;
      // Snap to -5, 0, 5 if close
      if (Math.abs(deg - (-5)) < 1.5) deg = -5;
      if (Math.abs(deg) < 1.5) deg = 0;
      if (Math.abs(deg - 5) < 1.5) deg = 5;

      if (layer.type === 'char') layer.rotation = Math.round(deg * 10) / 10;
      else if (layer.type === 'text') layer.angle = Math.round(deg * 10) / 10;
    }

    this.render();
  }

  onPointerUp() {
    if (this.interaction) {
      this.interaction = null;
      this.notifyChange();
    }
  }

  notifyChange() {
    if (typeof this.onStateChange === 'function') {
      this.onStateChange(this.selectedId, this.layers);
    }
  }

  render() {
    this.ctx.clearRect(0, 0, 1920, 1080);

    // 1. Render Background
    const bg = this.layers.bg;
    drawBackgroundLayer(this.ctx, bg.img, bg.panX, bg.panY, bg.scale, bg.blur, bg.brightness, bg.contrast);

    // 2. Render Character
    const char = this.layers.char;
    if (char.img && char.img.complete && char.img.naturalWidth > 0) {
      this.ctx.save();
      this.ctx.translate(char.x, char.y);
      if (char.rotation) {
        this.ctx.rotate((char.rotation * Math.PI) / 180);
      }
      if (char.mirror) {
        this.ctx.scale(-1, 1);
      }

      const w = char.img.naturalWidth * (char.scale || 1.0);
      const h = char.img.naturalHeight * (char.scale || 1.0);

      // Canva Outline Shader Pass
      if (char.outline) {
        drawCanvaOutline(this.ctx, char.img, w, h, char.outlineThickness || 14, char.outlineColor || '#000000');
      }

      // Crisp Image Pass
      this.ctx.drawImage(char.img, -w / 2, -h / 2, w, h);
      this.ctx.restore();
    }

    // 3. Render Angled Typography
    const text = this.layers.text;
    drawPunchyText(this.ctx, text);

    // 4. Render Selection Gizmo (omitted during image export)
    if (!this.isExporting && this.selectedId && this.selectedId !== 'bg') {
      const activeLayer = this.layers[this.selectedId];
      const bounds = this.measureLayerBounds(activeLayer);
      if (bounds) {
        this.drawGizmo(bounds);
      }
    }
  }

  drawGizmo(bounds) {
    const { cx, cy, w, h, angle } = bounds;
    this.ctx.save();
    this.ctx.translate(cx, cy);
    if (angle) {
      this.ctx.rotate((angle * Math.PI) / 180);
    }

    const hw = w / 2;
    const hh = h / 2;

    // Cyan selection boundary box
    this.ctx.strokeStyle = '#00e5ff';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([8, 6]);
    this.ctx.strokeRect(-hw, -hh, w, h);
    this.ctx.setLineDash([]);

    // Stalk to rotation knob
    this.ctx.strokeStyle = '#00e5ff';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -hh);
    this.ctx.lineTo(0, -hh - 40);
    this.ctx.stroke();

    // Rotation Handle (Circle knob)
    this.ctx.fillStyle = '#00e5ff';
    this.ctx.beginPath();
    this.ctx.arc(0, -hh - 40, 10, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // 4 Corner Scale Handles
    const corners = [
      [-hw, -hh],
      [hw, -hh],
      [-hw, hh],
      [hw, hh]
    ];
    this.ctx.fillStyle = '#ffffff';
    this.ctx.strokeStyle = '#00e5ff';
    this.ctx.lineWidth = 3;

    for (const [x, y] of corners) {
      this.ctx.beginPath();
      this.ctx.arc(x, y, 9, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  exportCleanCanvas() {
    this.isExporting = true;
    this.render();
    this.isExporting = false;
    return this.canvas;
  }
}
