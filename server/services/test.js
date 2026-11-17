import assert from 'assert';
import { parseTma } from './pintuAir.js';
import { parseRss, parseCap } from './bmkgCap.js';
import { parseAmbang } from './ambang.js';

const html = `<table><thead>
<tr><td rowspan="3"><span>&nbsp;</span></td><td colspan="25">Waktu</td></tr>
<tr><td>Pintu Air</td><td style="text-align: center;">
 01:00</td><td style="text-align: center;">
 00:00</td><td>&nbsp;</td></tr></thead><tbody>
<tr><td>Bendung Katulampa</td><td class="siaga4">
   20 &nbsp;cm (H)
 </td><td class="siaga4">
   20 &nbsp;cm (M)
 </td><td>&nbsp;</td></tr>
<tr><td>Pasar Ikan - Laut</td><td class="siaga2">
   207 &nbsp;cm (T)
 </td><td class="siaga3">
   190 &nbsp;cm (T)
 </td><td>&nbsp;</td></tr>
<tr><td>Waduk Pluit</td><td class="siaga4"></td><td class="siaga4">
   -185 &nbsp;cm (T)
 </td><td>&nbsp;</td></tr>
</tbody></table>`;
const r = parseTma(html);
assert.strictEqual(r.length, 3);
assert.deepStrictEqual([r[0].nama, r[0].tma_cm, r[0].jam, r[0].cuaca, r[0].siaga], ['Bendung Katulampa', 20, '01:00', 'Hujan', 4]);
assert.deepStrictEqual([r[1].tma_cm, r[1].siaga], [207, 2]);
assert.deepStrictEqual([r[2].tma_cm, r[2].jam], [-185, '00:00']);
assert.throws(() => parseTma('<html>Just a moment...</html>'));

// Uji integrasi liveData dengan fetch palsu + db palsu
const cap = `<alert><info><event>Hujan Lebat</event><effective>2026-11-16T10:00:00+07:00</effective><expires>2099-01-01T00:00:00+07:00</expires><headline>Hujan lebat DKI Jakarta</headline><area><areaDesc>Jagakarsa</areaDesc></area></info></alert>`;
const rss = `<rss><item><title>Peringatan Dini DKI Jakarta</title><link>https://www.bmkg.go.id/alerts/nowcast/id/X_alert.xml</link></item></rss>`;
globalThis.fetch = async url => ({ ok: true, status: 200,
  json: async () => ({ pintu_air: 'x', time: '00:00', siaga1: '200', siaga2: '150', siaga3: '80', ketinggian: '20' }),
  text: async () => url.includes('waterlevel') ? html : url.endsWith('_alert.xml') ? cap : rss });
const { refreshLive } = await import('./../liveData.js');
const db = { data: { bmkg_forecast: { station: 'x', intervals: [1] } }, saveData() {} };
const st = await refreshLive(db);
assert.deepStrictEqual(db.data.bpbd_posts.map(p => p.id), ['pos-katulampa', 'pos-pasar-ikan']); // Waduk Pluit disaring (default 6 pos)
assert.strictEqual(db.data.bpbd_posts[1].status, 'Siaga 2 (Bahaya)');
assert.deepStrictEqual([db.data.bpbd_posts[0].siaga3_limit_cm, db.data.bpbd_posts[0].siaga2_limit_cm, db.data.bpbd_posts[0].siaga1_limit_cm], [80, 150, 200]);
assert.strictEqual(parseAmbang({ siaga1: '200,200', siaga2: '150', siaga3: '80' }).siaga1_cm, 200);
assert.strictEqual(parseAmbang({}).siaga3_cm, null);
assert.strictEqual(db.data.bmkg_forecast.active_warning.is_active, true);
assert.deepStrictEqual(db.data.bmkg_forecast.active_warning.affected_kecamatan, ['Jagakarsa']);
process.env.PINTU_AIR_WATCH = 'all';
await refreshLive(db);
assert.strictEqual(db.data.bpbd_posts.length, 3); // mode all: semua pos
console.log('SEMUA TES LOLOS', st.pintu_air.ok, st.bmkg.ok);
