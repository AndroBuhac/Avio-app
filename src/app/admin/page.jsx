"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/app/ProtectedRoute";

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("hr-HR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatSeats = (mjesta) => {
  if (!Array.isArray(mjesta) || mjesta.length === 0) return "-";
  return mjesta.map((mjesto) => `${mjesto.red}${mjesto.kolona}`).join(", ");
};

function AdminPageContent() {
  const [data, setData] = useState({ korisnici: [], rezervacije: [] });
  const [activeTab, setActiveTab] = useState("rezervacije");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        const response = await fetch("/api/admin");
        const result = await response.json();

        if (response.status === 401 || response.status === 403) {
          router.push("/rezervacije");
          return;
        }

        if (!response.ok) {
          throw new Error(result.error || "Nije moguće učitati podatke.");
        }

        setData({
          korisnici: Array.isArray(result.korisnici) ? result.korisnici : [],
          rezervacije: Array.isArray(result.rezervacije) ? result.rezervacije : [],
        });
      } catch (requestError) {
        setError(requestError.message || "Nije moguće učitati podatke.");
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, [router]);

  return (
    <div className="min-h-screen bg-transparent px-6 py-8 md:px-10 md:py-12">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex items-start justify-between gap-4 border-b border-blue-500/20 pb-6">
          <div>
            <p className="text-lg font-bold tracking-[0.2em] text-blue-300">AVIO APP - ADMIN</p>
            <h1 className="mt-3 text-4xl font-black text-white">Administratorsko sučelje</h1>
            <p className="mt-2 text-slate-400">Pregled korisnika i svih rezervacija u sustavu.</p>
          </div>
          <Link
            href="/rezervacije"
            className="rounded-lg border border-blue-500/30 bg-blue-900/20 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:border-blue-400/50 hover:bg-blue-900/40"
          >
            Rezervacije
          </Link>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-blue-500/20 bg-blue-950/20 p-10 text-center text-slate-300">
            Učitavanje administratorskih podataka...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 font-semibold text-red-300">{error}</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("rezervacije")}
                className={`rounded-lg px-5 py-3 text-sm font-semibold transition ${
                  activeTab === "rezervacije"
                    ? "bg-blue-600 text-white"
                    : "border border-blue-500/30 bg-blue-900/20 text-blue-200 hover:bg-blue-900/40"
                }`}
              >
                Sve rezervacije ({data.rezervacije.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("korisnici")}
                className={`rounded-lg px-5 py-3 text-sm font-semibold transition ${
                  activeTab === "korisnici"
                    ? "bg-blue-600 text-white"
                    : "border border-blue-500/30 bg-blue-900/20 text-blue-200 hover:bg-blue-900/40"
                }`}
              >
                Svi korisnici ({data.korisnici.length})
              </button>
            </div>

            {activeTab === "rezervacije" ? (
              <section className="overflow-x-auto rounded-2xl border border-blue-500/30 bg-blue-950/30 backdrop-blur">
                <table className="w-full min-w-[900px] text-left text-sm text-slate-300">
                  <thead className="border-b border-blue-500/20 bg-blue-900/30 text-xs uppercase tracking-wide text-blue-200">
                    <tr>
                      <th className="px-5 py-4">ID</th>
                      <th className="px-5 py-4">Korisnik</th>
                      <th className="px-5 py-4">E-mail</th>
                      <th className="px-5 py-4">Let</th>
                      <th className="px-5 py-4">Datum leta</th>
                      <th className="px-5 py-4">Mjesta</th>
                      <th className="px-5 py-4">Cijena</th>
                      <th className="px-5 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rezervacije.map((rezervacija) => (
                      <tr key={rezervacija.rezervacija_id} className="border-b border-blue-500/10 last:border-0">
                        <td className="px-5 py-4 font-semibold text-white">#{rezervacija.rezervacija_id}</td>
                        <td className="px-5 py-4">{[rezervacija.ime, rezervacija.prezime].filter(Boolean).join(" ") || "-"}</td>
                        <td className="px-5 py-4">{rezervacija.email || "-"}</td>
                        <td className="px-5 py-4">#{rezervacija.let_id || "-"}</td>
                        <td className="px-5 py-4">{formatDate(rezervacija.datum_leta)}</td>
                        <td className="px-5 py-4">{formatSeats(rezervacija.mjesta)}</td>
                        <td className="px-5 py-4">{rezervacija.ukupna_cijena ?? "-"} EUR</td>
                        <td className="px-5 py-4">{rezervacija.status || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.rezervacije.length === 0 && <p className="p-8 text-center text-slate-400">Nema rezervacija.</p>}
              </section>
            ) : (
              <section className="overflow-x-auto rounded-2xl border border-blue-500/30 bg-blue-950/30 backdrop-blur">
                <table className="w-full min-w-[700px] text-left text-sm text-slate-300">
                  <thead className="border-b border-blue-500/20 bg-blue-900/30 text-xs uppercase tracking-wide text-blue-200">
                    <tr>
                      <th className="px-5 py-4">ID</th>
                      <th className="px-5 py-4">Ime</th>
                      <th className="px-5 py-4">E-mail</th>
                      <th className="px-5 py-4">Registriran</th>
                      <th className="px-5 py-4">Rezervacije</th>
                      <th className="px-5 py-4">Uloga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.korisnici.map((korisnik) => (
                      <tr key={korisnik.korisnik_id} className="border-b border-blue-500/10 last:border-0">
                        <td className="px-5 py-4 font-semibold text-white">#{korisnik.korisnik_id}</td>
                        <td className="px-5 py-4">{[korisnik.ime, korisnik.prezime].filter(Boolean).join(" ") || "-"}</td>
                        <td className="px-5 py-4">{korisnik.email || "-"}</td>
                        <td className="px-5 py-4">{formatDate(korisnik.created_at)}</td>
                        <td className="px-5 py-4">{korisnik.broj_rezervacija}</td>
                        <td className="px-5 py-4">{korisnik.is_admin ? "Administrator" : "Korisnik"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.korisnici.length === 0 && <p className="p-8 text-center text-slate-400">Nema korisnika.</p>}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <AdminPageContent />
    </ProtectedRoute>
  );
}
