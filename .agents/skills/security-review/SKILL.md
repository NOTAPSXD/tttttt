---
name: security-review
description: Comprehensive security code review focused on OWASP Top 10 vulnerabilities, input validation, authentication/session integrity, and secure design patterns. Adapted from CrashBytes/claude-role-skills.
---

# Security Review

Perform a rigorous security-focused code review on files, pull requests, or entire repositories.

## Workflow

1. **Scope Identification**
   - Identify entry points, APIs, mutation endpoints, and data-flow paths.
   - Trace external service interactions and data boundaries.

2. **OWASP Top 10 Verification**
   - **Injection**: NoSQL query injection, SQL injection, OS command execution.
   - **Broken Authentication**: Session fixation, weak credentials, lack of 2FA rate limiting.
   - **Sensitive Data Exposure**: Secrets in code, unencrypted PII, unstripped provider payloads.
   - **Broken Access Control**: Missing authorization, IDOR, improper ownership verification.
   - **Security Misconfiguration**: Default headers, exposed debug routes, production source maps.
   - **Cross-Site Scripting (XSS)**: Unescaped inputs in rendered templates or HTML.
   - **Insecure Dependencies**: Outdated packages with known CVEs.
   - **Server-Side Request Forgery (SSRF)**: Unvalidated external requests to internal infrastructure.

3. **Remediation Strategy**
   - Rank vulnerabilities by severity (Critical, High, Medium, Low).
   - Provide minimal, atomic diffs preserving existing validation and error handling.
