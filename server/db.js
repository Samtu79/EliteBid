const mysql = require('mysql2/promise');

require('dotenv').config();

const database = process.env.DB_NAME || process.env.MYSQL_ADDON_DB || 'elitebid';

const baseConfig = {
  host: process.env.DB_HOST || process.env.MYSQL_ADDON_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || process.env.MYSQL_ADDON_PORT || 3306),
  user: process.env.DB_USER || process.env.MYSQL_ADDON_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQL_ADDON_PASSWORD || '',
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 15000),
  multipleStatements: true,
  ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } } : {})
};

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...baseConfig,
      database,
      waitForConnections: true,
      // El plan de Clever Cloud usado por EliteBid permite solo 5 conexiones
      // simultaneas. Dos conexiones reutilizables alcanzan para esta API y
      // evitan que un deploy deje fuera al proceso nuevo.
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 2),
      maxIdle: Number(process.env.DB_MAX_IDLE || 2),
      idleTimeout: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
      namedPlaceholders: false
    });
  }

  return pool;
}

async function connectWithoutDatabase() {
  return mysql.createConnection(baseConfig);
}

async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

async function first(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function run(sql, params = []) {
  const [result] = await getPool().execute(sql, params);
  return {
    affectedRows: result.affectedRows,
    insertId: result.insertId,
    lastInsertRowId: result.insertId
  };
}

module.exports = {
  connectWithoutDatabase,
  database,
  first,
  getPool,
  query,
  run
};
