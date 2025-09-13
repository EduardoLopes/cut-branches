# Path Operations Domain

This domain handles file system path operations and validation.

## Responsibilities

- Path validation and verification
- Git repository root detection
- File system path utilities

## Key Components

- **Commands**: Tauri command handlers for path operations
- **Service**: Business logic for path validation
- **Types**: Data structures for path information

## Business Rules

- Paths must be valid file system paths
- Git repository detection validates .git directory presence
- Path operations ensure security and proper access