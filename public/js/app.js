const API = '/api';

// ───── Helpers ─────
const $ = id => document.getElementById(id);
const api = (url, opts) => fetch(url, opts).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });

// ───── State ─────
let state = { currentListId: null };

// ───── Elements ─────
const e = {};
['dictSearchInput','dictLengthFilter','dictSearchBtn','dictResults',
 'dictPagination','dictPrev','dictNext','dictPageInfo',
 'newListName','createListBtn','listsContainer','listDetail','listDetailName','listDetailBack','listDetailWords',
 'studyListSelect','studyStartBtn','studyContent','studyCharacter','studyPinyin','studyTranslation','studyDefinition',
 'studySpeakBtn','studyShowAnswer','studyKnowBtn','studyDontKnowBtn','studyNextBtn','studyProgressText','studySpeakExampleBtn',
 'reviewListSelect','reviewStartBtn','reviewContent','reviewCount','reviewPosition',
 'reviewCharacter','reviewPinyin','reviewTranslation','reviewDefinition',
 'reviewSpeakBtn','reviewShowAnswer','reviewCard','reviewRestart','reviewRestartDone','reviewDone','reviewControls',
 'reviewQuality1','reviewQuality3','reviewQuality4','reviewQuality5',
 'testListSelect','testStartBtn','testContent','testScore','testProgress',
 'testCharacter','testPinyin','testOptions','testResult','testEmpty',
 'statsListSelect','statsGrid','statDict',
 'hskLevels'].forEach(id => e[id] = $(id));

// These use class selectors, not IDs
e.navTabs = document.querySelectorAll('.nav-tab');
e.modes = document.querySelectorAll('.mode');

const reviewQualityBtns = document.querySelectorAll('.review-quality');

// ───── Mode switching ─────
e.navTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const mode = tab.dataset.mode;
    e.navTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    e.modes.forEach(m => m.classList.remove('active'));
    $(`${mode}-mode`).classList.add('active');
    if (mode === 'dictionary') { refreshDictStats(); }
    if (mode === 'lists') { loadLists(); loadHSKLevels(); }
    if (mode === 'study') { loadListSelect('study'); }
    if (mode === 'review') { loadListSelect('review'); }
    if (mode === 'test') { loadListSelect('test'); }
    if (mode === 'stats') { loadListSelect('stats'); loadStats(); }
  });
});

// ───── 1. DICTIONARY SEARCH ─────
let dictOffset = 0;
let dictTotal = 0;
const DICT_LIMIT = 30;

function refreshDictStats() {
  api(`${API}/health`).then(h => { e.statDict.textContent = h.dictionary_entries; });
}

function doDictSearch(offset = 0) {
  const q = e.dictSearchInput.value.trim();
  const len = e.dictLengthFilter.value;
  if (!q && len === '0') { e.dictResults.innerHTML = '<p class="hint">Введите запрос или выберите длину</p>'; e.dictPagination.classList.add('hidden'); return; }

  let url = `${API}/dictionary/search?limit=${DICT_LIMIT}&offset=${offset}`;
  if (q) url += '&q=' + encodeURIComponent(q);
  if (len !== '0') url += '&length=' + len;

  api(url).then(data => {
    dictOffset = offset;
    dictTotal = data.total;
    renderDictResults(data.results, q);
    renderDictPagination();
  }).catch(err => {
    e.dictResults.innerHTML = `<p class="error">Ошибка: ${err.message}</p>`;
  });
}

function renderDictResults(results, query) {
  if (!results.length) {
    e.dictResults.innerHTML = '<p class="hint">Ничего не найдено</p>';
    return;
  }
  // Group by chinese text
  const groups = {};
  for (const r of results) {
    if (!groups[r.chinese]) groups[r.chinese] = { chinese: r.chinese, entries: [] };
    groups[r.chinese].entries.push(r);
  }

  let html = `<p class="result-count">Найдено: ${dictTotal}</p>`;
  for (const key in groups) {
    const g = groups[key];
    const sample = g.entries[0];
    html += `<div class="dict-entry" data-id="${sample.id}">
      <div class="dict-entry-main">
        <span class="dict-chinese">${sample.chinese}</span>
        <span class="dict-russian">${sample.russian_word}</span>
        <button class="dict-add-btn" data-dict-id="${sample.id}" title="Добавить в список">➕</button>
      </div>
      <div class="dict-definition">${escHtml(sample.definition).slice(0, 200)}</div>
    </div>`;
  }
  e.dictResults.innerHTML = html;

  // Add button handlers
  e.dictResults.querySelectorAll('.dict-add-btn').forEach(btn => {
    btn.addEventListener('click', () => addToStudyList(parseInt(btn.dataset.dictId), btn));
  });
}

