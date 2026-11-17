# ToDo Web Application — Implementation Plan

## Top-Level Overview

**Goal:** A multi-user ToDo single-page web application built with Carbon Design System, with light/dark theming, login, todo CRUD, sortable lists, and an MCP endpoint so an agent can manage a user's todos remotely. Runs on an OpenShift cluster, deployed with Kustomize, and stores all data in an external IBM Cloudant database.

**Confirmed decisions**
- Repo state: greenfield (workspace contains only `.bob/` config and `.vscode/`).
- Language: TypeScript everywhere, npm-workspaces monorepo.
- Frontend (`web/`): React + Vite + TypeScript, `@carbon/react`, Carbon themes (white / g100) toggled via the `Theme` component. Served as static files by an nginx-based image.
- Backend (`server/`): Node.js + TypeScript, Fastify (REST API), official MCP TypeScript SDK, official Cloudant SDK (`@ibm-cloud/cloudant`).
- Database: **external IBM Cloudant / Apache CouchDB** (NoSQL, HTTPS). Service URL and credentials are provided by the environment; nothing is hardcoded. Holds users, sessions, API tokens and todos. No local database.
- Auth: self-service sign-up with email + password, argon2 hashing, httpOnly session cookie (SameSite, Secure). Sessions are stored in Cloudant so multiple replicas share state.
- MCP: Streamable HTTP endpoint (`/mcp`) on the same backend, authenticated with per-user API tokens created in the UI (stored hashed). The agent only sees its owner's todos.
- Todo fields: title (required), description, creation date (system set), due date (optional), completed flag.
- List sorting: by due date, creation date, or title, ascending/descending. Todos without a due date sort last when sorting by due date.
- Agent: a native watsonx Orchestrate agent (YAML, ADK) that uses the ToDo MCP server as a remote MCP toolkit (`streamable_http`). Target environment: **watsonx Orchestrate SaaS**, so the `/mcp` Route must be reachable from the internet over HTTPS (TLS edge termination, bearer token required on every request). Sub-task 10.
- Administration: a built-in `admin` role. One default admin account is created on first startup with a **randomly generated password** (no password in code or git). The generated password is delivered once through a Kubernetes Secret, not the pod log (project rule: never log secrets). Only the admin can open the admin interface and call `/api/admin/*`. The admin interface is read-only and shows the number of users and, per user, the total, done, open and overdue todo counts. It shows no todo content. Sub-task 11.
- Devices: **responsive web only** (no PWA, no offline mode, no native app). One SPA adapts to phone, tablet and desktop using the Carbon 2x Grid breakpoints (sm, md, lg, xlg, max), touch-friendly targets, and a mobile navigation. All screens (auth, todos, settings, admin) are responsive. Sub-tasks 5, 6, 7, 11, 12.
- Build and test: three test paths — fast local tests, a local container stack (podman compose with CouchDB as Cloudant stand-in), and an OpenShift deployment with in-cluster builds (Kustomize ImageStreams and Docker-strategy BuildConfigs from Git or binary upload, internal registry). Sub-task 12.

- Deployment: two container images (nginx web, Node API+MCP), two Deployments, two Services, one OpenShift Route with path-based routing (`/api` and `/mcp` → API service, `/` → web service). All manifests are Kustomize YAML (base + overlays).

**Non-goals:** OAuth/OIDC, multi-tenant admin UI, password reset by email, todo sharing between users, provisioning the Cloudant instance itself, CI/CD pipeline definitions.

**Conventions (from project security rules)**
- Latest stable, actively maintained versions of all packages and base images; verify at install time and commit the lock file; run `npm audit`.
- Container images: Red Hat registry (`registry.redhat.io`) UBI-based images, minimal variants where available, non-root user, read-only root filesystem, all capabilities dropped. Use the OpenShift `restricted-v2` SCC (no fixed UID).
- No service binds to `0.0.0.0`. Locally bind to `127.0.0.1`; in the cluster bind to the pod IP injected via the Downward API (`status.podIP`). See Open Items for the nginx case.
- TLS 1.2+ everywhere: Route uses edge termination with HTTP redirected to HTTPS; Cloudant calls use HTTPS with certificate validation on.
- No hardcoded secrets. Cloudant URL/credentials and the session/cookie secret come from a Kubernetes Secret (never committed; repo contains only an example/template). `.gitignore` excludes `.env` and secret files.
- Validate all input server-side with schemas; generic error messages; never log secrets, passwords or tokens.
- Use Carbon components, tokens and Grid; no inline styles; accessible labels.
- Mobile-first responsive design: build for the smallest breakpoint first and enhance upward. No fixed pixel widths, no horizontal page scrolling at 320 px width, interactive targets at least 44x44 px on touch devices (WCAG 2.2 target size), text zoom and pinch zoom not disabled, support portrait and landscape, respect `prefers-reduced-motion`.

