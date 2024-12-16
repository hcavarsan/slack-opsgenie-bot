# Slack OpsGenie Integration

Create OpsGenie alerts directly from Slack using a simple slash command. This integration allows teams to quickly create incidents through Slack.

![Demo](https://s7.gifyu.com/images/SJPdM.gif)

## Why This Bot?

This bot addresses a key limitation in OpsGenie's native Slack integration: the requirement for individual OpsGenie user accounts and need to login to OpsGenie in Slack to create incidents. Using a single bot (api key), any Slack user can create incidents while the bot handles the automatic capture of user context, channel details, and team information. This reduces license costs and simplifies access management without sacrificing incident tracking capabilities.

## Required Environment Variables

You'll need to gather these credentials in the setup process:

```yaml
# Slack Configuration
SLACK_API_URL: "https://slack.com/api"        # Default Slack API URL
SLACK_SIGNING_SECRET: "xxx..."                # From Slack App Basic Information
SLACK_BOT_TOKEN: "xoxb-xxx..."               # From Slack App OAuth & Permissions - Starts with xoxb-

# OpsGenie Configuration
OPSGENIE_DOMAIN: "your-domain"               # Your OpsGenie domain
OPSGENIE_API_KEY: "xxxxxxxx-xxxx-xxxx-xxxx"  # From OpsGenie API Integration
OPSGENIE_TEAM_ID: "xxxxxxxx-xxxx-xxxx-xxxx"  # From OpsGenie Team URL
```

## Prerequisites

### Required Accounts & Permissions
- OpsGenie Account with:
  - Admin access to create integrations
  - Team management permissions
  - Ability to create API keys
- Slack Workspace with:
  - Admin access to create apps
  - Permission to install apps to workspace
  - Ability to create slash commands

### Development Environment
- Node.js 18 or higher
- pnpm package manager
- Docker (recommended for local development)
- jq utility (for local testing)

### Optional Requirements
- Google Cloud account (for cloud deployment)
- ngrok (for local development with Slack)

## Setup Guide

### 1. OpsGenie Configuration

#### Create API Integration
Start by setting up an API integration in OpsGenie that will allow secure communication between the services.

Navigation Steps:
1. Log into OpsGenie at https://app.opsgenie.com
2. Go to: Teams → Your Team → Integrations tab
3. Click "Add Integration"
4. Search for and select "API Integration"

Required Permissions:
- ✅ Read Access (for retrieving incidents)
- ✅ Write Access (for creating/updating incidents)
- ✅ Configure Access (for integration management)

### 2. Slack App Creation

The Slack integration consists of a custom app that provides the interface between your team and OpsGenie. You can create this app in two ways:

#### Option 1: Manual Setup (UI-based)

Create a new app at [Slack API Apps](https://api.slack.com/apps).

#### Required Permissions
Navigate to OAuth & Permissions to configure these essential scopes:

Bot Token Scopes:
```
chat:write    - Send messages as the bot
commands      - Create slash commands
im:write      - Send direct messages
users:read    - Access basic user information
```

User Token Scopes:
```
chat:write    - Send messages as a user
im:write      - Send direct messages
```

#### Interactive Components
The integration uses two main components:

1. Slash Command:
Configure a new command at Features → Slash Commands:
```
Command: /create-incident
Request URL: https://your-domain.com/slack/commands
Description: Create an OpsGenie incident
```

2. Interactive Messages:
Enable interactivity and set the request URL:
```
https://your-domain.com/slack/interactivity
```

#### Option 2: App Manifest

For faster setup, create your app using our prepared manifest:

1. Go to [Slack API Apps](https://api.slack.com/apps) → **Create New App** → **From an app manifest**
2. Copy the contents of [slack-manifest.yaml](./slack-manifest.yaml) from this repository
3. Replace `YOUR_DOMAIN` in the manifest with your actual deployment URL
4. Paste the modified manifest and create your app

### 4. Deploy the Bot

#### Using Docker (Recommended)

Clone and set up the project:
```bash
git clone https://github.com/hcavarsan/slack-opsgenie-bot
cd slack-opsgenie-bot
pnpm install
```

Create a `.env.yaml` file to store your configuration:

```bash
cp .env.yaml.example .env.yaml
# Edit .env.yaml with your credentials
```

After creating the file, you can edit it with your information:

```yaml
OPSGENIE_API_KEY: "your-api-key"
OPSGENIE_TEAM_ID: "your-team-id"
OPSGENIE_DOMAIN: "your-domain"
SLACK_SIGNING_SECRET: "your-signing-secret"
SLACK_BOT_TOKEN: "xoxb-your-bot-token"
```

Build and run the container:
```bash
pnpm docker:build
pnpm docker:run
```

Your deployment will be available at `http://localhost:8080`, now you can use something like [ngrok](https://ngrok.com/) to test the integration in Slack using the public URL.

#### Using Google Cloud Functions

Deploy to Google Cloud with a single command:
```bash
gcloud functions deploy slack-opsgenie-bot \
  --gen2 \
  --runtime=nodejs18 \
  --region=us-central1 \
  --source=. \
  --entry-point=app \
  --trigger-http \
  --allow-unauthenticated \
  --env-vars-file .env.yaml
```

After deployment, note the function URL from the output - you'll need it for your Slack app configuration.

### 5. Test the Integration

#### Production Testing in Slack

Testing in Slack is straightforward:

1. Open any Slack channel where the bot is installed
2. Type `/create-incident`
3. Fill out the incident form:
   - Title: Brief description of the incident
   - Description: Detailed information
   - Priority: Select from Critical to Low
4. Submit the form
5. Check your DMs for the confirmation message with the OpsGenie link

Incidents are mapped to OpsGenie priorities as follows:

| Modal Selection | OpsGenie Priority |
|----------------|-------------------|
| Critical       | P1               |
| High           | P2               |
| Medium         | P3               |
| Low            | P4               |

#### Development Testing

Start the development environment:
```bash
# Build the Docker image
pnpm docker:build

# Run in development mode
pnpm docker:run
```

Run the test script:
```bash
chmod +x scripts/test-local.sh
./scripts/test-local.sh
```

The test script performs these checks:
- Loads environment variables
- Tests slash command endpoint
- Tests interactivity endpoint
- Validates Slack signatures
- Checks OpsGenie API connectivity

## Need Help?
- Open an issue in the repository

## License

MIT License


