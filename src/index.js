import dotenv from 'dotenv';

import { ChatClient } from 'dify-client';

dotenv.config();
const chatClient = new ChatClient(process.env.DIFY_API_KEY);