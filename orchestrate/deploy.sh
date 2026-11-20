#!/usr/bin/env bash
set -euo pipefail

# watsonx Orchestrate deployment for the ToDo agent & MCP toolkit.
# Requires: an active `orchestrate` environment (orchestrate env activate <name>)
# and TODO_MCP_API_TOKEN (generate it in the ToDo App "Settings & Agent Tokens" page).

cd "$(dirname "$0")"

if [[ -z "${TODO_MCP_API_TOKEN:-}" ]]; then
  echo "Error: TODO_MCP_API_TOKEN environment variable is not set."
  echo "  export TODO_MCP_API_TOKEN='todo_mcp_...'"
  exit 1
fi

CONN=todo_mcp_connection

echo "1. Importing connection (draft + live, bearer)..."
orchestrate connections import -f connections/todo_mcp_connection.yaml

echo "2. Setting bearer token on the connection..."
for env in draft live; do
  orchestrate connections set-credentials -a "$CONN" --env "$env" --token "$TODO_MCP_API_TOKEN"
done

echo "3. Importing MCP toolkit..."
orchestrate toolkits remove -n todo_mcp_toolkit >/dev/null 2>&1 || true
orchestrate toolkits import -f toolkit.yaml -a "$CONN"

echo "4. Importing agent..."
orchestrate agents import -f agents/todo_assistant.yaml

echo "5. Deploying agent to live..."
orchestrate agents deploy -n todo_assistant

echo "=== Deployment complete ==="
echo "  orchestrate chat ask -n todo_assistant 'List my open tasks'"
