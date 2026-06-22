"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/app/ProtectedRoute";

const DESTINACIJE = [
  { id: 1, grad: "Istanbul", kod: "IST", cijena: 89 },
  { id: 2, grad: "Rim", kod: "FCO", cijena: 109 },
  { id: 3, grad: "Berlin", kod: "BER", cijena: 139 },
];

const RASPORED_LETOVA = {
  0: [
    { id: 201, destinacija_id: 2, vrijeme: "09:15", povratak: "18:20" },
  ],
  1: [
    { id: 101, destinacija_id: 1, vrijeme: "08:30", povratak: "20:45" },
    { id: 102, destinacija_id: 3, vrijeme: "17:10", povratak: "22:50" },
  ],
  2: [
    { id: 103, destinacija_id: 2, vrijeme: "10:40", povratak: "23:05" },
    { id: 104, destinacija_id: 1, vrijeme: "15:30", povratak: "21:10" },
  ],
  3: [
    { id: 105, destinacija_id: 3, vrijeme: "07:50", povratak: "19:40" },
    { id: 106, destinacija_id: 2, vrijeme: "13:25", povratak: "22:15" },
  ],
  4: [
    { id: 107, destinacija_id: 1, vrijeme: "09:05", povratak: "18:30" },
    { id: 108, destinacija_id: 3, vrijeme: "18:15", povratak: "23:55" },
  ],
  5: [
    { id: 109, destinacija_id: 2, vrijeme: "08:00", povratak: "17:10" },
    { id: 110, destinacija_id: 1, vrijeme: "14:45", povratak: "21:35" },
  ],
  6: [
    { id: 111, destinacija_id: 3, vrijeme: "11:20", povratak: "20:10" },
  ],
};

const REDOVI = [1, 2, 3, 4, 5, 6];
const KOLONE = ["A", "B", "C", "D", "E", "F"];
const MJESTA = REDOVI.flatMap((red) => KOLONE.map((kolona) => ({ id: `${red}${kolona}`, red, kolona })));

const getTodayDateLocal = () => {
  const today = new Date();
  const pad = (value) => String(value).padStart(2, "0");

  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
};

const getTomorrowDateLocal = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const pad = (value) => String(value).padStart(2, "0");

  return `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
};

const normalizeDateInput = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return new Date(`${trimmed}T12:00:00`);
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

const isFutureOrTodayLocal = (datum) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
    return false;
  }

  return datum >= getTomorrowDateLocal();
};

const formatDatumZaPrikaz = (datum) => {
  const parsed = normalizeDateInput(datum);

  if (!parsed) {
    return "N/A";
  }

  return parsed.toLocaleDateString("hr-HR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getFlightsForDate = (datum) => {
  const parsed = normalizeDateInput(datum);

  if (!parsed) {
    return [];
  }

  const dayIndex = parsed.getDay();
  return RASPORED_LETOVA[dayIndex] || [];
};

const getFlightDetailsForReservation = (rezervacija) => {
  if (!rezervacija) {
    return null;
  }

  const datum = normalizeDateInput(rezervacija.datum_leta || rezervacija.datum_polaska || rezervacija.datum_rezervacije);
  const flights = getFlightsForDate(datum || rezervacija.datum_leta || rezervacija.datum_polaska || rezervacija.datum_rezervacije);
  const flight = flights.find((item) => Number(item.id) === Number(rezervacija.let_id));
  const destinacija = DESTINACIJE.find((item) => Number(item.id) === Number(rezervacija.destinacija_id));

  return {
    datum,
    flight,
    destinacija,
    polazniDatumLabel: datum ? datum.toLocaleDateString("hr-HR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) : "N/A",
    polaznoVrijemeLabel: flight?.vrijeme || "N/A",
    povratakLabel: flight?.povratak || "N/A",
    letLabel: flight ? `Let ${flight.id}` : `Let #${rezervacija.let_id || "N/A"}`,
    destinacijaLabel: destinacija?.grad || "Nepoznata",
  };
};

