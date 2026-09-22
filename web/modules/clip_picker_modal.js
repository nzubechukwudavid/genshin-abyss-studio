/**
 * Module: web/modules/clip_picker_modal.js
 * Purpose: In-Studio Visual Clip Picker Modal and Universal Slot Swapping.
 * Replaces fragile OS dialogs with instant in-browser visual grid selection (< 1ms).
 */

let allClipsCache = [];
let currentTargetSlot = null;
let activeSwapSource = null;

export async function openVisualClipPicker(targetConfig) {
  currentTargetSlot = targetConfig;
  const modal = document.getElementById("modalClipPicker");
  const grid = document.getElementById("clipPickerGrid");
  const titleEl = document.getElementById("clipPickerTitle");

  if (!modal || !grid) return;

  if (titleEl) {
    titleEl.textContent = targetConfig.title || "Select Video Clip";
  }

  modal.style.display = "flex";
  grid.innerHTML = '<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: #38bdf8;">⏳ Loading video clips from recordings folder...</div>';

  try {
    const res = await fetch("/api/recordings/all-clips");
    const data = await res.json();
    if (data.status === "ok" && data.clips) {
      allClipsCache = data.clips;
      renderClipPickerGrid(data.clips);
    } else {
      grid.innerHTML = `<div style="grid-column: 1/-1; padding: 30px; text-align: center; color: #ef4444;">No clips found: ${data.message || "Check folder"}</div>`;
    }
  } catch (err) {
    grid.innerHTML = '<div style="grid-column: 1/-1; padding: 30px; text-align: center; color: #ef4444;">Error connecting to recordings directory.</div>';
  }
}

export function closeVisualClipPicker() {
  const modal = document.getElementById("modalClipPicker");
  if (modal) modal.style.display = "none";
  currentTargetSlot = null;
}

function renderClipPickerGrid(clips) {
  const grid = document.getElementById("clipPickerGrid");
  if (!grid) return;

  if (!clips || clips.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; padding: 30px; text-align: center; color: #94a3b8;">No matching video files found.</div>';
    return;
  }

  grid.innerHTML = clips.map((c, idx) => `
    <div class="picker-clip-card" onclick="window.selectClipFromPicker(${idx})">
      <div class="picker-clip-thumb">
        <img src="${c.thumbnail_url}" alt="${c.filename}" onerror="this.src='/static/assets/studio_preview.png'"/>
        <span class="picker-clip-dur">${c.duration_formatted}</span>
      </div>
      <div class="picker-clip-info">
        <span class="picker-clip-name" title="${c.filename}">${c.filename}</span>
        <span class="picker-clip-meta">${c.size_mb} MB</span>
      </div>
    </div>
  `).join("");
}

