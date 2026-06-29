require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Add a Minecraft username to the server whitelist')
    .addStringOption((opt) =>
      opt
        .setName('username')
        .setDescription('Your exact Minecraft username')
        .setRequired(true)
    )
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );
    console.log('Slash command registered.');
  } catch (err) {
    console.error(err);
  }
})();
