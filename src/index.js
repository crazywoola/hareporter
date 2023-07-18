import dotenv from 'dotenv';
import { Client, Events, GatewayIntentBits, Routes } from 'discord.js';
import { REST } from '@discordjs/rest';
import PingCmd from './commands/ping.js';
import AskCmd from './commands/ask.js';
import { ChatClient } from 'dify-client';
import { conn, User, Conversation, ChatMessage } from './db.js';
// Load environment variables from .env file
dotenv.config();

// Create a new client instance
const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});
const chatClient = new ChatClient(process.env.DIFY_API_KEY);

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
// Log in to Discord with your client's token

const interactionMessageDispatcher = (message) => {
  if (!message.isCommand()) return;

  if (message.commandName === 'ping') {
    interamessagection.reply({
      content: 'Pong!',
    });
  } else if (message.commandName === 'ask') {
    handleMessageCreate(message);
  }
};

const devInteractionMessageDispatcher = (message) => {
  if (!message.isCommand()) return;

  interamessagection.reply({
    content: 'Pong!',
  });
};

const handleMessageCreate = async (message) => {
  // Basic query to send to Dify
  const inputs = {
    name: message.options.getString('edition'),
    Edition: 'Cloud version',
  };
  const query = message.options.getString('query');
  const [user] = await User.findOrCreate({
    where: {
      id: message.user.id,
      username: message.user.username,
    },
  });
  const [conversation] = await Conversation.findOrCreate({
    where: {
      userId: user.id,
    },
  });
  const response = await chatClient.createChatMessage(
    inputs,
    query,
    user.external_id,
    true,
    conversation.conversation_id
  );
  const stream = response.data;

  let msg = '';
  let messageRef = null;

  stream.on('data', async (chunk) => {
    const completeString = chunk.toString();
    const parsed = JSON.parse(
      completeString.slice(completeString.indexOf('{'))
    );

    msg += parsed.answer;

    if (msg.length === 0) {
      conversation.conversation_id = parsed.conversation_id;
      await conversation.save();
      messageRef = messageRef || (await message.reply('...'));
    }

    if (messageRef !== null && msg.length % 4 === 0) {
      try {
        await messageRef.edit(msg);
      } catch (error) {
        console.error('ERROR - Unable to edit message:', error);
        conn.close();
      }
    }
  });

  stream.on('end', () => {
    console.log('INFO - Stream ended.', msg);
    if (messageRef !== null) {
      try {
        ChatMessage.create({
          message: message.content,
          answer: msg,
          conversation_id: conversation.conversation_id,
          userId: user.id,
        });
        messageRef.edit(msg);
      } catch (error) {
        console.error('ERROR - Unable to edit message:', error);
        conn.close();
      }
    }
  });
};

// main function
(async () => {
  try {
    console.log('Started get application parameters.');
    const app = await chatClient.getApplicationParameters();
    console.log(app.data.user_input_form);
    console.log('Started refreshing database.');
    await conn.sync({ force: true });
    console.log('Started refreshing application (/) commands.');
    const commands = [PingCmd.data.toJSON(), AskCmd.data.toJSON()];
    await rest.put(
      Routes.applicationCommands(
        process.env.DISCORD_ID,
        null, // guild id (null for global commands)
      ),
      {
        body: commands,
      }
    );
  } catch (err) {
    console.log(err);
  }
})();

discord.login(process.env.DISCORD_TOKEN);

// When the client is ready, run this code (only once)
discord.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

discord.on(Events.InteractionCreate, interactionMessageDispatcher);
