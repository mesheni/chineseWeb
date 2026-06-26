# Анализ проекта ChineseWeb — Дополнительные улучшения

> Создан: 2026-06-26 на основе полного аудита текущего состояния проекта

---

## 📊 Текущее состояние проекта

### ✅ Реализовано и работает

| Функция | Статус | Комментарий |
|---------|--------|-------------|
| HSK 1-6 словари | ✅ | 5,452 слова загружены из HSK1-6.json |
| Поиск по словарю | ✅ | Поиск по китайскому, русскому, пиньинь |
| CRUD списков | ✅ | Создание, просмотр, удаление списков |
| Study mode (изучение) | ✅ | Флип карточки, кнопки «Знаю»/«Не знаю», SRS интеграция |
| Review mode (повторение) | ✅ | SRS-повторение с качеством 1-5, флип карточки |
| Test mode (тестирование) | ✅ | 4 варианта ответа, SRS интеграция |
| HSK импорт | ✅ | Импорт уровней HSK 1-6 как списков |
| Статистика | ✅ | Базовая статистика: всего слов, изучено, на сегодня |
| Мобильная адаптация | ✅ | Responsive design, bottom navigation |
| Тёмная тема | ✅ | CSS custom properties, dark theme |
| Валидация API | ✅ | Проверка входных данных |
| Rate limiting | ✅ | Глобальный 100/15мин, поиск 30/мин, review 60/мин |
| Тесты API | ✅ | 18 тестов с supertest |
| Docker | ✅ | Dockerfile, docker-compose, healthcheck |

---

## 🐛 Найденные баги

### 🔴 Критические (ломают функциональность)

**1. Study mode: пиньинь виден ДО нажатия «Показать ответ»**
- **Файл:** `public/js/app.js:384`
- **Описание:** В `showStudyWord()` пиньинь устанавливается сразу при показе слова, хотя должен показываться только после флипа карточки. Это лишает смысла проверку «знаю ли я чтение».
- **Исправление:** Перенести установку пиньинь в обработчик `studyShowAnswer`.
- **Шаги:**
  1. Убрать `e.studyPinyin.textContent = word.pinyin || '';` из `showStudyWord()` (строка 384)
  2. Добавить в обработчик `studyShowAnswer` (после строки 398):
     ```js
     const word = studyQueue[studyIndex].entry;
     e.studyPinyin.textContent = word.pinyin || '';
     ```
  3. В `showStudyWord()` добавить: `e.studyPinyin.textContent = '';`
  4. **Проверка:** В Study mode пиньинь не виден до нажатия «Показать ответ».

**2. Review mode: «Начать заново» не перезапрашивает слова**
- **Файл:** `public/js/app.js:516-517`
- **Описание:** `reviewRestart` просто сбрасывает `reviewIndex = 0` и показывает те же уже пройденные слова. Не перезапрашивает `GET /review` с сервера для свежей выборки due-слов.
- **Исправление:** При рестарте заново вызывать `GET /:id/review`.
- **Шаги:**
  1. Заменить обработчики `e.reviewRestart` и `e.reviewRestartDone` на асинхронную функцию:
     ```js
     async function restartReview() {
       const listId = e.reviewListSelect.value;
       if (!listId) return;
       try {
         const data = await api(`${API}/study-lists/${listId}/review`);
         reviewQueue = data.words;
         reviewIndex = 0;
         if (reviewQueue.length) {
           e.reviewDone.classList.add('hidden');
           e.reviewControls.classList.remove('hidden');
           showReviewWord();
         } else {
           showReviewDone();
         }
       } catch (e) {
         alert('Ошибка: ' + e.message);
       }
     }
     e.reviewRestart.addEventListener('click', restartReview);
     e.reviewRestartDone.addEventListener('click', restartReview);
     ```
  2. **Проверка:** Начать review → ответить на все слова → нажать «Начать заново» — должен быть новый GET-запрос.

**3. Test mode: используется `found.list_id` вместо `testListId`**
- **Файл:** `public/js/app.js:589, 602`
- **Описание:** В `handleTestAnswer` используется `found.list_id`, но `found` ищется по `entry.id` в `testQueue`. Переменная `testListId` уже хранит правильный ID списка.
- **Исправление:** Заменить `found.list_id` на `testListId` в обоих местах.
- **Шаги:**
  1. В `handleTestAnswer()` заменить `found.list_id` на `testListId` в строках 589 и 602.
  2. **Проверка:** В Test mode SRS-данные отправляются с правильным `list_id`.

