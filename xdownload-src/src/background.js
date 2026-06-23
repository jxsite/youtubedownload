const DEFAULT_FILENAME = "x-video.mp4";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "close-tab" && sender.tab?.id) {
    chrome.tabs.remove(sender.tab.id);
    return false;
  }

  if (!message || message.type !== "download-video") {
    return false;
  }

  const url = typeof message.url === "string" ? message.url : "";
  const filename = sanitizeFilename(message.filename || DEFAULT_FILENAME);

  if (!isAllowedMediaUrl(url)) {
    sendResponse({
      ok: false,
      error: "Only direct HTTPS media URLs from X/Twitter can be downloaded."
    });
    return false;
  }

  chrome.downloads.download(
    {
      url,
      filename: `Free-X-Video-Saver/${filename}`,
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
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.endsWith("video.twimg.com");
  } catch {
    return false;
  }
}

function sanitizeFilename(value) {
  const clean = String(value)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  if (!clean) {
    return DEFAULT_FILENAME;
  }

  return /\.[a-z0-9]{2,5}$/i.test(clean) ? clean : `${clean}.mp4`;
}
