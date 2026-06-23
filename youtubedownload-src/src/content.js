(function() {
  'use strict';

  const INJECTED_BTN_CLASS = "ytd-downloader-injected-btn";
  const FLOAT_BTN_CLASS = "ytd-downloader-float-btn";
  const CONTROL_BTN_CLASS = "ytd-downloader-control-btn";
  const OVERLAY_CLASS = "ytd-dl-overlay";

  // Check if we are on the Downloader Webpage
  const isDownloaderPage = (
    location.pathname.includes("/youtubedownload/") || 
    location.hostname === "jxsite.github.io" ||
    document.title.includes("Free YouTube Video Downloader")
  );

  if (isDownloaderPage) {
    console.log("[YT Downloader] Webpage communication bridge initialized.");
    
    // Respond to status pings from webpage
    window.addEventListener("yt-extension-ping", () => {
      console.log("[YT Downloader Bridge] Ping received from webpage.");
      window.dispatchEvent(new CustomEvent("yt-extension-pong", { detail: { active: true } }));
    });

    // Respond to search/channel queries from webpage
    window.addEventListener("yt-batch-query", async (event) => {
      const { type, query } = event.detail || {};
      console.log("[YT Downloader Bridge] Query request received:", { type, query });
      
      const messageType = type === "channel" ? "batch-channel" : "batch-search";
      const payload = type === "channel" ? { channel: query } : { query: query };
      
      try {
        const response = await chrome.runtime.sendMessage({
          type: messageType,
          ...payload
        });
        
        console.log("[YT Downloader Bridge] Received response from background:", response);
        window.dispatchEvent(new CustomEvent("yt-batch-results", {
          detail: response
        }));
      } catch (err) {
        console.error("[YT Downloader Bridge] Communication error:", err);
        window.dispatchEvent(new CustomEvent("yt-batch-results", {
          detail: { ok: false, error: "Chrome extension background script is not responding. Please reload the page." }
        }));
      }
    });
    
    // Dispatch a pong event immediately in case the page already loaded and pinged
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("yt-extension-pong", { detail: { active: true } }));
    }, 1000);
    
    return; // Don't run YouTube-specific player logic on the webpage!
  }

  // --- YouTube Video page logic starts here ---
  let currentVideoId = "";
  let currentTitle = "";
  let currentFormats = [];
  let currentAdaptiveFormats = [];
  let currentCaptionTracks = [];

  // Listen to data from inject.js (running in the MAIN world)
  window.addEventListener("yt-downloader-data", (event) => {
    const data = event.detail || {};
    currentVideoId = data.videoId || "";
    currentTitle = data.title || "";
    currentFormats = data.formats || [];
    currentAdaptiveFormats = data.adaptiveFormats || [];
    currentCaptionTracks = data.captionTracks || [];

    console.log("[YT Downloader] Content script received video data:", {
      currentVideoId,
      currentTitle,
      formats: currentFormats.length,
      adaptive: currentAdaptiveFormats.length,
      captions: currentCaptionTracks.length
    });

    // Check if auto download is active
    checkAutoDownload();
  });

  // Periodically request data if we are on a watch page and don't have video data yet
  function requestDataScan() {
    window.dispatchEvent(new CustomEvent("yt-downloader-request-scan"));
  }

  // Set up observers to inject download buttons
  const observer = new MutationObserver(() => {
    hydrateDownloadButtons();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // Hook history state push to detect SPA navigations
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log("[YT Downloader] URL changed, requesting scan...");
      // Remove old modal if open
      const modal = document.querySelector(`.${OVERLAY_CLASS}`);
      if (modal) modal.remove();
      
      // Clear current data and request re-scan
      currentVideoId = "";
      currentTitle = "";
      currentFormats = [];
      currentAdaptiveFormats = [];
      currentCaptionTracks = [];
      
      setTimeout(requestDataScan, 500);
      setTimeout(requestDataScan, 1000);
    }
  }, 500);

  // Initial setup
  hydrateDownloadButtons();
  setTimeout(requestDataScan, 500);

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && message.type === "scan-active-video") {
      sendResponse(getPageState());
    }
    return false;
  });

  function getPageState() {
    const isWatch = location.pathname === "/watch";
    const videos = document.querySelectorAll("video");
    return {
      videoCount: isWatch && currentVideoId ? 1 : 0,
      videoUrl: location.href,
      title: currentTitle,
      videoId: currentVideoId
    };
  }

  // Inject buttons into the YouTube page
  function hydrateDownloadButtons() {
    const isWatch = location.pathname === "/watch";
    if (!isWatch) {
      removeFloatingButton();
      return;
    }

    // 1. Injected Button in YouTube Action Bar below the player
    const actionContainers = [
      "ytd-watch-metadata #top-level-buttons-computed",
      "#top-level-buttons-computed",
      "#actions-inner #top-level-buttons-computed"
    ];

    for (const selector of actionContainers) {
      const container = document.querySelector(selector);
      if (container) {
        if (container.querySelector(`.${INJECTED_BTN_CLASS}`)) {
          break;
        }

        const downloadBtn = document.createElement("button");
        downloadBtn.type = "button";
        downloadBtn.className = `${INJECTED_BTN_CLASS} yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading`;
        downloadBtn.title = "Download Video/Audio/Transcript";
        downloadBtn.innerHTML = `
          <div class="yt-spec-button-shape-next__icon" aria-hidden="true" style="display:flex;align-items:center;">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M17 18V19H6V18H17ZM16.5 11.4L15.8 10.7L12.5 14V5H11.5V14L8.2 10.7L7.5 11.4L12 15.9L16.5 11.4Z"/>
            </svg>
          </div>
          <div class="yt-spec-button-shape-next__button-text-content">Download</div>
        `;

        downloadBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openDownloadModal();
        });

        // Insert at the beginning or after the first button
        if (container.firstChild) {
          container.insertBefore(downloadBtn, container.firstChild);
        } else {
          container.appendChild(downloadBtn);
        }
        console.log("[YT Downloader] Injected Download button below player.");
        break;
      }
    }

    // 2. Injected Button inside the Player Control Bar (bottom-right Controls)
    const playerControls = document.querySelector(".ytp-right-controls");
    if (playerControls) {
      if (!playerControls.querySelector(`.${CONTROL_BTN_CLASS}`)) {
        const ctrlBtn = document.createElement("button");
        ctrlBtn.type = "button";
        ctrlBtn.className = `ytp-button ${CONTROL_BTN_CLASS}`;
        ctrlBtn.title = "Download Video/Audio/Subtitles";
        ctrlBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 18V19H6V18H17ZM16.5 11.4L15.8 10.7L12.5 14V5H11.5V14L8.2 10.7L7.5 11.4L12 15.9L16.5 11.4Z"/>
          </svg>
        `;
        ctrlBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openDownloadModal();
        });
        
        // Prepend it inside controls
        playerControls.insertBefore(ctrlBtn, playerControls.firstChild);
        console.log("[YT Downloader] Injected Download button into player control bar.");
      }
    }

    // 3. Floating Action Button as standard fallback
    let floatBtn = document.querySelector(`.${FLOAT_BTN_CLASS}`);
    if (!floatBtn) {
      floatBtn = document.createElement("button");
      floatBtn.type = "button";
      floatBtn.className = FLOAT_BTN_CLASS;
      floatBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" style="margin-top:2px;">
          <path d="M17 18V19H6V18H17ZM16.5 11.4L15.8 10.7L12.5 14V5H11.5V14L8.2 10.7L7.5 11.4L12 15.9L16.5 11.4Z"/>
        </svg>
        <span>Download Media</span>
      `;
      floatBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openDownloadModal();
      });
      document.body.appendChild(floatBtn);
    }
  }

  function removeFloatingButton() {
    const floatBtn = document.querySelector(`.${FLOAT_BTN_CLASS}`);
    if (floatBtn) {
      floatBtn.remove();
    }
  }

  // Open Downloader Modal
  function openDownloadModal() {
    if (!currentVideoId) {
      requestDataScan();
    }

    let overlay = document.querySelector(`.${OVERLAY_CLASS}`);
    if (overlay) overlay.remove();

    overlay = document.createElement("div");
    overlay.className = OVERLAY_CLASS;
    overlay.innerHTML = `
      <div class="ytd-dl-card">
        <div class="ytd-dl-header">
          <h3 id="ytd-title-display">?? Loading formats...</h3>
          <button class="ytd-dl-close">&times;</button>
        </div>
        <div class="ytd-dl-body">
          <div class="ytd-dl-tabs-nav">
            <button class="ytd-dl-tab-btn active" data-tab="tab-muxed">Muxed Video</button>
            <button class="ytd-dl-tab-btn" data-tab="tab-hd">Video Only (HD)</button>
            <button class="ytd-dl-tab-btn" data-tab="tab-audio">Audio Only</button>
            <button class="ytd-dl-tab-btn" data-tab="tab-captions">Subtitles & Text</button>
          </div>
          
          <div id="tab-muxed" class="ytd-dl-tab-content active">
            <div class="ytd-dl-list" id="list-muxed"></div>
          </div>
          <div id="tab-hd" class="ytd-dl-tab-content">
            <div class="ytd-dl-list" id="list-hd"></div>
            <div class="ytd-dl-warning">
              ?? Note: High Definition resolutions (1080p, 1440p, 4K) are stored by YouTube in separate video tracks without audio. You can merge them later using FFmpeg.
            </div>
          </div>
          <div id="tab-audio" class="ytd-dl-tab-content">
            <div class="ytd-dl-list" id="list-audio"></div>
          </div>
          <div id="tab-captions" class="ytd-dl-tab-content">
            <div class="ytd-dl-list" id="list-captions"></div>
            <div class="ytd-dl-info-box">
              ?? Select a subtitle track to download it. Transcripts can be downloaded as clean readable Text (.txt), standard SubRip (.srt), or WebVTT (.vtt).
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector(".ytd-dl-close");
    const closeModal = () => {
      overlay.classList.add("hide");
      setTimeout(() => overlay.remove(), 300);
    };
    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    const tabBtns = overlay.querySelectorAll(".ytd-dl-tab-btn");
    const tabContents = overlay.querySelectorAll(".ytd-dl-tab-content");
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        tabBtns.forEach(b => b.classList.remove("active"));
        tabContents.forEach(c => c.classList.remove("active"));
        
        btn.classList.add("active");
        const targetTab = btn.getAttribute("data-tab");
        overlay.querySelector(`#${targetTab}`).classList.add("active");
      });
    });

    renderModalData(overlay);
  }

  function renderModalData(overlay) {
    const titleEl = overlay.querySelector("#ytd-title-display");
    titleEl.textContent = currentTitle || "YouTube Downloader";

    const listMuxed = overlay.querySelector("#list-muxed");
    const listHd = overlay.querySelector("#list-hd");
    const listAudio = overlay.querySelector("#list-audio");
    const listCaptions = overlay.querySelector("#list-captions");

    listMuxed.innerHTML = "";
    listHd.innerHTML = "";
    listAudio.innerHTML = "";
    listCaptions.innerHTML = "";

    // 1. Muxed Video
    if (currentFormats.length === 0) {
      listMuxed.innerHTML = `<div style="text-align:center;color:#9ca3af;padding:20px;">No muxed formats found. Try refreshing page.</div>`;
    } else {
      currentFormats.forEach(fmt => {
        const quality = fmt.qualityLabel || `${fmt.width}x${fmt.height}`;
        const ext = getExtension(fmt.mimeType);
        const size = fmt.contentLength ? `~${Math.round(fmt.contentLength / (1024 * 1024))} MB` : "Unknown size";
        const url = getFormatUrl(fmt);

        if (!url) return;

        const row = document.createElement("div");
        row.className = "ytd-dl-row";
        row.innerHTML = `
          <div class="ytd-dl-info">
            <div class="ytd-dl-label">
              <span>${quality}</span>
              <span class="ytd-dl-badge badge-video">${ext}</span>
            </div>
            <div class="ytd-dl-desc">Video + Audio Muxed &bull; ${size}</div>
          </div>
          <button class="ytd-btn-dl" type="button">Download</button>
        `;
        row.querySelector("button").addEventListener("click", () => {
          triggerDirectDownload(url, buildFilename(currentTitle, quality, fmt.mimeType));
        });
        listMuxed.appendChild(row);
      });
    }

    // 2. HD Video Only
    const videoOnlyFormats = currentAdaptiveFormats.filter(fmt => fmt.mimeType?.startsWith("video/"));
    if (videoOnlyFormats.length === 0) {
      listHd.innerHTML = `<div style="text-align:center;color:#9ca3af;padding:20px;">No HD formats found.</div>`;
    } else {
      videoOnlyFormats.sort((a, b) => {
        const qa = parseInt(a.qualityLabel) || 0;
        const qb = parseInt(b.qualityLabel) || 0;
        return qb - qa;
      });

      videoOnlyFormats.forEach(fmt => {
        const quality = fmt.qualityLabel || `${fmt.width}x${fmt.height}`;
        const ext = getExtension(fmt.mimeType);
        const size = fmt.contentLength ? `~${Math.round(fmt.contentLength / (1024 * 1024))} MB` : "Unknown size";
        const url = getFormatUrl(fmt);

        if (!url) return;

        const row = document.createElement("div");
        row.className = "ytd-dl-row";
        row.innerHTML = `
          <div class="ytd-dl-info">
            <div class="ytd-dl-label">
              <span>${quality}</span>
              <span class="ytd-dl-badge badge-video">${ext}</span>
            </div>
            <div class="ytd-dl-desc">Video Only (No Audio) &bull; ${size}</div>
          </div>
          <button class="ytd-btn-dl" type="button">Download</button>
        `;
        row.querySelector("button").addEventListener("click", () => {
          triggerDirectDownload(url, buildFilename(currentTitle, quality, fmt.mimeType));
        });
        listHd.appendChild(row);
      });
    }

    // 3. Audio Only
    const audioFormats = currentAdaptiveFormats.filter(fmt => fmt.mimeType?.startsWith("audio/"));
    if (audioFormats.length === 0) {
      listAudio.innerHTML = `<div style="text-align:center;color:#9ca3af;padding:20px;">No audio formats found.</div>`;
    } else {
      audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

      audioFormats.forEach(fmt => {
        const label = getAudioFormatLabel(fmt.mimeType, fmt.bitrate);
        const size = fmt.contentLength ? `~${(fmt.contentLength / (1024 * 1024)).toFixed(1)} MB` : "Unknown size";
        const url = getFormatUrl(fmt);

        if (!url) return;

        const row = document.createElement("div");
        row.className = "ytd-dl-row";
        row.innerHTML = `
          <div class="ytd-dl-info">
            <div class="ytd-dl-label">
              <span>${label}</span>
              <span class="ytd-dl-badge badge-audio">Audio</span>
            </div>
            <div class="ytd-dl-desc">Extract Audio Track &bull; ${size}</div>
          </div>
          <button class="ytd-btn-dl" type="button">Download</button>
        `;
        row.querySelector("button").addEventListener("click", () => {
          triggerDirectDownload(url, buildFilename(currentTitle, label.split(" ")[0], fmt.mimeType));
        });
        listAudio.appendChild(row);
      });
    }

    // 4. Captions / Subtitles
    if (currentCaptionTracks.length === 0) {
      listCaptions.innerHTML = `<div style="text-align:center;color:#9ca3af;padding:20px;">No captions/transcripts detected.</div>`;
    } else {
      currentCaptionTracks.forEach(track => {
        const langName = track.name?.simpleText || track.languageCode;
        const row = document.createElement("div");
        row.className = "ytd-dl-row";
        row.innerHTML = `
          <div class="ytd-dl-info">
            <div class="ytd-dl-label">
              <span>${langName}</span>
              <span class="ytd-dl-badge badge-subtitle">Transcript</span>
            </div>
            <div class="ytd-dl-desc">Language Code: ${track.languageCode}</div>
          </div>
          <div class="ytd-dl-actions">
            <button class="ytd-btn-dl btn-secondary" data-format="txt">TXT</button>
            <button class="ytd-btn-dl btn-secondary" data-format="srt">SRT</button>
            <button class="ytd-btn-dl" data-format="vtt">WebVTT</button>
          </div>
        `;

        row.querySelectorAll("button").forEach(btn => {
          btn.addEventListener("click", () => {
            const format = btn.getAttribute("data-format");
            downloadSubtitle(track, format);
          });
        });

        listCaptions.appendChild(row);
      });
    }
  }

  function getExtension(mimeType) {
    if (!mimeType) return "mp4";
    if (mimeType.includes("webm")) return "webm";
    return "mp4";
  }

  function getAudioFormatLabel(mimeType, bitrate) {
    const isM4a = mimeType.includes("audio/mp4") || mimeType.includes("mp4a");
    const codec = isM4a ? "M4A" : "WebM";
    const kbps = bitrate ? `${Math.round(bitrate / 1000)} kbps` : "Unknown kbps";
    return `${codec} (${kbps})`;
  }

  function getFormatUrl(format) {
    if (format.url) return format.url;
    if (format.signatureCipher || format.cipher) {
      const cipher = format.signatureCipher || format.cipher;
      const params = new URLSearchParams(cipher);
      const directUrl = params.get("url");
      const sig = params.get("s");
      const sp = params.get("sp") || "sig";
      if (directUrl && sig) {
        return `${directUrl}&${sp}=${encodeURIComponent(sig)}`;
      } else if (directUrl) {
        return directUrl;
      }
    }
    return null;
  }

  function buildFilename(title, qualityLabel, mimeType) {
    const cleanTitle = title.replace(/[\\/:*?"<>|]+/g, "-").trim();
    const isVideo = mimeType.startsWith("video/");
    const ext = mimeType.includes("mp4") ? "mp4" : (mimeType.includes("webm") ? "webm" : (mimeType.includes("audio/mp4") ? "m4a" : "mp4"));
    
    if (isVideo) {
      return `${cleanTitle}-${qualityLabel}.${ext}`;
    } else {
      return `${cleanTitle}-audio.${ext}`;
    }
  }

  async function triggerDirectDownload(url, filename) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "download-media",
        url: url,
        filename: filename
      });

      if (response?.ok) {
        return true;
      }
      alert("Download failed: " + (response?.error || "Unknown error"));
    } catch (err) {
      alert("Extension connection error. Please refresh YouTube and try again.");
    }
    return false;
  }

  // Subtitle/Caption download and conversions
  async function downloadSubtitle(track, format) {
    try {
      const url = track.baseUrl + "&fmt=json3";
      const response = await fetch(url);
      const data = await response.json();
      
      let content = "";
      if (format === "txt") {
        content = convertToTxt(data);
      } else if (format === "srt") {
        content = convertToSrt(data);
      } else if (format === "vtt") {
        content = convertToVtt(data);
      }

      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const reader = new FileReader();
      
      reader.onload = function() {
        const dataUrl = reader.result;
        const cleanTitle = currentTitle.replace(/[\\/:*?"<>|]+/g, "-").trim();
        const filename = `${cleanTitle}.${track.languageCode}.${format}`;
        
        chrome.runtime.sendMessage({
          type: "download-media",
          url: dataUrl,
          filename: filename
        });
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Failed to download subtitle:", err);
      alert("Failed to download subtitles. Please try again.");
    }
  }

  function formatSrtTime(ms) {
    const date = new Date(ms);
    const hh = String(Math.floor(ms / 3600000)).padStart(2, "0");
    const mm = String(date.getUTCMinutes()).padStart(2, "0");
    const ss = String(date.getUTCSeconds()).padStart(2, "0");
    const msStr = String(date.getUTCMilliseconds()).padStart(3, "0");
    return `${hh}:${mm}:${ss},${msStr}`;
  }

  function formatVttTime(ms) {
    const date = new Date(ms);
    const hh = String(Math.floor(ms / 3600000)).padStart(2, "0");
    const mm = String(date.getUTCMinutes()).padStart(2, "0");
    const ss = String(date.getUTCSeconds()).padStart(2, "0");
    const msStr = String(date.getUTCMilliseconds()).padStart(3, "0");
    return `${hh}:${mm}:${ss}.${msStr}`;
  }

  function convertToTxt(data) {
    if (!data.events) return "";
    return data.events
      .map(event => {
        if (!event.segs) return "";
        return event.segs.map(seg => seg.utf8).join("");
      })
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function convertToSrt(data) {
    if (!data.events) return "";
    let srt = "";
    let counter = 1;
    
    data.events.forEach(event => {
      if (!event.segs) return;
      const text = event.segs.map(seg => seg.utf8).join("").trim();
      if (!text) return;
      
      const startMs = event.tStartMs;
      const endMs = startMs + (event.dDurationMs || 0);
      
      srt += `${counter}\n`;
      srt += `${formatSrtTime(startMs)} --> ${formatSrtTime(endMs)}\n`;
      srt += `${text}\n\n`;
      counter++;
    });
    
    return srt;
  }

  function convertToVtt(data) {
    if (!data.events) return "WEBVTT\n\n";
    let vtt = "WEBVTT\n\n";
    
    data.events.forEach(event => {
      if (!event.segs) return;
      const text = event.segs.map(seg => seg.utf8).join("").trim();
      if (!text) return;
      
      const startMs = event.tStartMs;
      const endMs = startMs + (event.dDurationMs || 0);
      
      vtt += `${formatVttTime(startMs)} --> ${formatVttTime(endMs)}\n`;
      vtt += `${text}\n\n`;
    });
    
    return vtt;
  }

  // Auto-download mechanism triggered by website redirection
  let autoDownloadStarted = false;
  function checkAutoDownload() {
    if (location.hash !== "#autodownload" || autoDownloadStarted) {
      return;
    }

    autoDownloadStarted = true;
    console.log("[YT Downloader] Auto download hash detected!");

    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.backgroundColor = "#0a0a0f";
    overlay.style.color = "#f3f4f6";
    overlay.style.zIndex = "999999";
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.fontFamily = "'Inter', sans-serif";
    overlay.innerHTML = `
      <div style="font-size: 24px; font-weight: bold; margin-bottom: 15px; font-family: 'Outfit', sans-serif; color: #ff0033;">Free YouTube Downloader</div>
      <div style="font-size: 16px; color: #9ca3af; margin-bottom: 30px;" id="auto-dl-status">Analyzing video tracks... This window will close automatically.</div>
      <div style="width: 40px; height: 40px; border: 4px solid rgba(255, 0, 51, 0.2); border-radius: 50%; border-top-color: #ff0033; animation: spin 1s linear infinite;"></div>
      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    `;
    document.documentElement.appendChild(overlay);

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      
      requestDataScan();

      if (currentFormats && currentFormats.length > 0) {
        clearInterval(interval);
        
        const sortedFormats = [...currentFormats].sort((a, b) => {
          const w1 = a.width || 0;
          const w2 = b.width || 0;
          return w2 - w1;
        });
        
        const bestMuxed = sortedFormats[0];
        const url = getFormatUrl(bestMuxed);
        const quality = bestMuxed.qualityLabel || "720p";
        
        if (url) {
          overlay.querySelector("#auto-dl-status").textContent = `Downloading ${quality} video...`;
          const filename = buildFilename(currentTitle, quality, bestMuxed.mimeType);
          const success = await triggerDirectDownload(url, filename);
          
          if (success) {
            setTimeout(async () => {
              try {
                await chrome.runtime.sendMessage({ type: "close-tab" });
              } catch (e) {
                console.error("Close tab failed:", e);
              }
            }, 1500);
          } else {
            overlay.querySelector("#auto-dl-status").textContent = "Auto download failed. Redirecting to video...";
            setTimeout(() => {
              location.hash = "";
              overlay.remove();
            }, 2000);
          }
        } else {
          overlay.querySelector("#auto-dl-status").textContent = "Could not resolve media stream URL.";
          setTimeout(() => {
            location.hash = "";
            overlay.remove();
          }, 2000);
        }
      } else if (attempts > 30) {
        clearInterval(interval);
        alert("Extraction timed out. You will be redirected to the video to download manually.");
        location.hash = "";
        overlay.remove();
      }
    }, 500);
  }

})();
