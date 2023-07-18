import { SlashCommandBuilder } from '@discordjs/builders';

export default {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask Dify a question.')
    .addStringOption((option) =>
      option
        .setName('edition')
        .setDescription('The gif category')
        .setRequired(true)
        .addChoices(
          { name: 'Cloud version', value: 'Cloud version' },
          { name: 'Self-hosted', value: 'Self-hosted' },
        )
    )
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('The query to send to Dify')
        .setRequired(true)
    )
};