### 🟡 Высокого приоритета

**4. Авто-озвучка без согласия пользователя**
- **Файл:** `public/js/app.js`
- **Описание:** В Study/Review mode озвучка вызывается всегда при показе слова. Нет возможности отключить.
- **Исправление:** Добавить флаг `speakAutoEnabled` и кнопку-переключатель.
- **Шаги:**
  1. Добавить глобальную переменную: `let speakAutoEnabled = true;`
  2. В `showStudyWord()` и `showReviewWord()` заменить вызов `speakChinese()` на:
     ```js
     if (speakAutoEnabled && word.chinese) speakChinese(word.chinese);
     ```
  3. В `index.html` добавить кнопку: `<button id="speakToggle" class="speak-toggle" title="Авто-озвучка">🔊</button>`
  4. В CSS добавить стили для `.speak-toggle`
  5. В `app.js` добавить обработчик:
     ```js
     e.speakToggle?.addEventListener('click', () => {
       speakAutoEnabled = !speakAutoEnabled;
       e.speakToggle.textContent = speakAutoEnabled ? '🔊' : '🔇';
       e.speakToggle.classList.toggle('muted', !speakAutoEnabled);
       localStorage.setItem('speakAuto', speakAutoEnabled);
     });
     ```
  6. При загрузке читать `localStorage.getItem('speakAuto') === 'true'`
  7. **Проверка:** Нажать кнопку 🔊 — иконка меняется на 🔇, озвучка не играет. Обновить страницу — выбор сохраняется.

**5. LIKE инъекция символов `%` и `_`**
- **Файл:** `server/routes/dictionary.js:24`
- **Описание:** Пользовательский ввод напрямую подставляется в `[Op.like]`. Символ `%` работает как wildcard, `_` как любой один символ.
- **Исправление:** Экранировать `%`, `_`, `\\` в поисковом запросе.
- **Шаги:**
  1. Добавить функцию экранирования:
     ```js
     const escapeLike = (str) => str.replace(/[\\%_]/g, '\\$&');
     const safeQ = escapeLike(q);
     ```
  2. Заменить `%${q}%` на `%${safeQ}%` во всех условиях `Op.like`.
  3. **Проверка:** Ввести «%» — не должно найти все слова.

**6. Ошибки сервера раскрывают внутренние детали**
- **Файл:** `server/routes/dictionary.js:45`, `server/routes/studyLists.js`
- **Описание:** `error.message` возвращается клиенту. Может раскрыть структуру БД, пути файлов.
- **Исправление:** В production возвращать `{ error: 'Внутренняя ошибка сервера' }`.
- **Шаги:**
  1. Создать middleware-функцию:
     ```js
     function safeError(res, error, defaultMsg = 'Внутренняя ошибка сервера') {
       console.error(error);
       const msg = process.env.NODE_ENV === 'production' ? defaultMsg : error.message;
       res.status(500).json({ error: msg });
     }
     ```
  2. Заменить все `res.status(500).json({ error: error.message })` на `safeError(res, error)`.
  3. **Проверка:** В production видна только общая ошибка.

### 🟠 Среднего приоритета

**7. Review mode: кнопки качества без качества 2**
- **Файл:** `public/index.html:124-127`
- **Описание:** Кнопки: «Забыл»=1, «Тяжело»=3, «Нормально»=4, «Легко»=5. Качество 2 пропущено. По SM-2 качество 0-2 это провал (сброс интервала).
- **Исправление:** Добавить кнопку «Почти» (quality=2).
- **Шаги:**
  1. В `index.html` добавить:
     ```html
     <button id="reviewQuality2" class="review-quality hidden" data-quality="2">Почти</button>
     ```
  2. В CSS добавить стиль:
     ```css
     #reviewQuality2 { background: #f97316; }
     #reviewQuality2:hover { background: #ea580c; }
     ```
  3. **Проверка:** В Review mode кнопки: «Забыл»(1), «Почти»(2), «Тяжело»(3), «Нормально»(4), «Легко»(5).

