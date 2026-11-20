# ToDo Web Application — Implementation Plan

## Top-Level Overview

**Goal:** A multi-user ToDo single-page web application built with Carbon Design System, with light/dark theming, login, todo CRUD, sortable lists, and an MCP endpoint so an agent can manage a user's todos remotely. Runs on an OpenShift cluster, deployed with Kustomize, and stores all data in an external IBM Cloudant database.

**Confirmed decisions**
- Repo state: greenfield (workspace contains only `.bob/` config and `.vscode/`).
- Language: TypeScript everywhere, npm-workspaces monorepo.
- Frontend (`web/`): React + Vite + TypeScript, `@carbon/react`, Carbon themes (white / g100) toggled via the `Theme` component. Served as static files by an nginx-based image. **As built:** the nginx config also reverse-proxies `/api/` and `/mcp` to the `todo-api` Service (see Deployment).
- Backend (`server/`): Node.js + TypeScript, Fastify (REST API), official MCP TypeScript SDK, official Cloudant SDK (`@ibm-cloud/cloudant`).
- Database: **external IBM Cloudant / Apache CouchDB** (NoSQL, HTTPS). Service URL and credentials are provided by the environment; nothing is hardcoded. Holds users, sessions, API tokens and todos. No local database.
- Auth: self-service sign-up with email + password, argon2 hashing, httpOnly session cookie (SameSite, Secure). Sessions are stored in Cloudant so multiple replicas share state.
- MCP: Streamable HTTP endpoint (`/mcp`) on the same backend, authenticated with per-user API tokens created in the UI (stored hashed). The agent only sees its owner's todos.
- Todo fields: title (required), description, creation date (system set), due date (optional), completed flag.
- List sorting: by due date, creation date, or title, ascending/descending. Todos without a due date sort last when sorting by due date.
- Agent: a native watsonx Orchestrate agent (YAML, ADK) that uses the ToDo MCP server as a remote MCP toolkit (`kind: mcp`, `transport: streamable_http`, spec field `url`, not `server_url`). The bearer token is held in a `bearer` / `team` connection (`todo_mcp_connection`) referenced from the toolkit via `connections:`. Target environment: **watsonx Orchestrate SaaS**, so the `/mcp` Route must be reachable from the internet over HTTPS (TLS edge termination, bearer token required on every request). Sub-task 10.
- Administration: a built-in `admin` role. One default admin account is created on first startup with a **randomly generated password** (no password in code or git). The generated password is delivered once through a Kubernetes Secret, not the pod log (project rule: never log secrets). Only the admin can open the admin interface and call `/api/admin/*`. The admin interface is read-only and shows the number of users and, per user, the total, done, open and overdue todo counts. It shows no todo content. Sub-task 11.
- Devices: **responsive web only** (no PWA, no offline mode, no native app). One SPA adapts to phone, tablet and desktop using the Carbon 2x Grid breakpoints (sm, md, lg, xlg, max), touch-friendly targets, and a mobile navigation. All screens (auth, todos, settings, admin) are responsive. Sub-tasks 5, 6, 7, 11, 12.
- Build and test: three test paths — fast local tests (Vitest), a local container stack (podman compose with CouchDB as Cloudant stand-in), and an OpenShift deployment. **As built:** the primary OpenShift path pulls prebuilt `linux/amd64` images from **quay.io** (`make push-quay`, pull secret `quay-pull`, `make deploy-dev`). In-cluster builds (`deploy/build/` ImageStreams + Docker-strategy BuildConfigs from the Git repo) exist but are a separate, optional kustomization that is **not** included in the dev overlay and has no ImageStream triggers. Sub-task 12.

- Deployment: two container images (nginx web, Node API+MCP), two Deployments, two Services, **three OpenShift Routes** (`todo-app-web` path `/`, `todo-app-api` path `/api`, `todo-app-mcp` path `/mcp`) with no explicit `host`, so OpenShift generates a **separate hostname per Route** and path-based routing on one host does not happen at the Route level. Same-origin routing for the SPA is therefore done by nginx (`/api/` and `/mcp` proxied to `todo-api:8080`). The `todo-app-mcp` Route host is the public MCP URL used by watsonx Orchestrate. All manifests are Kustomize YAML (base + overlays).

**Non-goals:** OAuth/OIDC, multi-tenant admin UI, password reset by email, todo sharing between users, provisioning the Cloudant instance itself, CI/CD pipeline definitions.

