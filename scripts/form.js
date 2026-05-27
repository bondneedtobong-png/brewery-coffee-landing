(() => {
    'use strict';

    const form = document.getElementById('bookingForm');
    if (!form) return;

    const successMsg = document.getElementById('formSuccess');
    const submitBtn = form.querySelector('button[type="submit"]');

    const fields = {
        name:   form.querySelector('#name'),
        phone:  form.querySelector('#phone'),
        date:   form.querySelector('#date'),
        time:   form.querySelector('#time'),
        guests: form.querySelector('#guests'),
    };

    /* ===== Phone mask: +7 (XXX) XXX-XX-XX ===== */
    const formatPhone = (raw) => {
        let digits = raw.replace(/\D/g, '');
        if (digits.startsWith('8')) digits = '7' + digits.slice(1);
        if (!digits.startsWith('7')) digits = '7' + digits;
        digits = digits.slice(0, 11);

        const parts = ['+7'];
        if (digits.length > 1) parts.push(' (' + digits.slice(1, 4));
        if (digits.length >= 4) parts[1] += ')';
        if (digits.length >= 5) parts.push(' ' + digits.slice(4, 7));
        if (digits.length >= 8) parts.push('-' + digits.slice(7, 9));
        if (digits.length >= 10) parts.push('-' + digits.slice(9, 11));
        return parts.join('');
    };

    fields.phone.addEventListener('input', (e) => {
        const cursorAtEnd = e.target.selectionStart === e.target.value.length;
        e.target.value = formatPhone(e.target.value);
        if (cursorAtEnd) {
            e.target.setSelectionRange(e.target.value.length, e.target.value.length);
        }
        if (e.target.classList.contains('is-error')) {
            validateField('phone');
        }
    });

    fields.phone.addEventListener('focus', (e) => {
        if (!e.target.value) e.target.value = '+7 ';
    });

    /* ===== Validators ===== */
    const validators = {
        name: (v) => {
            const value = v.trim();
            if (!value) return 'Укажите ваше имя';
            if (value.length < 2) return 'Слишком короткое имя';
            if (!/^[a-zA-Zа-яА-ЯёЁ\s-]+$/.test(value)) return 'Только буквы, пробел и дефис';
            return null;
        },
        phone: (v) => {
            const digits = v.replace(/\D/g, '');
            if (!digits) return 'Укажите телефон';
            if (digits.length !== 11) return 'Введите номер полностью';
            return null;
        },
        date: (v) => {
            if (!v) return 'Выберите дату';
            const selected = new Date(v);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selected < today) return 'Дата не может быть в прошлом';
            const maxDate = new Date();
            maxDate.setMonth(maxDate.getMonth() + 3);
            if (selected > maxDate) return 'Бронируем не больше чем за 3 месяца';
            return null;
        },
        time: (v) => {
            if (!v) return 'Выберите время';
            return null;
        },
        guests: (v) => {
            if (!v) return 'Укажите количество гостей';
            return null;
        },
    };

    /* ===== Field-level validation ===== */
    const validateField = (key) => {
        const field = fields[key];
        const error = validators[key](field.value);
        const errorEl = form.querySelector(`.form-error[data-for="${key}"]`);

        if (error) {
            field.classList.add('is-error');
            field.setAttribute('aria-invalid', 'true');
            if (errorEl) {
                errorEl.textContent = error;
                errorEl.classList.add('is-visible');
            }
            return false;
        }

        field.classList.remove('is-error');
        field.removeAttribute('aria-invalid');
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.classList.remove('is-visible');
        }
        return true;
    };

    /* Validate on blur, clear error on input */
    Object.keys(fields).forEach((key) => {
        const field = fields[key];
        field.addEventListener('blur', () => validateField(key));
        field.addEventListener('input', () => {
            if (field.classList.contains('is-error')) {
                validateField(key);
            }
        });
        field.addEventListener('change', () => {
            if (field.classList.contains('is-error')) {
                validateField(key);
            }
        });
    });

    /* ===== Submit handler ===== */
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const results = Object.keys(fields).map((key) => validateField(key));
        const isValid = results.every(Boolean);

        if (!isValid) {
            const firstError = form.querySelector('.form-input.is-error');
            if (firstError) {
                firstError.focus();
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        /* Simulate a network request */
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Отправляем...';

        setTimeout(() => {
            successMsg.hidden = false;
            successMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
            form.reset();
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;

            /* Hide success after 6 seconds */
            setTimeout(() => {
                successMsg.hidden = true;
            }, 6000);
        }, 700);
    });
})();
