const DatabaseService = require('../services/databaseService');
const { Markup } = require('telegraf');

class UserController {
  constructor(bot) {
    this.bot = bot;
    this.setupUserCommands();
  }

  setupUserCommands() {
    // View Groups Command
    this.bot.action('view_groups', async (ctx) => {
      try {
        const groups = await DatabaseService.getAllGroupLinks();
        
        if (groups.length === 0) {
          return ctx.reply('ℹ️ No groups available yet. Please check back later.');
        }

        let message = '📋 <b>Available Groups:</b>\n\n';
        groups.forEach((group, index) => {
          message += `🔹 <b>${group.name}</b>\n`;
          message += `🔗 ${group.link}\n`;
          if (group.description) message += `📝 ${group.description}\n`;
          if (index < groups.length - 1) message += '\n';
        });

        ctx.reply(message, { 
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          ...Markup.inlineKeyboard([
            Markup.button.callback('🔄 Refresh', 'view_groups')
          ])
        });
      } catch (err) {
        console.error('Error fetching groups:', err);
        ctx.reply('❌ Error fetching groups. Please try again later.');
      }
    });

    // Handle /groups command
    this.bot.command('groups', async (ctx) => {
      try {
        const groups = await DatabaseService.getAllGroupLinks();
        
        if (groups.length === 0) {
          return ctx.reply('ℹ️ No groups available yet. Please check back later.');
        }

        const buttons = groups.map(group => [
          Markup.button.url(
            group.name,
            group.link.startsWith('@') 
              ? `https://t.me/${group.link.substring(1)}` 
              : group.link
          )
        ]);

        ctx.reply(
          '👥 Available Groups:',
          Markup.inlineKeyboard(buttons).resize()
        );
      } catch (err) {
        console.error('Error fetching groups:', err);
        ctx.reply('❌ Error fetching groups. Please try again later.');
      }
    });
  }
}

module.exports = UserController;