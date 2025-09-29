# Database Integration Setup

This guide explains how to set up the database connectivity feature for the Data Compare & Visualize tool.

## Overview

The application now supports:
- Direct connection to SQL Server databases
- Table browsing and querying
- Custom SQL query execution
- Integration with existing file comparison features
- Export of database query results

## Prerequisites

1. **Node.js** (version 16 or higher)
2. **SQL Server** (any version with SQL Server authentication or Windows authentication)
3. **Network access** to your SQL Server instance

## Setup Instructions

### 1. Install Dependencies

```bash
# All dependencies are already included in package.json
npm install
```

### 2. Start the Backend Server

```bash
# Start the server (production mode)
npm run server

# Or with auto-restart during development
npm run server:dev
```

The server will run on `http://localhost:3001`

### 3. Start the Frontend

```bash
# In a separate terminal, start the React app
npm run dev
```

The frontend will run on `http://localhost:8080` with API proxy configured.

## Usage

### 1. Access Database Page

Navigate to `http://localhost:8080/database` or click "Database" in the navigation menu.

### 2. Configure Database Connection

Fill in the connection details:
- **Server Name/IP**: Your SQL Server instance (e.g., `localhost`, `192.168.1.100`, `server.domain.com`)
- **Port**: Usually `1433` (default SQL Server port)
- **Database Name**: The specific database you want to connect to
- **Authentication**: Choose between Windows Authentication or SQL Server Authentication

### 3. Test Connection

Click "Test Connection" to verify your settings. If successful, you'll see available tables.

### 4. Query Data

**Option A: Browse Tables**
- Select a table from the dropdown
- Click "Execute Query" to run `SELECT * FROM [table_name]`

**Option B: Custom SQL**
- Switch to "Custom Query" tab
- Write your own SQL query
- Click "Execute Query" to run it

### 5. Compare Data

- Query results automatically become "Dataset 1" for comparison
- Upload a CSV/Excel file to compare with database results
- Use the existing comparison engine to analyze differences

## Security Considerations

### Development Environment
- The server uses `trustServerCertificate: true` for development
- Connections are not persistent (closed after each query)
- No connection pooling in current implementation

### Production Deployment
For production, consider:
- Using connection pooling
- Implementing proper SSL/TLS
- Adding authentication/authorization
- Using environment variables for sensitive data
- Implementing query timeout limits
- Adding input validation and sanitization

## API Endpoints

### POST `/api/database/test-connection`
Tests database connectivity and returns available tables.

**Request Body:**
```json
{
  "server": "localhost",
  "database": "YourDatabase",
  "username": "sa",
  "password": "password",
  "authType": "sql",
  "port": 1433
}
```

### POST `/api/database/execute-query`
Executes a SQL query and returns results.

**Request Body:**
```json
{
  "connection": {
    "server": "localhost",
    "database": "YourDatabase",
    "username": "sa",
    "password": "password",
    "authType": "sql",
    "port": 1433
  },
  "query": "SELECT * FROM Users WHERE Active = 1"
}
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if SQL Server is running
   - Verify the server name and port
   - Ensure SQL Server allows TCP/IP connections

2. **Authentication Failed**
   - Verify username/password for SQL authentication
   - For Windows authentication, ensure the user has database access
   - Check if the SQL Server instance allows the authentication method

3. **Database Not Found**
   - Verify the database name is correct
   - Ensure the user has access to the database

4. **Query Timeout**
   - Large queries may timeout
   - Consider adding LIMIT clauses for testing
   - Check network connectivity

### Firewall Configuration

Ensure the following ports are open:
- **1433**: Default SQL Server port
- **3001**: Backend API server (development)
- **8080**: Frontend development server

## Example Use Cases

1. **Compare Database vs File Data**
   - Query a table from your database
   - Upload a CSV file with similar data
   - Compare to find differences

2. **Data Validation**
   - Run queries to validate data integrity
   - Export results for further analysis
   - Compare different time periods

3. **Migration Verification**
   - Query source and target databases
   - Compare data before and after migration
   - Identify missing or changed records

## Next Steps

Consider implementing:
- Query history and saved queries
- Multiple database connections
- Advanced query builder
- Data visualization for query results
- Scheduled query execution
- User management and permissions
