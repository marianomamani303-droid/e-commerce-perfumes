import mysql from 'mysql2/promise';
import fs from 'node:fs';
import './env.js';
const ca =
  process.env.MYSQL_CA ||
  (process.env.MYSQL_CA_FILE ? fs.readFileSync(process.env.MYSQL_CA_FILE, 'utf8') : undefined);
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  waitForConnections: true,
  timezone: 'Z',
  decimalNumbers: false,
  multipleStatements: false,
  ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : {}),
});
export default pool;
