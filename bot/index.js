import { Telegraf, session } from "telegraf";

const bot = new Telegraf(process.env.BOT_API_KEY);

bot.use(session());

export default bot;
