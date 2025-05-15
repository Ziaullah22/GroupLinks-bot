const DatabaseService = require('../services/databaseService');
const helpers = require('../utils/helpers');
const { Markup } = require('telegraf');

class AdminController {
  constructor(bot, adminId) {
    console.log('[AdminController] Initializing with adminId:', adminId);
    this.bot = bot;
    this.adminId = adminId;
    this.setupMiddlewares();
    this.setupAdminCommands();
  }

  setupMiddlewares() {
    this.bot.use(async (ctx, next) => {
      // ✅ Ensure session is always initialized
      if (!ctx.session) ctx.session = {};
      console.log('[Session Middleware] Current session:', ctx.session);
      await next();
    });
  }

  setupAdminCommands() {
    // Add Group Command
    this.bot.action('add_group', async (ctx) => {
      console.log('[Action] add_group triggered by user:', ctx.from.id);
      if (!this.isAuthorized(ctx)) return;

      ctx.session.awaitingGroupInput = true;
      ctx.session.currentAction = 'add_group';

      ctx.reply(
        '📝 Please send the group details in the following format:\n\n' +
        '<b>Group Name</b>\n' +
        '<b>Group Link</b> (start with https://t.me/ or @)\n' +
        '<i>Description</i> (optional)\n\n' +
        'Example:\n' +
        'My Awesome Group\n' +
        'https://t.me/joinchat/ABC123\n' +
        'The best group for discussions',
        { parse_mode: 'HTML' }
      );
    });

    // Admin Menu
    this.bot.action('admin_menu', (ctx) => {
      if (!this.isAuthorized(ctx)) return;
      ctx.reply('👨‍💻 Admin Menu:', this.getAdminMenu());
    });

    // Delete, Update, View, Text Handlers
    this.setupGroupManagement();
  }

