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
  if (ctx.session) ctx.session.step = null;
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
  await deleteTrackedMessages(ctx);
  await showMainMenu(ctx, "You can select another service from the menu.");
});

//--------------------------------------

bot.on("text", async (ctx) => {
  if (!ctx.session?.step) return;

  if (ctx.session.step === "CUSTOM_MESSAGE") {
    const messageText = ctx.message.text.trim();

    if (!messageText) {
      return ctx.reply("Please write your message or press Cancel.");
    }

    ctx.session.step = null;

    const newMessage = {
      user_id: ctx.from.id,
      sender: "user",
      type: "message",
      text: messageText,
      is_read: false,
    };

    const { error } = await supabase.from("messages").insert(newMessage);
    if (error) {
      console.log(error);
      return ctx.reply("Something went wrong. Please try again.");
    }

    return showMainMenu(
      ctx,
      "Your message has been sent. You can select another service from the menu.",
    );
  }

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
    const USDOT = ctx.message.text.trim();

    // 🔥 find company by USDOT
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("USDOT", USDOT)
      .maybeSingle();

    if (companyError) {
      console.log(companyError);
      return ctx.reply("Something went wrong. Please try again.");
    }

    // ❌ if not found (optional strict validation)
    if (!company) {
      return ctx.reply(
        "❌ No company found with this USDOT.\n\nPlease enter correct one or contact our support center: @phoenixeldservice",
      );
    }

    const userData = {
      telegramId,
      username: ctx.from.username || null,
      fullName: ctx.session.user.name,
      phone: ctx.session.user.phone,
      companyUSDOT: USDOT,
      email: ctx.session.user.email.toLowerCase(),
      role: "client",
      lastActiveAt: new Date().toISOString(),
    };

    ctx.session.step = null;
    ctx.session.user = null;

    const { error } = await supabase.from("users").insert(userData);

    if (error) {
      console.log(error);
      return ctx.reply("Something went wrong. Please try again.");
    }

    // ✅ use company name instead of USDOT
    await ctx.reply(`
Name: ${userData.fullName}
Email: ${userData.email}
Phone: ${userData.phone}
Company: ${company.name}
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
        [
          { text: "CYCLE", callback_data: "new_cycle" },
          { text: "BREAK", callback_data: "new_break" },
        ],
        [
          { text: "Shift", callback_data: "new_shift" },
          { text: "Shift+PTI", callback_data: "shift_pti" },
        ],
        [
          { text: "PTI", callback_data: "pretrip" },
          { text: "Fix Logs", callback_data: "fix_logs" },
        ],
        [
          { text: "Profile", callback_data: "fix_profile" },
          { text: "Message", callback_data: "custom_message" },
        ],
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

async function deleteTrackedMessages(ctx) {
  if (!ctx.session?.lastMessages?.length) return;

  const messageIds = [...ctx.session.lastMessages];
  ctx.session.lastMessages = [];

  for (const id of messageIds) {
    try {
      await ctx.deleteMessage(id);
    } catch (error) {
      const description = error?.response?.description || "";
      const isMissingMessageError =
        error?.response?.error_code === 400 &&
        description.includes("message to delete not found");

      if (!isMissingMessageError) {
        console.log("Failed to delete tracked message", {
          messageId: id,
          error,
        });
      }
    }
  }
}

//--------------------------------------

const servicesMap = {
  new_cycle: "Cycle",
  new_shift: "Shift",
  shift_pti: "Shift+PTI",
  new_break: "Break",
  fix_logs: "Fix Logs",
  fix_profile: "Profile",
  pretrip: "PTI",
  dot: "DOT inspection",
};

const services = Object.keys(servicesMap);
const serviceRegex = new RegExp(`^(${services.join("|")})$`);

bot.action(serviceRegex, async (ctx) => {
  const selectedService = ctx.callbackQuery.data;

  const newMessage = newMessageTemplate(selectedService, ctx);

  await deleteTrackedMessages(ctx);
  await ctx.reply(
    `Processing your request…
We will let you know once your request is completes`,
  );
  // ctx.session.lastMessages = [msg1.message_id];

  await showMainMenu(ctx, "You can select another service from the menu.");
  await ctx.answerCbQuery();

  const { error } = await supabase.from("messages").insert(newMessage);
  if (error) {
    console.log(error);
    await ctx.reply("Something went wrong. Please try again.");
  }
  // setTimeout(() => {
  //   // ctx.deleteMessage(ctx.session.lastMessages[0]);
  // }, 1000);
});

bot.action("custom_message", async (ctx) => {
  if (!ctx.session) ctx.session = {};
  ctx.session.step = "CUSTOM_MESSAGE";

  await deleteTrackedMessages(ctx);

  await ctx.reply(
    "Write your message and send it.",
    Markup.keyboard([["Cancel"]]).resize(),
  );
  await ctx.answerCbQuery();
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

bot.launch();

subscribeToMessages();

// While registering user might send sticker's or images
