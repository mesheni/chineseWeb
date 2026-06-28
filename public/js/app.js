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
 'newListName','createListBtn','listsContainer','listDetail','listDetailName','listDetailSort','listDetailBack','listDetailWords','listSearchInput',
 'studyListSelect','studyStartBtn','studyContent','studyCharacter','studyPinyin','studyTranslation','studyDefinition',
 'studySpeakBtn','studyShowAnswer','studyKnowBtn','studyDontKnowBtn','studyNextBtn','studyProgressText','studySpeakExampleBtn',
 'reviewListSelect','reviewStartBtn','reviewContent','reviewCount','reviewPosition',
 'reviewCharacter','reviewPinyin','reviewTranslation','reviewDefinition',
 'reviewSpeakBtn','reviewShowAnswer','reviewCard','reviewRestart','reviewRestartDone','reviewDone','reviewControls',
 'reviewQuality1','reviewQuality2','reviewQuality3','reviewQuality4','reviewQuality5',
 'testListSelect','testStartBtn','testContent','testScore','testProgress',
 'testCharacter','testPinyin','testOptions','testResult','testEmpty',
	 'statsListSelect','statsGrid','statDict','statsDailyChart','statsPieChart',
	  'hskLevels',
	 'modal','modalList','modalAddBtn','modalCancelBtn',
	 'speakToggle','themeToggle',
	 'studyExamples','reviewExamples',
	 'grammarLevelFilter','grammarRulesContainer','grammarExerciseMode','grammarExerciseTitle',
	 'grammarExerciseSentence','grammarExerciseOptions','grammarExerciseFeedback',
	 'grammarExerciseExplanation','grammarExerciseNext','grammarBackToList',
	 'grammarExerciseProgress',
	 'writingCharInput','writingGoBtn','writingRandomBtn','writingCanvasTarget',
	 'writingAnimateBtn','writingQuizBtn','writingCharDisplay','writingCharPinyin',
	 'writingCharMeaning','writingQuizStatus'].forEach(id => e[id] = $(id));

e.navTabs = document.querySelectorAll('.nav-tab');
e.modes = document.querySelectorAll('.mode');
e.dictHskStats = $('dictHskStats');
const reviewQualityBtns = document.querySelectorAll('.review-quality');

// ───── Mode switching ─────
e.navTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const mode = tab.dataset.mode;
    // Подтверждение при выходе из активной сессии (study/review/test)
    const currentMode = document.querySelector('.mode.active');
	    const hasActiveSession =
	      (currentMode?.id === 'study-mode' && !e.studyContent.classList.contains('hidden')) ||
	      (currentMode?.id === 'review-mode' && !e.reviewContent.classList.contains('hidden')) ||
	      (currentMode?.id === 'test-mode' && !e.testContent.classList.contains('hidden')) ||
	      (currentMode?.id === 'grammar-mode' && !e.grammarExerciseMode.classList.contains('hidden'));
    if (hasActiveSession && currentMode?.id !== `${mode}-mode`) {
      if (!confirm('Прогресс текущей сессии будет потерян. Продолжить?')) return;
    }
    e.navTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    e.modes.forEach(m => m.classList.remove('active'));
    $(`${mode}-mode`).classList.add('active');

	    if (mode === 'dictionary') { refreshDictStats(); refreshDictHskStats(); }
	    if (mode === 'lists') { loadLists(); loadHSKLevels(); }
	    if (mode === 'study') { loadListSelect('study', true); }
	    if (mode === 'review') { loadListSelect('review', true); }
	    if (mode === 'test') { loadListSelect('test', true); }
	    if (mode === 'grammar') { loadGrammarRules(); }
	    if (mode === 'writing') { }
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

  // Also try server audio caching as fallback
  try {
    const word = encodeURIComponent(text);
    let audioEl = document.getElementById('audioPlayer');
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.id = 'audioPlayer';
      audioEl.style.display = 'none';
      document.body.appendChild(audioEl);
    }
    audioEl.src = `${API}/audio/speak/${word}`;
    audioEl.play().catch(() => {});
  } catch(e) {}
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
  const lengthFilter = e.dictLengthFilter.value;

  // Если нет ни запроса, ни фильтра — показать hint
  if (!q && lengthFilter === '0') {
    e.dictResults.innerHTML = '<p class="hint">Введите запрос или выберите фильтр длины</p>';
    e.dictPagination.classList.add('hidden');
    return;
  }

  let url = `${API}/dictionary/search?limit=${DICT_LIMIT}&offset=${offset}`;
  if (q) url += '&q=' + encodeURIComponent(q);
  if (lengthFilter !== '0') url += '&length=' + lengthFilter;

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
        ${sample.hsk_level ? `<span class="dict-hsk-badge">HSK ${sample.hsk_level}</span>` : ''}
        <button class="dict-add-btn" data-dict-id="${sample.id}" title="Добавить в список">+</button>
      </div>
      ${sample.definition ? `<div class="dict-definition">${escHtml(sample.definition).slice(0, 200)}</div>` : ''}
      ${sample.examples && sample.examples.length ? `<div class="dict-examples">${sample.examples.map(ex => `<div class="dict-ex-item"><span class="dict-ex-chinese">${escHtml(ex.chinese)}</span> — <span class="dict-ex-russian">${escHtml(ex.russian)}</span></div>`).join('')}</div>` : ''}
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

