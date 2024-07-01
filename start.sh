#!/bin/bash

# Example usage:
# ./start.sh /path/to/project

if [ -z "$1" ]; then
  # Check if the first argument is empty.
  # If it is, print the usage and exit.
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
    # Wait until Docker daemon is running
    echo "Waiting for Docker to start..."
    sleep 1
  done
  echo "Docker started."
else
  echo "Docker is already running."
fi

# Retrieve Git user name and email
GIT_USER_NAME=$(git config --global user.name)
GIT_USER_EMAIL=$(git config --global user.email)

# Check if values were retrieved
if [ -z "$GIT_USER_NAME" ] || [ -z "$GIT_USER_EMAIL" ]; then
  echo "Git user.name and/or user.email not set in .gitconfig"
  exit 1
fi

# Export Git user name and email as environment variables
export GIT_USER_NAME
export GIT_USER_EMAIL

echo "Git user name: $GIT_USER_NAME"
echo "Git user email: $GIT_USER_EMAIL"

# Pass the environment variables to Docker
docker-compose down
GIT_USER_NAME=$GIT_USER_NAME GIT_USER_EMAIL=$GIT_USER_EMAIL docker-compose build --no-cache
GIT_USER_NAME=$GIT_USER_NAME GIT_USER_EMAIL=$GIT_USER_EMAIL docker-compose up

# After Docker Compose is up, check the contents of the project directory
echo "Contents of $PROJECT_PATH:"
ls -la "$PROJECT_PATH"

# Check Docker container status
echo "Docker container status:"
docker-compose ps

# Print Docker logs
echo "Docker logs:"
docker-compose logs
