# META-DP-VALIDATE-v1.1 Specification
**Canonical DP Reference Validation Protocol**

---

## Overview
META-DP-VALIDATE-v1.1 defines a mandatory validation mechanism ensuring all submissions reference only the canonical Desirable Properties (DPs) from the authenticated Meta-Layer DP Registry. It prevents protocol drift, enforces consistency, and enables automated integrity checks.

---

## 1. DP Registry Structure
- **Format:** JSON
- **Storage Location:** IPFS
- **Example Registry CID:** `QmXyZ...v1.3`
- **Schema:**
```json
{
  "version": "v1.3",
  "registry_hash": "<SHA3-256 hash of canonical DP list>",
  "dps": {
    "DP1-v1.3": "Federated Authentication & Accountability",
    "DP2-v1.3": "Participant Agency and Empowerment",
    "... up to DP21-v1.3 ..."
  },
  "signature": "<Ed25519 signature>"
}
```

## 2. Validation Requirements

### 2.1 Canonical DP References
- All submissions must reference DPs using the exact format: `DP<number>-v<version>`
- Example: `DP14-v1.3`, `DP2-v1.3`
- No shorthand references allowed (e.g., "DP14" without version)

### 2.2 Registry Verification
- Before processing any submission, verify the DP Registry signature
- Cross-reference all DP mentions against the authenticated registry
- Reject submissions with undefined or invalid DP references

### 2.3 Checksum Validation
- Submissions must include footer checksum: `DP_LIST_CHECKSUM: <SHA3-256 hash>`
- Validate checksum against registry's authenticated hash
- Reject submissions with mismatched checksums

## 3. Error Handling

### 3.1 Invalid DP References
When invalid DPs are detected:
- Return error code: `INVALID_DP_REFERENCE`
- List the incorrect DP(s)
- Suggest closest valid matches
- Direct user to DP Registry location

### 3.2 Registry Signature Failures
- Reject submission with `REGISTRY_SIGNATURE_INVALID`
- Log the failure for audit purposes
- Provide registry verification instructions

## 4. Implementation Guidelines

### 4.1 Local Caching
- Registry may be cached locally for performance
- Require per-session signature verification
- Update cache when registry version changes

### 4.2 Version Compatibility
- Support multiple registry versions simultaneously
- Maintain backward compatibility where possible
- Clear migration path for version updates

## 5. Security Considerations

### 5.1 Signature Verification
- Use Ed25519 for registry signatures
- Verify signatures before any DP validation
- Implement proper key management

### 5.2 Integrity Checks
- SHA3-256 for checksum generation
- Validate checksums at submission boundaries
- Prevent tampering with DP references

## 6. Compliance Enforcement

### 6.1 Mandatory Checks
- All submissions must pass DP validation
- No exceptions for legacy or special cases
- Consistent enforcement across all entry points

### 6.2 Audit Trail
- Log all validation attempts
- Record failed validations with details
- Maintain compliance audit records

---

**Protocol Version:** v1.1  
**Last Updated:** 2025  
**Status:** Active  
**Compliance:** Mandatory 