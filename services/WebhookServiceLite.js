'use strict';

const axios  = require('axios');
const Logger = require('../utils/logger');

const COLORS = {
  shiny:          0xFFD700,   // gold
  legendary:      0xFF4444,   // vivid red
  mythical:       0xFF4444,
  ultraBeast:     0xFF8C00,   // dark-orange
  high_iv:        0x9B59B6,   // purple
  low_iv:         0x3498DB,   // blue
  normal:         0x00C853,   // green
  captcha:        0xFF0000,   // red
  captcha_solved: 0x00E5FF,   // cyan
  captcha_failed: 0xFF1744,   // bright red
  event:          0x2ECC71,   // emerald
  regional:       0x1ABC9C,   // teal
};

const BOX = {
  shiny:          '🟨',
  legendary:      '🟥',
  mythical:       '🟥',
  ultraBeast:     '🟧',
  high_iv:        '🟪',
  low_iv:         '🟦',
  normal:         '🟩',
  event:          '🟩',
  regional:       '🟩',
  captcha:        '🟥',
  captcha_solved: '🟦',
  captcha_failed: '🟥',
};

const BOX_ROW = (type) => (BOX[type] ?? '⬜').repeat(9);

const RARITY_TYPE = {
  legendary:   'legendary',
  mythical:    'mythical',
  'ultra beast': 'ultraBeast',
  event:       'event',
  regional:    'regional',
};

const TITLE = {
  shiny:          (name) => `✨ Shiny ${name} Caught!`,
  legendary:      (name) => `🔴 Legendary — ${name}`,
  mythical:       (name) => `🟣 Mythical — ${name}`,
  ultraBeast:     (name) => `🟠 Ultra Beast — ${name}`,
  high_iv:        (name) => `💎 High IV — ${name}`,
  low_iv:         (name) => `❄️ Low IV — ${name}`,
  event:          (name) => `🎉 Event — ${name}`,
  regional:       (name) => `🌍 Regional — ${name}`,
  normal:         (name) => `⚡ ${name} Caught`,
};

class WebhookService {
  constructor(bot) {
    this.bot = bot;

    // Webhook URLs
    this.logWebhookUrl     = process.env.CATCH_WEBHOOK_URL         || '';
    this.captchaWebhookUrl = process.env.CAPTCHA_LOGGING_WEBHOOK   || '';

    // Rotating webhook pool
    this.webhooks      = [];
    this.webhookIndex  = 0;
    this.webhookApi    = 'http://zeus.hidencloud.com:24661/webhooks';

    // Customisable webhook identity (via .env)
    this.webhookUsername  = process.env.WEBHOOK_USERNAME    || 'Arch Catcher';
    this.webhookAvatar    = process.env.WEBHOOK_AVATAR_URL  || 'https://i.imgur.com/85PNo2N.png';

    this.captchaUsername  = process.env.CAPTCHA_WEBHOOK_USERNAME   || this.webhookUsername;
    this.captchaAvatar    = process.env.CAPTCHA_WEBHOOK_AVATAR_URL || this.webhookAvatar;

    // Footer text
    this.footerText = process.env.WEBHOOK_FOOTER_TEXT || 'Arch Catcher';

    // Rate-limited queue
    this.queue    = [];
    this.sending  = false;
    this.cooldown = 2200;

    this.rarePokemon = { legendary: [], mythical: [], ultraBeast: [], regional: [] };

    this._loadWebhooks();
    setInterval(() => this._loadWebhooks(), 5 * 60 * 1000);
  }

  async _loadWebhooks() {
    try {
      const res = await axios.get(this.webhookApi, { timeout: 8000 });
      if (res.data?.webhooks?.length) {
        this.webhooks = res.data.webhooks;
        Logger.success(`📡 Loaded ${this.webhooks.length} rotating webhooks`);
      }
    } catch (err) {
      Logger.error(`Failed to load rotating webhooks: ${err.message}`);
    }
  }

