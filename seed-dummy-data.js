const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

// Veritabanı yolu
const userDataPath = process.env.APPDATA || process.env.HOME;
const dbPath = path.join(userDataPath, 'ucler-yangin-takip', 'database.db');

console.log('Veritabanı yolu:', dbPath);

const db = new Database(dbPath);

// Dummy firmalar
const customers = [
    { firma_adi: 'Marmaris Belediyesi', yetkili: 'Ahmet Yılmaz', telefon: '5321234567', email: 'ahmet@marmarisbelediye.gov.tr', adres: 'Kemeraltı Mah. Atatürk Cad. No:1 Marmaris', vergi_no: '1234567890', vergi_dairesi: 'Marmaris' },
    { firma_adi: 'Netsel Marina', yetkili: 'Mehmet Deniz', telefon: '5329876543', email: 'info@netselmarina.com', adres: 'Netsel Marina, Marmaris', vergi_no: '9876543210', vergi_dairesi: 'Marmaris' },
    { firma_adi: 'Grand Yazıcı Hotel', yetkili: 'Fatma Yazıcı', telefon: '5335551234', email: 'guvenlik@grandyazici.com', adres: 'İçmeler Mah. Marmaris', vergi_no: '5678901234', vergi_dairesi: 'Marmaris' },
    { firma_adi: 'Migros Marmaris', yetkili: 'Ali Kaya', telefon: '5341112233', email: 'marmaris@migros.com.tr', adres: 'Siteler Mah. No:45 Marmaris', vergi_no: '1122334455', vergi_dairesi: 'Marmaris' },
    { firma_adi: 'Marmaris Devlet Hastanesi', yetkili: 'Dr. Ayşe Çelik', telefon: '5352223344', email: 'teknik@marmarishastanesi.gov.tr', adres: 'Kemeraltı Mah. Hastane Cad. Marmaris', vergi_no: '2233445566', vergi_dairesi: 'Marmaris' },
    { firma_adi: 'Turgutreis Balık Restaurant', yetkili: 'Hasan Balıkçı', telefon: '5363334455', email: 'info@turgutreisbalik.com', adres: 'Kordon Boyu No:12 Marmaris', vergi_no: '3344556677', vergi_dairesi: 'Marmaris' },
    { firma_adi: 'Marmaris AVM', yetkili: 'Zeynep Şahin', telefon: '5374445566', email: 'yonetim@marmarisavm.com', adres: 'Siteler Mah. AVM Cad. No:1 Marmaris', vergi_no: '4455667788', vergi_dairesi: 'Marmaris' },
    { firma_adi: 'Blue Port Hotel', yetkili: 'Mustafa Denizci', telefon: '5385556677', email: 'teknik@blueport.com.tr', adres: 'İçmeler Sahil Marmaris', vergi_no: '5566778899', vergi_dairesi: 'Marmaris' },
    { firma_adi: 'Atatürk İlkokulu', yetkili: 'Müdür Selim Öztürk', telefon: '5396667788', email: 'ataturkilk@meb.gov.tr', adres: 'Tepe Mah. Okul Sok. No:5 Marmaris', vergi_no: '6677889900', vergi_dairesi: 'Marmaris' },
    { firma_adi: 'Marmaris Ticaret Odası', yetkili: 'Kemal Tüccar', telefon: '5307778899', email: 'info@marmaristso.org.tr', adres: 'Merkez Mah. Oda Sok. No:3 Marmaris', vergi_no: '7788990011', vergi_dairesi: 'Marmaris' },
    { firma_adi: 'Pineapple Beach Club', yetkili: 'Emre Beach', telefon: '5318889900', email: 'manager@pineappleclub.com', adres: 'Uzunyalı Cad. No:88 Marmaris', vergi_no: '8899001122', vergi_dairesi: 'Marmaris' },
    { firma_adi: 'Marmaris Tekstil A.Ş.', yetkili: 'Ayhan Tekstilci', telefon: '5329990011', email: 'uretim@marmaristekstil.com', adres: 'Organize Sanayi Bölgesi No:15 Marmaris', vergi_no: '9900112233', vergi_dairesi: 'Marmaris' },
    { firma_adi: 'Dalyan Tur', yetkili: 'Serkan Kaptan', telefon: '5330001122', email: 'rezervasyon@dalyantur.com', adres: 'Liman Mah. No:7 Marmaris', vergi_no: '0011223344', vergi_dairesi: 'Marmaris' },
    { firma_adi: 'Şeker Pastanesi', yetkili: 'Fadime Şeker', telefon: '5341112234', email: 'siparis@sekerpasta.com', adres: 'Çarşı Mah. Tatlı Sok. No:9 Marmaris', vergi_no: '1122334456', vergi_dairesi: 'Marmaris' },
    { firma_adi: 'Marmaris Su Sporları', yetkili: 'Burak Dalış', telefon: '5352223345', email: 'info@marmarissuspor.com', adres: 'Sahil Mah. Plaj Yolu No:22 Marmaris', vergi_no: '2233445567', vergi_dairesi: 'Marmaris' },
    { firma_adi: 'Akdeniz Market', yetkili: 'İbrahim Market', telefon: '5363334456', email: 'akdenizmarket@gmail.com', adres: 'Armutalan Mah. No:33 Marmaris', vergi_no: '3344556678', vergi_dairesi: 'Marmaris' },
    { firma_adi: 'Marina Yacht Club', yetkili: 'Cenk Yelken', telefon: '5374445567', email: 'club@marinayacht.com', adres: 'Marina Mah. Yat Limanı Marmaris', vergi_no: '4455667789', vergi_dairesi: 'Marmaris' },
    { firma_adi: 'Kervansaray Hotel', yetkili: 'Osman Otelci', telefon: '5385556678', email: 'info@kervansarayhotel.com', adres: 'Turunç Mah. Marmaris', vergi_no: '5566778890', vergi_dairesi: 'Marmaris' },
    { firma_adi: 'Marmaris Eczanesi', yetkili: 'Ecz. Gül Sağlık', telefon: '5396667789', email: 'marmariseczane@gmail.com', adres: 'Merkez Mah. İlaç Sok. No:4 Marmaris', vergi_no: '6677889901', vergi_dairesi: 'Marmaris' },
    { firma_adi: 'Deniz Petrol', yetkili: 'Veli Benzinci', telefon: '5307778890', email: 'denizpetrol@gmail.com', adres: 'Siteler Mah. Ana Yol No:100 Marmaris', vergi_no: '7788990012', vergi_dairesi: 'Marmaris' },
];

