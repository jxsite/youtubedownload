const BUTTON_CLASS = "fxvs-download-button";
const observer = new MutationObserver(() => hydrateVideos());

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

hydrateVideos();

// Store for tweet video URLs
const tweetVideoMap = new Map();

window.addEventListener("x-video-saver-url", (event) => {
  const { tweetId, mp4Url } = event.detail;
  if (tweetId && mp4Url) {
    console.log("[X Video Saver] Storing URL mapping:", tweetId, "->", mp4Url);
    tweetVideoMap.set(tweetId, mp4Url);
  }
});

function requestScan(videoIndex, tweetId) {
  window.dispatchEvent(new CustomEvent("x-video-saver-scan-request", {
    detail: { videoIndex, tweetId }
  }));
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "scan-active-post") {
    return false;
  }

  sendResponse(getPageState());
  return false;
});

function hydrateVideos() {
  const videos = document.querySelectorAll("video");

  videos.forEach((video) => {
    const article = video.closest("article") || video.parentElement;
    if (!article || article.querySelector(`.${BUTTON_CLASS}`)) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = BUTTON_CLASS;
    button.title = "Download free X video";
    button.setAttribute("aria-label", "Download free X video");
    button.innerHTML = `
      <span aria-hidden="true">↓</span>
      <span>Free download</span>
    `;

    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await handleVideoAction(video, article, button);
    });

    const mediaContainer = video.closest('[data-testid="videoPlayer"]') || video.parentElement;
    mediaContainer.append(button);
  });
}

async function handleVideoAction(video, article, button) {
  const postUrl = findPostUrl(article) || location.href;
  const tweetIdMatch = /\/status\/(\d+)/.exec(postUrl);
  const tweetId = tweetIdMatch ? tweetIdMatch[1] : null;

  const videoIndex = Array.from(document.querySelectorAll("video")).indexOf(video);
  requestScan(videoIndex, tweetId);

  console.log("[X Video Saver] click event triggered:", { postUrl, tweetId, tweetVideoMapKeys: Array.from(tweetVideoMap.keys()) });

  let mediaUrl = findDirectMediaUrl(video);
  if (!mediaUrl && tweetId) {
    mediaUrl = tweetVideoMap.get(tweetId);
    console.log("[X Video Saver] Retrieved URL from map for tweetId:", tweetId, "->", mediaUrl);
  }

  button.disabled = true;
  button.dataset.state = "busy";

  try {
    if (mediaUrl) {
      console.log("[X Video Saver] Starting download for URL:", mediaUrl);
      const response = await chrome.runtime.sendMessage({
        type: "download-video",
        url: mediaUrl,
        filename: buildFilename(postUrl)
      });

      if (response?.ok) {
        flashButton(button, "Saved");
        return;
      }

      console.warn("Free X Video Saver download failed:", response?.error);
    } else {
      console.warn("[X Video Saver] No media URL found for tweetId:", tweetId);
    }
  } catch (error) {
    console.error("[X Video Saver] Extension runtime disconnected:", error);
    // If extension reloaded/invalidated, fallback to copying link and guide user to refresh
    await copyText(postUrl);
    flashButton(button, "Refresh page");
    return;
  }

  await copyText(postUrl);
  flashButton(button, "Copied link");
}

function getPageState() {
  const videos = Array.from(document.querySelectorAll("video"));
  const activeArticle = document.querySelector("article:hover") || document.querySelector("article");
  const postUrl = activeArticle ? findPostUrl(activeArticle) : location.href;

  const tweetIdMatch = /\/status\/(\d+)/.exec(postUrl);
  const tweetId = tweetIdMatch ? tweetIdMatch[1] : null;

  videos.forEach((video, index) => {
    requestScan(index, tweetId);
  });

  const directMediaCount = videos.filter((video) => {
    if (findDirectMediaUrl(video)) return true;
    if (tweetId && tweetVideoMap.has(tweetId)) return true;
    return false;
  }).length;

  return {
    videoCount: videos.length,
    directMediaCount,
    postUrl
  };
}

