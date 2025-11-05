# Lead Management System for Recreational Vehicles

### Overview
This project is a full-stack CRM designed for Swedish recreational vehicle dealers. It automates lead acquisition from platforms like Bytbil.se and Blocket, and direct website inquiries, using IMAP email processing and webhooks. The system efficiently distributes leads to sales representatives via a round-robin assignment system and manages the entire sales workflow from initial contact to deal closure. Key features include role-based access control (Manager and Seller), automated lead tracking, and performance analytics. The business vision is to streamline lead management for RV dealers, enhance sales efficiency, and provide comprehensive insights into the sales pipeline.

### User Preferences
Preferred communication style: Simple, everyday language.

### System Architecture

#### Frontend Architecture
The frontend uses React with TypeScript, Vite, Wouter for routing, and TanStack Query for data management. It features a custom design system with Tailwind CSS, shadcn/ui components, and Inter font family, supporting light/dark modes. State management primarily relies on React Query for server state and local component state for UI. Key UI patterns include a public contact form, a dashboard with KPIs, tabbed lead list views with seller filtering, detailed lead views with notes and tasks, and manager-specific views for seller pool management and lead reassignment. Responsive design is a core principle.

#### Backend Architecture
Built with Node.js and Express in TypeScript, the backend employs a modular route registration pattern and custom error handling. Authentication uses Replit OAuth with Passport.js and PostgreSQL for session storage, implementing role-based access control (Manager and Seller).

**Key Services:**
-   **Lead Ingestion:**
    -   **IMAP Email Worker:** Polls IMAP inboxes for leads from Bytbil and Blocket, parses email content using Cheerio, and prevents duplicates.
    -   **Bytbil Webhook:** Real-time lead delivery from Bytbil via a POST endpoint with optional secret validation and Zod schema validation.
-   **Round-Robin Assignment:** Distributes leads to sales reps based on facility-specific seller pools, with configurable seller activation/deactivation.
-   **Lead Lifecycle Management:** Tracks lead status transitions (NY_INTRESSEANMALAN to KUND_KONTAKTAD to VUNNEN/FORLORAD), timestamps key events, and logs all changes.
-   **Password Reset:** Secure token-based password reset via email using the Resend API.
-   **Public Contact Form:** Unauthenticated endpoint for website visitors to submit inquiries, creating leads with automatic round-robin assignment.

#### Data Storage Solutions
PostgreSQL, hosted on Neon Serverless, is used with Drizzle ORM for type-safe schema definition and queries. The schema includes tables for users, leads, lead notes, tasks, audit logs, seller pools, password reset tokens, and sessions. Enums are used for roles, lead sources, statuses (NY_INTRESSEANMALAN, KUND_KONTAKTAD, OFFERT_SKICKAD, VUNNEN, FORLORAD), and facilities. A storage abstraction layer centralizes database operations, supporting role-based data visibility and efficient querying.

Lead objects include comprehensive vehicle information:
- Vehicle details: title, link, registration number (Reg.Nr with Swedish format validation ABC123/ABC12D)
- Facility assignment: Required field for anläggning (Falkenberg, Göteborg, Trollhättan)
- External IDs: Verendus-ID for integration with external systems, listingId for Bytbil/Blocket
- Contact information: name, email, phone
- Status tracking with timestamps for assignment, first contact, and closure

#### API Routes
The API includes public endpoints for contact forms and Bytbil webhooks, authentication routes for login/logout and password management, and protected routes for managing leads, notes, tasks, user profiles, and seller pools. Dashboard endpoints provide KPI statistics with filtering capabilities.

#### Authentication and Authorization
Replit OAuth (OIDC) is the primary authentication method, syncing user profiles and using session-based authentication with PostgreSQL persistence. Authorization is role-based (MANAGER, SALJARE), enforced by middleware on API routes and reflected in the frontend UI. Security measures include secure cookies, environment variable secrets, input validation with Zod, and Argon2 for password hashing.

### External Dependencies

#### Third-Party Services
-   **Neon Database:** Serverless PostgreSQL hosting, connected via `DATABASE_URL`.
-   **Replit Authentication:** OAuth provider for user authentication.
-   **Email Services:**
    -   **IMAP:** Standard IMAP for receiving lead emails from various sources.
    -   **Resend:** Transactional email service for sending password reset emails, configured via `RESEND_API_KEY`.

#### Third-Party APIs
-   **Bytbil.se:**
    -   **Email Integration:** Parses lead notification emails for data extraction.
    -   **Webhook Integration:** Receives real-time lead data via a POST endpoint (`/api/webhooks/bytbil`), with optional secret validation.
-   **Blocket:** Email integration for lead notifications, requiring specific parsing logic.

#### NPM Dependencies
Key dependencies include `express`, `react`, `typescript`, `vite`, `drizzle-orm`, `@neondatabase/serverless`, `@tanstack/react-query`, `passport`, `express-session`, `openid-client`, `@radix-ui/*`, `tailwindcss`, `recharts`, `lucide-react`, `imapflow`, `cheerio`, `resend`, `argon2`, and `zod`.