**Conventions (from project security rules)**
- Latest stable, actively maintained versions of all packages and base images; verify at install time and commit the lock file; run `npm audit`.
- Container images: Red Hat UBI 9 images from `registry.access.redhat.com` (`ubi9/nodejs-22` build stage, `ubi9/nodejs-22-minimal` API runtime, `ubi9/nginx-124` web runtime; tags are `latest`, not pinned), non-root user (1001, GID 0), read-only root filesystem, all capabilities dropped. Runtime stage is pinned to `linux/amd64`. Use the OpenShift `restricted-v2` SCC (no fixed UID).
- Binding: API in the cluster binds to the pod IP via the Downward API (`HOST` from `status.podIP`); locally the default is `127.0.0.1`. **Exceptions as built:** the `server/Containerfile` image default is `HOST=0.0.0.0` and `compose.yaml` sets `HOST=0.0.0.0` inside the container (host ports are published on `127.0.0.1` only); nginx listens on `8080` (all interfaces) with no envsubst templating. `NetworkPolicy` is the compensating control. See Open Items.
- TLS 1.2+ everywhere: Route uses edge termination with HTTP redirected to HTTPS; Cloudant calls use HTTPS with certificate validation on.
- No hardcoded secrets. Cloudant URL/credentials and the session/cookie secret come from a Kubernetes Secret (never committed; repo contains only an example/template). `.gitignore` excludes `.env` and secret files.
- Validate all input server-side with schemas; generic error messages; never log secrets, passwords or tokens.
- Use Carbon components, tokens and Grid; no inline styles; accessible labels.
- Mobile-first responsive design: build for the smallest breakpoint first and enhance upward. No fixed pixel widths, no horizontal page scrolling at 320 px width, interactive targets at least 44x44 px on touch devices (WCAG 2.2 target size), text zoom and pinch zoom not disabled, support portrait and landscape, respect `prefers-reduced-motion`.

## Architecture

Diagram is in the chat (kept out of this file by convention). Summary:
- Browser SPA is served by the nginx pod and calls `/api` with the session cookie (same origin through nginx, which proxies `/api/` to the API Service, so no CORS).
- Remote agent calls `/mcp` with `Authorization: Bearer <api token>` through the dedicated `todo-app-mcp` Route host (nginx also proxies `/mcp` for same-origin use).
- REST handlers and MCP tools call one shared todo service layer (`server/src/services`) that enforces per-user ownership.
- The service layer talks to a small repository interface implemented with the Cloudant SDK.

**Cloudant data model (design decisions)**
- One database with typed documents, or one database per type (`users`, `sessions`, `api_tokens`, `todos`) — plan uses one database per type for simpler indexes; names are configurable via env vars.
- Document `_id` is deterministic where uniqueness is needed: users use `_id` derived from the normalized email so duplicate registration yields a 409 conflict (Cloudant has no unique constraints); API tokens and sessions use the hash of the token as `_id` for O(1) lookup.
- Todos: `_id` generated (UUID), `userId`, `title`, `description`, `createdAt`, `dueDate` (nullable), `completed`. A Mango index on `userId` supports listing; a second index on `userId` + `revoked` supports API-token listing.
- Sorting is done in the service layer after fetching the user's todos (Mango cannot sort case-insensitively or place missing due dates last). The only protection against large result sets is a fixed Mango `limit: 1000`; there is no paging.
- Cloudant has no TTL: expired sessions are rejected on read and lazily deleted (7-day session lifetime); there is no opportunistic purge of stale sessions.
- Updates read the document and write it back with its `_rev`; a 409 is not specially mapped to a retry (surfaces as a generic error).
- A `MemoryAppRepository` is used instead of Cloudant when `NODE_ENV=test`, `USE_MEMORY_DB=true`, or no Cloudant credentials are configured (fast local dev and tests).

## Sub-Tasks

### 1. Project scaffolding and tooling
**Intent:** Establish the monorepo, tooling and security hygiene so later tasks are isolated and reviewable.

**Expected Outcomes**
- `npm install` and `npm run dev` start both the server and the web app locally.
- Lint, typecheck and test scripts exist and pass on an empty baseline.

**Todo List**
1. Create root `package.json` with npm workspaces (`web`, `server`), root scripts (`dev`, `build`, `lint`, `typecheck`, `test`).
2. Add shared `tsconfig` base, ESLint + Prettier config. **As built:** `tsconfig.base.json` only; ESLint and Prettier were not added, and the `lint` script is `tsc --noEmit` (same as `typecheck`).
3. Add `.gitignore` (node_modules, dist, `.env`, secret files), `.env.example` (Cloudant URL, auth settings, db names, bind host/port, session secret placeholders), minimal `README.md`. **As built:** `.gitignore` now excludes `node_modules`, `dist`, `coverage`, `.env`/`.env.*` (except `.env.example`), venvs, logs, the admin password files and `.env.openshift`; tracked `dist/` files were removed from the index.
4. Scaffold `server/` (Fastify, TypeScript, test runner) with a health endpoint; bind host and port from env, default `127.0.0.1`.
5. Scaffold `web/` (Vite React TS) with Vite dev proxy of `/api` and `/mcp` to the server.
6. Verify latest stable dependency versions, commit lock file, run `npm audit`.

**Relevant Context:** Greenfield; no existing files to follow.
**Status:** `[~] completed with deviations` (no ESLint/Prettier; see Implementation Reconciliation)

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

