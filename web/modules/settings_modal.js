/**
 * Settings & System Hub ES Module for Genshin Abyss Studio.
 * Handles configuration persistence, directory statistics, native Windows folder browsing,
 * and live system information.
 */

let isSettingsLoaded = false;
let currentSettings = {};

export function initSettingsModal() {
  const modal = document.getElementById('modalSettings');
  const btnOpen = document.getElementById('btnOpenSettings');
  const btnClose = document.getElementById('btnCloseSettings');
  const btnCloseX = document.getElementById('btnCloseSettingsX');
  const btnSave = document.getElementById('btnSaveSettings');
  const btnReset = document.getElementById('btnResetSettings');

  if (btnOpen) {
    btnOpen.addEventListener('click', () => openSettingsModal());
  }

  if (btnClose) {
    btnClose.addEventListener('click', () => closeSettingsModal());
  }

  if (btnCloseX) {
    btnCloseX.addEventListener('click', () => closeSettingsModal());
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeSettingsModal();
    });
  }

  // Escape key listener
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('open')) {
      closeSettingsModal();
    }
  });

  // Tab switching
  const tabBtns = document.querySelectorAll('.settings-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      switchSettingsTab(tabName);
    });
  });

  // Sliders value display
  const sliderMusicVol = document.getElementById('settingMusicVolume');
  const valMusicVol = document.getElementById('valMusicVolume');
  if (sliderMusicVol && valMusicVol) {
    sliderMusicVol.addEventListener('input', () => {
      valMusicVol.textContent = `${sliderMusicVol.value}%`;
    });
  }

  const sliderVideoVol = document.getElementById('settingVideoVolume');
  const valVideoVol = document.getElementById('valVideoVolume');
  if (sliderVideoVol && valVideoVol) {
    sliderVideoVol.addEventListener('input', () => {
      valVideoVol.textContent = `${sliderVideoVol.value}%`;
    });
  }

  // Browse folder buttons
  setupBrowseButton('btnBrowseRecordings', 'settingRecordingsDir');
  setupBrowseButton('btnBrowseMusic', 'settingMusicDir');
  setupBrowseButton('btnBrowseOutput', 'settingOutputDir');

  // Rescan music button
  const btnRescanMusic = document.getElementById('btnRescanMusic');
  if (btnRescanMusic) {
    btnRescanMusic.addEventListener('click', () => handleRescanMusic());
  }

  // Save button
  if (btnSave) {
    btnSave.addEventListener('click', () => handleSaveSettings());
  }

  // Reset button
  if (btnReset) {
    btnReset.addEventListener('click', () => handleResetSettings());
  }

  // Auto-open via query parameter (e.g. for testing / direct link)
  if (new URLSearchParams(window.location.search).has('settings')) {
    setTimeout(() => openSettingsModal(), 150);
  }
}

function switchSettingsTab(tabName) {
  const tabBtns = document.querySelectorAll('.settings-tab-btn');
  const panes = document.querySelectorAll('.settings-pane');

  tabBtns.forEach(b => {
    if (b.getAttribute('data-tab') === tabName) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  panes.forEach(p => {
    if (p.getAttribute('data-pane') === tabName) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });
}

export async function openSettingsModal(targetTab = 'storage') {
  const modal = document.getElementById('modalSettings');
  if (!modal) return;

  switchSettingsTab(targetTab);

  modal.classList.add('open');
  modal.style.display = 'flex';

  await loadSettingsData();
}

export function closeSettingsModal() {
  const modal = document.getElementById('modalSettings');
  if (!modal) return;

  modal.classList.remove('open');
  modal.style.display = 'none';
}

async function loadSettingsData() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status === 'ok') {
      currentSettings = data.settings || {};
      populateSettingsForm(data.settings, data.stats, data.system_info);
      isSettingsLoaded = true;
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
    showSettingsToast('?? Failed to load settings from server', 'error');
  }
}

