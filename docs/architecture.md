# Framework-Agnostic Frontend Architecture

This document defines the architectural principles for building modern frontend
applications. The architecture uses a modular, feature-driven approach to improve
scalability and maintainability, regardless of the specific framework (for example, React,
Vue, Solid, or Svelte).

**File Naming Convention:** Use kebab-case for all file and directory names (for example,
`my-component.js` or `user-profile/`). Component names in code should follow the standard
convention for the chosen framework or library (for example, PascalCase).

## **Root Directory: src/**

The `src/` directory contains all source code for the application.

## **1\. `domains/` \- Feature Modules**

The `domains/` directory contains the application's features. Each sub-directory in `domains/`
is a self-contained feature module that encapsulates all logic for a specific business
domain (for example, `user-profile/` or `product-listing/`). This structure enables better
code separation and allows teams to work on features independently.

### **1.0. Domain Structure**

Each feature folder encapsulates all code for that feature. Place test files in
`__tests__` sub-directories inside the directory of the code being tested. A typical
domain can include some or all of the following sub-directories. Create these folders only
when needed.

- `README.md`: Explains the domain's purpose, key responsibilities, business rules, and
  interactions.
- `assets/`: Feature-specific static assets organized by type:

  - `assets/images/` (optional): Domain-specific images, illustrations, and graphics.
  - `assets/icons/` (optional): Feature-specific icons and SVG assets.
  - `assets/fonts/` (optional): Domain-specific typography assets.
  - `assets/videos/` (optional): Feature-related multimedia content.
  - `assets/documents/` (optional): Domain-specific PDFs, guides, or documentation files.

  **Note:** Domain assets follow the same organizational pattern as global assets (see section 4), but contain content specific to that feature only. Create asset subfolders only when you have multiple assets of that type. Simple domains might place all assets directly in the `assets/` folder.

- `components/`: UI components used only within this feature.
- `logic/`: Modules containing stateful or business logic. For complex domains, this can be
  split into application/ and domain/ as described below.
- `views/`: Top-level presentational components. A route renders a view.
- `[feature-name]-routes.js`: Route definitions for the feature (for configuration-based
  routing).
- `store/` (optional): Feature-specific state management modules.
- `types/` (optional): TypeScript type definitions specific to the domain.
- `translations/` (optional): Internationalization files for the feature.
- `utils/` (optional): Helper functions used only within the feature.
- `layouts/` (optional): Layout components used only by views within this feature.

### **1.1. Advanced: Separating Application and Domain Logic**

For domains with significant business complexity, it is highly recommended to further
separate logic into two distinct categories: **Application Logic** and **Domain Logic
(Models)**. This is a core principle of Domain-Driven Design (DDD) that greatly improves
testability and clarity.

- **Domain Logic (`logic/domain/` or `logic/models/`)**: This is the core of your feature. It
  contains pure, framework-agnostic business rules and behavior. A **model** is a software
  representation of a real-world concept (e.g., a ShoppingCart or a User). It knows
  nothing about the UI, APIs, or your chosen framework.
- **Application Logic (`logic/application/` or `logic/use-cases/`)**: This layer orchestrates
  the domain logic. It acts as the bridge between the UI and the domain models. Hooks,
  controllers, or composables live here. They are responsible for handling user input,
  fetching data, and calling methods on the domain models.

**Example: A Shopping Cart Domain**

1. The Domain Model (`domains/shopping-cart/logic/domain/cart.js`)

This pure class represents the idea of a cart and enforces its rules.

```javascript
// This is the "model". It's pure business logic.
export class Cart {
	constructor(items = []) {
		this.items = items;
	}
	addItem(newItem) {
		if (newItem.stock < 1) {
			throw new Error('Cannot add out-of-stock items.');
		}
		this.items.push(newItem);
	}
	calculateTotal() {
		return this.items.reduce((total, item) => total + item.price, 0);
	}
}
```

2. The Application Logic (`domains/shopping-cart/logic/application/use-cart.js`)

This React hook uses the model to connect it to the application.

