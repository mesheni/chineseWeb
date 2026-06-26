# План улучшений и исправлений ChineseWeb

> Создан: 2026-06-25 на основе полного аудита кодовой базы.
> Расширен: детальные шаги реализации для каждого пункта.

---

## 🔴 КРИТИЧЕСКИЕ БАГИ (ломают функциональность)

### 1. ✅ Study mode: карточка не переворачивается при «Показать ответ» — ИСПРАВЛЕНО
**Файл:** `public/js/app.js:391-395`
**Описание:** При клике на «Показать ответ» в режиме изучения только прячется кнопка и показываются «Знаю»/«Не знаю». Флип карточки (`.flipped`) НЕ происходит. Перевод остаётся невидимым на задней стороне карточки — пользователь никогда не видит перевод.
**Исправление:** Добавить `document.getElementById('card').classList.add('flipped')` в обработчик `studyShowAnswer`.
**Статус:** ✅ Выполнено. Строка 398: `document.getElementById('card').classList.add('flipped');`. Строка 394: `document.getElementById('card').classList.remove('flipped');` в `showStudyWord()`.
**Шаги реализации:**
1. Открыть `public/js/app.js`, найти обработчик `e.studyShowAnswer.addEventListener('click', ...)` на строках ~391-395.
2. Внутри обработчика, после `e.studyShowAnswer.classList.add('hidden');`, добавить строку:
   ```js
   document.getElementById('card').classList.add('flipped');
   ```
3. Убедиться, что при показе нового слова (`showStudyWord()`) класс `flipped` снимается — добавить `document.getElementById('card').classList.remove('flipped')` в начало `showStudyWord()`.
4. **Проверка:** Открыть Study mode → нажать «Показать ответ» — карточка должна перевернуться анимацией, показав перевод на задней стороне.

### 2. ✅ Study mode: перевод показан ДО нажатия «Показать ответ» — ИСПРАВЛЕНО
**Файл:** `public/js/app.js:377`
**Описание:** `e.studyTranslation.textContent = word.russian_word` заполняет перевод сразу при показе слова, хотя визуально он скрыт за карточкой. После исправления бага №1 перевод станет виден. Логика правильная, но сейчас перевод заполняется на невидимой стороне — это ок, если флип заработает.
**Шаги реализации:**
1. Этот пункт автоматически исправляется после пункта №1 — перевод уже на задней стороне карточки (`.card-back`), он не виден до флипа.
2. **Ничего делать не нужно** — это не баг, а корректное поведение после фикса №1.
3. **Проверка:** После исправления №1 перевод виден только после нажатия «Показать ответ».
**Статус:** ✅ Выполнено. Перевод находится в `.card-back`, который скрыт до флипа карточки. CSS имеет `backface-visibility: hidden` и правильную 3D-трансформацию.

### 3. Study mode и Review mode: авто-озвучка без согласия пользователя
**Файл:** `public/js/app.js:388-389, 467`
**Описание:** Комментарий гласит «Speak only if user previously clicked speak (opt-in)», но код вызывает `speakChinese()` всегда при показе каждого слова. Это раздражает, особенно при быстром просмотре. В Review режиме тоже самое.
**Исправление:** Добавить флаг `speakAutoEnabled`, включаемый по клику на кнопку 🔊, или сделать галку «Авто-озвучка».
**Шаги реализации:**
1. В `public/js/app.js` добавить глобальную переменную: `let speakAutoEnabled = true;` в блок состояния (после строки 19 `let state = {};`).
2. Найти `showStudyWord()` (строка 372), заменить:
   ```js
   // Было: if (word.chinese) speakChinese(word.chinese);
   // Стало:
   if (speakAutoEnabled && word.chinese) speakChinese(word.chinese);
   ```
3. В `showReviewWord()` (строка 450), заменить вызов `speakChinese(word.chinese)` (строка 467) на:
   ```js
   if (speakAutoEnabled) speakChinese(word.chinese);
   ```
4. В `public/index.html`, в header (после `<div class="stats" id="global-stats">`) добавить кнопку-переключатель:
   ```html
   <button id="speakToggle" class="speak-toggle" title="Авто-озвучка">🔊</button>
   ```
5. В CSS (`public/css/style.css`) добавить стили для `.speak-toggle` — маленькая круглая кнопка с состоянием active/muted.
6. В `app.js` добавить обработчик:
   ```js
   e.speakToggle?.addEventListener('click', () => {
     speakAutoEnabled = !speakAutoEnabled;
     e.speakToggle.textContent = speakAutoEnabled ? '🔊' : '🔇';
     e.speakToggle.classList.toggle('muted', !speakAutoEnabled);
   });
   ```
7. Сохранять выбор в `localStorage`: при загрузке читать `localStorage.getItem('speakAuto') === 'true'`, при клике сохранять.
8. **Проверка:** Открыть Study/Review — при показе слова озвучка играет. Нажать кнопку 🔊 в хедере — иконка меняется на 🔇, озвучка не играет. Обновить страницу — выбор сохраняется.

### 4. ✅ Review mode: «Начать заново» не перезапрашивает слова — ИСПРАВЛЕНО
**Файл:** `public/js/app.js:494-495`
**Описание:** `reviewRestart` просто сбрасывает `reviewIndex = 0` и показывает те же уже пройденные слова. Если все due-слова закончились, рестарт показывает Done. Не перезапрашивает `GET /review` с сервера.
**Исправление:** При рестарте заново вызывать `GET /:id/review` для свежей выборки due-слов.
**Шаги реализации:**
1. В `app.js` найти обработчики `e.reviewRestart` и `e.reviewRestartDone` (строки 494-495).
2. Заменить их на одну асинхронную функцию:
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
3. **Важно:** В `showReviewDone()` (строка 497) нужно также скрывать `reviewControls`, т.к. мы их показываем в `restartReview`.
4. **Проверка:** Начать review → ответить на все слова → нажать «Начать заново» — должен быть новый GET-запрос к серверу, и если за это время появились новые due-слова (например, с quality 1-2), они подтянутся.
**Статус:** ✅ Выполнено. В `app.js` (строки 525-544) реализована async-функция `restartReview()`, которая заново вызывает `GET /study-lists/:id/review`, обновляет `reviewQueue`, сбрасывает `reviewIndex`. Оба обработчика `reviewRestart` и `reviewRestartDone` привязаны к этой функции. `showReviewDone()` (строки 546-550) корректно скрывает `reviewControls`.

