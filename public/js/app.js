const API = '/api';

const $ = id => document.getElementById(id);
let loadingCount = 0;
const loadingEl = () => $('loading');

const api = (url, opts) => {
  loadingCount++;
  loadingEl().classList.remove('hidden');
  return fetch(url, opts)
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .finally(() => {
      loadingCount--;
      if (loadingCount <= 0) { loadingCount = 0; loadingEl().classList.add('hidden'); }
    });
};

// ───── State ─────
let state = {};
let speakAutoEnabled = localStorage.getItem('speakAuto') !== 'false';

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
 'hskLevels',
 'modal','modalList','modalAddBtn','modalCancelBtn',
 'speakToggle'].forEach(id => e[id] = $(id));

e.navTabs = document.querySelectorAll('.nav-tab');
e.modes = document.querySelectorAll('.mode');
e.dictHskStats = $('dictHskStats');
const reviewQualityBtns = document.querySelectorAll('.review-quality');

// ───── Mode switching ─────
e.navTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const mode = tab.dataset.mode;
    e.navTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    e.modes.forEach(m => m.classList.remove('active'));
    $(`${mode}-mode`).classList.add('active');

    if (mode === 'dictionary') { refreshDictStats(); refreshDictHskStats(); }
    if (mode === 'lists') { loadLists(); loadHSKLevels(); }
    if (mode === 'study') { loadListSelect('study', true); }
    if (mode === 'review') { loadListSelect('review', true); }
    if (mode === 'test') { loadListSelect('test', true); }
    if (mode === 'stats') { loadListSelect('stats', false); loadStats(); }
  });
});

// ───── Speak utility ─────
let voicesReady = false;
speechSynthesis.onvoiceschanged = () => { voicesReady = true; };

