# AI_RUN_PROJECT_STANDARD

Версия: 2.0  
Дата: 19 сентября 2026 года  
Статус: единый обязательный стандарт для новых веб-сервисов семейства `ai-run.ru`

---

# 1. Назначение стандарта

Этот документ задаёт обязательные архитектурные, организационные, эксплуатационные и документальные правила для всех новых веб-сервисов, которые разрабатываются с использованием Codex и размещаются в доменной инфраструктуре `ai-run.ru`.

Стандарт применяется к:

- корневому сайту `ai-run.ru`;
- самостоятельным сервисам вида `<slug>.ai-run.ru`;
- другим самостоятельным сайтам, если при создании проекта задан иной `SITE_DOMAIN`;
- проектам, которые могут содержать внутренние страницы, включая юридические документы, оферты, политики, соглашения и иные постоянные URL.

Каждый сервис является отдельным приложением, отдельным Git-репозиторием, отдельной systemd-службой, отдельным набором данных и отдельной deployment-единицей.

Стандарт предназначен в первую очередь для Codex и должен позволять вести проект без догадок и без использования скрытых незафиксированных договорённостей.

---

# 2. Головные файлы платформы

В каталоге:

```text
C:\_Codex
```

обязательно находятся:

```text
C:\_Codex\AI_RUN_PROJECT_STANDARD.md
C:\_Codex\AI_RUN_PROJECTS.json
```

## 2.1. `AI_RUN_PROJECT_STANDARD.md`

Это актуальная головная версия настоящего стандарта.

При создании нового проекта она копируется без изменения в корень проекта:

```text
C:\_Codex\<slug>\docs\AI_RUN_PROJECT_STANDARD.md
```

Копия стандарта в проекте фиксирует правила, по которым проект был создан.

Последующее изменение головного файла:

```text
C:\_Codex\AI_RUN_PROJECT_STANDARD.md
```

не должно автоматически менять уже существующие проекты.

Обновление версии стандарта внутри существующего проекта является отдельной модификацией проекта и требует:

1. сравнить старую и новую версии стандарта;
2. определить затрагиваемые правила;
3. обновить проектные документы;
4. при необходимости изменить код и deployment-конфигурацию;
5. выполнить все обязательные проверки;
6. создать отдельный локальный Git commit.

## 2.2. `AI_RUN_PROJECTS.json`

Центральный реестр всех проектов.

Он используется для:

- контроля `SLUG`;
- контроля `HOST`;
- контроля `SERVICE_NAME`;
- контроля портов;
- исключения конфликтов;
- фиксации GitHub-репозитория;
- фиксации VPS;
- определения мест размещения проектов.

Codex обязан обновлять реестр при:

- создании нового проекта;
- изменении `SLUG`;
- изменении `PORT`;
- изменении `PLAYWRIGHT_PORT`;
- изменении `HOST`;
- изменении `SITE_DOMAIN`;
- изменении `SERVICE_NAME`;
- смене GitHub repository;
- переносе проекта на другой VPS.

Нельзя считать изменение параметров проекта завершённым, если `AI_RUN_PROJECTS.json` не обновлён.

---

# 3. Начальный реестр проектов

Актуальный начальный набор:

```json
{
  "schemaVersion": 1,
  "siteFamily": "ai-run.ru",
  "projects": [
    {
      "slug": "ai-run.ru",
      "siteDomain": "ai-run.ru",
      "host": "ai-run.ru",
      "serviceName": "ai-run-ru",
      "port": 8787,
      "playwrightPort": 8786,
      "githubOwner": "eipvyaru",
      "githubRepository": "eipvyaru/ai-run.ru"
    },
    {
      "slug": "trade-part",
      "siteDomain": "ai-run.ru",
      "host": "trade-part.ai-run.ru",
      "serviceName": "trade-part",
      "port": 8790,
      "playwrightPort": 8788,
      "githubOwner": "eipvyaru",
      "githubRepository": "eipvyaru/trade-part"
    },
    {
      "slug": "cover-letter",
      "siteDomain": "ai-run.ru",
      "host": "cover-letter.ai-run.ru",
      "serviceName": "cover-letter",
      "port": 8792,
      "playwrightPort": 8791,
      "githubOwner": "eipvyaru",
      "githubRepository": "eipvyaru/cover-letter"
    }
  ]
}
```

