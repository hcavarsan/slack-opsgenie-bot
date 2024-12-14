# Slack OpsGenie Integration (Go Version)

![demo 5](https://github.com/user-attachments/assets/faa6d2c8-eeee-4fbf-a942-53584d3b5e2c)

## Why?

This bot addresses a key limitation in OpsGenie's native Slack integration: the requirement for individual OpsGenie user accounts and need to login to OpsGenie in Slack to create incidents. Using a single bot (API key), any Slack user can create incidents while the bot handles the automatic capture of user context, channel details, and team information. This reduces license costs and simplifies access management without sacrificing incident tracking capabilities.

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


## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/hcavarsan/slack-opsgenie-bot
cd slack-opsgenie-bot
go mod download
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Configure your `.env` file:
```env
SLACK_SIGNING_SECRET=your_slack_signing_secret
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
OPSGENIE_API_KEY=your-opsgenie-api-key
OPSGENIE_TEAM_ID=your-opsgenie-team-id
OPSGENIE_DOMAIN=your-domain
```

3. Start development environment:
```bash
make docker-up
```

## Deployment Options

### 1. Google Cloud Functions
```bash

# create the env.yaml file with the correct values:
cp env.yaml.example env.yaml

# Deploy to Cloud Functions
make deploy-cloud-function
```

Note: When deploying to Cloud Functions, PORT is automatically managed by the gcp.

### 2. Docker Production
```bash
# Build and run
make docker-run
```

## Development Commands
```bash
# Start development environment
make docker-up

# Stop development environment
make docker-down

# Deploy to Cloud Functions
make deploy-cloud-function

# Build and run Docker container
make docker-run

```


### Production Testing
1. Use `/create-incident` in Slack
2. Fill out the incident form:
   - Title (required)
   - Description (optional)
   - Priority (Critical/High/Medium/Low)
3. Check DMs for confirmation

Priority Mapping:

| Slack Selection | OpsGenie Priority |
|----------------|-------------------|
| Critical       | P1               |
| High           | P2               |
| Medium         | P3               |
| Low            | P4               |

## Slack App Configuration

### Required Bot Token Scopes
```
chat:write    - Send messages as the bot
commands      - Create slash commands
im:write      - Send direct messages
users:read    - Access basic user information
```

### Endpoints Configuration
1. Slash Command:
```
Command: /create-incident
URL: https://your-domain/slack/commands
```

2. Interactivity:
```
Request URL: https://your-domain/slack/interactivity
```

for slack app configuration, see [slack-manifest.yaml](slack-manifest.yaml)

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request



## License

MIT License
