import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Login failed");
      setLocation("/");
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 border rounded-lg p-6">
        <h1 className="text-xl font-semibold">Log in</h1>
        {error && <div className="text-sm text-red-500">{error}</div>}
        <div>
          <label className="block text-sm mb-1">Email</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={() => setLocation("/signup")}>
          Create an account
        </Button>
      </form>
    </div>
  );
}

