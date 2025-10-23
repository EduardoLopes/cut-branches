## A Practical Guide to Web Frontend Software Design

This document defines a set of principles for building modern frontend applications. The core idea is a modular, feature-driven approach that improves scalability and maintainability.

### A Design Inspired by Architecture

This document outlines a comprehensive **software design** for building modern web applications. It provides a practical and prescriptive system for organizing code, structuring features, and managing communication between different parts of an application.

The design is heavily inspired by **Vertical Slice Architecture (VSA)**, a pattern where the system is organized around features ("vertical slices") rather than technical layers. This guide provides the concrete "how-to"—including folder structures, file conventions, and communication patterns—to successfully realize the benefits of VSA in a real-world frontend project.

### Core Principles

This design is built on a set of core principles that work together to create a scalable and maintainable codebase.

1.  **Modularity & High Cohesion:** The system is broken down into feature-based modules (`domains/`) that are self-contained. All the code for a single feature lives together, making it easy to reason about and modify.

2.  **Low Coupling:** Clear boundaries and rules (like forbidding direct communication between domains) ensure that features are independent and can be developed in parallel without interfering with one another.

3.  **Tool-Flexible:** The design principles can be applied to any modern frontend framework or library (such as React, Vue, Solid, or Svelte). The goal is not to write code that is free of framework-specific features; on the contrary, an implementation of this design will and should leverage the full power of the chosen tool.

4.  **Clear Separation of Concerns:** Explicit scopes exist for feature-specific logic, global utilities, application orchestration, and pure domain models, which minimizes cognitive load.

**File Naming Convention:** Use `kebab-case` for all file and directory names (for example, `my-component.js` or `user-profile/`). Component names in code should follow the standard convention for the chosen framework or library (for example, `PascalCase`).

### Root Directory: `src/`

The `src/` directory contains all source code for the application.

### 1. `domains/` - Feature Modules

The `domains/` directory contains the application's features. Each sub-directory in `domains/` is a self-contained feature module that encapsulates all logic for a specific business domain (for example, `user-profile/` or `product-listing/`). This structure enables better code separation and allows teams to work on features independently.

#### 1.0. Domain Structure

Each feature folder encapsulates all code for that feature. Place test files in `__tests__` sub-directories inside the directory of the code being tested. A typical domain can include some or all of the following sub-directories. Create these folders only when needed.

- `README.md`: Explains the domain's purpose, key responsibilities, business rules, and interactions.

- `assets/`: Feature-specific static assets.

- `components/`: UI components used only within this feature.

- `core/`: Modules containing the feature's core logic. For complex features, this can be split into `composables/` (or `hooks/`) and `domain/` as described below.

- `views/`: Top-level presentational components. A route renders a view.

- `[feature-name]-routes.js`: Route definitions for the feature (for configuration-based routing).

- `store/` (optional): Feature-specific state management modules.

- `types/` (optional): TypeScript type definitions specific to the domain.

- `translations/` (optional): Internationalization files for the feature.

- `utils/` (optional): Helper functions used only within the feature.

- `layouts/` (optional): Layout components used only by views within this feature.

#### 1.1. Advanced: Separating Application and Domain Logic

For domains with significant business complexity, it is highly recommended to further separate logic within the `logic/` directory into two distinct categories: **Application Logic** and **Domain Logic (Models)**. This is a core principle of Domain-Driven Design (DDD) that greatly improves testability and clarity.

- **Domain Logic (`core/models/`)**: This is the pure business logic of your feature. It contains rules and behavior for the frontend, written to be independent of the chosen UI framework or library. A **model** is a software representation of a real-world concept (e.g., a `ShoppingCart` or a `User`). It knows nothing about the UI or APIs.

- **Application Logic (`core/composables/` or `core/hooks/`)**: This layer orchestrates the domain logic and connects the UI to underlying services. While `composables` is used here as a generic term, teams should feel free to use a name that is more idiomatic for their chosen tool (e.g., `hooks` for React). Its responsibilities include:
  - **Encapsulating Stateful Logic:** This layer is inherently stateful. If the logic were stateless and reusable, it would belong in a `utils/` directory.

  - **Defining Data Flow:** Creating configurations or "recipes" for fetching and updating data, such as instantiating TanStack Query definitions.

  - **Orchestrating Actions:** Translating user events into calls to domain models or services.

  - **Managing UI-specific State:** Handling loading, error, and other states related to asynchronous operations.

#### 1.2. Inter-Domain Code Sharing: An Anti-Pattern

**Directly importing code between domains is an anti-pattern.** It creates tight coupling and undermines modularity.

**The Solution: Promote Shared Code**
If logic from one domain is needed in another, **promote** it to a global directory (`src/utils/`, `src/core/`, etc.) and have both domains import it from there.

#### 1.3. Inter-Domain Communication: An Anti-Pattern

Just as direct code imports are prohibited, direct runtime communication (e.g., one domain calling a function in another) is also an anti-pattern.

