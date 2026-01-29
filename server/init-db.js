const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'lottery.db');
const db = new Database(dbPath);

const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');

console.log('Initializing database...');
db.exec(schema);
console.log('Database initialized at:', dbPath);
db.close();
