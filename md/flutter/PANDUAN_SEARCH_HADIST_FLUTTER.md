# Panduan Penyelarasan Searching Flutter dengan Web (`hadist_brosur`)

Dokumen ini menjadi panduan agar fitur **Searching di aplikasi Flutter** menggunakan sumber data dan perilaku yang **100% sama dengan Web (`http://localhost:3000/`)**:
- **Hanya mencari pada data dalil `hadist_brosur`** (sama dengan `/dashboard/hadist`), **bukan** dari teks mentah tabel `brosur`.
- **Tanpa popup otomatis** brosur terkait saat hasil muncul.
- Tetap menyediakan tombol buka brosur sumber (`/bap/{tahun}/{slug}` atau layar pembaca brosur di Flutter) pada tiap kartu dalil.

---

## 1. Endpoint API yang Digunakan

Gunakan endpoint Next.js berikut (**tanpa** parameter `include_brosur=1`):

```http
GET {BASE_URL}/api/hadist/items?search={encoded_query}
```

### Parameter Opsional (Jika Ingin Tambah Filter di Flutter)
| Parameter | Contoh | Fungsi |
| :--- | :--- | :--- |
| `search` | `tsa'labah` | Kata kunci pencarian (Arab / terjemahan / rawi / sitasi) |
| `sumber_jenis` | `hadist` atau `quran` | Filter khusus Hadits atau Al-Qur'an |
| `rawi_kitab` | `Bukhari` | Filter berdasarkan kitab/imam |
| `kelompok_id` | `<uuid>` | Filter berdasarkan tema dari `/dashboard/hadist/kelompok` |
| `status_hadist` | `terverifikasi` | (Opsional) Hanya tampilkan dalil terverifikasi |

---

## 2. Struktur Respons JSON

```json
{
  "items": [
    {
      "id": "uuid-item",
      "brosur_id": "20260405_THAHARAH_(ke-1)",
      "sumber_jenis": "hadist",
      "kutipan_arab": "مَنْ صَامَ رَمَضَانَ...",
      "terjemahan": "Barangsiapa berpuasa Ramadhan...",
      "rawi_kitab": "Bukhari",
      "perawi_sumber": "HR. Bukhari juz 1, hal. 80, no. 38",
      "rawi_teratas": "Abu Hurairah RA",
      "juz": "1",
      "halaman": "80",
      "no_hadist": "38",
      "catatan": "Keutamaan puasa Ramadhan",
      "status_hadist": "terverifikasi",
      "kelompok_hadist": {
        "id": "uuid-tema",
        "nama_kelompok": "Puasa & Ramadhan",
        "warna_badge": "amber"
      },
      "brosur": {
        "id": "20260405_THAHARAH_(ke-1)",
        "judul": "KEUTAMAAN PUASA RAMADHAN",
        "tahun": 2026,
        "slug": "keutamaan-puasa-ramadhan"
      }
    }
  ],
  "search_terms_used": ["tsalabah", "tsa'labah"],
  "highlight_terms": ["tsa'labah"],
  "search_meta": {
    "original_query": "tsa'labah",
    "corrected_query": "tsa'labah",
    "has_correction": false
  }
}
```

---

## 3. Contoh Implementasi Dart / Flutter

### 3.1. Model (`lib/models/hadist_dalil_model.dart`)

