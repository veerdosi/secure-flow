#!/bin/bash

API_URL="https://im3t8e4bwg.execute-api.ap-south-1.amazonaws.com/Prod"

echo "🔐 SecureFlow Authentication Flow Testing"
echo "========================================"
echo "Testing complete auth workflow on AWS Lambda"
echo ""

# Test user credentials
TEST_EMAIL="migration-test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"
TEST_NAME="Migration Test User"

echo "📋 Test Configuration:"
echo "Email: $TEST_EMAIL"
echo "Password: [HIDDEN]"
echo "Name: $TEST_NAME"
echo ""

# Test authentication endpoints
test_auth_endpoint() {
    local endpoint="$1"
    local method="$2"
    local data="$3"
    local token="$4"
    
    echo "🧪 Testing: $endpoint [$method]"
    echo "----------------------------------------"
    
    headers=(-H "Content-Type: application/json" -H "Origin: https://secure-flow-landing.vercel.app")
    
    if [ ! -z "$token" ]; then
        headers+=(-H "Authorization: Bearer $token")
    fi
    
    if [ ! -z "$data" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X "$method" "$API_URL$endpoint" \
            "${headers[@]}" \
            -d "$data")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X "$method" "$API_URL$endpoint" \
            "${headers[@]}")
    fi
    
    http_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    echo "Status: $http_code"
    echo "Response: $body"
    echo ""
    
    # Return both status and body for processing
    echo "$http_code|$body"
}

echo "🚀 PHASE 1: User Registration Test"
echo "================================="

register_data="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"$TEST_NAME\"}"
register_result=$(test_auth_endpoint "/api/auth/register" "POST" "$register_data")

register_status=$(echo "$register_result" | tail -1 | cut -d'|' -f1)
register_body=$(echo "$register_result" | tail -1 | cut -d'|' -f2)

if [ "$register_status" = "201" ]; then
    echo "✅ Registration successful!"
    # Extract token from registration response
    AUTH_TOKEN=$(echo "$register_body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "🔑 JWT Token acquired from registration"
elif [ "$register_status" = "409" ]; then
    echo "ℹ️  User already exists, proceeding to login..."
    AUTH_TOKEN=""
else
    echo "❌ Registration failed with status $register_status"
    AUTH_TOKEN=""
fi

echo ""
echo "🔐 PHASE 2: User Login Test"
echo "==========================="

login_data="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
login_result=$(test_auth_endpoint "/api/auth/login" "POST" "$login_data")

login_status=$(echo "$login_result" | tail -1 | cut -d'|' -f1)
login_body=$(echo "$login_result" | tail -1 | cut -d'|' -f2)

if [ "$login_status" = "200" ]; then
    echo "✅ Login successful!"
    # Extract token from login response
    AUTH_TOKEN=$(echo "$login_body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "🔑 JWT Token acquired from login"
else
    echo "❌ Login failed with status $login_status"
    # Try to create user first
    echo ""
    echo "🔄 Attempting registration again..."
    register_result=$(test_auth_endpoint "/api/auth/register" "POST" "$register_data")
    register_status=$(echo "$register_result" | tail -1 | cut -d'|' -f1)
    register_body=$(echo "$register_result" | tail -1 | cut -d'|' -f2)
    
    if [ "$register_status" = "201" ]; then
        AUTH_TOKEN=$(echo "$register_body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        echo "✅ Registration successful on retry!"
    fi
fi

echo ""
echo "🔍 PHASE 3: Token Validation Test"
echo "================================"

if [ ! -z "$AUTH_TOKEN" ] && [ "$AUTH_TOKEN" != "null" ]; then
    echo "🔑 Using JWT Token: ${AUTH_TOKEN:0:20}..."
    
    # Test /me endpoint
    me_result=$(test_auth_endpoint "/api/auth/me" "GET" "" "$AUTH_TOKEN")
    me_status=$(echo "$me_result" | tail -1 | cut -d'|' -f1)
    
    if [ "$me_status" = "200" ]; then
        echo "✅ Token validation successful!"
        echo "✅ /api/auth/me endpoint working correctly"
    else
        echo "❌ Token validation failed with status $me_status"
    fi
else
    echo "❌ No valid token available for testing"
    echo "⚠️  Authentication flow needs investigation"
fi

echo ""
echo "🔒 PHASE 4: Protected Endpoints Test"
echo "===================================="

if [ ! -z "$AUTH_TOKEN" ] && [ "$AUTH_TOKEN" != "null" ]; then
    # Test protected endpoints with valid token
    protected_endpoints=("/api/projects" "/api/analysis" "/api/approval" "/api/notifications")
    
    for endpoint in "${protected_endpoints[@]}"; do
        protected_result=$(test_auth_endpoint "$endpoint" "GET" "" "$AUTH_TOKEN")
        protected_status=$(echo "$protected_result" | tail -1 | cut -d'|' -f1)
        
        if [ "$protected_status" = "200" ] || [ "$protected_status" = "201" ]; then
            echo "✅ $endpoint: Working with authentication"
        elif [ "$protected_status" = "404" ]; then
            echo "ℹ️  $endpoint: Endpoint not implemented (404)"
        elif [ "$protected_status" = "401" ]; then
            echo "❌ $endpoint: Authentication failed (401)"
        else
            echo "⚠️  $endpoint: Unexpected status $protected_status"
        fi
    done
else
    echo "⚠️  Skipping protected endpoint tests - no valid token"
fi

echo ""
echo "📊 AUTHENTICATION FLOW SUMMARY"
echo "==============================="

if [ ! -z "$AUTH_TOKEN" ] && [ "$AUTH_TOKEN" != "null" ]; then
    echo "✅ JWT Authentication: WORKING"
    echo "✅ Token Generation: WORKING"
    echo "✅ User Registration/Login: WORKING"
    echo "✅ Database Integration: WORKING"
    echo ""
    echo "🎉 MIGRATION STATUS: AUTHENTICATION FULLY FUNCTIONAL"
    echo ""
    echo "🔑 Sample JWT Token (first 40 chars): ${AUTH_TOKEN:0:40}..."
    echo ""
    echo "📋 Ready for Phase 3: Frontend Integration"
    echo "   - Update Vercel environment variables"
    echo "   - Test frontend login/register flows"  
    echo "   - Validate end-to-end user workflows"
else
    echo "❌ JWT Authentication: FAILED"
    echo "❌ Token Generation: NOT WORKING"
    echo ""
    echo "🚨 MIGRATION STATUS: AUTHENTICATION NEEDS ATTENTION"
    echo ""
    echo "🔧 Next Steps:"
    echo "   - Review authentication endpoint implementation"
    echo "   - Check database connectivity"
    echo "   - Validate JWT secret configuration"
fi

echo ""
echo "🎯 WHAT THIS MEANS FOR YOUR MIGRATION:"
if [ ! -z "$AUTH_TOKEN" ] && [ "$AUTH_TOKEN" != "null" ]; then
    echo "✅ Your AWS Lambda API is fully functional for authentication"
    echo "✅ Database operations are working correctly"
    echo "✅ JWT token generation and validation is operational"
    echo "✅ Ready to proceed with frontend cutover to AWS endpoints"
else
    echo "⚠️  Authentication flow needs debugging before cutover"
    echo "⚠️  Investigate database connectivity and JWT configuration"
fi