## Architecture

Diagram is in the chat (kept out of this file by convention). Summary:
- Browser SPA is served by the nginx pod and calls `/api` with the session cookie (same origin via the Route, so no CORS).
- Remote agent calls `/mcp` with `Authorization: Bearer <api token>` through the same Route.
- REST handlers and MCP tools call one shared todo service layer (`server/src/services`) that enforces per-user ownership.
- The service layer talks to a small repository interface implemented with the Cloudant SDK.

**Cloudant data model (design decisions)**
- One database with typed documents, or one database per type (`users`, `sessions`, `api_tokens`, `todos`) — plan uses one database per type for simpler indexes; names are configurable via env vars.
- Document `_id` is deterministic where uniqueness is needed: users use `_id` derived from the normalized email so duplicate registration yields a 409 conflict (Cloudant has no unique constraints); API tokens and sessions use the hash of the token as `_id` for O(1) lookup.
- Todos: `_id` generated, `userId`, `title`, `description`, `createdAt`, `dueDate` (nullable), `completed`. A Mango index on `userId` supports listing.
- Sorting is done in the service layer after fetching the user's todos (Mango cannot sort case-insensitively or place missing due dates last). A page size limit protects against large result sets.
- Cloudant has no TTL: expired sessions are rejected on read and lazily deleted; stale sessions are purged opportunistically.
- Updates use `_rev` for optimistic concurrency; a 409 is mapped to a retry or a clean error.

## Sub-Tasks

### 1. Project scaffolding and tooling
**Intent:** Establish the monorepo, tooling and security hygiene so later tasks are isolated and reviewable.

**Expected Outcomes**
- `npm install` and `npm run dev` start both the server and the web app locally.
- Lint, typecheck and test scripts exist and pass on an empty baseline.

**Todo List**
1. Create root `package.json` with npm workspaces (`web`, `server`), root scripts (`dev`, `build`, `lint`, `typecheck`, `test`).
2. Add shared `tsconfig` base, ESLint + Prettier config.
3. Add `.gitignore` (node_modules, dist, `.env`, secret files), `.env.example` (Cloudant URL, auth settings, db names, bind host/port, session secret placeholders), minimal `README.md`.
4. Scaffold `server/` (Fastify, TypeScript, test runner) with a health endpoint; bind host and port from env, default `127.0.0.1`.
5. Scaffold `web/` (Vite React TS) with Vite dev proxy of `/api` and `/mcp` to the server.
6. Verify latest stable dependency versions, commit lock file, run `npm audit`.

**Relevant Context:** Greenfield; no existing files to follow.
**Status:** `[x] completed`

### 2. Cloudant data layer and todo service
**Intent:** Persist data in the external Cloudant service and implement the business logic once, reusable by REST and MCP.

**Expected Outcomes**
- Server connects to Cloudant using env-provided URL and credentials (IAM API key or basic auth, selected by env), HTTPS only.
- Databases and indexes are created idempotently on startup (or verified, if the credentials lack create permission).
- Repository + service functions for create/list/get/update/delete todos scoped by `userId`, with sorting support.

**Todo List**
1. Implement config loader that validates required env vars at startup and fails fast with a non-secret error.
2. Implement Cloudant client module (`@ibm-cloud/cloudant`) with request timeouts, and an idempotent bootstrap for databases and the Mango index on `userId`.
3. Define document types and repository interfaces for users, sessions, API tokens, todos (deterministic `_id` rules as described above).
4. Implement todo service: `create`, `list(sortBy, order)`, `get`, `update`, `delete`; every query filtered by owner; `sortBy` restricted to an allowlist (`dueDate`, `createdAt`, `title`); in-service sorting with nulls last for due date; `_rev` handling for updates.
5. Add input schemas (title length limit, description limit, ISO date validation).
6. Unit tests against an in-memory fake of the repository interface for CRUD, ownership isolation and all sort orders; an optional integration test against a local CouchDB container, skipped unless configured.

**Relevant Context:** `server/src/config`, `server/src/db`, `server/src/services`.
**Status:** `[x] completed`

### 3. Authentication and session management
**Intent:** Let users register, log in/out, and protect the API, with state shared across replicas.

**Expected Outcomes**
- `POST /api/auth/register`, `/login`, `/logout`, `GET /api/auth/me` work with an httpOnly session cookie.
- Unauthenticated requests to todo endpoints return 401.
- Duplicate email registration returns a conflict handled without user enumeration leaks in login.

