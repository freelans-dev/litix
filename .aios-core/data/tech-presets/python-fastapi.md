# Python + FastAPI Tech Preset

> Preset de arquitetura para APIs e backends com Python, FastAPI e SQLAlchemy.

---

## Metadata

```yaml
preset:
  id: python-fastapi
  name: 'Python + FastAPI Backend Preset'
  version: 1.0.0
  description: 'Arquitetura para APIs REST/GraphQL com FastAPI, SQLAlchemy, Pydantic e padroes de qualidade para produção'
  technologies:
    - Python 3.11+
    - FastAPI
    - SQLAlchemy 2.0 (async)
    - Pydantic v2
    - Alembic (migrations)
    - PostgreSQL
    - pytest
    - Ruff (linting)
  suitable_for:
    - 'APIs REST e GraphQL'
    - 'Microservicos'
    - 'Backend para SaaS'
    - 'Sistemas de processamento de dados'
    - 'Integrações com serviços externos'
  not_suitable_for:
    - 'Aplicações frontend (use Next.js)'
    - 'Scripts simples de automação'
    - 'Machine Learning notebooks (use Jupyter)'
```

---

## Design Patterns

### Pattern 1: Repository Pattern

**Purpose:** Separar lógica de acesso a dados da lógica de negócio

```python
# src/repositories/user_repository.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.models.user import User

class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: int) -> User | None:
        result = await self.session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def create(self, **kwargs) -> User:
        user = User(**kwargs)
        self.session.add(user)
        await self.session.flush()
        return user
```

### Pattern 2: Service Layer

**Purpose:** Encapsular regras de negócio em serviços testáveis

```python
# src/services/user_service.py
from src.repositories.user_repository import UserRepository
from src.schemas.user import UserCreate, UserResponse

class UserService:
    def __init__(self, repo: UserRepository):
        self.repo = repo

    async def create_user(self, data: UserCreate) -> UserResponse:
        user = await self.repo.create(**data.model_dump())
        return UserResponse.model_validate(user)
```

### Pattern 3: Dependency Injection via FastAPI

**Purpose:** Injeção de dependências automática e testável

```python
# src/dependencies.py
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.database import get_session
from src.repositories.user_repository import UserRepository
from src.services.user_service import UserService

async def get_user_service(
    session: AsyncSession = Depends(get_session),
) -> UserService:
    repo = UserRepository(session)
    return UserService(repo)
```

---

## Project Structure

```
/project-root
  /src
    /api              # Routers/endpoints FastAPI
      /v1             # Versionamento de API
    /core             # Config, security, database
    /models           # SQLAlchemy models
    /schemas          # Pydantic schemas (request/response)
    /services         # Business logic
    /repositories     # Data access layer
    /utils            # Helpers e utilidades
  /migrations         # Alembic migrations
  /tests
    /unit             # Unit tests
    /integration      # Integration tests
    /fixtures         # Test fixtures
  pyproject.toml      # Project config (ruff, pytest, etc.)
  requirements.txt    # Dependencies
  .env.example        # Environment template
```

---

## Tech Stack

| Category         | Technology     | Version | Purpose               |
| ---------------- | -------------- | ------- | --------------------- |
| Framework        | FastAPI        | ^0.110  | Web framework async   |
| ORM              | SQLAlchemy     | ^2.0    | Database ORM async    |
| Validation       | Pydantic       | ^2.0    | Data validation       |
| Migrations       | Alembic        | ^1.13   | DB schema migrations  |
| Testing          | pytest         | ^8.0    | Test framework        |
| Testing (async)  | pytest-asyncio | ^0.23   | Async test support    |
| Linting          | Ruff           | ^0.3    | Fast Python linter    |
| Type Checking    | mypy           | ^1.8    | Static type checking  |
| Server           | Uvicorn        | ^0.27   | ASGI server           |

---

## Coding Standards

### Naming Conventions

| Element     | Convention   | Example              |
| ----------- | ------------ | -------------------- |
| Files       | snake_case   | `user_service.py`    |
| Classes     | PascalCase   | `UserService`        |
| Functions   | snake_case   | `get_user_by_id`     |
| Constants   | UPPER_SNAKE  | `MAX_RETRIES`        |
| Variables   | snake_case   | `current_user`       |

### Critical Rules

1. **Sempre use type hints** — FastAPI depende deles para validação automática
2. **Pydantic para todo I/O** — Nunca retorne dicts raw de endpoints
3. **Async por padrão** — Use `async def` para handlers e DB operations
4. **Repository pattern obrigatório** — Nunca acesse DB diretamente no router

---

## Testing Strategy

### What to Test

#### Always Test
- Endpoints (status codes, response shapes, edge cases)
- Services (business logic, validations)
- Repositories (queries, constraints)

#### Consider Testing
- Middleware behavior
- Authentication/authorization flows
- Database migrations (up/down)

### Test Commands

```bash
pytest                           # Run all tests
pytest tests/unit                # Unit tests only
pytest tests/integration         # Integration tests
pytest --cov=src --cov-report=html  # Coverage report
ruff check src                   # Lint
mypy src                         # Type check
```

---

## Quality Gates

```bash
ruff check src           # Zero lint errors
mypy src --strict        # Zero type errors
pytest                   # All tests pass
```

---

## Integration with AIOS

### Recommended Workflow

1. **Planning Phase:** Use `@architect` with this preset
2. **Database Phase:** Use `@db-sage` for schema design and migrations
3. **Development Phase:** Use `@dev` following these patterns
4. **QA Phase:** Use `@qa` with the testing strategy defined

---

_AIOS Tech Preset - Python + FastAPI v1.0.0_
