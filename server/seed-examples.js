const { Dictionary, sequelize } = require('./database');

// Examples for common HSK 1-3 words
const examplesMap = {
  // HSK 1
  '我': [{chinese: '我是学生。', russian: 'Я студент.'}, {chinese: '我喜欢学中文。', russian: 'Мне нравится учить китайский.'}],
  '你': [{chinese: '你好吗？', russian: 'Как дела?'}, {chinese: '你叫什么名字？', russian: 'Как тебя зовут?'}],
  '他': [{chinese: '他是中国人。', russian: 'Он китаец.'}, {chinese: '他是我的老师。', russian: 'Он мой учитель.'}],
  '她': [{chinese: '她很漂亮。', russian: 'Она красивая.'}, {chinese: '她是我朋友。', russian: 'Она моя подруга.'}],
  '好': [{chinese: '你好！', russian: 'Здравствуй!'}, {chinese: '今天天气很好。', russian: 'Сегодня хорошая погода.'}],
  '大': [{chinese: '中国很大。', russian: 'Китай большой.'}, {chinese: '这个苹果很大。', russian: 'Это яблоко большое.'}],
  '小': [{chinese: '我的狗很小。', russian: 'Моя собака маленькая.'}, {chinese: '这个房间太小了。', russian: 'Эта комната слишком маленькая.'}],
  '人': [{chinese: '我是中国人。', russian: 'Я китаец.'}, {chinese: '很多人喜欢喝茶。', russian: 'Многие любят пить чай.'}],
  '一': [{chinese: '我有一个苹果。', russian: 'У меня есть одно яблоко.'}, {chinese: '他一个人在家。', russian: 'Он один дома.'}],
  '二': [{chinese: '我有两个弟弟。', russian: 'У меня два младших брата.'}, {chinese: '二月很冷。', russian: 'В феврале холодно.'}],
  '三': [{chinese: '我家有三个人。', russian: 'В моей семье три человека.'}, {chinese: '他三岁了。', russian: 'Ему три года.'}],
  '水': [{chinese: '我要喝水。', russian: 'Я хочу пить воду.'}, {chinese: '请给我一杯水。', russian: 'Дайте, пожалуйста, стакан воды.'}],
  '火': [{chinese: '小心火！', russian: 'Осторожно, огонь!'}, {chinese: '火车来了。', russian: 'Поезд прибывает.'}],
  '天': [{chinese: '今天天气很好。', russian: 'Сегодня хорошая погода.'}, {chinese: '我每天都学中文。', russian: 'Я каждый день учу китайский.'}],
  '日': [{chinese: '今天是星期日。', russian: 'Сегодня воскресенье.'}, {chinese: '日本在中国东边。', russian: 'Япония к востоку от Китая.'}],
  '月': [{chinese: '一个月有三十天。', russian: 'В месяце тридцать дней.'}, {chinese: '月亮很亮。', russian: 'Луна яркая.'}],
  '年': [{chinese: '新年快乐！', russian: 'С новым годом!'}, {chinese: '我学了两年中文。', russian: 'Я учу китайский два года.'}],
  '吃': [{chinese: '我想吃中国菜。', russian: 'Я хочу поесть китайскую еду.'}, {chinese: '你吃早饭了吗？', russian: 'Ты позавтракал?'}],
  '喝': [{chinese: '你想喝什么？', russian: 'Что ты хочешь выпить?'}, {chinese: '我喜欢喝茶。', russian: 'Я люблю пить чай.'}],
  '去': [{chinese: '我想去中国。', russian: 'Я хочу поехать в Китай.'}, {chinese: '你明天去哪儿？', russian: 'Куда ты идёшь завтра?'}],
  '来': [{chinese: '请进来。', russian: 'Пожалуйста, входите.'}, {chinese: '他明天来我家。', russian: 'Он завтра придёт ко мне.'}],
  '看': [{chinese: '我喜欢看书。', russian: 'Я люблю читать книги.'}, {chinese: '你看电视吗？', russian: 'Ты смотришь телевизор?'}],
  '说': [{chinese: '你会说中文吗？', russian: 'Ты говоришь по-китайски?'}, {chinese: '他说什么？', russian: 'Что он сказал?'}],
  '学': [{chinese: '我在学中文。', russian: 'Я учу китайский.'}, {chinese: '学中文很有意思。', russian: 'Учить китайский очень интересно.'}],
  '做': [{chinese: '你在做什么？', russian: 'Что ты делаешь?'}, {chinese: '我会做饭。', russian: 'Я умею готовить.'}],
  '中': [{chinese: '中国很大。', russian: 'Китай большой.'}, {chinese: '中文很难。', russian: 'Китайский язык трудный.'}],
  '国': [{chinese: '中国有很长历史。', russian: 'У Китая долгая история.'}, {chinese: '你去过哪个国家？', russian: 'В каких странах ты был?'}],
  '上': [{chinese: '书在桌子上。', russian: 'Книга на столе.'}, {chinese: '我早上六点起床。', russian: 'Я встаю в шесть утра.'}],
  '下': [{chinese: '猫在桌子下面。', russian: 'Кошка под столом.'}, {chinese: '下个月我去北京。', russian: 'В следующем месяце я еду в Пекин.'}],
  '有': [{chinese: '我有一个弟弟。', russian: 'У меня есть младший брат.'}, {chinese: '你有时间吗？', russian: 'У тебя есть время?'}],
  '是': [{chinese: '我是老师。', russian: 'Я учитель.'}, {chinese: '这是你的书吗？', russian: 'Это твоя книга?'}],
  '不': [{chinese: '我不是日本人。', russian: 'Я не японец.'}, {chinese: '我不喝咖啡。', russian: 'Я не пью кофе.'}],
  '很': [{chinese: '中文很有意思。', russian: 'Китайский очень интересный.'}, {chinese: '他很高。', russian: 'Он очень высокий.'}],
  '都': [{chinese: '我们都很好。', russian: 'У нас всех всё хорошо.'}, {chinese: '他们都是学生。', russian: 'Они все студенты.'}],
  '的': [{chinese: '这是我的书。', russian: 'Это моя книга.'}, {chinese: '他是我的朋友。', russian: 'Он мой друг.'}],
  '吗': [{chinese: '你好吗？', russian: 'Как дела?'}, {chinese: '你喜欢中国菜吗？', russian: 'Тебе нравится китайская еда?'}],
  '呢': [{chinese: '你在哪儿呢？', russian: 'Где ты?'}, {chinese: '我的书呢？', russian: 'А где моя книга?'}],
  '了': [{chinese: '我吃饱了。', russian: 'Я наелся.'}, {chinese: '他去学校了。', russian: 'Он пошёл в школу.'}],
  '个': [{chinese: '这个人很高。', russian: 'Этот человек высокий.'}, {chinese: '我有三个苹果。', russian: 'У меня три яблока.'}],
  '这': [{chinese: '这是什么？', russian: 'Что это?'}, {chinese: '这本书很好看。', russian: 'Эта книга интересная.'}],
  '那': [{chinese: '那是什么？', russian: 'Что это (там)?'}, {chinese: '那个人是谁？', russian: 'Кто тот человек?'}],
  '哪': [{chinese: '你要哪个？', russian: 'Который ты хочешь?'}, {chinese: '你在哪儿？', russian: 'Где ты?'}],
  '几': [{chinese: '你有几个弟弟？', russian: 'Сколько у тебя младших братьев?'}, {chinese: '现在几点？', russian: 'Который час?'}],
  '多': [{chinese: '中国有多少人？', russian: 'Сколько людей в Китае?'}, {chinese: '他多大了？', russian: 'Сколько ему лет?'}],
  '少': [{chinese: '人很少。', russian: 'Людей мало.'}, {chinese: '多少钱？', russian: 'Сколько стоит?'}],
  '想': [{chinese: '我想去北京。', russian: 'Я хочу поехать в Пекин.'}, {chinese: '你想吃什么？', russian: 'Что ты хочешь поесть?'}],
  '爱': [{chinese: '我爱你！', russian: 'Я тебя люблю!'}, {chinese: '我爱学中文。', russian: 'Я люблю учить китайский.'}],
  '喜': [{chinese: '我喜欢喝茶。', russian: 'Мне нравится пить чай.'}, {chinese: '你喜欢什么颜色？', russian: 'Какой цвет тебе нравится?'}],
  '朋': [{chinese: '他是我的朋友。', russian: 'Он мой друг.'}, {chinese: '我有很多朋友。', russian: 'У меня много друзей.'}],
  '友': [{chinese: '你好，朋友！', russian: 'Привет, друг!'}, {chinese: '我们是好朋友。', russian: 'Мы хорошие друзья.'}],
  '家': [{chinese: '我家有三口人。', russian: 'В моей семье три человека.'}, {chinese: '我回家了。', russian: 'Я пошёл домой.'}],
  '学': [{chinese: '我是学生。', russian: 'Я студент.'}, {chinese: '他在学中文。', russian: 'Он учит китайский.'}],

  // HSK 2
  '因为': [{chinese: '因为下雨，我没去。', russian: 'Из-за дождя я не пошёл.'}, {chinese: '因为喜欢中国，我学中文。', russian: 'Так как мне нравится Китай, я учу китайский.'}],
  '所以': [{chinese: '我病了，所以没去学校。', russian: 'Я заболел, поэтому не пошёл в школу.'}, {chinese: '我喜欢中文，所以每天学习。', russian: 'Мне нравится китайский, поэтому учусь каждый день.'}],
  '虽然': [{chinese: '虽然很贵，但是我买了。', russian: 'Хотя дорого, но я купил.'}, {chinese: '他虽然小，但是很聪明。', russian: 'Хотя он маленький, но умный.'}],
  '但是': [{chinese: '中文很难，但是很有意思。', russian: 'Китайский трудный, но интересный.'}, {chinese: '他很忙，但是还是来了。', russian: 'Он занят, но всё равно пришёл.'}],
  '比': [{chinese: '我比他高。', russian: 'Я выше него.'}, {chinese: '今天比昨天热。', russian: 'Сегодня жарче, чем вчера.'}],
  '过': [{chinese: '我去过中国。', russian: 'Я бывал в Китае.'}, {chinese: '你吃过日本菜吗？', russian: 'Ты ел японскую еду?'}],
  '可以': [{chinese: '我可以进来吗？', russian: 'Можно войти?'}, {chinese: '你可以帮我吗？', russian: 'Ты можешь мне помочь?'}],
  '能': [{chinese: '你能说中文吗？', russian: 'Ты можешь говорить по-китайски?'}, {chinese: '今天不能去了。', russian: 'Сегодня не могу пойти.'}],
  '会': [{chinese: '我会说一点中文。', russian: 'Я немного говорю по-китайски.'}, {chinese: '明天会下雨吗？', russian: 'Завтра будет дождь?'}],
  '要': [{chinese: '我要一杯茶。', russian: 'Я хочу чашку чая.'}, {chinese: '你要去哪儿？', russian: 'Куда ты хочешь пойти?'}],
  '开始': [{chinese: '我们开始上课吧。', russian: 'Давайте начнём урок.'}, {chinese: '电影开始了。', russian: 'Фильм начался.'}],
  '工作': [{chinese: '他在北京工作。', russian: 'Он работает в Пекине.'}, {chinese: '你做什么工作？', russian: 'Кем ты работаешь?'}],
  '时间': [{chinese: '我没有时间。', russian: 'У меня нет времени.'}, {chinese: '现在什么时间？', russian: 'Который час?'}],
  '今天': [{chinese: '今天天气很好。', russian: 'Сегодня хорошая погода.'}, {chinese: '今天星期几？', russian: 'Какой сегодня день недели?'}],
  '明天': [{chinese: '明天见！', russian: 'Увидимся завтра!'}, {chinese: '明天我要考试。', russian: 'Завтра у меня экзамен.'}],
  '昨天': [{chinese: '昨天你去哪儿了？', russian: 'Куда ты ходил вчера?'}, {chinese: '昨天很冷。', russian: 'Вчера было холодно.'}],
  '知道': [{chinese: '我不知道。', russian: 'Я не знаю.'}, {chinese: '你知道吗？', russian: 'Ты знаешь?'}],
  '觉得': [{chinese: '我觉得中文很难。', russian: 'Я думаю, китайский трудный.'}, {chinese: '你觉得怎么样？', russian: 'Как ты думаешь?'}],
  '身体': [{chinese: '你身体好吗？', russian: 'Как твоё здоровье?'}, {chinese: '注意身体！', russian: 'Береги здоровье!'}],

  // HSK 3
  '把': [{chinese: '请把门关上。', russian: 'Пожалуйста, закрой дверь.'}, {chinese: '我把作业做完了。', russian: 'Я сделал домашнее задание.'}],
  '被': [{chinese: '我的手机被偷了。', russian: 'Мой телефон украли.'}, {chinese: '蛋糕被吃完了。', russian: 'Торт съели.'}],
  '除了': [{chinese: '除了中文，他还学日语。', russian: 'Кроме китайского, он учит японский.'}, {chinese: '除了他，大家都来了。', russian: 'Кроме него, все пришли.'}],
  '其实': [{chinese: '其实我不太懂。', russian: 'На самом деле я не очень понимаю.'}, {chinese: '其实很简单。', russian: 'На самом деле это просто.'}],
  '总是': [{chinese: '他总是迟到。', russian: 'Он всегда опаздывает.'}, {chinese: '她总是很开心。', russian: 'Она всегда весёлая.'}],
  '一直': [{chinese: '我一直在等你。', russian: 'Я всё время тебя ждал.'}, {chinese: '他一直住在北京。', russian: 'Он всегда жил в Пекине.'}],
  '用': [{chinese: '我用手机上网。', russian: 'Я выхожу в интернет с телефона.'}, {chinese: '你会用筷子吗？', russian: 'Ты умеешь пользоваться палочками?'}],
  '花': [{chinese: '这个花了多少钱？', russian: 'Сколько это стоило?'}, {chinese: '花园里有很多花。', russian: 'В саду много цветов.'}],
  '注意': [{chinese: '注意安全！', russian: 'Будь осторожен!'}, {chinese: '请注意听。', russian: 'Пожалуйста, слушайте внимательно.'}],
  '故事': [{chinese: '这本书有很多故事。', russian: 'В этой книге много историй.'}, {chinese: '他讲了一个故事。', russian: 'Он рассказал историю.'}]
};

async function seedExamples() {
  const entries = Object.entries(examplesMap);
  let updated = 0;
  let skipped = 0;

  for (const [chinese, examples] of entries) {
    const dictWord = await Dictionary.findOne({
      where: { chinese, source: 'hsk' }
    });

    if (!dictWord) {
      skipped++;
      continue;
    }

    await dictWord.update({
      examples: JSON.stringify(examples)
    });
    updated++;
  }

  console.log(`✅ Examples seeded: ${updated} updated, ${skipped} not found`);
  return updated;
}

if (require.main === module) {
  sequelize.sync({ force: false }).then(() => {
    return seedExamples();
  }).then(c => { console.log(`Done: ${c} words with examples`); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
}

module.exports = seedExamples;