**Todo List**
1. Implement argon2 password hashing and constant-time verification.
2. Implement Cloudant-backed sessions (random token from a CSPRNG, stored hashed, expiry, cookie with `httpOnly`, `sameSite`, `secure` in production).
3. Add auth hook and CSRF protection suitable for cookie auth (SameSite plus an anti-CSRF check for state-changing requests).
4. Add rate limiting on login/register (per-pod in-memory is acceptable; documented as a limitation across replicas) and generic error responses.
5. Tests: register, duplicate email, wrong password, session expiry, logout, protected route.

**Relevant Context:** `server/src/auth`, Fastify cookie/rate-limit plugins.
**Status:** `[x] completed`

### 4. Todo REST API
**Intent:** Expose todo management to the SPA.

**Expected Outcomes**
- `GET/POST /api/todos`, `GET/PATCH/DELETE /api/todos/:id` return validated JSON, scoped to the logged-in user.
- `GET /api/todos?sortBy=dueDate|createdAt|title&order=asc|desc` returns sorted results.

**Todo List**
1. Implement routes on top of the todo service with schema validation and 400/404 handling that does not leak internals.
2. Support toggling `completed` via PATCH.
3. Integration tests covering auth required, validation errors, cross-user access (must 404), and sorting.

**Relevant Context:** `server/src/routes/todos.ts`.
**Status:** `[x] completed`

### 5. Frontend foundation: Carbon shell, theming, routing, auth screens
**Intent:** Provide the SPA skeleton with Carbon, a persistent light/dark toggle and login/sign-up.

**Expected Outcomes**
- Carbon styles loaded via SCSS (IBM Plex), app wrapped in Carbon `Theme` using `white` and `g100`.
- Theme toggle in the header; choice persisted in `localStorage`; initial value follows `prefers-color-scheme`.
- Login and sign-up pages, route guard redirecting unauthenticated users, logout action.
- Responsive app shell: on small screens (below the `lg` breakpoint) the header collapses into a hamburger menu with a Carbon `SideNav` (navigation links, theme toggle, logout); on large screens the links show in the header. Auth forms are single-column and centered on phones, wider on tablets and desktop.
- `index.html` has a correct `viewport` meta tag (width=device-width, initial-scale=1, zoom not disabled) and a `theme-color` that follows the active theme.

**Todo List**
1. Consult Carbon docs/code via the carbon-mcp tools for current `@carbon/react` setup, `Theme`, `Header` with `HeaderMenuButton` and `SideNav` (responsive shell), `Content`, `Form` and Grid breakpoint patterns.
2. Set up SCSS entry with Carbon styles and tokens; no inline styles.
3. Implement theme provider/hook with persistence and OS default.
4. Add router, API client (fetch with credentials and CSRF handling), auth context.
5. Build login/register forms with Carbon `TextInput`/`PasswordInput`, inline validation and error notifications.
6. Implement the responsive shell (hamburger plus `SideNav` below `lg`, inline header links above), set the viewport and `theme-color` meta tags, and use the Carbon `Grid` with `sm`/`md`/`lg` column spans for the auth screens.
7. Component tests for theme toggle, route guard and shell behavior at small and large viewport widths.

**Relevant Context:** `web/src`; Carbon accessibility practices (labels, focus, keyboard).
**Status:** `[x] completed`

### 6. Frontend todo management UI
**Intent:** The main user value: create, edit, delete, complete and sort todos.

**Expected Outcomes**
- Todo list (Carbon table or tile/list layout) showing title, description, created date, due date, completed state.
- Sort control for due date / creation date / title with ascending/descending.
- Create/edit modal with title, description, optional due date (`DatePicker`); delete with confirmation; completed checkbox.
- Loading, empty and error states.
- Responsive todo layout: on phones each todo is a stacked card/tile (title, due date with overdue emphasis, completed checkbox, overflow menu for edit/delete) in a single column; on tablets two columns of tiles or a compact table; on desktop a full Carbon `DataTable`. The sort control is always reachable (a `Dropdown`/`Select` plus ascending/descending toggle at the top, no hover-only controls).
- On phones the create/edit dialog is full-screen or a bottom-anchored panel, and the on-screen keyboard must not hide the focused field. The due date input uses a touch-friendly picker (native date input or Carbon `DatePicker` verified on touch). The primary "Add todo" action stays reachable.

**Todo List**
1. Build todo API hooks and list state (re-fetch on mutation, sort params sent to the API).
2. Build list view with sort `Dropdown`/table header sorting and empty state.
3. Build create/edit modal and delete confirmation modal.
4. Add completed checkbox with optimistic update and rollback on error.
5. Implement the breakpoint-driven layouts described above with Carbon `Grid`/`Column` and SCSS using Carbon breakpoint mixins (no inline styles); verify both themes at 320, 768 and 1280 px widths.
6. Make all interactive controls at least 44x44 px on touch devices and ensure no hover-only interactions; check text zoom to 200 percent without loss of content.
7. Component tests for create/edit/delete/sort flows, including the card layout at small width.

