# Анализ проекта ChineseWeb

## Структура проекта
- **Бэкенд**: Node.js + Express + SQLite (Sequelize ORM)
- **Фронтенд**: Vanilla JS (ES6), без фреймворков
- **Данные**: HSK 1-6 (новые чистые JSON-файлы в корне)

> **Стратегическое решение**: БКРС пока не используется. Главная задача — внедрить новые списки HSK1-6.json, от старого (BKRS, hsk30_data.json, parse-скрипты) избавиться.

---

## Инвентаризация HSK данных

| Файл | Формат | Слов | Размер | Используется? |
|------|--------|------|--------|---------------|
| `HSK1.json` (корень) | `[{id, word, pinyin, translation}]` | 500 | 57 KB | **Нет** ← внедрить |
| `HSK2.json` (корень) | `[{id, word, pinyin, translation}]` | 769 | 124 KB | **Нет** ← внедрить |
| `HSK3.json` (корень) | `[{id, word, pinyin, translation}]` | 973 | 160 KB | **Нет** ← внедрить |
| `HSK4.json` (корень) | `[{id, word, pinyin, translation}]` | 998 | 166 KB | **Нет** ← внедрить |
| `HSK5.json` (корень) | `[{id, word, pinyin, translation}]` | 1,072 | 173 KB | **Нет** ← внедрить |
| `HSK6.json` (корень) | `[{id, word, pinyin, translation}]` | 1,140 | 185 KB | **Нет** ← внедрить |
| **Итого** | | **5,452** | **865 KB** | |

**Форматы унифицированы** ✅ — все 6 файлов теперь в формате `[{id, word, pinyin, translation}]`.

### Старые данные (под удаление)

| Файл | Описание | Статус |
|------|----------|--------|
| `data/hsk30_data.json` | Старый HSK 1-6 в плоском формате `[{level,...}]`, дублирует новые файлы | Удалить |
| `server/seed-bkrs.js` | Сидит BKRS из `data/bkrs_complete.json` | Удалить |
| `server/seed-hsk.js` | Сидит HSK из `hsk30_data.json` | Удалить/заменить |
| `seed.js` | Мёртвый файл (несуществующие модели) | Удалить |
| `parse_dabruks.py` – `parse_dabruks_v5.py` | Парсеры BKRS (5 версий) | Удалить |
| `parse_hsk_pdf.py` | Парсер HSK PDF | Удалить |
| `scripts/generate-seed.py` | Генератор seed-данных | Удалить |

---

## Критические ошибки (на сейчас)

| № | Ошибка | Файл | Серьёзность |
|---|--------|------|-------------|
| 1 | **HSK1-6.json не интегрированы** — чистые списки лежат в корне, ни один код их не читает | `HSK1.json` – `HSK6.json` | 🔴 Критическая |
| 2 | **Dictionary модель не готова под HSK** — нет поля pinyin, поля `russian_word`/`definition` семантически под BKRS | `server/models/Dictionary.js` | 🔴 Критическая |
| 3 | **Битый Docker healthcheck** — `http.get` требует `require('http')` | `Dockerfile:12` | 🟡 Высокая |
| 4 | **Нет .env файла** — только .env.example | корень | 🟡 Высокая |
| 5 | **Мусор от BKRS** — seed-bkrs.js ищет несуществующий `bkrs_complete.json`, 5 версий парсеров | `server/seed-bkrs.js`, `parse_dabruks*.py` | 🟡 Высокая |

---

## Ошибки высокого приоритета

| № | Ошибка | Файл |
|---|--------|------|
| 6 | ~~**Формат HSK1.json отличается**~~ ✅ Исправлено | `HSK1.json` |
| 7 | **Алгоритм SRS с ошибкой** — при quality=3 интервал сбрасывается до 1 дня (должен умножаться на EF), quality=4/5 почти идентичны | `server/srs.js:11-30` |
| 8 | **Нет валидации входных данных** — все роуты напрямую используют `req.body`/`req.query` | все роуты |
| 9 | **Frontend: prompt() для выбора списка** — плохой UX, блокирует интерфейс | `public/js/app.js:138` |
| 10 | **Test mode дважды загружает слова** — получает список снова для отправки результата review | `public/js/app.js:462-482` |
| 11 | **Отсутствует пиньин во фронтенде** — поля pinyin всегда пустая строка | `public/js/app.js:299,369,436` |
| 12 | **Нет rate limiting и авторизации** — API полностью открытый | `server/app.js` |
| 13 | **Словарь (Dictionary search) завязан на BKRS** — поиск по russian_word, поле definition для BKRS-описаний | `server/routes/dictionary.js`, `public/index.html` |

