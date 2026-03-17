import "dotenv/config";
import { Telegraf, session, Markup } from "telegraf";
// import { writeDB } from "./database.js";
import supabase from "./config/supabase.js";

const bot = new Telegraf(process.env.BOT_API_KEY);
bot.use(session());

// When user /start checks whether they're registered or not
bot.start(async (ctx) => {
  const telegramId = ctx.from.id;

  const { data, error } = await supabase
    .from("users")
    .select("telegramId")
    .eq("telegramId", telegramId)
    .maybeSingle();

  if (error) console.log(error); //error handler
  if (data) {
    return showMainMenu(ctx, "You can select a service from the menu.");
  } else {
    ctx.session = {
      step: "ASK_NAME",
      user: {},
    };

    await ctx.reply(
      `Please enter your full name (exactly as it appears on your CDL).`,
    );

  }
});

//--------------------------------------

bot.hears("Services", async (ctx) => {
  if (!ctx.session) ctx.session = {};
  const msg1 = await showServiceButtons(ctx);
  const msg2 = await ctx.reply(
    "You can go back to the main menu by clicking the button below👇",
    Markup.keyboard([["Back"]]).resize(),
  );

  ctx.session.lastMessages = [msg1.message_id, msg2.message_id];
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
  await ctx.reply(
    "Please confirm that you are currently stopped for a DOT inspection.",
    Markup.keyboard([["Confirm", "Cancel"]]).resize(),
  );
});

bot.hears("Confirm", async (ctx) => {
  const newMessage = newMessageTemplate("dot", ctx);
  const { error } = await supabase.from("messages").insert(newMessage);
  if (error) {
    console.log(error);
    await ctx.reply("Something went wrong. Please try again.");
  }
  await showMainMenu(
    ctx,
    "Our team is currently checking your logs and preparing everything for the inspection.",
  );
});

bot.hears("Back", async (ctx) => {
  // if (ctx.session?.lastMessages) {
  //   // there's a bug
  //   for (const id of ctx.session.lastMessages) {
  //     try {
  //       await ctx.deleteMessage(id);
  //     } catch (error) {
  //       console.log("THIS IS AN ERROR", error);
  //     }
  //   }
  // }
  await showMainMenu(ctx, "You can select another service from the menu.");
});

//--------------------------------------

bot.on("text", async (ctx) => {
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

    ctx.session.step = null;
    ctx.session.user = null;

    const { error } = await supabase.from("users").insert(userData);

    if (error) {
      console.log(error);
      await ctx.reply("Something went wrong. Please try again.");
    }

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
});

//------------------- Buttons -------------------

async function showServiceButtons(ctx) {
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

async function showMainMenu(ctx, message) {
  return ctx.reply(
    message,
    Markup.keyboard([["‼️ DOT ‼️"], ["Services", "Contact us"]]).resize(),
  );
}

//--------------------------------------

const servicesMap = {
  new_cycle: "Cycle",
  new_shift: "Shift",
  new_break: "Break",
  fix_logs: "Fixing logs",
  dot: "DOT inspection",
};

const services = Object.keys(servicesMap);
const serviceRegex = new RegExp(`^(${services.join("|")})$`);

bot.action(serviceRegex, async (ctx) => {
  const selectedService = ctx.callbackQuery.data;

  const newMessage = newMessageTemplate(selectedService, ctx);

  if (ctx.session.lastMessages) {
    for (const id of ctx.session.lastMessages) {
      await ctx.deleteMessage(id);
    }
  }
  await ctx.reply(
    `Processing your request…
We will let you know once your request is completes`,
    Markup.keyboard(["Back"]).resize(), //Cancel
  );
  await ctx.answerCbQuery();

  const { error } = await supabase.from("messages").insert(newMessage);
  if (error) {
    console.log(error);
    await ctx.reply("Something went wrong. Please try again.");
  }
});

function newMessageTemplate(selectedService, ctx) {
  return {
    user_id: ctx.from.id,
    sender: "user",
    type: selectedService || null,
    text: `${servicesMap[selectedService]} request`,
    is_read: false,
  };
}

function subscribeToMessages() {
  supabase
    .channel("messages-channel")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      async (payload) => {
        const message = payload.new;

        // only react to admin messages
        if (message.type == null) {
          await bot.telegram.sendMessage(message.user_id, message.text);
        } else if (message.type === "file") {
          await bot.telegram.sendDocument(message.user_id, message.file_url, {
            caption: message.text || "📎 File",
          });
        }
      },
    )
    .subscribe();
}

// async function updateLastActiveTime(userId) {
//   await supabase
//     .from("users")
//     .update({ lastActiveAt: new Date().toISOString() })
//     .eq("user_id", userId);
// }

bot.launch();

subscribeToMessages();

// While registering user might send sticker's or images
