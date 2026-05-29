'use strict';

const MONTHS_GENITIVE = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

/** Russian pluralisation: pick form for [1, 2-4, 5+]. */
function ruPluralize(n, forms) {
    n = Math.abs(n) % 100;
    const n10 = n % 10;
    if (n > 10 && n < 20) return forms[2];
    if (n10 > 1 && n10 < 5) return forms[1];
    if (n10 === 1) return forms[0];
    return forms[2];
}

/** Friendly relative date for reviews ("сегодня", "вчера", "12 мая"). */
function formatReviewDate(iso) {
    if (!iso) return '';
    const d = new Date(iso.replace(' ', 'T') + 'Z');
    const now = new Date();
    const sameDay =
        d.getUTCDate() === now.getUTCDate() &&
        d.getUTCMonth() === now.getUTCMonth() &&
        d.getUTCFullYear() === now.getUTCFullYear();
    if (sameDay) return 'сегодня';
    const diff = Math.floor((now - d) / (24 * 60 * 60 * 1000));
    if (diff === 1) return 'вчера';
    if (diff < 7) return diff + ' ' + ruPluralize(diff, ['день назад', 'дня назад', 'дней назад']);
    return d.getUTCDate() + ' ' + MONTHS_GENITIVE[d.getUTCMonth()];
}

/** Format date as "12 мая 2026". */
function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso.replace(' ', 'T') + 'Z');
    return d.getUTCDate() + ' ' + MONTHS_GENITIVE[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
}

module.exports = { ruPluralize, formatReviewDate, formatDate };
