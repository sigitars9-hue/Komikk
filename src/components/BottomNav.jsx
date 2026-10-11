// src/components/BottomNav.jsx
import { NavLink } from "react-router-dom";
import {
  Home,
  Compass,
  Library as LibraryIcon,
  UserRound,
} from "lucide-react";
import { useAuth } from "../providers/AuthProvider";

const linkBase =
  "flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[11px] font-medium select-none";
const iconBase = "w-5 h-5";

export default function BottomNav() {
  const { user, loading, signInGoogle } = useAuth();

  // klik profile:
  // - kalau belum login → tahan nav, jalankan signInGoogle
  // - kalau sudah login → biarkan NavLink bawa ke /profile
  const handleProfileClick = async (e) => {
    if (loading) {
      e.preventDefault();
      return;
    }
    if (!user) {
      e.preventDefault();
      try {
        await signInGoogle();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <nav
      className="
        md:hidden fixed bottom-0 inset-x-0 z-50
        bg-black/95 ring-1 ring-white/10
        shadow-[0_-8px_30px_rgba(0,0,0,.75)]
        rounded-t-xl pb-[max(env(safe-area-inset-bottom),0px)]
      "
      aria-label="Mobile bottom navigation"
    >
      <div className="mx-auto max-w-5xl px-3">
        <div className="flex justify-between gap-1">
          <NavItem to="/" label="Home" icon={<Home className={iconBase} />} />
          <NavItem
            to="/explore"
            label="Explore"
            icon={<Compass className={iconBase} />}
          />
          <NavItem
            to="/library"
            label="Library"
            icon={<LibraryIcon className={iconBase} />}
          />

          {/* Profile tab */}
          <NavItem
            to={user ? "/profile" : "#"}
            label={user ? "Profile" : "Login"}
            icon={<UserRound className={iconBase} />}
            onClick={handleProfileClick}
          />
        </div>
      </div>
    </nav>
  );
}

/**
 * Generic bottom-nav item dengan glow biru saat aktif / hover
 */
function NavItem({ to, icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      end
      onClick={onClick}
      className={({ isActive }) =>
        [
          "group", // untuk group-hover
          linkBase,
          isActive ? "text-white" : "text-zinc-300 hover:text-white",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative grid place-items-center w-10 h-10">
            {/* glow di belakang icon */}
            <span
              className={[
                "pointer-events-none absolute inset-0 rounded-full",
                "bg-brand/40 blur-xl",
                "transition-opacity duration-200",
                isActive
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-80",
              ].join(" ")}
            />
            {/* ring tipis biar area klik jelas */}
            <span className="grid place-items-center w-10 h-10 rounded-full ring-1 ring-white/10 bg-black/40">
              {icon}
            </span>
          </span>
          <span className="mt-0.5">{label}</span>
        </>
      )}
    </NavLink>
  );
}
