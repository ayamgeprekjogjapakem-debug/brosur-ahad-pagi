# 📱 Panduan Lengkap Integrasi Notifikasi di Mobile Flutter (`pustaka`)

Dokumen ini berisi kode sumber lengkap (*copy-paste ready*) untuk mengintegrasikan sistem push notifikasi dari Next.js Admin ke dalam aplikasi Flutter **`pustaka`**, lengkap dengan:
1. **Model Data Notifikasi** (`lib/models/app_notification_model.dart`)
2. **Service Notifikasi FCM & Sinkronisasi** (`lib/services/notification_service.dart`)
3. **Halaman Daftar Notifikasi** (`lib/screens_v2/notification_screen_v2.dart`)
4. **Halaman Detail Notifikasi (Brosur Baru & Hadits Baru)** (`lib/screens_v2/notification_detail_screen_v2.dart`)
5. **Tombol Lonceng Notifikasi di Beranda** (`home_app_bar_actions.dart`)

---

## 📦 1. Persiapan Dependencies di `pubspec.yaml`

Buka file `pubspec.yaml` di proyek Flutter dan pastikan dependencies berikut terpasang:

```yaml
dependencies:
  firebase_core: ^3.12.1
  firebase_messaging: ^15.2.4
  flutter_local_notifications: ^18.0.1 # Untuk pop-up banner saat aplikasi sedang dibuka
```

Jalankan perintah di terminal Flutter:
```bash
flutter pub get
```

---

## 🗂️ 2. File 1: Model Notifikasi
**Lokasi Simpan:** `lib/models/app_notification_model.dart`

```dart
class AppNotificationModel {
  final String id;
  final String title;
  final String body;
  final String target;
  final String screen; // 'detail_brosur', 'detail_hadits', 'kalender', 'beranda'
  final String? slug;   // Slug brosur jika screen == 'detail_brosur'
  final String? itemId; // Nomor hadits jika screen == 'detail_hadits'
  final String? imageUrl;
  final DateTime createdAt;
  bool isRead;

  AppNotificationModel({
    required this.id,
    required this.title,
    required this.body,
    this.target = 'semua_pengguna',
    this.screen = 'beranda',
    this.slug,
    this.itemId,
    this.imageUrl,
    required this.createdAt,
    this.isRead = false,
  });

  factory AppNotificationModel.fromJson(Map<String, dynamic> json) {
    return AppNotificationModel(
      id: json['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      title: json['title']?.toString() ?? 'Pustaka Islam',
      body: json['body']?.toString() ?? '',
      target: json['target']?.toString() ?? json['target_type']?.toString() ?? 'semua_pengguna',
      screen: json['screen']?.toString() ?? 'beranda',
      slug: json['slug']?.toString(),
      itemId: json['item_id']?.toString() ?? json['itemId']?.toString(),
      imageUrl: json['image_url']?.toString() ?? json['imageUrl']?.toString(),
      createdAt: json['created_at'] != null 
          ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
      isRead: json['is_read'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'body': body,
      'target': target,
      'screen': screen,
      'slug': slug,
      'item_id': itemId,
      'image_url': imageUrl,
      'created_at': createdAt.toIso8601String(),
      'is_read': isRead,
    };
  }
}
```

---

## ⚙️ 3. File 2: Service FCM & Local Storage Notifikasi
**Lokasi Simpan:** `lib/services/notification_service.dart`

