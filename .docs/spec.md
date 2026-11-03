# DevProfile
## Product Requirements & Technical Architecture Specification

Version: 1.0
Status: Initial implementation specification
Product type: Developer intelligence and GitHub profile analytics
Deployment model: Self-hostable, with future hosted SaaS support
Primary language: TypeScript

---

# 0. IMPORTANT INSTRUCTIONS FOR THE CODING AGENT

This document is the source of truth for the project.

You are building a production-oriented, self-hostable alternative to GitRoll. This is not a simple GitHub statistics dashboard.

The application must inspect a developer's GitHub presence, analyze repositories, identify technologies, evaluate engineering practices, calculate explainable developer scores and produce a comprehensive public developer profile.

You must understand the architecture before implementing it.

## Non-negotiable engineering requirements

- TypeScript everywhere practical.
- Strict TypeScript configuration.
- Never use `any`.
- Never suppress type errors just to make code compile.
- Never put business logic inside React components.
- Never create enormous service files.
- Never mix database queries, HTTP handlers and domain logic.
- Never duplicate business logic between the web application and worker.
- Never introduce circular package dependencies.
- Never execute untrusted repository code.
- Never expose GitHub credentials to the browser.
- Never fabricate analysis results.
- Never use arbitrary AI-generated scores.
- Never treat GitHub activity as proof of engineering ability.
- Never use mock implementations in production paths.
- Never introduce microservices prematurely.

Use small, cohesive modules with clear responsibilities.

Prefer explicit interfaces, discriminated unions, dependency injection where useful, and well-defined domain boundaries.

Do not create abstractions without a concrete reason.

## Implementation workflow

Before writing code:

1. Inspect the existing repository.
2. Inspect existing package.json files and dependencies.
3. Identify existing conventions and infrastructure.
4. Identify reusable components.
5. Produce a detailed implementation plan.
6. Define package dependency boundaries.
7. Define the database schema.
8. Define the scanning lifecycle.
9. Implement incrementally.

After every implementation phase:

- Run type checking.
- Run linting.
- Run relevant tests.
- Verify imports and package boundaries.
- Verify that migrations work.
- Document architectural decisions.
- Fix errors before continuing.

Do not attempt to implement the entire application in one pass.

---

# 1. PRODUCT VISION

## 1.1 What are we building?

An open-source developer intelligence platform that transforms GitHub repositories and activity into a structured, evidence-based developer profile.

A user connects GitHub and requests an analysis.

The system discovers repositories, inspects their contents and metadata, detects technologies, evaluates engineering practices, analyzes contributions and generates a profile.

The analysis runs asynchronously.

Users should not need to manually configure their repositories or technologies.

The platform should automatically identify as much relevant information as possible while allowing users to control which repositories contribute to their public profile.

## 1.2 Core product experience

The intended user journey:

1. User visits the platform.
2. User authenticates with GitHub.
3. User connects their GitHub account.
4. The platform discovers their repositories.
5. User reviews repository inclusion and exclusion.
6. User requests their first profile scan.
7. The platform creates an asynchronous scanning pipeline.
8. The user sees real-time progress.
9. Repository analysis completes.
10. The scoring engine calculates profile metrics.
11. A new profile snapshot is published.
12. The user receives a complete developer profile.
13. Future scans update the profile without unnecessarily reprocessing unchanged repositories.

## 1.3 Product objectives

The platform should provide:

- Accurate programming language detection.
- Framework and technology detection.
- Developer skill classification.
- Repository-level engineering analysis.
- Contribution analysis.
- Security analysis.
- Maintainability analysis.
- Reliability assessment.
- Developer influence metrics.
- Technology relationship visualization.
- Historical profile progression.
- Public shareable profiles.
- Transparent scoring.
- Incremental analysis.
- Automated profile updates.

## 1.4 Product differentiation

Do not simply reproduce GitHub's contribution graph.

The platform should answer questions such as:

- What technologies does this developer actually use?
- How many different projects demonstrate a particular skill?
- Which technologies are used together?
- Does the developer write tests?
- Are their projects maintained?
- Do they demonstrate backend, frontend or infrastructure experience?
- How do they contribute to other projects?
- What engineering practices are visible?
- How has their technical profile evolved?
- Why did their score increase or decrease?

Every meaningful assessment should have supporting evidence.

---

# 2. PRODUCT REFERENCE AND FEATURE PARITY

The initial product reference is:

https://gitroll.io/profile/uezq54oxIk4VFZkLigfxGmGgm57z1

The reference profile exposes several major sections:

- Overview
- Languages
- Tech Stacks
- Tech Roadmap
- Repositories

The visible scoring dimensions include:

- Reliability
- Security
- Maintainability
- Uniqueness
- Contribution
- Influence

These are reference-product observations, not claims about GitRoll's internal algorithms.

We do not know its proprietary scoring formulas.

Our implementation must provide equivalent concepts using independently designed, explainable calculations.

## 2.1 Overview

Display:

- GitHub avatar.
- GitHub username.
- Display name.
- Bio.
- GitHub account creation date.
- Profile URL.
- Overall developer score.
- Letter grade.
- Developer classification.
- Score breakdown.
- Primary languages.
- Main technologies.
- Repository statistics.
- Contribution statistics.
- Last successful scan.
- Scan confidence.
- Profile completeness.

## 2.2 Languages

Display:

- Overall language distribution.
- Language percentages.
- Absolute repository language bytes where available.
- Number of repositories using each language.
- Language popularity across the developer's projects.
- Language progression over time.
- Repository-level language distribution.

Distinguish between byte distribution and actual developer experience.

A generated JavaScript bundle must not count as meaningful JavaScript expertise.

## 2.3 Tech Stacks

Display detected technologies grouped by category.

Examples:

Frontend:
- React
- Next.js
- Vue
- Angular
- Svelte
- Tailwind CSS

Backend:
- Node.js
- Express
- Fastify
- NestJS
- Go
- Rust
- Django
- FastAPI

Databases:
- PostgreSQL
- MySQL
- SQLite
- MongoDB
- Redis

Infrastructure:
- Docker
- Kubernetes
- GitHub Actions
- Terraform
- Linux
- Cloud providers

Mobile:
- React Native
- Expo
- Flutter
- Swift
- Kotlin

Testing:
- Vitest
- Jest
- Playwright
- Cypress
- Pytest

Each technology should expose evidence and confidence.

## 2.4 Tech Roadmap

Create an interactive graph showing relationships between technologies.

Examples:

- React -> Next.js
- TypeScript -> React
- Next.js -> Vercel
- Node.js -> Express
- PostgreSQL -> Drizzle ORM
- Docker -> Kubernetes

These relationships must come from a maintained technology relationship registry.

Do not imply that a developer has used a technology merely because it is related to another technology.

Distinguish:

- Detected technologies.
- Related technologies.
- Technologies used together.
- Technologies not yet detected.

The roadmap is an exploration and visualization tool, not an automatic recommendation engine.

