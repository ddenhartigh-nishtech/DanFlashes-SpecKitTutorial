# Feature Specification: Housekeeping

**Feature Branch**: `011-housekeeping`

**Created**: 2026-10-20

**Status**: Draft (Q1–Q4 resolved 2026-10-20)

**Input**: User description: "Housekeeping (ROADMAP 011). Two parts. (1) The e2e suite keeps its uploaded and generated pictures in its own folder (not the real store's uploads folder beside the dev database), emptied before every e2e run and again after it, so test runs never leave files behind in the real store. (2) An owner-run housekeeping command, `npm run shirts:sweep`, deletes abandoned creations from the real store: shopper-made shirts (007's Make it mine) that nobody has bought, that sit in no cart, that Dan hasn't mass-produced or changed in any way (renamed, re-scored, priced, rested, re-pictured), and that are older than 30 days — along with their generated art (media rows and files). It never deletes a shirt Dan made in the back office (released or not), a catalog shirt, a mass-produced shirt, or anything in an order. It also removes picture files in the uploads folder that no media row references. It backs the database up first, lists what it would delete, and deletes only when run with --yes."

**Builds on**:
- 007-pattern-generator: shopper-made shirts (Make it mine), their makers, mass production
- 008-admin-console: uploads on disk, the media library, the shirt editor
- 010-gentler-pricing-curve: constitution v5.0.0, which carries II's exception for abandoned
  creations (batched into PR #10)

## Clarifications

### Session 2026-10-20

The owner asked what happens to shirts made at the dial and never bought, and to the files test
runs leave behind in the store's uploads folder.

- Q1: Where does the constitution change go? → A: **Batched into v5.0.0** (PR #10). II's "never
  deleted" gains one exception: an owner-run sweep may delete an abandoned creation.
- Q2: How old must an abandoned creation be? → A: **30 days.**
- Q3: How does the sweep run? → A: **An npm script**, run by hand. It backs up first, lists what it
  would delete, and deletes only when told to.
- Q4: Does a shopper creation Dan has changed but not mass-produced survive? → A: **Yes.** Anything
  Dan touched was deliberate, so it stays.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Test Runs Clean Up After Themselves (Priority: P1)

The developer runs the full test suite. The tests make shirts and upload pictures, all in their own
folder. When the run ends, that folder is empty again, and the real store's uploads folder is
exactly as it was.

**Why this priority**: without it, every run leaves dozens of stray files beside the real store's
pictures, and no clean-up can safely tell them apart.

**Independent Test**: note the real store's uploads folder, run the suite, then compare. Nothing was
added or removed, and the suite's own folder is empty.

**Acceptance Scenarios**:

1. **Given** the suite runs, **When** a test makes a shirt or uploads a picture, **Then** the file
   lands in the suite's own folder, never in the real store's.
2. **Given** a run ends, passing or failing, **When** the developer looks, **Then** the suite's
   folder is empty.
3. **Given** a run was interrupted, **When** the next run starts, **Then** it empties the suite's
   folder first.

---

### User Story 2 - Sweep Abandoned Creations (Priority: P2)

Guys have been making shirts at the dial for weeks and walking away. Dan runs the sweep. It lists
every abandoned creation: made by a shopper more than 30 days ago, never bought, in nobody's cart,
untouched by Dan. It also lists the stray picture files nothing uses. Dan reads the list and runs
it again with yes. They're gone, art and all. Every shirt Dan made himself is still there, including
the ones he hasn't put on the floor yet.

**Why this priority**: it keeps the store's database and pictures from filling up with shirts nobody
wanted, without touching anything anyone did want.

**Independent Test**: on a store holding one of every kind of shirt (abandoned, bought, in a cart,
mass-produced, touched by Dan, made by Dan and resting, a catalog shirt, and a creation under 30
days old), run the sweep. First it only lists the abandoned one. With yes, only that one is gone,
with its art.

**Acceptance Scenarios**:

1. **Given** the sweep runs without yes, **When** it finishes, **Then** it has listed what it would
   delete and changed nothing.
2. **Given** the sweep runs with yes, **When** it finishes, **Then** the store was backed up first,
   every listed shirt is gone with its art, and it says how many shirts and files it removed.
3. **Given** a shirt Dan made in the back office that's still resting, **When** the sweep runs,
   **Then** it's kept.
4. **Given** a shopper-made shirt that someone bought, that's in any cart, that's mass-produced, that
   Dan changed in any way, or that's 30 days old or younger, **When** the sweep runs, **Then** it's
   kept.
5. **Given** picture files in the uploads folder that no picture in the library refers to, **When**
   the sweep runs with yes, **Then** they're removed. Every file the library refers to stays.
6. **Given** the dial setting of a swept shirt, **When** someone makes it again, **Then** a new
   shirt is made, as if for the first time.

---

### Edge Cases

- **Nothing to sweep.** The sweep says so and changes nothing. It still backs up only when told yes.
- **Mass-produced, then one of a kind again.** Dan changed it, so it's kept.
- **A picture Dan attached, removed or reordered on a shopper creation.** Dan changed it, so it's
  kept.
- **A creation from before makers were kept** (no maker). Abandoned under the same rules, it's swept
  like any other.
- **Art shared with something else.** If a creation's picture is also used by another shirt or is the
  store's placeholder, the picture stays and only the shirt goes.
- **Pictures in the library that no shirt uses.** Dan uploaded them on purpose, so they stay. Only
  files with no library entry at all are removed.
- **The store is running.** The sweep works while the store is up. A shopper looking at a swept shirt
  gets the store's 404 on his next page.
- **Exactly 30 days old.** Kept. Only creations older than 30 days are swept.
- **Files that aren't the store's.** Anything in the uploads folder that isn't named like a stored
  picture is left alone.

## Requirements *(mandatory)*

### Functional Requirements

**The test suite's pictures (US1)**

- **FR-001**: The test suite MUST keep every picture it makes or uploads in a folder of its own,
  never the real store's uploads folder.
- **FR-002**: That folder MUST be emptied before every run and again after it, whether the run passed
  or failed.

**Abandoned creations (US2)**

- **FR-003**: An **abandoned creation** MUST be a shirt that is all of these:
  - made by a shopper at the dial (007's Make it mine), not by Dan or the catalog
  - not mass-produced
  - in no order, ever
  - in no cart
  - never changed by Dan (FR-004)
  - made more than 30 days before the sweep runs (Q2)
- **FR-004**: Every change Dan makes to a shopper-made shirt in his office MUST mark it as Dan's,
  so the sweep keeps it (Q4). That covers:
  - saving it in the editor: name, score, price, description, featured
  - resting or restoring it
  - mass-producing it or making it one of a kind again
  - attaching, removing or reordering its pictures
- **FR-005**: The sweep MUST NEVER delete:
  - a shirt Dan made, released or not
  - a catalog shirt
  - a mass-produced shirt
  - any shirt in an order or a cart
- **FR-006**: The sweep MUST be a command the owner runs by hand (Q3). Run plainly, it lists what it
  would delete (each shirt's name, age and maker, plus the stray files) and changes nothing. Run with
  yes, it backs the database up first, then deletes them.
- **FR-007**: Deleting an abandoned creation MUST also delete its pictures (library entries and
  files), unless another shirt or the store's placeholder uses them.
- **FR-008**: The sweep MUST also remove files in the uploads folder that are named like stored
  pictures but that no library entry refers to. Library entries no shirt uses stay, because Dan
  uploaded them.
- **FR-009**: A dial setting whose shirt was swept MUST become makeable again, as a new shirt.

**The constitution and the record**

- **FR-010**: The sweep MUST stay within constitution II's exception for abandoned creations
  (v5.0.0, batched into PR #10). This feature ratifies nothing new.
- **FR-011**: The README MUST describe the command, and that test runs keep their own pictures.

### Key Entities

- **Abandoned creation**: a shopper-made shirt meeting every condition in FR-003. Not stored as such;
  the sweep finds them.
- **Dan's mark**: the record that Dan changed a shirt in his office (FR-004).
- **Stray file**: a file in the uploads folder, named like a stored picture, that no library entry
  refers to.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a full test run, the real store's uploads folder holds exactly the files it held
  before, and the suite's folder is empty.
- **SC-002**: On a store holding every kind of shirt, the sweep deletes 100% of the abandoned
  creations and 0% of everything else.
- **SC-003**: The sweep never changes anything without yes, and never deletes without a backup made
  in the same run.
- **SC-004**: After the sweep, the catalog check reports 0 errors, and every order still opens with
  its shirts.

## Assumptions

- **"Made"** is when Make it mine created the shirt. A shirt's age is counted from then.
- **Carts include guest carts.** A shirt in any cart is someone's, for now.
- **A swept shirt's link** goes to the store's 404, like any shirt that doesn't exist.
- **The existing stray files** (about 59, from test runs before this feature) are removed by the
  first sweep run with yes.
- **Not a gimmick, no switch.** It's an owner tool, and the store's copy doesn't change.
