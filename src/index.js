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
  : `✨ Ас-саляму ‘аляйкум ва рахмату-Ллахи ва баракяту\n\n🤖 Чтобы создать объявление, нажми на "Разместить", нажав на кнопку рядом с "Сообщение".`;

bot.start(async (ctx) => {
  try {
    if (ctx.chat && ctx.chat.username) {
      await ctx.unpinAllChatMessages();
      const message_data = await ctx.reply(text, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Биржа",
                url: `https://t.me/${process.env.CHANNEL.replace("@", "")}`, // Укажите URL вашего WebApp
              },
            ],
          ],
        },
        disable_web_page_preview: true, // Отключение превью ссылки
      });
      await ctx.pinChatMessage(message_data.message_id);
    } else {
      await ctx.reply(
        "✨ Ас-саляму ‘аляйкум ва рахмату-Ллахи ва баракяту\n\n🛂 Чтобы начать использовать бота, пожалуйста, укажите имя пользователя в настройках Telegram. Перейдите в настройки Telegram, откройте раздел 'Изменить профиль' и добавьте ваше имя пользователя."
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
    const message = ctx.callbackQuery.message.replace("#order", ""); // Сообщение, связанное с callback
    const [messageId] = callbackData.split("_");

      await bot.telegram.editMessageText(
        process.env.CHANNEL, // Либо ID канала
        messageId, // ID сообщения
        undefined, // inlineMessageId, если он не используется
        `${message.text}\n\n<b>⭕️ Объявление снято с публикации</b>`,
        {
          parse_mode: "HTML", // Указывает форматирование текста
          disable_web_page_preview: true, // Отключение превью ссылки
        }
      );

      await ctx.editMessageText(
        `${message.text}\n\n<b>⭕️ Объявление снято с публикации</b>`,
        {
          parse_mode: "HTML",
          disable_web_page_preview: true, // Отключение превью ссылки
        }
      );

      await ctx.answerCbQuery('⭕️ Объявление снято с публикации')
  } catch (err) {
    console.error("Ошибка при удалении записи:", err);
    await ctx.reply("Произошла ошибка при удалении записи.");
  }
});

app.post("/api/sendMessage", async (req, res) => {
  try {
    const typeIcon = req.body.data.type === "Купить" ? "🟢 Покупка" : "🔴 Продажа";

    let message = `
    💱 Обмен валюты
    💸 Валюта продажи: ${req.body.data.sellCurrency}
    💰 Валюта покупки: ${req.body.data.buyCurrency}
    💵 Сумма: ${req.body.data.amount}
    📊 Курс: ${req.body.data.rate}
    🏙️ Город: ${req.body.data.city}
    🔄 Способ обмена: ${req.body.data.exchange}
    🚚 Доставка: ${req.body.data.delivery}
    ${req.body.data.comment ? `📝 Комментарий: ${req.body.data.comment}` : ""}

    #order #${req.body.data.sellCurrency}_${req.body.data.buyCurrency}
    `;

    let message_data = await bot.telegram.sendMessage(
      process.env.CHANNEL, // ID канала
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
              `https://t.me/${process.env.CHANNEL}/${message_data.message_id}`
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
