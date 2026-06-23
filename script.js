document.addEventListener("DOMContentLoaded", () => {
  // Tab Switching Logic
  const tabTriggers = document.querySelectorAll(".tab-trigger");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabTriggers.forEach(trigger => {
    trigger.addEventListener("click", () => {
      tabTriggers.forEach(t => t.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));

      trigger.classList.add("active");
      const targetId = trigger.getAttribute("data-target");
      document.getElementById(targetId).classList.add("active");
    });
  });

  // Extension Connection Status Bridge
  const statusIndicator = document.getElementById("connection-status");
  const statusText = statusIndicator.querySelector(".status-text");
  let isExtensionActive = false;

  // Listen for pong from extension
  window.addEventListener("yt-extension-pong", (event) => {
    const detail = event.detail || {};
    if (detail.active) {
      isExtensionActive = true;
      statusIndicator.classList.remove("inactive");
      statusIndicator.classList.add("active");
      statusText.textContent = "Extension Active: Batch & direct download enabled.";
    }
  });

  // Periodically ping the extension to check if it's active
  function pingExtension() {
    window.dispatchEvent(new CustomEvent("yt-extension-ping"));
    // If no answer in 2 seconds, show inactive state
    setTimeout(() => {
      if (!isExtensionActive) {
        statusIndicator.classList.remove("active");
        statusIndicator.classList.add("inactive");
        statusText.textContent = "Extension not detected. Install extension to enable batch extraction.";
      }
    }, 2000);
  }

  // Ping immediately and every 5 seconds
  pingExtension();
  setInterval(pingExtension, 5000);

  // --- Single Downloader Form ---
  const singleForm = document.getElementById("download-form");
  const singleInput = document.getElementById("tweet-url");
  const singleBtn = singleForm.querySelector(".btn-download");

  singleForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const urlValue = singleInput.value.trim();
    if (!urlValue) return;

    // Validate YouTube URL
    const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
    const match = ytRegex.exec(urlValue);

    if (!match) {
      alert("Please enter a valid YouTube video URL. Example:\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ");
      return;
    }

    const videoId = match[1];
    const normalizedUrl = urlValue.startsWith("http") ? urlValue : `https://${urlValue}`;

    // Show loading state
    singleForm.classList.add("loading");
    singleBtn.disabled = true;

    // Simulate analysis & guide the user
    setTimeout(() => {
      singleForm.classList.remove("loading");
      singleBtn.disabled = false;
      showRedirectModal(normalizedUrl, videoId);
    }, 800);
  });

  // --- Batch Downloader Form ---
  const batchForm = document.getElementById("batch-form");
  const batchQueryInput = document.getElementById("batch-query");
  const batchTypeSelect = document.getElementById("batch-type");
  const batchBtn = document.getElementById("btn-batch-submit");
  const resultsContainer = document.getElementById("batch-results-container");
  const resultsGrid = document.getElementById("batch-results");
  const resultsCount = document.getElementById("results-count");

  batchForm.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!isExtensionActive) {
      alert("Extension is not active. Please install and enable the Free YouTube Downloader extension first to enable batch fetching.");
      return;
    }

    const query = batchQueryInput.value.trim();
    const type = batchTypeSelect.value;

    if (!query) return;

    // Show loading
    batchForm.classList.add("loading");
    batchBtn.disabled = true;

    console.log("[Webpage] Sending batch query:", { type, query });
    
    // Dispatch query event to extension
    window.dispatchEvent(new CustomEvent("yt-batch-query", {
      detail: { type, query }
    }));
  });

  // Listen for batch search/channel results from extension
  window.addEventListener("yt-batch-results", (event) => {
    const response = event.detail || {};
    
    // Remove loading state
    batchForm.classList.remove("loading");
    batchBtn.disabled = false;
    
    if (!response.ok) {
      console.error("[Webpage] Batch fetch error:", response.error);
      alert("Error: " + (response.error || "Failed to fetch videos from YouTube. Please try again."));
      return;
    }
    
    const videos = response.videos || [];
    console.log("[Webpage] Received videos list:", videos.length);
    
    renderVideosGrid(videos);
  });

  function renderVideosGrid(videos) {
    resultsGrid.innerHTML = "";
    resultsCount.textContent = videos.length;
    
    if (videos.length === 0) {
      resultsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #9ca3af; padding: 40px; font-size: 1.1rem; border: 1px dashed rgba(255,255,255,0.08); border-radius:16px;">No videos found. Check the channel ID/search keywords and try again.</div>`;
      resultsContainer.classList.remove("hide");
      return;
    }
    
    videos.forEach(video => {
      const card = document.createElement("div");
      card.className = "video-card";
      
      const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
      const thumbUrl = video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`;
      const durationBadge = video.duration ? `<span class="video-card-duration">${video.duration}</span>` : "";
      const metaText = [video.views, video.uploaded].filter(Boolean).join(" &bull; ") || "YouTube Video";
      
      card.innerHTML = `
        <div class="video-card-thumb-wrapper">
          <img src="${thumbUrl}" alt="Thumbnail" class="video-card-thumb" loading="lazy">
          ${durationBadge}
        </div>
        <div class="video-card-body">
          <h3 class="video-card-title" title="${video.title}">${video.title}</h3>
          <div class="video-card-meta">${metaText}</div>
          <div class="video-card-actions">
            <a href="${videoUrl}#autodownload" target="_blank" class="btn-card-download">? Auto Download</a>
            <a href="${videoUrl}" target="_blank" class="btn-card-open" title="Open on YouTube">??</a>
          </div>
        </div>
      `;
      resultsGrid.appendChild(card);
    });
    
    resultsContainer.classList.remove("hide");
    
    // Smooth scroll to results
    setTimeout(() => {
      resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }, 200);
  }

  // --- Modal Utilities ---
  function showRedirectModal(url, videoId) {
    let modal = document.getElementById("redirect-modal");
    if (modal) modal.remove();

    modal = document.createElement("div");
    modal.id = "redirect-modal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3>?? Direct Download Guide</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p class="modal-text">Due to browser security policies, media segments and transcripts must be extracted directly from your YouTube tab context.</p>
          
          <div class="instruction-box">
            <div class="instruction-step">
              <span class="step-badge">1</span>
              <p>Make sure you have the <strong>Free YouTube Downloader</strong> extension installed.</p>
            </div>
            <div class="instruction-step">
              <span class="step-badge">2</span>
              <p>We are opening the YouTube video page for you in a new tab.</p>
            </div>
            <div class="instruction-step">
              <span class="step-badge">3</span>
              <p>The extension will intercept formats. You can choose to download <strong>Videos, Audio, or Subtitles</strong> directly from YouTube!</p>
            </div>
          </div>
          
          <div class="modal-actions">
            <a href="${url}#autodownload" target="_blank" class="btn btn-primary btn-modal-go">Open YouTube & Download</a>
            <button class="btn btn-secondary btn-modal-cancel">Close</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    applyModalStyles();

    const closeBtn = modal.querySelector(".modal-close");
    const cancelBtn = modal.querySelector(".btn-modal-cancel");
    const goBtn = modal.querySelector(".btn-modal-go");

    const closeModal = () => {
      modal.classList.add("hide");
      setTimeout(() => modal.remove(), 300);
    };

    closeBtn.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);
    goBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  function applyModalStyles() {
    if (document.getElementById("modal-styles")) return;

    const style = document.createElement("style");
    style.id = "modal-styles";
    style.innerHTML = `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(5, 5, 10, 0.85);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        animation: fadeIn 0.3s ease;
      }
      .modal-overlay.hide {
        animation: fadeOut 0.3s ease forwards;
      }
      .modal-card {
        background-color: #12121e;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        width: 90%;
        max-width: 500px;
        padding: 2rem;
        box-shadow: 0 20px 50px rgba(0,0,0,0.6);
        position: relative;
        animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        text-align: left;
      }
      .modal-overlay.hide .modal-card {
        animation: slideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        padding-bottom: 1rem;
      }
      .modal-header h3 {
        font-family: 'Outfit', sans-serif;
        font-size: 1.35rem;
        color: #fff;
        margin: 0;
      }
      .modal-close {
        background: none;
        border: none;
        color: #9ca3af;
        font-size: 1.75rem;
        cursor: pointer;
        transition: color 0.2s;
      }
      .modal-close:hover {
        color: #fff;
      }
      .modal-text {
        color: #9ca3af;
        font-size: 0.95rem;
        margin-bottom: 1.5rem;
        line-height: 1.5;
      }
      .instruction-box {
        background-color: #1a1a2e;
        border-radius: 16px;
        padding: 1.25rem;
        margin-bottom: 2rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .instruction-step {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
      }
      .step-badge {
        background: linear-gradient(135deg, var(--primary, #ff0033) 0%, var(--accent, #ec4899) 100%);
        color: #fff;
        font-weight: 700;
        font-size: 0.85rem;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 0.1rem;
      }
      .instruction-step p {
        font-size: 0.9rem;
        color: #f3f4f6;
        line-height: 1.4;
        margin: 0;
      }
      .modal-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
      }
      .btn-modal-go {
        font-size: 0.9rem;
        padding: 0.7rem 1.25rem;
        border-radius: 12px;
        text-decoration: none;
      }
      .btn-modal-cancel {
        font-size: 0.9rem;
        padding: 0.7rem 1.25rem;
        border-radius: 12px;
        background-color: transparent;
        color: #9ca3af;
        border: 1px solid rgba(255, 255, 255, 0.08);
        cursor: pointer;
      }
      .btn-modal-cancel:hover {
        background-color: rgba(255, 255, 255, 0.03);
        color: #fff;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      @keyframes slideIn {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(30px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
});
