import { Icon } from '@iconify/react/dist/iconify.js';
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { Turkish } from 'flatpickr/dist/l10n/tr.js';

// DatePicker Component
const DatePicker = ({ id, placeholder, value, onChange, className }) => {
    const datePickerRef = useRef(null);
    const fpRef = useRef(null);

    useEffect(() => {
        fpRef.current = flatpickr(datePickerRef.current, {
            dateFormat: 'd.m.Y',
            locale: Turkish,
            defaultDate: value || null,
            onChange: (selectedDates, dateStr) => {
                if (onChange) {
                    const isoDate = selectedDates[0] ? selectedDates[0].toISOString().split('T')[0] : '';
                    onChange(isoDate);
                }
            }
        });

        return () => {
            if (fpRef.current) {
                fpRef.current.destroy();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (fpRef.current && value) {
            fpRef.current.setDate(value, false);
        } else if (fpRef.current && !value) {
            fpRef.current.clear();
        }
    }, [value]);

    return (
        <div className="position-relative">
            <input
                ref={datePickerRef}
                id={id}
                type="text"
                className={className || "form-control form-control-sm radius-8 h-40-px bg-base pe-40"}
                placeholder={placeholder}
                readOnly
            />
            <Icon 
                icon="solar:calendar-linear" 
                className="position-absolute top-50 translate-middle-y end-0 me-12 text-secondary-light text-lg" 
            />
        </div>
    );
};

const TubeListLayer = () => {
    const navigate = useNavigate();
    
    // State tanımları
    const [tubes, setTubes] = useState([]);
    const [filteredTubes, setFilteredTubes] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    
    // Firma ayarları
    const [companySettings, setCompanySettings] = useState({
        company_name: '',
        phone: '',
        address: ''
    });
    
    // Modal state'leri
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedTube, setSelectedTube] = useState(null);
    
    // Düzenleme form state'i
    const [editFormData, setEditFormData] = useState({
        id: '',
        customer_id: '',
        tup_cinsi: '',
        kilo: '',
        dolum_tarihi: '',
        son_kullanim_tarihi: '',
        location_description: ''
    });
    
    // Çoklu seçim state'leri
    const [selectedTubeIds, setSelectedTubeIds] = useState([]);
    
    // Toplu yenileme state'leri
    const [renewalCustomerId, setRenewalCustomerId] = useState('');
    const [renewalDate, setRenewalDate] = useState('');
    const [renewalTubes, setRenewalTubes] = useState([]);
    const [selectedRenewalTubes, setSelectedRenewalTubes] = useState([]);
    
    // Toast state
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');
    // eslint-disable-next-line no-unused-vars
    const [loading, setLoading] = useState(true);

    // Müşteri verileri - veritabanından
    const [customers, setCustomers] = useState([]);

    // Tüp cinsleri
    const tubeTypes = [
        { value: 'KKT', label: 'KKT (Kuru Kimyevi)' },
        { value: 'CO2', label: 'CO2' },
        { value: 'Köpüklü', label: 'Köpüklü' },
        { value: 'Biyolojik', label: 'Biyolojik' },
        { value: 'Ekobiyolojik', label: 'Ekobiyolojik' },
        { value: 'FM200', label: 'FM200' },
        { value: 'Tekne', label: 'Tekne Tipi' },
        { value: 'Su', label: 'Su' },
        { value: 'Halokarbon', label: 'Halokarbon' },
        { value: 'Oksijen', label: 'Oksijen' },
        { value: 'Davlumbaz', label: 'Davlumbaz' },
        { value: 'Otomatik', label: 'Otomatik' },
    ];

    // Veritabanından verileri çek
    useEffect(() => {
        const fetchData = async () => {
            try {
                if (window.api) {
                    // Tüpleri çek
                    const tubesResult = await window.api.tube.list();
                    if (tubesResult.success) {
                        setTubes(tubesResult.data);
                        setFilteredTubes(tubesResult.data);
                    }

                    // Müşterileri çek
                    const customersResult = await window.api.customer.list();
                    if (customersResult.success) {
                        setCustomers(customersResult.data);
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
                }
            } catch (error) {
                console.error('Veri çekme hatası:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Tüp durumu hesaplama
    const getTubeStatus = (sonKullanim) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expDate = new Date(sonKullanim);
        expDate.setHours(0, 0, 0, 0);
        const diffTime = expDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return { 
                status: 'Süresi Dolmuş', 
                statusClass: 'bg-danger-600', 
                rowClass: 'bg-danger-50',
                remainingDays: `${Math.abs(diffDays)} gün geçti`,
                isUrgent: true 
            };
        } else if (diffDays <= 30) {
            return { 
                status: 'Süresi Yaklaşıyor', 
                statusClass: 'bg-warning-600', 
                rowClass: 'bg-warning-50',
                remainingDays: `${diffDays} gün`,
                isUrgent: true 
            };
        } else {
            return { 
                status: 'Normal', 
                statusClass: 'bg-success-600', 
                rowClass: '',
                remainingDays: `${diffDays} gün`,
                isUrgent: false 
            };
        }
    };

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

    // Filtreleme
    useEffect(() => {
        let result = tubes;

        // Arama
        if (searchTerm) {
            result = result.filter(tube =>
                tube.seri_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tube.firma_adi.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Tüp cinsi
        if (typeFilter) {
            result = result.filter(tube => tube.tup_cinsi === typeFilter);
        }

        // Durum
        if (statusFilter) {
            result = result.filter(tube => {
                const { statusClass } = getTubeStatus(tube.son_kullanim_tarihi);
                if (statusFilter === 'normal') return statusClass === 'bg-success-600';
                if (statusFilter === 'warning') return statusClass === 'bg-warning-600';
                if (statusFilter === 'expired') return statusClass === 'bg-danger-600';
                return true;
            });
        }

        // Tarih aralığı
        if (fromDate) {
            result = result.filter(tube => new Date(tube.son_kullanim_tarihi) >= new Date(fromDate));
        }
        if (toDate) {
            result = result.filter(tube => new Date(tube.son_kullanim_tarihi) <= new Date(toDate));
        }

        setFilteredTubes(result);
        // Filtre değiştiğinde seçimleri temizle
        setSelectedTubeIds([]);
    }, [tubes, searchTerm, typeFilter, statusFilter, fromDate, toDate]);

    // WhatsApp hatırlatma - Electron shell API kullanarak
    const sendWhatsAppReminder = async (tube) => {
        if (!tube.telefon) {
            displayToast('Bu müşterinin telefon numarası kayıtlı değil!', 'warning');
            return;
        }
        
        const cleanPhone = tube.telefon.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('90') ? cleanPhone : '90' + cleanPhone;
        const { status, remainingDays } = getTubeStatus(tube.son_kullanim_tarihi);
        const firmaAdi = tube.firma_adi || 'Sayın Müşterimiz';
        
        // Firma bilgilerini ayarlardan al
        const firmName = companySettings.company_name || 'Firma';
        const firmPhone = companySettings.phone || '';
        const firmCity = companySettings.address ? companySettings.address.split('/').pop()?.split(',').pop()?.trim() || '' : '';
        
        let message;
        if (status === 'Süresi Dolmuş') {
            message = `Sayın ${firmaAdi},

${firmName} olarak sizinle iletişime geçiyoruz.

🔴 ${tube.seri_no} seri numaralı yangın tüpünüzün dolum süresi DOLMUŞTUR (${remainingDays}).

Güvenliğiniz için tüpünüzün acil olarak yenilenmesi gerekmektedir.

📞 Randevu için: ${firmPhone}

${firmName}${firmCity ? '\n' + firmCity : ''}`;
        } else {
            message = `Sayın ${firmaAdi},

${firmName} olarak sizinle iletişime geçiyoruz.

⚠️ ${tube.seri_no} seri numaralı yangın tüpünüzün dolum süresine ${remainingDays} kalmıştır.

Süresi dolmadan yenileme randevusu almanızı öneriyoruz.

📞 Randevu için: ${firmPhone}

${firmName}${firmCity ? '\n' + firmCity : ''}`;
        }
        
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
        
        // Electron shell API kullan
        if (window.api && window.api.shell) {
            await window.api.shell.openExternal(whatsappUrl);
        } else {
            // Fallback: normal window.open
            window.open(whatsappUrl, '_blank');
        }
        
        displayToast('WhatsApp açılıyor...', 'success');
    };

    // Düzenleme modal'ını aç
    const openEditModal = (tube) => {
        setEditFormData({
            id: tube.id,
            customer_id: tube.customer_id,
            tup_cinsi: tube.tup_cinsi || '',
            kilo: tube.kilo || '',
            dolum_tarihi: tube.dolum_tarihi || '',
            son_kullanim_tarihi: tube.son_kullanim_tarihi || '',
            location_description: tube.location_description || ''
        });
        setIsEditModalOpen(true);
    };

    // Düzenleme form değişikliği
    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
    };

    // Seçili ilk tüpü düzenle
    const editSelectedTube = () => {
        if (selectedTubeIds.length === 0) {
            displayToast('Lütfen düzenlemek için bir tüp seçin', 'warning');
            return;
        }
        // İlk seçili tüpü bul ve düzenleme modalını aç
        const tubeToEdit = tubes.find(t => t.id === selectedTubeIds[0]);
        if (tubeToEdit) {
            openEditModal(tubeToEdit);
        }
    };

    // Düzenleme kaydet
    const handleEditSave = async () => {
        try {
            if (window.api) {
                const result = await window.api.tube.update(editFormData);
                if (result.success) {
                    // Listeyi güncelle
                    setTubes(prev => prev.map(t => {
                        if (t.id === editFormData.id) {
                            const customer = customers.find(c => c.id === parseInt(editFormData.customer_id));
                            return {
                                ...t,
                                customer_id: parseInt(editFormData.customer_id),
                                firma_adi: customer?.firma_adi || t.firma_adi,
                                tup_cinsi: editFormData.tup_cinsi,
                                kilo: editFormData.kilo,
                                dolum_tarihi: editFormData.dolum_tarihi,
                                son_kullanim_tarihi: editFormData.son_kullanim_tarihi,
                                location_description: editFormData.location_description
                            };
                        }
                        return t;
                    }));
                    displayToast('Tüp bilgileri güncellendi', 'success');
                    setIsEditModalOpen(false);
                } else {
                    displayToast('Güncelleme başarısız', 'danger');
                }
            }
        } catch (error) {
            console.error('Güncelleme hatası:', error);
            displayToast('Güncelleme sırasında hata oluştu', 'danger');
        }
    };

    // Silme işlemi
    const openDeleteModal = (tube) => {
        setSelectedTube(tube);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        try {
            if (window.api) {
                const result = await window.api.tube.delete(selectedTube.id);
                if (result.success) {
                    setTubes(prev => prev.filter(t => t.id !== selectedTube.id));
                    displayToast(`"${selectedTube.seri_no}" başarıyla silindi`, 'success');
                } else {
                    displayToast('Silme işlemi başarısız', 'danger');
                }
            }
        } catch (error) {
            console.error('Silme hatası:', error);
            displayToast('Silme sırasında hata oluştu', 'danger');
        }
        setIsDeleteModalOpen(false);
    };

    // Detay görüntüle
    const openDetailModal = (tube) => {
        setSelectedTube(tube);
        setIsDetailModalOpen(true);
    };

    // Müşteri detayına git
    const goToCustomer = (customerId) => {
        navigate(`/customers?highlight=${customerId}`);
    };

    // QR Kodu oluştur (Base64 data URL)
    const generateQRDataUrl = (tube) => {
        // Şirket kodu oluştur - şirket adının ilk kelimesinden
        const sirketKodu = companySettings?.company_name 
            ? companySettings.company_name.split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '')
            : 'YANGIN';
        const data = `${sirketKodu}-${tube.seri_no}`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data)}`;
    };

    // Etiket yazdır - Profesyonel yangın söndürücü etiketi (60mm x 40mm)
    const printLabel = (tube) => {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        const qrDataUrl = generateQRDataUrl(tube);
        const firmaAdi = tube.firma_adi || 'Müşteri';
        const dolumTarihi = formatDate(tube.dolum_tarihi);
        const sktTarihi = formatDate(tube.son_kullanim_tarihi);
        
        // Ayarlardan dinamik veriler
        const sirketAdi = companySettings?.company_name || 'YANGIN SÖNDÜRME';
        const sirketTel = companySettings?.phone || '';
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Etiket - ${tube.seri_no}</title>
                <meta charset="utf-8">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    @page { size: 60mm 40mm; margin: 0; }
                    body { 
                        font-family: 'Arial Black', Arial, sans-serif; 
                        background: white;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                    }
                    
                    .etiket {
                        width: 60mm;
                        height: 40mm;
                        border: 2.5px solid #000;
                        display: flex;
                        flex-direction: column;
                        background: #fff;
                        overflow: hidden;
                    }
                    
                    /* Üst Banner */
                    .top-banner {
                        background: #000;
                        color: #fff;
                        text-align: center;
                        padding: 1.2mm 1mm;
                        font-size: 8pt;
                        font-weight: 900;
                        letter-spacing: 0.3mm;
                    }
                    
                    /* Ana İçerik */
                    .main-content {
                        display: flex;
                        flex: 1;
                        border-bottom: 1.5px solid #000;
                    }
                    
                    /* QR Bölümü */
                    .qr-section {
                        width: 18mm;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-right: 1.5px solid #000;
                        padding: 1mm;
                    }
                    .qr-frame {
                        width: 15mm;
                        height: 15mm;
                        border: 1.5px solid #000;
                        padding: 0.5mm;
                    }
                    .qr-img {
                        width: 100%;
                        height: 100%;
                        display: block;
                        image-rendering: pixelated;
                    }
                    
                    /* Bilgi Bölümü */
                    .info-section {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        padding: 1mm;
                    }
                    
                    .customer-box {
                        border: 1px solid #000;
                        padding: 0.8mm 1.5mm;
                        margin-bottom: 1mm;
                        background: #f5f5f5;
                    }
                    .customer-name {
                        font-size: 6.5pt;
                        font-weight: 900;
                        text-transform: uppercase;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                    
                    .serial-box {
                        background: #000;
                        color: #fff;
                        text-align: center;
                        padding: 1mm;
                        margin-bottom: 1mm;
                    }
                    .serial-no {
                        font-size: 11pt;
                        font-weight: 900;
                        font-family: 'Courier New', monospace;
                        letter-spacing: 0.5mm;
                    }
                    
                    .tube-info {
                        display: flex;
                        justify-content: space-between;
                        border: 1.5px solid #000;
                        font-size: 7pt;
                        font-weight: 900;
                    }
                    .tube-type {
                        flex: 1;
                        padding: 0.8mm 1.5mm;
                        border-right: 1px solid #000;
                        text-transform: uppercase;
                    }
                    .tube-weight {
                        padding: 0.8mm 1.5mm;
                        text-align: center;
                        min-width: 12mm;
                    }
                    
                    /* Tarih Şeridi */
                    .date-strip {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 1mm 2mm;
                        border-bottom: 1.5px solid #000;
                        font-size: 7pt;
                        font-weight: 900;
                    }
                    .date-item {
                        display: flex;
                        gap: 1mm;
                    }
                    .date-lbl {
                        font-weight: 900;
                    }
                    .date-val {
                        font-family: 'Courier New', monospace;
                    }
                    .date-item.skt .date-val {
                        text-decoration: underline;
                        text-decoration-thickness: 1.5px;
                    }
                    .date-divider {
                        margin: 0 2mm;
                        font-weight: 900;
                    }
                    
                    /* Alt Banner */
                    .bottom-banner {
                        background: #000;
                        color: #fff;
                        text-align: center;
                        padding: 0.8mm;
                        font-size: 7pt;
                        font-weight: 900;
                        letter-spacing: 0.2mm;
                    }
                    
                    @media print {
                        html, body { 
                            width: 60mm; 
                            height: 40mm; 
                            margin: 0;
                            padding: 0;
                        }
                        body {
                            min-height: auto;
                        }
                        .etiket {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .top-banner, .bottom-banner, .serial-box {
                            background: #000 !important;
                            color: #fff !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="etiket">
                    <!-- Üst Şerit - Firma Adı -->
                    <div class="top-banner">
                        <span>★ ${sirketAdi.toUpperCase()} ★</span>
                    </div>
                    
                    <!-- Ana İçerik Alanı -->
                    <div class="main-content">
                        <!-- Sol: QR Kod -->
                        <div class="qr-section">
                            <div class="qr-frame">
                                <img src="${qrDataUrl}" class="qr-img"/>
                            </div>
                        </div>
                        
                        <!-- Sağ: Bilgiler -->
                        <div class="info-section">
                            <!-- Müşteri -->
                            <div class="customer-box">
                                <div class="customer-name">${firmaAdi}</div>
                            </div>
                            
                            <!-- Barkod No - Büyük -->
                            <div class="serial-box">
                                <span class="serial-no">${tube.seri_no}</span>
                            </div>
                            
                            <!-- Tüp Bilgisi -->
                            <div class="tube-info">
                                <span class="tube-type">${tube.tup_cinsi}</span>
                                <span class="tube-weight">${tube.kilo} KG</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Alt Tarih Şeridi -->
                    <div class="date-strip">
                        <div class="date-item">
                            <span class="date-lbl">DOLUM:</span>
                            <span class="date-val">${dolumTarihi}</span>
                        </div>
                        <div class="date-divider">│</div>
                        <div class="date-item skt">
                            <span class="date-lbl">S.K.T:</span>
                            <span class="date-val">${sktTarihi}</span>
                        </div>
                    </div>
                    
                    <!-- Alt Şerit - Telefon -->
                    <div class="bottom-banner">
                        <span>${sirketTel ? '✆ ' + sirketTel : ''}</span>
                    </div>
                </div>
                <script>
                    window.onload = function() { 
                        setTimeout(function() { window.print(); }, 500);
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        displayToast(`"${tube.seri_no}" etiketi yazdırılıyor...`, 'success');
    };

    // Sertifika oluştur - yeni sekmede aç
    const createCertificate = (tube) => {
        const certWindow = window.open('', '_blank', 'width=800,height=600');
        const today = new Date().toLocaleDateString('tr-TR');
        const certNo = `CERT-${tube.seri_no}-${Date.now().toString(36).toUpperCase()}`;
        
        // Ayarlardan dinamik veriler
        const sirketAdi = companySettings?.company_name || 'YANGIN SÖNDÜRME';
        
        certWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Sertifika - ${tube.seri_no}</title>
                <style>
                    body { font-family: 'Times New Roman', serif; padding: 40px; background: #f5f5f5; }
                    .certificate { background: white; border: 3px double #333; padding: 40px; max-width: 700px; margin: 0 auto; position: relative; }
                    .certificate::before { content: ''; position: absolute; top: 10px; left: 10px; right: 10px; bottom: 10px; border: 1px solid #ccc; pointer-events: none; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .logo { font-size: 28px; font-weight: bold; color: #dc3545; }
                    .title { font-size: 24px; margin: 20px 0; text-decoration: underline; }
                    .cert-no { font-size: 12px; color: #666; }
                    .content { line-height: 2; margin: 30px 0; text-align: justify; }
                    .details { margin: 20px 0; }
                    .details table { width: 100%; border-collapse: collapse; }
                    .details td { padding: 8px; border-bottom: 1px dotted #ccc; }
                    .details td:first-child { font-weight: bold; width: 40%; }
                    .footer { text-align: center; margin-top: 40px; }
                    .signature { margin-top: 40px; display: flex; justify-content: space-between; }
                    .signature div { text-align: center; width: 200px; }
                    .signature .line { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; }
                    @media print { body { background: white; padding: 0; } .certificate { border: none; } }
                </style>
            </head>
            <body>
                <div class="certificate">
                    <div class="header">
                        <div class="logo">🔥 ${sirketAdi.toUpperCase()}</div>
                        <div class="title">YANGIN TÜPÜ DOLUM SERTİFİKASI</div>
                        <div class="cert-no">Sertifika No: ${certNo}</div>
                    </div>
                    
                    <div class="content">
                        <p>İşbu belge, aşağıda bilgileri verilen yangın söndürme tüpünün, 
                        ilgili TSE standartlarına ve yönetmeliklere uygun olarak kontrol edildiğini, 
                        bakımının yapıldığını ve doldurulduğunu belgeler.</p>
                    </div>
                    
                    <div class="details">
                        <table>
                            <tr><td>Tüp Barkod No</td><td>${tube.seri_no}</td></tr>
                            <tr><td>Tüp Cinsi</td><td>${tube.tup_cinsi}</td></tr>
                            <tr><td>Kapasite</td><td>${tube.kilo} KG</td></tr>
                            <tr><td>Dolum Tarihi</td><td>${formatDate(tube.dolum_tarihi)}</td></tr>
                            <tr><td>Son Kullanım Tarihi</td><td>${formatDate(tube.son_kullanim_tarihi)}</td></tr>
                            <tr><td>Firma / Müşteri</td><td>${tube.firma_adi}</td></tr>
                        </table>
                    </div>
                    
                    <div class="footer">
                        <p><strong>Düzenleme Tarihi:</strong> ${today}</p>
                        <div class="signature">
                            <div>
                                <div class="line">Yetkili İmza</div>
                            </div>
                            <div>
                                <div class="line">Kaşe / Mühür</div>
                            </div>
                        </div>
                    </div>
                </div>
                <script>
                    window.onload = function() { 
                        setTimeout(function() { window.print(); }, 500);
                    }
                </script>
            </body>
            </html>
        `);
        certWindow.document.close();
        displayToast(`"${tube.seri_no}" için sertifika oluşturuldu`, 'success');
    };

    // CSV dışa aktar
    const exportToCSV = () => {
        if (filteredTubes.length === 0) {
            displayToast('Dışa aktarılacak kayıt yok', 'warning');
            return;
        }
        
        const headers = ['Barkod No', 'Firma', 'Tüp Cinsi', 'Kilo', 'Dolum Tarihi', 'Son Kullanım', 'Durum'];
        const rows = filteredTubes.map(tube => {
            const { status } = getTubeStatus(tube.son_kullanim_tarihi);
            return [tube.seri_no, tube.firma_adi, tube.tup_cinsi, tube.kilo, tube.dolum_tarihi, tube.son_kullanim_tarihi, status];
        });
        
        // BOM ekle (Excel'de Türkçe karakter için)
        const BOM = '\uFEFF';
        const csvContent = BOM + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `tup_listesi_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        displayToast(`${filteredTubes.length} kayıt CSV olarak indirildi`, 'success');
    };

    // Excel dışa aktar (HTML tablosu Excel olarak)
    const exportToExcel = () => {
        if (filteredTubes.length === 0) {
            displayToast('Dışa aktarılacak kayıt yok', 'warning');
            return;
        }
        
        let tableHtml = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
            <head><meta charset="UTF-8"></head>
            <body>
            <table border="1">
                <thead>
                    <tr style="background-color: #4CAF50; color: white;">
                        <th>Barkod No</th>
                        <th>Firma</th>
                        <th>Tüp Cinsi</th>
                        <th>Kilo</th>
                        <th>Dolum Tarihi</th>
                        <th>Son Kullanım</th>
                        <th>Durum</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        filteredTubes.forEach(tube => {
            const { status, statusClass } = getTubeStatus(tube.son_kullanim_tarihi);
            const bgColor = statusClass.includes('danger') ? '#ffebee' : 
                           statusClass.includes('warning') ? '#fff8e1' : '';
            tableHtml += `
                <tr style="background-color: ${bgColor}">
                    <td>${tube.seri_no}</td>
                    <td>${tube.firma_adi}</td>
                    <td>${tube.tup_cinsi}</td>
                    <td>${tube.kilo}</td>
                    <td>${formatDate(tube.dolum_tarihi)}</td>
                    <td>${formatDate(tube.son_kullanim_tarihi)}</td>
                    <td>${status}</td>
                </tr>
            `;
        });
        
        tableHtml += '</tbody></table></body></html>';
        
        const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `tup_listesi_${new Date().toISOString().split('T')[0]}.xls`;
        link.click();
        displayToast(`${filteredTubes.length} kayıt Excel olarak indirildi`, 'success');
    };

    // Toplu etiket yazdır - termal yazıcı uyumlu
    const printFilteredLabels = () => {
        if (filteredTubes.length === 0) {
            displayToast('Etiketlenecek kayıt yok', 'warning');
            return;
        }
        
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        let labelsHtml = '';
        
        filteredTubes.forEach((tube, index) => {
            const qrDataUrl = generateQRDataUrl(tube);
            labelsHtml += `
                <div class="label" style="${index > 0 && index % 4 === 0 ? 'page-break-before: always;' : ''}">
                    <div class="header">
                        <div class="logo">${companySettings?.company_name || 'YANGIN SÖNDÜRME'}</div>
                        <div class="qr-container">
                            <img src="${qrDataUrl}" class="qr-code" alt="QR"/>
                        </div>
                    </div>
                    <div class="seri">${tube.seri_no}</div>
                    <div class="info">${tube.tup_cinsi} - ${tube.kilo} KG</div>
                    <div class="dates">
                        <div>Dolum: ${formatDate(tube.dolum_tarihi)}</div>
                        <div>SKT: ${formatDate(tube.son_kullanim_tarihi)}</div>
                    </div>
                </div>
            `;
        });
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Toplu Etiket - ${filteredTubes.length} adet</title>
                <meta charset="utf-8">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: Arial, sans-serif; 
                        background: white;
                        padding: 5mm;
                    }
                    .label { 
                        width: 50mm;
                        height: 30mm;
                        border: 2px solid #000;
                        padding: 2mm;
                        margin-bottom: 3mm;
                        display: inline-block;
                        vertical-align: top;
                        margin-right: 3mm;
                        background: white;
                        page-break-inside: avoid;
                    }
                    .header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        border-bottom: 2px solid #000;
                        padding-bottom: 1mm;
                        margin-bottom: 2mm;
                    }
                    .logo { 
                        font-size: 9pt;
                        font-weight: bold;
                        flex: 1;
                    }
                    .qr-container {
                        width: 15mm;
                        height: 15mm;
                        background: white;
                    }
                    .qr-code {
                        width: 15mm;
                        height: 15mm;
                        display: block;
                        image-rendering: pixelated;
                        image-rendering: crisp-edges;
                    }
                    .seri { 
                        font-size: 9pt;
                        font-weight: bold;
                        text-align: center;
                        margin: 1mm 0;
                        font-family: 'Courier New', monospace;
                    }
                    .info { 
                        font-size: 8pt;
                        text-align: center;
                        margin: 1mm 0;
                        font-weight: bold;
                    }
                    .dates {
                        font-size: 7pt;
                        text-align: center;
                        margin-top: 1mm;
                        border-top: 1px solid #000;
                        padding-top: 1mm;
                    }
                    @media print {
                        body { padding: 0; margin: 0; }
                        .label { 
                            break-inside: avoid;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                            color-adjust: exact;
                        }
                        .qr-code {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        @page {
                            margin: 0;
                        }
                    }
                </style>
            </head>
            <body>
                ${labelsHtml}
                <script>
                    window.onload = function() { 
                        setTimeout(function() { window.print(); }, 500);
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        displayToast(`${filteredTubes.length} etiket yazdırılıyor...`, 'success');
    };

    // Toplu yenileme modal
    const openRenewalModal = () => {
        setRenewalDate(new Date().toISOString().split('T')[0]);
        setRenewalCustomerId('');
        setRenewalTubes([]);
        setSelectedRenewalTubes([]);
        setIsRenewalModalOpen(true);
    };

    // Müşterinin tüplerini yükle
    const loadCustomerTubesForRenewal = (customerId) => {
        setRenewalCustomerId(customerId);
        if (!customerId) {
            setRenewalTubes([]);
            return;
        }
        const customerTubes = tubes.filter(t => t.customer_id === parseInt(customerId));
        setRenewalTubes(customerTubes);
        setSelectedRenewalTubes([]);
    };

    // Yenileme tüpü seç/kaldır
    const toggleRenewalTube = (tubeId) => {
        setSelectedRenewalTubes(prev => {
            if (prev.includes(tubeId)) {
                return prev.filter(id => id !== tubeId);
            } else {
                return [...prev, tubeId];
            }
        });
    };

    // Tümünü seç
    const selectAllRenewalTubes = () => {
        if (selectedRenewalTubes.length === renewalTubes.length) {
            setSelectedRenewalTubes([]);
        } else {
            setSelectedRenewalTubes(renewalTubes.map(t => t.id));
        }
    };

    // Toplu yenileme uygula
    const executeBulkRenewal = async () => {
        if (selectedRenewalTubes.length === 0) {
            alert('Lütfen en az bir tüp seçin');
            return;
        }
        
        try {
            // API'ye gönder
            const result = await window.api.tube.bulkRefill({
                tubeIds: selectedRenewalTubes,
                refillDate: renewalDate
            });
            
            if (result.success) {
                const newExpireDate = new Date(renewalDate);
                newExpireDate.setFullYear(newExpireDate.getFullYear() + 1);
                const newExpireDateStr = newExpireDate.toISOString().split('T')[0];
                
                // Lokal state'i güncelle
                setTubes(prev => prev.map(tube => {
                    if (selectedRenewalTubes.includes(tube.id)) {
                        return {
                            ...tube,
                            dolum_tarihi: renewalDate,
                            son_kullanim_tarihi: newExpireDateStr
                        };
                    }
                    return tube;
                }));
                
                displayToast(`${selectedRenewalTubes.length} tüp başarıyla dolumu yapıldı!`, 'success');
                setIsRenewalModalOpen(false);
            } else {
                displayToast(`Hata: ${result.error}`, 'danger');
            }
        } catch (error) {
            console.error('Toplu dolum hatası:', error);
            displayToast('Dolum işlemi sırasında hata oluştu', 'danger');
        }
    };

    // Filtreleri temizle
    const clearFilters = () => {
        setSearchTerm('');
        setTypeFilter('');
        setStatusFilter('');
        setFromDate('');
        setToDate('');
    };

    // Çoklu seçim fonksiyonları
    const toggleTubeSelection = (tubeId) => {
        setSelectedTubeIds(prev => {
            if (prev.includes(tubeId)) {
                return prev.filter(id => id !== tubeId);
            } else {
                return [...prev, tubeId];
            }
        });
    };

    const toggleSelectAll = () => {
        if (selectedTubeIds.length === filteredTubes.length) {
            setSelectedTubeIds([]);
        } else {
            setSelectedTubeIds(filteredTubes.map(t => t.id));
        }
    };

    // Toplu silme
    const handleBulkDelete = async () => {
        try {
            if (window.api && selectedTubeIds.length > 0) {
                // Toplu silme API'sini kullan (tek transaction'da)
                const result = await window.api.tube.bulkDelete(selectedTubeIds);
                
                if (result.success) {
                    // Verileri yenile
                    const tubesResult = await window.api.tube.list();
                    if (tubesResult.success) {
                        setTubes(tubesResult.data);
                        setFilteredTubes(tubesResult.data);
                    }

                    setSelectedTubeIds([]);
                    setIsBulkDeleteModalOpen(false);
                    displayToast(`${result.deleted} tüp silindi${result.failed > 0 ? `, ${result.failed} tüp silinemedi` : ''}`, result.failed > 0 ? 'warning' : 'success');
                } else {
                    displayToast('Silme işlemi başarısız: ' + result.error, 'danger');
                }
            }
        } catch (error) {
            console.error('Toplu silme hatası:', error);
            displayToast('Toplu silme işlemi sırasında hata oluştu', 'danger');
        }
    };

    // Denetim Raporu Oluştur
    const createInspectionReport = async () => {
        const selectedTubes = filteredTubes.filter(t => selectedTubeIds.includes(t.id));
        if (selectedTubes.length === 0) {
            displayToast('Lütfen rapor için en az bir tüp seçin', 'warning');
            return;
        }

        // Seçilen tüplerin aynı müşteriye ait olup olmadığını kontrol et
        const customerIds = [...new Set(selectedTubes.map(t => t.customer_id))];
        if (customerIds.length > 1) {
            displayToast('Rapor oluşturmak için aynı müşteriye ait tüpler seçilmelidir', 'warning');
            return;
        }

        try {
            if (window.api && window.api.report) {
                const result = await window.api.report.createInspectionReport({
                    tubeIds: selectedTubeIds,
                    customerId: customerIds[0]
                });
                if (result.success) {
                    displayToast('Denetim raporu oluşturuldu', 'success');
                } else {
                    displayToast(result.error || 'Rapor oluşturulamadı', 'danger');
                }
            }
        } catch (error) {
            console.error('Rapor oluşturma hatası:', error);
            displayToast('Rapor oluşturulurken hata oluştu', 'danger');
        }
    };

    // Seçili tüplerin etiketlerini toplu yazdır - termal yazıcı uyumlu
    const printSelectedLabels = () => {
        const selectedTubes = filteredTubes.filter(t => selectedTubeIds.includes(t.id));
        if (selectedTubes.length === 0) {
            displayToast('Lütfen en az bir tüp seçin', 'warning');
            return;
        }

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        let labelsHtml = '';
        selectedTubes.forEach((tube, index) => {
            const qrDataUrl = generateQRDataUrl(tube);
            // Müşteri adını bul
            const customer = customers.find(c => c.id === tube.customer_id);
            const customerName = customer?.firma_adi || tube.firma_adi || '-';
            
            labelsHtml += `
                <div class="label" style="${index > 0 && index % 4 === 0 ? 'page-break-before: always;' : ''}">
                    <div class="header">
                        <div class="company-name">★ ${companySettings?.company_name || 'YANGIN SÖNDÜRME'} ★</div>
                    </div>
                    <div class="content">
                        <div class="qr-section">
                            <img src="${qrDataUrl}" class="qr-code" alt="QR"/>
                        </div>
                        <div class="info-section">
                            <div class="customer-name">${customerName}</div>
                            <div class="barcode-no">${tube.seri_no}</div>
                            <div class="tube-info">
                                <span class="type">${tube.tup_cinsi}</span>
                                <span class="weight">${tube.kilo} KG</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Toplu Etiket Yazdır - ${selectedTubes.length} Adet</title>
                <meta charset="utf-8">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: Arial, sans-serif; 
                        background: white;
                        padding: 5mm;
                    }
                    .label { 
                        width: 60mm;
                        height: 40mm;
                        border: 3px solid #000;
                        margin-bottom: 8mm;
                        display: inline-block;
                        vertical-align: top;
                        margin-right: 5mm;
                        background: white;
                        page-break-inside: avoid;
                        overflow: hidden;
                    }
                    .header {
                        background: #000;
                        color: #fff;
                        padding: 2mm 3mm;
                        text-align: center;
                    }
                    .company-name {
                        font-size: 8pt;
                        font-weight: bold;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .content {
                        display: flex;
                        padding: 2mm;
                        height: calc(100% - 10mm);
                    }
                    .qr-section {
                        width: 22mm;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-right: 2px solid #000;
                        padding-right: 2mm;
                    }
                    .qr-code {
                        width: 20mm;
                        height: 20mm;
                        image-rendering: pixelated;
                        image-rendering: crisp-edges;
                    }
                    .info-section {
                        flex: 1;
                        padding-left: 2mm;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                    }
                    .customer-name {
                        font-size: 8pt;
                        font-weight: bold;
                        border-bottom: 1px solid #000;
                        padding-bottom: 1mm;
                        margin-bottom: 1mm;
                    }
                    .barcode-no {
                        font-size: 14pt;
                        font-weight: bold;
                        font-family: 'Courier New', monospace;
                        letter-spacing: 1px;
                        margin: 1mm 0;
                    }
                    .tube-info {
                        display: flex;
                        justify-content: space-between;
                        font-size: 9pt;
                        font-weight: bold;
                        border-top: 1px solid #000;
                        padding-top: 1mm;
                        margin-top: 1mm;
                    }
                    @media print {
                        body { padding: 0; margin: 0; }
                        .label { 
                            break-inside: avoid;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                            color-adjust: exact;
                        }
                        .header {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        @page {
                            margin: 0;
                        }
                    }
                </style>
            </head>
            <body>
                ${labelsHtml}
                <script>
                    window.onload = function() { 
                        setTimeout(function() { window.print(); }, 500);
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        displayToast(`${selectedTubes.length} etiket yazdırılıyor...`, 'success');
    };

    return (
        <>
            <div className="card h-100 p-0 radius-12">{/* Header */}
                <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                        <div className="d-flex align-items-center gap-2">
                            <div className="w-40-px h-40-px bg-danger-50 rounded-circle d-flex justify-content-center align-items-center">
                                <Icon icon="mdi:fire-extinguisher" className="text-danger-600 text-xl" />
                            </div>
                            <h6 className="mb-0 fw-semibold">Tüp Listesi</h6>
                        </div>
                        <span className="bg-primary-50 text-primary-600 border border-primary-main px-16 py-4 radius-4 fw-medium text-sm">
                            {filteredTubes.length} kayıt
                        </span>
                    </div>
                    <div className="d-flex flex-wrap gap-8">
                        {selectedTubeIds.length > 0 && (
                            <div className="dropdown">
                                <button
                                    className="btn btn-info text-sm btn-sm px-12 py-10 radius-8 d-flex align-items-center gap-2 dropdown-toggle"
                                    type="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    <Icon icon="heroicons:check-circle" className="text-lg" />
                                    Seçili ({selectedTubeIds.length})
                                </button>
                                <ul className="dropdown-menu">
                                    {selectedTubeIds.length === 1 && (
                                        <li>
                                            <button className="dropdown-item d-flex align-items-center gap-2" onClick={editSelectedTube}>
                                                <Icon icon="heroicons:pencil" className="text-lg text-primary-600" />
                                                Düzenle
                                            </button>
                                        </li>
                                    )}
                                    <li>
                                        <button className="dropdown-item d-flex align-items-center gap-2" onClick={printSelectedLabels}>
                                            <Icon icon="heroicons:printer" className="text-lg text-info-600" />
                                            Etiket Yazdır
                                        </button>
                                    </li>
                                    <li>
                                        <button className="dropdown-item d-flex align-items-center gap-2" onClick={createInspectionReport}>
                                            <Icon icon="heroicons:document-text" className="text-lg text-warning-600" />
                                            Rapor Oluştur
                                        </button>
                                    </li>
                                    <li><hr className="dropdown-divider" /></li>
                                    <li>
                                        <button className="dropdown-item d-flex align-items-center gap-2 text-danger-600" onClick={() => setIsBulkDeleteModalOpen(true)}>
                                            <Icon icon="fluent:delete-24-regular" className="text-lg" />
                                            Sil
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        )}
                        <button
                            className="btn btn-success text-sm btn-sm px-12 py-10 radius-8 d-flex align-items-center gap-2"
                            onClick={openRenewalModal}
                        >
                            <Icon icon="mdi:check-all" className="text-lg" />
                            Dolum Yapıldı
                        </button>
                        
                        {/* Dışa Aktar Dropdown */}
                        <div className="dropdown">
                            <button
                                className="btn btn-outline-neutral-600 text-sm btn-sm px-12 py-10 radius-8 d-flex align-items-center gap-2 dropdown-toggle"
                                type="button"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                            >
                                <Icon icon="heroicons:arrow-down-tray" className="text-lg" />
                                Dışa Aktar
                            </button>
                            <ul className="dropdown-menu">
                                <li>
                                    <button className="dropdown-item d-flex align-items-center gap-2" onClick={exportToCSV}>
                                        <Icon icon="heroicons:document-arrow-down" className="text-lg" />
                                        CSV
                                    </button>
                                </li>
                                <li>
                                    <button className="dropdown-item d-flex align-items-center gap-2" onClick={exportToExcel}>
                                        <Icon icon="mdi:file-excel" className="text-lg text-success-600" />
                                        Excel
                                    </button>
                                </li>
                            </ul>
                        </div>

                        <button
                            className="btn btn-primary text-sm btn-sm px-12 py-10 radius-8 d-flex align-items-center gap-2"
                            onClick={printFilteredLabels}
                        >
                            <Icon icon="heroicons:printer" className="text-lg" />
                            Etiketle
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="card-body border-bottom py-16 px-24">
                    <div className="row g-3 align-items-end">
                        <div className="col-lg-3 col-md-4">
                            <label className="form-label text-sm text-secondary-light mb-8">Arama</label>
                            <form className="navbar-search">
                                <input
                                    type="text"
                                    className="bg-base h-40-px w-100"
                                    name="search"
                                    placeholder="Barkod No veya firma ara..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <Icon icon="ion:search-outline" className="icon" />
                            </form>
                        </div>
                        <div className="col-lg-2 col-md-4">
                            <label className="form-label text-sm text-secondary-light mb-8">Tüp Cinsi</label>
                            <select
                                className="form-select form-select-sm w-100 radius-8 h-40-px"
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                            >
                                <option value="">Tüm Tüp Cinsleri</option>
                                {tubeTypes.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-lg-2 col-md-4">
                            <label className="form-label text-sm text-secondary-light mb-8">Durum</label>
                            <select
                                className="form-select form-select-sm w-100 radius-8 h-40-px"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">Tüm Durumlar</option>
                                <option value="normal">Normal</option>
                                <option value="warning">Süresi Yaklaşan</option>
                                <option value="expired">Süresi Dolmuş</option>
                            </select>
                        </div>
                        <div className="col-lg-2 col-md-4">
                            <label className="form-label text-sm text-secondary-light mb-8">Başlangıç</label>
                            <DatePicker
                                id="fromDate"
                                placeholder="Tarih seçin"
                                value={fromDate}
                                onChange={setFromDate}
                            />
                        </div>
                        <div className="col-lg-2 col-md-4">
                            <label className="form-label text-sm text-secondary-light mb-8">Bitiş</label>
                            <DatePicker
                                id="toDate"
                                placeholder="Tarih seçin"
                                value={toDate}
                                onChange={setToDate}
                            />
                        </div>
                        <div className="col-lg-1 col-md-4">
                            <button
                                className="btn btn-outline-danger-600 w-100 radius-8 h-40-px d-flex align-items-center justify-content-center"
                                onClick={clearFilters}
                                title="Filtreleri Temizle"
                            >
                                <Icon icon="heroicons:x-mark" className="text-xl" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="card-body p-24">
                    <div className="table-responsive scroll-sm" style={{ overflowX: 'auto', transform: 'rotateX(180deg)' }}>
                        <div style={{ transform: 'rotateX(180deg)' }}>
                        <table className="table bordered-table sm-table mb-0">
                            <thead>
                                <tr>
                                    <th scope="col" className="text-center" style={{ width: '50px' }}>
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={filteredTubes.length > 0 && selectedTubeIds.length === filteredTubes.length}
                                            onChange={toggleSelectAll}
                                            title="Tümünü Seç"
                                        />
                                    </th>
                                    <th scope="col">Barkod No</th>
                                    <th scope="col">Firma</th>
                                    <th scope="col">Tüp Cinsi</th>
                                    <th scope="col" className="text-center">Kilo</th>
                                    <th scope="col">Bulunduğu Yer</th>
                                    <th scope="col">Dolum Tarihi</th>
                                    <th scope="col">Son Kullanım</th>
                                    <th scope="col" className="text-center">Kalan</th>
                                    <th scope="col" className="text-center">Durum</th>
                                    <th scope="col" className="text-center">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTubes.length === 0 ? (
                                    <tr>
                                        <td colSpan="11" className="text-center py-32">
                                            <div className="d-flex flex-column align-items-center gap-2">
                                                <div className="w-80-px h-80-px bg-neutral-100 rounded-circle d-flex justify-content-center align-items-center mb-8">
                                                    <Icon icon="mdi:fire-extinguisher" className="text-neutral-500 text-4xl" />
                                                </div>
                                                <h6 className="text-secondary-light mb-0">
                                                    {searchTerm || typeFilter || statusFilter ? 'Sonuç bulunamadı' : 'Henüz tüp kaydı yok'}
                                                </h6>
                                                <p className="text-secondary-light text-sm mb-0">
                                                    {searchTerm || typeFilter || statusFilter ? 'Farklı filtreler deneyin' : 'Yeni tüp eklemek için Tüp Kayıt sayfasını kullanın'}
                                                </p>
                                                {!searchTerm && !typeFilter && !statusFilter && (
                                                    <Link to="/tubes" className="btn btn-primary text-sm btn-sm px-16 py-8 radius-8 mt-12 d-flex align-items-center gap-2">
                                                        <Icon icon="ic:baseline-plus" className="text-lg" />
                                                        Tüp Kaydet
                                                    </Link>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTubes.map((tube) => {
                                        const { status, statusClass, rowClass, remainingDays, isUrgent } = getTubeStatus(tube.son_kullanim_tarihi);
                                        return (
                                            <tr key={tube.id} className={rowClass}>
                                                <td className="text-center">
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input"
                                                        checked={selectedTubeIds.includes(tube.id)}
                                                        onChange={() => toggleTubeSelection(tube.id)}
                                                    />
                                                </td>
                                                <td>
                                                    <span className="fw-semibold font-monospace text-primary-light">{tube.seri_no}</span>
                                                </td>
                                                <td>
                                                    <span 
                                                        className="text-primary-600 fw-medium cursor-pointer" 
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => goToCustomer(tube.customer_id)}
                                                        title="Müşteri detayına git"
                                                    >
                                                        {tube.firma_adi}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="text-md mb-0 fw-normal text-secondary-light">{tube.tup_cinsi}</span>
                                                </td>
                                                <td className="text-center">
                                                    <span className="bg-neutral-100 text-secondary-light px-12 py-4 radius-4 fw-medium text-sm">{tube.kilo} KG</span>
                                                </td>
                                                <td>
                                                    <span className="text-md mb-0 fw-normal text-secondary-light">{tube.location_description || '-'}</span>
                                                </td>
                                                <td>
                                                    <span className="text-md mb-0 fw-normal text-secondary-light">{formatDate(tube.dolum_tarihi)}</span>
                                                </td>
                                                <td>
                                                    <span className="text-md mb-0 fw-normal text-secondary-light">{formatDate(tube.son_kullanim_tarihi)}</span>
                                                </td>
                                                <td className="text-center">
                                                    <span className={isUrgent ? 'fw-semibold text-danger-600' : 'text-secondary-light'}>
                                                        {remainingDays}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <span className={`${statusClass} text-white px-16 py-4 radius-4 fw-medium text-sm`}>
                                                        {status}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <div className="d-flex align-items-center gap-10 justify-content-center">
                                                        {isUrgent && (
                                                            <button
                                                                type="button"
                                                                onClick={() => sendWhatsAppReminder(tube)}
                                                                className="bg-success-focus bg-hover-success-200 text-success-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                                                                title="WhatsApp Hatırlatma"
                                                            >
                                                                <Icon icon="mdi:whatsapp" className="icon text-xl" />
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(tube)}
                                                            className="bg-primary-focus bg-hover-primary-200 text-primary-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                                                            title="Düzenle"
                                                        >
                                                            <Icon icon="heroicons:pencil" className="icon text-xl" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => openDetailModal(tube)}
                                                            className="bg-info-focus bg-hover-info-200 text-info-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                                                            title="QR / Detay"
                                                        >
                                                            <Icon icon="majesticons:eye-line" className="icon text-xl" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => printLabel(tube)}
                                                            className="bg-warning-focus bg-hover-warning-200 text-warning-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                                                            title="Etiket Yazdır"
                                                        >
                                                            <Icon icon="heroicons:printer" className="icon text-xl" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => openDeleteModal(tube)}
                                                            className="remove-item-btn bg-danger-focus bg-hover-danger-200 text-danger-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                                                            title="Sil"
                                                        >
                                                            <Icon icon="fluent:delete-24-regular" className="menu-icon" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toplu Silme Onay Modal */}
            {isBulkDeleteModalOpen && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content radius-16">
                            <div className="modal-header py-16 px-24 border-bottom">
                                <h6 className="modal-title fw-semibold text-danger-600">
                                    <Icon icon="fluent:warning-24-filled" className="me-2" />
                                    Toplu Silme Onayı
                                </h6>
                                <button type="button" className="btn-close" onClick={() => setIsBulkDeleteModalOpen(false)}></button>
                            </div>
                            <div className="modal-body p-24 text-center">
                                <Icon icon="fluent:delete-24-regular" className="text-danger-600 mb-16" style={{ fontSize: '48px' }} />
                                <p className="text-secondary-light mb-0">
                                    <strong>{selectedTubeIds.length}</strong> tüpü silmek istediğinize emin misiniz?
                                </p>
                                <p className="text-warning-600 text-sm mt-8">
                                    Bu işlem geri alınamaz. İlişkili sertifikalar da silinebilir.
                                </p>
                            </div>
                            <div className="modal-footer py-16 px-24 border-top">
                                <button
                                    type="button"
                                    className="btn btn-secondary-600 radius-8"
                                    onClick={() => setIsBulkDeleteModalOpen(false)}
                                >
                                    İptal
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger-600 radius-8"
                                    onClick={handleBulkDelete}
                                >
                                    <Icon icon="fluent:delete-24-regular" className="me-2" />
                                    {selectedTubeIds.length} Tüpü Sil
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Silme Onay Modal */}
            {isDeleteModalOpen && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content radius-16 bg-base">
                            <div className="modal-header py-16 px-24 border-bottom">
                                <h5 className="modal-title fw-semibold text-danger-600">
                                    <Icon icon="heroicons:exclamation-triangle" className="me-2" />
                                    Tüp Sil
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setIsDeleteModalOpen(false)}></button>
                            </div>
                            <div className="modal-body py-24 px-24">
                                <p className="text-secondary-light mb-0">
                                    <strong>"{selectedTube?.seri_no}"</strong> seri numaralı tüpü silmek istediğinize emin misiniz?
                                </p>
                                <p className="text-danger-600 text-sm mt-12 mb-0">
                                    <Icon icon="heroicons:exclamation-circle" className="me-1" />
                                    Bu işlem geri alınamaz.
                                </p>
                            </div>
                            <div className="modal-footer py-16 px-24 border-top">
                                <button type="button" className="btn btn-secondary radius-8" onClick={() => setIsDeleteModalOpen(false)}>
                                    İptal
                                </button>
                                <button type="button" className="btn btn-danger radius-8" onClick={handleDelete}>
                                    <Icon icon="fluent:delete-24-regular" className="me-1" />
                                    Sil
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Düzenleme Modal */}
            {isEditModalOpen && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content radius-16 bg-base">
                            <div className="modal-header py-16 px-24 border-bottom">
                                <h5 className="modal-title fw-semibold text-primary-light">
                                    <Icon icon="heroicons:pencil" className="me-2" />
                                    Tüp Bilgilerini Düzenle
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setIsEditModalOpen(false)}></button>
                            </div>
                            <div className="modal-body p-24">
                                <div className="row g-3">
                                    {/* Müşteri */}
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-primary-light">Müşteri</label>
                                        <select
                                            name="customer_id"
                                            className="form-select radius-8"
                                            value={editFormData.customer_id}
                                            onChange={handleEditInputChange}
                                        >
                                            <option value="">Seçiniz...</option>
                                            {customers.map(customer => (
                                                <option key={customer.id} value={customer.id}>
                                                    {customer.firma_adi}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {/* Tüp Cinsi */}
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-primary-light">Tüp Cinsi</label>
                                        <select
                                            name="tup_cinsi"
                                            className="form-select radius-8"
                                            value={editFormData.tup_cinsi}
                                            onChange={handleEditInputChange}
                                        >
                                            <option value="">Seçiniz...</option>
                                            {tubeTypes.map(type => (
                                                <option key={type.value} value={type.value}>
                                                    {type.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {/* Kilo */}
                                    <div className="col-md-4">
                                        <label className="form-label fw-semibold text-primary-light">Kilo (KG)</label>
                                        <input
                                            type="number"
                                            name="kilo"
                                            className="form-control radius-8"
                                            value={editFormData.kilo}
                                            onChange={handleEditInputChange}
                                            step="0.5"
                                            min="0"
                                        />
                                    </div>
                                    
                                    {/* Dolum Tarihi */}
                                    <div className="col-md-4">
                                        <label className="form-label fw-semibold text-primary-light">Dolum Tarihi</label>
                                        <input
                                            type="date"
                                            name="dolum_tarihi"
                                            className="form-control radius-8"
                                            value={editFormData.dolum_tarihi}
                                            onChange={handleEditInputChange}
                                        />
                                    </div>
                                    
                                    {/* Son Kullanım Tarihi */}
                                    <div className="col-md-4">
                                        <label className="form-label fw-semibold text-primary-light">Son Kullanım Tarihi</label>
                                        <input
                                            type="date"
                                            name="son_kullanim_tarihi"
                                            className="form-control radius-8"
                                            value={editFormData.son_kullanim_tarihi}
                                            onChange={handleEditInputChange}
                                        />
                                    </div>
                                    
                                    {/* Bulunduğu Yer */}
                                    <div className="col-12">
                                        <label className="form-label fw-semibold text-primary-light">Bulunduğu Yer</label>
                                        <input
                                            type="text"
                                            name="location_description"
                                            className="form-control radius-8"
                                            value={editFormData.location_description}
                                            onChange={handleEditInputChange}
                                            placeholder="Örn: A Blok 2. Kat Merdiven Yanı"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer py-16 px-24 border-top">
                                <button
                                    type="button"
                                    className="btn btn-secondary-600 radius-8"
                                    onClick={() => setIsEditModalOpen(false)}
                                >
                                    İptal
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary-600 radius-8"
                                    onClick={handleEditSave}
                                >
                                    <Icon icon="heroicons:check" className="me-2" />
                                    Kaydet
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detay Modal */}
            {isDetailModalOpen && selectedTube && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content radius-16 bg-base">
                            <div className="modal-header py-16 px-24 border-bottom">
                                <h5 className="modal-title fw-semibold text-primary-light">
                                    <Icon icon="heroicons:qr-code" className="me-2" />
                                    {selectedTube.seri_no}
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setIsDetailModalOpen(false)}></button>
                            </div>
                            <div className="modal-body py-24 px-24">
                                <div className="text-center mb-16">
                                    <div className="bg-neutral-100 p-24 radius-8 d-inline-block">
                                        <img 
                                            src={generateQRDataUrl(selectedTube)} 
                                            alt="QR Code" 
                                            style={{ width: '150px', height: '150px' }}
                                        />
                                    </div>
                                    <p className="text-secondary-light text-sm mt-8 mb-0">
                                        Bu QR kodu tarayarak tüp bilgilerine ulaşabilirsiniz
                                    </p>
                                </div>
                                <div className="d-flex flex-column gap-12">
                                    <div className="d-flex justify-content-between">
                                        <span className="text-secondary-light">Firma</span>
                                        <span 
                                            className="fw-semibold text-primary-600" 
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => { setIsDetailModalOpen(false); goToCustomer(selectedTube.customer_id); }}
                                        >
                                            {selectedTube.firma_adi}
                                        </span>
                                    </div>
                                    <div className="d-flex justify-content-between">
                                        <span className="text-secondary-light">Tüp Cinsi</span>
                                        <span className="fw-semibold">{selectedTube.tup_cinsi}</span>
                                    </div>
                                    <div className="d-flex justify-content-between">
                                        <span className="text-secondary-light">Kilo</span>
                                        <span className="fw-semibold">{selectedTube.kilo} KG</span>
                                    </div>
                                    <div className="d-flex justify-content-between">
                                        <span className="text-secondary-light">Dolum Tarihi</span>
                                        <span className="fw-semibold">{formatDate(selectedTube.dolum_tarihi)}</span>
                                    </div>
                                    <div className="d-flex justify-content-between">
                                        <span className="text-secondary-light">Son Kullanım</span>
                                        <span className="fw-semibold">{formatDate(selectedTube.son_kullanim_tarihi)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer py-16 px-24 border-top">
                                <button type="button" className="btn btn-outline-primary radius-8" onClick={() => printLabel(selectedTube)}>
                                    <Icon icon="heroicons:printer" className="me-1" />
                                    Etiket Yazdır
                                </button>
                                <button type="button" className="btn btn-secondary radius-8" onClick={() => setIsDetailModalOpen(false)}>
                                    Kapat
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toplu Yenileme Modal */}
            {isRenewalModalOpen && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content radius-16 bg-base">
                            <div className="modal-header py-16 px-24 border-bottom">
                                <h5 className="modal-title fw-semibold text-primary-light">
                                    <Icon icon="mdi:check-all" className="me-2 text-success-600" />
                                    Toplu Dolum İşlemi
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setIsRenewalModalOpen(false)}></button>
                            </div>
                            <div className="modal-body py-24 px-24">
                                <div className="row g-3 mb-20">
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-primary-light text-sm mb-8">
                                            Müşteri Seçin <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            className="form-control radius-8"
                                            value={renewalCustomerId}
                                            onChange={(e) => loadCustomerTubesForRenewal(e.target.value)}
                                        >
                                            <option value="">Müşteri Seçin</option>
                                            {customers.map(c => (
                                                <option key={c.id} value={c.id}>{c.firma_adi}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-primary-light text-sm mb-8">
                                            Dolum Tarihi
                                        </label>
                                        <DatePicker
                                            id="renewalDate"
                                            placeholder="Tarih seçin"
                                            value={renewalDate}
                                            onChange={setRenewalDate}
                                            className="form-control radius-8 bg-base pe-40"
                                        />
                                    </div>
                                </div>

                                {renewalTubes.length > 0 && (
                                    <>
                                        <div className="d-flex justify-content-between align-items-center mb-12">
                                            <span className="text-secondary-light">
                                                {selectedRenewalTubes.length} / {renewalTubes.length} tüp seçildi
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-outline-primary btn-sm radius-8"
                                                onClick={selectAllRenewalTubes}
                                            >
                                                {selectedRenewalTubes.length === renewalTubes.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                                            </button>
                                        </div>
                                        <div className="d-flex flex-column gap-8" style={{ maxHeight: '300px', overflow: 'auto' }}>
                                            {renewalTubes.map(tube => {
                                                const { status, statusClass } = getTubeStatus(tube.son_kullanim_tarihi);
                                                const isSelected = selectedRenewalTubes.includes(tube.id);
                                                return (
                                                    <div
                                                        key={tube.id}
                                                        className={`d-flex align-items-center justify-content-between p-12 radius-8 cursor-pointer ${isSelected ? 'bg-primary-50 border border-primary-600' : 'bg-neutral-50'}`}
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => toggleRenewalTube(tube.id)}
                                                    >
                                                        <div className="d-flex align-items-center gap-12">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => {}}
                                                                className="form-check-input"
                                                            />
                                                            <div>
                                                                <span className="fw-semibold d-block">{tube.seri_no}</span>
                                                                <span className="text-sm text-secondary-light">{tube.tup_cinsi} - {tube.kilo} KG</span>
                                                            </div>
                                                        </div>
                                                        <span className={`badge ${statusClass} text-white px-12 py-6 radius-4`}>
                                                            {status}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}

                                {renewalCustomerId && renewalTubes.length === 0 && (
                                    <div className="text-center py-32">
                                        <Icon icon="mdi:fire-extinguisher" className="text-secondary-light text-4xl mb-8" />
                                        <p className="text-secondary-light mb-0">Bu müşteriye ait tüp bulunamadı.</p>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer py-16 px-24 border-top">
                                <button type="button" className="btn btn-secondary radius-8" onClick={() => setIsRenewalModalOpen(false)}>
                                    İptal
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-success-600 radius-8"
                                    onClick={executeBulkRenewal}
                                    disabled={selectedRenewalTubes.length === 0}
                                >
                                    <Icon icon="mdi:check-all" className="me-1" />
                                    {selectedRenewalTubes.length} Tüp Dolum Yapıldı
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {showToast && (
                <div 
                    className="position-fixed bottom-0 end-0 p-3"
                    style={{ zIndex: 9999 }}
                >
                    <div className={`toast show ${toastType === 'success' ? 'bg-success-600' : toastType === 'warning' ? 'bg-warning-600' : 'bg-danger-600'} text-white radius-8`}>
                        <div className="toast-body d-flex align-items-center gap-12 px-16 py-12">
                            <Icon 
                                icon={toastType === 'success' ? 'heroicons:check-circle' : toastType === 'warning' ? 'heroicons:exclamation-triangle' : 'heroicons:x-circle'} 
                                className="text-xl" 
                            />
                            <span>{toastMessage}</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TubeListLayer;
