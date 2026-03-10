import { Markup } from "telegraf";

export async function showServiceButtons(ctx) {
  return ctx.reply("Choose a service:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "CYCLE", callback_data: "new_cycle" }],
        [{ text: "SHIFT", callback_data: "new_shift" }],
        [{ text: "BREAK", callback_data: "new_break" }],
        [{ text: "Fix Logs", callback_data: "fix_logs" }],
      ],
    },
  });
}

export async function showMainMenu(ctx, message) {
  return ctx.reply(
    message,
    Markup.keyboard([["‼️ DOT ‼️"], ["Services", "Contact us"]]).resize(),
  );
}
