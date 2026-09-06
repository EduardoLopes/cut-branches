#!/usr/bin/env bash
#
# check-domain-boundaries.sh — enforce the no-cross-domain-import rule (§1.3, §6).
#
# Rust gives no compiler enforcement of domain isolation inside a single crate
# (§1.7), so this grep-based check is the mechanism. It flags:
#
#   1. A file under `src/domains/<A>/` that references `crate::domains::<B>::`
#      for any B != A  (a forbidden cross-domain import).
#   2. A file under `src/shared/` that references `crate::domains::` at all
#      (shared infrastructure must not depend upward on a domain — an inversion).
#
# RATCHET MODE (default): known violations are recorded in
# `scripts/domain-boundaries-baseline.txt`. The check fails only on violations
# that are NOT in the baseline, so the number may only go down. Regenerate the
# baseline with `--update-baseline` (do this only to REMOVE fixed violations).
#
# BLOCKING MODE: pass `--strict` (or set STRICT=1) to fail on ANY violation and
# ignore the baseline. Flip CI to this once the baseline reaches empty (Phase 7).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$(cd "$SCRIPT_DIR/../src" && pwd)"
DOMAINS_DIR="$SRC_DIR/domains"
BASELINE_FILE="$SCRIPT_DIR/domain-boundaries-baseline.txt"

MODE="ratchet"
case "${1:-}" in
  --update-baseline) MODE="update" ;;
  --strict) MODE="strict" ;;
esac
[ "${STRICT:-0}" = "1" ] && MODE="strict"

# Discover domain names (immediate subdirectories of domains/).
DOMAINS=()
while IFS= read -r d; do
  DOMAINS+=("$d")
done < <(find "$DOMAINS_DIR" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort)

# Collect violations as "relative/path.rs::crate::domains::<other>" signatures.
collect_violations() {
  # Rule 1: cross-domain imports inside domains/.
  for owner in "${DOMAINS[@]}"; do
    while IFS= read -r -d '' file; do
      for other in "${DOMAINS[@]}"; do
        [ "$other" = "$owner" ] && continue
        if grep -qE "crate::domains::${other}::" "$file"; then
          rel="${file#"$SRC_DIR"/}"
          echo "${rel}::crate::domains::${other}"
        fi
      done
    done < <(find "$DOMAINS_DIR/$owner" -name '*.rs' -print0)
  done

  # Rule 2: shared/ depending upward on any domain.
  if [ -d "$SRC_DIR/shared" ]; then
    while IFS= read -r -d '' file; do
      if grep -qE "crate::domains::" "$file"; then
        rel="${file#"$SRC_DIR"/}"
        echo "${rel}::crate::domains"
      fi
    done < <(find "$SRC_DIR/shared" -name '*.rs' -print0)
  fi
}

VIOLATIONS="$(collect_violations | sort -u)"

if [ "$MODE" = "update" ]; then
  printf '%s\n' "$VIOLATIONS" | sed '/^$/d' > "$BASELINE_FILE"
  echo "Baseline updated ($(printf '%s\n' "$VIOLATIONS" | sed '/^$/d' | wc -l | tr -d ' ') violations recorded)."
  exit 0
fi

if [ "$MODE" = "strict" ]; then
  if [ -n "$VIOLATIONS" ]; then
    echo "❌ Cross-domain boundary violations (§1.3):"
    printf '%s\n' "$VIOLATIONS" | sed 's/^/  - /'
    exit 1
  fi
  echo "✅ No cross-domain boundary violations."
  exit 0
fi

# Ratchet mode: fail only on violations absent from the baseline.
touch "$BASELINE_FILE"
NEW="$(comm -23 <(printf '%s\n' "$VIOLATIONS" | sed '/^$/d') <(sort -u "$BASELINE_FILE"))"
if [ -n "$NEW" ]; then
  echo "❌ New cross-domain boundary violations (§1.3) — not permitted:"
  printf '%s\n' "$NEW" | sed 's/^/  - /'
  echo ""
  echo "Fix them, or (only if truly unavoidable and documented via an ADR)"
  echo "run: bash scripts/check-domain-boundaries.sh --update-baseline"
  exit 1
fi

BASELINE_COUNT="$(sed '/^$/d' "$BASELINE_FILE" | wc -l | tr -d ' ')"
CURRENT_COUNT="$(printf '%s\n' "$VIOLATIONS" | sed '/^$/d' | wc -l | tr -d ' ')"
echo "✅ No new cross-domain violations. Baseline: $BASELINE_COUNT, current: $CURRENT_COUNT."
if [ "$CURRENT_COUNT" -lt "$BASELINE_COUNT" ]; then
  echo "ℹ️  Violations decreased — trim the baseline with --update-baseline."
fi
exit 0