## 2.5 Repositories

Display:

- Repository name.
- Description.
- GitHub URL.
- Owner.
- Visibility.
- Main language.
- Language distribution.
- Detected technologies.
- Repository score.
- Activity.
- Stars.
- Forks.
- Last commit.
- Analysis status.
- Inclusion status.

Allow sorting and filtering by:

- Name.
- Language.
- Technology.
- Score.
- Activity.
- Stars.
- Repository size.
- Analysis status.
- Ownership.
- Archived status.

---

# 3. TECHNOLOGY STACK

Use a TypeScript-first architecture.

## 3.1 Frontend

- Next.js App Router.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- Radix UI through shadcn/ui.
- TanStack Query where client-side server-state management is necessary.
- React Flow for interactive technology graphs.
- Recharts for analytics.
- Zod for runtime validation.

Use Server Components by default.

Use Client Components only where interaction requires them.

Prefer server-side data fetching and server actions for application mutations where appropriate.

Do not create unnecessary API routes just to fetch data from the same application.

## 3.2 Backend

- Node.js.
- TypeScript.
- Next.js server-side application.
- Drizzle ORM.
- PostgreSQL.
- Redis.
- BullMQ.
- Octokit.
- Zod.
- Pino.

The backend must be divided into application, domain and infrastructure responsibilities.

## 3.3 Analysis

- GitHub Linguist for language classification.
- Tree-sitter for multi-language syntax analysis.
- Semgrep for static analysis.
- Custom technology detectors.
- Dependency manifest parsers.
- Git metadata analysis.

Tree-sitter and Semgrep should be isolated behind internal analyzer interfaces.

Do not make the entire application dependent on a particular analyzer implementation.

## 3.4 Infrastructure

- pnpm.
- Turborepo.
- Docker.
- Docker Compose.
- PostgreSQL.
- Redis.

The application should be deployable to a standard Linux VPS.

No Kubernetes requirement.

## 3.5 Additional requirements

Use:

- Vitest for unit and integration tests.
- Playwright for end-to-end tests.
- ESLint.
- Prettier.
- GitHub Actions for CI.
- Changesets if package versioning becomes necessary.

Use current stable compatible dependency versions when implementation begins.

Do not blindly install every library mentioned in this specification.

---

# 4. SYSTEM ARCHITECTURE

## 4.1 Architectural overview

The system consists of four main layers:

1. Web application.
2. Domain and application services.
3. Background analysis worker.
4. Infrastructure and persistence.

The web application and worker share domain packages.

The worker must be independently executable.

The worker must not import Next.js application internals.

## 4.2 Monorepo structure

Use pnpm workspaces and Turborepo.

Suggested structure:

apps/
  web/
    src/
      app/
      components/
      features/
      lib/
      server/

  worker/
    src/
      bootstrap/
      jobs/
      processors/
      workers/
      health/

packages/
  database/
    src/
      schema/
      relations/
      migrations/
      queries/

  github/
    src/
      clients/
      authentication/
      repositories/
      contributions/
      webhooks/
      rate-limits/

  analyzer/
    src/
      core/
      languages/
      frameworks/
      dependencies/
      architecture/
      quality/
      security/
      testing/
      manifests/

  scoring/
    src/
      engine/
      dimensions/
      metrics/
      normalization/
      confidence/
      rules/

  queue/
    src/
      definitions/
      producers/
      consumers/
      schemas/

  technologies/
    src/
      registry/
      categories/
      relationships/
      detection/

  shared/
    src/
      schemas/
      types/
      constants/
      errors/

  ui/
    src/

  config/
    eslint/
    typescript/
    prettier/

This is a proposed initial structure.

Modify it when justified by concrete domain boundaries.

Do not create empty packages just to match the directory tree.

## 4.3 Dependency direction

Expected dependency direction:

web -> application/domain packages
worker -> application/domain packages
application -> domain
infrastructure -> domain interfaces
database -> domain-compatible persistence interfaces

Domain packages must not depend on Next.js, React or HTTP handlers.

The analyzer must not depend on the database implementation.

The scoring engine must not call GitHub APIs.

The scoring engine must consume normalized evidence.

The frontend must not calculate authoritative scores.

---

# 5. GITHUB INTEGRATION

## 5.1 Authentication strategy

Use GitHub authentication.

Evaluate GitHub App installation versus OAuth App authentication.

Recommended approach:

- GitHub OAuth for initial user identity.
- GitHub App installation for repository access and future organization support.
- Octokit for API interactions.

Choose the simplest secure implementation that supports the required functionality.

Do not implement two independent authentication systems unnecessarily.

## 5.2 Permissions

Use least privilege.

Request only permissions required for the selected features.

Public repository analysis should not require private repository permissions.

Private repository access must be explicitly authorized.

Do not request write access unless a feature genuinely requires it.

Never expose access tokens to the browser.

Encrypt stored credentials at rest.

Support token revocation and account disconnection.

## 5.3 GitHub API integration

Create a dedicated GitHub integration package.

Responsibilities:

- Authentication.
- Repository discovery.
- Repository metadata.
- Repository languages.
- Commit history.
- Pull requests.
- Reviews.
- Issues.
- Repository contents.
- Branch metadata.
- Webhook handling.
- Rate-limit management.

Prefer GraphQL for efficient aggregation when appropriate.

Use REST when it provides better coverage or simpler pagination.

Do not assume GraphQL provides all required data.

## 5.4 Repository discovery

Discover repositories belonging to the authenticated user.

Collect:

- GitHub repository ID.
- Node ID.
- Name.
- Full name.
- Owner.
- Description.
- HTML URL.
- Default branch.
- Visibility.
- Fork status.
- Parent repository.
- Archived status.
- Disabled status.
- Creation timestamp.
- Update timestamp.
- Push timestamp.
- Repository size.
- Stars.
- Forks.
- Watchers.
- Topics.
- License.
- Primary language.
- Language statistics.

Support pagination.

Handle deleted, renamed and transferred repositories.

Do not assume repository names are unique.

Use GitHub's immutable repository ID as the external identity.

## 5.5 Repository classification

Classify repositories as:

- Owned original repositories.
- Owned forks.
- Collaborated repositories.
- Organization repositories.
- Archived repositories.
- Disabled repositories.

A fork must not automatically receive the same ownership or originality treatment as an original project.

Track upstream relationships where available.

Allow users to exclude repositories.

## 5.6 Rate limits

Implement a shared rate-limit service.

Requirements:

- Read rate-limit headers.
- Track remaining requests.
- Track reset timestamps.
- Apply exponential backoff.
- Respect Retry-After.
- Avoid retrying requests that cannot succeed yet.
- Limit concurrent requests.
- Prioritize interactive requests appropriately.

Never retry indefinitely.

Use per-account and global concurrency controls.

Avoid redundant GitHub API calls by caching metadata.

## 5.7 Webhooks

Support relevant events:

- push
- repository
- pull_request
- pull_request_review
- issues
- delete

