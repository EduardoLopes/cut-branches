#!/bin/bash

# Claude Code Hook: Type Checker
# Runs project-wide type checking when Claude finishes responding
# Provides feedback to Claude without blocking operations

# Read input from stdin
INPUT=$(cat)

# Change to project directory
cd "$(dirname "$0")/../.."

# Initialize output message
FEEDBACK=""

# Run type checking and capture output
echo "Running project-wide type checking..." >&2
set +e  # Temporarily disable exit on error
CHECK_OUTPUT=$(pnpm check 2>&1)
CHECK_EXIT_CODE=$?
set -e  # Re-enable exit on error

# Build feedback message
if [ $CHECK_EXIT_CODE -ne 0 ]; then
  # Filter out pnpm's ELIFECYCLE noise and other non-essential messages
  FILTERED_OUTPUT=$(echo "$CHECK_OUTPUT" | grep -v "ELIFECYCLE" | grep -v "ERR_PNPM" | tail -50)
  
  FEEDBACK="## Type Check Results\n\n"
  FEEDBACK+="### ❌ Type Checking Failed\n\n"
  FEEDBACK+="\`\`\`\n$FILTERED_OUTPUT\n\`\`\`\n\n"
  FEEDBACK+="**Action Required:** Fix type errors in the code.\n\n"
else
  FEEDBACK="✅ Type checking passed for the entire project"
fi

# Output JSON with feedback (escape newlines and quotes for JSON)
FEEDBACK_ESCAPED=$(echo -e "$FEEDBACK" | jq -Rs .)

cat <<EOF
{
  "systemMessage": $FEEDBACK_ESCAPED
}
EOF
