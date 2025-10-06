# Docker Image for Scheduled Container Restart with Discord/Slack Notifications
![release workflow](https://github.com/activecs/docker-cron-restart-notifier/actions/workflows/merge-or-push-to-main.yml/badge.svg)

> [!IMPORTANT]
> **New Docker Registry Available!**
> We've moved to a dedicated Docker repository: `deduard/docker-cron-restart-notifier`
>
> **Recommended:** Use the new repository with semantic versioning tags:
> - `deduard/docker-cron-restart-notifier:latest` - Latest stable release
> - `deduard/docker-cron-restart-notifier:2` - Latest v2.x.x
> - `deduard/docker-cron-restart-notifier:2.5` - Latest v2.5.x
> - `deduard/docker-cron-restart-notifier:2.5.0` - Specific version
>
> **Legacy:** `deduard/tools:restart-notifier-latest` (still maintained but deprecated)

## Overview
This Docker image is designed to automatically restart specified Docker containers and send notifications to a Discord channel or/and Slack channel upon each restart. It's particularly useful for maintaining long-running services, ensuring they're periodically refreshed and stakeholders are informed of these actions.

## Features
- Automated Container Restart: Restart specified Docker containers.
- (optional) Discord Notifications: Sends a message to a Discord channel after each container restart.
- (optional) Slack Notifications: Sends a message to a Slack channel after each container restart.
- Support for Docker Socket Proxy for enhanced security
- Configurable execution timing and intervals

## Notification Examples
### Successful Container Restart
#### Discord
![Discord Success Notification](https://raw.githubusercontent.com/activecs/docker-cron-restart-notifier/main/docs/discord-success.png)
#### Slack
![Slack Success Notification](https://raw.githubusercontent.com/activecs/docker-cron-restart-notifier/main/docs/slack-success.png)

### Failed Container Restart
#### Discord
![Discord Error Notification](https://raw.githubusercontent.com/activecs/docker-cron-restart-notifier/main/docs/discord-error.png)
#### Slack
TBA
### Next Execution Schedule
#### Discord
![Discord Schedule Notification](https://raw.githubusercontent.com/activecs/docker-cron-restart-notifier/main/docs/discord-scheduled.png)
#### Slack
TBA

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_WEBHOOK_URL` | Discord webhook URL for notifications | - |
| `SLACK_WEBHOOK_URL` | Slack webhook URL for notifications | - |
| `RESTART_CONTAINERS` | Comma-separated list of container names to restart | - |
| `RUN_ON_STARTUP` | Whether to run on container startup | `false` |
| `CRON_SCHEDULE` | Cron expression for scheduling restarts | `0 4 * * FRI` |
| `CYCLE_PERIOD` | Time between container restarts (ms) | `10000` |
| `DOCKER_HOST` | Docker daemon connection URL (optional) | - |
| `TZ` | TimeZone (optional) | `UTC` |
| `IDENTIFIER` | Custom identifier for this host (optional) | hostname |

### Docker Connection Options

The application supports two ways to connect to the Docker daemon:

1. **Direct Socket Access (Default)**
   - Uses the Docker socket at `/var/run/docker.sock`
   - Requires mounting the socket in the container
   - Example Docker Compose configuration:
     ```yaml
     volumes:
       - /var/run/docker.sock:/var/run/docker.sock
     ```

2. **Docker Socket Proxy (Optional)**
   - Uses a secure proxy to access the Docker API
   - Requires the [Docker Socket Proxy](https://github.com/Tecnativa/docker-socket-proxy) service
   - Example Docker Compose configuration:
     ```yaml
     environment:
       DOCKER_HOST: 'tcp://docker-socket-proxy:2375'
     networks:
       - docker-socket-proxy
     ```

## Running the Container

### Using New Repository (Recommended)
```bash
docker run -d \
  -e CRON_SCHEDULE="0 4 * * FRI" \
  -e RESTART_CONTAINERS="container1,container2" \
  -e DISCORD_WEBHOOK_URL="your_discord_webhook_url" \
  -e SLACK_WEBHOOK_URL="your_slack_webhook_url" \
  -e IDENTIFIER="Proxmox VM102" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  deduard/docker-cron-restart-notifier:latest
```

<details>
<summary>Using Legacy Repository</summary>

```bash
docker run -d \
  -e CRON_SCHEDULE="0 4 * * FRI" \
  -e RESTART_CONTAINERS="container1,container2" \
  -e DISCORD_WEBHOOK_URL="your_discord_webhook_url" \
  -e SLACK_WEBHOOK_URL="your_slack_webhook_url" \
  -e IDENTIFIER="Proxmox VM102" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  deduard/tools:restart-notifier-latest
```
</details>

## Sample docker-compose.yml

### Using New Repository (Recommended)
```yaml
services:
  restart-notifier:
    container_name: restart-notifier
    image: deduard/docker-cron-restart-notifier:latest  # or use :2 for major version pinning
    restart: unless-stopped
    environment:
      DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN'
      SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
      RESTART_CONTAINERS: "container1,container2"
      RUN_ON_STARTUP: "false"
      CRON_SCHEDULE: "0 4 * * FRI" # Every Friday at 4:00 AM
      CYCLE_PERIOD: "10000" # 10 seconds between container restarts
      IDENTIFIER: "Proxmox VM102" # Custom identifier for notifications
      TZ: "Europe/Kiev" # Optional: set timezone
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

<details>
<summary>Using Legacy Repository</summary>

```yaml
services:
  restart-notifier:
    container_name: restart-notifier
    image: deduard/tools:restart-notifier-latest
    restart: unless-stopped
    environment:
      DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN'
      SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
      RESTART_CONTAINERS: "container1,container2"
      RUN_ON_STARTUP: "false"
      CRON_SCHEDULE: "0 4 * * FRI"
      CYCLE_PERIOD: "10000"
      IDENTIFIER: "Proxmox VM102"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```
</details>
