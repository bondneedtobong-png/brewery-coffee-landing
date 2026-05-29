'use strict';

/** Normalise Russian phone numbers to +7XXXXXXXXXX. Returns null if invalid. */
function normalisePhone(raw) {
    if (!raw) return null;
    let digits = String(raw).replace(/\D/g, '');
    if (!digits) return null;
    if (digits.length === 11 && digits.startsWith('8')) digits = '7' + digits.slice(1);
    if (digits.length === 10) digits = '7' + digits;
    if (digits.length !== 11 || !digits.startsWith('7')) return null;
    return '+' + digits;
}

/** Visual format from +7XXXXXXXXXX → +7 (XXX) XXX-XX-XX */
function displayPhone(phone) {
    if (!phone) return '';
    const d = phone.replace(/\D/g, '');
    if (d.length !== 11) return phone;
    return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
}

module.exports = { normalisePhone, displayPhone };
