const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { UploadedFile } = require('../models');
const { authenticateToken } = require('../middleware/auth');

// GET /api/download/:filename - Download a file
router.get('/:filename', authenticateToken, async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Check file ownership
  const fileRecord = await UploadedFile.findOne({ where: { name: filename } });
  if (!fileRecord) {
    return res.status(404).json({ error: 'File metadata not found' });
  }
  if (req.user.role !== 'admin' && fileRecord.userId !== req.user.id) {
    return res.status(403).json({ error: 'You do not have permission to download this file' });
  }
  
  res.download(filePath);
});

module.exports = router; 