const DEFAULT_FILENAME = "youtube-video.mp4";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "close-tab" && sender.tab?.id) {
    chrome.tabs.remove(sender.tab.id);
    return false;
  }

  // Handle media download
  if (message && message.type === "download-media") {
    const url = typeof message.url === "string" ? message.url : "";
    const filename = sanitizeFilename(message.filename || DEFAULT_FILENAME);

    if (!isAllowedMediaUrl(url)) {
      sendResponse({
        ok: false,
        error: "Only direct HTTPS media URLs from YouTube CDN (.googlevideo.com) or captions (.youtube.com) or data URLs can be downloaded."
      });
      return false;
    }

    chrome.downloads.download(
      {
        url,
        filename: `Free-YouTube-Downloader/${filename}`,
        saveAs: true,
        conflictAction: "uniquify"
      },
      (downloadId) => {
        const error = chrome.runtime.lastError;
        if (error) {
          sendResponse({ ok: false, error: error.message });
          return;
        }
        sendResponse({ ok: true, downloadId });
      }
    );
    return true; // async response
  }

  // Handle batch search from webpage
  if (message && message.type === "batch-search") {
    searchYouTube(message.query)
      .then(videos => sendResponse({ ok: true, videos }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  // Handle batch channel extraction from webpage
  if (message && message.type === "batch-channel") {
    getChannelVideos(message.channel)
      .then(videos => sendResponse({ ok: true, videos }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  return false;
});

function isAllowedMediaUrl(url) {
  try {
    if (url.startsWith("data:")) return true;
    const parsed = new URL(url);
    return parsed.protocol === "https:" && (
      parsed.hostname.endsWith(".googlevideo.com") || 
      parsed.hostname.endsWith("googlevideo.com") || 
      parsed.hostname.endsWith("youtube.com") || 
      parsed.hostname.endsWith("youtu.be")
    );
  } catch {
    return false;
  }
}

function sanitizeFilename(value) {
  const clean = String(value)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 120);

  if (!clean) {
    return DEFAULT_FILENAME;
  }

  return clean;
}

// Scrape YouTube Search Results
async function searchYouTube(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  console.log("[YT Downloader Background] Fetching search:", url);
  
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const html = await response.text();
  return parseYtInitialData(html);
}

// Scrape YouTube Channel Videos
async function getChannelVideos(channelIdentifier) {
  let cleanId = channelIdentifier.trim();
  let urlPath = "";
  
  if (cleanId.startsWith("UC") && cleanId.length === 24) {
    urlPath = `channel/${cleanId}/videos`;
  } else {
    // Ensure starts with @
    if (!cleanId.startsWith("@")) {
      cleanId = `@${cleanId}`;
    }
    urlPath = `${cleanId}/videos`;
  }
  
  const url = `https://www.youtube.com/${urlPath}`;
  console.log("[YT Downloader Background] Fetching channel videos:", url);
  
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const html = await response.text();
  return parseYtInitialData(html);
}

// Extract ytInitialData and parse videos recursively
function parseYtInitialData(html) {
  // Extract ytInitialData JSON block from page source
  const match = /var ytInitialData = ({.*?});<\/script>/.exec(html) || 
                /window\["ytInitialData"\] = ({.*?});<\/script>/.exec(html);
  
  if (!match) {
    console.warn("[YT Downloader Background] Could not find ytInitialData in HTML source.");
    return [];
  }
  
  try {
    const data = JSON.parse(match[1]);
    const videos = [];
    const seenIds = new Set();
    
    // Recursive explorer to find all videoRenderer definitions
    function explore(obj) {
      if (!obj || typeof obj !== "object") return;
      
      if (obj.videoRenderer) {
        const vr = obj.videoRenderer;
        const videoId = vr.videoId;
        
        if (videoId && !seenIds.has(videoId)) {
          seenIds.add(videoId);
          
          const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || "";
          const duration = vr.lengthText?.simpleText || "";
          const uploaded = vr.publishedTimeText?.simpleText || "";
          const views = vr.shortViewCountText?.simpleText || "";
          const thumbnail = vr.thumbnail?.thumbnails?.[0]?.url || "";
          
          videos.push({
            videoId,
            title,
            duration,
            uploaded,
            views,
            thumbnail
          });
        }
        return;
      }
      
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          explore(obj[key]);
        }
      }
    }
    
    explore(data);
    console.log(`[YT Downloader Background] Extracted ${videos.length} videos recursively.`);
    return videos;
  } catch (err) {
    console.error("[YT Downloader Background] JSON parse failed:", err);
    throw new Error("Failed to parse YouTube page JSON.");
  }
}
