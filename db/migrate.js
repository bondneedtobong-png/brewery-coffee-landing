'use strict';
const fs = require('node:fs');
const path = require('node:path');
const db = require('./database');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

console.log(`[migrate] Applying schema to ${db.DB_PATH ?? '(default db)'}...`);
db.exec(schema);
console.log('[migrate] Done.');
