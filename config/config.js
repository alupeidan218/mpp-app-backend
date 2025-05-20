require('dotenv').config();

const parseDatabaseUrl = (url) => {
  if (!url) return {};
  
  try {
    const parsed = new URL(url);
    return {
      username: parsed.username,
      password: parsed.password,
      database: parsed.pathname.substring(1),
      host: parsed.hostname,
      port: parsed.port,
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    };
  } catch (e) {
    console.error('Error parsing DATABASE_URL:', e);
    return {};
  }
};

module.exports = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'cpu_benchmark',
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: false
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'cpu_benchmark_test',
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: false
  },
  production: {
    ...parseDatabaseUrl(process.env.DATABASE_URL),
    logging: false
  }
}; 