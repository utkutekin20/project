const Database = require('better-sqlite3');
const db = new Database('./data/ucler_yangin.db');

const customers = [
    ['Marmaris Belediyesi', 'Ahmet Yılmaz', '5321234567', 'ahmet@marmarisbelediye.gov.tr', 'Kemeraltı Mah. Atatürk Cad. No:1 Marmaris'],
    ['Netsel Marina', 'Mehmet Deniz', '5329876543', 'info@netselmarina.com', 'Netsel Marina, Marmaris'],
    ['Grand Yazıcı Hotel', 'Fatma Yazıcı', '5335551234', 'guvenlik@grandyazici.com', 'İçmeler Mah. Marmaris'],
    ['Migros Marmaris', 'Ali Kaya', '5341112233', 'marmaris@migros.com.tr', 'Siteler Mah. No:45 Marmaris'],
    ['Marmaris Devlet Hastanesi', 'Dr. Ayşe Çelik', '5352223344', 'teknik@marmarishastanesi.gov.tr', 'Kemeraltı Mah. Hastane Cad. Marmaris'],
    ['Turgutreis Balık Restaurant', 'Hasan Balıkçı', '5363334455', 'info@turgutreisbalik.com', 'Kordon Boyu No:12 Marmaris'],
    ['Marmaris AVM', 'Zeynep Şahin', '5374445566', 'yonetim@marmarisavm.com', 'Siteler Mah. AVM Cad. No:1 Marmaris'],
    ['Blue Port Hotel', 'Mustafa Denizci', '5385556677', 'teknik@blueport.com.tr', 'İçmeler Sahil Marmaris'],
    ['Atatürk İlkokulu', 'Müdür Selim Öztürk', '5396667788', 'ataturkilk@meb.gov.tr', 'Tepe Mah. Okul Sok. No:5 Marmaris'],
    ['Marmaris Ticaret Odası', 'Kemal Tüccar', '5307778899', 'info@marmaristso.org.tr', 'Merkez Mah. Oda Sok. No:3 Marmaris'],
    ['Pineapple Beach Club', 'Emre Beach', '5318889900', 'manager@pineappleclub.com', 'Uzunyalı Cad. No:88 Marmaris'],
    ['Marmaris Tekstil A.Ş.', 'Ayhan Tekstilci', '5329990011', 'uretim@marmaristekstil.com', 'Organize Sanayi Bölgesi No:15 Marmaris'],
    ['Dalyan Tur', 'Serkan Kaptan', '5330001122', 'rezervasyon@dalyantur.com', 'Liman Mah. No:7 Marmaris'],
    ['Şeker Pastanesi', 'Fadime Şeker', '5341112234', 'siparis@sekerpasta.com', 'Çarşı Mah. Tatlı Sok. No:9 Marmaris'],
    ['Marmaris Su Sporları', 'Burak Dalış', '5352223345', 'info@marmarissuspor.com', 'Sahil Mah. Plaj Yolu No:22 Marmaris'],
    ['Akdeniz Market', 'İbrahim Market', '5363334456', 'akdenizmarket@gmail.com', 'Armutalan Mah. No:33 Marmaris'],
    ['Marina Yacht Club', 'Cenk Yelken', '5374445567', 'club@marinayacht.com', 'Marina Mah. Yat Limanı Marmaris'],
    ['Kervansaray Hotel', 'Osman Otelci', '5385556678', 'info@kervansarayhotel.com', 'Turunç Mah. Marmaris'],
    ['Marmaris Eczanesi', 'Ecz. Gül Sağlık', '5396667789', 'marmariseczane@gmail.com', 'Merkez Mah. İlaç Sok. No:4 Marmaris'],
    ['Deniz Petrol', 'Veli Benzinci', '5307778890', 'denizpetrol@gmail.com', 'Siteler Mah. Ana Yol No:100 Marmaris'],
];

const stmt = db.prepare('INSERT OR IGNORE INTO customers (firma_adi, yetkili, telefon, email, adres) VALUES (?,?,?,?,?)');
let count = 0;
for (const c of customers) {
    try { stmt.run(c[0], c[1], c[2], c[3], c[4]); count++; } catch(e) { console.log(e.message); }
}
console.log(count + ' firma eklendi');

const tubeTypes = [
    ['ABC Kuru Kimyevi Tozlu', 6],
    ['ABC Kuru Kimyevi Tozlu', 12],
    ['Karbondioksit (CO2)', 5],
    ['Köpüklü', 9]
];
const customerIds = db.prepare('SELECT id FROM customers').all().map(r => r.id);

// Gerçek şema: customer_id, tup_cinsi, kilo, seri_no, yil, sira_no, dolum_tarihi, son_kullanim_tarihi
const tubeStmt = db.prepare('INSERT OR IGNORE INTO tubes (customer_id, tup_cinsi, kilo, seri_no, yil, sira_no, dolum_tarihi, son_kullanim_tarihi) VALUES (?,?,?,?,?,?,?,?)');
let tubeCount = 0;
const today = new Date();
const year = today.getFullYear();

for (let i = 0; i < customerIds.length; i++) {
    const numTubes = 3 + Math.floor(Math.random() * 5);
    for (let j = 0; j < numTubes; j++) {
        const tube = tubeTypes[Math.floor(Math.random() * tubeTypes.length)];
        const siraNo = tubeCount + 1;
        const seriNo = 'YT-' + year + '-' + String(siraNo).padStart(5, '0');
        
        // Farklı senaryolar: geçmiş, yaklaşan, normal
        const scenario = Math.random();
        let dayOffset;
        
        if (scenario < 0.25) { // Tarihi geçmiş
            dayOffset = -30 - Math.floor(Math.random() * 60);
        } else if (scenario < 0.5) { // Yaklaşan (30 gün içinde)
            dayOffset = 5 + Math.floor(Math.random() * 25);
        } else { // Normal
            dayOffset = 60 + Math.floor(Math.random() * 300);
        }
        
        const dolumTarihi = new Date(today);
        dolumTarihi.setDate(dolumTarihi.getDate() + dayOffset - 365);
        
        const sonKullanim = new Date(today);
        sonKullanim.setDate(sonKullanim.getDate() + dayOffset);
        
        try {
            tubeStmt.run(
                customerIds[i], 
                tube[0], 
                tube[1], 
                seriNo, 
                year, 
                siraNo,
                dolumTarihi.toISOString().split('T')[0], 
                sonKullanim.toISOString().split('T')[0]
            );
            tubeCount++;
        } catch(e) { console.log(e.message); }
    }
}
console.log(tubeCount + ' tüp eklendi');

db.close();
console.log('TAMAMLANDI!');
process.exit(0);
