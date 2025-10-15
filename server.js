// server.js
// ESM-friendly Express + mssql backend
// Works on Render. Exposes /api/database/test-connection and /api/database/execute-query

import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// -------- Middleware --------
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Optional: restrict CORS in prod by setting ALLOWED_ORIGINS
// Example: ALLOWED_ORIGINS="https://your-frontend.vercel.app,https://your-domain.com"
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (ALLOWED_ORIGINS.length > 0) {
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  );
}

// -------- Active connections (optional reuse) --------
const connections = new Map();

// Build mssql config safely
function buildConfig({ server, database, username, password, authType, port = 1433 }) {
  if (!server) throw new Error('server is required');
  const cfg = {
    server: server,
    database: database || 'master',
    port: Number.parseInt(port, 10) || 1433,
    options: {
      encrypt: false,                // set to true if your SQL requires TLS
      trustServerCertificate: true,  // true works for most on-prem SQL
      enableArithAbort: true,
      connectTimeout: 30000,
      requestTimeout: 30000
    },
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };

  if (authType === 'windows') {
    // Note: Windows/SSPI auth generally does NOT work on Linux hosts like Render.
    // Keeping the flag for compatibility, but you likely need SQL auth on Render.
    cfg.options.trustedConnection = true;
  } else {
    cfg.user = username;
    cfg.password = password;
  }

  return cfg;
}

// Create, use, and close a pool
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

// -------- Routes --------

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test database connection and list DBs + tables
app.post('/api/database/test-connection', async (req, res) => {
  try {
    const { server, database, username, password, authType, port } = req.body;

    const cfg = buildConfig({ server, database, username, password, authType, port });

    const info = await withPool(cfg, async (pool) => {
      // List user databases
      const dbResult = await pool.request().query(`
        SELECT name 
        FROM sys.databases 
        WHERE database_id > 4 
        ORDER BY name
      `);
      const databases = dbResult.recordset.map(r => r.name);

      // Try to grab tables from the specified database, fallback to current DB
      let tables = [];
      try {
        if (database && database !== 'master') {
          const tableResult = await pool.request().query(`
            USE [${database}];
            SELECT 
              TABLE_SCHEMA,
              TABLE_NAME,
              CONCAT(TABLE_SCHEMA, '.', TABLE_NAME) AS FULL_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_SCHEMA, TABLE_NAME
          `);
          tables = tableResult.recordset.map(row => ({
            name: row.TABLE_NAME,
            schema: row.TABLE_SCHEMA,
            fullName: row.FULL_NAME
          }));
        } else {
          const masterResult = await pool.request().query(`
            SELECT 
              TABLE_SCHEMA,
              TABLE_NAME,
              CONCAT(TABLE_SCHEMA, '.', TABLE_NAME) AS FULL_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_SCHEMA, TABLE_NAME
          `);
          tables = masterResult.recordset.map(row => ({
            name: row.TABLE_NAME,
            schema: row.TABLE_SCHEMA,
            fullName: row.FULL_NAME
          }));
        }
      } catch (e) {
        // Fallback if USE fails
        const fallback = await pool.request().query(`
          SELECT 
            TABLE_SCHEMA,
            TABLE_NAME,
            CONCAT(TABLE_SCHEMA, '.', TABLE_NAME) AS FULL_NAME
          FROM INFORMATION_SCHEMA.TABLES
          WHERE TABLE_TYPE = 'BASE TABLE'
          ORDER BY TABLE_SCHEMA, TABLE_NAME
        `);
        tables = fallback.recordset.map(row => ({
          name: row.TABLE_NAME,
          schema: row.TABLE_SCHEMA,
          fullName: row.FULL_NAME
        }));
      }

      return { databases, tables };
    });

    // Store a connection id (note: we closed the pool above to avoid leaks)
    const connectionId = `${server}_${database || 'master'}_${Date.now()}`;
    connections.set(connectionId, { lastSeen: Date.now(), cfg });

    res.json({
      success: true,
      databases: info.databases,
      tables: info.tables,
      connectionId
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to connect to database'
    });
  }
});

// Execute arbitrary query
// Body: { connection: { server, database, username, password, authType, port }, query: "SELECT ..." }
app.post('/api/database/execute-query', async (req, res) => {
  try {
    const { connection, query } = req.body || {};
    if (!connection || !query) {
      return res.status(400).json({ success: false, message: "connection and query are required" });
    }

    const cfg = buildConfig(connection);
    const startTime = Date.now();

    const result = await withPool(cfg, async (pool) => {
      return pool.request().query(query);
    });

    const executionTime = Date.now() - startTime;
    res.json({
      success: true,
      data: result.recordset || [],
      columns: result.recordset?.columns ? Object.keys(result.recordset.columns) : [],
      rowCount: Array.isArray(result.recordset) ? result.recordset.length : 0,
      executionTime
    });
  } catch (error) {
    console.error('Query execution error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to execute query'
    });
  }
});

// -------- Static (optional; only if you build a frontend here) --------
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// -------- Start --------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// -------- Graceful shutdown --------
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  for (const [id, entry] of connections) {
    if (entry?.pool) {
      try { await entry.pool.close(); } catch (e) { console.error(`Error closing pool ${id}:`, e); }
    }
  }
  process.exit(0);
});
