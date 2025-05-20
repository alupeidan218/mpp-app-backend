#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
npm install

# Run database migrations
echo "Running database migrations..."
npx sequelize-cli db:migrate

# Run database seeders
echo "Running database seeders..."
npx sequelize-cli db:seed:all

# Start the application
echo "Starting the application..."
node server.js 