import sql from 'mssql';

const config: sql.config = {
  server: process.env.DB_SERVER || 'cryovizweb-sql-db.database.windows.net',
  database: process.env.DB_NAME || 'cryoviz-sql-dev',
  port: 1433,
  authentication: {
    type: 'azure-active-directory-default',
    options: {} // This must be present to satisfy the TypeScript definition
  },
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export const getDb = async () => {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .then(pool => {
        console.log('Connected to Azure SQL');
        return pool;
      })
      .catch(err => {
        poolPromise = null;
        console.error('Database Connection Failed!', err);
        throw err;
      });
  }
  return poolPromise;
};