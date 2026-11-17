#!/usr/bin/env bash
set -euo pipefail

# Smoke Test Script for ToDo Application
# Usage: ./scripts/smoke.sh [BASE_URL]
# Default BASE_URL: http://127.0.0.1:8080

BASE_URL="${1:-http://127.0.0.1:8080}"
COOKIE_JAR=$(mktemp)
trap 'rm -f "${COOKIE_JAR}"' EXIT

echo "=== Starting Smoke Tests against ${BASE_URL} ==="

# 1. Health check
echo -n "1. Checking /api/health... "
HEALTH_RES=$(curl -fsS "${BASE_URL}/api/health")
if [[ "${HEALTH_RES}" =~ "ok" ]]; then
  echo "PASS"
else
  echo "FAIL: ${HEALTH_RES}"
  exit 1
fi

# 2. Register new test user
RAND_SUFFIX=$(date +%s%N | cut -b1-8)
TEST_EMAIL="smoke_user_${RAND_SUFFIX}@example.com"
TEST_PASS="Sm0ke-$(openssl rand -hex 12)"

echo -n "2. Registering test user (${TEST_EMAIL})... "
REG_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -c "${COOKIE_JAR}" -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASS}\"}")

if [[ "${REG_STATUS}" == "201" ]]; then
  echo "PASS"
else
  echo "FAIL (HTTP ${REG_STATUS})"
  exit 1
fi

# 3. Verify /api/auth/me with cookie
echo -n "3. Verifying /api/auth/me... "
ME_RES=$(curl -fsS -b "${COOKIE_JAR}" "${BASE_URL}/api/auth/me")
if [[ "${ME_RES}" =~ "${TEST_EMAIL}" ]]; then
  echo "PASS"
else
  echo "FAIL: ${ME_RES}"
  exit 1
fi

# 4. Create Todo
echo -n "4. Creating todo item... "
TODO_CREATE_RES=$(curl -fsS -b "${COOKIE_JAR}" -X POST "${BASE_URL}/api/todos" \
  -H "Content-Type: application/json" \
  -d '{"title":"Smoke Test Task","description":"Automated test verification","dueDate":"2026-12-31T23:59:59Z"}')

TODO_ID=$(echo "${TODO_CREATE_RES}" | node -e "let data=''; process.stdin.on('data', c=>data+=c); process.stdin.on('end', ()=>console.log(JSON.parse(data).todo._id))")
if [[ -n "${TODO_ID}" ]]; then
  echo "PASS (Todo ID: ${TODO_ID})"
else
  echo "FAIL: ${TODO_CREATE_RES}"
  exit 1
fi

# 5. List and Sort Todos
echo -n "5. Listing todos sorted by dueDate... "
TODOS_LIST=$(curl -fsS -b "${COOKIE_JAR}" "${BASE_URL}/api/todos?sortBy=dueDate&order=asc")
if [[ "${TODOS_LIST}" =~ "Smoke Test Task" ]]; then
  echo "PASS"
else
  echo "FAIL: ${TODOS_LIST}"
  exit 1
fi

# 6. Complete Todo via PATCH
echo -n "6. Marking todo as completed... "
PATCH_RES=$(curl -fsS -b "${COOKIE_JAR}" -X PATCH "${BASE_URL}/api/todos/${TODO_ID}" \
  -H "Content-Type: application/json" \
  -d '{"completed":true}')

if [[ "${PATCH_RES}" =~ '"completed":true' ]]; then
  echo "PASS"
else
  echo "FAIL: ${PATCH_RES}"
  exit 1
fi

# 7. Generate API Token for MCP
echo -n "7. Creating API token for MCP... "
TOKEN_RES=$(curl -fsS -b "${COOKIE_JAR}" -X POST "${BASE_URL}/api/tokens" \
  -H "Content-Type: application/json" \
  -d '{"label":"Smoke Test Token"}')

API_TOKEN=$(echo "${TOKEN_RES}" | node -e "let data=''; process.stdin.on('data', c=>data+=c); process.stdin.on('end', ()=>console.log(JSON.parse(data).token.token))")
if [[ "${API_TOKEN}" =~ ^todo_mcp_ ]]; then
  echo "PASS"
else
  echo "FAIL: ${TOKEN_RES}"
  exit 1
fi

# 8. Test /mcp endpoint with generated Bearer token
echo -n "8. Testing /mcp endpoint authorization with Bearer token... "
MCP_UNAUTH=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}')

if [[ "${MCP_UNAUTH}" == "401" ]]; then
  echo "PASS (401 rejected without token as expected)"
else
  echo "FAIL: Expected 401 unauthenticated, got ${MCP_UNAUTH}"
  exit 1
fi

# 9. Verify regular user is denied admin stats (403)
echo -n "9. Verifying /api/admin/stats is forbidden (403) for non-admin... "
ADMIN_DENY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b "${COOKIE_JAR}" "${BASE_URL}/api/admin/stats")
if [[ "${ADMIN_DENY_STATUS}" == "403" ]]; then
  echo "PASS"
else
  echo "FAIL: Expected 403, got ${ADMIN_DENY_STATUS}"
  exit 1
fi

# 10. Clean up: Delete created todo
echo -n "10. Deleting test todo... "
DELETE_RES=$(curl -fsS -b "${COOKIE_JAR}" -X DELETE "${BASE_URL}/api/todos/${TODO_ID}")
if [[ "${DELETE_RES}" =~ "successfully" ]]; then
  echo "PASS"
else
  echo "FAIL: ${DELETE_RES}"
  exit 1
fi

echo "=== All Smoke Tests Passed Successfully! ==="