---

## Ошибки среднего приоритета

| № | Ошибка | Файл |
|---|--------|------|
| 14 | **Нет системы миграций** — только `sequelize.sync()` | `server/app.js:47` |
| 15 | **SQLite для продакшена** — не подходит для конкурентных записей | `server/database.js:6` |
| 16 | **Нет тестов** — package.json ссылается на `tests/api.test.js`, которого нет | `package.json:9` |
| 17 | **Frontend: нет индикаторов загрузки** — UX зависает во время API-запросов | `public/js/app.js` |
| 18 | **Error handling раскрывает внутренности** — `error.message` в ответе API | все роуты |

---

## Низкий приоритет / Технический долг

| № | Ошибка |
|---|--------|
| 19 | Git config не настроен (см. ROADMAP) |
| 20 | Нет тёмной темы и адаптации под мобильные |
| 21 | `console.log` в продакшен коде |
| 22 | `updatedAt: false` на StudyList, но `timestamps: true` |
| 23 | HskList модель/таблица — дублирует Dictionary после переезда на HSK, можно удалить |

---

## План исправления

### Фаза 1 — Интеграция HSK1-6 (главная задача)

#### 1. 🔧 Модель Dictionary — добавить pinyin и hsk_level  (✅ формат унифицирован) ✅
- [x] **1.1** Добавить поля в `server/models/Dictionary.js`:
  - `pinyin: STRING(100), allowNull: true`
  - `hsk_level: INTEGER, allowNull: true, index: true`
- [x] **1.2** Переименование `russian_word` обсуждаемо: не трогать (фронтенд использует `entry.russian_word`), маппить `translation` из JSON → `russian_word` при сиде
- [x] **1.3** Создать миграцию — `ALTER TABLE dictionary ADD COLUMN pinyin TEXT; ADD COLUMN hsk_level INTEGER;`
  - Либо: `sequelize.sync({ alter: true })` (рискованно для BKRS), **но** так как БД пересоздаётся — можно просто `sync()`
- [x] **1.4** Проверить, что `ignoreDuplicates` / `bulkCreate` в сиде работает с новыми полями

#### 2. 📜 Новый seed-hsk.js — загрузка HSK1-6.json
- [ ] **2.1** Создать `server/seed-hsk.js`:
  - Читает `HSK1.json`, `HSK2.json` … `HSK6.json` из корня проекта
  - Парсит как голый массив `[{id, word, pinyin, translation}]`
  - Добавляет `hsk_level` (1–6), `source: 'hsk'`, `char_length: word.length`
  - Маппит `translation` → `russian_word`, `word` → `chinese`
- [ ] **2.2** Дедупликация: если одно иероглиф встречается на нескольких уровнях — вставить все копии? Или брать первый уровень? Забить уровнем из файла (пользователь увидит при импорте).
- [ ] **2.3** Batch insert (BATCH_SIZE=500) с `ignoreDuplicates: true`
- [ ] **2.4** Прогресс-лог в консоль
- [ ] **2.5** Проверить, что не сидится повторно (проверка count по source='hsk' вместо всего dictionary)

#### 3. 🔗 Импорт HSK → StudyList (server/routes/studyLists.js)
- [ ] **3.1** `GET /hsk/available` — заменить `HskList.findAll({...})` на:
  ```js
  await Dictionary.findAll({
    attributes: ['hsk_level'],
    where: { source: 'hsk' },
    group: ['hsk_level'],
    order: [['hsk_level', 'ASC']]
  });
  // count: Dictionary.count({ where: { source: 'hsk', hsk_level } })
  ```
