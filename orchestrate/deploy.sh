#!/usr/bin/env bash
set -euo pipefail

# watsonx Orchestrate Deployment Script for ToDo Agent & MCP Toolkit

echo "=== watsonx Orchestrate ToDo Agent Deployment ==="

if [[ -z "${TODO_MCP_API_TOKEN:-}" ]]; then
  echo "Error: TODO_MCP_API_TOKEN environment variable is not set."
  echo "Generate an API Token in the ToDo App Settings page and export it first:"
  echo "  export TODO_MCP_API_TOKEN='todo_mcp_...'"
  exit 1
fi

if [[ -z "${TODO_ROUTE_URL:-}" ]]; then
  echo "Notice: TODO_ROUTE_URL not set, using default from toolkit.yaml or enter URL:"
  echo "Example: export TODO_ROUTE_URL='https://todo-app-mcp-todo-app.apps.cluster.example.com/mcp'"
fi

echo "1. Adding/configuring remote connection..."
if [[ -n "${TODO_ROUTE_URL:-}" ]]; then
  # Update server URL in toolkit.yaml if provided
  sed -i.bak "s|server_url: .*|server_url: ${TODO_ROUTE_URL}|g" orchestrate/toolkit.yaml && rm -f orchestrate/toolkit.yaml.bak
fi

echo "2. Importing MCP Toolkit..."
orchestrate toolkits import -f orchestrate/toolkit.yaml || orchestrate toolkits add -f orchestrate/toolkit.yaml

echo "3. Importing native agent..."
orchestrate agents import -f orchestrate/agents/todo_assistant.yaml

echo "4. Deploying agent to live environment..."
orchestrate agents deploy -n todo_assistant

echo "=== Deployment Complete ==="
echo "You can now chat with your ToDo Assistant in watsonx Orchestrate UI or via CLI:"
echo "  orchestrate chat ask -n todo_assistant 'List my open tasks'"