**Relevant Context:** `server/src/config.ts`, `server/src/db`, `server/src/services`. Not implemented from the todo list: Cloudant request timeouts, the optional CouchDB integration test.
**Status:** `[~] completed with deviations`

### 3. Authentication and session management
**Intent:** Let users register, log in/out, and protect the API, with state shared across replicas.

**Expected Outcomes**
- `POST /api/auth/register`, `/login`, `/logout`, `GET /api/auth/me` work with an httpOnly session cookie.
- Unauthenticated requests to todo endpoints return 401.
- Duplicate email registration returns a conflict handled without user enumeration leaks in login.

**Todo List**
1. Implement argon2 password hashing and constant-time verification.
2. Implement Cloudant-backed sessions (random token from a CSPRNG, stored hashed, expiry, cookie with `httpOnly`, `sameSite`, `secure` in production).
3. Add auth hook and CSRF protection suitable for cookie auth (SameSite plus an anti-CSRF check for state-changing requests). **As built:** cookie `session_token` with `httpOnly`, `sameSite: 'lax'`, `secure` from `COOKIE_SECURE`; **no anti-CSRF token or Origin check** (SameSite=Lax only).
4. Add rate limiting on login/register (per-pod in-memory is acceptable; documented as a limitation across replicas) and generic error responses. **As built:** limits on `/api/auth/register` (10/min) and `/login` (15/min) only.
5. Tests: register, duplicate email, wrong password, session expiry, logout, protected route. **As built:** session-expiry test is missing.

**Relevant Context:** `server/src/auth`, `server/src/routes/auth.routes.ts`, Fastify cookie/rate-limit plugins.
**Status:** `[~] completed with deviations` (CSRF defence is an Origin check on state-changing `/api` requests, not a token)

### 4. Todo REST API
**Intent:** Expose todo management to the SPA.

**Expected Outcomes**
- `GET/POST /api/todos`, `GET/PATCH/DELETE /api/todos/:id` return validated JSON, scoped to the logged-in user.
- `GET /api/todos?sortBy=dueDate|createdAt|title&order=asc|desc` returns sorted results.

**Todo List**
1. Implement routes on top of the todo service with schema validation and 400/404 handling that does not leak internals.
2. Support toggling `completed` via PATCH.
3. Integration tests covering auth required, validation errors, cross-user access (must 404), and sorting.

**Relevant Context:** `server/src/routes/todo.routes.ts`.
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

**Relevant Context:** `web/src` (as built: `pages/`, `components/`, `context/`, `api/`; there is no `features/` folder); Carbon accessibility practices (labels, focus, keyboard). Deviations: many `style={{...}}` inline styles remain in the pages (violates the no-inline-styles convention); only one component test exists (`ThemeToggle`), so route guard and shell breakpoint tests are missing; `theme-color` is updated at runtime by `ThemeContext` from a static `#161616` default.
**Status:** `[~] completed with deviations`

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

**Relevant Context:** `web/src/pages/TodosPage.tsx`; sort allowlist must match server. As built: Carbon `Select` (not `Dropdown`) for sort field and direction; due date uses `TextInput type="date"` (native touch-friendly picker, not Carbon `DatePicker`); desktop `Table` plus stacked `Tile` cards for small screens; delete confirmation modal; optimistic completion toggle. Missing: create/edit/delete/sort component tests, verified 320/768/1280 px passes, full-screen phone modal.
**Status:** `[~] completed with deviations`

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
3. Mount the Streamable HTTP transport in stateless mode in the Fastify app with bearer-token auth, rate limiting and no secrets in logs. **As built:** stateless (new `McpServer` + `StreamableHTTPServerTransport` per request, `reply.hijack()`), bearer auth, `authorization`/`cookie` redacted in logs; **no rate limiting on `/mcp`**.
3a. Every MCP tool must have a clear description (watsonx Orchestrate fails to import tools without one). Avoid the characters `&&`, `||`, `$(`, `>` and `<` in tool descriptions (known watsonx Orchestrate tool-discovery issue DT471337). Keep tool names simple (letters, digits, underscore).
3b. `tools/list` must respond well within 30 seconds (the ADK waits up to 30 seconds during import).
4. Add Settings page in the SPA for token management (responsive: token list as stacked cards on phones, table on larger screens; the one-time token display has a copy button that works on touch devices).
5. Tests: tool calls via an MCP client, ownership isolation between two users, revoked token rejected. **As built:** `server/tests/mcp.test.ts` covers token create/list/revoke and 401 for missing/invalid tokens via Fastify `inject`; there is no real MCP-SDK client test of `tools/list` or tool calls, and no two-user isolation test at the MCP level.
6. Document how to register the server in an agent config (Route URL + bearer header) in the README.

**Relevant Context:** `server/src/mcp/index.ts`, `server/src/routes/mcp.routes.ts`, `server/src/routes/token.routes.ts` (REST path `/api/tokens`), `server/src/services/token.service.ts`; `.bob/mcp.json` shows the expected streamable-http client config shape (`type`, `url`, `headers`).
**Status:** `[~] completed with deviations`