---

# 4. Обязательный порядок создания нового проекта

До создания кода Codex выполняет действия строго в следующем порядке.

## 4.1. Получить исходные параметры

Обязательно запросить:

1. `SLUG`;
2. `PORT`;
3. `SITE_DOMAIN`;
4. `PLAYWRIGHT_PORT`;
5. `GITHUB_OWNER`;
6. `VPS_HOST`;
7. `VPS_SSH_PORT`.

Для вопросов Codex должен предлагать значения по умолчанию:

```text
SITE_DOMAIN: ai-run.ru
GITHUB_OWNER: eipvyaru
VPS_HOST: текущее значение основного VPS из центрального реестра или документации
VPS_SSH_PORT: текущее значение основного VPS
```

Значение по умолчанию является только предложением.

Codex не имеет права молча выбирать его вместо пользователя.

## 4.2. Определить версию Node.js

Версия Node.js не фиксируется навсегда настоящим стандартом.

Источник истины для нового проекта — текущая установленная версия Node.js на целевом VPS.

Codex обязан:

1. подключиться к выбранному VPS;
2. выполнить:

```bash
node --version
npm --version
command -v node
command -v npm
```

3. зафиксировать точную версию Node.js проекта;
4. записать её в:

```text
.node-version
AGENTS.md
README.md
docs/DEPLOYMENT_ROOT.md
docs/DEPLOYMENT_UPDATE.md
```

5. использовать ту же версию локально.

Если VPS ещё недоступен, Codex обязан запросить текущую Node.js version у пользователя.

Нельзя самостоятельно выбирать иную major/minor/patch version.

## 4.3. Проверить уникальность

До создания проекта проверить:

- `SLUG` в `AI_RUN_PROJECTS.json`;
- `HOST` в `AI_RUN_PROJECTS.json`;
- `PORT`;
- `PLAYWRIGHT_PORT`;
- локально используемые порты;
- порты на VPS;
- существующие systemd units;
- существующие Nginx `server_name`;
- `/var/www/<slug>`;
- `/var/lib/<slug>`;
- `/var/cache/<slug>`;
- существующий GitHub repository.

Проверка портов на VPS:

```bash
ss -ltnp
```

Проверка systemd:

```bash
systemctl list-unit-files --type=service
```

Проверка Nginx:

```bash
nginx -T
```

Проверка каталогов:

```bash
ls -la /var/www
ls -la /var/lib
ls -la /var/cache
```

## 4.4. Вычислить значения

### Обычный сервис

Если:

```text
SLUG=cover-letter
SITE_DOMAIN=ai-run.ru
```

то:

```text
HOST=cover-letter.ai-run.ru
SERVICE_NAME=cover-letter
```

### Корневой проект

Если:

```text
SLUG=ai-run.ru
SITE_DOMAIN=ai-run.ru
```

то:

```text
HOST=ai-run.ru
SERVICE_NAME=ai-run-ru
```

Нельзя получить:

```text
ai-run.ru.ai-run.ru
```

## 4.5. Зарегистрировать проект

После проверки параметров новая запись сначала добавляется в:

```text
C:\_Codex\AI_RUN_PROJECTS.json
```

и только после этого начинается создание проектного каталога.

---

# 5. Доменная модель

Каждый сервис является самостоятельным приложением.

Примеры:

```text
https://ai-run.ru
https://cover-letter.ai-run.ru
https://trade-part.ai-run.ru
```

Не используется схема размещения самостоятельных приложений через:

```text
https://ai-run.ru/cover-letter
https://ai-run.ru/trade-part
```

если это отдельные сервисы.

Внутри любого отдельного приложения разрешены собственные страницы:

```text
/offerta
/privacy
/personal-data
/terms
/agreement
```

и любые другие постоянные URL.

Юридические документы могут быть:

1. централизованными на `ai-run.ru`;
2. собственными для отдельного сервиса.

Конкретный вариант определяется `TECHNICAL_SPECIFICATION.md`.

---

# 6. Единый технологический стек

Для новых проектов базовый стек:

