# Use the official Node.js image as the base image
FROM node:16

# Set the working directory for the app
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm install

# Install yt-dlp (use apt to install yt-dlp)
RUN apt-get update && apt-get install -y yt-dlp

# Copy the rest of the application code to the container
COPY . .

# Expose the port the app will run on
EXPOSE 3000

# Command to run the app
CMD ["node", "server.js"]
