# Panduan Lengkap: Cara Membaca Data Brosur & Merender Font Arab-Latin di Flutter

Dokumen ini adalah panduan siap pakai (copy-paste / adaptasi) untuk aplikasi **Flutter** agar dapat:
1. **Membaca data brosur** (dari Supabase / REST API atau SQLite Offline).
2. **Merender HTML brosur** secara rapi menggunakan library `flutter_widget_from_html`.
3. **Menjaga konsistensi tipografi Arab & Latin** (font ukuran proporsional, harakat tidak bertumpuk/terpotong, teks RTL rapi).

---

## 1. Dependensi Wajib (`pubspec.yaml`)

Tambahkan package berikut ke proyek Flutter Anda:

```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_widget_from_html: ^0.15.2   # Parser & renderer HTML super cepat di Flutter
  supabase_flutter: ^2.8.0            # Klien Supabase (jika langsung fetch dari Supabase)
  http: ^1.2.0                        # Alternatif jika fetch via REST API
  shared_preferences: ^2.3.0          # Menyimpan preferensi ukuran & jenis font user

flutter:
  uses-material-design: true
  assets:
    - assets/fonts/

  # Daftarkan font lokal agar tampilan tetap 100% konsisten saat OFFLINE
  fonts:
    - family: TraditionalArabic
      fonts:
        - asset: assets/fonts/TraditionalArabicRegular.ttf
    - family: QuranUstmani
      fonts:
        - asset: assets/fonts/QuranUstmani.otf
    - family: Inter
      fonts:
        - asset: assets/fonts/Inter-Regular.ttf
        - asset: assets/fonts/Inter-Bold.ttf
          weight: 700
```

---

## 2. Model Data Brosur (`brosur_model.dart`)

```dart
class BrosurModel {
  final int? id;
  final String slug;
  final String judul;
  final int tahun;
  final String konten;

  BrosurModel({
    this.id,
    required this.slug,
    required this.judul,
    required this.tahun,
    required this.konten,
  });

  factory BrosurModel.fromJson(Map<String, dynamic> json) {
    return BrosurModel(
      id: json['id'] as int?,
      slug: json['slug'] ?? '',
      judul: json['judul'] ?? '',
      tahun: json['tahun'] is int ? json['tahun'] : int.tryParse(json['tahun']?.toString() ?? '0') ?? 0,
      konten: json['konten'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'slug': slug,
    'judul': judul,
    'tahun': tahun,
    'konten': konten,
  };
}
```

---

## 3. Service Pengambilan Data (Online Supabase & Fallback Fuzzy)

Sama seperti logika di web Next.js (`ilike %searchSlug%`), kita membersihkan prefix `BAP-(Brosur-Ahad-Pagi)-` agar query database fleksibel.

```dart
import 'package:supabase_flutter/supabase_flutter.dart';
import 'brosur_model.dart';

class BrosurService {
  final SupabaseClient supabase = Supabase.instance.client;

  Future<BrosurModel?> fetchBrosurDetail(String slug) async {
    try {
      // 1. Sanitasi slug (hapus prefix jika ada)
      final searchSlug = slug.replaceAll('BAP-(Brosur-Ahad-Pagi)-', '').trim();

      // 2. Query ke tabel 'brosur' dengan fuzzy search
      final response = await supabase
          .from('brosur')
          .select('id, slug, judul, tahun, konten')
          .ilike('slug', '%$searchSlug%')
          .limit(1)
          .maybeSingle();

      if (response == null) return null;
      return BrosurModel.fromJson(response);
    } catch (e) {
      print('Error fetch brosur: $e');
      rethrow;
    }
  }
}
```

---

## 4. Preprocessing HTML & Regex Pemisah Arab-Latin

Konten HTML asli dari CHM/Word mengandung `<style>` lama dan tag campuran. Di Flutter, jalankan fungsi preprocessing ini sebelum dilempar ke widget HTML:

```dart
class BrosurHtmlHelper {
  /// Membersihkan style kotor & otomatis membungkus kalimat Arab
  static String sanitizeHtml(String rawHtml) {
    String clean = rawHtml;

    // 1. Buang tag <style>...</style> dan CSS html,body bawaan dokumen lama
    clean = clean
        .replaceAll(RegExp(r'<style[^>]*>[\s\S]*?<\/style>', caseSensitive: false), '')
        .replaceAll(RegExp(r'html,body\s*\{[\s\S]*?\}', caseSensitive: false), '');

    // 2. Buang inline font-size & font-family Microsoft Word agar tidak menimpa setting
    clean = clean.replaceAll(
      RegExp(r'(?:font-family|font-size|mso-[^:]+)\s*:[^;"]+;?', caseSensitive: false),
      '',
    );

    // 3. Sambungkan baris teks Arab yang terpotong tag <br> di tengah-tengah kalimat
    const arabicChar = r'[\u0600-\u06FF0-9\:\.\(\)\-\–]';
    clean = clean.replaceAllMapped(
      RegExp('($arabicChar)\\s*(?:<br\\s*/?>|\\r?\\n)+\\s*($arabicChar)'),
      (m) => '${m.group(1)} ${m.group(2)}',
    );

    // 4. Deteksi teks Arab murni di luar tag HTML dan bungkus dengan <span class="arabic" dir="rtl">
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
}
```

---

## 5. Widget Pembaca Brosur (`BrosurDetailScreen.dart`)

Berikut implementasi tampilan dengan `flutter_widget_from_html` yang mereplikasi aturan `.reader-content` di `globals.css`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_widget_from_html/flutter_widget_from_html.dart';
import 'brosur_model.dart';
import 'brosur_service.dart';

class BrosurDetailScreen extends StatefulWidget {
  final String slug;

  const BrosurDetailScreen({Key? key, required this.slug}) : super(key: key);