function renderDictPagination() {
  const totalPages = Math.ceil(dictTotal / DICT_LIMIT);
  const curPage = Math.floor(dictOffset / DICT_LIMIT) + 1;
  e.dictPageInfo.textContent = `Стр. ${curPage} из ${totalPages || 1}`;
  e.dictPagination.classList.remove('hidden');
  e.dictPrev.disabled = dictOffset <= 0;
  e.dictNext.disabled = dictOffset + DICT_LIMIT >= dictTotal;
}

function escHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

e.dictSearchBtn.addEventListener('click', () => doDictSearch(0));
e.dictSearchInput.addEventListener('keyup', ev => { if (ev.key === 'Enter') doDictSearch(0); });
e.dictPrev.addEventListener('click', () => doDictSearch(Math.max(0, dictOffset - DICT_LIMIT)));
e.dictNext.addEventListener('click', () => doDictSearch(dictOffset + DICT_LIMIT));

async function addToStudyList(dictId, btn) {
  const lists = await api(`${API}/study-lists`);
  if (!lists.length) {
    alert('Сначала создайте список во вкладке "Списки"');
    return;
  }
  // Simple: add to first list, or let user choose
  // For now, show a simple prompt
  const names = lists.map((l, i) => `${i + 1}. ${l.name}`);
  const choice = prompt(`В какой список добавить?\n${names.join('\n')}\n(введите номер)`, '1');
  if (!choice) return;
  const idx = parseInt(choice) - 1;
  if (idx < 0 || idx >= lists.length) return;
  try {
    const result = await api(`${API}/study-lists/${lists[idx].id}/words`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dictionary_id: dictId })
    });
    btn.textContent = '✅';
    btn.disabled = true;
    setTimeout(() => { btn.textContent = '➕'; btn.disabled = false; }, 2000);
  } catch (e) {
    alert('Ошибка: ' + e.message);
  }
}

// ───── 2. STUDY LISTS ─────
async function loadLists() {
  const lists = await api(`${API}/study-lists`);
  e.listDetail.classList.add('hidden');
  e.listsContainer.innerHTML = lists.map(l =>
    `<div class="list-card" data-id="${l.id}">
      <div class="list-card-name">${escHtml(l.name)}</div>
      <div class="list-card-count">${l.word_count || '0'} слов</div>
      <div class="list-card-actions">
        <button class="list-view-btn" data-id="${l.id}">👁️</button>
        <button class="list-del-btn" data-id="${l.id}">🗑️</button>
      </div>
    </div>`
  ).join('');

  e.listsContainer.querySelectorAll('.list-view-btn').forEach(b =>
    b.addEventListener('click', () => viewList(parseInt(b.dataset.id)))
  );
  e.listsContainer.querySelectorAll('.list-del-btn').forEach(b =>
    b.addEventListener('click', async () => {
      if (!confirm('Удалить список?')) return;
      await api(`${API}/study-lists/${b.dataset.id}`, { method: 'DELETE' });
      loadLists();
    })
  );
}

