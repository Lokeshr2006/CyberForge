import { Injectable, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '../config/config.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto, RefreshTokenDto } from './dto';
import { User, RefreshToken } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  /**
   * User login: validate credentials and return JWT + refresh token
   */
  async login(
    loginDto: LoginDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.active) {
      // Security: log without revealing whether email exists
      await this.auditService.logEvent({
        eventType: 'AUTH_LOGIN_FAILURE',
        userId: null,
        message: `Login failure for email: ${email} (invalid credentials)`,
        ipAddress,
        userAgent,
        severity: 'WARNING',
      });

      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    try {
      const isPasswordValid = await argon2.verify(user.passwordHash, password);

      if (!isPasswordValid) {
        // Increment login failure counter
        user.loginFailureCount = (user.loginFailureCount || 0) + 1;
        user.lastLoginFailureAt = new Date();

        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            loginFailureCount: user.loginFailureCount,
            lastLoginFailureAt: user.lastLoginFailureAt,
          },
        });

        // Detect brute force
        if (user.loginFailureCount > 5) {
          await this.auditService.logEvent({
            eventType: 'SUSPICIOUS_ACTIVITY_DETECTED',
            userId: user.id,
            message: `Brute force detected: ${user.loginFailureCount} failed attempts`,
            ipAddress,
            severity: 'ERROR',
          });
        }

        await this.auditService.logEvent({
          eventType: 'AUTH_LOGIN_FAILURE',
          userId: user.id,
          message: 'Login failure: invalid password',
          ipAddress,
          userAgent,
          severity: 'WARNING',
        });

        throw new UnauthorizedException('Invalid email or password');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Password verification error: ${error.message}`);
      throw new UnauthorizedException('Authentication failed');
    }

    // Reset failure counter on successful login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        loginFailureCount: 0,
        lastLoginAt: new Date(),
      },
    });

    // Generate tokens
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    await this.auditService.logEvent({
      eventType: 'AUTH_LOGIN_SUCCESS',
      userId: user.id,
      message: `Login successful for ${user.email}`,
      ipAddress,
      userAgent,
      severity: 'INFO',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get('JWT_EXPIRATION'),
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(
    refreshTokenDto: RefreshTokenDto,
    ipAddress: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const { refreshToken } = refreshTokenDto;

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('REFRESH_TOKEN_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Verify refresh token in DB (check against stored hash + jti)
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { jti: payload.jti },
    });

    if (!storedToken) {
      // Token JTI not found - possible token reuse attack
      await this.auditService.logEvent({
        eventType: 'AUTH_REFRESH_TOKEN_REUSED',
        userId: user.id,
        message: `Token reuse detected for JTI: ${payload.jti}`,
        ipAddress,
        severity: 'ERROR',
      });

      // Revoke all refresh tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId: user.id },
        data: { revokedAt: new Date() },
      });

      throw new UnauthorizedException(
        'Token revoked. Please login again. Possible security breach detected.',
      );
    }

    if (storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    // Hash the provided refresh token and verify it matches stored hash
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const storedHash = storedToken.token;

    if (tokenHash !== storedHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { jti: payload.jti },
      data: { revokedAt: new Date() },
    });

    // Issue new tokens
    const newAccessToken = await this.generateAccessToken(user);
    const newRefreshToken = await this.generateRefreshToken(user);

    await this.auditService.logEvent({
      eventType: 'AUTH_REFRESH_TOKEN_ISSUED',
      userId: user.id,
      message: 'Refresh token rotated',
      ipAddress,
      severity: 'INFO',
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: this.configService.get('JWT_EXPIRATION'),
    };
  }

  /**
   * Logout: revoke refresh token
   */
  async logout(userId: string, refreshToken: string): Promise<void> {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('REFRESH_TOKEN_SECRET'),
      });
    } catch (error) {
      // Token invalid or expired - still allow logout
      return;
    }

    await this.prisma.refreshToken.updateMany({
      where: { userId, jti: payload.jti },
      data: { revokedAt: new Date() },
    });

    await this.auditService.logEvent({
      eventType: 'AUTH_LOGOUT',
      userId,
      message: 'User logged out',
      severity: 'INFO',
    });
  }

  /**
   * Generate short-lived JWT access token
   */
  private async generateAccessToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      aud: 'cyberforge-api',
      iss: 'cyberforge-auth',
    };

    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRATION'),
    });
  }

  /**
   * Generate longer-lived refresh token with jti for revocation
   */
  private async generateRefreshToken(user: User): Promise<string> {
    const jti = crypto.randomUUID();
    const payload = {
      sub: user.id,
      jti,
      type: 'refresh',
      aud: 'cyberforge-api',
      iss: 'cyberforge-auth',
    };

    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('REFRESH_TOKEN_SECRET'),
      expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRATION'),
    });

    // Hash and store refresh token in DB
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date();
    expiresAt.setSeconds(
      expiresAt.getSeconds() + this.configService.get('REFRESH_TOKEN_EXPIRATION'),
    );

    await this.prisma.refreshToken.create({
      data: {
        jti,
        token: tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Validate JWT token payload
   */
  async validateTokenPayload(payload: any): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Verify token audience and issuer
    if (payload.aud !== 'cyberforge-api' || payload.iss !== 'cyberforge-auth') {
      throw new UnauthorizedException('Invalid token claims');
    }

    return user;
  }
}