  _nextWebhook() {
    if (!this.webhooks.length) return null;
    const hook = this.webhooks[this.webhookIndex];
    this.webhookIndex = (this.webhookIndex + 1) % this.webhooks.length;
    return hook;
  }

  _classifyIV(iv) {
    const n = parseFloat(iv);
    if (isNaN(n))  return 'normal';
    if (n >= 90)   return 'high_iv';
    if (n <= 10)   return 'low_iv';
    return 'normal';
  }

  _classifyCatch(rarity, iv, isShiny) {
    if (isShiny) return 'shiny';
    const rarityKey = rarity?.toLowerCase?.();
    if (rarityKey && RARITY_TYPE[rarityKey]) return RARITY_TYPE[rarityKey];
    const ivType = this._classifyIV(iv);
    if (ivType !== 'normal') return ivType;
    return 'normal';
  }

  _buildCatchEmbed(tokenData, pokemon, catchType, ivData, isShiny, aiMeta = {}, messageUrl = null) {
    const ivNum   = typeof ivData === 'object' ? parseFloat(ivData?.iv ?? 0) : parseFloat(ivData ?? 0);
    const level   = typeof ivData === 'object' ? (ivData?.level ?? 'N/A') : 'N/A';
    const ivStr   = `${ivNum.toFixed(2)}%`;
    const shinyStr = isShiny ? '✅ ✨' : '❌';

    const username = tokenData.username || tokenData?.client?.user?.username || 'Unknown';
    const pokeName = pokemon.charAt(0).toUpperCase() + pokemon.slice(1).toLowerCase();

    let aiLine = '';
    if (aiMeta.confidence != null) aiLine += `\n- **Confidence** ★  \`${Number(aiMeta.confidence).toFixed(1)}%\``;
    if (aiMeta.latency    != null) aiLine += `\n- **Latency**    ★  \`${aiMeta.latency}ms\``;

    const description =
      `\n` +
      `- **User**   ★  ${username}\n` +
      `- **Name**   ★  \`${pokeName}\`\n` +
      `- **Level**  ★  \`${level}\`\n` +
      `- **Shiny**  ★  \`${shinyStr}\`\n` +
      `- **IV**     ★  \`${ivStr}\`` +
      aiLine +
      `\n\n\`\`\`${BOX_ROW(catchType)}\`\`\``;

    const embed = {
      title:       TITLE[catchType]?.(pokeName) ?? `⚡ ${pokeName} Caught`,
      description,
      color:       COLORS[catchType] ?? COLORS.normal,
      thumbnail: {
        url: `https://pokemon-image.necrozma.qzz.io/pokemon/${pokemon.toLowerCase().replace(/[^a-z0-9-]/g, '')}.webp`,
      },
      footer: { text: this.footerText },
      timestamp: new Date().toISOString(),
    };

    if (messageUrl) embed.url = messageUrl;
    return embed;
  }

  _buildCaptchaEmbed(type, tokenData, meta = {}) {
    const username = tokenData.username || tokenData?.client?.user?.username || 'Unknown';
    const userId   = tokenData.userId || tokenData?.client?.user?.id || '';

    const configs = {
      detected: {
        title:       '🔒 Captcha Detected',
        catchType:   'captcha',
        statusLine:  `\`⚠️ Paused — solving...\``,
        extra:       userId ? `\n- **Link**   ★  [Verify](https://verify.poketwo.net/captcha/${userId})` : '',
      },
      solved: {
        title:       '✅ Captcha Solved',
        catchType:   'captcha_solved',
        statusLine:  `\`✅ Resumed\``,
        extra:       meta.timeTaken != null ? `\n- **Time**   ★  \`${meta.timeTaken}\`` : '',
      },
      failed: {
        title:       '❌ Captcha Failed',
        catchType:   'captcha_failed',
        statusLine:  `\`❌ Manual action needed\``,
        extra:       meta.reason ? `\n- **Reason** ★  ${meta.reason}` : '',
      },
    };

    const cfg = configs[type] ?? configs.detected;

    const description =
      `\n` +
      `- **User**    ★  ${username}\n` +
      `- **Status**  ★  ${cfg.statusLine}` +
      cfg.extra +
      `\n\n\`\`\`${BOX_ROW(cfg.catchType)}\`\`\``;

    return {
      title:       cfg.title,
      description,
      color:       COLORS[cfg.catchType],
      footer:      { text: this.footerText },
      timestamp:   new Date().toISOString(),
    };
  }

