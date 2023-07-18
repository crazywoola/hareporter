import dotenv from 'dotenv';
import { Sequelize, DataTypes } from "sequelize"

dotenv.config();

export const conn = new Sequelize(
  process.env.POSTGRES_DB,
  process.env.POSTGRES_USER,
  process.env.POSTGRES_PASSWORD, {
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  dialect: 'postgres',
  logging: false
});

conn.authenticate()
  .then(() => {
    console.info("INFO - Database connected.")
  })
  .catch((err) => {
    console.error("ERROR - Unable to connect to the database:", err)
  })

export const User = conn.define('users', {
  // Model attributes are defined here
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING
  },
  external_id: {
    type: DataTypes.VIRTUAL,
    get() {
      return `${this.username}-${this.id}`;
    },
  }
}, {
  freezeTableName: true,
});

export const Conversation = conn.define('conversations', {
  conversation_id: {
    type: DataTypes.STRING,
  },
},{
  freezeTableName: true,
});

export const ChatMessage = conn.define('chat_messages', {
  // Model attributes are defined here
  message: {
    type: DataTypes.TEXT
  },
  answer: {
    type: DataTypes.TEXT
  },
  convsation_id: {
    type: DataTypes.STRING
  },
}, {
  freezeTableName: true,
});

User.hasMany(ChatMessage);
ChatMessage.belongsTo(User);

User.hasOne(Conversation);
Conversation.belongsTo(User);