const DEFAULT_FILENAME = "youtube-video.mp4";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "close-tab" && sender.tab?.id) {
    chrome.tabs.remove(sender.tab.id);
    return false;
  }

  if (!message || message.type !== "download-media") {
    return false;
  }

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

  return true;
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