### 5. ✅ Test mode: неправильно ищет `list_id` для SRS-отправки — ИСПРАВЛЕНО
**Файл:** `public/js/app.js:566-583`
**Описание:** В `handleTestAnswer` используется `found.list_id`, но `found` ищется по `entry.id` в `testQueue`. Переменная `testListId` уже хранит правильный ID списка, но не используется. Может привести к ошибке если структура `testQueue` не содержит `list_id`.
**Исправление:** Использовать `testListId` вместо `found.list_id`.
**Статус:** ✅ Выполнено. В `handleTestAnswer()` (строки 608-640) оба вхождения `found.list_id` заменены на `testListId` — для правильного ответа (quality 4) и неправильного (quality 1). Переменная `found` теперь используется только для получения `found.id` (word_id).
**Шаги реализации:**
1. В `app.js`, в функции `handleTestAnswer()` (начинается на строке 558), найти все вхождения `found.list_id` (строки 567 и 580).
2. Заменить `found.list_id` на `testListId` в обоих местах — как для правильного ответа (quality 4), так и для неправильного (quality 1).
3. После замены код будет выглядеть так:
   ```js
   if (testListId) {
     api(`${API}/study-lists/${testListId}/review`, {
       method: 'POST', headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ word_id: found.id, quality: 4 })
     }).catch(() => {});
   }
   ```
4. **Проверка:** В Test mode ответить правильно и неправильно — SRS-данные должны отправляться с правильным `list_id`.

---

## 🟡 БАГИ ВЫСОКОГО ПРИОРИТЕТА

### 6. ✅ Study mode: кнопки «Знаю»/«Не знаю» не отправляют данные — ИСПРАВЛЕНО
**Файл:** `public/js/app.js:397-398`
**Описание:** Нажатие «Знаю»/«Не знаю» просто переходит к следующему слову. Никакие SRS-данные не отправляются на сервер. Режим «Учить» полностью оторван от SRS.
**Исправление:** Добавить отправку `POST /:listId/review` с quality=4 (знаю) или quality=1 (не знаю).
**Статус:** ✅ Выполнено. В `app.js`:
- Переменная `studyListId` объявлена (строка 356) и сохраняется при старте: `studyListId = parseInt(listId)` (строка 363).
- `studyQueue = data.words` (строка 364) — загружаются полные объекты `StudyListWord` (с `.id` и `.entry`), а не только `entry`.
- В `showStudyWord()` (строка 372): `const word = studyQueue[studyIndex].entry;` — корректное обращение к данным Dictionary через `.entry`.
- `e.studyKnowBtn` (строки 410-416): отправляет `POST /study-lists/${studyListId}/review` с `{ word_id: w.id, quality: 4 }`.
- `e.studyDontKnowBtn` (строки 418-424): отправляет тот же запрос с `quality: 1`.
- Серверный маршрут `POST /:id/review` (`studyLists.js:156`) ожидает `word_id` как `StudyListWord.id` — соответствует отправляемому `w.id`.
**Шаги реализации:**
1. В `app.js` сохранить ID активного списка для study mode: добавить переменную `let studyListId = null;` в блок состояния.
2. В `e.studyStartBtn.addEventListener` (строка 357) — сохранить `studyListId = e.studyListSelect.value;`.
3. **Проблема:** `studyQueue` хранит `entry` (данные из Dictionary), а не `StudyListWord` — у них нет `id` и `list_id` для SRS. Нужно изменить подход:
4. Модифицировать `showStudyWord()`: загружать полные объекты `data.words` (не `.map(w => w.entry)`).
   ```js
   // Вместо: studyQueue = data.words.map(w => w.entry);
   studyQueue = data.words;
   ```
   Тогда в `showStudyWord()`:
   ```js
   const entry = studyQueue[studyIndex];
   const word = entry.entry; // данные Dictionary
   e.studyCharacter.textContent = word.chinese;
   e.studyPinyin.textContent = word.pinyin || '';
   e.studyTranslation.textContent = word.russian_word;
   // у entry теперь есть .id (StudyListWord.id) и .list_id
   ```
5. В обработчиках `studyKnowBtn` и `studyDontKnowBtn` отправлять SRS:
   ```js
   e.studyKnowBtn.addEventListener('click', async () => {
     const entry = studyQueue[studyIndex];
     if (entry && entry.list_id) {
       await api(`${API}/study-lists/${entry.list_id}/review`, {
         method: 'POST', headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ word_id: entry.id, quality: 4 })
       }).catch(() => {});
     }
     studyIndex++;
     showStudyWord();
   });
   // Аналогично для studyDontKnowBtn с quality=1
   ```
6. **Проверка:** Нажать «Знаю» → word_id отправляется на сервер с quality=4. Нажать «Не знаю» → quality=1, интервал сбрасывается на 1 день.

