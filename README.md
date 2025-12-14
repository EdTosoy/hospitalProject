# Hospital Management System

A full-stack hospital management application built with NestJS and Next.js.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | NestJS, Prisma 7, PostgreSQL |
| **Frontend** | Next.js 15, React, TypeScript |
| **Database** | Supabase (PostgreSQL) |
| **Deployment** | Docker, Coolify, DockerHub |
| **CI/CD** | GitHub Actions |

## Project Structure

```
hospital_project/
├── apps/
│   ├── backend/          # NestJS API
│   └── frontend/         # Next.js App
├── packages/
│   ├── shared/           # Shared types/utils
│   └── ui/               # Shared UI components
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
└── .github/workflows/    # CI/CD
```

## Development

### Prerequisites
- Node.js 20+
- pnpm
- Docker (optional, for local containers)

### Setup

```bash
# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET

# Generate Prisma client
cd apps/backend && npx prisma generate

# Run migrations (if needed)
npx prisma migrate dev

# Start development servers
pnpm dev
```

### Running Services

```bash
# All services (from root)
pnpm dev

# Backend only
pnpm --filter backend dev

# Frontend only
pnpm --filter frontend dev
```

## API Documentation

Swagger UI available at: `http://localhost:8080/api`

## Deployment

### Manual Deploy

```bash
# Build and push backend
docker build --platform linux/amd64 --no-cache \
  --build-arg DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hospital" \
  -f Dockerfile.backend -t edtosoy/hospital-backend:latest .
docker push edtosoy/hospital-backend:latest

# Build and push frontend
docker build --platform linux/amd64 --no-cache \
  --build-arg NEXT_PUBLIC_API_URL=https://your-backend-url.com \
  -f Dockerfile.frontend -t edtosoy/hospital-frontend:latest .
docker push edtosoy/hospital-frontend:latest
```

### CI/CD (GitHub Actions)

Push to `main` branch triggers automatic build and push to DockerHub.

**Required GitHub Secrets:**
| Secret | Description |
|--------|-------------|
| `DOCKERHUB_TOKEN` | DockerHub access token |
| `NEXT_PUBLIC_API_URL` | Production backend URL |

### Coolify

**Environment Variables:**
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `CORS_ORIGIN` | Frontend URL for CORS |

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `POST /auth/register` | Register user |
| `POST /auth/login` | Login |
| `GET /patients` | List patients |
| `GET /appointments` | List appointments |
| `GET /queue` | Queue management |
| `GET /billing` | Billing records |

## License

MIT
