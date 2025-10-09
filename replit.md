# Lead Management System for Recreational Vehicles

## Overview

This is a full-stack lead management CRM application built for recreational vehicle dealers (caravans/motorhomes) in Sweden. The system automates lead ingestion from Bytbil.se and Blocket, distributes leads to sales representatives using round-robin assignment, and provides complete workflow management from initial contact to deal closure.

The application features role-based access control (Manager and Seller roles), automated email parsing, comprehensive lead tracking with status transitions, and analytics dashboards for performance monitoring.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling:**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and data fetching
- shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design system

**Design System:**
- Custom color palette supporting light/dark modes with Swedish labels
- Primary accent color: `hsl(12 85% 56%)` (red/orange) for CTAs and active states
- Inter font family from Google Fonts
- Consistent spacing using Tailwind's spacing scale
- Custom CSS variables for theme-aware component styling
- Hover and active state elevations using opacity-based overlays

**State Management:**
- React Query handles all server state (leads, users, notes, tasks, audit logs)
- Query invalidation patterns for cache updates after mutations
- Local component state for UI interactions (filters, search, form inputs)
- Authentication state via `/api/auth/user` endpoint with Replit OAuth

**Key UI Patterns:**
- Dashboard with KPI cards showing metrics (conversion rates, response times)
- Lead list views with tabbed filtering (all, new, contacted, won, lost)
- Detailed lead views (/leads/:id) with comprehensive information:
  - Contact info and vehicle details display
  - Status badges and timeline information
  - Notes system with inline creation and history
  - Tasks system with description, due dates, and completion tracking
  - Activity timeline showing status changes and reassignments
  - Manager-only reassignment UI with seller selection
- Manager-specific views:
  - Seller pool management (/seller-pools) to activate/deactivate sellers
  - Lead reassignment controls in detail page
- Responsive layouts adapting from mobile to desktop
- Role-based navigation with conditional menu items

### Backend Architecture

**Framework & Runtime:**
- Node.js with Express for HTTP server
- TypeScript throughout with ES modules
- Modular route registration pattern
- Custom error handling middleware
- Request/response logging for API endpoints

**Authentication & Authorization:**
- Replit OAuth using OpenID Connect (OIDC) protocol
- Passport.js strategy for session management
- PostgreSQL-backed session store (connect-pg-simple)
- Role-based access control (RBAC) with MANAGER and SALJARE roles
- Session cookies with 7-day TTL, httpOnly and secure flags
- Middleware guards (`isAuthenticated`) on protected routes

**Business Logic Services:**

1. **Email Ingestion Service (IMAP Worker):**
   - ImapFlow client for polling IMAP inbox
   - Filters by sender addresses (Bytbil, Blocket domains)
   - Idempotency via message-ID tracking to prevent duplicate processing
   - Pluggable parser architecture (parserBytbil, parserBlocket)
   - HTML parsing with Cheerio for data extraction
   - Automatic lead creation after successful parsing
   - Marks emails as read post-processing

2. **Round-Robin Assignment Service:**
   - Separate seller pools per facility (Falkenberg, Göteborg, Trollhättan)
   - Enable/disable sellers without removing from pool
   - Configurable sort order for rotation sequence
   - Queries recent leads to determine next seller in rotation
   - Automatic assignment on lead creation if facility is known
   - Fallback to default pool for unidentified facilities

3. **Lead Lifecycle Management:**
   - Status flow: NY_INTRESSEANMALAN → KUND_KONTAKTAD → VUNNEN/FORLORAD
   - Timestamp tracking: createdAt, assignedAt, firstContactAt, closedAt
   - Derived metrics: TTFCA (time to first contact), TTA (time to assignment), TTC (time to close)
   - Audit logging for all status changes and reassignments
   - Notes and tasks as sub-entities linked to leads

### Data Storage Solutions

**Database:**
- PostgreSQL via Neon serverless (neon-serverless driver with WebSocket support)
- Drizzle ORM for type-safe query building and schema definition
- Schema-first approach with TypeScript types generated from Drizzle schemas
- Migrations managed via drizzle-kit

**Schema Design:**

Core tables:
- `users`: User profiles with role, facility (anläggning), OAuth metadata
- `leads`: Contact information, vehicle details, source, status, facility, assignment
- `lead_notes`: Timestamped text notes by users on leads
- `lead_tasks`: To-do items with descriptions, due dates, completion status
- `audit_logs`: Change history for leads (status changes, assignments)
- `seller_pools`: Configuration for round-robin (userId, facility, isEnabled, sortOrder)
- `sessions`: Express session storage for Replit Auth

