require("dotenv").config();
const path = require("path");
const { Telegraf, Markup } = require("telegraf");
const mongoose = require("mongoose");
const express = require("express");
const cors = require('cors');
// const morgan = require('morgan');
const compression = require("compression");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const slowDown = require("express-slow-down");
const Redis = require("ioredis");
const winston = require("winston");
const CurrencyExchange = require("./models/CurrencyExchange");
const User = require("./models/user");

const {
  MONGODB_URL,
  WEBHOOK,
  BOT_TOKEN,
  SECRET,
  START,
  EXPRESS_PORT,
  REDIS_HOST,
  REDIS_PORT,
  CORS
} = process.env;

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({ level: "debug" }), // Логирование в консоль
    new winston.transports.File({
      filename: path.join(__dirname, "logs", "error.log"),
      level: "error",
    }), // Логи ошибок
    new winston.transports.File({
      filename: path.join(__dirname, "logs", "combined.log"),
    }), // Общие логи
  ],
});

const app = express();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // Максимум 100 запросов с одного IP
  message: "Слишком много запросов, попробуйте позже.",
});
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // Allow 100 requests per 15 minutes
  delayMs: (used, req) => {
    const delayAfter = req.slowDown.limit;
    return (used - delayAfter) * 500; // Increase delay for each request over limit
  },
});
const allowedOrigins = [
  CORS
];
app.use(cors({
  origin: function(origin, callback) {
    // Разрешаем доступ только с указанных доменов
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);  // Разрешаем запрос
    } else {
      callback(new Error('Not allowed by CORS'));  // Отказываем в доступе
    }
  },
  methods: ['GET', 'POST'],  // Разрешаем только определенные методы
}));
// app.use(morgan('combined'));
app.set("trust proxy", 1);
app.use(express.json());
app.use(helmet());
app.use(limiter);
app.use(speedLimiter);
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
app.use(
  compression({
    level: 6, // Уровень сжатия (0-9), 6 — оптимальный баланс между скоростью и сжатием
    threshold: 1024, // Минимальный размер ответа для сжатия (1KB)
    brotliEnabled: true,
  })
);

app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).json({ error: "Something went wrong!" });
});

// Подключение к MongoDB
const db = mongoose
  .connect(MONGODB_URL)
  .then(() => logger.info("Connected to MongoDB"))
  .catch((err) => logger.error("Error connecting to MongoDB:", err));

// Подключение к Redis
const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
});

redis.on("connect", () => {
  logger.info("Connected to Redis");
});

redis.on("error", (err) => {
  logger.error("Redis error:", err);
});

// Бот телеграм
const bot = new Telegraf(BOT_TOKEN);

const path_url = SECRET;
if (WEBHOOK === "") {
  // LONG POLLING
  bot.launch();
} else {
  // ПОДКЛЮЧЕНИЕ К WEBHOOK
  const webhookUrl = `${WEBHOOK}/${path_url}`;
  bot.telegram.setWebhook(webhookUrl);

  app.post(`/${path_url}`, (req, res) => {
    bot.handleUpdate(req.body, res);
  });
}