let currentViewListId = null;

async function viewList(id) {
  try {
    currentViewListId = id;
    const sort = e.listDetailSort.value || 'id';
    const order = sort === 'next_review' ? 'asc' : 'desc';
    const data = await api(`${API}/study-lists/${id}/words?sort=${sort}&order=${order}`);
    e.listDetail.classList.remove('hidden');
    e.listDetailName.textContent = data.list.name + ` (${data.words.length} слов)`;
    e.listDetailWords.innerHTML = data.words.map(w =>
      `<div class="list-word-item" data-word-id="${w.id}" data-list-id="${id}">
        <input type="checkbox" class="word-select" data-word-id="${w.id}" data-list-id="${id}" />
        <span class="dict-chinese">${escHtml(w.entry.chinese)}</span>
        <span class="dict-russian">${escHtml(w.entry.russian_word)}</span>
        <button class="word-del-btn" data-word-id="${w.id}" data-list-id="${id}">✕</button>
      </div>`
    ).join('');
    // Bulk actions bar
    e.listDetailWords.insertAdjacentHTML('beforeend', `
      <div class="list-bulk-actions hidden" id="listBulkActions">
        <button id="deleteSelectedBtn" class="danger-btn">🗑 Удалить выбранные (<span id="deleteSelectedCount">0</span>)</button>
      </div>
    `);
    // Search filter
    e.listSearchInput.value = '';
    e.listSearchInput.addEventListener('input', () => {
      const q = e.listSearchInput.value.trim().toLowerCase();
      document.querySelectorAll('.list-word-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = q === '' || text.includes(q) ? '' : 'none';
      });
    });
    e.listDetailWords.querySelectorAll('.word-del-btn').forEach(b =>
      b.addEventListener('click', async () => {
        await api(`${API}/study-lists/${b.dataset.listId}/words/${b.dataset.wordId}`, { method: 'DELETE' });
        viewList(id);
      })
    );
    // Bulk select & delete handlers
    const updateBulkBar = () => {
      const checked = document.querySelectorAll('.word-select:checked');
      const bar = document.getElementById('listBulkActions');
      const countEl = document.getElementById('deleteSelectedCount');
      if (bar) {
        bar.classList.toggle('hidden', checked.length === 0);
        if (countEl) countEl.textContent = checked.length;
      }
    };
    document.querySelectorAll('.word-select').forEach(cb => {
      cb.addEventListener('change', updateBulkBar);
    });
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        const selected = document.querySelectorAll('.word-select:checked');
        if (!selected.length) return;
        if (!confirm(`Удалить ${selected.length} слов(а)?`)) return;
        deleteBtn.disabled = true;
        for (const cb of selected) {
          await api(`${API}/study-lists/${cb.dataset.listId}/words/${cb.dataset.wordId}`, { method: 'DELETE' });
        }
        viewList(id);
      });
    }
  } catch (e) {
    alert('Ошибка загрузки списка: ' + e.message);
  }
}

e.listDetailBack.addEventListener('click', () => {
  e.listDetail.classList.add('hidden');
  currentViewListId = null;
  loadLists();
});

