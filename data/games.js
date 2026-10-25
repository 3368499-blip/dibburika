/* רשימת המשחקים באתר. משחק חדש = רשומה חדשה כאן + קובץ בתיקייה games/.
 * הדשבורד קורא מכאן, ומשם אפשר לכבות ולהדליק משחקים ולשנות את הגדרות ברירת המחדל שלהם.
 * domains: תחומי הטיפול שהמשחק מתאים להם (vocab אוצר מילים, syntax תחביר, artic היגוי).
 */
window.DIB_DOMAINS = {
  vocab: { name: 'אוצר מילים', emoji: '📚', color: '#5B5BD6' },
  syntax: { name: 'תחביר', emoji: '💬', color: '#22B391' },
  artic: { name: 'היגוי', emoji: '👄', color: '#FF7A59' }
};

window.DIB_GAMES = [
  {
    id: 'path', short: 'זורקים קובייה, וכל כוכב מגלה מילה חדשה.', name: 'מסלול הכוכבים', emoji: '🌟', color: '#F59E0B', url: 'games/path.html',
    domains: ['vocab', 'artic'],
    desc: 'זורקים קובייה ומתקדמים במסלול. כל כוכב שנוחתים עליו מגלה מילה עם תמונה והקראה.',
    skills: ['חשיפה למילים', 'חפץ ושימוש', 'היגוי'], ages: '2–7',
    defaults: { length: 20, every: 2, die: 3 }
  },
  {
    id: 'bubbles', short: 'יורים על בועות, ובועה עם כוכב מגלה מילה.', name: 'בועות קסומות', emoji: '🫧', color: '#38BDF8', url: 'games/bubbles.html',
    domains: ['vocab', 'artic'],
    desc: 'יורים על בועות. כל בועה עם כוכב מתפוצצת ומגלה מילה עם תמונה והקראה.',
    skills: ['חשיפה למילים', 'חפץ ושימוש', 'היגוי'], ages: '2–7',
    defaults: { goal: 10, speed: 2, rate: 2 }
  },
  {
    id: 'memory', short: 'מוצאים זוגות של משפטים: ילד אוכל, ילדה אוכלת.', name: 'זיכרון משפטים', emoji: '🃏', color: '#22B391', url: 'games/memory.html',
    domains: ['syntax', 'vocab'],
    desc: 'משחק זיכרון עם משפטים פשוטים: ילד אוכל תפוח, ילדה אוכלת תפוח. בוחרים כמה קלפים.',
    skills: ['משפט פשוט', 'התאמה במין ובמספר', 'חפץ ושימוש'], ages: '3–8',
    defaults: { pairs: 6, similar: false, players: 1 }
  },
  {
    id: 'monster', short: 'כל מילה שאומרים מאכילה את המפלצת.', name: 'המפלצת הרעבה', emoji: '👾', color: '#7C6CF0', url: 'games/monster.html',
    domains: ['artic'],
    desc: 'תרגול היגוי: כל חזרה על מילה מאכילה את המפלצת. מאגר לפי צליל ומיקום, או רשימה משלכם.',
    skills: ['היגוי', 'חזרות', 'הקלטה עצמית'], ages: '3–10',
    defaults: { count: 10, reps: 3, rate: 'self' }
  },
  {
    id: 'vocab', short: 'מוצאים תמונה, אומרים מה זה, ומי לא שייך.', name: 'עולם המילים', emoji: '🦁', color: '#5B5BD6', url: 'games/vocab.html',
    domains: ['vocab'],
    desc: 'אוצר מילים בארבעה משחקים: זיהוי תמונה, שיום, זוגות ומי לא שייך.',
    skills: ['הבנה', 'שיום', 'קטגוריזציה'], ages: '2–8',
    defaults: { mode: 'find', cats: [], choices: 4, pairs: 6, rounds: 10, maxLevel: 3, showText: true, autoSpeak: true }
  }
];
