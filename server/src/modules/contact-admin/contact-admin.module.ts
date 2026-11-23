// others
import { MongoContactRepository } from "./repository/impl/mongo-contact-admin.repository";
import { ContactAdminService } from "./contact-admin.service";
import { AdminContactsController } from "./admin-contacts.controller";
import { ContactController } from "./contact.controller";
import { MyContactsController } from "./my-contacts.controller";

export const createContactAdminModule = () => {
  const service = new ContactAdminService(new MongoContactRepository());

  return {
    contactController: new ContactController(service),
    adminContactsController: new AdminContactsController(service),
    myContactsController: new MyContactsController(service)
  };
};
