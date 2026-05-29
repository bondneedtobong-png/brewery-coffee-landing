'use strict';
const express = require('express');
const db = require('../db/database');
const { ruPluralize, formatReviewDate } = require('../lib/format');

const router = express.Router();

/* Decorative photo backgrounds for review cards */
const REVIEW_BGS = [
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=60',
    'https://images.unsplash.com/photo-1453614512568-c4024d13c247?auto=format&fit=crop&w=800&q=60',
    'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?auto=format&fit=crop&w=800&q=60',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=60',
    'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=800&q=60',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=60',
];

router.get('/', (req, res) => {
    const items = db
        .prepare(
            `SELECT * FROM menu_items
              ORDER BY category, sort_order, title`
        )
        .all();

    const menuByCat = items.reduce((acc, item) => {
        (acc[item.category] = acc[item.category] || []).push(item);
        return acc;
    }, {});

    const reviews = db
        .prepare(
            `SELECT r.id, r.text, r.rating, r.created_at,
                    u.name, l.level, l.discount_pct
               FROM reviews r
               JOIN users u   ON u.id = r.user_id
               LEFT JOIN loyalty l ON l.user_id = u.id
              WHERE r.status = 'approved'
              ORDER BY r.created_at DESC
              LIMIT 9`
        )
        .all();

    const statsRow = db
        .prepare(
            `SELECT COUNT(*) AS cnt, COALESCE(AVG(rating), 0) AS avg
               FROM reviews
              WHERE status = 'approved'`
        )
        .get();

    const reviewStats = {
        count: statsRow.cnt || 0,
        avg: statsRow.cnt ? Number(statsRow.avg).toFixed(1) : '0.0',
    };

    res.render('index', {
        title: null,
        menuByCat,
        reviews,
        reviewStats,
        reviewBgs: REVIEW_BGS,
        ruPluralize,
        formatReviewDate,
    });
});

router.get('/privacy', (req, res) => {
    res.render('privacy', { title: 'Политика конфиденциальности' });
});

module.exports = router;