```text
Ubuntu LTS
Windows + PowerShell локально
Node.js — точная версия, установленная на целевом VPS
npm
package-lock.json
Next.js 16 App Router
React 19
TypeScript strict
Zod 4
node:sqlite
ESLint
Vitest
Playwright E2E — при необходимости
Nginx
systemd
Git
GitHub
```

Дополнительные библиотеки разрешены только при наличии технической причины.

## 6.1. Backend

Backend реализуется внутри Next.js:

```text
Route Handlers
server modules
Node.js runtime
```

БД, секреты, системные prompt, filesystem и внешние серверные integrations не должны использоваться непосредственно в browser code.

## 6.2. SQLite

Базовый вариант:

```text
node:sqlite
```

ORM не является стандартной обязательной зависимостью.

ORM добавляется только если ТЗ или архитектура действительно требуют этого.

## 6.3. LLM

Если проект использует LLM:

- используется серверный OpenAI-compatible router;
- API key существует только на сервере;
- модели ограничиваются server-side allowlist;
- клиент не передаёт произвольное имя модели;
- системный prompt хранится отдельно от кода.

## 6.4. Playwright

`PLAYWRIGHT_PORT` резервируется для каждого проекта всегда.

Сам Playwright-service создаётся только если подтверждён сценарий:

- browser automation;
- dynamic page rendering;
- E2E environment, требующий отдельного service;
- другой согласованный browser workflow.

Отсутствие такого требования означает:

- порт зарезервирован;
- отдельный Playwright systemd service не создаётся.

---

# 7. Единая структура локального проекта

```text
C:\_Codex\<slug>\
│
├── AGENTS.md
├── TECHNICAL_SPECIFICATION.md
├── README.md
│
├── docs\
│   ├── AI_RUN_PROJECT_STANDARD.md
│   ├── DEVELOPMENT_PLAN.md
│   ├── DEPLOYMENT_ROOT.md
│   └── DEPLOYMENT_UPDATE.md
│
├── .env
├── .env.example
├── .gitignore
├── .node-version
│
├── package.json
├── package-lock.json
├── next.config.ts
├── tsconfig.json
│
├── src\
│   ├── app\
│   ├── components\
│   ├── lib\
│   ├── server\
│   │   ├── config\
│   │   ├── auth\
│   │   ├── db\
│   │   ├── prompts\
│   │   ├── llm\
│   │   ├── domain\
│   │   ├── integrations\
│   │   └── jobs\
│   ├── workers\
│   └── shared\
│
├── prompts\
│   └── system_prompt.example.md
│
├── migrations\
├── scripts\
├── deploy\
│   ├── project.json
│   ├── nginx\
│   └── systemd\
│
├── tests\
└── data\
```

Каталоги создаются только если нужны проекту.

Не следует создавать пустые интеграционные подсистемы «на будущее».

---

# 8. Единая структура на VPS

```text
/var/www/<slug>       # source + production build + .env
/var/lib/<slug>       # persistent application data
/var/cache/<slug>     # writable cache
```

Для проекта с SQLite и system prompt:

```text
/var/lib/<slug>/<slug>.sqlite
/var/lib/<slug>/system_prompt.md
/var/lib/<slug>/prompt-history/
```

Локальные аналоги:

```text
C:\_Codex\<slug>\data\<slug>.sqlite
C:\_Codex\<slug>\data\system_prompt.md
C:\_Codex\<slug>\data\prompt-history\
```

---

# 9. Обязательные проектные документы

До начала предметной разработки Codex обязан создать документы в указанном порядке.

Четыре постоянных проектных документа ведутся только в подкаталоге:

```text
docs/AI_RUN_PROJECT_STANDARD.md
docs/DEVELOPMENT_PLAN.md
docs/DEPLOYMENT_ROOT.md
docs/DEPLOYMENT_UPDATE.md
```

Их дубликаты в корне проекта не создаются. `AGENTS.md`, `TECHNICAL_SPECIFICATION.md` и `README.md` остаются в корне проекта.


---

# 10. `docs/AI_RUN_PROJECT_STANDARD.md`

Создаётся первым техническим артефактом путём копирования:

```text
C:\_Codex\AI_RUN_PROJECT_STANDARD.md
```

в:

```text
C:\_Codex\<slug>\docs\AI_RUN_PROJECT_STANDARD.md
```

