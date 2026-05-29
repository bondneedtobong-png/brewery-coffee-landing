'use strict';
/**
 * Brewery Coffee — loyalty programme: 10 progressive tiers.
 * Уровень растёт по суммарным тратам (привязка к телефону), никогда не сбрасывается.
 */

const TIERS = [
    { level: 1,  threshold: 0,      discount: 3,  perks: 'tier-1-3'  },
    { level: 2,  threshold: 3000,   discount: 5,  perks: 'tier-1-3'  },
    { level: 3,  threshold: 7000,   discount: 7,  perks: 'tier-1-3'  },
    { level: 4,  threshold: 12000,  discount: 9,  perks: 'tier-4-9'  },
    { level: 5,  threshold: 20000,  discount: 11, perks: 'tier-4-9'  },
    { level: 6,  threshold: 30000,  discount: 13, perks: 'tier-4-9'  },
    { level: 7,  threshold: 45000,  discount: 15, perks: 'tier-4-9'  },
    { level: 8,  threshold: 65000,  discount: 17, perks: 'tier-4-9'  },
    { level: 9,  threshold: 90000,  discount: 19, perks: 'tier-4-9'  },
    { level: 10, threshold: 120000, discount: 20, perks: 'tier-10'   },
];

const PERKS = {
    'tier-1-3': {
        title: 'Уровни 1–3',
        text: 'Каждую неделю бесплатный кофе за небольшой отзыв и тёплые слова.',
    },
    'tier-4-9': {
        title: 'Уровни 4–9',
        text: 'Каждую неделю бесплатный десерт и кофе за небольшой отзыв и тёплые слова.',
    },
    'tier-10': {
        title: 'Уровень 10',
        text: 'Каждый день бесплатный кофе и каждую неделю бесплатный десерт за небольшой отзыв и тёплые слова.',
    },
};

/** Compute tier object for given total spent (rubles). */
function tierFor(totalSpent) {
    let current = TIERS[0];
    for (const t of TIERS) {
        if (totalSpent >= t.threshold) current = t;
    }
    return current;
}

/** Next tier (or null at max). */
function nextTier(level) {
    return TIERS.find((t) => t.level === level + 1) || null;
}

/** Rubles remaining until next tier (0 if at top). */
function rublesToNext(totalSpent, level) {
    const next = nextTier(level);
    if (!next) return 0;
    return Math.max(0, next.threshold - totalSpent);
}

/** Progress within current tier as ratio 0..1. */
function tierProgress(totalSpent, level) {
    const current = TIERS.find((t) => t.level === level);
    const next = nextTier(level);
    if (!next) return 1;
    const span = next.threshold - current.threshold;
    const within = totalSpent - current.threshold;
    if (span <= 0) return 1;
    return Math.max(0, Math.min(1, within / span));
}

function perkFor(level) {
    const tier = TIERS.find((t) => t.level === level);
    return PERKS[tier.perks];
}

/** Format rubles like 12 345 ₽ (NBSP-separated). */
function formatRub(n) {
    return new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
}

module.exports = {
    TIERS,
    PERKS,
    tierFor,
    nextTier,
    rublesToNext,
    tierProgress,
    perkFor,
    formatRub,
};
