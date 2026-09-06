#!/bin/bash

# Claude Code Hook: Test Runner
# Runs project-wide tests when Claude finishes responding
# Provides feedback to Claude without blocking operations

# Read input from stdin
INPUT=$(cat)

# Change to project directory
cd "$(dirname "$0")/../.."

# Initialize output message
FEEDBACK=""

# Run all tests and capture output
echo "Running project-wide tests..." >&2
set +e  # Temporarily disable exit on error
TEST_OUTPUT=$(pnpm test 2>&1)
TEST_EXIT_CODE=$?
set -e  # Re-enable exit on error

# Build feedback message
if [ $TEST_EXIT_CODE -ne 0 ]; then
  # Filter out pnpm's ELIFECYCLE noise and take last 50 lines
  FILTERED_OUTPUT=$(echo "$TEST_OUTPUT" | grep -v "ELIFECYCLE" | grep -v "ERR_PNPM" | tail -50)

  FEEDBACK="## Test Results\n\n"
  FEEDBACK+="### ❌ Tests Failed\n\n"
  FEEDBACK+="\`\`\`\n$FILTERED_OUTPUT\n\`\`\`\n\n"
  FEEDBACK+="**Action Required:** Fix test failures. Consider:\n"
  FEEDBACK+="- Is the new behavior correct? → Update the test\n"
  FEEDBACK+="- Is the test revealing a bug? → Fix the code\n\n"
else
  FEEDBACK="✅ All tests passed for the entire project"
fi

# Output JSON with feedback (escape newlines and quotes for JSON)
FEEDBACK_ESCAPED=$(echo -e "$FEEDBACK" | jq -Rs .)

cat <<EOF
{
  "systemMessage": $FEEDBACK_ESCAPED
}
EOF
