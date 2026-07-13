require('dotenv').config();
require('colors');
const {
  Client,
  GatewayIntentBits,
  Collection,
  EmbedBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');

const Logger         = require('./utils/logger');
const TokenService   = require('./services/TokenServiceLite');
const WebhookService = require('./services/WebhookServiceLite');
const AIService      = require('./services/AIPredictionServiceLite');
const CaptchaService = require('./services/CaptchaSolverLite');
const StarterService = require('./services/StarterServiceLite');
const AutocatcherService = require('./services/AutocatcherServiceLite');
const CommandHandler = require('./utils/CommandHandler');
const EmbedHandler   = require('./utils/EmbedHandler');
const { chunk, commatize } = require('./utils/utils');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

const PAGE_SIZE = 5;

const bot = {
  client,
  tokenService:      null,
  webhookService:    null,
  aiService:         null,
  captchaService:    null,
  starterService:    null,
  autocatcherService:null,
  config: {
    prefix:   process.env.PREFIX || '$',
    ownerIds: process.env.OWNER_IDS ? process.env.OWNER_IDS.split(',').map(s => s.trim()) : [],
    logWebhook: process.env.LOG_WEBHOOK_URL,
  },
};

const logger = new Logger(bot);

// Graceful shutdown 
process.on('SIGINT', async () => {
  logger.info('🛑 Shutting down Arch Catcher...');
  if (bot.autocatcherService) await bot.autocatcherService.stopAll();
  if (bot.tokenService) await bot.tokenService.saveTokens();
  logger.success('✅ All services stopped gracefully');
  process.exit(0);
});

// Error handling
let restartBarrier = false;
setTimeout(() => { restartBarrier = true; }, 5000);

process.on('unhandledRejection', (error) => {
  if (restartBarrier) { logger.error('Unhandled Rejection:', error); return; }
});
process.on('uncaughtException', (error) => {
  if (restartBarrier) { logger.error('Uncaught Exception:', error); return; }
});

// Service initialisation
async function initServices() {
  logger.info('🔧 Initialising Arch Catcher services...');

  bot.tokenService = new TokenService(bot);

  bot.tokenService.on('tokensReady', async (count) => {
    logger.info(`⚡ Tokens ready (${count}), auto-starting catchers...`);
    const tokens = bot.tokenService.tokens;
    for (let i = 0; i < tokens.length; i++) {
      try {
        const res = await bot.autocatcherService.startCatching(i, 'ai');
        if (res.success) logger.success(`✅ Auto-started: ${res.username} (#${i})`);
        else             logger.warn(`⚠️ Failed to auto-start #${i}: ${res.error}`);
      } catch (err) {
        logger.error(`❌ Auto-start error #${i}: ${err.message}`);
      }
    }
    logger.success('🚀 Auto-start complete');
  });

  bot.webhookService = new WebhookService(bot);
  bot.aiService      = new AIService(bot);
  bot.captchaService = new CaptchaService(bot, bot.webhookService);
  bot.starterService = new StarterService(bot);

  bot.autocatcherService = new AutocatcherService(
    bot.tokenService,
    bot.aiService,
    bot.captchaService,
    bot.webhookService,
    bot.starterService,
    bot
  );

  logger.success('✅ All 6 services initialised');
  logger.info(`🤖 AI:      ${bot.aiService.isAvailable() ? '✅ READY' : '❌ Configure PREDICTION_API_KEY'}`);
  logger.info(`🔐 Xyris:   ${bot.captchaService.isAvailable() ? '✅ READY' : '❌ Configure XYRIS_API_KEY'}`);
}

client.once('ready', async () => {
  logger.success(`\n🚀 Arch Catcher — ${client.user.tag} ONLINE! 🚀`);
  logger.info(`📍 Serving ${client.guilds.cache.size} server(s)`);

  client.commands = new Collection();
  const commandHandler = new CommandHandler(bot);
  await commandHandler.loadCommands('./commands');

  await initServices();

  // Activity updater
  setInterval(() => {
    if (bot.autocatcherService) {
      const active = bot.autocatcherService.getActiveCatchers();
      client.user.setActivity(
        `${active.length} catcher${active.length !== 1 ? 's' : ''} active | ${bot.config.prefix}help`,
        { type: 'PLAYING' }
      );
    }
  }, 30000);

  logger.success('🎉 Arch Catcher fully operational!');
});

async function buildStatsEmbed(page = 0) {
  const autocatchers = bot.autocatcherService ? bot.autocatcherService.getActiveCatchers() : [];
  const allTokens    = bot.tokenService ? bot.tokenService.getAllTokens() : [];

  if (allTokens.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Arch Catcher Stats')
      .setDescription('*No accounts added yet.*')
      .setColor('#2ecc71')
      .setTimestamp();
    return { embed, totalPages: 1 };
  }

  let totalCatches = 0;
  let totalBalance = 0;

  const fields = allTokens.map((t, i) => {
    const catcher = autocatchers.find(c => c.index === i);
    const catches = (catcher?.stats?.catchSuccess ?? 0) + (t.totalCatches ?? 0);
    const balance = t.balance ?? 0;
    totalCatches += catches;
    totalBalance += balance;

    const status    = catcher ? (catcher.status?.includes('PAUSED') ? '⏸️' : '🟢') : '🔴';
    const lastCatch = catcher?.stats?.startTime
      ? `<t:${Math.floor(new Date(catcher.stats.startTime).getTime() / 1000)}:R>`
      : 'N/A';
    const captchaNote = catcher?.status?.includes('PAUSED') && catcher?.status?.includes('captcha')
      ? `\n• ❕ [Captcha](https://verify.poketwo.net/captcha/${t.userId})`
      : '';

    return `**${i + 1}. ${t.username}** • \`${commatize(catches)}\` • \`${commatize(balance)}\` • ${lastCatch}${captchaNote}`;
  });

  const chunks     = chunk(fields, 10);
  const totalPages = chunks.length;
  const safePage   = Math.max(0, Math.min(page, totalPages - 1));

  const activeCount = autocatchers.filter(c => !c.status?.includes('PAUSED')).length;

  const embed = new EmbedBuilder()
    .setTitle('📊 Arch Catcher Statistics')
    .setColor('#00FF7F')
    .setDescription(
      '```ini\n' +
      `Total Accounts   : ${allTokens.length}\n` +
      `Active Catchers  : ${activeCount}/${allTokens.length}\n` +
      `Total Catches    : ${commatize(totalCatches)}\n` +
      `Total PokéCoins  : ${commatize(totalBalance)}\n` +
      '```\n' +
      `**Account Details:**\n` +
      (chunks[safePage]?.join('\n') ?? '*No data*')
    )
    .setFooter({ text: `Page ${safePage + 1} of ${totalPages} • Last updated` })
    .setTimestamp();

  return { embed, totalPages, safePage };
}

function buildStatButtons(page, totalPages, authorId) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`statPage-L-${page}-${authorId}`)
      .setLabel('◀ Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('refresh_stats')
      .setLabel('🔄 Refresh')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`statPage-R-${page}-${authorId}`)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('add_token_modal').setLabel('Add Token').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('remove_token_modal').setLabel('Remove Token').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('add_bulk_modal').setLabel('Bulk Add').setStyle(ButtonStyle.Secondary)
  );
  return [row1, row2];
}

