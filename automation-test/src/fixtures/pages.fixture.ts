import { LoginAlternativePage } from "@/pages/auth/login-alternative.page";
import { LoginMagicLinkPage } from "@/pages/auth/login-magic-link.page";
import { LoginOtpPage } from "@/pages/auth/login-otp.page";
import { LoginPasswordPage } from "@/pages/auth/login-password.page";
import { LoginPage } from "@/pages/auth/login.page";
import { SignupInfoPage } from "@/pages/auth/signup-info.page";
import { SignupOtpPage } from "@/pages/auth/signup-otp.page";
import { VerifyMagicLinkPage } from "@/pages/auth/verify-magic-link.page";
import { AdminEntitlementsPage } from "@/pages/admin/admin-entitlements.page";
import { AdminUsersPage } from "@/pages/admin/admin-users.page";
import { AdminAppsPage } from "@/pages/admin/admin-apps.page";
import { AdminCategoriesPage } from "@/pages/admin/admin-categories.page";
import { NotificationsPage } from "@/pages/dashboard/notifications.page";
import { AppsPage } from "@/pages/dashboard/apps.page";
import { RecentlyUsedPage } from "@/pages/dashboard/recently-used.page";
import { HeaderSearch } from "@/components/header-search.component";
import { ForgotPasswordPage } from "@/pages/auth/forgot-password.page";
import { ForgotPasswordOtpPage } from "@/pages/auth/forgot-password-otp.page";
import { ForgotPasswordMagicLinkPage } from "@/pages/auth/forgot-password-magic-link.page";
import { ForgotPasswordResetPage } from "@/pages/auth/forgot-password-reset.page";
import { ProfilePasswordPage } from "@/pages/settings/profile-password.page";
import { ProfilePage } from "@/pages/settings/profile.page";
import { ForceChangePasswordPage } from "@/pages/force-password/force-change-password.page";
import { FavoritesPage } from "@/pages/dashboard/favorites.page";
import { HomePage } from "@/pages/dashboard/home.page";
import { AdminLoginHistoryPage } from "@/pages/admin/admin-login-history.page";
import { AdminLoginHistoryDetailPage } from "@/pages/admin/admin-login-history-detail.page";
import { LoginHistoryPage } from "@/pages/dashboard/login-history.page";
import { AuthorizePage } from "@/pages/oauth/authorize.page";
import { FormattedTime } from "@/components/formatted-time.component";
import { MyRequestsPage } from "@/pages/dashboard/my-requests.page";
import { MyRequestDetailPage } from "@/pages/dashboard/my-request-detail.page";
import { SupportDialog } from "@/components/support-dialog.component";
import { AdminDashboardPage } from "@/pages/admin/admin-dashboard.page";
import { AdminShell } from "@/components/admin-shell.component";
import { AdminContactPage } from "@/pages/admin/admin-contact.page";
import { AdminContactDetailPage } from "@/pages/admin/admin-contact-detail.page";
import { test as core } from "./core.fixture";