**The Solution: Mediate with a Global Event Bus**
Domains must communicate indirectly through a global event bus (a publish/subscribe system), likely defined in `src/services/event-bus.js`.

- **Publish:** A domain sends an event to the bus, unaware of who is listening.

- **Subscribe:** Other domains listen for events they care about.

This ensures domains remain completely decoupled.

### 2. `ui/` - Global UI Components

The central library for globally reusable UI components. Do not use barrel files (`index.js`).

- `ui/core/`: Atomic, abstract building blocks (e.g., `button`, `input`).

- `ui/patterns/` (Optional): Composed components for common, opinionated UI tasks (e.g., `confirm-modal`).

- `ui/lab/` (Optional): Experimental or highly specialized components.

### 3. Routing

- **Configuration-Based (React Router, Vue Router):** A central `router/` directory aggregates route configurations from each domain's `[feature-name]-routes.js` file.

- **File-Based (Next.js, SvelteKit):** A top-level `src/pages/` or `src/routes/` directory defines the URL structure. These files should be lean, fetching data and rendering a **view** from the relevant `domains/` directory.

### 4. Other Global Directories

- `layouts/`: Global page structure templates (e.g., app shell).

- `assets/`: Global static resources like images and fonts.

- `styles/`: Global stylesheets, CSS resets, and design tokens (`theme.css`).

- `core/`: Global, pure domain logic and models that can be shared across multiple features (e.g., a shared `Money` or `Address` model). Note that this is distinct from the `core/` folder found inside each domain.

- `lib/` (or `hooks/`, `composables/`): Globally reusable, stateful, and framework-dependent logic. This is the ideal place for shared custom hooks (React), composables (Vue), or similar constructs that are not tied to a specific business domain (e.g., `useDebounce`, `useLocalStorage`).

- `utils/`: Global, stateless utility functions that are independent of any UI framework or library.

- `services/`: Global, shared services that handle cross-cutting concerns or infrastructure interactions. Examples include API clients, a global event bus, logging services, or browser API wrappers.

- `store/`: Global state management.

- `auth/`: Dedicated authentication and authorization logic.

- `types/`: Globally shared TypeScript types.

### 5. Testing and Documentation

- **Co-location:** Place unit tests in a `__tests__/` subdirectory. Place `README.md` files inside any significant folder to explain its purpose.

- **Project Level:** Use a root `tests/` for E2E tests and a `docs/` for high-level documentation. The `docs/` directory should contain:
  - `design-guide.md`: This document.

  - `onboarding-guide.md`: Instructions for new developers.

  - `adr/`: A directory for **Architectural Decision Records (ADRs)**.

### 6. Glossary

- **ADR (Architectural Decision Record):** A document that captures an important architectural decision, its context, and the consequences. ADRs provide a historical record of _why_ the system is built the way it is.

- **Anti-Pattern:** A common response to a recurring problem that appears to be a good solution but ultimately creates more problems.

- **Application Logic:** The layer that orchestrates domain models and connects them to the UI and infrastructure. Often implemented as hooks or controllers.

- **Barrel File:** A single `index.js` file that exports all other modules in a directory. Discouraged in this design to improve tree-shaking.

- **Co-location:** The practice of placing related files together in the same directory.

- **Cohesion:** The degree to which the elements inside a module belong together. This design aims for high cohesion by grouping all code related to a single feature within the same domain folder.

- **Core Component:** A global UI component from `ui/core/` that is atomic, abstract, and highly reusable (e.g., `button`, `input`).

- **Coupling:** The degree to which one module depends on another. This design aims for low coupling by forbidding direct communication between domains.

- **Domain / Feature:** A self-contained, vertical slice of the application corresponding to a specific business capability.

- **Event Bus:** A global, publish-subscribe mechanism that allows different parts of an application to communicate without being directly aware of each other.

- **Global Module:** A module located directly under `src/` that provides shared, cross-cutting functionality.

- **Model (Domain Model):** A pure software representation of a real-world business concept, written to be independent of the chosen UI framework or library.

- **Pattern Component:** A global UI component from `ui/patterns/` that is composed of several core components to solve a common, opinionated UI task.

- **Software Architecture:** The fundamental, high-level organization of a system. This design is inspired by the Vertical Slice Architecture pattern.

- **Software Design:** The specific, concrete implementation of an architecture, including folder structures and coding patterns. This document is a software design guide.

- **Vertical Slice Architecture:** An architectural pattern where code is organized by feature (a "vertical slice") rather than by technical layer.

- **View:** A top-level presentational component, typically in `domains/[feature-name]/views/`.

### 7. Key Principles

- **Modularity:** Domain-driven organization supports parallel development.

- **Reusability:** Global directories promote DRY principles.

- **Clear Separation:** Explicit scopes for feature-specific, global, application, and domain logic minimize cognitive load.

- **Maintainability:** The modular, feature-driven design makes it easier to locate code, understand its scope, and make changes with confidence.

- **Tool-Flexibility:** These principles are adaptable to any modern frontend tool.

- **Team Autonomy:** Clear boundaries empower teams to own features with reduced interference.
