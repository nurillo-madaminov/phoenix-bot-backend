import supabase from "../config/supabase.js";
import { newMessageTemplate } from "../utils/index.js";

export default async function serviceHandler(ctx) {
  const selectedService = ctx.callbackQuery.data;

  const newMessage = newMessageTemplate(selectedService, ctx);

  await ctx.editMessageText("Please wait we are working on your request...");

  await ctx.answerCbQuery();

  await supabase.from("messages").insert(newMessage);
}
