#!/bin/bash

# Function to display usage
show_usage() {
  echo "Usage: $0 [link|unlink]"
  echo "  link   - Link all Pindoba packages"
  echo "  unlink - Unlink all Pindoba packages"
  exit 1
}

# Check if an argument was provided
if [ $# -ne 1 ]; then
  show_usage
fi

# List of all packages to manage
PACKAGES="\
  ../pindoba/packages/ui/svelte/alert \
  ../pindoba/packages/ui/svelte/badge \
  ../pindoba/packages/ui/svelte/button \
  ../pindoba/packages/ui/svelte/checkbox \
  ../pindoba/packages/ui/svelte/dialog \
  ../pindoba/packages/ui/svelte/group \
  ../pindoba/packages/ui/svelte/loading \
  ../pindoba/packages/ui/svelte/navigation \
  ../pindoba/packages/ui/svelte/popover \
  ../pindoba/packages/ui/svelte/radio \
  ../pindoba/packages/ui/svelte/select \
  ../pindoba/packages/ui/svelte/text-input \
  ../pindoba/packages/blocks/svelte/pagination \
  ../pindoba/packages/blocks/svelte/theme-mode-select"

case "$1" in
  "link")
    echo "Linking Pindoba packages..."
    pnpm link $PACKAGES
    echo "All packages linked successfully!"
    ;;
  "unlink")
    echo "Unlinking Pindoba packages..."
    pnpm unlink $PACKAGES
    echo "All packages unlinked successfully!"
    ;;
  *)
    show_usage
    ;;
esac 