import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { DatabaseService } from './database.js';
import { authMiddleware } from './middleware/auth.js';

// Load environment variables
dotenv.config();

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database service
const db = new DatabaseService();

// Middleware setup
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Validation schemas
const plotSchema = Joi.object({
  plotNumber: Joi.string().required().min(3).max(20),
  location: Joi.string().required().min(3).max(200),
  size: Joi.string().required(),
  price: Joi.number().positive().required(),
  status: Joi.string().valid('available', 'reserved', 'sold').default('available'),
  description: Joi.string().max(1000),
  amenities: Joi.array().items(Joi.string()).default([])
});

const updatePlotSchema = Joi.object({
  plotNumber: Joi.string().min(3).max(20),
  location: Joi.string().min(3).max(200),
  size: Joi.string(),
  price: Joi.number().positive(),
  status: Joi.string().valid('available', 'reserved', 'sold'),
  description: Joi.string().max(1000),
  amenities: Joi.array().items(Joi.string())
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Available Plots Microservice',
    version: '2.0.0',
    database: 'connected'
  });
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { username, password } = value;
    const user = await db.findAdminByUsername(username);
    
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify token endpoint
app.get('/api/auth/verify', authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Plot endpoints (protected)
app.get('/api/plots', async (req, res) => {
  try {
    const { status, location, minPrice, maxPrice } = req.query;
    const plots = await db.getPlots({ status, location, minPrice, maxPrice });

    res.status(200).json({
      success: true,
      count: plots.length,
      data: plots
    });
  } catch (error) {
    console.error('Error fetching plots:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

app.get('/api/plots/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const plot = await db.getPlotById(id);

    if (!plot) {
      return res.status(404).json({
        success: false,
        message: 'Plot not found'
      });
    }

    res.status(200).json({
      success: true,
      data: plot
    });
  } catch (error) {
    console.error('Error fetching plot:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

app.post('/api/plots', authMiddleware, async (req, res) => {
  try {
    const { error, value } = plotSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const existingPlot = await db.getPlotByNumber(value.plotNumber);
    if (existingPlot) {
      return res.status(409).json({
        success: false,
        message: 'Plot number already exists'
      });
    }

    const newPlot = await db.createPlot(value);

    res.status(201).json({
      success: true,
      message: 'Plot created successfully',
      data: newPlot
    });
  } catch (error) {
    console.error('Error creating plot:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

app.put('/api/plots/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updatePlotSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const existingPlot = await db.getPlotById(id);
    if (!existingPlot) {
      return res.status(404).json({
        success: false,
        message: 'Plot not found'
      });
    }

    if (value.plotNumber && value.plotNumber !== existingPlot.plot_number) {
      const plotWithSameNumber = await db.getPlotByNumber(value.plotNumber);
      if (plotWithSameNumber) {
        return res.status(409).json({
          success: false,
          message: 'Plot number already exists'
        });
      }
    }

    const updatedPlot = await db.updatePlot(id, value);

    res.status(200).json({
      success: true,
      message: 'Plot updated successfully',
      data: updatedPlot
    });
  } catch (error) {
    console.error('Error updating plot:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

app.delete('/api/plots/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const existingPlot = await db.getPlotById(id);
    
    if (!existingPlot) {
      return res.status(404).json({
        success: false,
        message: 'Plot not found'
      });
    }

    await db.deletePlot(id);

    res.status(200).json({
      success: true,
      message: 'Plot deleted successfully',
      data: existingPlot
    });
  } catch (error) {
    console.error('Error deleting plot:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await db.connect();
    console.log('✅ Database connected successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 Plots Microservice running on port ${PORT}`);
      console.log(`📊 Health check available at http://localhost:${PORT}/health`);
      console.log(`🔐 Authentication endpoints:`);
      console.log(`   POST   /api/auth/login - Admin login`);
      console.log(`   GET    /api/auth/verify - Verify token`);
      console.log(`📋 API endpoints (protected):`);
      console.log(`   GET    /api/plots - Get plots`);
      console.log(`   GET    /api/plots/:id - Get specific plot`);
      console.log(`   POST   /api/plots - Create new plot (admin only)`);
      console.log(`   PUT    /api/plots/:id - Update plot (admin only)`);
      console.log(`   DELETE /api/plots/:id - Delete plot (admin only)`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;