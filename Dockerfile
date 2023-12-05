FROM alpine:latest

RUN apk add --no-cache docker-cli curl
COPY restart-containers.sh /usr/local/bin/restart-containers.sh
RUN chmod +x /usr/local/bin/restart-containers.sh

# Set default cron schedule (60 days)
ENV CRON_SCHEDULE="0 0 */60 * *"
# Environment variable to control immediate execution
ENV RUN_ON_STARTUP="false"

# Command to conditionally run the script immediately on startup and then start cron
CMD if [ "$RUN_ON_STARTUP" = "true" ]; then /usr/local/bin/restart-containers.sh; fi && crond -f -d 8