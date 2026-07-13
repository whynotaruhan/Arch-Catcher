'use strict';

const axios  = require('axios');
const https  = require('https');
const Logger = require('../utils/logger');

const AGENT = new https.Agent({ rejectUnauthorized: false });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

class CaptchaSolver {
  constructor(bot) {
    this.bot = bot;

    this.solverUrl = process.env.XYRIS_SOLVER_URL || 'http://hostname:port/solve';
    this.apiKey    = process.env.XYRIS_API_KEY    || '';
    this.maxRetry  = parseInt(process.env.XYRIS_RETRY ?? '3', 10);

    const raw = process.env.XYRIS_POST_SOLVE_MESSAGES ?? '!solved';
    this.postSolveMessages = raw.split(',').map(s => s.trim()).filter(Boolean);

  }

  isAvailable() {
    return !!(this.solverUrl && this.apiKey);
  }


  _headers() {
    return { 'x-api-key': this.apiKey };
  }

  async _post(token) {
    return axios.post(
      this.solverUrl,
      { token },
      { headers: this._headers(), httpsAgent: AGENT, timeout: 0 }
    );
  }


  /**
   * Attempts to solve the captcha via the Xyris Solver API.
   *
   * @param {object} tokenData  - { token, userId, username, client, channelId }
   *   channelId is optional; when provided, post-solve messages are sent there.
   * @returns {string|null}  'CAPTCHA_BYPASSED' on success, null on failure.
   */
  async solveCaptcha(tokenData) {
    const { token, username = 'unknown', client, channelId } = tokenData;
    const startTime = Date.now();
    let retries = 0;

    if (!this.isAvailable()) {
      Logger.warn('⚠️  Xyris captcha solver not configured (missing XYRIS_API_KEY)');
      return null;
    }

    Logger.warn(`🔒 [${username}] Captcha detected — Xyris solver starting...`);

    const attempt = async () => {
      Logger.info(`🧠 [${username}] Solving... (attempt ${retries + 1}/${this.maxRetry + 1})`);

      try {
        const res    = await this._post(token);
        const data   = res.data || {};
        const status = data.status;

        if (status === true) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
          Logger.success(`✅ [${username}] Captcha solved in ${elapsed}s`);

          if (channelId && client && this.postSolveMessages.length > 0) {
            const channel = client.channels?.cache?.get(channelId);
            if (channel) {
              for (const msg of this.postSolveMessages) {
                try {
                  await channel.send(msg);
                  Logger.info(`📤 [${username}] Post-solve: "${msg}"`);
                } catch (e) {
                  Logger.error(`❌ [${username}] Failed to send post-solve msg: ${e.message}`);
                }
                await sleep(2000);
              }
            }
          }

          return 'CAPTCHA_BYPASSED';
        }

        const reason = data.error || 'Unknown response from solver';
        throw new Error(reason);

      } catch (err) {
        const detail = err?.response?.data?.error || err?.message || String(err);
        Logger.error(`❌ [${username}] Solve attempt ${retries + 1} failed: ${detail}`);

        if (retries < this.maxRetry) {
          retries++;
          Logger.info(`⏳ [${username}] Retrying in 5s...`);
          await sleep(5000);
          return attempt();
        }

        Logger.warn(`⚠️  [${username}] All ${this.maxRetry + 1} attempts failed. Waiting 3 min before giving up.`);
        await sleep(180_000);

        return null;
      }
    };

    return attempt();
  }

  async handleRateLimit(username = 'unknown') {
    const pauses = [900_000, 1_000_000, 1_100_000, 1_200_000];
    const wait   = pauses[Math.floor(Math.random() * pauses.length)];
    Logger.warn(`⚠️  [${username}] Rate-limited — pausing ${Math.round(wait / 60000)} min`);
    await sleep(wait);
  }

  async checkUsage() {
    return { success: false, error: 'Usage check not supported by Xyris solver' };
  }
}

module.exports = CaptchaSolver;
