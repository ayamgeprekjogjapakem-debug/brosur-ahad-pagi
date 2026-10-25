import PushNotificationManager from '@/app/components/PushNotificationManager';

export const metadata = {
  title: 'Push Notifikasi Mobile - Super Admin Dashboard',
  description: 'Kelola dan kirim push notifikasi ke aplikasi mobile Pustaka / Brosur Ahad Pagi',
};

export default function SuperAdminPushNotificationPage() {
  return (
    <div className="p-4 md:p-8">
      <PushNotificationManager role="super-admin" />
    </div>
  );
}
