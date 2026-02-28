# Node.js + Express Tech Preset

> Preset de arquitetura para APIs e backends com Node.js, Express e TypeScript.

---

## Metadata

```yaml
preset:
  id: node-express
  name: 'Node.js + Express Backend Preset'
  version: 1.0.0
  description: 'Arquitetura para APIs REST com Express, TypeScript, Prisma e padroes de qualidade para produção'
  technologies:
    - Node.js 20+
    - Express 4.x
    - TypeScript 5+
    - Prisma (ORM)
    - Zod (validation)
    - PostgreSQL
    - Vitest
    - ESLint
  suitable_for:
    - 'APIs REST'
    - 'Backend para aplicações web'
    - 'Microserviços Node.js'
    - 'APIs com WebSockets'
    - 'BFF (Backend for Frontend)'
  not_suitable_for:
    - 'Aplicações fullstack com SSR (use Next.js preset)'
    - 'CLI tools (use node puro)'
    - 'Projetos que precisam de GraphQL first (use Apollo Server)'
```

---

## Design Patterns

### Pattern 1: Controller-Service-Repository

**Purpose:** Separação clara de responsabilidades em 3 camadas

```typescript
// src/controllers/user.controller.ts
import { Request, Response } from 'express'
import { UserService } from '@/services/user.service'

export class UserController {
  constructor(private userService: UserService) {}

  async getById(req: Request, res: Response) {
    const user = await this.userService.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'Not found' })
    return res.json(user)
  }
}

// src/services/user.service.ts
import { UserRepository } from '@/repositories/user.repository'

export class UserService {
  constructor(private repo: UserRepository) {}

  async findById(id: string) {
    return this.repo.findUnique(id)
  }
}

// src/repositories/user.repository.ts
import { PrismaClient } from '@prisma/client'

export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findUnique(id: string) {
    return this.prisma.user.findUnique({ where: { id } })
  }
}
```

### Pattern 2: Middleware Chain

**Purpose:** Composição de funcionalidades cross-cutting

```typescript
// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express'

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  try {
    req.user = verifyToken(token)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
```

### Pattern 3: Zod Validation Middleware

**Purpose:** Validação de input type-safe e automática

```typescript
// src/middleware/validate.middleware.ts
import { z, ZodSchema } from 'zod'
import { Request, Response, NextFunction } from 'express'

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten(),
      })
    }
    req.body = result.data
    next()
  }
}
```

---

## Project Structure

```
/project-root
  /src
    /controllers      # Request handlers
    /services          # Business logic
    /repositories      # Data access (Prisma)
    /middleware         # Auth, validation, error handling
    /routes            # Express route definitions
    /schemas           # Zod validation schemas
    /utils             # Helpers
    /types             # TypeScript type definitions
    app.ts             # Express app setup
    server.ts          # Server entry point
  /prisma
    schema.prisma      # Database schema
    /migrations        # Prisma migrations
  /tests
    /unit              # Unit tests
    /integration       # Integration tests
  tsconfig.json
  package.json
  .env.example
```

---

## Tech Stack

| Category         | Technology  | Version | Purpose               |
| ---------------- | ----------- | ------- | --------------------- |
| Runtime          | Node.js     | ^20     | JavaScript runtime    |
| Framework        | Express     | ^4.18   | Web framework         |
| Language         | TypeScript  | ^5.3    | Type safety           |
| ORM              | Prisma      | ^5.10   | Database ORM          |
| Validation       | Zod         | ^3.22   | Schema validation     |
| Testing          | Vitest      | ^1.3    | Test framework        |
| Linting          | ESLint      | ^8.56   | Code linting          |
| Build            | tsx         | ^4.7    | TypeScript execution  |

---

## Coding Standards

### Naming Conventions

| Element     | Convention        | Example              |
| ----------- | ----------------- | -------------------- |
| Files       | kebab-case        | `user-service.ts`    |
| Classes     | PascalCase        | `UserService`        |
| Functions   | camelCase         | `getUserById`        |
| Constants   | SCREAMING_SNAKE   | `MAX_RETRIES`        |
| Interfaces  | PascalCase        | `UserResponse`       |
| Routes      | kebab-case plural | `/api/v1/users`      |

### Critical Rules

1. **Imports absolutos** — Configure path aliases (`@/`) no tsconfig
2. **Zod para todo input** — Nunca confie em `req.body` sem validação
3. **Error handling centralizado** — Use error middleware, nunca try/catch no controller
4. **Prisma transactions** — Use `$transaction` para operações multi-tabela

### Error Handling

```typescript
// src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message })
  }
  console.error(err)
  return res.status(500).json({ error: 'Internal server error' })
}
```

---

## Testing Strategy

### What to Test

#### Always Test
- Controllers (status codes, response format)
- Services (business rules, edge cases)
- Middleware (auth, validation)

#### Consider Testing
- Repository queries (with test database)
- Integration flows (auth → action → response)

### Test Commands

```bash
npm test                    # Run all tests
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests
npm run test:coverage       # Coverage report
npm run lint                # ESLint
npx tsc --noEmit            # Type check
```

---

## Quality Gates

```bash
npm run lint            # Zero lint errors
npx tsc --noEmit        # Zero type errors
npm test                # All tests pass
```

---

## Integration with AIOS

### Recommended Workflow

1. **Planning Phase:** Use `@architect` with this preset
2. **Database Phase:** Use `@data-engineer` or `@db-sage` for schema
3. **Development Phase:** Use `@dev` following these patterns
4. **QA Phase:** Use `@qa` with the testing strategy defined

---

_AIOS Tech Preset - Node.js + Express v1.0.0_