function speakChinese(text) {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.9;
  const voices = speechSynthesis.getVoices();
  const cv = voices.find(v => v.lang && (v.lang.startsWith('zh-') || v.lang === 'zh' || v.name.toLowerCase().includes('chinese')));
  if (cv) utterance.voice = cv;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

// ───── 1. DICTIONARY SEARCH ─────
let dictOffset = 0;
let dictTotal = 0;
const DICT_LIMIT = 30;

function refreshDictStats() {
  api(`${API}/health`).then(h => { e.statDict.textContent = h.dictionary_entries; }).catch(() => {});
}

function refreshDictHskStats() {
  api(`${API}/study-lists/hsk/available`).then(levels => {
    if (!levels.length) { e.dictHskStats.innerHTML = ''; return; }
    e.dictHskStats.innerHTML = levels.map(l =>
      `<span class="hsk-stat-badge">HSK ${l.level}: ${l.word_count} слов</span>`
    ).join('');
  }).catch(() => { e.dictHskStats.innerHTML = ''; });
}

function doDictSearch(offset = 0) {
  const q = e.dictSearchInput.value.trim();
  if (!q) { e.dictResults.innerHTML = '<p class="hint">Введите запрос для поиска</p>'; e.dictPagination.classList.add('hidden'); return; }

  let url = `${API}/dictionary/search?limit=${DICT_LIMIT}&offset=${offset}`;
  if (q) url += '&q=' + encodeURIComponent(q);
  if (e.dictLengthFilter.value !== '0') url += '&length=' + e.dictLengthFilter.value;

  api(url).then(data => {
    dictOffset = offset;
    dictTotal = data.total;
    renderDictResults(data.results, q);
    renderDictPagination();
  }).catch(err => {
    e.dictResults.innerHTML = `<p class="error">Ошибка: ${err.message}</p>`;
  });
}

function highlightText(text, query) {
  if (!query || !text) return escHtml(text);
  const re = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escHtml(text).replace(new RegExp(`(${re})`, 'gi'), '<mark>$1</mark>');
}

function renderDictResults(results, query) {
  if (!results.length) {
    e.dictResults.innerHTML = '<p class="hint">Ничего не найдено</p>';
    return;
  }
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
        <span class="dict-chinese">${highlightText(sample.chinese, query)}</span>
        <span class="dict-russian">${highlightText(sample.russian_word, query)}</span>
        <button class="dict-add-btn" data-dict-id="${sample.id}" title="Добавить в список">+</button>
      </div>
      <div class="dict-definition">${escHtml(sample.definition || '').slice(0, 200)}</div>
    </div>`;
  }
  e.dictResults.innerHTML = html;

  e.dictResults.querySelectorAll('.dict-add-btn').forEach(btn => {
    btn.addEventListener('click', () => showListPicker(parseInt(btn.dataset.dictId), btn));
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
  div.textContent = s || '';
  return div.innerHTML;
}

e.dictSearchBtn.addEventListener('click', () => doDictSearch(0));
e.dictSearchInput.addEventListener('keyup', ev => { if (ev.key === 'Enter') doDictSearch(0); });
e.dictPrev.addEventListener('click', () => doDictSearch(Math.max(0, dictOffset - DICT_LIMIT)));
e.dictNext.addEventListener('click', () => doDictSearch(dictOffset + DICT_LIMIT));

let modalDictId = null;
let modalBtn = null;

function closeModal() {
  e.modal.classList.add('hidden');
  modalDictId = null;
  modalBtn = null;
}

async function showListPicker(dictId, btn) {
  const lists = await api(`${API}/study-lists`);
  if (!lists.length) {
    alert('Сначала создайте список во вкладке "Списки"');
    return;
  }
  modalDictId = dictId;
  modalBtn = btn;
  e.modalList.innerHTML = lists.map((l, i) =>
    `<label>
      <input type="radio" name="modal-list" value="${l.id}" ${i === 0 ? 'checked' : ''}>
      <span class="list-name">${escHtml(l.name)}</span>
      <span class="list-count">${l.word_count || '0'} слов</span>
    </label>`
  ).join('');
  e.modal.classList.remove('hidden');
}

e.modalAddBtn.addEventListener('click', async () => {
  if (!modalDictId || !modalBtn) return;
  const selected = e.modalList.querySelector('input[name="modal-list"]:checked');
  if (!selected) return;
  const listId = parseInt(selected.value);
  try {
    await api(`${API}/study-lists/${listId}/words`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dictionary_id: modalDictId })
    });
    modalBtn.textContent = '✓';
    modalBtn.disabled = true;
    setTimeout(() => { modalBtn.textContent = '+'; modalBtn.disabled = false; }, 2000);
  } catch (e) {
    alert('Ошибка: ' + e.message);
  }
  closeModal();
});

e.modalCancelBtn.addEventListener('click', closeModal);
e.modal.querySelector('.modal-overlay').addEventListener('click', closeModal);

// ───── 2. STUDY LISTS ─────
async function loadLists() {
  const lists = await api(`${API}/study-lists`);
  e.listDetail.classList.add('hidden');
  if (!lists.length) {
    e.listsContainer.innerHTML = '<p class="hint">Нет списков. Создайте новый или импортируйте HSK.</p>';
    return;
  }
  e.listsContainer.innerHTML = lists.map(l =>
    `<div class="list-card" data-id="${l.id}">
      <div class="list-card-name">${escHtml(l.name)}</div>
      <div class="list-card-count">${l.word_count || '0'} слов</div>
      <div class="list-card-actions">
        <button class="list-view-btn" data-id="${l.id}" title="Просмотр">👁</button>
        <button class="list-del-btn" data-id="${l.id}" title="Удалить">🗑</button>
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
      loadAllListSelects();
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

e.newListName.addEventListener('keyup', ev => {
  if (ev.key === 'Enter') e.createListBtn.click();
});

async function viewList(id) {
  try {
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
  } catch (e) {
    alert('Ошибка загрузки списка: ' + e.message);
  }
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
            alert(`✅ Импортирован HSK ${level}: ${result.linked} слов`);
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
async function loadListSelect(prefix, autoSelect) {
  const select = $(`${prefix}ListSelect`);
  if (!select) return;
  const lists = await api(`${API}/study-lists`);
  select.innerHTML = lists.map(l => `<option value="${l.id}">${escHtml(l.name)} (${l.word_count || 0})</option>`).join('');
  if (!lists.length) {
    select.innerHTML = '<option value="">Нет списков</option>';
  } else if (autoSelect && lists.length > 0) {
    // No auto-redirect — just ensure a valid option is selected
  }
}

async function loadAllListSelects() {
  for (const p of ['study', 'review', 'test', 'stats']) loadListSelect(p, false);
}

// ───── 4. STUDY MODE ─────
let studyQueue = [];
let studyIndex = 0;
let studyListId = null;

e.studyStartBtn.addEventListener('click', async () => {
  const listId = e.studyListSelect.value;
  if (!listId) { alert('Выберите список'); return; }
  try {
    const data = await api(`${API}/study-lists/${listId}/words`);
    if (!data.words.length) { alert('Список пуст'); return; }
    studyListId = parseInt(listId);
    studyQueue = data.words;
    studyIndex = 0;
    e.studyContent.classList.remove('hidden');
    showStudyWord();
  } catch (e) {
    alert('Ошибка загрузки: ' + e.message);
  }
});

function showStudyWord() {
  if (studyIndex >= studyQueue.length) { showStudyDone(); return; }
  const word = studyQueue[studyIndex].entry;
  e.studyCharacter.textContent = word.chinese;
  e.studyPinyin.textContent = '';
  e.studyTranslation.textContent = word.russian_word;
  e.studyDefinition.textContent = word.definition ? word.definition.slice(0, 300) : '';
  e.studySpeakExampleBtn.classList.toggle('hidden', !word.definition);

  if (speakAutoEnabled && word.chinese) speakChinese(word.chinese);

  e.studyShowAnswer.classList.remove('hidden');
  e.studyKnowBtn.classList.add('hidden');
  e.studyDontKnowBtn.classList.add('hidden');
  e.studyNextBtn.classList.add('hidden');
  e.studyProgressText.textContent = `Слово ${studyIndex + 1} из ${studyQueue.length}`;
  document.getElementById('card').classList.remove('flipped');
}

e.studyShowAnswer.addEventListener('click', () => {
  document.getElementById('card').classList.add('flipped');
  e.studyShowAnswer.classList.add('hidden');
  e.studyKnowBtn.classList.remove('hidden');
  e.studyDontKnowBtn.classList.remove('hidden');
  const word = studyQueue[studyIndex].entry;
  e.studyPinyin.textContent = word.pinyin || '';
});

e.studyKnowBtn.addEventListener('click', () => {
  const w = studyQueue[studyIndex];
  api(`${API}/study-lists/${studyListId}/review`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word_id: w.id, quality: 4 })
  }).catch(() => {});
  studyIndex++;
  showStudyWord();
});

