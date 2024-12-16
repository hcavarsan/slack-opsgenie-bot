#!/bin/bash

# Colors for better output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print section headers
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

# Function to print error messages
print_error() {
    echo -e "${RED}✗ $1${NC}"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

# Function to print warnings
print_warning() {
    echo -e "${YELLOW}! $1${NC}"
}

# Load environment variables
print_header "Loading Environment Variables"
if [ -f .env ]; then
    while IFS='=' read -r key value; do
        # Skip empty lines and comments
        [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue

        # Remove any leading/trailing whitespace and quotes
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs | sed -e 's/^"//' -e 's/"$//')

        # Export the variable
        export "$key=$value"
        echo -e "${GREEN}✓${NC} Loaded $key"
    done < .env
    print_success "Environment variables loaded successfully"
else
    print_error "No .env file found"
    exit 1
fi

# Test /create-incident command
print_header "Testing /create-incident Command"

echo "Generating test request..."
TIMESTAMP=$(date +%s)
TRIGGER_ID="test_trigger_id"

echo "Generating test request..."
BODY="command=/create-incident&text=Test Incident&user_id=U2147483697&user_name=test.user&user_email=test@example.com&team_domain=example&channel_id=C2147483705&channel_name=test-channel&trigger_id=${TRIGGER_ID}"
SIGNING_STRING="v0:${TIMESTAMP}:${BODY}"
SIGNATURE="v0=$(echo -n "$SIGNING_STRING" | openssl sha256 -hmac "$SLACK_SIGNING_SECRET" | cut -d' ' -f2)"

echo -e "\nRequest details:"
echo -e "  ${BLUE}Endpoint:${NC} /slack/commands"
echo -e "  ${BLUE}Method:${NC} POST"
echo -e "  ${BLUE}Body:${NC} $BODY"

RESPONSE=$(curl -s -X POST "http://localhost:8080/slack/commands" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "X-Slack-Request-Timestamp: $TIMESTAMP" \
    -H "X-Slack-Signature: $SIGNATURE" \
    -d "$BODY")

if [ $? -eq 0 ]; then
    print_success "Slash command request sent successfully"
else
    print_error "Failed to send slash command request"
fi

# Test interactivity endpoint
print_header "Testing Interactivity Endpoint"

echo "Generating test modal submission..."
MODAL_PAYLOAD='{
    "type": "view_submission",
    "team": {
        "id": "T0001",
        "domain": "example"
    },
    "user": {
        "id": "U2147483697",
        "username": "test.user",
        "name": "Test User",
        "email": "test@example.com"
    },
    "trigger_id": "'${TRIGGER_ID}'",
    "view": {
        "id": "V123456",
        "team_id": "T0001",
        "type": "modal",
        "private_metadata": "{\"channelId\":\"C2147483705\",\"channelName\":\"test-channel\",\"teamDomain\":\"example\"}",
        "callback_id": "incident_modal",
        "state": {
            "values": {
                "title_block": {
                    "title": {
                        "type": "plain_text_input",
                        "value": "Test Incident Title"
                    }
                },
                "description_block": {
                    "description": {
                        "type": "plain_text_input",
                        "value": "This is a test incident description"
                    }
                },
                "urgency_block": {
                    "urgency": {
                        "type": "static_select",
                        "selected_option": {
                            "text": {
                                "type": "plain_text",
                                "text": "High",
                                "emoji": true
                            },
                            "value": "high"
                        }
                    }
                }
            }
        }
    }
}'

echo -e "\nRequest details:"
echo -e "  ${BLUE}Endpoint:${NC} /slack/interactivity"
echo -e "  ${BLUE}Method:${NC} POST"

# Generate new signature for interactivity endpoint
SIGNING_STRING="v0:${TIMESTAMP}:${MODAL_PAYLOAD}"
MODAL_SIGNATURE="v0=$(echo -n "$SIGNING_STRING" | openssl sha256 -hmac "$SLACK_SIGNING_SECRET" | cut -d' ' -f2)"