Файл не пересказывается и не сокращается.

---

# 11. `AGENTS.md`

Создаётся сразу после копии стандарта и до создания исходного кода приложения.

Файл содержит обязательные инструкции для Codex.

## 11.1. Обязательные разделы

```text
# Project rules
## Project identity
## Infrastructure
## Project documentation
## Environment synchronization
## Database and system prompt
## Git rules
## Release verification
## Deployment rules
## Conditional integrations
## Forbidden actions
```

## 11.2. Project identity

Обязательно указать:

```text
SLUG
SERVICE_NAME
PORT
SITE_DOMAIN
HOST
PLAYWRIGHT_PORT
GITHUB_OWNER
GITHUB_REPOSITORY
VPS_HOST
VPS_SSH_PORT
NODE_VERSION
LOCAL_ROOT
VPS_CODE_ROOT
VPS_DATA_ROOT
VPS_CACHE_ROOT
```

Нельзя оставлять placeholders.

## 11.3. Git rules

Codex обязан:

- после каждого завершённого связного изменения выполнять проверки;
- создавать локальный commit автоматически;
- никогда самостоятельно не выполнять push, если пользователь явно не поручил это;
- никогда не использовать `--no-verify`;
- не коммитить секреты.

---

# 12. `TECHNICAL_SPECIFICATION.md`

Это предметное ТЗ проекта.

Оно отвечает на вопрос:

> Что именно должен делать сервис?

Минимальная структура:

```text
# Technical Specification

## 1. Назначение
## 2. Идентификация проекта
## 3. Пользователи и роли
## 4. Пользовательские сценарии
## 5. Функциональные требования
## 6. Входные данные
## 7. Результаты
## 8. API
## 9. База данных
## 10. LLM и prompt
## 11. Интеграции
## 12. Авторизация и безопасность
## 13. UI
## 14. Хранение данных
## 15. Логи и аудит
## 16. Юридические страницы
## 17. Backup requirements
## 18. Ограничения
## 19. Критерии приёмки
## 20. Артефакты поставки
```

## 12.1. Факты и неопределённость

Codex не должен придумывать требования.

В спорных местах использовать:

```text
ФАКТ
ПРЕДПОЛОЖЕНИЕ
НЕИЗВЕСТНО
ТРЕБУЕТ РЕШЕНИЯ
```

Разработка критичного функционала не начинается, пока блок `ТРЕБУЕТ РЕШЕНИЯ` не разрешён пользователем.

---

# 13. `docs/DEVELOPMENT_PLAN.md`

Создаётся только после согласования `TECHNICAL_SPECIFICATION.md`.

План обязан непосредственно следовать ТЗ.

Каждый этап содержит:

```text
Цель
Результат
Изменяемые компоненты
Проверки
Критерий завершения
Git commit
```

Рекомендуемая структура:

```text
Этап 1. Project identity and scaffold
Этап 2. Environment and config
Этап 3. Database
Этап 4. Security/auth
Этап 5. Domain logic
Этап 6. External integrations
Этап 7. API
Этап 8. UI
Этап 9. Automated tests
Этап 10. Deployment
Этап 11. Acceptance
```

Ненужные этапы удаляются.

---

# 14. `docs/DEPLOYMENT_ROOT.md`

Это инструкция только для первого развёртывания проекта.

Она не должна смешиваться с инструкцией обычного обновления.

Обязательные разделы:

```text
# Первичное развёртывание

## 1. Идентичность проекта
## 2. Требования к VPS
## 3. Проверка Node.js
## 4. GitHub repository
## 5. Read-only deploy key
## 6. Подготовка каталогов
## 7. Первое клонирование
## 8. Передача .env
## 9. Передача system prompt
## 10. Установка зависимостей
## 11. Build
## 12. Миграции
## 13. Next.js cache
## 14. systemd
## 15. Nginx HTTP
## 16. DNS
## 17. Certbot / HTTPS
## 18. Production checks
## 19. Backup assumptions
## 20. Диагностика первого запуска
```

Обычная инструкция обновления сюда не включается.

---

# 15. `docs/DEPLOYMENT_UPDATE.md`

Это отдельная короткая инструкция только для последующих обновлений уже работающего проекта.

