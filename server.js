// server.js
// ESM-friendly Express + mssql backend (Render)
// Exposes: /api/health, /api/database/test-connection, /api/database/execute-query

import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ---------- CORS & JSON ----------
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Allow all when no whitelist; otherwise restrict
if (ALLOWED_ORIGINS.length === 0) {
  app.use(cors());
} else {
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
  }));
}
app.use(express.json({ limit: '1mb' }));

// ---------- Connection helpers ----------
function buildConfig({ server, database, username, password, authType, port = 1433 }) {
  if (!server) throw new Error('server is required');
  const cfg = {
    server,
    database: database || 'master',
    port: Number.parseInt(port, 10) || 1433,
    options: {
      encrypt: false,               // set true if your SQL requires TLS
      trustServerCertificate: true, // fine for many on-prem/dev SQL
      enableArithAbort: true,
      connectTimeout: 30000,
      requestTimeout: 30000,
    },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
  };
  if (authType === 'windows') {
    // Usually not usable on Linux hosts like Render
    cfg.options.trustedConnection = true;
  } else {
    cfg.user = username;
    cfg.password = password;
  }
  return cfg;
}

async function withPool(cfg, fn) {
  const pool = new sql.ConnectionPool(cfg);
  try {
    await pool.connect();
    const out = await fn(pool);
    await pool.close();
    return out;
  } catch (err) {
    try { await pool.close(); } catch {}
    throw err;
  }
}

// ---------- Routes ----------
app.get('/favicon.ico', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

app.get('/favicon.svg', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.svg'));
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/database/test-connection', async (req, res) => {
  try {
    const cfg = buildConfig(req.body || {});
    const info = await withPool(cfg, async (pool) => {
      const dbResult = await pool.request().query(`
        SELECT name FROM sys.databases WHERE database_id > 4 ORDER BY name
      `);
      const databases = dbResult.recordset.map(r => r.name);

      let tables = [];
      try {
        if (cfg.database && cfg.database !== 'master') {
          const t = await pool.request().query(`
            USE [${cfg.database}];
            SELECT TABLE_SCHEMA, TABLE_NAME, CONCAT(TABLE_SCHEMA,'.',TABLE_NAME) AS FULL_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE='BASE TABLE'
            ORDER BY TABLE_SCHEMA, TABLE_NAME
          `);
          tables = t.recordset.map(r => ({ name: r.TABLE_NAME, schema: r.TABLE_SCHEMA, fullName: r.FULL_NAME }));
        } else {
          const t = await pool.request().query(`
            SELECT TABLE_SCHEMA, TABLE_NAME, CONCAT(TABLE_SCHEMA,'.',TABLE_NAME) AS FULL_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE='BASE TABLE'
            ORDER BY TABLE_SCHEMA, TABLE_NAME
          `);
          tables = t.recordset.map(r => ({ name: r.TABLE_NAME, schema: r.TABLE_SCHEMA, fullName: r.FULL_NAME }));
        }
      } catch {
        const t = await pool.request().query(`
          SELECT TABLE_SCHEMA, TABLE_NAME, CONCAT(TABLE_SCHEMA,'.',TABLE_NAME) AS FULL_NAME
          FROM INFORMATION_SCHEMA.TABLES
          WHERE TABLE_TYPE='BASE TABLE'
          ORDER BY TABLE_SCHEMA, TABLE_NAME
        `);
        tables = t.recordset.map(r => ({ name: r.TABLE_NAME, schema: r.TABLE_SCHEMA, fullName: r.FULL_NAME }));
      }

      return { databases, tables };
    });

    res.json({
      success: true,
      databases: info.databases,
      tables: info.tables,
      connectionId: `${cfg.server}_${cfg.database || 'master'}_${Date.now()}`
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to connect to database' });
  }
});

app.post('/api/database/execute-query', async (req, res) => {
  try {
    const { connection, query } = req.body || {};
    if (!connection || !query) {
      return res.status(400).json({ success: false, message: 'connection and query are required' });
    }
    const cfg = buildConfig(connection);
    const started = Date.now();
    const result = await withPool(cfg, async (pool) => pool.request().query(query));
    res.json({
      success: true,
      data: result.recordset || [],
      columns: result.recordset?.columns ? Object.keys(result.recordset.columns) : [],
      rowCount: Array.isArray(result.recordset) ? result.recordset.length : 0,
      executionTime: Date.now() - started
    });
  } catch (error) {
    console.error('Query execution error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to execute query' });
  }
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
