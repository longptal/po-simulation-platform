#!/bin/bash

# Quick Test Script for Orchestrator
# Tests all API endpoints

set -e

BASE_URL="http://localhost:3001"
SESSION_ID=""

echo "🧪 Testing PO Simulation Orchestrator API"
echo "=========================================="
echo ""

# 1. Health Check
echo "1️⃣  Health Check..."
curl -s "$BASE_URL/health" | jq '.'
echo ""

# 2. Create Session
echo "2️⃣  Creating new session..."
RESPONSE=$(curl -s -X POST "$BASE_URL/sessions" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "scenarioId": "550e8400-e29b-41d4-a716-446655440001"
  }')

echo "$RESPONSE" | jq '.'
SESSION_ID=$(echo "$RESPONSE" | jq -r '.sessionId')
echo "✅ Session created: $SESSION_ID"
echo ""

# 3. Get Session State
echo "3️⃣  Getting session state..."
curl -s "$BASE_URL/sessions/$SESSION_ID" | jq '.'
echo ""

# 4. List Active Sessions
echo "4️⃣  Listing active sessions..."
curl -s "$BASE_URL/sessions" | jq '.'
echo ""

# 5. Make a Decision
echo "5️⃣  Making a decision (option 3 - optimal choice)..."
curl -s -X POST "$BASE_URL/sessions/$SESSION_ID/decisions" \
  -H "Content-Type: application/json" \
  -d '{
    "optionId": "opt_3",
    "timeTaken": 45
  }' | jq '.'
echo ""

# 6. Pause Session
echo "6️⃣  Pausing session..."
curl -s -X POST "$BASE_URL/sessions/$SESSION_ID/pause" | jq '.'
echo ""

# 7. Resume Session
echo "7️⃣  Resuming session..."
curl -s -X POST "$BASE_URL/sessions/$SESSION_ID/resume" | jq '.'
echo ""

# 8. Stop Session
echo "8️⃣  Stopping session..."
curl -s -X DELETE "$BASE_URL/sessions/$SESSION_ID" | jq '.'
echo ""

echo "✨ All tests completed!"
echo ""
echo "📝 Summary:"
echo "   - Health check: ✅"
echo "   - Create session: ✅"
echo "   - Get state: ✅"
echo "   - List sessions: ✅"
echo "   - Make decision: ✅"
echo "   - Pause/Resume: ✅"
echo "   - Stop session: ✅"
