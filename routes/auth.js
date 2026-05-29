'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { normalisePhone, displayPhone } = require('../lib/phone');
const { tierFor } = require('../lib/loyalty');

const router = express.Router();

/* -------------------- helpers -------------------- */

function safeNext(raw) {
    if (typeof raw !== 'string' || !raw) return '/profile';
    /* Only allow relative paths starting with / (no protocol, no //). */
    if (!raw.startsWith('/') || raw.startsWith('//')) return '/profile';
    return raw;
}

function logIn(req, userId) {
    return new Promise((resolve, reject) => {
        req.session.regenerate((err) => {
            if (err) return reject(err);
            req.session.userId = userId;
            req.session.save((err2) => (err2 ? reject(err2) : resolve()));
        });
    });
}

/* -------------------- Login -------------------- */

router.get('/login', (req, res) => {
    if (req.user) return res.redirect(safeNext(req.query.next));
    res.render('auth/login', {
        title: 'Вход',
        next: req.query.next || '',
        form: { phone: '' },
        error: null,
    });
});

router.post('/login', async (req, res, next) => {
    try {
        const phone = normalisePhone(req.body.phone);
        const password = String(req.body.password || '');
        const nextUrl = safeNext(req.body.next);

        const render = (error) =>
            res.status(error ? 400 : 200).render('auth/login', {
                title: 'Вход',
                next: req.body.next || '',
                form: { phone: req.body.phone || '' },
                error,
            });

        if (!phone) return render('Проверьте номер телефона.');
        if (!password) return render('Введите пароль.');

        const user = db.prepare('SELECT id, password_hash FROM users WHERE phone = ?').get(phone);
        if (!user) return render('Пользователя с таким телефоном не нашли.');

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return render('Пароль не подошёл.');

        await logIn(req, user.id);
        res.flash('success', 'С возвращением!');
        res.redirect(nextUrl);
    } catch (e) {
        next(e);
    }
});

/* -------------------- Register -------------------- */

router.get('/register', (req, res) => {
    if (req.user) return res.redirect('/profile');
    res.render('auth/register', {
        title: 'Регистрация',
        form: { name: '', phone: '', email: '' },
        error: null,
    });
});

router.post('/register', async (req, res, next) => {
    try {
        const name = String(req.body.name || '').trim();
        const phone = normalisePhone(req.body.phone);
        const email = String(req.body.email || '').trim().toLowerCase() || null;
        const password = String(req.body.password || '');
        const consent = req.body.consent === 'on' || req.body.consent === 'true' || req.body.consent === '1';

        const form = { name: req.body.name || '', phone: req.body.phone || '', email: req.body.email || '' };
        const render = (error) =>
            res.status(error ? 400 : 200).render('auth/register', {
                title: 'Регистрация',
                form,
                error,
            });

        /* Validation */
        if (name.length < 2) return render('Имя слишком короткое.');
        if (!/^[\p{L} -]+$/u.test(name)) return render('В имени только буквы, пробел и дефис.');
        if (!phone) return render('Проверьте номер телефона — нужен российский формат.');
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return render('E-mail не похож на e-mail.');
        if (password.length < 6) return render('Пароль не короче 6 символов.');
        if (!consent) return render('Без согласия на обработку персональных данных регистрация не оформится.');

        const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
        if (existing) return render('Этот телефон уже зарегистрирован.');

        const hash = await bcrypt.hash(password, 10);
        const insertUser = db.prepare(`
            INSERT INTO users (name, phone, email, password_hash, role, consent_given, consent_at)
            VALUES (?, ?, ?, ?, 'user', 1, datetime('now'))
        `);
        const result = insertUser.run(name, phone, email, hash);
        const userId = result.lastInsertRowid;

        const startTier = tierFor(0);
        db.prepare(
            'INSERT INTO loyalty (user_id, total_spent, level, discount_pct) VALUES (?, 0, ?, ?)'
        ).run(userId, startTier.level, startTier.discount);

        await logIn(req, userId);
        res.flash('success', 'Добро пожаловать в клуб Brewery Coffee.');
        res.redirect('/profile?welcome=1');
    } catch (e) {
        next(e);
    }
});

/* -------------------- Logout -------------------- */

router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('brewery.sid');
        res.redirect('/');
    });
});

module.exports = router;
