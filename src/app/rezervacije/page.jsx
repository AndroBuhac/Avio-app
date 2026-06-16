"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/app/ProtectedRoute";

const DESTINACIJE = [
  { id: 1, grad: "Istanbul", kod: "IST", cijena: 89 },
  { id: 2, grad: "Rim", kod: "FCO", cijena: 109 },
  { id: 3, grad: "Berlin", kod: "BER", cijena: 139 },
];

const LETOVI = [
  { id: 1, vrijeme: "08:30", povratak: "20:45" },
  { id: 2, vrijeme: "12:00", povratak: "00:15" },
  { id: 3, vrijeme: "16:45", povratak: "04:30" },
];

const REDOVI = [1, 2, 3, 4, 5, 6];
const KOLONE = ["A", "B", "C", "D", "E", "F"];
const MJESTA = REDOVI.flatMap((red) => KOLONE.map((kolona) => ({ id: `${red}${kolona}`, red, kolona })));

const getTodayDateLocal = () => {
  const today = new Date();
  const pad = (value) => String(value).padStart(2, "0");

  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
};

function RezervacijePageContent() {
  const [rezervacije, setRezervacije] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [brisanje, setBrisanje] = useState(false);
  const [greska, setGreska] = useState("");
  const [uspjeh, setUspjeh] = useState("");
  const [selectedDestinacija, setSelectedDestinacija] = useState(null);
  const [selectedLet, setSelectedLet] = useState(null);
  const [selectedMjesta, setSelectedMjesta] = useState([]);
  const [zauzetaMjesta, setZauzetaMjesta] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const router = useRouter();

  const datumLeta = getTodayDateLocal();

  useEffect(() => {
    // Fetch current user info
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setCurrentUser(data))
      .catch(() => setCurrentUser(null));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const formatDatum = (vrijednost) => {
    if (!vrijednost) return "N/A";
    return new Date(vrijednost).toLocaleString("hr-HR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCijena = (vrijednost) => {
    if (vrijednost == null) return "N/A";
    return new Intl.NumberFormat("hr-HR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(vrijednost);
  };

  const nazivDestinacije = (rezervacija) => {
    const byId = DESTINACIJE.find((d) => Number(d.id) === Number(rezervacija.destinacija_id));
    if (byId) {
      return byId.grad;
    }

    const byExactPrice = DESTINACIJE.find((d) => Number(d.cijena) === Number(rezervacija.ukupna_cijena));
    if (byExactPrice) {
      return byExactPrice.grad;
    } 

    const mjestaCount = Array.isArray(rezervacija.mjesta) ? rezervacija.mjesta.length : 0;
    if (mjestaCount > 0) {
      const unitPrice = Number(rezervacija.ukupna_cijena) / mjestaCount;
      const byUnitPrice = DESTINACIJE.find((d) => Number(d.cijena) === Number(unitPrice));
      if (byUnitPrice) {
        return byUnitPrice.grad;
      }
    }

    return "Nepoznata";
  };

  const statusClass = (status) => {
    const value = String(status || "").toLowerCase();

    if (value.includes("otkaz")) {
      return "bg-red-100 text-red-700 ring-red-200";
    }

    if (value.includes("zavrs")) {
      return "bg-emerald-100 text-emerald-700 ring-emerald-200";
    }

    return "bg-blue-100 text-blue-700 ring-blue-200";
  };

  useEffect(() => {
    fetch("/api/rezervacija")
      .then(async (res) => ({ ok: res.ok, data: await res.json() }))
      .then((data) => {
        if (data.ok && Array.isArray(data.data)) {
          setRezervacije(data.data);
        } else {
          setRezervacije([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setRezervacije([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedDestinacija || !selectedLet) {
      setZauzetaMjesta([]);
      return;
    }

    const query = new URLSearchParams({
      mode: "occupied",
      destinacija_id: String(selectedDestinacija.id),
      let_id: String(selectedLet.id),
      datum_leta: datumLeta,
    });

    fetch(`/api/rezervacija?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setZauzetaMjesta(data.map((mjesto) => mjesto.id));
        } else {
          setZauzetaMjesta([]);
        }
      })
      .catch(() => {
        setZauzetaMjesta([]);
      });
  }, [selectedDestinacija, selectedLet, datumLeta]);

  const toggleMjesto = (mjesto) => {
    const oznaka = `${mjesto.red}${mjesto.kolona}`;

    if (zauzetaMjesta.includes(oznaka)) {
      return;
    }

    setSelectedMjesta((prev) => {
      const postoji = prev.some((item) => item.id === mjesto.id);

      if (postoji) {
        return prev.filter((item) => item.id !== mjesto.id);
      }

      return [...prev, mjesto];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGreska("");
    setUspjeh("");
    setSubmitting(true);

    if (!selectedDestinacija) {
      setGreska("Molimo odaberi destinaciju.");
      setSubmitting(false);
      return;
    }

    if (!selectedLet) {
      setGreska("Molimo odaberi let.");
      setSubmitting(false);
      return;
    }

    if (selectedMjesta.length === 0) {
      setGreska("Molimo odaberi barem jedno mjesto sjedenja.");
      setSubmitting(false);
      return;
    }

    try {
      const today = new Date();
      const datumRezervacije = new Date(today);
      const [sati, minuti] = selectedLet.vrijeme.split(":");
      datumRezervacije.setHours(parseInt(sati), parseInt(minuti), 0, 0);
      const pad = (vrijednost) => String(vrijednost).padStart(2, "0");
      const lokalniDatumRezervacije = `${datumRezervacije.getFullYear()}-${pad(
        datumRezervacije.getMonth() + 1
      )}-${pad(datumRezervacije.getDate())}T${pad(datumRezervacije.getHours())}:${pad(
        datumRezervacije.getMinutes()
      )}:${pad(datumRezervacije.getSeconds())}`;

      const payload = {
        destinacija_id: selectedDestinacija.id,
        let_id: selectedLet.id,
        datum_leta: datumLeta,
        datum_rezervacije: lokalniDatumRezervacije,
        ukupna_cijena: selectedDestinacija.cijena * selectedMjesta.length,
        status: "aktivna",
        mjesta: selectedMjesta.map((mjesto) => ({
          red: mjesto.red,
          kolona: mjesto.kolona,
        })),
      };

      const res = await fetch("/api/rezervacija", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri kreiranju rezervacije.");
      }

      setRezervacije((prev) => [...prev, data]);
      setZauzetaMjesta((prev) => {
        const next = new Set(prev);
        selectedMjesta.forEach((mjesto) => {
          next.add(`${mjesto.red}${mjesto.kolona}`);
        });
        return Array.from(next);
      });
      setSelectedDestinacija(null);
      setSelectedLet(null);
      setSelectedMjesta([]);
      setUspjeh("Rezervacija je uspješno dodana.");
    } catch (err) {
      setGreska(err.message || "Došlo je do greške.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleObrisiSve = async () => {
    setGreska("");
    setUspjeh("");
    setBrisanje(true);

    try {
      const res = await fetch("/api/rezervacija", {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri brisanju rezervacija.");
      }

      setRezervacije([]);
      setSelectedDestinacija(null);
      setSelectedLet(null);
      setSelectedMjesta([]);
      setZauzetaMjesta([]);
      setUspjeh("Sve rezervacije su obrisane.");
    } catch (err) {
      setGreska(err.message || "Došlo je do greške.");
    } finally {
      setBrisanje(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black px-6 py-12 md:px-10 md:py-12">
        <div className="mx-auto max-w-7xl animate-pulse space-y-8">
          <div className="h-10 w-48 rounded bg-slate-800" />
          <div className="h-6 w-96 rounded bg-slate-800" />
          <div className="grid gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-56 rounded-2xl bg-blue-900/20 ring-1 ring-blue-500/20" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black px-6 py-8 md:px-10 md:py-12">
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-12">
        <header className="border-b border-blue-500/20 pb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-bold tracking-[0.2em] text-blue-300">✈ AVIO APP - REZERVACIJE</p>
            <h1 className="mt-3 text-4xl font-black text-white md:text-5xl">Odaberi putovanje i finalizuj rezervaciju</h1>
            <div className="mt-4 inline-flex items-center rounded-lg bg-blue-950/40 px-4 py-2 text-sm font-semibold text-blue-200 ring-1 ring-blue-500/30">
              Ukupno rezervacija: {rezervacije.length}
              {currentUser && (
                <span className="ml-4 text-blue-300">
                  Dobrodošao, <span className="text-blue-200">{currentUser.ime}</span>!
                </span>
              )}
              {currentUser?.is_admin && (
                <span className="ml-3 inline-flex items-center rounded-md border border-amber-300/40 bg-amber-500/20 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-200">
                  Admin
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="mt-2 px-4 py-2 rounded-lg border border-red-500/30 bg-red-900/20 text-red-200 hover:bg-red-900/40 hover:border-red-400/50 transition text-sm font-semibold"
              title="Odjava"
            >
              Odjavi se
            </button>
            <Link
              href="/"
              className="mt-2 flex items-center justify-center h-10 w-10 rounded-lg border border-blue-500/30 bg-blue-900/20 transition hover:bg-blue-900/40 hover:border-blue-400/50"
              title="Nazad na početak"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </Link>
          </div>
        </header>

        <section className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Dostupne destinacije</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Izaberi čelišta po želji</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {DESTINACIJE.map((dest) => (
              <div
                key={dest.id}
                onClick={() => {
                  setSelectedDestinacija(dest);
                  setSelectedLet(null);
                  setSelectedMjesta([]);
                  setZauzetaMjesta([]);
                }}
                className={`cursor-pointer rounded-2xl border-2 p-6 transition ${
                  selectedDestinacija?.id === dest.id
                    ? "border-blue-400 bg-blue-900/40 ring-2 ring-blue-400/50"
                    : "border-blue-500/30 bg-blue-900/20 hover:border-blue-400/50 hover:bg-blue-900/30"
                } space-y-4 backdrop-blur`}
              >
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.15em] text-blue-300">Aerodrom {dest.kod}</p>
                  <h3 className="text-3xl font-bold text-white">{dest.grad}</h3>
                </div>
                <div className="space-y-1 border-t border-blue-500/20 pt-4">
                  <p className="text-sm text-slate-300">Povratna karta</p>
                  <p className="text-2xl font-black text-blue-300">{dest.cijena} EUR</p>
                </div>
                {selectedDestinacija?.id === dest.id && (
                  <div className="flex items-center gap-2 rounded-lg bg-blue-500/20 px-3 py-2 text-sm font-semibold text-blue-200">
                    ✓ Odabrano
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6 rounded-2xl border border-blue-500/30 bg-blue-950/40 p-8 backdrop-blur">
          <div>
            <h2 className="text-2xl font-bold text-white">Finalizuj rezervaciju</h2>
            <p className="mt-1 text-sm text-slate-400">
              {selectedDestinacija
                ? `Putovanje do ${selectedDestinacija.grad}a za ${selectedDestinacija.cijena} EUR`
                : "Prvo odaberi destinaciju"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Odaberi let</h3>
              <div className="grid gap-3 md:grid-cols-3">
                {LETOVI.map((flight) => (
                  <div
                    key={flight.id}
                    onClick={() => {
                      setSelectedLet(flight);
                      setSelectedMjesta([]);
                    }}
                    className={`cursor-pointer rounded-lg border-2 p-4 transition ${
                      selectedLet?.id === flight.id
                        ? "border-blue-400 bg-blue-900/40 ring-2 ring-blue-400/50"
                        : "border-blue-500/30 bg-blue-900/20 hover:border-blue-400/50 hover:bg-blue-900/30"
                    }`}
                  >
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wider text-blue-300">Polazak</p>
                      <p className="text-2xl font-bold text-white">{flight.vrijeme}</p>
                      <p className="text-xs text-slate-400">Povratak: {flight.povratak}</p>
                    </div>
                    {selectedLet?.id === flight.id && (
                      <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-500/20 px-2 py-1.5 text-xs font-semibold text-blue-200">
                        ✓ Odabrano
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {selectedLet && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Odaberi mjesto sjedenja</h3>
                <div className="rounded-2xl border border-blue-500/30 bg-slate-900/60 p-4 md:p-6">
                  <div className="mx-auto mb-2 h-2 w-full max-w-md rounded-full bg-gradient-to-r from-blue-300/20 via-blue-200 to-blue-300/20" />
                  <p className="mb-5 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-300">Prednji dio aviona</p>

                  <div className="space-y-2">
                    {REDOVI.map((red) => {
                      const lijevaStrana = MJESTA.filter(
                        (mjesto) => mjesto.red === red && ["A", "B", "C"].includes(mjesto.kolona)
                      );
                      const desnaStrana = MJESTA.filter(
                        (mjesto) => mjesto.red === red && ["D", "E", "F"].includes(mjesto.kolona)
                      );

                      return (
                        <div key={red} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 md:gap-3">
                          <div className="grid grid-cols-3 gap-2">
                            {lijevaStrana.map((mjesto) => {
                              const oznaka = `${mjesto.red}${mjesto.kolona}`;
                              const zauzeto = zauzetaMjesta.includes(oznaka);
                              const odabrano = selectedMjesta.some((item) => item.id === mjesto.id);

                              return (
                                <button
                                  key={mjesto.id}
                                  type="button"
                                  disabled={zauzeto}
                                  onClick={() => toggleMjesto(mjesto)}
                                  className={`rounded-lg border px-2 py-2 text-sm font-semibold transition ${
                                    zauzeto
                                      ? "cursor-not-allowed border-slate-700 bg-slate-800/70 text-slate-500"
                                      : odabrano
                                        ? "border-blue-300 bg-blue-500 text-white shadow-[0_0_18px_rgba(59,130,246,0.45)]"
                                        : "border-blue-500/30 bg-blue-900/20 text-slate-200 hover:-translate-y-0.5 hover:border-blue-300/70 hover:bg-blue-900/35"
                                  }`}
                                >
                                  {oznaka}
                                </button>
                              );
                            })}
                          </div>

                          <div className="px-1 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 md:px-2">
                            Prolaz
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            {desnaStrana.map((mjesto) => {
                              const oznaka = `${mjesto.red}${mjesto.kolona}`;
                              const zauzeto = zauzetaMjesta.includes(oznaka);
                              const odabrano = selectedMjesta.some((item) => item.id === mjesto.id);

                              return (
                                <button
                                  key={mjesto.id}
                                  type="button"
                                  disabled={zauzeto}
                                  onClick={() => toggleMjesto(mjesto)}
                                  className={`rounded-lg border px-2 py-2 text-sm font-semibold transition ${
                                    zauzeto
                                      ? "cursor-not-allowed border-slate-700 bg-slate-800/70 text-slate-500"
                                      : odabrano
                                        ? "border-blue-300 bg-blue-500 text-white shadow-[0_0_18px_rgba(59,130,246,0.45)]"
                                        : "border-blue-500/30 bg-blue-900/20 text-slate-200 hover:-translate-y-0.5 hover:border-blue-300/70 hover:bg-blue-900/35"
                                  }`}
                                >
                                  {oznaka}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded border border-blue-500/30 bg-blue-900/20" /> Slobodno
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded border border-blue-300 bg-blue-500" /> Odabrano
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded border border-slate-700 bg-slate-800/70" /> Zauzeto
                    </span>
                  </div>
                </div>
              </div>
            )}

            {selectedDestinacija && selectedLet && (
              <div className="rounded-lg border border-blue-500/30 bg-slate-900/50 p-4 space-y-3">
                <p className="text-xs uppercase tracking-wider text-blue-300 font-semibold">Sažetak rezervacije</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Destinacija:</span>
                    <span className="font-semibold text-white">{selectedDestinacija.grad}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Polazak:</span>
                    <span className="font-semibold text-blue-300">{selectedLet.vrijeme}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Mjesta:</span>
                    <span className="font-semibold text-blue-300">
                      {selectedMjesta.length > 0
                        ? selectedMjesta
                            .map((mjesto) => `${mjesto.red}${mjesto.kolona}`)
                            .join(", ")
                        : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-blue-500/20 pt-2">
                    <span className="text-slate-300">Ukupna cijena:</span>
                    <span className="text-lg font-bold text-blue-300">
                      {selectedDestinacija.cijena * Math.max(selectedMjesta.length, 1)} EUR
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={submitting || !selectedDestinacija || !selectedLet || selectedMjesta.length === 0}
                className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-3 text-sm font-bold text-white transition hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Spremanje..." : "Potvrdi rezervaciju"}
              </button>

              {currentUser?.is_admin && (
                <button
                  type="button"
                  onClick={handleObrisiSve}
                  disabled={brisanje || rezervacije.length === 0}
                  className="rounded-lg border border-red-400/40 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {brisanje ? "Brisanje..." : "Obriši sve rezervacije"}
                </button>
              )}

              {greska && <p className="text-sm font-semibold text-red-400">{greska}</p>}
              {uspjeh && <p className="text-sm font-semibold text-emerald-400">{uspjeh}</p>}
            </div>
          </form>
        </section>

        <section className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Vaše rezervacije</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Sva vaša putovanja</h2>
          </div>

          {rezervacije.length === 0 ? (
            <div className="rounded-2xl border border-blue-500/20 bg-blue-950/20 p-10 text-center backdrop-blur">
              <h3 className="text-lg font-semibold text-white">Nema rezervacija</h3>
              <p className="mt-1 text-sm text-slate-400">
                Kada kreirate novu rezervaciju, biće prikazana ovdje.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rezervacije.map((r) => (
                <article
                  key={r.rezervacija_id}
                  className="rounded-2xl border border-blue-500/30 bg-blue-900/20 p-5 backdrop-blur transition hover:border-blue-400/50 hover:bg-blue-900/30 hover:-translate-y-0.5"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-blue-300">Rezervacija</p>
                      <p className="text-lg font-semibold text-white">#{r.rezervacija_id}</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-medium ${statusClass(
                        r.status
                      )}`}
                    >
                      {r.status || "Aktivna"}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-sm text-slate-300">
                    <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
                      <span className="text-slate-400">Destinacija</span>
                      <span className="font-medium text-white">{nazivDestinacije(r)}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
                      <span className="text-slate-400">Datum</span>
                      <span className="font-medium text-white">{formatDatum(r.datum_rezervacije)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Cijena</span>
                      <span className="font-semibold text-blue-300">{formatCijena(r.ukupna_cijena)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default function RezervacijePage() {
  return <RezervacijePageContent />;
}