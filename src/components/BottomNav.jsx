import { NavLink, useNavigate } from "react-router-dom";
import { Home, Compass, Library as LibraryIcon, UserRound } from "lucide-react";
import { useAuth } from "../providers/AuthProvider";

const linkBase =
  "flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[11px] font-medium select-none";
const iconBase = "w-5 h-5";

export default function BottomNav() {
  return (
    <nav
      className="
        md:hidden fixed bottom-0 inset-x-0 z-50
        bg-black ring-1 ring-white/10 shadow-[0_-8px_24px_rgba(0,0,0,.5)]
        rounded-t-xl pb-[max(env(safe-area-inset-bottom),0px)]
      "
      aria-label="Mobile bottom navigation"
    >
      <div className="mx-auto max-w-5xl px-3">
        <div className="flex justify-between gap-1">
          <Item to="/" icon={<Home className={iconBase} />}>Home</Item>
          <Item to="/explore" icon={<Compass className={iconBase} />}>Explore</Item>
          <Item to="/library" icon={<LibraryIcon className={iconBase} />}>Library</Item>
          <ProfileItem />
        </div>
      </div>
    </nav>
  );
}

function Item({ to, icon, children }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        [
          linkBase,
          isActive ? "text-white" : "text-zinc-300 hover:text-white",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          {/* ikon polos + glow biru belakang saat aktif/hover */}
          <span className="relative grid place-items-center w-10 h-10">
            {/* glow */}
            <span
              className={[
                "pointer-events-none absolute inset-0 rounded-full",
                "bg-brand/35",            // biru brand (lihat tailwind.config)
                "blur-xl",                 // blur belakang ikon
                "transition-opacity",
                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              ].join(" ")}
            />
            {/* ring tipis biar klik area jelas */}
            <span className="grid place-items-center w-10 h-10 rounded-full ring-1 ring-white/10">
              {icon}
            </span>
          </span>
          {children}
        </>
      )}
    </NavLink>
  );
}

function ProfileItem() {
  const { user, loading, signInGoogle } = useAuth();
  const nav = useNavigate();

  const handleClick = async () => {
    if (loading) return;
    if (!user) {
      try { await signInGoogle(); } catch (e) { console.error(e); }
      return;
    }
    nav("/library");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${linkBase} text-zinc-300 hover:text-white`}
      aria-label={user ? "Profile" : "Login"}
    >
      <span className="relative grid place-items-center w-10 h-10 group">
        <span
          className="pointer-events-none absolute inset-0 rounded-full bg-brand/35 blur-xl opacity-0 group-active:opacity-100 transition-opacity"
        />
        <span className="grid place-items-center w-10 h-10 rounded-full ring-1 ring-white/10">
          <UserRound className={iconBase} />
        </span>
      </span>
      {user ? "Profile" : "Login"}
    </button>
  );
}