**8. HSK import: нет индикатора прогресса**
- **Файл:** `server/routes/studyLists.js:253-262`
- **Описание:** Импорт HSK 6 в цикле по одному слову — медленно, нет прогресс-бара.
- **Исправление:** Использовать `bulkCreate` вместо цикла.
- **Шаги:**
  1. Заменить цикл на `bulkCreate`:
     ```js
     const records = words.map(w => ({
       list_id: list.id,
       dictionary_id: w.id,
       interval: 0, ease_factor: 2.5, next_review: new Date()
     }));
     for (let i = 0; i < records.length; i += 500) {
       await StudyListWord.bulkCreate(records.slice(i, i + 500), { ignoreDuplicates: true });
     }
     linked = records.length;
     ```
  2. **Проверка:** Импорт HSK 6 занимает секунды.

**9. Dictionary: `definition` всегда пустой для HSK-данных**
- **Файл:** `public/js/app.js:140`
- **Описание:** HSK JSON не содержит поля definition. Отображается пустая строка.
- **Исправление:** Не показывать блок `.dict-definition` если definition пуст.
- **Шаги:**
  1. Заменить строку 140:
     ```js
     ${sample.definition ? `<div class="dict-definition">${escHtml(sample.definition).slice(0, 200)}</div>` : ''}
     ```
  2. **Проверка:** В результатах словаря записи без definition не показывают пустой блок.

**10. Test mode: опции-дистракторы слишком простые**
- **Файл:** `public/js/app.js:568-569`
- **Описание:** Неправильные варианты выбираются случайным образом. Варианты могут быть совершенно непохожими.
- **Исправление:** Сортировать по длине — выбирать те, у которых длина перевода близка к правильному ответу.
- **Шаги:**
  1. В `generateTestOptions()` изменить алгоритм:
     ```js
     const sorted = [...new Set(wrong)].sort((a, b) => {
       return Math.abs(a.length - correct.length) - Math.abs(b.length - correct.length);
     });
     const shuffled = sorted.slice(0, 3);
     ```
  2. **Проверка:** Дистракторы похожи по длине на правильный ответ.

**11. CSS: нет активного состояния для кнопок навигации на мобильных**
- **Файл:** `public/css/style.css:126-155`
- **Описание:** `.nav-tab:hover` работает только на десктопе. На мобильных нет `:active` стиля.
- **Исправление:** Добавить `.nav-tab:active { background: var(--bg-card); }`.
- **Шаги:**
  1. В `style.css` добавить:
     ```css
     .nav-tab:active {
       background: var(--bg-card);
     }
     ```
  2. **Проверка:** На мобильном нажать на таб — должен появиться серый фон.

---

## 🎨 УЛУЧШЕНИЯ UI/UX

### 12. Нет переключателя тёмная/светлая тема
- **Описание:** Всегда тёмная тема. Нет accessibility для пользователей, предпочитающих светлый интерфейс.
- **Шаги:**
  1. В `style.css` дублировать CSS-переменные для светлой темы:
     ```css
     :root.light {
       --bg-body: #f1f5f9;
       --bg-app: #ffffff;
       --bg-card: #e2e8f0;
       --bg-card-hover: #cbd5e1;
       --text-main: #0f172a;
       --text-muted: #64748b;
       --text-accent: #2563eb;
     }
     ```
  2. В `index.html` добавить кнопку: `<button id="themeToggle" class="theme-toggle" title="Переключить тему">🌙</button>`
  3. В `app.js` добавить обработчик:
     ```js
     let darkTheme = localStorage.getItem('theme') !== 'light';
     function applyTheme() {
       document.documentElement.classList.toggle('light', !darkTheme);
       e.themeToggle.textContent = darkTheme ? '🌙' : '☀️';
     }
     e.themeToggle.addEventListener('click', () => {
       darkTheme = !darkTheme;
       localStorage.setItem('theme', darkTheme ? 'dark' : 'light');
       applyTheme();
     });
     applyTheme();
     ```
  4. **Проверка:** Нажать на кнопку — интерфейс переключается. Обновить страницу — выбор сохраняется.

