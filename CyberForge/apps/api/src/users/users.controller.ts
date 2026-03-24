import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RoleGuard } from '../common/guards/role.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Users')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiBearerAuth()
@Controller('api/v1/users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all users (admin only)' })
  async getUsers(@Request() req) {
    return this.usersService.getAllUsers(req.user.id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SECURITY_ANALYST)
  @ApiOperation({ summary: 'Get user by ID' })
  async getUser(@Param('id') userId: string) {
    return this.usersService.getUserById(userId);
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user role (admin only)' })
  async changeRole(
    @Param('id') userId: string,
    @Body() body: { role: UserRole },
    @Request() req,
  ) {
    return this.usersService.changeUserRole(userId, body.role, req.user.id);
  }

  @Patch(':id/disable')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable user account' })
  async disableUser(@Param('id') userId: string, @Request() req) {
    return this.usersService.disableUser(userId, req.user.id);
  }

  @Patch(':id/reset-failures')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset login failures for user' })
  async resetFailures(@Param('id') userId: string) {
    return this.usersService.resetLoginFailures(userId);
  }
}
