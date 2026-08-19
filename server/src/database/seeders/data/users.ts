// modules
import { GENDERS } from "@/modules/user/constants";
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";

export const TEST_USERS = [
  {
    authentication: {
      password: "Admin@123",
      roles: AUTHENTICATION_ROLES.ADMIN,
      verifiedEmail: true,
      isActive: true
    },
    user: {
      email: "admin@test.com",
      fullName: "Admin User",
      gender: GENDERS.MALE,
      dateOfBirth: new Date("1990-01-15")
    }
  },
  {
    authentication: {
      password: "User@123",
      roles: AUTHENTICATION_ROLES.USER,
      verifiedEmail: true,
      isActive: true
    },
    user: {
      email: "user@test.com",
      fullName: "Test User",
      gender: GENDERS.FEMALE,
      dateOfBirth: new Date("1995-06-20")
    }
  },
  {
    authentication: {
      password: "User@123",
      roles: AUTHENTICATION_ROLES.USER,
      verifiedEmail: true,
      isActive: true
    },
    user: {
      email: "user2@test.com",
      fullName: "John Doe",
      gender: GENDERS.MALE,
      dateOfBirth: new Date("1988-03-10")
    }
  },
  {
    authentication: {
      password: "Inactive@123",
      roles: AUTHENTICATION_ROLES.USER,
      verifiedEmail: true,
      isActive: false
    },
    user: {
      email: "inactive@test.com",
      fullName: "Inactive User",
      gender: GENDERS.OTHER,
      dateOfBirth: new Date("2000-12-01")
    }
  },
  {
    authentication: {
      password: "Unverified@123",
      roles: AUTHENTICATION_ROLES.USER,
      verifiedEmail: false,
      isActive: true
    },
    user: {
      email: "unverified@test.com",
      fullName: "Unverified User",
      gender: GENDERS.PREFER_NOT_TO_SAY,
      dateOfBirth: new Date("1992-08-25")
    }
  }
] as const;
