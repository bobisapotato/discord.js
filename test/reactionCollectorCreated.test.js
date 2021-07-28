'use strict';

const { token, guildId, channelId, messageId } = require('./auth.js');
const { Client, Intents, ReactionCollector } = require('../src');

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});

client.on('ready', async () => {
  const guild = client.guilds.cache.get(guildId);

  const channel = guild.channels.cache.get(channelId);

  const message = await channel.messages.fetch(messageId);

  await message.react('🔔');
  // Await message.reactions.removeAll();

  const collector = new ReactionCollector(message, () => true, { dispose: true });

  collector.on('collect', () => {
    console.log('collected');
  });

  collector.on('create', () => {
    console.log('created');
  });

  collector.on('remove', () => {
    console.log('removed');
  });

  collector.on('dispose', () => {
    console.log('disposed');
  });
});

client.login(token);
