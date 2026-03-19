# noveu-product-registry

Product registry microservice for Noveu Solutions. Manages the product catalog, release versioning, build artifact distribution, and GitHub release integration for all Noveu products (WordPress plugins, desktop apps, mobile apps, web tools).

## Tech Stack

- **Runtime**: Node.js 20 (Alpine Docker image)
- **Framework**: NestJS 11
- **Database**: PostgreSQL (via TypeORM, schema: `product_registry`)
- **Auth**: Forwarded gateway headers (`X-User-Id`, `X-User-Role`) + service-to-service API key
- **Rate limiting**: `@nestjs/throttler`
- **API docs**: Swagger (`/api/docs`, non-production only)
- **Security**: Helmet, timing-safe API key comparison
- **Language**: TypeScript 5.7
- **GitHub Integration**: GitHub Releases API for artifact sourcing

## How to Run

```bash
# Install dependencies
npm install --legacy-peer-deps

# Development (watch mode)
npm run start:dev

# Production build
npm run build && npm run start:prod

# Tests
npm test
npm run test:cov

# Migrations
npm run migration:run
npm run migration:generate
```

**Required env vars** (see `.env.example`):
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `SERVICE_API_KEY`

**Optional**: `GITHUB_PAT` (GitHub release downloads), `LICENSE_SERVICE_URL` (license tier checks)

Default port: **4013** (configurable via `PORT`).
Global prefix: `/api/v1` (except `/health`).

## Architecture

### Controllers (all under `/api/v1/`)

| Controller | Prefix | Purpose |
|---|---|---|
| `HealthController` | `/health` | Health, readiness, liveness checks |
| *(Products - planned)* | `/products` | Product catalog CRUD |
| *(Releases - planned)* | `/releases` | Release version management |
| *(Artifacts - planned)* | `/artifacts` | Build artifact management |
| *(Downloads - planned)* | `/downloads` | Authenticated artifact downloads |
| *(Admin - planned)* | `/admin` | Admin-only operations |

### Key Services

- **GitHubService** (`github/github.service.ts`) -- Generic GitHub Releases client. Takes repo as parameter, fetches latest releases, streams asset downloads. Uses `GITHUB_PAT` env var.
- **HealthService** (`health/health.service.ts`) -- Service health monitoring with DB ping, memory, and uptime checks.

### Entities (DB tables)

| Entity | Table | Purpose |
|---|---|---|
| `Product` | `products` | Product catalog with slug, distribution type, visibility, license tier |
| `Release` | `releases` | Versioned releases per product with channel (stable/beta/alpha), status, source type |
| `Artifact` | `artifacts` | Build artifacts per release with platform, architecture, file metadata, download tracking |

### Distribution Types

- `wordpress_plugin` -- WordPress plugin (.zip)
- `desktop_app` -- Desktop application (Windows/macOS/Linux)
- `mobile_app` -- Mobile application (Android/iOS)
- `web_tool` -- Web-based tool (universal)

### Source Types (where release artifacts come from)

- `github` -- GitHub Releases (via GitHub API + PAT)
- `minio` -- Self-hosted MinIO object storage
- `external_url` -- External URL (third-party CDN)

### Guards

- **AuthGuard** -- Checks forwarded gateway headers (`X-User-Id`) and sets `req.user`
- **InternalServiceGuard** -- Service-to-service auth via `X-Service-Api-Key` (timing-safe comparison)
- **RolesGuard** -- Role-based access control via `@Roles()` decorator

### Env Vars

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Service port (default: 4013) |
| `DB_HOST` | Yes | PostgreSQL host |
| `DB_PORT` | Yes | PostgreSQL port |
| `DB_NAME` | Yes | Database name |
| `DB_USER` | Yes | Database user |
| `DB_PASSWORD` | Yes | Database password |
| `DB_SCHEMA` | No | Schema name (default: product_registry) |
| `JWT_SECRET` | Yes | JWT signing secret |
| `SERVICE_API_KEY` | Yes | Service-to-service API key |
| `GITHUB_PAT` | No | GitHub Personal Access Token for release downloads |
| `LICENSE_SERVICE_URL` | No | URL of the license service for tier checks |

## Key Design Decisions

- **Generic GitHub client**: Unlike the license-service's hardcoded repo, this service's GitHubService takes `repo` as a parameter, making it reusable across all products.
- **Multi-platform artifacts**: Each release can have multiple artifacts for different platforms (WordPress, Windows, macOS, Linux, Android, iOS) and architectures (x64, ARM64).
- **Release channels**: Supports stable, beta, and alpha channels per product with unique version constraints.
- **Source abstraction**: Artifacts can come from GitHub, MinIO, or external URLs -- the source type is stored per release.
- **Download tracking**: Each artifact tracks download count for analytics.
- **No CORS**: CORS is handled by the API Gateway, not this service.
- **Throttle guard**: Global rate limiting (100 req/min) via `@nestjs/throttler` as APP_GUARD.
