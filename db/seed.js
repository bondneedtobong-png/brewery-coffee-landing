'use strict';
const bcrypt = require('bcryptjs');
const db = require('./database');
const { tierFor } = require('../lib/loyalty');

/* ============================================================
   Helpers
   ============================================================ */

function clear() {
    db.exec(`
        DELETE FROM reviews;
        DELETE FROM transactions;
        DELETE FROM loyalty;
        DELETE FROM events;
        DELETE FROM menu_items;
        DELETE FROM users;
        DELETE FROM sqlite_sequence;
    `);
}

const insertUser = db.prepare(`
    INSERT INTO users (name, phone, email, password_hash, role, consent_given, consent_at)
    VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
`);

const insertLoyalty = db.prepare(`
    INSERT INTO loyalty (user_id, total_spent, level, discount_pct)
    VALUES (?, ?, ?, ?)
`);

const insertTx = db.prepare(`
    INSERT INTO transactions (user_id, amount, description, created_at)
    VALUES (?, ?, ?, datetime('now', ?))
`);

const insertMenu = db.prepare(`
    INSERT INTO menu_items (category, title, description, price, volume, tags, is_hit, is_new, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertReview = db.prepare(`
    INSERT INTO reviews (user_id, text, rating, status, created_at)
    VALUES (?, ?, ?, ?, datetime('now', ?))
`);

const insertEvent = db.prepare(`
    INSERT INTO events (title, description, event_date, status)
    VALUES (?, ?, ?, ?)
`);

function makeUser({ name, phone, email, password, role, totalSpent }) {
    const hash = bcrypt.hashSync(password, 10);
    const userId = insertUser.run(name, phone, email, hash, role).lastInsertRowid;
    const tier = tierFor(totalSpent);
    insertLoyalty.run(userId, totalSpent, tier.level, tier.discount);
    /* one demo transaction so totals look real */
    if (totalSpent > 0) {
        insertTx.run(userId, totalSpent, 'Демо: исторические покупки', '-30 days');
    }
    return userId;
}

/* ============================================================
   Seed
   ============================================================ */

console.log('[seed] Wiping tables...');
clear();

/* ---------- Users ---------- */
console.log('[seed] Creating users...');

const adminId = makeUser({
    name: 'Анна Администратор',
    phone: '+79990000001',
    email: 'admin@brewery.coffee',
    password: 'admin1234',
    role: 'admin',
    totalSpent: 0,
});

const modId = makeUser({
    name: 'Мария Модератор',
    phone: '+79990000002',
    email: 'mod@brewery.coffee',
    password: 'mod12345',
    role: 'moderator',
    totalSpent: 0,
});

/* Tier-1-3 users */
const userBronze1 = makeUser({
    name: 'Иван Петров',
    phone: '+79991110001',
    email: 'ivan@example.com',
    password: 'user1234',
    role: 'user',
    totalSpent: 1500,    /* level 1 */
});
const userBronze2 = makeUser({
    name: 'Ольга Иванова',
    phone: '+79991110002',
    email: 'olga@example.com',
    password: 'user1234',
    role: 'user',
    totalSpent: 4200,    /* level 2 */
});
const userBronze3 = makeUser({
    name: 'Сергей Никитин',
    phone: '+79991110003',
    email: 'sergey@example.com',
    password: 'user1234',
    role: 'user',
    totalSpent: 9100,    /* level 3 */
});

/* Tier-4-9 users */
const userMid1 = makeUser({
    name: 'Елена Смирнова',
    phone: '+79991110004',
    email: 'elena@example.com',
    password: 'user1234',
    role: 'user',
    totalSpent: 18000,   /* level 4 */
});
const userMid2 = makeUser({
    name: 'Александр Беляев',
    phone: '+79991110005',
    email: 'alex@example.com',
    password: 'user1234',
    role: 'user',
    totalSpent: 52000,   /* level 7 */
});
const userMid3 = makeUser({
    name: 'Дарья Орлова',
    phone: '+79991110006',
    email: 'dasha@example.com',
    password: 'user1234',
    role: 'user',
    totalSpent: 88000,   /* level 8 */
});

/* Tier-10 user */
const userGold = makeUser({
    name: 'Михаил Жуковский',
    phone: '+79991110007',
    email: 'mikhail@example.com',
    password: 'user1234',
    role: 'user',
    totalSpent: 145000,  /* level 10 */
});

/* ---------- Menu — drinks only ---------- */
console.log('[seed] Filling menu...');

const menu = [
    /* category, title, description, price, volume, tags, hit, new, sort */
    ['espresso', 'Эспрессо', 'Двойной шот из бленда «Утренний» — Бразилия и Эфиопия. Тёмный шоколад, абрикос, длинное послевкусие.', 220, '35 мл', 'бленд', 1, 0, 10],
    ['espresso', 'Допио', 'Двойной концентрированный эспрессо для тех, кто любит характер. Подаём с водой.', 240, '60 мл', 'двойной,характерный', 0, 0, 20],
    ['espresso', 'Капучино', 'Бархатное молоко с плотной пенкой и латте-арт. Фермерское или растительное молоко.', 320, '200 мл', 'молоко,классика', 0, 0, 30],
    ['espresso', 'Флэт-уайт', 'Двойной ристретто и шёлковое молоко. Сильный характер без лишней пены.', 340, '180 мл', 'ристретто', 0, 0, 40],
    ['espresso', 'Раф медовый', 'Эспрессо, сливки и цветочный мёд от башкирского пасечника. Десерт в чашке.', 380, '250 мл', 'авторский,сладкий', 0, 1, 50],
    ['espresso', 'Латте кардамоновый', 'Молочная классика с щепоткой кардамона и кленовым сиропом. Согревает зимой.', 360, '300 мл', 'сезон,специи', 0, 0, 60],

    ['alternative', 'V60 Эфиопия Yirgacheffe', 'Анаэробной обработки G1. Жасмин, абрикос, чёрный чай. Заваривается 6 минут.', 420, '300 мл', 'pour-over,моносорт', 1, 0, 10],
    ['alternative', 'Кемекс Кения Nyeri AA', 'Мытая обработка. Чёрная смородина, грейпфрут, тростниковый сахар. На двоих.', 460, '500 мл', 'chemex,на двоих', 0, 0, 20],
    ['alternative', 'Аэропресс Колумбия El Paraíso', 'Анаэробная ферментация. Молочный шоколад, маракуйя, ваниль.', 380, '220 мл', 'aeropress,фрукт', 0, 0, 30],
    ['alternative', 'Колд-брю классический', '12-часовая холодная экстракция. Сладкий, плотный, без кислоты — для летнего дня.', 340, '350 мл', 'холодный,лето', 0, 1, 40],
    ['alternative', 'Колд-брю тоник', 'Колд-брю на тонике с цитрусовой цедрой. Освежает и не отпускает.', 380, '350 мл', 'холодный,коктейль', 0, 1, 50],
];

const menuIds = menu.map((m) => insertMenu.run(...m).lastInsertRowid);

/* ---------- Reviews ---------- */
console.log('[seed] Posting reviews...');

const approvedReviews = [
    [userBronze1, 'Лучший флэт-уайт в районе. Хожу каждое утро перед работой — бариста уже знают по имени.', 5, '-2 days'],
    [userBronze2, 'Атмосфера уютная, музыка ненавязчивая, можно спокойно поработать с ноутбуком пару часов.', 4, '-5 days'],
    [userBronze3, 'V60 на Эфиопии — это что-то. Жасмин и абрикос в чашке, как и обещали.', 5, '-7 days'],
    [userMid1, 'Прихожу за брюнчем в выходные. Круассан с миндалём и капучино — мой неизменный набор.', 5, '-10 days'],
    [userMid2, 'Очень хороший сервис. Однажды пролила кофе — принесли новый сразу же без вопросов.', 4, '-12 days'],
    [userMid3, 'Кофе крафтовый, но цены адекватные. Программа лояльности работает — реально копится скидка.', 5, '-14 days'],
    [userGold, 'Постоянный гость уже четвёртый год. Десятый уровень и каждый день бесплатный кофе — приятно.', 5, '-20 days'],
    [userBronze1, 'Сама купила раф с мёдом — это просто десерт в чашке. Башкирский мёд очень тонкий.', 5, '-22 days'],
    [userMid1, 'Иногда не хватает мест в часы пик. Большой стол у окна часто занят.', 3, '-25 days'],
    [userMid2, 'Колд-брю классный, но мне в этот раз показался немного водянистым. В прошлый был плотнее.', 4, '-28 days'],
];

for (const [uid, text, rating, ago] of approvedReviews) {
    insertReview.run(uid, text, rating, 'approved', ago);
}

const pendingReviews = [
    [userBronze2, 'Сегодня впервые попробовала аэропресс — необычно, понравилось. Жду больше альтернативы в меню.', 5, '-1 days'],
    [userBronze3, 'В целом нормально, но утром было очень шумно и музыка громковата.', 3, '-1 days'],
];

for (const [uid, text, rating, ago] of pendingReviews) {
    insertReview.run(uid, text, rating, 'pending', ago);
}

/* ---------- Events ---------- */
console.log('[seed] Scheduling events...');

const events = [
    ['Каппинг колумбийских лотов', 'Дегустация трёх свежих лотов из Уилы и Толимы. С нами куратор импорта.', '2026-06-15', 'upcoming'],
    ['Вечер альтернативного заваривания', 'Бариста показывают V60, Kalita и Hario Switch. Гости заваривают сами.', '2026-06-28', 'upcoming'],
    ['Лекция о ферментации', 'Открытое занятие про обработки кофе: мытая, натуральная, анаэробная.', '2026-05-10', 'past'],
];

for (const ev of events) insertEvent.run(...ev);

/* ============================================================ */

console.log('[seed] Done.');
console.log('');
console.log('Test accounts:');
console.log('  ┌──────────────────────────────────────────────────────────────────────────┐');
console.log('  │  Admin       phone +7 999 000-00-01   password admin1234                  │');
console.log('  │  Moderator   phone +7 999 000-00-02   password mod12345                   │');
console.log('  │  User L1     phone +7 999 111-00-01   password user1234   (1 500 ₽)       │');
console.log('  │  User L3     phone +7 999 111-00-03   password user1234   (9 100 ₽)       │');
console.log('  │  User L7     phone +7 999 111-00-05   password user1234   (52 000 ₽)      │');
console.log('  │  User L10    phone +7 999 111-00-07   password user1234   (145 000 ₽)     │');
console.log('  └──────────────────────────────────────────────────────────────────────────┘');
