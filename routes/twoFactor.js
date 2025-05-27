const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const TwoFactorService = require('../services/TwoFactorService');
const { User } = require('../models');

// Generate 2FA secret and QR code
router.post('/setup', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { secret, qrCode } = await TwoFactorService.generateSecret(user);
    
    // Save the secret but don't enable 2FA yet
    user.twoFactorSecret = secret;
    await user.save();

    res.json({ secret, qrCode });
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

// Enable 2FA
router.post('/enable', [
  authenticateToken,
  body('token').isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await TwoFactorService.enable2FA(user, req.body.token);
    res.json({ message: '2FA enabled successfully' });
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    res.status(400).json({ error: error.message });
  }
});

// Disable 2FA
router.post('/disable', [
  authenticateToken,
  body('token').isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await TwoFactorService.disable2FA(user, req.body.token);
    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(400).json({ error: error.message });
  }
});

// Verify 2FA token
router.post('/verify', [
  body('token').isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await TwoFactorService.verify2FA(user, req.body.token);
    res.json({ message: '2FA token verified successfully' });
  } catch (error) {
    console.error('Error verifying 2FA token:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router; 