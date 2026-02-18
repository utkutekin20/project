const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const PDFDocument = require('pdfkit');

// Müşteri Portalı
const { startPortalServer, stopPortalServer, getPortalURL } = require('../portal/portal-server');

// Veritabanı modülünü yükle
let db;

// Yerel IP adresini al
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        icon: path.join(__dirname, '../../assets/icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        titleBarStyle: 'default',
        show: false
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Pencere hazır olduğunda göster
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.maximize();
    });

    // DevTools aç (geliştirme için)
    mainWindow.webContents.openDevTools();
}

// Uygulama verileri için klasör yolu
function getDataPath() {
    const userDataPath = app.getPath('userData');
    const dataPath = path.join(userDataPath, 'data');
    if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, { recursive: true });
    }
    return dataPath;
}

// QR klasörü yolu
function getQRPath() {
    const qrPath = path.join(getDataPath(), 'qr');
    if (!fs.existsSync(qrPath)) {
        fs.mkdirSync(qrPath, { recursive: true });
    }
    return qrPath;
}

// Yedekleme klasörü yolu
function getBackupPath() {
    const backupPath = path.join(getDataPath(), 'backups');
    if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
    }
    return backupPath;
}

// Sertifika klasörü yolu
function getCertificatePath() {
    const certPath = path.join(getDataPath(), 'certificates');
    if (!fs.existsSync(certPath)) {
        fs.mkdirSync(certPath, { recursive: true });
    }
    return certPath;
}

// Teklif klasörü yolu
function getQuotePath() {
    const quotePath = path.join(getDataPath(), 'quotes');
    if (!fs.existsSync(quotePath)) {
        fs.mkdirSync(quotePath, { recursive: true });
    }
    return quotePath;
}

