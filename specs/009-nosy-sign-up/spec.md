# Feature Specification: Nosy Sign-Up

**Feature Branch**: `009-nosy-sign-up`

**Created**: 2026-10-16

**Status**: Draft (3 open questions)

**Input**: User description: "Nosy Sign-Up (ROADMAP 009). A comedy data-grab with its own owner on/off switch, on by default: the sign-up form demands an absurd amount of personal information on top of the real fields — Social Security Number, blood type, current medications, mother's maiden name, and more in the same spirit — every one marked "required" in the Dan Flashes voice. The fields are props (constitution, commerce constraints: "Nosy fields are props"): they MUST NEVER be submitted to the server, stored, or logged; they have no form field names and no autofill, because real people type real data into forms. Sign-up itself (display name, email, password) works exactly as before. Works from a 360px phone up, with Extreme Awesomeness on or off. Played completely straight, never explaining the joke. No money paths change."

**Builds on**:
- 001-core-storefront: the sign-up page and its real fields (what Dan should call him, email, password), the checkout gate, the store settings
- 002-brand-pages-and-shaming: the switch-per-tactic pattern
- 006-flash-mode-pipes: text backings and steady parts under Extreme Awesomeness

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The Nosy Sign-Up (Priority: P1)

He's ready to join. Name: Greg. Email, password. Then the form keeps going:
- Social Security Number. *Required.*
- Mother's maiden name. *Required.*
- Blood type. *Required.*
- Current medications. *Required.*

Dan likes to know who he's dealing with. Greg stares at the SSN box. He signs up anyway. His account is exactly what it would have been without all that: a name, an email, a password. The rest was never sent anywhere, and it's gone the moment he leaves the page.

**Why this priority**: it's the whole feature. It's the store's most invasive bit, and the constitution
already sets the one rule that matters: nosy fields are props.

**Independent Test**: with the nosy sign-up switch on, check that:
- the sign-up page asks for every nosy field, each marked required in voice
- signing up creates the same account it would with the switch off
- whatever he types into a nosy field never reaches the store: it isn't sent, stored or logged
- the browser never offers to fill those fields or remember what was typed
- with the switch off, the sign-up page is exactly as before

**Acceptance Scenarios**:

1. **Given** the nosy sign-up switch is on, **When** he opens sign-up, **Then** the real fields come
   first. Below them, before the Sign up button, come the nosy fields [how many and how laid out, per
   FR-003], each marked required in the Dan Flashes voice.
2. **Given** he fills in the real fields, **When** he presses Sign up, **Then** [with the nosy fields
   blank or filled in, per FR-008] his account is created exactly as it would be with the switch off:
   his name, his email, his password, and nothing else.
3. **Given** he typed something into every nosy field, **When** he signs up, **Then** none of it is in
   anything his browser sends to the store, and none of it appears in the store's data or its logs.
4. **Given** the nosy fields, **When** he clicks into one, **Then** his browser offers no saved values,
   and afterwards it hasn't remembered what he typed.
5. **Given** he types into the Social Security Number or mother's maiden name field, **When** it shows
   on screen, **Then** it's masked as he types, the way a password is.
6. **Given** he typed into the nosy fields, **When** he leaves the page and comes back (including with
   Back), **Then** they're empty.
7. **Given** a 360px phone, or Extreme Awesomeness on, **When** he signs up, **Then** every field is
   readable and reachable, and there's no sideways scroll.
8. **Given** the nosy sign-up switch is off, **When** he opens sign-up, **Then** there are no nosy
   fields, and the page is exactly as it was after 006.

---

### Edge Cases

- **A refused sign-up** (email taken, password too short): the real fields' errors show as before.
  Nothing from the nosy fields was sent.
- **The checkout gate** (sign-up on the way to checkout): the same nosy fields, and he still lands on
  checkout after signing up.
- **Sign-in**: unchanged. Dan already knows who you are.
- **Password managers**: they must never mistake a nosy field for the username or the password, or
  offer to save it.
- **Pasting**: pasting into a nosy field works like typing. It's still never sent.
- **Junk or real**: the store never checks what's typed. There's no format check, because a format
  check would have to read it.