### 8. Container images
**Intent:** Produce hardened, OpenShift-compatible images for the web and API components.

**Expected Outcomes**
- `server/Containerfile`: multi-stage build, `registry.access.redhat.com/ubi9/nodejs-22-minimal` runtime, runs as non-root (1001), listens on 8080, bind host from env (image default `0.0.0.0`, overridden by the Downward API in the cluster).
- `web/Containerfile`: multi-stage build (Node build stage → `registry.access.redhat.com/ubi9/nginx-124` runtime), runs as non-root on 8080, works with arbitrary UID (restricted-v2 SCC), writable paths limited to `/tmp` (emptyDir).
- nginx config serves the SPA with history-fallback to `index.html`, long-cache for static assets, no-cache for `index.html`, `/healthz` probe endpoint, reverse proxy for `/api/` and `/mcp` to `todo-api:8080`, and security headers (CSP with `style-src 'unsafe-inline'` for Carbon, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).
- `.containerignore` files keep secrets and `node_modules` out of the build context.

**Todo List**
1. Verify current Red Hat registry image names/tags for Node.js and nginx (UBI 9/10 as current) and pin versions.
2. Write both Containerfiles and nginx config.
3. Build both images locally (podman/docker) and run them to verify they start as non-root with a read-only root filesystem.

**Relevant Context:** `server/Containerfile`, `web/Containerfile`, `web/nginx/`.
**Status:** `[x] completed` (base images use `latest`, not pinned versions)

### 9. Kustomize manifests for OpenShift
**Intent:** Provide all deployment configuration as Kustomize YAML, with environment-specific overlays.

**Expected Outcomes**
- `deploy/base` contains: two `ServiceAccount`s (`todo-app-api`, `todo-app-web`); `Deployment` + `Service` for `api` (`todo-api`) and for `web` (`todo-web`); `ConfigMap` `todo-app-config` (database names, cookie settings, log level, `ADMIN_EMAIL`, `ADMIN_SECRET_NAME`; no public host); three `Route`s; `NetworkPolicy` objects; `Role`/`RoleBinding` (`rbac.yaml`); `kustomization.yaml` with common labels.
- Secret handling: the Cloudant URL/credentials and the session secret are consumed from a `Secret` via `secretKeyRef`; the repo ships only a template/example (`secret.example.yaml`, excluded from the kustomization) so no real secrets are committed. Overlay uses `secretGenerator` from a git-ignored env file or documents `oc create secret`.
- `Route`: TLS edge termination, insecure traffic redirected to HTTPS. **As built:** one Route per path (`/`, `/api`, `/mcp`) but without a shared `host`, so each gets its own generated hostname; the SPA relies on nginx proxying for same-origin `/api` and `/mcp`. Setting a common `spec.host` in the overlays would restore single-host path routing (not done).
- Pod specs: `restricted-v2`-compatible `securityContext` (runAsNonRoot, no privilege escalation, drop ALL capabilities, read-only root filesystem, seccomp `RuntimeDefault`), resource requests/limits, liveness/readiness probes on both and a startup probe on the API only (API `/api/health`, nginx `/healthz`), `HOST` from `status.podIP` for the API (the web pod does not bind to the pod IP), `emptyDir` on `/tmp`, 2 replicas for API and web. **As built:** `topologySpreadConstraints` on `kubernetes.io/hostname` (`ScheduleAnyway`) for both Deployments.
- `NetworkPolicy`: default deny ingress; allow ingress to all todo-app pods on 8080 from the OpenShift ingress namespace (`network.openshift.io/policy-group: ingress`); allow web → api on 8080 (needed for the nginx proxy); API egress allowed to DNS (53/5353, any namespace) and to **any IP** on 443 and 6443 (Cloudant and the Kubernetes API), which is broader than "only the Cloudant host".
- `deploy/overlays/dev` and `deploy/overlays/prod`: both target namespace `olaf-hahn-at-dev`; images from `quay.io/olaf_hahn_at/todoapp-bob-oh/todo-{api,web}` via the `images` transformer (dev `latest`, prod `v1.0.0`, no digest pin); dev uses `LOG_LEVEL=debug` and the `todo_dev_*` database names; prod sets `LOG_LEVEL=warn` and 3 replicas. Neither overlay sets a route host.
- `kustomize build` (or `oc kustomize`) for each overlay succeeds and validates; `oc apply -k` instructions documented.

**Todo List**
1. Check OpenShift docs (Route path-based routing, restricted-v2 SCC, Kustomize support in `oc`) via `search_ibm_docs`/web search to confirm exact fields.
2. Write base manifests (ServiceAccount, ConfigMap, Deployments, Services, Routes, NetworkPolicies, kustomization).
3. Write dev and prod overlays and the secret template.
4. Run `kustomize build` for each overlay and validate with `kubectl apply --dry-run=client` or `kubeconform` if available.
5. Document deployment steps (create secret, set image refs, `oc apply -k`, verify route, register MCP URL) in the README.