- [ ] **3.2** `POST /hsk/import/:level` — заменить `HskList.findAll({ where: { level } })` на:
  ```js
  const words = await Dictionary.findAll({ where: { source: 'hsk', hsk_level: level } });
  ```
- [ ] **3.3** Создание StudyListWord — без изменений (тот же `dictionary_id`)
- [ ] **3.4** Удалить строку `const { ... HskList } = require('../database');` из шапки файла

#### 4. 🧹 Удалить HskList модель и таблицу
- [ ] **4.1** Удалить файл `server/models/HskList.js`
- [ ] **4.2** В `server/database.js`:
  - Убрать строку `const HskList = require('./models/HskList')(sequelize);`
  - Убрать `HskList` из `module.exports`
- [ ] **4.3** В `server/app.js`:
  - Убрать `HskList` из `require('./database')`
  - В health endpoint заменить `HskList.count()` на `Dictionary.count({ where: { source: 'hsk' } })`
  - Поле `hsk_words` в JSON ответе оставить, переименовать в `hsk_loaded`
- [ ] **4.4** Удалить `require('../seed-hsk')` и `await seedHSK();` в `app.js` (заменить новым сидом)
- [ ] **4.5** В `docker-compose.yml` / стартовой логике — убедиться, что новый сид запускается при старте

#### 5. 🗑️ Удалить BKRS-мусор
- [ ] **5.1** Удалить: `server/seed-bkrs.js`
- [ ] **5.2** Удалить: `data/hsk30_data.json`
- [ ] **5.3** Удалить: `parse_dabruks.py`, `parse_dabruks_v2.py`, `parse_dabruks_v3.py`, `parse_dabruks_v4.py`, `parse_dabruks_v5.py`
- [ ] **5.4** Удалить: `parse_hsk_pdf.py`
- [ ] **5.5** Удалить: `scripts/` (всю директорию с `generate-seed.py`)
- [ ] **5.6** Удалить: `seed.js`
- [ ] **5.7** В `server/app.js` — убрать `require('./seed-bkrs')` и вызов `await seedBKRS()`
- [ ] **5.8** Проверить, что нигде нет `require` на удалённые файлы
- [ ] **5.9** Обновить `.gitignore` — удалить `data/bkrs_complete.json` (уже не нужен)

---

### Фаза 2 — Фронтенд

#### 6. 📺 Отображение пиньин
- [ ] **6.1** `public/js/app.js`:
  - `showStudyWord()`: `e.studyPinyin.textContent = word.pinyin || '';`
  - `showReviewWord()`: `e.reviewPinyin.textContent = word.pinyin || '';`
  - `showTestWord()`: `e.testPinyin.textContent = word.pinyin || '';`
- [ ] **6.2** Проверить стили для `.pinyin` в `style.css` (выделить, уменьшить шрифт, курсив или серый цвет)

#### 7. 📖 Словарь (dictionary search) под HSK
- [ ] **7.1** Убрать фильтр длины (`char_length`) — для HSK он неактуален
  - Либо оставить, но переименовать в «Кол-во иероглифов» и убрать из поиска (оставить только как опциональный фильтр)
- [ ] **7.2** Поиск: `WHERE chinese LIKE %q% OR russian_word LIKE %q%` — оставить как есть, работает для HSK
- [ ] **7.3** `GET /dictionary/random/any` — если не нужно для HSK, можно удалить роут
- [ ] **7.4** `GET /dictionary/search` — по умолчанию искать только `source='hsk'` (или source не фильтровать — в БД только HSK)
- [ ] **7.5** Добавить в UI краткую статистику HSK: "HSK 1: 500 слов, HSK 2: 769 слов…"

#### 8. 🪟 Заменить prompt() на модалку
- [ ] **8.1** Добавить `<div id="modal" class="modal hidden">` в `index.html` (заголовок, список чекбоксов/радио, кнопки «Добавить»/«Отмена»)
- [ ] **8.2** Стилизовать `.modal` в `style.css` (оверлей, центровка, z-index)
- [ ] **8.3** В `app.js`: функция `showListPicker(dictId, btn)` — открывает модалку со списками, при выборе вызывает `POST /study-lists/:id/words`
- [ ] **8.4** Убрать старый `prompt()`-код в `addToStudyList`

