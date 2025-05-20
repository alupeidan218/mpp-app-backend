const express = require('express');
const app = express();

// CORS headers middleware
app.use((req, res, next) => {
  console.log('Request received:', {
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
    headers: req.headers
  });

  // Set CORS headers
  res.header('Access-Control-Allow-Origin', 'https://cpu-benchmark-app-t5hp.onrender.com');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return res.status(204).end();
  }

  next();
});

// Parse JSON bodies
app.use(express.json());

// Routes
app.use('/api/cpus', require('./routes/cpus'));
app.use('/api/statistics', require('./routes/statistics'));
app.use('/api/manufacturers', require('./routes/manufacturers'));
app.use('/api/auth', require('./routes/auth'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  res.status(500).json({ 
    error: 'Something broke!',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  console.log('404 Not Found:', req.method, req.url);
  res.status(404).json({ error: 'Not Found' });
});

module.exports = app; 