**Relevant Context:** `deploy/base`, `deploy/overlays/*`; images from sub-task 8; env var names from sub-task 2.
**Status:** `[~] completed with deviations` (`kustomize build` succeeds for dev, prod and `deploy/build`)

### 10. watsonx Orchestrate agent and toolkit deployment
**Intent:** Provide an agent in watsonx Orchestrate SaaS that manages the user's todos through the deployed ToDo MCP server, plus reproducible deployment assets.

**Expected Outcomes**
- `orchestrate/` folder in the repo with: connection definition (`connections/todo_mcp_connection.yaml`, `kind: bearer`, `type: team`, for `draft` and `live`), remote MCP toolkit YAML (`toolkit.yaml`: `kind: mcp`, `name: todo_mcp_toolkit`, `transport: streamable_http`, `url: https://<mcp-route-host>/mcp`, `tools: ["*"]`, `connections: [todo_mcp_connection]`; ADK 2.19.1 rejects `server_url` and `headers`), native agent YAML (`agents/todo_assistant.yaml`, `llm: groq/openai/gpt-oss-120b`, `style: react_core`), and `deploy.sh` plus README. The Route host is committed in the YAML files (it is not a secret).
- The API token is held in a watsonx Orchestrate connection (never committed); the agent acts on the todos of the user who created that token.
- The agent can list (with sorting), create, update, complete and delete todos by natural language; instructions tell it to confirm before deleting and to ask for missing titles/dates.
- Agent is imported and deployed to the target SaaS environment and verified end to end in the chat UI against the OpenShift-hosted MCP server.

**Todo List**
1. Check current ADK docs (v2.x: `orchestrate toolkits add` vs `toolkits import -f`, connection kinds for remote MCP — the docs list `key_value` while an IBM example uses `bearer`, agent YAML fields, `agent style`) and pick the verified combination; confirm how the connection credential is sent as the `Authorization: Bearer` header to the MCP server. **Resolved:** `bearer` / `team` connection, referenced from the toolkit YAML; confirm the header on the first real run.
2. Write connection setup script using the ADK CLI (`orchestrate connections import` then `set-credentials -a todo_mcp_connection --env draft|live --token`) reading the token from `TODO_MCP_API_TOKEN`, not from a file in git. **As built** in `orchestrate/deploy.sh` (imports connection, sets credentials, re-imports toolkit with `-a`, imports and deploys the agent).
3. Write toolkit YAML for the remote MCP server and import it; verify all five todo tools are discovered.
4. Write the agent YAML (name, description, `llm`, `style`, instructions, `tools` using the `toolkit_name:tool_name` naming, `memory_enabled` left default) and import and deploy it with `orchestrate agents import` and `orchestrate agents deploy`.
5. Document the SaaS environment activation (`orchestrate env add/activate` with the instance URL and API key supplied by the user via environment variable) and the redeploy rule (agents using a toolkit must be redeployed after toolkit changes).
6. Manual test script: create, list sorted by due date, complete, delete a todo via the agent; check results in the web UI.

**Relevant Context:** `orchestrate/`; MCP tool names and the Route host from sub-tasks 7 and 9. ADK docs: https://developer.watson-orchestrate.ibm.com (the repo now also ships `.bob/skills/watsonx-orchestrate/`).
**Status:** `[-] in progress` — files are corrected and the connection was imported into the `todoapp-wxo-oh` environment, but the toolkit, agent import/deploy and end-to-end chat test (todo 3, 4, 6) have not been run because they need a user-created `TODO_MCP_API_TOKEN`.

### 11. Admin role, default admin bootstrap and admin interface
**Intent:** Give the operator a protected, read-only overview of usage (users and per-user todo statistics) without exposing todo content.

**Expected Outcomes**
- Users have a `role` (`user` or `admin`). Sign-up always creates `user`; there is no API path that creates or promotes an admin.
- On first startup, if no admin exists, the server creates one default admin (email/login name from `ADMIN_EMAIL`, a non-secret ConfigMap value) with a random password from a CSPRNG, stored only as an argon2 hash in Cloudant.
- The generated password is written once to a Kubernetes Secret (`todo-admin-initial`, keys `admin-email` and `admin-initial-password`) in the app namespace via the in-cluster API. It is never logged. The operator reads it with `oc get secret`, logs in, and deletes the Secret afterwards.
- The admin must change the password at first login (flag `mustChangePassword`), after which normal use is allowed. A change-password endpoint and screen exist for all users.
- `GET /api/admin/stats` returns: total number of users, and per user: total todos, done todos, open todos, overdue todos (open and `dueDate` before now, UTC). Only a valid admin session may call it. API tokens (MCP) can never reach it. Non-admins get 403, unauthenticated requests get 401.
- The SPA shows an "Administration" page (Carbon summary tiles for total users, plus a sortable Carbon `DataTable` with columns user, total, done, open, overdue) and a header link that is visible only to the admin. The route guard also checks the role, and the real protection is server-side.
- The admin account is a dedicated operator account: it is excluded from the user statistics.

