# Use the official Node.js image as the base image
FROM node:16

# Set the working directory for the app
WORKDIR /usr/src/app

# Install necessary dependencies including Python and pip
RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    apt-get install -y ffmpeg

# Install yt-dlp using pip
RUN pip3 install yt-dlp

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install the app's dependencies
RUN npm install

# Copy the rest of the application code into the container
COPY . .

# Expose the port the app will run on
EXPOSE 3000

# Command to run the app
CMD ["node", "server.js"]
