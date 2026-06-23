(function() {
  'use strict';

  const EXCLUDED_KEYS = new Set([
    "window", "document", "location", "history", "navigator", "chrome",
    "top", "parent", "self", "frames", "opener", "external", "performance",
    "console", "localStorage", "sessionStorage", "indexedDB", "crypto",
    "speechSynthesis", "styleMedia", "visualViewport", "trustedTypes",
    "customElements", "caches", "screen", "devicePixelRatio"
  ]);

  function isPlainObjectOrArray(obj) {
    if (!obj || typeof obj !== "object") return false;
    if (Array.isArray(obj)) return true;
    const proto = Object.getPrototypeOf(obj);
    return proto === null || proto === Object.prototype;
  }

  function findTweets(obj, visited = new WeakSet(), currentRestId = null) {
    if (!isPlainObjectOrArray(obj)) return;
    if (visited.has(obj)) return;
    visited.add(obj);

    let nextRestId = currentRestId;
    try {
      if (typeof obj.rest_id === "string" && /^\d+$/.test(obj.rest_id)) {
        nextRestId = obj.rest_id;
      }
    } catch (e) {}

    try {
      if (obj.video_info && Array.isArray(obj.video_info.variants)) {
        const expandedUrl = obj.expanded_url || "";
        const tweetIdMatch = /\/status\/(\d+)/.exec(expandedUrl);
        const tweetId = (tweetIdMatch ? tweetIdMatch[1] : null) || nextRestId;

        console.log("[X Video Saver] Found video info:", { tweetId, nextRestId, expandedUrl, variants: obj.video_info.variants });

        if (tweetId) {
          let bestMp4Url = null;
          let maxBitrate = -1;

          for (const variant of obj.video_info.variants) {
            if (variant.content_type === "video/mp4" && variant.url) {
              const bitrate = variant.bitrate || 0;
              if (bitrate > maxBitrate) {
                maxBitrate = bitrate;
                bestMp4Url = variant.url;
              }
            }
          }

          if (bestMp4Url) {
            console.log("[X Video Saver] Dispatching MP4 URL for tweet ID:", tweetId, "URL:", bestMp4Url);
            window.dispatchEvent(new CustomEvent("x-video-saver-url", {
              detail: { tweetId, mp4Url: bestMp4Url }
            }));
          } else {
            console.warn("[X Video Saver] No MP4 variant found for tweet ID:", tweetId);
          }
        } else {
          console.warn("[X Video Saver] Could not resolve Tweet ID for video info:", obj);
        }
      }
    } catch (e) {
      console.error("[X Video Saver] Error parsing video_info:", e);
    }

    for (const key in obj) {
      try {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          findTweets(obj[key], visited, nextRestId);
        }
      } catch (e) {
        // Skip properties that throw when accessed
      }
    }
  }

  function findUrlsInProps(obj, urls = [], visited = new WeakSet(), depth = 0) {
    if (depth > 8) return urls;
    if (!obj || typeof obj !== "object") return urls;
    if (visited.has(obj)) return urls;
    visited.add(obj);

    for (const key in obj) {
      try {
        const val = obj[key];
        if (typeof val === "string") {
          if (val.includes("video.twimg.com") && val.includes(".mp4")) {
            urls.push(val);
          }
        } else if (val && typeof val === "object") {
          findUrlsInProps(val, urls, visited, depth + 1);
        }
      } catch (e) {}
    }

    return urls;
  }

  function getUrlsFromReact(videoEl) {
    const urls = [];
    try {
      let currentEl = videoEl;
      let fiberNode = null;

      while (currentEl) {
        const key = Object.keys(currentEl).find(k => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"));
        if (key) {
          fiberNode = currentEl[key];
          break;
        }
        currentEl = currentEl.parentElement;
      }

      let visitedNodes = 0;
      while (fiberNode && visitedNodes < 100) {
        visitedNodes++;
        if (fiberNode.memoizedProps) {
          findUrlsInProps(fiberNode.memoizedProps, urls);
        }
        if (fiberNode.pendingProps) {
          findUrlsInProps(fiberNode.pendingProps, urls);
        }
        fiberNode = fiberNode.return;
      }
    } catch (e) {
      console.error("[X Video Saver] Error traversing React Fiber:", e);
    }
    return urls;
  }

  function getBestUrl(urls) {
    let bestUrl = null;
    let maxArea = -1;

    for (const url of urls) {
      const match = /vid\/(\d+)x(\d+)/.exec(url);
      if (match) {
        const area = parseInt(match[1], 10) * parseInt(match[2], 10);
        if (area > maxArea) {
          maxArea = area;
          bestUrl = url;
        }
      } else if (!bestUrl) {
        bestUrl = url;
      }
    }
    return bestUrl;
  }

  function scanInitialState() {
    console.log("[X Video Saver] Scanning window properties for initial state...");
    try {
      for (const key in window) {
        if (EXCLUDED_KEYS.has(key)) continue;
        try {
          const val = window[key];
          if (val && typeof val === "object") {
            findTweets(val);
          }
        } catch (e) {
          // Ignore access errors
        }
      }
    } catch (e) {
      console.error("[X Video Saver] Error scanning window:", e);
    }
  }

  function processJson(text) {
    try {
      const data = JSON.parse(text);
      findTweets(data);
    } catch (e) {
      // Not valid JSON or parsing failed
    }
  }

  // Intercept Fetch
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    try {
      const url = typeof args[0] === "string" ? args[0] : (args[0] instanceof Request ? args[0].url : "");
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json") || url.includes("/graphql/")) {
        console.log("[X Video Saver] Intercepted Fetch JSON response:", url);
        const clone = response.clone();
        clone.text().then(processJson).catch((e) => {
          console.error("[X Video Saver] Error reading fetch clone body:", e);
        });
      }
    } catch (err) {
      console.error("[X Video Saver] Fetch wrapper error:", err);
    }
    return response;
  };

  // Intercept XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._url = url;
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    this.addEventListener("load", () => {
      try {
        const url = this._url || "";
        const contentType = this.getResponseHeader("content-type") || "";
        if (contentType.includes("application/json") || url.includes("/graphql/")) {
          console.log("[X Video Saver] Intercepted XHR JSON response:", url);
          if (this.responseType === "json" && this.response) {
            findTweets(this.response);
          } else if (this.responseText) {
            processJson(this.responseText);
          }
        }
      } catch (e) {
        console.error("[X Video Saver] XHR wrapper error:", e);
      }
    });
    return originalSend.apply(this, args);
  };

  // Listen for manual scan requests from content.js
  window.addEventListener("x-video-saver-scan-request", (event) => {
    const detail = event.detail || {};
    const videoIndex = detail.videoIndex;
    const tweetId = detail.tweetId;

    if (typeof videoIndex === "number") {
      const videos = document.querySelectorAll("video");
      const video = videos[videoIndex];
      if (video) {
        const urls = getUrlsFromReact(video);
        const bestUrl = getBestUrl(urls);
        if (bestUrl && tweetId) {
          console.log("[X Video Saver] Dispatching React-resolved MP4 URL for tweet ID:", tweetId, "URL:", bestUrl);
          window.dispatchEvent(new CustomEvent("x-video-saver-url", {
            detail: { tweetId, mp4Url: bestUrl }
          }));
          return;
        }
      }
    }

    scanInitialState();
  });

  // Automatically scan on DOMContentLoaded and load
  window.addEventListener("DOMContentLoaded", scanInitialState);
  window.addEventListener("load", scanInitialState);

  // Run immediately as well
  scanInitialState();

})();
