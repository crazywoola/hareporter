import { SlashCommandBuilder } from '@discordjs/builders';

export default {
  // command: 'ping', access: 'edition', description: 'Replies with Pong!', options: [
  //   {
  //     name: 'edition',
  //     description: 'What edition of Dify are you using?',
  //     type: 'STRING',
  //     required: true,
  //     choices: [
  //       {
  //         name: 'Cloud version',
  //         value: 'Cloud version',
  //       },
  //       {
  //         name: 'Self-hosted',
  //         value: 'Self-hosted',
  //       },
  //     ],
  //   },
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!')
}