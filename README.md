# IBM ToDo Web Application & watsonx Orchestrate MCP Service

A modern, multi-user ToDo single-page web application built with the **IBM Carbon Design System (v11)** and TypeScript, backed by **IBM Cloudant / Apache CouchDB**, running on **Red Hat OpenShift**, and featuring a native **Model Context Protocol (MCP)** endpoint enabling autonomous **watsonx Orchestrate** AI agents to manage user tasks remotely.

---

## Key Features

- **Frontend (`web/`):** React 18 + Vite + TypeScript with `@carbon/react`. Light (`white`) and Dark (`g100`) themes with OS preference detection, persisted in `localStorage`. Fully responsive across mobile, tablet, and desktop breakpoints.
- **Backend (`server/`):** Node.js + TypeScript with Fastify. Dual REST API and Streamable HTTP MCP server (`/mcp`).
- **Database:** External **IBM Cloudant NoSQL Database** (or Apache CouchDB). Sessions, users, API tokens, and todos stored with deterministic IDs and ownership isolation.
- **Security & Auth:** Self-service registration, `argon2` password hashing, signed `httpOnly` SameSite session cookies, rate-limiting, and zero hardcoded secrets.
- **Administration:** Default admin account bootstrap on first startup with a cryptographically secure random password delivered via Kubernetes Secret (`todo-admin-initial`) or a local mode `0600` file. Enforced initial password change. Operator statistics overview (users and task metrics without content exposure).
- **Agent Integration:** Streamable HTTP `/mcp` transport authenticated with per-user Bearer tokens. Watsonx Orchestrate ADK agent definitions and toolkits ready for SaaS deployment.
- **Container & OpenShift Hardening:** Multi-stage builds based on Red Hat UBI 9 minimal images, non-root user execution (`USER 1001`), read-only root filesystem, drop `ALL` capabilities, seccomp `RuntimeDefault`, and OpenShift `restricted-v2` SCC compliance.

---

## Project Structure

```
.
├── Makefile                      # Standardized make targets (dev, build, test, deploy)
├── compose.yaml                  # Local container stack (CouchDB + API + Web)
├── package.json                  # Root npm workspace configuration
├── tsconfig.base.json            # Base TypeScript configuration
├── .env.example                  # Environment variable template
├── Bob-Artefacts/
│   └── todo-app-plan.md          # Architectural implementation plan
├── server/                       # Fastify backend & MCP server
│   ├── Containerfile             # Multi-stage UBI 9 Node.js image
│   ├── package.json
│   ├── src/
│   │   ├── app.ts                # Fastify app configuration & plugins
│   │   ├── config.ts             # Zod-validated environment config
│   │   ├── auth/                 # Password hashing, crypto & auth plugin
│   │   ├── db/                   # Cloudant & in-memory repository layer
│   │   ├── mcp/                  # MCP Server & Streamable HTTP transport
│   │   ├── routes/               # Auth, Todos, Tokens, Admin, MCP routes
│   │   ├── schemas/              # Zod validation schemas
│   │   ├── services/             # Auth, Todo, Token, and Admin services
│   │   └── types/                # Domain types & interfaces
│   └── tests/                    # Vitest unit & integration test suites
├── web/                          # React + Carbon frontend
│   ├── Containerfile             # Multi-stage UBI 9 Node -> nginx image
│   ├── package.json
│   ├── nginx/nginx.conf          # Hardened nginx SPA configuration
│   ├── src/
│   │   ├── App.tsx               # App shell & routing
│   │   ├── api/                  # API client, todo, token & admin services
│   │   ├── components/           # Carbon AppHeader, RouteGuard
│   │   ├── context/              # ThemeContext (white/g100), AuthContext
│   │   ├── pages/                # Todos, Settings, Admin, Login, Register, ChangePassword
│   │   └── styles/index.scss     # Carbon v11 styles & responsive mixins
│   └── tests/                    # Vitest & Testing Library component tests
├── deploy/                       # OpenShift Kustomize deployment manifests
│   ├── base/                     # Deployments, Services, Routes, RBAC, NetworkPolicy
│   ├── build/                    # OpenShift ImageStreams and BuildConfigs
│   ├── overlays/dev/             # Dev environment overlay
│   ├── overlays/prod/            # Production environment overlay
│   └── secret.example.yaml       # Template for Cloudant credentials Secret
├── orchestrate/                  # watsonx Orchestrate ADK agent & toolkit
│   ├── agents/                   # Native agent YAML (todo_assistant.yaml)
│   ├── connections/              # Connection definition
│   ├── toolkit.yaml              # Remote MCP toolkit definition
│   └── deploy.sh                 # Orchestrate CLI import & deploy script
└── scripts/
    └── smoke.sh                  # Automated end-to-end smoke test suite
```

