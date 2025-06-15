#!/bin/bash

API_URL="https://im3t8e4bwg.execute-api.ap-south-1.amazonaws.com/Prod"

echo "🔬 SecureFlow API Comprehensive Testing"
echo "======================================"
echo "Testing deployed AWS Lambda API endpoints"
echo ""

# Test results storage
declare -a working_endpoints=()
declare -a protected_endpoints=()
declare -a failed_endpoints=()

test_endpoint() {
    local endpoint="$1"
    local method="${2:-GET}"
    local expect_auth="${3:-false}"
    
    echo "Testing: $API_URL$endpoint [$method]"
    echo "----------------------------------------"
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X "$method" "$API_URL$endpoint" \
        -H "Content-Type: application/json" \
        -H "Origin: https://secure-flow-landing.vercel.app")
    
    http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    echo "Status: $http_code"
    echo "Response: $body"
    echo ""
    
    # Categorize results
    if [[ "$http_code" == "200" || "$http_code" == "201" ]]; then
        working_endpoints+=("✅ $endpoint [$method] - $http_code")
    elif [[ "$http_code" == "401" || "$http_code" == "403" ]]; then
        protected_endpoints+=("🔐 $endpoint [$method] - $http_code (Auth Required)")
    else
        failed_endpoints+=("❌ $endpoint [$method] - $http_code")
    fi
}

echo "📋 PHASE 1: Health & System Endpoints"
echo "====================================="
test_endpoint "/health" "GET"
test_endpoint "/api/system/status" "GET"
test_endpoint "/api/system/info" "GET"

echo "🔐 PHASE 2: Authentication Endpoints" 
echo "==================================="
test_endpoint "/api/auth/status" "GET"
test_endpoint "/api/auth/health" "GET"
test_endpoint "/api/auth/google" "GET"

echo "📨 PHASE 3: Webhook Endpoints (Unauthenticated)"
echo "=============================================="
test_endpoint "/api/webhooks/health" "GET"
test_endpoint "/api/webhooks/gitlab" "POST"

echo "🔒 PHASE 4: Protected Endpoints (Expected 401/403)"
echo "================================================="
test_endpoint "/api/projects" "GET"
test_endpoint "/api/analysis" "GET" 
test_endpoint "/api/approval" "GET"
test_endpoint "/api/notifications" "GET"

echo ""
echo "📊 TEST SUMMARY"
echo "==============="

echo ""
echo "✅ WORKING ENDPOINTS:"
for endpoint in "${working_endpoints[@]}"; do
    echo "   $endpoint"
done

echo ""
echo "🔐 PROTECTED ENDPOINTS (Need Authentication):"
for endpoint in "${protected_endpoints[@]}"; do
    echo "   $endpoint"  
done

echo ""
echo "❌ FAILED/NOT FOUND ENDPOINTS:"
for endpoint in "${failed_endpoints[@]}"; do
    echo "   $endpoint"
done

echo ""
echo "🎯 NEXT STEPS:"
echo "1. Working endpoints indicate API is functional"
echo "2. Protected endpoints returning 401/403 is expected behavior"
echo "3. Test authentication flow to access protected resources"
echo "4. Compare with current Render API functionality"

working_count=${#working_endpoints[@]}
protected_count=${#protected_endpoints[@]}
total_functional=$((working_count + protected_count))

echo ""
echo "📈 MIGRATION HEALTH SCORE:"
echo "Working Endpoints: $working_count"
echo "Protected Endpoints: $protected_count" 
echo "Total Functional: $total_functional"

if [ $total_functional -gt 5 ]; then
    echo "🎉 STATUS: MIGRATION READY - API is highly functional!"
elif [ $total_functional -gt 2 ]; then
    echo "⚠️  STATUS: MOSTLY READY - Minor issues to resolve"
else
    echo "🚨 STATUS: NEEDS ATTENTION - Multiple endpoints failing"
fi
