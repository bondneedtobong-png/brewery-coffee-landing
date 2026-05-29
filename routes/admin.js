'use strict';
const express = require('express');
const db = require('../db/database');
const { requireStaff, requireAdmin } = require('../middleware/auth');
const { tierFor } = require('../lib/loyalty');
const { displayPhone } = require('../lib/phone');
const { formatDate } = require('../lib/format');

const router = express.Router();

router.use(requireStaff);

/* -------------------- Dashboard -------------------- */

router.get('/', (req, res) => {
    const counts = {
        users: db.prepare('SELECT COUNT(*) AS n FROM users').get().n,
        moderators: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role IN ('admin', 'moderator')").get().n,
        menu: db.prepare('SELECT COUNT(*) AS n FROM menu_items').get().n,
        reviews: db.prepare('SELECT COUNT(*) AS n FROM reviews').get().n,
        pending: db.prepare("SELECT COUNT(*) AS n FROM reviews WHERE status = 'pending'").get().n,
        events: db.prepare("SELECT COUNT(*) AS n FROM events WHERE status = 'upcoming'").get().n,
    };

    res.render('admin/dashboard', { title: 'Админка', counts });
});

/* -------------------- Reviews moderation -------------------- */

router.get('/reviews', (req, res) => {
    const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
    const reviews = db
        .prepare(
            `SELECT r.*, u.name AS user_name, u.phone AS user_phone, l.level, l.discount_pct
               FROM reviews r
               JOIN users u ON u.id = r.user_id
               LEFT JOIN loyalty l ON l.user_id = u.id
              WHERE r.status = ?
              ORDER BY r.created_at DESC`
        )
        .all(status);

    res.render('admin/reviews', { title: 'Отзывы', reviews, status, formatDate });
});

router.post('/reviews/:id/approve', (req, res) => {
    db.prepare(
        `UPDATE reviews SET status = 'approved', moderated_by = ?, moderated_at = datetime('now') WHERE id = ?`
    ).run(req.user.id, req.params.id);
    res.flash('success', 'Отзыв опубликован.');
    res.redirect('/admin/reviews?status=pending');
});

router.post('/reviews/:id/reject', (req, res) => {
    db.prepare(
        `UPDATE reviews SET status = 'rejected', moderated_by = ?, moderated_at = datetime('now') WHERE id = ?`
    ).run(req.user.id, req.params.id);
    res.flash('success', 'Отзыв отклонён.');
    res.redirect('/admin/reviews?status=pending');
});

router.post('/reviews/:id/delete', requireAdmin, (req, res) => {
    db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
    res.flash('success', 'Отзыв удалён.');
    res.redirect('/admin/reviews?status=' + (req.query.status || 'pending'));
});

/* -------------------- Menu -------------------- */

router.get('/menu', (req, res) => {
    const items = db.prepare('SELECT * FROM menu_items ORDER BY category, sort_order, title').all();
    res.render('admin/menu', { title: 'Меню', items, edit: null, error: null });
});

router.get('/menu/new', (req, res) => {
    const items = db.prepare('SELECT * FROM menu_items ORDER BY category, sort_order, title').all();
    res.render('admin/menu', {
        title: 'Меню — новая позиция',
        items,
        edit: { id: null, category: 'espresso', title: '', description: '', price: 0, volume: '', tags: '', is_hit: 0, is_new: 0, sort_order: 100 },
        error: null,
    });
});

router.get('/menu/:id/edit', (req, res) => {
    const items = db.prepare('SELECT * FROM menu_items ORDER BY category, sort_order, title').all();
    const edit = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
    if (!edit) {
        res.flash('error', 'Позиция не найдена.');
        return res.redirect('/admin/menu');
    }
    res.render('admin/menu', { title: 'Редактирование позиции', items, edit, error: null });
});

function readMenuForm(body) {
    return {
        category: ['espresso', 'alternative'].includes(body.category) ? body.category : 'espresso',
        title: String(body.title || '').trim(),
        description: String(body.description || '').trim() || null,
        price: Number.parseInt(body.price, 10) || 0,
        volume: String(body.volume || '').trim() || null,
        tags: String(body.tags || '').trim() || null,
        is_hit: body.is_hit ? 1 : 0,
        is_new: body.is_new ? 1 : 0,
        sort_order: Number.parseInt(body.sort_order, 10) || 100,
    };
}

