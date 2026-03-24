import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Get all users (admin only)
   */
  async getAllUsers(requestingUserId: string) {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        lastLoginAt: true,
        loginFailureCount: true,
        createdAt: true,
      },
    });
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        mfaEnabled: true,
        lastLoginAt: true,
        lastLoginFailureAt: true,
        loginFailureCount: true,
        passwordChangedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return user;
  }

  /**
   * Change user role (admin only)
   */
  async changeUserRole(
    userId: string,
    newRole: UserRole,
    requestingUserId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const oldRole = user.role;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    // Log privilege change
    await this.auditService.logEvent({
      eventType: 'USER_ROLE_CHANGED',
      userId: requestingUserId,
      resourceType: 'User',
      resourceId: userId,
      message: `Role changed from ${oldRole} to ${newRole} for user ${user.email}`,
      changes: JSON.stringify({ before: { role: oldRole }, after: { role: newRole } }),
      severity: 'WARNING',
    });

    return updated;
  }

  /**
   * Disable user account
   */
  async disableUser(userId: string, requestingUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { active: false },
    });

    await this.auditService.logEvent({
      eventType: 'USER_UPDATED',
      userId: requestingUserId,
      resourceType: 'User',
      resourceId: userId,
      message: `User account disabled: ${user.email}`,
      severity: 'WARNING',
    });

    return { id: updated.id, email: updated.email, active: updated.active };
  }

  /**
   * Reset user login failures
   */
  async resetLoginFailures(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        loginFailureCount: 0,
        lastLoginFailureAt: null,
      },
    });
  }

  /**
   * Create user (internal use for seeding)
   */
  async createUser(
    email: string,
    password: string,
    role: UserRole,
    firstName?: string,
    lastName?: string,
  ) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException(`User with email ${email} already exists`);
    }

    // Hash password
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64MB
      timeCost: 3,
      parallelism: 1,
    });

    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        firstName,
        lastName,
      },
    });
  }
}
