# Development Plan

Статус: готов к выполнению после создания обязательного проектного scaffold  
Основание: `TECHNICAL_SPECIFICATION.md`  
Правило выполнения: этапы выполняются последовательно; после каждого этапа — проверки и отдельный локальный Git commit; push и production deployment только по прямому поручению пользователя.

## Этап 1. Project identity and mandatory documentation

**Цель**

Создать воспроизводимую основу проекта в соответствии с AI Run Project Standard.

**Результат**

- Проверена уникальность identity, портов, каталогов, systemd unit, Nginx host и GitHub repository.
- Центральный реестр дополнен VPS и Node.js-параметрами, если его схема это допускает.
- В проект без изменений скопирован стандарт под именем `AI_RUN_PROJECT_STANDARD.md`.
- Созданы `AGENTS.md`, `README.md`, `DEPLOYMENT_ROOT.md`, `DEPLOYMENT_UPDATE.md`, `.node-version` и `deploy/project.json`.
- Инициализирован локальный Git-репозиторий и установлены tracked hooks.

**Изменяемые компоненты**

Проектные документы, `.githooks`, `deploy/project.json`, центральный реестр проектов.

**Проверки**

- Identity одинаков во всех документах.
- Node.js равен `v24.21.0` локально и на VPS.
- Нет placeholders в identity.
- Нет секретов или пользовательских данных в tracked files.

**Критерий завершения**

Документальная проверка стандарта проходит, Git чист после commit.

**Git commit**

`Initialize AI-Run project documentation`

## Этап 2. Next.js scaffold and environment contract

**Цель**

Создать минимальное приложение и единый контракт конфигурации.

**Результат**

- Next.js 16, React 19, TypeScript strict, ESLint, Vitest и Playwright.
- Zod-схема всех переменных окружения.
- `.env.example` с безопасными пустыми/примерными значениями.
- `scripts/sync-vps-env.ps1` формирует `data/.env.vps`, не раскрывая secrets.
- Обязательные npm scripts: dev, lint, typecheck, test, build, start, db:migrate, smoke, verify:release, hooks:install.
- Сервер запускается только на loopback.

**Изменяемые компоненты**

`package.json`, lockfile, Next/TypeScript/ESLint/Vitest/Playwright config, `src/server/config`, scripts и env-файлы.

**Проверки**

`npm ci`, lint, typecheck, unit test и production build; отрицательные тесты отсутствующих/ошибочных env.

**Критерий завершения**

Чистая установка воспроизводится, приложение запускается с валидной конфигурацией и останавливается с понятной ошибкой при невалидной.

**Git commit**

`Create application scaffold and environment contract`

## Этап 3. Database, migrations and repositories

**Цель**

Создать надёжный слой хранения с разделением обычных ПДн, согласий, служебных данных и debug-лога.

**Результат**

- Реализованы последовательные migrations и migration runner.
- Созданы таблицы из раздела 9 ТЗ.
- Включены foreign keys, WAL и busy timeout.
- Consent records append-only на уровне repository; отзыв — отдельное событие.
- PII aliases стабильны только в пределах сессии.
- Реализована политика очистки обычных данных и лимит 100 debug-сессий.

**Изменяемые компоненты**

`migrations`, `src/server/db`, repositories, test fixtures.

**Проверки**

- Миграции на пустой и уже мигрированной БД.
- Constraint и transaction tests.
- Нельзя изменить существующее согласие штатным API.
- 101-я debug-сессия удаляет только самую старую.
- Очистка ПДн не удаляет evidence record согласия.

**Критерий завершения**

Repository integration tests проходят на временной SQLite; production DB не используется тестами.

**Git commit**

`Add database schema and persistence layer`

## Этап 4. Session, consent and privacy boundary

**Цель**

Обеспечить юридически и технически проверяемую границу начала обработки ПДн.

**Результат**

- Создаётся безопасная анонимная session cookie.
- До согласия backend не сохраняет текст и не вызывает LLM.
- Checkbox атомарно создаёт evidence record с точным текстом и версией.
- IP определяется только по доверенным Nginx headers.
- Добавлена модель запроса на отзыв/удаление и отдельное событие отзыва.

