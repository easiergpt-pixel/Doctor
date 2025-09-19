import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Signup() {
  const [, setLocation] = useLocation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ firstName, lastName, email, password }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Signup failed");
      setLocation("/");
    } catch (err: any) {
      setError(err?.message || "Signup failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 border rounded-lg p-6">
        <h1 className="text-xl font-semibold">Create account</h1>
        {error && <div className="text-sm text-red-500">{error}</div>}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm mb-1">First name</label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Last name</label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Creating…" : "Create account"}
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={() => setLocation("/login")}>
          Already have an account? Log in
        </Button>
      </form>
    </div>
  );
}