  @override
  State<BrosurDetailScreen> createState() => _BrosurDetailScreenState();
}

class _BrosurDetailScreenState extends State<BrosurDetailScreen> {
  final BrosurService _service = BrosurService();
  late Future<BrosurModel?> _brosurFuture;

  // Preferensi Font (Bisa diatur melalui popover/slider)
  double latinFontSize = 17.0;
  double arabicFontSize = 28.0;
  String arabicFontFamily = 'TraditionalArabic';
  String latinFontFamily = 'Inter';

  @override
  void initState() {
    super.initState();
    _brosurFuture = _service.fetchBrosurDetail(widget.slug);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Detail Brosur', style: TextStyle(fontSize: 16)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0.5,
        actions: [
          IconButton(
            icon: const Icon(Icons.format_size),
            onPressed: _showFontSettingsDialog,
          ),
        ],
      ),
      body: FutureBuilder<BrosurModel?>(
        future: _brosurFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(child: Text('Terjadi kesalahan: ${snapshot.error}'));
          }

          final brosur = snapshot.data;
          if (brosur == null) {
            return const Center(child: Text('Brosur tidak ditemukan.'));
          }

          // Bersihkan HTML sebelum dirender
          final cleanedHtml = BrosurHtmlHelper.sanitizeHtml(brosur.konten);

          return SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header Tahun & Judul
                Text(
                  'TAHUN ${brosur.tahun}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF059669), // Emerald
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  brosur.judul,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A), // Slate 900
                    height: 1.3,
                  ),
                ),
                const Divider(height: 36, thickness: 1),

                // Konten HTML dengan Tipografi Konsisten
                HtmlWidget(
                  cleanedHtml,
                  key: ValueKey('html_${latinFontSize}_${arabicFontSize}_$arabicFontFamily'),
                  // Style dasar untuk Teks Latin
                  textStyle: TextStyle(
                    fontFamily: latinFontFamily,
                    fontSize: latinFontSize,
                    height: 1.8, // Line height santai untuk Latin
                    color: const Color(0xFF334155), // Slate-700
                  ),
                  customStylesBuilder: (element) {
                    final text = element.text.trim();
                    final isLangAr = element.attributes['lang']?.toLowerCase().startsWith('ar') == true;
                    final isDirRtl = element.attributes['dir']?.toLowerCase() == 'rtl';
                    final isArabicClass = element.classes.contains('arabic');

                    // Deteksi dominan karakter Arab
                    final arabicCharCount = RegExp(
                      r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]',
                    ).allMatches(text).length;
                    final isDominantArabic = text.isNotEmpty && (arabicCharCount / text.length > 0.35);

                    final isArabic = isLangAr || isDirRtl || isArabicClass || isDominantArabic;

                    // 1. Styling untuk Elemen / Paragraf Arab Penuh
                    if (element.localName == 'p') {
                      if (isArabic) {
                        return {
                          'font-family': arabicFontFamily,
                          'font-size': '${arabicFontSize}px',
                          'line-height': '2.4', // Line height tinggi agar harakat tidak kepotong
                          'direction': 'rtl',
                          'text-align': 'right',
                          'margin-bottom': '16px',
                        };
                      }
                      return {
                        'margin-bottom': '14px',
                        'line-height': '1.8',
                        'text-align': 'justify',
                      };
                    }

                    // 2. Styling untuk Potongan Ayat/Hadits di Tengah Kalimat (Inline Arab)
                    if (isArabic) {
                      return {
                        'font-family': arabicFontFamily,
                        'font-size': '${arabicFontSize}px',
                        'line-height': '2.4',
                        'direction': 'rtl',
                        'text-align': 'right',
                      };
                    }

                    return null;
                  },
                ),
                const SizedBox(height: 40),
              ],
            ),
          );
        },
      ),
    );
  }

  // Dialog Pengaturan Font Realtime
  void _showFontSettingsDialog() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Ukuran Font Latin', style: TextStyle(fontWeight: FontWeight.bold)),
                  Slider(
                    value: latinFontSize,
                    min: 13,
                    max: 26,
                    divisions: 13,
                    label: '${latinFontSize.toInt()} px',
                    onChanged: (val) {
                      setModalState(() => latinFontSize = val);
                      setState(() {});
                    },
                  ),
                  const SizedBox(height: 10),
                  const Text('Ukuran Font Arab', style: TextStyle(fontWeight: FontWeight.bold)),
                  Slider(
                    value: arabicFontSize,
                    min: 20,
                    max: 42,
                    divisions: 11,
                    label: '${arabicFontSize.toInt()} px',
                    onChanged: (val) {
                      setModalState(() => arabicFontSize = val);
                      setState(() {});
                    },
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
```

---

## 6. Ringkasan Kunci Sukses Konsistensi Tipografi di Flutter

| Isu Lapangan | Solusi yang Diterapkan |
| :--- | :--- |
| **Harakat Arab Terpotong** | Gunakan `line-height: 2.4` atau `2.5` khusus untuk blok teks Arab. |
| **Ukuran Font Terkunci oleh Word** | Regex membersihkan deklarasi `font-size: ...pt` dan `font-family: ...` pada tahap sanitasi. |
| **Aksara Arab Terbalik (BiDi Bug)** | Tambahkan atribut `'direction': 'rtl'` dan `'text-align': 'right'` pada setiap tag yang terdeteksi teks Arab. |
| **Kalimat Arab Terpenggal `<br>`** | Regex otomatis menyambungkan huruf Arab antar baris dengan spasi tunggal. |
| **Reaktivitas Ukuran** | Berikan `key: ValueKey('html_${latinFontSize}_${arabicFontSize}')` pada `HtmlWidget` agar widget melakukan re-render instan saat slider digeser. |
