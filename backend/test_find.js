// backend/test_find.js
const mongoose = require('mongoose');

// адрес MongoDB (берём из .env или по умолчанию)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chistoe_nebo';

async function run() {
  try {
    console.log('➤ Подключаемся к MongoDB по адресу:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('✅ Подключение установлено');

    // Подключаем модель Order
    const Order = require('./models/Order');
    console.log('✅ Модель Order загружена');

    // Пробуем запросить первые записи
    const docs = await Order.find().limit(2);
    console.log('📦 Найдено записей:', docs.length);
    console.log('Данные:', docs);

  } catch (err) {
    console.error('❌ Ошибка при подключении или запросе:', err.message);
    console.error(err.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Соединение закрыто');
    process.exit(0);
  }
}

run();
