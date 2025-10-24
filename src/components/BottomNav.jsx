// src/components/BottomNav.jsx
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  Compass,
  Library as LibraryIcon,
  UserRound,
} from "lucide-react";
import { useAuth } from "../providers/AuthProvider";

const linkBase =
  "flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[11px] font-medium transition select-none";

const iconBase = "w-5 h-5";

export default function BottomNav() {
  return (
    <nav
      className="
        md:hidden
        fixed bottom-0 inset-x-0 z-50
        bg-zinc-900/85 backdrop-blur
        ring-1 ring-white/10 shadow-[0_-8px_30px_rgba(0,0,0,.45)]
        rounded-t-2xl
        pb-[max(env(safe-area-inset-bottom),0px)]
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
          <div
            className={[
              "grid place-items-center w-10 h-10 rounded-full ring-1 ring-white/10 transition-all",
              isActive ? "bg-gradient-to-b from-violet-600/30 to-fuchsia-500/20 shadow-[0_8px_20px_rgba(139,92,246,.35)]" : "",
            ].join(" ")}
            style={{
              background: isActive
                ? undefined
                : "radial-gradient(120% 120% at 50% -20%, rgba(168,85,247,0.14), transparent 62%)",
            }}
          >
            {icon}
          </div>
          {children}
        </>
      )}
    </NavLink>
  );
}

/** Item khusus Profile/Login.
 *  - Jika belum login => panggil Google Sign-In
 *  - Jika sudah login  => arahkan ke /account (kalau belum ada, ganti ke /library saja)
 */
function ProfileItem() {
  const { user, loading, signInGoogle } = useAuth();
  const nav = useNavigate();

  const handleClick = async () => {
    if (loading) return;
    if (!user) {
      // login dulu
      try {
        await signInGoogle();
      } catch (e) {
        // bisa tampilkan toast kalau ada
        console.error(e);
      }
      return;
    }
    // sudah login → arahkan ke halaman akunmu (ubah rute jika kamu punya /account)
    nav("/library");
  };

  // pakai NavLink agar gaya aktif konsisten bila kamu nanti punya /account
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${linkBase} text-zinc-300 hover:text-white`}
      aria-label={user ? "Profile" : "Login"}
    >
      <div
        className="
          grid place-items-center w-10 h-10 rounded-full
          ring-1 ring-white/10
          bg-gradient-to-b from-violet-600/20 to-fuchsia-500/10
          hover:shadow-[0_8px_20px_rgba(139,92,246,.35)]
          transition-all
        "
      >
        <UserRound className={iconBase} />
      </div>
      {user ? "Profile" : "Login"}
    </button>
  );
}
