require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const workflowsRouter = require('./routes/workflows');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    system: 'SprintForge AI Engine',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/workflows', workflowsRouter);
app.use('/api/admin', adminRouter);

// Fallback to SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 SprintForge AI Engine running on port ${PORT}`);
  console.log(`📍 Web UI: http://localhost:${PORT}`);
  console.log(`📊 Admin:  http://localhost:${PORT}#admin`);
  console.log(`===============================================`);
});