- **The demo shopper** (seeded): unaffected; it never goes through sign-up.
- **Extreme Awesomeness on**: the form sits on its own backing over the pipes, and the fields stay
  readable through the strobe (006 FR-010, FR-016).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The nosy sign-up MUST be its own owner on/off setting, on by default (constitution IV).
- **FR-002**: Turning it off MUST remove every trace of it from the sign-up page, and change nothing
  else.
- **FR-003**: While it's on, the sign-up page MUST show the nosy fields after the real ones and before
  the Sign up button. Each is marked "required" in voice. [NEEDS CLARIFICATION: how much nosiness? A
  handful of fields, one long scroll of a dozen or more, or a multi-step "file" he pages through?]
- **FR-004**: Nothing typed into a nosy field MUST ever leave his browser. It's never part of what
  sign-up sends, never stored by the store, and never logged, on the server or in the browser's
  console (constitution, "Nosy fields are props").
- **FR-005**: Nosy fields MUST have no form field names and no autofill. The browser must not offer to
  fill them or remember what was typed, and password managers must not treat them as the username or
  the password.
- **FR-006**: The Social Security Number and mother's maiden name fields MUST mask what's typed, as a
  password field does, without being treated as a password.
- **FR-007**: What he typed MUST be gone when he leaves the page or signs up. It's not restored by
  Back, and not kept in any browser storage.
- **FR-008**: Signing up with valid real fields MUST create the same account as with the switch off.
  The real fields' rules (email, password length) are unchanged. [NEEDS CLARIFICATION: the nosy
  fields say "required". Do they actually stop him signing up while blank, or does Dan let him
  through?]
- **FR-009**: The store MUST never check, read or validate what's typed in a nosy field. Anything,
  including nothing, is accepted as far as the fields themselves are concerned.
- **FR-010**: [NEEDS CLARIFICATION: is the nosiness confined to the sign-up page, or does it come back
  elsewhere, such as an account-page "complete your file" nag or an identity check at checkout?]
  Sign-in is unchanged.
- **FR-011**: It MUST work from a 360px phone up with no sideways scroll, and with Extreme Awesomeness
  on or off.
- **FR-012**: All new copy MUST use the Dan Flashes voice from constitution I and never explain the
  joke. That covers the fields' labels, their "required" marks, and any hints.

### Key Entities

- **Store Settings** (from 001–006): gains one switch, the nosy sign-up.
- **Brand Copy** gains the nosy fields' labels, their "required" marks and any hints.
- **No entity for what he types.** Nosy values exist only in the fields on his screen, and only until
  he leaves the page.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Across test sign-ups with a distinctive value in every nosy field, 0 occurrences of those
  values reach anything the browser sends, the store's data, or any log.
- **SC-002**: 100% of sign-ups with valid real fields create the same account as with the switch off.
- **SC-003**: 0 autofill offers or remembered entries for any nosy field, in a browser with saved
  form data.
- **SC-004**: With the switch off, 0 nosy fields appear anywhere.
- **SC-005**: The sign-up page still meets the store's page-speed budgets: the main content shows
  within 2.5 seconds on a mid-range phone, and the layout shifts no more than 0.1.
- **SC-006**: When 5 people sign up cold, at least 4 hesitate at, or remark on, at least one nosy
  field.

## Assumptions

- **The starting fields** (copy, not data):
  - Social Security Number
  - Mother's maiden name
  - Blood type
  - Current medications
  - First pet's name
  - The street you grew up on
  - High school GPA
  - Credit score
  - Height and weight
  - Your biggest regret

  The list and its order live in the brand copy, and are easy to change.
- **They're copy, not store data.** Like every label on the site, they're edited in code, not in
  Studio. No admin screen is needed (008).
- **No format checks**, no "invalid SSN" message. Checking would mean reading it (FR-009).
- **Masking** applies to the two classic security answers (SSN, mother's maiden name). The rest show
  as typed.
- **No accessibility work beyond today's** (owner: demo site). The fields are labelled like the real
  ones.
- **Out of scope**: storing, exporting or showing nosy values anywhere, the Admin Console (008), and
  the Pattern Generator (007).
