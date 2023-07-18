import { SlashCommandBuilder } from '@discordjs/builders';

export default {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask Dify a question.')
    // .addStringOption(option =>
    //   option.setName('edition')
    //     .setDescription('What edition of Dify are you using?')
    //     .setRequired(true)
    //     .addChoice('Cloud version', 'Cloud version')
    //     .addChoice('Self-hosted', 'Self-hosted')),
}