```dart
import 'dart:convert';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/app_notification_model.dart';
import '../screens_v2/notification_detail_screen_v2.dart';
import '../screens_v2/detail_brosur_screen_v2.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  // Simpan payload ke Hive secara background jika diperlukan
}

class NotificationService {
  static const String boxName = 'pustaka_notifications';
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  static Future<void> initialize(GlobalKey<NavigatorState> navigatorKey) async {
    try {
      await Firebase.initializeApp();
      await Hive.openBox(boxName);

      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      // Minta izin
      NotificationSettings settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        // Otomatis subscribe ke topik standar
        await _messaging.subscribeToTopic('semua_pengguna');
        await _messaging.subscribeToTopic('brosur_baru');
        await _messaging.subscribeToTopic('hadits_update');
        await _messaging.subscribeToTopic('kajian_info');
      }

      // 1. Pesan saat aplikasi sedang aktif (Foreground)
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        _saveNotificationFromRemote(message);
      });

      // 2. Pesan saat notifikasi diklik (App di Background)
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        _handleNotificationRoute(message.data, navigatorKey);
      });

      // 3. Pesan saat notifikasi diklik (App DITUTUP / Terminated)
      RemoteMessage? initialMessage = await _messaging.getInitialMessage();
      if (initialMessage != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _handleNotificationRoute(initialMessage.data, navigatorKey);
        });
      }
    } catch (e) {
      debugPrint("Firebase not initialized or error: $e");
    }
  }

  static void _saveNotificationFromRemote(RemoteMessage message) {
    try {
      final notif = AppNotificationModel(
        id: message.messageId ?? DateTime.now().millisecondsSinceEpoch.toString(),
        title: message.notification?.title ?? message.data['title'] ?? 'Pustaka',
        body: message.notification?.body ?? message.data['body'] ?? '',
        screen: message.data['screen'] ?? 'beranda',
        slug: message.data['slug'],
        itemId: message.data['itemId'],
        imageUrl: message.data['imageUrl'] ?? message.notification?.android?.imageUrl,
        createdAt: DateTime.now(),
        isRead: false,
      );
      saveNotificationLocally(notif);
    } catch (_) {}
  }

  static void _handleNotificationRoute(Map<String, dynamic> data, GlobalKey<NavigatorState> navigatorKey) {
    final screen = data['screen'];
    final slug = data['slug'];

    if (screen == 'detail_brosur' && slug != null && slug.toString().isNotEmpty) {
      navigatorKey.currentState?.push(
        MaterialPageRoute(builder: (_) => DetailBrosurScreenV2(slug: slug.toString())),
      );
    } else {
      // Buka halaman detail notifikasi
      final notif = AppNotificationModel(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        title: data['title'] ?? 'Notifikasi Pustaka',
        body: data['body'] ?? '',
        screen: screen ?? 'beranda',
        slug: slug,
        itemId: data['itemId'],
        imageUrl: data['imageUrl'],
        createdAt: DateTime.now(),
      );
      navigatorKey.currentState?.push(
        MaterialPageRoute(builder: (_) => NotificationDetailScreenV2(notification: notif)),
      );
    }
  }

  // ===== Local Storage Methods =====
  static Box get _box => Hive.box(boxName);

  static Future<void> saveNotificationLocally(AppNotificationModel notif) async {
    final box = Hive.isBoxOpen(boxName) ? Hive.box(boxName) : await Hive.openBox(boxName);
    await box.put(notif.id, jsonEncode(notif.toJson()));
  }

  static Future<List<AppNotificationModel>> getNotifications() async {
    try {
      final box = Hive.isBoxOpen(boxName) ? Hive.box(boxName) : await Hive.openBox(boxName);
      List<AppNotificationModel> list = [];

      for (var key in box.keys) {
        final raw = box.get(key);
        if (raw != null) {
          list.add(AppNotificationModel.fromJson(jsonDecode(raw.toString())));
        }
      }

      // Urutkan dari yang paling baru
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return list;
    } catch (e) {
      return [];
    }
  }

  static Future<int> getUnreadCount() async {
    final list = await getNotifications();
    return list.where((n) => !n.isRead).length;
  }

  static Future<void> markAsRead(String id) async {
    final box = Hive.isBoxOpen(boxName) ? Hive.box(boxName) : await Hive.openBox(boxName);
    final raw = box.get(id);
    if (raw != null) {
      final notif = AppNotificationModel.fromJson(jsonDecode(raw.toString()));
      notif.isRead = true;
      await box.put(id, jsonEncode(notif.toJson()));
    }
  }

  static Future<void> markAllAsRead() async {
    final box = Hive.isBoxOpen(boxName) ? Hive.box(boxName) : await Hive.openBox(boxName);
    for (var key in box.keys) {
      final raw = box.get(key);
      if (raw != null) {
        final notif = AppNotificationModel.fromJson(jsonDecode(raw.toString()));
        notif.isRead = true;
        await box.put(key, jsonEncode(notif.toJson()));
      }
    }
  }

  static Future<void> clearAll() async {
    final box = Hive.isBoxOpen(boxName) ? Hive.box(boxName) : await Hive.openBox(boxName);
    await box.clear();
  }
}
```