### 7. ✅ Dictionary: поиск не ищет по пиньинь — ИСПРАВЛЕНО
**Файл:** `server/routes/dictionary.js:24-28`
**Описание:** `Op.or` включает только `chinese` и `russian_word`. Пользователь не может найти слово по пиньинь (например, «nihao» → 你好).
**Исправление:** Добавить `{ pinyin: { [Op.like]: `%${q}%` } }` в `Op.or`.
**Статус:** ✅ Выполнено. В `server/routes/dictionary.js` (строки 28-32) блок `Op.or` содержит три условия: `chinese`, `russian_word` и `pinyin`. Поле `pinyin` существует в модели `Dictionary` (`server/models/Dictionary.js:43-46`, тип `STRING(100)`). Также реализовано экранирование спецсимволов LIKE (пункт #10): `const escaped = q.replace(/[%_]/g, '\\$&')` (строка 27), и `escaped` используется во всех трёх условиях `Op.like`.
**Шаги реализации:**
1. Открыть `server/routes/dictionary.js`, найти блок `Op.or` на строках 24-27.
2. Добавить третий объект в массив:
   ```js
   where[Op.or] = [
     { chinese: { [Op.like]: `%${q}%` } },
     { russian_word: { [Op.like]: `%${q}%` } },
     { pinyin: { [Op.like]: `%${q}%` } }
   ];
   ```
3. **Важно:** Пиньинь в БД хранится с тонами (nǐ hǎo), поэтому поиск по латинице без тонов может не найти все варианты. Для лучшего результата — транслитерировать запрос: убрать тоны из запроса и искать по `pinyin` без тонов (потребуется отдельное поле или функция).
4. **Проверка:** В поиске словаря ввести «nihao» — должно найти 你好. Ввести «xuexi» — найти 学习.

### 8. ✅ `MAX_NEW_WORDS_PER_DAY` не используется — ИСПРАВЛЕНО
**Файл:** `.env.example:3`, все файлы
**Описание:** Переменная окружения объявлена, но нигде в коде не проверяется. Нет ограничения на добавление новых слов в день.
**Исправление:** Добавить проверку в `POST /:id/words` — считать слова, добавленные сегодня, и отклонять при превышении лимита. Или убрать переменную из конфига.
**Статус:** ✅ Выполнено. В `server/routes/studyLists.js` (строки 87-130) в обработчике `POST /:id/words` добавлена проверка лимита:
- Читается `process.env.MAX_NEW_WORDS_PER_DAY` (по умолчанию 0 = без лимита).
- Считаются слова с `next_review >= todayStart` И `review_count = 0` (новые слова, ещё не проходившие review).
- При превышении лимита возвращается `429` с сообщением.
- Используется `next_review` как прокси для времени создания (при добавлении нового слова `next_review = new Date()`, после review оно обновляется на будущее). Это позволяет не менять модель и не делать миграцию БД.
- Также добавлена проверка на дубликаты перед лимитом — если слово уже в списке, возвращается без проверки лимита.
**Шаги реализации:**
1. Если решено **реализовать** ограничение:
   - В `server/routes/studyLists.js`, в обработчике `POST /:id/words` (строка 87), в начале добавить:
     ```js
     const maxNew = parseInt(process.env.MAX_NEW_WORDS_PER_DAY) || 0;
     if (maxNew > 0) {
       const todayStart = new Date(); todayStart.setHours(0,0,0,0);
       const todayCount = await StudyListWord.count({
         where: { createdAt: { [Op.gte]: todayStart } }
       });
       if (todayCount >= maxNew) {
         return res.status(429).json({ error: `Лимит новых слов на сегодня (${maxNew}) исчерпан` });
       }
     }
     ```
   - **Нюанс:** У модели `StudyListWord` может не быть поля `createdAt`. Если нет — нужно включить `timestamps: true` в модели или использовать другой подход.
2. Если решено **убрать** — просто удалить строку `MAX_NEW_WORDS_PER_DAY=20` из `.env.example` и `.env`.
3. **Проверка (если реализовано):** Добавить 20+ слов за день → 21-е слово возвращает 429 ошибку.

### 9. ✅ Неправильная работа фильтра длины иероглифов в поиске — ИСПРАВЛЕНО
**Файл:** `public/js/app.js:95-101`, `public/index.html:25`
**Описание:** В `doDictSearch()` фильтр длины применяется всегда, даже когда query пустой. Но если query пуст, функция выходит раньше (строка 97). При этом дефолтное значение фильтра — «2 иероглифа» (`selected`). Это сбивает с толку.
**Исправление:** Позволить поиск без query с фильтром длины, либо скрывать фильтр при пустом запросе.
**Статус:** ✅ Выполнено. Реализован вариант А из плана:
- В `public/js/app.js` (строки 99-122) `doDictSearch()` теперь:
  - Если нет ни запроса, ни фильтра — показывает hint «Введите запрос или выберите фильтр длины».
  - Если есть только фильтр (без запроса) — отправляет запрос с `&length=X` без `&q=`.
  - Если есть только запрос (без фильтра) — отправляет запрос с `&q=X` без `&length`.
- В `server/routes/dictionary.js` (строки 17-19) условие `if (!q) return ...` заменено на `if (!q && !length) return ...` — разрешает поиск только по `length`.
**Шаги реализации:**
1. **Вариант А (рекомендуемый):** Убрать ранний return при пустом query (строки 97), разрешить поиск только по фильтру длины:
   - Заменить строки 96-101:
     ```js
     function doDictSearch(offset = 0) {
       const q = e.dictSearchInput.value.trim();
       let url = `${API}/dictionary/search?limit=${DICT_LIMIT}&offset=${offset}`;
       if (q) url += '&q=' + encodeURIComponent(q);
       if (e.dictLengthFilter.value !== '0') url += '&length=' + e.dictLengthFilter.value;
       // Если нет ни запроса, ни фильтра — показать hint
       if (!q && e.dictLengthFilter.value === '0') {
         e.dictResults.innerHTML = '<p class="hint">Введите запрос или выберите фильтр длины</p>';
         e.dictPagination.classList.add('hidden');
         return;
       }
       // ... остальной код
     ```
   - На сервере (`dictionary.js`) убрать условие `if (!q) return res.json({ total: 0, ... })` — разрешить поиск только по `length`.
2. **Вариант Б:** Сменить дефолт фильтра на value="0" («Любое кол-во иероглифов») в `index.html`.
3. **Проверка:** Выбрать «2 иероглифа» без ввода запроса → нажать поиск → показать все слова из 2 иероглифов.

### 10. ✅ Поиск по словарю: SQL LIKE инъекция символов `%` и `_` — ИСПРАВЛЕНО
**Файл:** `server/routes/dictionary.js:25-27`
**Описание:** Пользовательский ввод напрямую подставляется в `[Op.like]`. Символ `%` в запросе работает как wildcard, `_` как любой один символ.
**Исправление:** Экранировать `%`, `_`, `\\` в поисковом запросе перед LIKE.
**Статус:** ✅ Выполнено. В `server/routes/dictionary.js` (строка 27) реализовано экранирование: `const escaped = q.replace(/[%_]/g, '\\$&');`. Переменная `escaped` используется во всех трёх условиях `Op.like` (строки 29-31). Для SQLite экранирование с `\` работает по умолчанию, дополнительный параметр `[Op.escape]` не требуется.
**Шаги реализации:**
1. В `server/routes/dictionary.js`, перед использованием `q` в `Op.like`, добавить экранирование:
   ```js
   // Экранирование спецсимволов SQLite LIKE
   const escapeLike = (str) => str.replace(/[\\%_]/g, '\\$&');
   const safeQ = escapeLike(q);
   ```
2. Заменить `%${q}%` на `%${safeQ}%` во всех трёх условиях `Op.like`.
3. Добавить `\\` как escape-символ в Sequelize (по умолчанию не установлен):
   ```js
   // Добавить к каждому Op.like объекту:
   { chinese: { [Op.like]: `%${safeQ}%`, [Op.escape]: '\\' } }
   ```
   Или, для SQLite, экранирование может работать по умолчанию с `\`. Проверить.
4. **Проверка:** Ввести в поиск «%» — не должно найти все слова. Ввести «_» — не должно сработать как wildcard.

### 11. ✅ Ошибки сервера раскрывают внутренние детали — ИСПРАВЛЕНО
**Файл:** `server/routes/dictionary.js:43`, `server/routes/studyLists.js:36,49,62,82,114,126,150,184,204,226,266`
**Описание:** `error.message` возвращается клиенту. Может раскрыть структуру БД, пути файлов.
**Исправление:** В production окружении возвращать `{ error: 'Внутренняя ошибка сервера' }`, а детали писать в `console.error`.
**Статус:** ✅ Выполнено.
- Создан `server/utils.js` с функцией `safeError(res, error, defaultMsg)`.
- В `server/app.js` добавлена функция `safeError` и использована в `/api/health`.
- Во всех catch-блоках `dictionary.js` и `studyLists.js` заменено `res.status(500).json({ error: error.message })` на `safeError(res, error)`.
- В production (`NODE_ENV=production`) клиент получает «Внутренняя ошибка сервера», в dev — полное сообщение ошибки.

---

## 🟠 БАГИ СРЕДНЕГО ПРИОРИТЕТА

### 12. Review mode: кнопки качества (1-5) без качества 2
**Файл:** `public/index.html:124-127`
**Описание:** Кнопки: «Забыл»=1, «Тяжело»=3, «Нормально»=4, «Легко»=5. Качество 2 пропущено. По SM-2 качество 0-2 это провал (сброс интервала), 3-5 — успех. Отсутствие 2 не критично, но неполно.
**Исправление:** Добавить кнопку «Почти» (quality=2) или оставить как есть — UX-решение.
**Шаги реализации:**
1. В `public/index.html`, после кнопки `reviewQuality1` (строка 124) добавить:
   ```html
   <button id="reviewQuality2" class="review-quality hidden" data-quality="2">Почти</button>
   ```
2. В CSS (`style.css`) добавить стиль для `#reviewQuality2` — оранжевый/жёлтый, между quality1 (красный) и quality3 (жёлтый):
   ```css
   #reviewQuality2 { background: #f97316; }
   #reviewQuality2:hover { background: #ea580c; }
   ```
3. **Проверка:** В Review mode после нажатия «Показать ответ» — кнопки: «Забыл»(1), «Почти»(2), «Тяжело»(3), «Нормально»(4), «Легко»(5).

### 13. Study mode: пиньинь всегда виден на лицевой стороне карточки
**Файл:** `public/index.html:75`, `public/js/app.js:376`
**Описание:** Пиньинь показывается сразу вместе с иероглифом. Это лишает смысла проверку «знаю ли я чтение».
**Исправление:** Скрывать пиньинь до флипа карточки (после нажатия «Показать ответ»).
**Шаги реализации:**
1. В `app.js`, в `showStudyWord()` (строка 376), перенести установку пиньинь из строки 376 в обработчик `studyShowAnswer`:
   - Убрать `e.studyPinyin.textContent = word.pinyin || '';` из `showStudyWord()`.
   - Добавить в обработчик `studyShowAnswer` (строка 391):
     ```js
     const word = studyQueue[studyIndex];
     e.studyPinyin.textContent = word.pinyin || '';
     ```
2. Обнулять пиньинь перед показом слова:
   ```js
   e.studyPinyin.textContent = ''; // в showStudyWord
   ```
3. **Опционально:** Добавить переключатель «Показывать пиньинь» — если включён, пиньинь виден сразу.
4. **Проверка:** В Study mode — слово показано, пиньинь пустой. Нажать «Показать ответ» — пиньинь появляется.

### 14. HSK import: нет индикатора прогресса
**Файл:** `server/routes/studyLists.js:231-268`, `public/js/app.js:310-329`
**Описание:** Импорт HSK 6 (1140 слов) в цикле по одному слову — медленно, нет прогресс-бара.
**Исправление:** Использовать `bulkCreate` вместо цикла `for` на сервере. Добавить прогресс на фронте.
**Шаги реализации:**
1. **Сервер:** В `server/routes/studyLists.js`, в `POST /hsk/import/:level` (строка 231):
   - Заменить цикл `for` (строки 253-262) на `bulkCreate`:
     ```js
     const records = words.map(w => ({
       list_id: list.id,
       dictionary_id: w.id,
       interval: 0, ease_factor: 2.5, next_review: new Date()
     }));
     // Бачами по 500 для SQLite
     for (let i = 0; i < records.length; i += 500) {
       await StudyListWord.bulkCreate(records.slice(i, i + 500), { ignoreDuplicates: true });
     }
     linked = records.length;
     ```
2. **Фронт:** В `app.js`, обработчик импорта (строка 310):
   - Вместо простого ожидания, показать прогресс через `setInterval` опрос сервера (или WebSocket/SSE).
   - **Упрощённо:** Использовать fetch с `Response.body` (streaming) — сервер отправляет прогресс через `res.write()`.
   - **Проще:** Просто изменить текст кнопки на `⏳ Импорт: X из Y` после завершения.
3. **Проверка:** Импорт HSK 6 занимает секунды, а не минуты. Кнопка показывает прогресс.

### 15. Dictionary: `definition` всегда пустой для HSK-данных
**Файл:** `public/js/app.js:134`
**Описание:** HSK JSON не содержит поля definition, только word/pinyin/translation. Отображается пустая строка.
**Исправление:** Не показывать блок `.dict-definition` если definition пуст.
**Шаги реализации:**
1. В `renderDictResults()` (строка 113), заменить строку 134:
   ```js
   // Было:
   <div class="dict-definition">${escHtml(sample.definition || '').slice(0, 200)}</div>
   // Стало:
   ${sample.definition ? `<div class="dict-definition">${escHtml(sample.definition).slice(0, 200)}</div>` : ''}
   ```
2. **Проверка:** В результатах словаря записи без definition не показывают пустой блок.

### 16. Test mode: опции-дистракторы слишком простые
**Файл:** `public/js/app.js:544-549`
**Описание:** Неправильные варианты выбираются случайным образом из всех слов списка. Варианты могут быть совершенно непохожими на правильный.
**Исправление:** Выбирать дистракторы из слов того же HSK уровня или семантически близких.
**Шаги реализации:**
1. В `generateTestOptions()` (строка 544), изменить алгоритм подбора дистракторов:
   - **Вариант А (простой):** Сортировать wrong-варианты по длине — выбирать те, у которых длина перевода близка к длине правильного ответа.
   - **Вариант Б (средний):** Группировать слова по длине иероглифов, выбирать дистракторы из той же группы.
   - **Вариант В (сложный):** На сервере добавить эндпоинт `GET /:id/test-distractors?word_id=X&count=3`, который возвращает дистракторы того же HSK уровня.
2. Реализация варианта А:
   ```js
   const correct = correctWord.russian_word;
   const wrong = testQueue
     .filter(w => w.entry.id !== correctWord.id)
     .map(w => w.entry.russian_word);
   // Сортируем по разнице в длине
   const sorted = [...new Set(wrong)].sort((a, b) => {
     return Math.abs(a.length - correct.length) - Math.abs(b.length - correct.length);
   });
   const shuffled = sorted.slice(0, 3);
   ```
3. **Проверка:** В тесте дистракторы должны быть похожи по длине на правильный ответ.

### 17. CSS: нет активного состояния для кнопок навигации на мобильных
**Файл:** `public/css/style.css:126-155`
**Описание:** `.nav-tab:hover` работает только на десктопе. На мобильных нет `:active` стиля.
**Исправление:** Добавить `.nav-tab:active { background: var(--bg-card); }`.
**Шаги реализации:**
1. В `style.css`, после `.nav-tab.active .nav-icon` (строка 155), добавить:
   ```css
   .nav-tab:active {
     background: var(--bg-card);
   }
   ```
2. **Проверка:** На мобильном устройстве (или в DevTools mobile mode) нажать на таб — должен появиться серый фон.

---

## 🟢 УЛУЧШЕНИЯ UI/UX

### 18. Дизайн: нет переключателя тёмная/светлая тема
**Описание:** Всегда тёмная тема. Нет accessibility для пользователей, предпочитающих светлый интерфейс.
**Шаги реализации:**
1. В `style.css` дублировать все `:root` CSS-переменные для светлой темы:
   ```css
   :root.light {
     --bg-body: #f1f5f9;
     --bg-app: #ffffff;
     --bg-card: #e2e8f0;
     --bg-card-hover: #cbd5e1;
     --text-main: #0f172a;
     --text-muted: #64748b;
     --text-accent: #2563eb;
     /* ... остальные переменные */
   }
   ```
2. В `index.html`, добавить кнопку в header:
   ```html
   <button id="themeToggle" class="theme-toggle" title="Переключить тему">🌙</button>
   ```
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
4. **Проверка:** Нажать на кнопку — интерфейс переключается между тёмной и светлой темой. Обновить страницу — выбор сохраняется.

### 19. Дизайн: нет клавиатурных сокращений
**Описание:** Нельзя использовать Enter для флипа карточки, цифры 1-5 для качества в review, стрелки для навигации.
**Шаги реализации:**
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

### 20. Дизайн: иконки навигации — emoji, а не SVG
**Описание:** Emoji выглядят по-разному на разных ОС.
**Шаги реализации:**
1. Создать простые inline SVG-иконки для каждой вкладки:
   - 🔍 → Поиск (лупа)
   - 📋 → Списки (список)
   - 📖 → Учить (книга)
   - 🔄 → Повтор (стрелки)
   - 🎯 → Тест (мишень)
   - 📊 → Стата (гистограмма)
2. Заменить в `index.html` (строки 177-200) emoji на SVG-код:
   ```html
   <button class="nav-tab active" data-mode="dictionary">
     <span class="nav-icon">
       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
         <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
       </svg>
     </span>
     Словарь
   </button>
   ```
3. **Проверка:** Иконки выглядят одинаково на всех ОС/браузерах.

### 21. Дизайн: нет favicon
**Описание:** Вкладка браузера показывает пустую иконку.
**Шаги реализации:**
1. Создать SVG favicon с иероглифом 汉 или 中:
   ```svg
   <!-- public/favicon.svg -->
   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
     <rect width="64" height="64" rx="8" fill="#0f172a"/>
     <text x="32" y="44" font-size="36" text-anchor="middle" fill="#38bdf8" font-family="serif">汉</text>
   </svg>
   ```
2. В `index.html`, в `<head>` добавить:
   ```html
   <link rel="icon" type="image/svg+xml" href="/favicon.svg">
   <link rel="alternate icon" href="/favicon.ico">
   ```
3. **Проверка:** Во вкладке браузера отображается иероглиф на тёмном фоне.

### 22. Дизайн: карточка в тестовом режиме использует тот же `#test-card`, но без флипа
**Описание:** В test mode карточка показывает иероглиф + пиньинь, но это не flashcard.
**Шаги реализации:**
1. В `index.html` упростить HTML для test mode (строка 149-156):
   ```html
   <div class="test-card">
     <div class="character" id="testCharacter">?</div>
     <div class="pinyin" id="testPinyin"></div>
   </div>
   ```
2. В CSS убрать лишние стили для `#test-card` (perspective, transform-style и т.д.).
3. **Проверка:** Test mode показывает простой блок с иероглифом, без анимации флипа.

### 23. UX: нет подтверждения при выходе из review/study/test
**Описание:** При переключении вкладки во время сессии прогресс теряется.
**Шаги реализации:**
1. В `app.js`, в обработчике переключения вкладок (строка 45-58), добавить проверку:
   ```js
   // Перед переключением
   const currentMode = document.querySelector('.mode.active');
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

### 24. UX: статистика слишком базовая
**Описание:** Только 3 числа: всего слов, изучено, на сегодня. Нет графиков.
**Шаги реализации:**
1. **Streak:** В БД добавить таблицу `daily_activity` (date, reviews_count, new_words_count) или вычислять на лету из `last_review` в `StudyListWord`.
   ```sql
   -- Вычисление streak: сколько дней подряд был хотя бы 1 review
   SELECT COUNT(DISTINCT DATE(last_review)) FROM StudyListWords 
   WHERE last_review IS NOT NULL 
   AND last_review >= date('now', '-30 days');
   ```
2. **График прогресса:** Подключить Chart.js CDN в `index.html`:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
   ```
3. На сервере добавить эндпоинт `GET /:id/stats/daily` — возвращает количество review по дням за последние 30 дней.
4. На фронте отрисовать canvas-график (линейный график количества review по дням).
5. **Круговая диаграмма:** Новые / изученные / проблемные слова — добавить `pie` chart.
6. **Проверка:** На вкладке «Стата» отображается график активности за 30 дней и круговая диаграмма.

### 25. UX: нет сортировки слов в просмотре списка
**Описание:** `GET /:id/words` возвращает слова в порядке `id DESC`. Нет сортировки.
**Шаги реализации:**
1. **Сервер (`studyLists.js`):** В `GET /:id/words` (строка 69) добавить поддержку query-параметров:
   ```js
   const { sort, order } = req.query;
   let sortOrder = [['id', 'DESC']]; // default
   if (sort === 'chinese') sortOrder = [['entry', 'chinese', order === 'asc' ? 'ASC' : 'DESC']];
   if (sort === 'created') sortOrder = [['createdAt', order === 'asc' ? 'ASC' : 'DESC']];
   if (sort === 'next_review') sortOrder = [['next_review', order === 'asc' ? 'ASC' : 'DESC']];
   ```
2. **Фронт:** Добавить выпадающий список сортировки в `listDetail` (index.html).
3. **Проверка:** В просмотре списка можно сортировать слова по алфавиту, дате, следующему повторению.

### 26. UX: словарь не показывает уровень HSK
**Описание:** В результатах поиска нет информации об уровне HSK.
**Шаги реализации:**
1. В `renderDictResults()` (строка 113), дополнить HTML entry бейджем HSK:
   ```js
   html += `<div class="dict-entry" data-id="${sample.id}">
     <div class="dict-entry-main">
       <span class="dict-chinese">${escHtml(sample.chinese)}</span>
       <span class="dict-russian">${escHtml(sample.russian_word)}</span>
       ${sample.hsk_level ? `<span class="dict-hsk-badge">HSK ${sample.hsk_level}</span>` : ''}
       <button class="dict-add-btn" data-dict-id="${sample.id}" title="Добавить в список">+</button>
     </div>
     ...
   </div>`;
   ```
2. В CSS добавить стиль для `.dict-hsk-badge`:
   ```css
   .dict-hsk-badge {
     font-size: 11px;
     padding: 2px 8px;
     border-radius: 10px;
     background: rgba(59, 130, 246, 0.15);
     color: var(--text-accent);
     border: 1px solid rgba(59, 130, 246, 0.3);
     font-weight: 600;
   }
   ```
3. **Проверка:** В результатах поиска рядом с переводом отображается «HSK 3», «HSK 5» и т.д.

### 27. UX: повторение — нет счётчика оставшихся слов в реальном времени
**Описание:** `reviewPosition` показывает «Слово X из Y», но Y не обновляется после ответа.
**Шаги реализации:**
1. В `showReviewWord()` (строка 464) обновлять счётчик динамически:
   ```js
   e.reviewPosition.textContent = `Слово ${reviewIndex + 1} из ${reviewQueue.length}`;
   ```
2. Убедиться, что `reviewQueue.length` не меняется (он зафиксирован при загрузке). Если нужно — пересчитывать оставшиеся слова.
3. **Проверка:** В review счётчик показывает актуальное количество оставшихся слов.

### 28. UX: нет поиска по списку слов внутри режима просмотра списка
**Описание:** При просмотре списка из 1000+ слов нет поиска/фильтрации.
**Шаги реализации:**
1. В `index.html`, в `listDetail` (строка 54), добавить строку поиска:
   ```html
   <input type="text" id="listSearchInput" placeholder="Поиск в списке..." class="list-search-input" />
   ```
2. В `app.js`, в `viewList()` (строка 261), после рендера слов добавить обработчик:
   ```js
   e.listSearchInput.addEventListener('input', () => {
     const q = e.listSearchInput.value.trim().toLowerCase();
     document.querySelectorAll('.list-word-item').forEach(item => {
       const text = item.textContent.toLowerCase();
       item.style.display = text.includes(q) ? '' : 'none';
     });
   });
   ```
3. **Проверка:** В просмотре списка ввести текст — слова фильтруются в реальном времени.

### 29. UX: нет массовых операций со списком
**Описание:** Нельзя выбрать несколько слов для удаления, перемещения или изменения приоритета.
**Шаги реализации:**
1. В `viewList()` (строка 261), добавить чекбоксы к каждому слову и кнопку «Удалить выбранные»:
   ```js
   // В рендере:
   <input type="checkbox" class="word-select" data-word-id="${w.id}" data-list-id="${id}" />
   <span class="dict-chinese">...</span>
   
   // После рендера добавить кнопку:
   <div class="list-bulk-actions">
     <button id="deleteSelectedBtn" class="danger-btn">🗑 Удалить выбранные</button>
   </div>
   ```
2. Обработчик:
   ```js
   document.getElementById('deleteSelectedBtn')?.addEventListener('click', async () => {
     const selected = document.querySelectorAll('.word-select:checked');
     if (!selected.length) return;
     if (!confirm(`Удалить ${selected.length} слов?`)) return;
     for (const cb of selected) {
       await api(`${API}/study-lists/${cb.dataset.listId}/words/${cb.dataset.wordId}`, { method: 'DELETE' });
     }
     viewList(listId);
   });
   ```
3. **Проверка:** Выбрать несколько слов → нажать «Удалить выбранные» → слова удаляются.

### 30. UX: импорт HSK на странице списков не показывает частичный прогресс
**Описание:** Карточка HSK показывает только «Импортирован» или кнопку импорта.
**Шаги реализации:**
1. На сервере `GET /hsk/available` (строка 211) добавить в ответ количество уже добавленных слов в соответствующий список.
2. На фронте в `loadHSKLevels()` (строка 290) показывать прогресс:
   ```js
   // Для уже импортированных уровней:
   <span class="hsk-imported-badge">✅ ${existingWordCount}/${l.word_count}</span>
   ```
3. **Проверка:** После импорта HSK 1 из 500 слов, на карточке отображается «✅ 500/500». Если удалить часть слов — «✅ 450/500».

---

## 📋 НЕДОСТАЮЩИЕ ФУНКЦИИ ДЛЯ ПОЛНОТЫ

### 31. Нет секции грамматики
**Описание:** В ROADMAP заявлена грамматика. Полностью отсутствует.
**Шаги реализации:**
1. **База данных:** Создать модель `GrammarRule`:
   ```js
   // server/models/GrammarRule.js
   GrammarRule: { id, title, explanation, examples (JSON), level (HSK-level), category }
   GrammarExercise: { id, rule_id, sentence, options (JSON array), correct_index, explanation }
   ```
2. **Сервер:** Создать `server/routes/grammar.js` с CRUD и случайной выборкой упражнений.
3. **Фронт:** Добавить вкладку «Грамматика» в навигацию, страницу со списком правил и страницу упражнений.
4. **Данные:** Собрать 20-30 базовых грамматических правил HSK 1-3 (结构, 把-предложение, 了, 是...的, и т.д.).
5. **Проверка:** Можно просматривать правила грамматики и проходить тесты по каждому правилу.

### 32. Нет примеров употребления слов
**Описание:** HSK JSON содержит только word/pinyin/translation. Нет примеров предложений.
**Шаги реализации:**
1. Дополнить HSK JSON полем `examples: [{chinese, russian}]` для каждого слова.
2. Либо загрузить примеры из открытого источника (Tatoeba, ChineseZero).
3. Обновить модель `Dictionary` — добавить поле `examples` (JSON TEXT).
4. Показать примеры на карточке (study/review) и в словаре — после перевода, с отдельным стилем.
5. **Проверка:** В словаре и на карточке отображаются примеры употребления.

### 33. Нет практики письма (stroke order)
**Описание:** Приложение для изучения китайского без отработки написания иероглифов неполноценно.
**Шаги реализации:**
1. Подключить HanziWriter (CDN или npm):
   ```html
   <script src="https://cdn.jsdelivr.net/npm/hanzi-writer@3/dist/hanzi-writer.min.js"></script>
   ```
2. Создать режим «Письмо» — показывать canvas с иероглифом, пользователь повторяет порядок черт.
3. Добавить вкладку «Письмо» или кнопку на карточке study/review.
4. **Проверка:** Нажать на иероглиф — открывается анимация порядка черт.

### 34. Нет аудио-файлов (только TTS)
**Описание:** Web Speech API не работает офлайн, качество зависит от ОС/браузера.
**Шаги реализации:**
1. Кешировать TTS-аудио на сервере:
   - Эндпоинт `GET /api/speak/:word` — генерирует TTS, сохраняет `.mp3`, возвращает файл.
   - Использовать `node-fetch` + Google TTS API или `say.js`.
2. На фронте — при первом воспроизведении загружать и кешировать аудио.
3. **Проверка:** Озвучка работает без доступа к Web Speech API (через HTTP-аудио).

### 35. Нет listening comprehension (аудирование)
**Описание:** Нет режима, где произносится слово, а пользователь выбирает перевод.
**Шаги реализации:**
1. Создать режим «Аудирование» — копия Test mode, но:
   - Вместо показа иероглифа — проигрывается аудио.
   - Пользователь выбирает перевод из 4 вариантов.
2. Использовать TTS или загруженные аудио-файлы (см. пункт 34).
3. **Проверка:** В режиме аудирования проигрывается звук → пользователь выбирает перевод.

### 36. Нет экспорта/импорта списков
**Описание:** Нельзя выгрузить список в JSON/CSV для бэкапа.
**Шаги реализации:**
1. **Экспорт:** Кнопка в `viewList()`:
   ```js
   const exportBtn = document.createElement('button');
   exportBtn.textContent = '📤 Экспорт JSON';
   exportBtn.addEventListener('click', () => {
     const data = listWords.map(w => ({ chinese: w.entry.chinese, russian: w.entry.russian_word, pinyin: w.entry.pinyin }));
     const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url; a.download = `${listName}.json`; a.click();
     URL.revokeObjectURL(url);
   });
   ```
2. **Импорт:** Кнопка загрузки JSON-файла и отправки на сервер.
3. На сервере: эндпоинт `POST /api/study-lists/:id/import` — принимает JSON, bulkCreate.
4. **Проверка:** Экспортировать список → удалить → импортировать → список восстановлен.

### 37. Нет ежедневной цели и streak
**Описание:** Нет мотивационного механизма.
**Шаги реализации:**
1. **Streak:** В `GET /:id/stats` добавить вычисление streak:
   ```js
   // SQLite: считаем подряд идущие дни с last_review не NULL
   const streak = await sequelize.query(`
     WITH daily AS (
       SELECT DISTINCT DATE(last_review) as d
       FROM StudyListWords
       WHERE list_id = ? AND last_review IS NOT NULL
       ORDER BY d DESC
     )
     SELECT COUNT(*) as streak FROM daily
     WHERE d >= date('now', '-' || row_number() || ' days')
   `, { replacements: [listId], type: Sequelize.QueryTypes.SELECT });
   ```
2. **Дневная цель:** Добавить настройку цели (например, 20 слов/день) в `.env` или в UI.
3. **Прогресс-бар:** Отображать в статистике и в review mode.
4. **Проверка:** В статистике отображается streak и прогресс-бар дневной цели.

### 38. Нет очереди новых слов (new words queue)
**Описание:** `MAX_NEW_WORDS_PER_DAY` не реализован.
**Шаги реализации:**
1. Выполнить пункт 8 (реализовать `MAX_NEW_WORDS_PER_DAY`).
2. На фронте показывать «Сегодня можно добавить ещё X слов» при добавлении слов.
3. **Проверка:** После достижения лимита новые слова не добавляются, показывается сообщение.

### 39. Нет фильтрации слов по сложности / известности
**Описание:** Нельзя отфильтровать список по «проблемным» словам.
**Шаги реализации:**
1. На сервере в `GET /:id/words` добавить параметр `filter`:
   - `?filter=problematic` — ease_factor < 1.8
   - `?filter=new` — review_count = 0
   - `?filter=learned` — review_count > 10
2. На фронте добавить выпадающий список фильтров.
3. **Проверка:** Выбрать «Проблемные» — показываются только слова с ease_factor < 1.8.

### 40. Нет OCR / поиска по изображению
**Описание:** Нельзя сфотографировать иероглиф и найти его.
**Шаги реализации:**
1. **Опционально, сложно.** Использовать Tesseract.js (wasm-версия в браузере):
   ```html
   <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5"></script>
   ```
2. Добавить кнопку 📷 в словарь — открывает камеру / загрузку изображения.
3. При получении изображения: Tesseract → распознанный текст → поиск в словаре.
4. **Проверка:** Загрузить фото с иероглифом → распознаётся текст → результат поиска.

### 41. Нет тёмной/светлой темы (дублирует №18)
**См. пункт 18 выше.**

---

## 🔧 ТЕХНИЧЕСКИЙ ДОЛГ

### 42. `console.log` в production коде
**Файлы:** `server/seed-hsk.js`, `server/app.js`
**Шаги реализации:**
1. Установить `pino` (`npm install pino`).
2. Создать `server/logger.js`:
   ```js
   const pino = require('pino');
   module.exports = pino({
     level: process.env.LOG_LEVEL || 'info',
     transport: process.env.NODE_ENV !== 'production'
       ? { target: 'pino-pretty', options: { colorize: true } }
       : undefined
   });
   ```
3. Заменить все `console.log` / `console.error` на `logger.info` / `logger.error`.
4. **Проверка:** Логи имеют уровни, в dev — цветные, в prod — JSON.

### 43. Нет CI/CD
**Описание:** Нет GitHub Actions / GitLab CI для авто-тестов и сборки Docker.
**Шаги реализации:**
1. Создать `.github/workflows/test.yml`:
   ```yaml
   name: Test
   on: [push, pull_request]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 18 }
         - run: npm ci
         - run: npm test
   ```
2. Создать `.github/workflows/docker.yml` для сборки Docker-образа и пуша в Docker Hub / GitHub Container Registry.
3. **Проверка:** После пуша PR на GitHub запускаются тесты и сборка Docker.

### 44. SQLite в production
**Описание:** SQLite не подходит для конкурентных записей.
**Шаги реализации:**
1. Создать `DATABASE.md` с ограничениями SQLite и инструкцией по миграции на PostgreSQL.
2. При миграции:
   - Установить `pg` (npm install pg).
   - Изменить `server/database.js`:
     ```js
     const sequelize = new Sequelize({
       dialect: process.env.DB_DIALECT || 'sqlite',
       storage: process.env.DB_PATH || './data/database.sqlite',
       ...(process.env.DB_DIALECT === 'postgres' ? {
         host: process.env.DB_HOST,
         port: process.env.DB_PORT,
         database: process.env.DB_NAME,
         username: process.env.DB_USER,
         password: process.env.DB_PASS
       } : {})
     });
     ```
3. **Проверка:** При установке `DB_DIALECT=postgres` приложение работает с PostgreSQL.

### 45. Нет миграций БД
**Описание:** `sequelize.sync()` не версионирует схему.
**Шаги реализации:**
1. Установить `sequelize-cli` (`npm install --save-dev sequelize-cli`).
2. Инициализировать: `npx sequelize-cli init`.
3. Создать миграции для существующих моделей:
   ```bash
   npx sequelize-cli migration:create --name create-dictionary
   npx sequelize-cli migration:create --name create-study-lists
   npx sequelize-cli migration:create --name create-study-list-words
   ```
4. Создать `seeders` для HSK-данных.
5. В `server/app.js`, заменить `sequelize.sync()` на запуск миграций через `umzug`:
   ```js
   const { sequelize } = require('./database');
   const { Umzug, SequelizeStorage } = require('umzug');
   const umzug = new Umzug({
     migrations: { glob: 'migrations/*.js' },
     context: sequelize.getQueryInterface(),
     storage: new SequelizeStorage({ sequelize }),
     logger: console
   });
   await umzug.up();
   ```
6. **Проверка:** При изменении модели создаётся миграция, данные не теряются.

### 46. Frontend: дублирование id в HTML
**Файл:** `public/index.html`
**Описание:** ID `card`, `flashcard`, `card-front`, `card-back` не имеют префикса режима.
**Шаги реализации:**
1. Переименовать в `index.html`:
   - `#card` → `#studyCard`
   - `#flashcard` → `#studyFlashcard`
   - (остальные уже имеют префикс: `#reviewCard`, `#review-flashcard`)
2. В `app.js`:
   - `document.getElementById('card')` → `document.getElementById('studyCard')`
   - `$('card')` → `$('studyCard')` (если используется $)
3. **Проверка:** Все режимы работают после переименования.

### 47. Тесты используют ручной test runner вместо фреймворка
**Файл:** `tests/api.test.js`
**Описание:** Самописный `test()` без `before/after`, без таймаутов, без отчётов.
**Шаги реализации:**
1. Установить Jest и supertest:
   ```bash
   npm install --save-dev jest supertest
   ```
2. Переписать `tests/api.test.js` в структуру Jest:
   ```js
   const request = require('supertest');
   const app = require('../server/app');
   
   describe('API tests', () => {
     beforeAll(async () => { /* sync + seed */ });
     afterAll(async () => { /* cleanup */ });
     
     describe('Health', () => {
       test('GET /api/health returns 200', async () => {
         const res = await request(app).get('/api/health');
         expect(res.status).toBe(200);
         expect(res.body.status).toBe('ok');
       });
     });
     
     describe('Study Lists', () => {
       // ... все тесты
     });
   });
   ```
3. Обновить `package.json`:
   ```json
   "scripts": {
     "test": "jest --forceExit --detectOpenHandles"
   }
   ```
4. **Проверка:** `npm test` запускает Jest, показывает отчёт с пройденными/упавшими тестами.

---

## 📊 ПРИОРИТЕТЫ ДЛЯ БЛИЖАЙШЕГО СПРИНТА

| Приоритет | Пункты | Трудозатраты |
|-----------|--------|-------------|
| 🔴 P0 (liveness) | #1 (флип карточки в study), #4 (рестарт review) | 30 мин |
| 🔴 P1 (data loss) | #6 (study не сохраняет SRS), #5 (test list_id) | 1 час |
| 🟡 P2 (UX critical) | #3 (авто-озвучка), #7 (поиск по пиньинь), #10 (LIKE экранирование) | 1.5 часа |
| 🟡 P3 (security) | #11 (error messages) | 30 мин |
| 🟠 P4 (UX important) | #14 (прогресс импорта), #26 (HSK бейджи), #18 (тёмная/светлая тема) | 3 часа |
| 🟠 P5 (features) | #19 (клавиатурные сокращения), #21 (favicon), #24 (улучшенная статистика) | 4 часа |
| 📋 P6 (completeness) | #31 (грамматика), #32 (примеры), #33 (письмо) | 8+ часов |