**Todo List**
1. Add the `role` and `mustChangePassword` fields to the user document and session context. Enforce the role on the server in an `adminOnly` hook for `/api/admin/*`, never trusting the client.
2. Implement an idempotent admin bootstrap on startup: a deterministic admin document `_id` so concurrent replicas cannot create two admins (409 means another replica won, so skip). The winner generates the password, writes the Kubernetes Secret, and if writing the Secret fails it removes the admin document and fails startup with a non-secret error. The password is never logged or returned by any API. **As built** in `AdminService.bootstrapAdmin()` (an HTTP 409 on Secret creation is treated as success, so an existing `todo-admin-initial` Secret is not overwritten).
3. Add a small Kubernetes API client for creating the Secret (in-cluster service account token and CA, HTTPS). Make the target Secret name and namespace configurable (`ADMIN_SECRET_NAME`, `KUBERNETES_NAMESPACE`). When not running in a cluster (local dev), write the one-time password to `todo-admin-initial.txt` in the working directory (git-ignored, mode 0600) instead.
4. Implement `POST /api/auth/change-password` (requires current password, minimum length policy, invalidates other sessions) and enforce `mustChangePassword` so every other endpoint returns 403 until the password is changed.
5. Implement the stats service: aggregate todos per `userId` by status. Prefer a Cloudant MapReduce view (grouped by `userId`, with done and open counts) plus an indexed query for open todos whose `dueDate` is before now (overdue depends on the current time, so it cannot be fully precomputed). Join with the users list for display names. Page through results with limits. Decide the exact view/index design during implementation and verify against the Cloudant docs. **As built:** no view; `AdminService.getStats()` loads all users and all todos (`_all_docs` with `include_docs`) and aggregates in memory. This does not scale and has no paging. A MapReduce view remains a future improvement.
6. Build the admin REST endpoint, the Administration page in the SPA (Carbon tiles and `DataTable`), the role-aware header and side-nav link and route guard, and the change-password screen. The page is responsive: summary tiles stack on phones, and the per-user table is either horizontally scrollable inside its own container (not the page) or rendered as stacked per-user cards on phones.
7. Kustomize additions (in `deploy/base`): a `Role` and `RoleBinding` for the API service account that allows only `create` and `get` on `secrets` in the app namespace. Note: Kubernetes cannot restrict `create` by resource name, so keep this Role namespace-scoped and minimal; mount no other permissions. Document this trade-off.
8. Tests: bootstrap creates exactly one admin, with a concurrent-start race simulated against the fake repository. Registration can never produce an admin. Non-admin and token requests to `/api/admin/*` are rejected. The stats counts for done, open and overdue are correct, including due-date boundaries. Forced password change is enforced. The password never appears in logs or API responses.

**Relevant Context:** `server/src/auth`, `server/src/services/admin.service.ts`, `server/src/routes/admin.routes.ts`, `web/src/pages/AdminPage.tsx`, `deploy/base/rbac.yaml`; depends on sub-tasks 2, 3, 5 and 9 (RBAC objects). Test coverage gaps: concurrent-start race, registration never creating an admin, token requests to `/api/admin/*`, overdue due-date boundaries, forced password change, and password-not-in-logs checks are not tested (`server/tests/admin.test.ts` has 3 tests).
**Status:** `[~] completed with deviations`

### 12. Build pipeline, test strategy and local plus OpenShift test environments
**Intent:** Make the whole system buildable and testable in three repeatable ways: unit/integration tests on a developer machine, a full local stack with containers, and a real OpenShift deployment with in-cluster builds.

**Expected Outcomes**
> **Reconciliation note (as built):** this sub-task was implemented as a reduced scope. Delivered: Vitest unit/API tests (13 server tests, 1 web test), `compose.yaml` (CouchDB, API, web), `scripts/smoke.sh`, `Makefile` targets `install dev build test lint typecheck images images-openshift push-quay compose-up compose-down smoke-local quay-pull-secret deploy-dev smoke-openshift undeploy-dev`. **Not delivered:** Playwright/device/axe tests and the manual device checklist, `make e2e-local`, a real MCP client test, the CouchDB integration project (`COUCHDB_URL`), coverage reporting, ImageStream triggers, the `test-local-db` overlay, and a smoke step that calls MCP `tools/list` with the new token (step 8 only checks 401 without a token). The expected outcomes below remain the target for the open items.