// One fixture per page object, named like the class in camelCase (LoginPage → loginPage),
// all on the test's own `page` (the declared role). A second tab or role:
// `new LoginPage(guestPage)` in the spec.
export const test = core.extend<{
  // auth
  loginPage: LoginPage;
  loginPasswordPage: LoginPasswordPage;
  loginAlternativePage: LoginAlternativePage;
  loginOtpPage: LoginOtpPage;
  loginMagicLinkPage: LoginMagicLinkPage;
  verifyMagicLinkPage: VerifyMagicLinkPage;
  signupOtpPage: SignupOtpPage;
  signupInfoPage: SignupInfoPage;
  // admin
  adminUsersPage: AdminUsersPage;
  adminEntitlementsPage: AdminEntitlementsPage;
  adminAppsPage: AdminAppsPage;
  adminCategoriesPage: AdminCategoriesPage;
  // dashboard
  notificationsPage: NotificationsPage;
  appsPage: AppsPage;
  recentlyUsedPage: RecentlyUsedPage;
  /** Header app search (component) on the test's page. */
  headerSearch: HeaderSearch;
  // password
  forgotPasswordPage: ForgotPasswordPage;
  forgotPasswordOtpPage: ForgotPasswordOtpPage;
  forgotPasswordMagicLinkPage: ForgotPasswordMagicLinkPage;
  forgotPasswordResetPage: ForgotPasswordResetPage;
  profilePasswordPage: ProfilePasswordPage;
  // profile
  profilePage: ProfilePage;
  forceChangePasswordPage: ForceChangePasswordPage;
  // favorites
  favoritesPage: FavoritesPage;
  homePage: HomePage;
  // admin login history
  adminLoginHistoryPage: AdminLoginHistoryPage;
  adminLoginHistoryDetailPage: AdminLoginHistoryDetailPage;
  // login history (own)
  loginHistoryPage: LoginHistoryPage;
  // oidc
  authorizePage: AuthorizePage;
  // settings
  /** FormatTime output (`<time datetime>`) on the test's page (component). */
  formattedTime: FormattedTime;
  // support
  myRequestsPage: MyRequestsPage;
  myRequestDetailPage: MyRequestDetailPage;
  /** The support dialog (component) on the test's page, wherever it was opened from. */
  supportDialog: SupportDialog;
  // authz
  adminDashboardPage: AdminDashboardPage;
  /** Admin console shell (Admin Mode badge, Back to User Dashboard) on the test's page (component). */
  adminShell: AdminShell;
  // admin contact
  adminContactPage: AdminContactPage;
  adminContactDetailPage: AdminContactDetailPage;
}>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  loginPasswordPage: async ({ page }, use) => use(new LoginPasswordPage(page)),
  loginAlternativePage: async ({ page }, use) =>
    use(new LoginAlternativePage(page)),
  loginOtpPage: async ({ page }, use) => use(new LoginOtpPage(page)),
  loginMagicLinkPage: async ({ page }, use) =>
    use(new LoginMagicLinkPage(page)),
  verifyMagicLinkPage: async ({ page }, use) =>
    use(new VerifyMagicLinkPage(page)),
  signupOtpPage: async ({ page }, use) => use(new SignupOtpPage(page)),
  signupInfoPage: async ({ page }, use) => use(new SignupInfoPage(page)),
  adminUsersPage: async ({ page }, use) => use(new AdminUsersPage(page)),
  adminEntitlementsPage: async ({ page }, use) =>
    use(new AdminEntitlementsPage(page)),
  adminAppsPage: async ({ page }, use) => use(new AdminAppsPage(page)),
  adminCategoriesPage: async ({ page }, use) =>
    use(new AdminCategoriesPage(page)),
  notificationsPage: async ({ page }, use) => use(new NotificationsPage(page)),
  appsPage: async ({ page }, use) => use(new AppsPage(page)),
  recentlyUsedPage: async ({ page }, use) => use(new RecentlyUsedPage(page)),
  headerSearch: async ({ page }, use) => use(new HeaderSearch(page)),
  forgotPasswordPage: async ({ page }, use) =>
    use(new ForgotPasswordPage(page)),
  forgotPasswordOtpPage: async ({ page }, use) =>
    use(new ForgotPasswordOtpPage(page)),
  forgotPasswordMagicLinkPage: async ({ page }, use) =>
    use(new ForgotPasswordMagicLinkPage(page)),
  forgotPasswordResetPage: async ({ page }, use) =>
    use(new ForgotPasswordResetPage(page)),
  profilePasswordPage: async ({ page }, use) =>
    use(new ProfilePasswordPage(page)),
  profilePage: async ({ page }, use) => use(new ProfilePage(page)),
  forceChangePasswordPage: async ({ page }, use) =>
    use(new ForceChangePasswordPage(page)),
  favoritesPage: async ({ page }, use) => use(new FavoritesPage(page)),
  homePage: async ({ page }, use) => use(new HomePage(page)),
  adminLoginHistoryPage: async ({ page }, use) =>
    use(new AdminLoginHistoryPage(page)),
  adminLoginHistoryDetailPage: async ({ page }, use) =>
    use(new AdminLoginHistoryDetailPage(page)),
  loginHistoryPage: async ({ page }, use) => use(new LoginHistoryPage(page)),
  authorizePage: async ({ page }, use) => use(new AuthorizePage(page)),
  formattedTime: async ({ page }, use) => use(new FormattedTime(page)),
  myRequestsPage: async ({ page }, use) => use(new MyRequestsPage(page)),
  myRequestDetailPage: async ({ page }, use) =>
    use(new MyRequestDetailPage(page)),
  supportDialog: async ({ page }, use) => use(new SupportDialog(page)),
  adminDashboardPage: async ({ page }, use) =>
    use(new AdminDashboardPage(page)),
  adminShell: async ({ page }, use) => use(new AdminShell(page)),
  adminContactPage: async ({ page }, use) => use(new AdminContactPage(page)),
  adminContactDetailPage: async ({ page }, use) =>
    use(new AdminContactDetailPage(page))
});
