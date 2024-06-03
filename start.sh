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

# Pass the environment variables to Docker
docker-compose down
GIT_USER_NAME=$GIT_USER_NAME GIT_USER_EMAIL=$GIT_USER_EMAIL docker-compose build --no-cache
GIT_USER_NAME=$GIT_USER_NAME GIT_USER_EMAIL=$GIT_USER_EMAIL docker-compose up