Verify webhook signatures.

Persist webhook event IDs.

Implement deduplication.

Webhook handlers should enqueue jobs rather than perform expensive analysis synchronously.

---

# 6. REPOSITORY ANALYSIS ENGINE

This is the core technical product.

Analysis must be modular, deterministic where possible, evidence-based and versioned.

## 6.1 Analysis pipeline

Each repository should pass through independent stages:

1. Metadata collection.
2. Repository classification.
3. Language analysis.
4. Manifest discovery.
5. Dependency analysis.
6. Technology detection.
7. Architecture analysis.
8. Testing analysis.
9. Quality analysis.
10. Security analysis.
11. Contribution analysis.
12. Evidence normalization.
13. Repository result persistence.

Stages should be independently retryable.

A failure in one stage must not necessarily invalidate other stages.

## 6.2 Repository acquisition

Do not clone every repository by default.

Use GitHub APIs for metadata and manifests where possible.

Use GitHub archive downloads or shallow clones when deeper source analysis is necessary.

Repository acquisition must be configurable.

Possible strategies:

- API-only analysis.
- Archive-based analysis.
- Shallow clone.
- Full clone only when a specific analysis requires it.

Default to minimal acquisition.

For large repositories:

- Enforce size limits.
- Enforce file count limits.
- Enforce execution time limits.
- Exclude generated files.
- Exclude binary assets.
- Exclude vendored dependencies.
- Exclude build outputs.
- Exclude common cache directories.

Do not download Git history unnecessarily.

## 6.3 File classification

Maintain a centralized exclusion registry.

Default exclusions should include:

- node_modules
- vendor
- dist
- build
- coverage
- .next
- .turbo
- .git
- target
- bin
- obj
- generated
- cache directories
- binary files
- minified files
- lockfile-generated artifacts where irrelevant

Do not exclude dependency manifests.

Do not exclude configuration files.

Respect repository-specific ignore rules where applicable.

## 6.4 Language detection

Use GitHub Linguist or an equivalent maintained implementation.

Collect:

- Language.
- Bytes attributed to language.
- Repository count.
- File count where available.
- Percentage distribution.
- Last observed timestamp.

Separate:

- Primary language.
- Secondary languages.
- Configuration languages.
- Markup languages.
- Generated languages.
- Documentation languages.

Do not use raw extension counts as the authoritative language distribution.

Exclude generated and vendored code where possible.

## 6.5 Manifest discovery

Support at minimum:

JavaScript / TypeScript:
- package.json
- pnpm-lock.yaml
- yarn.lock
- package-lock.json
- bun.lock
- bun.lockb where supported

Python:
- pyproject.toml
- requirements.txt
- poetry.lock
- Pipfile
- Pipfile.lock

Rust:
- Cargo.toml
- Cargo.lock

Go:
- go.mod
- go.sum

PHP:
- composer.json
- composer.lock

Ruby:
- Gemfile
- Gemfile.lock

Java:
- pom.xml
- build.gradle
- build.gradle.kts

.NET:
- *.csproj
- *.fsproj
- packages.config

Other ecosystems should be added through independent parsers.

Do not parse manifests using fragile regular expressions when a maintained parser exists.

## 6.6 Dependency analysis

For each dependency, collect:

- Package identifier.
- Ecosystem.
- Version constraint.
- Resolved version when available.
- Direct or transitive classification.
- Development or production classification.
- Manifest source.
- Repository.
- Detection timestamp.

Do not assume declared dependencies are actively used.

Where possible, cross-reference imports and source files.

Separate:

- Declared dependency.
- Imported dependency.
- Actively referenced dependency.
- Framework integration.
- Tooling dependency.

## 6.7 Framework detection

Build a rule-based framework detector.

Examples:

Next.js:
- next dependency.
- Next.js configuration.
- App Router or Pages Router structures.

React:
- react dependency.
- React source usage.

Express:
- express dependency.
- Express imports and application initialization.

Fastify:
- fastify dependency.
- Fastify application initialization.

Drizzle ORM:
- drizzle-orm dependency.
- Drizzle schema/configuration.

Tailwind:
- tailwind dependency.
- Tailwind configuration or CSS directives.

Docker:
- Dockerfile.
- Compose configuration.

GitHub Actions:
- .github/workflows configuration.

Kubernetes:
- Kubernetes manifests or Helm charts.

A dependency declaration alone should not always be sufficient for a high-confidence detection.

## 6.8 Technology detection confidence

Every detection must have a confidence value between 0 and 1.

Initial suggested evidence weights:

- Active source usage: 1.00
- Framework-specific configuration: 0.95
- Direct dependency plus relevant project structure: 0.90
- Direct dependency only: 0.65
- Development dependency: 0.45
- Documentation mention: 0.15

These are initial configurable heuristics, not universal truths.

Multiple weak signals should not automatically become high confidence.

Use evidence deduplication.

Store the reason for every detection.

## 6.9 Architecture detection

Detect architectural patterns using multiple signals.

Possible patterns:

- Monolithic.
- Modular monolith.
- Layered architecture.
- Clean architecture indicators.
- Hexagonal architecture indicators.
- Domain-driven design indicators.
- Microservices indicators.
- Event-driven architecture indicators.
- Serverless architecture indicators.
- Plugin-based architecture.

Signals may include:

- Directory structure.
- Dependency direction.
- Module boundaries.
- Interface usage.
- Dependency injection.
- Domain model separation.
- Event definitions.
- Service boundaries.
- Deployment configuration.

Do not claim architectural compliance based on directory names alone.

Store:
- Detected pattern.
- Supporting signals.
- Confidence.
- Limitations.
- Repository references.

Use language such as "indicators of clean architecture" rather than asserting formal compliance.

## 6.10 Tree-sitter analysis

Use Tree-sitter for syntax-aware analysis.

Initial targets:

- TypeScript.
- JavaScript.
- Python.
- Go.
- Rust.
- Java.
- C.
- C++.
- PHP.

Tree-sitter should support:

- Import analysis.
- Function and class discovery.
- Module relationships.
- Basic structural complexity.
- Test discovery.
- Error-handling patterns.
- Type annotation detection where supported.

Do not attempt to build a complete compiler or language server.

AST analysis should be bounded and incremental.

## 6.11 Testing analysis

Detect:

- Unit tests.
- Integration tests.
- End-to-end tests.
- Test runners.
- Test frameworks.
- CI execution of tests.
- Coverage configuration.
- Coverage reports where available.

Examples:

- Vitest.
- Jest.
- Mocha.
- Playwright.
- Cypress.
- Pytest.
- Go testing.
- Rust test framework.

Distinguish configured tests from tests that actually execute in CI.

Do not invent coverage percentages.

If no coverage report is available, mark coverage as unknown.

## 6.12 Code quality analysis

Analyze:

- Lint configuration.
- Formatting configuration.
- Type safety.
- Test organization.
- Error handling.
- Complexity indicators.
- Documentation.
- Dependency hygiene.
- Code organization.
- CI configuration.
- Duplication where measurable.

