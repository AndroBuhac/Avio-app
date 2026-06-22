"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me");

        if (!response.ok) {
          if (isMounted) {
            setCurrentUser(null);
          }
          return;
        }

        const user = await response.json();

        if (isMounted) {
          setCurrentUser(user);
        }
      } catch (error) {
        if (isMounted) {
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setCurrentUser(null);
      router.push("/login");
    }
  };

  const topDestinacije = [
    { grad: "Istanbul", kod: "IST", cijena: "od 89 EUR" },
    { grad: "Rim", kod: "FCO", cijena: "od 109 EUR" },
    { grad: "Berlin", kod: "BER", cijena: "od 139 EUR" },
  ];

  const prednosti = [
    "Brza rezervacija u 60 sekundi",
    "Sigurno placanje i instant potvrda",
    "Jasan pregled cijena bez skrivenih troskova",
  ];

  return (
    <div className="min-h-screen bg-transparent px-6 py-8 md:px-10 md:py-12">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-16">
        <header className="flex items-center justify-between border-b border-blue-500/20 pb-6">
          <p className="text-lg font-bold tracking-[0.2em] text-blue-300">AVIO APP</p>
          <div className="flex items-center gap-3">
            {!authLoading && currentUser ? (
              <>
                <span className="hidden text-sm font-medium text-slate-300 sm:inline-block">
                  {currentUser.ime || currentUser.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg border border-blue-400/50 bg-blue-950/30 px-5 py-2.5 text-sm font-semibold text-blue-200 transition hover:bg-blue-900/50 hover:border-blue-300"
                >
                  Odjava
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg border border-blue-400/50 bg-blue-950/30 px-5 py-2.5 text-sm font-semibold text-blue-200 transition hover:bg-blue-900/50 hover:border-blue-300"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg border border-blue-400/50 bg-blue-950/30 px-5 py-2.5 text-sm font-semibold text-blue-200 transition hover:bg-blue-900/50 hover:border-blue-300"
                >
                  Register
                </Link>
              </>
            )}
            <Link
              href="/rezervacije"
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/30"
            >
              Rezervacije
            </Link>
          </div>
        </header>

        <section className="grid gap-12 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Premium putovanja</p>
              <h1 className="text-5xl font-black leading-tight tracking-tight text-white md:text-6xl">
                Proputuj svijet
                <br />
                sa stilom i elegancijom.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                Iskustvo rezervacije karata kao nigdje drugdje. Svestrana pretraga, transparentne cijene i siguran sistem placanja za vašu sigurnost.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/rezervacije"
                className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-3.5 text-sm font-bold text-white transition hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5"
              >
                Zapocni putovanje
              </Link>
              <a
                href="#destinacije"
                className="rounded-lg border border-blue-400/50 bg-blue-950/40 px-8 py-3.5 text-sm font-semibold text-blue-200 transition hover:bg-blue-900/60 hover:border-blue-400"
              >
                Otkrij destinacije
              </a>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950 to-slate-900 p-8 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">Zasto Avio App</p>
            <ul className="space-y-3.5">
              {prednosti.map((stavka) => (
                <li key={stavka} className="flex items-start gap-3 text-sm text-slate-200">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                  <span>{stavka}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="destinacije" className="space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Najpopularnije rute</p>
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-4xl font-black text-white md:text-5xl">Destinacije koje morate vidjeti</h2>
              <Link
                href="/rezervacije"
                className="hidden rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 sm:inline-block"
              >
                Sve destinacije
              </Link>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {topDestinacije.map((dest) => (
              <article
                key={dest.grad}
                className="group rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-900/40 to-slate-800/40 p-6 transition hover:border-blue-400/50 hover:bg-gradient-to-br hover:from-blue-900/60 hover:to-slate-800/60 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/20 backdrop-blur-sm"
              >
                <p className="text-xs uppercase tracking-[0.15em] text-blue-300">Aerodrom {dest.kod}</p>
                <h3 className="mt-3 text-3xl font-bold text-white">{dest.grad}</h3>
                <p className="mt-6 text-sm text-slate-400">Povratna karta</p>
                <p className="mt-2 text-2xl font-black text-blue-300">{dest.cijena}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-900/60 to-blue-800/40 px-8 py-12 text-center backdrop-blur">
          <h2 className="text-4xl font-black text-white md:text-5xl">Spremni za polijetanje?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
            Rezerviraj svoju idejalnu rutu u samo nekoliko sekundi. Sigurno, brzo i transparentno.
          </p>
          <Link
            href="/rezervacije"
            className="mt-8 inline-block rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-3.5 text-sm font-bold text-white transition hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5"
          >
            Kreni sada
          </Link>
        </section>
      </main>
    </div>
  );
}
