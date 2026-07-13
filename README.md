<p align="center">
  <a href="https://discord.gg/zeroday">
    <img width="180px" src="https://i.imgur.com/85PNo2N.png" alt="Arch Catcher Logo">
  </a>
  <h1 align="center">Arch Catcher</h1>
  <p align="center"><strong>The most advanced AI-powered Pokétwo autocatcher — built for speed, built for scale.</strong></p>
</p>

<p align="center">
  <a href="https://discord.gg/zeroday">
    <img src="https://img.shields.io/discord/zeroday?label=Support%20Server&logo=discord&logoColor=white&style=for-the-badge&color=5865F2" alt="Discord">
  </a>
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="discord.js">
  <img src="https://img.shields.io/badge/License-Apache%202.0-blue?style=for-the-badge" alt="License">
</p>

---

<div align="center">
<table>
  <tr>
    <td align="center">
      <h2>⚡ GET YOUR KEYS — INSTANT ACTIVATION ⚡</h2>
      <p><i>AI Prediction & Xyris Captcha Solver — purchased exclusively through our Discord</i></p>
      <hr>
      <table width="100%">
        <tr>
          <td align="center"><b>🤖 AI Prediction API</b></td>
          <td align="center"><b>🔐 Xyris Captcha Solver</b></td>
        </tr>
        <tr>
          <td align="center">Real-time image identification<br>with confidence scoring</td>
          <td align="center">Fully automated captcha bypass<br>with incense protection</td>
        </tr>
      </table>
      <br>
      <a href="https://discord.gg/zeroday">
        <img src="https://img.shields.io/badge/JOIN_DISCORD_TO_BUY-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Buy Now">
      </a>
    </td>
  </tr>
</table>
</div>

---

## ✨ Features

- 🤖 **AI Image Identification** — Identifies Pokémon from spawn images in milliseconds, no hints needed
- 🎣 **Hint Fallback Engine** — Automatically switches to multi-step hint solving if the AI guess is wrong
- 🔐 **Xyris Captcha Auto-Solver** — Detects, solves, and resumes with zero manual input
- 📊 **Multi-Account Management** — Run unlimited selfbot accounts from one control bot
- 🎨 **Rich Webhook Logging** — Colour-coded catch embeds with rotating pool and `@here` pings for rares
- 📱 **Interactive Discord UI** — Button-driven stats dashboard, modals for token management
- 🖱️ **Auto-Click** — Automatically confirms Pokétwo interaction buttons
- 🔄 **Auto-Start** — All accounts resume catching on every bot boot, no commands needed

---

## 🚀 Quick Start

