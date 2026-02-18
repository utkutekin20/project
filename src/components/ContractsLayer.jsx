import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { useSearchParams } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { Turkish } from 'flatpickr/dist/l10n/tr.js';

// Default sözleşme şablonu
const getDefaultContractTemplate = (data) => {
    const today = new Date().toLocaleDateString('tr-TR');
    // Boş string kontrolü - '' de falsy değer ama || ile yakalanmıyor düzgün
    const companyName = data.settings?.company_name && data.settings.company_name !== 'Firma Adınız' ? data.settings.company_name : '[FİRMA ADI]';
    const companyAddress = data.settings?.address?.trim() || '[FİRMA ADRESİ]';
    const companyPhone = data.settings?.phone?.trim() || '[FİRMA TELEFON]';
    const companyEmail = data.settings?.email?.trim() || '';
    const taxOffice = data.settings?.tax_office?.trim() || '[VERGİ DAİRESİ]';
    const taxNumber = data.settings?.tax_number?.trim() || '[VERGİ NO]';
    const customerName = data.quote?.firma_adi || '[MÜŞTERİ ADI]';
    const customerAddress = data.quote?.adres || '[MÜŞTERİ ADRESİ]';
    const customerPhone = data.quote?.telefon || '[MÜŞTERİ TELEFON]';
    const customerEmail = data.quote?.email || '';
    const totalAmount = data.quote?.toplam_tutar?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '0,00';
    
    // Kalem listesi oluştur
    let itemsList = '';
    if (data.items && data.items.length > 0) {
        itemsList = '<ul>';
        data.items.forEach(item => {
            itemsList += `<li>${item.tup_cinsi} ${item.kilo} KG - ${item.adet} Adet</li>`;
        });
        itemsList += '</ul>';
    }

    return `
<h3 style="text-align: center;">YANGIN SÖNDÜRME CİHAZLARI BAKIM VE DOLUM HİZMET SÖZLEŞMESİ</h3>

<p><strong>MADDE 1 - TARAFLAR</strong></p>

<p>Bir tarafta;</p>
<p><strong>${companyName}</strong><br>
Adres: ${companyAddress}<br>
Telefon: ${companyPhone}${companyEmail ? '<br>E-posta: ' + companyEmail : ''}<br>
Vergi Dairesi / No: ${taxOffice} / ${taxNumber}<br>
(Bundan sonra "HİZMET VEREN" olarak anılacaktır)</p>

<p>Diğer tarafta;</p>
<p><strong>${customerName}</strong><br>
Adres: ${customerAddress}<br>
Telefon: ${customerPhone}${customerEmail ? '<br>E-posta: ' + customerEmail : ''}<br>
(Bundan sonra "HİZMET ALAN" olarak anılacaktır)</p>

<p>arasında aşağıdaki şartlarla işbu sözleşme akdedilmiştir.</p>

<p><strong>MADDE 2 - SÖZLEŞMENİN KONUSU</strong></p>

<p>İşbu sözleşme, HİZMET ALAN'a ait yangın söndürme cihazlarının periyodik bakım, kontrol, dolum ve değişim hizmetlerinin HİZMET VEREN tarafından yerine getirilmesine ilişkin şart ve koşulları düzenler.</p>

<p><strong>MADDE 3 - HİZMET KAPSAMI</strong></p>

<p>Sözleşme kapsamında aşağıdaki hizmetler sunulacaktır:</p>
${itemsList || '<ul><li>Yangın söndürme cihazlarının periyodik bakımı</li><li>Dolum ve test işlemleri</li><li>TSE standartlarına uygun sertifikalandırma</li></ul>'}

<p><strong>MADDE 4 - SÜRE</strong></p>

<p>İşbu sözleşme imza tarihinden itibaren 1 (bir) yıl süreyle geçerlidir. Taraflardan biri, sözleşme bitiminden en az 30 (otuz) gün önce yazılı bildirimde bulunmadığı takdirde, sözleşme aynı şartlarla 1 (bir) yıl daha uzar.</p>

<p><strong>MADDE 5 - ÜCRET VE ÖDEME</strong></p>

<p>Sözleşme kapsamındaki hizmetlerin toplam bedeli <strong>₺${totalAmount}</strong> (KDV dahil) olup, fatura tarihinden itibaren 30 (otuz) gün içinde HİZMET VEREN'in banka hesabına ödenecektir.</p>

<p><strong>MADDE 6 - HİZMET VEREN'İN YÜKÜMLÜLÜKLERİ</strong></p>

<ol>
<li>Yangın söndürme cihazlarının bakım ve dolum işlemlerini TSE ve ilgili mevzuata uygun şekilde yapmak</li>
<li>Bakım sonrası gerekli sertifika ve etiketleri düzenlemek</li>
<li>Cihazların sonraki bakım tarihlerini HİZMET ALAN'a bildirmek</li>
<li>Arızalı veya kullanılamaz durumdaki cihazları tespit ederek HİZMET ALAN'ı bilgilendirmek</li>
<li>Hizmet sırasında iş güvenliği kurallarına uymak</li>
</ol>

<p><strong>MADDE 7 - HİZMET ALAN'IN YÜKÜMLÜLÜKLERİ</strong></p>

<ol>
<li>Cihazların HİZMET VEREN'e teslimini veya HİZMET VEREN personelinin sahaya erişimini sağlamak</li>
<li>Sözleşme bedelini zamanında ödemek</li>
<li>Cihazların bakım ve dolum geçmişine ilişkin mevcut belgeleri sunmak</li>
<li>Cihazlarda meydana gelen hasarları derhal bildirmek</li>
</ol>

<p><strong>MADDE 8 - GARANTİ</strong></p>

<p>HİZMET VEREN, yapmış olduğu bakım ve dolum işlemlerini 1 (bir) yıl süreyle garanti eder. Bu süre içinde imalat hatası veya işçilik hatasından kaynaklanan sorunlar ücretsiz olarak giderilir. Garanti, kullanım hatası, kaza veya doğal afet sonucu oluşan hasarları kapsamaz.</p>

<p><strong>MADDE 9 - MÜCBİR SEBEPLER</strong></p>

<p>Tarafların kontrolü dışında gelişen, önceden öngörülemeyen ve önlenemeyen olaylar (doğal afet, savaş, grev, salgın hastalık vb.) mücbir sebep sayılır. Mücbir sebep durumunda taraflar yükümlülüklerinden sorumlu tutulamaz.</p>

<p><strong>MADDE 10 - GİZLİLİK</strong></p>

<p>Taraflar, sözleşme kapsamında öğrendikleri ticari ve teknik bilgileri gizli tutacak, üçüncü şahıslarla paylaşmayacaktır.</p>

<p><strong>MADDE 11 - FESİH</strong></p>

<p>Taraflardan birinin sözleşme yükümlülüklerini yerine getirmemesi halinde, diğer taraf 15 (on beş) gün süreli yazılı ihtar çeker. İhtar süresinde yükümlülüğün yerine getirilmemesi halinde sözleşme feshedilebilir.</p>

<p><strong>MADDE 12 - UYUŞMAZLIK</strong></p>

<p>İşbu sözleşmeden doğabilecek uyuşmazlıklarda Türkiye Cumhuriyeti kanunları uygulanır ve ${data.settings?.address?.split(',').pop()?.trim() || 'İstanbul'} Mahkemeleri ve İcra Daireleri yetkilidir.</p>

<p><strong>MADDE 13 - YÜRÜRLÜK</strong></p>

<p>13 (on üç) maddeden ibaret işbu sözleşme, ${today} tarihinde 2 (iki) nüsha olarak imzalanmış olup, taraflar birer nüsha almıştır.</p>
    `.trim();
};

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
                className={className || "form-control radius-8 bg-base"}
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

