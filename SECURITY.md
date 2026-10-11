# Security Policy

## Supported Versions

We release security updates for the latest stable version. Older versions may not receive patches.

| Version | Supported |
| --- | --- |
| Latest (main/v*) | Yes |
| Older releases | No (upgrade recommended) |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue in StreamX API, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please report privately via:
- GitHub Security Advisories: [https://github.com/imzyrix/streamx-api/security/advisories/new](https://github.com/imzyrix/streamx-api/security/advisories/new)
- Or contact [@imzyrix](https://github.com/imzyrix) directly via GitHub.

## What to Include

When reporting a vulnerability, please include:
- A clear description of the issue
- Steps to reproduce (proof of concept if possible)
- Potential impact assessment
- Suggested fix or mitigation (if any)
- Affected endpoints, runtime (Cloudflare/Vercel/Railway/Docker/local), and version/commit

## Response Timeline

- **Acknowledgment**: Within 48 hours of receiving your report
- **Assessment**: Within 3–5 business days with initial findings
- **Fix**: We aim to release a patch as soon as possible, depending on severity
- **Disclosure**: We'll coordinate public disclosure after a fix is available and users have had time to update

## Scope

This policy covers vulnerabilities in the StreamX API codebase itself (`functions/`, `server/`, `api/`, `mcp/`). It does **not** cover:
- Issues with upstream providers (Cinemeta, MetaHub, Wikidata, etc.)
- Rate limiting or abuse at the hosted instance (`api.streamx.qzz.io`)
- Misconfigurations in self-hosted deployments

## Notes

StreamX API is designed to be keyless with no secrets stored. We appreciate your help in keeping it secure for the community.
