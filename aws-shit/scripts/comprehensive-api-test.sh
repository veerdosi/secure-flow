#!/bin/bash

API_URL="https://im3t8e4bwg.execute-api.ap-south-1.amazonaws.com/Prod"

echo "Comprehensive API Testing"
echo "========================"

# Test common API endpoints
declare -a endpoints=(
    "/api/health"
    "/api/v1/health" 
    "/health"
    "/status"
    "/api/auth/status"
    "/api/users"
    "/docs"
)

for endpoint in "${endpoints[@]}"; do
    echo ""
    echo "Testing: $API_URL$endpoint"
    echo "----------------------------------------"
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X GET "$API_URL$endpoint" \
        -H "Content-Type: application/json" \
        -H "Origin: https://secure-flow-landing.vercel.app")
    
    http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    echo "Status: $http_code"
    echo "Response: $body"
done

echo ""
echo "Testing Complete"
echo "================"
echo "Look for status codes 200, 401, or other non-404 codes to identify working endpoints."
