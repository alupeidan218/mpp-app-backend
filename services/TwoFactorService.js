const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

class TwoFactorService {
  static async generateSecret(user) {
    const secret = speakeasy.generateSecret({
      name: `CPU Benchmark:${user.email}`
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode
    };
  }

  static verifyToken(secret, token) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 1 // Allow 30 seconds clock skew
    });
  }

  static async enable2FA(user, token) {
    if (!user.twoFactorSecret) {
      throw new Error('2FA secret not generated');
    }

    const isValid = this.verifyToken(user.twoFactorSecret, token);
    if (!isValid) {
      throw new Error('Invalid 2FA token');
    }

    user.twoFactorEnabled = true;
    user.twoFactorVerified = true;
    await user.save();

    return true;
  }

  static async disable2FA(user, token) {
    if (!user.twoFactorEnabled) {
      throw new Error('2FA is not enabled');
    }

    const isValid = this.verifyToken(user.twoFactorSecret, token);
    if (!isValid) {
      throw new Error('Invalid 2FA token');
    }

    user.twoFactorEnabled = false;
    user.twoFactorVerified = false;
    user.twoFactorSecret = null;
    await user.save();

    return true;
  }

  static async verify2FA(user, token) {
    if (!user.twoFactorEnabled) {
      return true; // Skip 2FA if not enabled
    }

    const isValid = this.verifyToken(user.twoFactorSecret, token);
    if (!isValid) {
      throw new Error('Invalid 2FA token');
    }

    return true;
  }
}

module.exports = TwoFactorService; 