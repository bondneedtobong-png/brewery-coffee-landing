'use strict';
const path = require('node:path');
const express = require('express');
const session = require('express-session');

const db = require('./db/database');
const { displayPhone } = require('./lib/phone');
const { tierFor, perkFor, TIERS } = require('./lib/loyalty');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true, limit: '256kb' }));
app.use(express.json({ limit: '256kb' }));

/* Static — keep original landing assets at /styles, /scripts, /assets */
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

app.use(
    session({
        secret: process.env.SESSION_SECRET || 'brewery-dev-secret-change-in-production',
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production' && process.env.TRUST_PROXY === 'true',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        },
        name: 'brewery.sid',
    })
);

if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
}

/* Hydrate the request with the current user (DB-side, so role changes apply immediately). */
app.use((req, res, next) => {
    if (req.session?.userId) {
        const user = db
            .prepare(
                `SELECT u.id, u.name, u.phone, u.email, u.role,
                        l.total_spent, l.level, l.discount_pct
                   FROM users u
                   LEFT JOIN loyalty l ON l.user_id = u.id
                  WHERE u.id = ?`
            )
            .get(req.session.userId);
        if (user) {
            req.user = user;
            res.locals.user = user;
            res.locals.displayPhone = displayPhone(user.phone);
            res.locals.userTier = tierFor(user.total_spent || 0);
            res.locals.userPerk = perkFor(res.locals.userTier.level);
        } else {
            req.session.destroy(() => {});
        }
    }
    res.locals.tiers = TIERS;
    res.locals.path = req.path;
    res.locals.flash = req.session?.flash || null;
    if (req.session) req.session.flash = null;
    next();
});

/* Helper to set one-shot flash messages via session */
app.use((req, res, next) => {
    res.flash = (type, message) => {
        if (req.session) req.session.flash = { type, message };
    };
    next();
});

/* ============================================================
   Routes
   ============================================================ */

app.use('/auth', require('./routes/auth'));
app.use('/profile', require('./routes/profile'));
app.use('/reviews', require('./routes/reviews'));
app.use('/admin', require('./routes/admin'));
app.use('/', require('./routes/pages'));

/* 404 */
app.use((req, res) => {
    res.status(404).render('error', {
        title: '404',
        heading: 'Не нашли страницу',
        message: 'Адрес неправильный или раздел перенесён. Возвращайтесь на главную.',
    });
});

/* Error handler */
app.use((err, req, res, _next) => {
    console.error('[error]', err);
    res.status(500).render('error', {
        title: 'Ошибка',
        heading: 'Что-то пошло не так',
        message: process.env.NODE_ENV === 'production'
            ? 'Мы уже разбираемся. Попробуйте обновить страницу через пару секунд.'
            : err.stack || err.message,
    });
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
    console.log(`[brewery] running on http://localhost:${PORT}`);
});