// Tüp tipleri
const tubeTypes = [
    { tup_cinsi: 'ABC Kuru Kimyevi Tozlu', kilo: 6 },
    { tup_cinsi: 'ABC Kuru Kimyevi Tozlu', kilo: 12 },
    { tup_cinsi: 'ABC Kuru Kimyevi Tozlu', kilo: 25 },
    { tup_cinsi: 'ABC Kuru Kimyevi Tozlu', kilo: 50 },
    { tup_cinsi: 'Karbondioksit (CO2)', kilo: 5 },
    { tup_cinsi: 'Karbondioksit (CO2)', kilo: 10 },
    { tup_cinsi: 'Köpüklü', kilo: 6 },
    { tup_cinsi: 'Köpüklü', kilo: 9 },
];

// Tarih hesaplama yardımcıları
const today = new Date();
const formatDate = (date) => date.toISOString().split('T')[0];

const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const addMonths = (date, months) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
};

// Müşterileri ekle
console.log('Müşteriler ekleniyor...');
const insertCustomer = db.prepare(`
    INSERT INTO customers (firma_adi, yetkili, telefon, email, adres, vergi_no, vergi_dairesi, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
`);

const customerIds = [];
for (const c of customers) {
    try {
        const result = insertCustomer.run(c.firma_adi, c.yetkili, c.telefon, c.email, c.adres, c.vergi_no, c.vergi_dairesi);
        customerIds.push(result.lastInsertRowid);
        console.log(`  ✓ ${c.firma_adi} eklendi (ID: ${result.lastInsertRowid})`);
    } catch (err) {
        // Zaten varsa atla
        const existing = db.prepare('SELECT id FROM customers WHERE firma_adi = ?').get(c.firma_adi);
        if (existing) {
            customerIds.push(existing.id);
            console.log(`  - ${c.firma_adi} zaten mevcut (ID: ${existing.id})`);
        }
    }
}

