# Use the official Bun image
FROM oven/bun:latest

# Install system dependencies, including Git
RUN apt-get update && apt-get install -y patch git

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy package.json and bun.lockb
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install

# Copy the rest of the application code, including hidden files
COPY . .

# Copy the .gitconfig explicitly
#COPY .gitconfig /root/.gitconfig

# Expose the port the app runs on
EXPOSE 3000

# Run the application with Bun for hot reloading
CMD ["bun", "run", "--hot", "server.ts"]
