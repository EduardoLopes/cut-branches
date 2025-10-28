#!/bin/bash

# Load environment variables from .env if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Convert to lowercase for case-insensitive comparison (portable way)
USE_LOCAL_PINDOBA_LOWER=$(echo "$USE_LOCAL_PINDOBA" | tr '[:upper:]' '[:lower:]')

# Check if USE_LOCAL_PINDOBA is set to true (case-insensitive)
if [ "$USE_LOCAL_PINDOBA_LOWER" = "true" ] || [ "$USE_LOCAL_PINDOBA" = "1" ]; then
  echo "USE_LOCAL_PINDOBA is enabled - linking local Pindoba packages..."
  bash scripts/manage-pindoba-links.sh link
else
  echo "USE_LOCAL_PINDOBA is disabled - using published Pindoba packages"
  echo "To enable local linking, set USE_LOCAL_PINDOBA=true in your .env file"
fi
