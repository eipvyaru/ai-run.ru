# AI-Run Landing v2

Лендинг AI-Run с AI-секретарём, записью через Яндекс Календарь, email и минимальной админ-панелью.

- Public URL: `https://ai-run.ru`
- Local root: `C:\_Codex\ai-run.ru`
- VPS code/data/cache: `/var/www/ai-run.ru`, `/var/lib/ai-run.ru`, `/var/cache/ai-run.ru`
- Node.js: `v24.21.0`
- Application port: `8787`
- Reserved Playwright port: `8786`

## Команды

```text
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm start
npm run db:migrate
npm run worker
npm run smoke
npm run verify:release
```

## Первый локальный запуск

Скопировать безопасные имена переменных из `.env.example` в `.env`, заполнить секреты, затем выполнить `npm ci`, `npm run db:migrate` и `npm run dev`. Настоящий system prompt находится в `data/system_prompt.md` и не коммитится.

## Документы

- [Техническое задание](TECHNICAL_SPECIFICATION.md)
- [План разработки](docs/DEVELOPMENT_PLAN.md)
- [Первичное развёртывание](docs/DEPLOYMENT_ROOT.md)
- [Обновление production](docs/DEPLOYMENT_UPDATE.md)
- [Стандарт проекта](docs/AI_RUN_PROJECT_STANDARD.md)

Application-level backup не реализован. Обязателен внешний backup VPS и checkpoint перед опасными миграциями.