  setupGroupManagement() {
    // View Groups
    this.bot.action('admin_view_groups', async (ctx) => {
      if (!this.isAuthorized(ctx)) return;

      try {
        const groups = await DatabaseService.getAllGroupLinks();
        if (groups.length === 0) return ctx.reply('ℹ️ No groups available yet.');

        let message = '📋 <b>Available Groups:</b>\n\n';
        groups.forEach(group => {
          message += `🔹 <b>${group.name}</b>\n`;
          message += `🔗 ${group.link}\n`;
          if (group.description) message += `📝 ${group.description}\n`;
          message += '\n';
        });

        ctx.reply(message, {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            Markup.button.callback('◀️ Back', 'admin_menu')
          ])
        });
      } catch (err) {
        this.handleError(ctx, err, 'fetching groups');
      }
    });

    // Delete Group
    this.bot.action('delete_group', async (ctx) => {
      if (!this.isAuthorized(ctx)) return;

      try {
        const groups = await DatabaseService.getAllGroupLinks();
        if (groups.length === 0) return ctx.reply('ℹ️ No groups available to delete.');

        const buttons = groups.map(group => [
          Markup.button.callback(
            `${group.name} (${group.link})`,
            `delete_${encodeURIComponent(group.link)}`
          )
        ]);

        ctx.reply('🗑 Select a group to delete:', Markup.inlineKeyboard(buttons).resize());
      } catch (err) {
        this.handleError(ctx, err, 'loading groups to delete');
      }
    });

    this.bot.action(/^delete_(.+)/, async (ctx) => {
      if (!this.isAuthorized(ctx)) return;

      try {
        const link = decodeURIComponent(ctx.match[1]);
        const result = await DatabaseService.deleteGroupLink(link);

        if (!result) return ctx.reply('❌ Group not found or already deleted.');
        ctx.reply('✅ Group deleted successfully!');
      } catch (err) {
        this.handleError(ctx, err, 'deleting group');
      }
    });

    // Update Group
    this.bot.action('update_group', async (ctx) => {
      if (!this.isAuthorized(ctx)) return;

      try {
        const groups = await DatabaseService.getAllGroupLinks();
        if (groups.length === 0) return ctx.reply('ℹ️ No groups to update.');

        const buttons = groups.map(group => [
          Markup.button.callback(
            `${group.name} (${group.link})`,
            `update_${encodeURIComponent(group.link)}`
          )
        ]);

        ctx.reply('✏️ Select a group to update:', Markup.inlineKeyboard(buttons).resize());
      } catch (err) {
        this.handleError(ctx, err, 'loading groups to update');
      }
    });

    this.bot.action(/^update_(.+)/, async (ctx) => {
      if (!this.isAuthorized(ctx)) return;

      const oldLink = decodeURIComponent(ctx.match[1]);
      ctx.session.groupToUpdate = oldLink;
      ctx.session.currentAction = 'update_group';
      ctx.session.awaitingGroupInput = true;

      ctx.reply(
        '✏️ Send the updated details:\n\n' +
        '<b>New Name</b>\n' +
        '<b>New Link</b>\n' +
        '<i>New Description</i> (optional)',
        { parse_mode: 'HTML' }
      );
    });

    // Text handler for Add or Update
    this.bot.on('text', async (ctx) => {
      if (!this.isAuthorized(ctx)) return;
      if (!ctx.session.awaitingGroupInput || !ctx.session.currentAction) return;

      if (ctx.session.currentAction === 'add_group') {
        await this.handleAddGroup(ctx);
      } else if (ctx.session.currentAction === 'update_group') {
        await this.handleUpdateGroup(ctx);
      }
    });
  }

  async handleAddGroup(ctx) {
    try {
      const [name, link, ...desc] = ctx.message.text.split('\n');
      const description = desc.join('\n').trim();

      if (!this.validateLink(link)) throw new Error('Invalid link format');

      const result = await DatabaseService.addGroupLink(name.trim(), link.trim(), description);
      if (!result) throw new Error('Database insert failed');

      ctx.reply(
        `✅ Group added:\n<b>${name}</b>\n${link}\n${description}`,
        { parse_mode: 'HTML' }
      );
      this.clearSession(ctx);
    } catch (err) {
      this.handleError(ctx, err, 'adding group');
    }
  }

  async handleUpdateGroup(ctx) {
    try {
      const [name, link, ...desc] = ctx.message.text.split('\n');
      const description = desc.join('\n').trim();

      if (!this.validateLink(link)) throw new Error('Invalid link format');

      const result = await DatabaseService.updateGroupLink(ctx.session.groupToUpdate, {
        name: name.trim(),
        link: link.trim(),
        description
      });

      if (!result) throw new Error('Database update failed');

      ctx.reply(
        `✅ Group updated:\n<b>${name}</b>\n${link}\n${description}`,
        { parse_mode: 'HTML' }
      );
      this.clearSession(ctx);
    } catch (err) {
      this.handleError(ctx, err, 'updating group');
    }
  }

  validateLink(link) {
    return link && (link.startsWith('https://t.me/') || link.startsWith('@'));
  }

  clearSession(ctx) {
    ctx.session.awaitingGroupInput = false;
    ctx.session.currentAction = null;
    ctx.session.groupToUpdate = null;
  }

  handleError(ctx, err, action) {
    console.error(`[Error] during ${action}:`, err);
    ctx.reply(`❌ Error during ${action}: ${err.message}`);
    this.clearSession(ctx);
  }

  isAuthorized(ctx) {
    if (!helpers.isAdmin(ctx.from.id, this.adminId)) {
      ctx.reply('❌ You are not authorized to perform this action.');
      return false;
    }
    return true;
  }

  getAdminMenu() {
    return Markup.inlineKeyboard([
      [Markup.button.callback('➕ Add Group', 'add_group')],
      [Markup.button.callback('🗑 Delete Group', 'delete_group')],
      [Markup.button.callback('✏️ Update Group', 'update_group')],
      [Markup.button.callback('👀 View Groups', 'admin_view_groups')]
    ]).resize();
  }
}

module.exports = AdminController;
