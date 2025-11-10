# Lead Management System for Recreational Vehicles

### Overview
This project is a full-stack CRM designed for Swedish recreational vehicle dealers. It automates lead acquisition from platforms like Bytbil.se and Blocket, and direct website inquiries, using IMAP email processing and webhooks. The system efficiently distributes leads to sales representatives via a round-robin assignment system and manages the entire sales workflow from initial contact to deal closure. Key features include role-based access control (Manager and Seller), automated lead tracking, and performance analytics. The business vision is to streamline lead management for RV dealers, enhance sales efficiency, and provide comprehensive insights into the sales pipeline.

### User Preferences
Preferred communication style: Simple, everyday language.

### System Architecture

#### Frontend Architecture
The frontend uses React with TypeScript, Vite, Wouter for routing, and TanStack Query for data management. It features a custom design system with Tailwind CSS, shadcn/ui components, and Inter font family, supporting light/dark modes. State management relies on React Query for server state and local component state. Key UI patterns include a public contact form, an overview page with real-time KPIs (auto-refreshing every 30 seconds, role-filtered), a dashboard with analytics, tabbed lead list views with seller filtering, and detailed lead views with notes and tasks.

**Key Features:**
- **Next Task Display:** Lead cards show the next upcoming task with visual priority indicators (overdue, today, within 2 days, future) and sorting by task date.
- **Lead Acceptance:** Assigned sellers can accept/decline leads via buttons in list and detail views, with proper permission checks.
- **Lead Reassignment:** Sellers can reassign pending leads to others, triggering a database transaction for atomicity and audit logging.
- **Seller Pool Integration:** Disabling email notifications automatically disables associated seller pools to prevent lead assignment. Additionally, sellers cannot enable availability unless email notifications are active, enforced by both frontend and backend validation with user-friendly error messages and visual highlighting.
- **Seller Pool Reordering:** Managers can manually reorder sellers within each facility's resource pool using up/down arrow buttons. Custom ordering overrides the default alphabetical/numerical sort and is persisted in the database, affecting the round-robin assignment sequence.
- **Internal Messaging System:** Lead-based conversation grouping, displaying lead title, participants, last message, timestamp, and unread counts. Supports real-time polling and clickable lead references. All UI text is in Swedish.

#### Backend Architecture
Built with Node.js and Express in TypeScript, the backend uses a modular route registration pattern and custom error handling. Authentication uses Replit OAuth with Passport.js and PostgreSQL for session storage, implementing role-based access control (Manager and Seller).

**Key Services:**
- **Lead Ingestion:** IMAP email worker for Bytbil/Blocket leads (parsing with Cheerio) and a Bytbil webhook for real-time delivery (with Zod validation).
- **Round-Robin Assignment:** Distributes leads to sales reps based on facility-specific seller pools.
- **Lead Lifecycle Management:** Tracks status transitions, timestamps events, and logs changes.
- **Lead Acceptance System:** 12-hour acceptance window with email reminders, automatic reassignment on decline/timeout, and statistics tracking. Respects user email notification preferences.
- **Password Reset:** Secure token-based password reset via email.
- **Public Contact Form:** Unauthenticated endpoint for lead submission.

#### Data Storage Solutions
PostgreSQL, hosted on Neon Serverless, is used with Drizzle ORM. The schema includes tables for users, leads, notes, tasks, audit logs, seller pools, password reset tokens, and sessions. Enums are used for roles, lead sources, statuses, and facilities. Lead objects include comprehensive vehicle information (title, Reg.Nr, facility, Verendus-ID, link), contact information, and status tracking with timestamps. Task management includes description, due date/time, and completion status. All timestamps are stored in UTC and displayed in the Swedish timezone (Europe/Stockholm).

#### API Routes
The API includes public endpoints for contact forms and Bytbil webhooks, authentication routes, and protected routes for managing leads, notes, tasks, user profiles, and seller pools. Dashboard and overview endpoints provide KPI statistics.
- **Overview KPI Endpoint:** `GET /api/overview/stats` provides real-time, role-filtered KPI metrics.
- **Lead Acceptance Endpoints:** `POST /api/leads/:id/accept`, `POST /api/leads/:id/decline`, and email-based `GET /api/leads/:id/email-accept`, `GET /api/leads/:id/email-decline`.
- **Lead Reassignment Endpoints:** `GET /api/users/sellers` and `POST /api/leads/:id/reassign-to-seller`.
- **Seller Pool Reordering Endpoint:** `PATCH /api/seller-pools/reorder` allows managers to bulk update sort orders for seller pools.
- **Message Endpoints:** `GET /api/messages/conversations`, `GET /api/messages/lead/:leadId`, `POST /api/messages`, `GET /api/messages/unread-count`.

#### Authentication and Authorization
Replit OAuth (OIDC) is the primary authentication method, syncing user profiles and using session-based authentication with PostgreSQL persistence. Authorization is role-based (MANAGER, SALJARE), enforced by middleware and reflected in the frontend. Security measures include secure cookies, environment variables, Zod validation, and Argon2 for password hashing.
- **Lead Detail Access Rules:** Users can access lead details if they are a manager, assigned to the lead, or have participated in messages about the lead.

### External Dependencies

#### Third-Party Services
-   **Neon Database:** Serverless PostgreSQL hosting.
-   **Replit Authentication:** OAuth provider for user authentication.
-   **Email Services:**
    -   **IMAP:** For receiving lead emails.
    -   **Resend:** Transactional email service for password reset, lead assignments, and acceptance reminders. Configured via `RESEND_API_KEY`.

#### Third-Party APIs
-   **Bytbil.se:** Email and Webhook integration for lead data.
-   **Blocket:** Email integration for lead notifications.

#### NPM Dependencies
Key dependencies include `express`, `react`, `typescript`, `vite`, `drizzle-orm`, `@neondatabase/serverless`, `@tanstack/react-query`, `passport`, `express-session`, `openid-client`, `@radix-ui/*`, `tailwindcss`, `recharts`, `lucide-react`, `imapflow`, `cheerio`, `resend`, `argon2`, `zod`, `date-fns`, and `date-fns-tz`.