# Use the official Bun image
FROM oven/bun:latest

# Install system dependencies, including Git
RUN apt-get update && apt-get install -y patch git

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy package.json and bun.lockb
COPY ../package.json bun.lockb ./

# Install dependencies
RUN bun install

# Copy the rest of the application code, including hidden files
COPY . .

# Set Git user name and email if provided
ARG GIT_USER_NAME
ARG GIT_USER_EMAIL

RUN if [ -n "$GIT_USER_NAME" ] && [ -n "$GIT_USER_EMAIL" ]; then \
      echo "Setting Git user name and email"; \
      git config --global user.name "$GIT_USER_NAME"; \
      git config --global user.email "$GIT_USER_EMAIL"; \
    else \
      echo "Git user name or email not provided"; \
    fi

# Expose the port the app runs on
EXPOSE 3000

# Run the application with Bun for hot reloading
CMD ["bun", "run", "--hot", "src/server.ts"]

