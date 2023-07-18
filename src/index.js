import dotenv from 'dotenv';
import { Client, Events, GatewayIntentBits, Routes } from 'discord.js';
import { REST } from '@discordjs/rest';
import PingCmd from './commands/ping.js';
import AskCmd from './commands/ask.js';
import { ChatClient } from 'dify-client';
import { conn, User, Conversation, ChatMessage } from './db.js';

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
discord.login(process.env.DISCORD_TOKEN);

// When the client is ready, run this code (only once)
discord.once(Events.ClientReady, async (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);

  try {
    console.log('Started getting application parameters.');
    const app = await chatClient.getApplicationParameters();
    console.log(app.data.user_input_form);

    console.log('Started refreshing database.');
    await conn.sync({ force: true });

    console.log('Started refreshing application (/) commands.');
    const commands = [PingCmd.data.toJSON(), AskCmd.data.toJSON()];
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_ID, null),
      {
        body: commands,
      }
    );
  } catch (err) {
    console.error(err);
  }
});

// Interaction message dispatcher
const interactionMessageDispatcher = (message) => {
  if (!message.isCommand()) return;

  if (message.commandName === 'ping') {
    message.reply('Pong!');
  } else if (message.commandName === 'ask') {
    handleMessageCreate(message);
  } else {
    message.reply('Unknown command!');
  }
};

const handleMessageCreate = async (message) => {
  await message.deferReply({ ephemeral: true });
  await message.followUp({ content: '...' });
  const inputs = {
    name: 'discord bot',
    Edition: message.options.getString('edition'),
  };
  const query = message.options.getString('query');
  console.log('INFO - Query:', query, 'Inputs:', inputs);

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
  let parsed; // Declare the parsed variable here

  stream.on('data', (chunk) => {
    try {
      const completeString = chunk.toString();
      parsed = JSON.parse(completeString.slice(completeString.indexOf('{')));
      msg += parsed.answer;
    } catch (error) {
      msg += ' ';
    }

    if (msg.length === 0) {
      conversation.conversation_id = parsed.conversation_id;
      conversation.save();
      messageRef = message.editReply({ content: msg || '😄' });
    }

    if (messageRef !== null && msg.length % 4 === 0) {
      message.editReply({ content: msg || '😄' }).catch((error) => {
        console.error('ERROR - Unable to edit message:', error);
      });
    }
  });

  stream.on('end', async () => {
    console.log('INFO - Stream ended.', msg);
    if (messageRef !== null) {
      try {
        await ChatMessage.create({
          message: message.content,
          answer: msg,
          conversation_id: conversation.conversation_id,
          userId: user.id,
        });
        if (msg.trim().length > 0) {
          await message.editReply({ content: msg || '😄' });
        }
      } catch (error) {
        console.error('ERROR - Unable to edit message:', error);
        conn.close();
      }
    }
  });
};


// Handle interaction creation
discord.on(Events.InteractionCreate, interactionMessageDispatcher);