Enums:
- `role`: MANAGER, SALJARE
- `source`: BYTBIL, BLOCKET, MANUELL
- `status`: NY_INTRESSEANMALAN, KUND_KONTAKTAD, VUNNEN, FORLORAD
- `anlaggning`: Falkenberg, Göteborg, Trollhättan

**Data Access Pattern:**
- Storage abstraction layer (`server/storage.ts`) provides interface to database
- All database operations go through storage service
- Query filters support role-based data visibility (sellers see only assigned leads, managers see all)
- Efficient querying with indexes on frequently filtered columns

**API Routes:**

Authentication:
- GET `/api/auth/user` - Get current authenticated user
- POST `/api/auth/logout` - Logout current user

Leads:
- GET `/api/leads` - List all leads (role-based filtering)
- GET `/api/leads/:id` - Get single lead details
- POST `/api/leads` - Create new lead
- PATCH `/api/leads/:id/status` - Update lead status
- POST `/api/leads/:id/assign` - Round-robin assignment to next available seller
- PATCH `/api/leads/:id/assign` - Manual reassignment to specific seller (manager-only)

Lead Notes:
- GET `/api/leads/:id/notes` - List all notes for a lead
- POST `/api/leads/:id/notes` - Create new note

Lead Tasks:
- GET `/api/leads/:id/tasks` - List all tasks for a lead
- POST `/api/leads/:id/tasks` - Create new task
- PATCH `/api/leads/:id/tasks/:taskId` - Update task (toggle completion)

Activity & Audit:
- GET `/api/leads/:id/activity` - Get activity timeline (audit logs) for a lead

Users & Seller Pools:
- GET `/api/users` - Get all users (manager-only)
- GET `/api/seller-pools` - Get seller pool configuration (manager-only)
- PATCH `/api/seller-pools/:id` - Update seller pool entry (activate/deactivate)

### Authentication and Authorization

**OAuth Flow:**
- Replit OAuth as primary authentication mechanism (no password storage)
- OIDC discovery endpoint dynamically fetches provider configuration
- Session-based authentication with PostgreSQL persistence
- User profile synced from OAuth claims (email, firstName, lastName, profileImageUrl)
- Upsert pattern ensures user exists in database on each login

**Authorization Model:**
- Two roles: MANAGER (full access), SALJARE (restricted to assigned leads)
- Role stored in database, not derived from OAuth provider
- Middleware checks user role before allowing access to manager-only endpoints
- Frontend conditionally renders UI elements based on user role
- API endpoints validate role permissions before returning data

**Security Measures:**
- Session secret from environment variable
- Secure cookies (httpOnly, secure flags)
- Password hashing with Argon2 (future-proofing for potential email/password auth)
- CSRF protection via session-based authentication
- Input validation using Zod schemas

### External Dependencies

**Third-Party Services:**

1. **Neon Database:**
   - Serverless PostgreSQL hosting
   - Connection via DATABASE_URL environment variable
   - WebSocket support for serverless environments

2. **Replit Authentication:**
   - OAuth provider (OIDC)
   - Issuer URL: `https://replit.com/oidc`
   - Client credentials via REPL_ID
   - Session management handled by application

3. **Email Services (IMAP):**
   - Configurable IMAP server (host, port, credentials via env vars)
   - Supports any standard IMAP provider
   - Optional configuration (system runs without email ingestion if not configured)

**Third-Party APIs:**

1. **Bytbil.se:**
   - Email notifications for lead inquiries
   - HTML-formatted emails parsed for contact and vehicle data
   - Vehicle listing URLs extracted for reference

2. **Blocket:**
   - Email notifications for lead inquiries
   - Similar HTML parsing approach
   - Distinct email structure requiring separate parser

**NPM Dependencies:**

Core framework:
- express, react, typescript, vite
- drizzle-orm, @neondatabase/serverless
- @tanstack/react-query
- passport, express-session, openid-client

UI components:
- @radix-ui/* (comprehensive primitive component library)
- tailwindcss, class-variance-authority, clsx
- recharts (for dashboard charts)
- lucide-react (icon library)

Email processing:
- imapflow (modern IMAP client)
- cheerio (HTML parsing)

Security:
- argon2 (password hashing)
- zod (schema validation)

**Build & Deployment:**

Development:
- tsx for TypeScript execution without compilation
- Vite dev server with HMR
- Replit-specific plugins (cartographer, dev banner, runtime error modal)

Production:
- Vite builds frontend to `dist/public`
- esbuild bundles server to `dist/index.js`
- Single production command: `node dist/index.js`
- Environment variables for configuration (DATABASE_URL, SESSION_SECRET, IMAP credentials, REPL_ID)