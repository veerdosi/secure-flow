import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { OAuth2Client } from 'google-auth-library';
import { User, connectDB } from '../models';
import logger from '../utils/logger';

const router = Router();

// Initialize Google OAuth client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Register
router.post('/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Ensure database connection
      await connectDB();
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = new User({
        email,
        password: hashedPassword,
        name,
        projects: [],
        preferences: {
          theme: 'dark',
          notifications: true,
          autoRefresh: true,
          dashboardLayout: 'detailed',
          defaultTimeRange: '24h'
        },
        lastLogin: new Date(),
      });

      await user.save();

      // Generate JWT
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '7d' }
      );

      logger.info(`User registered: ${email}`);

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Login
router.post('/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Ensure database connection
      await connectDB();
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '7d' }
      );

      logger.info(`User logged in: ${email}`);

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          projects: user.projects,
          preferences: user.preferences,
          lastLogin: user.lastLogin,
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    // Ensure database connection
    await connectDB();
    
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      projects: user.projects,
      preferences: user.preferences,
      gitlabSettings: user.gitlabSettings,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Update user preferences
router.patch('/preferences',
  async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;

      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update preferences
      user.preferences = { ...user.preferences, ...req.body };
      await user.save();

      res.json({
        message: 'Preferences updated successfully',
        preferences: user.preferences,
      });
    } catch (error) {
      logger.error('Update preferences error:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  }
);

// Update GitLab settings
router.patch('/gitlab-settings',
  [
    body('apiToken').notEmpty().withMessage('API token is required'),
    body('baseUrl').isURL().withMessage('Valid GitLab URL is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;

      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const { apiToken, baseUrl } = req.body;

      // Update GitLab settings
      user.gitlabSettings = {
        apiToken,
        baseUrl: baseUrl.replace(/\/$/, '') // Remove trailing slash
      };
      await user.save();

      logger.info(`GitLab settings updated for user: ${user.email}`);

      res.json({
        message: 'GitLab settings updated successfully',
        gitlabSettings: {
          baseUrl: user.gitlabSettings.baseUrl,
          connected: true
        }
      });
    } catch (error) {
      logger.error('Update GitLab settings error:', error);
      res.status(500).json({ error: 'Failed to update GitLab settings' });
    }
  }
);

// Test GitLab connection
router.post('/gitlab-test',
  [
    body('apiToken').notEmpty().withMessage('API token is required'),
    body('baseUrl').isURL().withMessage('Valid GitLab URL is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { apiToken, baseUrl } = req.body;
      const axios = require('axios');

      // Test GitLab API connection
      const response = await axios.get(`${baseUrl.replace(/\/$/, '')}/api/v4/user`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        },
        timeout: 10000
      });

      res.json({
        success: true,
        message: 'Successfully connected to GitLab!',
        user: {
          username: response.data.username,
          name: response.data.name,
          email: response.data.email
        }
      });
    } catch (error: any) {
      logger.error('GitLab test connection error:', error);
      
      if (error.response?.status === 401) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid GitLab API token. Please check your token and try again.' 
        });
      }
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return res.status(400).json({ 
          success: false, 
          error: 'Cannot connect to GitLab server. Please check the URL and try again.' 
        });
      }

      res.status(400).json({ 
        success: false, 
        error: 'Failed to connect to GitLab. Please check your settings and try again.' 
      });
    }
  }
);

// Google OAuth Sign-In
router.post('/google',
  [
    body('credential').notEmpty().withMessage('Google credential is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Ensure database connection
      await connectDB();
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { credential } = req.body;

      // Verify Google token
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      
      if (!payload) {
        return res.status(401).json({ error: 'Invalid Google token' });
      }

      const { email, name, picture, sub: googleId } = payload;

      if (!email) {
        return res.status(400).json({ error: 'Email not provided by Google' });
      }

      // Check if user already exists
      let user = await User.findOne({ 
        $or: [
          { email },
          { googleId }
        ]
      });

      if (user) {
        // Update user's Google ID if not set
        if (!user.googleId) {
          user.googleId = googleId;
          await user.save();
        }
        
        // Update last login
        user.lastLogin = new Date();
        await user.save();
      } else {
        // Create new user
        user = new User({
          email,
          name: name || email.split('@')[0],
          googleId,
          avatar: picture,
          password: 'google-oauth', // Placeholder - won't be used
          role: 'DEVELOPER',
          projects: [],
          preferences: {
            theme: 'dark',
            notifications: true,
            autoRefresh: true,
            dashboardLayout: 'detailed',
            defaultTimeRange: '24h'
          },
          lastLogin: new Date(),
        });

        await user.save();
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '7d' }
      );

      logger.info(`Google OAuth sign-in: ${email}`);

      res.json({
        message: 'Google sign-in successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          projects: user.projects,
          preferences: user.preferences,
          gitlabSettings: user.gitlabSettings,
          lastLogin: user.lastLogin,
        },
      });
    } catch (error) {
      logger.error('Google OAuth error:', error);
      res.status(500).json({ error: 'Google sign-in failed' });
    }
  }
);

export default router;
