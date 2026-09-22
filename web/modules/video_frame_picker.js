/**
 * Video Frame Scrubber & Highlight Frame Extractor Modal
 * Allows stepping frame-by-frame through recorded gameplay clips and capturing 1080p frames in 0ms.
 */

export class VideoFramePickerModal {
  constructor(onFrameCaptured) {
    this.onFrameCaptured = onFrameCaptured;
    this.modalEl = null;
    this.videoEl = null;
    this.timeSlider = null;
    this.timeDisplay = null;
    this.clipSelect = null;
    this.clips = [];
    this.createModalDOM();
  }

  createModalDOM() {
    let modal = document.getElementById('videoFrameScrubberModal');
    if (modal) {
      this.modalEl = modal;
      this.bindElements();
      return;
    }

    modal = document.createElement('div');
    modal.id = 'videoFrameScrubberModal';
    modal.className = 'modal-backdrop';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="modal-card scrubber-modal-card">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <span class="modal-icon">🎬</span>
            <h3>Capture Highlight Frame from Video</h3>
          </div>
          <button class="modal-close-btn" id="btnScrubberClose">✕</button>
        </div>
        <div class="modal-body scrubber-body">
          <div class="scrubber-clip-selector-row">
            <label>Select Clip:</label>
            <select id="scrubberClipSelect" class="studio-select"></select>
          </div>
          
          <div class="scrubber-video-wrapper">
            <video id="scrubberVideoPlayer" preload="metadata" crossOrigin="anonymous"></video>
          </div>

          <div class="scrubber-controls-row">
            <input type="range" id="scrubberTimeSlider" min="0" max="100" step="0.01" value="0" class="scrubber-slider" />
            <div class="scrubber-time-display" id="scrubberTimeDisplay">00:00.00 / 00:00.00</div>
          </div>

          <div class="scrubber-buttons-row">
            <button class="btn btn-secondary btn-sm" id="btnScrubBack1s">◀ -1s</button>
            <button class="btn btn-secondary btn-sm" id="btnScrubBackFrame">◀ -1 Frame</button>
            <button class="btn btn-secondary btn-sm" id="btnScrubPlayPause">⏯ Play/Pause</button>
            <button class="btn btn-secondary btn-sm" id="btnScrubFwdFrame">+1 Frame ▶</button>
            <button class="btn btn-secondary btn-sm" id="btnScrubFwd1s">+1s ▶</button>
          </div>
        </div>
        <div class="modal-footer scrubber-footer">
          <button class="btn btn-ghost" id="btnScrubberCancel">Cancel</button>
          <button class="btn btn-primary" id="btnScrubberCapture">📸 Set Frame as Background</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;
    this.bindElements();
  }

  bindElements() {
    this.videoEl = document.getElementById('scrubberVideoPlayer');
    this.timeSlider = document.getElementById('scrubberTimeSlider');
    this.timeDisplay = document.getElementById('scrubberTimeDisplay');
    this.clipSelect = document.getElementById('scrubberClipSelect');

    document.getElementById('btnScrubberClose')?.addEventListener('click', () => this.close());
    document.getElementById('btnScrubberCancel')?.addEventListener('click', () => this.close());

    this.clipSelect?.addEventListener('change', (e) => {
      this.loadClip(e.target.value);
    });

    this.videoEl?.addEventListener('loadedmetadata', () => {
      this.timeSlider.max = this.videoEl.duration || 100;
      this.updateTimeDisplay();
    });

    this.videoEl?.addEventListener('timeupdate', () => {
      if (!this.isDraggingSlider) {
        this.timeSlider.value = this.videoEl.currentTime;
        this.updateTimeDisplay();
      }
    });

    this.timeSlider?.addEventListener('input', () => {
      this.isDraggingSlider = true;
      this.videoEl.currentTime = parseFloat(this.timeSlider.value);
      this.updateTimeDisplay();
    });

    this.timeSlider?.addEventListener('change', () => {
      this.isDraggingSlider = false;
    });

    // Step buttons (assumes ~30-60fps: 0.033s per frame)
    const frameStep = 1 / 30;
    document.getElementById('btnScrubBack1s')?.addEventListener('click', () => {
      this.videoEl.currentTime = Math.max(0, this.videoEl.currentTime - 1.0);
    });
    document.getElementById('btnScrubFwd1s')?.addEventListener('click', () => {
      this.videoEl.currentTime = Math.min(this.videoEl.duration, this.videoEl.currentTime + 1.0);
    });
    document.getElementById('btnScrubBackFrame')?.addEventListener('click', () => {
      this.videoEl.currentTime = Math.max(0, this.videoEl.currentTime - frameStep);
    });
    document.getElementById('btnScrubFwdFrame')?.addEventListener('click', () => {
      this.videoEl.currentTime = Math.min(this.videoEl.duration, this.videoEl.currentTime + frameStep);
    });
    document.getElementById('btnScrubPlayPause')?.addEventListener('click', () => {
      if (this.videoEl.paused) this.videoEl.play();
      else this.videoEl.pause();
    });

    document.getElementById('btnScrubberCapture')?.addEventListener('click', () => {
      this.captureCurrentFrame();
    });
  }

  updateTimeDisplay() {
    const cur = this.formatTime(this.videoEl?.currentTime || 0);
    const dur = this.formatTime(this.videoEl?.duration || 0);
    if (this.timeDisplay) {
      this.timeDisplay.textContent = `${cur} / ${dur}`;
    }
  }

  formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }

  open(clips = []) {
    this.clips = clips;
    if (this.clipSelect) {
      this.clipSelect.innerHTML = '';
      if (clips.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No session clips found (Upload or record in Arranger)';
        this.clipSelect.appendChild(opt);
      } else {
        clips.forEach((clip, idx) => {
          const opt = document.createElement('option');
          opt.value = clip.path || clip.url || '';
          opt.textContent = clip.label || clip.name || `Clip ${idx + 1}`;
          this.clipSelect.appendChild(opt);
        });
      }
    }

    if (clips.length > 0 && clips[0].path) {
      this.loadClip(clips[0].path);
    }

    if (this.modalEl) {
      this.modalEl.style.display = 'flex';
    }
  }

  loadClip(clipPath) {
    if (!clipPath || !this.videoEl) return;
    const streamUrl = `/api/stream-video?path=${encodeURIComponent(clipPath)}`;
    this.videoEl.src = streamUrl;
    this.videoEl.currentTime = 0;
  }

  captureCurrentFrame() {
    if (!this.videoEl || this.videoEl.videoWidth === 0) {
      alert('Video frame is not ready yet. Please wait for the clip to load.');
      return;
    }

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = 1920;
    captureCanvas.height = 1080;
    const cctx = captureCanvas.getContext('2d');
    cctx.drawImage(this.videoEl, 0, 0, 1920, 1080);

    const dataUrl = captureCanvas.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
      if (typeof this.onFrameCaptured === 'function') {
        this.onFrameCaptured(img);
      }
      this.close();
    };
    img.src = dataUrl;
  }

  close() {
    if (this.videoEl) {
      this.videoEl.pause();
    }
    if (this.modalEl) {
      this.modalEl.style.display = 'none';
    }
  }
}