function findDirectMediaUrl(video) {
  const candidates = [
    video.currentSrc,
    video.src,
    ...Array.from(video.querySelectorAll("source")).map((source) => source.src)
  ].filter(Boolean);

  return candidates.find((url) => {
    try {
      const parsed = new URL(url, location.href);
      return parsed.protocol === "https:" && parsed.hostname.endsWith("video.twimg.com");
    } catch {
      return false;
    }
  });
}

function findPostUrl(scope) {
  // Try to find the status link using the <time> element first (most reliable for direct tweet link)
  const timeEl = scope.querySelector('time');
  if (timeEl) {
    const link = timeEl.closest('a');
    if (link) {
      const href = link.getAttribute("href");
      if (href && /\/status\/\d+/.test(href)) {
        const url = new URL(href, location.origin);
        url.search = "";
        url.hash = "";
        return url.href;
      }
    }
  }

  // Fallback to searching any status link in the scope
  const links = Array.from(scope.querySelectorAll('a[href*="/status/"]'));
  const link = links.find((item) => /\/status\/\d+/.test(item.getAttribute("href") || ""));

  if (!link) {
    return null;
  }

  const url = new URL(link.getAttribute("href"), location.origin);
  url.search = "";
  url.hash = "";
  return url.href;
}

function buildFilename(postUrl) {
  const id = /\/status\/(\d+)/.exec(postUrl)?.[1];
  const date = new Date().toISOString().slice(0, 10);
  return id ? `x-video-${id}.mp4` : `x-video-${date}.mp4`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const input = document.createElement("textarea");
    input.value = text;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
}

function flashButton(button, label) {
  const previous = button.querySelector("span:last-child")?.textContent || "Free download";
  button.disabled = false;
  button.dataset.state = "done";
  button.querySelector("span:last-child").textContent = label;

  window.setTimeout(() => {
    button.dataset.state = "";
    button.querySelector("span:last-child").textContent = previous;
  }, 1400);
}

// Auto-download helper for website redirection integration
if (location.hash === "#autodownload") {
  (function() {
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
      <div style="font-size: 24px; font-weight: bold; margin-bottom: 15px; font-family: 'Outfit', sans-serif;">Free X Video Saver</div>
      <div style="font-size: 16px; color: #9ca3af; margin-bottom: 30px;">Downloading video... This window will close automatically.</div>
      <div style="width: 40px; height: 40px; border: 4px solid rgba(29, 155, 240, 0.2); border-radius: 50%; border-top-color: #1d9bf0; animation: spin 1s linear infinite;"></div>
      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    `;
    document.documentElement.appendChild(overlay);

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      const postUrl = location.href.split("#")[0];
      const tweetIdMatch = /\/status\/(\d+)/.exec(postUrl);
      const tweetId = tweetIdMatch ? tweetIdMatch[1] : null;

      const videos = document.querySelectorAll("video");
      const videoIndex = videos.length > 0 ? 0 : null;

      if (typeof videoIndex === "number" && tweetId) {
        requestScan(videoIndex, tweetId);
      }

      let mediaUrl = videos[0] ? findDirectMediaUrl(videos[0]) : null;
      if (!mediaUrl && tweetId) {
        mediaUrl = tweetVideoMap.get(tweetId);
      }

      if (mediaUrl) {
        clearInterval(interval);
        try {
          await chrome.runtime.sendMessage({
            type: "download-video",
            url: mediaUrl,
            filename: buildFilename(postUrl)
          });
          setTimeout(async () => {
            try {
              await chrome.runtime.sendMessage({ type: "close-tab" });
            } catch (e) {
              console.error("Close tab message failed:", e);
            }
          }, 1200);
        } catch (e) {
          console.error("Auto download message failed:", e);
          const msgEl = overlay.querySelector("div:nth-child(2)");
          if (msgEl) {
            msgEl.textContent = "Extension reloaded. Please refresh this page to download.";
            msgEl.style.color = "#f87171";
          }
        }
      } else if (attempts > 30) {
        clearInterval(interval);
        alert("Extraction timed out. You will be redirected to the tweet page to download manually.");
        location.hash = "";
        overlay.remove();
      }
    }, 500);
  })();
}