Metrics must be language-aware.

Do not compare raw complexity measurements across unrelated languages without normalization.

Do not equate a large number of files with maintainability.

## 6.13 Security analysis

Use Semgrep and additional static checks.

Analyze:

- Hardcoded secrets.
- Unsafe configuration.
- Common vulnerability patterns.
- Insecure cryptographic usage.
- SQL injection indicators.
- Command injection indicators.
- Unsafe deserialization.
- Dependency vulnerabilities where reliable advisory data is available.
- Security scanning configuration.

Do not expose detected secrets.

Persist redacted findings only.

Never send secrets to external AI services.

Do not claim security certification.

A lack of detected vulnerabilities is not proof of security.

## 6.14 Contribution analysis

Collect:

- Commits.
- Authored commits.
- Pull requests.
- Merged pull requests.
- Reviews.
- Review comments.
- Issues opened.
- Issues closed.
- Repository ownership.
- Contribution dates.
- Collaboration patterns.

Distinguish between:

- Authored contributions.
- Merged contributions.
- Reviewed contributions.
- Fork activity.
- Automated commits.
- Bot activity.

Exclude obvious bot activity from developer metrics where identifiable.

Do not rely exclusively on contribution counts.

Account for repository ownership and project context.

---

# 7. TECHNOLOGY REGISTRY AND SKILL TAXONOMY

## 7.1 Central registry

Create a centralized, version-controlled technology registry.

Each technology should contain:

- Stable ID.
- Display name.
- Description.
- Category.
- Subcategory.
- Aliases.
- Supported ecosystems.
- Detection rules.
- Related technology IDs.
- Prerequisite relationships.
- Common integrations.
- Documentation URL.
- Registry version.

Example:

{
  "id": "nextjs",
  "name": "Next.js",
  "category": "frontend",
  "subcategory": "react-framework",
  "aliases": ["next"],
  "ecosystems": ["npm"],
  "related": ["react", "typescript", "vercel"]
}

The example is illustrative.

The actual registry must be comprehensive and maintained independently of user profiles.

## 7.2 Categories

Initial categories:

- Frontend.
- Backend.
- Full-stack.
- Mobile.
- Desktop.
- Databases.
- Infrastructure.
- DevOps.
- Cloud.
- Security.
- Testing.
- Data engineering.
- Machine learning.
- Systems programming.
- Embedded.
- Game development.
- Developer tooling.

Categories must be extensible.

## 7.3 Skill evidence

Every skill should have evidence records.

Example:

Skill: TypeScript

Evidence:
- Repository A: package.json dependency.
- Repository A: 148 TypeScript source files.
- Repository A: strict TypeScript configuration.
- Repository B: TypeScript imports and usage.
- Repository C: TypeScript test suite.

Each evidence record should contain:

- Skill ID.
- Repository ID.
- Evidence type.
- Source file or metadata reference.
- Detection rule.
- Confidence.
- Timestamp.
- Analyzer version.

Do not store unnecessary source-code excerpts.

## 7.4 Skill classification

Separate the following concepts:

1. Technology detected.
2. Technology actively used.
3. Repeated technology usage.
4. Demonstrated engineering practices.
5. Estimated proficiency.

Proficiency is an inference, not a fact.

Use cautious terminology.

Suggested proficiency levels:

- Detected.
- Familiar.
- Practiced.
- Experienced.
- Advanced indicators.

Do not automatically classify someone as an expert based on repository counts.

---

# 8. SCORING ENGINE

## 8.1 General rules

The scoring engine must be deterministic.

Identical evidence and scoring configuration must produce identical results.

All metrics must have documented definitions.

Store the scoring configuration version with every profile snapshot.

The scoring engine must not call external APIs.

The scoring engine must not use an LLM to determine numerical scores.

AI may generate natural-language explanations from already calculated results.

## 8.2 Score dimensions

Initial dimensions:

1. Reliability.
2. Security.
3. Maintainability.
4. Uniqueness.
5. Contribution.
6. Influence.

Each dimension ranges from 0 to 100.

An overall score ranges from 0 to 10.

Initial overall formula:

OverallScore =
(
  Reliability * 0.20 +
  Security * 0.20 +
  Maintainability * 0.20 +
  Uniqueness * 0.10 +
  Contribution * 0.15 +
  Influence * 0.15
) / 10

All weights must be configurable.

This is an initial product-defined formula, not GitRoll's formula.

## 8.3 Reliability

Evaluate:

- Test infrastructure.
- CI execution.
- Error handling.
- Release consistency.
- Dependency stability.
- Repository maintenance.
- Build reproducibility indicators.

Suggested initial metric weights:

- Testing infrastructure: 25%
- CI/CD reliability indicators: 20%
- Error handling indicators: 15%
- Dependency hygiene: 15%
- Maintenance activity: 15%
- Release and build practices: 10%

Missing evidence must be represented as unknown, not automatically as failure.

## 8.4 Security

Evaluate:

- Static security findings.
- Dependency vulnerabilities.
- Secret exposure findings.
- Security configuration.
- Secure development practices.
- Security automation.

Suggested initial metric weights:

- Critical and high findings: 40%
- Medium findings: 15%
- Dependency hygiene: 15%
- Security configuration: 15%
- Secure coding indicators: 10%
- Security automation: 5%

Use severity-weighted deductions.

A security finding must have:
- Severity.
- Confidence.
- Rule identifier.
- Repository.
- File reference where safe.
- Detection timestamp.
- Remediation status where available.

A lack of findings must not automatically produce a perfect score.

## 8.5 Maintainability

Evaluate:

- Modularity.
- Documentation.
- Testing.
- Complexity indicators.
- Type safety.
- Linting.
- Formatting.
- Dependency organization.
- Architectural organization.

Suggested weights:

- Code organization: 20%
- Testing practices: 20%
- Type safety: 15%
- Documentation: 15%
- Complexity indicators: 15%
- Linting and formatting: 10%
- Dependency management: 5%

## 8.6 Uniqueness

Uniqueness must not reward obscure technologies arbitrarily.

Evaluate:

- Original project work.
- Non-trivial implementation.
- Technical diversity.
- Distinct project domains.
- Original contributions.
- Unusual but demonstrable combinations of technologies.

Avoid rewarding meaningless complexity.

Do not penalize conventional technology choices.

Forked repositories must not be treated as original projects.

## 8.7 Contribution

Evaluate:

- Authored work.
- Merged pull requests.
- External contributions.
- Reviews.
- Collaboration.
- Consistency.
- Meaningful maintenance.

Use normalized measurements over configurable time windows.

Suggested initial windows:

- 90 days.
- 365 days.
- Lifetime.

Avoid raw commit-count leaderboards.

## 8.8 Influence

Evaluate:

- Repository stars.
- Forks.
- External contributors.
- External adoption signals.
- Meaningful upstream contributions.
- Community engagement.

Normalize popularity metrics logarithmically.

