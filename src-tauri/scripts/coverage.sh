#!/bin/bash

# Run cargo-tarpaulin with HTML report output
cargo tarpaulin --out Html --fail-under 50

# Open the HTML report if it exists and the command succeeded
if [ $? -eq 0 ] && [ -f "tarpaulin-report.html" ]; then
  echo "Opening coverage report..."
  
  # Check the operating system and use the appropriate command
  if [ "$(uname)" == "Darwin" ]; then
    open tarpaulin-report.html
  elif [ "$(uname)" == "Linux" ]; then
    xdg-open tarpaulin-report.html
  elif [ "$(expr substr $(uname -s) 1 5)" == "MINGW" ]; then
    start tarpaulin-report.html
  else
    echo "Coverage report generated at: $(pwd)/tarpaulin-report.html"
  fi
fi