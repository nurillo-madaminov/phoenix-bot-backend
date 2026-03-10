import supabase from "../config/supabase.js";
import { showMainMenu, showServiceButtons } from "../keyboard/buttons.js";
import { Markup } from "telegraf";
import { newMessageTemplate } from "../utils/index.js";

export default function messagesHandler(bot) {
  bot.hears("Services", async (ctx) => {
    await showServiceButtons(ctx);
    await ctx.reply(
      "You can cancel the command by clicking the button below👇",
      Markup.keyboard([["Cancel"]]).resize(),
    );
  });

  bot.hears("Cancel", async (ctx) => {
    await showMainMenu(
      ctx,
      "Cancelled. You can select another service from the menu.",
    );
  });

  bot.hears("Contact us", async (ctx) => {
    await ctx.reply("This is our support center: @phoenixhosservice");
  });

  bot.hears("‼️ DOT ‼️", async (ctx) => {
    const newMessage = newMessageTemplate("dot", ctx);

    await ctx.reply("thank you letting us know");

    await supabase.from("messages").insert(newMessage);
  });
}

console.log(123123);
