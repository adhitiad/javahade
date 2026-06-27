# AI Agent Instructions for Javahade

This repository is a multi-language full-stack system with a Django REST backend, Go realtime microservices, a Next.js frontend, and a Flutter mobile app.

## What to know first

- `README.md` is the main source of truth for architecture, setup, and Docker Compose usage.
- `AI_AUDIT_GUIDELINES.md` contains project-specific security and architecture expectations for payment, auth, dual DB, real-time, and observability.
- `.agents/rules/bun.md` defines required Bun/Next.js frontend conventions and should be followed for all web TS/JS code.

## Key components

- `python-service/`: Django API, PostgreSQL + MongoDB, Celery/Redis, REST and auth flows.
- `go-services/`: Go microservices for chat, streaming, booking, payment, and shared utilities.
- `web/`: Next.js 16 App Router frontend using Bun, TypeScript strict mode, Zustand, Tailwind, `shadcn/ui`.
- `mobile/`: Flutter mobile application scaffold.
- `docker-compose.*.yml`: Local orchestration for app, databases, monitoring, and environment-specific stacks.

## Build & run guidance

- Root Docker Compose orchestration is preferred for integration work.
- Backend local dev:
  - `cd python-service`
  - `python -m venv venv`
  - `venv\Scripts\activate` (Windows)
  - `pip install -r requirements.txt`
  - `python manage.py migrate`
  - `python manage.py runserver`
- Go services:
  - `cd go-services/shared && go mod tidy`
  - `cd ../<service> && go run main.go`
  - Use standard Go module workflow and `go test ./...` as needed.
- Frontend:
  - `cd web`
  - `bun install`
  - `bun run dev`
  - `bun run build`
  - `bun run lint`
- Mobile:
  - `cd mobile`
  - `flutter pub get`
  - `flutter run`
  - `flutter test`

## Style & safety expectations

- For Next.js frontend code, use the Bun runtime and App Router conventions.
- Client components that use hooks, browser APIs, or WebSocket logic must declare `use client` at the top.
- Validate API data from Django using Zod before consumption in the frontend.
- Treat Python as the canonical business logic layer and Go as realtime/messaging support.
- Do not assume cross-database foreign keys between PostgreSQL and MongoDB; use identifier references instead.

## Documentation links

- [Repository README](README.md)
- [AI Audit Guidelines](AI_AUDIT_GUIDELINES.md)
- [Flutter README](mobile/README.md)
- Existing rule: `.agents/rules/bun.md`

## When in doubt

- Prefer Docker Compose native environment for cross-service behavior.
- Preserve the existing separation of concerns: Django for API, Go for realtime/payments, Next.js for UI.
- Refer to `AI_AUDIT_GUIDELINES.md` before making security-sensitive changes.
