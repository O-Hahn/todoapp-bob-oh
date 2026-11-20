# watsonx Orchestrate Integration for ToDo Application

This directory contains the Agent Development Kit (ADK) artifacts to connect an autonomous watsonx Orchestrate agent to your OpenShift-deployed ToDo application via the Streamable HTTP Model Context Protocol (`/mcp`) endpoint.

## Prerequisites

1. Active watsonx Orchestrate environment:
   ```bash
   orchestrate env add -n my-saas -u https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/<INSTANCE_ID>
   orchestrate env activate my-saas --api-key "$IBM_CLOUD_API_KEY"
   ```
2. Your OpenShift ToDo App `/mcp` Route URL (e.g. `https://<your-route>/mcp`).
3. An API Token created from your ToDo App user interface:
   - Log into the ToDo Web App.
   - Go to **Settings & Agent Tokens**.
   - Click **Generate New Token**, enter a label (e.g. `watsonx Orchestrate`), and copy the token.

## Deployment Steps

1. Export your API token (the route URL is set in `toolkit.yaml` and `connections/todo_mcp_connection.yaml`):
   ```bash
   export TODO_MCP_API_TOKEN="todo_mcp_your_generated_token_here"
   ```

2. Run the deployment script:
   ```bash
   bash orchestrate/deploy.sh
   ```

3. Test your agent:
   ```bash
   orchestrate chat ask -n todo_assistant "List my tasks sorted by due date"
   ```

## Available MCP Tools

The agent automatically discovers all 5 tools exposed by the `/mcp` endpoint:
- `list_todos`: List tasks with sorting (`dueDate`, `createdAt`, `title`) and direction (`asc`, `desc`).
- `get_todo`: Retrieve details for a specific todo by ID.
- `create_todo`: Create a new task with title, optional description, and optional due date.
- `update_todo`: Update an existing task (title, description, due date, completed flag).
- `delete_todo`: Delete a task (agent instructions mandate confirmation before executing).