e.listDetailSort.addEventListener('change', () => {
  if (currentViewListId) viewList(currentViewListId);
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
      const badge = imported
        ? (l.existing_word_count !== undefined
            ? `<span class="hsk-imported-badge">✅ ${l.existing_word_count}/${l.word_count}</span>`
            : '<span class="hsk-imported-badge">✅ Импортирован</span>')
        : `<button class="hsk-import-btn" data-level="${l.level}">📥 Импортировать</button>`;
      return `<div class="hsk-level-card ${imported ? 'imported' : ''}">
        <span class="hsk-level-num">Уровень ${l.level}</span>
        <span class="hsk-level-count">${l.word_count} слов</span>
        ${badge}
      </div>`;
    }).join('');

    e.hskLevels.querySelectorAll('.hsk-import-btn').forEach(btn =>
      btn.addEventListener('click', async () => {
        const level = btn.dataset.level;
        const totalEl = btn.closest('.hsk-level-card').querySelector('.hsk-level-count');
        const totalText = totalEl ? totalEl.textContent : '';
        btn.disabled = true;
        btn.textContent = '⏳ Импорт...';
        // Show progress indicator while importing
        const progressTimer = setInterval(() => {
          const dots = (btn.textContent.match(/·/g) || []).length;
          btn.textContent = '⏳ Импорт' + '·'.repeat((dots + 1) % 4);
        }, 400);
        try {
          const result = await api(`${API}/study-lists/hsk/import/${level}`, { method: 'POST' });
          clearInterval(progressTimer);
          if (result.already_exists) {
            alert(`Список "${result.list.name}" уже существует`);
          } else {
            alert(`✅ Импортирован HSK ${level}: ${result.linked} из ${result.total} слов`);
          }
          loadHSKLevels();
          loadLists();
          loadAllListSelects();
        } catch (e) {
          clearInterval(progressTimer);
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

  if (word.examples && word.examples.length) {
    e.studyExamples.innerHTML = '<div class="examples-title">📖 Примеры:</div>' +
      word.examples.map(ex => `<div class="example-item"><span class="ex-chinese">${escHtml(ex.chinese)}</span><span class="ex-russian">${escHtml(ex.russian)}</span></div>`).join('');
    e.studyExamples.classList.remove('hidden');
  } else {
    e.studyExamples.classList.add('hidden');
  }

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

  if (word.examples && word.examples.length) {
    e.reviewExamples.innerHTML = '<div class="examples-title">📖 Примеры:</div>' +
      word.examples.map(ex => `<div class="example-item"><span class="ex-chinese">${escHtml(ex.chinese)}</span><span class="ex-russian">${escHtml(ex.russian)}</span></div>`).join('');
    e.reviewExamples.classList.remove('hidden');
  } else {
    e.reviewExamples.classList.add('hidden');
  }
  
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

async function restartReview() {
  const listId = e.reviewListSelect.value;
  if (!listId) { alert('Выберите список'); return; }
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
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
}
e.reviewRestart.addEventListener('click', restartReview);
e.reviewRestartDone.addEventListener('click', restartReview);

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
  // Sort distractors by similarity of translation length to the correct answer,
  // then randomly shuffle within a small window to keep variety.
  const unique = [...new Set(wrong)];
  const correctLen = correct.length;
  const scored = unique.map(text => ({
    text,
    diff: Math.abs(text.length - correctLen),
    rand: Math.random()
  }));
  scored.sort((a, b) => a.diff - b.diff || a.rand - b.rand);
  // Take 3 closest by length, then shuffle their order for display
  const picked = scored.slice(0, 3).map(s => s.text);
  const options = [correct, ...picked];
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
      const found = testQueue.find(w => w.entry.id === correctWord.id);
      if (found) api(`${API}/study-lists/${testListId}/review`, {
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

// ───── 7. GRAMMAR MODE ─────
let grammarExercises = [];
let grammarExerciseIndex = 0;
let grammarExerciseCorrect = 0;
let grammarExerciseTotal = 0;

async function loadGrammarRules() {
  const level = e.grammarLevelFilter.value;
  let url = `${API}/grammar/rules`;
  if (level !== '0') url += `?level=${level}`;
  try {
    const rules = await api(url);
    renderGrammarRules(rules);
  } catch (err) {
    e.grammarRulesContainer.innerHTML = `<p class="error">Ошибка: ${err.message}</p>`;
  }
}

e.grammarLevelFilter.addEventListener('change', loadGrammarRules);

function renderGrammarRules(rules) {
  e.grammarExerciseMode.classList.add('hidden');
  if (!rules.length) {
    e.grammarRulesContainer.innerHTML = '<p class="hint">Нет правил для этого уровня</p>';
    return;
  }
  const grouped = {};
  for (const r of rules) {
    const levelKey = `HSK ${r.level}`;
    if (!grouped[levelKey]) grouped[levelKey] = [];
    grouped[levelKey].push(r);
  }
  let html = '';
  for (const [levelKey, items] of Object.entries(grouped)) {
    html += `<h4 class="grammar-level-header">${levelKey}</h4>`;
    for (const rule of items) {
      const exList = (rule.examples || []).map(ex =>
        `<div class="grammar-example"><span class="grammar-ex-chinese">${escHtml(ex.chinese)}</span> — <span class="grammar-ex-russian">${escHtml(ex.russian)}</span></div>`
      ).join('');
      html += `<div class="grammar-rule-card" data-rule-id="${rule.id}">
        <div class="grammar-rule-header">
          <span class="grammar-rule-title">${escHtml(rule.title)}</span>
          ${rule.category ? `<span class="grammar-rule-category">${escHtml(rule.category)}</span>` : ''}
        </div>
        <div class="grammar-rule-explanation">${escHtml(rule.explanation)}</div>
        ${exList ? `<div class="grammar-rule-examples">${exList}</div>` : ''}
        <button class="grammar-practice-btn" data-rule-id="${rule.id}" data-rule-title="${escHtml(rule.title)}">📝 Упражнения</button>
      </div>`;
    }
  }
  e.grammarRulesContainer.innerHTML = html;

  e.grammarRulesContainer.querySelectorAll('.grammar-practice-btn').forEach(btn => {
    btn.addEventListener('click', () => startGrammarExercise(
      parseInt(btn.dataset.ruleId),
      btn.dataset.ruleTitle
    ));
  });
}

async function startGrammarExercise(ruleId, title) {
  try {
    const exercises = await api(`${API}/grammar/exercises/${ruleId}`);
    if (!exercises.length) {
      alert('Нет упражнений для этого правила');
      return;
    }
    grammarExercises = exercises;
    grammarExerciseIndex = 0;
    grammarExerciseCorrect = 0;
    grammarExerciseTotal = exercises.length;
    e.grammarRulesContainer.classList.add('hidden');
    e.grammarExerciseMode.classList.remove('hidden');
    e.grammarExerciseTitle.textContent = `📝 ${title}`;
    e.grammarExerciseNext.classList.add('hidden');
    showGrammarExercise();
  } catch (err) {
    alert('Ошибка: ' + err.message);
  }
}

function showGrammarExercise() {
  if (grammarExerciseIndex >= grammarExercises.length) {
    showGrammarExerciseDone();
    return;
  }
  const ex = grammarExercises[grammarExerciseIndex];
  e.grammarExerciseSentence.textContent = ex.sentence;
  e.grammarExerciseFeedback.innerHTML = '';
  e.grammarExerciseExplanation.textContent = '';
  e.grammarExerciseNext.classList.add('hidden');
  e.grammarExerciseProgress.textContent = `Вопрос ${grammarExerciseIndex + 1} из ${grammarExerciseTotal} | ✅ ${grammarExerciseCorrect}`;

  const options = ex.options;
  e.grammarExerciseOptions.innerHTML = options.map((opt, i) =>
    `<button class="grammar-exercise-option" data-index="${i}">${escHtml(opt)}</button>`
  ).join('');

  e.grammarExerciseOptions.querySelectorAll('.grammar-exercise-option').forEach(btn => {
    btn.addEventListener('click', () => handleGrammarAnswer(btn, ex));
  });
}

function handleGrammarAnswer(btn, exercise) {
  const idx = parseInt(btn.dataset.index);
  const correct = idx === exercise.correct_index;
  e.grammarExerciseOptions.querySelectorAll('.grammar-exercise-option').forEach(b => {
    b.disabled = true;
    if (parseInt(b.dataset.index) === exercise.correct_index) b.classList.add('correct');
    else if (b === btn && !correct) b.classList.add('wrong');
  });
  if (correct) {
    grammarExerciseCorrect++;
    e.grammarExerciseFeedback.innerHTML = '<span style="color:var(--success)">✅ Правильно!</span>';
  } else {
    e.grammarExerciseFeedback.innerHTML = '<span style="color:var(--danger)">❌ Неправильно</span>';
  }
  if (exercise.explanation) {
    e.grammarExerciseExplanation.textContent = '💡 ' + exercise.explanation;
  }
  e.grammarExerciseProgress.textContent = `Вопрос ${grammarExerciseIndex + 1} из ${grammarExerciseTotal} | ✅ ${grammarExerciseCorrect}`;
  e.grammarExerciseNext.classList.remove('hidden');
}

e.grammarExerciseNext.addEventListener('click', () => {
  grammarExerciseIndex++;
  showGrammarExercise();
});

e.grammarBackToList.addEventListener('click', () => {
  e.grammarExerciseMode.classList.add('hidden');
  e.grammarRulesContainer.classList.remove('hidden');
  loadGrammarRules();
});

function showGrammarExerciseDone() {
  e.grammarExerciseSentence.textContent = '🎉';
  e.grammarExerciseOptions.innerHTML = '';
  e.grammarExerciseFeedback.innerHTML = '';
  e.grammarExerciseExplanation.innerHTML = '';
  e.grammarExerciseNext.classList.add('hidden');
  e.grammarExerciseProgress.textContent = `Завершено! Правильно: ${grammarExerciseCorrect} из ${grammarExerciseTotal}`;
}

// ───── 8. WRITING MODE ─────
let hanziWriter = null;
let writerTarget = null;

e.writingGoBtn.addEventListener('click', () => {
  const char = e.writingCharInput.value.trim();
  if (!char) return;
  loadHanzi(char);
});

e.writingRandomBtn.addEventListener('click', () => {
  const common = ['好','你','我','他','学','中','国','人','大','小','天','日','月','水','火','山','木','金','土','女'];
  const char = common[Math.floor(Math.random() * common.length)];
  e.writingCharInput.value = char;
  loadHanzi(char);
});

e.writingCharInput.addEventListener('keyup', (ev) => {
  if (ev.key === 'Enter') e.writingGoBtn.click();
});

function loadHanzi(char) {
  if (!char || !char[0]) return;
  const ch = char[0];
  api(`${API}/dictionary/search?q=${encodeURIComponent(ch)}&limit=1`).then(data => {
    if (data.results.length) {
      const word = data.results[0];
      e.writingCharDisplay.textContent = word.chinese;
      e.writingCharPinyin.textContent = word.pinyin || '';
      e.writingCharMeaning.textContent = word.russian_word || '';
    } else {
      e.writingCharDisplay.textContent = ch;
      e.writingCharPinyin.textContent = '';
      e.writingCharMeaning.textContent = '';
    }
  }).catch(() => {
    e.writingCharDisplay.textContent = ch;
  });

  if (writerTarget) {
    writerTarget.innerHTML = '';
    hanziWriter = null;
  }
  writerTarget = e.writingCanvasTarget;
  hanziWriter = HanziWriter.create(writerTarget, ch, {
    width: 250,
    height: 250,
    padding: 5,
    strokeAnimationSpeed: 1,
    delayBetweenStrokes: 300,
    strokeColor: '#38bdf8',
    radicalColor: '#f59e0b',
    charDataLoader: (char, onComplete) => {
      fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@3/${encodeURIComponent(char)}.json`)
        .then(r => r.json())
        .then(data => onComplete(data))
        .catch(() => {
          e.writingCanvasTarget.innerHTML = '<p class="hint">Данные для этого иероглифа не найдены</p>';
        });
    }
  });
  e.writingAnimateBtn.classList.remove('hidden');
  e.writingQuizBtn.classList.remove('hidden');
  e.writingQuizStatus.classList.add('hidden');
}

e.writingAnimateBtn.addEventListener('click', () => {
  if (hanziWriter) {
    hanziWriter.animateCharacter();
  }
});

e.writingQuizBtn.addEventListener('click', () => {
  if (!hanziWriter) return;
  e.writingQuizStatus.classList.remove('hidden');
  e.writingQuizStatus.textContent = 'Рисуйте иероглиф по порядку черт...';
  hanziWriter.quiz({
    onMistake: () => {
      e.writingQuizStatus.innerHTML = '<span style="color:var(--danger)">❌ Неправильная черта! Попробуйте ещё раз.</span>';
    },
    onCorrectStroke: () => {
      e.writingQuizStatus.innerHTML = '<span style="color:var(--success)">✅ Правильно! Продолжайте...</span>';
    },
    onComplete: (summaryData) => {
      e.writingQuizStatus.innerHTML = `<span style="color:var(--success)">🎉 Отлично! Ошибок: ${summaryData.totalMistakes}</span>`;
    }
  });
});

// ───── 9. STATS ─────
let statsDailyChart = null;
let statsPieChart = null;

async function loadStats() {
  const listId = e.statsListSelect.value;
  if (!listId) { e.statsGrid.innerHTML = '<p class="hint">Выберите список</p>'; return; }
  try {
    const [s, daily] = await Promise.all([
      api(`${API}/study-lists/${listId}/stats`),
      api(`${API}/study-lists/${listId}/stats/daily`)
    ]);
    renderStats(s);
    renderDailyChart(daily);
    renderPieChart(s);
  } catch (e) {
    e.statsGrid.innerHTML = '<p class="error">Ошибка загрузки статистики</p>';
  }
}

e.statsListSelect.addEventListener('change', loadStats);

function renderStats(s) {
  const cards = [
    { label: 'Всего слов', value: s.total, color: '#3b82f6' },
    { label: 'Изучено', value: s.reviewed, color: '#10b981' },
    { label: 'На сегодня', value: s.due_today, color: '#f59e0b' },
    { label: 'Streak', value: `${s.streak} дн.`, color: '#8b5cf6' }
  ];
  const maxVal = Math.max(...cards.slice(0, 3).map(c => c.value), 1);
  e.statsGrid.innerHTML = cards.map(c => {
    const pct = typeof c.value === 'number' ? (c.value / maxVal) * 100 : 100;
    return `<div class="stat-card">
      <span class="stat-card-label">${c.label}</span>
      <span class="stat-card-value">${c.value}</span>
      <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${pct}%;background:${c.color};"></div></div>
    </div>`;
  }).join('');
}

function renderDailyChart(daily) {
  if (statsDailyChart) statsDailyChart.destroy();
  const ctx = e.statsDailyChart;
  if (!ctx) return;
  statsDailyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: daily.map(d => d.date.slice(5)),
      datasets: [{
        label: 'Повторений',
        data: daily.map(d => d.count),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#94a3b8', font: { size: 10 }, maxTicksLimit: 10 } },
        y: { ticks: { color: '#94a3b8', font: { size: 10 }, precision: 0 }, beginAtZero: true }
      }
    }
  });
}

function renderPieChart(s) {
  if (statsPieChart) statsPieChart.destroy();
  const ctx = e.statsPieChart;
  if (!ctx) return;
  const studied = s.reviewed - (s.new_words || 0);
  statsPieChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Новые', 'Изученные', 'Проблемные'],
      datasets: [{
        data: [s.new_words || 0, Math.max(0, studied), s.problem_words || 0],
        backgroundColor: ['#3b82f6', '#10b981', '#ef4444'],
        borderColor: 'transparent'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#94a3b8', font: { size: 12 }, padding: 16 }
        }
      }
    }
  });
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

// ───── THEME TOGGLE ─────
let darkTheme = localStorage.getItem('theme') !== 'light';
function applyTheme() {
  document.documentElement.classList.toggle('light', !darkTheme);
  if (e.themeToggle) e.themeToggle.textContent = darkTheme ? '🌙' : '☀️';
}
if (e.themeToggle) {
  e.themeToggle.addEventListener('click', () => {
    darkTheme = !darkTheme;
    localStorage.setItem('theme', darkTheme ? 'dark' : 'light');
    applyTheme();
  });
}
applyTheme();

// ───── KEYBOARD SHORTCUTS ─────
document.addEventListener('keydown', (ev) => {
  // Не обрабатывать, если фокус в input/select/textarea
  const tag = (ev.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return;

  const activeMode = document.querySelector('.mode.active')?.id;
  if (!activeMode) return;

  switch (activeMode) {
    case 'dictionary-mode':
      if (ev.key === 'Enter') { ev.preventDefault(); doDictSearch(0); }
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
    case 'grammar-mode':
      if (ev.key === 'Enter') { ev.preventDefault(); }
      if (['1','2','3','4'].includes(ev.key)) {
        const btns = document.querySelectorAll('.grammar-exercise-option:not(:disabled)');
        const idx = parseInt(ev.key) - 1;
        if (btns[idx]) btns[idx].click();
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

// ───── INIT ─────
refreshDictStats();
refreshDictHskStats();
loadAllListSelects();
