import dotenv from "dotenv";
import { Client, Events, GatewayIntentBits } from "discord.js";

dotenv.config();
import { ChatClient } from "dify-client";

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  // console.log(message.channel)
  if (message.author.bot) return;
  const inputs = {};
  const user = `${message.author.username}-${message.author.id}`;
  const query = message.content;

  console.log(`user: ${user} content: ${query}`);

  const chatClient = new ChatClient(process.env.DIFY_API_KEY);

  const response = await chatClient.createChatMessage(
    inputs,
    query,
    user,
    true,
    null
  );
  const stream = response.data;
  const msgRef = await message.channel.send("Hello");
  stream.on("data", (data) => {
    console.log(data);
  });

  stream.on("end", () => {
    console.log("stream done");
    msgRef.edit("Bye");
  });
  
  return;
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
