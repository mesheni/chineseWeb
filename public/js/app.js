const API_BASE = '/api';

const $ = (id) => document.getElementById(id);

const elements = {
  card: $('card'),
  character: $('character'),
  pinyin: $('pinyin'),
  translation: $('translation'),
  example: $('example'),
  showAnswer: $('show-answer'),
  knowBtn: $('know-btn'),
  dontKnowBtn: $('dont-know-btn'),
  nextBtn: $('next-btn'),
  knownCount: $('known-count'),
  totalCount: $('total-count'),
  studyProgress: $('study-progress-text'),
  navTabs: document.querySelectorAll('.nav-tab'),
  modes: document.querySelectorAll('.mode'),

  reviewCard: $('review-card'),
  reviewCharacter: $('review-character'),
  reviewPinyin: $('review-pinyin'),
  reviewTranslation: $('review-translation'),
  reviewExample: $('review-example'),
  reviewShowAnswer: $('review-show-answer'),
  reviewQualityBtns: document.querySelectorAll('.review-quality'),
  reviewRestart: $('review-restart'),
  reviewRestartDone: $('review-restart-done'),
  reviewCount: $('review-count'),
  reviewPosition: $('review-position'),
  reviewDone: $('review-done'),
  reviewControls: $('review-controls'),

  statsGrid: $('stats-grid'),

  testCharacter: $('test-character'),
  testPinyin: $('test-pinyin'),
  testOptions: $('test-options'),
  testResult: $('test-result'),
  testScore: $('test-score'),
  testProgress: $('test-progress'),
  testEmpty: $('test-empty')
};

let currentWord = null;
let knownWords = JSON.parse(localStorage.getItem('knownWords') || '[]');
let studyTotalWords = 0;
let studyStudiedWords = 0;
let selectedLevel = 'all';

let reviewQueue = [];
let reviewIndex = 0;
let reviewCurrentWord = null;

// ---- Mode switching ----

elements.navTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const mode = tab.dataset.mode;
    elements.navTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    elements.modes.forEach(m => m.classList.remove('active'));
    $(`${mode}-mode`).classList.add('active');
    if (mode === 'study') {
      $('study-filter').classList.remove('hidden');
      loadStudyWord();
    } else {
      $('study-filter').classList.add('hidden');
    }
    if (mode === 'review') loadReviewQueue();
    if (mode === 'stats') loadStats();
    if (mode === 'test') loadTest();
  });
});

// ---- LocalStorage migration ----

async function migrateLocalStorage() {
  if (!knownWords.length) return;
  for (const wordId of knownWords) {
    try {
      await fetch(`${API_BASE}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word_id: wordId, known: true })
      });
    } catch (e) {
      console.error('Migration error for word', wordId, e);
    }
  }
  localStorage.removeItem('knownWords');
  knownWords = [];
}

// ---- API helpers ----

function apiFetch(url, options = {}) {
  return fetch(url, options).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
}

async function fetchRandomWord(level) {
  if (!level || level === 'all') {
    return apiFetch(`${API_BASE}/random`);
  }
  const words = await apiFetch(`${API_BASE}/words`);
  const filtered = words.filter(w => w.category === level);
  if (!filtered.length) return null;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

async function fetchTotalCount() {
  const words = await apiFetch(`${API_BASE}/words`);
  return words.length;
}

async function fetchStats() {
  return apiFetch(`${API_BASE}/progress/stats`);
}

async function fetchReviewQueue() {
  return apiFetch(`${API_BASE}/progress`);
}

async function postProgress(wordId, quality) {
  return apiFetch(`${API_BASE}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word_id: wordId, quality })
  });
}

// ---- Study mode ----

async function loadStudyWord() {
  elements.card.classList.remove('flipped');
  elements.showAnswer.classList.remove('hidden');
  elements.knowBtn.classList.add('hidden');
  elements.dontKnowBtn.classList.add('hidden');
  elements.nextBtn.classList.add('hidden');

  currentWord = null;
  const word = await fetchRandomWord(selectedLevel);
  if (word) {
    currentWord = word;
    elements.character.textContent = word.character;
    speakChinese(word.character);
    elements.pinyin.textContent = `[${word.pinyin}]`;
    elements.translation.textContent = word.translation;
    elements.example.innerHTML = highlightExamples(word.example, word.character);
    $('speak-example-btn').classList.toggle('hidden', !word.example);
  } else {
    elements.character.textContent = '⚠️';
    elements.pinyin.textContent = '';
    elements.translation.textContent = 'Ошибка загрузки. Проверьте соединение.';
    elements.example.textContent = '';
    $('speak-example-btn').classList.add('hidden');
    elements.showAnswer.classList.add('hidden');
    elements.nextBtn.textContent = 'Повторить';
    elements.nextBtn.classList.remove('hidden');
  }
  updateStudyStats();
}