Do not allow one viral repository to dominate the entire developer score.

Separate popularity from engineering quality.

## 8.9 Normalization

Metrics must be normalized to 0-100.

Use:

- Bounded metrics.
- Logarithmic scaling where appropriate.
- Percentile normalization where a reliable comparison population exists.
- Explicit missing-data handling.
- Confidence adjustments.

Do not compare developers against an invented population.

Do not change scores unpredictably as new users join.

## 8.10 Confidence

Every dimension must have a confidence value.

Confidence should depend on:

- Number of analyzed repositories.
- Number of independent evidence sources.
- Repository diversity.
- Data freshness.
- Analyzer coverage.
- Missing metrics.
- Sample size.

A score of 90 with low confidence must be distinguishable from a score of 90 with high confidence.

Display confidence separately from the score.

Do not silently penalize a developer for missing evidence.

## 8.11 Letter grades

Provide configurable grade thresholds.

Initial proposal:

S: 9.0 - 10.0
A: 8.0 - 8.99
B: 7.0 - 7.99
C: 6.0 - 6.99
D: 5.0 - 5.99
E: 0.0 - 4.99

Do not describe these grades as industry-standard qualifications.

They are internal platform classifications.

## 8.12 Scoring explanations

Every score must be explainable.

Example:

Maintainability: 78/100

Positive evidence:
- Strict TypeScript configuration.
- Automated test suite.
- Consistent linting.
- Modular project organization.

Negative evidence:
- Limited documentation.
- Several high-complexity modules.

Unknown:
- No reliable coverage report.

Provide links to relevant repositories.

---

# 9. BACKGROUND JOB SYSTEM

## 9.1 Infrastructure

Use Redis and BullMQ.

The worker application must be independently executable.

The web application creates and monitors jobs.

The worker processes jobs.

## 9.2 Queue definitions

Suggested queues:

profile-discovery
repository-metadata
repository-analysis
repository-security
repository-contributions
profile-aggregation
profile-publishing

Use independent queues when different resource limits or priorities justify them.

Avoid creating excessive queues.

## 9.3 Job definitions

Initial jobs:

profile.discover
profile.scan
profile.aggregate
profile.publish

repository.metadata
repository.languages
repository.manifests
repository.dependencies
repository.technologies
repository.architecture
repository.quality
repository.security
repository.contributions

webhook.process
repository.incremental-scan

Every job must have a validated payload schema.

## 9.4 Job lifecycle

A profile scan follows:

REQUESTED
  -> DISCOVERING
  -> QUEUED
  -> PROCESSING
  -> AGGREGATING
  -> PUBLISHING
  -> COMPLETED

Additional terminal states:

PARTIALLY_COMPLETED
FAILED
CANCELLED

Individual repository scans have independent states.

A failed repository must not invalidate successful repositories.

## 9.5 Idempotency

Every job must be idempotent.

Use deterministic job identifiers where appropriate.

Prevent duplicate active scans for the same account and configuration.

Persist execution state.

Do not rely exclusively on Redis job state as the source of truth.

## 9.6 Retries

Use exponential backoff.

Differentiate:

- Temporary network failures.
- GitHub rate limits.
- Permission failures.
- Missing repositories.
- Invalid repository contents.
- Analyzer crashes.
- Resource limits.
- Permanent validation failures.

Permanent failures must not retry indefinitely.

## 9.7 Concurrency

Implement:

- Global worker concurrency.
- Per-account concurrency.
- Per-repository concurrency.
- Analyzer-specific resource limits.
- GitHub API concurrency controls.

Avoid overwhelming GitHub APIs or the host machine.

## 9.8 Progress tracking

Track:

- Total repositories.
- Completed repositories.
- Failed repositories.
- Pending repositories.
- Current stage.
- Current repository.
- Started timestamp.
- Last progress timestamp.
- Estimated completion where meaningful.

Do not invent completion percentages.

The frontend must receive actual persisted progress.

Use polling initially or a suitable event mechanism.

WebSockets are optional, not required.

## 9.9 Scan recovery

Support:

- Worker restart.
- Job retry.
- Partial scan recovery.
- Manual retry of failed repositories.
- Cancellation.
- Stale job detection.
- Orphaned scan recovery.

Implement a recovery process for scans that remain active after a worker disappears.

---

# 10. INCREMENTAL ANALYSIS

## 10.1 Requirements

A full repository scan should not happen every time a user requests a profile refresh.

Track:

- Last analyzed commit SHA.
- Last analyzed timestamp.
- Repository metadata hash.
- Manifest hashes.
- Relevant configuration hashes.
- Analyzer version.
- Technology registry version.
- Scoring version.

## 10.2 Incremental strategy

When a repository has not changed:

Reuse valid analysis results.

When only metadata changes:

Update metadata without rerunning source analysis.

When dependencies change:

Re-run dependency and technology analysis.

When source files change:

Re-run affected analyzers.

When the analyzer version changes:

Invalidate affected analysis stages.

When scoring weights change:

Recalculate scores without rescanning repositories.

## 10.3 GitHub webhooks

Webhooks should mark repositories as dirty.

Do not immediately run a complete scan for every push.

Debounce multiple events.

Group changes.

Prioritize meaningful changes.

Provide manual refresh regardless of webhook availability.

## 10.4 Scheduled scans

Support:

- Manual scans.
- Daily scans.
- Weekly scans.
- Configurable scheduled scans.

Avoid a hardcoded three-day restriction.

Implement configurable rate limits and quotas.

---

# 11. DATABASE ARCHITECTURE

Use PostgreSQL and Drizzle ORM.

Use migrations for every schema change.

Do not use runtime schema synchronization as a substitute for migrations.

## 11.1 users

Fields:

- id
- username
- displayName
- email
- avatarUrl
- bio
- githubAccountId
- profileVisibility
- createdAt
- updatedAt

Username must be unique.

## 11.2 github_accounts

Fields:

- id
- userId
- githubUserId
- githubLogin
- accessTokenEncrypted
- refreshTokenEncrypted
- tokenExpiresAt
- scopes
- connectedAt
- disconnectedAt
- createdAt
- updatedAt

Never expose token fields through public queries.

## 11.3 repositories

Fields:

- id
- githubRepositoryId
- ownerLogin
- name
- fullName
- description
- htmlUrl
- defaultBranch
- visibility
- isFork
- isArchived
- isDisabled
- parentRepositoryId
- primaryLanguage
- stars
- forks
- watchers
- size
- topics
- license
- createdAt
- pushedAt
- lastSyncedAt

Unique constraint on githubRepositoryId.

## 11.4 repository_selections

Fields:

- id
- userId
- repositoryId
- included
- analysisMode
- createdAt
- updatedAt

Support user-specific inclusion and exclusion.

## 11.5 scans

Fields:

- id
- userId
- status
- triggerType
- totalRepositories
- completedRepositories
- failedRepositories
- skippedRepositories
- currentStage
- errorSummary
- startedAt
- completedAt
- createdAt

