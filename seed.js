const sequelize = require('./server/database');
const Word = require('./server/models/Word');

const words = [
  { character: '你', pinyin: 'nǐ', translation: 'ты', example: '你好 - привет', category: 'общие', difficulty: 1 },
  { character: '好', pinyin: 'hǎo', translation: 'хороший', example: '你好 - привет', category: 'общие', difficulty: 1 },
  { character: '我', pinyin: 'wǒ', translation: 'я', example: '我叫李明 - меня зовут Ли Мин', category: 'общие', difficulty: 1 },
  { character: '中', pinyin: 'zhōng', translation: 'центр', example: '中国 - Китай', category: 'общие', difficulty: 1 },
  { character: '国', pinyin: 'guó', translation: 'страна', example: '中国 - Китай', category: 'общие', difficulty: 1 },
  { character: '学', pinyin: 'xué', translation: 'учиться', example: '学习 - обучение', category: 'общие', difficulty: 1 },
  { character: '习', pinyin: 'xí', translation: 'повторять', example: '学习 - обучение', category: 'общие', difficulty: 1 },
  { character: '生', pinyin: 'shēng', translation: 'род', example: '', category: 'жизнь', difficulty: 2 },
  { character: '活', pinyin: 'huó', translation: 'жить', example: '生活 - жизнь, жить', category: 'жизнь', difficulty: 2 },
  { character: '吃', pinyin: 'chī', translation: 'есть', example: '吃饭 - есть', category: 'еда', difficulty: 1 },
  { character: '饭', pinyin: 'fàn', translation: 'еда, рис', example: '吃饭 - есть', category: 'еда', difficulty: 1 },
  { character: '水', pinyin: 'shuǐ', translation: 'вода', example: '', category: 'еда', difficulty: 1 },
  { character: '茶', pinyin: 'chá', translation: 'чай', example: '', category: 'еда', difficulty: 1 },
  { character: '一', pinyin: 'yī', translation: 'один', example: '', category: 'числа', difficulty: 1 },
  { character: '二', pinyin: 'èr', translation: 'два', example: '', category: 'числа', difficulty: 1 },
  { character: '三', pinyin: 'sān', translation: 'три', example: '', category: 'числа', difficulty: 1 },
  { character: '天', pinyin: 'tiān', translation: 'небо, день', example: '今天 - сегодня', category: 'общие', difficulty: 1 },
  { character: '地', pinyin: 'dì', translation: 'земля', example: '', category: 'общие', difficulty: 2 },
  { character: '人', pinyin: 'rén', translation: 'человек', example: '中国人 - китаец', category: 'общие', difficulty: 1 },
  { character: '大', pinyin: 'dà', translation: 'большой', example: '大家 - все', category: 'общие', difficulty: 1 },
  { character: '小', pinyin: 'xiǎo', translation: 'маленький', example: '', category: 'общие', difficulty: 1 },
  { character: '多', pinyin: 'duō', translation: 'много', example: '', category: 'общие', difficulty: 1 },
  { character: '少', pinyin: 'shǎo', translation: 'мало', example: '', category: 'общие', difficulty: 1 },
  { character: '爱', pinyin: 'ài', translation: 'любить', example: '', category: 'чувства', difficulty: 2 },
  { character: '喜', pinyin: 'xǐ', translation: 'счастье', example: '喜欢 - нравится', category: 'чувства', difficulty: 2 },
  { character: '欢', pinyin: 'huān', translation: 'радость', example: '喜欢 - нравится', category: 'чувства', difficulty: 2 },
  { character: '是', pinyin: 'shì', translation: 'быть', example: '我是学生 - я студент', category: 'глаголы', difficulty: 1 },
  { character: '不', pinyin: 'bù', translation: 'не', example: '不是 - не является', category: 'частицы', difficulty: 1 },
  { character: '很', pinyin: 'hěn', translation: 'очень', example: '很好 - очень хорошо', category: 'частицы', difficulty: 1 },
  { character: '好', pinyin: 'hǎo', translation: 'хороший', example: '很好 - очень хорошо', category: 'общие', difficulty: 1 },
  { character: '再', pinyin: 'zài', translation: 'еще', example: '', category: 'частицы', difficulty: 2 },
  { character: '见', pinyin: 'jiàn', translation: 'видеть', example: '见面 - встретиться', category: 'глаголы', difficulty: 2 },
  { character: '面', pinyin: 'miàn', translation: 'лицо', example: '见面 - встретиться', category: 'глаголы', difficulty: 2 }
];

async function seed() {
  try {
    await sequelize.sync({ force: true });
    await Word.bulkCreate(words);
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();