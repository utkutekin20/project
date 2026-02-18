import React, { useState, useRef } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import * as XLSX from 'xlsx';

const DataImportLayer = () => {
    const [activeTab, setActiveTab] = useState('customer');
    const [customerFile, setCustomerFile] = useState(null);
    const [tubeFile, setTubeFile] = useState(null);
    const [customerPreview, setCustomerPreview] = useState([]);
    const [tubePreview, setTubePreview] = useState([]);
    const [customerImportResult, setCustomerImportResult] = useState(null);
    const [tubeImportResult, setTubeImportResult] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');

    const customerFileRef = useRef(null);
    const tubeFileRef = useRef(null);

    // Toast göster
    const displayToast = (message, type = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
    };

    // Tarih formatını parse et (DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD)
    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        
        // String'e çevir
        const str = String(dateStr).trim();
        
        // Excel serial date number kontrolü
        if (!isNaN(str) && str.length <= 5) {
            const excelDate = new Date((parseInt(str) - 25569) * 86400 * 1000);
            if (!isNaN(excelDate.getTime())) {
                return excelDate.toISOString().split('T')[0];
            }
        }
        
        // DD.MM.YYYY formatı
        if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(str)) {
            const [day, month, year] = str.split('.');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        // DD/MM/YYYY formatı
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
            const [day, month, year] = str.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        // YYYY-MM-DD formatı
        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
            const [year, month, day] = str.split('-');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        // ISO formatı
        if (str.includes('T')) {
            return str.split('T')[0];
        }
        
        return null;
    };

    // Tüp tipi eşleştir
    const matchTubeType = (value) => {
        if (!value) return 'KKT';
        
        const lower = String(value).toLowerCase().trim();
        
        if (lower.includes('kkt') || lower.includes('kuru') || lower.includes('kimyevi') || lower.includes('abc') || lower.includes('tozlu')) {
            return 'KKT';
        }
        if (lower.includes('co2') || lower.includes('karbon')) {
            return 'CO2';
        }
        if (lower.includes('köpük') || lower.includes('kopuk') || lower.includes('foam')) {
            return 'Köpüklü';
        }
        if (lower.includes('afff') || lower.includes('aff')) {
            return 'AFF';
        }
        if (lower.includes('potasyum') || lower.includes('pkp')) {
            return 'Potasyum';
        }
        if (lower.includes('biyolojik') || lower.includes('bio')) {
            return 'Biyolojik';
        }
        if (lower.includes('fm200') || lower.includes('fm-200')) {
            return 'FM200';
        }
        if (lower.includes('tekne') || lower.includes('marine')) {
            return 'Tekne';
        }
        if (lower.includes('trafo')) {
            return 'Trafo';
        }
        if (lower.includes('su') || lower.includes('water')) {
            return 'Su';
        }
        if (lower.includes('halokarbon')) {
            return 'Halokarbon';
        }
        if (lower.includes('oksijen') || lower.includes('o2')) {
            return 'Oksijen';
        }
        if (lower.includes('davlumbaz') || lower.includes('hood')) {
            return 'Davlumbaz';
        }
        if (lower.includes('otomatik') || lower.includes('auto')) {
            return 'Otomatik';
        }
        
        // Direkt değer
        const validTypes = ['KKT', 'CO2', 'Köpüklü', 'AFF', 'Potasyum', 'Biyolojik', 'Ekobiyolojik', 'FM200', 'Tekne', 'Trafo', 'Su', 'Halokarbon', 'Oksijen', 'Davlumbaz', 'Otomatik'];
        const found = validTypes.find(t => t.toLowerCase() === lower);
        if (found) return found;
        
        return 'KKT'; // Varsayılan
    };

    // Örnek Müşteri Excel indir
    const downloadCustomerTemplate = () => {
        const headers = ['MusteriAdi', 'Telefon', 'Adres', 'YetkiliKisi', 'Email', 'VergiNo'];
        const sampleData = [
            ['ABC Şirketi', '0532 123 4567', 'İstanbul', 'Ahmet Yılmaz', 'info@abc.com', '1234567890'],
            ['XYZ Ltd.', '0533 234 5678', 'Ankara', 'Mehmet Kaya', 'info@xyz.com', '9876543210']
        ];
        
        const csvContent = [headers.join(';'), ...sampleData.map(row => row.join(';'))].join('\n');
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'musteri_sablonu.csv';
        link.click();
        URL.revokeObjectURL(url);
        displayToast('Müşteri şablonu indirildi', 'success');
    };

    // Örnek Tüp Excel indir
    const downloadTubeTemplate = () => {
        const headers = ['MusteriAdi', 'Telefon', 'TupTipi', 'Kilo', 'BulunduguYer', 'DolumTarihi', 'SonKullanimTarihi', 'SeriNo'];
        const sampleData = [
            ['ABC Şirketi', '0532 123 4567', 'KKT', '6', 'Giriş Katı Koridor', '15.01.2025', '15.01.2026', ''],
            ['ABC Şirketi', '0532 123 4567', 'CO2', '5', 'Sunucu Odası', '20.02.2025', '20.02.2026', ''],
            ['XYZ Ltd.', '0533 234 5678', 'Köpüklü', '9', 'Mutfak Yanı', '10.03.2025', '10.03.2026', '']
        ];
        
        const csvContent = [headers.join(';'), ...sampleData.map(row => row.join(';'))].join('\n');
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'tup_sablonu.csv';
        link.click();
        URL.revokeObjectURL(url);
        displayToast('Tüp şablonu indirildi', 'success');
    };

    // Excel dosyası oku
    const readExcelFile = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    };

    // Müşteri dosyası seç
    const handleCustomerFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const validExtensions = ['.xlsx', '.xls', '.csv'];
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validExtensions.includes(fileExt)) {
            displayToast('Geçersiz dosya formatı! (xlsx, xls, csv)', 'danger');
            return;
        }
        
        try {
            const data = await readExcelFile(file);
            setCustomerFile(file);
            setCustomerPreview(data.slice(0, 10));
            setCustomerImportResult(null);
            displayToast(`${data.length} müşteri kaydı okundu`, 'info');
        } catch (error) {
            console.error('Dosya okuma hatası:', error);
            displayToast('Dosya okunamadı!', 'danger');
        }
    };

    // Tüp dosyası seç
    const handleTubeFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const validExtensions = ['.xlsx', '.xls', '.csv'];
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validExtensions.includes(fileExt)) {
            displayToast('Geçersiz dosya formatı! (xlsx, xls, csv)', 'danger');
            return;
        }
        
        try {
            const data = await readExcelFile(file);
            setTubeFile(file);
            setTubePreview(data.slice(0, 10));
            setTubeImportResult(null);
            displayToast(`${data.length} tüp kaydı okundu`, 'info');
        } catch (error) {
            console.error('Dosya okuma hatası:', error);
            displayToast('Dosya okunamadı!', 'danger');
        }
    };

    // Müşteri import et
    const handleCustomerImport = async () => {
        if (!customerFile) {
            displayToast('Lütfen bir dosya seçin', 'warning');
            return;
        }
        
        setIsImporting(true);
        
        try {
            const data = await readExcelFile(customerFile);
            
            // Verileri hazırla
            const customers = data.map((row, index) => {
                // Sütun isimlerini normalize et
                const normalizedRow = {};
                Object.keys(row).forEach(key => {
                    const normalizedKey = key.toLowerCase().replace(/\s+/g, '').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
                    normalizedRow[normalizedKey] = row[key];
                });
                
                return {
                    rowIndex: index + 2,
                    firma_adi: row.MusteriAdi || row.musteriadi || row['Müşteri Adı'] || row.FirmaAdi || row.firma_adi || normalizedRow.musteriadi || normalizedRow.firmaadi || '',
                    telefon: row.Telefon || row.telefon || row.Tel || row.tel || normalizedRow.telefon || '',
                    adres: row.Adres || row.adres || row.Address || normalizedRow.adres || '',
                    yetkili: row.YetkiliKisi || row.yetkili || row.Yetkili || row['Yetkili Kişi'] || normalizedRow.yetkili || normalizedRow.yetkilikisi || '',
                    email: row.Email || row.email || row.EPosta || row['E-Posta'] || normalizedRow.email || '',
                    vergi_no: row.VergiNo || row.vergi_no || row['Vergi No'] || normalizedRow.vergino || ''
                };
            });
            
            // Validasyon
            const validCustomers = [];
            const errors = [];
            
            customers.forEach((c) => {
                if (!c.firma_adi || String(c.firma_adi).trim() === '') {
                    errors.push({ row: c.rowIndex, reason: 'Müşteri adı boş' });
                } else {
                    validCustomers.push({
                        firma_adi: String(c.firma_adi).trim(),
                        telefon: String(c.telefon || '').trim(),
                        adres: String(c.adres || '').trim(),
                        yetkili: String(c.yetkili || '').trim(),
                        email: String(c.email || '').trim(),
                        vergi_no: String(c.vergi_no || '').trim()
                    });
                }
            });
            
            if (validCustomers.length === 0) {
                displayToast('İçe aktarılacak geçerli kayıt bulunamadı!', 'danger');
                setIsImporting(false);
                return;
            }
            
            // API çağrısı
            if (window.api && window.api.dataImport) {
                const result = await window.api.dataImport.importCustomers(validCustomers);
                
                if (result.success) {
                    setCustomerImportResult({
                        added: result.added || 0,
                        updated: result.updated || 0,
                        skipped: errors.length,
                        errors: [...errors, ...(result.errors || [])]
                    });
                    displayToast(`${result.added} müşteri eklendi, ${result.updated} güncellendi`, 'success');
                } else {
                    displayToast('İçe aktarma başarısız: ' + result.error, 'danger');
                }
            } else {
                displayToast('API bağlantısı kurulamadı!', 'danger');
            }
        } catch (error) {
            console.error('Import hatası:', error);
            displayToast('İçe aktarma sırasında hata oluştu!', 'danger');
        } finally {
            setIsImporting(false);
        }
    };

    // Tüp import et
    const handleTubeImport = async () => {
        if (!tubeFile) {
            displayToast('Lütfen bir dosya seçin', 'warning');
            return;
        }
        
        setIsImporting(true);
        
        try {
            const data = await readExcelFile(tubeFile);
            
            // Verileri hazırla
            const tubes = data.map((row, index) => {
                // Sütun isimlerini normalize et
                const normalizedRow = {};
                Object.keys(row).forEach(key => {
                    const normalizedKey = key.toLowerCase().replace(/\s+/g, '').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
                    normalizedRow[normalizedKey] = row[key];
                });
                
                return {
                    rowIndex: index + 2,
                    musteri_adi: row.MusteriAdi || row.musteriadi || row['Müşteri Adı'] || row.FirmaAdi || normalizedRow.musteriadi || '',
                    telefon: row.Telefon || row.telefon || row.Tel || normalizedRow.telefon || '',
                    tup_cinsi: row.TupTipi || row.tup_tipi || row['Tüp Tipi'] || row.TupCinsi || row.tup_cinsi || normalizedRow.tuptipi || normalizedRow.tupcinsi || '',
                    kilo: row.Kilo || row.kilo || row.Kg || normalizedRow.kilo || 6,
                    bulundugu_yer: row.BulunduguYer || row.bulundugu_yer || row['Bulunduğu Yer'] || row.Konum || row.konum || normalizedRow.bulunduguyer || '',
                    dolum_tarihi: row.DolumTarihi || row.dolum_tarihi || row['Dolum Tarihi'] || normalizedRow.dolumtarihi || '',
                    son_kullanim_tarihi: row.SonKullanimTarihi || row.son_kullanim_tarihi || row['Son Kullanım Tarihi'] || row.SKT || normalizedRow.sonkullanimtarihi || '',
                    seri_no: row.SeriNo || row.seri_no || row['Barkod No'] || normalizedRow.serino || ''
                };
            });
            
            // Validasyon ve dönüşüm
            const validTubes = [];
            const errors = [];
            
            tubes.forEach((t) => {
                if (!t.musteri_adi || String(t.musteri_adi).trim() === '') {
                    errors.push({ row: t.rowIndex, reason: 'Müşteri adı boş' });
                    return;
                }
                
                const dolumTarihi = parseDate(t.dolum_tarihi);
                const sonKullanimTarihi = parseDate(t.son_kullanim_tarihi);
                
                // Dolum tarihi yoksa bugünü kullan
                const finalDolumTarihi = dolumTarihi || new Date().toISOString().split('T')[0];
                
                // Son kullanım tarihi yoksa dolum tarihinden 1 yıl sonrası
                let finalSKT = sonKullanimTarihi;
                if (!finalSKT) {
                    const dolumDate = new Date(finalDolumTarihi);
                    dolumDate.setFullYear(dolumDate.getFullYear() + 1);
                    finalSKT = dolumDate.toISOString().split('T')[0];
                }
                
                validTubes.push({
                    musteri_adi: String(t.musteri_adi).trim(),
                    telefon: String(t.telefon || '').trim(),
                    tup_cinsi: matchTubeType(t.tup_cinsi),
                    kilo: parseFloat(t.kilo) || 6,
                    bulundugu_yer: String(t.bulundugu_yer || '').trim(),
                    dolum_tarihi: finalDolumTarihi,
                    son_kullanim_tarihi: finalSKT,
                    seri_no: String(t.seri_no || '').trim()
                });
            });
            
            if (validTubes.length === 0) {
                displayToast('İçe aktarılacak geçerli kayıt bulunamadı!', 'danger');
                setIsImporting(false);
                return;
            }
            
            // API çağrısı
            if (window.api && window.api.dataImport) {
                const result = await window.api.dataImport.importTubes(validTubes);
                
                if (result.success) {
                    setTubeImportResult({
                        added: result.added || 0,
                        skipped: result.skipped || 0,
                        newCustomers: result.newCustomers || 0,
                        errors: [...errors, ...(result.errors || [])]
                    });
                    displayToast(`${result.added} tüp eklendi, ${result.newCustomers} yeni müşteri oluşturuldu`, 'success');
                } else {
                    displayToast('İçe aktarma başarısız: ' + result.error, 'danger');
                }
            } else {
                displayToast('API bağlantısı kurulamadı!', 'danger');
            }
        } catch (error) {
            console.error('Import hatası:', error);
            displayToast('İçe aktarma sırasında hata oluştu!', 'danger');
        } finally {
            setIsImporting(false);
        }
    };

    // Dosya seçimini sıfırla
    const resetCustomerImport = () => {
        setCustomerFile(null);
        setCustomerPreview([]);
        setCustomerImportResult(null);
        if (customerFileRef.current) customerFileRef.current.value = '';
    };

    const resetTubeImport = () => {
        setTubeFile(null);
        setTubePreview([]);
        setTubeImportResult(null);
        if (tubeFileRef.current) tubeFileRef.current.value = '';
    };

    return (
        <div className="row gy-4">
            {/* Toast */}
            {showToast && (
                <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 9999 }}>
                    <div className={`toast show bg-${toastType} text-white`}>
                        <div className="toast-body d-flex align-items-center gap-2">
                            <Icon icon={toastType === 'success' ? 'heroicons:check-circle' : toastType === 'danger' ? 'heroicons:x-circle' : 'heroicons:information-circle'} className="text-xl" />
                            {toastMessage}
                        </div>
                    </div>
                </div>
            )}

            <div className="col-12">
                <div className="card">
                    <div className="card-header">
                        <h5 className="card-title mb-0">
                            <Icon icon="heroicons:arrow-down-tray" className="me-2" />
                            Excel'den Veri Aktarımı
                        </h5>
                    </div>
                    <div className="card-body">
                        {/* Tab Navigation */}
                        <ul className="nav nav-tabs mb-4" role="tablist">
                            <li className="nav-item" role="presentation">
                                <button
                                    className={`nav-link ${activeTab === 'customer' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('customer')}
                                    type="button"
                                >
                                    <Icon icon="heroicons:users" className="me-2" />
                                    Müşteri İmport
                                </button>
                            </li>
                            <li className="nav-item" role="presentation">
                                <button
                                    className={`nav-link ${activeTab === 'tube' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('tube')}
                                    type="button"
                                >
                                    <Icon icon="heroicons:fire" className="me-2" />
                                    Tüp İmport
                                </button>
                            </li>
                        </ul>

                        {/* Müşteri Import Tab */}
                        {activeTab === 'customer' && (
                            <div className="tab-content">
                                {/* Info Alert */}
                                <div className="alert alert-info d-flex align-items-start gap-3 mb-4">
                                    <Icon icon="heroicons:information-circle" className="text-2xl flex-shrink-0" />
                                    <div>
                                        <h6 className="mb-1">Müşteri Excel Formatı</h6>
                                        <p className="mb-2 small">
                                            Excel dosyanızda şu sütunlar olmalıdır: <strong>MusteriAdi</strong> (zorunlu), Telefon, Adres, YetkiliKisi, Email, VergiNo
                                        </p>
                                        <p className="mb-0 small text-muted">
                                            Aynı müşteri adı ve telefon ile kayıt varsa güncellenecektir.
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="d-flex flex-wrap gap-3 mb-4">
                                    <button
                                        className="btn btn-outline-primary d-flex align-items-center gap-2"
                                        onClick={downloadCustomerTemplate}
                                    >
                                        <Icon icon="heroicons:arrow-down-tray" />
                                        Örnek Excel İndir
                                    </button>
                                    
                                    <input
                                        type="file"
                                        ref={customerFileRef}
                                        className="d-none"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={handleCustomerFileSelect}
                                    />
                                    <button
                                        className="btn btn-primary d-flex align-items-center gap-2"
                                        onClick={() => customerFileRef.current?.click()}
                                    >
                                        <Icon icon="heroicons:folder-open" />
                                        Dosya Seç
                                    </button>

                                    {customerFile && (
                                        <button
                                            className="btn btn-outline-secondary d-flex align-items-center gap-2"
                                            onClick={resetCustomerImport}
                                        >
                                            <Icon icon="heroicons:x-mark" />
                                            Temizle
                                        </button>
                                    )}
                                </div>

                                {/* File Info */}
                                {customerFile && (
                                    <div className="alert alert-secondary mb-4">
                                        <Icon icon="heroicons:document-text" className="me-2" />
                                        <strong>{customerFile.name}</strong> - {customerPreview.length > 0 ? `${customerPreview.length}+ kayıt bulundu` : 'Yükleniyor...'}
                                    </div>
                                )}

                                {/* Preview Table */}
                                {customerPreview.length > 0 && (
                                    <div className="mb-4">
                                        <h6 className="mb-3">Önizleme (İlk 10 Satır)</h6>
                                        <div className="table-responsive">
                                            <table className="table table-bordered table-sm">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Müşteri Adı</th>
                                                        <th>Telefon</th>
                                                        <th>Adres</th>
                                                        <th>Yetkili</th>
                                                        <th>Email</th>
                                                        <th>Vergi No</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {customerPreview.map((row, idx) => (
                                                        <tr key={idx}>
                                                            <td>{idx + 1}</td>
                                                            <td>{row.MusteriAdi || row.musteriadi || row.FirmaAdi || '-'}</td>
                                                            <td>{row.Telefon || row.telefon || '-'}</td>
                                                            <td>{row.Adres || row.adres || '-'}</td>
                                                            <td>{row.YetkiliKisi || row.yetkili || '-'}</td>
                                                            <td>{row.Email || row.email || '-'}</td>
                                                            <td>{row.VergiNo || row.vergi_no || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Import Button */}
                                {customerPreview.length > 0 && !customerImportResult && (
                                    <button
                                        className="btn btn-success btn-lg d-flex align-items-center gap-2"
                                        onClick={handleCustomerImport}
                                        disabled={isImporting}
                                    >
                                        {isImporting ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm" />
                                                İçe Aktarılıyor...
                                            </>
                                        ) : (
                                            <>
                                                <Icon icon="heroicons:arrow-up-tray" />
                                                İçe Aktar
                                            </>
                                        )}
                                    </button>
                                )}

                                {/* Import Result */}
                                {customerImportResult && (
                                    <div className="card bg-light mt-4">
                                        <div className="card-body">
                                            <h6 className="card-title mb-3">
                                                <Icon icon="heroicons:clipboard-document-check" className="me-2" />
                                                İçe Aktarma Sonucu
                                            </h6>
                                            <div className="row g-3">
                                                <div className="col-auto">
                                                    <span className="badge bg-success fs-6">
                                                        ✅ {customerImportResult.added} Eklendi
                                                    </span>
                                                </div>
                                                <div className="col-auto">
                                                    <span className="badge bg-info fs-6">
                                                        🔄 {customerImportResult.updated} Güncellendi
                                                    </span>
                                                </div>
                                                {customerImportResult.skipped > 0 && (
                                                    <div className="col-auto">
                                                        <span className="badge bg-warning fs-6">
                                                            ⚠️ {customerImportResult.skipped} Atlandı
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            {customerImportResult.errors && customerImportResult.errors.length > 0 && (
                                                <div className="mt-3">
                                                    <small className="text-muted">Hatalar:</small>
                                                    <ul className="mb-0 small">
                                                        {customerImportResult.errors.slice(0, 5).map((err, idx) => (
                                                            <li key={idx} className="text-danger">
                                                                Satır {err.row}: {err.reason}
                                                            </li>
                                                        ))}
                                                        {customerImportResult.errors.length > 5 && (
                                                            <li className="text-muted">...ve {customerImportResult.errors.length - 5} hata daha</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tüp Import Tab */}
                        {activeTab === 'tube' && (
                            <div className="tab-content">
                                {/* Info Alert */}
                                <div className="alert alert-info d-flex align-items-start gap-3 mb-4">
                                    <Icon icon="heroicons:information-circle" className="text-2xl flex-shrink-0" />
                                    <div>
                                        <h6 className="mb-1">Tüp Excel Formatı</h6>
                                        <p className="mb-2 small">
                                            Excel dosyanızda şu sütunlar olmalıdır: <strong>MusteriAdi</strong> (zorunlu), Telefon, TupTipi, Kilo, <strong>BulunduguYer</strong>, DolumTarihi, SonKullanimTarihi, SeriNo
                                        </p>
                                        <p className="mb-0 small text-muted">
                                            Tarih formatları: DD.MM.YYYY, DD/MM/YYYY veya YYYY-MM-DD kabul edilir. Müşteri bulunamazsa otomatik oluşturulur. <strong>Barkod No (SeriNo) boş bırakılırsa otomatik üretilir.</strong>
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="d-flex flex-wrap gap-3 mb-4">
                                    <button
                                        className="btn btn-outline-primary d-flex align-items-center gap-2"
                                        onClick={downloadTubeTemplate}
                                    >
                                        <Icon icon="heroicons:arrow-down-tray" />
                                        Örnek Excel İndir
                                    </button>
                                    
                                    <input
                                        type="file"
                                        ref={tubeFileRef}
                                        className="d-none"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={handleTubeFileSelect}
                                    />
                                    <button
                                        className="btn btn-primary d-flex align-items-center gap-2"
                                        onClick={() => tubeFileRef.current?.click()}
                                    >
                                        <Icon icon="heroicons:folder-open" />
                                        Dosya Seç
                                    </button>

                                    {tubeFile && (
                                        <button
                                            className="btn btn-outline-secondary d-flex align-items-center gap-2"
                                            onClick={resetTubeImport}
                                        >
                                            <Icon icon="heroicons:x-mark" />
                                            Temizle
                                        </button>
                                    )}
                                </div>

                                {/* File Info */}
                                {tubeFile && (
                                    <div className="alert alert-secondary mb-4">
                                        <Icon icon="heroicons:document-text" className="me-2" />
                                        <strong>{tubeFile.name}</strong> - {tubePreview.length > 0 ? `${tubePreview.length}+ kayıt bulundu` : 'Yükleniyor...'}
                                    </div>
                                )}

                                {/* Preview Table */}
                                {tubePreview.length > 0 && (
                                    <div className="mb-4">
                                        <h6 className="mb-3">Önizleme (İlk 10 Satır)</h6>
                                        <div className="table-responsive">
                                            <table className="table table-bordered table-sm">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Müşteri Adı</th>
                                                        <th>Telefon</th>
                                                        <th>Tüp Tipi</th>
                                                        <th>Kilo</th>
                                                        <th>Dolum Tarihi</th>
                                                        <th>SKT</th>
                                                        <th>Barkod No</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {tubePreview.map((row, idx) => (
                                                        <tr key={idx}>
                                                            <td>{idx + 1}</td>
                                                            <td>{row.MusteriAdi || row.musteriadi || '-'}</td>
                                                            <td>{row.Telefon || row.telefon || '-'}</td>
                                                            <td>
                                                                <span className="badge bg-secondary">
                                                                    {matchTubeType(row.TupTipi || row.tup_tipi || row.TupCinsi)}
                                                                </span>
                                                            </td>
                                                            <td>{row.Kilo || row.kilo || '6'}</td>
                                                            <td>{row.DolumTarihi || row.dolum_tarihi || '-'}</td>
                                                            <td>{row.SonKullanimTarihi || row.son_kullanim_tarihi || '-'}</td>
                                                            <td>{row.SeriNo || row.seri_no || <span className="text-muted">(otomatik)</span>}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Import Button */}
                                {tubePreview.length > 0 && !tubeImportResult && (
                                    <button
                                        className="btn btn-success btn-lg d-flex align-items-center gap-2"
                                        onClick={handleTubeImport}
                                        disabled={isImporting}
                                    >
                                        {isImporting ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm" />
                                                İçe Aktarılıyor...
                                            </>
                                        ) : (
                                            <>
                                                <Icon icon="heroicons:arrow-up-tray" />
                                                İçe Aktar
                                            </>
                                        )}
                                    </button>
                                )}

                                {/* Import Result */}
                                {tubeImportResult && (
                                    <div className="card bg-light mt-4">
                                        <div className="card-body">
                                            <h6 className="card-title mb-3">
                                                <Icon icon="heroicons:clipboard-document-check" className="me-2" />
                                                İçe Aktarma Sonucu
                                            </h6>
                                            <div className="row g-3">
                                                <div className="col-auto">
                                                    <span className="badge bg-success fs-6">
                                                        ✅ {tubeImportResult.added} Tüp Eklendi
                                                    </span>
                                                </div>
                                                {tubeImportResult.newCustomers > 0 && (
                                                    <div className="col-auto">
                                                        <span className="badge bg-info fs-6">
                                                            👤 {tubeImportResult.newCustomers} Yeni Müşteri
                                                        </span>
                                                    </div>
                                                )}
                                                {tubeImportResult.skipped > 0 && (
                                                    <div className="col-auto">
                                                        <span className="badge bg-warning fs-6">
                                                            ⚠️ {tubeImportResult.skipped} Atlandı
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            {tubeImportResult.errors && tubeImportResult.errors.length > 0 && (
                                                <div className="mt-3">
                                                    <small className="text-muted">Hatalar:</small>
                                                    <ul className="mb-0 small">
                                                        {tubeImportResult.errors.slice(0, 5).map((err, idx) => (
                                                            <li key={idx} className="text-danger">
                                                                Satır {err.row}: {err.reason}
                                                            </li>
                                                        ))}
                                                        {tubeImportResult.errors.length > 5 && (
                                                            <li className="text-muted">...ve {tubeImportResult.errors.length - 5} hata daha</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Yardım Kartı */}
            <div className="col-12">
                <div className="card">
                    <div className="card-header">
                        <h6 className="card-title mb-0">
                            <Icon icon="heroicons:question-mark-circle" className="me-2" />
                            Yardım
                        </h6>
                    </div>
                    <div className="card-body">
                        <div className="row g-4">
                            <div className="col-md-6">
                                <h6 className="text-primary">Desteklenen Dosya Formatları</h6>
                                <ul className="mb-0">
                                    <li>Excel 2007+ (.xlsx)</li>
                                    <li>Excel 97-2003 (.xls)</li>
                                    <li>CSV (Türkçe karakter destekli)</li>
                                </ul>
                            </div>
                            <div className="col-md-6">
                                <h6 className="text-primary">Tüp Tipleri Eşleştirme</h6>
                                <ul className="mb-0">
                                    <li><code>kkt, abc, kuru, tozlu</code> → KKT</li>
                                    <li><code>co2, karbon</code> → CO2</li>
                                    <li><code>köpük, foam</code> → Köpüklü</li>
                                    <li><code>fm200</code> → FM200</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataImportLayer;