e.studyDontKnowBtn.addEventListener('click', () => {
  const w = studyQueue[studyIndex];
  api(`${API}/study-lists/${studyListId}/review`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word_id: w.id, quality: 1 })
  }).catch(() => {});
  studyIndex++;
  showStudyWord();
});
e.studyNextBtn.addEventListener('click', () => {
  studyIndex++;
  showStudyWord();
});

e.studySpeakBtn.addEventListener('click', () => {
  if (studyQueue[studyIndex]) speakChinese(studyQueue[studyIndex].entry.chinese);
});

function showStudyDone() {
  e.studyCharacter.textContent = '🎉';
  e.studyPinyin.textContent = '';
  e.studyTranslation.textContent = '';
  e.studyDefinition.textContent = '';
  e.studyShowAnswer.classList.add('hidden');
  e.studyKnowBtn.classList.add('hidden');
  e.studyDontKnowBtn.classList.add('hidden');
  e.studyNextBtn.classList.remove('hidden');
  e.studyNextBtn.textContent = 'Ещё раз';
  e.studyNextBtn.onclick = null;
  e.studyNextBtn.addEventListener('click', function handler() {
    studyIndex = 0;
    e.studyNextBtn.removeEventListener('click', handler);
    e.studyNextBtn.classList.add('hidden');
    showStudyWord();
  }, { once: true });
  e.studyProgressText.textContent = 'Все слова просмотрены!';
}

// ───── 5. REVIEW MODE ─────
let reviewQueue = [];
let reviewIndex = 0;
let reviewCurrentWord = null;

