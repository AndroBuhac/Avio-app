"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        // Redirecting to reservations page
        router.push("/rezervacije");
      } else {
        const data = await response.json();
        setError(data.error || "Prijava nije uspjela");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Greška pri prijavi. Molimo pokušajte ponovno.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <Link href="/" className="inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-900 mb-4">
          ← Nazad na početnu
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Prijava</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="vasaemail@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">Lozinka</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Unesite vasu lozinku"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 py-2 text-sm font-bold text-white transition hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Učitavanje..." : "Prijavi se"}
          </button>
        </form>

        <p className="text-gray-600 text-center mt-6">
          Nemaš račun?{" "}
          <Link href="/register" className="text-blue-600 hover:text-blue-800 font-semibold">
            Registruj se
          </Link>
        </p>
      </div>
    </div>
  );
}
