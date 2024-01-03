# Stage 1: Build the Node.js application
FROM node:latest as builder

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
FROM node:alpine

# Install Docker CLI
RUN apk add --no-cache docker-cli
# Copy the built Node.js application from the builder stage
COPY --from=builder /app /app

# Set working directory
WORKDIR /app

# Set default cron schedule (30 days)
ENV CRON_SCHEDULE="0 0 0 */30 * *"
# Environment variable to control immediate execution
ENV RUN_ON_STARTUP="false"

COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
