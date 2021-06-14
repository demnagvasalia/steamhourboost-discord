const env = require('./helpers/load-env');

const Discord = require('discord.js');
const fs = require('fs');

const log = require('./helpers/logger');
const { knex, db } = require('./helpers/database');

const client = new Discord.Client();
client.commands = new Discord.Collection();

const discordBot = {};
const token = env.DISCORD_BOT_TOKEN();
const prefix = env.DISCORD_BOT_PREFIX();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  // set a new item in the Collection
  // with the key as the command name and the value as the exported module
  client.commands.set(command.name, command);
}

const commands = {
  ping: 'ping',
  help: 'help',
  list: 'list',
  license: 'license',
  account: 'account',
  manage: 'manage',
  start: 'start',
  stop: 'stop',
  restart_boost: 'restart-boost',
};

discordBot.start = () => {
  client.on('ready', () => {
    client.user.setActivity(`${prefix}help`, {
      type: 'PLAYING'
    });

    console.log(`Logged in as ${client.user.tag}!`);
    console.log(`Ready to go!`);
    console.log(`Prefix : ${prefix}`);
    console.log(`------------------------------------------------`);
  });

  client.on('message', async (message) => {
    // return if message doesn't start with prefix || author is a bot account || author is the bot itself
    if (!message.content.startsWith(prefix) || message.author.bot || message.author.equals(client.user)) return;

    console.log(`${log('discord')} LOG | ${message.author.tag} send ${message.content} (#${message.channel.name})`);

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (!client.commands.has(command)) return;

    try {
      const user = await knex(db.table.discord).where({ discord_id: message.author.id });
      client.commands.get(command).execute(prefix, commands, message, args, user);
    } catch (err) {
      console.log(`${log('discord')} ERROR | ${err}`);
      message.reply("Oops! Something went wrong.");
    }
  });

  client.on('error', (err) => {
    console.log(`${log('discord')} ERROR: ${err.message}`);
  });

  client.login(token);
};

module.exports = discordBot;