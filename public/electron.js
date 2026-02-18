const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Veritabanı modülünü yükle
let db;

// Development modu kontrolü
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Tüp Cinsleri - Türkçe -> İngilizce Kısaltma
const TUBE_TYPE_SHORT_CODES = {
    'KKT': 'DCP',
    'CO2': 'CO2',
    'Köpüklü': 'FOAM',
    'AFF': 'AFFF',
    'Potasyum': 'PKP',
    'Biyolojik': 'BIO',
    'Ekobiyolojik': 'ECO-BIO',
    'FM200': 'FM200',
    'Tekne': 'MARINE',
    'Trafo': 'TRAFO',
    'Su': 'WATER',
    'Halokarbon': 'HALOCARBON',
    'Oksijen': 'O2',
    'Davlumbaz': 'HOOD',
    'Otomatik': 'AUTO'
};

function getTubeTypeShortCode(value) {
    if (!value) return 'DCP';
    
    // Direkt eşleşme
    if (TUBE_TYPE_SHORT_CODES[value]) {
        return TUBE_TYPE_SHORT_CODES[value];
    }
    
    // Küçük harfe çevir ve içerik kontrolü yap
    const lower = value.toLowerCase();
    
    if (lower.includes('kkt') || lower.includes('kuru') || lower.includes('kimyevi') || lower.includes('tozlu') || lower.includes('abc') || lower.includes('powder') || lower.includes('dry')) {
        return 'DCP';
    }
    if (lower.includes('co2') || lower.includes('karbon')) {
        return 'CO2';
    }
    if (lower.includes('köpük') || lower.includes('foam')) {
        return 'FOAM';
    }
    if (lower.includes('afff') || lower.includes('aff') || lower.includes('aqueous')) {
        return 'AFFF';
    }
    if (lower.includes('potasyum') || lower.includes('pkp') || lower.includes('purple')) {
        return 'PKP';
    }
    if (lower.includes('trafo') || lower.includes('transformer')) {
        return 'TRAFO';
    }
    if (lower.includes('ekobiyolojik') || lower.includes('eco')) {
        return 'ECO-BIO';
    }
    if (lower.includes('biyolojik') || lower.includes('bio')) {
        return 'BIO';
    }
    if (lower.includes('fm200') || lower.includes('fm-200') || lower.includes('hfc')) {
        return 'FM200';
    }
    if (lower.includes('tekne') || lower.includes('marine')) {
        return 'MARINE';
    }
    if (lower.includes('su') || lower.includes('water')) {
        return 'WATER';
    }
    if (lower.includes('halokarbon') || lower.includes('halon')) {
        return 'HALOCARBON';
    }
    if (lower.includes('oksijen') || lower.includes('oxygen') || lower.includes('o2')) {
        return 'O2';
    }
    if (lower.includes('davlumbaz') || lower.includes('hood')) {
        return 'HOOD';
    }
    if (lower.includes('otomatik') || lower.includes('auto')) {
        return 'AUTO';
    }
    
    // Hiçbiri eşleşmezse orijinal değeri döndür
    return value;
}

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
        icon: path.join(__dirname, 'assets/images/icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        titleBarStyle: 'default',
        show: false
    });

    // Content Security Policy ayarla
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self'; " +
                    "script-src 'self' 'unsafe-inline'; " +
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                    "font-src 'self' https://fonts.gstatic.com data:; " +
                    "img-src 'self' data: https: http:; " +
                    "connect-src 'self' https://api.qrserver.com https://api.iconify.design https://api.simplesvg.com https://api.unisvg.com;"
                ]
            }
        });
    });

    // Development modunda localhost, production'da build dosyasını yükle
    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
    }

    // Pencere hazır olduğunda göster
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.maximize();
    });
}

