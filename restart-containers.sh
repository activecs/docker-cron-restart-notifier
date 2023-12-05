#!/bin/sh

# Access environment variables directly
containers=$RESTART_CONTAINERS
discord_webhook_url=$DISCORD_WEBHOOK_URL

# Function to send notifications to Discord
send_discord_notification() {
    if [ -n "$discord_webhook_url" ]; then
        local container_name=$1
        curl -H "Content-Type: application/json" \
             -d "{\"content\": \"Container $container_name has been successfully restarted.\"}" \
             "$discord_webhook_url"
    fi
}

# Restart each container and optionally send a Discord notification
for container in $containers
do
    echo "Restarting container $container"
    docker restart $container
    send_discord_notification $container
done