### Prerequisites
- Node.js **18+**
- A regular Discord **bot token** (control panel)
- **Selfbot tokens** for catching accounts
- **AI API key** and **Xyris Solver key** — get them at [discord.gg/zeroday](https://discord.gg/zeroday)

### Installation

**1. Clone and install**
```bash
git clone https://github.com/your-username/arch-catcher.git
cd arch-catcher
npm install
```

**2. Create your `.env` file**
```env
# ── Control Bot ─────────────────────────────────────────────────────────────────
DISCORD_TOKEN=YOUR_BOT_TOKEN
OWNER_IDS=YOUR_USER_ID
PREFIX=$

# ── Webhooks ─────────────────────────────────────────────────────────────────────
CATCH_WEBHOOK_URL=https://discord.com/api/webhooks/...
CAPTCHA_LOGGING_WEBHOOK=https://discord.com/api/webhooks/...

# ── AI Prediction ────────────────────────────────────────────────────────────────
PREDICTION_API_URL=http://zeus.hidencloud.com:24661
PREDICTION_API_KEY=YOUR_AI_KEY

# ── Xyris Captcha Solver ─────────────────────────────────────────────────────────
XYRIS_SOLVER_URL=http://localhost:2043/solve
XYRIS_API_KEY=YOUR_XYRIS_KEY
XYRIS_RETRY=3

# ── Webhook Identity ─────────────────────────────────────────────────────────────
WEBHOOK_USERNAME=Arch Catcher
WEBHOOK_AVATAR_URL=https://i.imgur.com/85PNo2N.png
WEBHOOK_FOOTER_TEXT=Arch Catcher
CAPTCHA_WEBHOOK_USERNAME=Arch Catcher
CAPTCHA_WEBHOOK_AVATAR_URL=https://i.imgur.com/85PNo2N.png
```

**3. Start**
```bash
npm start
# Development (auto-restart)
npm run dev
```

**4. Add catching accounts**

Run `$add <selfbot_token>` in any server the bot is in, or use the **Add Token** button inside `$stats`. Accounts start catching immediately and auto-restart on every subsequent boot.

---

## 📋 Commands

### ⚡ System
| Command | Description |
| :--- | :--- |
| `$ping` | Check bot latency |
| `$help` | Full command reference embed |
| `$reload` | Stop all catchers and reload tokens from disk |
| `$set-prefix <prefix>` | Change the command prefix |

### 👑 Administration
| Command | Description |
| :--- | :--- |
| `$add [token]` | Add a catching account (modal or inline) |
| `$remove <index\|all>` | Remove one or all accounts |
| `$list` | List all accounts |
| `$current-tokens` | Paginated token viewer with buttons |
| `$owner <id> add` | Grant bot owner access |
| `$owner <id> remove` | Revoke bot owner access |

### 🎣 Catching Controls
| Command | Description |
| :--- | :--- |
| `$start [index]` | Start catcher in AI mode |
| `$stop [index]` | Stop catcher |
| `$catcher start [index]` | Fine-grained start |
| `$catcher stop [index]` | Fine-grained stop |
| `$captcha <on\|off>` | Globally pause or resume captcha handling |
| `$auto-click [on\|off]` | Toggle confirmation auto-click |

### 📊 Data & Analytics
| Command | Description |
| :--- | :--- |
| `$stats [index]` | Global dashboard or per-account stats |
| `$catching` | Live view of all active catchers |
| `$api` | Check AI prediction quota and status |
| `$say <message>` | Send a message via a selected catcher account |

### 🔧 Utilities
| Command | Description |
| :--- | :--- |
| `$testhook` | Fire test embeds for every catch type |

---

## 🎨 Webhook Catch Types

Every catch fires a colour-coded embed to your configured webhook. Rare catches automatically ping `@here`.

| Type | Colour | Box |
| :--- | :--- | :--- |
| Normal | 🟩 Green | `🟩🟩🟩🟩🟩🟩🟩🟩🟩` |
| Shiny | 🟨 Gold | `🟨🟨🟨🟨🟨🟨🟨🟨🟨` |
| Legendary | 🟥 Red | `🟥🟥🟥🟥🟥🟥🟥🟥🟥` |
| Mythical | 🟥 Red | `🟥🟥🟥🟥🟥🟥🟥🟥🟥` |
| Ultra Beast | 🟧 Orange | `🟧🟧🟧🟧🟧🟧🟧🟧🟧` |
| High IV (≥ 90%) | 🟪 Purple | `🟪🟪🟪🟪🟪🟪🟪🟪🟪` |
| Low IV (≤ 10%) | 🟦 Blue | `🟦🟦🟦🟦🟦🟦🟦🟦🟦` |
| Event | 🟩 Emerald | `🟩🟩🟩🟩🟩🟩🟩🟩🟩` |
| Regional | 🟩 Teal | `🟩🟩🟩🟩🟩🟩🟩🟩🟩` |

---

## 🗂️ Project Structure

```
arch-catcher/
├── index.js                        # Control bot, interaction handler, help & stats
├── .env                            # Configuration (do not commit)
├── package.json
├── data/
│   └── tokens.json                 # Persistent catching accounts
├── logs/
│   └── bot.log                     # Rolling log file
├── commands/
│   ├── add.js / remove.js / list.js
│   ├── start.js / stop.js / catching.js
│   ├── stats.js / api.js / say.js
│   ├── auto-click.js / testhook.js
│   └── help.js
├── services/
│   ├── AutocatcherServiceLite.js   # Core catching engine (AI + hint fallback)
│   ├── AIPredictionServiceLite.js  # AI image identification
│   ├── CaptchaSolverLite.js        # Xyris captcha integration
│   ├── StarterServiceLite.js       # Starter Pokémon & TOS handler
│   ├── TokenServiceLite.js         # Account management & persistence
│   └── WebhookServiceLite.js       # Embed builder & webhook queue
└── utils/
    ├── CommandHandler.js           # Command file loader
    ├── EmbedHandler.js             # Shared embed helpers
    ├── logger.js                   # Console + file + webhook logger
    └── utils.js                    # Shared utilities
```

---

## 🛡️ Security Notes

- **Never** commit your `.env` file — add it to `.gitignore`
- Keep selfbot tokens private; treat them like passwords
- Regularly rotate your AI and Xyris API keys
- Only grant `OWNER_IDS` access to users you fully trust

---

## ⚠️ Disclaimer

This tool interacts with Discord accounts in ways that may violate Discord's Terms of Service. Use at your own risk. The developers accept no responsibility for account suspensions or penalties resulting from its use.

---

<p align="center">
  Made with ⚡ by the <b>Arch</b> team &nbsp;•&nbsp;
  <a href="https://discord.gg/zeroday">discord.gg/zeroday</a>
  <br><br>
  ⭐ <b>Star this repo if Arch Catcher is catching for you!</b>
</p>
