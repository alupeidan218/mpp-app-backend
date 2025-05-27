const express = require('express');
const cors = require('cors');
const { body, validationResult, query, param } = require('express-validator');
const WebSocket = require('ws');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { CPU, Manufacturer, UserAction, initializeDatabase } = require('./models');
const { authenticateToken, authorizeRole } = require('./middleware/auth');
const actionLogger = require('./middleware/actionLogger');
const monitoringService = require('./services/MonitoringService');
const authRoutes = require('./routes/auth');
const monitoringRoutes = require('./routes/monitoring');
const statisticsRoutes = require('./routes/statistics');
const manufacturersRoutes = require('./routes/manufacturers');

const app = express();
const port = process.env.PORT || 3000;

// Initialize with empty data array
let cpus = [];

// Create HTTP server
const server = require('http').createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();

// Background data generation interval (in milliseconds)
const GENERATION_INTERVAL = 30000;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
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

// Function to initialize server with retry logic
const initializeServer = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempting to initialize database (attempt ${i + 1}/${retries})...`);
      await initializeDatabase();
      console.log('Database initialized successfully');
      
      // Initialize monitoring service
      monitoringService.startMonitoring();
      console.log('Monitoring service initialized');
      
      return true; // Success, exit the function
    } catch (error) {
      console.error(`Database initialization failed (attempt ${i + 1}/${retries}):`, error);
      
      if (i < retries - 1) {
        console.log(`Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('Max retries reached. Server will start without database connection.');
        return false;
      }
    }
  }
  return false;
};