// Tüpler ekle - farklı senaryolar
console.log('\nYangın tüpleri ekleniyor...');
const insertTube = db.prepare(`
    INSERT INTO tubes (musteri_id, seri_no, tup_cinsi, kilo, uretim_yili, son_kontrol_tarihi, sonraki_kontrol_tarihi, durum, konum, notlar, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
`);

let tubeCount = 0;
const scenarios = [
    // Tarihi geçmiş (kırmızı) - 30-180 gün önce
    { daysOffset: -60, status: 'Aktif', label: 'Tarihi Geçmiş' },
    { daysOffset: -30, status: 'Aktif', label: 'Tarihi Geçmiş' },
    { daysOffset: -90, status: 'Aktif', label: 'Tarihi Geçmiş' },
    // Yaklaşan (sarı) - 1-30 gün içinde
    { daysOffset: 5, status: 'Aktif', label: 'Yaklaşan' },
    { daysOffset: 15, status: 'Aktif', label: 'Yaklaşan' },
    { daysOffset: 25, status: 'Aktif', label: 'Yaklaşan' },
    // Normal (yeşil) - 30+ gün sonra
    { daysOffset: 60, status: 'Aktif', label: 'Normal' },
    { daysOffset: 120, status: 'Aktif', label: 'Normal' },
    { daysOffset: 180, status: 'Aktif', label: 'Normal' },
    { daysOffset: 300, status: 'Aktif', label: 'Normal' },
    // Pasif/Arızalı
    { daysOffset: -10, status: 'Arızalı', label: 'Arızalı' },
    { daysOffset: 0, status: 'Pasif', label: 'Pasif' },
];

const locations = ['Giriş', 'Mutfak', 'Depo', 'Ofis', 'Koridor', 'Garaj', 'Bodrum', 'Çatı', 'Resepsiyon', 'Yemekhane'];

for (let i = 0; i < customerIds.length; i++) {
    const customerId = customerIds[i];
    // Her müşteriye 3-8 tüp ekle
    const tubeCountForCustomer = 3 + Math.floor(Math.random() * 6);
    
    for (let j = 0; j < tubeCountForCustomer; j++) {
        const tube = tubeTypes[Math.floor(Math.random() * tubeTypes.length)];
        const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
        const location = locations[Math.floor(Math.random() * locations.length)];
        
        const seriNo = `YT-${2020 + Math.floor(Math.random() * 6)}-${String(tubeCount + 1).padStart(5, '0')}`;
        const uretimYili = 2018 + Math.floor(Math.random() * 7);
        
        // Son kontrol 1 yıl önce, sonraki kontrol senaryoya göre
        const sonKontrol = addDays(today, scenario.daysOffset - 365);
        const sonrakiKontrol = addDays(today, scenario.daysOffset);
        
        try {
            insertTube.run(
                customerId,
                seriNo,
                tube.tup_cinsi,
                tube.kilo,
                uretimYili,
                formatDate(sonKontrol),
                formatDate(sonrakiKontrol),
                scenario.status,
                location,
                scenario.label === 'Tarihi Geçmiş' ? 'ACİL KONTROL GEREKLİ!' : 
                scenario.label === 'Yaklaşan' ? 'Kontrol tarihi yaklaşıyor' : ''
            );
            tubeCount++;
        } catch (err) {
            console.log(`  Tüp ekleme hatası: ${err.message}`);
        }
    }
}
console.log(`  ✓ ${tubeCount} adet yangın tüpü eklendi`);

