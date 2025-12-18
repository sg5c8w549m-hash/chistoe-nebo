Чистое Небо — Полный пакет (backend + mobile + database)

Содержимое архива:
- backend/ — Node.js (Express) сервер (server.js, package.json, .env.sample)
- mobile_app/ — Expo (React Native) demo (App.js)
- database/schema.sql — PostgreSQL schema

Запуск (локально):
1) Backend:
   - cd backend
   - cp .env.sample .env (и заполнить DATABASE_URL и JWT секрет)
   - npm install
   - npm start

2) Mobile (Expo):
   - cd mobile_app
   - npm install
   - заменить в App.js API адрес на адрес backend (например http://192.168.1.10:3000)
   - expo start

Примечания:
- В сервере реализованы заглушки для платежей. Реальная интеграция с Kaspi/Paybox/Stripe требует настройки ключей и вебхуков.
- Для продакшн обязательно настроить HTTPS, секреты через secret-manager и production-grade БД.
