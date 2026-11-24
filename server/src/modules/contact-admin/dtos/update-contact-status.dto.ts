// The updated contact has the same fields as a list row, so it aliases
// ContactListItemDto rather than duplicating the class (an empty subclass has
// no metadata of its own, hence no schema). Promote it to a class of its own
// here if the shape ever diverges.
export { ContactListItemDto as UpdateContactStatusDto } from "./contact-list-item.dto";
