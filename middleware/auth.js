'use strict';

/** Require a logged-in user. Redirects to /auth/login with ?next= if anonymous. */
function requireLogin(req, res, next) {
    if (!req.user) {
        const target = encodeURIComponent(req.originalUrl);
        return res.redirect('/auth/login?next=' + target);
    }
    next();
}

/** Require one of the given roles. */
function requireRole(...roles) {
    return function (req, res, next) {
        if (!req.user) {
            const target = encodeURIComponent(req.originalUrl);
            return res.redirect('/auth/login?next=' + target);
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).render('error', {
                title: 'Доступ закрыт',
                heading: 'Сюда нельзя',
                message: 'У вашей роли нет доступа к этому разделу.',
            });
        }
        next();
    };
}

const requireAdmin = requireRole('admin');
const requireStaff = requireRole('admin', 'moderator');

module.exports = { requireLogin, requireRole, requireAdmin, requireStaff };
