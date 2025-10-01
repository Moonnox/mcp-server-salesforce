#!/bin/bash

# Test script for remote MCP server
# This script starts the server briefly to verify it works

echo "Testing remote MCP server startup..."

# Set test environment variables
export PORT=8080
export HOST=localhost
export REQUIRE_AUTH=false
export SECRET_KEY=test-key

# Start the server in the background
node dist/remote-server.js &
SERVER_PID=$!

echo "Server started with PID $SERVER_PID"

# Wait for server to start
sleep 3

# Test health endpoint
echo "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:8080/health)
echo "Health response: $HEALTH_RESPONSE"

# Test root endpoint
echo "Testing root endpoint..."
ROOT_RESPONSE=$(curl -s http://localhost:8080/)
echo "Root response: $ROOT_RESPONSE"

# Test tools list endpoint
echo "Testing tools list endpoint..."
TOOLS_RESPONSE=$(curl -s http://localhost:8080/tools)
echo "Tools response: $TOOLS_RESPONSE"

# Test MCP initialize
echo "Testing MCP initialize..."
INIT_RESPONSE=$(curl -s -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}')
echo "Initialize response: $INIT_RESPONSE"

# Stop the server
echo "Stopping server..."
kill $SERVER_PID

echo "Test complete!"

