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

- [x] No [NEEDS CLARIFICATION] markers remain
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
- Constitution IV: the per diem drain is switch-gated (FR-012, FR-017; FR numbers as of iteration 2). Revenue streams are treated
  as a store feature with no switch of their own; this is called out in Assumptions for the owner to
  confirm.
- Constitution commerce rules: every stream payment is its own ledger entry (FR-006), the balance is
  never negative, money is exact cents (FR-002), and no bank details are collected (FR-002, SC-007).
- Iteration 2 (2026-10-14): the owner answered Q1 C (per diem plus absurd presets plus custom
  streams), Q2 (recurring on an owner-tunable period, plus one-time and "whenever I want" options),
  and Q3 (a set start and end per stream, or Ongoing). The spec was rewritten around per-stream
  schedules and windows. All items pass.
- Iteration 3 (2026-10-14, after `/speckit-analyze`): the owner added split payment (US3,
  FR-018–FR-023, SC-009, SC-010). Voice moved to FR-024 to keep FRs in document order. This replaces 001
  FR-027 for partial coverage. All items pass.
- Iteration 4 (2026-10-14): the owner added "drain them all" (US4, FR-024–FR-028, SC-011, SC-012).
  Voice moved to FR-029. FR-017 now also covers stream "left" amounts and achievements. All items
  pass.
- Iteration 5 (2026-10-15): owner feedback round 4 added the GONE pops in the corner and an (x) to
  clear each one (FR-029, FR-030, US4 AC7–AC8, SC-013). FR-014 now ends at "until he clears it".
  Voice moved to FR-031. All items pass.
- Iteration 6 (2026-10-15): owner feedback round 5 dropped the confirmation's achievement box. The
  corner is the celebration now (FR-014, FR-026, FR-027, US2 AC3, US4 AC3–AC4, SC-005, SC-012). All
  items pass.
- Iteration 7 (2026-10-15): owner feedback round 6 put the jokes back on the GONE pops, behind the
  drain jokes setting, on by default (FR-031). Voice moved to FR-032. All items pass.
