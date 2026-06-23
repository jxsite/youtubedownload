document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("download-form");
  const input = document.getElementById("tweet-url");
  const button = form.querySelector(".btn-download");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const urlValue = input.value.trim();
    if (!urlValue) return;

    // Validate X/Twitter URL
    const tweetRegex = /https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[a-zA-Z0-9_]+\/status\/(\d+)/i;
    const match = tweetRegex.exec(urlValue);

    if (!match) {
      alert("Please enter a valid X (Twitter) status URL. Example:\nhttps://x.com/username/status/1804567890123456789");
      return;
    }

    const tweetId = match[1];

    // Show loading state
    form.classList.add("loading");
    button.disabled = true;

    // Simulate analysis & guide the user
    setTimeout(() => {
      form.classList.remove("loading");
      button.disabled = false;

      // Create a nice informational overlay modal
      showRedirectModal(urlValue, tweetId);
    }, 800);
  });

  function showRedirectModal(url, tweetId) {
    // Check if modal already exists
    let modal = document.getElementById("redirect-modal");
    if (modal) modal.remove();

    // Create modal elements
    modal = document.createElement("div");
    modal.id = "redirect-modal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3>🚀 Direct Download Guide</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p class="modal-text">Due to browser sandboxing, streaming video segments (blob URLs) must be resolved directly on the page context.</p>
          
          <div class="instruction-box">
            <div class="instruction-step">
              <span class="step-badge">1</span>
              <p>Make sure you have the <strong>Free X Video Saver</strong> extension installed.</p>
            </div>
            <div class="instruction-step">
              <span class="step-badge">2</span>
              <p>We are opening the tweet page for you in a new tab.</p>
            </div>
            <div class="instruction-step">
              <span class="step-badge">3</span>
              <p>If you have the extension installed, the download starts <strong>automatically</strong> and the tab will close!</p>
            </div>
          </div>
          
          <div class="modal-actions">
            <a href="${url}#autodownload" target="_blank" class="btn btn-primary btn-modal-go">Open Tweet & Download</a>
            <button class="btn btn-secondary btn-modal-cancel">Close</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Apply modal styles dynamically
    applyModalStyles();

    // Event listeners
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
        background: linear-gradient(135deg, #1d9bf0 0%, #a855f7 100%);
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
      }
      .btn-modal-cancel {
        font-size: 0.9rem;
        padding: 0.7rem 1.25rem;
        border-radius: 12px;
        background-color: transparent;
        color: #9ca3af;
        border: 1px solid rgba(255, 255, 255, 0.08);
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
