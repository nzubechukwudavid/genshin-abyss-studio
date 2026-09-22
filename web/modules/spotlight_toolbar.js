/**
 * Spotlight Mode Contextual Inspector & Properties Panel
 * Dynamically updates controls based on active selection (Background, Character, or Text).
 */

export class SpotlightToolbar {
  constructor(containerId, scene, videoPicker, posePicker) {
    this.container = document.getElementById(containerId);
    this.scene = scene;
    this.videoPicker = videoPicker;
    this.posePicker = posePicker;

    this.activeTab = 'char'; // 'bg', 'char', 'text'
    this.renderDOM();
    this.bindEvents();
  }

  renderDOM() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="spotlight-toolbar-wrapper">
        <!-- Quick Layer Switcher -->
        <div class="spotlight-layer-tabs">
          <button class="btn-layer-tab ${this.activeTab === 'bg' ? 'active' : ''}" data-layer="bg">
            <span>🖼️</span> Background
          </button>
          <button class="btn-layer-tab ${this.activeTab === 'char' ? 'active' : ''}" data-layer="char">
            <span>👤</span> Character
          </button>
          <button class="btn-layer-tab ${this.activeTab === 'text' ? 'active' : ''}" data-layer="text">
            <span>✍️</span> Title Text
          </button>
        </div>

        <!-- Layout Presets Quick Bar -->
        <div class="spotlight-presets-bar">
          <span class="preset-label">Presets:</span>
          <button class="btn-preset-chip" id="btnPresetShowcase">🌟 Showcase (Right)</button>
          <button class="btn-preset-chip" id="btnPresetInverted">🌟 Inverted (Left)</button>
          <button class="btn-preset-chip" id="btnPresetCenter">🌟 Center Boss</button>
        </div>

        <!-- 1. Background Settings Panel -->
        <div class="spotlight-panel ${this.activeTab === 'bg' ? 'active' : ''}" id="panelBgSettings">
          <div class="spotlight-panel-title">Highlight Background Settings</div>
          
          <div class="spotlight-action-buttons-row">
            <button class="btn btn-primary btn-block" id="btnOpenVideoScrubber">
              📸 Capture Frame from Video Clip
            </button>
            <label class="btn btn-secondary btn-block file-upload-btn">
              📁 Upload Screenshot
              <input type="file" id="inputCustomBgUpload" accept="image/*" style="display:none;" />
            </label>
          </div>

          <div class="control-group">
            <div class="slider-header">
              <label>Gaussian Blur</label>
              <span id="lblBgBlur">5 px (7%)</span>
            </div>
            <input type="range" id="sliderBgBlur" min="0" max="30" step="1" value="5" />
            <span class="control-hint">Subtle blur softens combat chaos so damage numbers & text pop.</span>
          </div>

          <div class="control-group">
            <div class="slider-header">
              <label>Brightness</label>
              <span id="lblBgBrightness">100%</span>
            </div>
            <input type="range" id="sliderBgBrightness" min="60" max="140" step="1" value="100" />
          </div>

          <div class="control-group">
            <div class="slider-header">
              <label>Contrast</label>
              <span id="lblBgContrast">105%</span>
            </div>
            <input type="range" id="sliderBgContrast" min="70" max="150" step="1" value="105" />
          </div>

          <button class="btn btn-ghost btn-sm" id="btnResetBgPan">↺ Reset Pan & Zoom</button>
        </div>

        <!-- 2. Character Settings Panel -->
        <div class="spotlight-panel ${this.activeTab === 'char' ? 'active' : ''}" id="panelCharSettings">
          <div class="spotlight-panel-title">Character Cutout & Outline</div>

          <div class="char-picker-row">
            <button class="btn btn-secondary btn-block" id="btnOpenPosePicker">
              ✨ Browse Official Poses / Cutouts
            </button>
          </div>

          <div class="control-group checkbox-row">
            <label class="checkbox-label">
              <input type="checkbox" id="chkCharOutline" checked />
              <span>Canva Solid Black Outline / Glow</span>
            </label>
          </div>

          <div class="control-group">
            <div class="slider-header">
              <label>Outline Thickness</label>
              <span id="lblCharOutlineThick">14 px</span>
            </div>
            <input type="range" id="sliderCharOutlineThick" min="0" max="32" step="1" value="14" />
          </div>

