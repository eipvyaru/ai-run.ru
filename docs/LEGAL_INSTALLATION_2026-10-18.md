# Локальная установка юридического комплекта A–F

Владелец утвердил комплект 18.10.2026. Статус: `APPROVED_AWAITING_PUBLICATION`. Дата применения в исходниках: 01.11.2026. Это локальная техническая подготовка, не production-публикация. Первичное уведомление РКН не подано.

Источник: `AI_RUN_UNIFIED_LEGAL_A_F_ROOT_SOURCE_2026-10-18.zip`, SHA-256 `3e9b17fb20042ddd560aca49a2dfb8b8d15691d4ff336afdd84dd5891f3fb06b`. Неизменный архив и распаковка хранятся локально в игнорируемом Git каталоге `_incoming/ai-run-unified-legal-20261018/`.

| Архивный путь | Путь проекта | Маршрут |
| --- | --- | --- |
| `legal/01_SELF_EMPLOYED_OPERATOR_DETAILS.md` | `legal/01_SELF_EMPLOYED_OPERATOR_DETAILS.md` | `/legal/operator` |
| `legal/02_PUBLIC_OFFER.md` | `legal/02_PUBLIC_OFFER.md` | `/legal/offer` |
| `legal/03_PERSONAL_DATA_POLICY.md` | `legal/03_PERSONAL_DATA_POLICY.md` | `/legal/privacy` |
| `legal/04_PERSONAL_DATA_CONSENT.md` | `legal/04_PERSONAL_DATA_CONSENT.md` | `/legal/personal-data-consent` |
| `legal/05_COOKIE_POLICY.md` | `legal/05_COOKIE_POLICY.md` | `/cookies` |
| `legal/06_THIRD_PARTY_DATA_RULES.md` | `legal/06_THIRD_PARTY_DATA_RULES.md` | `/legal/third-party-data` |
| `legal/07_PERSONAL_DATA_SECURITY_INFORMATION.md` | `legal/07_PERSONAL_DATA_SECURITY_INFORMATION.md` | `/legal/data-security` |
| `legal/08_PD_PROCESSING_INSTRUCTION_OPTIONAL.md` | `legal/08_PD_PROCESSING_INSTRUCTION_OPTIONAL.md` (Git-ignored) | нет |
| `internal_legal/**` | `internal_legal/**` (Git-ignored) | нет |
| `README_PACKAGE.md`, `MANIFEST_SHA256.txt` | `_incoming/ai-run-unified-legal-20261018/extracted/` (Git-ignored) | нет |

Реестр фактических хэшей публичных источников: [LEGAL_REGISTRY_2026-10-18.json](LEGAL_REGISTRY_2026-10-18.json). Все импортированные файлы совпадают с манифестом побайтово. Семь Markdown-файлов находятся вне `public/` и рендерятся одним компонентом с отключённым сырым HTML и фильтрацией URL ссылок. Документ 08 и `internal_legal` исключены из standalone-трассировки.

Отличия от прежнего состояния: старый публичный `public/privacy-policy.txt` удалён; его локальная резервная копия `_incoming/.../legacy/privacy-policy.txt` удалена после решения владельца. `/privacy-policy` — только постоянный redirect на `/legal/privacy`, не отдельный документ; ссылки чата и футера направлены на новый маршрут. Точный текст checkbox, его версия и уже зарегистрированные доказательства согласия не изменены. Новый документ согласия 04 специфичен для Cover Letter и сам по себе не заменяет согласие на сайте `ai-run.ru`.

Утверждение комплекта не является разрешением на push/deployment: перед production остаются DoR, self-verification, ChatGPT Acceptance Review и отдельное разрешение на публикацию. В неизменённых источниках 01–03 встречаются редакционные фразы «для утверждения OWNER»; они сохранены ради точного соответствия одобренному пакету и его хэшам. Если для production нужна редакция без этих фраз, требуется новый утверждённый исходный пакет и реестр. Для `cover-letter` передать OWNER/ChatGPT только реестр URL/версий/хэшей, не копии Markdown. Не включать аналитику без отдельного локального `/privacy-settings` и согласия на соответствующем сайте.
