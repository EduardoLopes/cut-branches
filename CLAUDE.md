# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cut Branches is a Tauri-based desktop application for managing and cleaning up Git repository branches. The frontend is built with Svelte 5 and uses Panda CSS for styling, while the backend is written in Rust.

## Development Commands

### Frontend Development

- `pnpm run dev` - Start Tauri development server
- `pnpm run dev:svelte` - Start Svelte dev server only
- `pnpm run build` - Build production application
- `pnpm run build:debug` - Build debug version with backtraces

### Code Quality & Linting

- `pnpm run lint` - Run ESLint (fails on warnings)
- `pnpm run lint:fix` - Auto-fix ESLint issues
- `pnpm run format` - Check Prettier formatting
- `pnpm run format:fix` - Auto-fix formatting
- `pnpm run check` - Run Svelte type checking

### Testing

- `pnpm test` - Run all frontend tests with coverage (silent)
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:ui` - Run tests with UI interface
- `pnpm test -- [FILE_PATH]` - Run tests for specific file

### Rust Testing & Coverage

- `pnpm run test:cargo` - Run Rust tests
- `pnpm run test:cargo:coverage` - Run Rust tests with coverage
- `pnpm run test:cargo:coverage:html` - Generate HTML coverage report
- `pnpm run test:cargo:coverage:open` - Generate and open coverage report
- `pnpm rust:fmt` - Check Rust formatting
- `pnpm rust:clippy` - Run Rust linter
- `pnpm rust:check` - Run all Rust quality checks

### Package Management

- `pnpm prepare` - Setup project (runs after install)
- `pnpm update-all` - Update all dependencies (npm + cargo)

## Architecture

### Frontend Architecture (Svelte 5 + SvelteKit)

The project follows a domain-driven architecture with clear separation of concerns:

**File Structure:**

- `src/domains/` - Feature modules (branch-management, repository-management, notifications, navigation)
- `src/ui/core/` - Global reusable UI components
- `src/utils/` - Global utility functions and stores
- `src/routes/` - SvelteKit file-based routing
- `src/components/` - Global non-UI components (providers, etc.)
- `src/assets/` - Source assets for components (images, icons, fonts, videos, documents)
- `src/styles/` - Global stylesheets and design tokens
- `src/services/` - Global shared services and infrastructure
- `src/store/` - Global state management
- `static/` - Build-time static assets served from root URL (favicon, robots.txt)

**Key Domains:**

- **branch-management**: Core branch operations, bulk actions, search/filtering
- **repository-management**: Repository selection and management
- **notifications**: Toast notifications system
- **navigation**: Application navigation and menus

**State Management:**

- Uses Svelte 5 runes with custom store utilities
- Global state in `src/store/global-store.svelte.ts`
- Domain-specific stores within each domain
- TanStack Query for server state management

### Backend Architecture (Rust + Tauri)

**Structure:**

- `src-tauri/src/commands/` - Tauri command handlers (repo.rs, branch.rs, commit.rs)
- `src-tauri/src/git/` - Git operations using git2 crate
- `src-tauri/src/error.rs` - Error handling
- `src-tauri/src/path.rs` - Path utilities

**Key Features:**

- Git repository operations via git2 crate
- Branch listing, deletion, and restoration
- Commit reachability checking
- Repository path validation

## Testing Strategy

### Frontend Testing (Vitest + Testing Library)

- Co-located tests in `__tests__/` folders
- Component testing with `@testing-library/svelte`
- 100% branch coverage requirement
- Integration tests for complex flows

**Testing Commands:**

- Always run `pnpm test` for coverage analysis
- Write tests to cover every conditional branch
- Use `getByRole` for accessibility compliance

### Rust Testing

- Unit tests co-located with source files
- Use `cargo test` for running tests
- LLVM-based coverage analysis available
- Test utilities in `src-tauri/src/test_utils.rs`

## Dependencies & Tools

**Frontend Stack:**

- Svelte 5 with SvelteKit
- Panda CSS for styling
- TanStack Query for data fetching
- Vitest for testing
- TypeScript with strict configuration

**Backend Stack:**

- Tauri 2.x for desktop app framework
- git2 for Git operations
- tokio for async runtime
- serde for serialization

**Development Tools:**

- pnpm as package manager
- ESLint + Prettier for code quality
- Lefthook for Git hooks
- Changesets for version management

## Key Development Notes

### CRITICAL: Code Design Rules (MUST FOLLOW)

**BEFORE making any code changes, you MUST verify compliance with these rules:**

#### Pre-Edit Decision Checklist

When creating or editing files, ask yourself:

- [ ] Is this code domain-specific or globally reusable?
- [ ] If domain-specific, which existing domain does it belong to?
- [ ] If creating a new file, does a similar one already exist that I should edit instead?
- [ ] Does this follow our file naming conventions (kebab-case)?
- [ ] Am I importing code between domains? ❌ **NOT ALLOWED**
- [ ] Does this follow our operation naming patterns (create/update/delete/get/list)?
- [ ] Should this logic be in `core/composables/` (application logic) or `core/models/` (domain logic)?
- [ ] Can this domain concept be represented as a Value Object? (e.g., Email, BranchName, RepositoryPath)

#### Critical Code Design Rules

1. **Domain Isolation - NO EXCEPTIONS**
   - ❌ **NEVER** import code directly between domains
   - ✅ If code is needed by multiple domains, **promote it** to a global directory (`src/utils/`, `src/services/`, `src/core/`)
   - ✅ Domains communicate only through a global event bus or shared services

2. **Route Files Must Be Thin**
   - Routes in `src/routes/` should only orchestrate and compose domain components
   - Keep business logic in domain directories, not in route files

3. **Co-locate Tests**
   - Place tests in `__tests__/` directories next to the code they test
   - 100% branch coverage requirement for all new code

4. **File Naming Conventions**
   - Use **kebab-case** for all files and directories (e.g., `my-component.svelte`, `user-profile/`)
   - Follow operation naming patterns (see "Operations Naming Convention" section below)

5. **Prefer Editing Over Creating**
   - ✅ **ALWAYS** prefer editing existing files over creating new ones
   - Only create new files when absolutely necessary

6. **Shared Code Promotion Strategy**
   - Domain-specific code → `src/domains/[domain-name]/`
   - Globally reusable UI components → `src/ui/core/`
   - Globally reusable utilities (stateless) → `src/utils/`
   - Globally reusable logic (stateful, framework-dependent) → `src/lib/`
   - Pure domain models & Value Objects (shared) → `src/core/`
   - Domain-specific models & Value Objects → `src/domains/[domain-name]/core/models/`
   - Infrastructure services → `src/services/`

7. **Use Value Objects for Domain Concepts**
   - ✅ **DO** use Value Objects for domain concepts like `Email`, `Money`, `BranchName`, `RepositoryPath`, `CommitHash`
   - ✅ Value Objects should be **immutable** (no setters, properties are readonly)
   - ✅ Value Objects use **value equality** (two objects with same values are considered equal)
   - ✅ Encapsulate **validation logic** in the constructor (throw errors for invalid values)
   - ✅ Provide type safety and make domain rules explicit in code
   - **Placement**:
     - Shared Value Objects → `src/core/`
     - Domain-specific Value Objects → `src/domains/[domain-name]/core/models/`
   - **Example**:

     ```typescript
     class Email {
     	private readonly value: string;

     	constructor(email: string) {
     		if (!this.isValid(email)) {
     			throw new Error('Invalid email format');
     		}
     		this.value = email;
     	}

     	getValue(): string {
     		return this.value;
     	}
     	equals(other: Email): boolean {
     		return this.value === other.value;
     	}
     	private isValid(email: string): boolean {
     		/* validation */
     	}
     }
     ```

**For complete code design guidelines, see [@docs/code-design-guide.md](docs/code-design-guide.md)**

**Code design violations are considered bugs and must be avoided.**

---

### Code Style

- Frontend: kebab-case files, camelCase variables, PascalCase components
- TypeScript: Use `import type` for type-only imports
- Rust: Standard Rust conventions
- 100% test coverage requirement for all new code

### Operations Naming Convention

All operation functions follow the pattern: **[Action][Resource][Identifier]**

#### Actions (State Changes)

| Action         | Semantics                                                              | Example                     |
| -------------- | ---------------------------------------------------------------------- | --------------------------- |
| **create**     | Standard instantiation of the primary resource                         | createProduct               |
| **add**        | Linking a sub-resource or item to a collection/relationship            | addComment                  |
| **update**     | Generic modification of one or more existing fields                    | updateUserProfile           |
| **set**        | Explicitly defining or replacing entire content of a specific property | setPermissions              |
| **delete**     | Permanent destruction of the resource                                  | deleteInvoice               |
| **remove**     | Dissociating a relationship or soft-deleting from a collection         | removeItemFromCart          |
| **clear**      | Emptying or resetting contents of an entire container (batch action)   | clearCart, clearActivityLog |
| **toggle**     | Changing a resource's status or state flag                             | toggleSubscriptionStatus    |
| **activate**   | Enabling or activating a resource                                      | activateUser                |
| **deactivate** | Disabling or deactivating a resource                                   | deactivateUser              |
| **archive**    | Moving resource to archived state                                      | archiveOrder                |
| **restore**    | Restoring resource from archived/deleted state                         | restoreOrder                |

#### Queries (Data Retrieval)

| Action   | Semantics                                                     | Example      |
| -------- | ------------------------------------------------------------- | ------------ |
| **get**  | Retrieves a single, specific resource by its identifier       | getProduct   |
| **list** | Retrieves a collection of resources (standard for pagination) | listProducts |

#### Identifiers

| Identifier Type      | Usage                                  | Examples                         |
| -------------------- | -------------------------------------- | -------------------------------- |
| **Single Target**    | Identifying one specific resource      | ById, ByEmail, BySlug, ByName    |
| **Multiple Targets** | Collection scope or batch operations   | Batch, List, All                 |
| **Property Change**  | Specific property being modified       | Status, Visibility, Price, Title |
| **None**             | Simple creation or simple bulk actions | createProduct, clearCart         |

#### File Naming

| Function Name      | File Name               | Resource |
| ------------------ | ----------------------- | -------- |
| createProduct      | create_product.rs       | Product  |
| updateUserEmail    | update_user_email.rs    | User     |
| deleteCommentById  | delete_comment_by_id.rs | Comment  |
| deleteProductList  | delete_product_list.rs  | Product  |
| deleteProductBatch | delete_product_batch.rs | Product  |
| clearCart          | clear_cart.rs           | Cart     |
| addOrderItem       | add_order_item.rs       | Item     |
| toggleUserStatus   | toggle_user_status.rs   | User     |
| getProduct         | get_product.rs          | Product  |
| getProductList     | get_product_list.rs     | Product  |

Every command should have an input and output struct with the name of the command and the suffixes Input and Output.

### Auto-Generated Files

- `src/lib/bindings.ts` - **DO NOT EDIT MANUALLY** - This file is auto-generated by Tauri during successful builds. It contains TypeScript bindings for Rust commands and types. Manual changes will be overwritten.

### Git Workflow

- Feature branches from `main`
- Conventional commit messages
- Pre-commit hooks for quality checks

### Framework-Specific Guidelines

- Svelte 5 runes for reactivity
- Use `tick()` for DOM updates in tests
- Prefer composition over inheritance
- Domain-driven file organization over feature folders

### Code Design Compliance

The project follows the **Framework-Agnostic Frontend Code Design** principles as described in [this article](https://eduardolopes.dev.br/en/blog/framework-agnostic-frontend-architecture/). Key principles:

**Core Code Design Principles:**

1. **Vertical Slice Architecture** - Features organized as self-contained vertical slices
2. **Domain-Driven Design** - Business logic organized around domain concepts
3. **High Cohesion** - Related code kept together
4. **Low Coupling** - Minimal dependencies between modules
5. **Framework Independence** - Architecture adaptable across different frameworks

**Directory Organization:**

- `src/domains/` - Self-contained feature modules with components, logic, views, tests, and assets
- `src/ui/core/` - Atomic, abstract, globally reusable UI components
- `src/ui/patterns/` - Composed UI solutions (not currently used)
- `src/ui/lab/` - Experimental components (not currently used)
- `src/services/` - Infrastructure services and shared functionality
- `src/routes/` - SvelteKit file-based routing (thin orchestration layers)
- `src/assets/` - Source assets for components (images, icons, fonts, videos, documents)
- `src/styles/` - Global stylesheets and design tokens
- `src/utils/` - Shared utility functions
- `src/store/` - Global state management
- `static/` - Build-time static assets served from root URL (favicon, robots.txt)

**Code Design Rules:**

- **Domain Isolation**: No direct imports between domains - use global event bus or shared services
- **Route Files**: Should be thin orchestration layers that compose domain components
- **Co-located Tests**: Tests placed in `__tests__/` directories near the code they test
- **Documentation**: Significant folders should include README.md files
- **Shared Code Promotion**: Code needed by multiple domains should be promoted to global directories
- **Static Assets Strategy**: Hybrid approach with `src/assets/` for source assets and `static/` for build assets (see [@docs/adr/002-static-assets-strategy.md](docs/adr/002-static-assets-strategy.md))

For detailed design guidelines, see [@docs/code-design-guide.md](docs/code-design-guide.md)
