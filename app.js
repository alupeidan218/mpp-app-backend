const express = require('express');
const cors = require('cors');
const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'https://cpu-benchmark-app-t5hp.onrender.com',
    'http://localhost:5173',  // For local development
    'http://localhost:3000'   // For local development
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Enable CORS with options
app.use(cors(corsOptions));

// Parse JSON bodies
app.use(express.json());

// Routes
app.use('/api/cpus', require('./routes/cpus'));
app.use('/api/statistics', require('./routes/statistics'));
app.use('/api/manufacturers', require('./routes/manufacturers'));
app.use('/api/auth', require('./routes/auth'));  // Make sure auth routes are included

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

module.exports = app; 