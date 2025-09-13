# Tauri Commands Naming Conventions

This document establishes the naming conventions for Tauri commands in the Cut Branches application. These conventions ensure consistency, clarity, and maintainability across all backend command handlers.

**Key Principle**: Each operation type has ONE standard verb pattern. No alternatives to avoid confusion.

## Overview

All Tauri commands should follow a consistent naming pattern that clearly indicates their purpose and operation type. Commands are the bridge between the frontend and backend, so their names should be intuitive for frontend developers while maintaining backend consistency.

## Command Categories

### 1. CRUD Operations

#### Create Operations

- **Pattern**: `create_*`
- **Usage**: For creating new resources or entities
- **Examples**:
  - `create_repository`
  - `create_branch`
  - `create_remote`

#### Read Operations

- **Single item**: `get_*`
- **Multiple items**: `list_*`
- **Usage**: For retrieving data without modification
- **Examples**:
  - `get_repository` (not `get_repository_info`)
  - `get_branch` (not `get_branch_details`)
  - `list_branches`
  - `list_repositories`

#### Update Operations

- **Pattern**: `update_*`
- **Usage**: For modifying existing resources
- **Examples**:
  - `update_repository_config`
  - `update_branch_description`
  - `update_commit_message`

#### Delete Operations

- **Pattern**: `delete_*`
- **Usage**: For removing resources
- **Examples**:
  - `delete_branch`
  - `delete_branches` (bulk operation)
  - `delete_remote`

### 2. Query Operations

#### Boolean Queries

- **Pattern**: `is_*`
- **Usage**: For true/false checks
- **Examples**:
  - `is_commit_reachable`
  - `is_branch_merged`
  - `is_repository_clean`

#### Validation Operations

- **Pattern**: `validate_*`
- **Usage**: For validation and health checks
- **Examples**:
  - `validate_repository_path`
  - `validate_git_installation`
  - `validate_branch_name`

### 3. Action Operations

#### State Changes

- **Pattern**: `switch_*`
- **Usage**: For changing application or repository state
- **Examples**:
  - `switch_branch`
  - `switch_repository`

#### Recovery Operations

- **Pattern**: `restore_*`
- **Usage**: For restoration and recovery operations
- **Examples**:
  - `restore_branch`
  - `restore_branches`
  - `restore_commit`

## Naming Rules

### 1. Case Convention

- **Always use `snake_case`** for command names
- ✅ `get_repository_info`
- ❌ `getRepositoryInfo`
- ❌ `GetRepositoryInfo`

### 2. Descriptive Names

- Use clear, descriptive verbs that indicate the exact operation
- Include the resource type being operated on
- **Avoid redundant words** like `info`, `data`, `details` when the verb already implies retrieval
- ✅ `get_repository` (not `get_repository_info`)
- ✅ `get_branch` (not `get_branch_details`)
- ✅ `delete_branches`
- ❌ `delete_stuff`
- ❌ `get_repository_info` (redundant)
- ❌ `get_branch_data` (redundant)

### 3. Singular vs Plural

- **Singular**: When operating on a single item
- **Plural**: When operating on multiple items or collections
- ✅ `delete_branch` (single)
- ✅ `delete_branches` (multiple)
- ✅ `list_repositories` (collection)

### 4. Domain Context

- Include domain context when the operation could be ambiguous
- Avoid redundant words that don't add clarity
- ✅ `get_repository`
- ✅ `list_branches`
- ❌ `get_info` (too generic)
- ❌ `get_repository_info` (redundant "info")

### 5. Parameter and Response Structure

- **All commands MUST use structured input/output objects**
- **Input objects**: Always suffix with `Input`
- **Output objects**: Always suffix with `Output`
- **Standard field names within objects:**
  - `path` for repository locations
  - `branch` for branch identifiers
  - `commit_sha` for commit identifiers
  - `remote` for remote identifiers

## Command Structure Standards

### Function Signature Pattern

```rust
#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CommandNameInput {
    pub path: String,
    pub branch: String,
    // Other fields as needed
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CommandNameOutput {
    pub result: String,
    // Other fields as needed
}

/// Command description explaining what it does.
///
/// # Arguments
///
/// * `input` - Input parameters for the command
///
/// # Returns
///
/// * `Result<CommandNameOutput, AppError>` - Success result or error
#[tauri::command(async)]  // Use async when appropriate
#[specta::specta]
pub async fn command_name(input: CommandNameInput) -> Result<CommandNameOutput, AppError> {
    // Implementation
}
```

### Documentation Requirements

1. **Always include a doc comment** describing the command's purpose
2. **Document the input struct** with field descriptions
3. **Document the return type** including success and error cases
4. **Include usage examples** for complex commands

### Error Handling

- Always return `Result<CommandNameOutput, AppError>`
- Use descriptive error messages
- Handle edge cases gracefully

