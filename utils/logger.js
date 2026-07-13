const colors = require('colors/safe');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class Logger {
  constructor(bot) {
    this.bot = bot;
    this.logFile = path.join(__dirname, '../logs/bot.log');
    this.queue = [];
    this.sending = false;
    this.cooldown = 2200;

    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  getTimestamp() {
    return new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  writeToFile(level, message) {
    try {
      const ts = this.getTimestamp();
      fs.appendFileSync(this.logFile, `[${ts}] [${level}] ${message}\n`, 'utf8');
    } catch (e) {}
  }

  enqueueWebhook(level, message) {
    if (!this.bot?.config?.logWebhook) return;
    this.queue.push({ level, message });
    this.processQueue();
  }

  async processQueue() {
    if (this.sending || this.queue.length === 0) return;

    this.sending = true;
    const job = this.queue.shift();

    const emoji = {
      SUCCESS: '✅',
      ERROR: '❌',
      WARN: '⚠️',
      INFO: 'ℹ️',
      DEBUG: '🔍'
    }[job.level] || '📝';

    const colorMap = {
      SUCCESS: 0x00ff88,
      ERROR: 0xff4757,
      WARN: 0xffae00,
      INFO: 0x3742fa,
      DEBUG: 0x6c5ce7
    };

    const embed = {
      title: `${emoji} ${job.level}`,
      description: `\`\`\`${job.message.slice(0, 3900)}\`\`\``,
      color: colorMap[job.level] || 0xffffff,
      timestamp: new Date().toISOString(),
      footer: {
        text: `Arch Catcher | ${this.bot?.client?.user?.tag || 'Offline'}`,
        icon_url: 'https://cdn.discordapp.com/attachments/1455235201910444238/1455790002268143686/logo.png'
      }
    };

    try {
      await axios.post(this.bot.config.logWebhook, { embeds: [embed] }, { timeout: 5000 });
    } catch (err) {
      if (err.response?.status === 429) {
        this.queue.unshift(job);
      }
    } finally {
      this.sending = false;
    }

    setTimeout(() => {
      this.processQueue();
    }, this.cooldown);
  }

  success(message) {
    const ts = this.getTimestamp();
    console.log(colors.green(`[✅ ${ts}] ${message}`));
    this.writeToFile('SUCCESS', message);
    this.enqueueWebhook('SUCCESS', message);
  }

  error(message, errorObj = null) {
    let full = message;

    if (errorObj) {
      full += `\n${errorObj.message || errorObj}`;
      if (errorObj.stack) {
        full += `\n${errorObj.stack.slice(0, 1500)}`;
      }
    }

    const ts = this.getTimestamp();
    console.error(colors.red(`[❌ ${ts}] ${full}`));
    this.writeToFile('ERROR', full);
    this.enqueueWebhook('ERROR', full);
  }

  warn(message) {
    const ts = this.getTimestamp();
    console.warn(colors.yellow(`[⚠️ ${ts}] ${message}`));
    this.writeToFile('WARN', message);
    this.enqueueWebhook('WARN', message);
  }

  info(message) {
    const ts = this.getTimestamp();
    console.log(colors.cyan(`[ℹ️ ${ts}] ${message}`));
    this.writeToFile('INFO', message);
    this.enqueueWebhook('INFO', message);
  }

  debug(message) {
    if (process.env.NODE_ENV !== 'development') return;
    const ts = this.getTimestamp();
    console.log(colors.magenta(`[🔍 ${ts}] ${message}`));
    this.writeToFile('DEBUG', message);
  }

  static success(message) {
    console.log(colors.green(`[✅] ${message}`));
  }

  static error(message) {
    console.error(colors.red(`[❌] ${message}`));
  }

  static info(message) {
    console.log(colors.cyan(`[ℹ️] ${message}`));
  }

  static warn(message) {
    console.warn(colors.yellow(`[⚠️] ${message}`));
  }

  static debug(message) {
    if (process.env.NODE_ENV !== 'development') return;
    console.log(colors.magenta(`[🔍] ${message}`));
  }
}

module.exports = Logger;
