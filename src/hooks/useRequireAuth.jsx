import toast from 'react-hot-toast';
import { useAuth } from '../providers/AuthProvider';

export default function useRequireAuth() {
  const { user, signInGoogle } = useAuth();

  return () => {
    if (user) return true;

    // Tampilkan toast ajakan login (bukan confirm blocking)
    toast.custom((t) => (
      <div className="rounded-xl bg-zinc-900/95 border border-white/10 p-3 shadow-lg flex items-center gap-3">
        <div className="text-sm text-zinc-200">
          Perlu login untuk melanjutkan.
        </div>
        <button
          onClick={async () => {
            toast.dismiss(t.id);
            await signInGoogle();
          }}
          className="text-xs px-3 py-1 rounded-md bg-brand text-white hover:brightness-110"
        >
          Login sekarang
        </button>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="text-xs px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
        >
          Nanti saja
        </button>
      </div>
    ), { duration: 6000 });

    return false;
  };
}