          <div class="control-group">
            <label>Outline Color</label>
            <div class="color-palette-row" id="charOutlinePalette">
              <button class="color-swatch active" style="background:#000000;" data-color="#000000" title="Black"></button>
              <button class="color-swatch" style="background:#ffffff;" data-color="#ffffff" title="White"></button>
              <button class="color-swatch" style="background:#38bdf8;" data-color="#38bdf8" title="Anemo/Cryo Cyan"></button>
              <button class="color-swatch" style="background:#fde047;" data-color="#fde047" title="Geo Gold"></button>
              <button class="color-swatch" style="background:#e11d48;" data-color="#e11d48" title="Pyro Crimson"></button>
            </div>
          </div>

          <div class="control-group">
            <div class="slider-header">
              <label>Scale</label>
              <span id="lblCharScale">1.05x</span>
            </div>
            <input type="range" id="sliderCharScale" min="0.4" max="2.5" step="0.05" value="1.05" />
          </div>

          <div class="control-group">
            <div class="slider-header">
              <label>Rotation</label>
              <span id="lblCharRot">0°</span>
            </div>
            <input type="range" id="sliderCharRot" min="-180" max="180" step="1" value="0" />
          </div>

          <div class="action-buttons-row">
            <button class="btn btn-secondary btn-sm" id="btnCharFlip">↔ Flip / Mirror (F)</button>
            <button class="btn btn-ghost btn-sm" id="btnResetCharPos">↺ Reset Position</button>
          </div>
        </div>

        <!-- 3. Typography Settings Panel -->
        <div class="spotlight-panel ${this.activeTab === 'text' ? 'active' : ''}" id="panelTextSettings">
          <div class="spotlight-panel-title">Punchy Angled Typography</div>

          <div class="control-group">
            <label>Title Text (Multi-Line):</label>
            <textarea id="txtSpotlightInput" rows="2" class="studio-textarea">DPS VENTI IS\nAMAZING!</textarea>
          </div>

          <div class="control-group">
            <label>Font Family:</label>
            <select id="selSpotlightFont" class="studio-select">
              <option value="Norwester" selected>Norwester (Recommended - Bundled)</option>
              <option value="Anton">Anton (Bold Uppercase)</option>
              <option value="Bebas Neue">Bebas Neue (Condensed Tall)</option>
              <option value="Montserrat">Montserrat Black</option>
            </select>
          </div>

          <div class="control-group">
            <div class="slider-header">
              <label>Tilt Angle</label>
              <span id="lblTextAngle">-5.0°</span>
            </div>
            <input type="range" id="sliderTextAngle" min="-15" max="15" step="0.5" value="-5" />
            <div class="preset-angle-buttons">
              <button class="btn-chip" data-angle="-5">-5° (Standard)</button>
              <button class="btn-chip" data-angle="0">0° (Flat)</button>
              <button class="btn-chip" data-angle="5">+5° (Inverted)</button>
            </div>
          </div>

          <div class="control-group">
            <div class="slider-header">
              <label>Font Size</label>
              <span id="lblTextSize">88 px</span>
            </div>
            <input type="range" id="sliderTextSize" min="40" max="160" step="2" value="88" />
          </div>

          <div class="control-group">
            <div class="slider-header">
              <label>Black Outline Width</label>
              <span id="lblTextStroke">16 px</span>
            </div>
            <input type="range" id="sliderTextStroke" min="0" max="32" step="1" value="16" />
          </div>

          <div class="control-group">
            <label>Fill Color:</label>
            <div class="color-palette-row" id="textFillPalette">
              <button class="color-swatch active" style="background:#ffffff;" data-color="#ffffff" title="Pure White"></button>
              <button class="color-swatch" style="background:#fde047;" data-color="#fde047" title="Electric Gold"></button>
              <button class="color-swatch" style="background:#38bdf8;" data-color="#38bdf8" title="Cyan Burst"></button>
              <button class="color-swatch" style="background:#fb7185;" data-color="#fb7185" title="Rose Crimson"></button>
            </div>
          </div>