### 13. Нет клавиатурных сокращений
- **Описание:** Нельзя использовать Enter для флипа карточки, цифры 1-5 для качества в review, стрелки для навигации.
- **Шаги:**
  1. В `app.js` добавить глобальный обработчик `keydown`:
     ```js
     document.addEventListener('keydown', (ev) => {
       const activeMode = document.querySelector('.mode.active')?.id;
       if (!activeMode) return;
       
       switch (activeMode) {
         case 'dictionary-mode':
           if (ev.key === 'Enter') doDictSearch(0);
           break;
         case 'study-mode':
           if (ev.key === ' ' || ev.key === 'Enter') {
             ev.preventDefault();
             if (!e.studyShowAnswer.classList.contains('hidden')) e.studyShowAnswer.click();
             else if (!e.studyNextBtn.classList.contains('hidden')) e.studyNextBtn.click();
           }
           break;
         case 'review-mode':
           if (ev.key === ' ' || ev.key === 'Enter') {
             ev.preventDefault();
             if (!e.reviewShowAnswer.classList.contains('hidden')) e.reviewShowAnswer.click();
           }
           if (['1','2','3','4','5'].includes(ev.key)) {
             const btn = document.querySelector(`.review-quality[data-quality="${ev.key}"]`);
             if (btn && !btn.classList.contains('hidden')) btn.click();
           }
           break;
         case 'test-mode':
           if (['1','2','3','4'].includes(ev.key)) {
             const btns = document.querySelectorAll('.test-option');
             const idx = parseInt(ev.key) - 1;
             if (btns[idx] && !btns[idx].disabled) btns[idx].click();
           }
           break;
       }
     });
     ```
  2. **Проверка:** В Study mode нажать Space — карточка переворачивается. В Review mode нажать 4 — отправляется quality=4.

### 14. Иконки навигации — emoji, а не SVG
- **Описание:** Emoji выглядят по-разному на разных ОС.
- **Шаги:**
  1. Создать простые inline SVG-иконки для каждой вкладки.
  2. Заменить в `index.html` emoji на SVG-код.
  3. **Проверка:** Иконки выглядят одинаково на всех ОС/браузерах.

### 15. Нет favicon
- **Описание:** Вкладка браузера показывает пустую иконку.
- **Шаги:**
  1. Создать SVG favicon с иероглифом 汉 или 中:
     ```svg
     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
       <rect width="64" height="64" rx="8" fill="#0f172a"/>
       <text x="32" y="44" font-size="36" text-anchor="middle" fill="#38bdf8" font-family="serif">汉</text>
     </svg>
     ```
  2. В `index.html` добавить:
     ```html
     <link rel="icon" type="image/svg+xml" href="/favicon.svg">
     ```
  3. **Проверка:** Во вкладке браузера отображается иероглиф.

### 16. Нет подтверждения при выходе из review/study/test
- **Описание:** При переключении вкладки во время сессии прогресс теряется.
- **Шаги:**
  1. В обработчике переключения вкладок добавить проверку:
     ```js
     const hasActiveSession = 
       (currentMode?.id === 'study-mode' && !e.studyContent.classList.contains('hidden')) ||
       (currentMode?.id === 'review-mode' && !e.reviewContent.classList.contains('hidden')) ||
       (currentMode?.id === 'test-mode' && !e.testContent.classList.contains('hidden'));
     
     if (hasActiveSession) {
       const cont = confirm('Прогресс текущей сессии будет потерян. Продолжить?');
       if (!cont) return;
     }
     ```
  2. **Проверка:** Начать review, переключиться на другую вкладку — появляется confirm.

### 17. Статистика слишком базовая
- **Описание:** Только 3 числа: всего слов, изучено, на сегодня. Нет графиков.
- **Шаги:**
  1. Подключить Chart.js CDN в `index.html`:
     ```html
     <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
     ```
  2. На сервере добавить эндпоинт `GET /:id/stats/daily` — возвращает количество review по дням за последние 30 дней.
  3. На фронте отрисовать canvas-график.
  4. **Проверка:** На вкладке «Стата» отображается график активности за 30 дней.

### 18. Словарь не показывает уровень HSK
- **Описание:** В результатах поиска нет информации об уровне HSK.
- **Шаги:**
  1. В `renderDictResults()` дополнить HTML entry бейджем HSK:
     ```js
     ${sample.hsk_level ? `<span class="dict-hsk-badge">HSK ${sample.hsk_level}</span>` : ''}
     ```
  2. В CSS добавить стиль для `.dict-hsk-badge`.
  3. **Проверка:** В результатах поиска рядом с переводом отображается «HSK 3», «HSK 5» и т.д.

### 19. Нет поиска по списку слов внутри режима просмотра списка
- **Описание:** При просмотре списка из 1000+ слов нет поиска/фильтрации.
- **Шаги:**
  1. В `index.html` добавить строку поиска:
     ```html
     <input type="text" id="listSearchInput" placeholder="Поиск в списке..." class="list-search-input" />
     ```
  2. В `app.js` добавить обработчик фильтрации.
  3. **Проверка:** В просмотре списка ввести текст — слова фильтруются в реальном времени.

