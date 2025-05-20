#!/bin/bash

# Run database migrations
echo "Running database migrations..."
npx sequelize-cli db:migrate

# Start the application
npm start 