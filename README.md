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
scripts/setup-asr-runtime.ps1
docker compose up --build -d
```

ASR runtime и проверки описаны в [инструкции эксплуатации](docs/ASR_OPERATIONS.md). Перед `verify:release` установить локальный Python runtime 3.12.3 командой `scripts/setup-asr-runtime.ps1`; веса модели для обычных автоматических проверок не требуются.

Для контейнерного запуска приложения и Sherpa используйте [инструкцию Docker Compose](docs/DOCKER_DEPLOYMENT.md). Docker-вариант не включается автоматически и не заменяет текущий systemd deployment.

## Первый локальный запуск

Скопировать безопасные имена переменных из `.env.example` в `.env`, заполнить секреты, затем выполнить `npm ci`, `npm run db:migrate` и `npm run dev`. Настоящий system prompt находится в `data/system_prompt.md` и не коммитится.

## Документы

- [Техническое задание](TECHNICAL_SPECIFICATION.md)
- [План разработки](docs/DEVELOPMENT_PLAN.md)
- [Первичное развёртывание](docs/DEPLOYMENT_ROOT.md)
- [Обновление production](docs/DEPLOYMENT_UPDATE.md)
- [Эксплуатация ASR](docs/ASR_OPERATIONS.md)
- [Docker Compose](docs/DOCKER_DEPLOYMENT.md)
- [Готовность ASR к release](docs/ASR_RELEASE_READINESS.md)
- [Стандарт проекта](docs/AI_RUN_PROJECT_STANDARD.md)

Application-level backup не реализован. Обязателен внешний backup VPS и checkpoint перед опасными миграциями.
