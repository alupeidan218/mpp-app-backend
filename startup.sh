#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
npm install

# Run database migrations
echo "Running database migrations..."
npx sequelize-cli db:migrate

# Start the application
echo "Starting the application..."
node server.js 