Trigger types:

- manual
- scheduled
- webhook
- initial

## 11.6 repository_scans

Fields:

- id
- scanId
- repositoryId
- status
- commitSha
- analyzerVersion
- startedAt
- completedAt
- errorCode
- errorMessage
- retryCount
- createdAt

Unique constraints should prevent duplicate repository scan records within a scan.

## 11.7 languages

Fields:

- id
- name
- normalizedName
- category
- aliases

## 11.8 repository_languages

Fields:

- id
- repositoryId
- scanId
- languageId
- bytes
- fileCount
- percentage
- detectedAt

## 11.9 technologies

Fields:

- id
- slug
- name
- category
- subcategory
- description
- registryVersion
- metadata

## 11.10 repository_technologies

Fields:

- id
- repositoryId
- scanId
- technologyId
- confidence
- evidenceCount
- usageType
- detectedAt

## 11.11 skills

Fields:

- id
- slug
- name
- category
- description

## 11.12 skill_evidence

Fields:

- id
- userId
- repositoryId
- scanId
- skillId
- evidenceType
- confidence
- sourceReference
- analyzerVersion
- detectedAt

## 11.13 contributions

Fields:

- id
- userId
- repositoryId
- externalId
- type
- author
- title
- state
- additions
- deletions
- createdAt
- mergedAt
- updatedAt

Use external IDs to deduplicate.

## 11.14 scores

Fields:

- id
- userId
- scanId
- dimension
- score
- confidence
- scoringVersion
- calculatedAt

## 11.15 profile_snapshots

Fields:

- id
- userId
- scanId
- overallScore
- grade
- confidence
- scoringVersion
- analyzerVersion
- summary
- createdAt

Snapshots must be immutable.

## 11.16 score_evidence

Fields:

- id
- scoreId
- repositoryId
- metric
- contribution
- explanation
- sourceReference
- createdAt

## 11.17 roadmap_nodes

Fields:

- id
- snapshotId
- technologyId
- confidence
- usageCount
- category

## 11.18 roadmap_edges

Fields:

- id
- snapshotId
- sourceTechnologyId
- targetTechnologyId
- relationshipType
- confidence

## 11.19 webhook_events

Fields:

- id
- githubDeliveryId
- eventType
- payloadHash
- processingStatus
- receivedAt
- processedAt

Use unique constraints on delivery IDs.

## 11.20 Database requirements

All relevant tables should have:

- Appropriate primary keys.
- Foreign keys.
- Unique constraints.
- Useful indexes.
- Created and updated timestamps.
- Explicit deletion policies.

Use JSONB only for genuinely flexible metadata.

Do not turn the entire database into unstructured JSON.

Avoid storing duplicate aggregate values when they can be derived efficiently.

Cache expensive aggregates when justified.

---

# 12. API AND APPLICATION CONTRACTS

Prefer server actions for application mutations where appropriate.

Use route handlers for:

- GitHub OAuth callbacks.
- Webhooks.
- External integrations.
- Public APIs.
- Health checks.
- Operations requiring HTTP-specific semantics.

All inputs must be validated using Zod.

All outputs must have explicit types.

## 12.1 Authentication

- Start GitHub authentication.
- Handle OAuth callback.
- Connect GitHub.
- Disconnect GitHub.

## 12.2 Repository management

- Discover repositories.
- List repositories.
- Get repository details.
- Include repository.
- Exclude repository.
- Bulk update selections.

## 12.3 Scans

- Request scan.
- Get scan status.
- Get scan details.
- List scan history.
- Cancel scan.
- Retry failed repositories.

## 12.4 Profiles

- Get own profile.
- Get public profile.
- Get profile snapshot.
- Compare snapshots.
- Get language breakdown.
- Get technologies.
- Get repository analysis.
- Get scoring explanations.
- Get technology roadmap.

## 12.5 Error handling

Use standardized application errors.

Examples:

UNAUTHORIZED
FORBIDDEN
NOT_FOUND
VALIDATION_ERROR
RATE_LIMITED
SCAN_ALREADY_RUNNING
SCAN_NOT_AVAILABLE
REPOSITORY_ACCESS_REVOKED
ANALYSIS_FAILED
INTERNAL_ERROR

Never return internal stack traces to users.

Log errors with correlation IDs.

---

# 13. FRONTEND SPECIFICATION

## 13.1 Design direction

The platform should feel like a premium developer analytics product.

Visual direction:

- Dark-first.
- Modern.
- Minimal.
- Dense but readable.
- Strong typography.
- Subtle borders.
- Clear hierarchy.
- Consistent spacing.
- Restrained use of gradients.
- High-quality charts.
- Excellent responsive behaviour.

Use shadcn/ui.

Avoid excessive decorative animations.

Do not imitate GitRoll pixel-for-pixel.

Create a recognizable visual identity.

## 13.2 Application routes

Suggested routes:

/
  Landing page.

/login
  Authentication.

/dashboard
  User dashboard.

/dashboard/repositories
  Repository management.

/dashboard/scans
  Scan history.

/dashboard/scans/[scanId]
  Scan details and progress.

/dashboard/settings
  Account settings.

/dashboard/settings/github
  GitHub connection and permissions.

/u/[username]
  Public profile.

/u/[username]/languages
  Language analytics.

/u/[username]/technologies
  Technology stack.

/u/[username]/roadmap
  Technology roadmap.

/u/[username]/repositories
  Repository explorer.

/u/[username]/history
  Historical progression.

Use route groups where appropriate.

## 13.3 Dashboard

Display:

- Current overall score.
- Latest scan status.
- Repository count.
- Analyzed repository count.
- Main technologies.
- Main languages.
- Recent profile changes.
- Failed analysis warnings.
- Refresh action.

## 13.4 Scan progress page

Display:

- Current scan state.
- Current stage.
- Completed repositories.
- Failed repositories.
- Pending repositories.
- Progress indicator.
- Per-repository status.
- Error details.
- Retry actions.
- Cancellation action.

The page must update from persisted backend state.

## 13.5 Public profile

The public profile should have:

Header:
- Avatar.
- Name.
- Username.
- Bio.
- GitHub link.
- Profile actions.

Overview:
- Overall score.
- Grade.
- Confidence.
- Dimension breakdown.

Analytics:
- Language distribution.
- Technology distribution.
- Repository statistics.
- Contributions.

Sections:
- Languages.
- Tech Stack.
- Tech Roadmap.
- Repositories.
- History.

## 13.6 Language visualizations

Use appropriate charts.

Provide accessible labels and tooltips.

Display exact values where available.

Do not hide important information behind visualizations.

## 13.7 Technology cards

Each technology card should show:

- Name.
- Category.
- Confidence.
- Evidence count.
- Repository count.
- Last observed.
- Supporting repositories.

Clicking a technology should open its detail view.

## 13.8 Technology roadmap

Use React Flow.

Requirements:

