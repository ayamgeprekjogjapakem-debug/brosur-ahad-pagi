export interface KitabMeta {
  id: string;
  nama: string;
  aliases: string[];
  title: string;
  desc: string;
  rank: number;
  isKutubutTisah: boolean;
}

export const KITAB_CATALOG: KitabMeta[] = [
  // Kutubut Tis'ah (Peringkat 1 - 9)
  { id: 'bukhari', nama: 'Bukhari', aliases: ['bukhari', 'bukhori', 'buchori'], title: 'Shahih Bukhari', desc: 'Kitab paling shahih setelah Al-Qur\'an.', rank: 1, isKutubutTisah: true },
  { id: 'muslim', nama: 'Muslim', aliases: ['muslim'], title: 'Shahih Muslim', desc: 'Kitab shahih kedua terpercaya.', rank: 2, isKutubutTisah: true },
  { id: 'abu-daud', nama: 'Abu Dawud', aliases: ['abu daud', 'abu dawud', 'abu dawood', 'abudaud'], title: 'Sunan Abu Dawud', desc: 'Fokus pada hadits-hadits ahkam (hukum).', rank: 3, isKutubutTisah: true },
  { id: 'tirmidzi', nama: 'Tirmidzi', aliases: ['tirmidzi', 'tirmidi', 'turmudzi'], title: 'Sunan At-Tirmidzi', desc: 'Memiliki penilaian derajat hadits (Shahih, Hasan, Dhaif).', rank: 4, isKutubutTisah: true },
  { id: 'nasai', nama: "An-Nasa'i", aliases: ['nasai', "nasa'i", "an-nasa'i", 'an-nasai'], title: "Sunan An-Nasa'i", desc: 'Syarat periwayatan dan kritik perawi sangat ketat.', rank: 5, isKutubutTisah: true },
  { id: 'ibnu-majah', nama: 'Ibnu Majah', aliases: ['ibnu majah', 'ibn majah', 'ibnumajah'], title: 'Sunan Ibnu Majah', desc: 'Melengkapi Kutubus Sittah.', rank: 6, isKutubutTisah: true },
  { id: 'ahmad', nama: 'Ahmad', aliases: ['ahmad'], title: 'Musnad Ahmad', desc: 'Kumpulan hadits berdasarkan nama sahabat perawi.', rank: 7, isKutubutTisah: true },
  { id: 'malik', nama: 'Malik', aliases: ['malik', 'muwaththa', 'muwatha'], title: "Al-Muwaththa' Imam Malik", desc: 'Kitab hadits & fiqih tertua yang disusun sistematis.', rank: 8, isKutubutTisah: true },
  { id: 'darimi', nama: 'Darimi', aliases: ['darimi', 'ad-darimi'], title: 'Sunan Ad-Darimi', desc: 'Melengkapi jajaran Kutubut Tis\'ah.', rank: 9, isKutubutTisah: true },

  // Kitab-kitab Mu'tabarah lainnya
  { id: 'al-baihaqi', nama: 'Al-Baihaqi', aliases: ['baihaqi', 'al-baihaqi'], title: 'As-Sunan Al-Kubra / Syu\'abul Iman', desc: 'Karya monumental Imam Al-Baihaqi dalam hadits ahkam & akhlak.', rank: 10, isKutubutTisah: false },
  { id: 'al-hakim', nama: 'Al-Hakim', aliases: ['hakim', 'al-hakim', 'mustadrak'], title: 'Al-Mustadrak \'ala Ash-Shahihain', desc: 'Hadits-hadits yang memenuhi syarat Bukhari & Muslim.', rank: 11, isKutubutTisah: false },
  { id: 'thabrani', nama: 'Thabrani', aliases: ['thabrani', 'tabrani', 'ath-thabrani', 'al-thabrani'], title: 'Al-Mu\'jam Al-Kabir / Al-Awsath / Ash-Shaghir', desc: 'Ensiklopedia hadits karya Imam Ath-Thabrani.', rank: 12, isKutubutTisah: false },
  { id: 'ibnu-hibban', nama: 'Ibnu Hibban', aliases: ['ibnu hibban', 'ibn hibban'], title: 'Shahih Ibnu Hibban', desc: 'Koleksi hadits shahih yang disusun sistematis oleh Ibnu Hibban.', rank: 13, isKutubutTisah: false },
  { id: 'ibnu-khuzaimah', nama: 'Ibnu Khuzaimah', aliases: ['ibnu khuzaimah', 'ibn khuzaimah'], title: 'Shahih Ibnu Khuzaimah', desc: 'Kitab hadits shahih karya Imam Ibnu Khuzaimah.', rank: 14, isKutubutTisah: false },
  { id: 'daraquthni', nama: 'Daraquthni', aliases: ['daraquthni', 'daruquthni', 'ad-daraquthni'], title: 'Sunan Ad-Daraquthni', desc: 'Kumpulan hadits ahkam beserta catatan \'ilal hadits.', rank: 15, isKutubutTisah: false },
  { id: 'al-baghawi', nama: 'Al-Baghawi', aliases: ['baghawi', 'al-baghawi'], title: 'Syarhus Sunnah / Mashabihus Sunnah', desc: 'Kumpulan hadits pilihan karya Imam Al-Baghawi.', rank: 16, isKutubutTisah: false },
  { id: 'abu-yala', nama: "Abu Ya'la", aliases: ["abu ya'la", 'abu yala'], title: "Musnad Abu Ya'la", desc: 'Musnad hadits karya Imam Abu Ya\'la Al-Maushili.', rank: 17, isKutubutTisah: false },
  { id: 'al-bazzar', nama: 'Al-Bazzar', aliases: ['bazzar', 'al-bazzar'], title: 'Musnad Al-Bazzar', desc: 'Kumpulan hadits karya Imam Al-Bazzar.', rank: 18, isKutubutTisah: false },
  { id: 'ibnu-abi-syaibah', nama: 'Ibnu Abi Syaibah', aliases: ['ibnu abi syaibah', 'ibn abi syaibah'], title: 'Mushannaf Ibnu Abi Syaibah', desc: 'Kumpulan hadits marfu\' dan atsar sahabat/tabi\'in.', rank: 19, isKutubutTisah: false },
  { id: 'abdurrazzaq', nama: 'Abdurrazzaq', aliases: ['abdurrazzaq', 'abdur razzaq', 'abdurrazaq'], title: 'Mushannaf Abdurrazzaq', desc: 'Salah satu kitab mushannaf tertua.', rank: 20, isKutubutTisah: false },
  { id: 'syafii', nama: "Asy-Syafi'i", aliases: ["syafi'i", 'syafii', "asy-syafi'i"], title: "Musnad Imam Asy-Syafi'i", desc: 'Kumpulan hadits yang menjadi landasan Imam Asy-Syafi\'i.', rank: 21, isKutubutTisah: false },
];