---

## 📋 НЕДОСТАЮЩИЕ ФУНКЦИИ ДЛЯ ПОЛНОТЫ

### 20. Нет секции грамматики
- **Описание:** В ROADMAP заявлена грамматика. Полностью отсутствует.
- **Шаги:**
  1. Создать модель `GrammarRule` и `GrammarExercise`.
  2. Создать `server/routes/grammar.js` с CRUD.
  3. Добавить вкладку «Грамматика» в навигацию.
  4. Собрать 20-30 базовых грамматических правил HSK 1-3.
  5. **Проверка:** Можно просматривать правила грамматики и проходить тесты.

### 21. Нет примеров употребления слов
- **Описание:** HSK JSON содержит только word/pinyin/translation. Нет примеров предложений.
- **Шаги:**
  1. Дополнить HSK JSON полем `examples: [{chinese, russian}]`.
  2. Обновить модель `Dictionary` — добавить поле `examples` (JSON TEXT).
  3. Показать примеры на карточке и в словаре.
  4. **Проверка:** В словаре и на карточке отображаются примеры употребления.

### 22. Нет практики письма (stroke order)
- **Описание:** Приложение для изучения китайского без отработки написания иероглифов неполноценно.
- **Шаги:**
  1. Подключить HanziWriter (CDN или npm).
  2. Создать режим «Письмо» — показывать canvas с иероглифом, пользователь повторяет порядок черт.
  3. Добавить вкладку «Письмо».
  4. **Проверка:** Нажать на иероглиф — открывается анимация порядка черт.

### 23. Нет аудио-файлов (только TTS)
- **Описание:** Web Speech API не работает офлайн, качество зависит от ОС/браузера.
- **Шаги:**
  1. Кешировать TTS-аудио на сервере.
  2. На фронте — при первом воспроизведении загружать и кешировать аудио.
  3. **Проверка:** Озвучка работает без доступа к Web Speech API.

### 24. Нет listening comprehension (аудирование)
- **Описание:** Нет режима, где произносится слово, а пользователь выбирает перевод.
- **Шаги:**
  1. Создать режим «Аудирование» — копия Test mode, но с аудио вместо иероглифа.
  2. **Проверка:** В режиме аудирования проигрывается звук → пользователь выбирает перевод.

### 25. Нет экспорта/импорта списков
- **Описание:** Нельзя выгрузить список в JSON/CSV для бэкапа.
- **Шаги:**
  1. Добавить кнопку экспорта в `viewList()`.
  2. Добавить кнопку импорта JSON-файла.
  3. На сервере: эндпоинт `POST /api/study-lists/:id/import`.
  4. **Проверка:** Экспортировать список → удалить → импортировать → список восстановлен.

### 26. Нет ежедневной цели и streak
- **Описание:** Нет мотивационного механизма.
- **Шаги:**
  1. В `GET /:id/stats` добавить вычисление streak.
  2. Добавить настройку цели (например, 20 слов/день).
  3. Отображать в статистике и в review mode.
  4. **Проверка:** В статистике отображается streak и прогресс-бар дневной цели.

---

## 🔧 ТЕХНИЧЕСКИЙ ДОЛГ

### 27. `console.log` в production коде
- **Файлы:** `server/seed-hsk.js`, `server/app.js`
- **Шаги:**
  1. Установить `pino` (`npm install pino`).
  2. Создать `server/logger.js`.
  3. Заменить все `console.log` / `console.error` на `logger.info` / `logger.error`.
  4. **Проверка:** Логи имеют уровни, в dev — цветные, в prod — JSON.

### 28. Нет CI/CD
- **Описание:** Нет GitHub Actions для авто-тестов и сборки Docker.
- **Шаги:**
  1. Создать `.github/workflows/test.yml`.
  2. Создать `.github/workflows/docker.yml`.
  3. **Проверка:** После пуша PR на GitHub запускаются тесты и сборка Docker.

### 29. SQLite в production
- **Описание:** SQLite не подходит для конкурентных записей.
- **Шаги:**
  1. Создать `DATABASE.md` с инструкцией по миграции на PostgreSQL.
  2. Добавить поддержку `DB_DIALECT` в `server/database.js`.
  3. **Проверка:** При установке `DB_DIALECT=postgres` приложение работает с PostgreSQL.

