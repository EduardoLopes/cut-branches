## **A Practical Guide to Feature-Driven Software Design**

This document defines a set of principles for building modern, scalable software applications. Whether you are building a React frontend, a Node.js backend, a Rust/Tauri desktop app, or transitioning to a full-stack monorepo, the core idea remains the same: a modular, feature-driven approach based on **Vertical Slice Architecture (VSA)** and **Domain-Driven Design (DDD)**.

A note before we begin: VSA and DDD coexist well most of the time, but they pull in different directions. VSA encourages duplication within a slice to keep features independent. DDD encourages a shared, precise vocabulary across the system. When you hit a concept that genuinely spans two slices, the answer is rarely "promote to a shared model"—it's more often "these are two different concepts that happen to share a name." Section 1.4 covers how to handle that tension.

### **Architecture vs. Code Design**

It is important to distinguish between software **architecture** and **code design**:

- **Software Architecture (The "Big Picture"):** The fundamental, high-level structural decisions. It defines the system's shape, its major boundaries, and the rules governing their relationships (e.g., "We will use Vertical Slices to decouple features").
- **Code Design (The Tactics):** The detailed implementation within those constraints. It defines how we organize files, name functions, and structure modules (e.g., "We will use a `domains/` folder to implement those slices").

### **Architectural Layers**

This guide refers to four layers throughout. Establishing them once here keeps the vocabulary consistent across sections:

- **Delivery Layer.** How the feature talks to the outside world: UI components, HTTP controllers, GraphQL resolvers, IPC handlers, message-queue consumers. The delivery layer is also called the _presentation layer_ in frontend contexts—they are the same thing.
- **Application Layer.** The use-cases that orchestrate domain logic and call out to infrastructure. This is where "reset the user's password" lives as a single coherent flow.
- **Domain Layer.** Pure business rules, entities, value objects, and domain events. No I/O, no framework imports.
- **Infrastructure Layer.** Concrete implementations of ports defined by the domain: databases, HTTP clients, the filesystem, message brokers.

