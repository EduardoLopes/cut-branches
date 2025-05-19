# Cut Branches

A simple desktop application that helps you manage and delete local git branches efficiently. This tool makes it easy to identify and remove stale or merged branches, keeping your repository clean and organized.

## Features

- List all local branches in your git repository
- Identify merged branches
- Batch select/deselect branches for deletion

## Installation

Clone this repository and install dependencies:

```bash
git clone https://github.com/yourusername/cut-branches.git
cd cut-branches
pnpm install
```

## Developing

Start a development server:

```bash
pnpm run dev
```

## Building

Build the application for production:

```bash
pnpm run build
```

## Usage

1. Open the application and select your git repository
2. Review the list of local branches
3. Select branches you want to delete
4. Confirm deletion

## Code Signing (macOS)

This application is not code-signed. If you are using macOS, you may need to manually allow the application to run:

1. Open **System Settings**
2. Go to **Privacy & Security**
3. Scroll down to the **Security** section
4. You should see a message saying that the app "was blocked from use because it is not from an identified developer." Click the "Open Anyway" button

You may need to enter your administrator password to confirm.

## Technologies

- Svelte 5
- Tauri
- Panda CSS