**Изменяемые компоненты**

Session/consent domain services, cookie helpers, consent API, IP resolution, retention services.

**Проверки**

- Подделка consent-состояния текстом не работает.
- Повторная отправка одного consent request идемпотентна.
- До согласия в БД и mock LLM нет текста пользователя.
- Evidence record содержит именно показанную версию текста.

**Критерий завершения**

Acceptance scenario «Согласие» и негативные privacy-тесты проходят.

**Git commit**

`Implement consent and session privacy boundary`

## Этап 5. Secretary state machine and LLM gateway

Дополнение от 18.10.2026: серверный шлюз поддерживает Responses API Yandex AI Studio для `deepseek-v4.1-flash/latest`. Настройки и ключ хранятся в `.env`; без ключа остаётся действующий маршрут. Проверки нового адаптера выполняются с подменённым HTTP-ответом, без платного вызова.

**Цель**

Отделить свободный диалог от доверенных системных действий и обеспечить выполнение hardened prompt.

**Результат**

- Реализован серверный state machine основного, ошибочного, переносного и отменного сценариев.
- LLM gateway использует endpoint и server-side model allowlist.
- System prompt читается только из внешнего runtime-файла.
- Имя и телефон заменяются aliases перед каждым запросом; ответ декодируется перед UI.
- Инструментальные результаты принимаются только от доменных функций приложения.
- Retry не дублирует сообщения и side effects.

**Изменяемые компоненты**

`src/server/domain/conversation`, `src/server/llm`, `src/server/prompts`, message repositories.

**Проверки**

- Все переходы state machine.
- Prompt injection и подделка `CONSENT_ACCEPTED`, `CALENDAR_RESULT`, `MEETING_CREATED`.
- Открытые имя/телефон отсутствуют в LLM request captures.
- LLM timeout/error не повреждает сессию или встречу.

**Критерий завершения**

Основной диалог проходит на fake LLM, а критические действия невозможно подтвердить только текстом модели.

**Git commit**

`Implement secure secretary conversation engine`

## Этап 6. Schedule engine and Yandex Calendar

**Цель**

Реализовать детерминированное расписание и безопасные календарные операции.

**Результат**

- Парсер пользовательского временного намерения получает текущую дату от приложения.
- Schedule engine проверяет Moscow timezone, lead time, horizon, day и рабочее окно.
- CalDAV discovery определяет выбранный календарь.
- Реализованы busy lookup, alternative search, create, update, move и cancel.
- Перед изменением выполняется повторная проверка.
- Локальная транзакция/idempotency защищает от повторного и двойного бронирования.

**Изменяемые компоненты**

Schedule domain, Yandex CalDAV adapter, meeting repository, calendar API handlers.

**Проверки**

- Границы рабочих окон, 24 часа и 28 дней.
- Переходы дат и московский часовой пояс.
- Занятый слот и максимум три альтернативы.
- Конкурентные запросы, повтор create/move/cancel.
- Fake CalDAV для обычных тестов; реальный smoke только явным флагом.

**Критерий завершения**

Acceptance scenarios свободного, занятого, недопустимого времени, переноса и отмены проходят без фиктивных результатов.

**Git commit**

`Add scheduling and Yandex Calendar integration`

## Этап 7. Safe website check and lead enrichment

**Цель**

Собрать минимальную информацию о компании без анализа содержимого сайта и без SSRF.

**Результат**

- URL нормализуется и проверяется только на техническую доступность.
- Запрещены private, loopback, link-local и metadata destinations, включая redirect и DNS rebinding cases.
- Ограничены протокол, timeout, redirects и размер ответа.
- Секретарь собирает только недостающие поля и не блокирует процесс при отсутствии сайта.

**Изменяемые компоненты**

URL validation/fetch module, lead domain service, conversation transitions.

**Проверки**

SSRF test matrix, redirect tests, недоступный/отсутствующий сайт, отсутствие анализа response body.

**Критерий завершения**

Внешний URL нельзя использовать для доступа к локальным ресурсам или передачи инструкций LLM.

**Git commit**

`Add protected website availability checks`

## Этап 8. Email outbox and inactivity worker

**Цель**