- **Device coverage tests:** the Playwright suite runs as multiple projects: desktop Chromium (1280 px), a tablet profile (for example iPad-class, portrait and landscape), and a phone profile (for example iPhone- and Pixel-class, 320 to 430 px), plus WebKit for Safari behavior. Checks per profile: no horizontal page scroll, hamburger/`SideNav` appears below `lg`, todo create/edit/complete/sort and token creation work by touch interaction, touch targets meet 44x44 px, and axe accessibility checks pass in light and dark theme. A manual checklist covers real devices (iOS Safari, Android Chrome) against the local stack over the LAN and against the OpenShift Route.
- **Test layers** (all runnable by one root command each): unit tests (service, auth, stats, schemas, with in-memory repository fakes), API integration tests (Fastify `inject`, against fake and against a real CouchDB), MCP tests (real MCP client against the Streamable HTTP endpoint), web component tests (Vitest and React Testing Library, theme toggle and sort flows), and end-to-end browser tests (Playwright, covering sign-up, login, todo CRUD, sorting, theme toggle, token creation, admin page access for admin versus normal user).
- **Local full stack:** a `podman compose` file (or `podman kube play` equivalent) that starts a CouchDB container (Cloudant-compatible API used as local stand-in for the external Cloudant), the API image and the web image, wired the same way as in the cluster (same-origin `/api` and `/mcp` via the nginx container). One command to start, seed a test user, run the smoke tests, and tear down. Local-only credentials are generated per run and kept in a git-ignored `.env`. **As built:** `compose.yaml` hardcodes local-only CouchDB and session credentials (`admin`/`password`), publishes ports on `127.0.0.1` only (API `8080`, web `3000`, CouchDB `5984`), and uses `docker.io/library/couchdb:3.4.2` (not a Red Hat image). The web container's nginx proxies to `todo-api:8080`, which matches the compose service name `api` only if a network alias `todo-api` is added; verify before relying on the compose web path.
- **In-cluster builds:** Kustomize-managed `ImageStream` and `BuildConfig` objects (Docker strategy using the `server/Containerfile` and `web/Containerfile` from sub-task 8, output to the internal registry) in `deploy/build/`. Source comes from the Git repo (`https://github.com/O-Hahn/todoapp-bob-oh.git`, branch `main`) or from a binary upload with `oc start-build --from-dir` for uncommitted local changes. **As built:** `deploy/build/` is a standalone kustomization (not part of the dev overlay), the BuildConfigs have no `contextDir`, source secret or triggers, and the Deployments reference `todo-api:latest` / `todo-web:latest`, which the overlays rewrite to quay.io images. The quay.io flow is the one actually used.
- **Makefile (or npm scripts) with the single entry points:** `make test` (unit, integration, web), `make images` (podman build for both images), `make images-openshift` / `make push-quay` (amd64 images tagged for quay.io, tags git SHA and `latest`, `QUAY_ORG` default `olaf_hahn_at/todoapp-bob-oh`), `make quay-pull-secret` (needs `QUAY_USER` and `QUAY_PASSWORD`, links the secret to both service accounts), `make deploy-dev` (create or update `todo-app-secret` from `.env.openshift`, falling back to `.env.example`, then `oc apply -k deploy/overlays/dev`; namespace `olaf-hahn-at-dev` is hardcoded), `make smoke-openshift` (reads the `todo-app-web` Route host and runs `scripts/smoke.sh`), `make undeploy-dev`. `make e2e-local` does not exist; `make compose-up`, `make compose-down` and `make smoke-local` replace it.
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
**Status:** `[~] partially completed` (see reconciliation note above)

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
**Status:** `[~] partially completed` — README finalized and security review done in part; open items: `npm audit` reports 0 vulnerabilities after upgrading `vitest` 5, `zod` 4 and `react-router-dom` 7; no Playwright suite, no manual device checklist, and the watsonx Orchestrate end-to-end run is pending.

## Implementation Reconciliation (as built, 2026-11-20)

Differences between the original plan and the code, and gaps still open. Items marked **Gap** are not yet fixed; items marked **Fixed** were corrected after the review.

| Area | Plan | As built |
|---|---|---|
| Routing | One host, path routes | Three Routes with separate generated hosts; nginx proxies `/api/` and `/mcp` |
| Images | `registry.redhat.io`, pinned | `registry.access.redhat.com` UBI 9, `latest`, amd64, published to quay.io |
| Builds | In-cluster BuildConfigs in dev | Quay push flow; BuildConfigs optional and standalone |
| Lint | ESLint + Prettier | `tsc --noEmit` only |
| Admin stats | MapReduce view | In-memory aggregation over all docs |
| Repository | Cloudant only | Cloudant plus in-memory fallback |
| MCP toolkit | `server_url` + headers | `url` + `bearer` team connection |
| Frontend structure | `web/src/features/*` | `web/src/pages`, `components`, `context`, `api` |
| Sort / date inputs | `Dropdown`, `DatePicker` | `Select`, native `type="date"` |
| Tests | Unit, API, MCP client, component, Playwright | 17 server and 1 web Vitest tests (no Playwright) |
| CSRF | Anti-CSRF measures | `Origin` header must match the request host on non-GET `/api` calls; `SameSite=Lax` cookie |
| Egress | Restricted egress | Any IP, but only TCP 443/6443 and DNS (NetworkPolicy cannot match hostnames; accepted limitation, documented in the manifest) |

