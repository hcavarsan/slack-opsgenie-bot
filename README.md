# Slack OpsGenie Integration

Create OpsGenie alerts directly from Slack using a simple slash command.

## Prerequisites

Before starting, ensure you have:
- An OpsGenie account
- A Slack workspace with admin access
- Node.js 18+ installed
- pnpm installed
- Docker installed (recommended) or Google Cloud account
- jq installed (for local testing)

## Setup Guide

### 1. OpsGenie Configuration
1. Go to OpsGenie → Teams → Settings → Integrations
2. Enable Integration
2. Create new API integration Key
3. Note down:
   ```bash
   OPSGENIE_API_KEY=      # From the integration settings
   OPSGENIE_TEAM_ID=      # From Teams → Your Team → Team ID
   OPSGENIE_DOMAIN=       # Your OpsGenie domain
   ```

### 2. Slack App Creation
1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click "Create New App" → "From Scratch"
3. Name your app and select your workspace
4. Under "Basic Information", copy:
   ```bash
   SLACK_SIGNING_SECRET=  # From "App Credentials" section (xoxb-* token)
   ```
5. Under "OAuth & Permissions":
   - Add these **Bot Token Scopes**:
     ```
     channels:read
     chat:write
     commands
     im:write
     users:read
     users:read.email
     channels:manage
     groups:write
     mpim:write
     incoming-webhook
     ```
   - Add these **User Token Scopes**:
     ```
     chat:write
     im:write
     users:read
     users:read.email
     channels:read
     channels:write
     groups:write
     mpim:write
     ```
   - Install app to workspace
   - Copy:
     ```bash
     SLACK_BOT_TOKEN=     # Bot User OAuth Token
     ```

### 3. Environment Configuration

Create the `.env.yaml` file with the following content:

```yaml
OPSGENIE_API_KEY: "your-api-key"
OPSGENIE_TEAM_ID: "your-team-id"
OPSGENIE_DOMAIN: "your-domain"
SLACK_SIGNING_SECRET: "your-signing-secret"
SLACK_BOT_TOKEN: "xoxb-your-bot-token"
```

### 4. Deploy the Bot

#### Using Docker (Recommended)
```bash
# Clone and install
git clone https://github.com/hcavarsan/slack-opsgenie-bot
cd slack-opsgenie-bot
pnpm install

# Add your credentials to .env file

# Build and run
pnpm docker:build
pnpm docker:run
# Note your deployment URL: http://localhost:8080
```

#### Using Google Cloud Functions
```bash
# After cloning and installing (steps above)
# Convert your .env to .env.yaml format

# Deploy
gcloud functions deploy slack-opsgenie-bot \
  --gen2 \
  --runtime=nodejs18 \
  --region=us-central1 \
  --source=. \
  --entry-point=app \
  --trigger-http \
  --allow-unauthenticated \
  --env-vars-file .env.yaml

# Note your deployment URL from the output
```

### 5. Test the Integration

#### A. Using Slack (Production)
1. In any Slack channel, type:
   ```
   /create-incident
   ```
2. Fill in the incident details in the modal
3. Submit to create an OpsGenie alert
4. Check your direct messages for the confirmation and OpsGenie link

#### B. Local Testing (Development)

1. Build and run the Docker container:
```bash
# Build the image
pnpm docker:build

# Run in development mode
pnpm docker:run
```

2. In a new terminal, run the test script:
```bash
chmod +x scripts/test-local.sh
./scripts/test-local.sh
```

The script will:
1. Load your environment variables automatically
2. Test both the slash command and interactivity endpoints
3. Generate valid signatures using your actual Slack credentials
4. Show the responses from both endpoints
5. Display a pretty summary with test results and OpsGenie status

Requirements:
- Docker container running locally
- Valid `.env.yaml` file with credentials
- `curl` installed on your system
- `jq` installed for JSON parsing


## Development

```bash
# Local development with hot reload
pnpm dev

# Run tests
pnpm test

# Build
pnpm build
```

## Need Help?
- Open an issue in the repository

## License

MIT License

### Priority Mapping

The incident priorities map to OpsGenie priorities as follows:

| Modal Selection | OpsGenie Priority |
|----------------|-------------------|
| Critical       | P1               |
| High           | P2               |
| Medium         | P3               |
| Low            | P4               |

