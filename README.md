# Uhuy-Bot WhatsApp 🤖

A versatile WhatsApp bot for downloading, news, group tools, and more!

---

## 🚀 Main Features
- Download TikTok, YouTube, News
- Tools: sticker maker, sticker to image
- Group admin: add/kick members
- Simple command menu: type `.menu` in WhatsApp

---

## 📥 Popular Commands

**Downloader:**
```
.tiktok <url>      TikTok Video
.yt <url>          YouTube Video
.ytmp3 <url>       YouTube MP3
.yts <query>       YouTube Search
```

**Tools:**
```
.sticker           Sticker maker
.toimg             Sticker to image
```

**Group:**
```
.add <number>      Add member
.kick <number>     Remove member
```

**Admin Tools:**
```
.performance       View bot performance stats
.listtriggers      List auto-reply triggers
.addtrigger        Add auto-reply trigger
```

---

## 🔧 Performance Features

This bot includes advanced performance optimizations:

- **Caching System** - Reduces file I/O by 90%
- **Connection Health Monitoring** - Auto-recovery with exponential backoff
- **Lazy Command Loading** - Commands loaded only when needed
- **Rate Limiting** - Prevents API abuse
- **Message Queue** - Handles high-traffic scenarios

## ⚡️ Getting Started

1. **Install dependencies:**
   ```bash
   git clone https://github.com/buatngasal/simple-uhuy-bot.git
   cd simple-uhuy-bot
   npm install
   npm install abot-scraper --legacy-peer-deps
   ```
2. **Run the bot:**
   ```bash
   node index.js
   ```
3. **Scan the WhatsApp QR code** on first run.

- Max file size for video/audio: 100MB (WhatsApp limit)
- See all features: type `.menu` in WhatsApp

---

## 🙋‍♂️ Support & Contribution
- Suggestions/bugs: open an issue on GitHub
- Contact: @buatngasal

---


## 📄 License

MIT License

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