- Zoom.
- Pan.
- Fit view.
- Search.
- Category filters.
- Node selection.
- Relationship details.
- Confidence display.
- Responsive behaviour.

Use stable node identifiers.

Avoid rendering thousands of nodes simultaneously.

Provide graph filtering and sensible default views.

## 13.9 Repository explorer

Support:

- Search.
- Filters.
- Sorting.
- Pagination.
- Repository details.
- Score details.
- Technology filters.
- Language filters.
- Scan status.

## 13.10 Loading and empty states

Every page must support:

- Loading.
- Empty.
- Error.
- Partial data.
- Successful data.

Do not display misleading empty charts when data has not yet been analyzed.

Distinguish missing data from zero.

---

# 14. PRIVACY AND SECURITY

## 14.1 GitHub credentials

- Encrypt tokens at rest.
- Never log credentials.
- Never expose credentials to client code.
- Support revocation.
- Support account disconnection.
- Use minimum necessary permissions.

## 14.2 Private repositories

Private repository analysis must be opt-in.

Private repository data must never appear in public profiles unless the user explicitly publishes a safe aggregate.

Never publish:

- Source code.
- File contents.
- Secrets.
- Private repository names by default.
- Private commit messages.
- Sensitive metadata.

Provide separate controls for analyzing and publishing private repository-derived information.

## 14.3 Untrusted repository contents

Repository contents are untrusted input.

Never execute repository code.

Never run repository installation scripts.

Never run package lifecycle scripts.

Never execute build scripts.

Never import arbitrary repository modules into the analysis worker.

Static analysis must operate on data, not execute the project.

If native tools are required, execute them in isolated, resource-limited environments.

Apply timeouts, memory limits and filesystem restrictions.

## 14.4 Public profile security

Public profile queries must return an explicit public data projection.

Never serialize database models directly.

Enforce authorization at the data-access layer.

Do not rely on frontend visibility controls.

## 14.5 Data deletion

Support:

- Disconnect GitHub.
- Delete account.
- Delete repository selections.
- Delete private analysis data.
- Delete historical snapshots.
- Delete associated credentials.

Deletion must propagate through related records.

Define retention policies for logs and job metadata.

---

# 15. OBSERVABILITY AND OPERATIONS

Use Pino for structured logs.

Every scan should have a correlation ID.

Log:

- Scan creation.
- Repository discovery.
- Job creation.
- Job execution.
- Job completion.
- Job failure.
- Rate-limit events.
- Analyzer errors.
- Scoring completion.

Do not log sensitive repository contents or secrets.

Track:

- Queue depth.
- Job latency.
- Job failure rate.
- Scan duration.
- Repository analysis duration.
- GitHub API usage.
- Rate-limit exhaustion.
- Worker health.
- Database health.

Add health checks for:

- Web application.
- Worker.
- PostgreSQL.
- Redis.

Implement graceful worker shutdown.

Ensure active jobs can recover after restarts.

---

# 16. TESTING STRATEGY

Use Vitest.

Use Playwright for end-to-end testing.

## 16.1 Unit tests

Test:

- Language normalization.
- Manifest parsing.
- Technology detection.
- Evidence confidence.
- Skill aggregation.
- Metric normalization.
- Score calculations.
- Grade calculations.
- Snapshot generation.
- Repository classification.

## 16.2 Integration tests

Test:

- GitHub API adapters.
- Database persistence.
- Queue producers.
- Queue processors.
- Scan orchestration.
- Incremental analysis.
- Webhook processing.
- Authorization.
- Private repository isolation.

Use mocked external APIs and controlled fixtures.

## 16.3 End-to-end tests

Test:

1. User authenticates.
2. User connects GitHub.
3. Repositories are discovered.
4. User selects repositories.
5. User requests a scan.
6. Worker processes the scan.
7. Scan completes.
8. Profile is published.
9. Public profile displays correct data.
10. User requests another scan.
11. Unchanged repositories are skipped or reused appropriately.

## 16.4 Fixtures

Create representative repository fixtures for:

- TypeScript frontend.
- TypeScript backend.
- Next.js full-stack application.
- Python application.
- Rust project.
- Go service.
- C/C++ project.
- Dockerized application.
- Monorepo.
- Forked repository.
- Archived repository.
- Repository with no tests.
- Repository with security findings.
- Repository with missing manifests.

Fixtures must be deterministic.

Do not use real private repositories in automated tests.

---

# 17. DEPLOYMENT

## 17.1 Local development

Provide Docker Compose for:

- PostgreSQL.
- Redis.

The web application and worker should be runnable locally using pnpm.

Provide:

- Environment variable examples.
- Database migrations.
- Seed scripts for registry data.
- Development commands.
- Test commands.

## 17.2 Production

Support deployment to a standard Linux VPS.

Services:

- Web application.
- Worker application.
- PostgreSQL.
- Redis.

Use persistent storage where necessary.

Support separate worker scaling.

The web application should remain responsive during expensive scans.

## 17.3 Environment variables

Document variables such as:

DATABASE_URL
REDIS_URL
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GITHUB_APP_ID
GITHUB_APP_PRIVATE_KEY
GITHUB_WEBHOOK_SECRET
AUTH_SECRET
ENCRYPTION_KEY
APP_URL
NODE_ENV

Only introduce variables that are actually required by the implemented integrations.

Never commit real credentials.

---

# 18. MVP DEFINITION

The MVP must deliver a complete working experience.

It is not sufficient to create a dashboard with static data.

## MVP functionality

### Authentication
- GitHub login.
- Account connection.
- Secure token storage.

### Repository discovery
- Fetch repositories.
- Classify forks and archived repositories.
- Allow repository inclusion and exclusion.

### Analysis
- Language detection.
- Manifest discovery.
- Dependency detection.
- Framework detection.
- Technology classification.
- Evidence persistence.

### Background processing
- BullMQ.
- Redis.
- Independent worker.
- Scan progress.
- Retry support.
- Partial failure support.

### Scoring
- Initial deterministic score.
- Six scoring dimensions.
- Confidence values.
- Scoring explanations.

### Profiles
- Public developer profile.
- Overview.
- Languages.
- Tech Stack.
- Repository explorer.
- Score breakdown.

### Persistence
- Historical snapshots.
- Scan history.
- Analyzer version tracking.

A user must be able to connect GitHub, scan real repositories and obtain a real profile without developer intervention.

---

# 19. POST-MVP ROADMAP

## Phase A — Advanced repository analysis

- Tree-sitter integration.
- Architecture detection.
- Code quality analysis.
- Testing analysis.
- Security analysis.
- More language ecosystems.

## Phase B — Contributions

- Commit history.
- Pull requests.
- Reviews.
- Collaboration.
- Contribution consistency.
- External project contributions.

## Phase C — Technology roadmap

- Relationship registry.
- Interactive graph.
- Category filtering.
- Technology exploration.
- Historical technology adoption.

## Phase D — Historical intelligence

- Snapshot comparisons.
- Skill progression.
- Score progression.
- Technology adoption timeline.
- Repository evolution.

