// Cek cepat apakah server ini bisa mengambil data real. Jalankan dari folder proyek:
//   node server/check-live.js
import { getPintuAir } from './services/pintuAir.js';
import { getJakartaAlert } from './services/bmkgCap.js';

const t = await getPintuAir();
console.log('\n== PINTU AIR (BPBD DKI) ==');
console.log('sumber :', t.source, '| stale:', t.stale, '| error:', t.error || '-');
for (const i of t.items) console.log(`${i.nama.padEnd(22)} ${String(i.tma_cm).padStart(5)} cm  ${i.status || '-'}  (${i.cuaca || '-'}, ${i.jam} WIB)`);
console.log(t.items.length ? `\nOK: ${t.items.length} pintu air terbaca` : '\nGAGAL: tidak ada data (lihat error di atas)');

try {
  const a = await getJakartaAlert();
  console.log('\n== PERINGATAN DINI BMKG (CAP) ==');
  console.log(a ? `AKTIF: ${a.event} - ${a.headline} (s/d ${a.expires})` : 'OK: tidak ada peringatan aktif untuk DKI Jakarta saat ini');
} catch (e) { console.log('\nBMKG GAGAL:', e.message); }
