#!/bin/bash

# Test the deployed API endpoint
API_URL="https://im3t8e4bwg.execute-api.ap-south-1.amazonaws.com/Prod"

echo "Testing API endpoint..."
echo "===================="

# Test basic health check or root endpoint
curl -X GET "$API_URL/" \
  -H "Content-Type: application/json" \
  -H "Origin: https://secure-flow-landing.vercel.app" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "If you get a response, your API is working!"
echo "API URL: $API_URL"
