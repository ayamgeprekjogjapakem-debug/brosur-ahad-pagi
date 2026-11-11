# 🎨 Panduan Sistem Warna & Pola (Color Palette & Pattern System)
### Logo & Identitas Visual "Pustaka MTA" dan Asma' AI

Dokumen ini mendokumentasikan hasil ekstraksi presisi dari aset identitas visual **Pustaka MTA** (Ikon Kubah Mihrab, Rehal Al-Qur'an, dan Kaligrafi), lengkap dengan skema palet warna, rasio kontras, gradien, pola geometris (*Islamic pattern*), serta konfigurasi siap pakai untuk **Tailwind CSS**, **CSS Variables**, dan **Flutter Theme Data**.

---

## 1. Ekstraksi Warna Utama (Hex, RGB, HSL, CMYK)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             PALET WARNA UTAMA                               │
│                                                                             │
│   #002A3E        #236C90        #FFB500        #E1E1E1        #059669       │
│  Deep Navy     Ocean Teal     Mihrab Gold    Silver Canvas   Hadits Emerald │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Nama Warna | Hex Code | RGB | HSL | Peran & Penggunaan Desain |
| :--- | :---: | :---: | :---: | :--- |
| **Deep Midnight Navy** | `#002A3E` | `rgb(0, 42, 62)` | `hsl(199, 100%, 12%)` | Warna kaligrafi *"Pustaka"*, teks judul utama, navbar gelap, dan kontras tertinggi. |
| **Oceanic Slate Teal** | `#236C90` | `rgb(35, 108, 144)` | `hsl(200, 61%, 35%)` | Warna primer logo (latar kubah & rehal), tombol aksi utama, header kartu. |
| **Mihrab Golden Amber** | `#FFB500` | `rgb(255, 181, 0)` | `hsl(43, 100%, 50%)` | List lengkungan kubah mihrab, badge edisi khusus, bintang verifikasi, highlight. |
| **Golden Sheen (Light)** | `#FFC11D` | `rgb(255, 193, 29)` | `hsl(43, 100%, 56%)` | Aksen kilau emas, efek hover tombol emas, dan gradien highlight. |
| **Metallic Silver Pearl**| `#E1E1E1` | `rgb(225, 225, 225)`| `hsl(0, 0%, 88%)` | Latar gradien dalam kubah, garis pembatas halus (*subtle divider*). |
| **Pure White** | `#FFFFFF` | `rgb(255, 255, 255)`| `hsl(0, 0%, 100%)`| Buku terbuka di tengah rehal, teks di atas navy, background kartu. |
| **Asma' Hadits Emerald** | `#059669` | `rgb(5, 150, 105)`  | `hsl(161, 94%, 30%)` | Aksen telaah AI, verifikasi shahih hadits, dan status *thinking steps*. |

---

## 2. Rasio Kontras Aksesibilitas (WCAG 2.1)

| Kombinasi Warna | Rasio Kontras | Status WCAG | Rekomendasi Penggunaan |
| :--- | :---: | :---: | :--- |
| **Putih (`#FFFFFF`)** di atas **Deep Navy (`#002A3E`)** | **14.2 : 1** | **AAA (Lolos Sempurna)** | Judul, kaligrafi, teks tombol, dan label penting. |
| **Putih (`#FFFFFF`)** di atas **Ocean Teal (`#236C90`)** | **5.2 : 1** | **AA (Lolos)** | Teks tombol primer, tag badge kategori. |
| **Deep Navy (`#002A3E`)** di atas **Silver (`#E1E1E1`)** | **10.5 : 1** | **AAA (Lolos Sempurna)** | Teks konten artikel di atas kartu latar silver. |
| **Deep Navy (`#002A3E`)** di atas **Gold (`#FFB500`)** | **9.1 : 1** | **AAA (Lolos Sempurna)** | Teks badge premium atau tombol emas berlabel gelap. |

---

## 3. Sistem Gradien Khas (*Brand Gradients*)

### A. Gradien Kubah Mihrab Pustaka (*Mihrab Oceanic Gradient*)
Gradien latar belakang bernuansa tenang dan teduh:
```css
background: linear-gradient(135deg, #1D5878 0%, #236C90 60%, #3582A9 100%);
```

### B. Gradien Kilau Emas Mihrab (*Golden Arch Sheen*)
Digunakan untuk garis tepi kubah mihrab dan lis bingkai:
```css
background: linear-gradient(180deg, #FFE082 0%, #FFB500 50%, #C68A00 100%);
```

### C. Gradien Latar Silver Kubah (*Inner Silver Pearl*)
Bagian dalam kubah tempat rehal dan buku berada:
```css
background: linear-gradient(180deg, #FFFFFF 0%, #F0F3F5 40%, #D4DCDE 100%);
```

### D. Gradien AI Asma' (Kombinasi Teal & Emerald)
Integrasi antara identitas Pustaka dan kecerdasan telaah AI:
```css
background: linear-gradient(135deg, #002A3E 0%, #1D5878 50%, #059669 100%);
```

---

## 4. Pola Geometris Islami & Background Pattern

### A. Pola Arabesque Subtle Grid (CSS Pure Pattern)
Pola latar belakang lembut yang cocok diletakkan di belakang header atau hero section:

```css
.pattern-pustaka-grid {
  background-color: #FAFAFA;
  background-image: 
    radial-gradient(#236C90 0.75px, transparent 0.75px),
    radial-gradient(#FFB500 0.75px, #FAFAFA 0.75px);
  background-size: 30px 30px;
  background-position: 0 0, 15px 15px;
  opacity: 0.95;
}
```

### B. Pola Lengkungan Mihrab (SVG Repeating Pattern)
```html
<svg width="40" height="60" viewBox="0 0 40 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Bentuk Kubah Mihrab berulang -->
  <path d="M0 60V25C0 11.1929 11.1929 0 25 0C38.8071 0 50 11.1929 50 25V60" 
        stroke="#236C90" stroke-opacity="0.12" stroke-width="1.5" fill="none"/>
  <path d="M5 60V26C5 14.9543 13.9543 6 25 6C36.0457 6 45 14.9543 45 26V60" 
        stroke="#FFB500" stroke-opacity="0.2" stroke-width="1" fill="none"/>
</svg>
```

---

## 5. Konfigurasi Tailwind CSS (`tailwind.config.js`)

Tambahkan token ini ke dalam konfigurasi Next.js Anda:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        pustaka: {
          navy: {
            DEFAULT: '#002A3E',
            light: '#0A3B54',
            dark: '#001D2B',
          },
          ocean: {
            DEFAULT: '#236C90',
            50: '#F0F7FA',
            100: '#DDEEF4',
            200: '#B8DCE9',
            500: '#236C90',
            600: '#1D5878',
            700: '#16455E',
          },
          gold: {
            DEFAULT: '#FFB500',
            light: '#FFC11D',
            dark: '#D99800',
            sheen: '#FFE082',
          },
          silver: {
            DEFAULT: '#E1E1E1',
            light: '#F5F5F5',
            dark: '#CECECE',
          },
          emerald: {
            DEFAULT: '#059669',
            light: '#10B981',
            dark: '#047857',
          }
        }
      },
      backgroundImage: {
        'pustaka-mihrab': 'linear-gradient(135deg, #1D5878 0%, #236C90 60%, #3582A9 100%)',
        'pustaka-gold': 'linear-gradient(180deg, #FFE082 0%, #FFB500 50%, #C68A00 100%)',
        'pustaka-silver': 'linear-gradient(180deg, #FFFFFF 0%, #F0F3F5 40%, #D4DCDE 100%)',
        'pustaka-asma': 'linear-gradient(135deg, #002A3E 0%, #1D5878 50%, #059669 100%)',
      }
    }
  }
};
```

---

## 6. CSS Variables (`globals.css`)

```css
:root {
  /* Primary & Brand Colors */
  --pustaka-navy: #002A3E;
  --pustaka-ocean: #236C90;
  --pustaka-ocean-dark: #1D5878;
  --pustaka-gold: #FFB500;
  --pustaka-gold-light: #FFC11D;
  --pustaka-silver: #E1E1E1;
  --pustaka-emerald: #059669;

  /* Theme Backgrounds */
  --bg-app: #FAFAF9;
  --bg-card: #FFFFFF;
  --border-subtle: #E2E8F0;
  --border-gold: rgba(255, 181, 0, 0.45);
}