**Relevant Context:** `web/src/features/todos`; sort allowlist must match server.
**Status:** `[x] completed`

### 7. API tokens and MCP server
**Intent:** Allow a remote agent to manage a user's todos securely.

**Expected Outcomes**
- Users can create, list (label and last used only) and revoke API tokens in a Settings page; plaintext token shown once on creation.
- `/mcp` Streamable HTTP endpoint accepts `Authorization: Bearer <token>` and rejects invalid/revoked tokens.
- MCP tools: `list_todos` (with sort params), `get_todo`, `create_todo`, `update_todo` (incl. completed), `delete_todo`, all scoped to the token owner.
- The MCP transport works correctly with multiple API replicas (stateless mode, no in-pod session affinity required).

**Todo List**
1. Implement token generation (CSPRNG), Cloudant storage as hash, lookup, revoke, last-used update; REST endpoints for token management (session-authenticated).
2. Implement MCP server with the official TypeScript SDK (verify current API, e.g. via the `build-mcp-server` skill), registering the tools with input schemas that reuse the todo schemas and calling the shared service.
3. Mount the Streamable HTTP transport in stateless mode in the Fastify app with bearer-token auth, rate limiting and no secrets in logs.
3a. Every MCP tool must have a clear description (watsonx Orchestrate fails to import tools without one). Avoid the characters `&&`, `||`, `$(`, `>` and `<` in tool descriptions (known watsonx Orchestrate tool-discovery issue DT471337). Keep tool names simple (letters, digits, underscore).
3b. `tools/list` must respond well within 30 seconds (the ADK waits up to 30 seconds during import).
4. Add Settings page in the SPA for token management (responsive: token list as stacked cards on phones, table on larger screens; the one-time token display has a copy button that works on touch devices).
5. Tests: tool calls via an MCP client, ownership isolation between two users, revoked token rejected.
6. Document how to register the server in an agent config (Route URL + bearer header) in the README.

**Relevant Context:** `server/src/mcp`, `server/src/services`; `.bob/mcp.json` shows the expected streamable-http client config shape (`type`, `url`, `headers`).
**Status:** `[x] completed`

### 8. Container images
**Intent:** Produce hardened, OpenShift-compatible images for the web and API components.

**Expected Outcomes**
- `server/Containerfile`: multi-stage build, Red Hat UBI Node.js image (minimal variant where available) for runtime, runs as non-root, listens on an unprivileged port (e.g. 8080), bind host from env.
- `web/Containerfile`: multi-stage build (Node build stage → Red Hat UBI nginx runtime), runs as non-root on an unprivileged port, works with arbitrary UID (restricted-v2 SCC), writable paths limited to emptyDir-mountable dirs.
- nginx config serves the SPA with history-fallback to `index.html`, long-cache for hashed assets, no-cache for `index.html`, and basic security headers (CSP compatible with Carbon, `X-Content-Type-Options`, `Referrer-Policy`, frame protections).
- `.containerignore` files keep secrets and `node_modules` out of the build context.

**Todo List**
1. Verify current Red Hat registry image names/tags for Node.js and nginx (UBI 9/10 as current) and pin versions.
2. Write both Containerfiles and nginx config.
3. Build both images locally (podman/docker) and run them to verify they start as non-root with a read-only root filesystem.

**Relevant Context:** `server/Containerfile`, `web/Containerfile`, `web/nginx/`.
**Status:** `[x] completed`

### 9. Kustomize manifests for OpenShift
**Intent:** Provide all deployment configuration as Kustomize YAML, with environment-specific overlays.

