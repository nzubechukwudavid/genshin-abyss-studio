/**
 * Sidebar Controls & Creator Event Bindings ES Module for Genshin Abyss Studio.
 * Handles inputs for floor, patch, pan/zoom sliders, element filter pills,
 * character search, and canvas action buttons.
 */

export function setupSidebarControls() {
  document.getElementById('tabSide1').addEventListener('click', () => setActiveSlot(1));
  const t3 = document.getElementById('tabSide3');
  if (t3) t3.addEventListener('click', () => setActiveSlot(3));

  const btnStyMode = document.getElementById('btnStudioModeStygian');
  if (btnStyMode) btnStyMode.addEventListener('click', () => setStudioMode('stygian'));
  const btnAbyMode = document.getElementById('btnStudioModeAbyss');
  if (btnAbyMode) btnAbyMode.addEventListener('click', () => setStudioMode('abyss'));
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
  window.setCenterStyle = function(style) {
    state.centerStyle = style;
    updateCenterStyleUI();
    renderCanvas();
  };
  window.updateCenterStyleUI = updateCenterStyleUI;
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
      const slot = getActiveSlot();
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
              const slot = getActiveSlot();
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
    const slot = getActiveSlot();
    slot.scale = Math.min(slot.scale + 0.05, 4.5);
    updateZoomUI();
    renderCanvas();
  });
  document.getElementById('btnZoomOut').addEventListener('click', () => {
    const slot = getActiveSlot();
    slot.scale = Math.max(slot.scale - 0.05, 0.25);
    updateZoomUI();
    renderCanvas();
  });
  document.getElementById('btnZoomFit').addEventListener('click', () => {
    const slot = getActiveSlot();
    slot.scale = 1.05;
    slot.panX = 0;
    slot.panY = -40;
    updateZoomUI();
    renderCanvas();
  });

  // Segmented Constellation Controls
  document.querySelectorAll('.const-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const slot = getActiveSlot();
      slot.constellation = btn.dataset.val;
      document.getElementById('constInput').value = slot.constellation;
      document.querySelectorAll('.const-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCanvas();
    });
  });

  // Archetype Input
  document.getElementById('archetypeInput').addEventListener('input', (e) => {
    const slot = getActiveSlot();
    slot.archetype = e.target.value;
    renderCanvas();
  });

  // Archetype Accent Color Swatch Bar
  const colorBar = document.getElementById('archetypeColorBar');
  if (colorBar) {
    colorBar.querySelectorAll('.color-chip[data-color]').forEach(chip => {
      chip.addEventListener('click', () => {
        const slot = getActiveSlot();
        slot.archetypeColor = chip.dataset.color;
        colorBar.querySelectorAll('.color-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        renderCanvas();
      });
    });

    const customColorInput = document.getElementById('archetypeCustomColor');
    if (customColorInput) {
      customColorInput.addEventListener('input', (e) => {
        const slot = getActiveSlot();
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
    const slot = getActiveSlot();
    slot.customName = e.target.value;
    renderCanvas();
  });

  // Toolbar Action Buttons
  const btnFlip = document.getElementById('tbFlip');
  if (btnFlip) {
    btnFlip.addEventListener('click', () => {
      const slot = getActiveSlot();
      slot.mirror = !slot.mirror;
      renderCanvas();
    });
  }
  const btnReset = document.getElementById('tbReset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      const slot = getActiveSlot();
      slot.panX = 0;
      slot.panY = -40;
      slot.scale = 1.05;
      updateZoomUI();
      renderCanvas();
    });
  }

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

  // Stygian Bosses & Cycle UI Event Handlers
  const inpBossName = document.getElementById('inputStygianBossName');
  if (inpBossName) {
    inpBossName.addEventListener('input', (e) => {
      const idx = Math.min(2, Math.max(0, (state.activeSlot || 1) - 1));
      if (state.stygianBosses && state.stygianBosses[idx]) {
        state.stygianBosses[idx].name = e.target.value.trim().toUpperCase();
        renderCanvas();
      }
    });
  }

  // Stygian Cycle Title Banner Events
  const chkCycleTitle = document.getElementById('chkShowStygianCycleTitle');
  if (chkCycleTitle) {
    chkCycleTitle.addEventListener('change', (e) => {
      state.showStygianCycleTitle = e.target.checked;
      renderCanvas();
      pushUndoState();
    });
  }

  const inpStygianVer = document.getElementById('inputStygianVersion');
  if (inpStygianVer) {
    inpStygianVer.addEventListener('input', (e) => {
      const newVer = e.target.value.trim();
      const oldVer = state.stygianVersion || '7.1';
      state.stygianVersion = newVer;
      if (state.stygianCycleTitle && state.stygianCycleTitle.includes(oldVer)) {
        state.stygianCycleTitle = state.stygianCycleTitle.replace(oldVer, newVer);
        const titleEl = document.getElementById('inputStygianCycleTitle');
        if (titleEl) titleEl.value = state.stygianCycleTitle;
      }
      renderCanvas();
    });
    inpStygianVer.addEventListener('change', () => pushUndoState());
  }

  const inpCycleTitle = document.getElementById('inputStygianCycleTitle');
  if (inpCycleTitle) {
    inpCycleTitle.addEventListener('input', (e) => {
      state.stygianCycleTitle = e.target.value;
      renderCanvas();
    });
    inpCycleTitle.addEventListener('change', () => pushUndoState());
  }

  document.querySelectorAll('#stygianTitleChips [data-title]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ver = state.stygianVersion || '7.1';
      let titleTemplate = btn.getAttribute('data-title') || '';
      if (ver !== '7.1') {
        titleTemplate = titleTemplate.replace(/7\.1/g, ver);
      }
      state.stygianCycleTitle = titleTemplate;
      const inp = document.getElementById('inputStygianCycleTitle');
      if (inp) inp.value = titleTemplate;
      renderCanvas();
      pushUndoState();
      showToast(`⚡ Set Banner: ${titleTemplate}`);
    });
  });

  const rngTitleSize = document.getElementById('rngStygianTitleSize');
  if (rngTitleSize) {
    rngTitleSize.addEventListener('input', (e) => {
      state.stygianCycleTitleSize = parseInt(e.target.value, 10);
      const lbl = document.getElementById('lblStygianTitleSize');
      if (lbl) lbl.textContent = `${state.stygianCycleTitleSize}px`;
      renderCanvas();
    });
    rngTitleSize.addEventListener('change', () => pushUndoState());
  }

  const rngTitleY = document.getElementById('rngStygianTitleY');
  if (rngTitleY) {
    rngTitleY.addEventListener('input', (e) => {
      state.stygianCycleTitleY = parseInt(e.target.value, 10);
      renderCanvas();
    });
    rngTitleY.addEventListener('change', () => pushUndoState());
  }

  // Boss Badge Sizing & Positioning Controls
  const btnSizeCompact = document.getElementById('btnBadgeSizeCompact');
  if (btnSizeCompact) {
    btnSizeCompact.addEventListener('click', () => {
      state.bossBadgeScale = 0.8;
      updateStygianBossUI();
      renderCanvas();
      pushUndoState();
    });
  }

  const btnSizeLarge = document.getElementById('btnBadgeSizeLarge');
  if (btnSizeLarge) {
    btnSizeLarge.addEventListener('click', () => {
      state.bossBadgeScale = 1.0;
      updateStygianBossUI();
      renderCanvas();
      pushUndoState();
    });
  }

  const btnSizeHero = document.getElementById('btnBadgeSizeHero');
  if (btnSizeHero) {
    btnSizeHero.addEventListener('click', () => {
      state.bossBadgeScale = 1.25;
      updateStygianBossUI();
      renderCanvas();
      pushUndoState();
    });
  }

  const rngBadgeScale = document.getElementById('rngBossBadgeScale');
  if (rngBadgeScale) {
    rngBadgeScale.addEventListener('input', (e) => {
      state.bossBadgeScale = parseFloat(e.target.value);
      updateStygianBossUI();
      renderCanvas();
    });
    rngBadgeScale.addEventListener('change', () => pushUndoState());
  }

  const rngBadgeTop = document.getElementById('rngBossBadgeTop');
  if (rngBadgeTop) {
    rngBadgeTop.addEventListener('input', (e) => {
      state.bossBadgeTop = parseInt(e.target.value, 10);
      renderCanvas();
    });
    rngBadgeTop.addEventListener('change', () => pushUndoState());
  }

  const chkBossBadges = document.getElementById('chkShowBossBadges');
  if (chkBossBadges) {
    chkBossBadges.addEventListener('change', (e) => {
      state.showBossBadges = e.target.checked;
      renderCanvas();
      pushUndoState();
    });
  }

  const selCycle = document.getElementById('selStygianCycle');
  if (selCycle) {
    selCycle.addEventListener('change', async (e) => {
      const val = e.target.value;
      if (val === '7.1') {
        state.stygianVersion = '7.1';
        state.stygianCycleTitle = '7.1 STYGIAN ONSLAUGHT';
        state.stygianBosses[0] = { id: 'domovoy', name: 'DOMOVOY', fullName: 'Battle-Hardened Domovoy Sculptor', icon: '/static/assets/bosses/stygian_domovoy.png', color: '#00e5ff' };
        state.stygianBosses[1] = { id: 'overseer_device', name: 'OVERSEER DEVICE', fullName: 'Secret Source Automaton: Overseer Device', icon: '/static/assets/bosses/stygian_overseer.png', color: '#c084fc' };
        state.stygianBosses[2] = { id: 'guardian_blade', name: 'GUARDIAN BLADE', fullName: 'Guardian Blade of Drifting Snow', icon: '/static/assets/bosses/stygian_guardian_blade.png', color: '#fb7185' };
      } else if (val === '7.0') {
        state.stygianVersion = '7.0';
        state.stygianCycleTitle = '7.0 STYGIAN ONSLAUGHT';
        state.stygianBosses[0] = { id: 'winged_lion', name: 'WINGED LION', fullName: 'Chimeric Winged Lion', icon: '/static/assets/bosses/winged_lion.png', color: '#fbbf24' };
        state.stygianBosses[1] = { id: 'config_device', name: 'CONFIG AUTOMATON', fullName: 'Secret Source Automaton: Configuration Device', icon: '/static/assets/bosses/config_device.png', color: '#38bdf8' };
        state.stygianBosses[2] = { id: 'maguu_kenki', name: 'MAGUU KENKI', fullName: 'Maguu Kenki: Lone Gallant', icon: '/static/assets/bosses/maguu_kenki.png', color: '#34d399' };
      } else if (val === '7.2') {
        state.stygianVersion = '7.2';
        state.stygianCycleTitle = '7.2 STYGIAN ONSLAUGHT';
        state.stygianBosses[0] = { id: 'wavecrest', name: 'WAVECREST ANCHOR', fullName: 'Wavecrest Anchor', icon: '/static/assets/bosses/wavecrest.png', color: '#a855f7' };
        state.stygianBosses[1] = { id: 'fire_emperor', name: 'FIRE EMPEROR', fullName: 'Emperor of Fire and Iron', icon: '/static/assets/bosses/fire_emperor.png', color: '#f97316' };
        state.stygianBosses[2] = { id: 'moongecko', name: 'MOONGECKO', fullName: 'Radiant Moongecko', icon: '/static/assets/bosses/moongecko.png', color: '#eab308' };
      }
      preloadStygianBossIcons();
      updateStygianBossUI();
      renderCanvas();
      pushUndoState();
      showToast(`⚔️ Loaded Stygian Cycle: ${val}`);
    });
  }

    const btnRefreshBosses = document.getElementById('btnRefreshStygianBosses');
  if (btnRefreshBosses) {
    btnRefreshBosses.addEventListener('click', async () => {
      try {
        btnRefreshBosses.textContent = '...';
        const res = await fetch('/api/stygian/cycles?refresh=true');
        if (res.ok) {
          const data = await res.json();
          if (data.current_cycle && data.current_cycle.bosses) {
            state.stygianVersion = data.current_patch || '7.1';
            state.stygianCycleTitle = `${state.stygianVersion} STYGIAN ONSLAUGHT`;
            const inpVer = document.getElementById('inputStygianVersion');
            const inpTitle = document.getElementById('inputStygianCycleTitle');
            if (inpVer) inpVer.value = state.stygianVersion;
            if (inpTitle) inpTitle.value = state.stygianCycleTitle;

            data.current_cycle.bosses.forEach((b, idx) => {
              if (state.stygianBosses[idx]) {
                state.stygianBosses[idx].id = b.id;
                state.stygianBosses[idx].name = b.short_name.toUpperCase();
                state.stygianBosses[idx].fullName = b.full_name;
                state.stygianBosses[idx].icon = b.icon;
                state.stygianBosses[idx].color = b.color;
              }
            });
            preloadStygianBossIcons();
            updateStygianBossUI();
            renderCanvas();
            showToast(`✓ Synced live with stygian.moe: ${data.current_cycle.name}`);
          }
        }
      } catch (err) {
        showToast('⚠ Could not refresh cycle from stygian.moe');
      } finally {
        btnRefreshBosses.textContent = '🔄';
      }
    });
  }

  document.querySelectorAll('#stygianBossChips .suggestion-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Math.min(2, Math.max(0, (state.activeSlot || 1) - 1));
      if (!state.stygianBosses[idx]) return;
      state.stygianBosses[idx].name = (btn.dataset.name || 'BOSS').toUpperCase();
      state.stygianBosses[idx].fullName = btn.dataset.fullname || btn.dataset.name;
      if (btn.dataset.icon) state.stygianBosses[idx].icon = btn.dataset.icon;
      if (btn.dataset.color) state.stygianBosses[idx].color = btn.dataset.color;
      preloadStygianBossIcons();
      updateStygianBossUI();
      renderCanvas();
      pushUndoState();
      showToast(`✓ Applied Boss: ${state.stygianBosses[idx].name}`);
    });
  });

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
      const slot = getActiveSlot();
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
          const slot = getActiveSlot();
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


}

window.setupSidebarControls = setupSidebarControls;
