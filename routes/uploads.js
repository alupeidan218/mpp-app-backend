const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { CPU, UploadedFile } = require('../models');
const { authenticateToken } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 1024 // 1GB limit
  }
});

// GET /api/uploads - List uploaded files
router.get('/', authenticateToken, async (req, res) => {
  try {
    let files;
    if (req.user.role === 'admin') {
      files = await UploadedFile.findAll({
        order: [['date', 'DESC']]
      });
    } else {
      files = await UploadedFile.findAll({ 
        where: { userId: req.user.id },
        order: [['date', 'DESC']]
      });
    }
    res.json(files);
  } catch (error) {
    console.error('Error fetching uploaded files:', error);
    res.status(500).json({ error: 'Error fetching uploaded files' });
  }
});

// POST /api/uploads - Upload a file
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    let entries = [];
    let processedEntries = 0;

    // Read and parse the file based on its type
    if (file.mimetype === 'text/csv') {
      const csvContent = fs.readFileSync(file.path, 'utf-8');
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const entry = {};
        headers.forEach((header, index) => {
          entry[header] = values[index];
        });
        entries.push(entry);
        processedEntries++;
      }
    } else if (file.mimetype === 'application/json') {
      const jsonContent = fs.readFileSync(file.path, 'utf-8');
      entries = JSON.parse(jsonContent);
      processedEntries = entries.length;
    }

    // Validate and add entries
    const validEntries = entries.filter(entry => {
      return entry.model && 
             !isNaN(entry.score) && 
             !isNaN(entry.nrCores) && 
             !isNaN(entry.clockSpeed) && 
             !isNaN(entry.priceUSD) &&
             entry.manufacturingDate;
    });

    // Add valid entries to the database
    const createdCPUs = await CPU.bulkCreate(validEntries.map(entry => ({
      ...entry,
      userId: req.user.id
    })));

    // Save file metadata to UploadedFile table
    const uploadedFile = await UploadedFile.create({
      name: file.filename,
      originalname: file.originalname,
      size: file.size,
      date: new Date(),
      userId: req.user.id
    });

    // Return success response with stats
    res.json({
      message: 'File uploaded successfully',
      file: uploadedFile,
      stats: {
        totalEntries: entries.length,
        validEntries: validEntries.length,
        processedEntries: processedEntries,
        createdCPUs: createdCPUs.length
      }
    });

  } catch (error) {
    console.error('Error processing uploaded file:', error);
    res.status(500).json({ error: 'Error processing uploaded file: ' + error.message });
  }
});

// DELETE /api/uploads/:name - Delete a file
router.delete('/:name', authenticateToken, async (req, res) => {
  try {
    const filename = req.params.name;
    const fileRecord = await UploadedFile.findOne({ where: { name: filename } });
    
    if (!fileRecord) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    if (req.user.role !== 'admin' && fileRecord.userId !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to delete this file' });
    }

    // Remove file from disk
    const filePath = path.join(__dirname, '../uploads', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove DB record
    await fileRecord.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Error deleting file' });
  }
});

module.exports = router; 