// Teklifler ekle
console.log('\nTeklifler ekleniyor...');
const insertQuote = db.prepare(`
    INSERT INTO quotes (musteri_id, teklif_no, ara_toplam, kdv_orani, kdv_tutar, toplam_tutar, durum, notlar, valid_until, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertQuoteItem = db.prepare(`
    INSERT INTO quote_items (quote_id, tup_cinsi, kilo, adet, birim_fiyat, toplam)
    VALUES (?, ?, ?, ?, ?, ?)
`);

const quoteStatuses = ['Taslak', 'Gönderildi', 'Onaylandı', 'Reddedildi'];
let quoteCount = 0;

for (let i = 0; i < 10; i++) {
    const customerId = customerIds[Math.floor(Math.random() * customerIds.length)];
    const status = quoteStatuses[Math.floor(Math.random() * quoteStatuses.length)];
    const createdDate = addDays(today, -Math.floor(Math.random() * 60));
    const validUntil = addDays(createdDate, 15);
    
    const quoteNo = `TKL-${createdDate.getFullYear()}-${String(quoteCount + 1).padStart(3, '0')}`;
    
    // 2-5 kalem
    const itemCount = 2 + Math.floor(Math.random() * 4);
    let subtotal = 0;
    const items = [];
    
    for (let j = 0; j < itemCount; j++) {
        const tube = tubeTypes[Math.floor(Math.random() * tubeTypes.length)];
        const adet = 1 + Math.floor(Math.random() * 10);
        const birimFiyat = 200 + Math.floor(Math.random() * 500);
        const toplam = adet * birimFiyat;
        subtotal += toplam;
        items.push({ ...tube, adet, birimFiyat, toplam });
    }
    
    const kdvOrani = 20;
    const kdvTutar = subtotal * 0.20;
    const toplamTutar = subtotal + kdvTutar;
    
    try {
        const result = insertQuote.run(
            customerId, quoteNo, subtotal, kdvOrani, kdvTutar, toplamTutar, 
            status, status === 'Reddedildi' ? 'Fiyat uygun bulunmadı' : '',
            formatDate(validUntil), formatDate(createdDate)
        );
        
        for (const item of items) {
            insertQuoteItem.run(result.lastInsertRowid, item.tup_cinsi, item.kilo, item.adet, item.birimFiyat, item.toplam);
        }
        
        quoteCount++;
    } catch (err) {
        console.log(`  Teklif ekleme hatası: ${err.message}`);
    }
}
console.log(`  ✓ ${quoteCount} adet teklif eklendi`);

// Sertifikalar ekle
console.log('\nSertifikalar ekleniyor...');
const insertCertificate = db.prepare(`
    INSERT INTO certificates (musteri_id, sertifika_no, baslangic_tarihi, bitis_tarihi, durum, notlar, created_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
`);

let certCount = 0;
for (let i = 0; i < 15; i++) {
    const customerId = customerIds[Math.floor(Math.random() * customerIds.length)];
    const startDate = addDays(today, -Math.floor(Math.random() * 300));
    const endDate = addDays(startDate, 365);
    const isExpired = endDate < today;
    
    const certNo = `SRT-${startDate.getFullYear()}-${String(certCount + 1).padStart(4, '0')}`;
    
    try {
        insertCertificate.run(
            customerId, certNo, formatDate(startDate), formatDate(endDate),
            isExpired ? 'Süresi Dolmuş' : 'Aktif',
            isExpired ? 'Yenileme gerekli' : ''
        );
        certCount++;
    } catch (err) {
        console.log(`  Sertifika ekleme hatası: ${err.message}`);
    }
}
console.log(`  ✓ ${certCount} adet sertifika eklendi`);

console.log('\n========================================');
console.log('DUMMY DATA BAŞARIYLA EKLENDİ!');
console.log('========================================');
console.log(`Toplam: ${customerIds.length} Firma, ${tubeCount} Tüp, ${quoteCount} Teklif, ${certCount} Sertifika`);
console.log('\nUygulamayı yeniden başlatın.');

db.close();
