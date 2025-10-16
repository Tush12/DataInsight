import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Store active connections
const connections = new Map();

// Test database connection
app.post('/api/database/test-connection', async (req, res) => {
  try {
    const { server, database, username, password, authType, port = 1433 } = req.body;
    
    console.log('Connection attempt:', { server, database, username, authType, port });
    
    const config = {
      server: server,
      port: parseInt(port),
      database: database || 'master',
      user: username,
      password: password,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        instanceName: '',
        connectTimeout: 30000,
        requestTimeout: 30000
      }
    };

    if (authType === 'windows') {
      config.options.trustedConnection = true;
      delete config.user;
      delete config.password;
    }

    // Test connection
    const pool = await sql.connect(config);
    
    // Get list of available databases
    const dbResult = await pool.request().query(`
      SELECT name 
      FROM sys.databases 
      WHERE database_id > 4 
      ORDER BY name
    `);
    
    const databases = dbResult.recordset.map(row => row.name);
    
    // Get list of tables from the specified database with schema information
    let tables = [];
    if (database && database !== 'master') {
      try {
        const tableResult = await pool.request().query(`
          USE [${database}];
          SELECT 
            TABLE_SCHEMA,
            TABLE_NAME,
            CONCAT(TABLE_SCHEMA, '.', TABLE_NAME) as FULL_NAME
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_TYPE = 'BASE TABLE'
          ORDER BY TABLE_SCHEMA, TABLE_NAME
        `);
        tables = tableResult.recordset.map(row => ({
          name: row.TABLE_NAME,
          schema: row.TABLE_SCHEMA,
          fullName: row.FULL_NAME
        }));
      } catch (error) {
        console.log('Could not get tables from specific database, trying master:', error.message);
        // Fallback to master database tables
        const masterResult = await pool.request().query(`
          SELECT 
            TABLE_SCHEMA,
            TABLE_NAME,
            CONCAT(TABLE_SCHEMA, '.', TABLE_NAME) as FULL_NAME
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
    } else {
      // Get tables from master database
      const masterResult = await pool.request().query(`
        SELECT 
          TABLE_SCHEMA,
          TABLE_NAME,
          CONCAT(TABLE_SCHEMA, '.', TABLE_NAME) as FULL_NAME
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
    
    // Store connection for later use
    const connectionId = `${server}_${database}_${Date.now()}`;
    connections.set(connectionId, pool);
    
    res.json({
      success: true,
      tables,
      databases,
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

// Execute query
app.post('/api/database/execute-query', async (req, res) => {
  try {
    const { connection, query } = req.body;
    
    // Create new connection for this query
    const config = {
      server: connection.server,
      port: parseInt(connection.port || 1433),
      database: connection.database || 'master',
      user: connection.username,
      password: connection.password,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        instanceName: '',
        connectTimeout: 30000,
        requestTimeout: 30000
      }
    };

    if (connection.authType === 'windows') {
      config.options.trustedConnection = true;
      delete config.user;
      delete config.password;
    }

    const startTime = Date.now();
    const pool = await sql.connect(config);
    const result = await pool.request().query(query);
    const executionTime = Date.now() - startTime;
    
    await pool.close();
    
    res.json({
      data: result.recordset,
      columns: result.recordset.columns ? Object.keys(result.recordset.columns) : [],
      rowCount: result.recordset.length,
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  
  // Close all database connections
  for (const [id, pool] of connections) {
    try {
      await pool.close();
    } catch (error) {
      console.error(`Error closing connection ${id}:`, error);
    }
  }
  
  process.exit(0);
});
