#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display usage
show_usage() {
  echo -e "${BLUE}Pindoba Package Link Manager${NC}"
  echo ""
  echo "Usage: $0 [link|unlink|clean|auto-link|status]"
  echo "  link      - Link all Pindoba packages for local development"
  echo "  unlink    - Unlink all Pindoba packages (remove overrides)"
  echo "  clean     - Remove overrides from package.json (for commits)"
  echo "  auto-link - Auto-link if Pindoba repo exists (for post-checkout)"
  echo "  status    - Show current link status of packages"
  echo ""
  echo -e "${YELLOW}Note: This script assumes pindoba repository is at ../pindoba${NC}"
  echo -e "${YELLOW}Automated by Lefthook for seamless git workflow${NC}"
  exit 1
}

# Check if an argument was provided
if [ $# -ne 1 ]; then
  show_usage
fi

# Path to Pindoba repository
PINDOBA_PATH="../pindoba"

# Check if Pindoba repository exists
check_pindoba_repo() {
  if [ ! -d "$PINDOBA_PATH" ]; then
    echo -e "${RED}Error: Pindoba repository not found at $PINDOBA_PATH${NC}"
    echo "Please clone the pindoba repository to the parent directory or adjust PINDOBA_PATH in this script."
    exit 1
  fi
}

# Check if Pindoba repository exists (silent for auto-link)
check_pindoba_repo_silent() {
  if [ ! -d "$PINDOBA_PATH" ]; then
    return 1
  fi
  return 0
}

# List of all packages to manage (based on current package.json)
PACKAGES=(
  # Core packages
  "$PINDOBA_PATH/packages/styled-system"
  "$PINDOBA_PATH/packages/panda-preset"
  "$PINDOBA_PATH/packages/panda-buildinfo"
  "$PINDOBA_PATH/packages/styles"

  # Svelte UI components
  "$PINDOBA_PATH/packages/ui/svelte/alert"
  "$PINDOBA_PATH/packages/ui/svelte/badge"
  "$PINDOBA_PATH/packages/ui/svelte/button"
  "$PINDOBA_PATH/packages/ui/svelte/checkbox"
  "$PINDOBA_PATH/packages/ui/svelte/dialog"
  "$PINDOBA_PATH/packages/ui/svelte/group"
  "$PINDOBA_PATH/packages/ui/svelte/loading"
  "$PINDOBA_PATH/packages/ui/svelte/navigation"
  "$PINDOBA_PATH/packages/ui/svelte/popover"
  "$PINDOBA_PATH/packages/ui/svelte/radio"
  "$PINDOBA_PATH/packages/ui/svelte/select"
  "$PINDOBA_PATH/packages/ui/svelte/text-input"

  # Svelte blocks
  "$PINDOBA_PATH/packages/blocks/svelte/pagination"
  "$PINDOBA_PATH/packages/blocks/svelte/theme-mode-select"
)

# Function to check if a package exists
package_exists() {
  local package_path="$1"
  if [ -d "$package_path" ] && [ -f "$package_path/package.json" ]; then
    return 0
  else
    return 1
  fi
}

# Function to check if package.json has overrides
has_overrides() {
  grep -q '"overrides"' package.json 2>/dev/null
}

# Get Pindoba package name from path
get_package_name() {
  local package_path="$1"
  local package_dir=$(basename "$package_path")
  local parent_dir=$(basename "$(dirname "$package_path")")

  # Map directory structure to package names
  case "$parent_dir" in
    "packages")
      echo "@pindoba/$package_dir"
      ;;
    "svelte")
      echo "@pindoba/svelte-$package_dir"
      ;;
    *)
      echo "@pindoba/$parent_dir-$package_dir"
      ;;
  esac
}