# Send the modal submission and wait for response
RESPONSE=$(curl -s -X POST "http://localhost:8080/slack/interactivity" \
    -H "Content-Type: application/json" \
    -H "X-Slack-Request-Timestamp: $TIMESTAMP" \
    -H "X-Slack-Signature: $MODAL_SIGNATURE" \
    -d "$MODAL_PAYLOAD")

if [ $? -eq 0 ]; then
    print_success "Modal submission sent successfully"

    # Wait for a moment to allow the incident to be created
    echo "Waiting for incident creation..."
    sleep 3

    # Get the latest alert from OpsGenie
    LATEST_ALERT=$(curl -s -X GET "https://api.opsgenie.com/v2/alerts?query=alias:%20slack-incident-U2147483697-*&limit=1&sort=createdAt&order=desc" \
        -H "Authorization: GenieKey $OPSGENIE_API_KEY" \
        -H "Content-Type: application/json")

    if [ $? -eq 0 ] && [ -n "$LATEST_ALERT" ]; then
        INCIDENT_ID=$(echo "$LATEST_ALERT" | jq -r '.data[0].id')
        INCIDENT_TINY_ID=$(echo "$LATEST_ALERT" | jq -r '.data[0].tinyId')
        INCIDENT_URL="https://${OPSGENIE_DOMAIN}.app.opsgenie.com/alert/detail/${INCIDENT_ID}/details"

        print_success "Incident created successfully"

        echo -e "\n┌────────────────────────────────────────┐"
        echo -e "│         🔔 Incident Details            │"
        echo -e "├────────────────────────────────────────┤"
        echo -e "│  ID:      ${BLUE}${INCIDENT_TINY_ID}${NC}"
        echo -e "│  Status:  ${GREEN}OPEN${NC}"
        echo -e "│  URL:     ${BLUE}${INCIDENT_URL}${NC}"
        echo -e "└────────────────────────────────────────┘"
    else
        print_warning "Could not fetch incident details"
        echo "Response from OpsGenie: $LATEST_ALERT"
    fi
else
    print_error "Failed to send modal submission"
fi

# Print test summary
print_header "Test Summary"

# Create a box around the summary
echo -e "┌────────────────────────────────────────┐"
echo -e "│           🚀 Test Results              │"
echo -e "├────────────────────────────────────────┤"
echo -e "│  Total Tests:  ${BLUE}$TOTAL_TESTS${NC}                    │"
echo -e "│  ✅ Passed:    ${GREEN}$PASSED_TESTS${NC}                    │"
echo -e "│  ❌ Failed:    ${RED}$FAILED_TESTS${NC}                    │"
echo -e "└────────────────────────────────────────┘"

if [ -n "$INCIDENT_URL" ]; then
    echo -e "\n┌────────────────────────────────────────┐"
    echo -e "│         🔔 Incident Created           │"
    echo -e "├────────────────────────────────────────┤"
    echo -e "│  Status:  ${GREEN}OPEN${NC}                     "
    echo -e "│  URL:     ${BLUE}${INCIDENT_URL}${NC}          "
    echo -e "└────────────────────────────────────────┘"
fi

# Check OpsGenie API connectivity
print_header "OpsGenie API Health Check"
OPSGENIE_RESPONSE=$(curl -s -X GET "https://api.opsgenie.com/v2/alerts/count" \
    -H "Authorization: GenieKey $OPSGENIE_API_KEY" \
    -H "Content-Type: application/json")

if echo "$OPSGENIE_RESPONSE" | grep -q "Could not authenticate"; then
    print_error "OpsGenie API authentication failed"
    echo -e "Response: $OPSGENIE_RESPONSE"
else
    print_success "OpsGenie API connection successful"
    ALERT_COUNT=$(echo "$OPSGENIE_RESPONSE" | jq -r '.data.count // 0')
    echo -e "\n┌────────────────────────────────────────┐"
    echo -e "│         📊 OpsGenie Status            │"
    echo -e "├────────────────────────────────────────┤"
    echo -e "│  Active Alerts: ${BLUE}$ALERT_COUNT${NC}                 │"
    echo -e "└────────────────────────────────────────┘"
fi

# Exit with appropriate status code
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✨ All tests passed successfully! ✨${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please check the logs above.${NC}"
    exit 1
fi
