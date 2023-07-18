import dotenv from 'dotenv';
import { Client, Events, GatewayIntentBits, Routes } from 'discord.js';
import { REST } from '@discordjs/rest';
import PingCmd from './commands/ping.js';
import { ChatClient } from 'dify-client';
// import { conn, User, Conversation, ChatMessage } from './db.js';
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

const devMessageDispatcher = (message) => {
  console.log(message);
  if (message.author.bot) return;
  if (message.mentions.has(discord.user)) {
  } else {
    return;
  }
};

const messageDispatcher = (message) => {
  if (message.author.bot) return;
  if (message.mentions.has(discord.user)) {
    handleMessageCreate(message);
  } else {
    return;
  }
};

const handleMessageCreate = async (message) => {
  // Basic query to send to Dify
  const inputs = {
    name: 'discord bot',
    Edition: 'Cloud version',
  };
  const query = message.content;
  const [user] = await User.findOrCreate({
    where: {
      id: message.author.id,
      username: message.author.username,
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
  const app = await chatClient.getApplicationParameters();
  console.log(app.data.user_input_form);
  // await conn.sync({ force: true });
  // Code here
  const commands = [PingCmd.data.toJSON()];

  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.DISCORD_ID,
        '1112206992900096022'
      ),
      {
        body: commands,
      }
    );
    discord.login(process.env.DISCORD_TOKEN);

    // When the client is ready, run this code (only once)
    discord.once(Events.ClientReady, (c) => {
      console.log(`Ready! Logged in as ${c.user.tag}`);
    });

    // discord.on(Events.MessageCreate, messageDispatcher);
    discord.on(Events.MessageCreate, devMessageDispatcher);
  } catch (err) {
    console.log(err);
  }
})();
