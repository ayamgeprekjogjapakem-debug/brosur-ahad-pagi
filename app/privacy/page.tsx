import React from 'react';

export const metadata = {
  title: 'Privacy Policy',
  description: 'Kebijakan Privasi Aplikasi',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Kebijakan Privasi</h1>
        <p className="mb-4 text-sm text-gray-600">Terakhir diperbarui: {new Date().toLocaleDateString('id-ID')}</p>

        <div className="space-y-6 text-gray-700">
          <section>
            <p>
              Pemuda MTA ("kami", "milik kami", atau "kita") mengoperasikan aplikasi Pustaka (selanjutnya disebut sebagai "Layanan").
            </p>
            <p className="mt-2">
              Halaman ini memberi tahu Anda tentang kebijakan kami terkait dengan pengumpulan, penggunaan, dan pengungkapan data pribadi saat Anda menggunakan Layanan kami serta pilihan yang Anda miliki terkait data tersebut.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">1. Pengumpulan dan Penggunaan Informasi</h2>
            <p>
              Kami mengumpulkan beberapa jenis informasi berbeda untuk berbagai tujuan guna menyediakan dan meningkatkan Layanan kami kepada Anda.
            </p>
            <h3 className="font-medium mt-3 mb-2">Jenis Data yang Dikumpulkan:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Data Pribadi:</strong> Saat menggunakan Layanan kami, kami mungkin meminta Anda untuk memberikan informasi pengenal pribadi tertentu yang dapat digunakan untuk menghubungi atau mengidentifikasi Anda (misalnya alamat email, nama).</li>
              <li><strong>Data Penggunaan:</strong> Kami juga dapat mengumpulkan informasi yang dikirimkan browser Anda setiap kali Anda mengunjungi Layanan kami atau ketika Anda mengakses Layanan melalui perangkat seluler.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">2. Penggunaan Data</h2>
            <p>Kami menggunakan data yang dikumpulkan untuk berbagai tujuan:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Untuk menyediakan dan memelihara Layanan</li>
              <li>Untuk memberi tahu Anda tentang perubahan pada Layanan kami</li>
              <li>Untuk memungkinkan Anda berpartisipasi dalam fitur interaktif Layanan kami</li>
              <li>Untuk memberikan dukungan pelanggan</li>
              <li>Untuk mengumpulkan analisis atau informasi berharga agar kami dapat meningkatkan Layanan</li>
              <li>Untuk memantau penggunaan Layanan</li>
              <li>Untuk mendeteksi, mencegah, dan mengatasi masalah teknis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">3. Keamanan Data</h2>
            <p>
              Keamanan data Anda penting bagi kami, tetapi ingatlah bahwa tidak ada metode transmisi melalui Internet, atau metode penyimpanan elektronik yang 100% aman. Meskipun kami berusaha untuk menggunakan cara yang dapat diterima secara komersial untuk melindungi Data Pribadi Anda, kami tidak dapat menjamin keamanan mutlaknya.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">4. Tautan ke Situs Lain</h2>
            <p>
              Layanan kami dapat berisi tautan ke situs lain yang tidak dioperasikan oleh kami. Jika Anda mengklik tautan pihak ketiga, Anda akan diarahkan ke situs pihak ketiga tersebut. Kami sangat menyarankan Anda untuk meninjau Kebijakan Privasi dari setiap situs yang Anda kunjungi.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">5. Privasi Anak-Anak</h2>
            <p>
              Layanan kami tidak ditujukan kepada siapa pun yang berusia di bawah 13 tahun ("Anak-anak"). Kami tidak secara sadar mengumpulkan informasi identitas pribadi dari siapa pun yang berusia di bawah 13 tahun.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">6. Perubahan Kebijakan Privasi</h2>
            <p>
              Kami dapat memperbarui Kebijakan Privasi kami dari waktu ke waktu. Kami akan memberi tahu Anda tentang perubahan apa pun dengan memposting Kebijakan Privasi baru di halaman ini.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">7. Hubungi Kami</h2>
            <p>Jika Anda memiliki pertanyaan tentang Kebijakan Privasi ini, silakan hubungi kami:</p>
            <ul className="list-disc pl-5 mt-2">
              <li>Melalui email: brosurmta@gmail.com</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
