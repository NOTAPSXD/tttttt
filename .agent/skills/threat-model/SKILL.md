---
name: threat-model
description: STRIDE and DREAD threat modeling framework for architecture, endpoints, and authentication boundaries. Adapted from CrashBytes/claude-role-skills.
---

# Threat Modeling (STRIDE / DREAD)

Analyze systems, features, or architectural endpoints to identify threat surfaces and prioritize defensive controls.

## STRIDE Framework

| Category | Security Property Violated | Core Question |
| :--- | :--- | :--- |
| **S**poofing | Authentication | Can an attacker impersonate a user or component? |
| **T**ampering | Integrity | Can data in transit or storage be modified without authorization? |
| **R**epudiation | Non-repudiation | Can a critical action be performed without an immutable audit trail? |
| **I**nformation Disclosure | Confidentiality | Can sensitive data, provider IDs, or internal URLs leak? |
| **D**enial of Service | Availability | Can repeated requests degrade or exhaust platform resources? |
| **E**levation of Privilege | Authorization | Can an unprivileged user access administrative functions? |

## DREAD Scoring

Rate each dimension from 1 (lowest) to 10 (highest):
- **D**amage Potential
- **R**eproducibility
- **E**xploitability
- **A**ffected Users
- **D**iscoverability

$$\text{Risk Score} = \frac{D + R + E + A + D}{5}$$

- **Critical:** 8.0 - 10.0
- **High:** 6.0 - 7.9
- **Medium:** 4.0 - 5.9
- **Low:** 1.0 - 3.9
