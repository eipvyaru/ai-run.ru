# Docker Compose: AI-Run + Sherpa ASR

Документ добавляет альтернативную контейнерную упаковку для веб-приложения и внутреннего ASR-сервиса. Файлы Compose не меняют текущий systemd deployment и сами по себе не означают переключение production на Docker.

## Состав и границы

- `Dockerfile` собирает Next.js standalone на Node.js `24.21.0` и запускает приложение непривилегированным пользователем.
- `asr/Dockerfile` собирает Python `3.12.3`, закреплённые зависимости из `asr/requirements.lock` и FFmpeg. Веса модели в образ не включаются.
- `compose.yaml` связывает приложение и ASR через закрытую Docker-сеть `ai-run-internal-services`. Порт ASR не публикуется на хосте; контейнер ASR не подключён к сети с исходящим интернетом.
- Только веб-приложение публикует `127.0.0.1:8787` (или заданный `APP_DOCKER_PORT`) для локального просмотра или Nginx.
- База, prompt и веса модели монтируются извне. Секреты передаются через `.env` во время запуска и не попадают в build context или image layers.
- Миграции SQL включены в образ приложения; перед production переходом их проверяют и применяют только после обязательного VPS backup/checkpoint.

## Локальный запуск в Windows

Нужны Docker Desktop с Docker Compose v2, созданный ранее `.env`, проверенная модель из `C:\_Codex\_Models\sherpa-onnx-nemo-transducer-punct-giga-am-v3-russian-2025-12-16` и `data/system_prompt.md`.

1. В `.env` задайте три необязательных для обычного Node запуска Compose-параметра. Пишите Windows пути с `/`:

   ```dotenv
   APP_DOCKER_PORT=8787
   AI_RUN_DATA_HOST_PATH=./docker-data
   ASR_MODEL_HOST_PATH=C:/_Codex/_Models/sherpa-onnx-nemo-transducer-punct-giga-am-v3-russian-2025-12-16
   ```

   `ASR_SERVICE_TOKEN` должен быть заполнен случайным секретом не короче 32 символов. Не публикуйте `.env` и не копируйте его в образ.

2. Создайте отдельный каталог данных контейнерного preview и скопируйте туда prompt. Не монтируйте локальный рабочий `data/` целиком: там могут находиться секретные env-файлы и настоящая база.

   ```powershell
   New-Item -ItemType Directory -Force docker-data | Out-Null
   Copy-Item data/system_prompt.md docker-data/system_prompt.md
   ```

   База `docker-data/ai-run.ru.sqlite` будет создана приложением и останется после остановки контейнеров.

3. Соберите образы и запустите оба сервиса:

   ```powershell
   docker compose up --build -d
   docker compose ps
   ```

4. Откройте `http://127.0.0.1:8787/`. Проверяйте readiness приложения на `/api/ready`, а ASR — по статусу healthcheck в `docker compose ps`. Первая загрузка модели может занять несколько минут.

Если порт 8787 уже занят локальным preview, временно укажите `APP_DOCKER_PORT=8788`; URL станет `http://127.0.0.1:8788/`. Остановка `docker compose down` сохраняет содержимое `docker-data`; удалять каталог для остановки не нужно.

Если ASR не готов, веб-приложение остаётся доступным и показывает ошибку/fallback в соответствии с текущим поведением. Проверьте путь модели и SHA-256 по `asr/model-manifest.json`; модельный контейнер не сможет прочитать файлы, если права хост-каталога запрещают чтение. На Linux подготовьте для модели каталоги с traversal/read permission для UID/GID 10001 (контейнерный `asr`), сохраняя сам mount read-only.

## Запуск на VPS

Перед container rollout сначала подтвердите backup/checkpoint VPS, свободные RAM/диск и поддержку Python wheel на целевой архитектуре. Ранее зафиксированный небольшой объём RAM VPS делает обязательным замер памяти Sherpa в контейнере; Compose не задаёт автоматический memory limit, который мог бы без проверки убить приложение или загрузку модели.

Для смены production runtime требуются отдельный утверждённый deployment точного commit, согласованное окно переключения и остановка конфликтующего systemd приложения и ASR. Не запускайте Compose production параллельно с systemd на тех же портах и базе. Подготовьте каталог данных с существующим `system_prompt.md` и БД контролируемым способом, например после остановки приложения и проверенного SQLite backup; не переиспользуйте существующую production DB без backup/checkpoint. Для контейнеров на Linux выставьте владельца writable data каталога UID 1000 (Node) и доступ к read-only model каталогу для UID/GID 10001 (ASR).

Параметры для `.env` на VPS:

```dotenv
APP_DOCKER_PORT=8787
AI_RUN_DATA_HOST_PATH=/var/lib/ai-run.ru/docker
ASR_MODEL_HOST_PATH=/var/lib/ai-run.ru/asr/models/gigaam-v3-punct
```

Секретный `.env` остаётся на VPS с ограниченными правами. Nginx может продолжить proxy на `127.0.0.1:8787`; ASR API не добавляется в Nginx. До переключения проверить образы, `/api/health`, `/api/ready`, `/ready` внутри ASR-сети, функциональность и потребление памяти. Инструкции systemd остаются действующими, пока отдельный production migration не согласован.

## Использование ASR другими сервисами семейства

Сеть `ai-run-internal-services` имеет стабильное имя и не маршрутизируется наружу. Другой backend-контейнер может быть подключён к этой сети и обращаться к ASR на `http://asr:8796`, передавая `X-ASR-Token` и `X-Request-ID`. Контейнер вызывающего сервиса должен получить секретный токен безопасно; его frontend/browser не должен обращаться к ASR напрямую. Для подключения отдельного Compose-проекта объявите эту сеть как внешнюю:

```yaml
networks:
  ai-run-internal-services:
    external: true
    name: ai-run-internal-services
```

И подключите backend service к ней. До выдачи другим продуктам токена следует согласовать учёт нескольких вызывающих сервисов и ротацию credentials; текущий API использует один общий токен.
