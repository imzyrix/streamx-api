# Contributing to StreamX API

Thank you for considering contributing to StreamX API! We welcome contributions from the community to help improve this keyless, self-hostable metadata API.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Contribution Guidelines](#contribution-guidelines)
- [Adding New Endpoints](#adding-new-endpoints)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)
- [License](#license)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please read it before contributing.

## How Can I Contribute?

There are several ways to contribute to StreamX API:

- **Reporting Bugs**: Help us identify and fix issues.
- **Suggesting Features**: Share ideas to improve the API.
- **Writing Code**: Implement features, fix bugs, or improve performance.
- **Improving Documentation**: Enhance READMEs, guides, or code comments.
- **Testing**: Test endpoints and report inconsistencies.
- **Sharing**: Star the repo, fork it, or share it with others.

## Development Setup

To set up your local development environment:

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (22 recommended, see `.nvmrc`)

### Installation

```bash
# Clone the repository
git clone https://github.com/imzyrix/streamx-api.git
cd streamx-api

# Install dependencies
npm install
```

### Running Locally

```bash
# Option 1: Cloudflare Pages Functions (wrangler)
npm run dev                 # Available at http://localhost:8788

# Option 2: Portable Node.js server (no external dependencies)
node server/index.js        # Available at http://localhost:8788 (PORT env optional)

# Option 3: Docker
docker build -t streamx-api .
docker run -p 8788:8788 streamx-api
```

### Verification

```bash
# Check syntax
node --check server/index.js api/index.js

# Test health endpoint
curl http://localhost:8788/health

# Test a sample endpoint
curl "http://localhost:8788/scores/movie/tt0133093"
```

## Contribution Guidelines

### Core Principles

1. **Zero API Keys** – Never add a data source that requires an API key, secret, or authentication token. This project is 100% keyless by design.
2. **Never Delete Code** – If you're removing or replacing behavior, preserve the original implementation as a commented block with the marker:
   ```js
   // ORIGINAL (preserved, not deleted — disabled by comment):
   ```
   Preserved modules may also live in `_preserved/` when appropriate.
3. **Fail-Soft by Default** – Enrichment and optional upstream data must never cause a 500 error. If an upstream fails or is slow, return `null`, omit the field, or degrade gracefully.
4. **Keep It Minimal** – Favor simplicity, readability, and maintainability. Avoid unnecessary dependencies.
5. **Consistent with Existing Code** – Match the existing code style, patterns, and architecture.

### Code Style

- Use 2-space indentation.
- Use `LF` line endings (see `.gitattributes` and `.editorconfig`).
- Prefer modern ES modules (`"type": "module"`).
- Avoid adding comments unless explaining a non-obvious workaround or critical behavior.
- Trim trailing whitespace (except in Markdown files).

## Adding New Endpoints

When adding a new route, follow these steps in order:

1. **Create the function handler** – Add `functions/<route-path>.js` exporting `onRequestGet(context)`.
2. **Register the route** – Add the mapping to `server/app.js` in the `ROUTES` array. The portable Node/Vercel server must serve the same path.
3. **Update health** – Add your endpoint(s) to `functions/health.js` under the `endpoints` object.
4. **Document it** – Update `README.md` (API Reference), `skill/SKILL.md`, `skill/reference.md`, `llms.txt`, `llms-full.txt`, and add the corresponding tool to `mcp/server.mjs` if it should be exposed via MCP.
5. **Version appropriately** – If it's a user-facing feature, bump the version in `functions/health.js`, `package.json`, `server/package.json`, and `mcp/package.json`. Document in `CHANGELOG.md`.
6. **Validate** – Run `node --check` on all modified `.js` files.

## Pull Request Process

1. **Fork** the repository and create a feature branch from `main`.
2. **Make focused changes** – Keep each PR focused on a single feature, fix, or improvement.
3. **Test your changes** – Verify locally with `node --check` and by hitting the affected endpoints.
4. **Update documentation** – Include relevant updates to README, docs, or skill files.
5. **Update CHANGELOG.md** – Add an entry under `[Unreleased]` following [Keep a Changelog](https://keepachangelog.com/) conventions.
6. **Ensure clean diffs** – Remove debug code, unused imports, or unrelated formatting.
7. **Submit your PR** – Provide a clear title and description explaining the motivation, changes, and testing steps.
8. **Address feedback** – Be responsive to review comments and iterate as needed.

## Reporting Issues

If you encounter a bug or have a feature request:

- **Check existing issues** first to avoid duplicates.
- **Use the issue templates** – Bug reports and feature requests have dedicated templates in `.github/ISSUE_TEMPLATE/`.
- For bugs, include: endpoint, parameters, expected vs. actual behavior, runtime (Cloudflare/Vercel/Railway/Docker/local), version/commit, and reproducible cURL/requests if possible.
- For security vulnerabilities, **do not** open a public issue. Refer to [SECURITY.md](SECURITY.md) for responsible disclosure.

## License

By contributing to StreamX API, you agree that your contributions will be licensed under the same licenses as the project:
- **Source code**: [MIT License](LICENSE)
- **Documentation & written content**: [CC BY 4.0](LICENSE-DOCS)

Thank you for helping make StreamX API better!