Она не должна повторять:

- установку Ubuntu packages;
- создание SSH key;
- первоначальное клонирование;
- создание каталогов;
- первоначальную настройку Nginx;
- первоначальный Certbot;
- создание systemd service;
- первичное создание БД.

Минимальная структура:

```text
# Обновление production

## 1. Проверка локального release
## 2. Push commit в GitHub
## 3. Проверка release commit
## 4. Подключение к VPS
## 5. Проверка backup/checkpoint
## 6. PREVIOUS_COMMIT
## 7. git fetch
## 8. checkout RELEASE_COMMIT
## 9. npm ci
## 10. lint/typecheck/test/build
## 11. миграции
## 12. restart service
## 13. health/ready/HTTPS
## 14. rollback
## 15. диагностика
```

Обычное обновление не должно заменять:

```text
.env
SQLite
system_prompt.md
persistent uploads
persistent exports
```

если это не является отдельной явно подтверждённой операцией.

---

# 16. `README.md`

README — краткая входная точка проекта, а не копия ТЗ.

Минимально содержит:

```text
Название
Назначение
Public URL
Local root
VPS paths
Node version
PORT
PLAYWRIGHT_PORT
Основные npm commands
Local start
Ссылки на:
- TECHNICAL_SPECIFICATION.md
- docs/DEVELOPMENT_PLAN.md
- docs/DEPLOYMENT_ROOT.md
- docs/DEPLOYMENT_UPDATE.md
- docs/AI_RUN_PROJECT_STANDARD.md
```

---

# 17. `deploy/project.json`

Обязательный машиночитаемый файл.

Пример:

```json
{
  "slug": "cover-letter",
  "serviceName": "cover-letter",
  "port": 8792,
  "siteDomain": "ai-run.ru",
  "host": "cover-letter.ai-run.ru",
  "playwrightPort": 8791,
  "githubOwner": "eipvyaru",
  "githubRepository": "eipvyaru/cover-letter",
  "vpsHost": "example",
  "vpsSshPort": 22,
  "nodeVersion": "vXX.XX.X"
}
```

Никаких секретов в этом файле быть не должно.

---

# 18. `.env`

Корневой:

```text
C:\_Codex\<slug>\.env
```

— единственный редактируемый локальный источник конфигурации и секретов.

Дополнительные конкурирующие источники:

```text
.env.local
.env.production
.dev.vars
```

по умолчанию не используются.

`.env.example` содержит:

- имена переменных;
- безопасные примеры;
- комментарии;
- никакие production secrets.

---

# 19. Синхронизация VPS environment

