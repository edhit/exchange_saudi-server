require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const mongoose = require('mongoose');
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


// Получение переменных из .env
const {
  MONGO_ROOT_USERNAME,
  MONGO_ROOT_PASSWORD,
  MONGO_DB_NAME,
  MONGO_HOST,
  MONGO_PORT,
  WEBHOOK,
  BOT_TOKEN,
  SECRET,
  START,
  EXPRESS_PORT,
  LINK,
  GROUP
} = process.env;

// Строка подключения к MongoDB
const mongoURI = MONGO_HOST;

// Подключение к MongoDB
mongoose
  .connect(mongoURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

const bot = new Telegraf(BOT_TOKEN);

const path_url = SECRET;
if (WEBHOOK === "") {
  bot.launch();
} else {
  const webhookUrl = `${WEBHOOK}/${path_url}`;
  bot.telegram.setWebhook(webhookUrl);

  app.post(`/${path_url}`, (req, res) => {
    bot.handleUpdate(req.body, res);
  });
}

const text = START
  ? START
  : `✨ Ас-саляму ‘аляйкум ва рахмату-Ллахи ва баракяту\n\n💱 Чтобы посмотреть все объявления, нажми на "P2P", нажав на кнопку сверху. \n\n🤖 Чтобы создать объявление, нажми на "Разместить", нажав на кнопку рядом с "Сообщение".\n\nℹ️ О боте /help`;

bot.start(async (ctx) => {
  try {
    if (ctx.chat && ctx.chat.username) {
      await ctx.unpinAllChatMessages();
      const message_data = await ctx.reply(text, {
        reply_markup: {
           inline_keyboard: [
             [
               {
                 text: "P2P",
                 url: `https://t.me/${LINK}`, // Укажите URL вашего WebApp
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

bot.help(async (ctx) => {
  try {
    await ctx.reply(`
📣 Бот для обмена валют
Автоматизируйте публикацию и поиск объявлений о купле-продаже валют, подобно платформам, таким как Bybit P2P. Найдите лучшие предложения, разместите свои объявления и быстро свяжитесь с другими участниками обмена.
Основные функции бота:

1️⃣ Создание объявлений:
• 💱 Укажите валюту продажи и покупки (USD, USDT, RUB, KZT, USD, UZS, SAR, TRY).
• 💲 Укажите курс продажи и покупки.
• 🏙️ Выберите удобный город для сделки (Мекка, Медина, Джидда, Эр-Рияд).
• 🔄 Укажите способ обмена: наличный расчет (наличный), банковский перевод (перевод) или оба варианта.
• ✍️ Добавьте комментарий к объявлению.

2️⃣ Просмотр объявлений:
• 📜 Отображение доступных объявлений с фильтрацией по городам и валютам.
• 👁️‍🗨️ Удобный интерфейс для просмотра объявлений, похожий на P2P-объявления Bybit.
• 📩 К каждому объявлению прикреплена кнопка для мгновенного перехода в чат с автором.

3️⃣ Управление объявлениями:
• 🗂️ Пользователи могут видеть свои текущие объявления и удалять их при необходимости.
• 📊 Возможность отслеживания количества просмотров объявления.

4️⃣ Генерация сообщений:
• 📝 При создании объявления бот формирует удобное для чтения сообщение с подробной информацией.
• 🔗 Сообщение можно отправить в заданную группу Telegram с помощью заранее сгенерированной ссылки.

5️⃣ Обновляемые курсы валют:
• 🌐 Интеграция с API Google для отображения актуальных данных.
🌟 Преимущества бота:

• ✅ Удобство использования: минималистичный интерфейс для размещения объявлений за несколько шагов.
• 🔍 Прозрачность: четкое отображение условий сделки, комментариев и способов оплаты.
• ⚡ Быстрая связь: мгновенный переход в Telegram-чат с пользователем.
• 🧮 Калькулятор валют: рассчет всех актуальных валют в одном месте.
      `)
  } catch (err) {
    console.error("Ошибка при запуске:", err);
    await ctx.reply("Произошла ошибка при запуске." + err);
  }
});

bot.action(/delete_(.+)/, async (ctx) => {
  try {
    const callbackData = ctx.match[1]; // Получаем данные из группы (.+)
    const message = ctx.callbackQuery.message.text.replace("#order", ""); // Сообщение, связанное с callback
    const [messageId] = callbackData.split("_");

      await bot.telegram.editMessageText(
        GROUP, // Либо ID канала
        messageId, // ID сообщения
        undefined, // inlineMessageId, если он не используется
        `${message}\n\n<b>⭕️ Объявление снято с публикации</b>`,
        {
          parse_mode: "HTML", // Указывает форматирование текста
          disable_web_page_preview: true, // Отключение превью ссылки
        }
      );

      await ctx.editMessageText(
        `${message}\n\n<b>⭕️ Объявление снято с публикации</b>`,
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
    let buy, sell;
    if (req.body.data.type === "Купить") {
      sell = req.body.data.buyCurrency;
      buy = req.body.data.sellCurrency;
    } else {
      sell = req.body.data.sellCurrency;
      buy = req.body.data.buyCurrency;
    }
    const typeIcon = req.body.data.type === "Купить" ? `🟢 Покупка ${buy} за ${sell}` : `🔴 Продажа ${sell} за ${buy}`;
// 💱 Обмен валюты
    let message = `
    ${typeIcon}
    ├ Валюта продажи: ${sell}
    ├ Валюта покупки: ${buy}
    ├ Сумма: ${req.body.data.amount}
    ├ Курс: ${req.body.data.rate}
    ├ Город: ${req.body.data.city}
    ${req.body.data.comment ? `├: ${req.body.data.comment}` : "└"}Способ обмена: ${req.body.data.exchange}
    ${req.body.data.comment ? `└ Комментарий: ${req.body.data.comment}` : ""}
    `;

// 🚚 Доставка: ${req.body.data.delivery}

    let message_data = await bot.telegram.sendMessage(
      GROUP, // ID канала
      message,
      {
        ...Markup.inlineKeyboard([
          Markup.button.url(
            `🟩 Написать сообщение 🟩`,
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
              `https://t.me/${LINK}/${message_data.message_id}`
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

const PORT = EXPRESS_PORT || 3000;
app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