// Window global for onclick assignment
export function selectClipFromPicker(clipIdx) {
  const clip = allClipsCache[clipIdx];
  if (!clip || !currentTargetSlot) {
    closeVisualClipPicker();
    return;
  }

  if (currentTargetSlot.type === "showcase_run") {
    const { runKey, slotIdx } = currentTargetSlot;
    if (window.showcaseState && window.showcaseState[runKey]) {
      window.showcaseState[runKey][slotIdx] = {
        ...window.showcaseState[runKey][slotIdx],
        path: clip.path,
        filename: clip.filename,
        duration: clip.duration_sec,
        duration_formatted: clip.duration_formatted,
        thumbnail_url: clip.thumbnail_url
      };
      if (typeof window.renderShowcaseSlots === "function") {
        window.renderShowcaseSlots();
      }
      if (typeof window.showToast === "function") {
        window.showToast(`✅ Assigned ${clip.filename} to ${runKey === "run1" ? "Run 1" : "Run 2"} Chamber ${slotIdx + 1}`);
      }
    }
  } else if (currentTargetSlot.type === "showcase_builds") {
    if (window.showcaseState) {
      window.showcaseState.combinedBuilds = {
        path: clip.path,
        filename: clip.filename,
        duration: clip.duration_sec || 60,
        duration_formatted: clip.duration_formatted || "01:00",
        splitSeconds: (clip.duration_sec || 60) * 0.5
      };
      const textEl = document.getElementById("showcaseCombinedBuildsFileText");
      if (textEl) textEl.textContent = `${clip.filename} (${clip.duration_formatted})`;
      const slider = document.getElementById("showcaseBuildsSplitSlider");
      if (slider) {
        slider.max = clip.duration_sec > 2 ? clip.duration_sec : 60;
        slider.value = Math.floor(slider.max / 2);
      }
      if (typeof window.updateBuildsSliderLabels === "function") {
        window.updateBuildsSliderLabels();
      }
      if (typeof window.showToast === "function") {
        window.showToast(`✅ Assigned ${clip.filename} to Builds Outro`);
      }
    }
  } else if (currentTargetSlot.type === "showcase_builds_a") {
    if (window.showcaseState) {
      window.showcaseState.separateBuilds.teamA = {
        path: clip.path,
        filename: clip.filename,
        duration: clip.duration_sec || 30,
        duration_formatted: clip.duration_formatted || "00:30"
      };
      const textEl = document.getElementById("showcaseBuildsTeamAFileText");
      if (textEl) textEl.textContent = `${clip.filename} (${clip.duration_formatted})`;
      if (typeof window.showToast === "function") {
        window.showToast(`✅ Assigned ${clip.filename} to Team A Builds`);
      }
    }
  } else if (currentTargetSlot.type === "showcase_builds_b") {
    if (window.showcaseState) {
      window.showcaseState.separateBuilds.teamB = {
        path: clip.path,
        filename: clip.filename,
        duration: clip.duration_sec || 30,
        duration_formatted: clip.duration_formatted || "00:30"
      };
      const textEl = document.getElementById("showcaseBuildsTeamBFileText");
      if (textEl) textEl.textContent = `${clip.filename} (${clip.duration_formatted})`;
      if (typeof window.showToast === "function") {
        window.showToast(`✅ Assigned ${clip.filename} to Team B Builds`);
      }
    }
  } else if (currentTargetSlot.type === "standard") {
    const { slotIdx } = currentTargetSlot;
    if (window.arrangerDataCache && window.arrangerDataCache.active_slots) {
      window.arrangerDataCache.active_slots[slotIdx] = {
        ...window.arrangerDataCache.active_slots[slotIdx],
        path: clip.path,
        filename: clip.filename,
        duration_sec: clip.duration_sec,
        duration_formatted: clip.duration_formatted,
        thumbnail_url: clip.thumbnail_url,
        is_assigned: true
      };
      if (typeof window.renderVideoArrangerGrid === "function") {
        window.renderVideoArrangerGrid(window.arrangerDataCache);
      }
      if (typeof window.showToast === "function") {
        window.showToast(`✅ Assigned ${clip.filename} to Slot ${slotIdx + 1}`);
      }
    }
  }

  closeVisualClipPicker();
}

export function filterClipPicker(query) {
  const q = (query || "").toLowerCase().trim();
  if (!q) {
    renderClipPickerGrid(allClipsCache);
    return;
  }
  const filtered = allClipsCache.filter(c => c.filename.toLowerCase().includes(q));
  renderClipPickerGrid(filtered);
}

export function handleExternalFilePicked(inputEl) {
  if (!inputEl || !inputEl.files || !inputEl.files[0] || !currentTargetSlot) return;
  const file = inputEl.files[0];
  const customClip = {
    path: file.name,
    filename: file.name,
    duration_sec: 60,
    duration_formatted: "01:00",
    size_mb: (file.size / (1024 * 1024)).toFixed(1),
    thumbnail_url: "/static/icons/genshin_impact.ico"
  };
  allClipsCache.unshift(customClip);
  selectClipFromPicker(0);
}

// ==========================================================================
// Universal Cross-Section Slot Swapping & Quick Movement
// ==========================================================================

export function moveRun2C3ToBuilds() {
  if (!window.showcaseState) return;
  const r2c3 = window.showcaseState.run2[2];
  const builds = window.showcaseState.combinedBuilds;

  const tempPath = r2c3.path;
  const tempFilename = r2c3.filename;
  const tempDur = r2c3.duration;
  const tempDurFmt = r2c3.duration_formatted;
  const tempThumb = r2c3.thumbnail_url;

  // Move builds to R2 C3
  r2c3.path = builds.path || "";
  r2c3.filename = builds.filename || "Not selected";
  r2c3.duration = builds.duration || 0;
  r2c3.duration_formatted = builds.duration_formatted || "00:00";
  r2c3.thumbnail_url = builds.path ? `/api/video-thumbnail?path=${encodeURIComponent(builds.path)}` : "";

  // Move R2 C3 to builds
  builds.path = tempPath || "";
  builds.filename = tempFilename || "No clip selected";
  builds.duration = tempDur || 60;
  builds.duration_formatted = tempDurFmt || "01:00";
  builds.splitSeconds = (tempDur || 60) * 0.5;

  const textEl = document.getElementById("showcaseCombinedBuildsFileText");
  if (textEl) textEl.textContent = builds.filename + (builds.duration_formatted ? ` (${builds.duration_formatted})` : "");
  const slider = document.getElementById("showcaseBuildsSplitSlider");
  if (slider) {
    slider.max = builds.duration > 2 ? builds.duration : 60;
    slider.value = Math.floor(slider.max / 2);
  }

  if (typeof window.renderShowcaseSlots === "function") {
    window.renderShowcaseSlots();
  }
  if (typeof window.updateBuildsSliderLabels === "function") {
    window.updateBuildsSliderLabels();
  }
  if (typeof window.showToast === "function") {
    window.showToast("🔄 Swapped Run 2 Chamber 3 with Builds Outro!");
  }
}

