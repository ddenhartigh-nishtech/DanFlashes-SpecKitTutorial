# Specification Quality Checklist: Revenue Streams & Per Diem Drain

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-14
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Iteration 1 (2026-10-14): 3 open markers: FR-001 stream types (Q1), FR-003 payment schedule (Q2),
  FR-004 ongoing vs trip per diem (Q3). All other items pass.
- Constitution IV: the per diem drain is switch-gated (FR-011, FR-016). Revenue streams are treated
  as a store feature with no switch of their own; this is called out in Assumptions for the owner to
  confirm.
- Constitution commerce rules: every stream payment is its own ledger entry (FR-005), the balance is
  never negative, money is exact cents (FR-002), and no bank details are collected (FR-002, SC-007).
- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`.