После каждого изменения `.env` Codex обязан немедленно выполнить:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\sync-vps-env.ps1
```

Скрипт создаёт:

```text
data\.env.vps
```

и заменяет только пути, которые должны отличаться production/local.

Минимально:

```dotenv
SYSTEM_PROMPT_PATH=/var/lib/<slug>/system_prompt.md
DATABASE_PATH=/var/lib/<slug>/<slug>.sqlite
```

если эти функции присутствуют.

`data/.env.vps`:

- содержит secrets;
- не коммитится;
- не выводится в console;
- не сравнивается обычным plaintext diff;
- передаётся на VPS отдельно.

---

# 20. Git hooks

Каждый проект должен иметь tracked Git hooks.

## 20.1. pre-commit

Перед commit автоматически:

1. выполнить env sync;
2. проверить отсутствие secrets;
3. проверить tracked sensitive files;
4. проверить staged diff.

Использовать:

```text
.githooks/pre-commit
```

Запрещено:

```text
git commit --no-verify
```

## 20.2. post-commit

После commit запускается release readiness verification.

Она не отменяет уже созданный commit.

Если verification failed:

```text
commit существует
push запрещён
deployment запрещён
```

---

# 21. Release verification

Проект должен иметь:

```text
npm run verify:release
```

Проверка выполняется в чистом временном Git worktree.

Минимально:

```text
проверка Node version
npm ci
npm audit --audit-level=moderate
npm run db:migrate
npm run lint
npm run typecheck
npm test
npm run build
git status
secret tracking check
```

Миграции в release worktree должны работать только с тестовой/временной БД.

Никакие реальные LLM calls и внешние отправки не выполняются.

---

# 22. GitHub

Для каждого проекта:

```text
один проект = один GitHub repository
```

Имя repository обычно соответствует `SLUG`.

Примеры:

```text
eipvyaru/cover-letter
eipvyaru/trade-part
eipvyaru/ai-run.ru
```

`GITHUB_OWNER` всегда спрашивается при создании нового проекта.

Предлагаемое значение по умолчанию:

```text
eipvyaru
```

На VPS создаётся отдельный read-only deploy key для каждого repository.

`Allow write access` не включается.

Push выполняется пользователем либо Codex только после прямого поручения.

---

# 23. Production process: root

Все новые сервисы запускаются на VPS от:

```text
root
```

Это является стандартной моделью настоящей версии стандарта.

Отдельный system user не создаётся.

При этом systemd hardening остаётся обязательным.

Пример:

```ini
User=root
Group=root
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/lib/<slug> /var/cache/<slug>
```

Приложение не должно иметь необходимости изменять:

```text
/var/www/<slug>
/var/www/<slug>/.env
```

во время штатной работы.

---

# 24. Systemd

Основная служба:

```text
<service-name>.service
```

Пример:

```text
cover-letter.service
trade-part.service
ai-run-ru.service
```

Обязательно:

```text
WorkingDirectory=/var/www/<slug>
EnvironmentFile=/var/www/<slug>/.env
NODE_ENV=production
Restart=always
RestartSec=...
```

Приложение слушает только:

```text
127.0.0.1:<PORT>
```

Не:

```text
0.0.0.0:<PORT>
```

---

# 25. Nginx

Nginx:

- принимает 80/443;
- завершает TLS;
- перенаправляет HTTP → HTTPS;
- проксирует на `127.0.0.1:<PORT>`;
- не публикует application port наружу.

Каждый проект имеет отдельный:

```text
deploy/nginx/<slug>.conf
```

Перед reload:

```bash
nginx -t
```

Изменения Nginx одного проекта не должны изменять другие сайты.

---

# 26. HTTPS

Для нового host:

1. настроить DNS;
2. проверить HTTP;
3. только после этого запускать Certbot;
4. проверить certificate;
5. проверить timer renew;
6. выполнить dry-run.

---

# 27. System prompt

Раздел применяется только если проект использует системный prompt.

Локально:

```text
C:\_Codex\<slug>\data\system_prompt.md
```

Production:

```text
/var/lib/<slug>/system_prompt.md
```

Git:

```text
prompts/system_prompt.example.md
```

Production prompt:

- не коммитится;
- не встраивается в TypeScript;
- не находится в `public`;
- не хранится в `.env`;
- устанавливается отдельно;
- обновляется атомарно;
- предыдущая версия сохраняется.

Admin prompt editor создаётся только если это прямо указано в ТЗ.

---

# 28. SQLite

Каждый сервис использует собственную БД:

```text
/var/lib/<slug>/<slug>.sqlite
```

Общие БД между проектами запрещены.

Обязательно:

```text
foreign_keys=ON
WAL
busy_timeout
parameterized SQL
```

Изменения schema выполняются только новыми migration files.

Применённые migrations не переписываются.

---

# 29. Backup

Базовая политика:

> Обязателен внешний backup всего VPS средствами системного администрирования.

Application-level backup внутри конкретного проекта создаётся только если ТЗ признаёт его данные критичными.

Если application-level backup не реализован:

- это явно фиксируется в ТЗ;
- фиксируется в `docs/DEPLOYMENT_ROOT.md`;
- фиксируется в `README.md`;
- deployment перед опасными миграциями должен требовать проверки актуальности внешнего VPS backup.

Наличие VPS backup не разрешает хранить production secrets и data в Git.

---

# 30. Telegram и Email

Интеграции создаются только если требуются ТЗ.

Наличие на странице:

```text
Telegram username
t.me link
email
mailto:
```

не считается интеграцией.

Адаптеры, workers, queue и integration tables не создаются без функциональной необходимости.

---

# 31. Worker

Worker создаётся только если существует фоновая задача:

- очередь;
- Telegram sending/receiving;
- email sending/receiving;
- background processing;
- scheduled application job.

Если worker не требуется:

- `src/workers` может отсутствовать;
- worker systemd service не создаётся;
- queue environment variables не добавляются.

---

# 32. Security

Минимально обязательны:

- secrets only server-side;
- HttpOnly session cookies;
- Secure cookies в production;
- SameSite;
- CSRF/Origin checks;
- rate limiting;
- SSRF protection для server-side URL fetch;
- safe Markdown rendering;
- file upload limits;
- request IDs;
- redacted logs;
- no secrets in errors;
- no prompt in technical logs;
- no cookies in logs.

Forwarded headers должны задаваться доверенным Nginx.

---

# 33. Health endpoints

Каждый проект обязан иметь:

```text
GET /api/health
GET /api/ready
```

`health`:

- не выполняет LLM calls;
- не обращается к внешним API;
- проверяет процесс.

`ready` проверяет необходимые локальные зависимости:

- DB;
- migrations;
- prompt, если нужен.

Ответ наружу не должен раскрывать secrets и внутренние пути.

---

# 34. Обязательные npm scripts

Минимально:

```text
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm start
npm run db:migrate
npm run smoke
npm run verify:release
npm run hooks:install
```

Дополнительно при необходимости:

```text
npm run worker
```

---

# 35. Smoke tests

Обычный:

```text
npm run smoke
```

не выполняет:

- платные LLM calls;
- реальные email;
- реальные Telegram messages;
- необратимые операции.

Реальные интеграционные smoke запускаются отдельным явно включаемым режимом.

---

# 36. Deployment update contract

Обычный deployment должен менять только код и build artifacts.

Он не должен автоматически заменять:

```text
.env
system_prompt.md
SQLite
uploads
exports
persistent user files
```

Изменения этих сущностей выполняются отдельными явными действиями.

---

# 37. Rollback

Перед обновлением сохраняется:

```text
PREVIOUS_COMMIT
```

Production развёртывается на конкретный:

```text
RELEASE_COMMIT
```

Рекомендуемый вариант:

```bash
git fetch --prune origin
git checkout --detach <RELEASE_COMMIT>
```

Rollback кода:

```bash
git checkout --detach <PREVIOUS_COMMIT>
npm ci
npm run build
systemctl restart <service>.service
```

SQLite не откатывается автоматически поверх новых production data.

---

# 38. Юридические документы

ТЗ каждого проекта должно определить:

```text
LEGAL_PAGES_MODE=central|local|mixed
```

Логика:

### central

Приложение содержит ссылки на:

```text
https://ai-run.ru/offerta
https://ai-run.ru/privacy
...
```

### local

Документы находятся внутри сервиса:

```text
https://<host>/offerta
```

### mixed

Часть документов общая, часть сервисная.

---

# 39. Обновление Node.js

Node.js на VPS изменяется только как отдельная инфраструктурная модификация.

После изменения:

1. определить новую точную version;
2. обновить `.node-version`;
3. обновить документацию;
4. обновить `deploy/project.json`;
5. проверить локальную Node version;
6. выполнить clean `npm ci`;
7. выполнить полный `verify:release`;
8. проверить production build;
9. выполнить controlled deployment.

Обновление Node.js не смешивается с обычным функциональным deployment без необходимости.

---

# 40. Правила Codex

Codex обязан:

1. читать `docs/AI_RUN_PROJECT_STANDARD.md`;
2. читать `AGENTS.md`;
3. читать `TECHNICAL_SPECIFICATION.md`;
4. читать `docs/DEVELOPMENT_PLAN.md`;
5. работать строго по текущему этапу;
6. обновлять документацию вместе с кодом;
7. автоматически создавать локальный Git commit после завершённого изменения;
8. не push без прямого поручения;
9. не раскрывать secrets;
10. не менять production data обычным deployment;
11. не создавать функции, отсутствующие в ТЗ;
12. не создавать абстрактные integrations «на будущее»;
13. при обнаружении противоречия между проектными документами остановить затронутую работу и запросить решение пользователя.

---

# 41. Приоритет документов

При конфликте применяется следующий приоритет:

```text
1. Явное последнее решение пользователя
2. TECHNICAL_SPECIFICATION.md
3. docs/AI_RUN_PROJECT_STANDARD.md проекта
4. AGENTS.md
5. docs/DEVELOPMENT_PLAN.md
6. README.md
7. deployment-инструкции
8. комментарии в коде
```

Но Codex не должен самостоятельно «разрешать» существенный конфликт молча.

Он обязан:

1. назвать противоречащие положения;
2. описать последствия вариантов;
3. задать пользователю вопрос;
4. после решения обновить все затронутые документы одним связным изменением.

---

# 42. Запрещённые действия

Без явного решения запрещено:

- использовать один port двумя проектами;
- использовать один Playwright port двумя проектами;
- использовать одну SQLite двумя проектами;
- использовать `.env` другого проекта;
- использовать system prompt другого проекта;
- заменять production DB локальной;
- добавлять production secret в Git;
- выполнять deployment из dirty worktree;
- deploy commit, не прошедший verification;
- менять другие Nginx sites;
- удалять чужие systemd services;
- публиковать application ports;
- использовать `0.0.0.0` для application server;
- автоматически обновлять Node.js;
- автоматически обновлять copied project standard;
- использовать `git commit --no-verify`;
- выполнять push без прямого поручения;
- выполнять production migration без backup/checkpoint policy.

---

# 43. Приёмка нового проекта

Перед завершением создания проекта должно быть подтверждено:

- [ ] проект записан в `C:\_Codex\AI_RUN_PROJECTS.json`;
- [ ] параметры уникальны;
- [ ] Node version получена с VPS;
- [ ] стандарт скопирован в проект;
- [ ] `AGENTS.md` создан;
- [ ] ТЗ создано и согласовано;
- [ ] development plan соответствует ТЗ;
- [ ] `docs/DEPLOYMENT_ROOT.md` создан;
- [ ] `docs/DEPLOYMENT_UPDATE.md` создан;
- [ ] README создан;
- [ ] `deploy/project.json` заполнен;
- [ ] `.env.example` не содержит secrets;
- [ ] `.env` и `data/` игнорируются Git;
- [ ] hooks установлены;
- [ ] `npm run verify:release` проходит;
- [ ] application port слушает только loopback;
- [ ] Nginx config изолирован;
- [ ] HTTPS работает;
- [ ] systemd service работает от root с hardening;
- [ ] health работает;
- [ ] ready работает;
- [ ] persistent data переживают restart/deploy;
- [ ] обычный deployment не заменяет `.env`, DB и system prompt;
- [ ] rollback procedure проверена;
- [ ] backup policy описана;
- [ ] все изменения зафиксированы локальными Git commits.

---

# 44. Минимальный workflow нового проекта

```text
1. Пользователь инициирует новый проект
2. Codex читает головной стандарт и реестр
3. Codex спрашивает параметры
4. Codex получает Node version с VPS
5. Codex проверяет conflicts
6. Codex обновляет AI_RUN_PROJECTS.json
7. Codex создаёт C:\_Codex\<slug>
8. Создаёт каталог docs и копирует docs/AI_RUN_PROJECT_STANDARD.md
9. Создаёт AGENTS.md
10. Формирует TECHNICAL_SPECIFICATION.md
11. Согласовывает критичные требования
12. Создаёт docs/DEVELOPMENT_PLAN.md
13. Создаёт docs/DEPLOYMENT_ROOT.md
14. Создаёт docs/DEPLOYMENT_UPDATE.md
15. Создаёт README.md
16. Создаёт deploy/project.json
17. Создаёт application scaffold
18. Создаёт env contract
19. Устанавливает Git hooks
20. Реализует проект по docs/DEVELOPMENT_PLAN.md
21. После каждого этапа проверки + local commit
22. verify:release
23. user-approved push
24. first deployment
25. production acceptance
```

---

# 45. Принцип стандарта

Главная цель:

> каждый сервис `ai-run.ru` должен быть технически самостоятельным, одинаково организованным, воспроизводимым, обновляемым и понятным Codex без необходимости восстанавливать договорённости из старых чатов.

Архитектурная унификация должна уменьшать сложность эксплуатации, но не должна заставлять каждый проект реализовывать ненужные integrations, workers, editors или дополнительные подсистемы.

Обязательная инфраструктура стандартизируется.

Предметный функционал определяется ТЗ.