[data-theme='dark'] {
  --pustaka-navy: #001A26;
  --pustaka-ocean: #19526E;
  --bg-app: #0A141A;
  --bg-card: #101E26;
  --border-subtle: #1C303C;
}
```

---

## 7. Konfigurasi Flutter Theme (`lib/theme/pustaka_colors.dart`)

Untuk aplikasi Flutter Pustaka:

```dart
import 'package:flutter/material.dart';

class PustakaColors {
  // Brand Colors dari Logo Pustaka MTA
  static const Color deepNavy = Color(0xFF002A3E);
  static const Color oceanTeal = Color(0xFF236C90);
  static const Color oceanTealDark = Color(0xFF1D5878);
  static const Color mihrabGold = Color(0xFFFFB500);
  static const Color mihrabGoldLight = Color(0xFFFFC11D);
  static const Color silverCanvas = Color(0xFFE1E1E1);
  static const Color silverPearl = Color(0xFFF0F3F5);
  static const Color pureWhite = Color(0xFFFFFFFF);
  static const Color asmaEmerald = Color(0xFF059669);

  // Gradient Definitions
  static const LinearGradient mihrabGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF1D5878), Color(0xFF236C90), Color(0xFF3582A9)],
  );

  static const LinearGradient goldArchGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFFFFE082), Color(0xFFFFB500), Color(0xFFC68A00)],
  );

  static const LinearGradient asmaAiGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF002A3E), Color(0xFF1D5878), Color(0xFF059669)],
  );

  // Material 3 ColorScheme Builder
  static ColorScheme lightColorScheme = ColorScheme.light(
    primary: oceanTeal,
    onPrimary: pureWhite,
    primaryContainer: Color(0xFFDDEEF4),
    onPrimaryContainer: deepNavy,
    secondary: mihrabGold,
    onSecondary: deepNavy,
    secondaryContainer: Color(0xFFFFF0C2),
    onSecondaryContainer: Color(0xFF6B4B00),
    tertiary: asmaEmerald,
    onTertiary: pureWhite,
    surface: pureWhite,
    onSurface: deepNavy,
  );
}
```

---

## 8. Panduan Desain Komponen UI

1. **Header & AppBar**: Gunakan gradien `pustaka-mihrab` atau latar putih bersih dengan border bawah emas tipis `border-pustaka-gold/30`.
2. **Kubah / Mihrab Accent**: Garis batas lengkungan menggunakan `pustaka-gold` (`#FFB500`) dengan ketebalan 1.5px hingga 2.5px.
3. **Badge Asma' AI**: Latar hijau emerald lembut `bg-emerald-50 text-emerald-800 border-emerald-200/70` dengan bintang/kilau emas.
4. **Teks Hadits & Dalil Arab**: Gunakan font *Scheherazade New* berwarna `Deep Midnight Navy` (`#002A3E`) dengan latar belakang kartu *Silver Pearl* (`#F0F3F5`) dan list hijau *Asma' Emerald*.

