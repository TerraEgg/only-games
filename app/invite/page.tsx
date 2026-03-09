"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Zap,
  Users,
  Gift,
  Send,
} from "lucide-react";

interface Referral {
  id: string;
  username: string;
  createdAt: string;
}

interface RedirectEntry {
  id: string;
  redirectUrl: string;
  executed: boolean;
  createdAt: string;
  target: { id: string; username: string };
}

export default function InvitePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState("");
  const [redirectCredits, setRedirectCredits] = useState(0);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [redirectsSent, setRedirectsSent] = useState<RedirectEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Redirect modal
  const [redirectTarget, setRedirectTarget] = useState<Referral | null>(null);
  const [redirectUrl, setRedirectUrl] = useState("");
  const [redirectSending, setRedirectSending] = useState(false);
  const [redirectError, setRedirectError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchData();
  }, [status]);

  async function fetchData() {
    try {
      const res = await fetch("/api/referrals");
      const data = await res.json();
      setReferralCode(data.referralCode || "");
      setRedirectCredits(data.prankCredits || 0);
      setReferrals(data.referrals || []);
      setRedirectsSent(data.pranksSent || []);
    } catch {} finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    const url = `${window.location.origin}/register?ref=${referralCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const res = await fetch("/api/referrals", { method: "POST" });
      const data = await res.json();
      if (data.referralCode) setReferralCode(data.referralCode);
    } catch {} finally {
      setRegenerating(false);
    }
  }

  function getRedirectCountForUser(userId: string) {
    return redirectsSent.filter((r) => r.target.id === userId).length;
  }

  async function handleRedirect() {
    if (!redirectTarget || !redirectUrl.trim()) return;
    setRedirectSending(true);
    setRedirectError("");
    try {
      const res = await fetch("/api/referrals/prank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: redirectTarget.id, redirectUrl: redirectUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRedirectError(data.error || "Failed to send redirect");
        return;
      }
      setRedirectTarget(null);
      setRedirectUrl("");
      fetchData();
    } catch {
      setRedirectError("Network error");
    } finally {
      setRedirectSending(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!session) return null;

  const inviteUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${referralCode}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 animate-fadeIn">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-600/20">
          <Gift className="h-5 w-5 text-accent-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Invite Friends</h1>
          <p className="text-sm text-zinc-500">
            Invite friends and earn redirect credits
          </p>
        </div>
      </div>

      {/* Invite link card */}
      <div className="mb-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-6">
        <h2 className="mb-1 text-sm font-semibold text-zinc-300">
          Your Invite Link
        </h2>
        <p className="mb-4 text-xs text-zinc-500">
          Share this link. When someone signs up with it, you earn{" "}
          <span className="font-semibold text-accent-400">3 redirect credits</span>.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 truncate rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 text-sm text-zinc-400">
            {inviteUrl}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-500"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copy
              </>
            )}
          </button>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            title="Generate new code"
            className="flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 text-zinc-400 transition hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{referrals.length}</p>
            <p className="text-xs text-zinc-500">Friends Invited</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{redirectCredits}</p>
            <p className="text-xs text-zinc-500">Redirect Credits</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
            <ExternalLink className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{redirectsSent.length}</p>
            <p className="text-xs text-zinc-500">Redirects Sent</p>
          </div>
        </div>
      </div>

      {/* Referrals list */}
      <div className="mb-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-300">
          Your Referrals
        </h2>
        {referrals.length === 0 ? (
          <p className="text-sm text-zinc-600">
            No referrals yet. Share your link to get started!
          </p>
        ) : (
          <div className="space-y-2">
            {referrals.map((r) => {
              const usedCount = getRedirectCountForUser(r.id);
              const maxedOut = usedCount >= 3;
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800/40 bg-zinc-950/40 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-sm font-bold text-zinc-400">
                      {r.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-zinc-300">
                      {r.username}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-600">
                      {usedCount}/3 used
                    </span>
                    <span className="text-xs text-zinc-600">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => {
                        setRedirectTarget(r);
                        setRedirectUrl("");
                        setRedirectError("");
                      }}
                      disabled={redirectCredits < 3 || maxedOut}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-30"
                    >
                      <Zap className="h-3 w-3" /> {maxedOut ? "Maxed" : "Redirect"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Redirect history */}
      {redirectsSent.length > 0 && (
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-sm font-semibold text-zinc-300">
            Redirect History
          </h2>
          <div className="space-y-2">
            {redirectsSent.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800/40 bg-zinc-950/40 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-sm font-bold text-zinc-400">
                    {p.target.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-zinc-300">
                      {p.target.username}
                    </span>
                    <p className="truncate text-xs text-zinc-600 max-w-[200px]">
                      → {p.redirectUrl}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    p.executed
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {p.executed ? "Executed" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Redirect modal */}
      {redirectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="mb-1 text-lg font-bold text-white">
              Redirect {redirectTarget.username}
            </h3>
            <p className="mb-4 text-sm text-zinc-500">
              Enter a URL to redirect them to. They&apos;ll be sent there
              instantly!
            </p>
            {redirectError && (
              <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                {redirectError}
              </div>
            )}
            <input
              type="url"
              value={redirectUrl}
              onChange={(e) => setRedirectUrl(e.target.value)}
              placeholder="https://example.com"
              autoFocus
              className="mb-4 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-accent-500/50"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRedirectTarget(null)}
                className="rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-400 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleRedirect}
                disabled={redirectSending || !redirectUrl.trim()}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-50"
              >
                {redirectSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Redirect
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-zinc-600">
              This costs 3 redirect credits. You have {redirectCredits} remaining.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