Гарантированно отправлять руководителю одно письмо после завершения или истечения сессии.

**Результат**

- Transactional outbox создаётся вместе с завершением сессии.
- Worker находит встречи с 10 минутами неактивности.
- SMTP adapter поддерживает утверждённые host/port/TLS credentials.
- Retry с ограничением и идемпотентностью не создаёт дубликаты.
- Исходные имя и телефон подставляются только непосредственно перед отправкой.

**Изменяемые компоненты**

Email formatter, SMTP adapter, outbox repository, worker entry point, systemd worker/timer template.

**Проверки**

- Normal completion и 10-minute expiration.
- Частичная анкета и поля «Не указано».
- SMTP failure/retry и защита от duplicate send.
- Fake SMTP в release verification.

**Критерий завершения**

Для каждой встречи возникает не более одного итогового письма соответствующей версии данных.

**Git commit**

`Add reliable email delivery and session expiry`

## Этап 9. Public landing, chat and privacy page

**Цель**

Создать продающий адаптивный интерфейс с единым путём к бронированию.

**Результат**

- Реализованы все смысловые блоки лендинга и ссылки на два примера.
- Первый экран соответствует v2.3: центральный контейнер до 1280 px, desktop-сетка 55/45 с оффером и рабочим чатом, последовательная одна колонка на tablet/mobile.
- Секции проблем, возможностей, примеров и процесса используют заданные адаптивные карточные сетки.
- Визуальный слой облегчён по принципу светлого B2B SaaS-интерфейса: светлый чат с тёмным header, светлая карточка ключевого тезиса и светлая сетка возможностей; тёмный фон оставлен для финального CTA и Footer.
- Для карточек, ссылок, полей и кнопок реализованы контрастные hover, focus, disabled и error-состояния с последовательным blue/purple accent.
- Основные CTA имеют контекстные подписи: «Назначить созвон» в Header, «Обсудить мою задачу» в Hero и «Найти, что можно передать AI» в финальном блоке. Все они переводят к единственному экземпляру текущего чата, подсвечивают его и управляют фокусом без создания новой сессии.
- Подключены предоставленные `public/logo.svg` и `public/favicon.svg`, настроены favicon metadata и корректные размеры логотипа.
- Реализованы состояния чата, consent checkbox, многострочное поле, сохранение текста при сетевой ошибке, time options, retry и подтверждения.
- Добавлен голосовой ввод через браузерный Web Speech API: он включается только после согласия, распознаёт русскую речь в поле, не отправляет текст автоматически и сообщает об ошибках/отсутствии поддержки.
- Создана публичная `/privacy-policy` с утверждённым текстом.
- В Footer размещена текстовая ссылка «Настройки» на защищённую страницу `/admin`.
- Добавлены metadata, canonical, Open Graph, robots и sitemap.

**Изменяемые компоненты**

`src/app`, UI components, styles, public assets, metadata and legal page.

**Проверки**

- Component/accessibility tests.
- Responsive viewport tests: desktop, tablet, mobile.
- Keyboard navigation, focus, link target и пустой checkbox.
- Основной индексируемый текст присутствует в HTML.

**Критерий завершения**

Публичные acceptance-сценарии выполняются во всех целевых viewport без горизонтальной прокрутки.

**Git commit**

`Build landing, secretary UI and privacy page`

## Этап 10. Admin authentication and administration UI

**Цель**

Предоставить минимальный защищённый интерфейс управления, не превращая его в CMS или CRM.

**Результат**

- Login/logout с rate limiting и secure admin session.
- Расписание редактируется с серверной валидацией.
- Согласия доступны только для чтения.
- Компактная основная панель объединяет расписание и отладку; ссылка на журнал согласий открывает отдельную защищённую вкладку `/admin/consents` с последними 500 записями.
- Debug mode можно включить/выключить.
- Экспорт формирует один `.txt` без открытых имени/телефона.
- Очистка требует явного подтверждения и затрагивает только debug-log.

**Изменяемые компоненты**

Admin auth, admin APIs/pages, schedule and log services, audit events.

**Проверки**

- Неавторизованный доступ и brute-force limiting.
- CSRF/Origin checks.
- Нельзя редактировать consent records или secrets.
- Export ordering/format/redaction.
- Clear не меняет consent, meeting, schedule и debug flag.

