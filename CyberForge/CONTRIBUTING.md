name: Contribution Guidelines

## Welcome to CyberForge!

We're thrilled you want to contribute. This document outlines our process and expectations.

## Code of Conduct

- Be respectful and inclusive
- Assume good intent
- Focus on the code, not the person
- Report issues to: conduct@cyberforge.local

## Getting Started

### 1. Fork and Clone

```bash
git clone https://github.com/YOUR_USERNAME/cyberforge.git
cd cyberforge
git remote add upstream https://github.com/cyberforge/cyberforge.git
```

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 3. Setup Development Environment

```bash
npm install
cd apps/api && npm install && cd ../..
cd apps/web && npm install && cd ../..

# Start services
docker compose up --build

# Run migrations
docker compose exec api npx prisma migrate dev

# Seed database
docker compose exec api npm run seed
```

## Development Workflow

### Code Style

We use **ESLint** and **Prettier** for code formatting.

```bash
# Format code
npm run format

# Check linting
npm run lint

# Type check
npm run type-check
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body

footer
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

**Examples**:
```
feat(auth): add MFA support
fix(api): prevent SQL injection in sensor readings
docs(deployment): add Kubernetes guide
```

### Testing

All new features must include tests.

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:cov

# Run specific test file
npm run test -- src/auth/auth.service.spec.ts
```

**Test Naming**:
- `feature.service.spec.ts` for unit tests
- `feature.integration.spec.ts` for integration tests

**Test Structure**:
```typescript
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AuthService, /* dependencies */],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should return access and refresh tokens', async () => {
      const result = await service.login(/* args */);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw error on invalid credentials', async () => {
      await expect(service.login(/* invalid args */)).rejects.toThrow();
    });
  });
});
```

## Pull Request Process

### 1. Commit Your Changes

```bash
git add .
git commit -m "feat(feature): description"
```

### 2. Keep Branch Updated

```bash
git fetch upstream
git rebase upstream/main
```

### 3. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 4. Open Pull Request

- Fill in the PR template completely
- Link any related issues: `Closes #123`
- Ensure CI/CD passes (all checks must be green)

**PR Title**: Follow commit message format (e.g., `feat: add alert webhooks`)

**PR Description Template**:
```markdown
## Description
Brief description of what this PR does.

## Related Issues
Closes #123

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe how you tested this change:
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Manual testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Comments added for complex logic
- [ ] Tests pass locally
- [ ] No console.log statements left
- [ ] Documentation updated (if needed)
```

### 5. Code Review

- Address feedback promptly
- Request review from maintainers
- Be open to suggestions

### 6. Merge

Once approved, a maintainer will merge your PR.

## Development Guidelines

### Backend (NestJS)

**File Structure**:
```
src/
├── feature-name/
│   ├── feature-name.controller.ts       # API routes
│   ├── feature-name.service.ts          # Business logic
│   ├── feature-name.module.ts           # NestJS module
│   ├── dto/
│   │   ├── create-feature.dto.ts
│   │   ├── update-feature.dto.ts
│   │   └── query-feature.dto.ts
│   ├── entities/
│   │   └── feature.entity.ts            # Type definitions
│   └── feature-name.spec.ts             # Tests
```

**Best Practices**:
- Keep controllers thin; move logic to services
- Use DTOs for validation
- Always validate inputs with Zod or class-validator
- Return typed responses
- Handle errors in a global exception filter
- Log security events to audit service

**Example Service**:
```typescript
@Injectable()
export class FeatureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateFeatureDto, userId: string) {
    // Validate input
    const validated = CreateFeatureSchema.parse(dto);

    // Business logic
    const feature = await this.prisma.feature.create({
      data: {
        ...validated,
        createdBy: userId,
      },
    });

    // Log event
    await this.auditService.logEvent({
      eventType: 'FEATURE_CREATED',
      userId,
      resourceType: 'feature',
      resourceId: feature.id,
      changes: { created: feature },
    });

    return feature;
  }
}
```

### Frontend (Next.js)

**File Structure**:
```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── logout/
│   │       └── page.tsx
│   └── dashboard/
│       ├── layout.tsx
│       └── page.tsx
├── components/
│   ├── Header.tsx              # Reusable components
│   ├── Navigation.tsx
│   └── forms/
│       └── LoginForm.tsx
├── lib/
│   ├── api.ts                  # API client
│   ├── socket.ts               # WebSocket client
│   ├── store.ts                # Zustand stores
│   └── utils.ts                # Helpers
└── styles/
    └── globals.css             # Global styles
```

**Best Practices**:
- Use functional components with hooks
- Implement error boundaries for sections
- Cache API responses with React Query
- Use Zustand for global state (not localStorage)
- Prefer composition over inheritance
- Keep components small (<300 lines)

**Example Component**:
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { apiClient } from '@/lib/api';

