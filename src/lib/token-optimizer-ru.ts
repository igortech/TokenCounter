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
}

export interface OptimizeResult {
  text: string;
  appliedRules: string[];
  tokensBefore: number;
  tokensAfter: number;
  saved: number;
  savedPct: number;
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

const VVODNIE: [RegExp, string][] = [
  [/\bтак или иначе\b/gi,              ''],
  [/\bтем не менее\b/gi,              'но'],
  [/\bпо большому счёту\b/gi,         'в целом'],
  [/\bпо большому счету\b/gi,         'в целом'],
  [/\bна самом деле\b/gi,             'фактически'],
  [/\bна самом то деле\b/gi,          'фактически'],
  [/\bсобственно говоря\b/gi,         ''],
  [/\bпо всей видимости\b/gi,         'видимо'],
  [/\bпо всей вероятности\b/gi,       'вероятно'],
  [/\bв той или иной мере\b/gi,       'отчасти'],
  [/\bв том или ином виде\b/gi,       ''],
  [/\bв конечном счёте\b/gi,          'в итоге'],
  [/\bв конечном счете\b/gi,          'в итоге'],
  [/\bтак сказать\b/gi,               ''],
  [/\bкак бы то ни было\b/gi,         ''],
  [/\bчто называется\b/gi,            ''],
  [/\bне секрет что\b/gi,             ''],
  [/\bизвестно что\b/gi,              ''],
  [/\bочевидно что\b/gi,              ''],
  [/\bразумеется\b/gi,                ''],
  [/\bбесспорно\b/gi,                 ''],
  [/\bнеоспоримо\b/gi,                ''],
  [/\bв свою очередь\b/gi,            ''],
  [/\bпри этом\b/gi,                  ''],
  [/\bв данном случае\b/gi,           'здесь'],
  [/\bв общем и целом\b/gi,           'в целом'],
  [/\bв общем-то\b/gi,                ''],
  [/\bв принципе,\s*/gi,              ''],
  [/\bв целом,\s*/gi,                 ''],
  [/\bпо сути,\s*/gi,                 ''],
  [/\bпо факту,\s*/gi,                ''],
  [/\bвообще-то,\s*/gi,               ''],
  [/\bсмотрите,\s*/gi,                ''],
  [/\bпонимаете,\s*/gi,               ''],
  [/\bзнаете,\s*/gi,                  ''],
  [/\bслушайте,\s*/gi,                ''],
  [/\bвидите ли,\s*/gi,               ''],
];

// ─── 2. Канцеляризмы официального стиля ──────────────────────────────────────

const KANCELARIA: [RegExp, string][] = [
  [/\bнеобходимо в обязательном порядке\b/gi, 'нужно'],
  [/\bв обязательном порядке\b/gi,            'обязательно'],
  [/\bпроизводить оплату\b/gi,               'платить'],
  [/\bпроизводить расчёт\b/gi,               'считать'],
  [/\bосуществлять контроль\b/gi,            'контролировать'],
  [/\bосуществлять руководство\b/gi,         'руководить'],
  [/\bосуществлять поддержку\b/gi,           'поддерживать'],
  [/\bоказывать содействие\b/gi,             'помогать'],
  [/\bоказывать влияние на\b/gi,             'влиять на'],
  [/\bоказывать воздействие на\b/gi,         'влиять на'],
  [/\bосуществлять\b/gi,                     'делать'],
  [/\bосуществляет\b/gi,                     'делает'],
  [/\bосуществляли\b/gi,                     'делали'],
  [/\bпроизводить\b/gi,                      'делать'],
  [/\bпринять меры по\b/gi,                  'сделать'],
  [/\bпринять решение о\b/gi,                'решить'],
  [/\bвынести решение\b/gi,                  'решить'],
  [/\bпроизводить замену\b/gi,               'заменять'],
  [/\bпроведение мероприятий по\b/gi,        ''],
  [/\bв целях обеспечения\b/gi,              'чтобы обеспечить'],
  [/\bв целях\b/gi,                          'для'],
  [/\bв рамках\b/gi,                         'в'],
  [/\bв части\b/gi,                          'по'],
  [/\bпо вопросу\b/gi,                       'о'],
  [/\bв адрес\b/gi,                          ''],
  [/\bна предмет\b/gi,                       'на'],
  [/\bвзаимодействие с\b/gi,                 'работа с'],
  [/\bфункционирование\b/gi,                 'работа'],
  [/\bфункционирует\b/gi,                    'работает'],
  [/\bнастоящим сообщаем,?\s*что\b/gi,       ''],
  [/\bдоводим до вашего сведения,?\s*что\b/gi, ''],
  [/\bинформируем вас о том,?\s*что\b/gi,    ''],
  [/\bсообщаем вам,?\s*что\b/gi,            ''],
  [/\bв ответ на ваш(е|у) (запрос|обращение)\b/gi, ''],
  [/\bнаправляем вам\b/gi,                  ''],
  [/\bпо итогам\b/gi,                       'после'],
  [/\bв соответствии с\b/gi,               'по'],
  [/\bна основании\b/gi,                   'по'],
  [/\bсогласно\b/gi,                       'по'],
  [/\bданного\b/gi,  'этого'],
  [/\bданному\b/gi,  'этому'],
  [/\bданным\b/gi,   'этим'],
  [/\bданных\b/gi,   'этих'],
  [/\bданной\b/gi,   'этой'],
  [/\bданное\b/gi,   'это'],
  [/\bданная\b/gi,   'эта'],
  [/\bданный\b/gi,   'этот'],
  [/\bна сегодняшний день\b/gi,  'сейчас'],
  [/\bв настоящее время\b/gi,   'сейчас'],
  [/\bна данный момент\b/gi,    'сейчас'],
  [/\bв данный момент\b/gi,     'сейчас'],
  [/\bна текущий момент\b/gi,   'сейчас'],
  [/\bв ближайшее время\b/gi,   'скоро'],
  [/\bв кратчайшие сроки\b/gi,  'быстро'],
  [/\bявляется\b/gi,            '-'],
  [/\bявляются\b/gi,            '-'],
  [/\bследует отметить,?\s*что\b/gi,      ''],
  [/\bнеобходимо отметить,?\s*что\b/gi,   ''],
  [/\bважно отметить,?\s*что\b/gi,        ''],
  [/\bстоит также отметить,?\s*что\b/gi,  ''],
  [/\bхотелось бы отметить,?\s*что\b/gi,  ''],
  [/\bотдельно стоит сказать,?\s*что\b/gi,''],
  [/\bследует сказать,?\s*что\b/gi,       ''],
  [/\bнеобходимо сказать,?\s*что\b/gi,    ''],
  [/\bдля того чтобы\b/gi,               'чтобы'],
  [/\bв связи с тем что\b/gi,            'так как'],
  [/\bв связи с этим\b/gi,              ''],
  [/\bввиду того что\b/gi,              'так как'],
  [/\bввиду этого\b/gi,                 'поэтому'],
  [/\bпо причине\b/gi,                  'из-за'],
  [/\bв случае если\b/gi,               'если'],
  [/\bпри условии что\b/gi,             'если'],
  [/\bа также\b/gi,                     'и'],
  [/\bтакже и\b/gi,                     'и'],
];

// ─── 3. Плеоназмы и тавтологии ───────────────────────────────────────────────

const PLEONAZM: [RegExp, string][] = [
  [/\bсовместное сотрудничество\b/gi,     'сотрудничество'],
  [/\bвзаимное сотрудничество\b/gi,       'сотрудничество'],
  [/\bпрейскурант цен\b/gi,               'прейскурант'],
  [/\bпамятный сувенир\b/gi,              'сувенир'],
  [/\bначать сначала\b/gi,                'начать'],
  [/\bвернуться обратно\b/gi,             'вернуться'],
  [/\bподняться вверх\b/gi,               'подняться'],
  [/\bопуститься вниз\b/gi,               'опуститься'],
  [/\bсвободная вакансия\b/gi,            'вакансия'],
  [/\bфактические данные\b/gi,            'данные'],
  [/\bконечный итог\b/gi,                 'итог'],
  [/\bконечный результат\b/gi,            'результат'],
  [/\bпервый дебют\b/gi,                  'дебют'],
  [/\bбиография жизни\b/gi,               'биография'],
  [/\bкраткое резюме\b/gi,                'резюме'],
  [/\bполный аншлаг\b/gi,                 'аншлаг'],
  [/\bсамый оптимальный\b/gi,             'оптимальный'],
  [/\bнаиболее оптимальный\b/gi,          'оптимальный'],
  [/\bнаиболее лучший\b/gi,               'лучший'],
  [/\bнаиболее худший\b/gi,               'худший'],
  [/\bвсе без исключения\b/gi,            'все'],
  [/\bзаранее предупреждать\b/gi,         'предупреждать'],
  [/\bзаранее предвидеть\b/gi,            'предвидеть'],
  [/\bпредварительная договорённость\b/gi,'договорённость'],
  [/\bабсолютно новый\b/gi,               'новый'],
  [/\bмаксимально высокое\b/gi,           'высокое'],
  [/\bминимально низкое\b/gi,             'низкое'],
  [/\bосновной акцент\b/gi,               'акцент'],
  [/\bглавная суть\b/gi,                  'суть'],
  [/\bнеобходимо нужно\b/gi,              'нужно'],
  [/\bболее детальнее\b/gi,               'детальнее'],
  [/\bболее лучше\b/gi,                   'лучше'],
  [/\bсовсем не нужно\b/gi,              'не нужно'],
  [/\bпридётся столкнуться\b/gi,         'столкнуться'],
];

// ─── 4. Разговорные паразиты ──────────────────────────────────────────────────

const RAZGOVOR: [RegExp, string][] = [
  [/\bну вот\b/gi,      ''],
  [/\bну да\b/gi,       'да'],
  [/\bну и\b/gi,        'и'],
  [/\bну,?\s+/gi,       ''],
  [/\bвот,?\s+/gi,      ''],
  [/\bтипа\b/gi,        ''],
  [/\bкак бы\b/gi,      ''],
  [/\bтак вот\b/gi,     ''],
  [/\bну так\b/gi,      'так'],
  [/\bэтак\b/gi,        'так'],
  [/\bблин\b/gi,        ''],
  [/\bвообщем\b/gi,     'в общем'],
  [/\bвообщем-то\b/gi,  ''],
  [/\bтипа того\b/gi,   ''],
  [/\bкороче говоря\b/gi, 'короче'],
  [/\bпростыми словами\b/gi, ''],
  [/\bговоря иначе\b/gi, ''],
  [/\bдругими словами\b/gi, ''],
  [/\bиными словами\b/gi, ''],
  [/\bто есть\b/gi,      ''],
  [/\bто бишь\b/gi,      ''],
];

// ─── 5. Пассивные конструкции → активные ─────────────────────────────────────

const PASSIV: [RegExp, string][] = [
  [/\bбыло принято решение\b/gi,       'решили'],
  [/\bбыло проведено\b/gi,             'провели'],
  [/\bбыло выявлено\b/gi,              'выявили'],
  [/\bбыло установлено\b/gi,           'установили'],
  [/\bбыло разработано\b/gi,           'разработали'],
  [/\bбыло подготовлено\b/gi,          'подготовили'],
  [/\bбыло отмечено\b/gi,              'отметили'],
  [/\bбыло рассмотрено\b/gi,           'рассмотрели'],
  [/\bможно отметить\b/gi,             ''],
  [/\bможно сказать\b/gi,              ''],
  [/\bможно наблюдать\b/gi,            'видно'],
  [/\bследует учитывать\b/gi,          'учитывайте'],
  [/\bнеобходимо учитывать\b/gi,       'учитывайте'],
  [/\bнеобходимо помнить\b/gi,         'помните'],
  [/\bнеобходимо понимать\b/gi,        'понимайте'],
  [/\bнужно понимать\b/gi,             ''],
  [/\bстоит понимать\b/gi,             ''],
  [/\bстоит учитывать\b/gi,            ''],
];

// ─── 6. Деловые клише ────────────────────────────────────────────────────────

const BIZNES: [RegExp, string][] = [
  [/\bспасибо за ваш(е|у) (обращение|заявку|вопрос|сообщение)\b/gi, 'спасибо!'],
  [/\bбудем рады помочь\b/gi,                 'поможем'],
  [/\bс удовольствием поможем\b/gi,           'поможем'],
  [/\bнаша команда\b/gi,                      'мы'],
  [/\bспециалисты нашей компании\b/gi,       'мы'],
  [/\bсотрудники компании\b/gi,              'мы'],
  [/\bв рамках данного проекта\b/gi,         'в проекте'],
  [/\bв ходе работы\b/gi,                    'в процессе'],
  [/\bна протяжении всего (процесса|пути)\b/gi, 'всё время'],
  [/\bв максимально короткие сроки\b/gi,    'быстро'],
  [/\bв ближайшее время свяжемся\b/gi,       'свяжемся'],
  [/\bприносим свои извинения\b/gi,          'извините'],
  [/\bпросим прощения\b/gi,                  'извините'],
  [/\bпрошу прощения\b/gi,                   'извините'],
  [/\bвсегда готовы помочь\b/gi,             ''],
  [/\bобратитесь к нам\b/gi,                 'пишите'],
  [/\bнe стесняйтесь обращаться\b/gi,        'пишите'],
  [/\bесть вопросы - пишите\b/gi,            'пишите'],
  [/\bпо всем вопросам\b/gi,                 ''],
  [/\bпо любым вопросам\b/gi,                ''],
  [/\bдля уточнения деталей\b/gi,            ''],
  [/\bжелаем успехов\b/gi,                   ''],
  [/\bжелаем удачи\b/gi,                     ''],
  [/\bхорошего дня\b/gi,                     ''],
  [/\bхорошего вечера\b/gi,                  ''],
];

// ─── 7. Коучинг / психология / продажи ───────────────────────────────────────

const COACH: [RegExp, string][] = [
  [/\bдавайте разберёмся\b/gi,              ''],
  [/\bдавайте посмотрим\b/gi,              ''],
  [/\bдавайте поговорим о\b/gi,            'о'],
  [/\bдавайте начнём с\b/gi,               'начнём с'],
  [/\bдавайте подведём итог\b/gi,          'итог:'],
  [/\bесли говорить честно\b/gi,           ''],
  [/\bесли быть честным\b/gi,              ''],
  [/\bговоря откровенно\b/gi,              ''],
  [/\bоткровенно говоря\b/gi,              ''],
  [/\bпо-честному\b/gi,                    ''],
  [/\bочень важно понимать,?\s*что\b/gi,   ''],
  [/\bключевой момент здесь в том,?\s*что\b/gi, ''],
  [/\bглавное здесь\b/gi,                  ''],
  [/\bхочу обратить ваше внимание на\b/gi, 'важно:'],
  [/\bобратите внимание на\b/gi,           ''],
  [/\bзаметьте,?\s*что\b/gi,               ''],
  [/\bстоит обратить внимание\b/gi,        ''],
  [/\bэто очень важно\b/gi,                ''],
  [/\bэто крайне важно\b/gi,               ''],
  [/\bэто принципиально важно\b/gi,        ''],
  [/\bработа над собой\b/gi,               'развитие'],
  [/\bличностный рост\b/gi,                'рост'],
  [/\bличностное развитие\b/gi,            'развитие'],
  [/\bдостичь результата\b/gi,             'достичь цели'],
  [/\bдостижение результатов\b/gi,         'результаты'],
  [/\bвыйти на новый уровень\b/gi,         'расти'],
  [/\bраскрыть свой потенциал\b/gi,        'расти'],
  [/\bстать лучшей версией себя\b/gi,      'расти'],
  [/\bпройти трансформацию\b/gi,           'измениться'],
  [/\bпроработать (страхи|блоки|ограничения)\b/gi, 'разобраться со страхами'],
  [/\bпрактика осознанности\b/gi,          'осознанность'],
  [/\bзона комфорта\b/gi,                  ''],
  [/\bвыйти из зоны комфорта\b/gi,        'сделать шаг'],
  [/\bглубинная работа\b/gi,               'работа'],
  [/\bресурсное состояние\b/gi,            'состояние'],
  [/\bточка роста\b/gi,                    'возможность'],
  [/\bточка боли\b/gi,                     'боль'],
  [/\bглубинная боль\b/gi,                 'боль'],
  [/\bжизненный путь\b/gi,                 'путь'],
  [/\bуникальное предложение\b/gi,         'предложение'],
  [/\bэксклюзивное предложение\b/gi,       'предложение'],
  [/\bлучшее решение\b/gi,                 'решение'],
  [/\bидеальное решение\b/gi,              'решение'],
  [/\bкомплексное решение\b/gi,            'решение'],
  [/\bкомплексный подход\b/gi,             'подход'],
  [/\bиндивидуальный подход\b/gi,          ''],
  [/\bвысокое качество\b/gi,               'качество'],
  [/\bотличное качество\b/gi,              'качество'],
  [/\bширокий спектр (услуг|возможностей)\b/gi, 'много вариантов'],
  [/\bбольшой опыт работы\b/gi,            'опыт'],
  [/\bмноголетний опыт\b/gi,               'опыт'],
  [/\bпрофессиональная команда\b/gi,       'команда'],
  [/\bгарантируем результат\b/gi,          'гарантия'],
  [/\bбез лишних слов\b/gi,                ''],
  [/\bпо выгодной цене\b/gi,               ''],
  [/\bпо доступной цене\b/gi,              ''],
];

// ─── 8. Сокращения (EN-вставки в русских текстах) ────────────────────────────

const CONTRACTIONS_EN: [RegExp, string][] = [
  [/\bdo not\b/gi,               "don't"],
  [/\bcannot\b/gi,               "can't"],
  [/\bcould not\b/gi,            "couldn't"],
  [/\bwould not\b/gi,            "wouldn't"],
  [/\bshould not\b/gi,           "shouldn't"],
  [/\bis not\b/gi,               "isn't"],
  [/\bare not\b/gi,              "aren't"],
  [/\bwas not\b/gi,              "wasn't"],
  [/\bwere not\b/gi,             "weren't"],
  [/\bwill not\b/gi,             "won't"],
  [/\bhave not\b/gi,             "haven't"],
  [/\bhas not\b/gi,              "hasn't"],
  [/\bhad not\b/gi,              "hadn't"],
  [/\bI am\b/g,                  "I'm"],
  [/\bthey are\b/gi,             "they're"],
  [/\bwe are\b/gi,               "we're"],
  [/\byou are\b/gi,              "you're"],
  [/\bit is\b/gi,                "it's"],
  [/\bthat is\b/gi,              "that's"],
  [/\bthere is\b/gi,             "there's"],
  [/\bin order to\b/gi,          'to'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bin the event that\b/gi,    'if'],
  [/\bwith regard to\b/gi,       'about'],
  [/\bprior to\b/gi,             'before'],
  [/\bsubsequent to\b/gi,        'after'],
  [/\bfor the purpose of\b/gi,   'to'],
  [/\bat the present time\b/gi,  'now'],
  [/\bat this point in time\b/gi,'now'],
];

function applyRules(text: string, rules: [RegExp, string][]): string {
  for (const [re, rep] of rules) {
    text = text.replace(re, rep);
  }
  return text;
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
  return text
    .replace(/\s{2,}/g, ' ')          // двойные пробелы
    .replace(/\s+([,.:;!?])/g, '$1')  // пробел перед знаком
    .replace(/([,.:;])\1+/g, '$1')    // повторяющийся знак
    .replace(/,\s*\./g, '.')          // ,. → .
    .replace(/^\s*[,.:;]+\s*/gm, '')  // знак в начале строки
    .replace(/\n{3,}/g, '\n\n')       // тройные переносы
    .trim();
}

export function optimize(text: string, options: OptimizeOptions = {}): OptimizeResult {
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
    ...options,
  };

