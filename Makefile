.PHONY: help install dev build test lint typecheck images images-openshift push-quay check-quay-org compose-up compose-down smoke-local deploy-dev smoke-openshift undeploy-dev

# Quay.io registry settings (override on the command line or via the environment)
#   make push-quay QUAY_ORG=my-org
#   make push-quay IMAGE_TAG=v1.0.0   (tag used by the prod overlay)
# Authenticate first with: podman login quay.io   (credentials are never stored in this repo)
QUAY_REGISTRY ?= quay.io
QUAY_ORG ?= olaf_hahn_at/todoapp-bob-oh
IMAGE_TAG ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo latest)
OPENSHIFT_PLATFORM ?= linux/amd64

help:
	@echo "IBM ToDo Application — Make Targets:"
	@echo "  make install        - Install all dependencies in workspaces"
	@echo "  make dev            - Run backend and frontend dev servers concurrently"
	@echo "  make build          - Build server and web application"
	@echo "  make test           - Run all unit and integration tests"
	@echo "  make lint           - Run lint and typechecks"
	@echo "  make images         - Build container images locally"
	@echo "  make images-openshift - Build $(OPENSHIFT_PLATFORM) images tagged for quay.io (QUAY_ORG=<org>)"
	@echo "  make push-quay      - Build and push images to quay.io/<QUAY_ORG> (tags: git sha + latest)"
	@echo "  make compose-up     - Start local stack (CouchDB, API, Web)"
	@echo "  make compose-down   - Stop local container stack"
	@echo "  make smoke-local    - Run smoke tests against local server"
	@echo "  make quay-pull-secret - Create quay.io pull secret in OpenShift (needs QUAY_USER, QUAY_PASSWORD env vars)"
	@echo "  make deploy-dev     - Deploy dev overlay to OpenShift (images pulled from quay.io)"
	@echo "  make smoke-openshift- Run smoke tests against OpenShift Route URL"
	@echo "  make undeploy-dev   - Remove dev deployment from OpenShift"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

test:
	npm test

lint:
	npm run lint

typecheck:
	npm run typecheck

images:
	podman build -t todo-api:latest -f server/Containerfile .
	podman build -t todo-web:latest -f web/Containerfile .

images-openshift: check-quay-org
	podman build --platform $(OPENSHIFT_PLATFORM) \
		-t $(QUAY_REGISTRY)/$(QUAY_ORG)/todo-api:$(IMAGE_TAG) \
		-t $(QUAY_REGISTRY)/$(QUAY_ORG)/todo-api:latest \
		-f server/Containerfile .
	podman build --platform $(OPENSHIFT_PLATFORM) \
		-t $(QUAY_REGISTRY)/$(QUAY_ORG)/todo-web:$(IMAGE_TAG) \
		-t $(QUAY_REGISTRY)/$(QUAY_ORG)/todo-web:latest \
		-f web/Containerfile .

push-quay: images-openshift
	podman push $(QUAY_REGISTRY)/$(QUAY_ORG)/todo-api:$(IMAGE_TAG)
	podman push $(QUAY_REGISTRY)/$(QUAY_ORG)/todo-api:latest
	podman push $(QUAY_REGISTRY)/$(QUAY_ORG)/todo-web:$(IMAGE_TAG)
	podman push $(QUAY_REGISTRY)/$(QUAY_ORG)/todo-web:latest
	@echo "Pushed $(QUAY_REGISTRY)/$(QUAY_ORG)/todo-{api,web}:$(IMAGE_TAG) and :latest"

check-quay-org:
	@if [ -z "$(QUAY_ORG)" ]; then \
		echo "ERROR: QUAY_ORG is not set. Usage: make push-quay QUAY_ORG=<your-quay-namespace>"; \
		exit 1; \
	fi

compose-up:
	podman compose up -d || docker compose up -d

compose-down:
	podman compose down -v || docker compose down -v

smoke-local:
	bash scripts/smoke.sh http://127.0.0.1:8080

# Credentials come from the environment only (use a Quay robot account token), never from this repo.
quay-pull-secret:
	@if [ -z "$(QUAY_USER)" ] || [ -z "$(QUAY_PASSWORD)" ]; then \
		echo "ERROR: set QUAY_USER and QUAY_PASSWORD (robot account) in the environment"; \
		exit 1; \
	fi
	oc create secret docker-registry quay-pull --docker-server=$(QUAY_REGISTRY) \
		--docker-username="$(QUAY_USER)" --docker-password="$(QUAY_PASSWORD)" \
		--dry-run=client -o yaml | oc apply -f - -n olaf-hahn-at-dev
	oc secrets link todo-app-api quay-pull --for=pull -n olaf-hahn-at-dev
	oc secrets link todo-app-web quay-pull --for=pull -n olaf-hahn-at-dev

deploy-dev:
	@if [ ! -f .env.openshift ]; then \
		echo "ERROR: .env.openshift not found. Copy .env.example to .env.openshift and fill in real Cloudant and session values."; \
		exit 1; \
	fi
	oc create secret generic todo-app-secret --from-env-file=.env.openshift --dry-run=client -o yaml | oc apply -f - -n olaf-hahn-at-dev
	oc apply -k deploy/overlays/dev

smoke-openshift:
	@ROUTE_HOST=$$(oc get route todo-app-web -n olaf-hahn-at-dev -o jsonpath='{.spec.host}'); \
	bash scripts/smoke.sh "https://$$ROUTE_HOST"

undeploy-dev:
	oc delete -k deploy/overlays/dev --ignore-not-found
