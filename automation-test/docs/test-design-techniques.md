# Test-design techniques

How test cases are derived. Two layers, both mandatory for a feature with
user-observable behaviour:

| Layer       | Answers                                           | Tool                    |
| ----------- | ------------------------------------------------- | ----------------------- |
| **Breadth** | Which areas must a feature's cases visit?         | the 12-row rubric below |
| **Depth**   | Which concrete cases and values inside each area? | five techniques below   |

The same rules drive the `e2e-scenario-coverage` skill used during feature work;
this page is the tester's reference copy.

## 1. Coverage rubric (breadth)

Walk every row for the feature. Each row is either covered by at least one test
case or marked N/A with a one-line reason in the module's `test-cases/*.md`
header — never left silent.

| #   | Area                  | What to cover                                                        |
| --- | --------------------- | -------------------------------------------------------------------- |
| 1   | Happy path            | Primary success per role / variant                                   |
| 2   | AuthN                 | Unauthenticated → redirect to login / 401                            |
| 3   | AuthZ                 | Wrong role → 403; role-specific visibility                           |
| 4   | Validation            | Invalid or tampered input and query params; client and server errors |
| 5   | Empty / null          | Empty list, search with no match, null fields ("Never")              |
| 6   | Boundary / pagination | First page, last page, beyond-range page, min/max limit, sort toggle |
| 7   | Filter / search       | Match, no match, combined filters, params persisted in the URL       |
| 8   | Data rendering        | Human labels instead of raw enums/booleans, formatted dates          |
| 9   | i18n                  | Key states in **both** `en` and `vi`                                 |
| 10  | Error / loading       | API 5xx or network failure → error UI; loading state                 |
| 11  | Mutation safety       | Idempotency, optimistic UI, state restored afterwards                |
| 12  | Accessibility         | Role/label locators, keyboard order, focus management                |

## 2. Techniques (depth)

Tag each test case with the technique(s) that produced it (`**Technique:**`
line) and write the concrete values, not just the class.

| Technique                         | Use when…                                        | Example from this app                                                                           |
| --------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **Equivalence Partitioning (EP)** | the input splits into valid / invalid classes    | email: valid · empty · no `@` · over max length → one case per class                            |
| **Boundary Value Analysis (BVA)** | the input is ordered, numeric or length-bounded  | OTP length `5 / 6 / 7`; categories per app `0 / 1 / 5 / 6`; `page = 0 / 1 / last / last+1`      |
| **Decision Table (DT)**           | two or more conditions jointly decide the result | role × ownership; current-password-wrong **and** new-password-invalid → which error wins        |
| **State Transition (ST)**         | the feature has states or steps                  | account active → locked → unlocked; **at least one invalid transition** (reuse a consumed code) |
| **Error Guessing (EG)**           | always                                           | double submit, trailing whitespace, emoji, back button mid-flow, session expiring mid-action    |

### The one-factor-at-a-time trap

Listing every validation error separately ("missing digit", "missing upper
case", "wrong current password") never tests what happens when two fail
together. When two or more conditions decide the outcome, a Decision Table row
for the combination is required.

## 3. Completeness pass

For a new module or a large change, after drafting the cases ask an
independent reviewer (a teammate, or a subagent) to list what is missing, seeded
with: double submit · autofill · pasted whitespace or hidden unicode · emoji ·
session expiry mid-action · back/forward mid-flow · the same record edited in
two tabs. Fold real misses back in.