#### 9. ⏳ Индикаторы загрузки
- [ ] **9.1** Добавить в `index.html` глобальный спиннер `<div id="loading" class="hidden">⏳</div>`
- [ ] **9.2** В `api()`-хелпер в `app.js`: показывать `loading` перед fetch, скрывать после
- [ ] **9.3** Стилизовать `.loading` в `style.css` (фиксированное позиционирование, z-index макс)
- [ ] **9.4** Заменить необработанные `api()` вызовы без `.catch()` (в review, study)

#### 10. 🔄 Test mode — убрать двойную загрузку
- [ ] **10.1** В `handleTestAnswer`: убрать повторный `GET /study-lists/:id/words` — сохранить `testQueue` уже содержит `entry`, найти нужное слово по `entry.id` из `testQueue[testIndex]`
- [ ] **10.2** Заменить `const words = await api(...)` на прямую работу с `testQueue`

---

### Фаза 3 — Качество

#### 11. 🧮 Исправить алгоритм SRS (SM-2)
- [ ] **11.1** Правильный SM-2:
  - quality 0-2: `interval=1`, сброс `review_count=0`, `ef -= 0.2`
  - quality 3: `interval = currentInterval * ef` (не сброс!), `ef` без изменений
  - quality 4: `interval = currentInterval * ef`, `ef` без изменений
  - quality 5: `interval = currentInterval * ef`, `ef += 0.15`
  - Всегда `ef = clamp(1.3, 2.5)`
- [ ] **11.2** Убрать жёсткую последовательность 1→6 для первых просмотров — заменить на `if (reviewCount === 0) interval = 1; else interval = Math.round(currentInterval * ef);`

#### 12. 🛡️ Валидация входных данных
- [ ] **12.1** Установить пакет `express-validator` (или валидировать вручную)
- [ ] **12.2** Валидировать: `POST /study-lists` — `name` не пустой, не длиннее 100 символов
- [ ] **12.3** Валидировать: `POST /study-lists/:id/words` — `dictionary_id` число, существующий ID
- [ ] **12.4** Валидировать: `POST /study-lists/:id/review` — `word_id` число, `quality` 1-5
- [ ] **12.5** Валидировать: `GET /dictionary/search` — `limit` не больше 200, `offset` >= 0
- [ ] **12.6** Всегда отвечать 400 с человекочитаемым сообщением

#### 13. 🐳 Docker healthcheck
- [ ] **13.1** В `Dockerfile` заменить healthcheck на:
  ```dockerfile
  HEALTHCHECK --interval=30s --timeout=3s CMD node -e "require('http').get('http://localhost:3000/api/health', r => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1))"
  ```

#### 14. ⚙️ .env
- [ ] **14.1** Скопировать `.env.example` → `.env`
- [ ] **14.2** Проверить, что `dotenv` загружается в `app.js` (уже есть)
- [ ] **14.3** Добавить `.env` в `.gitignore`

#### 15. 🚦 Rate limiting
- [ ] **15.1** Установить `express-rate-limit`
- [ ] **15.2** Добавить глобальный лимит: `max: 100`, `windowMs: 15 * 60 * 1000`
- [ ] **15.3** Для `/api/dictionary/search` — лимит 30 запросов/мин (тяжёлый поиск)
- [ ] **15.4** Для `/api/study-lists/:id/review` — лимит 60 запросов/мин

#### 16. 🧪 Тесты
- [ ] **16.1** Создать `tests/api.test.js` с использованием `supertest`
- [ ] **16.2** Тест: health endpoint возвращает 200
- [ ] **16.3** Тест: создание списка + добавление слова + получение слов
- [ ] **16.4** Тест: импорт HSK уровня
- [ ] **16.5** Тест: SRS review submission
- [ ] **16.6** Тест: поиск по словарю
- [ ] **16.7** Тест: валидация (400 на неверные данные)
- [ ] **16.8** Добавить скрипт `npm test` в `package.json`