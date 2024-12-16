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

#### Create API Integration
1. Log into your OpsGenie account at https://app.opsgenie.com
2. Navigate to **Teams** → Select your team
3. Click **Integrations** tab at the top
4. Click **Add Integration** button
5. In the search box, type "API" and select **API Integration**
6. Configure the integration:
   - Name: `Slack Incident Bot`
   - Description: `Integration for Slack incident management`
   - Enabled: ✅ Check this box
   - Read Access: ✅ Check this box
   - Write Access: ✅ Check this box
   - Configure Access: ✅ Check this box
7. Click **Save Integration**
8. **Important**: Copy the generated API Key immediately (it looks like a UUID)

#### Enable Team Integration
1. Stay in your team settings
2. Note your **Team ID** from the URL:
   ```
   https://app.opsgenie.com/teams/YOUR_TEAM_ID_HERE/dashboard
   ```
3. Go to **Settings** → **Integrations**
4. Find your newly created API integration
5. Ensure the following are enabled:
   - Integration is active (toggle switch is green)
   - Create and Update Access
   - Delete Access
   - Disable Access
6. Note down:
   ```bash
   OPSGENIE_API_KEY=      # Your copied API key
   OPSGENIE_TEAM_ID=      # Your team ID from URL
   OPSGENIE_DOMAIN=       # Your OpsGenie domain (e.g., kftray)
   ```

### 2. Slack App Creation

#### Create New App
1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click **Create New App** → **From Scratch**
3. Enter details:
   - App Name: `OpsGenie Incident Bot`
   - Development Slack Workspace: [Select your workspace]
4. Click **Create App**

#### Basic Information Setup
1. Under **Settings** → **Basic Information**:
2. Copy the **Signing Secret** from "App Credentials":
   ```bash
   SLACK_SIGNING_SECRET=  # Copy this value
   ```

#### Configure Bot Permissions
1. Go to **Features** → **OAuth & Permissions**
2. Under **Scopes**:
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
3. Click **Install to Workspace**
4. Authorize the app
5. Copy the **Bot User OAuth Token**:
   ```bash
   SLACK_BOT_TOKEN=     # Starts with xoxb-
   ```

#### Configure Slash Command
1. Go to **Features** → **Slash Commands**
2. Click **Create New Command**
3. Fill in the details:
   ```
   Command: /create-incident
   Request URL: https://your-domain.com/slack/commands
   Short Description: Create an OpsGenie incident
   Usage Hint: [title] [description] [priority]
   ```
4. Click **Save**

#### Enable Interactivity
1. Go to **Features** → **Interactivity & Shortcuts**
2. Toggle **Interactivity** to On
3. Add Request URL:
   ```
   https://your-domain.com/slack/interactivity
   ```
4. Click **Save Changes**

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

# Add your credentials to .env.yaml file
cp .env.yaml.example .env.yaml

# Build and run
pnpm docker:build
pnpm docker:run
# Note your deployment URL: http://localhost:8080
```

#### Using Google Cloud Functions
```bash

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
   /$SLASH_COMMAND_NAME
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

### Priority Mapping

The incident priorities map to OpsGenie priorities as follows:

| Modal Selection | OpsGenie Priority |
|----------------|-------------------|
| Critical       | P1               |
| High           | P2               |
| Medium         | P3               |
| Low            | P4               |



## Need Help?
- Open an issue in the repository

## License

MIT License


