# Use the official Bun image
FROM oven/bun:latest

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy package.json and bun.lockb
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Run the application with Bun for hot reloading
CMD ["bun", "run", "--hot", "index.ts"]