---

## 📜 4. File 3: Halaman Daftar Notifikasi (`notification_screen_v2.dart`)
**Lokasi Simpan:** `lib/screens_v2/notification_screen_v2.dart`

```dart
import 'package:flutter/material.dart';
import '../theme/app_colors_v2.dart';
import '../models/app_notification_model.dart';
import '../services/notification_service.dart';
import 'notification_detail_screen_v2.dart';

class NotificationScreenV2 extends StatefulWidget {
  const NotificationScreenV2({super.key});

  @override
  State<NotificationScreenV2> createState() => _NotificationScreenV2State();
}

class _NotificationScreenV2State extends State<NotificationScreenV2> {
  List<AppNotificationModel> _allNotifications = [];
  String _selectedFilter = 'Semua';
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _isLoading = true);
    final data = await NotificationService.getNotifications();
    setState(() {
      _allNotifications = data;
      _isLoading = false;
    });
  }

  List<AppNotificationModel> get _filteredNotifications {
    if (_selectedFilter == 'Semua') return _allNotifications;
    if (_selectedFilter == 'Brosur') {
      return _allNotifications.where((n) => n.screen == 'detail_brosur' || n.target == 'brosur_baru').toList();
    }
    if (_selectedFilter == 'Hadits') {
      return _allNotifications.where((n) => n.screen == 'detail_hadits' || n.target == 'hadits_update').toList();
    }
    return _allNotifications.where((n) => n.screen != 'detail_brosur' && n.screen != 'detail_hadits').toList();
  }

  String _formatTime(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);

    if (diff.inMinutes < 1) return 'Baru saja';
    if (diff.inMinutes < 60) return '${diff.inMinutes} mnt lalu';
    if (diff.inHours < 24) return '${diff.inHours} jam lalu';
    if (diff.inDays < 7) return '${diff.inDays} hari lalu';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  IconData _getCategoryIcon(String screen, String target) {
    if (screen == 'detail_brosur' || target == 'brosur_baru') return Icons.menu_book_rounded;
    if (screen == 'detail_hadits' || target == 'hadits_update') return Icons.auto_stories_rounded;
    if (screen == 'kalender') return Icons.calendar_month_rounded;
    return Icons.notifications_rounded;
  }

  Color _getCategoryColor(String screen, String target) {
    if (screen == 'detail_brosur' || target == 'brosur_baru') return const Color(0xFF059669); // Emerald
    if (screen == 'detail_hadits' || target == 'hadits_update') return const Color(0xFF4F46E5); // Indigo
    if (screen == 'kalender') return const Color(0xFFD97706); // Amber
    return AppColorsV2.primaryAction;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColorsV2.backgroundLight,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 1,
        title: const Text(
          'Pusat Notifikasi',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppColorsV2.textPrimary,
          ),
        ),
        actions: [
          if (_allNotifications.isNotEmpty)
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert, color: AppColorsV2.textSecondary),
              onSelected: (val) async {
                if (val == 'read_all') {
                  await NotificationService.markAllAsRead();
                  _loadNotifications();
                } else if (val == 'clear_all') {
                  final confirm = await showDialog<bool>(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: const Text('Hapus Semua Notifikasi?'),
                      content: const Text('Semua riwayat notifikasi lokal akan dibersihkan.'),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
                        TextButton(
                          onPressed: () => Navigator.pop(ctx, true), 
                          child: const Text('Hapus', style: TextStyle(color: Colors.red)),
                        ),
                      ],
                    ),
                  );
                  if (confirm == true) {
                    await NotificationService.clearAll();
                    _loadNotifications();
                  }
                }
              },
              itemBuilder: (ctx) => [
                const PopupMenuItem(
                  value: 'read_all',
                  child: Row(
                    children: [
                      Icon(Icons.done_all, size: 18, color: AppColorsV2.primaryAction),
                      SizedBox(width: 8),
                      Text('Tandai Semua Dibaca'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'clear_all',
                  child: Row(
                    children: [
                      Icon(Icons.delete_outline, size: 18, color: Colors.red),
                      SizedBox(width: 8),
                      Text('Kosongkan Riwayat'),
                    ],
                  ),
                ),
              ],
            ),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: ['Semua', 'Brosur', 'Hadits', 'Info & Jadwal'].map((f) {
                  final isSelected = _selectedFilter == f;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      selected: isSelected,
                      label: Text(f),
                      labelStyle: TextStyle(
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected ? Colors.white : AppColorsV2.textSecondary,
                      ),
                      selectedColor: AppColorsV2.primaryAction,
                      backgroundColor: AppColorsV2.backgroundSecondary,
                      checkmarkColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      side: BorderSide.none,
                      onSelected: (val) => setState(() => _selectedFilter = f),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          const Divider(height: 1, thickness: 1, color: AppColorsV2.borderLight),

          // List Konten
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredNotifications.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(20),
                              decoration: BoxDecoration(
                                color: AppColorsV2.backgroundSecondary,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.notifications_none_rounded, size: 48, color: AppColorsV2.textHint),
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'Belum Ada Notifikasi',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColorsV2.textHeading),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Pemberitahuan brosur dan hadits baru akan muncul di sini.',
                              style: TextStyle(fontSize: 12, color: AppColorsV2.textMuted),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadNotifications,
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _filteredNotifications.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final item = _filteredNotifications[index];
                            final color = _getCategoryColor(item.screen, item.target);
                            final icon = _getCategoryIcon(item.screen, item.target);

                            return InkWell(
                              borderRadius: BorderRadius.circular(16),
                              onTap: () async {
                                await NotificationService.markAsRead(item.id);
                                if (!mounted) return;
                                setState(() => item.isRead = true);

                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => NotificationDetailScreenV2(notification: item),
                                  ),
                                );
                              },
                              child: Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: item.isRead ? AppColorsV2.borderLight : color.withOpacity(0.3),
                                    width: item.isRead ? 1 : 1.5,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.02),
                                      blurRadius: 6,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Icon Category
                                    Container(
                                      width: 44,
                                      height: 44,
                                      decoration: BoxDecoration(
                                        color: color.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Icon(icon, color: color, size: 22),
                                    ),
                                    const SizedBox(width: 12),

                                    // Content
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  item.title,
                                                  style: TextStyle(
                                                    fontWeight: item.isRead ? FontWeight.w600 : FontWeight.bold,
                                                    fontSize: 13,
                                                    color: AppColorsV2.textPrimary,
                                                  ),
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ),
                                              Text(
                                                _formatTime(item.createdAt),
                                                style: const TextStyle(fontSize: 11, color: AppColorsV2.textHint),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            item.body,
                                            style: const TextStyle(
                                              fontSize: 12,
                                              color: AppColorsV2.textSecondary,
                                              height: 1.4,
                                            ),
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ],
                                      ),
                                    ),

                                    // Dot indicator belum dibaca
                                    if (!item.isRead) ...[
                                      const SizedBox(width: 8),
                                      Container(
                                        width: 8,
                                        height: 8,
                                        decoration: BoxDecoration(
                                          color: color,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
```

