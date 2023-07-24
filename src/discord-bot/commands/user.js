const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const DiscordAccount = require('../../services/discord-account.service');
const LicenseCode = require('../../services/license-code.service');
const switchFn = require('../../utils/switch-function.util');
const { logger } = require('../../helpers/logger.helper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('user')
    .setDescription('User management')
    .addSubcommand((subcommand) =>
      subcommand.setName('info')
        .setDescription('View user info'))
    .addSubcommand((subcommand) =>
      subcommand.setName('register')
        .setDescription('Register your Discord account using license key')
        .addStringOption((option) => option.setName('key').setDescription('License key to register').setRequired(true)))
    .addSubcommand((subcommand) =>
      subcommand.setName('change-license')
        .setDescription('Change existing license key')
        .addStringOption((option) => option.setName('key').setDescription('Your new license key').setRequired(true))),
  async execute(interaction) {
    try {
      const discordId = interaction.user.id;
      const subcommand = interaction.options.getSubcommand();

      await interaction.deferReply();

      const commands = {
        'info': async () => {
          try {
            const user = await DiscordAccount.getAccount(discordId);

            if (!user) {
              await interaction.editReply('You are not registered yet. Use `/user register` to register your account.');
              return;
            }

            const license = await LicenseCode.getCodeById(user.licenseCodeId);

            const userInfoEmbed = new EmbedBuilder()
              .setColor(0x0099FF)
              .setTitle('User Info')
              .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
              .setDescription('Your account info')
              .addFields(
                { name: 'Discord ID', value: discordId, inline: true },
                { name: 'License key', value: license.code, inline: true },
                { name: 'License type', value: license.licenseType.name, inline: true },
                { name: 'Limit (Steam Accounts/Steam Games)', value: `(${license.licenseType.maxSteamAccounts}/${license.licenseType.maxSteamGames})`, inline: true },
              )
              .setTimestamp();

            await interaction.client.functions.sendDM(discordId, { embeds: [userInfoEmbed] });
            await interaction.editReply('User info sent!');
          } catch (error) {
            logger.error(error?.message ?? error);
            await interaction.editReply('Failed to get user info.');
          }
        },
        'register': async () => {
          try {
            const key = interaction.options.getString('key');
            const user = await DiscordAccount.getAccount(discordId);

            if (user) {
              await interaction.editReply('Your Discord account is already registered.');
              return;
            }

            const licenseKey = await LicenseCode.getCode(key);

            if (!licenseKey || licenseKey?.isUsed) {
              await interaction.editReply({ content: `License key \`${key}\` is invalid.`, ephemeral: true });
              return;
            }

            await DiscordAccount.insert(discordId, key);
            await LicenseCode.updateCodeStatus(key, true);

            await interaction.editReply('Successfully registered your Discord account!');
          } catch (error) {
            logger.error(error?.message ?? error);
            await interaction.editReply('Failed to register your Discord account.');
          }
        },
        'change-license': async () => {
          try {
            const key = interaction.options.getString('key');
            const user = await DiscordAccount.getAccount(discordId);

            if (!user) {
              await interaction.editReply('You are not registered yet. Use `/user register` to register your account.');
              return;
            }

            const licenseKey = await LicenseCode.getCode(key);

            if (!licenseKey || licenseKey?.isUsed) {
              await interaction.editReply({ content: `License key \`${key}\` is invalid.`, ephemeral: true });
              return;
            }

            await DiscordAccount.updateLicenseCode(discordId, key);
            await LicenseCode.updateCodeStatus(key, true);

            await interaction.editReply('Successfully changed your license key!');
          } catch (error) {
            logger.error(error?.message ?? error);
            await interaction.editReply('Failed while changing your license key.');
          }
        },
      };

      switchFn(commands, 'default')(subcommand);
    } catch (error) {
      logger.error(error);
    }
  },
};