**Expected Outcomes**
- `deploy/base` contains: `ServiceAccount`; `Deployment` + `Service` for `api` and for `web`; `ConfigMap` (non-secret settings: Cloudant database names, public URL/host, cookie settings, log level); one `Route`; `NetworkPolicy`; `kustomization.yaml` with common labels.
- Secret handling: the Cloudant URL/credentials and the session secret are consumed from a `Secret` via `secretKeyRef`; the repo ships only a template/example (`secret.example.yaml`, excluded from the kustomization) so no real secrets are committed. Overlay uses `secretGenerator` from a git-ignored env file or documents `oc create secret`.
- `Route`: TLS edge termination, insecure traffic redirected to HTTPS, path-based routing (`/api` and `/mcp` → api service, `/` → web service) on one host. Since a single OpenShift `Route` targets one service, implement this with one Route per path on the same host (verify against OpenShift Route docs during implementation).
- Pod specs: `restricted-v2`-compatible `securityContext` (runAsNonRoot, no privilege escalation, drop ALL capabilities, read-only root filesystem, seccomp `RuntimeDefault`), resource requests/limits, liveness/readiness/startup probes (API health endpoint, nginx health path), `POD_IP` env from the Downward API for bind address, `emptyDir` mounts for any writable paths, at least 2 replicas for the API and web with anti-affinity or topology spread.
- `NetworkPolicy`: default deny ingress; allow ingress to web/api only from the OpenShift router namespace; allow egress from API to DNS and to the external Cloudant host over 443.
- `deploy/overlays/dev` and `deploy/overlays/prod`: image names/tags via the Kustomize `images` transformer, replica counts, resources, route host, and config differences.
- `kustomize build` (or `oc kustomize`) for each overlay succeeds and validates; `oc apply -k` instructions documented.

**Todo List**
1. Check OpenShift docs (Route path-based routing, restricted-v2 SCC, Kustomize support in `oc`) via `search_ibm_docs`/web search to confirm exact fields.
2. Write base manifests (ServiceAccount, ConfigMap, Deployments, Services, Routes, NetworkPolicies, kustomization).
3. Write dev and prod overlays and the secret template.
4. Run `kustomize build` for each overlay and validate with `kubectl apply --dry-run=client` or `kubeconform` if available.
5. Document deployment steps (create secret, set image refs, `oc apply -k`, verify route, register MCP URL) in the README.

**Relevant Context:** `deploy/base`, `deploy/overlays/*`; images from sub-task 8; env var names from sub-task 2.
**Status:** `[x] completed`

### 10. watsonx Orchestrate agent and toolkit deployment
**Intent:** Provide an agent in watsonx Orchestrate SaaS that manages the user's todos through the deployed ToDo MCP server, plus reproducible deployment assets.

**Expected Outcomes**
- `orchestrate/` folder in the repo with: connection definition, remote MCP toolkit YAML (`kind: mcp`, `transport: streamable_http`, `server_url: https://<route-host>/mcp`, `tools: ["*"]`), native agent YAML, and a deploy script/README.
- The API token is held in a watsonx Orchestrate connection (never committed); the agent acts on the todos of the user who created that token.
- The agent can list (with sorting), create, update, complete and delete todos by natural language; instructions tell it to confirm before deleting and to ask for missing titles/dates.
- Agent is imported and deployed to the target SaaS environment and verified end to end in the chat UI against the OpenShift-hosted MCP server.

**Todo List**
1. Check current ADK docs (v2.x: `orchestrate toolkits add` vs `toolkits import -f`, connection kinds for remote MCP — the docs list `key_value` while an IBM example uses `bearer`, agent YAML fields, `agent style`) and pick the verified combination; confirm how the connection credential is sent as the `Authorization: Bearer` header to the MCP server.
2. Write connection setup script using the ADK CLI (`orchestrate connections add/configure/set-credentials` for `draft` and `live`), reading the token from an environment variable, not from a file in git.
3. Write toolkit YAML for the remote MCP server and import it; verify all five todo tools are discovered.
4. Write the agent YAML (name, description, `llm`, `style`, instructions, `tools` using the `toolkit_name:tool_name` naming, `memory_enabled` left default) and import and deploy it with `orchestrate agents import` and `orchestrate agents deploy`.
5. Document the SaaS environment activation (`orchestrate env add/activate` with the instance URL and API key supplied by the user via environment variable) and the redeploy rule (agents using a toolkit must be redeployed after toolkit changes).
6. Manual test script: create, list sorted by due date, complete, delete a todo via the agent; check results in the web UI.

**Relevant Context:** `orchestrate/`; MCP tool names and the Route host from sub-tasks 7 and 9. The repo's `.bob/skills/watsonx-orchestrate/` directory is empty, so rely on the ADK documentation (https://developer.watson-orchestrate.ibm.com) and `search_ibm_docs`/web search.
**Status:** `[x] completed`

### 11. Admin role, default admin bootstrap and admin interface
**Intent:** Give the operator a protected, read-only overview of usage (users and per-user todo statistics) without exposing todo content.

