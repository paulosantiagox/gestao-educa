import pg from 'pg';

const { Pool } = pg;

const cfg = {
  connectionString: process.env.DATABASE_URL,
  ssl: false, // forçado
};

console.log('[DB DEBUG] DATABASE_URL =', process.env.DATABASE_URL);
console.log('[DB DEBUG] ssl =', cfg.ssl);

export const pool = new Pool(cfg);
export default pool;