export function toKitabSlug(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/^(hr\.?|imam|kitab)\s+/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'lainnya';
}

export function resolveKitabFromRawi(rawiKitab: string | null | undefined): {
  slug: string;
  nama: string;
  title: string;
  desc: string;
  rank: number;
  isKutubutTisah: boolean;
} {
  const raw = (rawiKitab || '').trim();
  const low = raw.toLowerCase();

  if (!raw || low === 'sumber tidak dikenal' || low === '-') {
    return {
      slug: 'tidak-dikenal',
      nama: 'Sumber Tidak Dikenal',
      title: 'Belum Teridentifikasi Kitabnya',
      desc: 'Riwayat hadits yang nama kitab/perawi mukharijnya belum tercatat.',
      rank: 9999,
      isKutubutTisah: false,
    };
  }

  const matched = KITAB_CATALOG.find(k => k.aliases.some(a => low.includes(a)));
  if (matched) {
    return {
      slug: matched.id,
      nama: matched.nama,
      title: matched.title,
      desc: matched.desc,
      rank: matched.rank,
      isKutubutTisah: matched.isKutubutTisah,
    };
  }

  const cleanName = raw.replace(/^(hr\.?|imam)\s+/i, '').trim() || raw;
  return {
    slug: toKitabSlug(cleanName),
    nama: cleanName,
    title: `Riwayat ${cleanName}`,
    desc: `Koleksi hadits yang dinisbatkan kepada ${cleanName}.`,
    rank: 500,
    isKutubutTisah: false,
  };
}
