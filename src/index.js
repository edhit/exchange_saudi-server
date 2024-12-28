require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");

const express = require("express");
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

const bot = new Telegraf(process.env.BOT_TOKEN);

const path_url = process.env.SECRET;
if (process.env.WEBHOOK === "") {
  bot.launch();
} else {
  const webhookUrl = `${process.env.WEBHOOK}/${path_url}`;
  bot.telegram.setWebhook(webhookUrl);

  app.post(`/${path_url}`, (req, res) => {
    bot.handleUpdate(req.body, res);
  });
}

const text = process.env.START
  ? process.env.START
  : "Привет! Чтобы начать использовать бота, откройте WebApp, нажав на кнопку ниже.";

bot.start(async (ctx) => {
  try {
    if (ctx.chat && ctx.chat.username) {
      await ctx.reply(text, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Cargo",
                url: process.env.WEB_APP, // Укажите URL вашего WebApp
              },
            ],
          ],
        },
        disable_web_page_preview: true, // Отключение превью ссылки
      });
    } else {
      await ctx.reply(
        "السلام عليكم ورحمة الله وبركاته \n\n🛂 Чтобы начать использовать бота, пожалуйста, укажите имя пользователя в настройках Telegram. Перейдите в настройки Telegram, откройте раздел 'Изменить профиль' и добавьте ваше имя пользователя."
      );
    }
  } catch (err) {
    console.error("Ошибка при запуске:", err);
    await ctx.reply("Произошла ошибка при запуске." + err);
  }
});

bot.action(/delete_(.+)/, async (ctx) => {
  try {
    const callbackData = ctx.match[1]; // Получаем данные из группы (.+)
    const message = ctx.callbackQuery.message; // Сообщение, связанное с callback
    const [messageId] = callbackData.split("_");

      await bot.telegram.editMessageText(
        "@cargo_life", // Либо ID канала
        messageId, // ID сообщения
        undefined, // inlineMessageId, если он не используется
        `<s>${message.text}</s>\n\n<b>⭕️ Объявление снято с публикации</b>`,
        {
          parse_mode: "HTML", // Указывает форматирование текста
          disable_web_page_preview: true, // Отключение превью ссылки
        }
      );

      await ctx.editMessageText(
        `<s>${message.text}</s>\n\n<b>⭕️ Объявление снято с публикации</b>`,
        {
          parse_mode: "HTML",
          disable_web_page_preview: true, // Отключение превью ссылки
        }
      );
  } catch (err) {
    console.error("Ошибка при удалении записи:", err);
    await ctx.reply("Произошла ошибка при удалении записи.");
  }
});

app.post("/api/sendMessage", async (req, res) => {
  try {
    let message = `
	  📦 Груз: ${req.body.data.type}
	  ⚖️ Вес: ${req.body.data.weight}
	  💰 Цена за кг: ${req.body.data.price}
	  📍 Откуда: ${req.body.data.from}
	  📍 Куда: ${req.body.data.to}
	  ${req.body.data.comment ? `📝 Комментарий: ${req.body.data.comment}` : ""}
		  `;

    let message_data = await bot.telegram.sendMessage(
      `@cargo_life`, // ID канала
      message,
      {
        ...Markup.inlineKeyboard([
          Markup.button.url(
            "Написать автору",
            `https://t.me/${req.body.user.username}`
          ),
        ]),
        disable_web_page_preview: true, // Отключение превью ссылки
      }
    );

    if (message_data) {
      await bot.telegram.sendMessage(
        req.body.user.chatId, // ID пользователя
        message,
        {
          ...Markup.inlineKeyboard([
            Markup.button.callback(
              "🛑 Снять с публикации",
              `delete_${message_data.message_id}`
            ),
            Markup.button.url(
              "Посмотреть объявление",
              `https://t.me/cargo_life/${message_data.message_id}`
            ),
          ]),
          disable_web_page_preview: true, // Отключение превью ссылки
        }
      );
    }

    res.send(message);
  } catch (error) {
    res.status(400).json({
      message: "Ошибка при создании записи",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