export function LoginForm() {
  const router = useRouter();
  const { setUser, setTokens } = useAuthStore();
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    try {
      const response = await apiClient.login({
        email: e.currentTarget.email.value,
        password: e.currentTarget.password.value,
      });

      setTokens(response.accessToken, response.refreshToken);
      setUser(response.user);
      router.push('/dashboard');
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

## Security Considerations

### For Contributors

- **Never commit secrets**: Use `.env.example` for defaults
- **Validate all inputs**: Use Zod or class-validator
- **Sanitize logs**: Never log passwords, tokens, or PII
- **Use HTTPS**: All external requests must use HTTPS
- **Rate limit endpoints**: Especially auth and ingestion endpoints
- **Audit changes**: Log all data modifications
- **Test edge cases**: Including malformed inputs

### Security Review

High-impact PRs require security review:
- Authentication changes
- Authorization changes
- Encryption logic
- API endpoints handling sensitive data
- Database schema changes
- Dependency updates with security patches

Request review from: `@security-team` in PR comments

## Documentation

### When to Document

- New features
- Breaking changes
- API endpoints (auto-generated from Swagger, but add examples)
- Architecture decisions (add to `/docs`)
- Complex algorithms

### Documentation Format

**Code Comments** (for why, not what):
```typescript
// Brute-force protection: limit login attempts to prevent credential guessing
const maxFailures = 5;
if (user.loginFailureCount >= maxFailures) {
  throw new ForbiddenException('Too many failed attempts. Contact admin.');
}
```

**README** (for getting started):
```markdown
## Installation

```bash
npm install
```

## Usage

See [docs/USAGE.md](docs/USAGE.md) for detailed examples.
```

**API Docs** (auto-generated via Swagger):
```typescript
@Post('login')
@ApiOperation({ summary: 'User login' })
@ApiResponse({
  status: 200,
  description: 'Login successful',
  schema: { properties: { accessToken: { type: 'string' } } },
})
async login(@Body() dto: LoginDto) {
  // ...
}
```

## Performance & Optimization

### Database Queries

```typescript
// ❌ N+1 query problem
const users = await prisma.user.findMany();
for (const user of users) {
  const sites = await prisma.site.findMany({ where: { createdById: user.id } });
}

// ✅ Optimized with include
const users = await prisma.user.findMany({
  include: { sites: true },
});
```

### Caching

```typescript
@Cacheable({ ttl: 300 })
async getSensorReadings(sensorId: string) {
  return this.prisma.sensorReading.findMany({
    where: { sensorId },
  });
}
```

### Pagination

```typescript
// Limit results to prevent memory exhaustion
const readings = await prisma.sensorReading.findMany({
  where: { sensorId },
  take: 1000,      // Limit to 1000 records
  skip: offset,
  orderBy: { timestamp: 'desc' },
});
```

## Debugging

### Backend

```bash
# Run with debug logging
DEBUG=* npm run dev

# Attach debugger (Chrome DevTools)
node --inspect-brk dist/main.js

# View database state
docker compose exec db psql -U cyberforge cyberforge
```

### Frontend

```bash
# Open DevTools
F12 or Cmd+Option+I

# View API calls
Network tab

# Check state
console.log(useAuthStore.getState())

# React DevTools extension
# https://react-devtools-tutorial.vercel.app/
```

## Reporting Issues

### Security Issues

**DO NOT** open public issues for security vulnerabilities.

Email: security@cyberforge.local

Include:
- Vulnerability description
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

### Bug Reports

Use the GitHub issue template:

```markdown
**Describe the bug**
What went wrong?

**Steps to reproduce**
1. Go to...
2. Click...
3. Observe error

**Expected behavior**
What should happen instead?

**Environment**
- OS: [e.g., macOS, Ubuntu]
- Browser: [e.g., Chrome, Firefox]
- Node version: [e.g., 20.0.0]

**Logs & Screenshots**
Paste relevant logs or screenshots
```

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes (e.g., API schema changes)
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Release Checklist

- [ ] Update `package.json` version
- [ ] Update `CHANGELOG.md`
- [ ] Ensure all tests pass
- [ ] Create GitHub release with tag `v1.2.3`
- [ ] Build and push Docker images
- [ ] Deploy to staging
- [ ] Smoke test staging
- [ ] Deploy to production
- [ ] Post-deployment verification

## Community

- **GitHub Discussions**: For questions and ideas
- **GitHub Issues**: For bugs and features
- **Slack**: Join our [Slack workspace](https://cyberforge.slack.com)
- **Discord**: Join our [Discord server](https://discord.gg/cyberforge)

## Help & Support

- **Documentation**: https://docs.cyberforge.local
- **FAQ**: https://github.com/cyberforge/cyberforge/discussions/categories/q-a
- **Email**: support@cyberforge.local

## License

By contributing, you agree that your contributions will be licensed under the **MIT License**.

---

Thank you for contributing to CyberForge! 🙏
