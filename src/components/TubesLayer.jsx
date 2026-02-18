import { Icon } from '@iconify/react/dist/iconify.js';
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TUBE_TYPES } from '../helper/constants';

// DatePicker Component - Native HTML5 Date Input
const DatePicker = ({ id, name, placeholder, value, onChange, required }) => {
    const handleChange = (e) => {
        if (onChange) {
            onChange({ target: { name, value: e.target.value } });
        }
    };

    // ISO formatını (YYYY-MM-DD) görüntü için DD.MM.YYYY'ye çevir
    const formatDisplayDate = (isoDate) => {
        if (!isoDate) return '';
        const [year, month, day] = isoDate.split('-');
        return `${day}.${month}.${year}`;
    };

    return (
        <div className="position-relative">
            <input
                id={id}
                name={name}
                type="date"
                className="form-control radius-8 bg-base"
                value={value || ''}
                onChange={handleChange}
                required={required}
                style={{ colorScheme: 'light' }}
            />
        </div>
    );
};

const TubesLayer = () => {
    const navigate = useNavigate();

    // Müşteri verileri - veritabanından
    const [customers, setCustomers] = useState([]);
    // eslint-disable-next-line no-unused-vars
    const [loading, setLoading] = useState(true);
    
    // Şirket ayarları
    const [companySettings, setCompanySettings] = useState({});

    // Sepet state'i
    const [cart, setCart] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveProgress, setSaveProgress] = useState(0);
    const [saveResult, setSaveResult] = useState(null);

    // Toast state
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');

    // Form state'i
    const [formData, setFormData] = useState({
        customer_id: '',
        dolum_tarihi: '',
        son_kullanim_tarihi: '',
        tup_cinsi: '',
        kilo: '6',
        adet: '1',
        location_description: '',
        seri_no: ''
    });

    // Tüp cinsleri - varsayılan liste + veritabanından gelen özel cinsler
    const [allTubeTypes, setAllTubeTypes] = useState(TUBE_TYPES);

    // Müşterileri ve ayarları veritabanından çek
    useEffect(() => {
        const fetchData = async () => {
            try {
                if (window.api) {
                    // Müşterileri çek
                    const result = await window.api.customer.list();
                    if (result.success) {
                        setCustomers(result.data);
                    }
                    
                    // Firma ayarlarını çek
                    const settingsResult = await window.api.settings.get();
                    if (settingsResult.success && settingsResult.data) {
                        setCompanySettings({
                            company_name: settingsResult.data.company_name || '',
                            phone: settingsResult.data.phone || '',
                            address: settingsResult.data.address || ''
                        });
                    }

                    // Mevcut tüplerden tüp cinslerini çek ve listeye ekle
                    const tubesResult = await window.api.tube.list();
                    if (tubesResult.success && tubesResult.data) {
                        const existingTypes = [...new Set(tubesResult.data.map(t => t.tup_cinsi).filter(Boolean))];
                        const defaultValues = TUBE_TYPES.map(t => t.value);
                        
                        // Varsayılan listede olmayan tüp cinslerini ekle
                        const customTypes = existingTypes
                            .filter(type => !defaultValues.includes(type))
                            .map(type => ({ value: type, label: type }));
                        
                        if (customTypes.length > 0) {
                            setAllTubeTypes([...TUBE_TYPES, ...customTypes]);
                        }
                    }
                }
            } catch (error) {
                console.error('Veri çekme hatası:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Bugünün tarihi ve 1 yıl sonrasını varsayılan olarak ayarla
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const nextYearStr = nextYear.toISOString().split('T')[0];

        setFormData(prev => ({
            ...prev,
            dolum_tarihi: today,
            son_kullanim_tarihi: nextYearStr
        }));
    }, []);

    // Tarih formatla
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Toast göster
    const displayToast = (message, type = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    // QR Kodu oluştur
    const generateQRDataUrl = (seriNo) => {
        // Şirket kodu oluştur - şirket adının ilk kelimesinden
        const sirketKodu = companySettings?.company_name 
            ? companySettings.company_name.split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '')
            : 'YANGIN';
        const data = `${sirketKodu}-${seriNo}`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(data)}`;
    };

    // Form input değişikliği
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Sepete ekle
    const addToCart = (e) => {
        e.preventDefault();

        const customer = customers.find(c => c.id === parseInt(formData.customer_id));
        if (!customer) {
            alert('Lütfen müşteri seçin');
            return;
        }

        if (!formData.tup_cinsi) {
            alert('Lütfen tüp cinsi seçin');
            return;
        }

        const newItem = {
            id: Date.now(),
            customer_id: parseInt(formData.customer_id),
            customer_name: customer.firma_adi,
            tup_cinsi: formData.tup_cinsi,
            kilo: parseFloat(formData.kilo),
            dolum_tarihi: formData.dolum_tarihi,
            son_kullanim_tarihi: formData.son_kullanim_tarihi,
            adet: parseInt(formData.adet) || 1,
            location_description: formData.location_description || '',
            seri_no: formData.seri_no.trim() || ''
        };

        setCart(prev => [...prev, newItem]);

        // Toast göster
        displayToast(`${newItem.adet}x ${newItem.tup_cinsi} ${newItem.kilo}KG sepete eklendi`, 'success');

        // Formu kısmen sıfırla (müşteri ve tarihler kalsın)
        setFormData(prev => ({
            ...prev,
            tup_cinsi: '',
            kilo: '6',
            adet: '1',
            location_description: '',
            seri_no: ''
        }));
    };

    // Sepetten çıkar
    const removeFromCart = (itemId) => {
        setCart(prev => prev.filter(item => item.id !== itemId));
        displayToast('Sepetten kaldırıldı', 'info');
    };

    // Sepeti temizle
    const clearCart = () => {
        if (cart.length === 0) return;
        if (window.confirm('Sepeti temizlemek istediğinize emin misiniz?')) {
            setCart([]);
            displayToast('Sepet temizlendi', 'info');
        }
    };

    // Tüm tüpleri kaydet
    const saveAllTubes = async () => {
        if (cart.length === 0) return;

        const totalTubes = cart.reduce((sum, item) => sum + item.adet, 0);
        setIsSaving(true);
        setSaveProgress(0);
        setSaveResult(null);

        let savedCount = 0;
        const savedSerials = [];
        const errors = [];

        try {
            for (const item of cart) {
                for (let i = 0; i < item.adet; i++) {
                    if (!window.api) {
                        setIsSaving(false);
                        alert('API bağlantısı yok! Uygulamayı Electron modunda çalıştırın.');
                        return;
                    }

                    const tubeData = {
                        customer_id: item.customer_id,
                        tup_cinsi: item.tup_cinsi,
                        kilo: item.kilo,
                        dolum_tarihi: item.dolum_tarihi,
                        son_kullanim_tarihi: item.son_kullanim_tarihi,
                        location_description: item.location_description || null,
                        seri_no: item.seri_no || null
                    };

                    const result = await window.api.tube.add(tubeData);
                    if (result.success) {
                        savedSerials.push({
                            seri_no: result.seri_no,
                            tup_cinsi: item.tup_cinsi,
                            kilo: item.kilo,
                            customer_name: item.customer_name,
                            dolum_tarihi: item.dolum_tarihi,
                            son_kullanim_tarihi: item.son_kullanim_tarihi
                        });
                        savedCount++;
                    } else {
                        errors.push(result.error);
                        // Duplicate seri no hatası - kaydetmeyi durdur ve kullanıcıya göster
                        setIsSaving(false);
                        alert(`⚠️ KAYIT BAŞARISIZ!\n\n${result.error}\n\nLütfen seri numarasını değiştirin veya boş bırakarak otomatik numara verilmesini sağlayın.`);
                        return;
                    }

                    setSaveProgress(Math.round(((savedCount + errors.length) / totalTubes) * 100));
                }
            }

            // Tüp türlerine göre grupla
            const grouped = {};
            savedSerials.forEach(tube => {
                const key = `${tube.tup_cinsi}-${tube.kilo}`;
                if (!grouped[key]) {
                    grouped[key] = { type: tube.tup_cinsi, kilo: tube.kilo, count: 0, serials: [] };
                }
                grouped[key].count++;
                grouped[key].serials.push(tube.seri_no);
            });

            setIsSaving(false);
            setSaveResult({
                success: true,
                count: savedCount,
                serials: savedSerials,
                grouped: Object.values(grouped)
            });
            setCart([]);
            displayToast(`${savedCount} tüp başarıyla kaydedildi!`, 'success');
        } catch (error) {
            console.error('Kayıt hatası:', error);
            setIsSaving(false);
            alert(`❌ Kayıt sırasında hata oluştu!\n\n${error.message}`);
        }
    };

    // Etiket yazdır - Profesyonel yangın söndürücü etiketi (60mm x 40mm)
    const printLabels = () => {
        if (!saveResult || saveResult.serials.length === 0) return;

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        let labelsHtml = '';

        // Müşteri bilgisini al
        const customer = customers.find(c => c.id === parseInt(formData.customer_id));
        const firmaAdi = customer?.firma_adi || 'Müşteri';
        
        // Ayarlardan dinamik veriler
        const sirketAdi = companySettings?.company_name || 'YANGIN SÖNDÜRME';
        const sirketTel = companySettings?.phone || '';

        saveResult.serials.forEach((s, index) => {
            const qrDataUrl = generateQRDataUrl(s.seri_no);
            const dolumTarihi = new Date(s.dolum_tarihi || formData.dolum_tarihi).toLocaleDateString('tr-TR');
            const sktTarihi = new Date(s.son_kullanim_tarihi || formData.son_kullanim_tarihi).toLocaleDateString('tr-TR');
            
            labelsHtml += `
                <div class="etiket" style="${index > 0 ? 'page-break-before: always;' : ''}">
                    <!-- Üst Şerit - Firma Adı -->
                    <div class="top-banner">★ ${sirketAdi.toUpperCase()} ★</div>
                    
                    <!-- Seri Numarası - Tam genişlik -->
                    <div class="serial-row">${s.seri_no}</div>
                    
                    <!-- Orta Alan: QR + Bilgiler -->
                    <div class="mid-section">
                        <div class="qr-area">
                            <img src="${qrDataUrl}" class="qr-img"/>
                        </div>
                        <div class="info-area">
                            <div class="customer-row">${firmaAdi}</div>
                            <div class="type-row">
                                <span class="type-val">${s.tup_cinsi}</span>
                                <span class="weight-val">${s.kilo} KG</span>
                            </div>
                            <div class="date-row">
                                <div>DOLUM: <b>${dolumTarihi}</b></div>
                                <div>SKT: <b>${sktTarihi}</b></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Alt Şerit - Telefon -->
                    <div class="bottom-banner">${sirketTel ? '✆ ' + sirketTel : ''}</div>
                </div>
            `;
        });

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Etiketler - ${saveResult.serials.length} adet</title>
                <meta charset="utf-8">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    @page { size: 60mm 40mm; margin: 0; }
                    body { 
                        font-family: Arial, 'Arial Black', sans-serif; 
                        background: white;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    
                    .etiket {
                        width: 60mm;
                        height: 40mm;
                        border: 2px solid #000;
                        display: flex;
                        flex-direction: column;
                        background: #fff;
                        overflow: hidden;
                    }
                    
                    /* Üst Banner - Şirket */
                    .top-banner {
                        background: #000;
                        color: #fff;
                        text-align: center;
                        padding: 0.6mm 1mm;
                        font-size: 6.5pt;
                        font-weight: 900;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        line-height: 1.2;
                        flex-shrink: 0;
                    }
                    
                    /* Seri Numarası - Tam genişlik, büyük font */
                    .serial-row {
                        background: #fff;
                        color: #000;
                        text-align: center;
                        font-size: 13pt;
                        font-weight: 900;
                        font-family: 'Courier New', monospace;
                        padding: 0.8mm 2mm;
                        border-bottom: 2px solid #000;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        flex-shrink: 0;
                        letter-spacing: 0.5mm;
                    }
                    
                    /* Orta Bölüm - QR + Bilgi */
                    .mid-section {
                        display: flex;
                        flex: 1;
                        min-height: 0;
                        border-bottom: 1.5px solid #000;
                    }
                    
                    /* QR */
                    .qr-area {
                        width: 15mm;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-right: 1.5px solid #000;
                        padding: 0.5mm;
                        flex-shrink: 0;
                    }
                    .qr-img {
                        width: 13mm;
                        height: 13mm;
                        display: block;
                        image-rendering: pixelated;
                    }
                    
                    /* Bilgi Alanı */
                    .info-area {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        padding: 0.5mm 1.5mm;
                        gap: 0.5mm;
                        min-width: 0;
                    }
                    
                    .customer-row {
                        font-size: 6.5pt;
                        font-weight: 900;
                        text-transform: uppercase;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        border-bottom: 1px solid #999;
                        padding-bottom: 0.5mm;
                    }
                    
                    .type-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: 8pt;
                        font-weight: 900;
                    }
                    .type-val {
                        text-transform: uppercase;
                    }
                    
                    .date-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: 5.5pt;
                        font-weight: 700;
                        color: #333;
                    }
                    .date-row b {
                        font-family: 'Courier New', monospace;
                    }
                    
                    /* Alt Banner */
                    .bottom-banner {
                        background: #000;
                        color: #fff;
                        text-align: center;
                        padding: 0.4mm;
                        font-size: 6pt;
                        font-weight: 900;
                        flex-shrink: 0;
                    }
                    
                    @media print {
                        html, body { 
                            width: 60mm; 
                            height: 40mm; 
                            margin: 0;
                            padding: 0;
                        }
                        .etiket {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .top-banner, .bottom-banner {
                            background: #000 !important;
                            color: #fff !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                    }
                </style>
            </head>
            <body>
                ${labelsHtml}
                <script>
                    window.onload = function() { 
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        displayToast(`${saveResult.serials.length} etiket yazdırılıyor...`, 'success');
    };

    // Tüp listesine git
    const goToTubeList = () => {
        navigate('/tube-list');
    };

    // Yeni kayıt başlat
    const resetForm = () => {
        setSaveResult(null);
        // Tarihleri sıfırla
        const today = new Date().toISOString().split('T')[0];
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const nextYearStr = nextYear.toISOString().split('T')[0];

        setFormData({
            customer_id: '',
            dolum_tarihi: today,
            son_kullanim_tarihi: nextYearStr,
            tup_cinsi: '',
            kilo: '6',
            adet: '1'
        });
    };

    // Toplam tüp sayısı
    const totalTubes = cart.reduce((sum, item) => sum + item.adet, 0);

    return (
        <div className="row gy-4">
            {/* Sol: Tüp Ekleme Formu */}
            <div className="col-lg-6">
                <div className="card h-100 p-0 radius-12">
                    <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                            <div className="w-40-px h-40-px bg-primary-50 rounded-circle d-flex justify-content-center align-items-center">
                                <Icon icon="mdi:fire-extinguisher" className="text-primary-600 text-xl" />
                            </div>
                            <h6 className="mb-0 fw-semibold">Tüp Ekle</h6>
                        </div>
                        <Link to="/tube-list" className="text-primary-600 hover-text-primary d-flex align-items-center gap-1 text-sm">
                            Tüp Listesi <Icon icon="solar:alt-arrow-right-linear" className="icon" />
                        </Link>
                    </div>
                    <div className="card-body p-24">
                        <form onSubmit={addToCart}>
                            {/* Müşteri Seçimi */}
                            <div className="mb-20">
                                <label
                                    htmlFor="customer_id"
                                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                                >
                                    Müşteri <span className="text-danger-600">*</span>
                                </label>
                                <select
                                    name="customer_id"
                                    id="customer_id"
                                    className="form-control radius-8 form-select"
                                    value={formData.customer_id}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Müşteri Seçin</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.firma_adi}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Tarihler */}
                            <div className="row">
                                <div className="col-6">
                                    <div className="mb-20">
                                        <label
                                            htmlFor="dolum_tarihi"
                                            className="form-label fw-semibold text-primary-light text-sm mb-8"
                                        >
                                            Dolum Tarihi <span className="text-danger-600">*</span>
                                        </label>
                                        <DatePicker
                                            id="dolum_tarihi"
                                            name="dolum_tarihi"
                                            placeholder="Tarih seçin"
                                            value={formData.dolum_tarihi}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="mb-20">
                                        <label
                                            htmlFor="son_kullanim_tarihi"
                                            className="form-label fw-semibold text-primary-light text-sm mb-8"
                                        >
                                            Son Kullanım Tarihi <span className="text-danger-600">*</span>
                                        </label>
                                        <DatePicker
                                            id="son_kullanim_tarihi"
                                            name="son_kullanim_tarihi"
                                            placeholder="Tarih seçin"
                                            value={formData.son_kullanim_tarihi}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Tüp Cinsi */}
                            <div className="mb-20">
                                <label
                                    htmlFor="tup_cinsi"
                                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                                >
                                    Tüp Cinsi <span className="text-danger-600">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="tup_cinsi"
                                    id="tup_cinsi"
                                    className="form-control radius-8"
                                    value={formData.tup_cinsi}
                                    onChange={handleInputChange}
                                    list="tubeTypesList"
                                    placeholder="Seçin veya yazın..."
                                    autoComplete="off"
                                    required
                                />
                                <datalist id="tubeTypesList">
                                    {allTubeTypes.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </datalist>
                            </div>

                            {/* Kilo ve Adet */}
                            <div className="row">
                                <div className="col-6">
                                    <div className="mb-20">
                                        <label
                                            htmlFor="kilo"
                                            className="form-label fw-semibold text-primary-light text-sm mb-8"
                                        >
                                            Kilo <span className="text-danger-600">*</span>
                                        </label>
                                        <div className="input-group">
                                            <input
                                                type="number"
                                                name="kilo"
                                                id="kilo"
                                                className="form-control radius-8"
                                                value={formData.kilo}
                                                onChange={handleInputChange}
                                                min="0.1"
                                                step="0.1"
                                                required
                                            />
                                            <span className="input-group-text bg-base">KG</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="mb-20">
                                        <label
                                            htmlFor="adet"
                                            className="form-label fw-semibold text-primary-light text-sm mb-8"
                                        >
                                            Adet <span className="text-danger-600">*</span>
                                        </label>
                                        <div className="input-group">
                                            <input
                                                type="number"
                                                name="adet"
                                                id="adet"
                                                className="form-control radius-8"
                                                value={formData.adet}
                                                onChange={handleInputChange}
                                                min="1"
                                                max="500"
                                                required
                                            />
                                            <span className="input-group-text bg-base">Adet</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Seri Numarası (Manuel) */}
                                <div className="col-12">
                                    <div className="mb-20">
                                        <label
                                            htmlFor="seri_no"
                                            className="form-label fw-semibold text-primary-light text-sm mb-8"
                                        >
                                            Seri Numarası <span className="text-secondary-light">(Opsiyonel - boş bırakılırsa otomatik üretilir)</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="seri_no"
                                            id="seri_no"
                                            className="form-control radius-8"
                                            value={formData.seri_no}
                                            onChange={handleInputChange}
                                            placeholder="Örn: ABC-123, TÜp-001..."
                                        />
                                    </div>
                                </div>

                            {/* Bulunduğu Yer */}
                                <div className="col-12">
                                    <div className="mb-20">
                                        <label
                                            htmlFor="location_description"
                                            className="form-label fw-semibold text-primary-light text-sm mb-8"
                                        >
                                            Bulunduğu Yer <span className="text-secondary-light">(Opsiyonel)</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="location_description"
                                            id="location_description"
                                            className="form-control radius-8"
                                            value={formData.location_description}
                                            onChange={handleInputChange}
                                            placeholder="Örn: 1. Kat Koridor, Mutfak Girişi, Depo..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sepete Ekle Butonu */}
                            <button
                                type="submit"
                                className="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8 w-100 d-flex align-items-center justify-content-center gap-2"
                            >
                                <Icon icon="ic:baseline-plus" className="text-xl line-height-1" />
                                Sepete Ekle
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Sağ: Sepet */}
            <div className="col-lg-6">
                <div className="card h-100 p-0 radius-12">
                    <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                            <div className="w-40-px h-40-px bg-warning-50 rounded-circle d-flex justify-content-center align-items-center">
                                <Icon icon="mdi:cart" className="text-warning-600 text-xl" />
                            </div>
                            <h6 className="mb-0 fw-semibold">Sepet</h6>
                        </div>
                        <span className="bg-primary-50 text-primary-600 border border-primary-main px-16 py-4 radius-4 fw-medium text-sm">
                            {totalTubes} tüp
                        </span>
                    </div>
                    <div className="card-body p-24">
                        {/* Sepet boş durumu */}
                        {cart.length === 0 && !saveResult && (
                            <div className="text-center py-48">
                                <div className="w-80-px h-80-px bg-neutral-100 rounded-circle d-flex justify-content-center align-items-center mx-auto mb-16">
                                    <Icon icon="mdi:cart-outline" className="text-neutral-500 text-4xl" />
                                </div>
                                <h6 className="text-secondary-light mb-8">Sepet Boş</h6>
                                <p className="text-secondary-light text-sm mb-0">Sol taraftan tüp ekleyin</p>
                            </div>
                        )}

                        {/* Kayıt sonucu */}
                        {saveResult && (
                            <div className="text-center py-24">
                                <div className="w-80-px h-80-px bg-success-focus rounded-circle d-flex align-items-center justify-content-center mx-auto mb-16">
                                    <Icon icon="heroicons:check" className="text-success-600 text-4xl" />
                                </div>
                                <h5 className="text-success-600 mb-8">{saveResult.count} Tüp Kaydedildi!</h5>

                                {/* Tüp grupları */}
                                <div className="d-flex flex-wrap justify-content-center gap-12 mb-16">
                                    {saveResult.grouped.map((g, i) => (
                                        <div key={i} className="bg-primary-50 border border-primary-100 radius-8 px-16 py-12 text-center">
                                            <span className="d-block text-xl fw-bold text-primary-600">{g.count}x</span>
                                            <span className="text-sm text-secondary-light">{g.type} {g.kilo}KG</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Seri numaraları */}
                                <div className="bg-neutral-50 radius-8 p-16 text-start mb-16" style={{ maxHeight: '220px', overflow: 'auto' }}>
                                    <h6 className="text-sm mb-12 d-flex align-items-center gap-2">
                                        <Icon icon="heroicons:qr-code" className="text-secondary-light" />
                                        Oluşturulan Seri Numaraları
                                    </h6>
                                    {saveResult.serials.slice(0, 15).map((s, i) => (
                                        <div key={i} className="d-flex align-items-center gap-12 py-8 border-bottom">
                                            <img
                                                src={generateQRDataUrl(s.seri_no)}
                                                alt="QR"
                                                style={{ width: '40px', height: '40px' }}
                                                className="rounded"
                                            />
                                            <div className="flex-grow-1">
                                                <span className="fw-semibold font-monospace d-block">{s.seri_no}</span>
                                                <span className="text-secondary-light text-sm">{s.tup_cinsi} - {s.kilo}KG</span>
                                            </div>
                                        </div>
                                    ))}
                                    {saveResult.serials.length > 15 && (
                                        <p className="text-secondary-light text-sm mb-0 mt-8 text-center">
                                            ... ve {saveResult.serials.length - 15} tüp daha
                                        </p>
                                    )}
                                </div>

                                {/* Aksiyon butonları */}
                                <div className="d-flex flex-wrap justify-content-center gap-12">
                                    <button
                                        type="button"
                                        className="border border-neutral-300 bg-hover-neutral-200 text-secondary-light text-md px-24 py-11 radius-8 d-flex align-items-center gap-2"
                                        onClick={printLabels}
                                    >
                                        <Icon icon="heroicons:printer" className="text-lg" />
                                        Etiketleri Yazdır
                                    </button>
                                    <button
                                        type="button"
                                        className="border border-primary-600 bg-hover-primary-200 text-primary-600 text-md px-24 py-11 radius-8 d-flex align-items-center gap-2"
                                        onClick={goToTubeList}
                                    >
                                        <Icon icon="heroicons:list-bullet" className="text-lg" />
                                        Tüp Listesi
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8 d-flex align-items-center gap-2"
                                        onClick={resetForm}
                                    >
                                        <Icon icon="heroicons:plus" className="text-lg" />
                                        Yeni Kayıt
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Kayıt işlemi devam ediyor */}
                        {isSaving && (
                            <div className="text-center py-32">
                                <div className="spinner-border text-primary-600 mb-16" role="status">
                                    <span className="visually-hidden">Kaydediliyor...</span>
                                </div>
                                <h6 className="mb-16">Tüpler Kaydediliyor...</h6>
                                <div className="progress mb-8" style={{ height: '8px' }}>
                                    <div
                                        className="progress-bar bg-primary-600"
                                        style={{ width: `${saveProgress}%` }}
                                    ></div>
                                </div>
                                <p className="text-secondary-light text-sm mb-0">
                                    %{saveProgress} tamamlandı
                                </p>
                            </div>
                        )}

                        {/* Sepet içeriği */}
                        {cart.length > 0 && !isSaving && !saveResult && (
                            <>
                                <div className="d-flex flex-column gap-12 mb-20" style={{ maxHeight: '300px', overflow: 'auto' }}>
                                    {cart.map(item => (
                                        <div key={item.id} className="d-flex align-items-center justify-content-between p-16 bg-neutral-50 border radius-8">
                                            <div className="d-flex align-items-center gap-12">
                                                <div className="w-40-px h-40-px bg-primary-50 rounded-circle d-flex justify-content-center align-items-center flex-shrink-0">
                                                    <Icon icon="mdi:fire-extinguisher" className="text-primary-600 text-lg" />
                                                </div>
                                                <div className="flex-grow-1">
                                                    <div className="d-flex align-items-center gap-8 mb-4">
                                                        <span className="fw-semibold text-md">{item.tup_cinsi}</span>
                                                        <span className="bg-neutral-200 text-secondary-light px-8 py-2 radius-4 text-xs">
                                                            {item.kilo} KG
                                                        </span>
                                                    </div>
                                                    <span className="text-sm text-secondary-light">
                                                        {item.customer_name} • SKT: {formatDate(item.son_kullanim_tarihi)}
                                                        {item.seri_no ? ` • SN: ${item.seri_no}` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="d-flex align-items-center gap-12">
                                                <span className="bg-primary-50 text-primary-600 border border-primary-main px-12 py-6 radius-4 fw-semibold">
                                                    {item.adet}x
                                                </span>
                                                <button
                                                    type="button"
                                                    className="remove-item-btn bg-danger-focus bg-hover-danger-200 text-danger-600 fw-medium w-32-px h-32-px d-flex justify-content-center align-items-center rounded-circle"
                                                    onClick={() => removeFromCart(item.id)}
                                                    title="Kaldır"
                                                >
                                                    <Icon icon="heroicons:x-mark" className="text-lg" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Sepet özeti */}
                                <div className="bg-neutral-50 border radius-8 p-16 mb-16">
                                    <div className="d-flex justify-content-between mb-12 pb-12 border-bottom">
                                        <span className="text-secondary-light">Toplam Tüp:</span>
                                        <span className="fw-semibold text-primary-600">{totalTubes} adet</span>
                                    </div>
                                    <div className="d-flex justify-content-between">
                                        <span className="text-secondary-light">Farklı Çeşit:</span>
                                        <span className="fw-semibold text-primary-600">{cart.length} kalem</span>
                                    </div>
                                </div>

                                {/* Sepet butonları */}
                                <div className="d-flex gap-12">
                                    <button
                                        type="button"
                                        className="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-24 py-11 radius-8 flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                                        onClick={clearCart}
                                    >
                                        <Icon icon="heroicons:trash" className="text-lg" />
                                        Temizle
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-success border border-success-600 text-md px-24 py-12 radius-8 flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                                        onClick={saveAllTubes}
                                    >
                                        <Icon icon="heroicons:check" className="text-lg" />
                                        Hepsini Kaydet
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            {showToast && (
                <div
                    className="position-fixed bottom-0 end-0 p-3"
                    style={{ zIndex: 9999 }}
                >
                    <div className={`toast show ${toastType === 'success' ? 'bg-success-600' : toastType === 'warning' ? 'bg-warning-600' : 'bg-info-600'} text-white radius-8`}>
                        <div className="toast-body d-flex align-items-center gap-12 px-16 py-12">
                            <Icon
                                icon={toastType === 'success' ? 'heroicons:check-circle' : toastType === 'warning' ? 'heroicons:exclamation-triangle' : 'heroicons:information-circle'}
                                className="text-xl"
                            />
                            <span>{toastMessage}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TubesLayer;
