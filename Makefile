.PHONY: help install dev build test lint typecheck images compose-up compose-down smoke-local deploy-dev smoke-openshift undeploy-dev

help:
	@echo "IBM ToDo Application — Make Targets:"
	@echo "  make install        - Install all dependencies in workspaces"
	@echo "  make dev            - Run backend and frontend dev servers concurrently"
	@echo "  make build          - Build server and web application"
	@echo "  make test           - Run all unit and integration tests"
	@echo "  make lint           - Run lint and typechecks"
	@echo "  make images         - Build container images locally"
	@echo "  make compose-up     - Start local stack (CouchDB, API, Web)"
	@echo "  make compose-down   - Stop local container stack"
	@echo "  make smoke-local    - Run smoke tests against local server"
	@echo "  make deploy-dev     - Deploy dev overlay to OpenShift and trigger builds"
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

compose-up:
	podman compose up -d || docker compose up -d

compose-down:
	podman compose down -v || docker compose down -v

smoke-local:
	bash scripts/smoke.sh http://127.0.0.1:8080

deploy-dev:
	@if [ ! -f .env.openshift ]; then \
		echo "Creating secret from .env.example..."; \
		oc create secret generic todo-app-secret --from-env-file=.env.example --dry-run=client -o yaml | oc apply -f - -n olaf-hahn-at-dev || true; \
	else \
		oc create secret generic todo-app-secret --from-env-file=.env.openshift --dry-run=client -o yaml | oc apply -f - -n olaf-hahn-at-dev; \
	fi
	oc apply -k deploy/overlays/dev
	oc start-build todo-api-build --from-dir=. -n olaf-hahn-at-dev --follow
	oc start-build todo-web-build --from-dir=. -n olaf-hahn-at-dev --follow

smoke-openshift:
	@ROUTE_HOST=$$(oc get route todo-app-web -n olaf-hahn-at-dev -o jsonpath='{.spec.host}'); \
	bash scripts/smoke.sh "https://$$ROUTE_HOST"

undeploy-dev:
	oc delete -k deploy/overlays/dev --ignore-not-found
