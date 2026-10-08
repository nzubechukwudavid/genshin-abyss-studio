/**
 * Character Picker Modal & Gallery Filmstrip ES Module for Genshin Abyss Studio.
 * Handles the character roster selection modal, search & vision filtering,
 * HoYoWiki official gallery filmstrip, and unit asset caching indicators.
 */


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
        const targetSlot = getSlot(teammateSelectionTarget.slot);
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


export {
  renderGalleryFilmstrip,
  updateUnitCacheStatus,
  populateModalCharGrid,
  openCharacterPickerModal
};