bot.start(async (ctx) => {
  try {
    logger.error("dads");
    const text = START
      ? START
      : `✨ Ас-саляму ‘аляйкум ва рахмату-Ллахи ва баракяту\n\n💱 Чтобы посмотреть все объявления, нажми на "P2P", нажав на кнопку сверху. \n\n🤖 Чтобы создать объявление, нажми на "Разместить", нажав на кнопку рядом с "Сообщение".\n\nℹ️ О боте /help`;

    if (ctx.chat && ctx.chat.username) {
      const existingUser = await User.findOne({ id: ctx.chat.id });

      if (!existingUser) {
        // Если пользователя нет, создаем новую запись
        const newUser = new User({
          id: ctx.chat.id,
          username: ctx.chat.username,
        });

        await newUser.save();
      }

      await ctx.reply(text, {
        // reply_markup: {
        //    inline_keyboard: [
        //      [
        //        {
        //          text: "P2P",
        //          url: `https://t.me/${LINK}`, // Укажите URL вашего WebApp
        //        },
        //      ],
        //    ],
        //  },
        disable_web_page_preview: true, // Отключение превью ссылки
      });
    } else {
      await ctx.reply(
        "✨ Ас-саляму ‘аляйкум ва рахмату-Ллахи ва баракяту\n\n🛂 Чтобы начать использовать бота, пожалуйста, укажите имя пользователя в настройках Telegram. Перейдите в настройки Telegram, откройте раздел 'Изменить профиль' и добавьте ваше имя пользователя."
      );
    }
  } catch (err) {
    logger.error("Ошибка при запуске:", err);
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
      `);
  } catch (err) {
    logger.error("Ошибка при запуске:", err);
    await ctx.reply("Произошла ошибка при запуске." + err);
  }
});

bot.action(/delete_(.+)/, async (ctx) => {
  try {
    const callbackData = ctx.match[1]; // Получаем данные из группы (.+)
    const message = ctx.callbackQuery.message.text; // Сообщение, связанное с callback
    const [id] = callbackData.split("_");

    await CurrencyExchange.findByIdAndDelete(id);

    await ctx.editMessageText(
      `${message}\n\n<b>⭕️ Объявление снято с публикации</b>`,
      {
        parse_mode: "HTML",
        disable_web_page_preview: true, // Отключение превью ссылки
      }
    );

    await ctx.answerCbQuery("⭕️ Объявление снято с публикации");
  } catch (err) {
    logger.error("Ошибка при удалении записи:", err);
    await ctx.answerCbQuery("Произошла ошибка при удалении записи.");
  }
});

// CRUD
app.post("/api/sendMessage", async (req, res) => {
  try {
    const {
      type,
      sellCurrency,
      buyCurrency,
      amount,
      rate,
      city,
      exchange,
      comment,
    } = req.body.data;

    const { id, username } = req.body.user;

    let buy, sell;
    if (type === "Купить") {
      sell = buyCurrency;
      buy = sellCurrency;
    } else {
      sell = sellCurrency;
      buy = buyCurrency;
    }
    const typeIcon =
      type === "Купить"
        ? `🟢 Покупка ${buy} за ${sell}`
        : `🔴 Продажа ${sell} за ${buy}`;
    // 💱 Обмен валюты
    let message = `
    ${typeIcon}
    ├ Валюта продажи: ${sell}
    ├ Валюта покупки: ${buy}
    ├ Сумма: ${amount} ${sellCurrency}
    ├ Курс: ${rate}
    ├ Город: ${city}
    ${comment ? `├: ${comment}` : "└"}Способ обмена: ${exchange}
    ${comment ? `└ Комментарий: ${comment}` : ""}
    `;
    
    
    // Создаём документ для сохранения в MongoDB
    const newExchange = new CurrencyExchange({
      transactionType: type || "", // Тип транзакции (например, обмен)
      currencyFrom: sellCurrency || "", // Валюта продажи
      amountFromCurrency: amount || 0, // Сумма
      currencyTo: buyCurrency || "", // Валюта покупки
      exchangeRate: rate || "", // Курс обмена
      city: city || "", // Город
      exchangeMethod: exchange || "", // Способ обмена
      additionalComments: comment || "", // Комментарии
      username: username || "",
    });

    // Сохраняем данные в базе
    const order = await newExchange.save();

    await bot.telegram.sendMessage(
      req.body.user.chatId, // ID пользователя
      message,
      {
        ...Markup.inlineKeyboard([
          Markup.button.callback(
            "🛑 Снять с публикации",
            `delete_${order._id}`
          ),
        ]),
        disable_web_page_preview: true, // Отключение превью ссылки
      }
    );

    res.send(message);
  } catch (err) {
    logger.error("Ошибка при создании записи:", err);
    res.status(400).json({
      message: "Ошибка при создании записи",
      error: err.message,
    });
  }
});

// READ с фильтрацией, сортировкой и пагинацией
app.get("/api/getOrders", async (req, res) => {
  try {
    const { currencyFrom, currencyTo, city, transactionType } = req.query;

    if (!currencyFrom || !currencyTo || !city || !transactionType) {
      return res.status(400).json({
        message: "Require: currencyFrom, currencyTo, city, transactionType.",
        data: [],
      });
    }

    const filter = {};

    // Фильтрация
    if (req.query.transactionType) {
      filter.transactionType = req.query.transactionType.trim();
    }
    if (req.query.currencyFrom) {
      filter.currencyFrom = req.query.currencyFrom.trim();
    }
    if (req.query.currencyTo) {
      filter.currencyTo = req.query.currencyTo.trim();
    }
    if (req.query.city) {
      filter.city = req.query.city.trim();
    }
    if (req.query.exchangeMethod) {
      filter.exchangeMethod = req.query.exchangeMethod.trim();
    }
    if (req.query.minAmount || req.query.maxAmount) {
      const minAmount = req.query.minAmount
        ? Number(req.query.minAmount)
        : undefined;
      const maxAmount = req.query.maxAmount
        ? Number(req.query.maxAmount)
        : undefined;

      if (isNaN(minAmount) && req.query.minAmount) {
        return res.status(400).json({ error: "Invalid minAmount value" });
      }
      if (isNaN(maxAmount) && req.query.maxAmount) {
        return res.status(400).json({ error: "Invalid maxAmount value" });
      }

      filter.amountFromCurrency = {};
      if (minAmount !== undefined) filter.amountFromCurrency.$gte = minAmount;
      if (maxAmount !== undefined) filter.amountFromCurrency.$lte = maxAmount;
    }

    // Валидация и сортировка
    const allowedSortFields = [
      "createdAt",
      "amountFromCurrency",
      "exchangeRate",
    ]; // Список допустимых полей
    const sortBy = allowedSortFields.includes(req.query.sort)
      ? req.query.sort
      : "createdAt";
    const order = req.query.order === "desc" ? -1 : 1;

    // Пагинация
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    if (limit <= 0) {
      return res.status(400).json({ error: "Limit must be greater than 0" });
    }

    const skip = (page - 1) * limit;

    // Поиск с фильтром, сортировкой и пагинацией
    const exchanges = await CurrencyExchange.find(filter)
      .sort({ [sortBy]: order })
      .skip(skip)
      .limit(limit);

    // Общее количество записей
    const total = await CurrencyExchange.countDocuments(filter);

    res.status(200).json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: exchanges,
    });
  } catch (err) {
    logger.error("Ошибка при получении записей:", err);
    res
      .status(500)
      .json({ error: "Ошибка при получении записей", details: err.message });
  }
});

const PORT = EXPRESS_PORT || 3000;
app.listen(PORT, () => {
  logger.info(`listening on port ${PORT}`);
});