**Expected Outcomes**
- Users have a `role` (`user` or `admin`). Sign-up always creates `user`; there is no API path that creates or promotes an admin.
- On first startup, if no admin exists, the server creates one default admin (email/login name from `ADMIN_EMAIL`, a non-secret ConfigMap value) with a random password from a CSPRNG, stored only as an argon2 hash in Cloudant.
- The generated password is written once to a Kubernetes Secret (`todo-admin-initial`) in the app namespace via the in-cluster API. It is never logged. The operator reads it with `oc get secret`, logs in, and deletes the Secret afterwards.
- The admin must change the password at first login (flag `mustChangePassword`), after which normal use is allowed. A change-password endpoint and screen exist for all users.
- `GET /api/admin/stats` returns: total number of users, and per user: total todos, done todos, open todos, overdue todos (open and `dueDate` before now, UTC). Only a valid admin session may call it. API tokens (MCP) can never reach it. Non-admins get 403, unauthenticated requests get 401.
- The SPA shows an "Administration" page (Carbon summary tiles for total users, plus a sortable Carbon `DataTable` with columns user, total, done, open, overdue) and a header link that is visible only to the admin. The route guard also checks the role, and the real protection is server-side.
- The admin account is a dedicated operator account: it is excluded from the user statistics.

**Todo List**
1. Add the `role` and `mustChangePassword` fields to the user document and session context. Enforce the role on the server in an `adminOnly` hook for `/api/admin/*`, never trusting the client.
2. Implement an idempotent admin bootstrap on startup: a deterministic admin document `_id` so concurrent replicas cannot create two admins (409 means another replica won, so skip). The winner generates the password, writes the Kubernetes Secret, and if writing the Secret fails it removes the admin document and fails startup with a non-secret error. The password is never logged or returned by any API.
3. Add a small Kubernetes API client for creating the Secret (in-cluster service account token and CA, HTTPS). Make the target Secret name and namespace configurable. When not running in a cluster (local dev), write the one-time password to a git-ignored local file with mode 0600 instead.
4. Implement `POST /api/auth/change-password` (requires current password, minimum length policy, invalidates other sessions) and enforce `mustChangePassword` so every other endpoint returns 403 until the password is changed.
5. Implement the stats service: aggregate todos per `userId` by status. Prefer a Cloudant MapReduce view (grouped by `userId`, with done and open counts) plus an indexed query for open todos whose `dueDate` is before now (overdue depends on the current time, so it cannot be fully precomputed). Join with the users list for display names. Page through results with limits. Decide the exact view/index design during implementation and verify against the Cloudant docs.
6. Build the admin REST endpoint, the Administration page in the SPA (Carbon tiles and `DataTable`), the role-aware header and side-nav link and route guard, and the change-password screen. The page is responsive: summary tiles stack on phones, and the per-user table is either horizontally scrollable inside its own container (not the page) or rendered as stacked per-user cards on phones.
7. Kustomize additions (in `deploy/base`): a `Role` and `RoleBinding` for the API service account that allows only `create` and `get` on `secrets` in the app namespace. Note: Kubernetes cannot restrict `create` by resource name, so keep this Role namespace-scoped and minimal; mount no other permissions. Document this trade-off.
8. Tests: bootstrap creates exactly one admin, with a concurrent-start race simulated against the fake repository. Registration can never produce an admin. Non-admin and token requests to `/api/admin/*` are rejected. The stats counts for done, open and overdue are correct, including due-date boundaries. Forced password change is enforced. The password never appears in logs or API responses.

**Relevant Context:** `server/src/auth`, `server/src/services`, `server/src/routes/admin.ts`, `web/src/features/admin`, `deploy/base`; depends on sub-tasks 2, 3, 5 and 9 (RBAC objects).
**Status:** `[x] completed`

### 12. Build pipeline, test strategy and local plus OpenShift test environments
**Intent:** Make the whole system buildable and testable in three repeatable ways: unit/integration tests on a developer machine, a full local stack with containers, and a real OpenShift deployment with in-cluster builds.

