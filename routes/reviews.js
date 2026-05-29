'use strict';
const express = require('express');
const db = require('../db/database');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

router.get('/new', requireLogin, (req, res) => {
    res.render('reviews/new', {
        title: 'Оставить отзыв',
        form: { text: '', rating: 5 },
        error: null,
    });
});

router.post('/new', requireLogin, (req, res) => {
    const text = String(req.body.text || '').trim();
    const rating = Number.parseInt(req.body.rating, 10);

    const render = (error, form) =>
        res.status(error ? 400 : 200).render('reviews/new', {
            title: 'Оставить отзыв',
            form: form ?? { text: req.body.text || '', rating: req.body.rating || 5 },
            error,
        });

    if (text.length < 20) return render('Расскажите подробнее — хотя бы 20 символов.');
    if (text.length > 1000) return render('Не больше 1000 символов, давайте короче.');
    if (!(rating >= 1 && rating <= 5)) return render('Поставьте оценку от 1 до 5 звёзд.');

    db.prepare(
        `INSERT INTO reviews (user_id, text, rating, status)
         VALUES (?, ?, ?, 'pending')`
    ).run(req.user.id, text, rating);

    res.flash('success', 'Спасибо! Отзыв уехал на модерацию.');
    res.redirect('/profile');
});

module.exports = router;
