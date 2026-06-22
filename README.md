# ✈️ Avio-app

Profesionalna web aplikacija za pretragu, prikaz i rezervaciju letova. Napravljena kao završni rad sa modernom tehnologijom.

## 📋 Sadržaj

- [Pregled](#pregled)
- [Features](#features)
- [Tehnologije](#tehnologije)
- [Instalacija](#instalacija)
- [Pokretanje](#pokretanje)
- [Struktura projekta](#struktura-projekta)
- [Baza podataka](#baza-podataka)
- [API](#api)
- [Korišćenje](#korišćenje)
- [Deployment](#deployment)
- [Autor](#autor)

## 📌 Pregled

**Avio-app** je moderni booking sistem za rezervaciju letova inspirisan Booking.com platformom. Aplikacija omogućava korisnicima da pretražuju dostupne letove, filtriraju po različitim kriterijumima i jednostavno rezervuju letove.

## ✨ Features

- 🔍 **Napredna pretraga letova** - Pretraga po polazištu, odredištu i datumima
- 📅 **Fleksibilan izbor datuma** - Izbor datuma odlaska i povratka
- 🛫 **Filtriranje letova** - Filter po ceni, vrsti aviona, vremenu leta
- 💺 **Prikaz sedišta** - Prikaz dostupnih sedišta sa mogućnošću izbora
- 🛒 **Sistem za rezervaciju** - Laka i brza rezervacija
- 👤 **Upravljanje profilom** - Čuvanje rezervacija i istorije
- 💳 **Sigurna obrada** - SSL/TLS zaštita
- 📱 **Responzivan dizajn** - Radi na svim uređajima
- 🎨 **Moderna UI/UX** - Intuitivan korisničkog interfejs

## 🛠️ Tehnologije

### Frontend
- **Next.js 14+** - React framework sa SSR i API rutama
- **React** - UI biblioteka
- **Tailwind CSS** - Modern CSS framework
- **JavaScript/TypeScript** - Programski jezici

### Backend
- **Next.js API Routes** - Backend API
- **Node.js** - Runtime okruženje

### Baza podataka
- **PostgreSQL** - Relaciona baza podataka za skladištenje podataka letova, rezervacija i korisnika

## 📦 Instalacija

### Preduslov
- Node.js (verzija 18+)
- npm ili yarn
- PostgreSQL (verzija 12+)

### Koraci

```bash
# Kloniruj repozitorij
git clone https://github.com/AndroBuhac/Avio-app.git

# Idi u direktorijum projekta
cd Avio-app

# Instaliraj zavisnosti
npm install
```

### Konfiguracija baze podataka

Kreiraj `.env.local` fajl u root direktorijumu sa sledećim varijablama:

```env
# PostgreSQL konekcija
DATABASE_URL=postgresql://username:password@localhost:5432/avio_app

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Dodaj druge potrebne varijable po potrebi
```

Kreiraj bazu podataka:

```bash
createdb avio_app
```

Pokreni migracije (ako su dostupne):

```bash
npm run db:migrate
```

## 🚀 Pokretanje

### Development mod
```bash
npm run dev
```

Aplikacija će biti dostupna na **[http://localhost:3000](http://localhost:3000)**

### Production build
```bash
npm run build
npm run start
```

## 📁 Struktura projekta

```
Avio-app/
├── app/                          # Next.js app direktorijum
│   ├── page.js                  # Home stranica
│   ├── layout.js                # Root layout
│   ├── flights/                 # Flights sekcija
│   ├── booking/                 # Booking sekcija
│   ├── api/                     # API rute
│   │   ├── flights/             # API za letove
│   │   ├── bookings/            # API za rezervacije
│   │   └── users/               # API za korisnike
│   └── components/              # Zajedničke komponente
├── components/                  # React komponente
│   ├── FlightSearch/           # Komponenta za pretragu
│   ├── FlightResults/          # Komponenta za prikaz rezultata
│   ├── BookingForm/            # Forma za rezervaciju
│   └── Navbar/                 # Navigacijski bar
├── public/                      # Statički fajlovi (slike, ikonе)
├── styles/                      # CSS stilovi
├── utils/                       # Pomoćne funkcije
│   ├── db.js                   # PostgreSQL konekcija
│   └── api.js                  # API pomoćne funkcije
├── .env.local                  # Varijable okruženja (ne commituj!)
├── .gitignore                  # Git ignore pravila
├── package.json                # Zavisnosti i skripte
├── next.config.js              # Next.js konfiguracija
├── tailwind.config.js          # Tailwind konfiguracija
└── README.md                   # Ovaj fajl
```

## 🗄️ Baza podataka

### PostgreSQL šema

Glavne tabele u bazi podataka:

```sql
-- Korisnici
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Letovi
CREATE TABLE flights (
  id SERIAL PRIMARY KEY,
  departure_city VARCHAR(100) NOT NULL,
  arrival_city VARCHAR(100) NOT NULL,
  departure_time TIMESTAMP NOT NULL,
  arrival_time TIMESTAMP NOT NULL,
  airline VARCHAR(100) NOT NULL,
  aircraft_type VARCHAR(50),
  available_seats INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rezervacije
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  flight_id INT NOT NULL REFERENCES flights(id),
  seat_number VARCHAR(10),
  booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'confirmed'
);
```

## 🔌 API

### Glavne API rute

```
GET    /api/flights              - Pretraga letova
GET    /api/flights/:id          - Detalji leta
POST   /api/bookings             - Kreiraj rezervaciju
GET    /api/bookings/:id         - Pregled rezervacije
GET    /api/users/:id            - Korisnički profil
POST   /api/auth/login           - Prijava
POST   /api/auth/register        - Registracija
```

## 💻 Korišćenje

### Pretraga letova
1. Na početnoj stranici unesite **polaznu lokaciju** i **odredišnu lokaciju**
2. Izaberite **datume putovanja**
3. Kliknite na **"Pretraži letove"**
4. Pregledajte sve dostupne letove sa cenama

### Rezervacija leta
1. Kliknite na željeni let iz liste
2. Pregledajte detalje leta
3. Izaberite željeno **sedište**
4. Unesite **podatke putnika**
5. Kliknite **"Potvrdite rezervaciju"**
6. Izvršite plaćanje (ako je implementirano)

### Upravljanje rezervacijama
1. Prijavite se na svoj profil
2. Pogledajte sve svoje rezervacije
3. Opciono: Otkaži ili izmeni rezervaciju

## 🌐 Deployment

### Deployment na Vercel (preporučeno za Next.js)

```bash
# Instaliraj Vercel CLI
npm install -g vercel

# Deploy
vercel
```

**Važno**: Postavite environment varijable za PostgreSQL u Vercel dashboard-u.

### Deployment na drugi hosting

Preporučeni servisi:
- **Vercel** - Optimizovano za Next.js
- **Railway** - Jednostavno za full-stack aplikacije sa bazom
- **Render** - Besplatni plan za početak
- **AWS** - Skalabilno rešenje

## 📋 Checklist za završetak

- [ ] Sve letove su dostupne u bazi podataka
- [ ] Pretraga letova radi ispravno
- [ ] Rezervacija je moguća i čuva se u bazi
- [ ] Korisnici mogu da se registruju i prijave
- [ ] UI je responzivan na svim uređajima
- [ ] Svi API endpointi rade
- [ ] Dokumentacija je ažurna

## 🐛 Troubleshooting

### Problem: "Cannot connect to database"
```bash
# Proverite da li je PostgreSQL pokrenut
psql -U postgres -d avio_app

# Proverite DATABASE_URL u .env.local
```

### Problem: Port 3000 je već u upotrebi
```bash
npm run dev -- -p 3001
```

## 📞 Podrška / Pitanja?

Ako imaš pitanja ili pronađeš bug, slobodno kreiraj **Issue** u repozitorijumu.

## 📝 Licenca

Ovaj projekt je završni rad. Sva prava zadržana © 2024.

## 👤 Autor

**AndroBuhac**
- GitHub: [@AndroBuhac](https://github.com/AndroBuhac)

---

⭐ Ako ti se sviđa projekt, ne zaboravi da daš **star**! ⭐