### Type Structure Requirements

- **Input structs**: Always suffix with `Input`, use `#[derive(Serialize, Deserialize, specta::Type)]`
- **Output structs**: Always suffix with `Output`, use `#[derive(Serialize, Deserialize, specta::Type)]`
- **Serde naming**: Always use `#[serde(rename_all = "camelCase")]` for frontend compatibility
- **All commands**: Must accept exactly one parameter of type `XxxInput`
- **All commands**: Must return `Result<XxxOutput, AppError>`

## Anti-Patterns to Avoid

### ❌ Primitive Parameters

```rust
// Bad - using primitive parameters
pub fn get_repository_status(path: String, branch: String) -> Result<String, AppError>

// Good - using structured input
pub fn get_repository_status(input: GetRepositoryStatusInput) -> Result<GetRepositoryStatusOutput, AppError>
```

### ❌ Missing Input/Output Suffixes

```rust
// Bad
pub struct BranchInfo { ... }
pub struct RepositoryData { ... }

// Good
pub struct GetBranchInput { ... }
pub struct GetBranchOutput { ... }
```

### ❌ Inconsistent Verbs

```rust
// Bad - mixing different verbs for similar operations
pub fn get_branch(input: GetBranchInput) -> Result<GetBranchOutput, AppError>
pub fn fetch_repository(input: FetchRepositoryInput) -> Result<FetchRepositoryOutput, AppError>

// Good - consistent verb usage
pub fn get_branch(input: GetBranchInput) -> Result<GetBranchOutput, AppError>
pub fn get_repository(input: GetRepositoryInput) -> Result<GetRepositoryOutput, AppError>
```

## Domain Organization

Commands should be organized by domain within the codebase:

```
src-tauri/src/domains/
├── repository_management/
│   └── commands/
│       ├── create.rs      # create_*
│       ├── read.rs        # get_*, list_*
│       ├── update.rs      # update_*
│       └── delete.rs      # delete_*
├── branch_management/
│   └── commands/
│       ├── crud.rs        # create_*, get_*, list_*, update_*, delete_*
│       ├── actions.rs     # switch_*, restore_*
│       └── queries.rs     # is_*, validate_*
└── path_operations/
    └── commands.rs        # Path-related operations
```

## Migration Strategy

When updating existing commands to follow these conventions:

1. **Create new command with proper name**
2. **Update frontend to use new command**
3. **Remove old command after migration is complete**
4. **Update tests to use new command names**
5. **Update documentation references**

## Examples

### Current vs Proposed Names

| Current Name                                            | Proposed Name                                        | Input/Output Types                                  |
| ------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| `get_repo_info(path: String)`                           | `get_repository(input: GetRepositoryInput)`          | `GetRepositoryInput`, `GetRepositoryOutput`         |
| `is_commit_reachable(path: String, commit_sha: String)` | `is_commit_reachable(input: IsCommitReachableInput)` | `IsCommitReachableInput`, `IsCommitReachableOutput` |
| `switch_branch(path: String, branch: String)`           | `switch_branch(input: SwitchBranchInput)`            | `SwitchBranchInput`, `SwitchBranchOutput`           |
| `delete_branches(path: String, branches: Vec<String>)`  | `delete_branches(input: DeleteBranchesInput)`        | `DeleteBranchesInput`, `DeleteBranchesOutput`       |
| `restore_deleted_branch(...)`                           | `restore_branch(input: RestoreBranchInput)`          | `RestoreBranchInput`, `RestoreBranchOutput`         |
| `restore_deleted_branches(...)`                         | `restore_branches(input: RestoreBranchesInput)`      | `RestoreBranchesInput`, `RestoreBranchesOutput`     |

### New Command Examples

```rust
// Repository operations
#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListRepositoriesInput {
    pub base_path: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListRepositoriesOutput {
    pub repositories: Vec<Repository>,
}

pub async fn list_repositories(input: ListRepositoriesInput) -> Result<ListRepositoriesOutput, AppError>

// Branch operations - Notice: get_branch not get_branch_details
#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetBranchInput {
    pub path: String,
    pub branch: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GetBranchOutput {
    pub branch_info: Branch,
    pub commit_count: u32,
    pub last_modified: String,
}

pub async fn get_branch(input: GetBranchInput) -> Result<GetBranchOutput, AppError>

// Boolean query operations
#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct IsRepositoryCleanInput {
    pub path: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct IsRepositoryCleanOutput {
    pub is_clean: bool,
    pub uncommitted_files: Vec<String>,
}

pub async fn is_repository_clean(input: IsRepositoryCleanInput) -> Result<IsRepositoryCleanOutput, AppError>
```

---

This document should be updated as new command patterns emerge or existing conventions prove insufficient.
