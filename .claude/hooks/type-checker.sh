#!/bin/bash

# Claude Code Hook: Type Checker
# Runs project-wide type checking when Claude finishes responding
# Provides feedback to Claude without blocking operations

set -e

# Read input from stdin
INPUT=$(cat)

# Change to project directory
cd "$(dirname "$0")/../.."

# Initialize output message
FEEDBACK=""

# Run type checking and capture output
echo "Running project-wide type checking..." >&2
CHECK_OUTPUT=$(pnpm check 2>&1 || true)
CHECK_EXIT_CODE=$?

# Build feedback message
if [ $CHECK_EXIT_CODE -ne 0 ]; then
  FEEDBACK="## Type Check Results\n\n"
  FEEDBACK+="### ❌ Type Checking Failed\n\n"
  FEEDBACK+="\`\`\`\n$(echo "$CHECK_OUTPUT" | tail -50)\n\`\`\`\n\n"
  FEEDBACK+="**Action Required:** Fix type errors in the code.\n\n"
else
  FEEDBACK="✅ Type checking passed for the entire project"
fi

# Output JSON with feedback (escape newlines and quotes for JSON)
FEEDBACK_ESCAPED=$(echo -e "$FEEDBACK" | jq -Rs .)

cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "Stop",
    "additionalContext": $FEEDBACK_ESCAPED
  }
}
EOF
