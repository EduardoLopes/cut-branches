#!/bin/bash

# Claude Code Hook: Code Design Validator
# This hook reminds Claude to follow the code design guidelines

# Log hook execution (optional - for debugging)
# echo "$(date): Hook executed" >> /Users/eduardolopes/Projects/cut-branches/.claude/hooks/hook-log.txt

cat << 'EOF'
{
  "decision": "allow",
  "additionalContext": "## Code Design Compliance Reminder

Before making any changes, verify compliance with these CRITICAL rules:

### Pre-Edit Decision Checklist
- [ ] Is this code domain-specific or globally reusable?
- [ ] If domain-specific, which existing domain does it belong to?
- [ ] If creating a new file, does a similar one already exist that I should edit instead?
- [ ] Does this follow kebab-case naming? (my-component.svelte, user-profile/)
- [ ] Am I importing code between domains? ❌ **NOT ALLOWED**
- [ ] Does this follow operation naming patterns (create/update/delete/get/list)?
- [ ] Should this be in core/composables/ (application logic) or core/models/ (domain logic)?
- [ ] Can this domain concept be represented as a Value Object? (e.g., Email, BranchName, RepositoryPath)

### Critical Rules
1. **Domain Isolation**: ❌ NEVER import between domains. ✅ Promote shared code to global directories
2. **Prefer Editing Over Creating**: ✅ ALWAYS prefer editing existing files
3. **Route Files Must Be Thin**: Keep business logic in domain directories
4. **Co-locate Tests**: Place tests in __tests__/ next to code
5. **File Naming**: Use kebab-case for all files and directories

### Code Placement
- Domain-specific → src/domains/[domain-name]/
- Global UI components → src/ui/core/
- Global utilities (stateless) → src/utils/
- Global logic (stateful) → src/lib/
- Pure domain models → src/core/
- Domain-specific models → src/domains/[domain-name]/core/models/
- Infrastructure services → src/services/

**Code design violations are considered bugs and must be avoided.**

Refer to docs/code-design-guide.md for complete guidelines."
}
EOF
