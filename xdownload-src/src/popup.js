const TOOL_URL = "https://jxsite.github.io/xdownload/";

const statusEl = document.querySelector("#status");
const openToolButton = document.querySelector("#open-tool");

let currentPostUrl = "";

init();

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id || !isSupportedPage(tab.url)) {
    setStatus("Open X.com to download videos directly, or use the website downloader.");
    return;
  }

  try {
    const state = await chrome.tabs.sendMessage(tab.id, { type: "scan-active-post" });
    currentPostUrl = state?.postUrl || tab.url;

    if (state?.videoCount > 0) {
      const direct = state.directMediaCount > 0 
        ? "Direct download buttons are embedded on the page." 
        : "Download buttons are embedded. Use online downloader if needed.";
      setStatus(direct);
      return;
    }

    setStatus("No videos detected on this X/Twitter page.");
  } catch {
    currentPostUrl = tab.url;
    setStatus("Please refresh the X/Twitter page and try again.");
  }
}

openToolButton.addEventListener("click", () => {
  const url = currentPostUrl ? `${TOOL_URL}?url=${encodeURIComponent(currentPostUrl)}` : TOOL_URL;
  chrome.tabs.create({ url });
});

function isSupportedPage(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "x.com" || parsed.hostname === "twitter.com";
  } catch {
    return false;
  }
}

function setStatus(text) {
  statusEl.textContent = text;
}
