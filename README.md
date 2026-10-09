# Project Management

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Веб-приложение для управления проектами по Scrum/Kanban: проекты и участники с ролями,
спринты, задачи с подзадачами и канбан-доской, комментарии, вложения, учёт времени,
аналитика с экспортом в PDF/Excel и панель администратора.

## Стек

- **Клиент** (`client/`): React 19, TypeScript, Vite, Redux Toolkit, React Router, dnd-kit
- **Сервер** (`server/`): Node.js, Express 5, TypeScript, Sequelize, PostgreSQL, JWT, PDFKit

## Запуск локально

Требуется Node.js 20+ и PostgreSQL.

```bash
# сервер
cd server
cp .env.example .env        # указать параметры БД и JWT-секреты
npm install
npm run db:migrate
npm run db:seed             # демо-данные (см. seed_users.md)
npm run dev                 # http://localhost:5000

# клиент
cd ../client
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

## Лицензия

Проект распространяется по лицензии [MIT](LICENSE) — © 2026 Uladzislau Petushkou.

Лицензии сторонних зависимостей перечислены в [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
Обоснование выбора лицензии — в [docs/LAB2_LICENSES.md](docs/LAB2_LICENSES.md).