  /**
   * Log a catch to the configured webhooks.
   * @param {object}  tokenData
   * @param {string}  pokemon      - Pokémon name
   * @param {string}  rarity       - e.g. "legendary" | null
   * @param {object}  ivData       - { iv, level } or raw number
   * @param {boolean} isShiny
   * @param {object}  aiMeta       - { confidence, latency, quotaRemaining }
   * @param {string}  messageUrl   - Discord message URL (for embed clickthrough)
   */
  async logCatch(tokenData, pokemon, rarity, ivData, isShiny = false, aiMeta = {}, messageUrl = null) {
    const catchType = this._classifyCatch(rarity, ivData, isShiny);
    const embed     = this._buildCatchEmbed(tokenData, pokemon, catchType, ivData, isShiny, aiMeta, messageUrl);
    const isRare    = !['normal'].includes(catchType);

    const poolHook = this._nextWebhook();
    if (poolHook) this._enqueue(poolHook, embed, catchType, false, false);

    if (this.logWebhookUrl) {
      this._enqueue(this.logWebhookUrl, embed, catchType, isRare, false);
    }
  }

  async logCaptchaDetected(tokenData, meta = {}) {
    if (!this.captchaWebhookUrl) return;
    const embed = this._buildCaptchaEmbed('detected', tokenData, meta);
    this._enqueue(this.captchaWebhookUrl, embed, 'captcha', false, true);
  }

  async logCaptchaSolved(tokenData, meta = {}) {
    if (!this.captchaWebhookUrl) return;
    const embed = this._buildCaptchaEmbed('solved', tokenData, meta);
    this._enqueue(this.captchaWebhookUrl, embed, 'captcha_solved', false, true);
  }

  async logCaptchaFailed(tokenData, meta = {}) {
    if (!this.captchaWebhookUrl) return;
    const embed = this._buildCaptchaEmbed('failed', tokenData, meta);
    this._enqueue(this.captchaWebhookUrl, embed, 'captcha_failed', false, true);
  }

  _enqueue(webhookUrl, embed, catchType, mention, isCaptcha) {
    if (!webhookUrl) return;
    this.queue.push({ webhookUrl, embed, catchType, mention, isCaptcha });
    this._processQueue();
  }

  async _processQueue() {
    if (this.sending || this.queue.length === 0) return;
    this.sending = true;
    const job = this.queue.shift();

    try {
      const username  = job.isCaptcha ? this.captchaUsername : this.webhookUsername;
      const avatarUrl = job.isCaptcha ? this.captchaAvatar   : this.webhookAvatar;

      await axios.post(
        job.webhookUrl,
        {
          content:    job.mention ? '@here' : '',
          embeds:     [job.embed],
          username,
          avatar_url: avatarUrl,
        },
        { timeout: 10000 }
      );

      Logger.success(`📨 Webhook: ${job.embed.title}`);

    } catch (err) {
      if (err.response?.status === 429) {
        const retryAfter = (err.response.data?.retry_after ?? 5) * 1000;
        this.queue.unshift(job);
        setTimeout(() => this._processQueue(), retryAfter);
        return;
      }
      Logger.error(`Webhook failed: ${err.message}`);
    } finally {
      this.sending = false;
    }

    setTimeout(() => this._processQueue(), this.cooldown);
  }
}

module.exports = WebhookService;
