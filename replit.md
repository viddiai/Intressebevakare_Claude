# Lead Management System for Recreational Vehicles

### Overview
This project is a full-stack CRM designed for Swedish recreational vehicle dealers. It automates lead acquisition from platforms like Bytbil.se and Blocket, and direct website inquiries, using IMAP email processing and webhooks. The system efficiently distributes leads to sales representatives via a round-robin assignment system and manages the entire sales workflow from initial contact to deal closure. Key features include role-based access control (Manager and Seller), automated lead tracking, and performance analytics. The business vision is to streamline lead management for RV dealers, enhance sales efficiency, and provide comprehensive insights into the sales pipeline.

### User Preferences
Preferred communication style: Simple, everyday language.

### System Architecture

#### Frontend Architecture
The frontend uses React with TypeScript, Vite, Wouter for routing, and TanStack Query for data management. It features a custom design system with Tailwind CSS, shadcn/ui components, and Inter font family, supporting light/dark modes. State management primarily relies on React Query for server state and local component state for UI. Key UI patterns include a public contact form, an overview page with real-time KPIs, a dashboard with analytics, tabbed lead list views with seller filtering, timestamp display (YYYY-MM-DD HH:MM format in Swedish timezone), and next task display with visual priority indicators, detailed lead views with notes and tasks, and manager-specific views for seller pool management and lead reassignment. Responsive design is a core principle.

**Overview Page KPIs:**
- Real-time statistics that auto-refresh every 30 seconds
- Four KPI blocks for managers: "Nya leads idag" (with change from yesterday), "Väntande accept" (pending acceptance count), "Aktiva leads" (leads in progress), "Aktiva säljare" (active sellers and facilities)
- Three KPI blocks for sellers: Same as managers except "Aktiva säljare" which is manager-only
- Data filtered by user role: sellers see only their assigned leads, managers see all leads
- Visual indicators with icons and color-coded backgrounds for each metric type