async function updateStudyStats() {
  try {
    const stats = await fetchStats();
    studyTotalWords = stats.total_words;
    studyStudiedWords = stats.studied;
    elements.studyProgress.textContent = `Изучено: ${studyStudiedWords} / ${studyTotalWords}`;
  } catch (e) {
    elements.studyProgress.textContent = 'Изучено: ? / ?';
  }
}

function showStudyAnswer() {
  elements.card.classList.add('flipped');
  elements.showAnswer.classList.add('hidden');
  elements.knowBtn.classList.remove('hidden');
  elements.dontKnowBtn.classList.remove('hidden');
}

async function knowWord() {
  if (currentWord) {
    try {
      await postProgress(currentWord.id, 4);
    } catch (e) {
      console.error('Error saving progress:', e);
    }
  }
  elements.nextBtn.classList.remove('hidden');
  elements.knowBtn.classList.add('hidden');
  elements.dontKnowBtn.classList.add('hidden');
  updateStudyStats();
}

async function dontKnowWord() {
  if (currentWord) {
    try {
      await postProgress(currentWord.id, 1);
    } catch (e) {
      console.error('Error saving progress:', e);
    }
  }
  elements.nextBtn.classList.remove('hidden');
  elements.knowBtn.classList.add('hidden');
  elements.dontKnowBtn.classList.add('hidden');
  updateStudyStats();
}

function updateStats() {
  elements.knownCount.textContent = `Изучено: ${studyStudiedWords}`;
}

// ---- Review mode ----

async function loadReviewQueue() {
  reviewIndex = 0;
  reviewQueue = [];
  reviewCurrentWord = null;
  elements.reviewDone.classList.add('hidden');
  elements.reviewControls.classList.remove('hidden');
  elements.reviewCard.classList.remove('flipped');
  elements.reviewShowAnswer.classList.remove('hidden');
  elements.reviewQualityBtns.forEach(b => b.classList.add('hidden'));

  try {
    reviewQueue = await fetchReviewQueue();
  } catch (e) {
    console.error('Error fetching review queue:', e);
  }

  elements.reviewCount.textContent = `На сегодня: ${reviewQueue.length} слов`;

  if (reviewQueue.length === 0) {
    showReviewDone();
    return;
  }

  showReviewWord();
}

function showReviewWord() {
  if (reviewIndex >= reviewQueue.length) {
    showReviewDone();
    return;
  }

  elements.reviewCard.classList.remove('flipped');
  elements.reviewShowAnswer.classList.remove('hidden');
  elements.reviewQualityBtns.forEach(b => b.classList.add('hidden'));

  const entry = reviewQueue[reviewIndex];
  reviewCurrentWord = entry.Word || entry;
  elements.reviewCharacter.textContent = reviewCurrentWord.character;
  speakChinese(reviewCurrentWord.character);
  elements.reviewPinyin.textContent = `[${reviewCurrentWord.pinyin}]`;
  elements.reviewTranslation.textContent = reviewCurrentWord.translation;
  elements.reviewExample.innerHTML = highlightExamples(reviewCurrentWord.example, reviewCurrentWord.character);
  $('review-speak-example-btn').classList.toggle('hidden', !reviewCurrentWord.example);
  elements.reviewPosition.textContent = `Слово ${reviewIndex + 1} из ${reviewQueue.length}`;
}

function showReviewAnswer() {
  elements.reviewCard.classList.add('flipped');
  elements.reviewShowAnswer.classList.add('hidden');
  elements.reviewQualityBtns.forEach(b => b.classList.remove('hidden'));
}

async function submitReviewQuality(quality) {
  if (!reviewCurrentWord) return;
  try {
    await postProgress(reviewCurrentWord.id, quality);
  } catch (e) {
    console.error('Error submitting review:', e);
  }
  reviewIndex++;
  showReviewWord();
}