**Expected Outcomes**
- **Device coverage tests:** the Playwright suite runs as multiple projects: desktop Chromium (1280 px), a tablet profile (for example iPad-class, portrait and landscape), and a phone profile (for example iPhone- and Pixel-class, 320 to 430 px), plus WebKit for Safari behavior. Checks per profile: no horizontal page scroll, hamburger/`SideNav` appears below `lg`, todo create/edit/complete/sort and token creation work by touch interaction, touch targets meet 44x44 px, and axe accessibility checks pass in light and dark theme. A manual checklist covers real devices (iOS Safari, Android Chrome) against the local stack over the LAN and against the OpenShift Route.
- **Test layers** (all runnable by one root command each): unit tests (service, auth, stats, schemas, with in-memory repository fakes), API integration tests (Fastify `inject`, against fake and against a real CouchDB), MCP tests (real MCP client against the Streamable HTTP endpoint), web component tests (Vitest and React Testing Library, theme toggle and sort flows), and end-to-end browser tests (Playwright, covering sign-up, login, todo CRUD, sorting, theme toggle, token creation, admin page access for admin versus normal user).
- **Local full stack:** a `podman compose` file (or `podman kube play` equivalent) that starts a CouchDB container (Cloudant-compatible API used as local stand-in for the external Cloudant), the API image and the web image, wired the same way as in the cluster (same-origin `/api` and `/mcp` via the nginx container). One command to start, seed a test user, run the smoke tests, and tear down. Local-only credentials are generated per run and kept in a git-ignored `.env`.
- **In-cluster builds:** Kustomize-managed `ImageStream` and `BuildConfig` objects (Docker strategy using the `server/Containerfile` and `web/Containerfile` from sub-task 8, output to the internal registry) in `deploy/build/`. Source comes from the Git repo (`contextDir`, branch, optional source-clone Secret) or from a binary upload with `oc start-build --from-dir` for uncommitted local changes. Deployments pick up new images via ImageStream triggers (`image.openshift.io/triggers` annotation) so a finished build rolls out automatically in `dev`; `prod` pins an image by digest or tag via the overlay.
- **Makefile (or npm scripts) with the single entry points:** `make test` (unit, integration, web), `make e2e-local` (compose stack plus Playwright), `make images` (podman build for both images), `make deploy-dev` (create or update the Secret from a local env file, `oc apply -k deploy/overlays/dev`, `oc start-build` for both BuildConfigs and wait with `--follow`), `make smoke-openshift` (runs the smoke tests against the Route URL), `make undeploy-dev`.
- **OpenShift test overlay:** `deploy/overlays/dev` runs against the real external Cloudant service (preferably with a separate database prefix, for example `todo_dev_`) so test data never touches production data. An optional `deploy/overlays/test-local-db` adds a CouchDB `StatefulSet` in the namespace for fully self-contained cluster tests, and it is not used in `prod`.
- **Smoke test script** (`scripts/smoke.sh` or a Playwright project) that takes a base URL and verifies: web served, `/api/health`, sign-up and login, create/sort/complete/delete todo, MCP `tools/list` and a tool call with a freshly created token, admin endpoint denied for a normal user (403). The same script runs against `http://localhost:<port>` and against the OpenShift Route URL.
- **CI-ready** (no pipeline defined): all commands are non-interactive and exit non-zero on failure, so any CI can call them later. Tekton or GitHub Actions pipelines remain a non-goal.

**Todo List**
1. Define the test pyramid and wire the tools (Vitest for server and web, Playwright for end-to-end, an MCP client from the official SDK for MCP tests) with coverage reporting; verify latest stable versions.
2. Add the CouchDB-backed integration test project: it is skipped unless `COUCHDB_URL` is set, and it creates uniquely named throwaway databases per run. Confirm the Cloudant SDK works against CouchDB (basic auth, Mango indexes, MapReduce views) and document any differences from real Cloudant (for example IAM auth, Cloudant-only features), keeping the code limited to the common feature set.
3. Write the compose stack (CouchDB with health check, API, web) using the images from sub-task 8, with non-root users and ports bound to `127.0.0.1` only.
4. Write the smoke test and the Playwright end-to-end suite; run them against the compose stack.
5. Write `deploy/build/` (ImageStreams, BuildConfigs, optional webhook disabled by default) and include it in the `dev` overlay; verify the build pods can reach the npm registry and `registry.redhat.io` (cluster-wide proxy or mirror settings), and document needed pull Secrets.
6. Add ImageStream triggers to the Deployments in the `dev` overlay; pin digests/tags in `prod`.
7. Write the Makefile/scripts above including `deploy-dev` (secret creation from a git-ignored env file, never printing secret values), `smoke-openshift` (route host lookup via `oc get route`) and `undeploy-dev`.
8. Add the optional `test-local-db` overlay with CouchDB (Red Hat-approved or official image per security rules, credentials from a Secret, PVC for data).
9. Validate: `make test`, `make images`, `make e2e-local` pass locally; `kustomize build` for all overlays succeeds; `make deploy-dev` followed by `make smoke-openshift` passes on a real OpenShift cluster (requires cluster access, to be confirmed with the user at that time).
10. Document all three test paths (unit/integration, local stack, OpenShift) in the README with prerequisites (Node LTS, podman, `oc`, `kustomize`, access to a cluster and to Cloudant).

**Relevant Context:** `Makefile`, `compose.yaml`, `scripts/`, `e2e/`, `deploy/build/`, `deploy/overlays/*`; images from sub-task 8; Kustomize base from sub-task 9; endpoints from sub-tasks 3, 4, 7, 11.
**Status:** `[x] completed`

### 13. Hardening, end-to-end verification and documentation
**Intent:** Confirm the whole system works and complies with security rules.

