require('dotenv').config();
const { Sequelize } = require('sequelize');

// Add debugging
console.log('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL ? 'Set (hidden for security)' : 'Not set',
  // Log other relevant env vars without sensitive data
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER ? 'Set (hidden for security)' : 'Not set'
});

const env = process.env.NODE_ENV || 'development';
const config = {
  development: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  },
  test: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  },
  production: {
    url: process.env.DATABASE_URL,
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

// Add more debugging
console.log('Selected environment:', env);
console.log('Database config:', {
  ...config[env],
  url: config[env].url ? 'Set (hidden for security)' : 'Not set'
});

const sequelize = new Sequelize(config[env].url, {
  dialect: config[env].dialect,
  dialectOptions: config[env].dialectOptions,
  pool: config[env].pool
});

module.exports = sequelize; 