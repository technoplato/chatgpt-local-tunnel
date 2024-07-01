#!/bin/bash

# Example usage:
# ./start.sh /path/to/project

if [ -z "$1" ]; then
  echo "Usage: $0 /path/to/project"
  exit 1
fi

PROJECT_PATH=$(realpath "$1")
export PROJECT_PATH

echo "Project path: $PROJECT_PATH"

# Check if Docker is running on macOS
if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Starting Docker..."
  open --background -a Docker
  while ! docker info >/dev/null 2>&1; do
    echo "Waiting for Docker to start..."
    sleep 1
  done
  echo "Docker started."
else
  echo "Docker is already running."
fi

# Retrieve and export Git user name and email
export GIT_USER_NAME=$(git config --global user.name)
export GIT_USER_EMAIL=$(git config --global user.email)

if [ -z "$GIT_USER_NAME" ] || [ -z "$GIT_USER_EMAIL" ]; then
  echo "Git user.name and/or user.email not set in .gitconfig"
  exit 1
fi

echo "Git user name: $GIT_USER_NAME"
echo "Git user email: $GIT_USER_EMAIL"

# Check if package.json or bun.lockb have changed
if git diff --quiet HEAD -- package.json bun.lockb; then
  echo "No changes in package.json or bun.lockb. Using cached dependencies."
  BUILD_ARG="--build"
else
  echo "Changes detected in package.json or bun.lockb. Rebuilding with no cache."
  BUILD_ARG="--build --no-cache"
fi

# Build and start the containers
docker-compose up $BUILD_ARG
