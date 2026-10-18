# Panduan Implementasi: Menyamakan Tampilan Brosur di Flutter agar Identik dengan Versi Web
**Referensi Implementasi Web:** [`app/bap/[year]/[slug]`](file:///Users/rifqiwariyanto/Documents/GitHub/NEXTJS/brosur-ahad-pagi/app/bap/%5Byear%5D/%5Bslug%5D)  
**Target File Flutter:** [`lib/screens_v2/detail_brosur_screen_v2.dart`](file:///Users/rifqiwariyanto/Documents/GitHub/FLUTTER/pustaka/lib/screens_v2/detail_brosur_screen_v2.dart) (Aplikasi Pustaka MTA)

Dokumen ini berisi panduan teknis langkah-demi-langkah agar pembaca brosur pada aplikasi Flutter (baik online maupun saat data diunduh secara **offline**) memiliki tingkat kerapian, proporsi font, dan keindahan tipografi yang **100% identik** dengan versi Next.js Web ([`HighlightClient.tsx`](file:///Users/rifqiwariyanto/Documents/GitHub/NEXTJS/brosur-ahad-pagi/app/bap/%5Byear%5D/%5Bslug%5D/HighlightClient.tsx) & [`globals.css`](file:///Users/rifqiwariyanto/Documents/GitHub/NEXTJS/brosur-ahad-pagi/app/globals.css)).

---

## 1. Perbandingan Arsitektur: Web vs Flutter

| Fitur / Komponen | Versi Web Next.js (`/app/bap/[year]/[slug]`) | Versi Flutter (`detail_brosur_screen_v2.dart`) |
| :--- | :--- | :--- |
| **Renderer** | HTML DOM (`dangerouslySetInnerHTML`) | `flutter_widget_from_html` (`HtmlWidget`) |
| **Pembersihan Style** | Regex strip `<style>` dan `html,body` | Preprocessing Regex pada `cleanKonten` |
| **Deteksi Huruf Arab** | `TreeWalker` + Regex Unicode Arab | Regex Unicode Matcher + Dominant Arabic Counter |
| **Font Arab Utama** | Google Fonts `Amiri` / `Noto Naskh Arabic` | Asset Offline: `TraditionalArabicRegular.ttf`, `QuranUstmani.otf` |
| **Font Latin Utama** | Google Fonts `Inter` | Asset Offline: `Inter` / `Roboto` |
| **Line Height Arab** | `line-height: 2.5` | `line-height: 2.4` |
| **Line Height Latin** | `line-height: 1.8` | `line-height: 1.7 - 1.8` |
| **Pencegahan BiDi Bug** | `display: inline-block; direction: rtl;` | `'direction': 'rtl', 'text-align': 'right'` |

---

## 2. Tahap 1: Persiapan Font Lokal di `pubspec.yaml` (Wajib Offline)

Versi web memanfaatkan Google Fonts online. Pada Flutter yang harus berjalan secara **offline**, seluruh font harus didaftarkan di dalam berkas `pubspec.yaml`:

```yaml
flutter:
  uses-material-design: true
  assets:
    - assets/fonts/

  fonts:
    - family: TraditionalArabic
      fonts:
        - asset: assets/fonts/TraditionalArabicRegular.ttf

    - family: QuranUstmani
      fonts:
        - asset: assets/fonts/QuranUstmani.otf

    - family: QuranIndoPack
      fonts:
        - asset: assets/fonts/QuranIndoPack.ttf
```

> **Catatan Penting:** Pastikan nama `family` di `pubspec.yaml` persis sama dengan string yang disimpan di `SettingsProvider.arabicFontFamily`.

---

## 3. Tahap 2: Sanitasi Konten Sebelum Render (Preprocessing Engine)

Di Flutter, sebelum string HTML dilempar ke `HtmlWidget`, kita harus meniru apa yang dilakukan web di [`HighlightClient.tsx`](file:///Users/rifqiwariyanto/Documents/GitHub/NEXTJS/brosur-ahad-pagi/app/bap/%5Byear%5D/%5Bslug%5D/HighlightClient.tsx#L32-L57):

1. **Bersihkan inline-style dan class kotor MS Word** (`mso-bidi-font-size`, `font-size: 11pt`, dll).
2. **Normalisasi baris Arab yang terputus tanda `<br>` atau newline**.
3. **Bungkus teks Arab yang tidak bertag ke dalam `<span class="arabic" dir="rtl">`**.

Berikut fungsi pembersih standar di Flutter:

```dart
String sanitizeBrosurHtml(String rawHtml) {
  String clean = rawHtml;

  // 1. Hapus tag <style>...</style> dan deklarasi html,body bawaan CHM
  clean = clean
      .replaceAll(RegExp(r'<style[^>]*>[\s\S]*?<\/style>', caseSensitive: false), '')
      .replaceAll(RegExp(r'html,body\s*\{[\s\S]*?\}', caseSensitive: false), '');

  // 2. Hapus inline font-family & font-size bawaan Word agar tidak mengunci ukuran
  clean = clean.replaceAll(
    RegExp(r'(?:font-family|font-size|mso-[^:]+)\s*:[^;"]+;?', caseSensitive: false),
    '',
  );

  // 3. Sambungkan baris teks Arab yang terpotong <br> di tengah-tengah kalimat
  const arabicCharPattern = r'[\u0600-\u06FF0-9\:\.\(\)\-\–]';
  clean = clean.replaceAllMapped(
    RegExp('($arabicCharPattern)\\s*(?:<br\\s*/?>|\\r?\\n)+\\s*($arabicCharPattern)'),
    (m) => '${m.group(1)} ${m.group(2)}',
  );

  // 4. Deteksi dan bungkus aksara Arab murni yang berada di luar tag HTML
  // (Meniru TreeWalker di versi Next.js)
  final arabicDetectRegex = RegExp(
    r'(?![^<]*>)([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u061C]+(?:[\s\d\:\.\(\)\-\–\/\\]*[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u061C]+)*)',
    unicode: true,
  );

  clean = clean.replaceAllMapped(arabicDetectRegex, (match) {
    final text = match.group(1)!;
    return '<span class="arabic" dir="rtl">$text</span>';
  });

  return clean;
}
```

---

## 4. Tahap 3: Konfigurasi Styling `HtmlWidget` (Meniru `globals.css`)

Di web, kunci kerapian ada pada selektor `.reader-content` di [`globals.css`](file:///Users/rifqiwariyanto/Documents/GitHub/NEXTJS/brosur-ahad-pagi/app/globals.css#L25-L45). Pada Flutter, terapkan pemetaan ini di dalam `customStylesBuilder`:

```dart
HtmlWidget(
  kontenHtml,
  key: ValueKey(
    'brosur_${settings.arabicFontSize}_${settings.latinFontSize}_${settings.arabicFontFamily}',
  ),
  // Style Default untuk Seluruh Teks Latin
  textStyle: TextStyle(
    fontFamily: settings.latinFontFamily, // 'Inter' atau font sistem
    fontSize: settings.latinFontSize,     // Standar: 16.0 - 18.0
    height: 1.8,                          // Line height santai dan mudah dibaca
    color: const Color(0xFF1E293B),       // Slate-800 persis seperti web
  ),
  customStylesBuilder: (element) {
    // 1. Hiraukan tag pembungkus luar
    if (element.localName == 'html' ||
        element.localName == 'body' ||
        element.localName == 'table' ||
        element.localName == 'tbody' ||
        element.localName == 'tr') {
      return null;
    }

    // 2. Deteksi apakah elemen merupakan Teks Arab
    final text = element.text.trim();
    final isLangAr = element.attributes['lang']?.toLowerCase().startsWith('ar') == true;
    final isDirRtl = element.attributes['dir']?.toLowerCase() == 'rtl';
    final isArabicClass = element.classes.contains('arabic');

    // Hitung proporsi karakter Arab
    final arabicCharCount = RegExp(
      r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]',
    ).allMatches(text).length;
    final isDominantArabic = text.isNotEmpty && (arabicCharCount / text.length > 0.35);

    final isArabic = isLangAr || isDirRtl || isArabicClass || isDominantArabic;

    // A. Styling Paragraf (<p>)
    if (element.localName == 'p') {
      if (isArabic) {
        return {
          'font-family': settings.arabicFontFamily,
          'font-size': '${settings.arabicFontSize}px', // Standar: 28px - 32px
          'line-height': '2.4',                       // Mencegah harakat terpotong
          'direction': 'rtl',
          'text-align': 'right',
          'margin-bottom': '16px',
        };
      }
      return {
        'margin-bottom': '12px',
        'line-height': '1.8',
        'text-align': 'justify',
      };
    }

    // B. Styling Span / Kutipan Arab Dalam Baris (Inline Arab)
    if (isArabic) {
      return {
        'font-family': settings.arabicFontFamily,
        'font-size': '${settings.arabicFontSize}px',
        'line-height': '2.4',
        'direction': 'rtl',
        'text-align': 'right',
      };
    }

    return null;
  },
)
```

---

## 5. Tahap 4: Menangani Fallback Font Arab di Flutter

Di web, browser memiliki mesin *font-fallback* otomatis. Di Flutter, jika ada karakter tanda waqaf atau harakat khusus yang tidak dimiliki satu font, gunakan `fontFamilyFallback`:

```dart
TextStyle getBrosurArabicStyle({
  required String fontFamily,
  required double fontSize,
}) {
  return TextStyle(
    fontFamily: fontFamily,
    fontFamilyFallback: const [
      'TraditionalArabic',
      'QuranUstmani',
      'QuranIndoPack',
    ],
    fontSize: fontSize,
    height: 2.4,
    color: const Color(0xFF0F172A),
  );
}
```

---

## 6. Tahap 5: Auto-Scroll & Highlighting (Meniru `Mark.js`)

Di web, pencarian kata menggunakan `Mark.js` dan scroll otomatis menggunakan `scrollIntoView({ behavior: 'smooth' })`.

Di Flutter [`detail_brosur_screen_v2.dart`](file:///Users/rifqiwariyanto/Documents/GitHub/FLUTTER/pustaka/lib/screens_v2/detail_brosur_screen_v2.dart#L982-L1010):
1. Ganti kata yang dicari menjadi tag khusus: `<search-target>kata</search-target>`.
2. Intercept tag tersebut di `customWidgetBuilder`:
   ```dart
   customWidgetBuilder: (element) {
     if (element.localName == 'search-target') {
       return Builder(
         builder: (context) {
           WidgetsBinding.instance.addPostFrameCallback((_) {
             if (mounted) {
               Scrollable.ensureVisible(
                 context,
                 duration: const Duration(milliseconds: 600),
                 curve: Curves.easeInOutCubic,
                 alignment: 0.3, // Posisi sedikit di atas tengah layar
               );
             }
           });
           return Container(
             padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
             decoration: BoxDecoration(
               color: const Color(0xFFA7F3D0), // Hijau zamrud lembut seperti di web
               borderRadius: BorderRadius.circular(4),
             ),
             child: Text(
               element.text,
               style: const TextStyle(fontWeight: FontWeight.bold),
             ),
           );
         },
       );
     }
     return null;
   }
   ```

---

## 7. Checklist Hasil Akhir (Verifikasi Kerapian)

Setelah menerapkan panduan ini, buka kembali brosur seperti `/bap/2019/20191020a-2007` atau `/bap/2026/20260705-thaharah-ke12` di aplikasi Flutter:

- [x] **Ukuran Proporsional:** Teks Arab terlihat gagah (~30px) dan terjemahan Latin terbaca santai (~16-18px).
- [x] **Harakat Utuh:** Tanda dhommah, tanwin atas, dan kasrah bawah tidak terpotong garis batas baris.
- [x] **Anti-BiDi Leak:** Tanda kurung `()` pada rujukan hadits tidak terbalik posisinya.
- [x] **Offline Ready:** Tampilan tetap 100% konsisten meskipun smartphone dalam Airplane Mode.
- [x] **Ukuran Dinamis:** Slider ukuran font di sidebar Flutter mengubah teks secara reaktif tanpa merusak tata letak.