e.createListBtn.addEventListener('click', async () => {
  const name = e.newListName.value.trim();
  if (!name) return;
  await api(`${API}/study-lists`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  e.newListName.value = '';
  loadLists();
  loadAllListSelects();
});

async function viewList(id) {
  const data = await api(`${API}/study-lists/${id}/words`);
  e.listDetail.classList.remove('hidden');
  e.listDetailName.textContent = data.list.name + ` (${data.words.length} слов)`;
  e.listDetailWords.innerHTML = data.words.map(w =>
    `<div class="list-word-item">
      <span class="dict-chinese">${escHtml(w.entry.chinese)}</span>
      <span class="dict-russian">${escHtml(w.entry.russian_word)}</span>
      <button class="word-del-btn" data-word-id="${w.id}" data-list-id="${id}">✕</button>
    </div>`
  ).join('');
  e.listDetailWords.querySelectorAll('.word-del-btn').forEach(b =>
    b.addEventListener('click', async () => {
      await api(`${API}/study-lists/${b.dataset.listId}/words/${b.dataset.wordId}`, { method: 'DELETE' });
      viewList(id);
    })
  );
}

e.listDetailBack.addEventListener('click', () => {
  e.listDetail.classList.add('hidden');
  loadLists();
});

// ───── HSK IMPORT ─────
async function loadHSKLevels() {
  try {
    const levels = await api(`${API}/study-lists/hsk/available`);
    const existingLists = await api(`${API}/study-lists`);
    const existingNames = new Set(existingLists.map(l => l.name));
    
    e.hskLevels.innerHTML = levels.map(l => {
      const listName = `HSK ${l.level}`;
      const imported = existingNames.has(listName);
      return `<div class="hsk-level-card ${imported ? 'imported' : ''}">
        <span class="hsk-level-num">Уровень ${l.level}</span>
        <span class="hsk-level-count">${l.word_count} слов</span>
        ${imported
          ? '<span class="hsk-imported-badge">✅ Импортирован</span>'
          : `<button class="hsk-import-btn" data-level="${l.level}">📥 Импортировать</button>`
        }
      </div>`;
    }).join('');
    
    e.hskLevels.querySelectorAll('.hsk-import-btn').forEach(btn =>
      btn.addEventListener('click', async () => {
        const level = btn.dataset.level;
        btn.disabled = true;
        btn.textContent = '⏳ Импорт...';
        try {
          const result = await api(`${API}/study-lists/hsk/import/${level}`, { method: 'POST' });
          if (result.already_exists) {
            alert(`Список "${result.list.name}" уже существует`);
          } else {
            alert(`✅ Импортирован HSK ${level}: ${result.linked} из ${result.total} слов привязано к словарю`);
          }
          loadHSKLevels();
          loadLists();
          loadAllListSelects();
        } catch (e) {
          alert('Ошибка: ' + e.message);
          btn.disabled = false;
          btn.textContent = '📥 Импортировать';
        }
      })
    );
  } catch (e) {
    console.error('HSK load error:', e);
  }
}

// ───── 3. LIST SELECTORS ─────
async function loadListSelect(prefix) {
  const select = $(`${prefix}-list-select`);
  if (!select) return;
  const lists = await api(`${API}/study-lists`);
  select.innerHTML = lists.map(l => `<option value="${l.id}">${escHtml(l.name)}</option>`).join('');
  if (!lists.length) select.innerHTML = '<option value="">Нет списков</option>';
}

async function loadAllListSelects() {
  for (const p of ['study', 'review', 'test', 'stats']) loadListSelect(p);
}

// ───── 4. STUDY MODE ─────
let studyQueue = [];
let studyIndex = 0;

e.studyStartBtn.addEventListener('click', async () => {
  const listId = e.studyListSelect.value;
  if (!listId) return;
  const data = await api(`${API}/study-lists/${listId}/words`);
  if (!data.words.length) { alert('Список пуст'); return; }
  studyQueue = data.words.map(w => w.entry);
  studyIndex = 0;
  e.studyContent.classList.remove('hidden');
  showStudyWord();
});

function showStudyWord() {
  if (studyIndex >= studyQueue.length) { showStudyDone(); return; }
  const word = studyQueue[studyIndex];
  e.studyCharacter.textContent = word.chinese;
  speakChinese(word.chinese);
  e.studyPinyin.textContent = '';
  e.studyTranslation.textContent = word.russian_word;
  e.studyDefinition.textContent = word.definition ? word.definition.slice(0, 300) : '';
  e.studySpeakExampleBtn.classList.toggle('hidden', !word.definition);

  e.studyShowAnswer.classList.remove('hidden');
  e.studyKnowBtn.classList.add('hidden');
  e.studyDontKnowBtn.classList.add('hidden');
  e.studyNextBtn.classList.add('hidden');
  e.studyProgressText.textContent = `Слово ${studyIndex + 1} из ${studyQueue.length}`;
}

e.studyShowAnswer.addEventListener('click', () => {
  e.studyShowAnswer.classList.add('hidden');
  e.studyKnowBtn.classList.remove('hidden');
  e.studyDontKnowBtn.classList.remove('hidden');
});

e.studyKnowBtn.addEventListener('click', () => { studyIndex++; showStudyWord(); });
e.studyDontKnowBtn.addEventListener('click', () => { studyIndex++; showStudyWord(); });
e.studyNextBtn.addEventListener('click', () => { studyIndex++; showStudyWord(); });

e.studySpeakBtn.addEventListener('click', () => {
  if (studyQueue[studyIndex]) speakChinese(studyQueue[studyIndex].chinese);
});

function showStudyDone() {
  e.studyCharacter.textContent = '🎉';
  e.studyPinyin.textContent = '';
  e.studyTranslation.textContent = '';
  e.studyDefinition.textContent = '';
  e.studyShowAnswer.classList.add('hidden');
  e.studyKnowBtn.classList.add('hidden');
  e.studyDontKnowBtn.classList.add('hidden');
  e.studyNextBtn.textContent = 'Ещё раз';
  e.studyNextBtn.classList.remove('hidden');
  e.studyNextBtn.onclick = () => { studyIndex = 0; showStudyWord(); };
  e.studyProgressText.textContent = 'Все слова просмотрены!';
}

// ───── 5. REVIEW MODE ─────
let reviewQueue = [];
let reviewIndex = 0;
let reviewCurrentWord = null;

e.reviewStartBtn.addEventListener('click', async () => {
  const listId = e.reviewListSelect.value;
  if (!listId) return;
  const data = await api(`${API}/study-lists/${listId}/review`);
  reviewQueue = data.words;
  reviewIndex = 0;
  e.reviewDone.classList.add('hidden');
  e.reviewControls.classList.remove('hidden');
  e.reviewContent.classList.remove('hidden');
  if (!reviewQueue.length) { showReviewDone(); return; }
  showReviewWord();
});

function showReviewWord() {
  if (reviewIndex >= reviewQueue.length) { showReviewDone(); return; }
  const entry = reviewQueue[reviewIndex];
  reviewCurrentWord = entry;
  const word = entry.entry;

  e.reviewCard.classList.remove('flipped');
  e.reviewShowAnswer.classList.remove('hidden');
  reviewQualityBtns.forEach(b => b.classList.add('hidden'));

  e.reviewCharacter.textContent = word.chinese;
  speakChinese(word.chinese);
  e.reviewPinyin.textContent = '';
  e.reviewTranslation.textContent = word.russian_word;
  e.reviewDefinition.textContent = word.definition ? word.definition.slice(0, 300) : '';
  e.reviewPosition.textContent = `Слово ${reviewIndex + 1} из ${reviewQueue.length}`;
  e.reviewCount.textContent = `На сегодня: ${reviewQueue.length} слов`;
}

e.reviewShowAnswer.addEventListener('click', () => {
  e.reviewCard.classList.add('flipped');
  e.reviewShowAnswer.classList.add('hidden');
  reviewQualityBtns.forEach(b => b.classList.remove('hidden'));
});

reviewQualityBtns.forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!reviewCurrentWord) return;
    const quality = parseInt(btn.dataset.quality);
    try {
      await api(`${API}/study-lists/${reviewCurrentWord.list_id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word_id: reviewCurrentWord.id, quality })
      });
    } catch (e) { console.error(e); }
    reviewIndex++;
    showReviewWord();
  });
});

e.reviewRestart.addEventListener('click', () => { reviewIndex = 0; showReviewWord(); });
e.reviewRestartDone.addEventListener('click', () => { reviewIndex = 0; showReviewWord(); });

function showReviewDone() {
  e.reviewDone.classList.remove('hidden');
  e.reviewControls.classList.add('hidden');
  e.reviewPosition.textContent = '';
}

// ───── 6. TEST MODE ─────
let testQueue = [];
let testIndex = 0;
let testCorrect = 0;
let testWrong = 0;
let testListId = null;

e.testStartBtn.addEventListener('click', async () => {
  testListId = e.testListSelect.value;
  if (!testListId) return;
  const data = await api(`${API}/study-lists/${testListId}/words`);
  const words = data.words.map(w => w.entry);
  if (!words.length) { e.testContent.classList.remove('hidden'); e.testEmpty.classList.remove('hidden'); return; }
  shuffleArray(words);
  testQueue = words;
  testIndex = 0;
  testCorrect = 0;
  testWrong = 0;
  e.testContent.classList.remove('hidden');
  e.testEmpty.classList.add('hidden');
  e.testScore.textContent = '✅ 0 | ❌ 0';
  showTestWord();
});

function showTestWord() {
  if (testIndex >= testQueue.length) { showTestDone(); return; }
  e.testResult.textContent = '';
  const word = testQueue[testIndex];
  e.testCharacter.textContent = word.chinese;
  e.testPinyin.textContent = '';
  e.testProgress.textContent = `Слово ${testIndex + 1} / ${testQueue.length}`;
  generateTestOptions(word);
}

function generateTestOptions(correctWord) {
  const correct = correctWord.russian_word;
  const wrong = testQueue.filter(w => w.id !== correctWord.id).map(w => w.russian_word);
  const shuffled = [...new Set(wrong)].sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [correct, ...shuffled];
  shuffleArray(options);
  e.testOptions.innerHTML = options.map((opt, i) =>
    `<button class="test-option" data-translation="${escHtml(opt)}" data-index="${i}">${escHtml(opt)}</button>`
  ).join('');
  e.testOptions.querySelectorAll('.test-option').forEach(btn =>
    btn.addEventListener('click', () => handleTestAnswer(btn, correctWord))
  );
}

async function handleTestAnswer(btn, correctWord) {
  const selected = btn.dataset.translation;
  const isCorrect = selected === correctWord.russian_word;
  e.testOptions.querySelectorAll('.test-option').forEach(b => b.disabled = true);
  if (isCorrect) {
    btn.classList.add('correct');
    testCorrect++;
    if (testListId) {
      const words = await api(`${API}/study-lists/${testListId}/words`);
      const found = words.words.find(w => w.entry.id === correctWord.id);
      if (found) api(`${API}/study-lists/${testListId}/review`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word_id: found.id, quality: 4 })
      }).catch(() => {});
    }
  } else {
    btn.classList.add('wrong');
    testWrong++;
    e.testOptions.querySelectorAll('.test-option').forEach(b => {
      if (b.dataset.translation === correctWord.russian_word) b.classList.add('correct');
    });
    if (testListId) {
      const words = await api(`${API}/study-lists/${testListId}/words`);
      const found = words.words.find(w => w.entry.id === correctWord.id);
      if (found) api(`${API}/study-lists/${testListId}/review`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word_id: found.id, quality: 1 })
      }).catch(() => {});
    }
  }
  e.testScore.textContent = `✅ ${testCorrect} | ❌ ${testWrong}`;
  e.testResult.innerHTML = isCorrect
    ? '<span style="color:#28a745">✅ Правильно!</span>'
    : `<span style="color:#dc3545">❌ Неправильно! Правильный ответ: <strong>${escHtml(correctWord.russian_word)}</strong></span>`;
  setTimeout(() => { testIndex++; showTestWord(); }, 1500);
}

function showTestDone() {
  e.testCharacter.textContent = '🎉';
  e.testPinyin.textContent = '';
  e.testOptions.innerHTML = '';
  e.testResult.innerHTML = `<strong>Тест завершён! Правильно: ${testCorrect} из ${testQueue.length}</strong>`;
}

// ───── 7. STATS ─────
async function loadStats() {
  const listId = e.statsListSelect.value;
  if (!listId) { e.statsGrid.innerHTML = '<p>Выберите список</p>'; return; }
  try {
    const s = await api(`${API}/study-lists/${listId}/stats`);
    renderStats(s);
  } catch (e) {
    e.statsGrid.innerHTML = '<p>Ошибка загрузки статистики</p>';
  }
}

e.statsListSelect.addEventListener('change', loadStats);

function renderStats(s) {
  const cards = [
    { label: 'Всего слов', value: s.total, color: '#667eea' },
    { label: 'Изучено', value: s.reviewed, color: '#28a745' },
    { label: 'На сегодня', value: s.due_today, color: '#ffc107' }
  ];
  const maxVal = Math.max(...cards.map(c => c.value), 1);
  e.statsGrid.innerHTML = cards.map(c => {
    const pct = (c.value / maxVal) * 100;
    return `<div class="stat-card">
      <span class="stat-card-label">${c.label}</span>
      <span class="stat-card-value">${c.value}</span>
      <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${pct}%;background:${c.color};"></div></div>
    </div>`;
  }).join('');
}

// ───── UTILITIES ─────
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function speakChinese(text) {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  const voices = speechSynthesis.getVoices();
  const cv = voices.find(v => v.lang.startsWith('zh-') || v.lang === 'zh' || v.name.toLowerCase().includes('chinese'));
  if (cv) utterance.voice = cv;
  speechSynthesis.speak(utterance);
}

// ───── INIT ─────
refreshDictStats();
loadAllListSelects();