### 30. Нет миграций БД
- **Описание:** `sequelize.sync()` не версионирует схему.
- **Шаги:**
  1. Установить `sequelize-cli`.
  2. Создать миграции для существующих моделей.
  3. Заменить `sequelize.sync()` на запуск миграций через `umzug`.
  4. **Проверка:** При изменении модели создаётся миграция, данные не теряются.

### 31. Frontend: дублирование id в HTML
- **Файл:** `public/index.html`
- **Описание:** ID `card`, `flashcard`, `card-front`, `card-back` не имеют префикса режима.
- **Шаги:**
  1. Переименовать: `#card` → `#studyCard`, `#flashcard` → `#studyFlashcard`.
  2. В `app.js` обновить все ссылки.
  3. **Проверка:** Все режимы работают после переименования.

### 32. Тесты используют ручной test runner вместо фреймворка
- **Файл:** `tests/api.test.js`
- **Описание:** Самописный `test()` без `before/after`, без таймаутов.
- **Шаги:**
  1. Установить Jest.
  2. Переписать `tests/api.test.js` в структуру Jest.
  3. Обновить `package.json`.
  4. **Проверка:** `npm test` запускает Jest.

---

## 📊 ПРИОРИТЕТЫ ДЛЯ БЛИЖАЙШЕГО СПРИНТА

| Приоритет | Пункты | Трудозатраты |
|-----------|--------|-------------|
| 🔴 P0 (critical bugs) | #1 (пиньинь до флипа), #2 (рестарт review), #3 (test list_id) | 1 час |
| 🔴 P1 (UX critical) | #4 (авто-озвучка), #5 (LIKE экранирование), #6 (error messages) | 1.5 часа |
| 🟡 P2 (security) | #7 (quality 2), #8 (прогресс импорта), #9 (definition), #10 (дистракторы), #11 (active state) | 2 часа |
| 🟢 P3 (UI improvements) | #12 (тема), #13 (сокращения), #14 (SVG иконки), #15 (favicon), #16 (подтверждение), #17 (статистика), #18 (HSK бейджи), #19 (поиск в списке) | 6 часов |
| 📋 P4 (features) | #20 (грамматика), #21 (примеры), #22 (письмо), #23 (аудио), #24 (аудирование), #25 (экспорт/импорт), #26 (streak) | 12+ часов |
| 🔧 P5 (tech debt) | #27 (logger), #28 (CI/CD), #29 (SQLite), #30 (миграции), #31 (id), #32 (Jest) | 8 часов |

---

## ✅ Выполненные пункты из PLAN_IMPROVEMENTS.md

### Пункты #1 и #2 (строки 10-29) — ВЫПОЛНЕНЫ

**#1. Study mode: карточка не переворачивается при «Показать ответ»**
- ✅ **Статус:** Выполнено
- ✅ **Проверка:** Строка 398: `document.getElementById('card').classList.add('flipped')`
- ✅ **Проверка:** Строка 394: `document.getElementById('card').classList.remove('flipped')` в `showStudyWord()`
- ✅ **Результат:** Карточка переворачивается анимацией при нажатии «Показать ответ», перевод виден на задней стороне

**#2. Study mode: перевод показан ДО нажатия «Показать ответ»**
- ✅ **Статус:** Выполнено (автоматически после фикса #1)
- ✅ **Проверка:** Перевод находится в `.card-back`, который скрыт до флипа карточки
- ✅ **Проверка:** CSS имеет `backface-visibility: hidden` и правильную 3D-трансформацию
- ✅ **Результат:** Перевод виден только после нажатия «Показать ответ»

---

## 📝 Запись для коммита

```
feat: verify study mode card flip and translation visibility

- Verify item #1: Card flip animation works correctly in study mode
  - Line 398: document.getElementById('card').classList.add('flipped')
  - Line 394: document.getElementById('card').classList.remove('flipped') in showStudyWord()
- Verify item #2: Translation is hidden until card flip
  - Translation is in .card-back with backface-visibility: hidden
  - CSS 3D transform ensures proper flip behavior
- Update PLAN_IMPROVEMENTS.md to mark items #1 and #2 as completed
- Create NEW_PLAN.md with comprehensive analysis of remaining bugs and improvements

Items verified: #1, #2 (lines 10-29 of PLAN_IMPROVEMENTS.md)
```
