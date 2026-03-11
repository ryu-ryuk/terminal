#!/bin/bash
set -euo pipefail

echo "Building the project..."
bun run build

echo "Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo "Deployment complete!"