**Критерий завершения**

Admin acceptance scenarios проходят, публичный пользователь не получает административные данные.

**Git commit**

`Add secured minimal administration panel`

## Этап 11. Observability, health and retention jobs

**Цель**

Обеспечить безопасную эксплуатационную диагностику и выполнение политики хранения.

**Результат**

- `/api/health` проверяет процесс без внешних обращений.
- `/api/ready` проверяет DB, migrations и prompt.
- Структурированные redacted logs содержат request ID.
- Retention job удаляет просроченные обычные диалоги/ПДн, но сохраняет минимизированные consent evidence records.
- Запрос на удаление исполняется не позднее 30 дней и аудитируется без сохранения удалённых ПДн.

**Изменяемые компоненты**

Health handlers, logging, audit and retention jobs, operational scripts.

**Проверки**

- Health не вызывает LLM/Calendar/SMTP.
- Ready не раскрывает пути и secrets.
- Log snapshot не содержит cookies, prompt, passwords, имя или телефон.
- Retention boundary и withdrawal deletion tests.

**Критерий завершения**

Сервис диагностируется без раскрытия чувствительных данных; retention policy исполняется автоматически или контролируемой административной процедурой.

**Git commit**

`Add health checks logging and data retention`

## Этап 12. Full automated verification

**Цель**

Закрепить требования ТЗ воспроизводимыми тестами и release gate.

**Результат**

- Unit tests для domain/security logic.
- Integration tests для SQLite и fake integrations.
- Playwright E2E для публичного и admin flows.
- `npm run smoke` без платных или необратимых действий.
- `npm run verify:release` в чистом временном worktree.
- Release gate применяет миграции только к временной SQLite-БД и считает ненулевой код любого шага ошибкой.
- Secret scanning и tracked-sensitive-file checks в pre-commit.

**Изменяемые компоненты**

`tests`, Playwright fixtures, smoke/release scripts, Git hooks.

**Проверки**

Полная матрица 15 критериев приёмки ТЗ; `npm audit --omit=dev --audit-level=moderate`; lint, typecheck, tests, build; clean Git status в verification worktree. Текущая dev-only цепочка `eslint-config-next → fast-glob → micromatch → braces@3.0.3` отмечена GHSA-vfj7-8cjw-p6xm; на 21.10.2026 advisory не содержит исправленной версии braces.

**Критерий завершения**

`npm run verify:release` завершается успешно без использования production DB, реальных LLM calls, email или календарных изменений.

**Git commit**

`Complete automated release verification`

## Этап 13. Deployment configuration and local release candidate

**Цель**

Подготовить проверяемый release без изменения production.

**Результат**

- Systemd units запускают main app и необходимый background worker от root с hardening.
- Nginx публикует только 80/443 и проксирует на `127.0.0.1:8787`.
- Application port не доступен извне.
- Документированы установка `.env`, prompt, migrations, HTTPS, backup check, release commit и rollback.
- Обычный update не заменяет `.env`, SQLite и system prompt.

**Изменяемые компоненты**

`deploy/systemd`, `deploy/nginx`, deployment docs and scripts.

**Проверки**

Локальная валидация unit/config templates, clean release verification, документальная rollback rehearsal.

**Критерий завершения**

Существует чистый локальный release commit, готовый к user-approved push и отдельному первичному deployment.

**Git commit**

`Prepare production deployment configuration`

## Этап 14. User-approved deployment and production acceptance

**Цель**

Развернуть конкретный проверенный commit и подтвердить работу реальных интеграций.

**Результат**

- После отдельного поручения выполнены push и deployment указанного `RELEASE_COMMIT`.
- Настроены directories, read-only deploy key, `.env`, prompt, systemd, Nginx, DNS и HTTPS.
- Выполнен реальный контролируемый smoke LLM, CalDAV и SMTP.
- Проверены persistence, restart, update contract и rollback.

**Изменяемые компоненты**

Только согласованные production-конфигурации и отдельно передаваемые secrets/runtime data.

**Проверки**

