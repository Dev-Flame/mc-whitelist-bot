require('dotenv').config();
const { Client, GatewayIntentBits, Events, MessageFlags } = require('discord.js');
const { Rcon } = require('rcon-client');
const { load, save } = require('./store');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// If set in .env, the command only works in this one channel
const ALLOWED_CHANNEL = process.env.ALLOWED_CHANNEL_ID || null;

// How many usernames each person is allowed to add
const MAX_PER_USER = Number(process.env.MAX_WHITELIST_PER_USER || 2);

// How long the confirmation stays before it deletes itself (ms)
const DELETE_AFTER_MS = Number(process.env.DELETE_AFTER_MS || 8000);

// Minecraft usernames: 3-16 chars, letters/numbers/underscore
const USERNAME_RE = /^[a-zA-Z0-9_]{3,16}$/;

// Ask Mojang if this username is a real account.
// Returns the correctly-spelled name, or null if it doesn't exist.
async function getRealMcName(username) {
  try {
    const res = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${username}`
    );
    if (res.status !== 200) return null;
    const data = await res.json();
    return data?.name || null;
  } catch {
    return null;
  }
}

// Open a fresh RCON connection, run one command, then close it.
async function rconCommand(cmd) {
  const rcon = await Rcon.connect({
    host: process.env.RCON_HOST,
    port: Number(process.env.RCON_PORT),
    password: process.env.RCON_PASSWORD,
  });
  try {
    return await rcon.send(cmd);
  } finally {
    await rcon.end();
  }
}

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'whitelist') return;

  // Everything is "ephemeral" = only the person who ran it can see it.
  // Other members never see the command or the reply, so the channel stays clean.
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Shows the message, then deletes it after a few seconds.
  const finish = async (content) => {
    await interaction.editReply(content);
    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, DELETE_AFTER_MS);
  };

  // Optional: lock the command to one channel
  if (ALLOWED_CHANNEL && interaction.channelId !== ALLOWED_CHANNEL) {
    return finish("You can't use this command in this channel.");
  }

  const username = interaction.options.getString('username', true).trim();

  // Quick format check before bugging Mojang
  if (!USERNAME_RE.test(username)) {
    return finish(`"${username}" is not a valid Minecraft username.`);
  }

  const realName = await getRealMcName(username);
  if (!realName) {
    return finish(
      `Couldn't find a Minecraft account named **${username}**. Check the spelling.`
    );
  }

  const userId = interaction.user.id;
  const data = load();
  const myList = data[userId] || [];

  // Already added by this same person?
  if (myList.some((n) => n.toLowerCase() === realName.toLowerCase())) {
    return finish(`**${realName}** is already on your whitelist.`);
  }

  // Hit their personal cap?
  if (myList.length >= MAX_PER_USER) {
    return finish(
      `You've already used your ${MAX_PER_USER} whitelist slots, so you can't add **${realName}**.`
    );
  }

  // Add to the server first; only count it if that works
  try {
    await rconCommand(`whitelist add ${realName}`);
  } catch (err) {
    console.error(err);
    return finish('Something went wrong talking to the server. Tell an admin.');
  }

  myList.push(realName);
  data[userId] = myList;
  save(data);

  const left = MAX_PER_USER - myList.length;
  return finish(
    `✅ **${realName}** was added to the whitelist! You have ${left} slot${
      left === 1 ? '' : 's'
    } left.`
  );
});

client.login(process.env.DISCORD_TOKEN);
