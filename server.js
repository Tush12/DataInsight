// server.js - Optimized for Render
// Express + mssql + PostgreSQL API
// Routes: /api/health, /api/database/test-connection, /api/database/execute-query

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import sql from 'mssql';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';
import 'winston-daily-rotate-file';

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Enable if behind a proxy (e.g., Render's load balancer)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Response compression
app.use(compression());

/* --------------------------- CORS & JSON --------------------------- */
// Allow explicit ALLOWED_ORIGINS (comma-separated) and optionally *.vercel.app previews
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowVercelWildcard = process.env.ALLOW_VERCEL_WILDCARD !== 'false'; // enabled by default

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // curl / server-to-server / same-origin
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (allowVercelWildcard && /^https:\/\/.*\.vercel\.app$/.test(origin)) return true;
  return ALLOWED_ORIGINS.length === 0; // permissive if no allow-list set
};

// CORS configuration
app.use(cors({
  origin: (origin, cb) => {
    if (isAllowedOrigin(origin)) {
      cb(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      cb(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 600, // Cache preflight requests for 10 minutes
  optionsSuccessStatus: 204 // Return 204 for preflight requests
}));

// Body parsing with size limit
app.use(express.json({ limit: process.env.BODY_LIMIT || '1mb' }));

/* ---------------------- Connection Pool Management ------------------ */
// SQL Server connection pool
const sqlConfig = {
  server: process.env.DB_SERVER,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'master',
  port: parseInt(process.env.DB_PORT || '1433'),
  pool: {
    max: 10, // Max connections in the pool
    min: 0,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000
  },
  options: {
    encrypt: process.env.DB_ENCRYPT !== 'false',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT === 'true',
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 30000
  }
};

// PostgreSQL connection pool
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING,
  max: 10, // Max connections in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.PG_SSL !== 'false' ? { rejectUnauthorized: false } : false
});

// Initialize SQL Server connection pool
let sqlPool;

async function getSqlPool() {
  if (!sqlPool) {
    try {
      sqlPool = await sql.connect(sqlConfig);
      logger.info('SQL Server connection pool established');
      
      // Handle connection errors
      sqlPool.on('error', err => {
        logger.error('SQL Server connection error:', err);
        sqlPool = null; // Force reconnection on next request
      });
    } catch (err) {
      logger.error('Failed to create SQL Server connection pool:', err);
      throw err;
    }
  }
  return sqlPool;
}

// Graceful shutdown handler
async function shutdown() {
  logger.info('Shutting down server...');
  
  try {
    // Close SQL Server pool if it exists
    if (sqlPool) {
      await sqlPool.close();
      logger.info('SQL Server connection pool closed');
    }
    
    // Close PostgreSQL pool
    await pgPool.end();
    logger.info('PostgreSQL connection pool closed');
    
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown:', err);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Helper function to execute SQL Server queries
async function executeSqlServerQuery(query, params = []) {
  const pool = await getSqlPool();
  const request = pool.request();
  
  // Add parameters if provided
  params.forEach((param, index) => {
    request.input(`param${index}`, param);
  });
  
  return request.query(query);
}

// Helper function to execute PostgreSQL queries
async function executePostgresQuery(query, params = []) {
  const client = await pgPool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } finally {
    client.release();
  }
}

/* ----------------------------- Middleware -------------------------- */
// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${method} ${originalUrl} - ${res.statusCode} - ${duration}ms - ${ip}`);
  });
  
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

/* ----------------------------- Routes ----------------------------- */
// Favicon (cached for 1 day)
app.get('/favicon.ico', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Test connection + list DBs & tables
app.post('/api/database/test-connection', async (req, res) => {
  try {
    const { password, dbType = 'mssql', ...rest } = req.body || {};
    logger.info('Test connection request:', { ...rest, dbType });

    if (dbType === 'postgres') {
      // Handle PostgreSQL connection
      const pool = new Pool({
        host: req.body.server,
        port: req.body.port || 5432,
        database: req.body.database || 'postgres',
        user: req.body.user || req.body.username,
        password: req.body.password,
        ssl: process.env.PG_SSL !== 'false' ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 10000,
        query_timeout: 10000,
        statement_timeout: 10000
      });

      const client = await pool.connect();
      try {
        // Test connection and get databases
        const dbResult = await client.query(
          "SELECT datname FROM pg_database WHERE datistemplate = false AND datname NOT IN ('postgres', 'template1', 'template0')"
        );
        const dbs = dbResult.rows.map(r => r.datname);
        
        let tables = [];
        if (req.body.database) {
          const tablesResult = await client.query({
            text: `
              SELECT table_schema, table_name 
              FROM information_schema.tables 
              WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
              ORDER BY table_schema, table_name
            `,
            timeout: 5000 // 5 second timeout
          });
          
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
      } finally {
        client.release();
        await pool.end();
      }
    } else {
      // SQL Server connection
      const cfg = {
        server: req.body.server,
        user: req.body.username || req.body.user,
        password: req.body.password,
        database: req.body.database || 'master',
        port: parseInt(req.body.port) || 1433,
        options: {
          encrypt: req.body.encrypt !== 'false',
          trustServerCertificate: true,
          connectTimeout: 10000,
          requestTimeout: 10000,
          enableArithAbort: true
        },
        pool: {
          max: 1, // Use a single connection for this operation
          min: 0,
          idleTimeoutMillis: 30000
        }
      };

      const pool = new sql.ConnectionPool(cfg);
      const request = new sql.Request(pool);

      try {
        await pool.connect();
        
        // Get databases
        const dbResult = await request.query(`
          SELECT name FROM sys.databases 
          WHERE database_id > 4 AND state = 0 
          ORDER BY name
        `);
        
        const databases = dbResult.recordset.map(r => r.name);
        let tables = [];

        // Get tables if database is specified
        if (cfg.database && cfg.database !== 'master') {
          const tableResult = await request.query(`
            USE [${cfg.database}];
            SELECT 
              TABLE_SCHEMA, 
              TABLE_NAME, 
              CONCAT(TABLE_SCHEMA, '.', TABLE_NAME) AS FULL_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_SCHEMA, TABLE_NAME
          `);
          
          tables = tableResult.recordset.map(r => ({
            name: r.TABLE_NAME,
            schema: r.TABLE_SCHEMA,
            fullName: r.FULL_NAME
          }));
        }

        return res.json({
          success: true,
          databases: databases,
          tables: tables,
          connectionId: `${cfg.server}_${cfg.database || 'master'}_${Date.now()}`
        });
      } finally {
        await pool.close();
      }
    }
  } catch (error) {
    logger.error('Database connection error:', error);
    return res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to connect to database',
      ...(process.env.NODE_ENV !== 'production' && { details: error.message })
    });
  }
});

// Execute query
app.post('/api/database/execute-query', async (req, res) => {
  const startTime = Date.now();
  let client;
  
  try {
    const { connection, query, dbType = 'mssql' } = req.body || {};
    
    // Validate request
    if (!connection || !query) {
      return res.status(400).json({ 
        success: false, 
        message: 'connection and query are required' 
      });
    }

    logger.info(`Executing ${dbType} query`, { 
      db: connection.database || 'master',
      server: connection.server,
      queryType: query.trim().split(' ')[0].toUpperCase(),
      queryLength: query.length
    });

    if (dbType === 'postgres') {
      // PostgreSQL query execution
      client = await pgPool.connect();
      
      try {
        const result = await client.query({
          text: query,
          rowMode: 'array' // Return rows as arrays for consistency
        });
        
        const duration = Date.now() - startTime;
        logger.info(`Query executed in ${duration}ms`, { 
          rowCount: result.rowCount,
          duration
        });
        
        return res.json({
          success: true,
          columns: result.fields.map(f => ({
            name: f.name,
            dataType: f.dataTypeID,
            format: f.format
          })),
          rows: result.rows,
          rowCount: result.rowCount,
          command: result.command,
          duration
        });
      } finally {
        if (client) client.release();
      }
    } else {
      // SQL Server query execution
      const cfg = {
        server: connection.server,
        user: connection.username || connection.user,
        password: connection.password,
        database: connection.database || 'master',
        port: parseInt(connection.port) || 1433,
        options: {
          encrypt: connection.encrypt !== 'false',
          trustServerCertificate: true,
          connectTimeout: 30000,
          requestTimeout: 30000,
          enableArithAbort: true
        },
        pool: {
          max: 1,
          min: 0,
          idleTimeoutMillis: 30000
        }
      };

      const pool = new sql.ConnectionPool(cfg);
      const request = new sql.Request(pool);
      
      try {
        await pool.connect();
        
        // Set query timeout (in milliseconds)
        if (connection.timeout) {
          request.timeout = parseInt(connection.timeout) || 30000;
        }
        
        const result = await request.query(query);
        const duration = Date.now() - startTime;
        
        logger.info(`Query executed in ${duration}ms`, { 
          rowCount: result.recordset.length,
          duration
        });
        
        return res.json({
          success: true,
          columns: Object.keys(result.recordset[0] || {}),
          rows: result.recordset,
          rowCount: result.rowsAffected[0],
          duration
        });
      } finally {
        await pool.close();
      }
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Query execution error:', { 
      error: error.message,
      duration,
      query: req.body?.query?.substring(0, 200) // Log first 200 chars of query
    });
    
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to execute query',
      ...(process.env.NODE_ENV !== 'production' && { 
        details: error.message,
        ...(error.code && { code: error.code })
      }),
      duration
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  const { address, port } = server.address();
  logger.info(`Server running at http://${address}:${port}`);
  
  // Log environment info
  logger.info('Environment:', {
    node: process.version,
    platform: process.platform,
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  // Close server and exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Close server and exit process
  server.close(() => process.exit(1));
});

// Handle process termination
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
  });
});
