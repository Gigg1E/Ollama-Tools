#!/bin/bash

API_BASE="http://localhost:3100"

echo "🧪 Testing Ollama Tools API"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_endpoint() {
    local name=$1
    local url=$2
    local method=${3:-GET}
    local data=$4
    
    echo -n "Testing ${name}... "
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -w "%{http_code}" -X POST "${API_BASE}${url}" \
                       -H "Content-Type: application/json" \
                       -d "$data" -o /tmp/test_response.json)
    else
        response=$(curl -s -w "%{http_code}" "${API_BASE}${url}" -o /tmp/test_response.json)
    fi
    
    http_code="${response: -3}"
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✓ OK${NC} (HTTP $http_code)"
        # Show first line of response
        head -n 1 /tmp/test_response.json | jq -r '.' 2>/dev/null || echo ""
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $http_code)"
        cat /tmp/test_response.json 2>/dev/null
    fi
    echo ""
}

# Check if server is running
echo "Checking if API is running..."
if ! curl -s "${API_BASE}/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ API is not running!${NC}"
    echo "Start it with: npm start"
    echo "Or with PM2: pm2 start ecosystem.config.js"
    exit 1
fi

echo -e "${GREEN}✓ API is running${NC}"
echo ""

# Test all endpoints
test_endpoint "Health Check" "/health"

test_endpoint "Current Time" "/api/time"

test_endpoint "Web Search" "/api/search" "POST" '{"query":"test search","num_results":3}'

test_endpoint "Weather Lookup" "/api/weather/London"

test_endpoint "Timezone Info" "/api/timezone/America/New_York"

test_endpoint "List Timezones" "/api/timezones"

test_endpoint "Geocoding" "/api/geocode/Paris"

test_endpoint "Reverse Geocoding" "/api/reverse-geocode/40.7128/-74.0060"

test_endpoint "IP Lookup (self)" "/api/ip"

test_endpoint "IP Lookup (specific)" "/api/ip/8.8.8.8"

test_endpoint "DNS Lookup" "/api/dns/google.com"

test_endpoint "Ping Test" "/api/ping/google.com"

test_endpoint "List Endpoints" "/api/endpoints"

echo "=============================="
echo "✅ Testing complete!"
echo ""

# Cleanup
rm -f /tmp/test_response.json