e.reviewStartBtn.addEventListener('click', async () => {
  const listId = e.reviewListSelect.value;
  if (!listId) { alert('Выберите список'); return; }
  try {
    const data = await api(`${API}/study-lists/${listId}/review`);
    reviewQueue = data.words;
    reviewIndex = 0;
    e.reviewDone.classList.add('hidden');
    e.reviewControls.classList.remove('hidden');
    e.reviewContent.classList.remove('hidden');
    if (!reviewQueue.length) { showReviewDone(); return; }
    showReviewWord();
  } catch (e) {
    alert('Ошибка загрузки: ' + e.message);
  }
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
  e.reviewPinyin.textContent = '';
  e.reviewTranslation.textContent = word.russian_word;
  e.reviewDefinition.textContent = word.definition ? word.definition.slice(0, 300) : '';
  e.reviewPosition.textContent = `Слово ${reviewIndex + 1} из ${reviewQueue.length}`;
  e.reviewCount.textContent = `На сегодня: ${reviewQueue.length} слов`;
  
  if (speakAutoEnabled && word.chinese) speakChinese(word.chinese);
}

e.reviewShowAnswer.addEventListener('click', () => {
  e.reviewCard.classList.add('flipped');
  e.reviewShowAnswer.classList.add('hidden');
  reviewQualityBtns.forEach(b => b.classList.remove('hidden'));
  e.reviewPinyin.textContent = reviewCurrentWord.entry.pinyin || '';
});

reviewQualityBtns.forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!reviewCurrentWord) return;
    const quality = parseInt(btn.dataset.quality);
    reviewQualityBtns.forEach(b => b.disabled = true);
    try {
      await api(`${API}/study-lists/${reviewCurrentWord.list_id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word_id: reviewCurrentWord.id, quality })
      });
    } catch (e) { console.error(e); }
    reviewQualityBtns.forEach(b => b.disabled = false);
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
  if (!testListId) { alert('Выберите список'); return; }
  try {
    const data = await api(`${API}/study-lists/${testListId}/words`);
    if (!data.words.length) {
      e.testContent.classList.remove('hidden');
      e.testEmpty.classList.remove('hidden');
      return;
    }
    shuffleArray(data.words);
    testQueue = data.words;
    testIndex = 0;
    testCorrect = 0;
    testWrong = 0;
    e.testContent.classList.remove('hidden');
    e.testEmpty.classList.add('hidden');
    e.testScore.textContent = '✅ 0 | ❌ 0';
    showTestWord();
  } catch (e) {
    alert('Ошибка загрузки: ' + e.message);
  }
});

function showTestWord() {
  if (testIndex >= testQueue.length) { showTestDone(); return; }
  e.testResult.textContent = '';
  const word = testQueue[testIndex].entry;
  e.testCharacter.textContent = word.chinese;
  e.testPinyin.textContent = word.pinyin || '';
  e.testProgress.textContent = `Слово ${testIndex + 1} / ${testQueue.length}`;
  generateTestOptions(word);
}

function generateTestOptions(correctWord) {
  const correct = correctWord.russian_word;
  const wrong = testQueue.filter(w => w.entry.id !== correctWord.id).map(w => w.entry.russian_word);
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
      const found = testQueue.find(w => w.entry.id === correctWord.id);
      if (found) api(`${API}/study-lists/${found.list_id}/review`, {
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
      const found = testQueue.find(w => w.entry.id === correctWord.id);
      if (found) api(`${API}/study-lists/${found.list_id}/review`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word_id: found.id, quality: 1 })
      }).catch(() => {});
    }
  }
  e.testScore.textContent = `✅ ${testCorrect} | ❌ ${testWrong}`;
  e.testResult.innerHTML = isCorrect
    ? '<span style="color:#10b981">✅ Правильно!</span>'
    : `<span style="color:#ef4444">❌ Неправильно! Правильный ответ: <strong>${escHtml(correctWord.russian_word)}</strong></span>`;
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
  if (!listId) { e.statsGrid.innerHTML = '<p class="hint">Выберите список</p>'; return; }
  try {
    const s = await api(`${API}/study-lists/${listId}/stats`);
    renderStats(s);
  } catch (e) {
    e.statsGrid.innerHTML = '<p class="error">Ошибка загрузки статистики</p>';
  }
}

e.statsListSelect.addEventListener('change', loadStats);

function renderStats(s) {
  const cards = [
    { label: 'Всего слов', value: s.total, color: '#3b82f6' },
    { label: 'Изучено', value: s.reviewed, color: '#10b981' },
    { label: 'На сегодня', value: s.due_today, color: '#f59e0b' }
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

e.speakToggle?.addEventListener('click', () => {
  speakAutoEnabled = !speakAutoEnabled;
  e.speakToggle.textContent = speakAutoEnabled ? '🔊' : '🔇';
  e.speakToggle.classList.toggle('muted', !speakAutoEnabled);
  localStorage.setItem('speakAuto', speakAutoEnabled);
});

e.speakToggle.textContent = speakAutoEnabled ? '🔊' : '🔇';
e.speakToggle.classList.toggle('muted', !speakAutoEnabled);

// ───── INIT ─────
refreshDictStats();
refreshDictHskStats();
loadAllListSelects();
