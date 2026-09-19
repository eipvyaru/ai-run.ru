# Обновление production

## 1. Проверка локального release
Рабочее дерево чистое, `npm run verify:release` успешно.
## 2. Push commit в GitHub
Только после прямого поручения пользователя.
## 3. Проверка release commit
Зафиксировать полный `RELEASE_COMMIT`.
## 4. Подключение к VPS
`ssh -p 22 root@170.168.112.47`.
## 5. Проверка backup/checkpoint
Перед миграциями подтвердить актуальность внешнего VPS backup.
## 6. PREVIOUS_COMMIT
Сохранить текущий `git rev-parse HEAD`.
## 7. git fetch
Выполнить `git fetch --prune origin`.
## 8. checkout RELEASE_COMMIT
Выполнить detached checkout точного commit.
## 9. npm ci
Установить зависимости без изменения lockfile.
## 10. lint/typecheck/test/build
Выполнить полный набор проверок.
## 11. миграции
Применить только новые миграции; не заменять SQLite.
## 12. restart service
Перезапустить main service и timer, проверить status.
## 13. health/ready/HTTPS
Проверить оба endpoint и публичные страницы.
## 14. rollback
Checkout `PREVIOUS_COMMIT`, `npm ci`, build, restart. SQLite автоматически не откатывать.
## 15. диагностика
Проверить systemd/Nginx logs с redaction. Обычный update не заменяет `.env`, SQLite, system prompt или persistent data.
