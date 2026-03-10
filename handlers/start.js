import { showMainMenu } from "../keyboard/buttons.js";
import supabase from "../config/supabase.js";

//When user /start checks whether they're registered or not
export default async function startHandler(ctx) {
  const telegramId = ctx.from.id;

  const { data } = await supabase
    .from("users")
    .select("telegramId")
    .eq("telegramId", telegramId)
    .single();

  if (data) {
    console.log("old user");
    return showMainMenu(ctx, "You can select a service from the menu.");
  }

  // if user not registered
  else {
    ctx.session = {
      step: "ASK_NAME",
      user: {},
    };
    await ctx.reply(
      `Please enter your full name (exactly as it appears on your CDL).`,
    );
    console.log("new user");
  }
}

// bot.start(async (ctx) => {

// });