## Phase E — Automation

- GitHub webhooks.
- Incremental scanning.
- Scheduled refresh.
- Automatic recovery.
- Scan quotas.

## Phase F — Advanced product features

- Embeddable profile cards.
- Open Graph profile images.
- Public API.
- Developer badges.
- Exportable reports.
- Organization profiles.
- Team analytics.
- Hosted SaaS support.

---

# 20. ACCEPTANCE CRITERIA

A feature is not complete simply because its UI exists.

## GitHub integration

- Authentication works.
- Tokens remain server-side.
- Repository pagination works.
- API rate limits are respected.
- Revoked permissions are handled.
- Private access is explicitly authorized.

## Repository discovery

- Repository IDs are unique.
- Forks are classified.
- Archived repositories are classified.
- Repository inclusion works.
- Deleted repositories are handled.

## Analysis

- Real repository data is processed.
- Language statistics are reproducible.
- Manifest parsers work against fixtures.
- Technology detections include evidence.
- Unsupported formats fail gracefully.
- Large repositories respect resource limits.
- No repository code is executed.

## Scanning

- Jobs execute independently.
- Progress persists.
- Failed repositories do not invalidate successful ones.
- Retries work.
- Cancellation works.
- Worker restarts do not corrupt scan state.
- Duplicate scans are prevented.

## Scoring

- Scores are deterministic.
- Weights are configurable.
- Missing data is represented correctly.
- Confidence is displayed.
- Evidence can be inspected.
- Historical scores remain unchanged after later scans.

## Profiles

- Public profiles display real data.
- Private repository data is protected.
- Empty states are correct.
- Historical snapshots work.
- Repository filters work.
- Technology evidence is accessible.

## Deployment

- Local environment starts successfully.
- Migrations execute.
- Worker runs independently.
- Health checks work.
- Production build succeeds.

---

# 21. IMPLEMENTATION ORDER

Implement in the following order.

Do not skip foundational work.

## Stage 0 — Repository audit and planning

Inspect the existing codebase.

Produce:

- Architecture assessment.
- Dependency assessment.
- Proposed directory structure.
- Package dependency graph.
- Database design.
- Implementation plan.

Do not make destructive changes.

## Stage 1 — Monorepo foundation

Implement:

- pnpm workspace.
- Turborepo.
- Next.js application.
- Worker application.
- Shared configuration.
- TypeScript configuration.
- ESLint.
- Prettier.
- Docker Compose.
- PostgreSQL.
- Redis.

Acceptance:
Both applications start independently and all packages type-check.

## Stage 2 — Database and domain foundation

Implement:

- Initial Drizzle schema.
- Migrations.
- Relations.
- Shared Zod schemas.
- Domain types.
- Error types.
- Database connection management.

Acceptance:
Migrations run from a clean database and basic persistence tests pass.

## Stage 3 — GitHub integration

Implement:

- Authentication.
- GitHub account connection.
- Repository discovery.
- Repository metadata.
- Repository selection.
- Token encryption.
- API rate-limit handling.

Acceptance:
A real GitHub account can connect and discover repositories.

## Stage 4 — First analysis engine

Implement:

- Repository acquisition.
- File classification.
- Language detection.
- Manifest discovery.
- Dependency parsing.
- Technology registry.
- Framework detection.
- Evidence persistence.

Acceptance:
A real repository can be analyzed and its results persisted.

## Stage 5 — Background scanning

Implement:

- Redis queues.
- BullMQ.
- Worker bootstrap.
- Scan orchestration.
- Repository processors.
- Progress persistence.
- Retries.
- Failure recovery.

Acceptance:
A user can request a scan and observe real asynchronous progress.

## Stage 6 — Scoring engine

Implement:

- Metric definitions.
- Dimension calculators.
- Normalization.
- Confidence.
- Grade calculation.
- Evidence explanations.
- Snapshot persistence.

Acceptance:
Identical inputs produce identical scores.

## Stage 7 — Public profiles

Implement:

- Dashboard.
- Public profile.
- Overview.
- Languages.
- Technologies.
- Repository explorer.
- Score breakdown.
- Loading and error states.

Acceptance:
A scanned account has a usable public profile.

## Stage 8 — Advanced intelligence

Implement:

- Tree-sitter.
- Architecture analysis.
- Testing analysis.
- Quality analysis.
- Semgrep.
- Security findings.
- Contribution analysis.

Acceptance:
Advanced metrics have actual supporting evidence and tests.

## Stage 9 — Roadmap and historical analytics

Implement:

- Technology relationships.
- React Flow.
- Snapshot comparison.
- Historical charts.
- Skill progression.

Acceptance:
Users can inspect technology relationships and compare real historical scans.

## Stage 10 — Incremental scanning and automation

Implement:

- Commit SHA tracking.
- Manifest hashing.
- Analyzer version invalidation.
- Webhooks.
- Scheduled scans.
- Incremental processing.
- Recovery.

Acceptance:
An unchanged repository does not undergo unnecessary full analysis.

## Stage 11 — Production hardening

Implement:

- Security review.
- Performance optimization.
- Observability.
- Resource limits.
- Backup strategy.
- Data deletion.
- Deployment documentation.

Acceptance:
The system can be deployed and operated independently.

---

# 22. IMPORTANT DESIGN DECISIONS

## Do not build a GitHub clone

The objective is developer intelligence, not reproducing GitHub.

## Do not overuse AI

The analysis must be explainable.

Use AI only for optional descriptions and insights based on existing evidence.

## Do not rescan unnecessarily

Incremental analysis is a core architectural requirement.

## Do not make the worker dependent on Next.js

It must remain independently deployable.

## Do not overcomplicate infrastructure

A monorepo with one web application, one worker, PostgreSQL and Redis is sufficient.

## Do not confuse activity with skill

A developer's expertise cannot be inferred from commit counts alone.

## Do not confuse popularity with quality

Stars and forks belong primarily to influence metrics.

## Do not silently discard evidence

All important detections and score changes must be traceable.

## Do not expose private data

Private repository analysis and public profile publication are separate permissions.

## Do not invent historical data

Historical comparisons require actual snapshots.

---

# 23. DEFINITION OF DONE

The project is considered ready for its first public release when:

1. A user can authenticate with GitHub.
2. The platform can discover and classify repositories.
3. Users can choose which repositories to analyze.
4. Real repository analysis runs asynchronously.
5. Language detection works.
6. Technology detection works.
7. Analysis evidence is persisted.
8. The scoring engine calculates deterministic scores.
9. Scores have explanations and confidence.
10. Public developer profiles work.
11. Historical snapshots are stored.
12. Private repository information is protected.
13. Failed scans can recover.
14. Tests cover the critical domain logic.
15. The application can be self-hosted.
16. The worker can run independently.
17. The entire system can be operated without manual intervention.

The result should be a maintainable, extensible and genuinely useful developer intelligence platform.

Build for correctness first, then completeness, then optimization.