The dependency rule: **Delivery → Application → Domain ← Infrastructure**. Infrastructure depends on the domain (it implements the domain's ports), not the other way around.

### **Core Principles**

1. **Modularity & High Cohesion:** The codebase is broken down into feature-based modules (`domains/`). All the code for a single feature lives together, making it easy to reason about, locate, and modify.
2. **Strict Boundaries (Low Coupling):** Clear rules forbid direct, undocumented communication and deep importing between domains. Features must be independent.
3. **Unidirectional Dependencies:** Dependencies flow inward as described above. Pure domain models must never import transport- or framework-specific delivery code.
4. **Tool-Agnostic Philosophy:** The architectural concepts apply to any modern framework or language (TypeScript, Rust, Go, Python, Kotlin).
5. **Clear Separation of Concerns:** Explicit scopes exist for pure domain models, infrastructure, application orchestration, and delivery.
6. **Mechanical Enforcement Over Convention:** A rule that depends on developer discipline alone has a half-life of months. Whenever possible, enforce architectural rules with linters, compiler flags, or build-graph constraints (see Section 6).

### **General Conventions**

- **File and Directory Naming:** File and directory names must follow the host language's idiomatic style (e.g., `snake_case` for Rust/Python, `kebab-case` or `PascalCase` for TypeScript/React). Pick one standard for the ecosystem and apply it consistently across the project. Consistency is the rule, not a specific case style. _Examples in this guide use `kebab-case` because the JavaScript/TypeScript ecosystem is the most common audience; substitute the convention for your language._

### **1. `domains/` - Feature Modules**

The `src/domains/` directory contains the application's features. Each sub-directory is a self-contained feature module encapsulating all logic for a specific business domain (e.g., `user-profile/`, `branch-management/`, `identity/`).

> **Terminology note:** This guide uses "domain" in two related senses. In DDD, a _domain_ is the problem space (e.g., "logistics"). In this folder structure, a _domain_ is the directory implementing a _bounded context_ within that problem space. When the distinction matters, the text says so explicitly.

#### **1.1. Domain Structure (Frontend & Backend)**

A well-structured domain maps the architectural layers (defined above) to concrete folders. Create these folders _only_ when needed:

- **Delivery Layer** (how the feature interacts with the outside world):
  - `components/`, `views/` (FE): UI components and top-level pages.
  - `layouts/` (FE): Layout components used exclusively by views within this feature.
  - `controllers/`, `resolvers/` (BE): API route handlers or GraphQL resolvers.
  - `handlers/` or `ipc/` (Desktop/Native): Inter-Process Communication handlers (Electron IPC, Tauri commands). This serves the same role as an HTTP controller; only the transport differs.
- **Core (Application + Domain)** — the "brain" of the feature:
  - `core/`: Contains models and application logic (see Section 1.2).
- **Infrastructure Layer** (how the feature talks to external systems):
  - `infrastructure/` (or specialized names like `repositories/`, `api/`, `git/`): Code that reaches out to databases, external APIs, or the filesystem. It translates external data into domain models.
- **Shared / Utilities**:
  - `types/`: Type definitions specific to the domain.
  - `translations/` or `i18n/`: Internationalization files specific to the feature.
  - `utils/`: Pure helper functions used only within the feature.
  - `__tests__/`: Co-located unit and integration tests.

_Note on Error Boundaries:_ Each domain should define its own error vocabulary (e.g., `BranchError`). Infrastructure errors (a raw SQL or filesystem error) must not leak into the delivery layer—translate them at the layer boundary. Section 3 covers the mechanics.

#### **1.2. Inside `core/`: Application, Domain, and DTOs**

For complex features, `core/` should be split to respect Domain-Driven Design (DDD):

- **Domain Logic (`core/models/`):** The pure business logic. It contains rules and behaviors independent of any framework.
  - _DTO vs. Domain Model:_ Domain models carry no serialization, persistence, or transport metadata. DTOs (request/response shapes, database rows, IPC payloads with serde tags) live next to the layer that owns them (Delivery or Infrastructure). The translation between a DTO and a Domain Model happens at the boundary.
- **Aggregates:** When several domain objects must change together to maintain an invariant, group them under a single root that owns their lifecycle. The classic example is `Order`/`OrderLine`: you don't save an `OrderLine` in isolation; the `Order` is the only valid persistence boundary. Repositories operate on aggregate roots, not on individual children.
- **Value Objects & Primitive Obsession:** Wrap domain concepts (identifiers, money, file paths, refnames, emails) in dedicated, immutable types whose constructors enforce validity. Relying on raw strings or integers for domain concepts is an anti-pattern known as **Primitive Obsession**. A `BranchName` type built via a fallible constructor catches invalid data at creation, rather than scattering validation checks throughout your services.
- **Application Logic (`core/application/`):** Orchestrates the domain logic and connects Delivery to Infrastructure.
  - Use terminology fitting the language: `application/` or `use-cases/` for generic backend/frontend logic, or `hooks/`/`composables/` if the logic is strictly bound to a UI framework's reactivity model. Avoid `services/` as a folder name—it's vague and tends to mean different things in different parts of the same codebase.
  - _(Note on naming across scopes: it is normal—and expected—for the same folder name to appear both inside a domain and at the global root. A domain's `infrastructure/` holds its own private adapters; the global `infrastructure/` holds shared infrastructure wrappers. Same with `application/`. The path makes the scope unambiguous. What you should not do is reuse a name within the same scope for two different concepts.)_
  - **Frontend State Management:** Distinguish between Server State and UI State. Server State (cached API data via React Query/Apollo) belongs in the Application/Infrastructure layer. UI State ("is this modal open?") belongs strictly in the Delivery layer.
  - **Dependency Inversion (Ports & Adapters):** To keep the core truly framework-agnostic, the `core/` layer should define the _Interfaces/Ports_ (e.g., `UserRepository`), while the `infrastructure/` layer provides the concrete _Implementation/Adapter_ (e.g., `SqlUserRepository`). This makes the core fully testable without requiring real databases or network calls.

#### **1.3. Inter-Domain Code Sharing**

**A domain must never import from another domain.** No exceptions. It does not matter whether the target path is linter-public or internal, whether the symbol is a model or a utility, or whether the import "feels harmless" — domain-to-domain imports are forbidden.

When two domains need the same concept, the import does not go _between_ them; it goes _upward_. Both domains import from a shared scope (`@/shared/`), are wired together at the composition root, or coordinate via a cache or event boundary (§1.5). The boundary between domains is solid, not porous.

- **The Solution (Promotion):** If logic from Domain A is genuinely needed in Domain B _and represents the same concept_, promote it to a shared scope and have both domains import it from there. Read Section 1.4 first—most apparent shared concepts are actually two different concepts wearing the same name.
- **Duplicate by default; extract when the abstraction is obvious and stable.** The "Rule of Three" is a useful heuristic but not a law. In practice, three independent implementations often diverge in subtle ways (different validation rules, different field names), and reconciling them later is harder than recognizing the shared concept early. Conversely, premature extraction creates a god-module that every domain imports from and no one owns. The real test is not a count—it is whether you can name the abstraction precisely without weasel words like "thing" or "info."
- **When in doubt, prefer duplication.** A second copy of a 30-line function is cheap. A wrong shared abstraction is expensive: it accumulates flags, optional parameters, and special cases until it is unmaintainable.

**Example violation:**

```ts
// Forbidden: any import path that starts with another domain's name
import { UserId } from '@/domains/identity/models/user';
```

**Example correction — only when the concept genuinely belongs to a shared kernel (see §1.4):**

```ts
// The shared concept lives in a deliberately small shared kernel
import { UserId } from '@/shared/kernel/ids';
```

Before reaching for promotion, ask whether Domain A and Domain B actually mean the same thing by this concept. They often don't.

#### **1.4. Bounded Contexts, Shared Kernels, and Anti-Corruption Layers**

Two domains often appear to share a concept—`User`, `Order`, `Account`—but on closer inspection, each domain _means_ something subtly different by it. The `User` in `identity/` cares about credentials, MFA, and sessions. The `User` in `billing/` cares about payment methods and invoice history. Forcing them into a single shared model creates a bloated god-class that serves no one.

This guide recommends three patterns, in order of preference:

1. **Separate models per bounded context (default).** Each domain owns its own `User` model, shaped to its needs. They share a stable identifier (`UserId`) and nothing else. This is the cheapest, most resilient option.
2. **Shared kernel.** A small, deliberately frozen set of types shared by multiple domains—typically just identifiers and a handful of enums. Treat the shared kernel as a public contract: changes require coordination across all consumers. Keep it ruthlessly small.
3. **Anti-corruption layer (ACL).** When a domain must consume data from another domain (or an external system) whose model is awkward, legacy, or unstable, place a thin translation layer at the boundary. The ACL exists to keep the foreign model from polluting your clean one. ACLs typically live in the consumer's `infrastructure/` directory.

**The wrong move** is to keep promoting concepts to a shared `models/` folder until that folder becomes the de facto domain model for the entire application. If your shared scope grows faster than your domains, you have a structural problem—not a sharing problem.

#### **1.5. Inter-Domain Communication**

Domains should communicate through shared, elevated environments rather than direct, tightly coupled function calls:

1. **Composition Root / DI Containers:** The top-level router or app module acts as a mediator, wiring dependencies together (e.g., injecting a shared `Database` connection into a domain's repository).
2. **URL / Routing (Frontend):** Pass context via URL parameters.
3. **Global State / Caching (Frontend):** Mutating a cache key (via React Query) in Domain A automatically triggers an update in Domain B. **This is the default for cross-domain communication on the frontend.**
4. **Domain Events vs. Event Bus (Backend/Systems):**
   - _Domain Events:_ Typed records emitted by domain logic (e.g., `BranchDeletedEvent`). The domain defines and owns these types.
   - _Event Bus / Message Broker:_ The global transport mechanism (Kafka, RabbitMQ, an in-memory channel) that carries these events between domains.

**A note on event buses on the frontend: avoid them.** The pattern earns its keep on the backend because it crosses real boundaries—process, deployment, ownership—that prevent direct calls. An `OrderPlaced` event going onto Kafka decouples services that ship and fail independently; the invisibility is a worthwhile cost for that structural benefit.

Inside a single frontend runtime, no such boundary exists. A global pub-sub between components in the same React tree only makes data flow invisible without giving you any real decoupling—the publisher and listener still ship together, deploy together, and break together. You get the costs (untraceable cause-and-effect, hard refactors, broken stack traces) with none of the structural benefits.

For frontend cross-domain communication, reach for these instead:

- **Shared state** (Zustand, Jotai, Context) when components need to read the same value.
- **Cache invalidation** (React Query's `invalidateQueries`, SWR's `mutate`) when "Domain A changed something, Domain B should refetch."
- **URL state** when the data belongs in the address bar.
- **Lifting state up** when two components need to coordinate—often the simplest answer.

The narrow exceptions where a frontend event bus is fine: telemetry/analytics (genuine fire-and-forget), toast/notification systems, micro-frontend or `postMessage` boundaries, and runtime plugin systems where listeners are unknown at compile time. The test is whether the event crosses a boundary that prevents a direct call. If it doesn't, you're working around state management, not solving a coupling problem.

#### **1.6. Operation Naming Conventions**

Use standard operational prefixes for actions, IPC commands, and API endpoints so that readers can predict a function's behavior from its name alone.

| Prefix   | Intent                                                    | Example              |
| :------- | :-------------------------------------------------------- | :------------------- |
| `get`    | Retrieve a single resource                                | `getBranch`          |
| `list`   | Retrieve a collection or array of resources               | `listBranches`       |
| `create` | Instantiate a new resource                                | `createBranch`       |
| `add`    | Append an item to an existing collection                  | `addCommit`          |
| `update` | Replace or assign a value                                 | `updateAuthor`       |
| `delete` | Destroy or permanently remove a resource                  | `deleteBranch`       |
| `remove` | Take an item out of a collection (without destroying it)  | `removeTag`          |
| `clear`  | Empty a collection entirely                               | `clearStash`         |
| `toggle` | Flip a boolean state                                      | `toggleProtection`   |
| `bulk`   | Perform an operation on multiple resources simultaneously | `bulkDeleteBranches` |

This is the baseline vocabulary; resist adding more verbs unless your team genuinely needs a distinction these do not capture. The single most common useful extension is `find` for lookups that may legitimately return nothing (`findBranchByName` returns optional/nullable, while `getBranch` errors when the resource is missing). Add it if your codebase relies on that distinction; otherwise stick with `get`. Avoid introducing `fetch`, `query`, `retrieve`, `load`, etc. as separate verbs—they overlap with `get`/`list` and create ambiguity rather than clarity.

#### **1.7. Domain Public API**

Each domain has a _public surface_ — the symbols importable from outside the domain. **Other domains never import from this surface** (§1.3 is absolute). The public surface exists for the composition root (which wires use-cases into routes), the routing/entry layer (which mounts views or controllers), and tests. Everything else is strictly internal. How the surface is expressed depends on whether the domain is a folder (single-package project) or a package (monorepo).

##### **Single-package projects: direct imports + linter rules. No domain-level barrels.**

The barrel-file pattern (a single `index.ts` per domain that re-exports the public symbols) is tempting because it locates the public API in one readable file. In practice it carries real costs:

- Bundlers and dev servers can struggle to tree-shake through barrels — fast on paper, slow in production builds.
- Circular imports become much easier to introduce, and far harder to diagnose when they occur.
- The barrel becomes a dumping ground that nobody reviews carefully, and the "public API" silently grows to mean "everything."

The recommended approach: consumers import directly from the file that owns the symbol. The boundary is enforced by a linter, not by a re-export file.

```ts
// Direct import — explicit, tree-shake-friendly, no barrel needed
import { Branch } from '@/domains/branch-management/models/branch';
import { listBranches } from '@/domains/branch-management/application/list-branches';
```

A linter rule (`dependency-cruiser`, `eslint-plugin-boundaries`, `import-linter` for Python) declares which paths inside each domain are importable from outside the domain. A common pattern: `<domain>/models/**` and `<domain>/application/**` are public to the composition root, the routing layer, and tests; `<domain>/infrastructure/**`, `<domain>/utils/**`, and `<domain>/__tests__/**` are internal. The same linter must also enforce that _no domain ever imports from another domain_ — public surface or not (§1.3). Section 6 covers the tooling.

##### **Monorepos: choose between a single entry point and explicit subpath exports.**

When a domain is its own package, the package boundary itself is the API. Two acceptable patterns — pick one and apply it across the workspace:

- **Single entry point.** `package.json` declares `"exports": { ".": "./src/index.ts" }`. The entry file re-exports the public symbols. Consuming code imports from the package name only: `import { Branch } from '@my-org/branch-management'`. Idiomatic and simple. The barrel costs (tree-shaking, circular imports) still apply, but only at one place per package — they scale with the number of packages, not with the size of each package's API.
- **Explicit subpath exports.** `package.json` declares an `"exports"` map with multiple entry points (`"./models"`, `"./application"`, etc.), each pointing at a specific file. Consumers import from the subpath: `import { Branch } from '@my-org/branch-management/models'`. No re-export file, better tree-shaking, finer-grained API, and the public surface is a flat list visible directly in `package.json`. Slightly more verbose at call sites.

Either is fine; just don't mix both styles in the same workspace.

**Important:** package boundaries make the public surface explicit, but they do _not_ prevent one domain package from importing another. `@my-org/domain-a` can syntactically depend on `@my-org/domain-b` — the package manager won't stop you. The no-cross-domain rule (§1.3) still has to be enforced by a linter or by CI rules that reject such dependencies in `package.json`. Domain packages depend on `@my-org/shared`, never on each other.

##### **Per-language notes**

- **Rust:** Use `pub`, `pub(crate)`, and `pub use`. The compiler enforces visibility — no extra tooling required, and the `mod.rs` `pub use` pattern is the language's idiom (not a tooling workaround). This is different from a TypeScript barrel: the compiler actually checks it.
- **Go:** Capitalization (`PublicName` vs. `privateName`) plus `internal/` directories give you compiler-level boundary enforcement.
- **TypeScript / JavaScript:** Configure path aliases (`@/domains/*`) for readable imports. Pair with `dependency-cruiser` or `eslint-plugin-boundaries` to enforce which subpaths are public.
- **Python:** Use `import-linter` layered contracts to declare which submodules are importable from outside the package. Avoid mass `__init__.py` re-exports.

Whichever path you take, the rule is the same: there is a defined public surface, and consumers must respect it.

#### **1.8. Managing Complex "Fat" Domains**

If a domain handles too many distinct workflows, do not nest `domains/` inside `domains/`. Two acceptable approaches:

- **Approach 1: Peer Domains (Recommended).** Break the fat domain into smaller, flat vertical slices. For example, `branch-selection` and `branch-deletion` become their own root-level domains.
- **Approach 2: Internal Feature Folders (`features/`).** Keep the workflows in one domain, but organize internally with a `features/` directory where each sub-feature shares the parent's `core/models/` and `infrastructure/`.

  _Why is this not the same as nested domains?_ A nested `domains/` would create independent bounded contexts inside another bounded context—a fractal that nothing else in this guide knows how to handle. Internal `features/` are _not_ independent contexts: they share a model and a backing store, and exist only to organize sub-workflows of a single coherent domain. Different concept, different name.

  Prefer Approach 1 anyway. Reaching for Approach 2 too quickly often hides the real diagnosis: the fat domain is actually two or three bounded contexts pretending to be one. If the sub-features could plausibly own different models, they are not internal features—they are peer domains in disguise.

### **2. Shared Libraries & Globals**

While the architectural goal is to keep code highly localized inside `domains/`, certain resources inherently span the entire application. Code, assets, and configurations used by multiple domains, or that act as the structural foundation of the app, **must** be extracted to global directories at the root level (e.g., `src/shared/` or simply `src/`).

Create these global folders as necessary to house cross-cutting resources:

- **`ui/` (Frontend):** Globally reusable UI components (your internal design system).
  - `ui/core/`: Atomic, abstract building blocks (button, input).
  - `ui/patterns/`: Composed components for common, opinionated UI tasks (`confirm-modal`).
  - `ui/lab/`: Experimental or highly specialized components.
- **`styles/` (Frontend):** Global stylesheets, CSS resets, font definitions, and design tokens (`theme.css`, global Tailwind config). _(Note: feature-specific styles remain co-located inside their domains.)_
- **`public/` or `assets/`:** Global static resources—favicons, company logos, global fonts.
- **`types/`:** Globally shared type definitions, interfaces, and enums (base API response shapes, global error types).
- **`layouts/` (Frontend):** Global page structure templates (App Shell, Authentication layout).
- **`application/` (or `composables/`/`hooks/`) (Frontend):** Globally reusable, stateful, framework-dependent logic (`useDebounce`, `useTheme`).
- **`utils/`:** Global, pure, stateless utility functions (date formatters, math helpers).
- **`infrastructure/`:** Global infrastructure wrappers (base HTTP clients, database connection pools, logger wrappers).
- **Auto-generated Artifacts:** Cross-language code generation (TypeScript bindings from Rust, OpenAPI clients, protobuf stubs) belongs in the consumer's `infrastructure/` layer. They are owned by their generator and should never be edited manually.

As noted in §1.2, several of these global folders (`application/`, `infrastructure/`, `types/`, `layouts/`) deliberately share names with their domain-internal counterparts. The path makes the scope unambiguous.

#### **2.1. Cross-Cutting Concerns (Middleware, Interceptors, Actor Context)**

How does a domain log an error, trace a request, or check permissions without tightly coupling to specific auth or logging libraries? **Do not pollute pure domain logic with cross-cutting concerns.** Authorization, telemetry, and logging should be injected as dependencies or, ideally, handled via middleware and interceptors at the Delivery layer.

**Propagating the actor (current user / principal).** This is one of the top sources of architectural rot. The delivery layer authenticates the actor, but use-cases deep in the call stack still need to know "who is doing this?" There are three viable strategies; **pick one and apply it consistently**:

1. **Explicit parameter (recommended for backends).** Every use-case takes an `Actor` (or `RequestContext`) as its first argument. Verbose, but every dependency is visible at the type level, and there is no hidden global state to mock in tests.
2. **Async-local storage / task-local context.** A scoped value attached to the request's async context (`AsyncLocalStorage` in Node, `tokio::task_local` in Rust, `contextvars` in Python). Cleaner call sites, but you must trust your runtime to propagate it across every `await`/`.then()`/spawned task. Easy to lose silently.
3. **Auth context (recommended for frontends).** Expose the current user through a `useCurrentUser()` hook backed by an auth context provider near the root of the tree. For framework-agnostic functions called from components, pass the user explicitly—do not call hooks from non-component code.

The wrong move is mixing strategies—some functions take an explicit `Actor`, others read from a global, and tests have to set up both. Pick one.

### **3. Error Handling Across Layer Boundaries**

How errors flow through layers is a foundational decision that shapes every signature in your codebase.

#### **3.1. Choose an Error Mechanism**

Use whatever your language gives you natively—exceptions in Java, C#, Python, and most JavaScript codebases; `Result` in Rust; `(value, error)` tuples in Go. Don't bolt a foreign idiom onto a language that already has a perfectly good answer. The architectural point is not _which_ mechanism—it is that you pick one for domain errors and apply it consistently.

**Do not mix both styles for domain errors.** A codebase where some use-cases return an error value and others throw a domain exception is exhausting to read and impossible to refactor safely. (Infrastructure-level exceptions—lost DB connections, timeouts—can still propagate as exceptions even in a return-based codebase, as long as they are caught and translated at the boundary.)

#### **3.2. Translate at Every Layer Boundary**

Each layer has its own error vocabulary:

- **Infrastructure errors** (`SqlxError`, `FetchError`, `EOF`) are implementation details. They must not escape the infrastructure layer.
- **Domain errors** (`BranchNotFound`, `InsufficientPermissions`, `InvariantViolation`) are the domain's vocabulary—they have meaning to the business.
- **Delivery errors** (HTTP 404, GraphQL error extensions, IPC error codes) are how the outside world hears about failures.

The mapping:

```
Infrastructure error  →  Domain error  →  Delivery error
   (SqlxError::RowNotFound)  →  BranchError::NotFound  →  HTTP 404
```

Each boundary owns the translation in _its_ direction. The infrastructure adapter catches the `SqlxError` and returns a `BranchError`. The delivery layer catches the `BranchError` and decides on the HTTP status (or IPC error code, or GraphQL error extension). Domain code only ever sees `BranchError`; it never imports an infrastructure error type.

#### **3.3. Distinguish Expected vs. Unexpected Failures**

Two categories of error deserve different treatment:

- **Expected failures** are part of the domain: "branch already exists," "user not found," "insufficient balance." These belong in your domain error vocabulary—whether that is a Result type, a sum type, or a domain exception hierarchy. The caller is expected to handle them.
- **Unexpected failures** are bugs or true infrastructure outages: assertion violations, "the database is on fire." These should crash the request loudly and surface in your error tracking. Do not catch and "handle" them—you have no useful response.

A good test: if your code logs an error and continues silently, you have probably miscategorized an unexpected failure as expected.

### **4. Routing as a Composition Root**

The routing or entry layer acts strictly as a **Composition Root**. It _wires_ things together; it does not execute business logic.

- **Backend / Native (Express, Tauri `lib.rs`):** The main router maps external triggers (HTTP, IPC) to domain controllers/handlers. It injects dependencies but contains zero business rules.
- **Frontend (SPA with a single client-side router):** The route file extracts URL parameters, fetches required context, and composes one or more _views_ imported from domains.
- **Feature Flags:** Because the architecture is broken into vertical slices, the Composition Root is the perfect place to evaluate feature flags. Toggle entire domains (route to a new version of the checkout view) at the entry point, rather than littering inner components with conditional `if/else`.

#### **4.1. Modern Frontends: Many Composition Roots, Not One**

The classical "one Composition Root" picture comes from SPAs with a single client-side router. Modern frontend frameworks have changed the shape:

- **Next.js App Router / React Server Components:** Every route segment is a composition point. Server Components compose data-fetching and presentation; Client Components compose interactivity. The server/client boundary cuts through what used to be a single root.
- **Server Actions / RPC:** A form's `action={...}` is a delivery-layer endpoint living inside a presentation file. Treat the action body the same way you would treat a controller: extract inputs, call a use-case, translate errors. Do not put business logic in the action itself.
- **Route groups and layouts:** Use these to scope shared dependencies (auth context, feature flags, layout shells) to the routes that need them, rather than threading providers through the whole tree.
- **Remix / TanStack Router loaders:** Loaders are delivery-layer code—the same rule applies. Loaders fetch and compose; use-cases live in `core/application/`.

The principle is unchanged: the entry layer wires, it does not compute. The mechanics now span multiple files, multiple processes, and a server/client divide. Keep business logic out of route files, action handlers, and loaders.

### **5. Testing**

Testing should follow a structured pyramid that respects the architectural layers.

- **Unit Tests (Core Models & Value Objects):** Test pure business logic in complete isolation. No mocking required—if you need to mock, the unit under test has dependencies it should not have.
- **Application / Use-Case Tests:** Test use-cases with infrastructure replaced by in-memory test doubles of your _ports_ (the interfaces defined in `core/`). Because you own the port, the double is faithful and stable. Do not mock libraries you do not own (databases, HTTP clients)—stub the port you defined on top of them instead.
- **Contract Tests:** When two domains communicate (via events, queues, or shared types), write contract tests that pin the shape of the message at both producer and consumer. Without these, the day Domain A renames a field is the day Domain B silently breaks in production. In monorepos, run consumer-side contract tests in the producer's CI as well.
- **Integration Tests:** Test the real adapter against a real (or close-to-real) external system: Postgres in a container, a local S3 mock, a test Kafka. These are slower; run fewer of them and target the seams that production traffic actually exercises.
- **E2E Tests (Delivery Layer):** Keep high-level end-to-end tests (Playwright, Cypress, Supertest) in a root `tests/` directory. They test the composed system from the outside in.
- **Property-Based and Snapshot Tests, in Their Place:** Property-based tests (`fast-check`, `proptest`, `hypothesis`) shine on Value Objects and pure transformations—anywhere the invariants are easy to state. Snapshot tests are useful for stable serialized output (rendered emails, generated SQL) and a liability everywhere else; if every change requires a snapshot update, the snapshots are not testing anything.
- **What Not to Mock:** Do not mock pure functions. Do not mock value objects. Do not mock libraries you do not own (`fs`, `fetch`, `pg`); stub the _port_ you defined on top of them. The rule of thumb: mock the boundary, not the dependency.
- **Co-location:** Place unit and integration tests inside `__tests__` subdirectories directly next to the code they test. E2E tests, which span domains, live at the root.

### **6. Enforcing the Architecture Mechanically**

A rule that depends on developer memory has a half-life of months. Codify the rules of this guide into your tooling so that violations fail CI rather than fail review.

The minimum:

- **Boundary enforcement.** Three rules to encode in your linter, in order of importance:
  1. **No cross-domain imports.** A file inside `domains/A/` may not import from `domains/B/`. This is the single most important rule (§1.3) and the easiest to violate by accident.
  2. **Unidirectional dependencies inside a domain.** Delivery → Application → Domain. Infrastructure depends on Domain (via ports), never the reverse.
  3. **Core may not import infrastructure.** `core/` code reaches infrastructure only through ports defined in `core/`.
  - **TypeScript:** [`dependency-cruiser`](https://github.com/sverweij/dependency-cruiser) or [`eslint-plugin-boundaries`](https://github.com/javierbrea/eslint-plugin-boundaries). Both let you write rules like "files in `domains/A/` may not import from `domains/B/`" and "files in `core/` may not import from `infrastructure/`."
  - **Python:** [`import-linter`](https://import-linter.readthedocs.io/) with layered contracts.
  - **JVM:** ArchUnit — test architecture rules as JUnit tests.
  - **Rust:** Module visibility (`pub`, `pub(crate)`) is enforced by the compiler; lean on it. For workspace-level domain isolation, separate crates are the cleanest answer.
  - **Go:** `internal/` directories are enforced by the compiler.
- **Public API enforcement.** Use the mechanism described in Section 1.7 for your language — linter-enforced path rules in single-package projects, package boundaries (single entry or subpath exports) in monorepos, plus `pub`/`internal/` visibility where the language provides it.
- **Naming conventions.** There is no off-the-shelf rule for "function returning a single resource must be named `getX`," but a small custom ESLint rule (or a regex-based linter check in CI) can pin the prefixes from §1.6. Most teams rely on code review for this rather than tooling—either is fine, as long as the convention is held to.
- **Pre-commit hooks** (`lefthook`, `husky`, `pre-commit`) to run the architecture linters locally before they reach CI.

The first time you wire up `dependency-cruiser` and watch it find 40 forbidden imports across the codebase is illuminating. That is months of erosion that a code review missed. Mechanical enforcement is not bureaucracy—it is the only thing that makes architectural rules durable.

### **7. Scaling to a Monorepo**

When transitioning to a large-scale workspace (Turborepo, Nx, Cargo Workspaces, pnpm workspaces), the principles of this guide map to physical packages.

**A "Domain" maps to a "Package".** Instead of `src/domains/branch-management`, you migrate to `packages/domains/branch-management`.

#### **7.1. Benefits of Package Isolation**

- **Compiler-enforced boundaries.** Monorepos let you enforce the Public API rule (Section 1.7) at the compiler level. `package-a` physically cannot import `package-b` internals unless explicitly exported.
- **Build graph caching.** Tools (Turborepo, Nx, Bazel) cache the build and test of individual packages, dramatically speeding up CI on large repos.
- **Independent lifecycles.** Internal packages can ship at different cadences from app packages; publishable packages can be versioned and released independently.

#### **7.2. Extracting Shared Globals**

Global directories become their own packages.

- `src/shared/ui/` → `@my-org/ui-kit`
- `src/shared/infrastructure/` → `@my-org/database`

#### **7.3. Practical Decisions That Bite**

The hard parts of monorepos are rarely the structure—they are the day-two operational decisions:

- **`tsconfig` strategy (TS).** Use a base `tsconfig.base.json` at the root with strict settings, and have each package extend it. Use TypeScript project references (`"references"`) to give the compiler a build graph; this is what enables incremental builds.
- **Internal-only vs. publishable packages.** Mark internal packages with `"private": true` in `package.json` and a clear naming convention (e.g., `@internal/foo`). Publishable packages need stricter API discipline, semver, and changelogs.
- **Avoiding circular package dependencies.** A circular dep across packages will eventually cause a build failure that is hard to diagnose. `dependency-cruiser` catches these; so does Turborepo's task graph. Run the check in CI from day one.
- **Shared dev dependencies.** Hoist eslint, prettier, and TS to the root. Keep runtime deps inside the package that uses them. This avoids "phantom dependency" problems where a package works locally because a sibling installed its dependency.
- **When _not_ to extract a package.** Premature packaging is as harmful as premature abstraction. Don't create a package for code used in one place. Don't create a package just because a folder is "big." Extract when there is genuine independent reuse, an independent release cadence, or a need for compiler-enforced isolation. Otherwise, a folder is fine.
- **Versioning of internal packages.** For most teams, "always on `0.0.0` and built from source" is correct for internal packages. Reserve real versioning for packages you publish externally.

### **8. Glossary (For Junior Developers)**

- **Aggregate:** A group of related objects treated as a single unit when persisting. _Example: An `Order` and its `OrderLines`. You do not save an `OrderLine` directly; you save the `Order`, which owns its lines._ Repositories operate on aggregates, not on their internals.
- **Anti-Corruption Layer (ACL):** A translation layer at the boundary between your domain and a foreign or legacy model. Keeps the foreign model from polluting your clean one. Lives in `infrastructure/`.
- **Barrel File:** A single file (`index.ts`, `mod.rs`, `__init__.py`) that imports and re-exports modules from a directory. This guide recommends _against_ barrel files at the domain level in single-package projects (see §1.7) — they hurt tree-shaking and make circular imports easy to introduce. They remain acceptable as the single entry point of a monorepo package, where the cost is paid once per package rather than per domain.
- **Bounded Context:** A boundary inside which a model has a single, consistent meaning. The `User` in `identity/` and the `User` in `billing/` are typically two different bounded contexts that happen to share an identifier.
- **Business Logic:** The real-world rules your software enforces. _"A user must be 18 to buy this item" is business logic; "make this button red" is UI logic._
- **Co-location:** Placing related files physically close to each other. _A component, its tests, and its styles in the same folder, rather than split across the project._
- **Cohesion:** How closely related the code inside a folder or module is. High cohesion: "everything in this folder works toward the same goal."
- **Composition Root:** The top level of your app (router, `main.ts`). The "switchboard operator"—the only place that knows how to plug all the features and services together. In modern frontends, there are often _several_ composition roots.
- **Contract Test:** A test that pins the shape of a message between two systems (or two domains), run against both producer and consumer.
- **Coupling:** How much one piece of code depends on another. Low coupling is good—change Domain A without breaking Domain B.
- **Delivery Layer:** The layer that talks to the outside world: UI components, controllers, GraphQL resolvers, IPC handlers. Synonymous with "presentation layer" in frontend contexts.
- **Dependency Injection (DI):** Passing a tool (a database connection, a logger) _into_ a function or class as an argument, rather than having the function create the tool. Makes code testable.
- **Domain:** Used in two senses. (1) DDD sense: a problem space (e.g., "logistics"). (2) Folder-structure sense in this guide: the directory implementing a bounded context inside that problem space.
- **Domain Event:** A programmatic message saying "something important happened." _`UserSignedUpEvent`._
- **DTO (Data Transfer Object):** A "dumb" container for data. No logic, no methods—just fields. Used to pass raw data across networks, databases, or layer boundaries.
- **Monorepo:** A single code repository containing multiple packages or projects that can be built and (sometimes) released independently.
- **Ports and Adapters:** An architectural pattern. The "Port" is an interface defined by the core (`UserRepository`); the "Adapter" is the concrete infrastructure implementation (`SqlUserRepository`).
- **Primitive Obsession:** Using basic types (`string`, `int`) for things that deserve their own type. _Using a plain `string` for a ZIP code instead of a `ZipCode` value object whose constructor enforces validity._
- **Public API (Module API):** The specific symbols a folder or package explicitly exports. Everything else is internal.
- **Repository:** A pattern that hides _how_ data is persisted. To the rest of the app, a repository looks like an in-memory collection. Operates on aggregates, not on individual children.
- **Shared Kernel:** A small, deliberately frozen set of types shared across multiple bounded contexts—usually identifiers and a handful of enums. Changes require coordination across all consumers.
- **Side Effect:** When a function changes something outside itself—writing to a DB, calling an API, mutating a global. Pure domain models should have none.
- **Use-Case:** A specific action a user performs end-to-end. _"Reset Password," "Add Item to Cart."_
- **Value Object:** A small, immutable object where its _value_ is its identity. _Two `$5` bills are interchangeable; two users named "John" are not._
- **Vertical Slice Architecture (VSA):** Organizing code by feature rather than by technical layer. A Checkout folder holds its own UI, logic, and persistence code, instead of those being scattered across `Controllers/`, `Models/`, and `Views/`.
- **View:** A top-level presentational component representing a full page or major UI section. Typically what a route renders directly.
