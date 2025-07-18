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
    // Handle Azure connection string format
    if (url.includes(';')) {
      const parts = url.split(';').reduce((acc, part) => {
        const [key, value] = part.split('=');
        acc[key] = value;
        return acc;
      }, {});
      
      console.log('Parsed Azure connection string:', {
        ...parts,
        Password: '****' // Hide password in logs
      });
      
      return {
        username: parts['User Id'],
        password: parts.Password,
        database: parts.Database,
        host: parts.Server,
        port: 5432,
        dialect: 'postgres',
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
      };
    }
    
    // Handle PostgreSQL URL format
    url = url.trim();
    if (!url.startsWith('postgres://')) {
      url = 'postgres://' + url;
    }
    
    console.log('Attempting to parse DATABASE_URL:', url.replace(/:[^:@]*@/, ':****@')); // Hide password in logs
    
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
    port: 5432,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
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
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
}; 