// Uygulama verileri için klasör yolu - proje dizininde
function getDataPath() {
    // Development modunda proje dizini, production'da exe yanı
    const basePath = isDev ? path.join(__dirname, '..') : path.dirname(process.execPath);
    const dataPath = path.join(basePath, 'data');
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

// Veritabanı başlatma
function initDatabase() {
    const Database = require('better-sqlite3');
    const dbPath = path.join(getDataPath(), 'ucler_yangin.db');
    db = new Database(dbPath);

    // Tabloları oluştur
    db.exec(`
        -- Müşteriler tablosu
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firma_adi TEXT NOT NULL,
            yetkili TEXT,
            telefon TEXT,
            email TEXT,
            adres TEXT,
            notlar TEXT, -- Backward compatibility, might rename to 'not' later if strict match needed, but keeping 'notlar' is safer for existing queries unless full refactor. User asked for matching fields. 'notText' in target implies 'not' or 'notlar'. Let's stick to 'notlar' (Notes) as it is standard but remove vergi info. 
            durum TEXT DEFAULT 'Aktif',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Tüpler tablosu
        CREATE TABLE IF NOT EXISTS tubes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            tup_cinsi TEXT NOT NULL,
            kilo REAL DEFAULT 6,
            seri_no TEXT UNIQUE NOT NULL,
            yil INTEGER NOT NULL,
            sira_no INTEGER NOT NULL,
            dolum_tarihi DATE NOT NULL,
            son_kullanim_tarihi DATE NOT NULL,
            qr_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        );

        -- Sayaçlar tablosu
        CREATE TABLE IF NOT EXISTS counters (
            counter_type TEXT NOT NULL,
            year INTEGER NOT NULL,
            counter INTEGER DEFAULT 0,
            PRIMARY KEY (counter_type, year)
        );

        -- Sertifikalar tablosu (aynı sertifika numarası birden fazla tüp için kullanılabilir)
        CREATE TABLE IF NOT EXISTS certificates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            certificate_number TEXT NOT NULL,
            tube_id INTEGER NOT NULL,
            customer_id INTEGER NOT NULL,
            issue_date DATE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT DEFAULT 'Sistem',
            pdf_path TEXT,
            gemi_adi TEXT,
            groston TEXT,
            gemi_cinsi TEXT,
            liman TEXT,
            FOREIGN KEY (tube_id) REFERENCES tubes(id) ON DELETE CASCADE,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        );

        -- Fiyatlar tablosu
        CREATE TABLE IF NOT EXISTS prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tup_cinsi TEXT NOT NULL,
            kilo REAL NOT NULL,
            fiyat REAL NOT NULL,
            dolum_fiyati REAL DEFAULT 0,
            hortum_fiyati REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Teklifler tablosu
        CREATE TABLE IF NOT EXISTS quotes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            teklif_no TEXT UNIQUE NOT NULL,
            toplam_tutar REAL NOT NULL,
            durum TEXT DEFAULT 'Beklemede',
            pdf_path TEXT,
            notlar TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        );

        -- Teklif kalemleri tablosu
        CREATE TABLE IF NOT EXISTS quote_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quote_id INTEGER NOT NULL,
            tup_cinsi TEXT NOT NULL,
            kilo REAL NOT NULL,
            adet INTEGER NOT NULL,
            birim_fiyat REAL NOT NULL,
            toplam REAL NOT NULL,
            FOREIGN KEY (quote_id) REFERENCES quotes(id)
        );

        -- İşlem logları tablosu
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            islem_tipi TEXT NOT NULL,
            islem_detay TEXT,
            kullanici TEXT DEFAULT 'Admin',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Ayarlar tablosu
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY,
            company_name TEXT,
            phone TEXT,
            address TEXT,
            email TEXT,
            website TEXT,
            logo_path TEXT,
            tax_office TEXT,
            tax_number TEXT,
            bank_name TEXT,
            iban TEXT,
            kdv_rate TEXT DEFAULT '20',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Arama kayıtları tablosu (Bugün Aranacaklar için)
        CREATE TABLE IF NOT EXISTS call_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            call_date DATE NOT NULL,
            call_type TEXT DEFAULT 'phone',
            status TEXT DEFAULT 'pending',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        );

        -- Sözleşmeler tablosu
        CREATE TABLE IF NOT EXISTS contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quote_id INTEGER NOT NULL,
            customer_id INTEGER NOT NULL,
            contract_no TEXT UNIQUE NOT NULL,
            contract_html TEXT,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            total_amount REAL DEFAULT 0,
            status TEXT DEFAULT 'Taslak',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (quote_id) REFERENCES quotes(id),
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        );

        -- İndeksler
        CREATE INDEX IF NOT EXISTS idx_call_logs_customer_id ON call_logs(customer_id);
        CREATE INDEX IF NOT EXISTS idx_call_logs_date ON call_logs(call_date);
        CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id);
        CREATE INDEX IF NOT EXISTS idx_contracts_quote_id ON contracts(quote_id);
        CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts(end_date);
    `);

    // Migration: Mevcut settings tablosuna yeni sütunlar ekle (eğer yoksa)
    try {
        const tableInfo = db.prepare("PRAGMA table_info(settings)").all();
        const columns = tableInfo.map(col => col.name);
        
        if (!columns.includes('tax_office')) {
            db.prepare('ALTER TABLE settings ADD COLUMN tax_office TEXT').run();
        }
        if (!columns.includes('tax_number')) {
            db.prepare('ALTER TABLE settings ADD COLUMN tax_number TEXT').run();
        }
        if (!columns.includes('kdv_rate')) {
            db.prepare("ALTER TABLE settings ADD COLUMN kdv_rate TEXT DEFAULT '20'").run();
        }
        if (!columns.includes('logo_path')) {
            db.prepare('ALTER TABLE settings ADD COLUMN logo_path TEXT').run();
        }
        if (!columns.includes('bank_name')) {
            db.prepare('ALTER TABLE settings ADD COLUMN bank_name TEXT').run();
        }
        if (!columns.includes('iban')) {
            db.prepare('ALTER TABLE settings ADD COLUMN iban TEXT').run();
        }
    } catch (err) {
        console.log('Migration hatası (muhtemelen sütunlar zaten var):', err.message);
    }

    // Migration: Quotes tablosuna yeni sütunlar ekle
    try {
        const quoteColumns = db.prepare("PRAGMA table_info(quotes)").all().map(c => c.name);
        
        if (!quoteColumns.includes('ara_toplam')) {
            db.prepare('ALTER TABLE quotes ADD COLUMN ara_toplam REAL DEFAULT 0').run();
        }
        if (!quoteColumns.includes('kdv_orani')) {
            db.prepare('ALTER TABLE quotes ADD COLUMN kdv_orani REAL DEFAULT 20').run();
        }
        if (!quoteColumns.includes('kdv_tutar')) {
            db.prepare('ALTER TABLE quotes ADD COLUMN kdv_tutar REAL DEFAULT 0').run();
        }
        if (!quoteColumns.includes('valid_until')) {
            db.prepare('ALTER TABLE quotes ADD COLUMN valid_until TEXT').run();
        }
    } catch (err) {
        console.log('Quotes migration hatası:', err.message);
    }

    // Migration: Prices tablosuna dolum ve hortum fiyatı ekle
    try {
        const priceColumns = db.prepare("PRAGMA table_info(prices)").all().map(c => c.name);
        
        if (!priceColumns.includes('dolum_fiyati')) {
            db.prepare('ALTER TABLE prices ADD COLUMN dolum_fiyati REAL DEFAULT 0').run();
        }
        if (!priceColumns.includes('hortum_fiyati')) {
            db.prepare('ALTER TABLE prices ADD COLUMN hortum_fiyati REAL DEFAULT 0').run();
        }
        // TODO-2: Kategori alanı ekle
        if (!priceColumns.includes('category')) {
            db.prepare("ALTER TABLE prices ADD COLUMN category TEXT DEFAULT 'Yangın Tüpü'").run();
            console.log('Prices tablosuna category kolonu eklendi');
        }
        // TODO-3: Dolum parça fiyatları ekle
        if (!priceColumns.includes('dolum_manometre')) {
            db.prepare('ALTER TABLE prices ADD COLUMN dolum_manometre REAL DEFAULT 0').run();
        }
        if (!priceColumns.includes('dolum_tetik')) {
            db.prepare('ALTER TABLE prices ADD COLUMN dolum_tetik REAL DEFAULT 0').run();
        }
        if (!priceColumns.includes('dolum_hortum')) {
            db.prepare('ALTER TABLE prices ADD COLUMN dolum_hortum REAL DEFAULT 0').run();
        }
        if (!priceColumns.includes('dolum_boya')) {
            db.prepare('ALTER TABLE prices ADD COLUMN dolum_boya REAL DEFAULT 0').run();
        }
        console.log('Prices tablosu migration tamamlandı');
    } catch (err) {
        console.log('Prices migration hatası:', err.message);
    }

    // Migration: Certificates tablosundaki UNIQUE constraint'i kaldır
    try {
        // Mevcut tabloyu kontrol et - eğer UNIQUE varsa yeniden oluştur
        const certTableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='certificates'").get();
        if (certTableInfo && certTableInfo.sql && certTableInfo.sql.includes('UNIQUE')) {
            console.log('Certificates tablosu migration yapılıyor (UNIQUE kaldırılıyor)...');
            
            // Mevcut verileri yedekle
            const existingCerts = db.prepare('SELECT * FROM certificates').all();
            
            // Eski tabloyu sil
            db.prepare('DROP TABLE certificates').run();
            
            // Yeni tablo oluştur (UNIQUE olmadan)
            db.prepare(`
                CREATE TABLE certificates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    certificate_number TEXT NOT NULL,
                    tube_id INTEGER NOT NULL,
                    customer_id INTEGER NOT NULL,
                    issue_date DATE NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_by TEXT DEFAULT 'Sistem',
                    pdf_path TEXT,
                    gemi_adi TEXT,
                    groston TEXT,
                    gemi_cinsi TEXT,
                    liman TEXT,
                    FOREIGN KEY (tube_id) REFERENCES tubes(id) ON DELETE CASCADE,
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
                )
            `).run();
            
            // Verileri geri yükle
            if (existingCerts.length > 0) {
                const insertStmt = db.prepare(`
                    INSERT INTO certificates (id, certificate_number, tube_id, customer_id, issue_date, created_at, created_by, pdf_path)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `);
                for (const cert of existingCerts) {
                    insertStmt.run(cert.id, cert.certificate_number, cert.tube_id, cert.customer_id, cert.issue_date, cert.created_at, cert.created_by, cert.pdf_path);
                }
            }
            
            console.log('Certificates tablosu migration tamamlandı');
        }
    } catch (err) {
        console.log('Certificates migration hatası:', err.message);
    }

    // Migration: Quotes tablosuna currency (para birimi) sütunu ekle
    try {
        const quoteColumns = db.prepare("PRAGMA table_info(quotes)").all().map(c => c.name);
        if (!quoteColumns.includes('currency')) {
            db.prepare("ALTER TABLE quotes ADD COLUMN currency TEXT DEFAULT 'TRY'").run();
            console.log('Quotes tablosuna currency kolonu eklendi');
        }
    } catch (err) {
        console.log('Quotes currency migration hatası:', err.message);
    }

    // Migration: Tubes tablosuna saha kontrolü ve konum alanları ekle
    try {
        const tubeColumns = db.prepare("PRAGMA table_info(tubes)").all().map(c => c.name);
        
        // Konum açıklaması (sistemde ve PDF'te görünür)
        if (!tubeColumns.includes('location_description')) {
            db.prepare("ALTER TABLE tubes ADD COLUMN location_description TEXT").run();
            console.log('Tubes tablosuna location_description kolonu eklendi');
        }
        
        // Saha durumu (sahada girilir, PDF'te BOŞ basılır)
        if (!tubeColumns.includes('field_status')) {
            db.prepare("ALTER TABLE tubes ADD COLUMN field_status TEXT").run();
            console.log('Tubes tablosuna field_status kolonu eklendi');
        }
        
        // Saha notu (sahada girilir, PDF'te BOŞ basılır)
        if (!tubeColumns.includes('field_note')) {
            db.prepare("ALTER TABLE tubes ADD COLUMN field_note TEXT").run();
            console.log('Tubes tablosuna field_note kolonu eklendi');
        }
        
        // Son saha kontrolü tarihi
        if (!tubeColumns.includes('field_checked_at')) {
            db.prepare("ALTER TABLE tubes ADD COLUMN field_checked_at DATE").run();
            console.log('Tubes tablosuna field_checked_at kolonu eklendi');
        }
    } catch (err) {
        console.log('Tubes saha alanları migration hatası:', err.message);
    }

    // Reports tablosu oluştur (Denetim Raporları)
    try {
        db.prepare(`
            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ref_no TEXT UNIQUE NOT NULL,
                customer_id INTEGER NOT NULL,
                customer_name TEXT,
                tube_count INTEGER DEFAULT 0,
                tube_summary TEXT,
                report_html TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
            )
        `).run();
        console.log('Reports tablosu oluşturuldu');
    } catch (err) {
        console.log('Reports tablosu zaten var veya hata:', err.message);
    }

    // Varsayılan ayarları ekle
    const existingSettings = db.prepare('SELECT id FROM settings WHERE id = 1').get();
    if (!existingSettings) {
        db.prepare(`
            INSERT INTO settings (id, company_name, phone, address, email, website, kdv_rate)
            VALUES (1, 'Firma Adınız', '', '', '', '', '20')
        `).run();
    }

    // Demo verileri ekle (eğer müşteri yoksa)
    const existingCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get();
    if (existingCustomers.count === 0) {
        seedDemoData();
    }

    console.log('Veritabanı başlatıldı:', dbPath);
}

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

// Sonraki sertifika numarasını al
function getNextCertificateNumber() {
    const currentYear = new Date().getFullYear();

    // Sertifika sayacını kontrol et
    let row = db.prepare('SELECT counter FROM counters WHERE counter_type = ? AND year = ?').get('certificate', currentYear);

    if (!row) {
        // Yıl için yeni sayaç oluştur
        db.prepare('INSERT INTO counters (counter_type, year, counter) VALUES (?, ?, 0)').run('certificate', currentYear);
        row = { counter: 0 };
    }

    const nextCount = row.counter + 1;

    // Sayacı güncelle
    db.prepare('UPDATE counters SET counter = ? WHERE counter_type = ? AND year = ?').run(nextCount, 'certificate', currentYear);

    // Sertifika numarasını formatla (CERT-2026-00001)
    const certificate_number = `CERT-${currentYear}-${String(nextCount).padStart(5, '0')}`;

    return { certificate_number, year: currentYear, count: nextCount };
}

// Demo verileri ekle
function seedDemoData() {
    console.log('Test verileri ekleniyor...');

    // Müşteriler
    const customers = [
        { firma_adi: 'ABC Otomotiv', yetkili: 'Ahmet Yılmaz', telefon: '0532 123 4567', email: 'ahmet@abcoto.com', adres: 'Marmaris Organize Sanayi', notlar: 'Önemli müşteri' },
        { firma_adi: 'Deniz Restaurant', yetkili: 'Mehmet Kaya', telefon: '0533 234 5678', email: 'info@denizrestaurant.com', adres: 'Marmaris Sahil Yolu', notlar: '' },
        { firma_adi: 'Güneş Otel', yetkili: 'Ayşe Demir', telefon: '0534 345 6789', email: 'rezervasyon@gunesotel.com', adres: 'İçmeler Mevkii', notlar: 'Yaz sezonu yoğun' },
        { firma_adi: 'Marmaris Marina', yetkili: 'Can Özkan', telefon: '0535 456 7890', email: 'can@marmarismarina.com', adres: 'Netsel Marina', notlar: '' },
        { firma_adi: 'Liman Cafe', yetkili: 'Fatma Şahin', telefon: '0536 567 8901', email: 'limancafe@gmail.com', adres: 'Yat Limanı Karşısı', notlar: 'Aylık bakım sözleşmesi var' },
        { firma_adi: 'Palmiye Apart', yetkili: 'Hüseyin Arslan', telefon: '0537 678 9012', email: 'palmiye@gmail.com', adres: 'Siteler Mahallesi', notlar: '' },
    ];

    const insertCustomer = db.prepare(`
            INSERT INTO customers (firma_adi, yetkili, telefon, email, adres, notlar)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

    customers.forEach(c => {
        insertCustomer.run(c.firma_adi, c.yetkili, c.telefon, c.email, c.adres, c.notlar);
    });

    // Tüpler
    const tubes = [
        { customer_id: 1, seri_no: 'KKT-2024-A1B2', tup_cinsi: 'KKT', kilo: 6, dolum_tarihi: '2024-01-15', son_kullanim_tarihi: '2025-01-15' },
        { customer_id: 1, seri_no: 'CO2-2024-C3D4', tup_cinsi: 'CO2', kilo: 5, dolum_tarihi: '2024-02-20', son_kullanim_tarihi: '2025-02-20' },
        { customer_id: 1, seri_no: 'KKT-2024-E5F6', tup_cinsi: 'KKT', kilo: 12, dolum_tarihi: '2024-03-10', son_kullanim_tarihi: '2025-03-10' },
        { customer_id: 2, seri_no: 'KKT-2024-G7H8', tup_cinsi: 'KKT', kilo: 6, dolum_tarihi: '2025-06-15', son_kullanim_tarihi: '2026-06-15' },
        { customer_id: 2, seri_no: 'KOP-2024-I9J0', tup_cinsi: 'Köpüklü', kilo: 9, dolum_tarihi: '2025-11-05', son_kullanim_tarihi: '2026-11-05' },
        { customer_id: 3, seri_no: 'KKT-2024-K1L2', tup_cinsi: 'KKT', kilo: 6, dolum_tarihi: '2025-12-01', son_kullanim_tarihi: '2026-12-01' },
        { customer_id: 3, seri_no: 'FM2-2024-M3N4', tup_cinsi: 'FM200', kilo: 4, dolum_tarihi: '2025-10-15', son_kullanim_tarihi: '2026-10-15' },
        { customer_id: 4, seri_no: 'KKT-2024-O5P6', tup_cinsi: 'KKT', kilo: 50, dolum_tarihi: '2025-08-20', son_kullanim_tarihi: '2026-08-20' },
        { customer_id: 5, seri_no: 'CO2-2024-Q7R8', tup_cinsi: 'CO2', kilo: 5, dolum_tarihi: '2025-01-25', son_kullanim_tarihi: '2026-01-25' },
        { customer_id: 6, seri_no: 'KKT-2025-S9T0', tup_cinsi: 'KKT', kilo: 6, dolum_tarihi: '2025-12-01', son_kullanim_tarihi: '2026-12-01' },
        { customer_id: 6, seri_no: 'BIO-2025-U1V2', tup_cinsi: 'Biyolojik', kilo: 6, dolum_tarihi: '2025-11-15', son_kullanim_tarihi: '2026-11-15' },
        // BUGÜN ARANACAKLAR TEST VERİSİ
        // 3 gün içinde süresi dolacak tüp (customer_id: 4 - Marmaris Marina)
        { customer_id: 4, seri_no: 'TEST-EXP-001', tup_cinsi: 'KKT', kilo: 6, dolum_tarihi: new Date(new Date().setDate(new Date().getDate() - 362)).toISOString().split('T')[0], son_kullanim_tarihi: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0] },
        // 6 gün içinde süresi dolacak tüp (customer_id: 5 - Liman Cafe)
        { customer_id: 5, seri_no: 'TEST-EXP-002', tup_cinsi: 'CO2', kilo: 5, dolum_tarihi: new Date(new Date().setDate(new Date().getDate() - 359)).toISOString().split('T')[0], son_kullanim_tarihi: new Date(new Date().setDate(new Date().getDate() + 6)).toISOString().split('T')[0] }
    ];

    const insertTube = db.prepare(`
            INSERT INTO tubes (customer_id, tup_cinsi, kilo, seri_no, yil, sira_no, dolum_tarihi, son_kullanim_tarihi)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

    tubes.forEach(t => {
        const { seriNo, yil, siraNo } = getNextSerialNumber();
        insertTube.run(t.customer_id, t.tup_cinsi, t.kilo, seriNo, yil, siraNo, t.dolum_tarihi, t.son_kullanim_tarihi);
    });

    // Sertifikalar
    const certificatesData = [
        { tube_id: 1, issue_date: '2024-01-15' },
        { tube_id: 2, issue_date: '2024-02-20' },
        { tube_id: 4, issue_date: '2025-06-15' },
        { tube_id: 6, issue_date: '2025-12-01' },
        { tube_id: 8, issue_date: '2025-08-20' },
    ];

    certificatesData.forEach(certData => {
        const { certificate_number } = getNextCertificateNumber();
        const tube = db.prepare('SELECT customer_id FROM tubes WHERE id = ?').get(certData.tube_id);
        if (tube) {
            db.prepare(`
                    INSERT INTO certificates (certificate_number, tube_id, customer_id, issue_date, created_by)
                    VALUES (?, ?, ?, ?, ?)
                `).run(certificate_number, certData.tube_id, tube.customer_id, certData.issue_date, 'Sistem');
        }
    });

    // Fiyatlar
    const prices = [
        { tup_cinsi: 'KKT', kilo: 6, fiyat: 250 },
        { tup_cinsi: 'KKT', kilo: 12, fiyat: 400 },
        { tup_cinsi: 'CO2', kilo: 5, fiyat: 350 },
        { tup_cinsi: 'CO2', kilo: 7, fiyat: 450 },
        { tup_cinsi: 'Köpüklü', kilo: 6, fiyat: 280 },
        { tup_cinsi: 'Köpüklü', kilo: 9, fiyat: 380 },
        { tup_cinsi: 'Biyolojik', kilo: 6, fiyat: 320 },
        { tup_cinsi: 'FM200', kilo: 4, fiyat: 800 },
    ];

    const insertPrice = db.prepare(`
            INSERT INTO prices (tup_cinsi, kilo, fiyat) VALUES (?, ?, ?)
        `);

    prices.forEach(p => {
        insertPrice.run(p.tup_cinsi, p.kilo, p.fiyat);
    });

    // Teklifler
    const quotes = [
        {
            customer_id: 1,
            teklif_no: 'TKL-2025-001',
            toplam_tutar: 1650,
            durum: 'Onaylandı',
            notlar: 'Yıllık bakım anlaşması'
        },
        {
            customer_id: 2,
            teklif_no: 'TKL-2025-002',
            toplam_tutar: 780,
            durum: 'Beklemede',
            notlar: 'Yeni tüp alımı'
        },
        {
            customer_id: 3,
            teklif_no: 'TKL-2025-003',
            toplam_tutar: 2400,
            durum: 'Beklemede',
            notlar: 'Otel renovasyon projesi'
        },
        {
            customer_id: 4,
            teklif_no: 'TKL-2026-001',
            toplam_tutar: 3200,
            durum: 'Beklemede',
            notlar: 'Marina için özel proje'
        },
        {
            customer_id: 5,
            teklif_no: 'TKL-2026-002',
            toplam_tutar: 450,
            durum: 'Reddedildi',
            notlar: 'Müşteri fiyatı yüksek buldu'
        },
    ];

    const insertQuote = db.prepare(`
            INSERT INTO quotes (customer_id, teklif_no, toplam_tutar, durum, notlar)
            VALUES (?, ?, ?, ?, ?)
        `);

    quotes.forEach(q => {
        insertQuote.run(q.customer_id, q.teklif_no, q.toplam_tutar, q.durum, q.notlar);
    });

    // Teklif kalemleri
    const quoteItems = [
        // TKL-2025-001 kalemleri
        { quote_id: 1, tup_cinsi: 'KKT', kilo: 6, adet: 3, birim_fiyat: 250, toplam: 750 },
        { quote_id: 1, tup_cinsi: 'CO2', kilo: 5, adet: 2, birim_fiyat: 350, toplam: 700 },
        { quote_id: 1, tup_cinsi: 'Servis', kilo: 0, adet: 1, birim_fiyat: 200, toplam: 200 },
        // TKL-2025-002 kalemleri
        { quote_id: 2, tup_cinsi: 'KKT', kilo: 6, adet: 2, birim_fiyat: 320, toplam: 640 },
        { quote_id: 2, tup_cinsi: 'Montaj', kilo: 0, adet: 1, birim_fiyat: 140, toplam: 140 },
        // TKL-2025-003 kalemleri
        { quote_id: 3, tup_cinsi: 'KKT', kilo: 6, adet: 5, birim_fiyat: 250, toplam: 1250 },
        { quote_id: 3, tup_cinsi: 'FM200', kilo: 4, adet: 1, birim_fiyat: 800, toplam: 800 },
        { quote_id: 3, tup_cinsi: 'Servis', kilo: 0, adet: 1, birim_fiyat: 350, toplam: 350 },
        // TKL-2026-001 kalemleri
        { quote_id: 4, tup_cinsi: 'KKT', kilo: 50, adet: 2, birim_fiyat: 1200, toplam: 2400 },
        { quote_id: 4, tup_cinsi: 'CO2', kilo: 5, adet: 2, birim_fiyat: 350, toplam: 700 },
        { quote_id: 4, tup_cinsi: 'Nakliye', kilo: 0, adet: 1, birim_fiyat: 100, toplam: 100 },
        // TKL-2026-002 kalemleri
        { quote_id: 5, tup_cinsi: 'CO2', kilo: 5, adet: 1, birim_fiyat: 350, toplam: 350 },
        { quote_id: 5, tup_cinsi: 'Servis', kilo: 0, adet: 1, birim_fiyat: 100, toplam: 100 },
    ];

    const insertQuoteItem = db.prepare(`
            INSERT INTO quote_items (quote_id, tup_cinsi, kilo, adet, birim_fiyat, toplam)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

    quoteItems.forEach(qi => {
        insertQuoteItem.run(qi.quote_id, qi.tup_cinsi, qi.kilo, qi.adet, qi.birim_fiyat, qi.toplam);
    });

    // Log ekle
    addLog('system', 'Test verileri eklendi');
    console.log('Test verileri başarıyla eklendi!');
}

// Log ekleme fonksiyonu
function addLog(action, message, meta = null) {
    try {
        const metaStr = meta ? JSON.stringify(meta) : null;
        db.prepare('INSERT INTO logs (islem_tipi, islem_detay) VALUES (?, ?)').run(action, message);
    } catch (error) {
        console.error('Log eklenirken hata:', error);
    }
}

app.whenReady().then(async () => {
    // Veritabanını başlat
    initDatabase();

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// ==================== IPC HANDLERS ====================

// PDF Kaydetme (Rapor penceresinden)
ipcMain.on('save-report-pdf', async (event, customerName, refNo) => {
    try {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return;

        // Kaydetme dialogu
        const { filePath } = await dialog.showSaveDialog(win, {
            title: 'PDF Olarak Kaydet',
            defaultPath: `Rapor_${customerName}_${refNo}.pdf`,
            filters: [{ name: 'PDF Dosyası', extensions: ['pdf'] }]
        });

        if (filePath) {
            // Butonları gizlemek için CSS ekle
            await win.webContents.insertCSS('.btn-container { display: none !important; }');
            
            // PDF oluştur
            const pdfData = await win.webContents.printToPDF({
                pageSize: 'A4',
                printBackground: true,
                margins: {
                    marginType: 'default'
                }
            });

            // Dosyaya kaydet
            fs.writeFileSync(filePath, pdfData);

            // Butonları geri göster
            await win.webContents.insertCSS('.btn-container { display: flex !important; }');

            // Bildirim
            dialog.showMessageBox(win, {
                type: 'info',
                title: 'PDF Kaydedildi',
                message: `Rapor başarıyla kaydedildi:\n${filePath}`
            });
        }
    } catch (error) {
        console.error('PDF kaydetme hatası:', error);
        dialog.showErrorBox('Hata', 'PDF kaydedilirken bir hata oluştu: ' + error.message);
    }
});

// Müşteri işlemleri
ipcMain.handle('customer:add', async (event, data) => {
    try {
        const { firma_adi, yetkili, telefon, email, adres, notlar } = data;

        const result = db.prepare(`
            INSERT INTO customers (firma_adi, yetkili, telefon, email, adres, notlar) 
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(firma_adi, yetkili, telefon, email, adres, notlar);

        addLog('MÜŞTERİ_EKLE', `Yeni müşteri eklendi: ${firma_adi}`);

        return { success: true, id: result.lastInsertRowid };
    } catch (error) {
        console.error('Müşteri ekleme hatası:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('customer:list', async () => {
    try {
        const customers = db.prepare(`
            SELECT c.*, 
                   COUNT(t.id) as tup_sayisi
            FROM customers c
            LEFT JOIN tubes t ON c.id = t.customer_id
            GROUP BY c.id
            ORDER BY c.firma_adi
        `).all();
        return { success: true, data: customers };
    }
    catch (error) {
        console.error('Müşteri listeleme hatası:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('customer:update', async (event, customer) => {
    try {
        db.prepare(`
            UPDATE customers 
            SET firma_adi = ?, yetkili = ?, telefon = ?, email = ?, adres = ?, 
                notlar = ?, durum = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            customer.firma_adi,
            customer.yetkili,
            customer.telefon,
            customer.email,
            customer.adres,
            customer.notlar,
            customer.durum || 'Aktif',
            customer.id
        );

        addLog('MÜŞTERİ_GÜNCELLE', `Müşteri güncellendi: ${customer.firma_adi}`);
        return { success: true };
    } catch (error) {
        console.error('Müşteri güncelleme hatası:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('customer:delete', async (event, id) => {
    try {
        const customer = db.prepare('SELECT firma_adi FROM customers WHERE id = ?').get(id);
        
        // Bağlı kayıtları kontrol et
        const tubeCount = db.prepare('SELECT COUNT(*) as count FROM tubes WHERE customer_id = ?').get(id)?.count || 0;
        const quoteCount = db.prepare('SELECT COUNT(*) as count FROM quotes WHERE customer_id = ?').get(id)?.count || 0;
        const certCount = db.prepare('SELECT COUNT(*) as count FROM certificates WHERE customer_id = ?').get(id)?.count || 0;
        
        if (tubeCount > 0 || quoteCount > 0 || certCount > 0) {
            // Bağlı kayıtlar var - soft delete yerine kullanıcıya bilgi ver
            return { 
                success: false, 
                error: `Bu müşteriye bağlı kayıtlar var: ${tubeCount} tüp, ${quoteCount} teklif, ${certCount} sertifika. Önce bu kayıtları silmeniz gerekiyor.`,
                hasRelations: true,
                relations: { tubes: tubeCount, quotes: quoteCount, certificates: certCount }
            };
        }
        
        // Bağlı kayıt yoksa sil
        db.prepare('DELETE FROM customers WHERE id = ?').run(id);
        addLog('MÜŞTERİ_SİL', `Müşteri silindi: ${customer?.firma_adi}`);
        return { success: true };
    } catch (error) {
        console.error('Müşteri silme hatası:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('customer:getDetails', async (event, id) => {
    try {
        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
        const tubes = db.prepare('SELECT * FROM tubes WHERE customer_id = ? ORDER BY created_at DESC').all(id);
        return { success: true, data: { customer, tubes } };
    } catch (error) {
        console.error('Müşteri detay hatası:', error);
        return { success: false, error: error.message };
    }
});

// Tüp işlemleri
ipcMain.handle('tube:add', async (event, tube) => {
    try {
        const { seriNo, yil, siraNo } = getNextSerialNumber();

        const result = db.prepare(`
            INSERT INTO tubes (customer_id, tup_cinsi, kilo, seri_no, yil, sira_no, dolum_tarihi, son_kullanim_tarihi, qr_path, location_description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            tube.customer_id,
            tube.tup_cinsi,
            tube.kilo,
            seriNo,
            yil,
            siraNo,
            tube.dolum_tarihi,
            tube.son_kullanim_tarihi,
            tube.qr_path || null,
            tube.location_description || null
        );

        addLog('TÜP_EKLE', `Yeni tüp eklendi: ${seriNo}`);

        return { success: true, id: result.lastInsertRowid, seri_no: seriNo };
    } catch (error) {
        console.error('Tüp ekleme hatası:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('tube:list', async () => {
    try {
        const tubes = db.prepare(`
            SELECT t.*, c.firma_adi, c.telefon, c.yetkili
            FROM tubes t
            LEFT JOIN customers c ON t.customer_id = c.id
            ORDER BY t.created_at DESC
        `).all();
        return { success: true, data: tubes };
    } catch (error) {
        console.error('Tüp listeleme hatası:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('tube:delete', async (event, id) => {
    try {
        const tube = db.prepare('SELECT seri_no FROM tubes WHERE id = ?').get(id);
        db.prepare('DELETE FROM certificates WHERE tube_id = ?').run(id);
        db.prepare('DELETE FROM tubes WHERE id = ?').run(id);
        addLog('TÜP_SİL', `Tüp silindi: ${tube?.seri_no}`);
        return { success: true };
    } catch (error) {
        console.error('Tüp silme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Toplu tüp silme
ipcMain.handle('tube:bulkDelete', async (event, tubeIds) => {
    try {
        let successCount = 0;
        let failedCount = 0;

        const deleteStmt = db.prepare('DELETE FROM tubes WHERE id = ?');
        const deleteCertStmt = db.prepare('DELETE FROM certificates WHERE tube_id = ?');
        
        const transaction = db.transaction((ids) => {
            for (const id of ids) {
                try {
                    deleteCertStmt.run(id);
                    deleteStmt.run(id);
                    successCount++;
                } catch (err) {
                    failedCount++;
                }
            }
        });

        transaction(tubeIds);
        
        addLog('TOPLU_TÜP_SİL', `${successCount} tüp toplu silindi`);
        return { success: true, deleted: successCount, failed: failedCount };
    } catch (error) {
        console.error('Toplu silme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Toplu dolum yapıldı işaretleme
ipcMain.handle('tube:bulkRefill', async (event, data) => {
    try {
        const { tubeIds, refillDate } = data;
        const results = { success: [], failed: [] };
        
        // Dolum süresini hesapla (varsayılan 1 yıl)
        const refillDateObj = new Date(refillDate);
        const nextRefillDate = new Date(refillDateObj);
        nextRefillDate.setFullYear(nextRefillDate.getFullYear() + 1);
        const nextRefillDateStr = nextRefillDate.toISOString().split('T')[0];
        
        for (const tubeId of tubeIds) {
            try {
                const tube = db.prepare('SELECT seri_no FROM tubes WHERE id = ?').get(tubeId);
                
                db.prepare(`
                    UPDATE tubes 
                    SET dolum_tarihi = ?, son_kullanim_tarihi = ?
                    WHERE id = ?
                `).run(refillDate, nextRefillDateStr, tubeId);
                
                results.success.push({ id: tubeId, seri_no: tube?.seri_no });
            } catch (err) {
                results.failed.push({ id: tubeId, error: err.message });
            }
        }
        
        addLog('TOPLU_DOLUM', `${results.success.length} tüp dolumu yapıldı`);
        return { success: true, results };
    } catch (error) {
        console.error('Toplu dolum hatası:', error);
        return { success: false, error: error.message };
    }
});

// Tüp güncelleme (location, field_status, field_note dahil)
ipcMain.handle('tube:update', async (event, tube) => {
    try {
        const existingTube = db.prepare('SELECT * FROM tubes WHERE id = ?').get(tube.id);
        if (!existingTube) {
            return { success: false, error: 'Tüp bulunamadı' };
        }

        // Tüm alanları güncelle
        db.prepare(`
            UPDATE tubes 
            SET customer_id = ?,
                tup_cinsi = ?,
                kilo = ?,
                dolum_tarihi = ?,
                son_kullanim_tarihi = ?,
                location_description = ?,
                field_status = ?,
                field_note = ?,
                field_checked_at = ?
            WHERE id = ?
        `).run(
            tube.customer_id || existingTube.customer_id,
            tube.tup_cinsi || existingTube.tup_cinsi,
            tube.kilo || existingTube.kilo,
            tube.dolum_tarihi || existingTube.dolum_tarihi,
            tube.son_kullanim_tarihi || existingTube.son_kullanim_tarihi,
            tube.location_description || null,
            tube.field_status || null,
            tube.field_note || null,
            tube.field_checked_at || null,
            tube.id
        );

        addLog('TÜP_GÜNCELLE', `Tüp güncellendi: ${existingTube.seri_no}`);
        return { success: true };
    } catch (error) {
        console.error('Tüp güncelleme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Tüp konum güncelleme (sadece location_description)
ipcMain.handle('tube:updateLocation', async (event, data) => {
    try {
        const { tubeId, location } = data;
        db.prepare('UPDATE tubes SET location_description = ? WHERE id = ?').run(location, tubeId);
        return { success: true };
    } catch (error) {
        console.error('Konum güncelleme hatası:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('tube:getExpiring', async () => {
    try {
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        const dateStr = thirtyDaysLater.toISOString().split('T')[0];

        const tubes = db.prepare(`
            SELECT t.*, c.firma_adi, c.telefon, c.yetkili
            FROM tubes t
            LEFT JOIN customers c ON t.customer_id = c.id
            WHERE t.son_kullanim_tarihi <= ?
            ORDER BY t.son_kullanim_tarihi ASC
        `).all(dateStr);
        return { success: true, data: tubes };
    } catch (error) {
        console.error('Süresi dolan tüpler hatası:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('tube:getByCustomer', async (event, customerId) => {
    try {
        const tubes = db.prepare(`
            SELECT * FROM tubes WHERE customer_id = ? ORDER BY created_at DESC
        `).all(customerId);
        return { success: true, data: tubes };
    } catch (error) {
        console.error('Müşteri tüpleri hatası:', error);
        return { success: false, error: error.message };
    }
});

// İstatistikler
ipcMain.handle('stats:get', async () => {
    try {
        const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
        const tubeCount = db.prepare('SELECT COUNT(*) as count FROM tubes').get().count;
        const activeTubeCount = db.prepare("SELECT COUNT(*) as count FROM tubes").get().count;
        const certificateCount = db.prepare('SELECT COUNT(*) as count FROM certificates').get().count;

        // Son 30 günde eklenen tüpler
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentTubes = db.prepare(`
            SELECT COUNT(*) as count FROM tubes WHERE created_at >= ?
        `).get(thirtyDaysAgo.toISOString()).count;

        // Süresi yaklaşan tüpler (30 gün içinde)
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        const expiringTubes = db.prepare(`
            SELECT COUNT(*) as count FROM tubes 
            WHERE son_kullanim_tarihi <= ?
        `).get(thirtyDaysLater.toISOString().split('T')[0]).count;

        return {
            success: true,
            data: {
                customerCount,
                tubeCount,
                activeTubeCount,
                certificateCount,
                recentTubes,
                expiringTubes
            }
        };
    } catch (error) {
        console.error('İstatistik hatası:', error);
        return { success: false, error: error.message };
    }
});

// Loglar
ipcMain.handle('logs:list', async (event, limit = 100) => {
    try {
        const logs = db.prepare(`
            SELECT * FROM logs ORDER BY created_at DESC LIMIT ?
        `).all(limit);
        return { success: true, data: logs };
    } catch (error) {
        console.error('Log listeleme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Ayarlar
ipcMain.handle('settings:get', async () => {
    try {
        const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
        // logo_path'i logo olarak da ekle (frontend uyumluluğu için)
        if (settings) {
            settings.logo = settings.logo_path;
        }
        return { success: true, data: settings };
    } catch (error) {
        console.error('Ayarlar hatası:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('settings:save', async (event, settings) => {
    try {
        db.prepare(`
            UPDATE settings 
            SET company_name = ?, 
                phone = ?, 
                address = ?, 
                email = ?, 
                website = ?, 
                logo_path = ?, 
                tax_office = ?, 
                tax_number = ?,
                bank_name = ?,
                iban = ?,
                kdv_rate = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        `).run(
            settings.company_name, 
            settings.phone, 
            settings.address, 
            settings.email, 
            settings.website, 
            settings.logo || null,
            settings.tax_office || null,
            settings.tax_number || null,
            settings.bank_name || null,
            settings.iban || null,
            settings.kdv_rate || '20'
        );
        addLog('AYARLAR_GÜNCELLE', 'Firma ayarları güncellendi');
        return { success: true };
    } catch (error) {
        console.error('Ayar kaydetme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Shell işlemleri
ipcMain.handle('shell:openExternal', async (event, url) => {
    try {
        await shell.openExternal(url);
        return { success: true };
    } catch (error) {
        console.error('URL açma hatası:', error);
        return { success: false, error: error.message };
    }
});

// Yedekleme işlemleri
ipcMain.handle('backup:create', async () => {
    try {
        const backupPath = getBackupPath();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupPath, `backup_${timestamp}.db`);
        const dbPath = path.join(getDataPath(), 'ucler_yangin.db');

        fs.copyFileSync(dbPath, backupFile);
        addLog('YEDEKLEME', `Yedek oluşturuldu: backup_${timestamp}.db`);
        return { success: true, path: backupFile };
    } catch (error) {
        console.error('Yedekleme hatası:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('backup:list', async () => {
    try {
        const backupPath = getBackupPath();
        const files = fs.readdirSync(backupPath)
            .filter(f => f.endsWith('.db'))
            .map(f => ({
                name: f,
                path: path.join(backupPath, f),
                date: fs.statSync(path.join(backupPath, f)).mtime
            }))
            .sort((a, b) => b.date - a.date);
        return { success: true, data: files };
    } catch (error) {
        console.error('Yedek listeleme hatası:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('backup:restore', async (event, backupFile) => {
    try {
        const dbPath = path.join(getDataPath(), 'ucler_yangin.db');
        db.close();
        fs.copyFileSync(backupFile, dbPath);
        initDatabase();
        addLog('GERİ_YÜKLEME', `Yedek geri yüklendi: ${path.basename(backupFile)}`);
        return { success: true };
    } catch (error) {
        console.error('Geri yükleme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Sertifika işlemleri
ipcMain.handle('certificate:list', async () => {
    try {
        // Önce tüm sertifika kayıtlarını çek (gemi bilgileri dahil)
        const allCerts = db.prepare(`
            SELECT 
                cert.id,
                cert.certificate_number,
                cert.tube_id,
                cert.customer_id,
                cert.issue_date,
                cert.created_at,
                cert.created_by,
                cert.pdf_path,
                cert.gemi_adi,
                cert.groston,
                cert.gemi_cinsi,
                cert.liman,
                t.seri_no,
                t.tup_cinsi,
                t.kilo,
                t.dolum_tarihi,
                t.son_kullanim_tarihi as expiry_date,
                c.firma_adi
            FROM certificates cert
            INNER JOIN tubes t ON cert.tube_id = t.id
            INNER JOIN customers c ON cert.customer_id = c.id
            ORDER BY cert.created_at DESC
        `).all();

        // Aynı sertifika numarasına sahip kayıtları grupla
        const groupedCerts = {};
        for (const cert of allCerts) {
            if (!groupedCerts[cert.certificate_number]) {
                groupedCerts[cert.certificate_number] = {
                    id: cert.id,
                    certificate_number: cert.certificate_number,
                    customer_id: cert.customer_id,
                    firma_adi: cert.gemi_adi || cert.firma_adi,
                    customer_name: cert.firma_adi,
                    gemi_adi: cert.gemi_adi,
                    groston: cert.groston,
                    gemi_cinsi: cert.gemi_cinsi,
                    liman: cert.liman || 'MARMARİS',
                    issue_date: cert.issue_date,
                    created_at: cert.created_at,
                    created_by: cert.created_by,
                    pdf_path: cert.pdf_path,
                    items: [],
                    tube_count: 0
                };
            }
            // Tüp detaylarını items dizisine ekle
            groupedCerts[cert.certificate_number].items.push({
                id: cert.tube_id,
                seri_no: cert.seri_no,
                tup_cinsi: cert.tup_cinsi,
                kilo: cert.kilo,
                son_dolum_tarihi: cert.dolum_tarihi,
                son_kullanim_tarihi: cert.expiry_date
            });
            groupedCerts[cert.certificate_number].tube_count++;
        }

        // Grupları diziye çevir
        const certificates = Object.values(groupedCerts);
        
        return { success: true, data: certificates };
    } catch (error) {
        console.error('Sertifika listeleme hatası:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('certificate:add', async (event, data) => {
    try {
        const { tube_id } = data;

        // Tüp bilgilerini al
        const tube = db.prepare('SELECT customer_id FROM tubes WHERE id = ?').get(tube_id);
        if (!tube) {
            return { success: false, error: 'Tüp bulunamadı' };
        }

        // Sertifika numarası üret
        const { certificate_number } = getNextCertificateNumber();
        const issue_date = new Date().toISOString().split('T')[0];

        const result = db.prepare(`
            INSERT INTO certificates (certificate_number, tube_id, customer_id, issue_date, created_by)
            VALUES (?, ?, ?, ?, ?)
        `).run(certificate_number, tube_id, tube.customer_id, issue_date, 'Admin');

        addLog('SERTİFİKA_EKLE', `Yeni sertifika oluşturuldu: ${certificate_number}`);

        return { success: true, id: result.lastInsertRowid, certificate_number };
    } catch (error) {
        console.error('Sertifika ekleme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Toplu sertifika ekleme - Bir firmaya ait birden fazla tüp için tek sertifika
ipcMain.handle('certificate:addBatch', async (event, data) => {
    try {
        const { customer_id, tube_ids, tubes, gemi_adi, groston, gemi_cinsi, liman } = data;

        if (!tube_ids || tube_ids.length === 0) {
            return { success: false, error: 'En az bir tüp seçilmelidir' };
        }

        // Müşteri bilgilerini al
        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
        if (!customer) {
            return { success: false, error: 'Müşteri bulunamadı' };
        }

        // Sertifika numarası üret
        const { certificate_number } = getNextCertificateNumber();
        const issue_date = new Date().toISOString().split('T')[0];
        
        // Ayarlardan geçerlilik süresini al (ay cinsinden, varsayılan 12)
        const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
        const validityMonths = parseInt(settings?.certificate_validity) || 12;
        
        // Son kullanma tarihi hesapla
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + validityMonths);
        const expiry_date = expiryDate.toISOString().split('T')[0];

        // Tüp detaylarını JSON olarak sakla
        const tubeDetails = tubes.map(t => ({
            id: t.id,
            seri_no: t.seri_no,
            tup_cinsi: t.tup_cinsi,
            kilo: t.kilo,
            son_dolum_tarihi: t.son_dolum_tarihi,
            son_kullanim_tarihi: t.son_kullanim_tarihi
        }));

        // Her tüp için sertifika kaydı oluştur (aynı sertifika numarasıyla)
        const insertStmt = db.prepare(`
            INSERT INTO certificates (certificate_number, tube_id, customer_id, issue_date, created_by, gemi_adi, groston, gemi_cinsi, liman)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const gemiAdiVal = gemi_adi || customer.firma_adi;
        const grostonVal = groston || '';
        const gemiCinsiVal = gemi_cinsi || '';
        const limanVal = liman || 'MARMARİS';

        for (const tubeId of tube_ids) {
            insertStmt.run(certificate_number, tubeId, customer_id, issue_date, 'Admin', gemiAdiVal, grostonVal, gemiCinsiVal, limanVal);
        }

        addLog('SERTİFİKA_EKLE', `Toplu sertifika oluşturuldu: ${certificate_number} (${tube_ids.length} tüp)`);

        // Yazdırma için hazır veri döndür
        const certificateData = {
            certificate_number,
            customer_id,
            firma_adi: gemi_adi || customer.firma_adi,
            groston: groston || '',
            gemi_cinsi: gemi_cinsi || '',
            liman: liman || 'MARMARİS',
            issue_date,
            expiry_date,
            items: tubeDetails,
            tube_count: tube_ids.length
        };

        return { 
            success: true, 
            certificate_number,
            certificateData
        };
    } catch (error) {
        console.error('Toplu sertifika ekleme hatası:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('certificate:delete', async (event, idOrNumber) => {
    try {
        let certificate_number;
        
        // Eğer numara string ise sertifika numarası, değilse id
        if (typeof idOrNumber === 'string' && idOrNumber.includes('-')) {
            certificate_number = idOrNumber;
        } else {
            const cert = db.prepare('SELECT certificate_number FROM certificates WHERE id = ?').get(idOrNumber);
            certificate_number = cert?.certificate_number;
        }
        
        if (!certificate_number) {
            return { success: false, error: 'Sertifika bulunamadı' };
        }
        
        // Aynı sertifika numarasına sahip tüm kayıtları sil
        db.prepare('DELETE FROM certificates WHERE certificate_number = ?').run(certificate_number);
        addLog('SERTİFİKA_SİL', `Sertifika silindi: ${certificate_number}`);
        return { success: true };
    } catch (error) {
        console.error('Sertifika silme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Sertifika HTML template oluştur - Ortak fonksiyon
function generateCertificateHTML(certData, companyLogo, companyName, companyPhone, companyEmail, companyAddress, tableRows, todayParts) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Sertifika - ${certData.certificate_number}</title>
            <style>
                @page { size: A4; margin: 10mm; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: Arial, sans-serif; 
                    background: white; 
                    color: #1a1a1a;
                    font-size: 11px;
                    line-height: 1.4;
                }
                .certificate { 
                    max-width: 210mm; 
                    margin: 0 auto; 
                    padding: 15px 20px;
                }
                
                /* Header */
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 10px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #c0392b;
                }
                .company-section {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                }
                .company-logo {
                    width: 60px;
                    height: 60px;
                    object-fit: contain;
                }
                .company-info {
                    font-size: 10px;
                    color: #333;
                    line-height: 1.5;
                }
                .company-name {
                    font-size: 14px;
                    font-weight: bold;
                    color: #c0392b;
                    margin-bottom: 3px;
                }
                
                /* Title Section */
                .title-section {
                    text-align: center;
                    margin: 15px 0;
                    position: relative;
                }
                .certificate-title {
                    font-size: 36px;
                    font-weight: bold;
                    color: #c0392b;
                    font-style: italic;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
                    position: relative;
                    z-index: 1;
                }
                .certificate-subtitle {
                    font-size: 12px;
                    color: #666;
                    margin-top: 3px;
                }
                .certificate-main-title {
                    font-size: 13px;
                    font-weight: bold;
                    color: #c0392b;
                    margin-top: 8px;
                    text-transform: uppercase;
                }
                
                /* TSE Notice */
                .tse-notice {
                    background: #fff;
                    padding: 8px 12px;
                    font-size: 9px;
                    color: #333;
                    text-align: justify;
                    margin: 10px 0;
                    border: 1px solid #ddd;
                    line-height: 1.4;
                }
                
                /* Info Boxes */
                .info-section {
                    display: flex;
                    gap: 15px;
                    margin: 15px 0;
                }
                .info-box {
                    flex: 1;
                    border: 1px solid #c0392b;
                }
                .info-box-header {
                    background: #c0392b;
                    color: white;
                    padding: 5px 10px;
                    font-weight: bold;
                    font-size: 10px;
                }
                .info-box-content {
                    padding: 8px 10px;
                }
                .info-row {
                    display: flex;
                    margin-bottom: 4px;
                }
                .info-label {
                    font-weight: bold;
                    font-size: 10px;
                    color: #333;
                    min-width: 120px;
                }
                .info-label-en {
                    font-size: 9px;
                    color: #666;
                    font-weight: normal;
                }
                .info-value {
                    font-size: 10px;
                    color: #000;
                }
                
                /* Certificate Number Box */
                .cert-number-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin: 10px 0;
                    padding: 8px 15px;
                    background: #f5f5f5;
                    border: 1px solid #ddd;
                }
                .cert-type-desc {
                    font-size: 10px;
                    font-weight: bold;
                }
                .cert-number-box {
                    text-align: right;
                }
                .cert-number-label {
                    font-size: 10px;
                    color: #c0392b;
                    font-weight: bold;
                }
                .cert-number-value {
                    font-size: 14px;
                    font-weight: bold;
                    color: #c0392b;
                }
                
                /* Customer Info */
                .customer-section {
                    border: 1px solid #333;
                    margin: 10px 0;
                }
                .customer-row {
                    display: flex;
                    border-bottom: 1px solid #ddd;
                }
                .customer-row:last-child {
                    border-bottom: none;
                }
                .customer-cell {
                    flex: 1;
                    padding: 6px 10px;
                    border-right: 1px solid #ddd;
                }
                .customer-cell:last-child {
                    border-right: none;
                }
                .customer-label {
                    font-size: 9px;
                    color: #c0392b;
                    font-weight: bold;
                }
                .customer-label-en {
                    font-size: 8px;
                    color: #666;
                }
                .customer-value {
                    font-size: 11px;
                    font-weight: bold;
                    color: #000;
                    margin-top: 2px;
                }
                
                /* Table Declaration */
                .table-declaration {
                    text-align: center;
                    font-size: 10px;
                    font-weight: bold;
                    margin: 15px 0 8px;
                    padding: 5px;
                    background: #f9f9f9;
                }
                
                /* Main Table */
                .main-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 10px 0;
                    font-size: 10px;
                }
                .main-table th {
                    background: #c0392b;
                    color: white;
                    padding: 6px 4px;
                    text-align: center;
                    font-size: 9px;
                    border: 1px solid #a93226;
                }
                .main-table th .th-en {
                    display: block;
                    font-size: 8px;
                    font-weight: normal;
                    color: #ffcccc;
                }
                .main-table td {
                    padding: 5px 4px;
                    border: 1px solid #ddd;
                    font-size: 10px;
                }
                .main-table tr:nth-child(even) {
                    background: #f9f9f9;
                }
                
                /* Footer Section - Notice and Date side by side */
                .footer-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: stretch;
                    margin-top: 15px;
                    gap: 15px;
                    border: 2px solid #c0392b;
                }
                .footer-notice-box {
                    flex: 1;
                    padding: 10px;
                    font-size: 9px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .footer-notice-tr {
                    color: #333;
                    margin-bottom: 5px;
                    font-weight: bold;
                }
                .footer-notice-en {
                    color: #666;
                    font-style: italic;
                }
                .date-box {
                    border-left: 2px solid #c0392b;
                    text-align: center;
                    min-width: 180px;
                }
                .date-header {
                    display: flex;
                    background: #ffe0d0;
                }
                .date-header span {
                    flex: 1;
                    padding: 4px 8px;
                    font-size: 9px;
                    font-weight: bold;
                    border-right: 1px solid #c0392b;
                }
                .date-header span:last-child {
                    border-right: none;
                }
                .date-values {
                    display: flex;
                    background: #fff;
                }
                .date-values span {
                    flex: 1;
                    padding: 8px;
                    font-size: 14px;
                    font-weight: bold;
                    border-right: 1px solid #c0392b;
                }
                .date-values span:last-child {
                    border-right: none;
                }
                
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .certificate { padding: 10px; }
                }
            </style>
        </head>
        <body>
            <div class="certificate">
                <!-- Header -->
                <div class="header">
                    <div class="company-section">
                        ${companyLogo ? `<img src="${companyLogo}" class="company-logo" alt="Logo" />` : ''}
                        <div>
                            <div class="company-name">${companyName}</div>
                            <div class="company-info">
                                ${companyAddress}<br>
                                Gsm: ${companyPhone}<br>
                                ${companyEmail}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Title Section with Flag Background -->
                <div class="title-section">
                    <div class="certificate-title">CERTIFICATE</div>
                    <div class="certificate-subtitle">Of Inspection</div>
                    <div class="certificate-main-title">
                        CERTIFICATE ON EXAMINATION AND TESTING<br>
                        OF FIRE EXTINGUISHING SYSTEMS OR THEIR COMPONENTS
                    </div>
                </div>
                
                <!-- TSE Notice -->
                <div class="tse-notice">
                    BU BELGE ULAŞTIRMA VE ALTYAPI BAKANLIĞI MARMARİS BÖLGE LİMAN BAŞKANLIĞI'NIN 07.03.2025 TARİH VE 2025/02 BELGE NOLU YANGIN SÖNDÜRME SİSTEMLERİ VE CİHAZLARININ BASINÇ TESTİ BAKIMI DOLUMU İLE CO2 CİHAZ VE SİSTEMLERİNİN BASINÇ TESTİ, BAKIMI DOLUMU VE SATIŞINI YAPABİLECEK ŞEKİLDE <strong>"MUAYENE VE TEST SERTİFİKASI"</strong> DÜZENLEME YETKİ BELGESİNE İSTİNADEN DÜZENLENMİŞTİR.
                </div>
                
                <!-- Certificate Number Section -->
                <div class="cert-number-section">
                    <div class="cert-type-desc">
                        PORTABLE EXTINGUISHERS<br>
                        AND SPARE CHARGES
                    </div>
                    <div class="cert-number-box">
                        <div class="cert-number-label">SERTİFİKA NO / CERTIFICATE NO:</div>
                        <div class="cert-number-value">${certData.certificate_number}</div>
                    </div>
                </div>
                
                <!-- Customer/Ship Info -->
                <div class="customer-section">
                    <div class="customer-row">
                        <div class="customer-cell">
                            <div class="customer-label">GEMİNİN ADI <span class="customer-label-en">/ SHIP'S NAME</span></div>
                            <div class="customer-value">${certData.firma_adi || certData.gemi_adi || certData.customer_name || '-'}</div>
                        </div>
                        <div class="customer-cell">
                            <div class="customer-label">GROSTON <span class="customer-label-en">/ GRT</span></div>
                            <div class="customer-value">${certData.groston || certData.grt || '-'}</div>
                        </div>
                        <div class="customer-cell">
                            <div class="customer-label">GEMİNİN CİNSİ <span class="customer-label-en">/ TYPE OF SHIP</span></div>
                            <div class="customer-value">${certData.gemi_cinsi || certData.ship_type || '-'}</div>
                        </div>
                        <div class="customer-cell">
                            <div class="customer-label">LİMAN / BAYRAĞI <span class="customer-label-en">/ PORT OF REGISTRY / FLAG</span></div>
                            <div class="customer-value">${certData.liman || certData.port || 'MARMARİS'}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Table Declaration -->
                <div class="table-declaration">
                    WE HEREBY DECLARE AND CERTIFY THE INSPECTION AND MAINTENANCE OF FOLLOWING EQUIPMENT
                </div>
                
                <!-- Main Equipment Table -->
                <table class="main-table">
                    <thead>
                        <tr>
                            <th>YSC CİNSİ<span class="th-en">TYPE CLASS</span></th>
                            <th>AĞIRLIK<span class="th-en">FIRE WEIGHT</span></th>
                            <th>ADET<span class="th-en">UNIT</span></th>
                            <th>DOLUM TARİHİ<span class="th-en">DATE REFILLED</span></th>
                            <th>KONTROL TARİHİ<span class="th-en">CONTROL DATE</span></th>
                            <th>SON KULLANMA TARİHİ<span class="th-en">DATE OF VALIDITY</span></th>
                            <th>SERİ NO<span class="th-en">SERIAL NUMBER</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
                
                <!-- Footer Section with Notice and Date -->
                <div class="footer-section">
                    <div class="footer-notice-box">
                        <div class="footer-notice-tr">
                            BU SERTİFİKA YUKARIDA ADI GEÇEN GEMİYE AİT YANGIN SÖNDÜRÜCÜLERİN KONTROL EDİLDİĞİNİ VE MÜHÜRLENDİĞİNİ GÖSTERMEK ÜZERE VERİLMİŞTİR.
                        </div>
                        <div class="footer-notice-en">
                            THIS CERTIFICATE HAS BEEN ISSUED TO PROVE ABOVE SHIP'S SPECIFIED FIRE FIGHTING EQUIPMENT HAVE BEEN INSPECTED AND MAINTAINED.
                        </div>
                    </div>
                    <div class="date-box">
                        <div class="date-header">
                            <span>DAY / GÜN</span>
                            <span>MONTH / AY</span>
                            <span>YEAR / YIL</span>
                        </div>
                        <div class="date-values">
                            <span>${todayParts.day}</span>
                            <span>${todayParts.month}</span>
                            <span>${todayParts.year}</span>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
}

ipcMain.handle('certificate:print', async (event, certData) => {
    try {
        const { BrowserWindow } = require('electron');

        // Firma ayarlarını al
        const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
        const companyLogo = settings?.logo_path || '';
        const companyName = settings?.company_name || 'YANGIN SÖNDÜRME';
        const companyPhone = settings?.phone || '';
        const companyEmail = settings?.email || '';
        const companyAddress = settings?.address || '';

        // Tarih formatla
        const formatDate = (dateStr) => {
            if (!dateStr) return '-';
            const date = new Date(dateStr);
            return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };

        // Tarih parçalarını al
        const getDateParts = (dateStr) => {
            if (!dateStr) return { day: '-', month: '-', year: '-' };
            const date = new Date(dateStr);
            return {
                day: date.getDate().toString().padStart(2, '0'),
                month: (date.getMonth() + 1).toString().padStart(2, '0'),
                year: date.getFullYear().toString()
            };
        };

        const today = new Date();
        const todayParts = getDateParts(today);
        
        const items = certData.items || [certData];
        const validityMonths = parseInt(settings?.certificate_validity) || 12;
        
        // Tablo satırlarını oluştur
        const tableRows = items.map(item => {
            const dolumTarihi = item.son_dolum_tarihi || item.issue_date || certData.issue_date || today.toISOString().split('T')[0];
            let sonKullanmaTarihi = item.son_kullanim_tarihi || item.expiry_date;
            if (!sonKullanmaTarihi) {
                const expDate = new Date(dolumTarihi);
                expDate.setMonth(expDate.getMonth() + validityMonths);
                sonKullanmaTarihi = expDate.toISOString().split('T')[0];
            }
            
            return `
            <tr>
                <td>${getTubeTypeShortCode(item.tup_cinsi) || 'CO2'}</td>
                <td style="text-align: center;">${item.kilo || 6}</td>
                <td style="text-align: center;">1</td>
                <td style="text-align: center;">${formatDate(dolumTarihi)}</td>
                <td style="text-align: center;">${formatDate(dolumTarihi)}</td>
                <td style="text-align: center;">${formatDate(sonKullanmaTarihi)}</td>
                <td style="text-align: center;">${item.seri_no || '-'}</td>
            </tr>
        `}).join('');

        // Ortak HTML fonksiyonunu kullan
        const htmlContent = generateCertificateHTML(certData, companyLogo, companyName, companyPhone, companyEmail, companyAddress, tableRows, todayParts);

        // Görünür bir pencere oluştur (yazdırma için)
        const printWindow = new BrowserWindow({
            width: 900,
            height: 700,
            show: true,
            title: 'Sertifika - ' + certData.certificate_number,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
        await printWindow.loadURL(dataUrl);

        // Sayfa tamamen yüklendikten sonra yazdır
        printWindow.webContents.on('did-finish-load', async () => {
            setTimeout(async () => {
                try {
                    printWindow.webContents.print({
                        silent: false,
                        printBackground: true,
                        pageSize: 'A4',
                        margins: {
                            marginType: 'custom',
                            top: 0.5,
                            bottom: 0.5,
                            left: 0.5,
                            right: 0.5
                        }
                    }, (success, failureReason) => {
                        if (!success && failureReason !== 'cancelled') {
                            console.error('Yazdırma hatası:', failureReason);
                        }
                        printWindow.close();
                    });
                } catch (err) {
                    console.error('Yazdırma hatası:', err);
                    printWindow.close();
                }
            }, 500);
        });

        return { success: true };
    } catch (error) {
        console.error('Sertifika yazdırma hatası:', error);
        return { success: false, error: error.message };
    }
});

// Sertifika PDF olarak indir
ipcMain.handle('certificate:downloadPDF', async (event, certData) => {
    const { BrowserWindow, dialog, shell } = require('electron');
    const fs = require('fs');
    const os = require('os');

    // Firma ayarlarını al
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    const companyLogo = settings?.logo_path || '';
    const companyName = settings?.company_name || 'YANGIN SÖNDÜRME';
    const companyPhone = settings?.phone || '';
    const companyEmail = settings?.email || '';
    const companyAddress = settings?.address || '';

    // Tarih formatla
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const getDateParts = (dateStr) => {
        if (!dateStr) return { day: '-', month: '-', year: '-' };
        const date = new Date(dateStr);
        return {
            day: date.getDate().toString().padStart(2, '0'),
            month: (date.getMonth() + 1).toString().padStart(2, '0'),
            year: date.getFullYear().toString()
        };
    };

    const today = new Date();
    const todayParts = getDateParts(today);
    const items = certData.items || [certData];
    const validityMonths = parseInt(settings?.certificate_validity) || 12;
    
    const tableRows = items.map(item => {
        const dolumTarihi = item.son_dolum_tarihi || item.issue_date || certData.issue_date || today.toISOString().split('T')[0];
        let sonKullanmaTarihi = item.son_kullanim_tarihi || item.expiry_date;
        if (!sonKullanmaTarihi) {
            const expDate = new Date(dolumTarihi);
            expDate.setMonth(expDate.getMonth() + validityMonths);
            sonKullanmaTarihi = expDate.toISOString().split('T')[0];
        }
        return `
        <tr>
            <td>${getTubeTypeShortCode(item.tup_cinsi) || 'CO2'}</td>
            <td style="text-align: center;">${item.kilo || 6}</td>
            <td style="text-align: center;">1</td>
            <td style="text-align: center;">${formatDate(dolumTarihi)}</td>
            <td style="text-align: center;">${formatDate(dolumTarihi)}</td>
            <td style="text-align: center;">${formatDate(sonKullanmaTarihi)}</td>
            <td style="text-align: center;">${item.seri_no || '-'}</td>
        </tr>
    `}).join('');

    const htmlContent = generateCertificateHTML(certData, companyLogo, companyName, companyPhone, companyEmail, companyAddress, tableRows, todayParts);

    // Masaüstü yolunu al
    const desktopPath = path.join(os.homedir(), 'Desktop');
    const defaultFileName = `Sertifika-${certData.certificate_number}.pdf`;
    
    // Dialog aç
    const result = await dialog.showSaveDialog({
        title: 'Sertifikayı PDF Olarak Kaydet',
        defaultPath: path.join(desktopPath, defaultFileName),
        filters: [{ name: 'PDF Dosyası', extensions: ['pdf'] }]
    });
    
    if (result.canceled) {
        return { success: false, error: 'İptal edildi' };
    }
    
    const savePath = result.filePath;

    // PDF penceresi oluştur
    const pdfWindow = new BrowserWindow({
        width: 900,
        height: 700,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    await pdfWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));

    // Biraz bekle ve PDF oluştur
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
        const pdfData = await pdfWindow.webContents.printToPDF({
            printBackground: true,
            pageSize: 'A4',
            margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 }
        });
        
        fs.writeFileSync(savePath, pdfData);
        pdfWindow.close();
        
        // PDF'i aç
        shell.openPath(savePath);
        
        return { success: true, path: savePath };
    } catch (err) {
        pdfWindow.close();
        console.error('PDF oluşturma hatası:', err);
        return { success: false, error: err.message };
    }
});

// Fiyat işlemleri
ipcMain.handle('price:save', async (event, data) => {
    try {
        const category = data.category || 'Yangın Tüpü';
        const existing = db.prepare('SELECT id FROM prices WHERE tup_cinsi = ? AND kilo = ? AND category = ?')
            .get(data.tup_cinsi, data.kilo, category);
        
        // Dolum toplam hesapla (parçalar varsa topla, yoksa dolum_fiyati kullan)
        const dolumManometre = data.dolum_manometre || 0;
        const dolumTetik = data.dolum_tetik || 0;
        const dolumHortum = data.dolum_hortum || 0;
        const dolumBoya = data.dolum_boya || 0;
        const dolumToplam = dolumManometre + dolumTetik + dolumHortum + dolumBoya;
        const dolumFiyati = dolumToplam > 0 ? dolumToplam : (data.dolum_fiyati || 0);
        
        if (existing) {
            db.prepare(`
                UPDATE prices 
                SET fiyat = ?, dolum_fiyati = ?, hortum_fiyati = ?, category = ?,
                    dolum_manometre = ?, dolum_tetik = ?, dolum_hortum = ?, dolum_boya = ?,
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `).run(
                data.fiyat, dolumFiyati, data.hortum_fiyati || 0, category,
                dolumManometre, dolumTetik, dolumHortum, dolumBoya, existing.id
            );
        } else {
            db.prepare(`
                INSERT INTO prices (tup_cinsi, kilo, fiyat, dolum_fiyati, hortum_fiyati, category, dolum_manometre, dolum_tetik, dolum_hortum, dolum_boya) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                data.tup_cinsi, data.kilo, data.fiyat, dolumFiyati, data.hortum_fiyati || 0, category,
                dolumManometre, dolumTetik, dolumHortum, dolumBoya
            );
        }
        addLog('FİYAT_GÜNCELLE', `${data.tup_cinsi} ${data.kilo}KG fiyatı güncellendi (${category})`);
        return { success: true };
    } catch (error) {
        console.error('Fiyat kaydetme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Toplu fiyat güncelleme
ipcMain.handle('price:bulkUpdate', async (event, data) => {
    try {
        const { priceType, operation, percentage, category } = data;
        const multiplier = operation === 'increase' 
            ? (1 + percentage / 100) 
            : (1 - percentage / 100);

        let column = 'fiyat';
        if (priceType === 'dolum') column = 'dolum_fiyati';
        else if (priceType === 'hortum') column = 'hortum_fiyati';
        else if (priceType === 'dolum_manometre') column = 'dolum_manometre';
        else if (priceType === 'dolum_tetik') column = 'dolum_tetik';
        else if (priceType === 'dolum_hortum') column = 'dolum_hortum';
        else if (priceType === 'dolum_boya') column = 'dolum_boya';

        // Sadece seçili kategorideki kayıtları güncelle
        const categoryFilter = category ? 'WHERE category = ?' : '';
        
        if (category) {
            db.prepare(`
                UPDATE prices 
                SET ${column} = ROUND(${column} * ?, 2), updated_at = CURRENT_TIMESTAMP
                ${categoryFilter}
            `).run(multiplier, category);
        } else {
            db.prepare(`
                UPDATE prices 
                SET ${column} = ROUND(${column} * ?, 2), updated_at = CURRENT_TIMESTAMP
            `).run(multiplier);
        }

        addLog('TOPLU_FİYAT_GÜNCELLE', `${category || 'Tüm'} kategoride ${column} %${percentage} ${operation === 'increase' ? 'artırıldı' : 'azaltıldı'}`);
        return { success: true };
    } catch (error) {
        console.error('Toplu fiyat güncelleme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Excel'den fiyat import
ipcMain.handle('price:importExcel', async (event, pricesData) => {
    try {
        let imported = 0;
        let updated = 0;
        
        for (const price of pricesData) {
            const category = price.category || 'Yangın Tüpü';
            const existing = db.prepare('SELECT id FROM prices WHERE tup_cinsi = ? AND kilo = ? AND category = ?')
                .get(price.tup_cinsi, price.kilo, category);
            
            // Dolum parça fiyatları
            const dolumManometre = price.dolum_manometre || 0;
            const dolumTetik = price.dolum_tetik || 0;
            const dolumHortum = price.dolum_hortum || 0;
            const dolumBoya = price.dolum_boya || 0;
            const dolumToplam = dolumManometre + dolumTetik + dolumHortum + dolumBoya;
            const dolumFiyati = dolumToplam > 0 ? dolumToplam : (price.dolum_fiyati || 0);
            
            if (existing) {
                db.prepare(`
                    UPDATE prices 
                    SET fiyat = ?, dolum_fiyati = ?, hortum_fiyati = ?, category = ?,
                        dolum_manometre = ?, dolum_tetik = ?, dolum_hortum = ?, dolum_boya = ?,
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `).run(
                    price.fiyat || 0, dolumFiyati, price.hortum_fiyati || 0, category,
                    dolumManometre, dolumTetik, dolumHortum, dolumBoya, existing.id
                );
                updated++;
            } else {
                db.prepare(`
                    INSERT INTO prices (tup_cinsi, kilo, fiyat, dolum_fiyati, hortum_fiyati, category, dolum_manometre, dolum_tetik, dolum_hortum, dolum_boya) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    price.tup_cinsi, price.kilo, price.fiyat || 0, dolumFiyati, price.hortum_fiyati || 0, category,
                    dolumManometre, dolumTetik, dolumHortum, dolumBoya
                );
                imported++;
            }
        }

        addLog('FİYAT_IMPORT', `Excel'den ${imported} yeni fiyat eklendi, ${updated} fiyat güncellendi`);
        return { success: true, imported, updated };
    } catch (error) {
        console.error('Fiyat import hatası:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('price:list', async () => {
    try {
        const prices = db.prepare('SELECT * FROM prices ORDER BY category, tup_cinsi, kilo').all();
        return { success: true, data: prices };
    } catch (error) {
        console.error('Fiyat listeleme hatası:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('price:delete', async (event, id) => {
    try {
        db.prepare('DELETE FROM prices WHERE id = ?').run(id);
        return { success: true };
    } catch (error) {
        console.error('Fiyat silme hatası:', error);
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
        console.error('Bugün aranacaklar hatası:', error);
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
                SET status = ?, notes = ?, created_at = datetime('now', 'localtime')
                WHERE id = ?
            `).run(status || 'called', notes || null, existing.id);
        } else {
            // Yeni kayıt
            db.prepare(`
                INSERT INTO call_logs (customer_id, call_date, status, notes)
                VALUES (?, datetime('now', 'localtime'), ?, ?)
            `).run(customerId, status || 'called', notes || null);
        }

        addLog('MÜŞTERİ_ARAMA', `Müşteri arama durumu güncellendi: ${status}`);

        return { success: true };
    } catch (error) {
        console.error('Arama işaretleme hatası:', error);
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

        addLog('ARAMA_NOTU', `Arama notu eklendi`);

        return { success: true };
    } catch (error) {
        console.error('Not ekleme hatası:', error);
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
        console.error('Arama geçmişi hatası:', error);
        return { success: false, error: error.message };
    }
});

// Teklif işlemleri
ipcMain.handle('quote:list', async () => {
    try {
        const quotes = db.prepare(`
            SELECT q.*, c.firma_adi, c.telefon, c.yetkili, c.email, c.adres
            FROM quotes q
            LEFT JOIN customers c ON q.customer_id = c.id
            ORDER BY q.created_at DESC
        `).all();
        return { success: true, data: quotes };
    } catch (error) {
        console.error('Teklif listeleme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Teklif oluştur (create alias)
ipcMain.handle('quote:create', async (event, data) => {
    try {
        // Teklif numarası oluştur
        const year = new Date().getFullYear();
        const lastQuote = db.prepare(`
            SELECT teklif_no FROM quotes 
            WHERE teklif_no LIKE 'TKL-${year}-%' 
            ORDER BY id DESC LIMIT 1
        `).get();
        
        let nextNum = 1;
        if (lastQuote && lastQuote.teklif_no) {
            const parts = lastQuote.teklif_no.split('-');
            if (parts.length === 3) {
                nextNum = parseInt(parts[2]) + 1;
            }
        }
        const quoteNumber = `TKL-${year}-${String(nextNum).padStart(3, '0')}`;

        const result = db.prepare(`
            INSERT INTO quotes (customer_id, teklif_no, ara_toplam, kdv_orani, kdv_tutar, toplam_tutar, durum, notlar, valid_until, currency)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            data.customer_id, 
            quoteNumber, 
            data.subtotal || 0,
            data.kdv_rate || 20,
            data.kdv_amount || 0,
            data.total_amount || 0, 
            'Taslak', 
            data.notes || '',
            data.valid_until || null,
            data.currency || 'TRY'
        );

        const quoteId = result.lastInsertRowid;

        // Teklif kalemleri ekle
        if (data.items && data.items.length > 0) {
            const insertItem = db.prepare(`
                INSERT INTO quote_items (quote_id, tup_cinsi, kilo, adet, birim_fiyat, toplam)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            for (const item of data.items) {
                const itemTotal = (item.quantity || 0) * (item.unit_price || 0);
                insertItem.run(
                    quoteId, 
                    item.description || '', 
                    0, // kilo
                    item.quantity || 1, 
                    item.unit_price || 0, 
                    itemTotal
                );
            }
        }

        addLog('TEKLİF_EKLE', `Teklif oluşturuldu: ${quoteNumber}`);
        return { success: true, id: quoteId, quote_number: quoteNumber };
    } catch (error) {
        console.error('Teklif oluşturma hatası:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('quote:add', async (event, data) => {
    try {
        const result = db.prepare(`
            INSERT INTO quotes (customer_id, teklif_no, toplam_tutar, durum, notlar)
            VALUES (?, ?, ?, ?, ?)
        `).run(data.customer_id, data.teklif_no, data.toplam_tutar, data.durum || 'Beklemede', data.notlar);

        const quoteId = result.lastInsertRowid;

        // Teklif kalemleri ekle
        if (data.items && data.items.length > 0) {
            const insertItem = db.prepare(`
                INSERT INTO quote_items (quote_id, tup_cinsi, kilo, adet, birim_fiyat, toplam)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            for (const item of data.items) {
                insertItem.run(quoteId, item.tup_cinsi, item.kilo, item.adet, item.birim_fiyat, item.toplam);
            }
        }

        addLog('TEKLİF_EKLE', `Teklif oluşturuldu: ${data.teklif_no}`);
        return { success: true, id: quoteId };
    } catch (error) {
        console.error('Teklif ekleme hatası:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('quote:update', async (event, id, data) => {
    try {
        // Mevcut teklif numarasını koru
        const existingQuote = db.prepare('SELECT teklif_no FROM quotes WHERE id = ?').get(id);
        
        db.prepare(`
            UPDATE quotes 
            SET customer_id = ?,
                ara_toplam = ?,
                kdv_orani = ?,
                kdv_tutar = ?,
                toplam_tutar = ?,
                notlar = ?,
                valid_until = ?,
                currency = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            data.customer_id,
            data.subtotal || 0,
            data.kdv_rate || 20,
            data.kdv_amount || 0,
            data.total_amount || 0,
            data.notes || '',
            data.valid_until || null,
            data.currency || 'TRY',
            id
        );

        // Mevcut kalemleri sil ve yeniden ekle
        db.prepare('DELETE FROM quote_items WHERE quote_id = ?').run(id);
        if (data.items && data.items.length > 0) {
            const insertItem = db.prepare(`
                INSERT INTO quote_items (quote_id, tup_cinsi, kilo, adet, birim_fiyat, toplam)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            for (const item of data.items) {
                const itemTotal = (item.quantity || 0) * (item.unit_price || 0);
                insertItem.run(
                    id, 
                    item.description || '', 
                    0, // kilo
                    item.quantity || 1, 
                    item.unit_price || 0, 
                    itemTotal
                );
            }
        }

        addLog('TEKLİF_GÜNCELLE', `Teklif güncellendi: ${existingQuote?.teklif_no || id}`);
        return { success: true };
    } catch (error) {
        console.error('Teklif güncelleme hatası:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('quote:delete', async (event, id) => {
    try {
        db.prepare('DELETE FROM quote_items WHERE quote_id = ?').run(id);
        db.prepare('DELETE FROM quotes WHERE id = ?').run(id);
        addLog('TEKLİF_SİL', `Teklif silindi: ID ${id}`);
        return { success: true };
    } catch (error) {
        console.error('Teklif silme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Tek bir teklif detayı getir (items dahil)
ipcMain.handle('quote:get', async (event, id) => {
    try {
        const quote = db.prepare(`
            SELECT q.*, c.firma_adi, c.telefon, c.email, c.adres
            FROM quotes q
            LEFT JOIN customers c ON q.customer_id = c.id
            WHERE q.id = ?
        `).get(id);
        
        if (!quote) {
            return { success: false, error: 'Teklif bulunamadı' };
        }
        
        // Teklif kalemlerini al
        const items = db.prepare('SELECT * FROM quote_items WHERE quote_id = ?').all(id);
        const normalizedItems = items.map(item => ({
            ...item,
            description: item.tup_cinsi || '',
            quantity: item.adet,
            unit_price: item.birim_fiyat
        }));
        
        return { 
            success: true, 
            data: {
                ...quote,
                quote_number: quote.teklif_no,
                customer_id: quote.customer_id,
                total_amount: quote.toplam_tutar,
                kdv_amount: quote.kdv_tutar,
                subtotal: quote.ara_toplam,
                kdv_rate: quote.kdv_orani,
                currency: quote.currency || 'TRY',
                notes: quote.notlar,
                items: normalizedItems
            }
        };
    } catch (error) {
        console.error('Teklif getirme hatası:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('quote:getItems', async (event, quoteId) => {
    try {
        const items = db.prepare('SELECT * FROM quote_items WHERE quote_id = ?').all(quoteId);
        // Sütun isimlerini normalize et
        const normalizedItems = items.map(item => ({
            ...item,
            description: item.tup_cinsi || '',
            quantity: item.adet,
            unit_price: item.birim_fiyat
        }));
        return { success: true, data: normalizedItems };
    } catch (error) {
        console.error('Teklif kalemleri hatası:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('quote:updateStatus', async (event, data) => {
    try {
        // Status değerini Türkçe'ye çevir
        const statusMap = {
            'draft': 'Taslak',
            'sent': 'Gönderildi',
            'accepted': 'Onaylandı',
            'rejected': 'Reddedildi'
        };
        const turkishStatus = statusMap[data.status] || data.status;

        db.prepare(`
            UPDATE quotes SET durum = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(turkishStatus, data.id);

        addLog('TEKLİF_DURUM', `Teklif durumu güncellendi: ID ${data.id} -> ${turkishStatus}`);
        return { success: true };
    } catch (error) {
        console.error('Teklif durum güncelleme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Teklif PDF İndirme
ipcMain.handle('quote:downloadPDF', async (event, quoteData) => {
    try {
        const parentWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
        
        // Önce kaydetme dialogunu göster
        const { filePath, canceled } = await dialog.showSaveDialog(parentWindow, {
            title: 'Teklifi PDF Olarak Kaydet',
            defaultPath: `Teklif-${quoteData.quote_number}.pdf`,
            filters: [{ name: 'PDF Dosyası', extensions: ['pdf'] }]
        });

        if (canceled || !filePath) {
            return { success: false, error: 'İptal edildi' };
        }

        // Firma ayarlarını al
        const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
        
        // HTML oluştur
        const html = generateQuoteHTML(quoteData, settings);

        // PDF oluştur
        const pdfWindow = new BrowserWindow({
            width: 800,
            height: 1100,
            show: false,
            webPreferences: {
                nodeIntegration: false
            }
        });

        await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
        
        // PDF'e çevir
        const pdfData = await pdfWindow.webContents.printToPDF({
            printBackground: true,
            pageSize: 'A4',
            margins: { top: 0, bottom: 0, left: 0, right: 0 }
        });

        pdfWindow.close();

        // Dosyaya yaz
        fs.writeFileSync(filePath, pdfData);
        
        return { success: true, filePath };
    } catch (error) {
        console.error('Teklif PDF indirme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Teklif HTML şablonu
function generateQuoteHTML(quote, settings) {
    // Items null check
    const items = quote.items || [];
    
    // Para birimi
    const currencySymbols = { 'TRY': '₺', 'USD': '$', 'EUR': '€' };
    const currency = quote.currency || 'TRY';
    const symbol = currencySymbols[currency] || '₺';

    // Hesaplamaları yap
    const subtotal = quote.subtotal || items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);
    const kdvRate = quote.kdv_rate || parseFloat(settings?.kdv_rate) || 20;
    const kdvAmount = quote.kdv_amount || (subtotal * kdvRate / 100);
    const totalAmount = quote.total_amount || (subtotal + kdvAmount);
    const includeKdv = quote.include_kdv !== false;

    const itemsRows = items.map((item, idx) => `
        <tr>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${idx + 1}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${item.description}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${symbol}${(item.unit_price || 0).toLocaleString('tr-TR', {minimumFractionDigits: 2})}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${symbol}${((item.quantity || 0) * (item.unit_price || 0)).toLocaleString('tr-TR', {minimumFractionDigits: 2})}</td>
        </tr>
    `).join('');

    const companyName = settings?.company_name || '';
    const companyPhone = settings?.phone || '';
    const companyAddress = settings?.address || '';
    const companyEmail = settings?.email || '';
    const taxOffice = settings?.tax_office || '';
    const taxNumber = settings?.tax_number || '';
    const companyLogo = settings?.logo || '';
    const bankName = settings?.bank_name || '';
    const iban = settings?.iban || '';

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Teklif - ${quote.quote_number}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; font-size: 14px; }
                .header { display: flex; justify-content: space-between; border-bottom: 3px solid #c0392b; padding-bottom: 20px; margin-bottom: 25px; }
                .logo-area { display: flex; align-items: flex-start; gap: 15px; }
                .logo-area img { width: 80px; height: 80px; object-fit: contain; border-radius: 8px; }
                .logo-area .company-details h1 { color: #c0392b; margin: 0; font-size: 22px; }
                .logo-area .company-details .subtitle { color: #666; margin: 5px 0 0 0; font-size: 12px; }
                .logo-area .company-details .company-info { margin-top: 10px; font-size: 11px; color: #555; line-height: 1.6; }
                .quote-box { background: #c0392b; color: white; padding: 15px 20px; text-align: center; border-radius: 8px; }
                .quote-box h2 { margin: 0 0 5px 0; font-size: 18px; }
                .quote-box .quote-no { font-size: 16px; font-weight: bold; }
                .quote-box .quote-date { font-size: 12px; margin-top: 5px; }
                .info-row { display: flex; gap: 20px; margin-bottom: 20px; }
                .info-box { flex: 1; background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #c0392b; }
                .info-box h3 { margin: 0 0 10px 0; color: #333; font-size: 13px; text-transform: uppercase; }
                .info-box p { margin: 3px 0; font-size: 12px; color: #555; }
                .info-box .name { font-weight: bold; font-size: 14px; color: #222; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th { background: #34495e; color: white; padding: 10px; text-align: left; font-size: 12px; }
                td { padding: 10px; font-size: 12px; }
                .subtotal-section { margin-top: 10px; }
                .subtotal-row td { border: none !important; padding: 6px 10px; }
                .subtotal-label { text-align: right; font-weight: 500; }
                .subtotal-value { text-align: right; width: 120px; }
                .kdv-row { background: #fff3cd; }
                .total-row { background: #c0392b; color: white; }
                .total-row td { font-size: 16px; font-weight: bold; border: none !important; }
                .notes { background: #e8f4f8; padding: 12px 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #3498db; }
                .notes strong { color: #2980b9; }
                .validity { background: #d5f5e3; padding: 10px 15px; border-radius: 6px; text-align: center; margin: 15px 0; }
                .validity strong { color: #27ae60; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee; }
                .footer-row { display: flex; justify-content: space-between; }
                .footer-col { flex: 1; }
                .footer-col h4 { font-size: 12px; color: #c0392b; margin-bottom: 8px; }
                .footer-col p { font-size: 11px; color: #666; margin: 3px 0; }
                .signature-area { text-align: center; margin-top: 40px; }
                .signature-line { border-top: 1px solid #333; width: 200px; margin: 40px auto 5px; }
                .signature-text { font-size: 11px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo-area">
                    ${companyLogo ? `<img src="${companyLogo}" alt="Logo" />` : ''}
                    <div class="company-details">
                        <h1>${companyName}</h1>
                        <p class="subtitle">Yangın Söndürme Sistemleri</p>
                        <div class="company-info">
                            ${companyPhone ? `📞 ${companyPhone}<br>` : ''}
                            ${companyEmail ? `✉️ ${companyEmail}<br>` : ''}
                            ${companyAddress ? `📍 ${companyAddress}` : ''}
                            ${taxOffice ? `<br>Vergi D.: ${taxOffice}` : ''}
                            ${taxNumber ? ` - V.No: ${taxNumber}` : ''}
                        </div>
                    </div>
                </div>
                <div class="quote-box">
                    <h2>TEKLİF</h2>
                    <div class="quote-no">${quote.quote_number}</div>
                    <div class="quote-date">Tarih: ${new Date(quote.created_at).toLocaleDateString('tr-TR')}</div>
                </div>
            </div>

            <div class="info-row">
                <div class="info-box">
                    <h3>Müşteri Bilgileri</h3>
                    <p class="name">${quote.firma_adi || '-'}</p>
                    <p>📞 ${quote.telefon || '-'}</p>
                    ${quote.adres ? `<p>📍 ${quote.adres}</p>` : ''}
                </div>
                <div class="info-box">
                    <h3>Teklif Detayları</h3>
                    <p><strong>Teklif No:</strong> ${quote.quote_number}</p>
                    <p><strong>Tarih:</strong> ${new Date(quote.created_at).toLocaleDateString('tr-TR')}</p>
                    <p><strong>Geçerlilik:</strong> ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('tr-TR') : '-'}</p>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 40px; text-align: center;">#</th>
                        <th>Açıklama</th>
                        <th style="text-align: center; width: 60px;">Adet</th>
                        <th style="text-align: right; width: 100px;">Birim Fiyat</th>
                        <th style="text-align: right; width: 100px;">Toplam</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
            </table>

            <table class="subtotal-section">
                <tbody>
                    <tr class="subtotal-row">
                        <td colspan="4" class="subtotal-label">Ara Toplam:</td>
                        <td class="subtotal-value">${symbol}${subtotal.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</td>
                    </tr>
                    ${includeKdv ? `
                    <tr class="subtotal-row kdv-row">
                        <td colspan="4" class="subtotal-label">KDV (%${kdvRate}):</td>
                        <td class="subtotal-value">${symbol}${kdvAmount.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</td>
                    </tr>
                    ` : ''}
                    <tr class="subtotal-row total-row">
                        <td colspan="4" class="subtotal-label">GENEL TOPLAM:</td>
                        <td class="subtotal-value">${symbol}${totalAmount.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</td>
                    </tr>
                </tbody>
            </table>

            ${quote.notes ? `<div class="notes"><strong>📝 Not:</strong> ${quote.notes}</div>` : ''}

            ${quote.valid_until ? `
            <div class="validity">
                📅 Bu teklif <strong>${new Date(quote.valid_until).toLocaleDateString('tr-TR')}</strong> tarihine kadar geçerlidir.
            </div>
            ` : ''}

            <div class="footer">
                <div class="footer-row">
                    <div class="footer-col">
                        <h4>Banka Bilgileri</h4>
                        <p>Banka: ${bankName || '........................'}</p>
                        <p>IBAN: ${iban || 'TR....................'}</p>
                    </div>
                    <div class="footer-col" style="text-align: right;">
                        <h4>İletişim</h4>
                        <p>${companyPhone}</p>
                        <p>${companyEmail}</p>
                    </div>
                </div>
            </div>

            <div class="signature-area">
                <div class="signature-line"></div>
                <p class="signature-text">Yetkili İmza / Kaşe</p>
            </div>
        </body>
        </html>
    `;
}

// ==================== SÖZLEŞME IPC HANDLERS ====================

// Sözleşme numarası oluştur
function generateContractNo() {
    const year = new Date().getFullYear();
    const lastContract = db.prepare(`
        SELECT contract_no FROM contracts 
        WHERE contract_no LIKE 'SZL-${year}-%' 
        ORDER BY id DESC LIMIT 1
    `).get();
    
    let nextNum = 1;
    if (lastContract) {
        const parts = lastContract.contract_no.split('-');
        nextNum = parseInt(parts[2]) + 1;
    }
    return `SZL-${year}-${String(nextNum).padStart(3, '0')}`;
}

// Sözleşme listesi
ipcMain.handle('contract:list', async () => {
    try {
        const contracts = db.prepare(`
            SELECT c.*, 
                   cu.firma_adi,
                   cu.yetkili,
                   cu.telefon,
                   q.teklif_no
            FROM contracts c
            LEFT JOIN customers cu ON c.customer_id = cu.id
            LEFT JOIN quotes q ON c.quote_id = q.id
            ORDER BY c.created_at DESC
        `).all();
        return { success: true, data: contracts };
    } catch (error) {
        console.error('Sözleşme listeleme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Tek sözleşme getir
ipcMain.handle('contract:get', async (event, id) => {
    try {
        const contract = db.prepare(`
            SELECT c.*, 
                   cu.firma_adi, cu.yetkili, cu.telefon, cu.adres, cu.email,
                   q.teklif_no, q.toplam_tutar, q.ara_toplam, q.kdv_orani, q.kdv_tutar
            FROM contracts c
            LEFT JOIN customers cu ON c.customer_id = cu.id
            LEFT JOIN quotes q ON c.quote_id = q.id
            WHERE c.id = ?
        `).get(id);
        
        if (!contract) {
            return { success: false, error: 'Sözleşme bulunamadı' };
        }
        
        // Teklif kalemlerini de getir
        const items = db.prepare(`
            SELECT * FROM quote_items WHERE quote_id = ?
        `).all(contract.quote_id);
        
        return { success: true, data: { ...contract, items } };
    } catch (error) {
        console.error('Sözleşme getirme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Teklif bilgilerini sözleşme için getir
ipcMain.handle('contract:getQuoteForContract', async (event, quoteId) => {
    try {
        const quote = db.prepare(`
            SELECT q.*, 
                   c.firma_adi, c.yetkili, c.telefon, c.adres, c.email
            FROM quotes q
            LEFT JOIN customers c ON q.customer_id = c.id
            WHERE q.id = ?
        `).get(quoteId);
        
        if (!quote) {
            return { success: false, error: 'Teklif bulunamadı' };
        }
        
        const items = db.prepare(`
            SELECT * FROM quote_items WHERE quote_id = ?
        `).all(quoteId);
        
        // Firma ayarlarını da getir
        const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
        
        return { success: true, data: { quote, items, settings } };
    } catch (error) {
        console.error('Teklif bilgisi getirme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Yeni sözleşme oluştur
ipcMain.handle('contract:create', async (event, data) => {
    try {
        const contractNo = generateContractNo();
        
        const result = db.prepare(`
            INSERT INTO contracts (quote_id, customer_id, contract_no, contract_html, start_date, end_date, total_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            data.quote_id,
            data.customer_id,
            contractNo,
            data.contract_html,
            data.start_date,
            data.end_date,
            data.total_amount || 0,
            data.status || 'Taslak'
        );
        
        // Log ekle
        db.prepare(`
            INSERT INTO logs (islem_tipi, islem_detay) VALUES (?, ?)
        `).run('Sözleşme Oluşturma', `${contractNo} numaralı sözleşme oluşturuldu`);
        
        return { success: true, data: { id: result.lastInsertRowid, contract_no: contractNo } };
    } catch (error) {
        console.error('Sözleşme oluşturma hatası:', error);
        return { success: false, error: error.message };
    }
});

// Sözleşme güncelle
ipcMain.handle('contract:update', async (event, id, data) => {
    try {
        db.prepare(`
            UPDATE contracts 
            SET contract_html = ?, start_date = ?, end_date = ?, status = ?, total_amount = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            data.contract_html,
            data.start_date,
            data.end_date,
            data.status || 'Taslak',
            data.total_amount || 0,
            id
        );
        
        return { success: true };
    } catch (error) {
        console.error('Sözleşme güncelleme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Sözleşme sil
ipcMain.handle('contract:delete', async (event, id) => {
    try {
        const contract = db.prepare('SELECT contract_no FROM contracts WHERE id = ?').get(id);
        db.prepare('DELETE FROM contracts WHERE id = ?').run(id);
        
        // Log ekle
        if (contract) {
            db.prepare(`
                INSERT INTO logs (islem_tipi, islem_detay) VALUES (?, ?)
            `).run('Sözleşme Silme', `${contract.contract_no} numaralı sözleşme silindi`);
        }
        
        return { success: true };
    } catch (error) {
        console.error('Sözleşme silme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Sözleşme durum güncelle
ipcMain.handle('contract:updateStatus', async (event, data) => {
    try {
        db.prepare(`
            UPDATE contracts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(data.status, data.id);
        
        return { success: true };
    } catch (error) {
        console.error('Sözleşme durum güncelleme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Sözleşme PDF oluştur
ipcMain.handle('contract:downloadPDF', async (event, contractData) => {
    try {
        // Firma ayarlarını al
        const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get() || {};
        
        const htmlContent = generateContractPDFTemplate(contractData, settings);
        
        // PDF için geçici pencere oluştur
        const pdfWindow = new BrowserWindow({
            width: 800,
            height: 600,
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

        // Kullanıcıdan kaydetme konumu iste
        const { filePath } = await dialog.showSaveDialog({
            title: 'Sözleşme PDF Kaydet',
            defaultPath: `Sozlesme_${contractData.contract_no}.pdf`,
            filters: [{ name: 'PDF Dosyası', extensions: ['pdf'] }]
        });

        if (!filePath) {
            pdfWindow.close();
            return { success: false, error: 'Kaydetme iptal edildi' };
        }

        const pdfData = await pdfWindow.webContents.printToPDF({
            marginsType: 0,
            pageSize: 'A4',
            printBackground: true
        });

        fs.writeFileSync(filePath, pdfData);
        pdfWindow.close();

        return { success: true, path: filePath };
    } catch (error) {
        console.error('Sözleşme PDF hatası:', error);
        return { success: false, error: error.message };
    }
});

// Sözleşme PDF şablonu
function generateContractPDFTemplate(contract, settings) {
    const companyName = settings.company_name || 'Firma Adı';
    const companyPhone = settings.phone || '';
    const companyAddress = settings.address || '';
    const companyEmail = settings.email || '';
    
    return `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <title>Sözleşme - ${contract.contract_no}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Times New Roman', serif; 
                    font-size: 11pt;
                    line-height: 1.6;
                    padding: 40px;
                    background: white;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px solid #333;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .header h1 {
                    font-size: 18pt;
                    color: #c00;
                    margin-bottom: 5px;
                }
                .header .company-info {
                    font-size: 10pt;
                    color: #666;
                }
                .contract-title {
                    text-align: center;
                    font-size: 16pt;
                    font-weight: bold;
                    margin: 30px 0;
                    text-decoration: underline;
                }
                .contract-no {
                    text-align: right;
                    font-size: 10pt;
                    color: #666;
                    margin-bottom: 20px;
                }
                .content {
                    text-align: justify;
                }
                .content p {
                    margin-bottom: 15px;
                    text-indent: 30px;
                }
                .content h3 {
                    margin: 25px 0 15px 0;
                    font-size: 12pt;
                    color: #333;
                }
                .content ul, .content ol {
                    margin-left: 40px;
                    margin-bottom: 15px;
                }
                .content li {
                    margin-bottom: 8px;
                }
                .signature-section {
                    margin-top: 60px;
                    display: flex;
                    justify-content: space-between;
                }
                .signature-box {
                    width: 45%;
                    text-align: center;
                }
                .signature-box h4 {
                    font-size: 11pt;
                    margin-bottom: 60px;
                    border-bottom: 1px solid #333;
                    padding-bottom: 5px;
                }
                .signature-box .line {
                    border-top: 1px solid #333;
                    margin-top: 50px;
                    padding-top: 5px;
                    font-size: 10pt;
                }
                .footer {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 9pt;
                    color: #666;
                    border-top: 1px solid #ccc;
                    padding-top: 15px;
                }
                @media print {
                    body { padding: 20px; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${companyName}</h1>
                <div class="company-info">
                    ${companyAddress ? companyAddress + '<br>' : ''}
                    ${companyPhone ? 'Tel: ' + companyPhone : ''} ${companyEmail ? '| ' + companyEmail : ''}
                </div>
            </div>
            
            <div class="contract-no">
                Sözleşme No: ${contract.contract_no}<br>
                Tarih: ${new Date().toLocaleDateString('tr-TR')}
            </div>
            
            <div class="contract-title">HİZMET SÖZLEŞMESİ</div>
            
            <div class="content">
                ${contract.contract_html || ''}
            </div>
            
            <div class="signature-section">
                <div class="signature-box">
                    <h4>HİZMET VEREN</h4>
                    <p>${companyName}</p>
                    <div class="line">İmza / Kaşe</div>
                </div>
                <div class="signature-box">
                    <h4>HİZMET ALAN</h4>
                    <p>${contract.firma_adi || ''}</p>
                    <div class="line">İmza / Kaşe</div>
                </div>
            </div>
            
            <div class="footer">
                Bu sözleşme 2 (iki) nüsha olarak düzenlenmiş olup, taraflar birer nüsha almıştır.
            </div>
        </body>
        </html>
    `;
}

// Süresi yaklaşan sözleşmeleri getir (uyarılar için)
ipcMain.handle('contract:getExpiring', async () => {
    try {
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        const dateStr = thirtyDaysLater.toISOString().split('T')[0];
        
        const contracts = db.prepare(`
            SELECT c.*, cu.firma_adi, cu.telefon
            FROM contracts c
            LEFT JOIN customers cu ON c.customer_id = cu.id
            WHERE c.end_date <= ? AND c.status != 'İptal Edildi'
            ORDER BY c.end_date ASC
        `).all(dateStr);
        
        return { success: true, data: contracts };
    } catch (error) {
        console.error('Süresi dolan sözleşmeler hatası:', error);
        return { success: false, error: error.message };
    }
});

// ==================== VERİ İÇE AKTARMA (EXCEL IMPORT) ====================

// Müşteri import handler
ipcMain.handle('import:customers', async (event, customers) => {
    try {
        let added = 0;
        let updated = 0;
        const errors = [];

        for (const customer of customers) {
            try {
                // Mevcut müşteriyi kontrol et (firma_adi + telefon ile)
                const existing = db.prepare(`
                    SELECT id FROM customers 
                    WHERE firma_adi = ? AND (telefon = ? OR (telefon IS NULL AND ? IS NULL) OR (telefon = '' AND ? = ''))
                `).get(customer.firma_adi, customer.telefon, customer.telefon, customer.telefon);

                if (existing) {
                    // Güncelle
                    db.prepare(`
                        UPDATE customers 
                        SET yetkili = COALESCE(NULLIF(?, ''), yetkili),
                            adres = COALESCE(NULLIF(?, ''), adres),
                            email = COALESCE(NULLIF(?, ''), email),
                            notlar = COALESCE(NULLIF(?, ''), notlar),
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `).run(
                        customer.yetkili || '',
                        customer.adres || '',
                        customer.email || '',
                        customer.vergi_no || '',
                        existing.id
                    );
                    updated++;
                } else {
                    // Yeni ekle
                    db.prepare(`
                        INSERT INTO customers (firma_adi, yetkili, telefon, email, adres, notlar, durum)
                        VALUES (?, ?, ?, ?, ?, ?, 'Aktif')
                    `).run(
                        customer.firma_adi,
                        customer.yetkili || '',
                        customer.telefon || '',
                        customer.email || '',
                        customer.adres || '',
                        customer.vergi_no || ''
                    );
                    added++;
                }
            } catch (err) {
                errors.push({ row: customers.indexOf(customer) + 2, reason: err.message });
            }
        }

        addLog('MÜŞTERİ_IMPORT', `Excel'den ${added} müşteri eklendi, ${updated} güncellendi`);
        return { success: true, added, updated, errors };
    } catch (error) {
        console.error('Müşteri import hatası:', error);
        return { success: false, error: error.message };
    }
});

// Tüp import handler
ipcMain.handle('import:tubes', async (event, tubes) => {
    try {
        let added = 0;
        let skipped = 0;
        let newCustomers = 0;
        const errors = [];

        for (const tube of tubes) {
            try {
                // Müşteriyi bul veya oluştur
                let customer = db.prepare(`
                    SELECT id FROM customers 
                    WHERE firma_adi = ? AND (telefon = ? OR telefon IS NULL OR telefon = '' OR ? = '')
                `).get(tube.musteri_adi, tube.telefon, tube.telefon);

                if (!customer) {
                    // Sadece firma_adi ile ara
                    customer = db.prepare(`
                        SELECT id FROM customers WHERE firma_adi = ?
                    `).get(tube.musteri_adi);
                }

                if (!customer) {
                    // Yeni müşteri oluştur
                    const result = db.prepare(`
                        INSERT INTO customers (firma_adi, telefon, durum)
                        VALUES (?, ?, 'Aktif')
                    `).run(tube.musteri_adi, tube.telefon || '');
                    customer = { id: result.lastInsertRowid };
                    newCustomers++;
                }

                // Barkod No kontrolü ve oluşturma
                let seriNo = tube.seri_no;
                let yil, siraNo;

                if (!seriNo || seriNo.trim() === '') {
                    // Otomatik Barkod No üret
                    const serialData = getNextSerialNumber();
                    seriNo = serialData.seriNo;
                    yil = serialData.yil;
                    siraNo = serialData.siraNo;
                } else {
                    // Mevcut Barkod No kontrolü
                    const existingTube = db.prepare('SELECT id FROM tubes WHERE seri_no = ?').get(seriNo);
                    if (existingTube) {
                        skipped++;
                        errors.push({ row: tubes.indexOf(tube) + 2, reason: `Barkod No zaten mevcut: ${seriNo}` });
                        continue;
                    }
                    // Barkod No'dan yıl ve sıra çıkar
                    const parts = seriNo.split('-');
                    yil = parseInt(parts[0]) || new Date().getFullYear();
                    siraNo = parseInt(parts[1]) || 0;
                }

                // Tüp ekle
                db.prepare(`
                    INSERT INTO tubes (customer_id, tup_cinsi, kilo, seri_no, yil, sira_no, dolum_tarihi, son_kullanim_tarihi, location_description)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    customer.id,
                    tube.tup_cinsi,
                    tube.kilo,
                    seriNo,
                    yil,
                    siraNo,
                    tube.dolum_tarihi,
                    tube.son_kullanim_tarihi,
                    tube.bulundugu_yer || null
                );
                added++;
            } catch (err) {
                errors.push({ row: tubes.indexOf(tube) + 2, reason: err.message });
            }
        }

        addLog('TÜP_IMPORT', `Excel'den ${added} tüp eklendi, ${newCustomers} yeni müşteri oluşturuldu`);
        return { success: true, added, skipped, newCustomers, errors };
    } catch (error) {
        console.error('Tüp import hatası:', error);
        return { success: false, error: error.message };
    }
});

// A4 Saha Bakım Formu (Bakım Cetveli) Yazdırma
ipcMain.handle('report:fieldMaintenanceForm', async (event, customerId) => {
    try {
        const { BrowserWindow } = require('electron');

        // Müşteri bilgilerini al
        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
        if (!customer) {
            return { success: false, error: 'Müşteri bulunamadı' };
        }

        // Müşterinin tüplerini al
        const tubes = db.prepare(`
            SELECT * FROM tubes 
            WHERE customer_id = ? 
            ORDER BY location_description, seri_no
        `).all(customerId);

        // Firma ayarlarını al
        const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
        const companyName = settings?.company_name || 'YANGIN SÖNDÜRME';
        const companyPhone = settings?.phone || '';
        const companyAddress = settings?.address || '';
        const companyLogo = settings?.logo_path || '';

        // Bugünün tarihi
        const today = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        // Tarihi formatla
        const formatDate = (dateStr) => {
            if (!dateStr) return '-';
            const date = new Date(dateStr);
            return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };

        // Logo base64 olarak oku
        let logoBase64 = '';
        if (companyLogo && fs.existsSync(companyLogo)) {
            try {
                const logoBuffer = fs.readFileSync(companyLogo);
                const ext = path.extname(companyLogo).toLowerCase().replace('.', '');
                const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
                logoBase64 = `data:${mimeType};base64,${logoBuffer.toString('base64')}`;
            } catch (e) {
                console.log('Logo okunamadı:', e.message);
            }
        }

        // Tüp satırları HTML
        let tubeRowsHtml = '';
        tubes.forEach((tube, index) => {
            tubeRowsHtml += `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td class="text-center fw-medium">${tube.seri_no}</td>
                    <td class="text-center">${tube.tup_cinsi}</td>
                    <td class="text-center">${tube.kilo} kg</td>
                    <td>${tube.location_description || ''}</td>
                    <td class="text-center">${formatDate(tube.dolum_tarihi)}</td>
                    <td class="text-center">${formatDate(tube.son_kullanim_tarihi)}</td>
                    <td class="status-cell"></td>
                    <td class="note-cell"></td>
                </tr>
            `;
        });

        // Boş satırlar ekle (minimum 15 satır)
        const emptyRowsNeeded = Math.max(0, 15 - tubes.length);
        for (let i = 0; i < emptyRowsNeeded; i++) {
            tubeRowsHtml += `
                <tr class="empty-row">
                    <td class="text-center">${tubes.length + i + 1}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td class="status-cell"></td>
                    <td class="note-cell"></td>
                </tr>
            `;
        }

        const html = `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <title>Saha Bakım Formu - ${customer.firma_adi}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                @page { 
                    size: A4; 
                    margin: 10mm 10mm 15mm 10mm;
                }
                body { 
                    font-family: 'Segoe UI', Arial, sans-serif; 
                    font-size: 10pt;
                    line-height: 1.4;
                    color: #333;
                }
                
                .page-container {
                    width: 100%;
                    max-width: 210mm;
                    margin: 0 auto;
                }

                /* Header */
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 3px solid #d32f2f;
                    padding-bottom: 10px;
                    margin-bottom: 15px;
                }
                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .company-logo {
                    width: 60px;
                    height: 60px;
                    object-fit: contain;
                }
                .company-info h1 {
                    font-size: 16pt;
                    color: #d32f2f;
                    font-weight: 700;
                }
                .company-info p {
                    font-size: 8pt;
                    color: #666;
                }
                .header-right {
                    text-align: right;
                }
                .form-title {
                    font-size: 14pt;
                    font-weight: 700;
                    color: #d32f2f;
                    margin-bottom: 5px;
                }
                .form-date {
                    font-size: 9pt;
                    color: #666;
                }

                /* Müşteri Bilgileri */
                .customer-section {
                    background: #f5f5f5;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    padding: 12px 15px;
                    margin-bottom: 15px;
                }
                .customer-section h2 {
                    font-size: 11pt;
                    color: #d32f2f;
                    margin-bottom: 8px;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 5px;
                }
                .customer-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                }
                .customer-item {
                    font-size: 9pt;
                }
                .customer-item strong {
                    color: #555;
                }

                /* Tablo */
                .table-section {
                    margin-bottom: 15px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 8pt;
                }
                thead {
                    background: #d32f2f;
                    color: white;
                }
                th {
                    padding: 8px 4px;
                    text-align: center;
                    font-weight: 600;
                    border: 1px solid #b71c1c;
                }
                td {
                    padding: 6px 4px;
                    border: 1px solid #ddd;
                    vertical-align: middle;
                }
                tbody tr:nth-child(even) {
                    background: #fafafa;
                }
                tbody tr:hover {
                    background: #fff3e0;
                }
                .text-center { text-align: center; }
                .fw-medium { font-weight: 500; }
                
                /* Durum ve Açıklama hücreleri - ELLE DOLDURULACAK */
                .status-cell {
                    width: 70px;
                    min-height: 20px;
                    background: #fff9c4;
                }
                .note-cell {
                    width: 100px;
                    min-height: 20px;
                    background: #fff9c4;
                }
                .empty-row td {
                    height: 22px;
                }

                /* Durum Açıklamaları */
                .legend-section {
                    margin-top: 15px;
                    padding: 10px 15px;
                    background: #fff3e0;
                    border: 1px solid #ffcc80;
                    border-radius: 5px;
                }
                .legend-title {
                    font-size: 9pt;
                    font-weight: 600;
                    color: #e65100;
                    margin-bottom: 5px;
                }
                .legend-items {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 15px;
                    font-size: 8pt;
                }
                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .legend-code {
                    background: #d32f2f;
                    color: white;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-weight: 600;
                }

                /* İmza Bölümü */
                .signature-section {
                    margin-top: 20px;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 30px;
                }
                .signature-box {
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    padding: 10px 15px;
                }
                .signature-box h3 {
                    font-size: 9pt;
                    color: #666;
                    margin-bottom: 5px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 3px;
                }
                .signature-line {
                    height: 40px;
                    border-bottom: 1px dotted #999;
                    margin-top: 30px;
                }
                .signature-name {
                    font-size: 8pt;
                    color: #999;
                    margin-top: 3px;
                }

                /* Footer */
                .footer {
                    margin-top: 15px;
                    text-align: center;
                    font-size: 7pt;
                    color: #999;
                    border-top: 1px solid #eee;
                    padding-top: 8px;
                }

                /* Yazdır butonu */
                .print-btn {
                    position: fixed;
                    top: 15px;
                    right: 15px;
                    background: #d32f2f;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    font-size: 14px;
                    font-weight: 600;
                    border-radius: 8px;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(211, 47, 47, 0.4);
                    z-index: 1000;
                }
                .print-btn:hover {
                    background: #b71c1c;
                }

                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .page-container { max-width: 100%; }
                    .print-btn { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="page-container">
                <!-- Header -->
                <div class="header">
                    <div class="header-left">
                        ${logoBase64 ? `<img src="${logoBase64}" class="company-logo" alt="Logo">` : ''}
                        <div class="company-info">
                            <h1>${companyName}</h1>
                            <p>${companyPhone} ${companyAddress ? '| ' + companyAddress : ''}</p>
                        </div>
                    </div>
                    <div class="header-right">
                        <div class="form-title">SAHA BAKIM FORMU</div>
                        <div class="form-date">Tarih: ${today}</div>
                    </div>
                </div>

                <!-- Müşteri Bilgileri -->
                <div class="customer-section">
                    <h2>MÜŞTERİ BİLGİLERİ</h2>
                    <div class="customer-grid">
                        <div class="customer-item"><strong>Firma:</strong> ${customer.firma_adi}</div>
                        <div class="customer-item"><strong>Yetkili:</strong> ${customer.yetkili || '-'}</div>
                        <div class="customer-item"><strong>Telefon:</strong> ${customer.telefon || '-'}</div>
                        <div class="customer-item"><strong>Adres:</strong> ${customer.adres || '-'}</div>
                        <div class="customer-item"><strong>Toplam Tüp:</strong> ${tubes.length} adet</div>
                    </div>
                </div>

                <!-- Tüp Tablosu -->
                <div class="table-section">
                    <table>
                        <thead>
                            <tr>
                                <th style="width:30px">Sıra</th>
                                <th style="width:100px">Söndürücü No</th>
                                <th style="width:60px">Cinsi</th>
                                <th style="width:45px">Kilo</th>
                                <th>Bulunduğu Yer</th>
                                <th style="width:70px">Dolum Tarihi</th>
                                <th style="width:70px">Test Tarihi</th>
                                <th style="width:70px">DURUM</th>
                                <th style="width:100px">Açıklama</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tubeRowsHtml}
                        </tbody>
                    </table>
                </div>

                <!-- Durum Açıklamaları -->
                <div class="legend-section">
                    <div class="legend-title">DURUM KODLARI (Sahada İşaretleyiniz)</div>
                    <div class="legend-items">
                        <div class="legend-item"><span class="legend-code">S</span> Sağlam</div>
                        <div class="legend-item"><span class="legend-code">K</span> Kullanılmış</div>
                        <div class="legend-item"><span class="legend-code">E</span> Eksik</div>
                        <div class="legend-item"><span class="legend-code">D</span> Dolum Gerekli</div>
                        <div class="legend-item"><span class="legend-code">Y</span> Yerinde Yok</div>
                        <div class="legend-item"><span class="legend-code">T</span> Test Gerekli</div>
                        <div class="legend-item"><span class="legend-code">H</span> Hasarlı</div>
                    </div>
                </div>

                <!-- İmza Bölümü -->
                <div class="signature-section">
                    <div class="signature-box">
                        <h3>KONTROL EDEN</h3>
                        <div class="signature-line"></div>
                        <div class="signature-name">Ad Soyad / İmza</div>
                    </div>
                    <div class="signature-box">
                        <h3>MÜŞTERİ YETKİLİSİ</h3>
                        <div class="signature-line"></div>
                        <div class="signature-name">Ad Soyad / İmza / Kaşe</div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="footer">
                    Bu form ${companyName} tarafından hazırlanmıştır. | Form Tarihi: ${today}
                </div>
            </div>
        </body>
        </html>
        `;

        // HTML'e yazdır butonu ekle
        const finalHtml = html.replace('<body>', `<body>
            <button class="print-btn" onclick="window.print()">🖨️ Yazdır</button>
        `);

        // Önizleme penceresi aç (sertifika/teklif gibi)
        const printWindow = new BrowserWindow({
            width: 900,
            height: 1000,
            show: true,
            title: `Saha Bakım Formu - ${customer.firma_adi}`,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(finalHtml);
        await printWindow.loadURL(dataUrl);

        // Menüyü kaldır ve pencere hazır olunca göster
        printWindow.setMenuBarVisibility(false);
        
        addLog('SAHA_FORM', `Saha bakım formu açıldı: ${customer.firma_adi}`);
        return { success: true };
    } catch (error) {
        console.error('Saha bakım formu hatası:', error);
        return { success: false, error: error.message };
    }
});

// Denetim Raporu Oluşturma
ipcMain.handle('report:createInspectionReport', async (event, { tubeIds, customerId }) => {
    try {
        const { BrowserWindow } = require('electron');

        // Müşteri bilgilerini al
        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
        if (!customer) {
            return { success: false, error: 'Müşteri bulunamadı' };
        }

        // Seçilen tüpleri al
        const placeholders = tubeIds.map(() => '?').join(',');
        const tubes = db.prepare(`SELECT * FROM tubes WHERE id IN (${placeholders})`).all(...tubeIds);

        if (tubes.length === 0) {
            return { success: false, error: 'Seçilen tüpler bulunamadı' };
        }

        // Firma ayarlarını al
        const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
        const companyName = settings?.company_name || 'YANGIN SÖNDÜRME';
        const companyPhone = settings?.phone || '';
        const companyAddress = settings?.address || '';
        const companyEmail = settings?.email || '';

        // Logo - base64 olarak kayıtlı
        let logoBase64 = settings?.logo_path || '';
        // Eğer data: ile başlamıyorsa, zaten base64 değilse boş bırak
        if (logoBase64 && !logoBase64.startsWith('data:')) {
            logoBase64 = '';
        }

        // Bugünün tarihi
        const today = new Date();
        const todayStr = today.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        // Referans numarası oluştur (04.YY.XXXX formatında)
        // 04 = Denetim raporu tipi (sabit)
        // YY = Yılın son 2 hanesi
        // XXXX = O yıl içindeki sıra numarası
        const year2Digit = String(today.getFullYear()).slice(-2);
        const prefix = `04.${year2Digit}.`;
        
        // Bu yıla ait son rapor numarasını bul
        const lastReport = db.prepare(`
            SELECT ref_no FROM reports 
            WHERE ref_no LIKE ? 
            ORDER BY ref_no DESC 
            LIMIT 1
        `).get(`${prefix}%`);
        
        let nextNum = 1;
        if (lastReport && lastReport.ref_no) {
            // Son numarayı çıkar ve 1 artır
            const lastNum = parseInt(lastReport.ref_no.split('.')[2], 10);
            if (!isNaN(lastNum)) {
                nextNum = lastNum + 1;
            }
        }
        
        const refNo = `${prefix}${String(nextNum).padStart(4, '0')}`;

        // Tüpleri cinsine ve kilosuna göre grupla
        const tubeGroups = {};
        tubes.forEach(tube => {
            const key = `${tube.kilo}kg ${tube.tup_cinsi}`;
            if (!tubeGroups[key]) {
                tubeGroups[key] = { count: 0, kilo: tube.kilo, cinsi: tube.tup_cinsi };
            }
            tubeGroups[key].count++;
        });

        // Tüp özetini oluştur
        const tubeSummaryParts = Object.entries(tubeGroups).map(([key, val]) => {
            return `${val.count} adet ${val.kilo}kg ${val.cinsi}`;
        });
        const tubeSummary = tubeSummaryParts.join(', ');

        // Toplam tüp sayısı
        const totalTubes = tubes.length;

        const html = `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <title>Denetim Raporu - ${customer.firma_adi}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                @page { 
                    size: A4; 
                    margin: 20mm 25mm 25mm 25mm;
                }
                body { 
                    font-family: 'Times New Roman', Georgia, serif; 
                    font-size: 12pt;
                    line-height: 1.7;
                    color: #000;
                    background: white;
                }
                
                .page-container {
                    width: 100%;
                    max-width: 210mm;
                    margin: 0 auto;
                    padding: 15mm;
                }

                /* Header - Sadece logo ve firma bilgileri */
                .header {
                    text-align: center;
                    border-bottom: 2px solid #333;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                
                .company-logo {
                    width: 80px;
                    height: 80px;
                    object-fit: contain;
                    margin-bottom: 10px;
                }
                
                .company-name-header {
                    font-size: 14pt;
                    font-weight: bold;
                    color: #000;
                    margin-bottom: 5px;
                }
                
                .company-contact {
                    font-size: 10pt;
                    color: #444;
                    line-height: 1.5;
                }

                /* Müşteri ve Ref Bilgileri */
                .info-section {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 40px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid #ccc;
                }
                
                .customer-info {
                    flex: 1;
                }
                
                .customer-name {
                    font-size: 12pt;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                
                .customer-address {
                    font-size: 11pt;
                    color: #333;
                }
                
                .ref-info {
                    text-align: right;
                    font-size: 11pt;
                }
                
                .ref-item {
                    margin-bottom: 5px;
                }
                
                .ref-label {
                    font-weight: bold;
                }

                /* Rapor Başlık */
                .report-title {
                    text-align: center;
                    font-size: 18pt;
                    font-weight: bold;
                    color: #000;
                    text-decoration: underline;
                    margin-bottom: 35px;
                    letter-spacing: 3px;
                }

                /* Rapor İçerik */
                .report-content {
                    text-align: justify;
                    line-height: 2;
                    font-size: 12pt;
                }
                
                .report-paragraph {
                    text-indent: 50px;
                    margin-bottom: 20px;
                }
                
                .closing-text {
                    text-indent: 50px;
                    margin-top: 30px;
                }

                /* İmza Bölümü */
                .signature-section {
                    margin-top: 60px;
                    text-align: center;
                }
                
                .signature-company {
                    font-weight: bold;
                    font-size: 12pt;
                    margin-bottom: 50px;
                }
                
                .signature-stamp {
                    font-size: 10pt;
                    color: #666;
                    font-style: italic;
                }

                /* EKİ Bölümü */
                .attachment-section {
                    margin-top: 80px;
                    border-top: 1px solid #999;
                    padding-top: 20px;
                }
                
                .attachment-title {
                    font-weight: bold;
                    margin-bottom: 10px;
                    font-size: 11pt;
                }
                
                .attachment-list {
                    list-style-type: decimal;
                    margin-left: 30px;
                    font-size: 11pt;
                    color: #c00;
                }
                
                .attachment-list li {
                    margin-bottom: 5px;
                }

                /* Yazdır ve PDF butonları */
                .btn-container {
                    position: fixed;
                    top: 15px;
                    right: 15px;
                    display: flex;
                    gap: 10px;
                    z-index: 1000;
                }
                .print-btn, .pdf-btn {
                    background: #2563eb;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    font-size: 14px;
                    font-weight: 600;
                    border-radius: 8px;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
                }
                .print-btn:hover, .pdf-btn:hover {
                    background: #1d4ed8;
                }
                .pdf-btn {
                    background: #059669;
                    box-shadow: 0 4px 12px rgba(5, 150, 105, 0.4);
                }
                .pdf-btn:hover {
                    background: #047857;
                }

                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .page-container { max-width: 100%; padding: 0; }
                    .btn-container { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="btn-container">
                <button class="print-btn" onclick="window.print()">🖨️ Yazdır</button>
            </div>
            
            <div class="page-container">
                <!-- Header - Logo ve Firma Bilgileri -->
                <div class="header">
                    ${logoBase64 ? `<img src="${logoBase64}" class="company-logo" alt="Logo"><br>` : ''}
                    <div class="company-name-header">${companyName}</div>
                    <div class="company-contact">
                        ${companyAddress ? companyAddress + '<br>' : ''}
                        ${companyPhone ? 'Tel: ' + companyPhone : ''}${companyEmail ? ' | ' + companyEmail : ''}
                    </div>
                </div>

                <!-- Müşteri ve Ref Bilgileri -->
                <div class="info-section">
                    <div class="customer-info">
                        <div class="customer-name">${customer.firma_adi}</div>
                        <div class="customer-address">${customer.adres || ''}</div>
                    </div>
                    <div class="ref-info">
                        <div class="ref-item"><span class="ref-label">Ref. No:</span> ${refNo}</div>
                        <div class="ref-item"><span class="ref-label">Tarih :</span> ${todayStr}</div>
                    </div>
                </div>

                <!-- Rapor Başlığı -->
                <h1 class="report-title">RAPOR</h1>

                <!-- Rapor İçeriği -->
                <div class="report-content">
                    <p class="report-paragraph">
                        İşletmenizde bulunan yangın söndürücüler, firmamız tarafından kontrol edilmiştir.
                    </p>
                    
                    <p class="report-paragraph">
                        Kontrol neticesinde; hizmet birimlerinde bulunan ${tubeSummary}, her türlü yangına etkili yangın söndürücüler TS ISO 11602-2 standardına göre bakım ve kontrol işlemleri yapılmış, faal durumda oldukları tespit edilmiştir.
                    </p>
                    
                    <p class="report-paragraph">
                        İşletmenizde, yangın söndürücüler yerleri değiştirilmeden her ay manometreleri kontrol edilerek muhafaza edildiği takdirde, yangın başlangıçlarında eğitimli personel ile yangın güvenliğinin sağlanacağı kanaatindeyim.
                    </p>
                    
                    <p class="closing-text">
                        Gereğini, bilgilerinize sunarım.
                    </p>
                </div>

                <!-- İmza Bölümü -->
                <div class="signature-section">
                    <div class="signature-company">${companyName}</div>
                    <div class="signature-stamp">(Kaşe / İmza)</div>
                </div>

                <!-- EKİ Bölümü -->
                <div class="attachment-section">
                    <div class="attachment-title">EKİ :</div>
                    <ol class="attachment-list">
                        <li>TS 11827 - TS 13345 Hizmet Yeterlilik Belgesi</li>
                        <li>Yangın Eğitici Sertifikası</li>
                    </ol>
                </div>
            </div>
        </body>
        </html>
        `;

        // Raporu veritabanına kaydet
        try {
            db.prepare(`
                INSERT INTO reports (ref_no, customer_id, customer_name, tube_count, tube_summary, report_html)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(refNo, customerId, customer.firma_adi, totalTubes, tubeSummary, html);
        } catch (dbErr) {
            console.log('Rapor kaydetme hatası:', dbErr.message);
        }

        // Önizleme penceresi aç
        const printWindow = new BrowserWindow({
            width: 900,
            height: 1100,
            show: true,
            title: `Denetim Raporu - ${customer.firma_adi}`,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
        await printWindow.loadURL(dataUrl);

        // Menüyü kaldır
        printWindow.setMenuBarVisibility(false);

        addLog('RAPOR', `Denetim raporu oluşturuldu: ${customer.firma_adi} - ${totalTubes} tüp`);
        return { success: true, refNo };
    } catch (error) {
        console.error('Denetim raporu hatası:', error);
        return { success: false, error: error.message };
    }
});

// Raporları listele
ipcMain.handle('report:list', async () => {
    try {
        const reports = db.prepare(`
            SELECT r.*, c.firma_adi as customer_name_current
            FROM reports r
            LEFT JOIN customers c ON r.customer_id = c.id
            ORDER BY r.created_at DESC
        `).all();
        return { success: true, data: reports };
    } catch (error) {
        console.error('Rapor listeleme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Rapor detayını getir
ipcMain.handle('report:get', async (event, id) => {
    try {
        const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
        if (!report) {
            return { success: false, error: 'Rapor bulunamadı' };
        }
        return { success: true, data: report };
    } catch (error) {
        console.error('Rapor getirme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Raporu görüntüle (HTML olarak aç)
ipcMain.handle('report:view', async (event, id) => {
    try {
        const { BrowserWindow } = require('electron');
        const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
        
        if (!report) {
            return { success: false, error: 'Rapor bulunamadı' };
        }

        const printWindow = new BrowserWindow({
            width: 900,
            height: 1100,
            show: true,
            title: `Denetim Raporu - ${report.customer_name}`,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(report.report_html);
        await printWindow.loadURL(dataUrl);
        printWindow.setMenuBarVisibility(false);

        return { success: true };
    } catch (error) {
        console.error('Rapor görüntüleme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Raporu sil
ipcMain.handle('report:delete', async (event, id) => {
    try {
        db.prepare('DELETE FROM reports WHERE id = ?').run(id);
        addLog('RAPOR_SİL', `Rapor silindi: ID ${id}`);
        return { success: true };
    } catch (error) {
        console.error('Rapor silme hatası:', error);
        return { success: false, error: error.message };
    }
});

// Rapor PDF olarak indir
ipcMain.handle('report:downloadPdf', async (event, id) => {
    try {
        const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
        if (!report) {
            return { success: false, error: 'Rapor bulunamadı' };
        }

        // Kaydetme dialogu
        const { filePath } = await dialog.showSaveDialog({
            title: 'PDF Olarak Kaydet',
            defaultPath: `Rapor_${report.ref_no}.pdf`,
            filters: [{ name: 'PDF Dosyası', extensions: ['pdf'] }]
        });

        if (!filePath) {
            return { success: false, cancelled: true };
        }

        // HTML'den yazdırma butonunu kaldır
        let cleanHtml = report.report_html.replace(/<div class="btn-container"[\s\S]*?<\/div>/g, '');

        // Geçici pencere oluştur (gizli)
        const tempWindow = new BrowserWindow({
            width: 800,
            height: 1100,
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(cleanHtml);
        await tempWindow.loadURL(dataUrl);

        // PDF oluştur
        const pdfData = await tempWindow.webContents.printToPDF({
            pageSize: 'A4',
            printBackground: true,
            margins: { marginType: 'default' }
        });

        // Dosyaya kaydet
        fs.writeFileSync(filePath, pdfData);

        // Geçici pencereyi kapat
        tempWindow.close();

        addLog('RAPOR_PDF', `Rapor PDF olarak indirildi: ${report.ref_no}`);
        return { success: true, filePath };
    } catch (error) {
        console.error('PDF indirme hatası:', error);
        return { success: false, error: error.message };
    }
});

console.log('Electron main process başlatıldı');