---

## 🔍 5. File 4: Halaman Detail Notifikasi (`notification_detail_screen_v2.dart`)
**Lokasi Simpan:** `lib/screens_v2/notification_detail_screen_v2.dart`

```dart
import 'package:flutter/material.dart';
import '../theme/app_colors_v2.dart';
import '../models/app_notification_model.dart';
import 'detail_brosur_screen_v2.dart';
import 'detail_hadits_screen_v2.dart';

class NotificationDetailScreenV2 extends StatelessWidget {
  final AppNotificationModel notification;

  const NotificationDetailScreenV2({
    super.key,
    required this.notification,
  });

  String _formatFullDate(DateTime dt) {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return '${dt.day} ${months[dt.month - 1]} ${dt.year}, ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')} WIB';
  }

  @override
  Widget build(BuildContext context) {
    final isBrosur = notification.screen == 'detail_brosur';
    final isHadits = notification.screen == 'detail_hadits';

    return Scaffold(
      backgroundColor: AppColorsV2.backgroundLight,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Detail Notifikasi',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppColorsV2.textPrimary,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Container Header & Konten
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColorsV2.borderLight),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.02),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Category Tag & Date
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: isBrosur
                              ? const Color(0xFFD1FAE5)
                              : isHadits
                                  ? const Color(0xFFE0E7FF)
                                  : AppColorsV2.primaryActionLight,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          isBrosur
                              ? 'BROSUR BARU'
                              : isHadits
                                  ? 'HADITS PILIHAN'
                                  : 'PENGUMUMAN',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: isBrosur
                                ? const Color(0xFF047857)
                                : isHadits
                                    ? const Color(0xFF4338CA)
                                    : AppColorsV2.primaryAction,
                          ),
                        ),
                      ),
                      Text(
                        _formatFullDate(notification.createdAt),
                        style: const TextStyle(fontSize: 11, color: AppColorsV2.textHint),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Judul Notifikasi
                  SelectableText(
                    notification.title,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: AppColorsV2.textPrimary,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Divider(color: AppColorsV2.borderLight, height: 1),
                  const SizedBox(height: 12),

                  // Isi Pesan
                  SelectableText(
                    notification.body,
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppColorsV2.textSecondary,
                      height: 1.6,
                    ),
                  ),

                  // Gambar Banner Jika Ada
                  if (notification.imageUrl != null && notification.imageUrl!.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        notification.imageUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),

            // KARTU AKSI DINAMIS (Deep Linking ke Brosur atau Hadits)
            if (isBrosur && notification.slug != null && notification.slug!.isNotEmpty) ...[
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF065F46), Color(0xFF047857)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF047857).withOpacity(0.3),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.menu_book_rounded, color: Colors.white, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Kajian Brosur Ahad Pagi',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Brosur terkait: "${notification.slug}"',
                      style: const TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFF065F46),
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                        label: const Text('Buka & Baca Brosur Lengkap', style: TextStyle(fontWeight: FontWeight.bold)),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => DetailBrosurScreenV2(slug: notification.slug!),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ] else if (isHadits) ...[
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF3730A3), Color(0xFF4F46E5)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF4F46E5).withOpacity(0.3),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.auto_stories_rounded, color: Colors.white, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Koleksi Hadits Pilihan',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      notification.itemId != null ? 'Hadits No: ${notification.itemId}' : 'Mutiara hadits hari ini.',
                      style: const TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFF3730A3),
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                        label: const Text('Buka Koleksi Hadits', style: TextStyle(fontWeight: FontWeight.bold)),
                        onPressed: () {
                          // Buka hadits atau brosur
                          if (notification.slug != null && notification.slug!.isNotEmpty) {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => DetailBrosurScreenV2(slug: notification.slug!),
                              ),
                            );
                          } else {
                            Navigator.pop(context);
                          }
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
```

---

## 🔔 6. File 5: Pasang Tombol Lonceng di Beranda Flutter
**Lokasi Edit:** `lib/screens_v2/components/home_app_bar_actions.dart`

Tambahkan tombol aksi lonceng notifikasi di App Bar Beranda (sebelah tombol AI / Update):

```dart
// Tambahkan import di atas:
import '../notification_screen_v2.dart';

// Di dalam list actions (misal di samping tombol update):
IconButton(
  icon: const Icon(Icons.notifications_none_rounded, color: AppColorsV2.textSecondary),
  tooltip: 'Notifikasi',
  onPressed: () {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const NotificationScreenV2()),
    );
  },
),
```

---

## 🚀 7. Inisialisasi di `lib/main.dart`

Di file `lib/main.dart`:

```dart
// 1. Buat Global Navigator Key di luar main()
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // 2. Inisialisasi Notifikasi Service
  await NotificationService.initialize(navigatorKey);

  runApp(const MyApp());
}

// 3. Pasang navigatorKey di MaterialApp:
MaterialApp(
  navigatorKey: navigatorKey,
  // ... properti lainnya
)
```
