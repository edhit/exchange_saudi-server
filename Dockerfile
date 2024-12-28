# Установка базового образа
FROM node:18

# Установка рабочей директории
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Установка зависимостей
RUN npm install

# Копируем весь код в контейнер
COPY . .

# Открываем порт для сервера
EXPOSE 3000

# Запуск приложения
CMD ["npm", "start"]
