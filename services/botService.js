const { Telegraf, session, Markup } = require('telegraf');
const config = require('config');
const DatabaseService = require('./databaseService');
const helpers = require('../utils/helpers');
const AdminController = require('../controllers/adminController');
const UserController = require('../controllers/userController');

class BotService {
  constructor() {
    // Initialize bot with token
    this.bot = new Telegraf(process.env.BOT_TOKEN || config.get('botToken'));
    this.adminId = process.env.ADMIN_ID || config.get('adminId');

    this.setupMiddlewares();
    this.setupCommands();
    this.setupControllers();
  }

  setupMiddlewares() {
    // ✅ Enable session middleware
    this.bot.use(session());

    // Optional: Debug session state
    this.bot.use((ctx, next) => {
      console.log('[Session Middleware] Current session:', ctx.session);
      return next();
    });
  }

  setupCommands() {
    // /start command
    this.bot.command('start', (ctx) => {
      const isAdmin = helpers.isAdmin(ctx.from.id, this.adminId);
      const message = isAdmin
        ? '👋 Welcome, Admin! You can manage group links.'
        : '👋 Welcome! Use /groups to see available groups.';
      
      ctx.reply(message, this.getMainMenu(isAdmin));
    });

    // /help command
    this.bot.command('help', (ctx) => {
      const isAdmin = helpers.isAdmin(ctx.from.id, this.adminId);

      let helpText = '🤖 *Group Link Bot Help*\n\n';
      helpText += 'For all users:\n';
      helpText += '/start - Start the bot\n';
      helpText += '/groups - View all available groups\n';
      helpText += '/help - Show this help message\n';

      if (isAdmin) {
        helpText += '\nAdmin commands:\n';
        helpText += '• Use the buttons below to add/delete/update groups\n';
        helpText += '• To update a group, select it from the list\n';
        helpText += '• Then send new details in format:\n';
        helpText += 'Name\nLink\nDescription (optional)';
      }

      ctx.replyWithMarkdown(helpText, this.getMainMenu(isAdmin));
    });
  }

  setupControllers() {
    new AdminController(this.bot, this.adminId);
    new UserController(this.bot);
  }

  getMainMenu(isAdmin) {
    const buttons = [
      [Markup.button.callback('👀 View Groups', 'view_groups')]
    ];

    if (isAdmin) {
      buttons.push(
        [Markup.button.callback('➕ Add Group', 'add_group')],
        [Markup.button.callback('🗑 Delete Group', 'delete_group')],
        [Markup.button.callback('✏️ Update Group', 'update_group')]
      );
    }

    return Markup.inlineKeyboard(buttons);
  }

  start() {
    this.bot.launch()
      .then(() => console.log('Bot started successfully'))
      .catch(err => console.error('Bot failed to start:', err));

    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }
}

module.exports = new BotService();
