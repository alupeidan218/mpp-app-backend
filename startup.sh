#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
npm install
npm install -g sequelize-cli
npm run seed
