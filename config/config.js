require('dotenv').config();

const parseDatabaseUrl = (url) => {
  if (!url) {
    console.error('DATABASE_URL is not set');
    return {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    };
  }
  
  try {
    // Remove any whitespace and ensure it starts with postgres://
    url = url.trim();
    if (!url.startsWith('postgres://')) {
      url = 'postgres://' + url;
    }
    
    console.log('Attempting to parse DATABASE_URL:', url.replace(/:[^:@]*@/, ':****@')); // Hide password in logs
    
    const parsed = new URL(url);
    const config = {
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
    
    console.log('Parsed database config:', {
      ...config,
      password: '****' // Hide password in logs
    });
    
    return config;
  } catch (e) {
    console.error('Error parsing DATABASE_URL:', e);
    console.error('Raw DATABASE_URL:', url.replace(/:[^:@]*@/, ':****@')); // Hide password in logs
    return {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    };
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