**Fixed after review:**
- **Fixed:** `.gitignore` excludes `dist/` and `.env`; tracked `dist/` files removed from the index.
- **Fixed:** `Origin` check against CSRF, per-token rate limit on `/mcp` (300/min), 15 s Cloudant request timeout; covered by `server/tests/security.test.ts` and an MCP `tools/list` and `tools/call` test.
- **Fixed:** topology spread on both Deployments; egress limitation documented in `deploy/base/networkpolicy.yaml`.
- **Fixed:** all inline `style` props moved to classes in `web/src/styles/index.scss`.
- **Fixed:** `npm audit` is clean (`vitest` 5.1.1, `zod` 4.6.7, `react-router-dom` 7.18.6).
- **Fixed:** `make deploy-dev` requires `.env.openshift`; `compose.yaml` `api` service has the alias `todo-api` used by nginx.

**Remaining:**
- **Pending:** run `orchestrate/deploy.sh` with a real token and verify the agent end to end (sub-task 10).
- **Open:** no ESLint/Prettier, no Playwright suite, no manual device checklist; images use `latest` tags; `/mcp` rate limit is per instance (in-memory), not shared across the 2 replicas.
- **Not verified here:** the new images were not rebuilt or redeployed to OpenShift, and the compose stack was not started.

## Open Items to Confirm During Implementation
- **Real-device testing on the local stack:** the compose stack binds to `127.0.0.1` per the security rules, so a phone on the LAN cannot reach it. Use browser device emulation (Playwright profiles) for automated checks, and test real devices against the OpenShift Route (HTTPS). If LAN testing of the local stack is wanted, it needs an explicit, documented exception to the loopback-binding rule. Decide when sub-task 12 is implemented.
- **In-cluster build prerequisites:** build pods need access to the npm registry and `registry.redhat.io` (cluster pull secret, proxy or mirror). Confirm the cluster allows this; otherwise use binary builds from locally built artifacts or a mirror registry. Also confirm whether the OpenShift cluster is reachable for the test deployment (cluster URL, namespace, login) and whether a separate Cloudant database prefix may be used for dev.
- **CouchDB as local stand-in:** local tests use CouchDB instead of Cloudant. The code is limited to features common to both. The final verification on OpenShift runs against the real Cloudant service.
- **Public MCP exposure:** watsonx Orchestrate SaaS must reach `/mcp` from the internet. The Route stays TLS-only with a publicly trusted certificate (cluster default or custom), every request needs a valid bearer token, and rate limiting applies. No self-signed certificate (the SaaS runtime will not trust it). If the cluster's egress/ingress is IP-restricted, allow-list the Orchestrate SaaS source addresses.
- **Connection kind for the bearer token:** **Decided:** use a `bearer` / `team` connection referenced from the toolkit. Still to verify on the first real run that the MCP server receives `Authorization: Bearer <token>`; if not, fall back to accepting the token in a documented custom header on the MCP endpoint.
- **Admin password delivery:** the pod log is not used because project security rules forbid logging secrets. The Secret approach needs a namespace-scoped Role with `create`/`get` on Secrets for the API service account (see sub-task 11). An alternative without that permission is a one-time Kubernetes `Job` that creates the Secret. Say so if you prefer that.
- **Admin identity:** the default admin login name comes from the `ADMIN_EMAIL` ConfigMap value. If you want a specific name (for example `admin`), set it there. Overdue is evaluated in UTC.
- **Per-user scope:** one API token = one user's todos, so the agent in Orchestrate operates on a single user's data. Per-end-user identity (OBO/SSO) is out of scope.
- **nginx bind address:** the security rule forbids binding to all interfaces. **Decided (exception):** nginx listens on `8080` on all interfaces; no envsubst templating was implemented. `NetworkPolicy` (default deny, router-only ingress) is the compensating control. The same exception applies to the API image default `HOST=0.0.0.0` and the compose stack.
- **Cloudant permissions:** whether the provided credentials may create databases/indexes; if not, the bootstrap only verifies and the README lists the required setup.
- **Cloudant auth type:** IAM API key vs. basic auth; both are supported via env, whichever your instance uses.
- **Image registry:** **Decided:** external quay.io (`quay.io/olaf_hahn_at/todoapp-bob-oh`), pulled with the `quay-pull` secret; internal registry is only used by the optional `deploy/build/` flow.

## Notes for Implementation
- Process sub-tasks in order, one at a time; update each **Status** here when done and append any context needed by the next sub-task.
- Sub-tasks 5–6 depend on 3–4; sub-task 7 depends on 2 and 3; sub-task 9 depends on 8 and the env var names from 2; sub-task 10 depends on 7 and a deployed, publicly reachable `/mcp` Route from 9 (and a valid API token created in the UI); sub-task 11 depends on 2, 3, 5 and the Kustomize base from 9; sub-task 12 depends on 8 and 9 and is best done after 7 and 11 so the smoke and end-to-end tests cover MCP and admin (simple unit-test tooling from step 1 of sub-task 12 can be set up earlier, in sub-task 1).
