# Stage 1: Build the Node.js application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY notifier-app/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY notifier-app/ .

RUN ls -la /app/*

# Stage 2: Setup the final image
FROM node:20-alpine

# Install TimeZone info
RUN apk add --no-cache tzdata

# Install Docker CLI
RUN apk add --no-cache docker-cli
# Copy the built Node.js application from the builder stage
COPY --from=builder /app /app

# Set working directory
WORKDIR /app

# Create log directory
RUN mkdir -p /var/log/restart-notifier

# Set default cron schedule (the 15th of each month)
ENV CRON_SCHEDULE="0 0 0 15 * *"
# Environment variable to control immediate execution
ENV RUN_ON_STARTUP="false"

COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh

# Define volume for logs
VOLUME ["/var/log/restart-notifier"]

ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
