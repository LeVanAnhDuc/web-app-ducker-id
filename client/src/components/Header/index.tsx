// components
import Logo from "@/components/Logo";
import UserMenu from "@/components/UserMenu";

const Header = () => (
  <header className="fixed top-0 right-0 left-0 z-50 flex h-16 w-full items-center justify-between bg-transparent px-6 py-3">
    <div className="flex items-center gap-2">
      <Logo />
      <span className="text-foreground font-semibold">App Store</span>
    </div>
    <UserMenu />
  </header>
);

export default Header;
