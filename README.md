# 🎯 GambleWatch
### Sistem Deteksi dan Verifikasi Situs Judi Online

GambleWatch merupakan aplikasi berbasis web yang dikembangkan untuk membantu masyarakat mengidentifikasi dan melaporkan situs yang terindikasi sebagai situs judi online. Sistem ini menggunakan beberapa metode analisis untuk mendeteksi indikasi aktivitas judi online berdasarkan URL, kemiripan visual, teks, dan hasil OCR.

Proyek ini dikembangkan sebagai bagian dari kegiatan Software Development dengan pendekatan pengembangan perangkat lunak secara bertahap.

---

## 📌 Project Overview

GambleWatch bertujuan menyediakan sistem yang membantu proses deteksi dan verifikasi situs judi online melalui pendekatan analisis otomatis dan keterlibatan pengguna.

Sistem ini menyediakan antarmuka bagi masyarakat untuk melakukan analisis situs serta menyediakan fitur bagi admin untuk mendukung proses pengelolaan dan verifikasi laporan.

## ✨ Main Features

- **User Authentication** – Registrasi dan login untuk masyarakat dan admin.
- **Website Analysis** – Melakukan analisis terhadap URL yang dilaporkan atau diperiksa.
- **URL Pattern Detection** – Mengidentifikasi pola URL yang memiliki indikasi situs judi online.
- **Visual Similarity Detection** – Menganalisis kemiripan visual menggunakan perceptual hashing (pHash).
- **OCR Detection** – Mengekstraksi teks dari gambar menggunakan Optical Character Recognition.
- **Text & Keyword Detection** – Menganalisis teks dan kata kunci yang berkaitan dengan aktivitas judi online.
- **Analysis Results** – Menampilkan hasil indikasi berdasarkan proses analisis.
- **Report Management** – Mendukung pengelolaan dan verifikasi laporan oleh admin.

## 🛠️ Technology Stack

### Frontend
- Next.js
- React.js
- TypeScript
- Tailwind CSS

### Backend & Detection Engine
- Python
- Pytest
- Tesseract OCR
- Perceptual Hashing (pHash)

### Database & Authentication
- Supabase
- PostgreSQL

### Development Tools
- Git & GitHub
- Visual Studio Code
- Docker

## 🧠 Detection Engine

GambleWatch menggunakan empat metode utama dalam proses analisis:

| Detection ID | Method | Description |
|---|---|---|
| DET-01 | URL Pattern Detection | Menganalisis pola URL yang terindikasi sebagai situs judi online. |
| DET-02 | Visual Similarity Detection | Membandingkan kemiripan visual menggunakan pHash. |
| DET-03 | OCR Detection | Mengekstraksi teks dari gambar menggunakan Tesseract OCR. |
| DET-04 | Text & Keyword Detection | Mengidentifikasi kata dan pola teks yang berkaitan dengan judi online. |

Hasil analisis digunakan untuk menentukan tingkat indikasi situs, yaitu:

- Rendah
- Sedang
- Tinggi

## 🏗️ Project Structure

```text
GambleWatch/
├── app/                 # Next.js application
├── components/          # Reusable UI components (if applicable)
├── data/                # Detection reference data
├── detection_engine/    # Python detection engine
├── docs/                # Project documentation
├── lib/                 # Supporting libraries and utilities
├── public/              # Static assets
├── scripts/             # Supporting scripts
├── tests/               # Automated tests
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Multi-container configuration (if applicable)
├── package.json         # Node.js dependencies and scripts
└── README.md
```

## ⚙️ Installation & Setup

### Prerequisites

Pastikan perangkat sudah memiliki:

- Node.js
- npm
- Python
- Git
- Docker (untuk menjalankan service berbasis container)

### 1. Clone Repository

```bash
git clone https://github.com/AgilePemdigi-2026/GambleWatch.git
```

### 2. Masuk ke Project Directory

```bash
cd GambleWatch
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Environment Configuration

Buat file `.env.local` berdasarkan konfigurasi environment project.

Contoh variabel yang dibutuhkan:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Sesuaikan nilainya dengan konfigurasi Supabase yang digunakan.

### 5. Run Development Server

```bash
npm run dev
```

Buka browser dan akses:

```text
http://localhost:3000
```

### 6. Detection Engine

Persiapkan environment Python dan install dependency berdasarkan file requirements yang tersedia pada folder detection engine.

Jalankan pengujian menggunakan:

```bash
pytest
```

## 🐳 Docker Deployment

GambleWatch menyediakan konfigurasi Docker untuk mendukung proses deployment aplikasi dalam lingkungan container.

Deployment direncanakan menggunakan Coolify dengan Docker sebagai metode pengelolaan service aplikasi.

Konfigurasi database dan service pendukung perlu disesuaikan dengan environment production.

## 🧪 Testing

Pengujian dilakukan untuk memastikan setiap komponen sistem dapat berjalan sesuai dengan kebutuhan.

Fokus pengujian meliputi:

- URL Pattern Detection
- Visual Similarity Detection
- OCR Detection
- Text & Keyword Detection
- Authentication
- Database Integration
- Application Functionality

## 👥 Development

GambleWatch dikembangkan secara kolaboratif oleh tim pengembang melalui pemb
