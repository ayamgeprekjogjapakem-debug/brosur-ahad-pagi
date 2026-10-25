import PushNotificationManager from '@/app/components/PushNotificationManager';

export const metadata = {
  title: 'Push Notifikasi Mobile - Admin Panel',
  description: 'Kelola dan kirim push notifikasi ke aplikasi mobile Pustaka / Brosur Ahad Pagi',
};

export default function AdminPushNotificationPage() {
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-200">
      <PushNotificationManager role="admin" />
    </div>
  );
}
