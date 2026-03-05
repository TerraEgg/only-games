import { ShieldOff } from "lucide-react";

export const metadata = { title: "Banned — OnlyGames" };

export default function BannedPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="max-w-md animate-fadeIn text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
          <ShieldOff className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-white">Account Banned</h1>
        <p className="mt-3 text-zinc-400">
          Your access to OnlyGames has been suspended. If you believe this is a
          mistake, please contact support.
        </p>
        <div className="mt-8 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-6 py-4 text-sm text-zinc-500">
          This decision was made by an administrator. Attempting to create a new
          account or circumvent this restriction may result in further action.
        </div>
      </div>
    </div>
  );
}
