# Chrome Web Store Listing (Chrome 插件商店上架指南)

这里为您整理了在 Chrome Web Store 开发者后台上传插件时，所有需要填写的文字和图片资源。

---

## 1. 文本信息填写

### 软件包中的标题 (Title)
> Free X Video Saver

### 软件包中的摘要 (Summary)
> Free helper for saving X/Twitter videos you own or have permission to download.

### 说明 (Description / 详细介绍) - *直接复制下方文本填入“说明”框中*
```text
Free X Video Saver 是一款轻量、快捷的 X (Twitter) 视频与 GIF 下载辅助工具，专为创作者和个人用户设计，用于备份和存档自己拥有版权或已获授权的媒体内容。

【核心功能】
1. 一键下载：在 X.com 网页端浏览视频时，本插件会在视频播放器下方智能嵌入“Free download”下载按钮，点击即可直接调用 Chrome 下载器下载原始高清 MP4 文件。
2. 网站联动：配套免费在线视频下载网页 (https://jxsite.github.io/xdownload/)。您可以随时复制推文链接并在网页上进行解析下载。
3. 极简弹出面板：点击浏览器右上角的插件图标，即可一键跳转到配套的网页在线下载器，方便随时手动粘贴链接进行解析。

【使用说明】
1. 正常浏览 X (Twitter) 网页。
2. 当发现感兴趣的视频时，直接点击视频下方的蓝色“Free download”按钮。
3. 插件会自动从页面底层提取该视频对应的 MP4 资源链接并开始下载。
4. 如果是在配套网页中输入链接，插件在检测到带有自动下载参数的跳转后，会自动执行下载并秒关标签页，整个过程无缝丝滑。

【隐私与安全合规声明】
- 隐私至上：本插件完全在本地解析视频链接，不收集、不上传任何用户的个人数据或浏览历史。
- 安全合规：本插件完全符合 Chrome MV3 安全规范。它严格遵循权限最小化原则（仅需 activeTab, downloads, storage 权限），且不依赖任何远程注入代码。
- 局限性说明：本插件仅适用于公开可见的视频内容。它无法且绝对不会绕过私密账号、付费墙、平台登录限制或任何数字版权管理（DRM）防护。请在下载他人视频前，务必获得原作者的许可。
```

---

## 2. 选项与类别设置

- **类别 (Category)**:
  - 建议选择：`生产力工具` (Productivity) 或 `实用工具` (Utility)。
- **语言 (Language)**:
  - 建议选择：`中文（简体）` (Chinese Simplified) 或 `英语` (English)。
- **官方网站 (Official website)**:
  - 选择 `无`（若没有在 Google Search Console 验证此域名所有权，请保持为“无”）。
- **首页网址 (Homepage URL)**:
  - 填写配套的 GitHub Pages 地址：`https://jxsite.github.io/xdownload/`
- **支持信息页面网址 (Support page URL)**:
  - 建议填写：`https://jxsite.github.io/xdownload/` 或项目反馈地址 `https://github.com/jxsite/xdownload/issues`
- **成人内容 (Adult content)**:
  - 选择 `关`（默认关闭）。

---

## 3. 图片资源上传清单

所有图片文件已在本地生成，并且已经过裁剪、缩放，移除了 alpha 透明通道（格式为标准的 24 位 RGB 图像，防止商店报错）。

您可以在本地的 **`d:\aiworkfile\xdownload-src\store-assets\`** 文件夹中找到它们：

| 商店栏目 | 对应本地图片文件名 | 规格要求 | 作用与特点 |
| :--- | :--- | :--- | :--- |
| **商店图标** | `store_icon_128x128.png` | 128x128 像素 | 插件在商店显示的专属 Logo，高清无底色。 |
| **屏幕截图** | `screenshot_1280x800.png` | 1280x800 像素 | 展示插件在 X.com 页面上嵌入“Free download”下载按钮的实机截图。 |
| **小型宣传图块** | `promo_tile_small_440x280.png` | 440x280 像素 | 商店推荐页面的小海报图，以深蓝色现代科技感为主题，带有明显的 Download 图标。 |
| **顶部宣传图块** | `promo_tile_large_1400x560.png` | 1400x560 像素 | 商店大 banner 海报，长宽比 2.5:1，适用于高级推广版面。 |

