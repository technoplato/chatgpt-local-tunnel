# Use the official Node.js image
FROM node:18

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Install nodemon for hot reloading
RUN npm install -g nodemon

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Run the application with nodemon for hot reloading
CMD ["nodemon", "--watch", ".", "server.js"]
