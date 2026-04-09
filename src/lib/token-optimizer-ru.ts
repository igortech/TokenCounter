export interface OptimizeOptions {
  model?: 'gpt4o' | 'gemma' | 'both';
  unicode?: boolean;
  spaces?: boolean;
  newlines?: boolean;
  punct?: boolean;
  vvodnie?: boolean;
  kancelaria?: boolean;
  pleonazm?: boolean;
  razgovor?: boolean;
  passiv?: boolean;
  biznes?: boolean;
  coach?: boolean;
  contractions?: boolean;
  protectQuotes?: boolean;
  stripHtml?: boolean;
  stripMarkdown?: boolean;
  rewriteUrls?: boolean;
  dedupeLines?: boolean;
  compactLists?: boolean;
  minifyJson?: boolean;
  squeezePunctuation?: boolean;
  compactKeyValue?: boolean;
  removeComments?: boolean;
  removeEmoji?: boolean;
  normalizeNumbers?: boolean;
  removeArticles?: boolean;
}

export interface OptimizeResult {
  text: string;
  appliedRules: string[];
  tokensBefore: number;
  tokensAfter: number;
  saved: number;
  savedPct: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sortRules = (rules: [RegExp, string][]) => 
  [...rules].sort((a, b) => b[0].source.length - a[0].source.length);

function buildReplacer(rules: [RegExp, string][]) {
  if (rules.length === 0) return (text: string) => text;
  
  // Pre-compile test regexes for each rule
  const compiledRules = sortRules(rules).map(([re, rep]) => ({
    rep,
    testRe: new RegExp(`^${re.source}$`, 'iu')
  }));
  
  // Combine all regexes into one using alternation
  const pattern = rules.map(([re]) => `(?:${re.source})`).join('|');
  const regex = new RegExp(pattern, 'giu');
  
  return (text: string) => {
    if (!text) return text;
    return text.replace(regex, (match) => {
      for (const rule of compiledRules) {
        if (rule.testRe.test(match)) return rule.rep;
      }
      return match;
    });
  };
}

// ─── 0. Unicode → ASCII ───────────────────────────────────────────────────────

const UNICODE_REPLACEMENTS: [RegExp, string][] = [
  [/…/g,              '...'],
  [/[–—]/g,           '-'],
  [/[«»„"]/g,         '"'],
  [/[''‚]/g,          "'"],
  [/\u00a0/g,         ' '],    // неразрывный пробел
  [/\u200b|\u200c|\u200d/g, ''], // нулевая ширина
  [/\u2060/g,         ''],    // word joiner
  [/\u00ad/g,         ''],    // мягкий перенос
  [/\u2116/g,         'No.'], // №
  [/\u00d7/g,         'x'],   // ×
  [/\u00b0/g,         ' deg'],// °
  [/ё/g,              'е'],   // Замена ё на е
  [/Ё/g,              'Е'],   // Замена Ё на Е
];

// ─── 1. Вводные слова-паразиты ────────────────────────────────────────────────

const VVODNIE = sortRules([
  [/\bтак или иначе\b/giu,              ''],
  [/\bтем не менее\b/giu,              'но'],
  [/\bпо большому счёту\b/giu,         'в целом'],
  [/\bпо большому счету\b/giu,         'в целом'],
  [/\bна самом деле\b/giu,             'фактически'],
  [/\bна самом то деле\b/giu,          'фактически'],
  [/\bсобственно говоря\b/giu,         ''],
  [/\bпо всей видимости\b/giu,         'видимо'],
  [/\bпо всей вероятности\b/giu,       'вероятно'],
  [/\bв той или иной мере\b/giu,       'отчасти'],
  [/\bв том или ином виде\b/giu,       ''],
  [/\bв конечном счёте\b/giu,          'в итоге'],
  [/\bв конечном счете\b/giu,          'в итоге'],
  [/\bтак сказать\b/giu,               ''],
  [/\bкак бы то ни было\b/giu,         ''],
  [/\bчто называется\b/giu,            ''],
  [/\bне секрет что\b/giu,             ''],
  [/\bизвестно что\b/giu,              ''],
  [/\bочевидно что\b/giu,              ''],
  [/\bразумеется\b/giu,                ''],
  [/\bбесспорно\b/giu,                 ''],
  [/\bнеоспоримо\b/giu,                ''],
  [/\bв свою очередь\b/giu,            ''],
  [/\bпри этом\b/giu,                  ''],
  [/\bв данном случае\b/giu,           'здесь'],
  [/\bв общем и целом\b/giu,           'в целом'],
  [/\bв общем-то\b/giu,                ''],
  [/\bв принципе,\s*/giu,              ''],
  [/\bв целом,\s*/giu,                 ''],
  [/\bпо сути,\s*/giu,                 ''],
  [/\bпо факту,\s*/giu,                ''],
  [/\bвообще-то,\s*/giu,               ''],
  [/\bсмотрите,\s*/giu,                ''],
  [/\bпонимаете,\s*/giu,               ''],
  [/\bзнаете,\s*/giu,                  ''],
  [/\bслушайте,\s*/giu,                ''],
  [/\bвидите ли,\s*/giu,               ''],
]);

// ─── 2. Канцеляризмы официального стиля ──────────────────────────────────────

const KANCELARIA = sortRules([
  [/\bнеобходимо в обязательном порядке\b/giu, 'нужно'],
  [/\bв обязательном порядке\b/giu,            'обязательно'],
  [/\bпроизводить оплату\b/giu,               'платить'],
  [/\bпроизводить расчёт\b/giu,               'считать'],
  [/\bосуществлять контроль\b/giu,            'контролировать'],
  [/\bосуществлять руководство\b/giu,         'руководить'],
  [/\bосуществлять поддержку\b/giu,           'поддерживать'],
  [/\bоказывать содействие\b/giu,             'помогать'],
  [/\bоказывать влияние на\b/giu,             'влиять на'],
  [/\bоказывать воздействие на\b/giu,         'влиять на'],
  [/\bосуществлять\b/giu,                     'делать'],
  [/\bосуществляет\b/giu,                     'делает'],
  [/\bосуществляли\b/giu,                     'делали'],
  [/\bпроизводить\b/giu,                      'делать'],
  [/\bпринять меры по\b/giu,                  'сделать'],
  [/\bпринять решение о\b/giu,                'решить'],
  [/\bвынести решение\b/giu,                  'решить'],
  [/\bпроизводить замену\b/giu,               'заменять'],
  [/\bпроведение мероприятий по\b/giu,        ''],
  [/\bв целях обеспечения\b/giu,              'чтобы обеспечить'],
  [/\bв целях\b/giu,                          'для'],
  [/\bв рамках\b/giu,                         'в'],
  [/\bв части\b/giu,                          'по'],
  [/\bпо вопросу\b/giu,                       'о'],
  [/\bв адрес\b/giu,                          ''],
  [/\bна предмет\b/giu,                       'на'],
  [/\bвзаимодействие с\b/giu,                 'работа с'],
  [/\bфункционирование\b/giu,                 'работа'],
  [/\bфункционирует\b/giu,                    'работает'],
  [/\bнастоящим сообщаем,?\s*что\b/giu,       ''],
  [/\bдоводим до вашего сведения,?\s*что\b/giu, ''],
  [/\bинформируем вас о том,?\s*что\b/giu,    ''],
  [/\bсообщаем вам,?\s*что\b/giu,            ''],
  [/\bв ответ на ваш(е|у) (запрос|обращение)\b/giu, ''],
  [/\bнаправляем вам\b/giu,                  ''],
  [/\bпо итогам\b/giu,                       'после'],
  [/\bв соответствии с\b/giu,               'по'],
  [/\bна основании\b/giu,                   'по'],
  [/\bсогласно\b/giu,                       'по'],
  [/\bданного\b/giu,  'этого'],
  [/\bданному\b/giu,  'этому'],
  [/\bданным\b/giu,   'этим'],
  [/\bданных\b/giu,   'этих'],
  [/\bданной\b/giu,   'этой'],
  [/\bданное\b/giu,   'это'],
  [/\bданная\b/giu,   'эта'],
  [/\bданный\b/giu,   'этот'],
  [/\bна сегодняшний день\b/giu,  'сейчас'],
  [/\bв настоящее время\b/giu,   'сейчас'],
  [/\bна данный момент\b/giu,    'сейчас'],
  [/\bв данный момент\b/giu,     'сейчас'],
  [/\bна текущий момент\b/giu,   'сейчас'],
  [/\bв ближайшее время\b/giu,   'скоро'],
  [/\bв кратчайшие сроки\b/giu,  'быстро'],
  [/\bявляется\b/giu,            '-'],
  [/\bявляются\b/giu,            '-'],
  [/\bследует отметить,?\s*что\b/giu,      ''],
  [/\bнеобходимо отметить,?\s*что\b/giu,   ''],
  [/\bважно отметить,?\s*что\b/giu,        ''],
  [/\bстоит также отметить,?\s*что\b/giu,  ''],
  [/\bхотелось бы отметить,?\s*что\b/giu,  ''],
  [/\bотдельно стоит сказать,?\s*что\b/giu,''],
  [/\bследует сказать,?\s*что\b/giu,       ''],
  [/\bнеобходимо сказать,?\s*что\b/giu,    ''],
  [/\bдля того чтобы\b/giu,               'чтобы'],
  [/\bв связи с тем что\b/giu,            'так как'],
  [/\bв связи с этим\b/giu,              ''],
  [/\bввиду того что\b/giu,              'так как'],
  [/\bввиду этого\b/giu,                 'поэтому'],
  [/\bпо причине\b/giu,                  'из-за'],
  [/\bв случае если\b/giu,               'если'],
  [/\bпри условии что\b/giu,             'если'],
  [/\bа также\b/giu,                     'и'],
  [/\bтакже и\b/giu,                     'и'],
]);

// ─── 3. Плеоназмы и тавтологии ───────────────────────────────────────────────

const PLEONAZM = sortRules([
  [/\bсовместное сотрудничество\b/giu,     'сотрудничество'],
  [/\bвзаимное сотрудничество\b/giu,       'сотрудничество'],
  [/\bпрейскурант цен\b/giu,               'прейскурант'],
  [/\bпамятный сувенир\b/giu,              'сувенир'],
  [/\bначать сначала\b/giu,                'начать'],
  [/\bвернуться обратно\b/giu,             'вернуться'],
  [/\bподняться вверх\b/giu,               'подняться'],
  [/\bопуститься вниз\b/giu,               'опуститься'],
  [/\bсвободная вакансия\b/giu,            'вакансия'],
  [/\bфактические данные\b/giu,            'данные'],
  [/\bконечный итог\b/giu,                 'итог'],
  [/\bконечный результат\b/giu,            'результат'],
  [/\bпервый дебют\b/giu,                  'дебют'],
  [/\bбиография жизни\b/giu,               'биография'],
  [/\bкраткое резюме\b/giu,                'резюме'],
  [/\bполный аншлаг\b/giu,                 'аншлаг'],
  [/\bсамый оптимальный\b/giu,             'оптимальный'],
  [/\bнаиболее оптимальный\b/giu,          'оптимальный'],
  [/\bнаиболее лучший\b/giu,               'лучший'],
  [/\bнаиболее худший\b/giu,               'худший'],
  [/\bвсе без исключения\b/giu,            'все'],
  [/\bзаранее предупреждать\b/giu,         'предупреждать'],
  [/\bзаранее предвидеть\b/giu,            'предвидеть'],
  [/\bпредварительная договорённость\b/giu,'договорённость'],
  [/\bабсолютно новый\b/giu,               'новый'],
  [/\bмаксимально высокое\b/giu,           'высокое'],
  [/\bминимально низкое\b/giu,             'низкое'],
  [/\bосновной акцент\b/giu,               'акцент'],
  [/\bглавная суть\b/giu,                  'суть'],
  [/\bнеобходимо нужно\b/giu,              'нужно'],
  [/\bболее детальнее\b/giu,               'детальнее'],
  [/\bболее лучше\b/giu,                   'лучше'],
  [/\bсовсем не нужно\b/giu,              'не нужно'],
  [/\bпридётся столкнуться\b/giu,         'столкнуться'],
]);

// ─── 4. Разговорные паразиты ──────────────────────────────────────────────────

const RAZGOVOR = sortRules([
  [/\bну вот\b/giu,      ''],
  [/\bну да\b/giu,       'да'],
  [/\bну и\b/giu,        'и'],
  [/\bну,?\s+/giu,       ''],
  [/\bвот,?\s+/giu,      ''],
  [/\bтипа\b/giu,        ''],
  [/\bкак бы\b/giu,      ''],
  [/\bтак вот\b/giu,     ''],
  [/\bну так\b/giu,      'так'],
  [/\bэтак\b/giu,        'так'],
  [/\bблин\b/giu,        ''],
  [/\bвообщем\b/giu,     'в общем'],
  [/\bвообщем-то\b/giu,  ''],
  [/\bтипа того\b/giu,   ''],
  [/\bкороче говоря\b/giu, 'короче'],
  [/\bпростыми словами\b/giu, ''],
  [/\bговоря иначе\b/giu, ''],
  [/\bдругими словами\b/giu, ''],
  [/\bиными словами\b/giu, ''],
  [/\bто есть\b/giu,      ''],
  [/\bто бишь\b/giu,      ''],
]);

// ─── 5. Пассивные конструкции → активные ─────────────────────────────────────

const PASSIV = sortRules([
  [/\bбыло принято решение\b/giu,       'решили'],
  [/\bбыло проведено\b/giu,             'провели'],
  [/\bбыло выявлено\b/giu,              'выявили'],
  [/\bбыло установлено\b/giu,           'установили'],
  [/\bбыло разработано\b/giu,           'разработали'],
  [/\bбыло подготовлено\b/giu,          'подготовили'],
  [/\bбыло отмечено\b/giu,              'отметили'],
  [/\bбыло рассмотрено\b/giu,           'рассмотрели'],
  [/\bможно отметить\b/giu,             ''],
  [/\bможно сказать\b/giu,              ''],
  [/\bможно наблюдать\b/giu,            'видно'],
  [/\bследует учитывать\b/giu,          'учитывайте'],
  [/\bнеобходимо учитывать\b/giu,       'учитывайте'],
  [/\bнеобходимо помнить\b/giu,         'помните'],
  [/\bнеобходимо понимать\b/giu,        'понимайте'],
  [/\bнужно понимать\b/giu,             ''],
  [/\bстоит понимать\b/giu,             ''],
  [/\bстоит учитывать\b/giu,            ''],
]);

// ─── 6. Деловые клише ────────────────────────────────────────────────────────

const BIZNES = sortRules([
  [/\bспасибо за ваш(е|у) (обращение|заявку|вопрос|сообщение)\b/giu, 'спасибо!'],
  [/\bбудем рады помочь\b/giu,                 'поможем'],
  [/\bс удовольствием поможем\b/giu,           'поможем'],
  [/\bнаша команда\b/giu,                      'мы'],
  [/\bспециалисты нашей компании\b/giu,       'мы'],
  [/\bсотрудники компании\b/giu,              'мы'],
  [/\bв рамках данного проекта\b/giu,         'в проекте'],
  [/\bв ходе работы\b/giu,                    'в процессе'],
  [/\bна протяжении всего (процесса|пути)\b/giu, 'всё время'],
  [/\bв максимально короткие сроки\b/giu,    'быстро'],
  [/\bв ближайшее время свяжемся\b/giu,       'свяжемся'],
  [/\bприносим свои извинения\b/giu,          'извините'],
  [/\bпросим прощения\b/giu,                  'извините'],
  [/\bпрошу прощения\b/giu,                   'извините'],
  [/\bвсегда готовы помочь\b/giu,             ''],
  [/\bобратитесь к нам\b/giu,                 'пишите'],
  [/\bнe стесняйтесь обращаться\b/giu,        'пишите'],
  [/\bесть вопросы - пишите\b/giu,            'пишите'],
  [/\bпо всем вопросам\b/giu,                 ''],
  [/\bпо любым вопросам\b/giu,                ''],
  [/\bдля уточнения деталей\b/giu,            ''],
  [/\bжелаем успехов\b/giu,                   ''],
  [/\bжелаем удачи\b/giu,                     ''],
  [/\bхорошего дня\b/giu,                     ''],
  [/\bхорошего вечера\b/giu,                  ''],
]);

// ─── 7. Коучинг / психология / продажи ───────────────────────────────────────

const COACH = sortRules([
  [/\bдавайте разберёмся\b/giu,              ''],
  [/\bдавайте посмотрим\b/giu,              ''],
  [/\bдавайте поговорим о\b/giu,            'о'],
  [/\bдавайте начнём с\b/giu,               'начнём с'],
  [/\bдавайте подведём итог\b/giu,          'итог:'],
  [/\bесли говорить честно\b/giu,           ''],
  [/\bесли быть честным\b/giu,              ''],
  [/\bговоря откровенно\b/giu,              ''],
  [/\bоткровенно говоря\b/giu,              ''],
  [/\bпо-честному\b/giu,                    ''],
  [/\bочень важно понимать,?\s*что\b/giu,   ''],
  [/\bключевой момент здесь в том,?\s*что\b/giu, ''],
  [/\bглавное здесь\b/giu,                  ''],
  [/\bхочу обратить ваше внимание на\b/giu, 'важно:'],
  [/\bобратите внимание на\b/giu,           ''],
  [/\bзаметьте,?\s*что\b/giu,               ''],
  [/\bстоит обратить внимание\b/giu,        ''],
  [/\bэто очень важно\b/giu,                ''],
  [/\bэто крайне важно\b/giu,               ''],
  [/\bэто принципиально важно\b/giu,        ''],
  [/\bработа над собой\b/giu,               'развитие'],
  [/\bличностный рост\b/giu,                'рост'],
  [/\bличностное развитие\b/giu,            'развитие'],
  [/\bдостичь результата\b/giu,             'достичь цели'],
  [/\bдостижение результатов\b/giu,         'результаты'],
  [/\bвыйти на новый уровень\b/giu,         'расти'],
  [/\bраскрыть свой потенциал\b/giu,        'расти'],
  [/\bстать лучшей версией себя\b/giu,      'расти'],
  [/\bпройти трансформацию\b/giu,           'измениться'],
  [/\bпроработать (страхи|блоки|ограничения)\b/giu, 'разобраться со страхами'],
  [/\bпрактика осознанности\b/giu,          'осознанность'],
  [/\bзона комфорта\b/giu,                  ''],
  [/\bвыйти из зоны комфорта\b/giu,        'сделать шаг'],
  [/\bглубинная работа\b/giu,               'работа'],
  [/\bресурсное состояние\b/giu,            'состояние'],
  [/\bточка роста\b/giu,                    'возможность'],
  [/\bточка боли\b/giu,                     'боль'],
  [/\bглубинная боль\b/giu,                 'боль'],
  [/\bжизненный путь\b/giu,                 'путь'],
  [/\bуникальное предложение\b/giu,         'предложение'],
  [/\bэксклюзивное предложение\b/giu,       'предложение'],
  [/\bлучшее решение\b/giu,                 'решение'],
  [/\bидеальное решение\b/giu,              'решение'],
  [/\bкомплексное решение\b/giu,            'решение'],
  [/\bкомплексный подход\b/giu,             'подход'],
  [/\bиндивидуальный подход\b/giu,          ''],
  [/\bвысокое качество\b/giu,               'качество'],
  [/\bотличное качество\b/giu,              'качество'],
  [/\bширокий спектр (услуг|возможностей)\b/giu, 'много вариантов'],
  [/\bбольшой опыт работы\b/giu,            'опыт'],
  [/\bмноголетний опыт\b/giu,               'опыт'],
  [/\bпрофессиональная команда\b/giu,       'команда'],
  [/\bгарантируем результат\b/giu,          'гарантия'],
  [/\bбез лишних слов\b/giu,                ''],
  [/\bпо выгодной цене\b/giu,               ''],
  [/\bпо доступной цене\b/giu,              ''],
]);

// ─── 8. Сокращения (EN-вставки в русских текстах) ────────────────────────────

const CONTRACTIONS_EN = sortRules([
  [/\bdo not\b/giu,               "don't"],
  [/\bcannot\b/giu,               "can't"],
  [/\bcould not\b/giu,            "couldn't"],
  [/\bwould not\b/giu,            "wouldn't"],
  [/\bshould not\b/giu,           "shouldn't"],
  [/\bis not\b/giu,               "isn't"],
  [/\bare not\b/giu,              "aren't"],
  [/\bwas not\b/giu,              "wasn't"],
  [/\bwere not\b/giu,             "weren't"],
  [/\bwill not\b/giu,             "won't"],
  [/\bhave not\b/giu,             "haven't"],
  [/\bhas not\b/giu,              "hasn't"],
  [/\bhad not\b/giu,              "hadn't"],
  [/\bI am\b/gu,                  "I'm"],
  [/\bthey are\b/giu,             "they're"],
  [/\bwe are\b/giu,               "we're"],
  [/\byou are\b/giu,              "you're"],
  [/\bit is\b/giu,                "it's"],
  [/\bthat is\b/giu,              "that's"],
  [/\bthere is\b/giu,             "there's"],
  [/\bin order to\b/giu,          'to'],
  [/\bdue to the fact that\b/giu, 'because'],
  [/\bin the event that\b/giu,    'if'],
  [/\bwith regard to\b/giu,       'about'],
  [/\bprior to\b/giu,             'before'],
  [/\bsubsequent to\b/giu,        'after'],
  [/\bfor the purpose of\b/giu,   'to'],
  [/\bat the present time\b/giu,  'now'],
  [/\bat this point in time\b/giu,'now'],
]);

// ─── 9. Удаление комментариев ──────────────────────────────────────────────────

const REMOVE_COMMENTS = sortRules([
  [/\/\/.*$/gmu, ''],
  [/\/\*[\s\S]*?\*\//gu, ''],
]);

// ─── 10. Удаление emoji ────────────────────────────────────────────────────────

const REMOVE_EMOJI = sortRules([
  [/[\u{1F600}-\u{1F64F}]/gu, ''], // emoticons
  [/[\u{1F300}-\u{1F5FF}]/gu, ''], // symbols
  [/[\u{1F680}-\u{1F6FF}]/gu, ''], // transport & map
  [/[\u{2600}-\u{26FF}]/gu, ''],   // misc symbols
  [/[\u{2700}-\u{27BF}]/gu, ''],   // dingbats
]);

// ─── 11. Оптимизация чисел ─────────────────────────────────────────────────────

const NORMALIZE_NUMBERS = sortRules([
  [/(\d),(\d)/gu, '$1$2'],
]);

// ─── 12. Удаление артиклей (EN) ────────────────────────────────────────────────

const ARTICLES_EN = sortRules([
  [/\b(the|a|an)\s+/giu, ''],
]);

// ─── Pre-compiled Replacers ──────────────────────────────────────────────────

const REPLACER_UNICODE     = buildReplacer(UNICODE_REPLACEMENTS);
const REPLACER_VVODNIE     = buildReplacer(VVODNIE);
const REPLACER_KANCELARIA  = buildReplacer(KANCELARIA);
const REPLACER_PLEONAZM    = buildReplacer(PLEONAZM);
const REPLACER_RAZGOVOR    = buildReplacer(RAZGOVOR);
const REPLACER_PASSIV      = buildReplacer(PASSIV);
const REPLACER_BIZNES      = buildReplacer(BIZNES);
const REPLACER_COACH       = buildReplacer(COACH);
const REPLACER_CONTRACTIONS = buildReplacer(CONTRACTIONS_EN);
const REPLACER_COMMENTS    = buildReplacer(REMOVE_COMMENTS);
const REPLACER_EMOJI       = buildReplacer(REMOVE_EMOJI);
const REPLACER_NUMBERS     = buildReplacer(NORMALIZE_NUMBERS);
const REPLACER_ARTICLES    = buildReplacer(ARTICLES_EN);

function applyRules(text: string, rules: [RegExp, string][]): string {
  const replacer = buildReplacer(rules);
  return replacer(text);
}

function stripHtmlFn(text: string) {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
}

function simplifyMarkdownFn(text: string) {
  return text
    .replace(/```[a-zA-Z0-9_-]*\n?/g, "")
    .replace(/```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1");
}

function rewriteUrlsFn(text: string) {
  return text.replace(/https?:\/\/[^\s)]+/gi, (url) => {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  });
}

function dedupeConsecutiveLinesFn(text: string) {
  const lines = text.split("\n");
  const out = [];
  let prevNorm = null;
  for (const line of lines) {
    const norm = line.trim().replace(/\s+/g, " ");
    if (norm && norm === prevNorm) continue;
    out.push(line);
    prevNorm = norm || null;
  }
  return out.join("\n");
}

function compactBulletBlocksFn(text: string, joiner = "; ") {
  const blocks = text.split(/\n{2,}/);
  const bulletRe = /^\s*(?:[-*•]|\d+[.)])\s+(.+?)\s*$/;

  const compacted = blocks.map((block) => {
    const lines = block
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (lines.length < 2) return block;

    const items = [];
    for (const line of lines) {
      const m = line.match(bulletRe);
      if (!m) return block;
      items.push(m[1]);
    }

    return items.join(joiner);
  });

  return compacted.join("\n\n");
}

function squeezePunctuationFn(text: string) {
  return text
    .replace(/([!?.,;:])\1+/g, "$1")
    .replace(/-{2,}/g, "-")
    .replace(/\.{4,}/g, "...");
}

function compactKeyValueSpacingFn(text: string) {
  return text
    .replace(/\s*:\s*/g, ": ")
    .replace(/\s*=\s*/g, "=")
    .replace(/\s*,\s*/g, ", ");
}

function looksLikeJson(text: string) {
  const s = text.trim();
  return (s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"));
}

function cleanup(text: string): string {
  if (!text) return '';

  // Сохраняем блоки кода
  const codeBlocks: string[] = [];
  const tWithPlaceholders = text.replace(/```[\s\S]*?```/g, (m) => {
    codeBlocks.push(m);
    return `__CODE_${codeBlocks.length - 1}__`;
  });

  const cleaned = tWithPlaceholders
    .replace(/\s{2,}/g, ' ')          // двойные пробелы
    .replace(/\s+([,.:;!?])/g, '$1')  // пробел перед знаком
    .replace(/([,.:;])\1+/g, '$1')    // повторяющийся знак
    .replace(/,\s*\./g, '.')          // ,. → .
    .replace(/^\s*[,.:;]+\s*/gm, '')  // знак в начале строки
    .replace(/\n{3,}/g, '\n\n')       // тройные переносы
    .trim();

  // Восстанавливаем блоки кода
  return cleaned.replace(/__CODE_(\d+)__/g, (_, i) => codeBlocks[+i]);
}

export function optimize(text: string, options: OptimizeOptions = {}): OptimizeResult {
  if (!text || !text.trim()) {
    return { text: '', appliedRules: [], tokensBefore: 0, tokensAfter: 0, saved: 0, savedPct: 0 };
  }

  const cfg = {
    model:       'gpt4o',
    unicode:     true,
    spaces:      true,
    newlines:    true,
    punct:       true,
    vvodnie:     true,
    kancelaria:  true,
    pleonazm:    true,
    razgovor:    false,
    passiv:      true,
    biznes:      false,
    coach:       false,
    contractions:false,
    protectQuotes: true,
    stripHtml:   false,
    stripMarkdown: false,
    rewriteUrls: false,
    dedupeLines: false,
    compactLists: false,
    minifyJson:  false,
    squeezePunctuation: false,
    compactKeyValue: false,
    removeComments: false,
    removeEmoji: false,
    normalizeNumbers: false,
    removeArticles: false,
    ...options,
  };

  let t = text;
  const applied: string[] = [];
  const placeholders: string[] = [];

  if (cfg.protectQuotes) {
    // Защищаем текст внутри кавычек, скобок и квадратных скобок (критично для промптов)
    const quoteRegex = /([«"](?:(?![»"])[\s\S])*[»"]|"(?:(?!(?<!\\)")[\s\S])*"|'(?:(?!(?<!\\)')[\s\S])*'|\[[^\]]*\]|\([^)]*\))/gu;
    t = t.replace(quoteRegex, (match) => {
      placeholders.push(match);
      return `__QUOTE_${placeholders.length - 1}__`;
    });
  }

  if (cfg.stripHtml) {
    const b = t;
    t = stripHtmlFn(t);
    if (t !== b) applied.push('Удаление HTML');
  }

  if (cfg.stripMarkdown) {
    const b = t;
    t = simplifyMarkdownFn(t);
    if (t !== b) applied.push('Упрощение Markdown');
  }

  if (cfg.rewriteUrls) {
    const b = t;
    t = rewriteUrlsFn(t);
    if (t !== b) applied.push('Сокращение ссылок');
  }

  if (cfg.dedupeLines) {
    const b = t;
    t = dedupeConsecutiveLinesFn(t);
    if (t !== b) applied.push('Удаление дублей строк');
  }

  if (cfg.compactLists) {
    const b = t;
    t = compactBulletBlocksFn(t);
    if (t !== b) applied.push('Сжатие списков');
  }

  const step = (flag: keyof OptimizeOptions, label: string, replacer: (t: string) => string) => {
    if (!cfg[flag]) return;
    const before = t;
    t = replacer(t);
    if (t !== before) applied.push(label);
  };

  if (cfg.unicode) {
    const b = t;
    t = REPLACER_UNICODE(t);
    if (t !== b) applied.push('Unicode → ASCII');
  }

  if (cfg.newlines) {
    const b = t;
    t = t.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n');
    if (t !== b) applied.push('Лишние переносы');
  }

  if (cfg.spaces) {
    const b = t;
    t = t.replace(/[ \t]{2,}/g, ' ').replace(/^ +| +$/gm, '').trim();
    if (t !== b) applied.push('Лишние пробелы');
  }

  if (cfg.punct) {
    const b = t;
    t = t.replace(/([!?]){2,}/g, '$1').replace(/,{2,}/g, ',').replace(/\.{4,}/g, '...');
    if (t !== b) applied.push('Повторяющаяся пунктуация');
  }

  step('pleonazm',   'Плеоназмы и тавтологии',              REPLACER_PLEONAZM);
  step('kancelaria', 'Канцеляризмы',                         REPLACER_KANCELARIA);
  step('vvodnie',    'Вводные слова-паразиты',               REPLACER_VVODNIE);
  step('passiv',     'Пассивные конструкции → активные',     REPLACER_PASSIV);
  step('biznes',     'Деловые клише',                        REPLACER_BIZNES);
  step('coach',      'Коучинг / психология / продажи',       REPLACER_COACH);
  step('razgovor',   'Разговорные паразиты',                 REPLACER_RAZGOVOR);
  step('contractions','EN-сокращения',                       REPLACER_CONTRACTIONS);
  step('removeComments', 'Удаление комментариев',            REPLACER_COMMENTS);
  step('removeEmoji',    'Удаление Emoji',                   REPLACER_EMOJI);
  step('normalizeNumbers', 'Нормализация чисел',             REPLACER_NUMBERS);
  step('removeArticles',   'Удаление артиклей (EN)',         REPLACER_ARTICLES);

  if (cfg.minifyJson && looksLikeJson(t)) {
    try {
      t = JSON.stringify(JSON.parse(t));
      applied.push('Minify JSON');
    } catch {}
  }

  if (cfg.squeezePunctuation) {
    const b = t;
    t = squeezePunctuationFn(t);
    if (t !== b) applied.push('Сжатие пунктуации');
  }

  if (cfg.compactKeyValue) {
    const b = t;
    t = compactKeyValueSpacingFn(t);
    if (t !== b) applied.push('Сжатие пробелов (key:value)');
  }

  if (cfg.protectQuotes) {
    placeholders.forEach((val, idx) => {
      t = t.replace(`__QUOTE_${idx}__`, val);
    });
  }

  t = cleanup(t);

  const models = cfg.model === 'both' ? ['gpt4o', 'gemma'] : [cfg.model];
  const avg = (arr: number[]) => arr.reduce((s, x) => s + x, 0) / arr.length;

  const tokensBefore = Math.round(avg(models.map(m => estimateTokens(text, m as 'gpt4o'|'gemma'))));
  const tokensAfter  = Math.round(avg(models.map(m => estimateTokens(t, m as 'gpt4o'|'gemma'))));
  const saved        = tokensBefore - tokensAfter;
  const savedPct     = tokensBefore > 0 ? Math.round(saved / tokensBefore * 100) : 0;

  return { text: t, appliedRules: applied, tokensBefore, tokensAfter, saved, savedPct };
}

export function estimateTokens(text: string, model: 'gpt4o' | 'gemma' = 'gpt4o'): number {
  if (!text || !text.trim()) return 0;
  const chars    = text.length;
  const words    = text.trim().split(/\s+/).length;
  const cyrCount = (text.match(/[\u0400-\u04FF]/g) || []).length;
  const cyrRatio = cyrCount / chars;

  if (model === 'gemma') {
    return Math.round(cyrCount * 0.55 + (chars - cyrCount) * 0.3 + 2);
  }
  // GPT-4o
  if (cyrRatio > 0.3) return Math.round(chars * 0.45);
  return Math.round(words * 1.3 + chars * 0.02);
}

export function optimizeBatch(texts: string[], options: OptimizeOptions = {}) {
  const results      = texts.map(t => optimize(t, options));
  const totalBefore  = results.reduce((s, r) => s + r.tokensBefore, 0);
  const totalAfter   = results.reduce((s, r) => s + r.tokensAfter,  0);
  const totalSaved   = totalBefore - totalAfter;
  const totalSavedPct = totalBefore > 0
    ? Math.round(totalSaved / totalBefore * 100) : 0;
  return { results, totalSaved, totalSavedPct };
}