```javascript
2. The Application Logic (domains/shopping-cart/logic/application/use-cart.js)

   This React hook uses the model to connect it to the application.

   import { Cart } from `../domain/cart.js`;
   import { api } from `../../../services/api.js`;
   import { useState, useEffect } from 'react';
   export function useCart() {
     const [cartModel, setCartModel] = useState(new Cart());
     const [isLoading, setIsLoading] = useState(false);
     useEffect(() => {
       setIsLoading(true);
       api.get(`/cart`).then(data => setCartModel(new Cart(data.items))).finally(() => setIsLoading(false));
     }, []);
     function handleAddItemToCart(item) {
       const newCart = new Cart([...cartModel.items]);
       try {
         newCart.addItem(item); // Use the model's business logic
         setCartModel(newCart);
       } catch (error) { alert(error.message); }
     }
     return { cart: cartModel, isLoading, handleAddItemToCart };
   }
```

### **1.2. Inter-Domain Code Sharing: An Anti-Pattern**

**Directly importing code between domains is an anti-pattern.** It creates tight coupling
and undermines modularity.

The Solution: Promote Shared Code  
If logic from one domain is needed in another, promote it to a global directory
(`src/utils/`, `src/logic/`, etc.) and have both domains import it from there.

### **1.3. Inter-Domain Communication: An Anti-Pattern**

Just as direct code imports are prohibited, direct runtime communication (e.g., one domain
calling a function in another) is also an anti-pattern.

The Solution: Mediate with a Global Event Bus  
Domains must communicate indirectly through a global event bus (a publish/subscribe
system), likely defined in `src/services/event-bus.js`.

- **Publish:** A domain sends an event to the bus, unaware of who is listening.
- **Subscribe:** Other domains listen for events they care about.

This ensures domains remain completely decoupled.

## **2\. `ui/` \- Global UI Components**

The central library for globally reusable UI components. Do not use barrel files
(`index.js`).

- `ui/core/`: Atomic, abstract building blocks (e.g., button, input).
- `ui/patterns/` (Optional): Composed components for common, opinionated UI tasks (e.g.,
  confirm-modal).
- `ui/lab/` (Optional): Experimental or highly specialized components.

## **3\. Routing**

- **Configuration-Based (React Router, Vue Router):** A central `router/` directory
  aggregates route configurations from each domain's `[feature-name]-routes.js` file.
- **File-Based (Next.js, SvelteKit):** A top-level `src/pages/` or `src/routes/` directory
  defines the URL structure. These files should be lean, fetching data and rendering a
  **view** from the relevant `domains/` directory.

## **4\. Other Global Directories**

- `layouts/`: Global page structure templates (e.g., app shell).
- `assets/`: Global static resources organized by type:
  - `assets/images/`: Brand logos, hero backgrounds, global illustrations, and placeholder images.
  - `assets/fonts/`: Typography assets like web fonts (`.woff2`, `.woff`, `.ttf` files).
  - `assets/icons/`: Icon systems including SVG sprites, favicon files, and global icon assets.
  - `assets/videos/`: Brand videos, background videos, and other multimedia content.
  - `assets/documents/`: Global PDFs, downloadable content, and documentation files.
- `styles/`: Global stylesheets, CSS resets, and design tokens (`theme.css`).
- `logic/`: Global stateful or business logic.
- `utils/`: Global, stateless utility functions.
- `services/`: Global, shared services that handle cross-cutting concerns or infrastructure
  interactions. Examples include API clients, a global event bus, logging services, or
  browser API wrappers.
- `store/`: Global state management.
- `types/`: Globally shared TypeScript types.

## **5\. Testing and Documentation**

- **Co-location:** Place unit tests in a `__tests__/` subdirectory. Place `README.md`
  files inside any significant folder to explain its purpose.
- **Project Level:** Use a root `tests/` for E2E tests and a `docs/` for high-level
  documentation. The `docs/` directory should contain:
  - `architecture.md`: This document.
  - `onboarding-guide.md`: Instructions for new developers.
  - `adr/`: A directory for **Architectural Decision Records (ADRs)**.

