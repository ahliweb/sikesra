# SIKESRA Reference Data Model

This plugin ships deterministic reference fixtures for documenting a SIKESRA-grade registry model.

## Purpose

- demonstrate registry-style entities without storing production data
- show supporting-document metadata and verification flow shapes
- give tests and docs a stable reference dataset
- keep public-safe aggregate behavior explicit

## Fixture Groups

- `registryEntities`: reference records for the registry-style entities
- `supportingDocuments`: document metadata attached to registry entities
- `verificationEvents`: staged verification history for the sample records
- `publicAggregate`: safe category counts suitable for public display
- `accessPermissions` and `accessRoles`: reference access-control catalog entries
- `abacSubjects`, `abacResources`, and `abacPolicies`: ABAC-ready sample inputs

## Sensitivity Levels

- `public_safe`
- `internal`
- `restricted`
- `highly_restricted`

## Region Fields

- `provinceCode`
- `regencyCode`
- `districtCode`
- `villageCode`

## Notes

- The fixtures are deterministic and safe to import in tests.
- The public aggregate intentionally suppresses sensitive categories.
- These fixtures are reference data only and do not represent production SIKESRA content.
