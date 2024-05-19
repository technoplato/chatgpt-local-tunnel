#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 /path/to/project"
  exit 1
fi

PROJECT_PATH=$(realpath "$1")
export PROJECT_PATH

docker-compose down
docker-compose up --build