          <div class="control-group checkbox-row">
            <label class="checkbox-label">
              <input type="checkbox" id="chkTextShadow" checked />
              <span>Heavy Drop Shadow (Boosts Combat Contrast)</span>
            </label>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // 1. Layer Tabs
    this.container.querySelectorAll('.btn-layer-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const layerId = btn.getAttribute('data-layer');
        this.selectLayerTab(layerId);
      });
    });

    // 2. Presets
    document.getElementById('btnPresetShowcase')?.addEventListener('click', () => this.applyPresetShowcase());
    document.getElementById('btnPresetInverted')?.addEventListener('click', () => this.applyPresetInverted());
    document.getElementById('btnPresetCenter')?.addEventListener('click', () => this.applyPresetCenter());

    // 3. Background Controls
    const sliderBlur = document.getElementById('sliderBgBlur');
    sliderBlur?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      this.scene.layers.bg.blur = val;
      const pct = Math.round((val / 30) * 40);
      document.getElementById('lblBgBlur').textContent = `${val} px (~${pct}%)`;
      this.scene.render();
    });

    const sliderBr = document.getElementById('sliderBgBrightness');
    sliderBr?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      this.scene.layers.bg.brightness = val;
      document.getElementById('lblBgBrightness').textContent = `${val}%`;
      this.scene.render();
    });

    const sliderCt = document.getElementById('sliderBgContrast');
    sliderCt?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      this.scene.layers.bg.contrast = val;
      document.getElementById('lblBgContrast').textContent = `${val}%`;
      this.scene.render();
    });

    document.getElementById('btnResetBgPan')?.addEventListener('click', () => {
      this.scene.layers.bg.panX = 0;
      this.scene.layers.bg.panY = 0;
      this.scene.layers.bg.scale = 1.0;
      this.scene.render();
    });

    document.getElementById('btnOpenVideoScrubber')?.addEventListener('click', () => {
      if (this.videoPicker) {
        // Collect video clips from window.currentAbyssRecordings or session
        const clips = window.currentAbyssRecordings || [];
        this.videoPicker.open(clips);
      }
    });

    document.getElementById('inputCustomBgUpload')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => {
        const img = new Image();
        img.onload = () => {
          this.scene.layers.bg.img = img;
          this.scene.render();
        };
        img.src = re.target.result;
      };
      reader.readAsDataURL(file);
    });

    // 4. Character Controls
    document.getElementById('btnOpenPosePicker')?.addEventListener('click', () => {
      if (this.posePicker) {
        this.posePicker.open(this.scene.layers.char.charName || 'Venti');
      }
    });

    document.getElementById('chkCharOutline')?.addEventListener('change', (e) => {
      this.scene.layers.char.outline = e.target.checked;
      this.scene.render();
    });

    const sliderOutlineThick = document.getElementById('sliderCharOutlineThick');
    sliderOutlineThick?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      this.scene.layers.char.outlineThickness = val;
      document.getElementById('lblCharOutlineThick').textContent = `${val} px`;
      this.scene.render();
    });

    document.getElementById('charOutlinePalette')?.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        document.getElementById('charOutlinePalette').querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        this.scene.layers.char.outlineColor = swatch.getAttribute('data-color');
        this.scene.render();
      });
    });

    const sliderCharScale = document.getElementById('sliderCharScale');
    sliderCharScale?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.scene.layers.char.scale = val;
      document.getElementById('lblCharScale').textContent = `${val.toFixed(2)}x`;
      this.scene.render();
    });

    const sliderCharRot = document.getElementById('sliderCharRot');
    sliderCharRot?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      this.scene.layers.char.rotation = val;
      document.getElementById('lblCharRot').textContent = `${val}°`;
      this.scene.render();
    });

    document.getElementById('btnCharFlip')?.addEventListener('click', () => {
      this.scene.layers.char.mirror = !this.scene.layers.char.mirror;
      this.scene.render();
    });

    document.getElementById('btnResetCharPos')?.addEventListener('click', () => {
      this.scene.layers.char.x = 1380;
      this.scene.layers.char.y = 550;
      this.scene.layers.char.scale = 1.05;
      this.scene.layers.char.rotation = 0;
      this.syncControlsFromScene();
      this.scene.render();
    });

    // 5. Text Controls
    const txtInput = document.getElementById('txtSpotlightInput');
    txtInput?.addEventListener('input', (e) => {
      this.scene.layers.text.lines = e.target.value.split('\n');
      this.scene.render();
    });

    document.getElementById('selSpotlightFont')?.addEventListener('change', (e) => {
      this.scene.layers.text.fontFamily = e.target.value;
      this.scene.render();
    });

    const sliderTextAngle = document.getElementById('sliderTextAngle');
    sliderTextAngle?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.scene.layers.text.angle = val;
      document.getElementById('lblTextAngle').textContent = `${val.toFixed(1)}°`;
      this.scene.render();
    });

    this.container.querySelectorAll('.preset-angle-buttons .btn-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const ang = parseFloat(chip.getAttribute('data-angle'));
        this.scene.layers.text.angle = ang;
        if (sliderTextAngle) sliderTextAngle.value = ang;
        document.getElementById('lblTextAngle').textContent = `${ang.toFixed(1)}°`;
        this.scene.render();
      });
    });

    const sliderTextSize = document.getElementById('sliderTextSize');
    sliderTextSize?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      this.scene.layers.text.fontSize = val;
      document.getElementById('lblTextSize').textContent = `${val} px`;
      this.scene.render();
    });

    const sliderTextStroke = document.getElementById('sliderTextStroke');
    sliderTextStroke?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      this.scene.layers.text.strokeWidth = val;
      document.getElementById('lblTextStroke').textContent = `${val} px`;
      this.scene.render();
    });

    document.getElementById('textFillPalette')?.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        document.getElementById('textFillPalette').querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        this.scene.layers.text.fillColor = swatch.getAttribute('data-color');
        this.scene.render();
      });
    });

    document.getElementById('chkTextShadow')?.addEventListener('change', (e) => {
      this.scene.layers.text.shadow = e.target.checked;
      this.scene.render();
    });
  }

  selectLayerTab(layerId) {
    this.activeTab = layerId;
    this.scene.selectedId = layerId;

    this.container.querySelectorAll('.btn-layer-tab').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-layer') === layerId);
    });

    document.getElementById('panelBgSettings')?.classList.toggle('active', layerId === 'bg');
    document.getElementById('panelCharSettings')?.classList.toggle('active', layerId === 'char');
    document.getElementById('panelTextSettings')?.classList.toggle('active', layerId === 'text');

    this.scene.render();
  }

  syncControlsFromScene() {
    // Synchronize UI values when scene changes via canvas gizmo
    const char = this.scene.layers.char;
    const text = this.scene.layers.text;
    const bg = this.scene.layers.bg;

    const lblCharScale = document.getElementById('lblCharScale');
    if (lblCharScale) lblCharScale.textContent = `${char.scale.toFixed(2)}x`;
    const sliderCharScale = document.getElementById('sliderCharScale');
    if (sliderCharScale) sliderCharScale.value = char.scale;

    const lblCharRot = document.getElementById('lblCharRot');
    if (lblCharRot) lblCharRot.textContent = `${char.rotation}°`;
    const sliderCharRot = document.getElementById('sliderCharRot');
    if (sliderCharRot) sliderCharRot.value = char.rotation;

    const lblTextSize = document.getElementById('lblTextSize');
    if (lblTextSize) lblTextSize.textContent = `${text.fontSize} px`;
    const sliderTextSize = document.getElementById('sliderTextSize');
    if (sliderTextSize) sliderTextSize.value = text.fontSize;

    const lblTextAngle = document.getElementById('lblTextAngle');
    if (lblTextAngle) lblTextAngle.textContent = `${text.angle.toFixed(1)}°`;
    const sliderTextAngle = document.getElementById('sliderTextAngle');
    if (sliderTextAngle) sliderTextAngle.value = text.angle;
  }

  applyPresetShowcase() {
    // Character on Right, Text on Bottom-Left at -5°
    this.scene.layers.char.x = 1380;
    this.scene.layers.char.y = 550;
    this.scene.layers.char.scale = 1.05;
    this.scene.layers.char.rotation = 0;
    this.scene.layers.char.mirror = false;

    this.scene.layers.text.x = 420;
    this.scene.layers.text.y = 780;
    this.scene.layers.text.angle = -5.0;
    this.scene.layers.text.fontSize = 88;
    this.scene.layers.text.textAlign = 'left';

    this.syncControlsFromScene();
    this.scene.render();
  }

  applyPresetInverted() {
    // Character on Left, Text on Bottom-Right at +5°
    this.scene.layers.char.x = 540;
    this.scene.layers.char.y = 550;
    this.scene.layers.char.scale = 1.05;
    this.scene.layers.char.rotation = 0;
    this.scene.layers.char.mirror = true;

    this.scene.layers.text.x = 1450;
    this.scene.layers.text.y = 780;
    this.scene.layers.text.angle = 5.0;
    this.scene.layers.text.fontSize = 88;
    this.scene.layers.text.textAlign = 'right';

    this.syncControlsFromScene();
    this.scene.render();
  }

  applyPresetCenter() {
    // Character Center-Right, Text Top
    this.scene.layers.char.x = 960;
    this.scene.layers.char.y = 550;
    this.scene.layers.char.scale = 1.15;
    this.scene.layers.char.rotation = 0;

    this.scene.layers.text.x = 960;
    this.scene.layers.text.y = 180;
    this.scene.layers.text.angle = 0;
    this.scene.layers.text.fontSize = 92;
    this.scene.layers.text.textAlign = 'center';

    this.syncControlsFromScene();
    this.scene.render();
  }
}
