(function() {
  'use strict';

  console.log("[YT Downloader] Injected script active.");

  // Scan and dispatch video data
  function scanVideoData() {
    try {
      const playerEl = document.getElementById("movie_player");
      let response = null;

      if (playerEl && typeof playerEl.getPlayerResponse === "function") {
        response = playerEl.getPlayerResponse();
        console.log("[YT Downloader] Found player response from #movie_player api.");
      } else if (window.ytInitialPlayerResponse) {
        response = window.ytInitialPlayerResponse;
        console.log("[YT Downloader] Found player response from window.ytInitialPlayerResponse.");
      }

      if (!response) {
        console.warn("[YT Downloader] No player response found yet.");
        return;
      }

      const videoDetails = response.videoDetails || {};
      const streamingData = response.streamingData || {};
      const captions = response.captions || {};

      const title = videoDetails.title || document.title;
      const videoId = videoDetails.videoId;

      if (!videoId) {
        console.warn("[YT Downloader] No videoId in player response.");
        return;
      }

      const formats = streamingData.formats || [];
      const adaptiveFormats = streamingData.adaptiveFormats || [];
      const captionTracks = captions.playerCaptionsTracklistRenderer?.captionTracks || [];

      console.log("[YT Downloader] Extracted video details:", {
        videoId,
        title,
        formatsCount: formats.length,
        adaptiveFormatsCount: adaptiveFormats.length,
        captionsCount: captionTracks.length
      });

      // Dispatch details to content script
      window.dispatchEvent(new CustomEvent("yt-downloader-data", {
        detail: {
          videoId,
          title,
          formats,
          adaptiveFormats,
          captionTracks
        }
      }));
    } catch (err) {
      console.error("[YT Downloader] Error during scanning:", err);
    }
  }

  // Listen for request to scan from content script
  window.addEventListener("yt-downloader-request-scan", () => {
    console.log("[YT Downloader] Scan request received.");
    scanVideoData();
  });

  // Automatically scan on load events
  window.addEventListener("load", () => {
    setTimeout(scanVideoData, 1000);
  });

  // Listen to YouTube SPA navigation finish events
  window.addEventListener("yt-navigate-finish", () => {
    console.log("[YT Downloader] yt-navigate-finish event detected. Re-scanning...");
    setTimeout(scanVideoData, 800);
  });

  // Run initial scan
  setTimeout(scanVideoData, 500);

})();