**Expected Outcomes**
- Admin flow verified: operator reads the generated admin password from the Secret, logs in, is forced to change it, sees correct user and todo statistics, and a normal user cannot reach the admin page or API.
- Full flow verified: register → login → create/edit/delete/complete todos → sort → toggle theme → create token → agent manages todos via MCP, including through the watsonx Orchestrate agent against the OpenShift-hosted `/mcp` Route.
- Lint, typecheck, tests, builds, image builds, Kustomize builds and `npm audit` pass with no new warnings.

**Todo List**
1. Add an end-to-end smoke test (API + MCP) and a manual UI checklist for both themes and for phone, tablet and desktop widths (including real-device check on iOS Safari and Android Chrome).
2. Review security checklist: bind addresses, cookie flags, CSRF, rate limits, input validation, error responses, log content, image users, no committed secrets, TLS to Cloudant.
3. Finalize README (local setup, env vars, Cloudant requirements, image builds, OpenShift deployment, MCP configuration).

**Relevant Context:** whole repo; project security rules.
**Status:** `[x] completed`

## Open Items to Confirm During Implementation
- **Real-device testing on the local stack:** the compose stack binds to `127.0.0.1` per the security rules, so a phone on the LAN cannot reach it. Use browser device emulation (Playwright profiles) for automated checks, and test real devices against the OpenShift Route (HTTPS). If LAN testing of the local stack is wanted, it needs an explicit, documented exception to the loopback-binding rule. Decide when sub-task 12 is implemented.
- **In-cluster build prerequisites:** build pods need access to the npm registry and `registry.redhat.io` (cluster pull secret, proxy or mirror). Confirm the cluster allows this; otherwise use binary builds from locally built artifacts or a mirror registry. Also confirm whether the OpenShift cluster is reachable for the test deployment (cluster URL, namespace, login) and whether a separate Cloudant database prefix may be used for dev.
- **CouchDB as local stand-in:** local tests use CouchDB instead of Cloudant. The code is limited to features common to both. The final verification on OpenShift runs against the real Cloudant service.
- **Public MCP exposure:** watsonx Orchestrate SaaS must reach `/mcp` from the internet. The Route stays TLS-only with a publicly trusted certificate (cluster default or custom), every request needs a valid bearer token, and rate limiting applies. No self-signed certificate (the SaaS runtime will not trust it). If the cluster's egress/ingress is IP-restricted, allow-list the Orchestrate SaaS source addresses.
- **Connection kind for the bearer token:** the ADK docs describe `key_value` connections for remote MCP, while an IBM example uses a `bearer` connection (`-k bearer`). Verify which one results in an `Authorization: Bearer` header; if neither does, fall back to accepting the token in a documented custom header on the MCP endpoint.
- **Admin password delivery:** the pod log is not used because project security rules forbid logging secrets. The Secret approach needs a namespace-scoped Role with `create`/`get` on Secrets for the API service account (see sub-task 11). An alternative without that permission is a one-time Kubernetes `Job` that creates the Secret. Say so if you prefer that.
- **Admin identity:** the default admin login name comes from the `ADMIN_EMAIL` ConfigMap value. If you want a specific name (for example `admin`), set it there. Overdue is evaluated in UTC.
- **Per-user scope:** one API token = one user's todos, so the agent in Orchestrate operates on a single user's data. Per-end-user identity (OBO/SSO) is out of scope.
- **nginx bind address:** the security rule forbids binding to all interfaces. Standard nginx images listen on `0.0.0.0:8080`. Plan: template the `listen` directive with the pod IP at container start (envsubst), and rely on `NetworkPolicy` as defense in depth. If the Red Hat nginx image cannot do this cleanly, document the exception.
- **Cloudant permissions:** whether the provided credentials may create databases/indexes; if not, the bootstrap only verifies and the README lists the required setup.
- **Cloudant auth type:** IAM API key vs. basic auth; both are supported via env, whichever your instance uses.
- **Image registry:** which registry the cluster pulls from (internal OpenShift registry or external); drives the `images` entries in the overlays.

## Notes for Implementation
- Process sub-tasks in order, one at a time; update each **Status** here when done and append any context needed by the next sub-task.
- Sub-tasks 5–6 depend on 3–4; sub-task 7 depends on 2 and 3; sub-task 9 depends on 8 and the env var names from 2; sub-task 10 depends on 7 and a deployed, publicly reachable `/mcp` Route from 9 (and a valid API token created in the UI); sub-task 11 depends on 2, 3, 5 and the Kustomize base from 9; sub-task 12 depends on 8 and 9 and is best done after 7 and 11 so the smoke and end-to-end tests cover MCP and admin (simple unit-test tooling from step 1 of sub-task 12 can be set up earlier, in sub-task 1).
