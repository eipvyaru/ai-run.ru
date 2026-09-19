# Первичное развёртывание

## 1. Идентичность проекта

`ai-run.ru`, service `ai-run-ru`, application port `8787`, VPS `170.168.112.47:22`, Node.js `v24.21.0`.

## 2. Требования к VPS

Ubuntu LTS, Node.js/npm указанной версии, Nginx, systemd, Certbot, Git и актуальный внешний backup VPS.

## 3. Проверка Node.js

Проверить `node --version`, `npm --version`, `command -v node`, `command -v npm`. Версия Node.js должна быть `v24.21.0`.

## 4. GitHub repository

Используется `eipvyaru/ai-run.ru`. Push выполняется только по прямому поручению.

## 5. Read-only deploy key

Создать отдельный deploy key без write access и проверить чтение repository.

## 6. Подготовка каталогов

Создать `/var/www/ai-run.ru`, `/var/lib/ai-run.ru`, `/var/lib/ai-run.ru/prompt-history`, `/var/cache/ai-run.ru`.

## 7. Первое клонирование

Клонировать repository в `/var/www/ai-run.ru` и checkout конкретного проверенного release commit.

## 8. Передача .env

Передать `data/.env.vps` отдельно как `/var/www/ai-run.ru/.env`, права `600`. Не выводить содержимое в консоль.

## 9. Передача system prompt

Установить отдельно в `/var/lib/ai-run.ru/system_prompt.md`, права `600`; сохранить предыдущую версию при обновлении.

## 10. Установка зависимостей

Выполнить `npm ci` под Node.js v24.21.0.

## 11. Build

Выполнить lint, typecheck, tests и `npm run build` без production-вызовов интеграций.

## 12. Миграции

Проверить актуальность VPS backup, затем выполнить `npm run db:migrate` с production `DATABASE_PATH`.

## 13. Next.js cache

Каталог `.next` создаётся build; приложение не пишет в исходный каталог во время работы.

## 14. systemd

Установить main service, worker service и timer из `deploy/systemd`, затем daemon-reload, enable и start.

## 15. Nginx HTTP

Установить только конфиг проекта, выполнить `nginx -t`, включить site и reload. Не изменять другие sites.

## 16. DNS

Направить `ai-run.ru` и при необходимости `www.ai-run.ru` на `170.168.112.47`, проверить HTTP.

## 17. Certbot / HTTPS

Только после HTTP выполнить Certbot, проверить certificate, renew timer и dry-run.

## 18. Production checks

Проверить HTTPS, `/api/health`, `/api/ready`, loopback bind, публичные страницы, admin login и по одному контролируемому тесту LLM/CalDAV/SMTP.

## 19. Backup assumptions

Application-level backup отсутствует. Обязателен внешний backup VPS; перед опасной миграцией требуется актуальный checkpoint.

## 20. Диагностика первого запуска

Проверять `systemctl status`, `journalctl -u`, timer, Nginx error log, env paths и права. Не публиковать секреты и ПДн из логов.