// Initiate swap mode between any two slots
export function initiateSlotSwap(sourceType, sourceRun, sourceIdx) {
  if (!activeSwapSource) {
    activeSwapSource = { sourceType, sourceRun, sourceIdx };
    document.body.classList.add("slot-swap-active");
    if (typeof window.showToast === "function") {
      const srcName = sourceType === "builds" ? "Builds Outro" : `${sourceRun === "run1" ? "Run 1" : "Run 2"} Chamber ${(sourceIdx || 0) + 1}`;
      window.showToast(`🎯 Swap initiated for ${srcName} — Click any other slot to swap!`);
    }
  } else {
    // If clicking same slot, cancel swap
    if (activeSwapSource.sourceType === sourceType &&
        activeSwapSource.sourceRun === sourceRun &&
        activeSwapSource.sourceIdx === sourceIdx) {
      activeSwapSource = null;
      document.body.classList.remove("slot-swap-active");
      if (typeof window.showToast === "function") window.showToast("Swap cancelled");
      return;
    }

    executeUniversalSwap(activeSwapSource, { sourceType, sourceRun, sourceIdx });
    activeSwapSource = null;
    document.body.classList.remove("slot-swap-active");
  }
}

function executeUniversalSwap(slotA, slotB) {
  if (!window.showcaseState) return;

  const getData = (s) => {
    if (s.sourceType === "run") return window.showcaseState[s.sourceRun][s.sourceIdx];
    if (s.sourceType === "builds") return window.showcaseState.combinedBuilds;
    if (s.sourceType === "builds_teamA") return window.showcaseState.teamABuilds;
    if (s.sourceType === "builds_teamB") return window.showcaseState.teamBBuilds;
    return null;
  };

  const setData = (s, data) => {
    if (s.sourceType === "run") {
      window.showcaseState[s.sourceRun][s.sourceIdx] = {
        ...window.showcaseState[s.sourceRun][s.sourceIdx],
        path: data.path || "",
        filename: data.filename || "Not selected",
        duration: data.duration || 0,
        duration_formatted: data.duration_formatted || "00:00",
        thumbnail_url: data.thumbnail_url || ""
      };
    } else if (s.sourceType === "builds") {
      window.showcaseState.combinedBuilds = {
        path: data.path || "",
        filename: data.filename || "No clip selected",
        duration: data.duration || 60,
        duration_formatted: data.duration_formatted || "01:00",
        splitSeconds: (data.duration || 60) * 0.5,
        thumbnail_url: data.thumbnail_url || ""
      };
      const textEl = document.getElementById("showcaseCombinedBuildsFileText");
      if (textEl) textEl.textContent = window.showcaseState.combinedBuilds.filename;
    } else if (s.sourceType === "builds_teamA") {
      window.showcaseState.teamABuilds = {
        path: data.path || "",
        filename: data.filename || "No clip selected",
        duration: data.duration || 0,
        duration_formatted: data.duration_formatted || "00:00",
        thumbnail_url: data.thumbnail_url || ""
      };
    } else if (s.sourceType === "builds_teamB") {
      window.showcaseState.teamBBuilds = {
        path: data.path || "",
        filename: data.filename || "No clip selected",
        duration: data.duration || 0,
        duration_formatted: data.duration_formatted || "00:00",
        thumbnail_url: data.thumbnail_url || ""
      };
    }
  };

  const aData = { ...getData(slotA) };
  const bData = { ...getData(slotB) };

  setData(slotA, bData);
  setData(slotB, aData);

  if (typeof window.renderShowcaseSlots === "function") {
    window.renderShowcaseSlots();
  }
  if (typeof window.renderShowcaseBuildSlots === "function") {
    window.renderShowcaseBuildSlots();
  }
  if (typeof window.showToast === "function") {
    window.showToast("✅ Swapped slots successfully!");
  }
}

// Global attachments for inline HTML onclick attributes
window.openVisualClipPicker = openVisualClipPicker;
window.closeVisualClipPicker = closeVisualClipPicker;
window.selectClipFromPicker = selectClipFromPicker;
window.filterClipPicker = filterClipPicker;
window.handleExternalFilePicked = handleExternalFilePicked;
window.moveRun2C3ToBuilds = moveRun2C3ToBuilds;
window.initiateSlotSwap = initiateSlotSwap;