function buildTokenEmbed(page) {
  const allTokens = bot.tokenService ? bot.tokenService.getAllTokens() : [];
  const start     = page * PAGE_SIZE;
  const slice     = allTokens.slice(start, start + PAGE_SIZE);

  const embed = new EmbedBuilder()
    .setTitle(`🔑 Token List — Page ${page + 1}`)
    .setColor('#90EE90')
    .setTimestamp();

  if (slice.length === 0) {
    embed.setDescription('No tokens available.');
  } else {
    slice.forEach((t, i) => {
      embed.addFields({
        name:  `Token ${start + i + 1} — ${t.username}`,
        value: `**Preview:** \`${t.tokenPreview}\`\n**Balance:** ${commatize(t.balance ?? 0)} coins\n**Catches:** ${commatize(t.totalCatches ?? 0)}`,
        inline: false,
      });
    });
  }
  return embed;
}

function buildTokenPageButtons(page) {
  const allTokens = bot.tokenService ? bot.tokenService.getAllTokens() : [];
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`previous_${page}`)
      .setLabel('◀ Previous')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`next_${page}`)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Primary)
      .setDisabled((page + 1) * PAGE_SIZE >= allTokens.length)
  )];
}

client.on('interactionCreate', async (interaction) => {

  // Auth guard
  const isOwner = bot.config.ownerIds.includes(
    interaction.user?.id ?? interaction.member?.user?.id ?? ''
  );

  if (!isOwner) {
    if (interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu()) {
      return interaction.reply({ content: '🚫 You are not authorised to use this!', ephemeral: true });
    }
  }

  if (interaction.isButton()) {

    if (interaction.customId.startsWith('statPage')) {
      const parts   = interaction.customId.split('-');
      const dir     = parts[1];
      let   page    = parseInt(parts[2]);
      if (dir === 'L') page = Math.max(0, page - 1);
      else             page++;
      const { embed, totalPages, safePage } = await buildStatsEmbed(page);
      return interaction.update({ embeds: [embed], components: buildStatButtons(safePage, totalPages, interaction.user.id) });
    }

    if (interaction.customId === 'refresh_stats') {
      const { embed, totalPages, safePage } = await buildStatsEmbed(0);
      return interaction.update({ embeds: [embed], components: buildStatButtons(safePage, totalPages, interaction.user.id) });
    }

    if (interaction.customId.startsWith('previous') || interaction.customId.startsWith('next')) {
      const parts   = interaction.customId.split('_');
      let   page    = parseInt(parts[1]);
      const allTokens = bot.tokenService?.getAllTokens() ?? [];
      if (interaction.customId.startsWith('previous') && page > 0)                       page--;
      if (interaction.customId.startsWith('next') && (page + 1) * PAGE_SIZE < allTokens.length) page++;
      const embed = buildTokenEmbed(page);
      return interaction.update({ embeds: [embed], components: buildTokenPageButtons(page) });
    }

    if (interaction.customId === 'add_token_modal') {
      const modal = new ModalBuilder().setCustomId('addTokenModal').setTitle('Add Token');
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('tokenInput').setLabel('Discord Bot Token')
          .setStyle(TextInputStyle.Paragraph).setPlaceholder('Enter token here...').setRequired(true)
      ));
      return interaction.showModal(modal);
    }

    if (interaction.customId === 'add_bulk_modal') {
      const modal = new ModalBuilder().setCustomId('add_bulk_modal_submit').setTitle('Bulk Add Tokens');
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('bulk_tokens').setLabel('Tokens (1 per line, max 20)')
          .setStyle(TextInputStyle.Paragraph).setRequired(true)
      ));
      return interaction.showModal(modal);
    }

    if (interaction.customId === 'remove_token_modal') {
      const modal = new ModalBuilder().setCustomId('removeTokenModal').setTitle('Remove Token');
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('tokenInput').setLabel('Token to Remove')
          .setStyle(TextInputStyle.Paragraph).setPlaceholder('Paste the exact token...').setRequired(true)
      ));
      return interaction.showModal(modal);
    }

  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'say_select_catcher') {
      const idx   = parseInt(interaction.values[0]);
      const modal = new ModalBuilder().setCustomId(`say_modal_${idx}`).setTitle('Send Message');
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('say_input').setLabel('Message to send')
          .setStyle(TextInputStyle.Paragraph).setRequired(true)
      ));
      return interaction.showModal(modal);
    }
  }

  if (interaction.isModalSubmit()) {

    if (interaction.customId === 'addTokenModal') {
      await interaction.deferReply({ ephemeral: true });
      const token = interaction.fields.getTextInputValue('tokenInput').trim();
      const res   = await bot.tokenService.addToken(token);
      if (res.success) {
        const startRes = await bot.autocatcherService.startCatching(res.index, 'ai');
        return interaction.editReply({ content: `✅ Added **${res.username}** (#${res.index})${startRes.success ? ' and started catching!' : ''}` });
      }
      return interaction.editReply({ content: `❌ Failed: ${res.error}` });
    }

    if (interaction.customId === 'add_bulk_modal_submit') {
      await interaction.deferReply({ ephemeral: true });
      const raw    = interaction.fields.getTextInputValue('bulk_tokens');
      const tokens = raw.split('\n').map(t => t.trim()).filter(Boolean);
      if (tokens.length > 20) return interaction.editReply({ content: '❌ Max 20 tokens per bulk add.' });

      let success = 0, failed = 0;
      for (const token of tokens) {
        const res = await bot.tokenService.addToken(token);
        if (res.success) {
          await bot.autocatcherService.startCatching(res.index, 'ai');
          success++;
        } else {
          failed++;
        }
      }
      return interaction.editReply({ content: `✅ Added: **${success}** | ❌ Failed: **${failed}**` });
    }

    if (interaction.customId === 'removeTokenModal') {
      await interaction.deferReply({ ephemeral: true });
      const tokenStr = interaction.fields.getTextInputValue('tokenInput').trim();
      const allTokens = bot.tokenService.tokens;
      const idx = allTokens.findIndex(t => t.token === tokenStr);
      if (idx === -1) return interaction.editReply({ content: '❌ Token not found.' });

      await bot.autocatcherService.stopCatching(idx).catch(() => {});
      const res = bot.tokenService.removeToken(idx);
      return res.success
        ? interaction.editReply({ content: `✅ Removed **${res.username}** successfully.` })
        : interaction.editReply({ content: `❌ Removal failed: ${res.error}` });
    }

    if (interaction.customId.startsWith('say_modal_')) {
      const idx   = parseInt(interaction.customId.split('_')[2]);
      const text  = interaction.fields.getTextInputValue('say_input');
      const token = bot.tokenService.getToken(idx);
      if (!token) return interaction.reply({ content: '❌ Invalid catcher.', ephemeral: true });

      try {
        const finalMsg = text.replace(/\b(p2|poketwo|poke2)\b/gi, `<@716390085896962058>`);
        const channel  = token.client.channels.cache.get(interaction.channelId);
        if (!channel) return interaction.reply({ content: '❌ Channel not found.', ephemeral: true });
        await channel.sendTyping();
        await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));
        await channel.send(finalMsg);
        return interaction.reply({ content: `✅ Sent via **${token.username}**`, ephemeral: true });
      } catch (err) {
        return interaction.reply({ content: `❌ Failed: ${err.message}`, ephemeral: true });
      }
    }
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || message.author.id === client.user.id) return;
  if (!bot.config.ownerIds.includes(message.author.id)) return;
  if (!message.content.startsWith(bot.config.prefix)) return;

  const args        = message.content.slice(bot.config.prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  if (commandName === 'stats') {
    const page = parseInt(args[0]) || 0;
    const { embed, totalPages, safePage } = await buildStatsEmbed(page);
    return message.channel.send({ embeds: [embed], components: buildStatButtons(safePage, totalPages, message.author.id) });
  }

  if (commandName === 'current-tokens' || commandName === 'tokens') {
    const embed      = buildTokenEmbed(0);
    const components = buildTokenPageButtons(0);
    return message.channel.send({ embeds: [embed], components });
  }

  if (commandName === 'ping') {
    const start = Date.now();
    const m     = await message.reply('Pinging...');
    return m.edit(`🏓 Pong! \`${Date.now() - start}ms\``);
  }

  if (commandName === 'captcha') {
    const id = args[0]?.toLowerCase();
    if (!id) return message.reply(`Usage: \`${bot.config.prefix}captcha <id/on/off>\``);

    if (id === 'on' || id === 'off') {
      const state = id === 'on';
      for (const catcher of bot.autocatcherService.getActiveCatchers()) {
        if (state) await bot.autocatcherService.resumeCatching(catcher.index);
        else       await bot.autocatcherService.pauseCatching(catcher.index, 'captcha-manual');
      }
      return message.reply(`Successfully toggled captcha **${state ? 'ON' : 'OFF'}** globally!`);
    }
    return message.reply('Provide `on` or `off`.');
  }

  if (commandName === 'catcher') {
    const id = args[0]?.toLowerCase();
    if (!id) return message.reply(`Usage: \`${bot.config.prefix}catcher <start/stop> [index]\``);

    if (id === 'start' || id === 'stop') {
      const allTokens = bot.tokenService.getAllTokens();
      let succeeded   = 0;
      for (let i = 0; i < allTokens.length; i++) {
        const res = id === 'start'
          ? await bot.autocatcherService.startCatching(i, 'ai')
          : await bot.autocatcherService.stopCatching(i);
        if (res.success) succeeded++;
      }
      return message.reply(`Successfully **${id === 'start' ? 'started' : 'stopped'}** ${succeeded} account(s) globally!`);
    }

    const idx = parseInt(id);
    if (isNaN(idx)) return message.reply('Provide a valid index or `start`/`stop`.');
    const action = args[1]?.toLowerCase();
    if (!action) return message.reply('Provide `start` or `stop`.');

    const res = action === 'start'
      ? await bot.autocatcherService.startCatching(idx, 'ai')
      : await bot.autocatcherService.stopCatching(idx);

    return message.reply(res.success
      ? `Successfully **${action}ed** **${res.username}**!`
      : `❌ ${res.error}`);
  }

  if (commandName === 'reload') {
    const stopped = await bot.autocatcherService.stopAll();
    await message.channel.send(`⏹️ Stopped **${stopped.length}** catcher(s). Reloading tokens...`);
    await bot.tokenService.loadTokens();
    return message.channel.send(`✅ Reloaded.`);
  }

  if (commandName === 'owner') {
    const id     = args[0];
    const action = args[1];
    if (!id || !action) return message.reply(`Usage: \`${bot.config.prefix}owner <id> <add/remove>\``);
    if (isNaN(id))      return message.reply('Provide a valid Discord ID.');

    if (action === 'add') {
      if (bot.config.ownerIds.includes(id)) return message.reply(`${id} is already an owner.`);
      bot.config.ownerIds.push(id);
      return message.reply(`✅ Added <@${id}> to owners.`);
    }
    if (action === 'remove') {
      bot.config.ownerIds = bot.config.ownerIds.filter(o => o !== id);
      return message.reply(`✅ Removed ${id} from owners.`);
    }
  }

  if (commandName === 'set-prefix') {
    const np = args[0];
    if (!np) return message.reply('Provide a new prefix.');
    bot.config.prefix = np;
    return message.reply(`✅ Prefix changed to \`${np}\``);
  }

  const command = client.commands?.get(commandName) ||
    client.commands?.find(cmd => cmd.aliases?.includes(commandName));

  if (!command) return;

  try {
    await command.execute(message, args, bot);
    logger.debug(`Command: ${commandName} by ${message.author.tag}`);
  } catch (error) {
    logger.error(`Command "${commandName}" failed:`, error);
    const embed = EmbedHandler.createErrorEmbed('Command Error', `\`${error.message}\``);
    await message.reply({ embeds: [embed] }).catch(() => {});
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!bot.config.ownerIds.includes(message.author.id)) return;
  if (!message.content.startsWith(bot.config.prefix)) return;

  const cmd = message.content.slice(bot.config.prefix.length).trim().split(/ +/)[0].toLowerCase();
  if (cmd !== 'help') return;

  const p  = bot.config.prefix;
  const ai = bot.aiService?.isAvailable()      ? '✅ ONLINE'  : '❌ OFFLINE';
  const cp = bot.captchaService?.isAvailable() ? '✅ ONLINE'  : '❌ OFFLINE';
  const ac = bot.autocatcherService?.getActiveCatchers() ?? [];
  const tk = bot.tokenService?.getAllTokens() ?? [];

  const embed = new EmbedBuilder()
    .setTitle('⚡ Arch Catcher — Command Reference')
    .setColor('#00FF7F')
    .setDescription(
      '```ini\n' +
      '[ Arch Catcher — discord.gg/zeroday ]\n\n' +
      `Prefix   :: ${p}\n` +
      `Accounts :: ${tk.length} Loaded\n` +
      `Active   :: ${ac.filter(c => !c.status?.includes('PAUSED')).length} / ${tk.length}\n` +
      '```\n' +
      '```css\n' +
      `[ Service Status ]\n` +
      `AI Service   : ${ai}\n` +
      `Xyris Solver : ${cp}\n` +
      '```'
    )
    .addFields(
      {
        name: '⚡ System',
        value:
          '```yaml\n' +
          `${p}ping             :: Latency check\n` +
          `${p}help             :: This menu\n` +
          `${p}reload           :: Restart all catchers\n` +
          `${p}set-prefix <p>   :: Change command prefix\n` +
          '```',
        inline: false,
      },
      {
        name: '👑 Administration',
        value:
          '```yaml\n' +
          `${p}add [token]      :: Add token (modal or inline)\n` +
          `${p}remove <idx|all> :: Remove token(s)\n` +
          `${p}list             :: List all tokens\n` +
          `${p}current-tokens   :: Paginated token viewer\n` +
          `${p}owner <id> add   :: Grant owner access\n` +
          `${p}owner <id> remove:: Revoke owner access\n` +
          '```',
        inline: false,
      },
      {
        name: '🎣 Catching Controls',
        value:
          '```yaml\n' +
          `${p}start [idx]         :: Start catcher in AI mode\n` +
          `${p}stop  [idx]         :: Stop catcher\n` +
          `${p}catcher start [idx] :: Fine-grained start\n` +
          `${p}catcher stop  [idx] :: Fine-grained stop\n` +
          `${p}captcha <on|off>    :: Toggle captcha globally\n` +
          `${p}auto-click [on|off] :: Auto-click confirmations\n` +
          '```',
        inline: false,
      },
      {
        name: '📊 Data & Analytics',
        value:
          '```yaml\n' +
          `${p}stats [idx]      :: Global or per-account stats\n` +
          `${p}s                :: More verbose global stats\n` +
          `${p}catching         :: Live view of active catchers\n` +
          `${p}api              :: Check AI prediction quota\n` +
          `${p}say <msg>        :: Send message via catcher account\n` +
          '```',
        inline: false,
      },
      {
        name: '🔧 Utilities & Tips',
        value:
          '```yaml\n' +
          `${p}testhook         :: Test webhook delivery\n` +
          `${p}ping             :: Check bot latency\n` +
          '```\n' +
          `> 💡 **Tip:** Join discord.gg/zeroday for updates\n` +
          `> 💡 **Tip:** Run \`${p}stats\` for live session stats`,
        inline: false,
      }
    )
    .setFooter({ text: `Arch Catcher • ${tk.length} Account${tk.length !== 1 ? 's' : ''} Linked`, iconURL: client.user.displayAvatarURL() })
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });
});

client.on('error', (error) => logger.error('❌ Discord Client error:', error));

client.login(process.env.DISCORD_TOKEN)
  .then(() => logger.success('🔑 Bot authenticated'))
  .catch(err => {
    logger.error('💥 LOGIN FAILED:', err.message);
    logger.error('❌ Verify DISCORD_TOKEN in .env');
    process.exit(1);
  });