function showReviewDone() {
  elements.reviewDone.classList.remove('hidden');
  elements.reviewControls.classList.add('hidden');
  elements.reviewPosition.textContent = '';
  elements.reviewCount.textContent = `На сегодня: ${reviewQueue.length} слов`;
  $('review-speak-example-btn').classList.add('hidden');
}

// ---- Stats mode ----

async function loadStats() {
  elements.statsGrid.innerHTML = '<p style="text-align:center;color:#888;padding:40px;">Загрузка...</p>';
  try {
    const stats = await fetchStats();
    renderStats(stats);
  } catch (e) {
    elements.statsGrid.innerHTML = '<p style="text-align:center;color:#dc3545;padding:40px;">Ошибка загрузки статистики</p>';
  }
}

const STAT_CARDS = [
  { key: 'total_words', label: 'Всего слов', color: '#667eea' },
  { key: 'studied', label: 'Изучено', color: '#28a745' },
  { key: 'due_today', label: 'На сегодня', color: '#ffc107' },
  { key: 'in_progress', label: 'В процессе', color: '#17a2b8' },
  { key: 'total_reviews', label: 'Всего повторений', color: '#dc3545' },
  { key: 'known_words', label: 'Знаю твёрдо', color: '#28a745' }
];

function renderStats(stats) {
  const maxVal = Math.max(...STAT_CARDS.map(c => stats[c.key] || 0), 1);
  elements.statsGrid.innerHTML = STAT_CARDS.map(c => {
    const val = stats[c.key] || 0;
    const pct = (val / maxVal) * 100;
    return `
      <div class="stat-card">
        <span class="stat-card-label">${c.label}</span>
        <span class="stat-card-value">${val}</span>
        <div class="stat-bar-track">
          <div class="stat-bar-fill" style="width:${pct}%;background:${c.color};"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ---- Test mode ----

let testQueue = [];
let testIndex = 0;
let testCorrect = 0;
let testWrong = 0;
let testWrongWords = [];

async function loadTest() {
  testQueue = [];
  testIndex = 0;
  testCorrect = 0;
  testWrong = 0;
  testWrongWords = [];
  elements.testEmpty.classList.add('hidden');
  elements.testOptions.classList.remove('hidden');
  elements.testResult.textContent = '';
  elements.testScore.textContent = '✅ 0 | ❌ 0';

  try {
    const studied = await apiFetch(`${API_BASE}/progress/studied`);
    const words = studied.filter(s => s.Word).map(s => s.Word);
    if (!words.length) {
      elements.testEmpty.classList.remove('hidden');
      elements.testOptions.innerHTML = '';
      elements.testCharacter.textContent = '?';
      elements.testPinyin.textContent = '';
      elements.testProgress.textContent = 'Слово 0 / 0';
      return;
    }
    shuffleArray(words);
    testQueue = words;
    showTestWord();
  } catch (e) {
    console.error('Error loading test:', e);
  }
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function showTestWord() {
  if (testIndex >= testQueue.length) {
    showTestDone();
    return;
  }
  elements.testResult.textContent = '';
  const word = testQueue[testIndex];
  elements.testCharacter.textContent = word.character;
  elements.testPinyin.textContent = `[${word.pinyin}]`;
  elements.testProgress.textContent = `Слово ${testIndex + 1} / ${testQueue.length}`;
  generateTestOptions(word);
}

function generateTestOptions(correctWord) {
  const correctTranslation = correctWord.translation;
  const wrongTranslations = testQueue
    .filter(w => w.id !== correctWord.id && w.translation !== correctTranslation)
    .map(w => w.translation);
  const shuffledWrong = [...new Set(wrongTranslations)].sort(() => Math.random() - 0.5);
  const selectedWrong = shuffledWrong.slice(0, 3);
  const options = [correctTranslation, ...selectedWrong];
  shuffleArray(options);
  elements.testOptions.innerHTML = options.map((opt, i) =>
    `<button class="test-option" data-translation="${opt}" data-index="${i}">${opt}</button>`
  ).join('');
  elements.testOptions.querySelectorAll('.test-option').forEach(btn => {
    btn.addEventListener('click', () => handleTestAnswer(btn, correctWord));
  });
}

async function handleTestAnswer(btn, correctWord) {
  const selected = btn.dataset.translation;
  const isCorrect = selected === correctWord.translation;
  elements.testOptions.querySelectorAll('.test-option').forEach(b => b.disabled = true);
  if (isCorrect) {
    btn.classList.add('correct');
    testCorrect++;
    await postProgress(correctWord.id, 4);
  } else {
    btn.classList.add('wrong');
    testWrongWords.push(correctWord);
    testWrong++;
    elements.testOptions.querySelectorAll('.test-option').forEach(b => {
      if (b.dataset.translation === correctWord.translation) b.classList.add('correct');
    });
    await postProgress(correctWord.id, 1);
  }
  elements.testScore.textContent = `✅ ${testCorrect} | ❌ ${testWrong}`;
  if (isCorrect) {
    elements.testResult.textContent = '✅ Правильно!';
    elements.testResult.style.color = '#28a745';
  } else {
    elements.testResult.innerHTML = `❌ Неправильно! Правильный ответ: <strong>${correctWord.translation}</strong>`;
    elements.testResult.style.color = '#dc3545';
  }
  setTimeout(() => {
    testIndex++;
    showTestWord();
  }, 1500);
}

function showTestDone() {
  elements.testCharacter.textContent = '🎉';
  elements.testPinyin.textContent = '';
  elements.testOptions.innerHTML = '';
  elements.testResult.innerHTML = `<strong>Тест завершён! Правильно: ${testCorrect} из ${testQueue.length}</strong>`;
  elements.testResult.style.color = '#333';
  elements.testProgress.textContent = `Слово ${testQueue.length} / ${testQueue.length}`;
}

// ---- Speech ----

function highlightExamples(exampleStr, character) {
  if (!exampleStr) return '';
  return exampleStr.split(' ').map(w => {
    if (w.includes(character)) return `<span><strong>${w}</strong></span>`;
    return `<span>${w}</span>`;
  }).join(' ');
}

function speakChinese(text) {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  const voices = speechSynthesis.getVoices();
  const chineseVoice = voices.find(v => v.lang.startsWith('zh-') || v.lang === 'zh' || v.name.toLowerCase().includes('chinese'));
  if (chineseVoice) utterance.voice = chineseVoice;
  speechSynthesis.speak(utterance);
}

// ---- Event listeners ----

elements.showAnswer.addEventListener('click', showStudyAnswer);
elements.knowBtn.addEventListener('click', knowWord);
elements.dontKnowBtn.addEventListener('click', dontKnowWord);
elements.nextBtn.addEventListener('click', loadStudyWord);

elements.card.addEventListener('click', () => {
  if (!elements.card.classList.contains('flipped')) {
    showStudyAnswer();
  }
});

$('speak-btn').addEventListener('click', () => {
  if (currentWord) speakChinese(currentWord.character);
});

$('review-speak-btn').addEventListener('click', () => {
  if (reviewCurrentWord) speakChinese(reviewCurrentWord.character);
});

elements.reviewShowAnswer.addEventListener('click', showReviewAnswer);
elements.reviewCard.addEventListener('click', () => {
  if (!elements.reviewCard.classList.contains('flipped')) {
    showReviewAnswer();
  }
});

elements.reviewQualityBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    submitReviewQuality(parseInt(btn.dataset.quality));
  });
});

elements.reviewRestart.addEventListener('click', () => {
  loadReviewQueue();
  elements.reviewControls.classList.remove('hidden');
  elements.reviewDone.classList.add('hidden');
});

elements.reviewRestartDone.addEventListener('click', () => {
  loadReviewQueue();
  elements.reviewControls.classList.remove('hidden');
  elements.reviewDone.classList.add('hidden');
});

elements.example.addEventListener('click', (e) => {
  const span = e.target.closest('span');
  if (span) speakChinese(span.textContent.trim());
});

elements.reviewExample.addEventListener('click', (e) => {
  const span = e.target.closest('span');
  if (span) speakChinese(span.textContent.trim());
});

$('speak-example-btn').addEventListener('click', () => {
  const text = elements.example.textContent;
  if (text) speakChinese(text);
});

$('review-speak-example-btn').addEventListener('click', () => {
  const text = elements.reviewExample.textContent;
  if (text) speakChinese(text);
});

$('level-filter').addEventListener('change', (e) => {
  selectedLevel = e.target.value;
  loadStudyWord();
});

// ---- Init ----

async function init() {
  elements.example.classList.add('example-word');
  elements.reviewExample.classList.add('example-word');
  await migrateLocalStorage();
  const count = await fetchTotalCount();
  elements.totalCount.textContent = count !== null ? `Всего: ${count}` : 'Всего: ?';
  await loadStudyWord();
  await updateStudyStats();
  updateStats();
}

init();
