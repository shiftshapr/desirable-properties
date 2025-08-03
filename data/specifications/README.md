# Meta-Layer Specifications Directory

This directory contains the official specifications and protocols for the Meta-Layer Desirable Properties system.

## Available Specifications

### Core Protocols

1. **[META-DP-VALIDATE-v1.1](./META-DP-VALIDATE-v1.1.md)**
   - Canonical DP Reference Validation Protocol
   - Defines mandatory validation mechanisms for DP references
   - Ensures consistency and prevents protocol drift

2. **[META-DP-EVAL-v1.5](./META-DP-EVAL-v1.5.md)**
   - Protocol Upgrade Kit for GPT Instruction Injection
   - Defines compliance enforcement rules for submissions
   - Includes migration guide from v1.4 to v1.5

## Protocol Hierarchy

```
META-DP-EVAL-v1.5 (GPT Enforcement)
    ↓
META-DP-VALIDATE-v1.1 (Validation Rules)
    ↓
DP Registry (IPFS-based canonical reference)
```

## Usage

These specifications are designed to be:
- **Machine-readable** for automated validation
- **Human-readable** for implementation guidance
- **Version-controlled** for protocol evolution
- **Compliance-enforced** across all system components

## Integration

The specifications are integrated into:
- GPT instruction sets for submission validation
- API endpoints for DP reference checking
- Frontend validation for user submissions
- Database schemas for integrity constraints

## Version Control

- All specifications include version tags
- Backward compatibility maintained where possible
- Clear migration paths between versions
- Deprecation notices for old versions

---

**Last Updated:** 2025  
**Maintainer:** Meta-Layer Initiative  
**Status:** Active Development 