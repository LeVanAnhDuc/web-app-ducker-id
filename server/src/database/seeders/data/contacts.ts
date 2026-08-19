// modules
import {
  CONTACT_PRIORITIES,
  CONTACT_STATUSES
} from "@/modules/contact-admin/constants";

export const TEST_CONTACTS = [
  {
    email: "alice.nguyen@example.com",
    subject: "Cannot login with Google OAuth",
    priority: CONTACT_PRIORITIES.HIGH,
    message:
      "Hi team, I have been trying to login to the platform using my Google account for the past two days. After granting consent the page redirects back but I get an error 'Authentication failed'. Please help.",
    status: CONTACT_STATUSES.NEW
  },
  {
    email: "bob.tran@example.com",
    subject: "Request to delete my account",
    priority: CONTACT_PRIORITIES.MEDIUM,
    message:
      "Hello, I would like to permanently delete my account along with all associated personal data per GDPR. My registered email is bob.tran@example.com. Please confirm the deletion timeline.",
    status: CONTACT_STATUSES.PROCESSING
  },
  {
    email: "charlie.le@example.com",
    subject: "App crashes on launch after latest update",
    priority: CONTACT_PRIORITIES.HIGH,
    message:
      "After installing version 2.4.1 the launcher portal crashes immediately on startup on Windows 11. Reinstalling did not help. Please investigate this regression urgently.",
    status: CONTACT_STATUSES.NEW
  },
  {
    email: "diana.pham@example.com",
    subject: "Suggestion: dark mode for dashboard",
    priority: CONTACT_PRIORITIES.LOW,
    message:
      "Just a small suggestion — it would be great to have a dark mode option for the admin dashboard. The current light theme is hard on the eyes during night shifts.",
    status: CONTACT_STATUSES.RESOLVED
  },
  {
    email: "evan.hoang@example.com",
    subject: "Billing question about pro plan",
    priority: CONTACT_PRIORITIES.MEDIUM,
    message:
      "I was charged twice for the Pro plan this month. Order IDs: ORD-1029 and ORD-1031. Could you please look into this and refund the duplicate charge?",
    status: CONTACT_STATUSES.PROCESSING
  },
  {
    email: "fiona.do@example.com",
    subject: "Two-factor authentication not working",
    priority: CONTACT_PRIORITIES.HIGH,
    message:
      "My authenticator app stopped generating valid codes for the IDMS login. I have tried syncing time on my device and re-scanning the QR code but still get 'invalid code'. Need urgent assistance.",
    status: CONTACT_STATUSES.NEW
  },
  {
    email: "george.bui@example.com",
    subject: "Documentation feedback for API",
    priority: CONTACT_PRIORITIES.LOW,
    message:
      "The pagination parameters in the public API docs are inconsistent — some endpoints use 'page/limit' and others use 'offset/count'. Suggest standardising for clarity.",
    status: CONTACT_STATUSES.RESOLVED
  },
  {
    email: "hannah.vo@example.com",
    subject: "Cannot upload profile avatar larger than 1MB",
    priority: CONTACT_PRIORITIES.MEDIUM,
    message:
      "The profile page rejects every avatar I try to upload with a 'file too large' error even though the file is around 800KB. Tested with PNG and JPG. Please look into the size validation logic.",
    status: CONTACT_STATUSES.PROCESSING
  },
  {
    email: null,
    subject: "Anonymous bug report: search returns wrong results",
    priority: CONTACT_PRIORITIES.MEDIUM,
    message:
      "Submitting this anonymously. The product search on the storefront returns items that do not match the typed keyword at all. Example: typing 'satellite' returns unrelated subscription plans.",
    status: CONTACT_STATUSES.NEW
  },
  {
    email: "ian.dang@example.com",
    subject: "Partnership inquiry for enterprise tier",
    priority: CONTACT_PRIORITIES.LOW,
    message:
      "Hello, I represent a constellation operator interested in licensing the launcher portal for our internal teams. Could you put me in touch with someone on the partnerships team?",
    status: CONTACT_STATUSES.RESOLVED
  }
] as const;

// MyContacts feature (§A4): seed user (email below) owns these sample
// contacts (matched by subject) so the "my contacts" list/detail endpoints
// and E2E have owned data across ≥2 statuses to exercise.
export const MY_CONTACTS_SEED_OWNER_EMAIL = "user@test.com";

export const MY_CONTACTS_SEED_SUBJECTS = [
  "App crashes on launch after latest update", // status: new
  "Billing question about pro plan", // status: processing
  "Suggestion: dark mode for dashboard" // status: resolved
] as const;
