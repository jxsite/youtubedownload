const TOOL_URL = "https://youtube-saver.github.io/downloader/";

const statusEl = document.querySelector("#status");
const openToolButton = document.querySelector("#open-tool");

let currentPostUrl = "";

init();

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id || !isSupportedPage(tab.url)) {
    setStatus("Open YouTube to download videos directly, or use the website downloader.");
    return;
  }

  try {
    const state = await chrome.tabs.sendMessage(tab.id, { type: "scan-active-video" });
    currentPostUrl = state?.videoUrl || tab.url;

    if (state?.videoCount > 0) {
      setStatus("Direct download buttons are embedded. Click the Download button below the video player.");
      return;
    }

    setStatus("No video detected on this YouTube page.");
  } catch (err) {
    currentPostUrl = tab.url;
    setStatus("Please refresh the YouTube page to load the downloader.");
  }
}

openToolButton.addEventListener("click", () => {
  const url = currentPostUrl ? `${TOOL_URL}?url=${encodeURIComponent(currentPostUrl)}` : TOOL_URL;
  chrome.tabs.create({ url });
});

function isSupportedPage(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be");
  } catch {
    return false;
  }
}

function setStatus(text) {
  statusEl.textContent = text;
}
