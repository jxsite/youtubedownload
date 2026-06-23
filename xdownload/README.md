# Free X Video Saver

A minimal, high-performance Manifest V3 Chrome extension and companion webpage for saving X/Twitter videos you own or have permission to download.

## Key Features

- **Direct In-Page Download Button**: Adds a neat, native-style "↓ Free download" button directly beneath the video player controls on `x.com` and `twitter.com`.
- **Advanced React Fiber Extractor**: Synchrously climbs X's React component tree to fetch direct MP4 URLs from memory. Works even when network requests are cached or unavailable.
- **GraphQL Response Interceptor**: Intercepts background JSON payloads to map tweet IDs to direct high-quality CDN links (`video.twimg.com`).
- **Complete Privacy & Safety**: Processes all downloads 100% locally. Zero remote trackers, no cookie scrapers, and minimal store-approved permissions (`activeTab`, `downloads`, `storage`).
- **Web Downloader Companion**: Includes a beautiful landing page with an interactive guide in the `docs/` folder, ready for SEO and traffic.

## Companion Webpage (docs/)

The `docs/` directory contains a premium, responsive, dark-themed landing page designed to rank on search engines for video downloading keywords and redirect users to install your extension.

### Deploying to GitHub Pages

To launch your companion landing page on GitHub Pages:
1. Push this repository to your GitHub account (e.g. `github.com/your-username/xdownload`).
2. Go to your repository settings on GitHub.
3. In the left sidebar, click **Pages**.
4. Under **Build and deployment**, set the Source to **Deploy from a branch**.
5. Choose the `main` (or `master`) branch, and change the folder from `/ (root)` to `/docs`.
6. Click **Save**.
7. In a few minutes, your site will be live at `https://your-username.github.io/xdownload/`!

## Load locally

1. Open `chrome://extensions` in Google Chrome.
2. Enable **Developer mode** in the top right.
3. Click **Load unpacked** in the top left.
4. Select this project folder.
5. Open any X/Twitter post with a video and click the download button inside the player.

---

## Store Preparation

Use the text in [store-listing.md](file:///d:/aiworkfile/xdownload/docs/store-listing.md) as the description for your Chrome Web Store submission, and [PRIVACY.md](file:///d:/aiworkfile/xdownload/PRIVACY.md) as your store-approved privacy policy.

