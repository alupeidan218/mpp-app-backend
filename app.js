const express = require('express');
const cors = require('cors');
const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Routes
app.use('/api/cpus', require('./routes/cpus'));
app.use('/api/statistics', require('./routes/statistics'));
app.use('/api/manufacturers', require('./routes/manufacturers'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

module.exports = app; 