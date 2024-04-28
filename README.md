# Docker Image for Scheduled Container Restart with Discord/Slack Notifications
![build workflow](https://github.com/activecs/docker-cron-restart-notifier/actions/workflows/merge-or-push-to-main.yml/badge.svg)
## Overview
This Docker image is designed to automatically restart specified Docker containers and send notifications to a Discord channel or/and Slack channel upon each restart. It's particularly useful for maintaining long-running services, ensuring they're periodically refreshed and stakeholders are informed of these actions.

## Features
- Automated Container Restart: Restart specified Docker containers.
- (optional)Discord Notifications: Sends a message to a Discord channel after each container restart.
- (optional)Slack Notifications: Sends a message to a Slack channel after each container restart.

## Running the Container
Run the container with the following command:
```bash
docker run -d \
  -e CRON_SCHEDULE="0 4 * * FRI" \
  -e RESTART_CONTAINERS="container1,container2" \
  -e DISCORD_WEBHOOK_URL="your_discord_webhook_url" \
  -e SLACK_WEBHOOK_URL="your_slack_webhook_url" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  index.docker.io/deduard/tools:restart-notifier-latest
```

## Environment Variables
- CRON_SCHEDULE: every 30 days by default
- RESTART_CONTAINERS: A comma-separated list of container names to be restarted.
- CYCLE_PERIOD: delay between container restarts, 10000ms (10 sec) by default
- RUN_ON_STARTUP: control immediate execution, false by default
- DISCORD_WEBHOOK_URL: The webhook URL for sending notifications to Discord.
- SLACK_WEBHOOK_URL: The webhook URL for sending notifications to Slack.

## Sample docker-compose.yml
```yaml

services:
  restart-notifier:
    container_name: restart-notifier
    image: index.docker.io/deduard/tools:restart-notifier-latest
    restart: unless-stopped
    environment:
      DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/119207436456853270/mRC3HfPoT5_MFsvn3sHUuG1Qeeg3WTUAo_bf0LR8'
      SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/T04JS2CSY4U/B06HRRFSRGW/1UL9bv1i1JnaYsUBo'
      RESTART_CONTAINERS: "nervous_moore1,nervous_moore2"
      RUN_ON_STARTUP: "false"
      CRON_SCHEDULE: "0 4 * * FRI" # Every Friday at 4:00 AM
      CYCLE_PERIOD: "10000" # 10 sec
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```
