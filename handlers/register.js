import supabase from "../config/supabase.js";
import { showMainMenu } from "../keyboard/buttons.js";

export default async function registerHandler(ctx) {
  if (!ctx.session?.step) return;
  if (ctx.session.step === "ASK_NAME") {
    ctx.session.step = "ASK_EMAIL";
    ctx.session.user.name = ctx.message.text;
    return ctx.reply("Please enter your email address.");
  }
  if (ctx.session.step === "ASK_EMAIL") {
    const email = ctx.message.text.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return ctx.reply(
        "❌ Invalid email format. Please enter a valid email address.",
      );
    }

    ctx.session.step = "ASK_PHONE";
    ctx.session.user.email = ctx.message.text;
    return ctx.reply("Please enter your phone number");
  }
  if (ctx.session.step === "ASK_PHONE") {
    const phone = ctx.message.text.trim();
    const usPhoneRegex = /^(?:\+1\s?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}$/;

    if (!usPhoneRegex.test(phone)) {
      return ctx.reply("❌ Invalid US phone number.\nExample: +1 123-456-7890");
    }
    ctx.session.user.phone = ctx.message.text;
    ctx.session.step = "USDOT_NUMBER";
    return ctx.reply("Enter your company’s USDOT number.");
  }
  if (ctx.session.step === "USDOT_NUMBER") {
    const telegramId = ctx.from.id;

    const userData = {
      telegramId,
      username: ctx.from.username || null,
      fullName: ctx.session.user.name,
      phone: ctx.session.user.phone,
      companyUSDOT: ctx.message.text.trim(),
      email: ctx.session.user.email.toLowerCase(),
      role: "client",
      lastActiveAt: new Date().toISOString(),
    };

    // db.users[telegramId] = userData;

    ctx.session.step = null;
    ctx.session.user = null;

    const { error } = await supabase.from("users").insert(userData);

    if (error) console.log(error);

    await ctx.reply(`
Name: ${userData.fullName}
Email: ${userData.email}
Phone: ${userData.phone}
USDOT: ${userData.companyUSDOT}
      `);

    await showMainMenu(
      ctx,
      "Registration completed successfully. You can now use our services.",
    );
  }
}
