# Restore Deleted Branches - Implementation Plan

This document outlines the implementation tasks for the "Restore Deleted Branches" feature as specified in the requirements.

## Overview

The "Restore Deleted Branches" feature will allow users to view branches that were previously deleted by the application and restore them. The implementation will include UI components, data persistence, and backend Tauri commands to handle the restoration process.

## Tasks

### 1. Data Storage and Management

- [x] Design and implement deleted branch log data structure (schema)
- [x] Create a Svelte store for managing deleted branch data
- [x] Implement persistence of deleted branch log using Tauri's storage capabilities
- [x] Update existing branch deletion process to record branch information to the deletion log
- [x] Implement SHA reachability checking utility function

### 2. Backend (Tauri/Rust) Implementation

- [x] Implement `restore_deleted_branch` Tauri command:
  - [x] Add command definition in Rust
  - [x] Implement conflict detection logic
  - [x] Implement branch restoration logic
  - [x] Implement conflict resolution handling (overwrite, rename, skip)
  - [x] Add proper error handling and response formatting
- [x] Implement SHA reachability checking command to verify commit SHAs exist
- [x] Update existing delete branch command to ensure proper logging of overwritten branches

### 3. UI Components

- [x] Create "Restore" button in the main repository management area
- [x] Implement "Restore Deleted Branches" page:
  - [x] Create page layout and navigation
  - [x] Implement deleted branch list component with:
    - [x] Branch name display
    - [x] SHA display with validity indicator
    - [x] Relative deletion time with absolute time tooltip
    - [x] Last commit message (if available)
    - [x] Selection controls (checkboxes)
  - [x] Implement search/filter functionality for branch names
  - [x] Add sorting capabilities (by name and deletion date)
  - [x] Implement visual indicators for unreachable SHAs
  - [x] Disable selection for branches with unreachable SHAs
- [x] Implement Restoration Modal:
  - [x] Create modal component with loading indicator
  - [x] Implement conflict resolution UI (Overwrite, Rename, Skip options)
  - [x] Display restoration progress and results
  - [x] Add confirmation step for branch overwrite operations

### 4. State Management and Integration

- [x] Connect UI components to deleted branch store
- [x] Implement action creators/services for restoration operations
- [x] Integrate SHA validation with branch display and selection
- [x] Update main branch list after successful restoration
- [x] Create utility functions for date formatting (relative and absolute)

### 5. Testing

- [ ] Write unit tests for deleted branch store
- [ ] Write unit tests for restoration services
- [ ] Write unit tests for Tauri commands
- [ ] Write integration tests for the restoration workflow
- [ ] Test edge cases:
  - [ ] Unreachable SHAs
  - [ ] Name conflicts
  - [ ] Invalid repository paths

### 6. Documentation

- [x] Update component diagram to include new components
- [x] Document data flow for branch deletion and restoration
- [x] Add user documentation for the restore feature
- [ ] Document API contracts for new Tauri commands

### 7. Final Integration and QA

- [ ] Perform integration testing with the complete application
- [ ] Verify all acceptance criteria are met
- [ ] Fix any bugs or issues discovered during testing
- [ ] Gather feedback and make adjustments as needed

## Acceptance Criteria Reference

For reference, here are the acceptance criteria from the specification:

1. A "Restore Branches" button is present in the main repository management area
2. Clicking it navigates to the restore page
3. The restore page lists branches from the internal deletion log with appropriate indicators for unreachable SHAs
4. Users can select one or more branches with reachable SHAs
5. The "Restore Selected Branches" button is enabled only when valid branches are selected
6. Clicking "Restore" triggers the restoration process for selected branches
7. A modal appears showing the restoration progress
8. Name conflicts are handled with Overwrite/Rename/Skip options
9. The modal accurately reflects the final status for each restoration attempt
10. Successfully restored branches appear in the main branch list
11. The deleted branches list is updated accordingly
12. Branch deletion and overwrite operations are properly logged
13. Clear warnings are provided before overwrite operations
14. Branches with unreachable SHAs cannot be selected for restoration

## Component Integration

This feature will integrate with the existing components as shown in the component diagram:

- New UI components will interact with the existing Svelte stores
- New Tauri commands will be added to the existing backend structure
- The feature will maintain consistency with the current application design and patterns