function populateSettingsForm(settings, stats, sysInfo) {
  if (!settings) return;

  // Paths
  const inpRec = document.getElementById('settingRecordingsDir');
  if (inpRec) inpRec.value = settings.recordings_dir || '';

  const inpMus = document.getElementById('settingMusicDir');
  if (inpMus) inpMus.value = settings.music_dir || '';

  const inpOut = document.getElementById('settingOutputDir');
  if (inpOut) inpOut.value = settings.output_dir || '';

  // Stats Badges
  if (stats) {
    const badgeRec = document.getElementById('badgeRecordingsCount');
    if (badgeRec) {
      badgeRec.textContent = stats.recordings_dir_valid
        ? `Detected: ${stats.recordings_count} clips`
        : '⚠️ Directory not found';
      badgeRec.className = stats.recordings_dir_valid ? 'settings-badge badge-valid' : 'settings-badge badge-invalid';
    }

    const badgeMus = document.getElementById('badgeMusicCount');
    if (badgeMus) {
      badgeMus.textContent = stats.music_dir_valid
        ? `Tracks: ${stats.music_tracks_count} loaded`
        : '⚠️ Directory not found';
      badgeMus.className = stats.music_dir_valid ? 'settings-badge badge-valid' : 'settings-badge badge-invalid';
    }
  }

  // Audio / Video sliders
  const sliderMusicVol = document.getElementById('settingMusicVolume');
  const valMusicVol = document.getElementById('valMusicVolume');
  if (sliderMusicVol && valMusicVol) {
    const mv = Math.round((settings.fallback_music_volume ?? 0.4) * 100);
    sliderMusicVol.value = mv;
    valMusicVol.textContent = `${mv}%`;
  }

  const sliderVideoVol = document.getElementById('settingVideoVolume');
  const valVideoVol = document.getElementById('valVideoVolume');
  if (sliderVideoVol && valVideoVol) {
    const vv = Math.round((settings.video_volume ?? 1.0) * 100);
    sliderVideoVol.value = vv;
    valVideoVol.textContent = `${vv}%`;
  }

  // Checkboxes
  const chkNorm = document.getElementById('settingNormalizeAudio');
  if (chkNorm) chkNorm.checked = settings.normalize_audio !== false;

  const chkAutoRec = document.getElementById('settingAutoScanRecordings');
  if (chkAutoRec) chkAutoRec.checked = settings.auto_scan_recordings !== false;

  const chkSubMus = document.getElementById('settingSubfolderMusic');
  if (chkSubMus) chkSubMus.checked = settings.subfolder_music_scan !== false;

  // System info
  if (sysInfo) {
    const elVer = document.getElementById('sysInfoVersion');
    if (elVer) elVer.textContent = `${sysInfo.app_name} v${sysInfo.app_version}`;

    const elPy = document.getElementById('sysInfoPython');
    if (elPy) elPy.textContent = sysInfo.python_version || 'Unknown';

    const elPlat = document.getElementById('sysInfoPlatform');
    if (elPlat) elPlat.textContent = sysInfo.platform || 'Unknown';

    const elFf = document.getElementById('sysInfoFfmpeg');
    if (elFf) {
      elFf.textContent = sysInfo.ffmpeg_detected ? '✓ Available' : '⚠️ Not in PATH';
      elFf.style.color = sysInfo.ffmpeg_detected ? '#4ade80' : '#f87171';
    }
  }
}

function setupBrowseButton(btnId, targetInputId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const inp = document.getElementById(targetInputId);
    const initialDir = inp ? inp.value.trim() : '';

    btn.disabled = true;
    const origText = btn.textContent;
    btn.textContent = '⏳ Choosing...';

    try {
      const res = await fetch('/api/settings/browse-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initial_dir: initialDir })
      });
      const data = await res.json();
      if (data.status === 'ok' && !data.canceled && data.path) {
        if (inp) {
          inp.value = data.path;
          showSettingsToast(`Selected: ${data.path.split('/').pop() || data.path}`, 'success');
        }
      }
    } catch (err) {
      console.error('Browse folder error:', err);
      showSettingsToast('Failed to open native folder browser', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = origText;
    }
  });
}

async function handleRescanMusic() {
  const btn = document.getElementById('btnRescanMusic');
  const badge = document.getElementById('badgeMusicCount');
  if (btn) btn.disabled = true;
  if (badge) badge.textContent = '⏳ Indexing music files...';

  try {
    const res = await fetch('/api/settings/rescan-music', { method: 'POST' });
    const data = await res.json();
    if (data.status === 'ok') {
      if (badge) {
        badge.textContent = `Tracks: ${data.total_tracks} indexed`;
        badge.className = 'settings-badge badge-valid';
      }
      showSettingsToast(`Indexed ${data.total_tracks} background music tracks!`, 'success');
    } else {
      showSettingsToast(data.detail || 'Failed to rescan music', 'error');
      if (badge) badge.textContent = '⚠️ Rescan failed';
    }
  } catch (err) {
    console.error('Rescan music error:', err);
    showSettingsToast('Rescan music request failed', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function handleSaveSettings() {
  const btn = document.getElementById('btnSaveSettings');
  if (btn) btn.disabled = true;

  const payload = {
    recordings_dir: document.getElementById('settingRecordingsDir')?.value.trim() || null,
    music_dir: document.getElementById('settingMusicDir')?.value.trim() || null,
    output_dir: document.getElementById('settingOutputDir')?.value.trim() || null,
    fallback_music_volume: (parseInt(document.getElementById('settingMusicVolume')?.value || '40', 10)) / 100,
    video_volume: (parseInt(document.getElementById('settingVideoVolume')?.value || '100', 10)) / 100,
    normalize_audio: document.getElementById('settingNormalizeAudio')?.checked !== false,
    auto_scan_recordings: document.getElementById('settingAutoScanRecordings')?.checked !== false,
    subfolder_music_scan: document.getElementById('settingSubfolderMusic')?.checked !== false
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.status === 'ok') {
      currentSettings = data.settings;
      populateSettingsForm(data.settings, data.stats);
      showSettingsToast('💾 Settings saved and active!', 'success');
      setTimeout(() => closeSettingsModal(), 600);
    } else {
      showSettingsToast(data.message || 'Failed to save settings', 'error');
    }
  } catch (err) {
    console.error('Save settings error:', err);
    showSettingsToast('Error saving settings', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function handleResetSettings() {
  if (!confirm('Reset all directories and audio preferences to system defaults?')) {
    return;
  }

  try {
    const res = await fetch('/api/settings/reset', { method: 'POST' });
    const data = await res.json();
    if (data.status === 'ok') {
      currentSettings = data.settings;
      populateSettingsForm(data.settings, data.stats);
      showSettingsToast('Settings restored to defaults', 'info');
    }
  } catch (err) {
    console.error('Reset settings error:', err);
    showSettingsToast('Failed to reset settings', 'error');
  }
}

function showSettingsToast(msg, type = 'info') {
  // Use existing toast if available or log
  if (typeof window.showToast === 'function') {
    window.showToast(msg);
    return;
  }
  const toast = document.createElement('div');
  toast.className = `settings-floating-toast toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('visible'), 20);
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

// Make accessible on window object
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
