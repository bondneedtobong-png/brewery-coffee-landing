'use strict';
const express = require('express');
const db = require('../db/database');
const { requireLogin } = require('../middleware/auth');
const { normalisePhone, displayPhone } = require('../lib/phone');
const {
    TIERS,
    tierFor,
    nextTier,
    rublesToNext,
    tierProgress,
    perkFor,
    formatRub,
} = require('../lib/loyalty');
const { formatDate } = require('../lib/format');

const router = express.Router();

router.get('/', requireLogin, (req, res) => {
    const tx = db
        .prepare(
            `SELECT id, amount, description, created_at
               FROM transactions
              WHERE user_id = ?
              ORDER BY created_at DESC
              LIMIT 12`
        )
        .all(req.user.id);

    const reviews = db
        .prepare(
            `SELECT id, text, rating, status, created_at
               FROM reviews
              WHERE user_id = ?
              ORDER BY created_at DESC
              LIMIT 12`
        )
        .all(req.user.id);

    const tier = tierFor(req.user.total_spent || 0);
    const next = nextTier(tier.level);

    res.render('profile', {
        title: 'Личный кабинет',
        tx,
        reviews,
        TIERS,
        tier,
        nextTier: next,
        rublesToNext: rublesToNext(req.user.total_spent || 0, tier.level),
        tierProgress: tierProgress(req.user.total_spent || 0, tier.level),
        perk: perkFor(tier.level),
        formatRub,
        formatDate,
        displayPhone: displayPhone(req.user.phone),
        welcome: req.query.welcome === '1',
        error: null,
        form: null,
    });
});

router.post('/edit', requireLogin, (req, res) => {
    const name = String(req.body.name || '').trim();
    const phone = normalisePhone(req.body.phone);
    const email = String(req.body.email || '').trim().toLowerCase() || null;

    if (name.length < 2) {
        res.flash('error', 'Имя слишком короткое.');
        return res.redirect('/profile');
    }
    if (!phone) {
        res.flash('error', 'Проверьте номер телефона.');
        return res.redirect('/profile');
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.flash('error', 'E-mail не похож на e-mail.');
        return res.redirect('/profile');
    }
    /* Prevent stealing another user's phone. */
    const clash = db.prepare('SELECT id FROM users WHERE phone = ? AND id != ?').get(phone, req.user.id);
    if (clash) {
        res.flash('error', 'Этот телефон уже у другого пользователя.');
        return res.redirect('/profile');
    }

    db.prepare('UPDATE users SET name = ?, phone = ?, email = ? WHERE id = ?').run(
        name,
        phone,
        email,
        req.user.id
    );
    res.flash('success', 'Профиль обновлён.');
    res.redirect('/profile');
});

module.exports = router;