  let t = text;
  const applied: string[] = [];
  const placeholders: string[] = [];

  if (cfg.protectQuotes) {
    // Защищаем текст внутри кавычек, скобок и квадратных скобок (критично для промптов)
    const quoteRegex = /([«"'][^«"'»]*[»"']|\[[^\]]*\]|\([^)]*\))/g;
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

  const step = (flag: keyof OptimizeOptions, label: string, rules: [RegExp, string][]) => {
    if (!cfg[flag]) return;
    const before = t;
    t = applyRules(t, rules);
    if (t !== before) applied.push(label);
  };

  if (cfg.unicode) {
    const b = t;
    t = applyRules(t, UNICODE_REPLACEMENTS);
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

  step('pleonazm',   'Плеоназмы и тавтологии',              PLEONAZM);
  step('kancelaria', 'Канцеляризмы',                         KANCELARIA);
  step('vvodnie',    'Вводные слова-паразиты',               VVODNIE);
  step('passiv',     'Пассивные конструкции → активные',     PASSIV);
  step('biznes',     'Деловые клише',                        BIZNES);
  step('coach',      'Коучинг / психология / продажи',       COACH);
  step('razgovor',   'Разговорные паразиты',                 RAZGOVOR);
  step('contractions','EN-сокращения',                       CONTRACTIONS_EN);

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