const buildTicketQrPayload = (rezervacija, details) => {
  return JSON.stringify({
    rezervacija_id: rezervacija?.rezervacija_id ?? null,
    korisnik: rezervacija?.ime_korisnika || rezervacija?.ime || null,
    destinacija: details?.destinacijaLabel || null,
    datum_leta: rezervacija?.datum_leta || null,
    let_id: rezervacija?.let_id || null,
    mjesta: Array.isArray(rezervacija?.mjesta)
      ? rezervacija.mjesta.map((mjesto) => `${mjesto.red}${mjesto.kolona}`)
      : [],
  });
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
  const [selectedDatumLeta, setSelectedDatumLeta] = useState(getTomorrowDateLocal());
  const [selectedMjesta, setSelectedMjesta] = useState([]);
  const [zauzetaMjesta, setZauzetaMjesta] = useState([]);
  const [selectedRezervacija, setSelectedRezervacija] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const router = useRouter();

  const dostupniLetovi = getFlightsForDate(selectedDatumLeta);

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

  const formatDatumLeta = (vrijednost) => {
    const parsed = normalizeDateInput(vrijednost);

    if (!parsed) return "N/A";

    return parsed.toLocaleDateString("hr-HR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
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
      datum_leta: selectedDatumLeta,
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
  }, [selectedDestinacija, selectedLet, selectedDatumLeta]);

  useEffect(() => {
    setSelectedLet(null);
    setSelectedDestinacija(null);
    setSelectedMjesta([]);
    setZauzetaMjesta([]);
  }, [selectedDatumLeta]);

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

    if (!isFutureOrTodayLocal(selectedDatumLeta)) {
      setGreska("Molimo odaberi budući datum za rezervaciju.");
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
        datum_leta: selectedDatumLeta,
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
      setSelectedDatumLeta(getTomorrowDateLocal());
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
      setSelectedDatumLeta(getTomorrowDateLocal());
      setUspjeh("Sve rezervacije su obrisane.");
    } catch (err) {
      setGreska(err.message || "Došlo je do greške.");
    } finally {
      setBrisanje(false);
    }
  };

  const closeRezervacijaDetails = () => {
    setSelectedRezervacija(null);
  };

  const handleDownloadPdf = async (rezervacija) => {
    if (!rezervacija) {
      return;
    }

    const details = getFlightDetailsForReservation(rezervacija);

    try {
      const [{ jsPDF }, qrModule] = await Promise.all([import("jspdf"), import("qrcode")]);
      const qrDataUrl = await qrModule.toDataURL(buildTicketQrPayload(rezervacija, details), {
        errorCorrectionLevel: "M",
        margin: 1,
        scale: 5,
        width: 220,
      });

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 16;
      const cardWidth = pageWidth - margin * 2;

      doc.setFillColor(10, 18, 40);
      doc.roundedRect(margin, 18, cardWidth, 80, 5, 5, "F");

      doc.setTextColor(147, 197, 253);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("AVIO APP", margin + 8, 30);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text(`Karta za rezervaciju #${rezervacija.rezervacija_id}`, margin + 8, 40);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Putnik: ${currentUser?.ime || rezervacija.ime_korisnika || rezervacija.ime || "N/A"}`, margin + 8, 50);
      doc.text(`Destinacija: ${details?.destinacijaLabel || "Nepoznata"}`, margin + 8, 58);
      doc.text(`Polazak: ${details?.polazniDatumLabel || "N/A"} u ${details?.polaznoVrijemeLabel || "N/A"}`, margin + 8, 66);
      doc.text(`Let: ${details?.letLabel || `Let #${rezervacija.let_id || "N/A"}`}`, margin + 8, 74);
      doc.text(`Mjesta: ${Array.isArray(rezervacija.mjesta) ? rezervacija.mjesta.map((mjesto) => `${mjesto.red}${mjesto.kolona}`).join(", ") : "N/A"}`, margin + 8, 82);

      doc.addImage(qrDataUrl, "PNG", pageWidth - margin - 36, 28, 28, 28);

      doc.setTextColor(148, 163, 184);
      doc.setFontSize(9);
      doc.text(`Status: ${rezervacija.status || "aktivna"}`, margin + 8, 102);
      doc.text(`Cijena: ${formatCijena(rezervacija.ukupna_cijena)}`, margin + 8, 108);
      doc.text(`Datum rezervacije: ${formatDatum(rezervacija.datum_rezervacije)}`, margin + 8, 114);

      doc.setDrawColor(59, 130, 246);
      doc.line(margin, 124, pageWidth - margin, 124);

      doc.setTextColor(203, 213, 225);
      doc.setFontSize(9);
      doc.text("QR kod sadrži osnovne podatke za provjeru karte.", margin, 132);

      doc.save(`avio-karta-${rezervacija.rezervacija_id}.pdf`);
    } catch (error) {
      setGreska(error?.message || "Greška pri generiranju PDF karte.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent px-6 py-12 md:px-10 md:py-12">
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
      <div className="min-h-screen bg-transparent px-6 py-8 md:px-10 md:py-12">
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-12">
        <header className="border-b border-blue-500/20 pb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-bold tracking-[0.2em] text-blue-300">✈ AVIO APP - REZERVACIJE</p>
            <h1 className="mt-3 text-4xl font-black text-white md:text-5xl">Odaberi putovanje i dovršite rezervaciju</h1>
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
            <h2 className="mt-2 text-2xl font-bold text-white">Izaberite destinaciju po želji</h2>
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
            <h2 className="text-2xl font-bold text-white">Dovršite rezervaciju</h2>
            <p className="mt-1 text-sm text-slate-400">
              {selectedDestinacija
                ? `Putovanje do ${selectedDestinacija.grad}a za ${selectedDestinacija.cijena} EUR`
                : "Prvo odaberi destinaciju"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Odaberi datum leta</h3>
              <div className="grid gap-4 md:grid-cols-[320px_1fr] md:items-end">
                <label className="space-y-2">
                  <span className="block text-sm font-medium text-slate-300">Datum</span>
                  <input
                    type="date"
                    min={getTomorrowDateLocal()}
                    value={selectedDatumLeta}
                    onChange={(e) => setSelectedDatumLeta(e.target.value)}
                    className="w-full rounded-lg border border-blue-500/30 bg-slate-900/80 px-4 py-3 text-white outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-400/40"
                  />
                </label>

                <div className="rounded-lg border border-blue-500/20 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
                  <span className="font-semibold text-blue-300">Odabrani datum:</span>{" "}
                  {formatDatumZaPrikaz(selectedDatumLeta)}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-end justify-between gap-4">
                <h3 className="text-lg font-semibold text-white">Dostupni letovi za ovaj datum</h3>
                <p className="text-sm text-slate-400">
                  {dostupniLetovi.length > 0 ? `${dostupniLetovi.length} termina` : "Nema dostupnih termina"}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {dostupniLetovi.length === 0 ? (
                  <div className="rounded-lg border border-blue-500/20 bg-blue-950/20 px-4 py-6 text-sm text-slate-300 md:col-span-3">
                    Za odabrani datum trenutno nema dostupnih letova.
                  </div>
                ) : dostupniLetovi.map((flight) => {
                  const destinacija = DESTINACIJE.find((item) => Number(item.id) === Number(flight.destinacija_id));

                  return (
                  <div
                    key={flight.id}
                    onClick={() => {
                      setSelectedLet(flight);
                      setSelectedDestinacija(destinacija || null);
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
                      <p className="text-sm font-semibold text-white">{destinacija?.grad || "Nepoznata destinacija"}</p>
                      <p className="text-2xl font-bold text-white">{flight.vrijeme}</p>
                      <p className="text-xs text-slate-400">Povratak: {flight.povratak}</p>
                    </div>
                    {selectedLet?.id === flight.id && (
                      <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-500/20 px-2 py-1.5 text-xs font-semibold text-blue-200">
                        ✓ Odabrano
                      </div>
                    )}
                  </div>
                  );
                })}
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
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedRezervacija(r)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedRezervacija(r);
                    }
                  }}
                  className="cursor-pointer rounded-2xl border border-blue-500/30 bg-blue-900/20 p-5 backdrop-blur transition hover:border-blue-400/50 hover:bg-blue-900/30 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
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
                      <span className="text-slate-400">Datum polaska</span>
                      <span className="font-medium text-white">
                        {formatDatumLeta(r.datum_leta || r.datum_polaska || r.datum_rezervacije)}
                      </span>
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

        {selectedRezervacija && (() => {
          const details = getFlightDetailsForReservation(selectedRezervacija);
          const seats = Array.isArray(selectedRezervacija.mjesta)
            ? selectedRezervacija.mjesta.map((mjesto) => `${mjesto.red}${mjesto.kolona}`).join(", ")
            : "N/A";

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm" onClick={closeRezervacijaDetails}>
              <div
                className="w-full max-w-3xl overflow-hidden rounded-3xl border border-blue-500/30 bg-slate-950 shadow-2xl shadow-black/50"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4 border-b border-blue-500/20 px-6 py-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Detalji rezervacije</p>
                    <h3 className="mt-2 text-2xl font-black text-white">#{selectedRezervacija.rezervacija_id}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={closeRezervacijaDetails}
                    className="rounded-full border border-blue-400/30 bg-blue-950/50 px-3 py-2 text-sm font-semibold text-blue-200 transition hover:border-blue-300 hover:bg-blue-900/60"
                  >
                    Zatvori
                  </button>
                </div>

                <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.3fr_0.7fr]">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-blue-500/20 bg-blue-900/20 p-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <InfoRow label="Putnik" value={currentUser?.ime || selectedRezervacija.ime_korisnika || selectedRezervacija.ime || "N/A"} />
                        <InfoRow label="Status" value={selectedRezervacija.status || "aktivna"} />
                        <InfoRow label="Destinacija" value={details?.destinacijaLabel || "Nepoznata"} />
                        <InfoRow label="Let" value={details?.letLabel || `Let #${selectedRezervacija.let_id || "N/A"}`} />
                        <InfoRow label="Datum polaska" value={details?.polazniDatumLabel || "N/A"} />
                        <InfoRow label="Vrijeme polaska" value={details?.polaznoVrijemeLabel || "N/A"} />
                        <InfoRow label="Vrijeme povratka" value={details?.povratakLabel || "N/A"} />
                        <InfoRow label="Sjedišta" value={seats} />
                        <InfoRow label="Cijena" value={formatCijena(selectedRezervacija.ukupna_cijena)} />
                        <InfoRow label="Datum rezervacije" value={formatDatum(selectedRezervacija.datum_rezervacije)} />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-blue-500/20 bg-slate-900/70 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Napomena</p>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        Ova karta sadrži osnovne podatke o letu i rezervaciji. QR kod može poslužiti za bržu provjeru podataka na šalteru ili pri ukrcaju.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-blue-500/20 bg-slate-900/80 p-5 text-center">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">QR kod</p>
                      <div className="mt-4 flex justify-center">
                        <TicketQr qrPayload={buildTicketQrPayload(selectedRezervacija, details)} />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(selectedRezervacija)}
                      className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-3 text-sm font-bold text-white transition hover:shadow-lg hover:shadow-blue-500/40"
                    >
                      Preuzmi PDF kartu
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
        </main>
      </div>
    </ProtectedRoute>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-xl border border-blue-500/10 bg-slate-950/40 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function TicketQr({ qrPayload }) {
  const [qrSrc, setQrSrc] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadQr = async () => {
      try {
        const qrModule = await import("qrcode");
        const nextQr = await qrModule.toDataURL(qrPayload, {
          errorCorrectionLevel: "M",
          margin: 1,
          scale: 6,
          width: 240,
        });

        if (isMounted) {
          setQrSrc(nextQr);
        }
      } catch (error) {
        if (isMounted) {
          setQrSrc("");
        }
      }
    };

    loadQr();

    return () => {
      isMounted = false;
    };
  }, [qrPayload]);

  if (!qrSrc) {
    return <div className="flex h-48 w-48 items-center justify-center rounded-2xl border border-dashed border-blue-500/30 bg-slate-950/60 text-xs text-slate-400">QR se učitava...</div>;
  }

  return (
    <Image
      src={qrSrc}
      alt="QR kod karte"
      width={192}
      height={192}
      unoptimized
      className="h-48 w-48 rounded-2xl border border-blue-500/20 bg-white p-3"
    />
  );
}

export default function RezervacijePage() {
  return <RezervacijePageContent />;
}