- HTTPS, health, ready и SEO endpoints.
- Тестовая встреча: создание, обновление, перенос и отмена.
- Одно тестовое email.
- ПДн отсутствуют в LLM/debug/technical logs.
- Restart/deploy сохраняет DB, prompt и настройки.
- Certbot renew timer и dry-run.

**Критерий завершения**

Все production acceptance checks пройдены, release commit и rollback point зафиксированы, проектные документы соответствуют фактической инфраструктуре.

**Git commit**

Production deployment сам по себе не требует изменения кода. Если по итогам приёмки исправляются документы или код — отдельный связный commit после повторной полной проверки.

## Параметры, уточняемые внутри соответствующих этапов

Эти параметры не блокируют утверждение плана, но должны быть определены до включения реальных интеграций:

- SMTP port и режим TLS (`465/TLS` либо `587/STARTTLS`) — этап 8.
- Идентификатор/URL конкретной CalDAV collection после discovery — этап 6.
- Фактические значения `YANDEX_CALDAV_PASSWORD`, `SMTP_PASSWORD` и `ADMIN_PASSWORD` — только в локальном `.env`, никогда не в Git или чате.
- Брендовые ассеты варианта 1 установлены: `public/favicon.svg`, `public/favicon.ico` и собранный из нового значка и прежней надписи `public/logo.svg`. При обновлении значка логотип пересобирается через `node scripts/build-brand-logo.mjs`.

## Юридический пакет A–F от 18.10.2026

Локальная техническая интеграция семи юридических Markdown-маршрутов документирована в `docs/LEGAL_INSTALLATION_2026-10-18.md`; исторический реестр редакции 1.0.0 — `docs/LEGAL_REGISTRY_2026-10-18.json`. Владелец утвердил её 18.10.2026, она размещена при первом деплое; дата применения в источниках — 01.11.2026.

## Редактура юридического комплекта от 22.10.2026

Подготовлена локальная редакция 1.1.0 (`DRAFT_REVIEW`) семи публичных документов для ai-run.ru и сервисов того же оператора на поддоменах, ссылающихся на них. Убраны технические детали, названия моделей, номера программных релизов, планы и задания разработчику; обработка разделена по функциям. Для доказательств согласия принят срок действия согласия плюс 3 года после прекращения или отзыва. Отчёт: `docs/LEGAL_REVISION_2026-10-22.md`; текущий реестр: `docs/LEGAL_REGISTRY_2026-10-22.json`. Метаданные и локальное отображение используют новую версию и не приписывают ей прежнее утверждение. Production и доказательства прежних согласий этим изменением не затрагиваются. Автоматическое исполнение новых сроков и согласованность форм подпроектов требуют отдельной реализации/проверки до применения редакции.

## Уточнение юридического комплекта в интересах оператора от 22.10.2026

Текущая локальная редакция — 1.2.0, статус `DRAFT_REVIEW`, без изменения плановой даты 01.11.2026. Обзор: `docs/LEGAL_OPERATOR_REVIEW_2026-10-22.md`; текущий реестр `docs/LEGAL_REGISTRY_2026-10-22.json` заменяет локальную запись версии 1.1.0. В Оферте и правилах чужих данных закреплены подтверждение оснований пользователем, право запросить необходимые сведения, отклонить неправомерный запрос и ограничить доступ в пределах закона, а также законная защита от убытков. В Политике убраны гипотетические положения о трансграничной передаче; сохранены локализация и получатели. Удалены повторы об обязанностях оператора и правах третьих лиц; общий порядок обращений и обязательные нормы сохранены. Отдельные права на хранение необходимых доказательств ограничены законным основанием и сроками. Бизнес-логика, прежние согласия, production и секреты не менялись.

## Уточнение условия оплаты в Оферте от 22.10.2026

Текущая локальная редакция юридического комплекта — 1.2.1 (`DRAFT_REVIEW`). В разделе 5 Оферты общее обещание бесплатной подготовки писем заменено возможностью взимать плату за запросы и функции сервисов. Стоимость и условия сообщаются заранее и согласуются пользователем до оказания платной услуги. Реестр и существующая проверка версии обновлены; платёжная интеграция и фактические тарифы этим изменением не вводятся. Публикация не выполнялась.