---

## Getting Started

### Prerequisites

- **Node.js:** v22 LTS
- **npm:** v10+
- **Podman** or **Docker** (for container builds and local stack)
- **OpenShift CLI (`oc`)** & **Kustomize** (for cluster deployment)

### 1. Local Development (Fast In-Memory / Dev Server)

1. **Install dependencies:**
   ```bash
   make install
   ```

2. **Start dev servers (API on `:8080`, Web on `:3000` with dev proxy):**
   ```bash
   make dev
   ```

3. **Open browser:** `http://127.0.0.1:3000`
   - Self-register a new account at `/register`
   - Create, organize, sort, and complete your tasks
   - Switch themes with the Sun/Moon icon in the header

### 2. Running Automated Tests

Run the complete test suite across server and web workspaces:
```bash
make test
```

Run typechecking and linting:
```bash
make typecheck
make lint
```

### 3. Local Container Stack (CouchDB + API + Web)

To test the multi-container stack locally with CouchDB standing in for Cloudant:
```bash
# Start CouchDB, API, and Web containers
make compose-up

# Run automated smoke test against the local stack
make smoke-local

# Tear down local stack
make compose-down
```

---

## Make Targets

All common workflows are available through the [`Makefile`](Makefile). Run `make help` for a short summary.

### Development & Quality

| Target | Description |
| --- | --- |
| `make help` | Print the list of available targets. |
| `make install` | Install all npm dependencies for the `server` and `web` workspaces (`npm install`). |
| `make dev` | Start the backend (`:8080`) and frontend (`:3000`) dev servers concurrently (`npm run dev`). |
| `make build` | Build the server and web applications (`npm run build`). |
| `make test` | Run all unit and integration tests (`npm test`). |
| `make lint` | Run the linters (`npm run lint`). |
| `make typecheck` | Run the TypeScript type checks (`npm run typecheck`). |

### Container Images

| Target | Description |
| --- | --- |
| `make images` | Build the `todo-api:latest` and `todo-web:latest` images locally with Podman. |
| `make images-openshift` | Build `linux/amd64` images tagged for Quay (`<QUAY_REGISTRY>/<QUAY_ORG>/todo-{api,web}:<IMAGE_TAG>` and `:latest`). Fails if `QUAY_ORG` is empty. |
| `make push-quay` | Run `images-openshift`, then push both images (git SHA tag and `latest`) to Quay. Authenticate first with `podman login quay.io`. |
| `make check-quay-org` | Internal guard used by `images-openshift`; aborts with an error when `QUAY_ORG` is not set. |

### Local Container Stack

| Target | Description |
| --- | --- |
| `make compose-up` | Start the local stack (CouchDB, API, Web) in the background using `podman compose` (falls back to `docker compose`). |
| `make compose-down` | Stop the local stack and remove its volumes (`down -v`). |
| `make smoke-local` | Run `scripts/smoke.sh` against the local server at `http://127.0.0.1:8080`. |

### OpenShift Deployment

| Target | Description |
| --- | --- |
| `make quay-pull-secret` | Create the `quay-pull` image pull secret in the `olaf-hahn-at-dev` namespace and link it to the `todo-app-api` and `todo-app-web` service accounts. Requires `QUAY_USER` and `QUAY_PASSWORD` (a Quay robot account) in the environment. |
| `make deploy-dev` | Create the `todo-app-secret` Secret from `.env.openshift` and apply the `deploy/overlays/dev` Kustomize overlay. Copy `.env.example` to `.env.openshift` first. |
| `make smoke-openshift` | Look up the `todo-app-web` Route host and run `scripts/smoke.sh` against it over HTTPS. |
| `make undeploy-dev` | Delete everything created by the dev overlay (`oc delete -k deploy/overlays/dev`). |

### Configurable Variables

Override these on the command line or through the environment:

| Variable | Default | Description |
| --- | --- | --- |
| `QUAY_REGISTRY` | `quay.io` | Container registry host. |
| `QUAY_ORG` | `olaf_hahn_at/todoapp-bob-oh` | Quay namespace/repository path for the images. |
| `IMAGE_TAG` | short git SHA (or `latest`) | Tag applied in addition to `latest`; used by the prod overlay. |
| `OPENSHIFT_PLATFORM` | `linux/amd64` | Target platform for `images-openshift`. |
| `QUAY_USER` / `QUAY_PASSWORD` | _unset_ | Robot account credentials for `quay-pull-secret` (environment only, never stored in the repo). |