// Quill editor modülleri
const quillModules = {
    toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['clean']
    ]
};

const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'indent',
    'align'
];

const ContractsLayer = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('list'); // list, create, edit

    // Form state'leri
    const [editingContract, setEditingContract] = useState(null);
    const [contractHtml, setContractHtml] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [quoteData, setQuoteData] = useState(null);

    // Modal state'leri
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState(null);

    // Toast state
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');

    const displayToast = (message, type = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    // Verileri yükle
    useEffect(() => {
        fetchContracts();

        // URL'den quoteId kontrolü
        const quoteId = searchParams.get('quoteId');
        if (quoteId) {
            loadQuoteForContract(quoteId);
        }
    }, []);

    const fetchContracts = async () => {
        try {
            setLoading(true);
            if (window.api) {
                const result = await window.api.contract.list();
                if (result.success) {
                    setContracts(result.data);
                }
            }
        } catch (error) {
            console.error('Sözleşme listesi hatası:', error);
        } finally {
            setLoading(false);
        }
    };

    // Tekliften sözleşme oluşturmak için veri yükle
    const loadQuoteForContract = async (quoteId) => {
        try {
            if (window.api) {
                const result = await window.api.contract.getQuoteForContract(quoteId);
                if (result.success) {
                    setQuoteData(result.data);

                    // Default şablonu doldur
                    const template = getDefaultContractTemplate(result.data);
                    setContractHtml(template);

                    // Tarihleri ayarla
                    const today = new Date();
                    const oneYearLater = new Date();
                    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

                    setStartDate(today.toISOString().split('T')[0]);
                    setEndDate(oneYearLater.toISOString().split('T')[0]);

                    setActiveTab('create');
                } else {
                    displayToast('Teklif bilgisi alınamadı', 'danger');
                }
            }
        } catch (error) {
            console.error('Teklif yükleme hatası:', error);
            displayToast('Teklif yüklenirken hata oluştu', 'danger');
        }
    };

    // Sözleşme kaydet
    const handleSave = async () => {
        if (!quoteData && !editingContract) {
            displayToast('Teklif bilgisi bulunamadı', 'warning');
            return;
        }

        if (!startDate || !endDate) {
            displayToast('Başlangıç ve bitiş tarihi zorunludur', 'warning');
            return;
        }

        try {
            if (editingContract) {
                // Güncelleme
                const result = await window.api.contract.update(editingContract.id, {
                    contract_html: contractHtml,
                    start_date: startDate,
                    end_date: endDate,
                    total_amount: editingContract.total_amount,
                    status: editingContract.status
                });

                if (result.success) {
                    displayToast('Sözleşme güncellendi', 'success');
                    resetForm();
                    fetchContracts();
                } else {
                    displayToast('Güncelleme başarısız: ' + result.error, 'danger');
                }
            } else {
                // Yeni oluştur
                const result = await window.api.contract.create({
                    quote_id: quoteData.quote.id,
                    customer_id: quoteData.quote.customer_id,
                    contract_html: contractHtml,
                    start_date: startDate,
                    end_date: endDate,
                    total_amount: quoteData.quote.toplam_tutar || 0,
                    status: 'Taslak'
                });

                if (result.success) {
                    displayToast(`${result.data.contract_no} numaralı sözleşme oluşturuldu`, 'success');
                    resetForm();
                    fetchContracts();
                    // URL'den quoteId'yi temizle
                    setSearchParams({});
                } else {
                    displayToast('Oluşturma başarısız: ' + result.error, 'danger');
                }
            }
        } catch (error) {
            console.error('Kaydetme hatası:', error);
            displayToast('Kaydetme sırasında hata oluştu', 'danger');
        }
    };

    // Düzenleme moduna geç
    const editContract = async (contract) => {
        try {
            const result = await window.api.contract.get(contract.id);
            if (result.success) {
                setEditingContract(result.data);
                setContractHtml(result.data.contract_html || '');
                setStartDate(result.data.start_date);
                setEndDate(result.data.end_date);
                setActiveTab('edit');
            }
        } catch (error) {
            console.error('Düzenleme hatası:', error);
        }
    };

    // Form sıfırla
    const resetForm = () => {
        setEditingContract(null);
        setContractHtml('');
        setStartDate('');
        setEndDate('');
        setQuoteData(null);
        setActiveTab('list');
    };

    // Sözleşme sil
    const handleDelete = async () => {
        try {
            const result = await window.api.contract.delete(selectedContract.id);
            if (result.success) {
                displayToast('Sözleşme silindi', 'success');
                fetchContracts();
            } else {
                displayToast('Silme başarısız', 'danger');
            }
        } catch (error) {
            console.error('Silme hatası:', error);
        }
        setIsDeleteModalOpen(false);
    };

    // PDF indir
    const downloadPDF = async (contract) => {
        try {
            const fullContract = await window.api.contract.get(contract.id);
            if (fullContract.success) {
                const result = await window.api.contract.downloadPDF(fullContract.data);
                if (result.success) {
                    displayToast('PDF kaydedildi', 'success');
                } else {
                    displayToast(result.error || 'PDF oluşturulamadı', 'danger');
                }
            }
        } catch (error) {
            console.error('PDF hatası:', error);
            displayToast('PDF oluşturulurken hata', 'danger');
        }
    };

    // Durum güncelle
    const updateStatus = async (contract, newStatus) => {
        try {
            const result = await window.api.contract.updateStatus({
                id: contract.id,
                status: newStatus
            });
            if (result.success) {
                displayToast(`Durum "${newStatus}" olarak güncellendi`, 'success');
                fetchContracts();
            }
        } catch (error) {
            console.error('Durum güncelleme hatası:', error);
        }
    };

    // Tarih formatla
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('tr-TR');
    };

    // Durum badge rengi
    const getStatusBadge = (status) => {
        const statusMap = {
            'Taslak': 'bg-secondary-600',
            'Gönderildi': 'bg-info-600',
            'İmzalandı': 'bg-success-600',
            'İptal Edildi': 'bg-danger-600'
        };
        return statusMap[status] || 'bg-secondary-600';
    };

    // İstatistikler
    const stats = {
        total: contracts.length,
        draft: contracts.filter(c => c.status === 'Taslak').length,
        signed: contracts.filter(c => c.status === 'İmzalandı').length,
        expiring: contracts.filter(c => {
            const endDate = new Date(c.end_date);
            const today = new Date();
            const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
            return diffDays <= 30 && diffDays > 0 && c.status !== 'İptal Edildi';
        }).length
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center py-80">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                </div>
            </div>
        );
    }

    // Sözleşme oluşturma/düzenleme formu
    if (activeTab === 'create' || activeTab === 'edit') {
        return (
            <div className="row gy-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header d-flex align-items-center justify-content-between">
                            <h5 className="card-title mb-0">
                                <Icon icon="heroicons:document-text" className="me-2" />
                                {activeTab === 'edit' ? 'Sözleşme Düzenle' : 'Yeni Sözleşme Oluştur'}
                            </h5>
                            <button
                                className="btn btn-outline-secondary radius-8"
                                onClick={resetForm}
                            >
                                <Icon icon="heroicons:arrow-left" className="me-1" />
                                Geri
                            </button>
                        </div>
                        <div className="card-body">
                            {/* Bilgi Kartı */}
                            {(quoteData || editingContract) && (
                                <div className="bg-primary-50 p-16 radius-8 mb-20">
                                    <div className="row">
                                        <div className="col-md-4">
                                            <p className="text-sm text-secondary-light mb-4">Müşteri</p>
                                            <p className="fw-semibold">{quoteData?.quote?.firma_adi || editingContract?.firma_adi}</p>
                                        </div>
                                        <div className="col-md-4">
                                            <p className="text-sm text-secondary-light mb-4">Bağlı Teklif</p>
                                            <p className="fw-semibold">{quoteData?.quote?.teklif_no || editingContract?.teklif_no}</p>
                                        </div>
                                        <div className="col-md-4">
                                            <p className="text-sm text-secondary-light mb-4">Toplam Tutar</p>
                                            <p className="fw-semibold text-success-600">
                                                ₺{(quoteData?.quote?.toplam_tutar || editingContract?.total_amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tarih Seçiciler */}
                            <div className="row g-3 mb-20">
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">
                                        Başlangıç Tarihi <span className="text-danger">*</span>
                                    </label>
                                    <DatePicker
                                        id="startDate"
                                        placeholder="Başlangıç tarihi seçin"
                                        value={startDate}
                                        onChange={setStartDate}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">
                                        Bitiş Tarihi <span className="text-danger">*</span>
                                    </label>
                                    <DatePicker
                                        id="endDate"
                                        placeholder="Bitiş tarihi seçin"
                                        value={endDate}
                                        onChange={setEndDate}
                                    />
                                </div>
                            </div>

                            {/* Editor */}
                            <div style={{ marginBottom: '20px' }}>
                                <label className="form-label fw-semibold">Sözleşme Metni</label>
                                <div style={{ height: '400px', border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden' }}>
                                    <ReactQuill
                                        theme="snow"
                                        value={contractHtml}
                                        onChange={setContractHtml}
                                        modules={quillModules}
                                        formats={quillFormats}
                                        style={{ height: '355px' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Kaydet Butonu - Card dışında */}
                <div className="col-12">
                    <div className="d-flex justify-content-end gap-2">
                        <button
                            className="btn btn-outline-secondary radius-8 px-20"
                            onClick={resetForm}
                        >
                            İptal
                        </button>
                        <button
                            className="btn btn-primary radius-8 px-20"
                            onClick={handleSave}
                        >
                            <Icon icon="heroicons:check" className="me-1" />
                            {activeTab === 'edit' ? 'Güncelle' : 'Sözleşme Oluştur'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Liste görünümü
    return (
        <div className="row gy-4">
            {/* İstatistik Kartları */}
            <div className="col-lg-3 col-sm-6">
                <div className="card p-20 radius-12">
                    <div className="d-flex align-items-center gap-16">
                        <div className="w-56-px h-56-px bg-primary-100 text-primary-600 d-flex justify-content-center align-items-center radius-12 flex-shrink-0">
                            <Icon icon="heroicons:document-text" className="text-2xl" />
                        </div>
                        <div>
                            <span className="text-secondary-light text-sm">Toplam Sözleşme</span>
                            <h4 className="fw-semibold mb-0">{stats.total}</h4>
                        </div>
                    </div>
                </div>
            </div>
            <div className="col-lg-3 col-sm-6">
                <div className="card p-20 radius-12">
                    <div className="d-flex align-items-center gap-16">
                        <div className="w-56-px h-56-px bg-warning-100 text-warning-600 d-flex justify-content-center align-items-center radius-12 flex-shrink-0">
                            <Icon icon="heroicons:pencil" className="text-2xl" />
                        </div>
                        <div>
                            <span className="text-secondary-light text-sm">Taslak</span>
                            <h4 className="fw-semibold mb-0">{stats.draft}</h4>
                        </div>
                    </div>
                </div>
            </div>
            <div className="col-lg-3 col-sm-6">
                <div className="card p-20 radius-12">
                    <div className="d-flex align-items-center gap-16">
                        <div className="w-56-px h-56-px bg-success-100 text-success-600 d-flex justify-content-center align-items-center radius-12 flex-shrink-0">
                            <Icon icon="heroicons:check-badge" className="text-2xl" />
                        </div>
                        <div>
                            <span className="text-secondary-light text-sm">İmzalandı</span>
                            <h4 className="fw-semibold mb-0">{stats.signed}</h4>
                        </div>
                    </div>
                </div>
            </div>
            <div className="col-lg-3 col-sm-6">
                <div className="card p-20 radius-12">
                    <div className="d-flex align-items-center gap-16">
                        <div className="w-56-px h-56-px bg-danger-100 text-danger-600 d-flex justify-content-center align-items-center radius-12 flex-shrink-0">
                            <Icon icon="heroicons:clock" className="text-2xl" />
                        </div>
                        <div>
                            <span className="text-secondary-light text-sm">Süresi Yaklaşan</span>
                            <h4 className="fw-semibold mb-0">{stats.expiring}</h4>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sözleşme Listesi */}
            <div className="col-12">
                <div className="card">
                    <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-3">
                        <h5 className="card-title mb-0">
                            <Icon icon="heroicons:document-duplicate" className="me-2" />
                            Sözleşmeler
                        </h5>
                    </div>
                    <div className="card-body">
                        {contracts.length === 0 ? (
                            <div className="text-center py-40">
                                <Icon icon="heroicons:document-text" className="text-secondary-light text-5xl mb-12" />
                                <h6 className="text-primary-light">Henüz sözleşme yok</h6>
                                <p className="text-secondary-light">
                                    Teklifler sayfasından "Sözleşme Oluştur" butonunu kullanarak yeni sözleşme ekleyebilirsiniz.
                                </p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table bordered-table mb-0">
                                    <thead>
                                        <tr>
                                            <th>Sözleşme No</th>
                                            <th>Müşteri</th>
                                            <th>Bağlı Teklif</th>
                                            <th>Başlangıç</th>
                                            <th>Bitiş</th>
                                            <th>Tutar</th>
                                            <th className="text-center">Durum</th>
                                            <th className="text-center">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {contracts.map((contract) => {
                                            // Süre hesapla
                                            const endDate = new Date(contract.end_date);
                                            const today = new Date();
                                            const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                                            const isExpiring = diffDays <= 30 && diffDays > 0;
                                            const isExpired = diffDays <= 0;

                                            return (
                                                <tr key={contract.id} className={isExpired ? 'bg-danger-50' : isExpiring ? 'bg-warning-50' : ''}>
                                                    <td>
                                                        <span className="fw-semibold font-monospace">{contract.contract_no}</span>
                                                    </td>
                                                    <td>
                                                        <div>
                                                            <span className="fw-medium">{contract.firma_adi}</span>
                                                            {contract.yetkili && (
                                                                <span className="d-block text-sm text-secondary-light">{contract.yetkili}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="text-primary-600">{contract.teklif_no}</span>
                                                    </td>
                                                    <td>{formatDate(contract.start_date)}</td>
                                                    <td>
                                                        <span className={isExpired ? 'text-danger-600 fw-semibold' : isExpiring ? 'text-warning-600 fw-semibold' : ''}>
                                                            {formatDate(contract.end_date)}
                                                        </span>
                                                        {isExpiring && !isExpired && (
                                                            <span className="d-block text-xs text-warning-600">{diffDays} gün kaldı</span>
                                                        )}
                                                        {isExpired && (
                                                            <span className="d-block text-xs text-danger-600">Süresi doldu</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className="fw-medium">
                                                            ₺{(contract.total_amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <span className={`badge ${getStatusBadge(contract.status)} text-white px-12 py-6 radius-4`}>
                                                            {contract.status}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="d-flex align-items-center gap-8 justify-content-center">
                                                            {/* PDF */}
                                                            <button
                                                                type="button"
                                                                onClick={() => downloadPDF(contract)}
                                                                className="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center"
                                                                title="PDF İndir"
                                                            >
                                                                <Icon icon="heroicons:document-arrow-down" />
                                                            </button>
                                                            {/* Düzenle */}
                                                            <button
                                                                type="button"
                                                                onClick={() => editContract(contract)}
                                                                className="w-32-px h-32-px bg-info-focus text-info-main rounded-circle d-inline-flex align-items-center justify-content-center"
                                                                title="Düzenle"
                                                            >
                                                                <Icon icon="heroicons:pencil-square" />
                                                            </button>
                                                            {/* Durum */}
                                                            {contract.status === 'Taslak' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateStatus(contract, 'Gönderildi')}
                                                                    className="w-32-px h-32-px bg-primary-focus text-primary-main rounded-circle d-inline-flex align-items-center justify-content-center"
                                                                    title="Gönderildi Olarak İşaretle"
                                                                >
                                                                    <Icon icon="heroicons:paper-airplane" />
                                                                </button>
                                                            )}
                                                            {contract.status === 'Gönderildi' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateStatus(contract, 'İmzalandı')}
                                                                    className="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center"
                                                                    title="İmzalandı Olarak İşaretle"
                                                                >
                                                                    <Icon icon="heroicons:check" />
                                                                </button>
                                                            )}
                                                            {/* Sil */}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedContract(contract);
                                                                    setIsDeleteModalOpen(true);
                                                                }}
                                                                className="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center"
                                                                title="Sil"
                                                            >
                                                                <Icon icon="heroicons:trash" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Silme Modal */}
            {isDeleteModalOpen && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content radius-16 bg-base">
                            <div className="modal-header py-16 px-24 border-bottom">
                                <h5 className="modal-title fw-semibold text-danger-600">
                                    <Icon icon="heroicons:exclamation-triangle" className="me-2" />
                                    Sözleşme Sil
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setIsDeleteModalOpen(false)}></button>
                            </div>
                            <div className="modal-body py-24 px-24">
                                <p className="text-secondary-light mb-0">
                                    <strong>"{selectedContract?.contract_no}"</strong> numaralı sözleşmeyi silmek istediğinize emin misiniz?
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
                                    <Icon icon="heroicons:trash" className="me-1" />
                                    Sil
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {showToast && (
                <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 9999 }}>
                    <div className={`toast show ${toastType === 'success' ? 'bg-success-600' : toastType === 'warning' ? 'bg-warning-600' : 'bg-danger-600'} text-white radius-8`}>
                        <div className="toast-body d-flex align-items-center gap-12 px-16 py-12">
                            <Icon icon={toastType === 'success' ? 'heroicons:check-circle' : 'heroicons:exclamation-circle'} className="text-xl" />
                            <span>{toastMessage}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContractsLayer;
