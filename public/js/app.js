const API_BASE = '/api';

const elements = {
  card: document.getElementById('card'),
  character: document.getElementById('character'),
  pinyin: document.getElementById('pinyin'),
  translation: document.getElementById('translation'),
  example: document.getElementById('example'),
  showAnswer: document.getElementById('show-answer'),
  knowBtn: document.getElementById('know-btn'),
  dontKnowBtn: document.getElementById('dont-know-btn'),
  nextBtn: document.getElementById('next-btn'),
  knownCount: document.getElementById('known-count'),
  totalCount: document.getElementById('total-count')
};

let knownWords = JSON.parse(localStorage.getItem('knownWords') || '[]');

async function fetchRandomWord() {
  try {
    const response = await fetch(`${API_BASE}/random`);
    const word = await response.json();
    return word;
  } catch (error) {
    console.error('Error fetching word:', error);
  }
}

async function fetchTotalCount() {
  try {
    const response = await fetch(`${API_BASE}/words`);
    const words = await response.json();
    return words.length;
  } catch (error) {
    console.error('Error fetching count:', error);
    return 0;
  }
}

async function loadWord() {
  elements.card.classList.remove('flipped');
  elements.showAnswer.classList.remove('hidden');
  elements.knowBtn.classList.add('hidden');
  elements.dontKnowBtn.classList.add('hidden');
  elements.nextBtn.classList.add('hidden');

  const word = await fetchRandomWord();
  if (word) {
    elements.character.textContent = word.character;
    elements.pinyin.textContent = `[${word.pinyin}]`;
    elements.translation.textContent = word.translation;
    elements.example.textContent = word.example || '';
  }
}

function showAnswer() {
  elements.card.classList.add('flipped');
  elements.showAnswer.classList.add('hidden');
  elements.knowBtn.classList.remove('hidden');
  elements.dontKnowBtn.classList.remove('hidden');
}

function knowWord() {
  if (!knownWords.includes(currentWord?.id)) {
    knownWords.push(currentWord.id);
    localStorage.setItem('knownWords', JSON.stringify(knownWords));
    updateStats();
  }
  elements.nextBtn.classList.remove('hidden');
  elements.knowBtn.classList.add('hidden');
  elements.dontKnowBtn.classList.add('hidden');
}

function dontKnowWord() {
  elements.nextBtn.classList.remove('hidden');
  elements.knowBtn.classList.add('hidden');
  elements.dontKnowBtn.classList.add('hidden');
}

function updateStats() {
  elements.knownCount.textContent = `Изучено: ${knownWords.length}`;
}

let currentWord = null;

elements.showAnswer.addEventListener('click', showAnswer);
elements.knowBtn.addEventListener('click', knowWord);
elements.dontKnowBtn.addEventListener('click', dontKnowWord);
elements.nextBtn.addEventListener('click', loadWord);

elements.card.addEventListener('click', () => {
  if (!elements.card.classList.contains('flipped')) {
    showAnswer();
  }
});

// Initial load
loadWord().then(() => {
  fetchTotalCount().then(count => {
    elements.totalCount.textContent = `Всего: ${count}`;
  });
  updateStats();
});