Example:
```bash
make push-quay QUAY_ORG=my-org IMAGE_TAG=v1.0.0
```

---

## Administrator Account & Statistics

On first startup, the server automatically bootstraps a default admin account with email set by `ADMIN_EMAIL` (default: `admin@example.com`) and a cryptographically secure random password.

- **In OpenShift:** The password is written directly to a Kubernetes Secret named `todo-admin-initial` in the application namespace via the in-cluster API. The operator retrieves it using:
  ```bash
  oc get secret todo-admin-initial -o jsonpath='{.data.admin-initial-password}' | base64 -d
  ```
- **In Local Development:** The password is saved to `todo-admin-initial.txt` with mode `0600`.
- **First Login:** The admin is forced to change their password on initial login (`/change-password`).
- **Administration Dashboard (`/admin`):** Displays overall KPI tiles (Total Users, Total Tasks, Done, Open, Overdue) and a per-user activity breakdown. **No todo titles or descriptions are accessible to the administrator.**

---

## Model Context Protocol (MCP) & watsonx Orchestrate

The application exposes a **Streamable HTTP MCP endpoint** at `/mcp` protected by per-user Bearer tokens.

### 1. Generating an API Token
1. Log into the ToDo Web App.
2. Go to **Settings & Agent Tokens** in the header.
3. Click **Generate New Token**, enter a label (e.g. `watsonx Orchestrate`), and copy the token.

### 2. Deploying the watsonx Orchestrate Agent
1. Activate your target Orchestrate environment:
   ```bash
   orchestrate env add -n my-saas -u https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/<INSTANCE_ID>
   orchestrate env activate my-saas --api-key "$IBM_CLOUD_API_KEY"
   ```
2. Export your token (the MCP Route URL is set in `orchestrate/toolkit.yaml` and `orchestrate/connections/todo_mcp_connection.yaml`):
   ```bash
   export TODO_MCP_API_TOKEN="todo_mcp_your_token_here"
   ```
3. Run the automated deployment script:
   ```bash
   bash orchestrate/deploy.sh
   ```
4. Chat with your agent:
   ```bash
   orchestrate chat ask -n todo_assistant "List my tasks sorted by due date"
   ```

### Available MCP Tools
- `list_todos`: List tasks with sorting (`dueDate`, `createdAt`, `title`) and direction (`asc`, `desc`).
- `get_todo`: Retrieve details for a specific todo by ID.
- `create_todo`: Create a new task with title, optional description, and ISO due date.
- `update_todo`: Update an existing task title, description, due date, or completed status.
- `delete_todo`: Delete a task (agent instructions require confirmation before executing).

---

## OpenShift Deployment (Kustomize)

> To provision the IBM Cloudant and watsonx Orchestrate instances with Terraform, see [`terraform/README.md`](terraform/README.md).

### 1. Create Secret for Cloudant Credentials
Create `todo-app-secret` in your target namespace with your external IBM Cloudant instance details:
```bash
oc create secret generic todo-app-secret \
  --from-literal=CLOUDANT_URL="https://your-cloudant-instance.cloud.ibm.com" \
  --from-literal=CLOUDANT_APIKEY="your-ibm-cloudant-iam-api-key" \
  --from-literal=SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" \
  -n olaf-hahn-at-dev
```

### 2. Deploy Dev Overlay
```bash
make deploy-dev
```

### 3. Verify Deployment
```bash
make smoke-openshift
```

---

## Security Compliance Summary

- **Container Images:** Red Hat UBI 9 minimal base images (`registry.access.redhat.com/ubi9/nodejs-22-minimal`, `registry.access.redhat.com/ubi9/nginx-124`).
- **Privilege Separation:** Non-root execution (`USER 1001`), `readOnlyRootFilesystem: true`, `allowPrivilegeEscalation: false`, capabilities dropped (`ALL`).
- **Network Security:** TLS 1.2+ edge termination on OpenShift Routes with HTTP-to-HTTPS redirect. No services bound to public interfaces. NetworkPolicies restrict ingress/egress.
- **Credential Hygiene:** Secrets stored in Kubernetes Secrets and injected via `secretKeyRef`. Argon2 password hashing. No secrets logged in logs or committed to git.
- **Input Validation:** Strict Zod schema validation on all incoming REST and MCP payloads.