# Function to clean only Pindoba overrides from package.json
clean_overrides() {
  echo -e "${BLUE}🧹 Cleaning Pindoba overrides from package.json...${NC}"

  if ! has_overrides; then
    echo -e "${GREEN}✓ No overrides found - package.json is clean${NC}"
    return 0
  fi

  # Build list of Pindoba package names to remove
  local pindoba_packages=()
  for package_path in "${PACKAGES[@]}"; do
    if package_exists "$package_path"; then
      pindoba_packages+=("$(get_package_name "$package_path")")
    fi
  done

  if command -v jq >/dev/null 2>&1; then
    # Use jq to remove only Pindoba packages from overrides
    local temp_file="package.json"
    for pkg in "${pindoba_packages[@]}"; do
      jq "del(.pnpm.overrides[\"$pkg\"])" "$temp_file" > package.json.tmp && mv package.json.tmp "$temp_file"
    done

    # If the overrides object is now empty, remove the entire overrides key
    jq 'if (.pnpm.overrides | length) == 0 then del(.pnpm.overrides) else . end' package.json > package.json.tmp && mv package.json.tmp package.json

  else
    # Fallback: remove individual Pindoba package overrides using sed
    for pkg in "${pindoba_packages[@]}"; do
      # Escape special characters in package name for sed
      local escaped_pkg=$(echo "$pkg" | sed 's/[[\.*^$()+?{|]/\\&/g')
      # Remove the specific package override line
      sed -i.tmp "/\"$escaped_pkg\":[^,}]*/d" package.json && rm -f package.json.tmp
    done

    # Clean up empty overrides section if all overrides were removed
    sed -i.tmp '/\"overrides\":[[:space:]]*{[[:space:]]*}/d' package.json && rm -f package.json.tmp
  fi

  local removed_count=${#pindoba_packages[@]}
  echo -e "${GREEN}✓ Removed $removed_count Pindoba package overrides from package.json${NC}"

  # Regenerate pnpm-lock.yaml to match the cleaned package.json
  echo -e "${BLUE}🔄 Regenerating pnpm-lock.yaml...${NC}"
  if pnpm install --lockfile-only --ignore-scripts; then
    echo -e "${GREEN}✓ Regenerated clean pnpm-lock.yaml${NC}"
  else
    echo -e "${YELLOW}⚠ Failed to regenerate pnpm-lock.yaml (using existing)${NC}"
  fi

  return 0
}

# Function to show status of packages
show_status() {
  echo -e "${BLUE}Checking Pindoba package link status...${NC}"
  echo ""

  if has_overrides; then
    echo -e "${GREEN}✓${NC} Link mode active (overrides found in package.json)"
    echo ""

    # Count linked packages
    local linked_count=0
    echo "Linked packages:"
    for package_path in "${PACKAGES[@]}"; do
      if package_exists "$package_path"; then
        local package_name=$(basename "$package_path")
        local parent_dir=$(basename "$(dirname "$package_path")")
        if grep -q "$(basename "$package_path")" package.json 2>/dev/null; then
          echo -e "  ${GREEN}✓${NC} $parent_dir/$package_name"
          ((linked_count++))
        fi
      fi
    done
    echo ""
    echo -e "${BLUE}Summary: $linked_count linked packages${NC}"
  else
    echo -e "${RED}✗${NC} Link mode inactive (using published packages)"
    echo ""
    echo "Available packages to link:"
    local count=0
    for package_path in "${PACKAGES[@]}"; do
      if package_exists "$package_path"; then
        local package_name=$(basename "$package_path")
        local parent_dir=$(basename "$(dirname "$package_path")")
        echo -e "  ${YELLOW}○${NC} $parent_dir/$package_name"
        ((count++))
      fi
    done
    echo ""
    echo -e "${BLUE}Total: $count packages available for linking${NC}"
  fi
}

# Function to link packages
link_packages() {
  echo -e "${BLUE}Linking Pindoba packages for local development...${NC}"
  check_pindoba_repo

  # Collect all valid package paths
  local valid_packages=()
  local total_count=0

  echo "Checking package availability..."
  for package_path in "${PACKAGES[@]}"; do
    if package_exists "$package_path"; then
      valid_packages+=("$package_path")
      echo -e "  ${GREEN}✓${NC} $(basename "$(dirname "$package_path")")/$(basename "$package_path")"
      ((total_count++))
    else
      echo -e "  ${YELLOW}⚠ Skipping $package_path (not found)${NC}"
    fi
  done

  if [ ${#valid_packages[@]} -eq 0 ]; then
    echo -e "${RED}No valid packages found to link!${NC}"
    return 1
  fi

  echo ""
  echo -e "${BLUE}Linking all ${#valid_packages[@]} packages at once...${NC}"
  echo -e "${YELLOW}Running: pnpm link (with scripts ignored)${NC}"
  echo ""

  # Link all packages in a single command with scripts disabled
  if npm_config_ignore_scripts=true pnpm link "${valid_packages[@]}"; then
    echo ""
    echo -e "${GREEN}✓ All packages ($total_count/$total_count) linked successfully!${NC}"
    echo -e "${YELLOW}Lefthook will automatically clean package.json on commits.${NC}"
  else
    echo -e "${RED}Failed to link packages.${NC}"
    return 1
  fi
}

# Function to unlink packages (restore to published)
unlink_packages() {
  echo -e "${BLUE}Unlinking Pindoba packages...${NC}"

  # Clean overrides and reinstall
  clean_overrides

  echo -e "${BLUE}Reinstalling with published packages...${NC}"
  echo -e "${YELLOW}Running: pnpm install --ignore-scripts${NC}"
  echo ""
  if pnpm install --ignore-scripts; then
    echo ""
    echo -e "${GREEN}✓ All packages unlinked successfully!${NC}"
    echo -e "${GREEN}✓ Using published packages - ready for deployment!${NC}"
  else
    echo -e "${RED}Failed to reinstall packages.${NC}"
    return 1
  fi
}

# Function to auto-link (used by Lefthook post-checkout/merge)
auto_link_packages() {
  # Silent check - don't fail if Pindoba repo doesn't exist
  if ! check_pindoba_repo_silent; then
    echo -e "${YELLOW}Pindoba repository not found - using published packages${NC}"
    return 0
  fi

  # Only auto-link if we're not already linked
  if has_overrides; then
    echo -e "${GREEN}✓ Pindoba packages already linked${NC}"
    return 0
  fi

  echo -e "${BLUE}🔄 Auto-linking Pindoba packages...${NC}"

  # Collect valid packages (silent mode)
  local valid_packages=()
  for package_path in "${PACKAGES[@]}"; do
    if package_exists "$package_path"; then
      valid_packages+=("$package_path")
    fi
  done

  if [ ${#valid_packages[@]} -eq 0 ]; then
    echo -e "${YELLOW}No valid packages found to link${NC}"
    return 0
  fi

  # Link packages (silent mode for git hooks)
  echo -e "${YELLOW}Running: pnpm link (auto-mode, scripts ignored)${NC}"
  if npm_config_ignore_scripts=true pnpm link "${valid_packages[@]}" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Auto-linked ${#valid_packages[@]} Pindoba packages${NC}"
  else
    echo -e "${YELLOW}Failed to auto-link packages (using published versions)${NC}"
    return 0  # Don't fail the git operation
  fi
}

# Main script logic
case "$1" in
  "link")
    link_packages
    ;;
  "unlink")
    unlink_packages
    ;;
  "clean")
    clean_overrides
    ;;
  "auto-link")
    auto_link_packages
    ;;
  "status")
    check_pindoba_repo
    show_status
    ;;
  *)
    show_usage
    ;;
esac 