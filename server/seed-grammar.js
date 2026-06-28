const { GrammarRule, GrammarExercise } = require('./database');

const grammarData = [
  // ===== HSK 1 =====
  {
    title: 'Порядок слов в предложении (SVO)',
    explanation: 'В китайском языке базовый порядок слов: Подлежащее + Сказуемое + Дополнение (SVO). В отличие от русского, порядок слов строго фиксирован.',
    examples: JSON.stringify([
      { chinese: '我学习中文。', russian: 'Я учу китайский.' },
      { chinese: '他喝茶。', russian: 'Он пьёт чай.' }
    ]),
    level: 1,
    category: 'Структура',
    exercises: [
      { sentence: '我____中文。', options: ['学习', '中文', '学习中文'], correct_index: 0, explanation: 'Подлежащее + глагол + дополнение: 我 + 学习 + 中文' },
      { sentence: '他____茶。', options: ['是', '喝', '去'], correct_index: 1, explanation: 'Он пьёт чай — нужен глагол 喝 (пить)' }
    ]
  },
  {
    title: 'Вопросительная частица 吗 (ma)',
    explanation: 'Частица 吗 ставится в конце повествовательного предложения, чтобы превратить его в общий вопрос (да/нет).',
    examples: JSON.stringify([
      { chinese: '你好吗？', russian: 'Как дела? (Ты хорош?)' },
      { chinese: '你是学生吗？', russian: 'Ты студент?' }
    ]),
    level: 1,
    category: 'Вопросы',
    exercises: [
      { sentence: '你好____？', options: ['吗', '呢', '吧'], correct_index: 0, explanation: 'Общий вопрос с 吗 в конце' },
      { sentence: '他是老师____？', options: ['吗', '不', '很'], correct_index: 0, explanation: 'Он учитель? — частица 吗' }
    ]
  },
  {
    title: 'Счётные слова (классификаторы)',
    explanation: 'В китайском между числительным и существительным обязательно ставится счётное слово. Универсальное — 个 (gè).',
    examples: JSON.stringify([
      { chinese: '三个人', russian: 'три человека' },
      { chinese: '一本书', russian: 'одна книга' }
    ]),
    level: 1,
    category: 'Грамматика',
    exercises: [
      { sentence: '一____人', options: ['个', '本', '张'], correct_index: 0, explanation: '个 — универсальное счётное слово для людей' },
      { sentence: '三____苹果', options: ['张', '个', '只'], correct_index: 1, explanation: '个 для яблок (фрукты)' }
    ]
  },
  {
    title: 'Притяжательная частица 的 (de)',
    explanation: 'Частица 的 используется для обозначения принадлежности. Ставится между обладателем и объектом.',
    examples: JSON.stringify([
      { chinese: '我的书', russian: 'моя книга' },
      { chinese: '老师的笔', russian: 'ручка учителя' }
    ]),
    level: 1,
    category: 'Частицы',
    exercises: [
      { sentence: '我____朋友', options: ['的', '了', '是'], correct_index: 0, explanation: 'Мой друг — нужна притяжательная 的' },
      { sentence: '他____手机', options: ['的', '很', '不'], correct_index: 0, explanation: 'Его телефон — 的 для принадлежности' }
    ]
  },
  {
    title: 'Отрицание 不 (bù)',
    explanation: '不 ставится перед глаголом или прилагательным для отрицания. Используется для настоящего и будущего времени.',
    examples: JSON.stringify([
      { chinese: '我不是学生。', russian: 'Я не студент.' },
      { chinese: '他不喝茶。', russian: 'Он не пьёт чай.' }
    ]),
    level: 1,
    category: 'Отрицание',
    exercises: [
      { sentence: '我____是老师。', options: ['不', '没', '很'], correct_index: 0, explanation: 'Отрицание с глаголом 是 — 不是' },
      { sentence: '他____去学校。', options: ['不', '很', '的'], correct_index: 0, explanation: 'Отрицание действия — 不去' }
    ]
  },
  {
    title: 'Глагол-связка 是 (shì)',
    explanation: '是 используется как глагол-связка «быть/являться». Соединяет подлежащее и именную часть сказуемого.',
    examples: JSON.stringify([
      { chinese: '我是学生。', russian: 'Я студент.' },
      { chinese: '这是书。', russian: 'Это книга.' }
    ]),
    level: 1,
    category: 'Глаголы',
    exercises: [
      { sentence: '我____中国人。', options: ['是', '的', '很'], correct_index: 0, explanation: 'Я китаец — связка 是' },
      { sentence: '那____我的电脑。', options: ['是', '很', '不'], correct_index: 0, explanation: 'То — мой компьютер: 那是' }
    ]
  },

  // ===== HSK 2 =====
  {
    title: 'Модальная частица 了 (le) — завершённость',
    explanation: '了 ставится после глагола для обозначения завершённого действия. Указывает на изменение состояния.',
    examples: JSON.stringify([
      { chinese: '我吃饭了。', russian: 'Я поел.' },
      { chinese: '他去了商店。', russian: 'Он пошёл в магазин.' }
    ]),
    level: 2,
    category: 'Частицы',
    exercises: [
      { sentence: '我买____一本书。', options: ['了', '的', '吗'], correct_index: 0, explanation: 'Завершённое действие — нужна 了' },
      { sentence: '他今天来____。', options: ['了', '的', '很'], correct_index: 0, explanation: 'Он сегодня пришёл — 来了' }
    ]
  },
  {
    title: 'Конструкция 是...的 (shì...de)',
    explanation: 'Конструкция 是...的 используется для выделения обстоятельства (времени, места, способа) уже совершённого действия.',
    examples: JSON.stringify([
      { chinese: '我是昨天来的。', russian: 'Я приехал вчера.' },
      { chinese: '他是坐飞机去的。', russian: 'Он полетел на самолёте.' }
    ]),
    level: 2,
    category: 'Конструкции',
    exercises: [
      { sentence: '我____昨天买____。', options: ['是/的', '了/的', '的/了'], correct_index: 0, explanation: '是...的 для выделения времени действия' },
      { sentence: '他____坐火车来____。', options: ['是/的', '了/的', '很/的'], correct_index: 0, explanation: '是...的 для способа передвижения' }
    ]
  },
  {
    title: 'Сравнение с 比 (bǐ)',
    explanation: 'Конструкция A 比 B + прилагательное используется для сравнения: «A более..., чем B».',
    examples: JSON.stringify([
      { chinese: '我比他高。', russian: 'Я выше него.' },
      { chinese: '今天比昨天热。', russian: 'Сегодня жарче, чем вчера.' }
    ]),
    level: 2,
    category: 'Сравнение',
    exercises: [
      { sentence: '他比我____。', options: ['高', '很', '的'], correct_index: 0, explanation: 'Он выше меня — 他比我高' },
      { sentence: '这本书____那本书贵。', options: ['比', '很', '是'], correct_index: 0, explanation: 'Эта книга дороже той — 这本书比那本书贵' }
    ]
  },
  {
    title: 'Наречие 都 (dōu) — «все»',
    explanation: '都 ставится после подлежащего перед глаголом и означает «все», «оба». Указывает на тотальность.',
    examples: JSON.stringify([
      { chinese: '我们都很好。', russian: 'У нас всех всё хорошо.' },
      { chinese: '他们都是学生。', russian: 'Они все студенты.' }
    ]),
    level: 2,
    category: 'Наречия',
    exercises: [
      { sentence: '我们____去学校。', options: ['都', '很', '不'], correct_index: 0, explanation: 'Мы все идём в школу — 都' },
      { sentence: '他们____是中国人。', options: ['都', '的', '吗'], correct_index: 0, explanation: 'Они все китайцы — 都是' }
    ]
  },
  {
    title: 'Глагольный суффикс 过 (guo) — опыт',
    explanation: '过 после глагола обозначает опыт совершения действия в прошлом («когда-либо делал»).',
    examples: JSON.stringify([
      { chinese: '我去过中国。', russian: 'Я бывал в Китае.' },
      { chinese: '你吃过中国菜吗？', russian: 'Ты когда-нибудь ел китайскую еду?' }
    ]),
    level: 2,
    category: 'Глаголы',
    exercises: [
      { sentence: '我看____这本书。', options: ['过', '了', '的'], correct_index: 0, explanation: 'Я читал эту книгу (опыт) — 看过' },
      { sentence: '他去____北京吗？', options: ['过', '了', '很'], correct_index: 0, explanation: 'Он бывал в Пекине? — 去过' }
    ]
  },
  {
    title: 'Выражение времени: 的时候 (de shíhou)',
    explanation: 'Конструкция ...的时候 означает «когда...», «во время...». Ставится после глагола или события.',
    examples: JSON.stringify([
      { chinese: '我吃饭的时候不看电视。', russian: 'Когда я ем, не смотрю телевизор.' },
      { chinese: '他来的时候我不在家。', russian: 'Когда он пришёл, меня не было дома.' }
    ]),
    level: 2,
    category: 'Время',
    exercises: [
      { sentence: '我学习____不听音乐。', options: ['的时候', '了', '的'], correct_index: 0, explanation: 'Когда я учусь — 学习的时候' },
      { sentence: '下雨____不要出去。', options: ['的时候', '了', '吗'], correct_index: 0, explanation: 'Когда идёт дождь — 下雨的时候' }
    ]
  },

  // ===== HSK 3 =====
  {
    title: 'Конструкция 把 (bǎ)',
    explanation: '把 выносит дополнение вперёд и подчёркивает результат действия над объектом. Порядок: Субъект + 把 + Объект + Глагол + Результат.',
    examples: JSON.stringify([
      { chinese: '我把书放在桌子上。', russian: 'Я положил книгу на стол.' },
      { chinese: '请把门关上。', russian: 'Пожалуйста, закрой дверь.' }
    ]),
    level: 3,
    category: 'Конструкции',
    exercises: [
      { sentence: '请____窗户打开。', options: ['把', '被', '很'], correct_index: 0, explanation: '把 для действия над объектом (окно)' },
      { sentence: '他____作业做完了。', options: ['把', '被', '是'], correct_index: 0, explanation: 'Он сделал домашнее задание — 把作业' }
    ]
  },
  {
    title: 'Пассив с 被 (bèi)',
    explanation: '被 используется для пассивного залога: Субъект + 被 (+ Агент) + Глагол. Указывает, что действие совершается над субъектом.',
    examples: JSON.stringify([
      { chinese: '我的手机被偷了。', russian: 'Мой телефон украли.' },
      { chinese: '他被老师批评了。', russian: 'Его раскритиковал учитель.' }
    ]),
    level: 3,
    category: 'Конструкции',
    exercises: [
      { sentence: '蛋糕____吃完了。', options: ['被', '把', '的'], correct_index: 0, explanation: 'Торт съеден — пассив с 被' },
      { sentence: '他的车____偷了。', options: ['被', '把', '是'], correct_index: 0, explanation: 'Его машину украли — 被偷了' }
    ]
  },
  {
    title: 'Дополнительный член результата (结果补语)',
    explanation: 'После глагола ставится ещё один глагол или прилагательное, указывающее на результат действия.',
    examples: JSON.stringify([
      { chinese: '我听懂了。', russian: 'Я понял (на слух).' },
      { chinese: '他写完了作业。', russian: 'Он дописал домашнее задание.' }
    ]),
    level: 3,
    category: 'Глаголы',
    exercises: [
      { sentence: '我看____了。', options: ['懂', '看', '书'], correct_index: 0, explanation: 'Я понял (прочитав) — 看懂' },
      { sentence: '他吃____了饭。', options: ['完', '看', '去'], correct_index: 0, explanation: 'Он доел — 吃完' }
    ]
  },
  {
    title: 'Выражение «чем..., тем...» — 越...越... (yuè...yuè...)',
    explanation: 'Конструкция 越 A 越 B означает «чем больше A, тем больше B». Показывает пропорциональное изменение.',
    examples: JSON.stringify([
      { chinese: '他越跑越快。', russian: 'Он бежит всё быстрее.' },
      { chinese: '雨越下越大。', russian: 'Дождь идёт всё сильнее.' }
    ]),
    level: 3,
    category: 'Конструкции',
    exercises: [
      { sentence: '天气____冷。', options: ['越来越', '把', '被'], correct_index: 0, explanation: 'Погода всё холоднее — 越来越冷' },
      { sentence: '他____说____快。', options: ['越/越', '把/把', '很/很'], correct_index: 0, explanation: 'Он говорит всё быстрее — 越说越快' }
    ]
  },
  {
    title: 'Конструкция 除了...以外 (chúle...yǐwài)',
    explanation: 'Кроме... (кроме того, что...). Может означать «кроме» (исключение) или «помимо» (добавление).',
    examples: JSON.stringify([
      { chinese: '除了中文以外，他还学日语。', russian: 'Помимо китайского, он ещё учит японский.' },
      { chinese: '除了他以外，大家都来了。', russian: 'Кроме него, все пришли.' }
    ]),
    level: 3,
    category: 'Конструкции',
    exercises: [
      { sentence: '____英语____，我还学法语。', options: ['除了/以外', '因为/所以', '虽然/但是'], correct_index: 0, explanation: 'Помимо английского — 除了英语以外' },
      { sentence: '____他____，没人知道。', options: ['除了/以外', '把/了', '被/的'], correct_index: 0, explanation: 'Кроме него — 除了他以外' }
    ]
  },
  {
    title: 'Модальная частица 吧 (ba)',
    explanation: '吧 в конце предложения смягчает тон: предложение, предположение или согласие.',
    examples: JSON.stringify([
      { chinese: '我们走吧。', russian: 'Пойдём.' },
      { chinese: '你是中国人吧？', russian: 'Ты, наверное, китаец?' }
    ]),
    level: 3,
    category: 'Частицы',
    exercises: [
      { sentence: '我们开始____。', options: ['吧', '吗', '呢'], correct_index: 0, explanation: 'Давайте начнём — 吧 для предложения' },
      { sentence: '你是老师____？', options: ['吧', '吗', '的'], correct_index: 0, explanation: 'Ты учитель, да? — предположение с 吧' }
    ]
  },
  {
    title: 'Конструкция 一...就... (yī...jiù...)',
    explanation: '«Как только..., так сразу...». Выражает немедленное следование одного действия за другим.',
    examples: JSON.stringify([
      { chinese: '他一回家就睡觉。', russian: 'Как только он приходит домой, сразу ложится спать.' },
      { chinese: '我一看到他就知道。', russian: 'Как только я его увидел, сразу понял.' }
    ]),
    level: 3,
    category: 'Конструкции',
    exercises: [
      { sentence: '他____下课____去吃饭。', options: ['一/就', '越/越', '把/了'], correct_index: 0, explanation: 'Как только закончатся уроки — 一下课就' },
      { sentence: '我____到家____给你打电话。', options: ['一/就', '把/了', '被/的'], correct_index: 0, explanation: 'Как только приду домой — 一到家就' }
    ]
  },
  {
    title: 'Удвоение глагола (редупликация)',
    explanation: 'Удвоение односложного глагола (AA или A一A) придаёт действию оттенок краткости или непринуждённости.',
    examples: JSON.stringify([
      { chinese: '你看看这本书。', russian: 'Взгляни на эту книгу.' },
      { chinese: '我想休息休息。', russian: 'Я хочу немного отдохнуть.' }
    ]),
    level: 3,
    category: 'Глаголы',
    exercises: [
      { sentence: '让我想____。', options: ['想', '了', '的'], correct_index: 0, explanation: 'Дай подумать — 想想 (краткое действие)' },
      { sentence: '我们去走走____。', options: ['走', '了', '吗'], correct_index: 0, explanation: 'Пойдём прогуляемся — 走走' }
    ]
  },

  // ===== Extra rules =====
  {
    title: 'Указательные местоимения 这/那 (zhè/nà)',
    explanation: '这 (zhè) — «этот», 那 (nà) — «тот». Используются с существительными через счётное слово.',
    examples: JSON.stringify([
      { chinese: '这个苹果很大。', russian: 'Это яблоко большое.' },
      { chinese: '那个人是我朋友。', russian: 'Тот человек — мой друг.' }
    ]),
    level: 1,
    category: 'Местоимения',
    exercises: [
      { sentence: '____本书是我的。', options: ['这', '很', '不'], correct_index: 0, explanation: 'Эта книга моя — 这本书' },
      { sentence: '____个学生很聪明。', options: ['那', '很', '吗'], correct_index: 0, explanation: 'Тот студент умный — 那个学生' }
    ]
  },
  {
    title: 'Числительные и счётные слова',
    explanation: 'Между числом и существительным всегда стоит счётное слово. 二 (èr) для счёта, 两 (liǎng) перед счётным словом.',
    examples: JSON.stringify([
      { chinese: '两个苹果', russian: 'два яблока' },
      { chinese: '五本书', russian: 'пять книг' }
    ]),
    level: 1,
    category: 'Числа',
    exercises: [
      { sentence: '____个人', options: ['两', '二', '很'], correct_index: 0, explanation: 'Два человека — 两个 с 两 перед счётным словом' },
      { sentence: '三____书', options: ['本', '个', '张'], correct_index: 0, explanation: 'Три книги — счётное слово 本 для книг' }
    ]
  },
  {
    title: 'Вопросительные слова (谁, 什么, 哪儿)',
    explanation: 'Вопросительные слова ставятся на место того члена предложения, к которому относится вопрос. Порядок слов не меняется.',
    examples: JSON.stringify([
      { chinese: '他是谁？', russian: 'Кто он?' },
      { chinese: '这是什么？', russian: 'Что это?' }
    ]),
    level: 1,
    category: 'Вопросы',
    exercises: [
      { sentence: '你叫____名字？', options: ['什么', '谁', '哪儿'], correct_index: 0, explanation: 'Как тебя зовут? — 什么 для «что/какой»' },
      { sentence: '____是你的老师？', options: ['谁', '什么', '怎么'], correct_index: 0, explanation: 'Кто твой учитель? — 谁' }
    ]
  },
  {
    title: 'Модальный глагол 要 (yào)',
    explanation: '要 означает «хотеть», «собираться», «нужно». Также используется для будущего времени.',
    examples: JSON.stringify([
      { chinese: '我要喝水。', russian: 'Я хочу пить воду.' },
      { chinese: '明天要下雨。', russian: 'Завтра будет дождь.' }
    ]),
    level: 2,
    category: 'Глаголы',
    exercises: [
      { sentence: '我____去买东西。', options: ['要', '是', '很'], correct_index: 0, explanation: 'Я собираюсь пойти за покупками — 要' },
      { sentence: '他____学中文。', options: ['要', '是', '吗'], correct_index: 0, explanation: 'Он хочет учить китайский — 要学' }
    ]
  },
  {
    title: 'Конструкция 因为...所以... (yīnwèi...suǒyǐ...)',
    explanation: '«Потому что..., поэтому...». Обе части могут использоваться вместе или по отдельности.',
    examples: JSON.stringify([
      { chinese: '因为我病了，所以没去学校。', russian: 'Так как я заболел, поэтому не пошёл в школу.' },
      { chinese: '他因为下雨没来。', russian: 'Он не пришёл из-за дождя.' }
    ]),
    level: 2,
    category: 'Конструкции',
    exercises: [
      { sentence: '____下雨，____我没出去。', options: ['因为/所以', '虽然/但是', '除了/以外'], correct_index: 0, explanation: 'Из-за дождя я не вышел — 因为...所以...' },
      { sentence: '他____生病没来上班。', options: ['因为', '虽然', '把'], correct_index: 0, explanation: 'Он не пришёл из-за болезни — 因为' }
    ]
  },
  {
    title: 'Длительное время с 在 (zài)',
    explanation: '在 перед глаголом или 正在 указывает на действие в процессе (аналог Continuous).',
    examples: JSON.stringify([
      { chinese: '我在吃饭。', russian: 'Я ем (сейчас).' },
      { chinese: '他正在看书。', russian: 'Он читает книгу (прямо сейчас).' }
    ]),
    level: 2,
    category: 'Время',
    exercises: [
      { sentence: '我____做作业。', options: ['在', '是', '的'], correct_index: 0, explanation: 'Я делаю уроки (сейчас) — 在做' },
      { sentence: '妈妈____做饭。', options: ['在', '的', '吗'], correct_index: 0, explanation: 'Мама готовит (сейчас) — 在做饭' }
    ]
  },
  {
    title: 'Конструкция 虽然...但是... (suīrán...dànshì...)',
    explanation: '«Хотя..., но...». Выражает уступительное отношение.',
    examples: JSON.stringify([
      { chinese: '虽然很贵，但是我买了。', russian: 'Хотя дорого, но я купил.' },
      { chinese: '他虽然小，但是很聪明。', russian: 'Хотя он маленький, но очень умный.' }
    ]),
    level: 3,
    category: 'Конструкции',
    exercises: [
      { sentence: '____下雨了，____他去了。', options: ['虽然/但是', '因为/所以', '越/越'], correct_index: 0, explanation: 'Хотя дождь, но он пошёл — 虽然...但是...' },
      { sentence: '____很累，____很开心。', options: ['虽然/但是', '把/了', '被/的'], correct_index: 0, explanation: 'Хотя устал, но счастлив — 虽然...但是...' }
    ]
  }
];

async function seedGrammar() {
  const existing = await GrammarRule.count();
  if (existing > 0) {
    console.log(`✅ Grammar already seeded (${existing} rules), skipping`);
    return existing;
  }

  let ruleCount = 0;
  let exerciseCount = 0;

  for (const ruleData of grammarData) {
    const { exercises, ...ruleFields } = ruleData;

    const rule = await GrammarRule.create(ruleFields);
    ruleCount++;

    for (const exData of exercises) {
      await GrammarExercise.create({
        rule_id: rule.id,
        sentence: exData.sentence,
        options: JSON.stringify(exData.options),
        correct_index: exData.correct_index,
        explanation: exData.explanation
      });
      exerciseCount++;
    }
  }

  console.log(`✅ Seeded ${ruleCount} grammar rules with ${exerciseCount} exercises`);
  return ruleCount;
}

if (require.main === module) {
  const { sequelize } = require('./database');
  sequelize.sync({ force: false }).then(() => {
    return seedGrammar();
  }).then(c => { console.log(`Done: ${c} rules`); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
}

module.exports = seedGrammar;
