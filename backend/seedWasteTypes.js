// backend/seedWasteTypes.js
const mongoose = require('mongoose');
const WasteType = require('./models/WasteType');
require('dotenv').config();

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  await WasteType.deleteMany({});

  await WasteType.create([
    {
      name: 'Макулатура',
      subtypes: [
        { name: 'Картон' },
        { name: 'Газеты и журналы' },
        { name: 'Бумага A4' }
      ]
    },
    {
      name: 'Пластик',
      subtypes: [
        { name: 'PET (бутылки)' },
        { name: 'Полиэтилен (мешки)' },
        { name: 'Жёсткий пластик' }
      ]
    }
  ]);

  console.log('seed done');
  mongoose.disconnect();
}

seed().catch(console.error);