router.post('/menu/save', (req, res) => {
    const data = readMenuForm(req.body);
    if (!data.title) {
        res.flash('error', 'Без названия не сохранить.');
        return res.redirect('/admin/menu');
    }
    const id = Number.parseInt(req.body.id, 10);
    if (id) {
        db.prepare(
            `UPDATE menu_items
                SET category=?, title=?, description=?, price=?, volume=?, tags=?, is_hit=?, is_new=?, sort_order=?
              WHERE id=?`
        ).run(
            data.category, data.title, data.description, data.price,
            data.volume, data.tags, data.is_hit, data.is_new, data.sort_order, id
        );
        res.flash('success', 'Позиция обновлена.');
    } else {
        db.prepare(
            `INSERT INTO menu_items (category, title, description, price, volume, tags, is_hit, is_new, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
            data.category, data.title, data.description, data.price,
            data.volume, data.tags, data.is_hit, data.is_new, data.sort_order
        );
        res.flash('success', 'Позиция добавлена в карту.');
    }
    res.redirect('/admin/menu');
});

router.post('/menu/:id/delete', (req, res) => {
    db.prepare('DELETE FROM menu_items WHERE id = ?').run(req.params.id);
    res.flash('success', 'Позиция удалена.');
    res.redirect('/admin/menu');
});

/* -------------------- Events -------------------- */

router.get('/events', (req, res) => {
    const events = db.prepare('SELECT * FROM events ORDER BY event_date DESC').all();
    res.render('admin/events', { title: 'События', events, edit: null, error: null, formatDate });
});

router.get('/events/new', (req, res) => {
    const events = db.prepare('SELECT * FROM events ORDER BY event_date DESC').all();
    res.render('admin/events', {
        title: 'Новое событие',
        events,
        edit: { id: null, title: '', description: '', event_date: '', status: 'upcoming' },
        error: null,
        formatDate,
    });
});

router.get('/events/:id/edit', (req, res) => {
    const events = db.prepare('SELECT * FROM events ORDER BY event_date DESC').all();
    const edit = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!edit) {
        res.flash('error', 'Событие не найдено.');
        return res.redirect('/admin/events');
    }
    res.render('admin/events', { title: 'Редактирование события', events, edit, error: null, formatDate });
});

router.post('/events/save', (req, res) => {
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim() || null;
    const event_date = String(req.body.event_date || '').trim();
    const status = ['upcoming', 'past', 'cancelled'].includes(req.body.status) ? req.body.status : 'upcoming';

    if (!title || !event_date) {
        res.flash('error', 'Название и дата обязательны.');
        return res.redirect('/admin/events');
    }

    const id = Number.parseInt(req.body.id, 10);
    if (id) {
        db.prepare('UPDATE events SET title=?, description=?, event_date=?, status=? WHERE id=?').run(
            title, description, event_date, status, id
        );
        res.flash('success', 'Событие обновлено.');
    } else {
        db.prepare(
            'INSERT INTO events (title, description, event_date, status) VALUES (?, ?, ?, ?)'
        ).run(title, description, event_date, status);
        res.flash('success', 'Событие добавлено.');
    }
    res.redirect('/admin/events');
});

router.post('/events/:id/delete', (req, res) => {
    db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
    res.flash('success', 'Событие удалено.');
    res.redirect('/admin/events');
});

/* -------------------- Users (read-only for moderators, write for admin) -------------------- */

router.get('/users', (req, res) => {
    const users = db
        .prepare(
            `SELECT u.id, u.name, u.phone, u.email, u.role, u.created_at,
                    COALESCE(l.total_spent, 0) AS total_spent,
                    COALESCE(l.level, 1) AS level,
                    COALESCE(l.discount_pct, 3) AS discount_pct
               FROM users u
               LEFT JOIN loyalty l ON l.user_id = u.id
              ORDER BY u.created_at DESC`
        )
        .all();
    res.render('admin/users', { title: 'Пользователи', users, displayPhone, formatDate });
});

router.post('/users/:id/role', requireAdmin, (req, res) => {
    const role = ['user', 'moderator', 'admin'].includes(req.body.role) ? req.body.role : 'user';
    if (Number(req.params.id) === req.user.id) {
        res.flash('error', 'Себе роль менять нельзя — попросите другого админа.');
        return res.redirect('/admin/users');
    }
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
    res.flash('success', 'Роль обновлена.');
    res.redirect('/admin/users');
});

router.post('/users/:id/topup', requireAdmin, (req, res) => {
    const amount = Number.parseInt(req.body.amount, 10);
    if (!amount || amount <= 0) {
        res.flash('error', 'Сумма должна быть положительной.');
        return res.redirect('/admin/users');
    }
    const userId = Number(req.params.id);
    db.prepare(
        'INSERT INTO transactions (user_id, amount, description) VALUES (?, ?, ?)'
    ).run(userId, amount, 'Демо-начисление от админа');

    const row = db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE user_id = ?').get(userId);
    const tier = tierFor(row.total);
    db.prepare(
        `INSERT INTO loyalty (user_id, total_spent, level, discount_pct, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE
         SET total_spent = excluded.total_spent,
             level = excluded.level,
             discount_pct = excluded.discount_pct,
             updated_at = datetime('now')`
    ).run(userId, row.total, tier.level, tier.discount);

    res.flash('success', `Начислено ${amount} ₽, теперь уровень L${tier.level}.`);
    res.redirect('/admin/users');
});

module.exports = router;
