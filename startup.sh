#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
npm install

# Run database migrations
echo "Running database migrations..."
npx sequelize-cli db:migrate

