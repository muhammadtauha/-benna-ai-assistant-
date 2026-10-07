// backend/helpers/pgClient.js
// Postgres + pgvector client (Supabase Postgres connection).
// Used exclusively for AI-specific storage: embeddings, BOQ generations,
// line items, gaps, caches. Business data stays in MongoDB.
const { Pool } = require("pg");

let pool;
function getPool() {
  if (pool) return pool;
  const connectionString = process.env.SUPABASE_DB_URL || process.env.PG_URL;
  if (!connectionString) {
    throw new Error("SUPABASE_DB_URL (or PG_URL) is not configured");
  }
  pool = new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
    max: 10,
  });
  return pool;
}

async function query(sql, params = []) {
  const p = getPool();
  return p.query(sql, params);
}

/** Format a JS number[] as a pgvector literal: '[0.1,0.2,...]' */
function toVectorLiteral(arr) {
  return `[${arr.join(",")}]`;
}

module.exports = { getPool, query, toVectorLiteral };
