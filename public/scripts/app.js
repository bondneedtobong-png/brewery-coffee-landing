'use strict';

/* ============================================================
   Phone mask used on every page that has #phone — auth & profile.
   Mirrors the booking form mask: +7 (XXX) XXX-XX-XX
   ============================================================ */
(function maskPhones() {
    const inputs = document.querySelectorAll('input[type="tel"][id="phone"]');
    if (!inputs.length) return;

    const format = (raw) => {
        let d = raw.replace(/\D/g, '');
        if (d.startsWith('8')) d = '7' + d.slice(1);
        if (!d.startsWith('7')) d = '7' + d;
        d = d.slice(0, 11);
        const out = ['+7'];
        if (d.length > 1) out.push(' (' + d.slice(1, 4));
        if (d.length >= 4) out[1] += ')';
        if (d.length >= 5) out.push(' ' + d.slice(4, 7));
        if (d.length >= 8) out.push('-' + d.slice(7, 9));
        if (d.length >= 10) out.push('-' + d.slice(9, 11));
        return out.join('');
    };

    inputs.forEach((input) => {
        input.addEventListener('focus', () => {
            if (!input.value) input.value = '+7 ';
        });
        input.addEventListener('input', () => {
            input.value = format(input.value);
        });
        if (input.value) input.value = format(input.value);
    });
})();
