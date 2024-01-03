# Docker Image for Scheduled Container Restart with Discord Notifications
![build workflow](https://github.com/activecs/docker-cron-restart-notifier/actions/workflows/docker-image.yml/badge.svg)
## Overview
This Docker image is designed to automatically restart specified Docker containers every 60 days and send notifications to a Discord channel upon each restart. It's particularly useful for maintaining long-running services, ensuring they're periodically refreshed and stakeholders are informed of these actions.

## Features
- Automated Container Restart: Restart specified Docker containers.
- Discord Notifications: Sends a message to a Discord channel after each container restart.

## Running the Container
Run the container with the following command:
```bash
docker run -d -e RESTART_CONTAINERS="container1,container2" -e DISCORD_WEBHOOK_URL="your_discord_webhook_url"
```

## Environment Variables
- CRON_SCHEDULE: every 30 days by default
- RESTART_CONTAINERS: A space-separated list of container names to be restarted.
- RUN_ON_STARTUP: control immediate execution, false by default
- DISCORD_WEBHOOK_URL: The webhook URL for sending notifications to Discord.

## Sample docker-compose.yml
```yaml
version: "3.4"

services:
  restart-notifier:
    container_name: restart-notifier
    image: index.docker.io/deduard/tools:restart-notifier-20240103
    restart: unless-stopped
    environment:
      DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/11920'
      RESTART_CONTAINERS: "nervous_moore1,nervous_moore2"
      RUN_ON_STARTUP: "false"
      CRON_SCHEDULE: "0 4 * * FRI" # Every Friday at 4:00 AM
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```