// Start the server
const startServer = async () => {
  try {
    // Try to initialize database
    const dbInitialized = await initializeServer();
    
    if (!dbInitialized) {
      console.log('Starting server in degraded mode (no database connection)');
    }

    // Start the server
    server.listen(port, '0.0.0.0', () => {
      console.log(`Server is running on http://0.0.0.0:${port}`);
      console.log('Initializing data...');
      generateInitialData();
      startBackgroundGeneration();
      console.log('Server initialization complete');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Function to generate initial data
async function generateInitialData(count = 100) {
  console.log(`Generating ${count} initial CPU entries...`);
  for (let i = 0; i < count; i++) {
    const newEntry = generateCPUEntry();
    cpus.push(newEntry);
    console.log(`Generated initial entry ${i + 1}/${count}:`, newEntry);
  }
  console.log('Initial data generation complete');
}

// Function to generate a random CPU entry
function generateCPUEntry() {
  const manufacturers = ['Intel', 'AMD'];
  const intelSeries = ['Core i3', 'Core i5', 'Core i7', 'Core i9'];
  const amdSeries = ['Ryzen 3', 'Ryzen 5', 'Ryzen 7', 'Ryzen 9'];
  const generations = ['11th', '12th', '13th', '14th'];
  
  const manufacturer = manufacturers[Math.floor(Math.random() * manufacturers.length)];
  const series = manufacturer === 'Intel' 
    ? intelSeries[Math.floor(Math.random() * intelSeries.length)]
    : amdSeries[Math.floor(Math.random() * amdSeries.length)];
  const generation = generations[Math.floor(Math.random() * generations.length)];
  const modelNumber = Math.floor(Math.random() * 900) + 100;
  const cores = Math.floor(Math.random() * 16) + 4;
  const score = Math.floor(Math.random() * 50) + 50;
  const price = Math.floor(Math.random() * 500) + 100;
  
  const newEntry = {
    id: cpus.length > 0 ? Math.max(...cpus.map(c => c.id)) + 1 : 1,
    cpuModel: `${manufacturer} ${series}-${generation} ${modelNumber}`,
    score: score * 100,
    nrCores: cores,
    clockSpeed: (Math.random() * 2 + 2).toFixed(1),
    manufacturingDate: new Date(Date.now() - Math.random() * 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priceUSD: price
  };
  
  console.log('Generated new CPU entry:', newEntry);
  return newEntry;
}

// Function to broadcast to all connected clients
function broadcastToAll(message) {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.add(ws);
  
  // Send initial data
  ws.send(JSON.stringify({
    type: 'initialData',
    data: cpus.slice(0, 25),
    total: cpus.length,
    hasMore: cpus.length > 25
  }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data);

      switch (data.type) {
        case 'generate':
          const count = data.count || 5;
          console.log(`Generating ${count} entries...`);
          
          for (let i = 0; i < count; i++) {
            const newEntry = generateCPUEntry();
            cpus.push(newEntry);
            
            // Send progress update
            ws.send(JSON.stringify({
              type: 'progress',
              current: i + 1,
              total: count,
              entry: newEntry
            }));
            
            // Broadcast to all clients
            broadcastToAll({
              type: 'newEntry',
              entry: newEntry
            });
          }
          
          // Send completion message
          ws.send(JSON.stringify({
            type: 'complete',
            message: `Generated ${count} new CPU entries`
          }));
          break;

        case 'requestMore':
          const start = data.start || 0;
          const limit = data.limit || 25;
          const moreData = cpus.slice(start, start + limit);
          
          ws.send(JSON.stringify({
            type: 'moreData',
            data: moreData,
            hasMore: start + limit < cpus.length
          }));
          break;
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
});

// Enable CORS for all routes
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://cpu-benchmark-app-t5hp.onrender.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/manufacturers', authenticateToken, actionLogger('MANUFACTURER'), manufacturersRoutes);

// Protected routes
app.use('/api/cpus', authenticateToken, actionLogger('CPU'), require('./routes/cpus'));
app.use('/api/uploads', authenticateToken, actionLogger('FILE'), require('./routes/uploads'));
app.use('/api/download', authenticateToken, actionLogger('FILE'), require('./routes/download'));

// GET /api/cpus - Get all CPUs with filtering and sorting
app.get('/api/cpus', [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  query('sortBy').optional().isIn(['score', 'priceUSD', 'manufacturingDate', 'nrCores', 'clockSpeed']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('manufacturerId').optional().isInt(),
  query('manufacturerName').optional().isString(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('minScore').optional().isInt({ min: 0 }),
  query('maxScore').optional().isInt({ min: 0 }),
  query('series').optional().isString(),
  query('generation').optional().isString(),
  query('search').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      limit = 25,
      offset = 0,
      sortBy = 'score',
      sortOrder = 'desc',
      manufacturerId,
      manufacturerName,
      minPrice,
      maxPrice,
      minScore,
      maxScore,
      series,
      generation,
      search
    } = req.query;

    // Build query options
    const queryOptions = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]],
      include: [
        {
          model: Manufacturer,
          attributes: ['name', 'description'],
          ...(manufacturerName ? { where: { name: { [Op.iLike]: `%${manufacturerName}%` } } } : {})
        }
      ],
      where: {}
    };

    // Add filters
    if (manufacturerId) {
      queryOptions.where.manufacturerId = manufacturerId;
    }

    if (minPrice || maxPrice) {
      queryOptions.where.priceUSD = {};
      if (minPrice) queryOptions.where.priceUSD[Op.gte] = parseFloat(minPrice);
      if (maxPrice) queryOptions.where.priceUSD[Op.lte] = parseFloat(maxPrice);
    }

    if (minScore || maxScore) {
      queryOptions.where.score = {};
      if (minScore) queryOptions.where.score[Op.gte] = parseInt(minScore);
      if (maxScore) queryOptions.where.score[Op.lte] = parseInt(maxScore);
    }

    if (series) {
      queryOptions.where.series = series;
    }

    if (generation) {
      queryOptions.where.generation = generation;
    }

    if (search) {
      queryOptions.where[Op.or] = [
        { model: { [Op.iLike]: `%${search}%` } },
        { series: { [Op.iLike]: `%${search}%` } },
        { generation: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Get total count for pagination
    const total = await CPU.count({ where: queryOptions.where });

    // Get CPUs with pagination
    const cpus = await CPU.findAll(queryOptions);

    res.json({
      data: cpus,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching CPUs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/cpus - Create a new CPU
app.post('/api/cpus', [
  authenticateToken,
  body('model').notEmpty(),
  body('score').isInt({ min: 0 }),
  body('nrCores').isInt({ min: 1 }),
  body('clockSpeed').isFloat({ min: 0 }),
  body('manufacturingDate').isDate(),
  body('priceUSD').isFloat({ min: 0 }),
  body('manufacturerId').isInt(),
  body('series').optional().isString(),
  body('generation').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const cpu = await CPU.create({
      ...req.body,
      userId: req.user.id
    });

    // Log the action
    await UserAction.create({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'CPU',
      entityId: cpu.id,
      details: { model: cpu.model }
    });

    res.status(201).json(cpu);
  } catch (error) {
    console.error('Error creating CPU:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/cpus/:id - Update a CPU
app.put('/api/cpus/:id', [
  param('id').isInt(),
  body('model').optional().notEmpty(),
  body('score').optional().isInt({ min: 0 }),
  body('nrCores').optional().isInt({ min: 1 }),
  body('clockSpeed').optional().isFloat({ min: 0 }),
  body('manufacturingDate').optional().isDate(),
  body('priceUSD').optional().isFloat({ min: 0 }),
  body('manufacturerId').optional().isInt(),
  body('series').optional().isString(),
  body('generation').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const cpu = await CPU.findByPk(req.params.id);
    if (!cpu) {
      return res.status(404).json({ error: 'CPU not found' });
    }

    // Check if user has permission to update
    if (cpu.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this CPU' });
    }

    await cpu.update(req.body);

    // Log the action
    await UserAction.create({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'CPU',
      entityId: cpu.id,
      details: { model: cpu.model }
    });

    res.json(cpu);
  } catch (error) {
    console.error('Error updating CPU:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/cpus/:id - Delete a CPU
app.delete('/api/cpus/:id', [
  param('id').isInt()
], async (req, res) => {
  try {
    const cpu = await CPU.findByPk(req.params.id);
    if (!cpu) {
      return res.status(404).json({ error: 'CPU not found' });
    }

    // Check if user has permission to delete
    if (cpu.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this CPU' });
    }

    // Log the action before deleting
    await UserAction.create({
      userId: req.user.id,
      action: 'DELETE',
      entityType: 'CPU',
      entityId: cpu.id,
      details: { model: cpu.model }
    });

    await cpu.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting CPU:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/upload - Upload a file
app.post('/api/upload', upload.single('file'), async (req, res) => {
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
      return entry.cpuModel && 
             !isNaN(entry.score) && 
             !isNaN(entry.nrCores) && 
             !isNaN(entry.clockSpeed) && 
             !isNaN(entry.priceUSD) &&
             entry.manufacturingDate;
    });

    // Add valid entries to the database
    validEntries.forEach(entry => {
      const newEntry = {
        id: cpus.length > 0 ? Math.max(...cpus.map(c => c.id)) + 1 : 1,
        cpuModel: entry.cpuModel,
        score: parseInt(entry.score),
        nrCores: parseInt(entry.nrCores),
        clockSpeed: parseFloat(entry.clockSpeed),
        manufacturingDate: entry.manufacturingDate,
        priceUSD: parseFloat(entry.priceUSD),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      cpus.push(newEntry);
    });

    // Broadcast new entries to all connected clients
    validEntries.forEach(entry => {
      broadcastToAll({
        type: 'newEntry',
        entry: entry
      });
    });

    // Return success response with stats
    res.json({
      message: 'File uploaded successfully',
      file: {
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      },
      stats: {
        totalEntries: entries.length,
        validEntries: validEntries.length,
        processedEntries: processedEntries
      }
    });

  } catch (error) {
    console.error('Error processing uploaded file:', error);
    res.status(500).json({ error: 'Error processing uploaded file: ' + error.message });
  }
});

// GET /api/uploads - List all uploaded files
app.get('/api/uploads', (req, res) => {
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    return res.json([]);
  }
  
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      console.error('Error reading uploads directory:', err);
      return res.status(500).json({ error: 'Error reading uploads directory' });
    }
    
    const fileDetails = files.map(file => {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        originalname: file.split('-').slice(2).join('-'), // Extract original filename
        size: stats.size,
        date: stats.mtime,
        path: `/api/download/${file}`
      };
    });
    
    res.json(fileDetails);
  });
});

// GET /api/download/:filename - Download a file
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.download(filePath);
});

// Start background generation
function startBackgroundGeneration() {
  console.log('Starting background data generation...');
  setInterval(() => {
    if (clients.size > 0) {
      const newEntry = generateCPUEntry();
      cpus.push(newEntry);
      broadcastToAll({
        type: 'newEntry',
        entry: newEntry
      });
      console.log('Generated and broadcasted new entry:', newEntry);
    }
  }, GENERATION_INTERVAL);
}

// Start the server with error handling
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Please try the following:`);
    console.error('1. Wait a few seconds and try again');
    console.error('2. Check if another instance is running');
    console.error('3. Try using a different port');
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});

// Add error handlers for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
}); 