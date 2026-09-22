/**
 * Character Transparent Pose Picker Modal
 * Displays available transparent cutouts for the active character and loads them onto the canvas.
 */

export class PosePickerModal {
  constructor(onPoseSelected) {
    this.onPoseSelected = onPoseSelected;
    this.modalEl = null;
    this.gridEl = null;
    this.titleEl = null;
    this.catalog = null;
    this.createModalDOM();
    this.loadCatalog();
  }

  async loadCatalog() {
    try {
      const resp = await fetch('/api/renders/catalog');
      if (resp.ok) {
        this.catalog = await resp.json();
      }
    } catch (e) {
      console.warn('Renders catalog load note:', e);
    }
  }

  createModalDOM() {
    let modal = document.getElementById('posePickerModal');
    if (modal) {
      this.modalEl = modal;
      this.bindElements();
      return;
    }

    modal = document.createElement('div');
    modal.id = 'posePickerModal';
    modal.className = 'modal-backdrop';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="modal-card pose-modal-card">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <span class="modal-icon">✨</span>
            <h3 id="poseModalTitle">Select Character Transparent Pose</h3>
          </div>
          <button class="modal-close-btn" id="btnPoseModalClose">✕</button>
        </div>
        <div class="modal-body pose-modal-body">
          <p class="pose-modal-subtitle">Choose from official transparent renders & cutouts (HoYo-Transparents vault)</p>
          <div class="pose-grid" id="poseGridContainer">
            <div class="pose-loading-spinner">Loading poses...</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="btnPoseModalCancel">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;
    this.bindElements();
  }

  bindElements() {
    this.gridEl = document.getElementById('poseGridContainer');
    this.titleEl = document.getElementById('poseModalTitle');

    document.getElementById('btnPoseModalClose')?.addEventListener('click', () => this.close());
    document.getElementById('btnPoseModalCancel')?.addEventListener('click', () => this.close());
  }

  async open(characterName = 'Venti') {
    if (!this.catalog) {
      await this.loadCatalog();
    }

    if (this.titleEl) {
      this.titleEl.textContent = `${characterName} - Transparent Cutouts`;
    }

    if (this.modalEl) {
      this.modalEl.style.display = 'flex';
    }

    this.renderPoseCards(characterName);
  }

  renderPoseCards(characterName) {
    if (!this.gridEl) return;
    this.gridEl.innerHTML = '';

    const charKey = Object.keys(this.catalog?.characters || {}).find(
      k => k.toLowerCase() === characterName.toLowerCase()
    );
    const charData = charKey ? this.catalog.characters[charKey] : null;
    const renders = charData?.renders || [];

    if (renders.length === 0) {
      this.gridEl.innerHTML = `
        <div class="pose-empty-state">
          <p>No transparent renders cached for <strong>${characterName}</strong> yet.</p>
          <p class="text-muted">Use the fallback official splash art or run <code>python execution/crawl_hoyo_transparents.py --char ${characterName}</code>.</p>
        </div>
      `;
      return;
    }

    renders.forEach((render, idx) => {
      const card = document.createElement('div');
      card.className = 'pose-card';
      
      const thumbSrc = render.thumb_url || render.url;
      card.innerHTML = `
        <div class="pose-card-preview-wrap">
          <img src="${thumbSrc}" alt="${render.title}" class="pose-card-img" loading="lazy" />
        </div>
        <div class="pose-card-info">
          <div class="pose-card-title">${render.title || `Pose ${idx + 1}`}</div>
          <div class="pose-card-badge">${render.source === 'google_drive' ? '7K Master' : 'HD WebP'}</div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.selectPose(characterName, render);
      });

      this.gridEl.appendChild(card);
    });
  }

  selectPose(characterName, render) {
    const imgUrl = render.url;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (typeof this.onPoseSelected === 'function') {
        this.onPoseSelected(characterName, img, render.title);
      }
      this.close();
    };
    img.src = imgUrl;
  }

  close() {
    if (this.modalEl) {
      this.modalEl.style.display = 'none';
    }
  }
}
