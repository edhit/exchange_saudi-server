require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Telegraf, Markup } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);

// Создаем приложение Express
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
  });

// Подключение к MongoDB
const mongoURI = process.env.MONGO_URI; // Укажите ваш URI
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB подключен'))
  .catch((err) => console.error('Ошибка подключения к MongoDB:', err));

// Схема и модель Mongoose
const cargoSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    trim: true,
  },
  weight: {
    type: Number,
    required: true,
    min: 0,
  },
  price: {
    type: Number,
    required: true,
    min: 0, 
  },
  from: {
    type: String,
    required: true,
    trim: true,
  },
  to: {
    type: String,
    required: true,
    trim: true,
  },
  comment: {
    type: String,
    default: '',
    trim: true,
  },
  username: {
    type: String,
    required: true,
    trim: true,
  },
}, { timestamps: true });

const Cargo = mongoose.model('Cargo', cargoSchema);

// CRUD маршруты

// Получить все записи с фильтрацией, сортировкой и пагинацией
app.get('/api/cargos', async (req, res) => {
    try {
      const { 
        from, 
        to, 
        minPrice, 
        maxPrice, 
        minWeight, 
        maxWeight, 
        sortBy, 
        sortOrder, 
        page = 1, 
        limit = 10 
      } = req.query;
  
      // Формируем объект фильтра
      const filter = {};
  
      if (from) filter.from = from.trim();
      if (to) filter.to = to.trim();
  
      // Фильтрация по цене
      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = Number(minPrice); // Больше или равно
        if (maxPrice) filter.price.$lte = Number(maxPrice); // Меньше или равно
      }
  
      // Фильтрация по весу
      if (minWeight || maxWeight) {
        filter.weight = {};
        if (minWeight) filter.weight.$gte = Number(minWeight); // Больше или равно
        if (maxWeight) filter.weight.$lte = Number(maxWeight); // Меньше или равно
      }
  
      // Настройка сортировки
      let sort = {};
      if (sortBy) {
        const order = sortOrder === 'desc' ? -1 : 1; // По умолчанию сортируем по возрастанию
        sort[sortBy] = order;
      }
  
      // Настройка пагинации
      const pageNumber = Math.max(1, parseInt(page)); // Номер страницы, по умолчанию 1
      const pageSize = Math.max(1, parseInt(limit)); // Размер страницы, по умолчанию 10
      const skip = (pageNumber - 1) * pageSize;
  
      // Выполняем запрос с фильтром, сортировкой и пагинацией
      const cargos = await Cargo.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(pageSize);
  
      // Подсчет общего количества записей
      const totalCargos = await Cargo.countDocuments(filter);
  
      res.json({
        total: totalCargos, // Общее количество записей
        page: pageNumber,   // Текущая страница
        limit: pageSize,    // Количество записей на странице
        cargos,             // Список записей
      });
    } catch (err) {
      res.status(500).json({ message: 'Ошибка сервера', error: err.message });
    }
  });
  

// Создать новую запись
app.post('/api/cargos', async (req, res) => {
  try {
    const { type, weight, price, from, to, comment } = req.body.data;
    const { chatId, username } = req.body.user;

    const newCargo = new Cargo({
      type,
      weight,
      price,
      from,
      to,
      comment,
      username,
    });

    const savedCargo = await newCargo.save();

    // Кнопка "Удалить"
    await bot.telegram.sendMessage(
        chatId, // ID группы или пользователя
        message,
        Markup.inlineKeyboard([
          Markup.button.callback('🗑 Удалить', `delete_${savedCargo._id}`)
        ])
      );

    res.status(201).json(savedCargo);
  } catch (err) {
    res.status(400).json({ message: 'Ошибка при создании записи', error: err.message });
  }
});

bot.start(async(ctx) => {
    try {
        await ctx.reply('Привет! Чтобы начать использовать бота, откройте WebApp, нажав на кнопку ниже.', {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: 'Cargo',
                    url: process.env.WEB_APP, // Укажите URL вашего WebApp
                  },
                ],
              ],
            },
          });
      } catch (err) {
        console.error('Ошибка при запуске:', err);
        await ctx.reply('Произошла ошибка при запуске.');
      }
})

// Обработчик нажатия кнопки "Удалить"
bot.action(/delete_(.+)/, async (ctx) => {
    try {
      const cargoId = ctx.match[1]; // Получаем ID записи из callback данных
  
      // Удаляем запись из MongoDB
      const deletedCargo = await Cargo.findByIdAndDelete(cargoId);
  
      if (deletedCargo) {
        await ctx.editMessageText(`Запись была удалена:\n\n${deletedCargo.type} (${deletedCargo.weight} кг)`);
      } else {
        await ctx.reply('Запись уже была удалена или не существует.');
      }
    } catch (err) {
      console.error('Ошибка при удалении записи:', err);
      await ctx.reply('Произошла ошибка при удалении записи.');
    }
  });

// Получить запись по ID
// app.get('/api/cargos/:id', async (req, res) => {
//   try {
//     const cargo = await Cargo.findById(req.params.id);
//     if (!cargo) return res.status(404).json({ message: 'Запись не найдена' });
//     res.json(cargo);
//   } catch (err) {
//     res.status(500).json({ message: 'Ошибка сервера', error: err.message });
//   }
// });

// Обновить запись по ID
// app.put('/api/cargos/:id', async (req, res) => {
//   try {
//     const { type, weight, price, from, to, comment, username } = req.body;

//     const updatedCargo = await Cargo.findByIdAndUpdate(
//       req.params.id,
//       { type, weight, price, from, to, comment, username },
//       { new: true, runValidators: true }
//     );

//     if (!updatedCargo) return res.status(404).json({ message: 'Запись не найдена' });

//     res.json(updatedCargo);
//   } catch (err) {
//     res.status(400).json({ message: 'Ошибка при обновлении записи', error: err.message });
//   }
// });

// Удалить запись по ID
app.delete('/api/cargos/:id', async (req, res) => {
  try {
    const deletedCargo = await Cargo.findByIdAndDelete(req.params.id);
    if (!deletedCargo) return res.status(404).json({ message: 'Запись не найдена' });

    res.json({ message: 'Запись удалена', cargo: deletedCargo });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера', error: err.message });
  }
});

// Запуск сервера
const PORT = process.env.PORT ? process.env.PORT : 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
bot.launch();
