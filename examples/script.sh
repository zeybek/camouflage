#!/bin/bash
# Shell Script Example
# This file demonstrates how Camouflage hides values in shell scripts

# API Keys
export API_KEY=sk-1234567890abcdef
export SECRET_KEY=super_secret_value_here

# Database Configuration
export DATABASE_URL=postgresql://user:password@localhost:5432/mydb
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=admin
export DB_PASSWORD=very_secure_password

# Authentication
export JWT_SECRET=my-jwt-secret-key-here
export AUTH_TOKEN=bearer_token_12345

# External Services
export STRIPE_API_KEY=sk_live_abcdef123456
export SENDGRID_API_KEY=SG.xxxxxxxxxxxx
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Variables without export
PUBLIC_URL=https://example.com
NODE_ENV=development
DEBUG=true

# Using variables
echo "Starting application..."
echo "Environment: $NODE_ENV"
echo "API URL: $PUBLIC_URL"

# Conditional based on environment
if [ "$NODE_ENV" = "production" ]; then
    echo "Running in production mode"
else
    echo "Running in development mode"
    export DB_HOST=localhost
fi