## **6\. Relationship to Vertical Slice Architecture**

This architecture is a direct application of the **Vertical Slice Architecture (VSA)**
philosophy, adapted for modern frontend development. Instead of organizing code by
technical layers (e.g., a global `components/` folder, a global `hooks/` folder), it organizes
code by feature.

- **High Cohesion:** All the code needed for a single feature (the UI, logic, assets)
  lives together in one place (`domains/[feature-name]/`), making it easy to reason about
  and modify.
- **Low Coupling:** Strict rules against direct inter-domain communication ensure that
  features are independent and can be developed in parallel without interfering with one
  another.
- **Frontend Adaptation:** In a backend context, a vertical slice runs from the API
  endpoint to the database. In this frontend architecture, a slice runs from the user
  interface (the URL and the view) down to the API client layer (`services/api/`).

## **7\. Glossary**

- **ADR (Architectural Decision Record):** A document that captures an important
  architectural decision, its context, and the consequences. ADRs provide a historical
  record of _why_ the system is built the way it is.
- **Anti-Pattern:** A common response to a recurring problem that appears to be a good
  solution but ultimately creates more problems.
- **Application Logic:** The layer that orchestrates domain models and connects them to
  the UI and infrastructure. Often implemented as hooks or controllers.
- **Barrel File:** A single `index.js` file that exports all other modules in a directory.
  Discouraged in this architecture to improve tree-shaking.
- **Co-location:** The practice of placing related files together in the same directory.
  In this architecture, tests (`__tests__/`) and documentation (`README.md`) are
  co-located with the code they describe.
- **Cohesion:** The degree to which the elements inside a module belong together. This
  architecture aims for high cohesion by grouping all code related to a single feature
  within the same domain folder.
- **Core Component:** A global UI component from `ui/core/` that is atomic, abstract, and
  highly reusable (e.g., button, input).
- **Coupling:** The degree to which one module depends on another. This architecture aims
  for low coupling by forbidding direct communication between domains.
- **Domain / Feature:** A self-contained, vertical slice of the application corresponding
  to a specific business capability.
- **Event Bus:** A global, publish-subscribe mechanism that allows different parts of an
  application (such as domains) to communicate without being directly aware of each other.
- **Global Module:** A module located directly under `src/` that provides shared,
  cross-cutting functionality for the entire application (e.g., `ui/`, `utils/`, `services/`).
- **Model (Domain Model):** A pure, framework-agnostic software representation of a
  real-world business concept (e.g., a ShoppingCart class). It contains data and the
  business rules that apply to it.
- **Pattern Component:** A global UI component from `ui/patterns/` that is composed of
  several core components to solve a common, opinionated UI task (e.g., confirm-modal).
- **Vertical Slice Architecture:** An architectural pattern where code is organized by
  feature (a "vertical slice") rather than by technical layer (a "horizontal layer").
- **View:** A top-level presentational component, typically in
  `domains/[feature-name]/views/`. A route's primary job is to render a view.

## **8\. Summary of Directory Scopes**

- **Feature-Scoped (within `domains/[feature-name]/`):** All directories related to a
  feature's operation (`components/`, `logic/`, `views/`, etc.).
- **Globally-Scoped (direct children of `src/`):** `ui/`, `router/`, `layouts/`, `assets/`, `styles/`,
  `logic/`, `utils/`, `services/`, `store/`, and `types/`.
- **Project-Level (root):** A `docs/` directory for high-level documentation and a `tests/`
  directory for E2E/integration tests.

## **9\. Key Architectural Principles**

- **Modularity:** Domain-driven organization supports parallel development.
- **Reusability:** Global directories promote DRY principles for common logic and UI.
- **Clear Separation:** Explicit scopes for feature-specific, global, application, and
  domain logic minimize cognitive load.
- **Maintainability:** Co-located tests and documentation improve code quality and
  longevity.
- **Framework Independence:** These principles are adaptable to any modern frontend
  framework.
- **Team Autonomy:** Clear boundaries empower teams to own features with reduced
  interference.
