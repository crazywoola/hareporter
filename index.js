import dotenv from 'dotenv';
import { Client, Events, GatewayIntentBits } from 'discord.js';

dotenv.config();
import { ChatClient } from 'dify-client';
import { Sequelize } from "sequelize"
// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});
const chatClient = new ChatClient(process.env.DIFY_API_KEY);

const sequelize = new Sequelize(
  process.env.POSTGRES_DB,
  process.env.POSTGRES_USER,
  process.env.POSTGRES_PASSWORD, {
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  dialect: 'postgres'
});

sequelize.authenticate()
  .then(() => {
    console.info("INFO - Database connected.")
  })
  .catch((err) => {
    console.error("ERROR - Unable to connect to the database:", err)
  })

const messageDispatcher = (message) => {
  if (message.author.bot) return;
  if (message.mentions.has(client.user)) {
    message.reply('Hello!');
    // handleMessageCreate(message);
  } else {
    return;
  }
};

const handleMessageCreate = async (message) => {
  // Basic query to send to Dify
  const inputs = {};
  const user = `${message.author.username}-${message.author.id}`;
  const query = message.content;
  console.log(`user: ${user} content: ${query}`);

  const response = await chatClient.createChatMessage(
    inputs,
    query,
    user,
    true,
    null
  );
  const stream = response.data;

  let msg = '';
  let messageRef = null;

  stream.on('data', async (chunk) => {
    const completeString = chunk.toString();
    const parsed = JSON.parse(
      completeString.slice(completeString.indexOf('{'))
    );
    const result = parsed;

    msg += result.answer;

    if (msg.length === 0) {
      messageRef = messageRef || (await message.reply('...'));
    }

    if (messageRef !== null && msg.length % 4 === 0) {
      try {
        await messageRef.edit(msg);
      } catch (error) {
        
      }
    }
  });

  stream.on('end', () => {
    console.log('INFO - Stream ended.', msg);
    if (messageRef !== null) {
      try {
        messageRef.edit(msg);
      } catch (error) {
        console.error("ERROR - Unable to edit message:", error)
      }
    }
  });
};

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.MessageCreate, messageDispatcher);
// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
