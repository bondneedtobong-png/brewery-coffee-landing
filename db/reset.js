'use strict';
const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const files = ['app.db', 'app.db-wal', 'app.db-shm'];
for (const f of files) {
    const p = path.join(DATA_DIR, f);
    if (fs.existsSync(p)) {
        fs.unlinkSync(p);
        console.log(`[reset] removed ${f}`);
    }
}
console.log('[reset] Done.');