```dart
class HadistDalilItem {
  final String id;
  final String? brosurId;
  final String sumberJenis; // 'quran' | 'hadist'
  final String? kutipanArab;
  final String? terjemahan;
  final String? rawiKitab;
  final String? perawiSumber;
  final String? rawiTeratas;
  final String? juz;
  final String? halaman;
  final String? noHadist;
  final String? catatan;
  final String? namaKelompok;
  final String? brosurJudul;
  final int? brosurTahun;
  final String? brosurSlug;

  HadistDalilItem({
    required this.id,
    this.brosurId,
    required this.sumberJenis,
    this.kutipanArab,
    this.terjemahan,
    this.rawiKitab,
    this.perawiSumber,
    this.rawiTeratas,
    this.juz,
    this.halaman,
    this.noHadist,
    this.catatan,
    this.namaKelompok,
    this.brosurJudul,
    this.brosurTahun,
    this.brosurSlug,
  });

  factory HadistDalilItem.fromJson(Map<String, dynamic> json) {
    final brosur = json['brosur'] as Map<String, dynamic>?;
    final kelompok = json['kelompok_hadist'] as Map<String, dynamic>?;
    return HadistDalilItem(
      id: json['id']?.toString() ?? '',
      brosurId: json['brosur_id']?.toString(),
      sumberJenis: json['sumber_jenis']?.toString() ?? 'hadist',
      kutipanArab: json['kutipan_arab']?.toString(),
      terjemahan: json['terjemahan']?.toString(),
      rawiKitab: json['rawi_kitab']?.toString(),
      perawiSumber: json['perawi_sumber']?.toString(),
      rawiTeratas: json['rawi_teratas']?.toString(),
      juz: json['juz']?.toString(),
      halaman: json['halaman']?.toString(),
      noHadist: json['no_hadist']?.toString(),
      catatan: json['catatan']?.toString(),
      namaKelompok: kelompok?['nama_kelompok']?.toString(),
      brosurJudul: brosur?['judul']?.toString(),
      brosurTahun: brosur?['tahun'] is int
          ? brosur!['tahun'] as int
          : int.tryParse(brosur?['tahun']?.toString() ?? ''),
      brosurSlug: brosur?['slug']?.toString(),
    );
  }
}
```

### 3.2. Service (`lib/services/hadist_search_service.dart`)

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/hadist_dalil_model.dart';

class HadistSearchResult {
  final List<HadistDalilItem> items;
  final List<String> highlightTerms;
  final String? correctedQuery;

  HadistSearchResult({
    required this.items,
    required this.highlightTerms,
    this.correctedQuery,
  });
}

class HadistSearchService {
  final String baseUrl; // contoh: 'https://pustaka.mta.or.id' atau 'http://10.0.2.2:3000'

  HadistSearchService({required this.baseUrl});

  /// Mencari HANYA pada data hadist_brosur (/dashboard/hadist),
  /// TANPA parameter include_brosur=1.
  Future<HadistSearchResult> searchDalil(
    String query, {
    String? sumberJenis, // 'quran' | 'hadist'
    String? rawiKitab,
    String? kelompokId,
  }) async {
    final q = query.trim();
    if (q.isEmpty) {
      return HadistSearchResult(items: [], highlightTerms: []);
    }

    final params = <String, String>{
      'search': q,
      if (sumberJenis != null && sumberJenis.isNotEmpty) 'sumber_jenis': sumberJenis,
      if (rawiKitab != null && rawiKitab.isNotEmpty) 'rawi_kitab': rawiKitab,
      if (kelompokId != null && kelompokId.isNotEmpty) 'kelompok_id': kelompokId,
    };

    final uri = Uri.parse('$baseUrl/api/hadist/items').replace(queryParameters: params);
    final res = await http.get(uri, headers: {'Cache-Control': 'no-cache'});

    if (res.statusCode != 200) {
      throw Exception('Gagal mencari dalil (HTTP ${res.statusCode})');
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final rawItems = (data['items'] as List<dynamic>? ?? []);
    final items = rawItems
        .map((e) => HadistDalilItem.fromJson(e as Map<String, dynamic>))
        .toList();

    final highlights = (data['highlight_terms'] as List<dynamic>? ?? [])
        .map((e) => e.toString())
        .toList();

    final meta = data['search_meta'] as Map<String, dynamic>?;
    return HadistSearchResult(
      items: items,
      highlightTerms: highlights,
      correctedQuery: meta?['corrected_query']?.toString(),
    );
  }
}
```

---

## 4. Checklist Perubahan di Project Flutter

1. **Ganti endpoint pencarian utama** di screen search Flutter (misal `home_search_section.dart` / `search_service.dart`) agar memanggil `GET {BASE_URL}/api/hadist/items?search={query}` (pastikan **tidak** mengirim `include_brosur=1` dan **tidak** lagi query langsung ke tabel `brosur`).
2. **Matikan / hapus dialog popup brosur otomatis** setelah `searchDalil()` selesai — langsung render daftar `ListView.builder` dari `result.items`.
3. **Pada tiap kartu hasil**, tampilkan:
   - Badge `rawi_kitab` / `perawi_sumber` + badge `namaKelompok` (jika ada).
   - `kutipanArab` (font Arab RTL `Amiri`).
   - `terjemahan` + `catatan` (jika ada).
   - Link/tombol **"Buka Brosur: {brosurJudul}"** yang menavigasi ke pembaca brosur memakai `brosurId` / `brosurSlug`.
