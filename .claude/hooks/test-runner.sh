#!/bin/bash

# Claude Code Hook: Test Runner
# Runs file-specific tests after file modifications
# Provides feedback to Claude without blocking operations

set -e

# Read input from stdin
INPUT=$(cat)

# Parse the tool name and file path from input
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Only run for TypeScript/Svelte/JavaScript files
if [[ ! "$FILE_PATH" =~ \.(ts|svelte|js)$ ]]; then
  echo '{"decision": "allow"}'
  exit 0
fi

# Change to project directory
cd "$(dirname "$0")/../.."

# Initialize output message
FEEDBACK=""

# Run file-specific tests silently and capture output
echo "Running tests for $FILE_PATH..." >&2
TEST_OUTPUT=$(pnpm test -- "$FILE_PATH" 2>&1 || true)
TEST_EXIT_CODE=$?

# Build feedback message
if [ $TEST_EXIT_CODE -ne 0 ]; then
  FEEDBACK="## Test Results\n\n"
  FEEDBACK+="File modified: \`$FILE_PATH\`\n\n"
  FEEDBACK+="### ❌ Tests Failed\n\n"
  FEEDBACK+="\`\`\`\n$(echo "$TEST_OUTPUT" | tail -50)\n\`\`\`\n\n"
  FEEDBACK+="**Action Required:** Review test failures. Consider:\n"
  FEEDBACK+="- Is the new behavior correct? → Update the test\n"
  FEEDBACK+="- Is the test revealing a bug? → Fix the code\n\n"
else
  FEEDBACK="✅ Tests passed for \`$FILE_PATH\`"
fi

# Output JSON with feedback (escape newlines and quotes for JSON)
FEEDBACK_ESCAPED=$(echo -e "$FEEDBACK" | jq -Rs .)

cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": $FEEDBACK_ESCAPED
  }
}
EOF
