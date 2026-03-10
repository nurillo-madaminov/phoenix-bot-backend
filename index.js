import "dotenv/config";
import bot from "./bot/index.js";

import startHandler from "./handlers/start.js";
import registerHandler from "./handlers/register.js";
import servicesHandler from "./handlers/services.js";
import messagesHandler from "./handlers/messages.js";

import { servicesMap } from "./utils/index.js";

// commands // Problem with CTX
bot.start(startHandler);

// text messages (registration flow)
bot.on("text", (ctx) => registerHandler(ctx));

// other message handlers
messagesHandler(bot);

// services buttons
const services = Object.keys(servicesMap);
const serviceRegex = new RegExp(`^(${services.join("|")})$`);
bot.action(serviceRegex, (ctx) => servicesHandler(ctx));

bot.launch();

console.log("🤖 Bot is running...");