app.whenReady().then(async () => {
    // Veritabanını başlat
    const Database = require('better-sqlite3');
    const dbPath = path.join(getDataPath(), 'ucleryangin.db');
    db = new Database(dbPath);
    
    // Tabloları oluştur
    initDatabase();
    
    // Müşteri Portalı sunucusunu başlat
    startPortalServer(db, getLocalIP);
    console.log(`📱 QR Portal: http://${getLocalIP()}:3456`);
    
    // Eğer veritabanı boşsa demo verileri ekle
    const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
    if (customerCount === 0) {
        console.log('Veritabanı boş, demo veriler ekleniyor...');
        await seedDemoData();
    }
    
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Demo verileri ekle
async function seedDemoData() {
    try {
        const QRCode = require('qrcode');
        
        // Örnek Müşteriler
        const customersData = [
            { firma_adi: 'Marmaris Marina Hotel', yetkili: 'Ahmet Yılmaz', telefon: '0252 412 55 00', email: 'info@marmarismarina.com', adres: 'Barbaros Cad. No:15, Marmaris', not_text: 'VIP müşteri, yıllık bakım sözleşmesi var' },
            { firma_adi: 'Netsel Marina', yetkili: 'Mehmet Kaya', telefon: '0252 412 27 08', email: 'teknik@netselmarina.com', adres: 'Netsel Marina, Marmaris', not_text: 'Tekne tüpleri için özel fiyat' },
            { firma_adi: 'Grand Yazıcı Club Turban', yetkili: 'Fatma Demir', telefon: '0252 417 10 00', email: 'guvenlik@yazicihotels.com', adres: 'Siteler Mah. Marmaris', not_text: '5 yıldızlı otel, acil müdahale öncelikli' },
            { firma_adi: 'Martı Resort Hotel', yetkili: 'Ali Çelik', telefon: '0252 455 34 40', email: 'teknik@martiresort.com', adres: 'İçmeler Mah. Marmaris', not_text: '' },
            { firma_adi: 'Marmaris Devlet Hastanesi', yetkili: 'Dr. Ayşe Öztürk', telefon: '0252 412 03 55', email: 'sivil.savunma@saglik.gov.tr', adres: 'Kemeraltı Mah. Marmaris', not_text: 'Kamu kurumu, fatura kesimi dikkatli yapılmalı' },
            { firma_adi: 'Migros Marmaris', yetkili: 'Hasan Şahin', telefon: '0252 412 89 00', email: 'marmaris@migros.com.tr', adres: 'Ulusal Egemenlik Cad. Marmaris', not_text: '' },
            { firma_adi: 'Tansas AVM', yetkili: 'Zeynep Arslan', telefon: '0252 413 45 67', email: 'guvenlik@tansas.com', adres: 'Çamdibi Mah. Marmaris', not_text: 'Aylık kontrol gerekli' },
            { firma_adi: 'Marmaris Belediyesi', yetkili: 'Mustafa Eren', telefon: '0252 412 10 03', email: 'itfaiye@marmaris.bel.tr', adres: 'Merkez, Marmaris', not_text: 'Resmi kurum' }
        ];
        
        const insertCustomer = db.prepare(`
            INSERT INTO customers (firma_adi, yetkili, telefon, email, adres, not_text)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const customerIds = [];
        for (const c of customersData) {
            const result = insertCustomer.run(c.firma_adi, c.yetkili, c.telefon, c.email, c.adres, c.not_text);
            customerIds.push(result.lastInsertRowid);
            console.log(`✅ Müşteri eklendi: ${c.firma_adi}`);
        }
        
        // Tarih yardımcı fonksiyonları
        function addDays(date, days) {
            const result = new Date(date);
            result.setDate(result.getDate() + days);
            return result;
        }
        
        function formatDate(date) {
            return date.toISOString().split('T')[0];
        }
        
        const today = new Date();
        
        // Tüp senaryoları (20 adet)
        const tubeScenarios = [
            // Normal (8 adet)
            { customerIndex: 0, tupCinsi: 'KKT (Dry Chemical Powder)', daysFromNow: 365 },
            { customerIndex: 0, tupCinsi: 'CO2 (Carbon Dioxide)', daysFromNow: 300 },
            { customerIndex: 1, tupCinsi: 'Tekne Tipi (Marine)', daysFromNow: 400 },
            { customerIndex: 1, tupCinsi: 'Oksijen (Oxygen)', daysFromNow: 350 },
            { customerIndex: 2, tupCinsi: 'KKT (Dry Chemical Powder)', daysFromNow: 280 },
            { customerIndex: 2, tupCinsi: 'FM200', daysFromNow: 500 },
            { customerIndex: 3, tupCinsi: 'Köpüklü (Foam)', daysFromNow: 200 },
            { customerIndex: 4, tupCinsi: 'Davlumbaz Tipi (Hood System)', daysFromNow: 180 },
            // Süresi Yaklaşan - SARI (6 adet)
            { customerIndex: 0, tupCinsi: 'KKT (Dry Chemical Powder)', daysFromNow: 25 },
            { customerIndex: 1, tupCinsi: 'Tekne Tipi (Marine)', daysFromNow: 15 },
            { customerIndex: 2, tupCinsi: 'CO2 (Carbon Dioxide)', daysFromNow: 28 },
            { customerIndex: 3, tupCinsi: 'Ekobiyolojik (Eco-Biological)', daysFromNow: 10 },
            { customerIndex: 5, tupCinsi: 'Halokarbon (Halocarbon)', daysFromNow: 5 },
            { customerIndex: 6, tupCinsi: 'Köpüklü (Foam)', daysFromNow: 20 },
            // Süresi Dolmuş - KIRMIZI (6 adet)
            { customerIndex: 4, tupCinsi: 'Su (Water)', daysFromNow: -10 },
            { customerIndex: 5, tupCinsi: 'KKT (Dry Chemical Powder)', daysFromNow: -30 },
            { customerIndex: 6, tupCinsi: 'CO2 (Carbon Dioxide)', daysFromNow: -5 },
            { customerIndex: 7, tupCinsi: 'KKT (Dry Chemical Powder)', daysFromNow: -60 },
            { customerIndex: 7, tupCinsi: 'Köpüklü (Foam)', daysFromNow: -15 },
            { customerIndex: 3, tupCinsi: 'FM200', daysFromNow: -2 }
        ];
        
        const insertTube = db.prepare(`
            INSERT INTO tubes (customer_id, tup_cinsi, seri_no, yil, sira_no, dolum_tarihi, son_kullanim_tarihi, qr_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const scenario of tubeScenarios) {
            const customerId = customerIds[scenario.customerIndex];
            const customer = customersData[scenario.customerIndex];
            const { seriNo, yil, siraNo } = getNextSerialNumber();
            
            const sonKullanim = addDays(today, scenario.daysFromNow);
            const dolumTarihi = addDays(sonKullanim, -365);
            
            // QR oluştur - Portal URL'sine yönlendir
            const qrContent = getPortalURL(seriNo, getLocalIP);
            
            const qrFileName = `${seriNo.replace('-', '_')}.png`;
            const qrFilePath = path.join(getQRPath(), qrFileName);
            
            await QRCode.toFile(qrFilePath, qrContent, { width: 300, margin: 2 });
            
            insertTube.run(
                customerId,
                scenario.tupCinsi,
                seriNo,
                yil,
                siraNo,
                formatDate(dolumTarihi),
                formatDate(sonKullanim),
                qrFilePath
            );
            
            const status = scenario.daysFromNow < 0 ? '🔴' : scenario.daysFromNow <= 30 ? '🟡' : '🟢';
            console.log(`${status} Tüp eklendi: ${seriNo} - ${scenario.tupCinsi}`);
        }
        
        console.log('✨ Demo veriler başarıyla eklendi!');
    } catch (error) {
        console.error('Demo veri ekleme hatası:', error);
    }
}

app.on('window-all-closed', () => {
    if (db) {
        db.close();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Veritabanı tablolarını oluştur
function initDatabase() {
    // ============== PRAGMA AYARLARI (Production için kritik) ==============
    // Foreign key constraint'leri aktif et
    db.pragma('foreign_keys = ON');
    // WAL modu - daha iyi performans ve eşzamanlılık
    db.pragma('journal_mode = WAL');
    // Senkronizasyon modu - güvenlik ve hız dengesi
    db.pragma('synchronous = NORMAL');
    // Cache boyutu (negatif değer KB cinsinden)
    db.pragma('cache_size = -64000'); // 64MB cache
    // Temp store - memory'de tut
    db.pragma('temp_store = MEMORY');
    
    console.log('✅ Veritabanı PRAGMA ayarları yapılandırıldı');

    // Müşteriler tablosu
    db.exec(`
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firma_adi TEXT NOT NULL CHECK(length(trim(firma_adi)) > 0),
            yetkili TEXT,
            telefon TEXT,
            email TEXT,
            adres TEXT,
            not_text TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tüpler tablosu
    db.exec(`
        CREATE TABLE IF NOT EXISTS tubes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            tup_cinsi TEXT NOT NULL CHECK(length(trim(tup_cinsi)) > 0),
            kilo REAL DEFAULT 6 CHECK(kilo > 0 AND kilo <= 100),
            seri_no TEXT UNIQUE NOT NULL,
            yil INTEGER NOT NULL CHECK(yil >= 2000 AND yil <= 2100),
            sira_no INTEGER NOT NULL CHECK(sira_no > 0),
            dolum_tarihi DATE NOT NULL,
            son_kullanim_tarihi DATE NOT NULL,
            qr_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        )
    `);
    
    // Kilo sütunu yoksa ekle (migration)
    try {
        db.exec(`ALTER TABLE tubes ADD COLUMN kilo REAL DEFAULT 6`);
    } catch (e) {
        // Sütun zaten var, hata yoksay
    }

    // Loglar tablosu
    db.exec(`
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            message TEXT,
            meta TEXT,
            entity_type TEXT,
            entity_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Servis Formları tablosu
    db.exec(`
        CREATE TABLE IF NOT EXISTS service_forms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tube_id INTEGER NOT NULL,
            customer_id INTEGER NOT NULL,
            technician TEXT,
            notes TEXT,
            signature_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tube_id) REFERENCES tubes(id) ON DELETE CASCADE,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        )
    `);

    // Ayarlar tablosu
    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            company_name TEXT NOT NULL DEFAULT 'FİRMA ADI',
            phone TEXT,
            address TEXT,
            email TEXT,
            website TEXT,
            logo_path TEXT
        )
    `);

    // Sertifikalar tablosu
    db.exec(`
        CREATE TABLE IF NOT EXISTS certificates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            certificate_number TEXT UNIQUE NOT NULL,
            tube_id INTEGER NOT NULL,
            customer_id INTEGER NOT NULL,
            issue_date DATE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT DEFAULT 'Sistem',
            pdf_path TEXT,
            FOREIGN KEY (tube_id) REFERENCES tubes(id) ON DELETE CASCADE,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        )
    `);

    // Arama kayıtları tablosu (Bugün Aranacaklar için)
    db.exec(`
        CREATE TABLE IF NOT EXISTS call_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            call_date DATE NOT NULL,
            call_type TEXT DEFAULT 'phone',
            status TEXT DEFAULT 'pending',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        )
    `);

    // Fiyatlar tablosu
    db.exec(`
        CREATE TABLE IF NOT EXISTS prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tup_cinsi TEXT NOT NULL,
            kilo REAL,
            dolum_fiyati REAL DEFAULT 0,
            satis_fiyati REAL DEFAULT 0,
            hortum_fiyati REAL DEFAULT 0,
            aciklama TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Prices tablosuna yeni kolonları ekle (migration)
    try {
        db.exec(`ALTER TABLE prices ADD COLUMN dolum_fiyati REAL DEFAULT 0`);
    } catch (e) {}
    try {
        db.exec(`ALTER TABLE prices ADD COLUMN satis_fiyati REAL DEFAULT 0`);
    } catch (e) {}
    try {
        db.exec(`ALTER TABLE prices ADD COLUMN hortum_fiyati REAL DEFAULT 0`);
    } catch (e) {}
    try {
        db.exec(`ALTER TABLE prices ADD COLUMN is_active INTEGER DEFAULT 1`);
    } catch (e) {}

    // Teklifler tablosu
    db.exec(`
        CREATE TABLE IF NOT EXISTS quotes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quote_number TEXT UNIQUE NOT NULL,
            customer_id INTEGER NOT NULL,
            items TEXT NOT NULL,
            total_amount REAL NOT NULL DEFAULT 0,
            status TEXT DEFAULT 'draft',
            valid_until DATE,
            notes TEXT,
            pdf_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        )
    `);
    
    // Mevcut tabloya pdf_path sütunu ekle (yoksa)
    try {
        db.exec(`ALTER TABLE quotes ADD COLUMN pdf_path TEXT`);
    } catch(e) {}
    try {
        db.exec(`ALTER TABLE quotes ADD COLUMN updated_at DATETIME`);
    } catch(e) {}

    // Birleşik Sayaçlar Tablosu (Tüpler, Sertifikalar, Teklifler için)
    db.exec(`
        CREATE TABLE IF NOT EXISTS counters (
            counter_type TEXT NOT NULL,
            year INTEGER NOT NULL,
            counter INTEGER DEFAULT 0,
            PRIMARY KEY (counter_type, year)
        )
    `);

    // ============== ESKİ TABLOLARDAN VERİ MİGRASYONU ==============
    // Eski year_counters tablosundan tüp sayaçlarını aktar
    try {
        const oldTubeCounters = db.prepare('SELECT yil as year, son_sira as counter FROM year_counters').all();
        for (const row of oldTubeCounters) {
            try {
                db.prepare('INSERT OR IGNORE INTO counters (counter_type, year, counter) VALUES (?, ?, ?)').run('tube', row.year, row.counter);
            } catch(e) {}
        }
    } catch(e) {}

    // Eski certificate_counters tablosundan sertifika sayaçlarını aktar
    try {
        const oldCertCounters = db.prepare('SELECT yil as year, son_sira as counter FROM certificate_counters').all();
        for (const row of oldCertCounters) {
            try {
                db.prepare('INSERT OR IGNORE INTO counters (counter_type, year, counter) VALUES (?, ?, ?)').run('certificate', row.year, row.counter);
            } catch(e) {}
        }
    } catch(e) {}

    // Eski quote_counters tablosundan teklif sayaçlarını aktar
    try {
        const oldQuoteCounters = db.prepare('SELECT year, counter FROM quote_counters').all();
        for (const row of oldQuoteCounters) {
            try {
                db.prepare('INSERT OR IGNORE INTO counters (counter_type, year, counter) VALUES (?, ?, ?)').run('quote', row.year, row.counter);
            } catch(e) {}
        }
    } catch(e) {}

    // ============== İNDEKSLER (Performans için kritik) ==============
    // Bu indeksler sorgu performansını önemli ölçüde artırır
    const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_tubes_customer_id ON tubes(customer_id)',
        'CREATE INDEX IF NOT EXISTS idx_tubes_son_kullanim ON tubes(son_kullanim_tarihi)',
        'CREATE INDEX IF NOT EXISTS idx_tubes_seri_no ON tubes(seri_no)',
        'CREATE INDEX IF NOT EXISTS idx_tubes_yil ON tubes(yil)',
        'CREATE INDEX IF NOT EXISTS idx_tubes_tup_cinsi ON tubes(tup_cinsi)',
        'CREATE INDEX IF NOT EXISTS idx_customers_firma_adi ON customers(firma_adi)',
        'CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_logs_entity ON logs(entity_type, entity_id)',
        'CREATE INDEX IF NOT EXISTS idx_service_forms_tube_id ON service_forms(tube_id)',
        'CREATE INDEX IF NOT EXISTS idx_service_forms_customer_id ON service_forms(customer_id)',
        'CREATE INDEX IF NOT EXISTS idx_certificates_tube_id ON certificates(tube_id)',
        'CREATE INDEX IF NOT EXISTS idx_certificates_customer_id ON certificates(customer_id)',
        'CREATE INDEX IF NOT EXISTS idx_certificates_number ON certificates(certificate_number)',
        'CREATE INDEX IF NOT EXISTS idx_certificates_issue_date ON certificates(issue_date)',
        'CREATE INDEX IF NOT EXISTS idx_call_logs_customer_id ON call_logs(customer_id)',
        'CREATE INDEX IF NOT EXISTS idx_call_logs_date ON call_logs(call_date)',
        'CREATE INDEX IF NOT EXISTS idx_prices_tup_cinsi ON prices(tup_cinsi)',
        'CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes(customer_id)',
        'CREATE INDEX IF NOT EXISTS idx_quotes_number ON quotes(quote_number)'
    ];
    
    indexes.forEach(sql => {
        try {
            db.exec(sql);
        } catch (e) {
            console.warn('İndeks oluşturma uyarısı:', e.message);
        }
    });
    console.log('✅ Veritabanı indeksleri oluşturuldu');

    // Varsayılan ayar (eğer yoksa)
    const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get().count;
    if (settingsCount === 0) {
        db.prepare(`
            INSERT INTO settings (id, company_name, phone, address, email, website)
            VALUES (1, 'MARMARİS ÜÇLER YANGIN', '0252 XXX XX XX', 'Marmaris / Muğla', 'info@ucleryangin.com', 'ucleryangin.com')
        `).run();
    }

    console.log('✅ Veritabanı tabloları hazır');
}

// Basit loglama yardımcı fonksiyonu
function logEvent(action, message, meta = {}, entityType = null, entityId = null) {
    try {
        db.prepare(`
            INSERT INTO logs (action, message, meta, entity_type, entity_id)
            VALUES (?, ?, ?, ?, ?)
        `).run(action, message, JSON.stringify(meta), entityType, entityId);
    } catch (e) {
        console.error('Log hatası:', e);
    }
}

// ============== YARDIMCI FONKSİYONLAR ==============

// Email validasyonu
function isValidEmail(email) {
    if (!email || email.trim() === '') return true; // Boş email kabul edilir (opsiyonel alan)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

// Telefon validasyonu (Türkiye formatı)
function isValidPhone(phone) {
    if (!phone || phone.trim() === '') return true; // Boş telefon kabul edilir
    // Türkiye telefon formatları: 0xxx xxx xx xx, 05xx xxx xx xx, +90 5xx xxx xx xx
    const phoneRegex = /^(\+90|0)?[\s-]?[1-9]\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Tarih validasyonu
function isValidDate(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}

// String temizleme
function sanitizeString(str) {
    if (!str) return '';
    return str.trim().replace(/\s+/g, ' ');
}

// ============== MÜŞTERİ İŞLEMLERİ ==============

// Müşteri ekle
ipcMain.handle('customer:add', async (event, customer) => {
    try {
        // Validasyon
        const firmaAdi = sanitizeString(customer.firma_adi);
        if (!firmaAdi || firmaAdi.length < 2) {
            return { success: false, error: 'Firma adı en az 2 karakter olmalıdır' };
        }
        if (firmaAdi.length > 200) {
            return { success: false, error: 'Firma adı 200 karakterden uzun olamaz' };
        }
        
        // Email validasyonu
        if (customer.email && !isValidEmail(customer.email)) {
            return { success: false, error: 'Geçerli bir email adresi giriniz' };
        }
        
        // Telefon validasyonu (opsiyonel - sadece uyarı amaçlı)
        // if (customer.telefon && !isValidPhone(customer.telefon)) {
        //     return { success: false, error: 'Geçerli bir telefon numarası giriniz' };
        // }
        
        // Mükerrer kontrol
        const existing = db.prepare('SELECT id FROM customers WHERE LOWER(firma_adi) = LOWER(?)').get(firmaAdi);
        if (existing) {
            return { success: false, error: 'Bu firma adıyla zaten bir müşteri kayıtlı' };
        }
        
        const stmt = db.prepare(`
            INSERT INTO customers (firma_adi, yetkili, telefon, email, adres, not_text)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            firmaAdi,
            sanitizeString(customer.yetkili),
            sanitizeString(customer.telefon),
            sanitizeString(customer.email),
            sanitizeString(customer.adres),
            sanitizeString(customer.not_text)
        );
        
        // Log kaydı
        logEvent('customer_add', `Yeni müşteri eklendi: ${firmaAdi}`, { customerId: result.lastInsertRowid }, 'customer', result.lastInsertRowid);
        
        return { success: true, id: result.lastInsertRowid };
    } catch (error) {
        console.error('Müşteri ekleme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Müşteri listele
ipcMain.handle('customer:list', async () => {
    try {
        const stmt = db.prepare('SELECT * FROM customers ORDER BY firma_adi');
        const customers = stmt.all();
        return { success: true, data: customers };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Müşteri güncelle
ipcMain.handle('customer:update', async (event, customer) => {
    try {
        // Validasyon
        const firmaAdi = sanitizeString(customer.firma_adi);
        if (!firmaAdi || firmaAdi.length < 2) {
            return { success: false, error: 'Firma adı en az 2 karakter olmalıdır' };
        }
        if (firmaAdi.length > 200) {
            return { success: false, error: 'Firma adı 200 karakterden uzun olamaz' };
        }
        
        // Email validasyonu
        if (customer.email && !isValidEmail(customer.email)) {
            return { success: false, error: 'Geçerli bir email adresi giriniz' };
        }
        
        // Mükerrer kontrol (kendi hariç)
        const existing = db.prepare('SELECT id FROM customers WHERE LOWER(firma_adi) = LOWER(?) AND id != ?').get(firmaAdi, customer.id);
        if (existing) {
            return { success: false, error: 'Bu firma adıyla zaten başka bir müşteri kayıtlı' };
        }
        
        const stmt = db.prepare(`
            UPDATE customers 
            SET firma_adi = ?, yetkili = ?, telefon = ?, email = ?, adres = ?, not_text = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        const result = stmt.run(
            firmaAdi,
            sanitizeString(customer.yetkili),
            sanitizeString(customer.telefon),
            sanitizeString(customer.email),
            sanitizeString(customer.adres),
            sanitizeString(customer.not_text),
            customer.id
        );
        
        if (result.changes === 0) {
            return { success: false, error: 'Müşteri bulunamadı' };
        }
        
        // Log kaydı
        logEvent('customer_update', `Müşteri güncellendi: ${firmaAdi}`, { customerId: customer.id }, 'customer', customer.id);
        
        return { success: true };
    } catch (error) {
        console.error('Müşteri güncelleme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Müşteri sil
ipcMain.handle('customer:delete', async (event, id) => {
    try {
        // Müşteriye ait tüp sayısını kontrol et (bilgilendirme için)
        const tubeCount = db.prepare('SELECT COUNT(*) as count FROM tubes WHERE customer_id = ?').get(id).count;
        const customer = db.prepare('SELECT firma_adi FROM customers WHERE id = ?').get(id);
        
        if (!customer) {
            return { success: false, error: 'Müşteri bulunamadı' };
        }
        
        const stmt = db.prepare('DELETE FROM customers WHERE id = ?');
        const result = stmt.run(id);
        
        // Log kaydı
        logEvent('customer_delete', `Müşteri silindi: ${customer.firma_adi} (${tubeCount} tüp de silindi)`, { customerId: id, tubeCount }, 'customer', id);
        
        return { success: true, deletedTubes: tubeCount };
    } catch (error) {
        console.error('Müşteri silme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Müşteri detay bilgisi (Müşteri Kartı için)
ipcMain.handle('customer:getDetails', async (event, customerId) => {
    try {
        // Müşteri bilgileri
        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
        if (!customer) {
            return { success: false, error: 'Müşteri bulunamadı' };
        }
        
        // Müşteriye ait tüm tüpler
        const tubes = db.prepare(`
            SELECT t.*, 
                CASE 
                    WHEN date(t.son_kullanim_tarihi) < date('now') THEN 'expired'
                    WHEN date(t.son_kullanim_tarihi) <= date('now', '+30 days') THEN 'warning'
                    ELSE 'normal'
                END as status,
                CAST(julianday(t.son_kullanim_tarihi) - julianday('now') AS INTEGER) as remaining_days
            FROM tubes t 
            WHERE t.customer_id = ? 
            ORDER BY t.son_kullanim_tarihi ASC
        `).all(customerId);
        
        // İstatistikler
        const stats = {
            totalTubes: tubes.length,
            normalTubes: tubes.filter(t => t.status === 'normal').length,
            warningTubes: tubes.filter(t => t.status === 'warning').length,
            expiredTubes: tubes.filter(t => t.status === 'expired').length,
            tubeTypes: {}
        };
        
        // Tüp cinsi dağılımı
        tubes.forEach(t => {
            stats.tubeTypes[t.tup_cinsi] = (stats.tubeTypes[t.tup_cinsi] || 0) + 1;
        });
        
        // İlk ve son tüp tarihleri
        if (tubes.length > 0) {
            const sortedByCreated = [...tubes].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            stats.firstTubeDate = sortedByCreated[0].created_at;
            stats.lastTubeDate = sortedByCreated[sortedByCreated.length - 1].created_at;
            
            // En yakın son kullanım
            const nextExpiring = tubes.find(t => t.remaining_days >= 0);
            if (nextExpiring) {
                stats.nextExpiringDate = nextExpiring.son_kullanim_tarihi;
                stats.nextExpiringDays = nextExpiring.remaining_days;
            }
        }
        
        // Servis formları
        const serviceForms = db.prepare(`
            SELECT sf.*, t.seri_no 
            FROM service_forms sf
            JOIN tubes t ON sf.tube_id = t.id
            WHERE sf.customer_id = ?
            ORDER BY sf.created_at DESC
            LIMIT 10
        `).all(customerId);
        
        return { 
            success: true, 
            data: {
                customer,
                tubes,
                stats,
                serviceForms
            }
        };
    } catch (error) {
        console.error('Müşteri detay hatası:', error);
        return { success: false, error: error.message };
    }
});

// ============== TÜP İŞLEMLERİ ==============

// Sonraki seri numarasını al
function getNextSerialNumber() {
    const currentYear = new Date().getFullYear();
    
    // Tüp sayacını kontrol et
    let row = db.prepare('SELECT counter FROM counters WHERE counter_type = ? AND year = ?').get('tube', currentYear);
    
    if (!row) {
        // Yıl için yeni sayaç oluştur
        db.prepare('INSERT INTO counters (counter_type, year, counter) VALUES (?, ?, 0)').run('tube', currentYear);
        row = { counter: 0 };
    }
    
    const nextSira = row.counter + 1;
    
    // Sayacı güncelle
    db.prepare('UPDATE counters SET counter = ? WHERE counter_type = ? AND year = ?').run(nextSira, 'tube', currentYear);
    
    // Seri numarasını formatla (2026-0001)
    const seriNo = `${currentYear}-${String(nextSira).padStart(4, '0')}`;
    
    return { seriNo, yil: currentYear, siraNo: nextSira };
}

// Tüp ekle
ipcMain.handle('tube:add', async (event, tube) => {
    // Transaction başlat - veri tutarlılığı için kritik
    const transaction = db.transaction(async () => {
        try {
            const QRCode = require('qrcode');
            
            // Validasyonlar
            if (!tube.customer_id) {
                throw new Error('Müşteri seçilmedi');
            }
            if (!tube.tup_cinsi || tube.tup_cinsi.trim() === '') {
                throw new Error('Tüp cinsi seçilmedi');
            }
            if (!tube.dolum_tarihi || !isValidDate(tube.dolum_tarihi)) {
                throw new Error('Geçerli bir dolum tarihi giriniz');
            }
            if (!tube.son_kullanim_tarihi || !isValidDate(tube.son_kullanim_tarihi)) {
                throw new Error('Geçerli bir son kullanım tarihi giriniz');
            }
            
            // Tarih mantık kontrolü
            const dolumDate = new Date(tube.dolum_tarihi);
            const sonKullanimDate = new Date(tube.son_kullanim_tarihi);
            if (sonKullanimDate <= dolumDate) {
                throw new Error('Son kullanım tarihi, dolum tarihinden sonra olmalıdır');
            }
            
            // Kilo validasyonu
            const kilo = parseFloat(tube.kilo) || 6;
            if (kilo <= 0 || kilo > 100) {
                throw new Error('Kilo 0-100 kg arasında olmalıdır');
            }
            
            // Müşteri var mı kontrol et
            const customer = db.prepare('SELECT firma_adi FROM customers WHERE id = ?').get(tube.customer_id);
            if (!customer) {
                throw new Error('Seçilen müşteri bulunamadı');
            }
            
            // Seri numarası oluştur
            const { seriNo, yil, siraNo } = getNextSerialNumber();
            
            // QR içeriği - Portal URL'sine yönlendir
            const qrContent = getPortalURL(seriNo, getLocalIP);
            
            // QR dosya yolu
            const qrFileName = `${seriNo.replace('-', '_')}.png`;
            const qrFilePath = path.join(getQRPath(), qrFileName);
            
            // QR kodu oluştur
            await QRCode.toFile(qrFilePath, qrContent, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });
            
            // Veritabanına kaydet
            const stmt = db.prepare(`
                INSERT INTO tubes (customer_id, tup_cinsi, kilo, seri_no, yil, sira_no, dolum_tarihi, son_kullanim_tarihi, qr_path)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const result = stmt.run(
                tube.customer_id,
                tube.tup_cinsi.trim(),
                kilo,
                seriNo,
                yil,
                siraNo,
                tube.dolum_tarihi,
                tube.son_kullanim_tarihi,
                qrFilePath
            );
            
            // Log kaydı
            logEvent('tube_add', `Yeni tüp eklendi: ${seriNo} - ${customer.firma_adi}`, 
                { tubeId: result.lastInsertRowid, seriNo, customerId: tube.customer_id }, 
                'tube', result.lastInsertRowid);
            
            return { 
                success: true, 
                id: result.lastInsertRowid, 
                seri_no: seriNo,
                qr_path: qrFilePath 
            };
        } catch (error) {
            throw error;
        }
    });
    
    try {
        return await transaction();
    } catch (error) {
        console.error('Tüp ekleme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Tüp listele
ipcMain.handle('tube:list', async () => {
    try {
        const stmt = db.prepare(`
            SELECT t.*, c.firma_adi, c.telefon 
            FROM tubes t 
            JOIN customers c ON t.customer_id = c.id 
            ORDER BY t.created_at DESC
        `);
        const tubes = stmt.all();
        return { success: true, data: tubes };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Tüp sil
ipcMain.handle('tube:delete', async (event, id) => {
    try {
        // Tüp bilgisini al (log için)
        const tube = db.prepare('SELECT seri_no, qr_path, customer_id FROM tubes WHERE id = ?').get(id);
        if (!tube) {
            return { success: false, error: 'Tüp bulunamadı' };
        }
        
        // Önce QR dosyasını sil
        if (tube.qr_path && fs.existsSync(tube.qr_path)) {
            try {
                fs.unlinkSync(tube.qr_path);
            } catch (e) {
                console.warn('QR dosyası silinemedi:', e.message);
            }
        }
        
        const stmt = db.prepare('DELETE FROM tubes WHERE id = ?');
        const result = stmt.run(id);
        
        if (result.changes === 0) {
            return { success: false, error: 'Tüp silinemedi' };
        }
        
        // Log kaydı
        logEvent('tube_delete', `Tüp silindi: ${tube.seri_no}`, { tubeId: id, seriNo: tube.seri_no }, 'tube', id);
        
        return { success: true };
    } catch (error) {
        console.error('Tüp silme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Süresi yaklaşan tüpleri getir (30 gün içinde)
ipcMain.handle('tube:getExpiring', async () => {
    try {
        const stmt = db.prepare(`
            SELECT t.*, c.firma_adi, c.telefon, c.yetkili
            FROM tubes t 
            JOIN customers c ON t.customer_id = c.id 
            WHERE date(t.son_kullanim_tarihi) <= date('now', '+30 days')
            ORDER BY t.son_kullanim_tarihi ASC
        `);
        const tubes = stmt.all();
        return { success: true, data: tubes };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Müşteriye ait tüpleri getir
ipcMain.handle('tube:getByCustomer', async (event, customerId) => {
    try {
        const stmt = db.prepare(`
            SELECT t.*, c.firma_adi 
            FROM tubes t 
            JOIN customers c ON t.customer_id = c.id 
            WHERE t.customer_id = ?
            ORDER BY t.created_at DESC
        `);
        const tubes = stmt.all(customerId);
        return { success: true, data: tubes };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ============== İSTATİSTİKLER ==============

ipcMain.handle('stats:get', async () => {
    try {
        const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
        const totalTubes = db.prepare('SELECT COUNT(*) as count FROM tubes').get().count;
        const expiringTubes = db.prepare(`
            SELECT COUNT(*) as count FROM tubes 
            WHERE date(son_kullanim_tarihi) <= date('now', '+30 days')
            AND date(son_kullanim_tarihi) >= date('now')
        `).get().count;
        const expiredTubes = db.prepare(`
            SELECT COUNT(*) as count FROM tubes 
            WHERE date(son_kullanim_tarihi) < date('now')
        `).get().count;
        
        // Tüp cinslerine göre dağılım
        const tubeTypes = db.prepare(`
            SELECT tup_cinsi, COUNT(*) as count 
            FROM tubes 
            GROUP BY tup_cinsi
        `).all();
        
        return { 
            success: true, 
            data: {
                totalCustomers,
                totalTubes,
                expiringTubes,
                expiredTubes,
                tubeTypes
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ============== YEDEKLEME İŞLEMLERİ ==============

ipcMain.handle('backup:create', async () => {
    try {
        const dbPath = path.join(getDataPath(), 'ucleryangin.db');
        const backupDir = getBackupPath();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `ucleryangin_backup_${timestamp}.db`;
        const backupPath = path.join(backupDir, backupFileName);
        
        fs.copyFileSync(dbPath, backupPath);
        
        return { success: true, path: backupPath, fileName: backupFileName };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('backup:list', async () => {
    try {
        const backupDir = getBackupPath();
        const files = fs.readdirSync(backupDir)
            .filter(f => f.endsWith('.db'))
            .map(f => ({
                name: f,
                path: path.join(backupDir, f),
                date: fs.statSync(path.join(backupDir, f)).mtime
            }))
            .sort((a, b) => b.date - a.date);
        
        return { success: true, data: files };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('backup:restore', async (event, backupPath) => {
    try {
        const dbPath = path.join(getDataPath(), 'ucleryangin.db');
        
        // Mevcut veritabanını kapat
        db.close();
        
        // Yedeği geri yükle
        fs.copyFileSync(backupPath, dbPath);
        
        // Veritabanını yeniden aç
        const Database = require('better-sqlite3');
        db = new Database(dbPath);
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ============== DOSYA İŞLEMLERİ ==============

ipcMain.handle('file:openQR', async (event, qrPath) => {
    try {
        const { shell } = require('electron');
        await shell.openPath(qrPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('file:getQRPath', async () => {
    return getQRPath();
});


// ============== ETİKET YAZDIRMA ==============

// Tüp verisi al (etiket için)
ipcMain.handle('label:getTubeData', async (event, tubeId) => {
    try {
        const stmt = db.prepare(`
            SELECT t.*, c.firma_adi, c.telefon, c.yetkili
            FROM tubes t 
            JOIN customers c ON t.customer_id = c.id 
            WHERE t.id = ?
        `);
        const tube = stmt.get(tubeId);
        
        if (!tube) {
            return { success: false, error: 'Tüp bulunamadı' };
        }
        
        // QR kodunu base64 olarak oku
        let qrBase64 = '';
        if (tube.qr_path && fs.existsSync(tube.qr_path)) {
            const qrBuffer = fs.readFileSync(tube.qr_path);
            qrBase64 = `data:image/png;base64,${qrBuffer.toString('base64')}`;
        }
        
        return { 
            success: true, 
            data: {
                ...tube,
                qr_base64: qrBase64
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Etiket önizleme (yeni pencerede aç)
ipcMain.handle('label:preview', async (event, tubeId) => {
    try {
        const { BrowserWindow } = require('electron');
        
        // Tüp verisini al
        const stmt = db.prepare(`
            SELECT t.*, c.firma_adi, c.telefon
            FROM tubes t 
            JOIN customers c ON t.customer_id = c.id 
            WHERE t.id = ?
        `);
        const tube = stmt.get(tubeId);
        
        if (!tube) {
            return { success: false, error: 'Tüp bulunamadı' };
        }
        
        // QR kodunu base64 olarak oku
        let qrBase64 = '';
        if (tube.qr_path && fs.existsSync(tube.qr_path)) {
            const qrBuffer = fs.readFileSync(tube.qr_path);
            qrBase64 = `data:image/png;base64,${qrBuffer.toString('base64')}`;
        }
        
        // Tarihleri formatla
        const formatTarih = (tarih) => {
            const d = new Date(tarih);
            return d.toLocaleDateString('tr-TR');
        };
        
        // Etiket HTML içeriği
        const labelHTML = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Etiket Önizleme - ${tube.seri_no}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Arial', sans-serif;
            background: #333;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
        }
        h2 {
            color: #fff;
            margin-bottom: 20px;
            font-size: 18px;
        }
        .etiket {
            width: 380px;
            height: 230px;
            background: linear-gradient(145deg, #e8e8e8 0%, #d0d0d0 100%);
            border: 3px solid #000;
            padding: 10px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }
        .main-section {
            display: flex;
            flex: 1;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
        }
        .left-panel {
            width: 100px;
            display: flex;
            flex-direction: column;
            align-items: center;
            border-right: 2px dashed #666;
            padding-right: 8px;
        }
        .qr-box {
            width: 80px;
            height: 80px;
            background: #fff;
            border: 2px solid #000;
            padding: 3px;
            margin-bottom: 8px;
        }
        .qr-box img { width: 100%; height: 100%; }
        .seri-container {
            width: 100%;
            text-align: center;
            border: 2px solid #000;
            background: #fff;
        }
        .seri-header {
            background: #000;
            color: #fff;
            font-size: 9px;
            font-weight: bold;
            padding: 3px;
            letter-spacing: 1px;
        }
        .seri-value {
            font-size: 13px;
            font-weight: 900;
            padding: 4px;
            letter-spacing: 1px;
        }
        .right-panel {
            flex: 1;
            padding-left: 10px;
            display: flex;
            flex-direction: column;
        }
        .firma-header {
            font-size: 13px;
            font-weight: 900;
            text-transform: uppercase;
            border-bottom: 2px solid #000;
            padding-bottom: 4px;
            margin-bottom: 6px;
        }
        .firma-tel {
            font-size: 9px;
            font-weight: normal;
            margin-top: 2px;
        }
        .info-row {
            margin-bottom: 6px;
        }
        .lbl { 
            font-size: 8px; 
            font-weight: bold; 
            text-transform: uppercase;
            color: #333;
        }
        .val { 
            font-size: 11px; 
            font-weight: bold; 
            text-transform: uppercase;
            border-bottom: 1px dotted #000;
            padding-bottom: 2px;
        }
        .flex-row {
            display: flex;
            gap: 8px;
            margin-top: auto;
        }
        .flex-item {
            flex: 1;
            border: 1px solid #000;
            padding: 4px 6px;
            background: #fff;
        }
        .footer-section {
            display: flex;
            gap: 10px;
        }
        .date-box {
            flex: 1;
            text-align: center;
            border: 2px solid #000;
            background: #fff;
            padding: 4px;
        }
        .date-box.highlight {
            border-width: 3px;
            background: #fffde7;
        }
        .date-label {
            font-size: 8px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .date-value {
            font-size: 16px;
            font-weight: 900;
        }
        .actions {
            margin-top: 20px;
            display: flex;
            gap: 10px;
        }
        button {
            padding: 12px 24px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            border: none;
            border-radius: 6px;
        }
        .btn-print {
            background: #4CAF50;
            color: white;
        }
        .btn-print:hover { background: #45a049; }
        .btn-close {
            background: #666;
            color: white;
        }
        .btn-close:hover { background: #555; }
        
        /* Yazdırma için gizle */
        @media print {
            body { 
                background: none !important; 
                padding: 0 !important;
                margin: 0 !important;
            }
            h2 { display: none !important; }
            .actions { display: none !important; }
            .etiket { 
                box-shadow: none !important;
                margin: 0 !important;
            }
        }
    </style>
</head>
<body>
    <h2>🏷️ Etiket Önizleme</h2>
    <div class="etiket">
        <div class="main-section">
            <div class="left-panel">
                <div class="qr-box">
                    <img src="${qrBase64}" alt="QR">
                </div>
                <div class="seri-container">
                    <div class="seri-header">SERİ NO</div>
                    <div class="seri-value">${tube.seri_no}</div>
                </div>
            </div>
            <div class="right-panel">
                <div class="firma-header">
                    MARMARİS ÜÇLER YANGIN
                    <div class="firma-tel">Tel: 0539 924 55 84</div>
                </div>
                <div class="info-row">
                    <div class="lbl">Müşteri / İşletme Adı:</div>
                    <div class="val">${tube.firma_adi}</div>
                </div>
                <div class="flex-row">
                    <div class="flex-item">
                        <div class="lbl">Tüp Cinsi</div>
                        <div class="val">${tube.tup_cinsi}</div>
                    </div>
                    <div class="flex-item">
                        <div class="lbl">Kilosu</div>
                        <div class="val">${tube.kilo || 6} KG</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="footer-section">
            <div class="date-box">
                <div class="date-label">Dolum Tarihi</div>
                <div class="date-value">${formatTarih(tube.dolum_tarihi)}</div>
            </div>
            <div class="date-box highlight">
                <div class="date-label">Son Kul. Tarihi</div>
                <div class="date-value">${formatTarih(tube.son_kullanim_tarihi)}</div>
            </div>
        </div>
    </div>
    <div class="actions">
        <button class="btn-print" onclick="window.print()">🖨️ Yazdır</button>
        <button class="btn-close" onclick="window.close()">✕ Kapat</button>
    </div>
</body>
</html>`;
        
        // Önizleme penceresi oluştur
        const previewWindow = new BrowserWindow({
            width: 500,
            height: 450,
            title: 'Etiket Önizleme - ' + tube.seri_no,
            resizable: true,
            minimizable: false,
            maximizable: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });
        
        previewWindow.setMenuBarVisibility(false);
        previewWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(labelHTML)}`);
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Etiket yazdır
ipcMain.handle('label:print', async (event, tubeId) => {
    try {
        const { BrowserWindow } = require('electron');
        
        // Tüp verisini al
        const stmt = db.prepare(`
            SELECT t.*, c.firma_adi, c.telefon
            FROM tubes t 
            JOIN customers c ON t.customer_id = c.id 
            WHERE t.id = ?
        `);
        const tube = stmt.get(tubeId);
        
        if (!tube) {
            return { success: false, error: 'Tüp bulunamadı' };
        }
        
        // QR kodunu base64 olarak oku
        let qrBase64 = '';
        if (tube.qr_path && fs.existsSync(tube.qr_path)) {
            const qrBuffer = fs.readFileSync(tube.qr_path);
            qrBase64 = `data:image/png;base64,${qrBuffer.toString('base64')}`;
        }
        
        // Tarihleri formatla
        const formatTarih = (tarih) => {
            const d = new Date(tarih);
            return d.toLocaleDateString('tr-TR');
        };
        
        // Etiket HTML içeriği - Profesyonel termal yazıcı uyumlu tasarım
        const labelHTML = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Etiket - ${tube.seri_no}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: 100mm 70mm; margin: 0; }
        body { 
            font-family: 'Arial', 'Helvetica', sans-serif;
            background: #fff;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .etiket {
            width: 100mm;
            height: 70mm;
            background: #fff;
            border: 3px solid #000;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        /* Üst Başlık - Firma */
        .header {
            border-bottom: 3px solid #000;
            padding: 2mm 3mm;
            text-align: center;
        }
        .firma-adi {
            font-size: 14pt;
            font-weight: 900;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        .firma-tel {
            font-size: 9pt;
            font-weight: bold;
            margin-top: 1mm;
        }
        /* Ana İçerik */
        .content {
            display: flex;
            flex: 1;
            border-bottom: 2px solid #000;
        }
        /* Sol Panel - QR */
        .left-panel {
            width: 32mm;
            border-right: 2px solid #000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2mm;
        }
        .qr-container {
            width: 26mm;
            height: 26mm;
            border: 2px solid #000;
            padding: 1mm;
            background: #fff;
        }
        .qr-container img { 
            width: 100%; 
            height: 100%; 
            display: block;
        }
        .seri-box {
            width: 100%;
            margin-top: 2mm;
            border: 2px solid #000;
            text-align: center;
        }
        .seri-label {
            font-size: 6pt;
            font-weight: bold;
            padding: 0.5mm;
            border-bottom: 1px solid #000;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .seri-value {
            font-size: 10pt;
            font-weight: 900;
            padding: 1mm;
            letter-spacing: 0.5px;
        }
        /* Sağ Panel - Bilgiler */
        .right-panel {
            flex: 1;
            padding: 2mm 3mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .info-group {
            border: 1.5px solid #000;
            margin-bottom: 1.5mm;
        }
        .info-label {
            font-size: 6pt;
            font-weight: bold;
            text-transform: uppercase;
            padding: 0.5mm 2mm;
            border-bottom: 1px solid #000;
            letter-spacing: 0.3px;
        }
        .info-value {
            font-size: 10pt;
            font-weight: bold;
            padding: 1mm 2mm;
            text-transform: uppercase;
            min-height: 5mm;
        }
        .info-row {
            display: flex;
            gap: 2mm;
        }
        .info-row .info-group {
            flex: 1;
        }
        /* Alt Tarih Bölümü */
        .footer {
            display: flex;
        }
        .date-box {
            flex: 1;
            text-align: center;
            padding: 2mm;
            border-right: 2px solid #000;
        }
        .date-box:last-child {
            border-right: none;
        }
        .date-box.highlight {
            border-top: 3px solid #000;
        }
        .date-label {
            font-size: 7pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .date-value {
            font-size: 13pt;
            font-weight: 900;
            margin-top: 1mm;
        }
        .warning-icon {
            font-size: 8pt;
            margin-right: 1mm;
        }
        @media print {
            html, body { 
                width: 100mm; 
                height: 70mm; 
                margin: 0;
                padding: 0;
            }
            body { 
                background: #fff !important; 
                min-height: auto;
            }
            .etiket { 
                border: 3px solid #000 !important;
            }
        }
    </style>
</head>
<body>
    <div class="etiket">
        <div class="header">
            <div class="firma-adi">◆ MARMARİS ÜÇLER YANGIN ◆</div>
            <div class="firma-tel">✆ 0539 924 55 84</div>
        </div>
        <div class="content">
            <div class="left-panel">
                <div class="qr-container">
                    <img src="${qrBase64}" alt="QR">
                </div>
                <div class="seri-box">
                    <div class="seri-label">Barkod No</div>
                    <div class="seri-value">${tube.seri_no}</div>
                </div>
            </div>
            <div class="right-panel">
                <div class="info-group">
                    <div class="info-label">Müşteri / İşletme</div>
                    <div class="info-value">${tube.firma_adi}</div>
                </div>
                <div class="info-row">
                    <div class="info-group">
                        <div class="info-label">Tüp Cinsi</div>
                        <div class="info-value">${tube.tup_cinsi}</div>
                    </div>
                    <div class="info-group">
                        <div class="info-label">Ağırlık</div>
                        <div class="info-value">${tube.kilo || 6} KG</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="footer">
            <div class="date-box">
                <div class="date-label">Dolum Tarihi</div>
                <div class="date-value">${formatTarih(tube.dolum_tarihi)}</div>
            </div>
            <div class="date-box highlight">
                <div class="date-label">⚠ Son Kullanma Tarihi</div>
                <div class="date-value">${formatTarih(tube.son_kullanim_tarihi)}</div>
            </div>
        </div>
    </div>
    <script>
        window.onload = () => {
            window.print();
        };
    </script>
</body>
</html>`;
        
        // Yazdırma penceresi oluştur
        const printWindow = new BrowserWindow({
            width: 400,
            height: 300,
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });
        
        printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(labelHTML)}`);
        
        printWindow.webContents.on('did-finish-load', () => {
            printWindow.webContents.print({
                silent: false,
                printBackground: false,
                margins: { marginType: 'none' }
            }, (success, errorType) => {
                printWindow.close();
            });
        });
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ============== LOGS ==============
ipcMain.handle('logs:list', async (event, limit = 200) => {
    try {
        const stmt = db.prepare(`
            SELECT id, action, entity_type, entity_id, message, meta, created_at
            FROM logs
            ORDER BY datetime(created_at) DESC
            LIMIT ?
        `);
        const rows = stmt.all(limit || 200).map(row => ({
            ...row,
            meta: row.meta ? JSON.parse(row.meta) : {}
        }));
        return { success: true, data: rows };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ============== EXPORT ==============
ipcMain.handle('export:csv', async (event, filters) => {
    try {
        const { dialog } = require('electron');
        let query = `
            SELECT t.seri_no, c.firma_adi, t.tup_cinsi, t.kilo, t.dolum_tarihi, t.son_kullanim_tarihi,
                   CASE 
                       WHEN date(t.son_kullanim_tarihi) < date('now') THEN 'Süresi Dolmuş'
                       WHEN date(t.son_kullanim_tarihi) <= date('now', '+30 days') THEN 'Süresi Yaklaşıyor'
                       ELSE 'Normal'
                   END as durum
            FROM tubes t
            JOIN customers c ON t.customer_id = c.id
            WHERE 1=1
        `;
        
        const params = [];
        if (filters.search) {
            query += ` AND (t.seri_no LIKE ? OR c.firma_adi LIKE ?)`;
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }
        if (filters.type) {
            query += ` AND t.tup_cinsi = ?`;
            params.push(filters.type);
        }
        if (filters.status) {
            if (filters.status === 'expired') query += ` AND date(t.son_kullanim_tarihi) < date('now')`;
            else if (filters.status === 'warning') query += ` AND date(t.son_kullanim_tarihi) >= date('now') AND date(t.son_kullanim_tarihi) <= date('now', '+30 days')`;
            else if (filters.status === 'normal') query += ` AND date(t.son_kullanim_tarihi) > date('now', '+30 days')`;
        }
        if (filters.fromDate) {
            query += ` AND date(t.son_kullanim_tarihi) >= ?`;
            params.push(filters.fromDate);
        }
        if (filters.toDate) {
            query += ` AND date(t.son_kullanim_tarihi) <= ?`;
            params.push(filters.toDate);
        }
        
        const rows = db.prepare(query).all(...params);
        
        const saveDialog = await dialog.showSaveDialog({
            title: 'CSV Olarak Kaydet',
            defaultPath: 'tupler_export.csv',
            filters: [{ name: 'CSV', extensions: ['csv'] }]
        });
        
        if (saveDialog.canceled || !saveDialog.filePath) return { success: false, canceled: true };
        
        const header = 'Barkod No,Firma,Tüp Cinsi,Kilo,Dolum Tarihi,Son Kullanım,Durum\\n';
        const content = rows.map(r => 
            `"${r.seri_no}","${r.firma_adi}","${r.tup_cinsi}","${r.kilo}","${r.dolum_tarihi}","${r.son_kullanim_tarihi}","${r.durum}"`
        ).join('\\n');
        
        fs.writeFileSync(saveDialog.filePath, header + content, 'utf-8');
        logEvent('export_csv', 'CSV dışa aktarıldı', { count: rows.length }, 'export');
        return { success: true, path: saveDialog.filePath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('export:xlsx', async (event, filters) => {
    try {
        const { dialog } = require('electron');
        const XLSX = require('xlsx');
        
        let query = `
            SELECT t.seri_no, c.firma_adi, t.tup_cinsi, t.kilo, t.dolum_tarihi, t.son_kullanim_tarihi,
                   CASE 
                       WHEN date(t.son_kullanim_tarihi) < date('now') THEN 'Süresi Dolmuş'
                       WHEN date(t.son_kullanim_tarihi) <= date('now', '+30 days') THEN 'Süresi Yaklaşıyor'
                       ELSE 'Normal'
                   END as durum
            FROM tubes t
            JOIN customers c ON t.customer_id = c.id
            WHERE 1=1
        `;
        
        const params = [];
        if (filters.search) {
            query += ` AND (t.seri_no LIKE ? OR c.firma_adi LIKE ?)`;
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }
        if (filters.type) {
            query += ` AND t.tup_cinsi = ?`;
            params.push(filters.type);
        }
        if (filters.status) {
            if (filters.status === 'expired') query += ` AND date(t.son_kullanim_tarihi) < date('now')`;
            else if (filters.status === 'warning') query += ` AND date(t.son_kullanim_tarihi) >= date('now') AND date(t.son_kullanim_tarihi) <= date('now', '+30 days')`;
            else if (filters.status === 'normal') query += ` AND date(t.son_kullanim_tarihi) > date('now', '+30 days')`;
        }
        if (filters.fromDate) {
            query += ` AND date(t.son_kullanim_tarihi) >= ?`;
            params.push(filters.fromDate);
        }
        if (filters.toDate) {
            query += ` AND date(t.son_kullanim_tarihi) <= ?`;
            params.push(filters.toDate);
        }
        
        const rows = db.prepare(query).all(...params);
        
        const saveDialog = await dialog.showSaveDialog({
            title: 'Excel Olarak Kaydet',
            defaultPath: 'tupler_export.xlsx',
            filters: [{ name: 'Excel', extensions: ['xlsx'] }]
        });
        
        if (saveDialog.canceled || !saveDialog.filePath) return { success: false, canceled: true };
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Tüpler");
        XLSX.writeFile(wb, saveDialog.filePath);
        
        logEvent('export_xlsx', 'Excel dışa aktarıldı', { count: rows.length }, 'export');
        return { success: true, path: saveDialog.filePath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ============== SEED (MOCK DATA) ==============
ipcMain.handle('seed:mockData', async () => {
    try {
        const QRCode = require('qrcode');
        
        const customersData = [
            { firma_adi: 'Marmaris Marina Hotel', yetkili: 'Ahmet Yılmaz', telefon: '0252 412 55 00', email: 'info@marmarismarina.com', adres: 'Barbaros Cad. No:15, Marmaris', not_text: 'VIP müşteri' },
            { firma_adi: 'Netsel Marina', yetkili: 'Mehmet Kaya', telefon: '0252 412 27 08', email: 'teknik@netselmarina.com', adres: 'Netsel Marina, Marmaris', not_text: 'Tekne tüpleri' },
            { firma_adi: 'Grand Yazıcı Club Turban', yetkili: 'Fatma Demir', telefon: '0252 417 10 00', email: 'guvenlik@yazicihotels.com', adres: 'Siteler Mah. Marmaris', not_text: '' },
            { firma_adi: 'Martı Resort Hotel', yetkili: 'Ali Çelik', telefon: '0252 455 34 40', email: 'teknik@martiresort.com', adres: 'İçmeler Mah. Marmaris', not_text: '' },
            { firma_adi: 'Marmaris Devlet Hastanesi', yetkili: 'Dr. Ayşe Öztürk', telefon: '0252 412 03 55', email: 'sivil.savunma@saglik.gov.tr', adres: 'Kemeraltı Mah. Marmaris', not_text: 'Kamu kurumu' },
            { firma_adi: 'Migros Marmaris', yetkili: 'Hasan Şahin', telefon: '0252 412 89 00', email: 'marmaris@migros.com.tr', adres: 'Ulusal Egemenlik Cad. Marmaris', not_text: '' },
            { firma_adi: 'Tansas AVM', yetkili: 'Zeynep Arslan', telefon: '0252 413 45 67', email: 'guvenlik@tansas.com', adres: 'Çamdibi Mah. Marmaris', not_text: '' },
            { firma_adi: 'Marmaris Belediyesi', yetkili: 'Mustafa Eren', telefon: '0252 412 10 03', email: 'itfaiye@marmaris.bel.tr', adres: 'Merkez, Marmaris', not_text: 'Resmi kurum' },
            { firma_adi: 'Blue Port AVM', yetkili: 'Cemil Yılmaz', telefon: '0252 412 66 77', email: 'info@blueport.com', adres: 'Kemal Elgin Bulvarı, Marmaris', not_text: '' },
            { firma_adi: 'Solaris Plaza', yetkili: 'Ayhan Kara', telefon: '0252 412 88 99', email: 'yonetim@solaris.com', adres: 'Tepe Mah. Marmaris', not_text: '' },
            { firma_adi: 'Green Nature Hotel', yetkili: 'Burak Demir', telefon: '0252 417 60 00', email: 'teknik@greennature.com', adres: 'Şirinyer Mah. Marmaris', not_text: '' },
            { firma_adi: 'Elegance Hotels', yetkili: 'Selin Yılmaz', telefon: '0252 417 70 00', email: 'info@elegance.com', adres: 'Uzunyalı, Marmaris', not_text: '' },
            { firma_adi: 'Pasa Beach Hotel', yetkili: 'Kemal Aydın', telefon: '0252 417 50 00', email: 'teknik@pasabeach.com', adres: 'Siteler, Marmaris', not_text: '' },
            { firma_adi: 'Marmaris Koleji', yetkili: 'Hülya Koç', telefon: '0252 412 11 22', email: 'info@marmariskoleji.k12.tr', adres: 'Armutalan, Marmaris', not_text: 'Okul' },
            { firma_adi: 'Özel Marmaris Hastanesi', yetkili: 'Dr. Can Yücel', telefon: '0252 413 55 66', email: 'info@ozelmarmaris.com', adres: 'Çıldır Mah. Marmaris', not_text: '' },
            { firma_adi: 'CarrefourSA Marmaris', yetkili: 'Emre Can', telefon: '0252 412 33 44', email: 'marmaris@carrefoursa.com', adres: 'Datça Yolu, Marmaris', not_text: '' },
            { firma_adi: 'Bim Mağazaları Bölge', yetkili: 'Serkan Taş', telefon: '0252 412 00 11', email: 'bolge@bim.com.tr', adres: 'Belenbaşı, Marmaris', not_text: '' },
            { firma_adi: 'A101 Mağazaları', yetkili: 'Murat Su', telefon: '0252 412 22 33', email: 'bolge@a101.com.tr', adres: 'Armutalan, Marmaris', not_text: '' },
            { firma_adi: 'Marmaris Sanayi Koop', yetkili: 'Veli Usta', telefon: '0252 412 99 88', email: 'sanayi@kooperatif.com', adres: 'Sanayi Sitesi, Marmaris', not_text: '' },
            { firma_adi: 'Yat Limanı İşletmesi', yetkili: 'Kaptan Jack', telefon: '0252 412 77 66', email: 'liman@marmaris.com', adres: 'Yat Limanı, Marmaris', not_text: '' }
        ];

        const insertCustomer = db.prepare(`
            INSERT INTO customers (firma_adi, yetkili, telefon, email, adres, not_text)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const customerIds = [];
        for (const c of customersData) {
            const result = insertCustomer.run(c.firma_adi, c.yetkili, c.telefon, c.email, c.adres, c.not_text);
            customerIds.push(result.lastInsertRowid);
        }

        function addDays(date, days) {
            const result = new Date(date);
            result.setDate(result.getDate() + days);
            return result;
        }

        function formatDate(date) {
            return date.toISOString().split('T')[0];
        }

        const today = new Date();

        const tubeScenarios = [
            { customerIndex: 0, tupCinsi: 'KKT (Dry Chemical Powder)', daysFromNow: 365 },
            { customerIndex: 0, tupCinsi: 'CO2 (Carbon Dioxide)', daysFromNow: 300 },
            { customerIndex: 1, tupCinsi: 'Tekne Tipi (Marine)', daysFromNow: 400 },
            { customerIndex: 1, tupCinsi: 'Oksijen (Oxygen)', daysFromNow: 350 },
            { customerIndex: 2, tupCinsi: 'KKT (Dry Chemical Powder)', daysFromNow: 280 },
            { customerIndex: 2, tupCinsi: 'FM200', daysFromNow: 500 },
            { customerIndex: 3, tupCinsi: 'Köpüklü (Foam)', daysFromNow: 200 },
            { customerIndex: 4, tupCinsi: 'Davlumbaz Tipi (Hood System)', daysFromNow: 180 },
            { customerIndex: 0, tupCinsi: 'KKT (Dry Chemical Powder)', daysFromNow: 25 },
            { customerIndex: 1, tupCinsi: 'Tekne Tipi (Marine)', daysFromNow: 15 },
            { customerIndex: 2, tupCinsi: 'CO2 (Carbon Dioxide)', daysFromNow: 28 },
            { customerIndex: 3, tupCinsi: 'Ekobiyolojik (Eco-Biological)', daysFromNow: 10 },
            { customerIndex: 5, tupCinsi: 'Halokarbon (Halocarbon)', daysFromNow: 5 },
            { customerIndex: 6, tupCinsi: 'Köpüklü (Foam)', daysFromNow: 20 },
            { customerIndex: 4, tupCinsi: 'Su (Water)', daysFromNow: -10 },
            { customerIndex: 5, tupCinsi: 'KKT (Dry Chemical Powder)', daysFromNow: -30 },
            { customerIndex: 6, tupCinsi: 'CO2 (Carbon Dioxide)', daysFromNow: -5 },
            { customerIndex: 7, tupCinsi: 'KKT (Dry Chemical Powder)', daysFromNow: -60 },
            { customerIndex: 7, tupCinsi: 'Köpüklü (Foam)', daysFromNow: -15 },
            { customerIndex: 3, tupCinsi: 'FM200', daysFromNow: -2 }
        ];

        const insertTube = db.prepare(`
            INSERT INTO tubes (customer_id, tup_cinsi, seri_no, yil, sira_no, dolum_tarihi, son_kullanim_tarihi, qr_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let addedCount = 0;

        for (const scenario of tubeScenarios) {
            const customerId = customerIds[scenario.customerIndex];
            if (!customerId) continue;

            const customer = customersData[scenario.customerIndex];
            const { seriNo, yil, siraNo } = getNextSerialNumber();

            const sonKullanim = addDays(today, scenario.daysFromNow);
            const dolumTarihi = addDays(sonKullanim, -365);

            // QR içeriği - Portal URL'sine yönlendir
            const qrContent = getPortalURL(seriNo, getLocalIP);

            const qrFileName = `${seriNo.replace('-', '_')}.png`;
            const qrFilePath = path.join(getQRPath(), qrFileName);

            await QRCode.toFile(qrFilePath, qrContent, { width: 300, margin: 2 });

            insertTube.run(
                customerId,
                scenario.tupCinsi,
                seriNo,
                yil,
                siraNo,
                formatDate(dolumTarihi),
                formatDate(sonKullanim),
                qrFilePath
            );

            addedCount++;
        }

        return { 
            success: true, 
            message: `${customerIds.length} müşteri ve ${addedCount} tüp eklendi.`,
            customers: customerIds.length,
            tubes: addedCount
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ============== LABEL BULK ==============
ipcMain.handle('label:printBulk', async (event, tubeIds) => {
    try {
        const { BrowserWindow } = require('electron');
        const tubes = [];
        for (const id of tubeIds) {
            const tube = db.prepare(`SELECT t.*, c.firma_adi FROM tubes t JOIN customers c ON t.customer_id = c.id WHERE t.id = ?`).get(id);
            if (tube) {
                if (tube.qr_path && fs.existsSync(tube.qr_path)) {
                    const qrBuf = fs.readFileSync(tube.qr_path);
                    tube.qrBase64 = `data:image/png;base64,${qrBuf.toString('base64')}`;
                }
                tubes.push(tube);
            }
        }
        if (tubes.length === 0) return { success: false, error: 'Etiket bulunamadı' };
        
        const html = `
        <!DOCTYPE html><html><head><meta charset="UTF-8">
        <style>@media print { body { margin: 0; padding: 0; } .etiket { page-break-after: always; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; text-align:center; } }</style>
        </head><body>
            ${tubes.map(tube => `
                <div class="etiket"><h1>${tube.seri_no}</h1><h2>${tube.firma_adi}</h2><p>${tube.tup_cinsi}</p>${tube.qrBase64 ? `<img src="${tube.qrBase64}" width="150">` : ''}</div>
            `).join('')}
            <script>window.onload=()=>{window.print();}</script></body></html>`;
        
        const win = new BrowserWindow({ show: false });
        win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
        win.webContents.on('did-finish-load', () => { win.webContents.print({ silent: false }, () => { win.close(); }); });
        return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
});

// ============== SERVICE FORMS ==============
ipcMain.handle('service:create', async (event, payload) => {
    try {
        const { tubeId, technician, notes, signatureDataUrl } = payload;
        const tube = db.prepare('SELECT customer_id FROM tubes WHERE id = ?').get(tubeId);
        if (!tube) throw new Error('Tüp bulunamadı');
        
        let signaturePath = null;
        if (signatureDataUrl) {
            const base64Data = signatureDataUrl.replace(/^data:image\/png;base64,/, "");
            const fileName = `sig_${Date.now()}_${tubeId}.png`;
            const sigPath = path.join(app.getPath('userData'), 'data', 'signatures');
            if (!fs.existsSync(sigPath)) fs.mkdirSync(sigPath, { recursive: true });
            signaturePath = path.join(sigPath, fileName);
            fs.writeFileSync(signaturePath, base64Data, 'base64');
        }
        const stmt = db.prepare('INSERT INTO service_forms (tube_id, customer_id, technician, notes, signature_path) VALUES (?, ?, ?, ?, ?)');
        const result = stmt.run(tubeId, tube.customer_id, technician, notes, signaturePath);
        logEvent('service_create', 'Servis formu oluşturuldu', { tubeId }, 'service', result.lastInsertRowid);
        return { success: true, id: result.lastInsertRowid };
    } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle('service:list', async (event, tubeId) => {
    try {
        const rows = db.prepare('SELECT * FROM service_forms WHERE tube_id = ? ORDER BY created_at DESC').all(tubeId);
        return { success: true, data: rows };
    } catch (error) { return { success: false, error: error.message }; }
});

// Logo path helper
function getLogoPath() {
    const p = path.join(app.getPath('userData'), 'logos');
    if (!fs.existsSync(p)) { fs.mkdirSync(p, { recursive: true }); }
    return p;
}

// ============== PORTAL ==============
// Portal bilgilerini al
ipcMain.handle('portal:getInfo', async () => {
    try {
        const ip = getLocalIP();
        return {
            success: true,
            data: {
                url: `http://${ip}:3456`,
                ip: ip,
                port: 3456
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Tüp için portal URL'si al
ipcMain.handle('portal:getTubeURL', async (event, seriNo) => {
    try {
        const url = getPortalURL(seriNo, getLocalIP);
        return { success: true, url };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ============== SETTINGS ==============
ipcMain.handle('settings:get', async () => {
    try {
        const row = db.prepare('SELECT * FROM settings WHERE id = 1').get();
        if (row && row.logo_path && fs.existsSync(row.logo_path)) {
            const buf = fs.readFileSync(row.logo_path);
            row.logoBase64 = `data:image/png;base64,${buf.toString('base64')}`;
        }
        return { success: true, data: row };
    } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle('settings:save', async (event, settings) => {
    try {
        const stmt = db.prepare('UPDATE settings SET company_name = ?, phone = ?, address = ?, email = ?, website = ?, logo_path = ? WHERE id = 1');
        stmt.run(settings.company_name, settings.phone, settings.address, settings.email, settings.website, settings.logo_path);
        logEvent('settings_update', 'Firma ayarları güncellendi', {}, 'settings', 1);
        return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle('settings:uploadLogo', async () => {
    try {
        const { dialog } = require('electron');
        const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Resimler', extensions: ['png', 'jpg', 'jpeg'] }] });
        if (result.canceled || result.filePaths.length === 0) return { success: false, canceled: true };
        const sourcePath = result.filePaths[0];
        const ext = path.extname(sourcePath);
        const fileName = `logo_${Date.now()}${ext}`;
        const destPath = path.join(getLogoPath(), fileName);
        fs.copyFileSync(sourcePath, destPath);
        const buf = fs.readFileSync(destPath);
        const base64 = `data:image/${ext.replace('.','')};base64,${buf.toString('base64')}`;
        return { success: true, path: destPath, base64 };
    } catch (error) { return { success: false, error: error.message }; }
});

// ============== SERVICE PRINT ==============
ipcMain.handle('service:print', async (event, serviceId) => {
    try {
        const { BrowserWindow } = require('electron');
        const row = db.prepare(`
            SELECT sf.*, t.seri_no, t.tup_cinsi, t.kilo, t.dolum_tarihi, t.son_kullanim_tarihi,
                   c.firma_adi, c.yetkili, c.telefon, c.adres
            FROM service_forms sf
            JOIN tubes t ON sf.tube_id = t.id
            JOIN customers c ON sf.customer_id = c.id
            WHERE sf.id = ?
        `).get(serviceId);
        if (!row) return { success: false, error: 'Servis formu bulunamadı' };

        let sigBase64 = '';
        if (row.signature_path && fs.existsSync(row.signature_path)) {
            const buf = fs.readFileSync(row.signature_path);
            sigBase64 = `data:image/png;base64,${buf.toString('base64')}`;
        }

        const formatTarih = (tarih) => new Date(tarih).toLocaleDateString('tr-TR');
        const formNo = `SF-${row.seri_no}-${serviceId.toString().padStart(4, '0')}`;
        
        const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Servis Formu</title>
<style>
@page { size: A4; margin: 15mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #fff; color: #1a1a1a; font-size: 11pt; }
.page { max-width: 210mm; margin: 0 auto; padding: 20px; border: 2px solid #c41e3a; }
.header { display: flex; justify-content: space-between; border-bottom: 3px solid #c41e3a; padding-bottom: 15px; margin-bottom: 20px; }
.company-info h1 { font-size: 18pt; color: #c41e3a; }
.company-info p { font-size: 9pt; color: #555; }
.form-meta { text-align: right; background: #f8f8f8; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
.form-no { font-size: 14pt; font-weight: 800; color: #c41e3a; }
.section-title { background: #c41e3a; color: #fff; padding: 8px 15px; font-weight: 700; margin: 15px 0 10px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
th { background: #f5f5f5; font-size: 9pt; width: 25%; }
.notes-box { border: 1px solid #ccc; padding: 15px; min-height: 80px; background: #fafafa; }
.sig-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; border-top: 2px dashed #ccc; padding-top: 20px; }
.sig-box { text-align: center; }
.sig-area { border: 1px solid #999; height: 80px; display: flex; align-items: center; justify-content: center; }
.sig-area img { max-height: 70px; }
.footer { margin-top: 20px; padding-top: 10px; border-top: 2px solid #c41e3a; font-size: 8pt; color: #666; display: flex; justify-content: space-between; }
</style></head><body>
<div class="page">
    <div class="header">
        <div class="company-info"><h1>MARMARİS ÜÇLER YANGIN</h1><p>Yangın Söndürme Cihazları - Dolum ve Bakım</p></div>
        <div class="form-meta"><div class="form-no">${formNo}</div><div>${formatTarih(row.created_at)}</div></div>
    </div>
    <div class="section-title">Müşteri Bilgileri</div>
    <table><tr><th>Firma</th><td colspan="3">${row.firma_adi}</td></tr><tr><th>Yetkili</th><td>${row.yetkili || '-'}</td><th>Telefon</th><td>${row.telefon || '-'}</td></tr><tr><th>Adres</th><td colspan="3">${row.adres || '-'}</td></tr></table>
    <div class="section-title">Cihaz Bilgileri</div>
    <table><tr><th>Barkod No</th><td>${row.seri_no}</td><th>Cinsi</th><td>${row.tup_cinsi}</td></tr><tr><th>Kilo</th><td>${row.kilo || '-'} KG</td><th>Son Kullanım</th><td>${formatTarih(row.son_kullanim_tarihi)}</td></tr><tr><th>Teknisyen</th><td colspan="3">${row.technician || '-'}</td></tr></table>
    <div class="section-title">Notlar</div>
    <div class="notes-box">${row.notes ? row.notes.replace(/\n/g, '<br>') : '-'}</div>
    <div class="sig-section">
        <div class="sig-box"><div style="font-size:9pt;margin-bottom:5px;">Müşteri İmzası</div><div class="sig-area">${sigBase64 ? `<img src="${sigBase64}">` : '-'}</div><div style="margin-top:5px;">${row.yetkili || ''}</div></div>
        <div class="sig-box"><div style="font-size:9pt;margin-bottom:5px;">Teknisyen</div><div class="sig-area">-</div><div style="margin-top:5px;">${row.technician || ''}</div></div>
    </div>
    <div class="footer"><div>Bu belge resmi servis kaydıdır.</div><div>Form No: ${formNo}</div></div>
</div>
<script>window.onload=()=>{window.print();}</script></body></html>`;

        const win = new BrowserWindow({ width: 900, height: 700, show: true, webPreferences: { nodeIntegration: false, contextIsolation: true } });
        win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
        win.webContents.on('did-finish-load', () => {
            setTimeout(() => { if (!win.isDestroyed()) win.webContents.print({ silent: false, printBackground: true }, () => { if (!win.isDestroyed()) win.close(); }); }, 300);
        });
        logEvent('service_print', `Servis formu yazdırıldı: ${row.seri_no}`, { serviceId }, 'service', serviceId);
        return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle('service:printToPDF', async (event, serviceId) => {
    try {
        const { BrowserWindow, dialog } = require('electron');
        const row = db.prepare(`
            SELECT sf.*, t.seri_no, t.tup_cinsi, t.kilo, t.dolum_tarihi, t.son_kullanim_tarihi,
                   c.firma_adi, c.yetkili, c.telefon, c.adres
            FROM service_forms sf
            JOIN tubes t ON sf.tube_id = t.id
            JOIN customers c ON sf.customer_id = c.id
            WHERE sf.id = ?
        `).get(serviceId);
        if (!row) return { success: false, error: 'Servis formu bulunamadı' };

        const saveDialog = await dialog.showSaveDialog({ title: 'PDF Kaydet', defaultPath: `servis_${row.seri_no}.pdf`, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
        if (saveDialog.canceled || !saveDialog.filePath) return { success: false, canceled: true };

        let sigBase64 = '';
        if (row.signature_path && fs.existsSync(row.signature_path)) {
            const buf = fs.readFileSync(row.signature_path);
            sigBase64 = `data:image/png;base64,${buf.toString('base64')}`;
        }

        const formatTarih = (tarih) => new Date(tarih).toLocaleDateString('tr-TR');
        const formNo = `SF-${row.seri_no}-${serviceId.toString().padStart(4, '0')}`;
        
        const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Servis Formu</title>
<style>
@page { size: A4; margin: 15mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #fff; color: #1a1a1a; font-size: 11pt; }
.page { max-width: 210mm; margin: 0 auto; padding: 20px; border: 2px solid #c41e3a; }
.header { display: flex; justify-content: space-between; border-bottom: 3px solid #c41e3a; padding-bottom: 15px; margin-bottom: 20px; }
.company-info h1 { font-size: 18pt; color: #c41e3a; }
.company-info p { font-size: 9pt; color: #555; }
.form-meta { text-align: right; background: #f8f8f8; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
.form-no { font-size: 14pt; font-weight: 800; color: #c41e3a; }
.section-title { background: #c41e3a; color: #fff; padding: 8px 15px; font-weight: 700; margin: 15px 0 10px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
th { background: #f5f5f5; font-size: 9pt; width: 25%; }
.notes-box { border: 1px solid #ccc; padding: 15px; min-height: 80px; background: #fafafa; }
.sig-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; border-top: 2px dashed #ccc; padding-top: 20px; }
.sig-box { text-align: center; }
.sig-area { border: 1px solid #999; height: 80px; display: flex; align-items: center; justify-content: center; }
.sig-area img { max-height: 70px; }
.footer { margin-top: 20px; padding-top: 10px; border-top: 2px solid #c41e3a; font-size: 8pt; color: #666; display: flex; justify-content: space-between; }
</style></head><body>
<div class="page">
    <div class="header">
        <div class="company-info"><h1>MARMARİS ÜÇLER YANGIN</h1><p>Yangın Söndürme Cihazları - Dolum ve Bakım</p></div>
        <div class="form-meta"><div class="form-no">${formNo}</div><div>${formatTarih(row.created_at)}</div></div>
    </div>
    <div class="section-title">Müşteri Bilgileri</div>
    <table><tr><th>Firma</th><td colspan="3">${row.firma_adi}</td></tr><tr><th>Yetkili</th><td>${row.yetkili || '-'}</td><th>Telefon</th><td>${row.telefon || '-'}</td></tr><tr><th>Adres</th><td colspan="3">${row.adres || '-'}</td></tr></table>
    <div class="section-title">Cihaz Bilgileri</div>
    <table><tr><th>Barkod No</th><td>${row.seri_no}</td><th>Cinsi</th><td>${row.tup_cinsi}</td></tr><tr><th>Kilo</th><td>${row.kilo || '-'} KG</td><th>Son Kullanım</th><td>${formatTarih(row.son_kullanim_tarihi)}</td></tr><tr><th>Teknisyen</th><td colspan="3">${row.technician || '-'}</td></tr></table>
    <div class="section-title">Notlar</div>
    <div class="notes-box">${row.notes ? row.notes.replace(/\n/g, '<br>') : '-'}</div>
    <div class="sig-section">
        <div class="sig-box"><div style="font-size:9pt;margin-bottom:5px;">Müşteri İmzası</div><div class="sig-area">${sigBase64 ? `<img src="${sigBase64}">` : '-'}</div><div style="margin-top:5px;">${row.yetkili || ''}</div></div>
        <div class="sig-box"><div style="font-size:9pt;margin-bottom:5px;">Teknisyen</div><div class="sig-area">-</div><div style="margin-top:5px;">${row.technician || ''}</div></div>
    </div>
    <div class="footer"><div>Bu belge resmi servis kaydıdır.</div><div>Form No: ${formNo}</div></div>
</div></body></html>`;

        const win = new BrowserWindow({ width: 900, height: 700, show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
        await new Promise((resolve) => {
            win.webContents.once('did-finish-load', () => resolve());
            win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
        });
        const pdfData = await win.webContents.printToPDF({ printBackground: true, pageSize: 'A4' });
        fs.writeFileSync(saveDialog.filePath, pdfData);
        if (!win.isDestroyed()) win.close();
        logEvent('service_pdf', `Servis PDF kaydedildi: ${row.seri_no}`, { serviceId, path: saveDialog.filePath }, 'service', serviceId);
        return { success: true, path: saveDialog.filePath };
    } catch (error) { return { success: false, error: error.message }; }
});


// ============== VERİTABANI ANALİZ ARAÇLARI ==============

// Veritabanı analizi
ipcMain.handle('database:analyze', async () => {
    try {
        const analysis = {
            tables: [],
            indexes: [],
            statistics: {},
            issues: [],
            recommendations: []
        };
        
        // Tablo bilgileri
        const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all();
        for (const table of tables) {
            const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get().count;
            const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
            analysis.tables.push({
                name: table.name,
                rowCount: count,
                columns: columns.map(c => ({
                    name: c.name,
                    type: c.type,
                    notNull: c.notnull === 1,
                    primaryKey: c.pk === 1
                }))
            });
        }
        
        // İndeks bilgileri
        const indexes = db.prepare(`SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL`).all();
        analysis.indexes = indexes.map(idx => ({
            name: idx.name,
            table: idx.tbl_name
        }));
        
        // İstatistikler
        analysis.statistics = {
            totalCustomers: db.prepare('SELECT COUNT(*) as c FROM customers').get().c,
            totalTubes: db.prepare('SELECT COUNT(*) as c FROM tubes').get().c,
            expiredTubes: db.prepare(`SELECT COUNT(*) as c FROM tubes WHERE date(son_kullanim_tarihi) < date('now')`).get().c,
            expiringTubes: db.prepare(`SELECT COUNT(*) as c FROM tubes WHERE date(son_kullanim_tarihi) >= date('now') AND date(son_kullanim_tarihi) <= date('now', '+30 days')`).get().c,
            totalLogs: db.prepare('SELECT COUNT(*) as c FROM logs').get().c,
            totalServiceForms: db.prepare('SELECT COUNT(*) as c FROM service_forms').get().c
        };
        
        // Sorun tespiti
        // 1. Yetim kayıtlar (orphan records)
        const orphanTubes = db.prepare(`
            SELECT COUNT(*) as c FROM tubes t 
            LEFT JOIN customers c ON t.customer_id = c.id 
            WHERE c.id IS NULL
        `).get().c;
        if (orphanTubes > 0) {
            analysis.issues.push({
                type: 'error',
                message: `${orphanTubes} adet yetim tüp kaydı bulundu (müşterisi silinmiş)`
            });
        }
        
        // 2. Boş firma adı
        const emptyFirma = db.prepare(`SELECT COUNT(*) as c FROM customers WHERE firma_adi IS NULL OR trim(firma_adi) = ''`).get().c;
        if (emptyFirma > 0) {
            analysis.issues.push({
                type: 'warning',
                message: `${emptyFirma} adet boş firma adlı müşteri bulundu`
            });
        }
        
        // 3. Geçersiz tarihler
        const invalidDates = db.prepare(`
            SELECT COUNT(*) as c FROM tubes 
            WHERE date(dolum_tarihi) >= date(son_kullanim_tarihi)
        `).get().c;
        if (invalidDates > 0) {
            analysis.issues.push({
                type: 'warning',
                message: `${invalidDates} adet tüpte dolum tarihi >= son kullanım tarihi`
            });
        }
        
        // 4. Tüp yıl sayacı tutarlılığı
        const tubeCounters = db.prepare("SELECT year, counter FROM counters WHERE counter_type = 'tube'").all();
        for (const tc of tubeCounters) {
            const actualCount = db.prepare('SELECT COUNT(*) as c FROM tubes WHERE yil = ?').get(tc.year).c;
            const maxSira = db.prepare('SELECT MAX(sira_no) as m FROM tubes WHERE yil = ?').get(tc.year).m || 0;
            if (tc.counter < maxSira) {
                analysis.issues.push({
                    type: 'error',
                    message: `${tc.year} yılı için tüp sayacı tutarsız: Sayaç=${tc.counter}, Max sıra=${maxSira}`
                });
            }
        }
        
        // Öneriler
        if (analysis.indexes.length < 5) {
            analysis.recommendations.push('Performans için ek indeksler önerilir');
        }
        if (analysis.statistics.totalLogs > 10000) {
            analysis.recommendations.push('Log tablosu büyümüş, eski kayıtları temizlemeyi düşünün');
        }
        
        // Veritabanı boyutu
        const dbPath = path.join(getDataPath(), 'ucleryangin.db');
        if (fs.existsSync(dbPath)) {
            const stats = fs.statSync(dbPath);
            analysis.statistics.dbSize = stats.size;
            analysis.statistics.dbSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        }
        
        // Sorun yoksa
        if (analysis.issues.length === 0) {
            analysis.issues.push({
                type: 'success',
                message: 'Veritabanı sağlıklı, herhangi bir sorun bulunamadı'
            });
        }
        
        return { success: true, data: analysis };
    } catch (error) {
        console.error('Veritabanı analiz hatası:', error);
        return { success: false, error: error.message };
    }
});

// Veritabanı sıkıştırma (VACUUM)
ipcMain.handle('database:vacuum', async () => {
    try {
        const dbPath = path.join(getDataPath(), 'ucleryangin.db');
        const beforeSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;
        
        db.exec('VACUUM');
        
        const afterSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;
        const saved = beforeSize - afterSize;
        
        logEvent('database_vacuum', 'Veritabanı sıkıştırıldı', { beforeSize, afterSize, saved }, 'system');
        
        return { 
            success: true, 
            beforeSize,
            afterSize,
            savedBytes: saved,
            savedMB: (saved / (1024 * 1024)).toFixed(2)
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Veritabanı bütünlük kontrolü
ipcMain.handle('database:integrity', async () => {
    try {
        const result = db.pragma('integrity_check');
        const isOk = result.length === 1 && result[0].integrity_check === 'ok';
        
        return { 
            success: true, 
            isOk,
            details: result
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Harici URL açma (WhatsApp, email, telefon vb.)
ipcMain.handle('shell:openExternal', async (event, url) => {
    try {
        const { shell } = require('electron');
        await shell.openExternal(url);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ============== SERTİFİKA İŞLEMLERİ ==============

// Sertifika numarası üret
function generateCertificateNumber() {
    const currentYear = new Date().getFullYear();
    
    // Sertifika sayacını al veya oluştur
    let row = db.prepare('SELECT counter FROM counters WHERE counter_type = ? AND year = ?').get('certificate', currentYear);
    
    if (!row) {
        db.prepare('INSERT INTO counters (counter_type, year, counter) VALUES (?, ?, 0)').run('certificate', currentYear);
        row = { counter: 0 };
    }
    
    const newSira = row.counter + 1;
    db.prepare('UPDATE counters SET counter = ? WHERE counter_type = ? AND year = ?').run(newSira, 'certificate', currentYear);
    
    // Format: 2026-000001 (6 haneli)
    const certNumber = `${currentYear}-${String(newSira).padStart(6, '0')}`;
    return certNumber;
}

// Sertifika PDF oluştur
async function generateCertificatePDF(certificateData) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ 
                size: 'A4',
                margins: { top: 40, bottom: 40, left: 50, right: 50 }
            });
            
            const pdfFileName = `sertifika_${certificateData.certificate_number.replace('-', '_')}.pdf`;
            const pdfPath = path.join(getCertificatePath(), pdfFileName);
            const stream = fs.createWriteStream(pdfPath);
            
            doc.pipe(stream);
            
            // Türkçe karakter desteği için Windows fontlarını kullan
            const arialPath = 'C:/Windows/Fonts/arial.ttf';
            const arialBoldPath = 'C:/Windows/Fonts/arialbd.ttf';
            
            // Fontları kaydet
            if (fs.existsSync(arialPath)) {
                doc.registerFont('Arial', arialPath);
                doc.registerFont('Arial-Bold', arialBoldPath);
            }
            
            const fontRegular = fs.existsSync(arialPath) ? 'Arial' : 'Helvetica';
            const fontBold = fs.existsSync(arialBoldPath) ? 'Arial-Bold' : 'Helvetica-Bold';
            
            // Firma ayarlarını al
            const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
            const companyName = settings?.company_name || 'ÜÇLER YANGIN';
            const companyPhone = settings?.phone || '';
            const companyAddress = settings?.address || '';
            const companyEmail = settings?.email || '';
            
            // ===== BAŞLIK BÖLÜMÜ =====
            // Logo varsa ekle
            if (settings?.logo_path && fs.existsSync(settings.logo_path)) {
                try {
                    doc.image(settings.logo_path, 50, 40, { width: 80 });
                } catch (e) {
                    console.warn('Logo yüklenemedi:', e.message);
                }
            }
            
            // Firma Adı
            doc.fontSize(22).font(fontBold).fillColor('#111827')
               .text(companyName, 140, 50, { align: 'left' });
            
            // Firma iletişim bilgileri
            doc.fontSize(10).font(fontRegular).fillColor('#475569')
               .text(`${companyPhone} | ${companyEmail}`, 140, 75)
               .text(companyAddress, 140, 88);
            
            // Çizgi
            doc.strokeColor('#e2e8f0').lineWidth(1)
               .moveTo(50, 120).lineTo(545, 120).stroke();
            
            // ===== SERTİFİKA BAŞLIĞI =====
            doc.fontSize(18).font(fontBold).fillColor('#dc2626')
               .text('YANGIN TÜPÜ BAKIM VE DOLUM SERTİFİKASI', 50, 140, { align: 'center' });
            
            // Sertifika Numarası kutusu
            doc.roundedRect(180, 175, 235, 35, 5).fillAndStroke('#fef2f2', '#fecaca');
            doc.fontSize(14).font(fontBold).fillColor('#991b1b')
               .text(`Sertifika No: ${certificateData.certificate_number}`, 50, 185, { align: 'center' });
            
            // ===== BİLGİ BÖLÜMÜ =====
            const infoStartY = 235;
            const leftCol = 50;
            const rightCol = 300;
            const lineHeight = 28;
            
            // Sol kolon - Müşteri Bilgileri
            doc.fontSize(12).font(fontBold).fillColor('#111827')
               .text('MÜŞTERİ BİLGİLERİ', leftCol, infoStartY);
            
            doc.fontSize(10).font(fontRegular).fillColor('#475569');
            let y = infoStartY + 25;
            
            doc.font(fontBold).fillColor('#111827').text('Firma Adı:', leftCol, y);
            doc.font(fontRegular).fillColor('#1f2937').text(certificateData.firma_adi, leftCol + 70, y);
            y += lineHeight;
            
            if (certificateData.yetkili) {
                doc.font(fontBold).fillColor('#111827').text('Yetkili:', leftCol, y);
                doc.font(fontRegular).fillColor('#1f2937').text(certificateData.yetkili, leftCol + 70, y);
                y += lineHeight;
            }
            
            if (certificateData.adres) {
                doc.font(fontBold).fillColor('#111827').text('Adres:', leftCol, y);
                doc.font(fontRegular).fillColor('#1f2937').text(certificateData.adres, leftCol + 70, y, { width: 180 });
                y += lineHeight + 10;
            }
            
            // Sağ kolon - Tüp Bilgileri
            doc.fontSize(12).font(fontBold).fillColor('#111827')
               .text('TÜP BİLGİLERİ', rightCol, infoStartY);
            
            y = infoStartY + 25;
            
            doc.fontSize(10).font(fontBold).fillColor('#111827').text('Barkod No:', rightCol, y);
            doc.font(fontBold).fillColor('#dc2626').text(certificateData.seri_no, rightCol + 80, y);
            y += lineHeight;
            
            doc.font(fontBold).fillColor('#111827').text('Tüp Cinsi:', rightCol, y);
            doc.font(fontRegular).fillColor('#1f2937').text(certificateData.tup_cinsi, rightCol + 80, y);
            y += lineHeight;
            
            doc.font(fontBold).fillColor('#111827').text('Kapasite:', rightCol, y);
            doc.font(fontRegular).fillColor('#1f2937').text(`${certificateData.kilo || 6} KG`, rightCol + 80, y);
            y += lineHeight;
            
            doc.font(fontBold).fillColor('#111827').text('Dolum Tarihi:', rightCol, y);
            doc.font(fontRegular).fillColor('#1f2937').text(formatDateTR(certificateData.dolum_tarihi), rightCol + 80, y);
            y += lineHeight;
            
            doc.font(fontBold).fillColor('#111827').text('Son Kullanım:', rightCol, y);
            doc.font(fontBold).fillColor('#dc2626').text(formatDateTR(certificateData.son_kullanim_tarihi), rightCol + 80, y);
            
            // ===== QR KOD BÖLÜMÜ =====
            const qrY = 420;
            
            // QR kod kutusu
            doc.roundedRect(50, qrY, 150, 150, 8).stroke('#e2e8f0');
            
            // QR kod varsa ekle
            if (certificateData.qr_path && fs.existsSync(certificateData.qr_path)) {
                try {
                    doc.image(certificateData.qr_path, 60, qrY + 10, { width: 130 });
                } catch (e) {
                    doc.fontSize(10).font(fontRegular).fillColor('#94a3b8').text('QR Kod', 100, qrY + 65);
                }
            } else {
                doc.fontSize(10).font(fontRegular).fillColor('#94a3b8').text('QR Kod Yok', 95, qrY + 65);
            }
            
            doc.fontSize(8).font(fontRegular).fillColor('#64748b').text('QR kodu okutarak tüp bilgilerine ulaşabilirsiniz', 50, qrY + 160, { width: 150, align: 'center' });
            
            // ===== AÇIKLAMA KUTUSU =====
            doc.roundedRect(220, qrY, 325, 120, 8).fillAndStroke('#f8fafc', '#e2e8f0');
            
            doc.fontSize(11).font(fontBold).fillColor('#111827')
               .text('BAKIM VE DOLUM ONAYI', 235, qrY + 15);
            
            doc.fontSize(9).font(fontRegular).fillColor('#475569')
               .text('Bu sertifika, yukarıda bilgileri verilen yangın söndürme tüpünün,', 235, qrY + 40, { width: 295 })
               .text('TS 862, TS EN 3 ve ilgili yönetmeliklere uygun olarak bakım ve', 235, qrY + 55, { width: 295 })
               .text('dolum işleminin yapıldığını belgeler.', 235, qrY + 70, { width: 295 });
            
            doc.fontSize(9).font(fontBold).fillColor('#111827')
               .text(`Düzenleme Tarihi: ${formatDateTR(certificateData.issue_date)}`, 235, qrY + 95);
            
            // ===== İMZA BÖLÜMÜ =====
            const signY = 600;
            
            // Sol imza
            doc.fontSize(10).font(fontRegular).fillColor('#475569')
               .text('Teknisyen:', 50, signY);
            doc.moveTo(50, signY + 50).lineTo(200, signY + 50).stroke('#cbd5e1');
            doc.fontSize(9).font(fontRegular).fillColor('#94a3b8').text('İmza / Kaşe', 100, signY + 55);
            
            // Sağ imza
            doc.fontSize(10).font(fontRegular).fillColor('#475569')
               .text('Yetkili:', 350, signY);
            doc.moveTo(350, signY + 50).lineTo(500, signY + 50).stroke('#cbd5e1');
            doc.fontSize(9).font(fontRegular).fillColor('#94a3b8').text('İmza / Kaşe', 400, signY + 55);
            
            // ===== FOOTER =====
            doc.fontSize(8).font(fontRegular).fillColor('#94a3b8')
               .text('Bu sertifika elektronik olarak oluşturulmuştur.', 50, 750, { align: 'center' })
               .text(`${companyName} | ${companyPhone}`, 50, 762, { align: 'center' });
            
            // Kenarlık
            doc.rect(30, 25, 535, 780).stroke('#e2e8f0');
            
            doc.end();
            
            stream.on('finish', () => {
                resolve(pdfPath);
            });
            
            stream.on('error', reject);
            
        } catch (error) {
            reject(error);
        }
    });
}

// Tarih formatlama (TR)
function formatDateTR(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Sertifika oluştur
ipcMain.handle('certificate:create', async (event, tubeId, createdBy = 'Sistem') => {
    try {
        // Tüp ve müşteri bilgilerini al
        const tube = db.prepare(`
            SELECT t.*, c.firma_adi, c.yetkili, c.adres, c.telefon
            FROM tubes t
            JOIN customers c ON t.customer_id = c.id
            WHERE t.id = ?
        `).get(tubeId);
        
        if (!tube) {
            return { success: false, error: 'Tüp bulunamadı' };
        }
        
        // Sertifika numarası üret
        const certNumber = generateCertificateNumber();
        const issueDate = new Date().toISOString().split('T')[0];
        
        // Sertifika verilerini hazırla
        const certData = {
            certificate_number: certNumber,
            tube_id: tubeId,
            customer_id: tube.customer_id,
            issue_date: issueDate,
            firma_adi: tube.firma_adi,
            yetkili: tube.yetkili,
            adres: tube.adres,
            seri_no: tube.seri_no,
            tup_cinsi: tube.tup_cinsi,
            kilo: tube.kilo,
            dolum_tarihi: tube.dolum_tarihi,
            son_kullanim_tarihi: tube.son_kullanim_tarihi,
            qr_path: tube.qr_path
        };
        
        // PDF oluştur
        const pdfPath = await generateCertificatePDF(certData);
        
        // Veritabanına kaydet
        const stmt = db.prepare(`
            INSERT INTO certificates (certificate_number, tube_id, customer_id, issue_date, created_by, pdf_path)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(certNumber, tubeId, tube.customer_id, issueDate, createdBy, pdfPath);
        
        logEvent('certificate_create', `Sertifika oluşturuldu: ${certNumber}`, 
            { tubeId, seriNo: tube.seri_no, firma: tube.firma_adi }, 'certificate', result.lastInsertRowid);
        
        return { 
            success: true, 
            data: {
                id: result.lastInsertRowid,
                certificate_number: certNumber,
                pdf_path: pdfPath
            }
        };
        
    } catch (error) {
        console.error('Sertifika oluşturma hatası:', error);
        return { success: false, error: error.message };
    }
});

// Sertifikaları listele
ipcMain.handle('certificate:list', async (event, filters = {}) => {
    try {
        let sql = `
            SELECT c.*, t.seri_no, t.tup_cinsi, t.kilo, cu.firma_adi
            FROM certificates c
            JOIN tubes t ON c.tube_id = t.id
            JOIN customers cu ON c.customer_id = cu.id
            WHERE 1=1
        `;
        const params = [];
        
        if (filters.customerId) {
            sql += ' AND c.customer_id = ?';
            params.push(filters.customerId);
        }
        
        if (filters.search) {
            sql += ' AND (c.certificate_number LIKE ? OR cu.firma_adi LIKE ? OR t.seri_no LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        if (filters.fromDate) {
            sql += ' AND c.issue_date >= ?';
            params.push(filters.fromDate);
        }
        
        if (filters.toDate) {
            sql += ' AND c.issue_date <= ?';
            params.push(filters.toDate);
        }
        
        sql += ' ORDER BY c.created_at DESC';
        
        const certificates = db.prepare(sql).all(...params);
        return { success: true, data: certificates };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Sertifika detayı
ipcMain.handle('certificate:get', async (event, id) => {
    try {
        const cert = db.prepare(`
            SELECT c.*, t.seri_no, t.tup_cinsi, t.kilo, t.dolum_tarihi, t.son_kullanim_tarihi, t.qr_path,
                   cu.firma_adi, cu.yetkili, cu.adres, cu.telefon
            FROM certificates c
            JOIN tubes t ON c.tube_id = t.id
            JOIN customers cu ON c.customer_id = cu.id
            WHERE c.id = ?
        `).get(id);
        
        if (!cert) {
            return { success: false, error: 'Sertifika bulunamadı' };
        }
        
        return { success: true, data: cert };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Sertifika sil
ipcMain.handle('certificate:delete', async (event, id) => {
    try {
        // Sertifika bilgisini al
        const cert = db.prepare('SELECT certificate_number, pdf_path FROM certificates WHERE id = ?').get(id);
        
        if (!cert) {
            return { success: false, error: 'Sertifika bulunamadı' };
        }
        
        // PDF dosyasını sil
        if (cert.pdf_path && fs.existsSync(cert.pdf_path)) {
            try {
                fs.unlinkSync(cert.pdf_path);
            } catch (e) {
                console.warn('PDF silinemedi:', e.message);
            }
        }
        
        // Veritabanından sil
        db.prepare('DELETE FROM certificates WHERE id = ?').run(id);
        
        logEvent('certificate_delete', `Sertifika silindi: ${cert.certificate_number}`, { id }, 'certificate', id);
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Sertifika PDF aç
ipcMain.handle('certificate:openPDF', async (event, pdfPath) => {
    try {
        if (!fs.existsSync(pdfPath)) {
            return { success: false, error: 'PDF dosyası bulunamadı' };
        }
        await shell.openPath(pdfPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Tüpün sertifikası var mı kontrol et
ipcMain.handle('certificate:checkTube', async (event, tubeId) => {
    try {
        const cert = db.prepare('SELECT id, certificate_number, pdf_path FROM certificates WHERE tube_id = ? ORDER BY created_at DESC LIMIT 1').get(tubeId);
        return { success: true, hasCertificate: !!cert, data: cert };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// =============================================
// BUGÜN ARANACAKLAR İŞLEMLERİ
// =============================================

// Bugün aranacak müşterileri getir (7 gün içinde süresi dolacak tüpler)
ipcMain.handle('call:getTodayCalls', async (event, options = {}) => {
    try {
        const daysAhead = options.daysAhead || 7;
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + daysAhead);
        
        const todayStr = today.toISOString().split('T')[0];
        const futureDateStr = futureDate.toISOString().split('T')[0];
        
        // Son kullanım tarihine göre süresi dolacak tüpleri bul
        const query = `
            SELECT 
                c.id as customer_id,
                c.firma_adi,
                c.yetkili,
                c.telefon,
                c.adres,
                COUNT(t.id) as expiring_tube_count,
                MIN(t.son_kullanim_tarihi) as earliest_expiry,
                GROUP_CONCAT(t.id) as tube_ids,
                (SELECT cl.id FROM call_logs cl WHERE cl.customer_id = c.id AND DATE(cl.call_date) = ? ORDER BY cl.id DESC LIMIT 1) as todays_call_id,
                (SELECT cl.status FROM call_logs cl WHERE cl.customer_id = c.id AND DATE(cl.call_date) = ? ORDER BY cl.id DESC LIMIT 1) as call_status,
                (SELECT cl.notes FROM call_logs cl WHERE cl.customer_id = c.id AND DATE(cl.call_date) = ? ORDER BY cl.id DESC LIMIT 1) as call_notes
            FROM customers c
            INNER JOIN tubes t ON t.customer_id = c.id
            WHERE t.son_kullanim_tarihi BETWEEN ? AND ?
            GROUP BY c.id
            ORDER BY earliest_expiry ASC
        `;
        
        const customers = db.prepare(query).all(todayStr, todayStr, todayStr, todayStr, futureDateStr);
        
        return { success: true, data: customers };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Müşteriyi arandı olarak işaretle
ipcMain.handle('call:markAsCalled', async (event, data) => {
    try {
        const { customerId, status, notes } = data;
        
        // Bugünkü tarih
        const today = new Date().toISOString().split('T')[0];
        
        // Bugün için kayıt var mı kontrol et
        const existing = db.prepare('SELECT id FROM call_logs WHERE customer_id = ? AND DATE(call_date) = ?').get(customerId, today);
        
        if (existing) {
            // Güncelle
            db.prepare(`
                UPDATE call_logs 
                SET status = ?, notes = ?, updated_at = datetime('now', 'localtime')
                WHERE id = ?
            `).run(status || 'called', notes || null, existing.id);
        } else {
            // Yeni kayıt
            db.prepare(`
                INSERT INTO call_logs (customer_id, call_date, status, notes)
                VALUES (?, datetime('now', 'localtime'), ?, ?)
            `).run(customerId, status || 'called', notes || null);
        }
        
        logEvent('call_marked', `Müşteri arandı olarak işaretlendi`, { customerId, status }, 'call_log', customerId);
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Arama notu ekle
ipcMain.handle('call:addNote', async (event, data) => {
    try {
        const { customerId, notes } = data;
        
        db.prepare(`
            INSERT INTO call_logs (customer_id, call_date, status, notes)
            VALUES (?, datetime('now', 'localtime'), 'noted', ?)
        `).run(customerId, notes);
        
        logEvent('call_note', `Arama notu eklendi`, { customerId, notes }, 'call_log', customerId);
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Arama geçmişi
ipcMain.handle('call:getHistory', async (event, customerId) => {
    try {
        const logs = db.prepare(`
            SELECT * FROM call_logs 
            WHERE customer_id = ? 
            ORDER BY call_date DESC 
            LIMIT 50
        `).all(customerId);
        
        return { success: true, data: logs };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// =============================================
// TOPLU TÜP YENİLEME İŞLEMLERİ
// =============================================

// Müşterinin tüm tüplerini getir (toplu yenileme için)
ipcMain.handle('tube:getForBulkRenewal', async (event, customerId) => {
    try {
        const tubes = db.prepare(`
            SELECT 
                t.*,
                DATE(t.son_kontrol_tarihi, '+1 year') as expiry_date,
                CASE 
                    WHEN DATE(t.son_kontrol_tarihi, '+1 year') < DATE('now') THEN 'expired'
                    WHEN DATE(t.son_kontrol_tarihi, '+1 year') <= DATE('now', '+30 days') THEN 'expiring_soon'
                    ELSE 'valid'
                END as expiry_status
            FROM tubes t
            WHERE t.customer_id = ? AND t.durum = 'aktif'
            ORDER BY expiry_date ASC
        `).all(customerId);
        
        return { success: true, data: tubes };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Toplu tüp yenileme (dolum tarihi güncelle)
ipcMain.handle('tube:bulkRenew', async (event, data) => {
    try {
        const { tubeIds, newDate, generateCertificates } = data;
        
        if (!tubeIds || tubeIds.length === 0) {
            return { success: false, error: 'En az bir tüp seçmelisiniz' };
        }
        
        const renewalDate = newDate || new Date().toISOString().split('T')[0];
        
        const updateStmt = db.prepare(`
            UPDATE tubes 
            SET dolum_tarihi = ?, 
                son_kontrol_tarihi = ?,
                updated_at = datetime('now', 'localtime')
            WHERE id = ?
        `);
        
        const renewedTubes = [];
        
        for (const tubeId of tubeIds) {
            updateStmt.run(renewalDate, renewalDate, tubeId);
            renewedTubes.push(tubeId);
        }
        
        logEvent('bulk_renewal', `${tubeIds.length} tüp toplu yenilendi`, { tubeIds, newDate: renewalDate }, 'tube', null);
        
        return { 
            success: true, 
            renewedCount: renewedTubes.length,
            renewedTubeIds: renewedTubes,
            generateCertificates: generateCertificates
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// =============================================
// FİYAT YÖNETİMİ İŞLEMLERİ
// =============================================

// Fiyat ekle/güncelle
ipcMain.handle('price:save', async (event, data) => {
    try {
        const { id, tup_cinsi, kilo, dolum_fiyati, satis_fiyati, hortum_fiyati, aciklama } = data;
        
        if (id) {
            // Güncelle
            db.prepare(`
                UPDATE prices 
                SET tup_cinsi = ?, kilo = ?, dolum_fiyati = ?, satis_fiyati = ?, hortum_fiyati = ?, aciklama = ?, updated_at = datetime('now', 'localtime')
                WHERE id = ?
            `).run(tup_cinsi, kilo || null, dolum_fiyati || 0, satis_fiyati || 0, hortum_fiyati || 0, aciklama || null, id);
            
            logEvent('price_update', `Fiyat güncellendi: ${tup_cinsi}`, data, 'price', id);
        } else {
            // Yeni ekle
            const result = db.prepare(`
                INSERT INTO prices (tup_cinsi, kilo, dolum_fiyati, satis_fiyati, hortum_fiyati, aciklama)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(tup_cinsi, kilo || null, dolum_fiyati || 0, satis_fiyati || 0, hortum_fiyati || 0, aciklama || null);
            
            logEvent('price_create', `Fiyat eklendi: ${tup_cinsi}`, data, 'price', result.lastInsertRowid);
        }
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Fiyat listesi
ipcMain.handle('price:list', async () => {
    try {
        const prices = db.prepare('SELECT * FROM prices WHERE is_active = 1 ORDER BY tup_cinsi, kilo').all();
        return { success: true, data: prices };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Fiyat sil (soft delete)
ipcMain.handle('price:delete', async (event, id) => {
    try {
        db.prepare('UPDATE prices SET is_active = 0, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?').run(id);
        logEvent('price_delete', `Fiyat silindi`, { id }, 'price', id);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Fiyat getir (tüp cinsi ve kiloya göre)
ipcMain.handle('price:getByType', async (event, data) => {
    try {
        const { tup_cinsi, kilo } = data;
        
        let price;
        if (kilo) {
            price = db.prepare('SELECT * FROM prices WHERE tup_cinsi = ? AND kilo = ? AND is_active = 1').get(tup_cinsi, kilo);
        }
        
        if (!price) {
            price = db.prepare('SELECT * FROM prices WHERE tup_cinsi = ? AND kilo IS NULL AND is_active = 1').get(tup_cinsi);
        }
        
        return { success: true, data: price };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// =============================================
// TEKLİF YÖNETİMİ İŞLEMLERİ
// =============================================

// Teklif PDF oluştur
async function generateQuotePDF(quoteData) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ 
                size: 'A4',
                margins: { top: 40, bottom: 40, left: 50, right: 50 }
            });
            
            const pdfFileName = `teklif_${quoteData.quote_number.replace(/-/g, '_')}.pdf`;
            const pdfPath = path.join(getQuotePath(), pdfFileName);
            const stream = fs.createWriteStream(pdfPath);
            
            doc.pipe(stream);
            
            // Türkçe karakter desteği için Windows fontlarını kullan
            const arialPath = 'C:/Windows/Fonts/arial.ttf';
            const arialBoldPath = 'C:/Windows/Fonts/arialbd.ttf';
            
            if (fs.existsSync(arialPath)) {
                doc.registerFont('Arial', arialPath);
                doc.registerFont('Arial-Bold', arialBoldPath);
            }
            
            const fontRegular = fs.existsSync(arialPath) ? 'Arial' : 'Helvetica';
            const fontBold = fs.existsSync(arialBoldPath) ? 'Arial-Bold' : 'Helvetica-Bold';
            
            // Firma ayarlarını al
            const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
            const companyName = settings?.company_name || 'ÜÇLER YANGIN';
            const companyPhone = settings?.phone || '';
            const companyAddress = settings?.address || '';
            const companyEmail = settings?.email || '';
            
            // ===== BAŞLIK BÖLÜMÜ =====
            // Logo varsa ekle
            if (settings?.logo_path && fs.existsSync(settings.logo_path)) {
                try {
                    doc.image(settings.logo_path, 50, 40, { width: 80 });
                } catch (e) {
                    console.warn('Logo yüklenemedi:', e.message);
                }
            }
            
            // Firma Adı
            doc.fontSize(22).font(fontBold).fillColor('#111827')
               .text(companyName, 140, 50, { align: 'left' });
            
            // Firma iletişim bilgileri
            doc.fontSize(10).font(fontRegular).fillColor('#475569')
               .text(`${companyPhone} | ${companyEmail}`, 140, 75)
               .text(companyAddress, 140, 88);
            
            // Çizgi
            doc.strokeColor('#e2e8f0').lineWidth(1)
               .moveTo(50, 120).lineTo(545, 120).stroke();
            
            // ===== TEKLİF BAŞLIĞI =====
            doc.fontSize(20).font(fontBold).fillColor('#16a34a')
               .text('FİYAT TEKLİFİ', 50, 140, { align: 'center' });
            
            // Teklif Numarası kutusu
            doc.roundedRect(180, 170, 235, 30, 5).fillAndStroke('#f0fdf4', '#86efac');
            doc.fontSize(12).font(fontBold).fillColor('#166534')
               .text(`Teklif No: ${quoteData.quote_number}`, 50, 178, { align: 'center' });
            
            // ===== MÜŞTERİ VE TARİH BİLGİSİ =====
            const infoY = 220;
            
            // Sol - Müşteri Bilgileri
            doc.fontSize(11).font(fontBold).fillColor('#111827')
               .text('MÜŞTERİ BİLGİLERİ', 50, infoY);
            
            doc.fontSize(10).font(fontRegular).fillColor('#475569');
            let y = infoY + 20;
            
            doc.font(fontBold).text('Firma:', 50, y);
            doc.font(fontRegular).text(quoteData.firma_adi || '-', 100, y);
            y += 18;
            
            if (quoteData.yetkili) {
                doc.font(fontBold).text('Yetkili:', 50, y);
                doc.font(fontRegular).text(quoteData.yetkili, 100, y);
                y += 18;
            }
            
            if (quoteData.telefon) {
                doc.font(fontBold).text('Telefon:', 50, y);
                doc.font(fontRegular).text(quoteData.telefon, 100, y);
                y += 18;
            }
            
            if (quoteData.adres) {
                doc.font(fontBold).text('Adres:', 50, y);
                doc.font(fontRegular).text(quoteData.adres, 100, y, { width: 180 });
            }
            
            // Sağ - Tarih Bilgileri
            doc.fontSize(11).font(fontBold).fillColor('#111827')
               .text('TEKLİF BİLGİLERİ', 350, infoY);
            
            y = infoY + 20;
            doc.fontSize(10);
            
            doc.font(fontBold).text('Tarih:', 350, y);
            doc.font(fontRegular).text(formatDateTR(quoteData.created_at), 420, y);
            y += 18;
            
            doc.font(fontBold).text('Geçerlilik:', 350, y);
            doc.font(fontBold).fillColor('#dc2626').text(formatDateTR(quoteData.valid_until), 420, y);
            
            // ===== ÜRÜN TABLOSU =====
            const tableY = 340;
            
            // Tablo başlığı
            doc.roundedRect(50, tableY, 495, 25, 3).fill('#111827');
            doc.fontSize(10).font(fontBold).fillColor('#ffffff')
               .text('AÇIKLAMA', 60, tableY + 7)
               .text('ADET', 350, tableY + 7, { width: 50, align: 'center' })
               .text('BİRİM FİYAT', 400, tableY + 7, { width: 70, align: 'center' })
               .text('TOPLAM', 470, tableY + 7, { width: 70, align: 'right' });
            
            // Tablo satırları
            let items = [];
            try {
                items = typeof quoteData.items === 'string' ? JSON.parse(quoteData.items) : quoteData.items;
            } catch (e) {
                items = [];
            }
            
            let rowY = tableY + 25;
            let grandTotal = 0;
            
            items.forEach((item, index) => {
                const lineTotal = (item.quantity || 1) * (item.unit_price || 0);
                grandTotal += lineTotal;
                
                // Alternatif satır rengi
                if (index % 2 === 0) {
                    doc.rect(50, rowY, 495, 22).fill('#f8fafc');
                }
                
                doc.fontSize(10).font(fontRegular).fillColor('#1f2937')
                   .text(item.description || '-', 60, rowY + 6, { width: 280 })
                   .text(String(item.quantity || 1), 350, rowY + 6, { width: 50, align: 'center' })
                   .text(`₺${(item.unit_price || 0).toLocaleString('tr-TR')}`, 400, rowY + 6, { width: 70, align: 'center' })
                   .text(`₺${lineTotal.toLocaleString('tr-TR')}`, 470, rowY + 6, { width: 70, align: 'right' });
                
                rowY += 22;
            });
            
            // Tablo alt çizgisi
            doc.strokeColor('#e2e8f0').lineWidth(1)
               .moveTo(50, rowY).lineTo(545, rowY).stroke();
            
            // ===== TOPLAM =====
            rowY += 15;
            doc.roundedRect(350, rowY, 195, 35, 5).fillAndStroke('#f0fdf4', '#86efac');
            doc.fontSize(14).font(fontBold).fillColor('#166534')
               .text('GENEL TOPLAM:', 360, rowY + 10)
               .text(`₺${grandTotal.toLocaleString('tr-TR')}`, 460, rowY + 10, { width: 80, align: 'right' });
            
            // ===== NOTLAR =====
            if (quoteData.notes) {
                rowY += 55;
                doc.fontSize(10).font(fontBold).fillColor('#111827').text('NOTLAR:', 50, rowY);
                doc.font(fontRegular).fillColor('#475569').text(quoteData.notes, 50, rowY + 15, { width: 495 });
            }
            
            // ===== ALT BİLGİ =====
            const footerY = 720;
            
            doc.strokeColor('#e2e8f0').lineWidth(1)
               .moveTo(50, footerY).lineTo(545, footerY).stroke();
            
            // Koşullar
            doc.fontSize(9).font(fontRegular).fillColor('#64748b');
            doc.text('• Fiyatlara KDV dahildir.', 50, footerY + 15);
            doc.text('• Ödeme: Nakit veya Havale/EFT', 50, footerY + 28);
            doc.text('• Bu teklif belirtilen geçerlilik tarihine kadar geçerlidir.', 50, footerY + 41);
            
            // İmza alanı
            doc.roundedRect(380, footerY + 10, 165, 60, 5).stroke('#e2e8f0');
            doc.fontSize(9).font(fontBold).fillColor('#111827')
               .text('Yetkili İmza / Kaşe', 380, footerY + 55, { width: 165, align: 'center' });
            
            // Footer
            doc.fontSize(8).font(fontRegular).fillColor('#94a3b8')
               .text(`${companyName} - Yangın Söndürme Sistemleri`, 50, 780, { align: 'center' })
               .text(`Bu belge ${new Date().toLocaleDateString('tr-TR')} tarihinde oluşturulmuştur.`, 50, 792, { align: 'center' });
            
            doc.end();
            
            stream.on('finish', () => {
                resolve(pdfPath);
            });
            
            stream.on('error', (err) => {
                reject(err);
            });
            
        } catch (error) {
            reject(error);
        }
    });
}

// Teklif numarası oluştur
function generateQuoteNumber() {
    const year = new Date().getFullYear();
    
    // Teklif sayacını al veya oluştur
    let row = db.prepare('SELECT counter FROM counters WHERE counter_type = ? AND year = ?').get('quote', year);
    
    if (!row) {
        db.prepare('INSERT INTO counters (counter_type, year, counter) VALUES (?, ?, 1)').run('quote', year);
        return `TKL-${year}-0001`;
    } else {
        const newCounter = row.counter + 1;
        db.prepare('UPDATE counters SET counter = ? WHERE counter_type = ? AND year = ?').run(newCounter, 'quote', year);
        return `TKL-${year}-${String(newCounter).padStart(4, '0')}`;
    }
}

// Teklif oluştur
ipcMain.handle('quote:create', async (event, data) => {
    try {
        const { customerId, items, validDays, notes } = data;
        
        const quoteNumber = generateQuoteNumber();
        
        // Toplam hesapla
        let total = 0;
        for (const item of items) {
            total += (item.quantity || 1) * (item.unit_price || 0);
        }
        
        // Geçerlilik tarihi
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + (validDays || 15));
        
        // Müşteri bilgilerini al
        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
        
        // Teklif verisini hazırla
        const quoteData = {
            quote_number: quoteNumber,
            firma_adi: customer?.firma_adi || '',
            yetkili: customer?.yetkili || '',
            telefon: customer?.telefon || '',
            adres: customer?.adres || '',
            items: items,
            total_amount: total,
            valid_until: validUntil.toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            notes: notes
        };
        
        // PDF oluştur
        const pdfPath = await generateQuotePDF(quoteData);
        
        const result = db.prepare(`
            INSERT INTO quotes (customer_id, quote_number, items, total_amount, valid_until, notes, status, pdf_path)
            VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)
        `).run(customerId, quoteNumber, JSON.stringify(items), total, validUntil.toISOString().split('T')[0], notes || null, pdfPath);
        
        logEvent('quote_create', `Teklif oluşturuldu: ${quoteNumber}`, { customerId, total }, 'quote', result.lastInsertRowid);
        
        // PDF'i aç
        shell.openPath(pdfPath);
        
        return { success: true, quoteId: result.lastInsertRowid, quoteNumber, pdfPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Teklif listesi
ipcMain.handle('quote:list', async (event, filters = {}) => {
    try {
        let query = `
            SELECT q.*, c.firma_adi, c.yetkili, c.telefon
            FROM quotes q
            LEFT JOIN customers c ON q.customer_id = c.id
            WHERE 1=1
        `;
        const params = [];
        
        if (filters.customerId) {
            query += ' AND q.customer_id = ?';
            params.push(filters.customerId);
        }
        
        if (filters.status) {
            query += ' AND q.status = ?';
            params.push(filters.status);
        }
        
        if (filters.startDate) {
            query += ' AND DATE(q.created_at) >= ?';
            params.push(filters.startDate);
        }
        
        if (filters.endDate) {
            query += ' AND DATE(q.created_at) <= ?';
            params.push(filters.endDate);
        }
        
        query += ' ORDER BY q.created_at DESC';
        
        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(filters.limit);
        }
        
        const quotes = db.prepare(query).all(...params);
        
        // JSON items parse et
        for (const quote of quotes) {
            try {
                quote.items = JSON.parse(quote.items);
            } catch (e) {
                quote.items = [];
            }
        }
        
        return { success: true, data: quotes };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Teklif detayı
ipcMain.handle('quote:get', async (event, id) => {
    try {
        const quote = db.prepare(`
            SELECT q.*, c.firma_adi, c.yetkili, c.telefon, c.adres
            FROM quotes q
            LEFT JOIN customers c ON q.customer_id = c.id
            WHERE q.id = ?
        `).get(id);
        
        if (quote) {
            try {
                quote.items = JSON.parse(quote.items);
            } catch (e) {
                quote.items = [];
            }
        }
        
        return { success: true, data: quote };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Teklif durumu güncelle
ipcMain.handle('quote:updateStatus', async (event, data) => {
    try {
        const { id, status } = data;
        
        db.prepare(`
            UPDATE quotes 
            SET status = ?, updated_at = datetime('now', 'localtime')
            WHERE id = ?
        `).run(status, id);
        
        logEvent('quote_status', `Teklif durumu güncellendi: ${status}`, { id, status }, 'quote', id);
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Teklif sil
ipcMain.handle('quote:delete', async (event, id) => {
    try {
        const quote = db.prepare('SELECT quote_number FROM quotes WHERE id = ?').get(id);
        
        db.prepare('DELETE FROM quotes WHERE id = ?').run(id);
        
        logEvent('quote_delete', `Teklif silindi: ${quote?.quote_number}`, { id }, 'quote', id);
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Teklif WhatsApp metni oluştur
ipcMain.handle('quote:generateWhatsAppText', async (event, id) => {
    try {
        const quote = db.prepare(`
            SELECT q.*, c.firma_adi, c.yetkili
            FROM quotes q
            LEFT JOIN customers c ON q.customer_id = c.id
            WHERE q.id = ?
        `).get(id);
        
        if (!quote) {
            return { success: false, error: 'Teklif bulunamadı' };
        }
        
        let items = [];
        try {
            items = JSON.parse(quote.items);
        } catch (e) {
            items = [];
        }
        
        let text = `🔥 *ÜÇLER YANGIN - TEKLİF*\n`;
        text += `━━━━━━━━━━━━━━━━━━\n`;
        text += `📋 Teklif No: ${quote.quote_number}\n`;
        text += `📅 Tarih: ${new Date(quote.created_at).toLocaleDateString('tr-TR')}\n`;
        text += `⏳ Geçerlilik: ${new Date(quote.valid_until).toLocaleDateString('tr-TR')}\n`;
        text += `━━━━━━━━━━━━━━━━━━\n\n`;
        
        text += `*Sayın ${quote.yetkili || quote.firma_adi},*\n\n`;
        text += `Talebiniz üzerine hazırlanan teklifimiz:\n\n`;
        
        for (const item of items) {
            text += `▸ ${item.description}\n`;
            text += `   ${item.quantity} adet x ₺${item.unit_price?.toLocaleString('tr-TR')} = *₺${((item.quantity || 1) * (item.unit_price || 0)).toLocaleString('tr-TR')}*\n\n`;
        }
        
        text += `━━━━━━━━━━━━━━━━━━\n`;
        text += `💰 *TOPLAM: ₺${quote.total_amount?.toLocaleString('tr-TR')}*\n`;
        text += `━━━━━━━━━━━━━━━━━━\n\n`;
        
        if (quote.notes) {
            text += `📝 Not: ${quote.notes}\n\n`;
        }
        
        text += `✅ KDV dahildir\n`;
        text += `✅ Ödeme: Nakit/Havale\n\n`;
        text += `📞 İletişim: 0530 XXX XX XX\n`;
        text += `📍 Marmaris\n\n`;
        text += `_Üçler Yangın olarak hizmetinizdeyiz._`;
        
        return { success: true, text };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
// Teklif PDF aç
ipcMain.handle('quote:openPDF', async (event, pdfPath) => {
    try {
        if (!fs.existsSync(pdfPath)) {
            return { success: false, error: 'PDF dosyası bulunamadı' };
        }
        await shell.openPath(pdfPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});