**Next Task Feature:**
- Each lead card displays the next upcoming task (earliest future/today's task)
- Visual priority indicators:
  - Overdue (red): AlertCircle icon, red background
  - Today (yellow): Clock icon, yellow background  
  - Within 2 days (orange): Clock icon, orange background
  - Future (normal): Clock icon, neutral background
- Leads sorted by next task date (earliest first), leads without tasks appear last
- Filter toggle: "Uppgifter idag" shows only leads with tasks due today
- Fallback message: "Inga planerade uppgifter" when no upcoming tasks

**Lead Acceptance UI:**
- Accept/Decline buttons appear in lead cards (list view) and AcceptanceBanner (detail view)
- Buttons only visible to the assigned seller (`lead.assignedToId === currentUser.id`)
- Green "Acceptera" button and gray "Avvisa" button with countdown timer
- Managers can view pending acceptance status but cannot accept/decline on behalf of sellers
- Toast notifications for success/error feedback
- Proper permission checks prevent unauthorized actions

**Seller Pool and Notification Integration:**
- When a user disables email notifications (emailOnLeadAssignment = false), all their seller pools are automatically disabled
- This ensures users who don't want email notifications also don't receive new leads via round-robin
- Backend updates all seller pools and logs status changes when notification preference is changed
- Frontend displays informative message: "E-postnotifikationer avstängda. Din status i resurspoolerna har också inaktiverats"
- Cache invalidation ensures UI reflects the changes immediately across Settings and Seller Pools pages

#### Backend Architecture
Built with Node.js and Express in TypeScript, the backend employs a modular route registration pattern and custom error handling. Authentication uses Replit OAuth with Passport.js and PostgreSQL for session storage, implementing role-based access control (Manager and Seller).

**Key Services:**
-   **Lead Ingestion:**
    -   **IMAP Email Worker:** Polls IMAP inboxes for leads from Bytbil and Blocket, parses email content using Cheerio, and prevents duplicates.
    -   **Bytbil Webhook:** Real-time lead delivery from Bytbil via a POST endpoint with optional secret validation and Zod schema validation.
-   **Round-Robin Assignment:** Distributes leads to sales reps based on facility-specific seller pools, with configurable seller activation/deactivation.
-   **Lead Lifecycle Management:** Tracks lead status transitions (NY_INTRESSEANMALAN to KUND_KONTAKTAD to VUNNEN/FORLORAD), timestamps key events, and logs all changes.
-   **Lead Acceptance System:** 12-hour acceptance window with email reminders at 6h and 11h, database flag-based tracking (reminderSentAt6h, reminderSentAt11h, timeoutNotifiedAt), automatic reassignment on decline/timeout, and statistics tracking (leadsAcceptedCount, leadsDeclinedCount, leadsTimedOutCount).
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
- Registration timestamp: Automatically captured createdAt timestamp displayed in Swedish timezone (CET/CEST) in format YYYY-MM-DD HH:MM in both list view and detail view

Task management features:
- Tasks include description, due date with time, completion status, and timestamps
- Time input with default value of 09:00 when creating tasks
- All timestamps stored in UTC, displayed in Swedish timezone (Europe/Stockholm)
- Tasks sorted chronologically by date and time, with tasks without due dates appearing last
- Display format: "YYYY-MM-DD HH:MM - Task description"

#### API Routes
The API includes public endpoints for contact forms and Bytbil webhooks, authentication routes for login/logout and password management, and protected routes for managing leads, notes, tasks, user profiles, and seller pools. Dashboard endpoints provide KPI statistics with filtering capabilities, and overview endpoints provide real-time KPI data for the overview page.

**Overview KPI Endpoint:**
- GET `/api/overview/stats` - Returns real-time KPI metrics (new leads today with difference from yesterday, pending acceptance count, active leads count, active sellers and facilities for managers)
- Role-filtered data: sellers see only their assigned leads, managers see all leads
- Auto-refreshes on the frontend every 30 seconds

**Lead Acceptance Endpoints:**
- POST `/api/leads/:id/accept` - Accept a lead (validates assignedToId === userId)
- POST `/api/leads/:id/decline` - Decline a lead (validates assignedToId === userId)
- GET `/api/leads/:id/email-accept` - Accept via email link (redirects after action)
- GET `/api/leads/:id/email-decline` - Decline via email link (redirects after action)

All acceptance endpoints enforce that only the assigned seller can accept/decline their leads.

#### Authentication and Authorization
Replit OAuth (OIDC) is the primary authentication method, syncing user profiles and using session-based authentication with PostgreSQL persistence. Authorization is role-based (MANAGER, SALJARE), enforced by middleware on API routes and reflected in the frontend UI. Security measures include secure cookies, environment variable secrets, input validation with Zod, and Argon2 for password hashing.

### External Dependencies

#### Third-Party Services
-   **Neon Database:** Serverless PostgreSQL hosting, connected via `DATABASE_URL`.
-   **Replit Authentication:** OAuth provider for user authentication.
-   **Email Services:**
    -   **IMAP:** Standard IMAP for receiving lead emails from various sources.
    -   **Resend:** Transactional email service for password reset, lead assignments, and acceptance reminders. All lead-related emails include Accept/Decline action buttons linking to `/api/leads/:id/email-accept` and `/api/leads/:id/email-decline` endpoints. Configured via `RESEND_API_KEY`.

#### Third-Party APIs
-   **Bytbil.se:**
    -   **Email Integration:** Parses lead notification emails for data extraction.
    -   **Webhook Integration:** Receives real-time lead data via a POST endpoint (`/api/webhooks/bytbil`), with optional secret validation.
-   **Blocket:** Email integration for lead notifications, requiring specific parsing logic.

#### NPM Dependencies
Key dependencies include `express`, `react`, `typescript`, `vite`, `drizzle-orm`, `@neondatabase/serverless`, `@tanstack/react-query`, `passport`, `express-session`, `openid-client`, `@radix-ui/*`, `tailwindcss`, `recharts`, `lucide-react`, `imapflow`, `cheerio`, `resend`, `argon2`, `zod`, `date-fns`, and `date-fns-tz` (for Swedish timezone handling).