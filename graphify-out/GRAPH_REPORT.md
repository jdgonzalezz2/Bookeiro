# Graph Report - .  (2026-08-10)

## Corpus Check
- Corpus is ~34,536 words - fits in a single context window. You may not need a graph.

## Summary
- 347 nodes · 644 edges · 31 communities (20 shown, 11 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.79)
- Token cost: 36,000 input · 2,279 output

## Community Hubs (Navigation)
- Dashboard Pages & Analytics
- Auth & Login Flow
- Staff Management
- TypeScript Config
- InsForge Integration & Concepts
- ESLint & Type Deps
- Dashboard & Onboarding
- Runtime Dependencies
- Services Management
- Public Booking Flow
- Dashboard Shell & Nav
- Fonts & Root Layout
- Booking DB Schema
- MCP Server Config
- Analytics UI
- Storefront Layout
- Route Proxy / Middleware
- Reviews DB Schema
- Password Reset Layout
- Email Function Handler
- Staff Invite RPC v1
- Staff Invite RPC v2 (idempotent)
- Staff Invite RPC v3 (barber fix)
- ESLint Config
- Next.js Config
- Community 29

## God Nodes (most connected - your core abstractions)
1. `createInsForgeServerClient()` - 56 edges
2. `getCurrentProfile()` - 39 edges
3. `getAccessToken()` - 38 edges
4. `compilerOptions` - 16 edges
5. `getCurrentUser()` - 12 edges
6. `Bookeiro SaaS Platform` - 9 edges
7. `getClientAndTenant()` - 8 edges
8. `InsForge Backend-as-a-Service` - 8 edges
9. `signOutAction()` - 7 edges
10. `getClientAndTenant()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Google OAuth Login` --semantically_similar_to--> `Magic Link Authentication`  [INFERRED] [semantically similar]
  PENDIENTES.md → README.md
- `insmessage Serverless Function (staff invites)` --references--> `InsForge Backend-as-a-Service`  [INFERRED]
  PENDIENTES.md → AGENTS.md
- `Lazy Profile Creation (frontend/lib/auth.ts)` --references--> `InsForge Backend-as-a-Service`  [INFERRED]
  PENDIENTES.md → AGENTS.md
- `Google OAuth Login` --references--> `InsForge Backend-as-a-Service`  [EXTRACTED]
  PENDIENTES.md → AGENTS.md
- `Magic Link Authentication` --references--> `InsForge Backend-as-a-Service`  [EXTRACTED]
  README.md → AGENTS.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Post-recovery optional integrations requiring credentials** — pendientes_resend, pendientes_google_oauth, pendientes_openai_dalle [EXTRACTED 0.90]
- **Multi-tenant data isolation security pattern** — readme_multi_tenant, readme_rls, readme_rbac [INFERRED 0.85]

## Communities (31 total, 11 thin omitted)

### Community 0 - "Dashboard Pages & Analytics"
Cohesion: 0.09
Nodes (32): AnalyticsPage(), metadata, BookingDashboardPage(), metadata, Appointment, CustomersClient(), CustomerStats, CustomersPage() (+24 more)

### Community 1 - "Auth & Login Flow"
Cohesion: 0.12
Nodes (24): GET(), initiateOAuthAction(), signInAction(), LoginForm(), resendVerificationAction(), signUpAction(), verifyEmailAction(), RegisterPage() (+16 more)

### Community 2 - "Staff Management"
Cohesion: 0.12
Nodes (21): EditProfileClient(), createStaffAction(), deleteStaffAction(), getClientAndTenant(), saveWorkingHoursAction(), updateStaffAction(), CreateStaffClient(), DeleteStaffButton() (+13 more)

### Community 3 - "TypeScript Config"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 4 - "InsForge Integration & Concepts"
Cohesion: 0.10
Nodes (22): fetch-docs MCP tool, InsForge Backend-as-a-Service, @insforge/sdk TypeScript Client, InsForge MCP Tools (infrastructure), Tailwind CSS 3.4 version lock, Next.js create-next-app Bootstrap, Google OAuth Login, insmessage Serverless Function (staff invites) (+14 more)

### Community 5 - "ESLint & Type Deps"
Cohesion: 0.09
Nodes (21): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, @types/node, @types/react, @types/react-dom (+13 more)

### Community 6 - "Dashboard & Onboarding"
Cohesion: 0.15
Nodes (13): DashboardPage(), dynamic, LoginLayout(), metadata, createTenantAction(), OnboardingPage(), LandingPage(), MARQUEE_ITEMS (+5 more)

### Community 7 - "Runtime Dependencies"
Cohesion: 0.11
Nodes (19): dependencies, @insforge/sdk, lucide-react, next, next-themes, react, react-dom, react-phone-input-2 (+11 more)

### Community 8 - "Services Management"
Cohesion: 0.22
Nodes (12): createServiceAction(), deleteServiceAction(), getClientAndTenant(), updateServiceAction(), CreateServiceClient(), DeleteServiceButton(), DeleteServiceButtonProps, metadata (+4 more)

### Community 9 - "Public Booking Flow"
Cohesion: 0.26
Nodes (13): getAnonClient(), getAvailableSlots(), getTenantServices(), getTenantStaff(), submitBooking(), BookingModal(), Service, Slot (+5 more)

### Community 10 - "Dashboard Shell & Nav"
Cohesion: 0.26
Nodes (8): signOutAction(), DashboardShell(), DashboardShellProps, DashboardLayout(), dynamic, metadata, Sidebar(), clearAuthCookies()

### Community 11 - "Fonts & Root Layout"
Cohesion: 0.29
Nodes (7): dmSans, fraunces, inter, playfair, spaceGrotesk, metadata, ThemeProvider()

### Community 12 - "Booking DB Schema"
Cohesion: 0.42
Nodes (9): public.appointments, public.book_appointment(), public.is_tenant_owner(), public.services, public.staff, public.staff_services, public.working_hours, public (+1 more)

### Community 13 - "MCP Server Config"
Cohesion: 0.33
Nodes (5): API_BASE_URL, API_KEY, cmd, insforge, @insforge/mcp

### Community 17 - "Reviews DB Schema"
Cohesion: 0.50
Nodes (3): public.reviews, public, public.tenants

## Knowledge Gaps
- **109 isolated node(s):** `cmd`, `@insforge/mcp`, `API_KEY`, `API_BASE_URL`, `Service` (+104 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createInsForgeServerClient()` connect `Auth & Login Flow` to `Dashboard Pages & Analytics`, `Staff Management`, `Dashboard & Onboarding`, `Services Management`, `Public Booking Flow`, `Dashboard Shell & Nav`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Why does `getCurrentProfile()` connect `Dashboard Pages & Analytics` to `Auth & Login Flow`, `Staff Management`, `Dashboard & Onboarding`, `Services Management`, `Dashboard Shell & Nav`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `getAccessToken()` connect `Dashboard Pages & Analytics` to `Services Management`, `Dashboard Shell & Nav`, `Staff Management`, `Dashboard & Onboarding`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `cmd`, `@insforge/mcp`, `API_KEY` to the rest of the system?**
  _109 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dashboard Pages & Analytics` be split into smaller, more focused modules?**
  _Cohesion score 0.08673469387755102 - nodes in this community are weakly interconnected._
- **Should `Auth & Login Flow` be split into smaller, more focused modules?**
  _Cohesion score 0.12436974789915967 - nodes in this community are weakly interconnected._
- **Should `Staff Management` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._