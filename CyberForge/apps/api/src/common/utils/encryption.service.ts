import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '../../config/config.service';

/**
 * Envelope encryption utility for sensitive fields
 * Uses AES-256-GCM with a master key from environment
 * 
 * Usage:
 *   const encrypted = encryption.encrypt('secret-data')
 *   const decrypted = encryption.decrypt(encrypted)
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';

  constructor(private configService: ConfigService) {}

  /**
   * Encrypt data using AES-256-GCM
   * Returns: Base64-encoded string of iv:ciphertext:authTag
   */
  encrypt(plaintext: string): string {
    const masterKey = Buffer.from(
      this.configService.get('DATA_KEY_ENCRYPTION_KEY'),
      'base64',
    );

    if (masterKey.length !== 32) {
      throw new Error('Master key must be 32 bytes (256 bits)');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, masterKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:ciphertext:authTag (all hex-encoded)
    const combined = `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
    return Buffer.from(combined).toString('base64');
  }

  /**
   * Decrypt data encrypted with encrypt()
   */
  decrypt(encryptedData: string): string {
    const masterKey = Buffer.from(
      this.configService.get('DATA_KEY_ENCRYPTION_KEY'),
      'base64',
    );

    const combined = Buffer.from(encryptedData, 'base64').toString();
    const [ivHex, ciphertextHex, authTagHex] = combined.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, masterKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Hash a string (for passwords, tokens, etc.)
   */
  hash(plaintext: string): string {
    return crypto.createHash('sha256').update(plaintext).digest('hex');
  }

  /**
   * Generate a random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}
