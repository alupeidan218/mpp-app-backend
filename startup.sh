#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
npm install
node backend/seed.js
