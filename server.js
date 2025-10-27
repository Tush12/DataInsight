// server.js
// Express + mssql API for Render
// Routes: /api/health, /api/database/test-connection, /api/database/execute-query

import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

/* --------------------------- CORS & JSON --------------------------- */
// Allow explicit ALLOWED_ORIGINS (comma-separated) and optionally *.vercel.app previews
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowVercelWildcard = true; // set false if you want strict allow-list

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // curl / server-to-server / same-origin
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (allowVercelWildcard && /^https:\/\/.*\.vercel\.app$/.test(origin)) return true;
  return ALLOWED_ORIGINS.length === 0; // permissive if no allow-list set
};

app.use(
  cors({
    origin: (origin, cb) => (isAllowedOrigin(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'))),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '1mb' }));

/* ---------------------- Connection helpers ------------------------ */
function buildConfig({
  server,
  database,
  username,
  user,
  password,
  authType,
  port = 1433,
  instanceName,
}) {
  if (!server) throw new Error('server is required');

  const login = username ?? user;
  const mode = (authType || 'sql').toLowerCase();

  // Note: Windows auth generally doesn't work on Linux hosts like Render
  if (mode === 'windows') {
    throw new Error("Windows authentication isn't supported on this host; use SQL authentication");
  }
  if (!login || !password) {
    throw new Error("username and password are required for 'sql' authentication");
  }

  const cfg = {
    server,
    database: (database || 'master').trim(),
    options: {
      encrypt: true,                 // many public hosts require TLS
      trustServerCertificate: true,  // OK for demos/self-signed; set false with real certs
      enableArithAbort: true,
      connectTimeout: 45000,         // give networks a bit more time
      requestTimeout: 30000,
    },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
    user: login,
    password: password,
  };

  // Support named instances (e.g., server\SQLEXPRESS); omit port when instanceName is present
  if (instanceName && String(instanceName).trim()) {
    cfg.options.instanceName = String(instanceName).trim();
  } else {
    cfg.port = Number.parseInt(port, 10) || 1433;
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

/* ----------------------------- Routes ----------------------------- */
// Favicons (optional)
app.get('/favicon.ico', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});
app.get('/favicon.svg', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.svg'));
});

// Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test connection + list DBs & tables
app.post('/api/database/test-connection', async (req, res) => {
  try {
    const { password, dbType = 'mssql', ...rest } = req.body || {};
    console.log('test-connection body:', { ...rest, dbType, password: password ? '***' : undefined });

    if (dbType === 'postgres') {
      // Handle PostgreSQL connection
      const pool = new Pool({
        host: req.body.server,
        port: req.body.port || 5432,
        database: req.body.database,
        user: req.body.user || req.body.username,
        password: req.body.password,
        ssl: {
          rejectUnauthorized: false // For self-signed certificates
        }
      });

      try {
        const dbResult = await pool.query("SELECT datname FROM pg_database WHERE datistemplate = false AND datname NOT IN ('postgres', 'template1', 'template0')");
        const dbs = dbResult.rows.map(r => r.datname);
        
        let tables = [];
        if (req.body.database) {
          const tablesResult = await pool.query(`
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
            ORDER BY table_schema, table_name
          `);
          tables = tablesResult.rows.map(r => ({
            name: r.table_name,
            schema: r.table_schema,
            fullName: `${r.table_schema}.${r.table_name}`
          }));
        }

        return res.json({
          success: true,
          databases: dbs,
          tables: tables,
          connectionId: `${req.body.server}_${req.body.database || 'postgres'}_${Date.now()}`
        });
      } catch (error) {
        console.error('PostgreSQL error:', error);
        return res.status(400).json({ success: false, message: error.message });
      } finally {
        await pool.end();
      }
    } else {
      // Original SQL Server logic
      const cfg = buildConfig(req.body || {});
      const info = await withPool(cfg, async (pool) => {
        // list non-system databases
        const dbResult = await pool.request().query(`
          SELECT name FROM sys.databases WHERE database_id > 4 ORDER BY name
        `);
        const databases = dbResult.recordset.map(r => r.name);

        // list tables (prefer requested DB; fallback to current DB)
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
        } catch (error) {
          console.error('Error fetching tables:', error);
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

      return res.json({
        success: true,
        databases: info.databases,
        tables: info.tables,
        connectionId: `${cfg.server}_${cfg.database || 'master'}_${Date.now()}`
      });
    }
  } catch (error) {
    console.error('Database connection error:', error);
    return res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to connect to database',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Execute query
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

/* ----------------------------- Start ----------------------------- */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
