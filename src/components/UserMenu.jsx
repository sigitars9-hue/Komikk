// src/components/UserMenu.jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

export default function UserMenu() {
  const { user, signOutApp } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const ref = useRef(null);

  const avatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email;

  useEffect(() => {
    const onClick = (e) => { if (open && ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2">
        <img src={avatar} alt={name} className="h-8 w-8 rounded-full ring-1 ring-white/10" referrerPolicy="no-referrer"/>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-zinc-900/90 border border-white/10 p-1 backdrop-blur">
          <div className="px-3 py-2 text-xs text-zinc-300 truncate">{name}</div>
          <button onClick={() => { setOpen(false); nav('/library'); }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800">Library</button>
          <button onClick={async () => { await signOutApp(); setOpen(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800">Logout</button>
        </div>
      )}
    </div>
  );
}
