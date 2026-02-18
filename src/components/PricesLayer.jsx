import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

// Toast Component
const Toast = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor = type === 'success' ? 'bg-success-600' : type === 'error' ? 'bg-danger-600' : 'bg-info-600';

    return (
        <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 9999 }}>
            <div className={`toast show ${bgColor} text-white radius-8 shadow-lg`}>
                <div className="toast-body d-flex align-items-center gap-12 px-16 py-12">
                    <Icon icon={type === 'success' ? 'heroicons:check-circle' : type === 'error' ? 'heroicons:x-circle' : 'heroicons:information-circle'} className="text-xl" />
                    <span style={{ whiteSpace: 'pre-line' }}>{message}</span>
                </div>
            </div>
        </div>
    );
};

// Kategori sekmeleri
const categories = [
    { id: 'Yangın Tüpü', label: 'Yangın Tüpü', icon: 'heroicons:fire' },
    { id: 'Yangın İhbar Sistemleri', label: 'Yangın İhbar Sistemleri', icon: 'heroicons:bell-alert' },
    { id: 'Otomatik Söndürme Sistemleri', label: 'Otomatik Söndürme Sistemleri', icon: 'heroicons:cog-6-tooth' },
    { id: 'Yangın Hidrant Sistemleri', label: 'Yangın Hidrant Sistemleri', icon: 'heroicons:wrench-screwdriver' },
    { id: 'Yangın Kapısı', label: 'Yangın Kapısı', icon: 'heroicons:rectangle-group' }
];

// Tüp Cinsi Seçenekleri (Yangın Tüpü kategorisi için)
const tubeTypes = [
    { value: 'KKT', label: 'KKT (Kuru Kimyevi Toz)' },
    { value: 'CO2', label: 'CO2 (Karbondioksit)' },
    { value: 'Köpüklü', label: 'Köpüklü' },
    { value: 'Biyolojik', label: 'Biyolojik' },
    { value: 'Ekobiyolojik', label: 'Ekobiyolojik' },
    { value: 'FM200', label: 'FM200' },
    { value: 'Tekne', label: 'Tekne Tipi' },
    { value: 'Su', label: 'Su' },
    { value: 'Halokarbon', label: 'Halokarbon' },
    { value: 'Oksijen', label: 'Oksijen' },
    { value: 'Davlumbaz', label: 'Davlumbaz' },
    { value: 'Otomatik', label: 'Otomatik Söndürme' }
];

const PricesLayer = () => {
    const [prices, setPrices] = useState([]);
    const [toast, setToast] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [editingPrice, setEditingPrice] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    // eslint-disable-next-line no-unused-vars
    const [loading, setLoading] = useState(true);
    const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
    const [activeCategory, setActiveCategory] = useState('Yangın Tüpü'); // Aktif sekme
    const [showDolumDetails, setShowDolumDetails] = useState({}); // Dolum detay açık/kapalı
    const [bulkUpdateData, setBulkUpdateData] = useState({
        priceType: 'fiyat', // 'fiyat', 'dolum', 'hortum', 'dolum_manometre', 'dolum_tetik', 'dolum_hortum', 'dolum_boya'
        operation: 'increase', // 'increase' or 'decrease'
        percentage: ''
    });
    
    // Firma ayarları
    const [companyName, setCompanyName] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        tup_cinsi: '',
        kilo: '',
        fiyat: '',
        dolum_fiyati: '',
        hortum_fiyati: '',
        dolum_manometre: '',
        dolum_tetik: '',
        dolum_hortum: '',
        dolum_boya: '',
        category: 'Yangın Tüpü'
    });

    // Veritabanından fiyatları çek
    useEffect(() => {
        const fetchPrices = async () => {
            try {
                if (window.api) {
                    const result = await window.api.price.list();
                    if (result.success) {
                        setPrices(result.data);
                    }
                    
                    // Firma adını çek
                    const settingsResult = await window.api.settings.get();
                    if (settingsResult.success && settingsResult.data) {
                        setCompanyName(settingsResult.data.company_name || '');
                    }
                }
            } catch (error) {
                console.error('Fiyat çekme hatası:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPrices();
    }, []);

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
    };

    // Filtrelenmiş fiyatlar (aktif kategoriye göre)
    const filteredPrices = prices.filter(price => {
        const matchesCategory = (price.category || 'Yangın Tüpü') === activeCategory;
        
        const matchesSearch = searchTerm === '' ||
            price.tup_cinsi.toLowerCase().includes(searchTerm.toLowerCase()) ||
            price.aciklama?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = typeFilter === '' || price.tup_cinsi === typeFilter;

        return matchesCategory && matchesSearch && matchesType;
    });

    // Gruplanmış fiyatlar (tüp cinsine göre)
    const groupedPrices = filteredPrices.reduce((acc, price) => {
        if (!acc[price.tup_cinsi]) {
            acc[price.tup_cinsi] = [];
        }
        acc[price.tup_cinsi].push(price);
        return acc;
    }, {});

    // Modal aç
    const openAddModal = () => {
        setEditingPrice(null);
        setFormData({
            tup_cinsi: '',
            kilo: '',
            fiyat: '',
            dolum_fiyati: '',
            hortum_fiyati: '',
            dolum_manometre: '',
            dolum_tetik: '',
            dolum_hortum: '',
            dolum_boya: '',
            category: activeCategory
        });
        setShowModal(true);
    };

    // Düzenle
    const openEditModal = (price) => {
        setEditingPrice(price);
        setFormData({
            tup_cinsi: price.tup_cinsi,
            kilo: price.kilo || '',
            fiyat: price.fiyat || '',
            dolum_fiyati: price.dolum_fiyati || '',
            hortum_fiyati: price.hortum_fiyati || '',
            dolum_manometre: price.dolum_manometre || '',
            dolum_tetik: price.dolum_tetik || '',
            dolum_hortum: price.dolum_hortum || '',
            dolum_boya: price.dolum_boya || '',
            category: price.category || activeCategory
        });
        setShowModal(true);
    };

    // Form kaydet
    const handleSave = async () => {
        if (!formData.tup_cinsi) {
            showToast('Ürün adı girmelisiniz!', 'error');
            return;
        }
        if (!formData.fiyat || parseFloat(formData.fiyat) <= 0) {
            showToast('Fiyat girmelisiniz!', 'error');
            return;
        }
        // Kilo sadece Yangın Tüpü kategorisi için zorunlu
        if (activeCategory === 'Yangın Tüpü' && (!formData.kilo || parseFloat(formData.kilo) <= 0)) {
            showToast('Kilo girmelisiniz!', 'error');
            return;
        }

        try {
            if (window.api) {
                const priceData = {
                    tup_cinsi: formData.tup_cinsi,
                    kilo: parseFloat(formData.kilo) || 0,
                    fiyat: parseFloat(formData.fiyat),
                    dolum_fiyati: parseFloat(formData.dolum_fiyati) || 0,
                    hortum_fiyati: parseFloat(formData.hortum_fiyati) || 0,
                    dolum_manometre: parseFloat(formData.dolum_manometre) || 0,
                    dolum_tetik: parseFloat(formData.dolum_tetik) || 0,
                    dolum_hortum: parseFloat(formData.dolum_hortum) || 0,
                    dolum_boya: parseFloat(formData.dolum_boya) || 0,
                    category: formData.category || activeCategory
                };

                const result = await window.api.price.save(priceData);
                if (result.success) {
                    // Listeyi yeniden yükle
                    const listResult = await window.api.price.list();
                    if (listResult.success) {
                        setPrices(listResult.data);
                    }
                    showToast(editingPrice ? 'Fiyat güncellendi' : 'Yeni fiyat eklendi', 'success');
                    setShowModal(false);
                } else {
                    showToast('Fiyat kaydedilemedi: ' + result.error, 'error');
                }
            }
        } catch (error) {
            console.error('Fiyat kaydetme hatası:', error);
            showToast('Fiyat kaydedilemedi', 'error');
        }
    };

    // Silme onayı
    const confirmDelete = (id) => {
        setDeleteId(id);
        setShowDeleteModal(true);
    };

    // Sil
    const handleDelete = async () => {
        try {
            if (window.api) {
                const result = await window.api.price.delete(deleteId);
                if (result.success) {
                    setPrices(prices.filter(p => p.id !== deleteId));
                    showToast('Fiyat silindi', 'success');
                } else {
                    showToast('Fiyat silinemedi', 'error');
                }
            }
        } catch (error) {
            console.error('Fiyat silme hatası:', error);
            showToast('Fiyat silinemedi', 'error');
        }
        setShowDeleteModal(false);
        setDeleteId(null);
    };

    // Toplu fiyat güncelleme
    const handleBulkUpdate = async () => {
        if (!bulkUpdateData.percentage || parseFloat(bulkUpdateData.percentage) <= 0) {
            showToast('Lütfen geçerli bir yüzde girin!', 'error');
            return;
        }

        const percentage = parseFloat(bulkUpdateData.percentage);
        
        if (bulkUpdateData.operation === 'decrease' && percentage >= 100) {
            showToast('İndirim oranı %100\'den fazla olamaz!', 'error');
            return;
        }

        try {
            if (window.api) {
                const result = await window.api.price.bulkUpdate({
                    priceType: bulkUpdateData.priceType,
                    operation: bulkUpdateData.operation,
                    percentage: percentage,
                    category: activeCategory // Sadece aktif kategori güncellenir
                });

                if (result.success) {
                    // Listeyi yeniden yükle
                    const listResult = await window.api.price.list();
                    if (listResult.success) {
                        setPrices(listResult.data);
                    }

                    const priceTypeLabels = {
                        'fiyat': 'Ürün fiyatları',
                        'dolum': 'Dolum fiyatları',
                        'hortum': 'Hortum fiyatları',
                        'dolum_manometre': 'Manometre fiyatları',
                        'dolum_tetik': 'Tetik fiyatları',
                        'dolum_hortum': 'Dolum hortum fiyatları',
                        'dolum_boya': 'Boya fiyatları'
                    };
                    const priceTypeText = priceTypeLabels[bulkUpdateData.priceType] || 'Fiyatlar';
                    const operationText = bulkUpdateData.operation === 'increase' ? 'artırıldı' : 'azaltıldı';
                    showToast(`${activeCategory} - ${priceTypeText} %${percentage} ${operationText}`, 'success');
                    setShowBulkUpdateModal(false);
                    setBulkUpdateData({ priceType: 'fiyat', operation: 'increase', percentage: '' });
                } else {
                    showToast('Güncelleme hatası: ' + result.error, 'error');
                }
            }
        } catch (error) {
            console.error('Toplu güncelleme hatası:', error);
            showToast('Fiyatlar güncellenirken hata oluştu', 'error');
        }
    };

    // Fiyat formatla
    const formatPrice = (value) => {
        if (!value) return '₺0';
        return '₺' + parseFloat(value).toLocaleString('tr-TR');
    };

    // Excel'e aktar
    const exportToExcel = () => {
        const headers = ['Kategori', 'Ürün Adı', 'Kilo', 'Ürün Fiyatı', 'Dolum Fiyatı', 'Hortum Fiyatı', 'Dolum Manometre', 'Dolum Tetik', 'Dolum Hortum', 'Dolum Boya'];
        const csvContent = [
            '\uFEFF' + headers.join(';'),
            ...filteredPrices.map(p => [
                p.category || activeCategory,
                p.tup_cinsi,
                p.kilo || 0,
                p.fiyat || 0,
                p.dolum_fiyati || 0,
                p.hortum_fiyati || 0,
                p.dolum_manometre || 0,
                p.dolum_tetik || 0,
                p.dolum_hortum || 0,
                p.dolum_boya || 0
            ].join(';'))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const categorySlug = activeCategory.replace(/\s+/g, '_');
        link.download = `fiyat_listesi_${categorySlug}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        showToast(`${activeCategory} fiyat listesi indirildi`, 'success');
    };

    // Excel'den içe aktar
    const handleImportExcel = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(line => line.trim());
                
                if (lines.length < 2) {
                    showToast('Geçersiz dosya formatı!', 'error');
                    return;
                }

                // İlk satır başlıklar
                const pricesData = [];
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(';').map(v => v.trim());
                    if (values.length >= 3 && values[1]) {
                        pricesData.push({
                            category: values[0] || activeCategory,
                            tup_cinsi: values[1],
                            kilo: parseFloat(values[2]) || 0,
                            fiyat: parseFloat(values[3]) || 0,
                            dolum_fiyati: parseFloat(values[4]) || 0,
                            hortum_fiyati: parseFloat(values[5]) || 0,
                            dolum_manometre: parseFloat(values[6]) || 0,
                            dolum_tetik: parseFloat(values[7]) || 0,
                            dolum_hortum: parseFloat(values[8]) || 0,
                            dolum_boya: parseFloat(values[9]) || 0
                        });
                    }
                }

                if (pricesData.length === 0) {
                    showToast('İçe aktarılacak veri bulunamadı!', 'error');
                    return;
                }

                if (window.api) {
                    const result = await window.api.price.importExcel(pricesData);
                    if (result.success) {
                        // Listeyi yeniden yükle
                        const listResult = await window.api.price.list();
                        if (listResult.success) {
                            setPrices(listResult.data);
                        }
                        showToast(`${result.imported} yeni fiyat eklendi, ${result.updated} fiyat güncellendi`, 'success');
                    } else {
                        showToast('İçe aktarma hatası: ' + result.error, 'error');
                    }
                }
            } catch (error) {
                console.error('Excel okuma hatası:', error);
                showToast('Excel dosyası okunamadı', 'error');
            }
        };
        reader.readAsText(file, 'UTF-8');
        event.target.value = ''; // Input'u sıfırla
    };

    // Yazdır
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');

        const tableRows = filteredPrices.map(p => `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${p.tup_cinsi}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${p.kilo ? p.kilo + ' kg' : 'Tümü'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatPrice(p.fiyat)}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatPrice(p.dolum_fiyati)}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatPrice(p.hortum_fiyati)}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Fiyat Listesi</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #333; margin-bottom: 10px; }
                    h3 { color: #666; font-weight: normal; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    th { background: #f8f9fa; padding: 10px; border: 1px solid #ddd; text-align: left; }
                    tr:nth-child(even) { background: #f9f9f9; }
                </style>
            </head>
            <body>
                <h1>📋 Fiyat Listesi</h1>
                <h3>${companyName || 'Fiyat Listesi'} - ${new Date().toLocaleDateString('tr-TR')}</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Tüp Cinsi</th>
                            <th>Kilo</th>
                            <th style="text-align: right;">Ürün Fiyatı</th>
                            <th style="text-align: right;">Dolum Fiyatı</th>
                            <th style="text-align: right;">Hortum Fiyatı</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.print();
    };

    // İstatistikler
    const stats = {
        totalItems: prices.length,
        uniqueTypes: [...new Set(prices.map(p => p.tup_cinsi))].length,
        avgPrice: prices.length > 0
            ? Math.round(prices.reduce((sum, p) => sum + (p.fiyat || 0), 0) / prices.length)
            : 0
    };

    return (
        <div className="row gy-4">
            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Header */}
            <div className="col-12">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <h4 className="mb-0 d-flex align-items-center gap-2">
                        <Icon icon="heroicons:currency-dollar" className="text-primary-600 text-2xl" />
                        Fiyat Yönetimi
                    </h4>
                    <div className="d-flex flex-wrap gap-2">
                        <button
                            className="btn btn-outline-warning d-flex align-items-center gap-2"
                            onClick={() => setShowBulkUpdateModal(true)}
                            disabled={filteredPrices.length === 0}
                            title={`${activeCategory} fiyatlarını toplu güncelle`}
                        >
                            <Icon icon="heroicons:arrow-trending-up" className="text-xl" />
                            Toplu Güncelle
                        </button>
                        <button
                            className="btn btn-outline-info d-flex align-items-center gap-2"
                            onClick={handlePrint}
                        >
                            <Icon icon="heroicons:printer" className="text-xl" />
                            Yazdır
                        </button>
                        <button
                            className="btn btn-outline-success d-flex align-items-center gap-2"
                            onClick={exportToExcel}
                        >
                            <Icon icon="heroicons:arrow-down-tray" className="text-xl" />
                            Excel İndir
                        </button>
                        <label className="btn btn-outline-warning d-flex align-items-center gap-2 mb-0">
                            <Icon icon="heroicons:arrow-up-tray" className="text-xl" />
                            Excel Yükle
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={handleImportExcel}
                                style={{ display: 'none' }}
                            />
                        </label>
                        <button
                            className="btn btn-primary-600 d-flex align-items-center gap-2"
                            onClick={openAddModal}
                        >
                            <Icon icon="heroicons:plus" className="text-xl" />
                            Yeni Fiyat
                        </button>
                    </div>
                </div>
            </div>

            {/* Kategori Sekmeleri */}
            <div className="col-12">
                <div className="card radius-12 shadow-none border">
                    <div className="card-body p-0">
                        <ul className="nav nav-tabs nav-tabs-scroll" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
                            {categories.map(cat => (
                                <li className="nav-item" key={cat.id}>
                                    <button
                                        className={`nav-link d-flex align-items-center gap-2 ${activeCategory === cat.id ? 'active' : ''}`}
                                        onClick={() => setActiveCategory(cat.id)}
                                        style={{ whiteSpace: 'nowrap' }}
                                    >
                                        <Icon icon={cat.icon} className="text-lg" />
                                        {cat.label}
                                        <span className={`badge ${activeCategory === cat.id ? 'bg-primary-600' : 'bg-secondary-200 text-secondary-600'} rounded-pill ms-1`}>
                                            {prices.filter(p => (p.category || 'Yangın Tüpü') === cat.id).length}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* İstatistik Kartları */}
            <div className="col-lg-3 col-sm-6">
                <div className="card h-100 radius-12 shadow-none" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <div className="card-body p-20 text-white">
                        <div className="d-flex align-items-center gap-3">
                            <div className="w-64-px h-64-px radius-12 bg-white-opacity-10 d-flex justify-content-center align-items-center">
                                <Icon icon="heroicons:list-bullet" className="text-white text-3xl" />
                            </div>
                            <div>
                                <h6 className="mb-1 text-white-50">Toplam Kayıt</h6>
                                <h3 className="mb-0 text-white fw-bold">{stats.totalItems}</h3>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-lg-3 col-sm-6">
                <div className="card h-100 radius-12 shadow-none" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
                    <div className="card-body p-20 text-white">
                        <div className="d-flex align-items-center gap-3">
                            <div className="w-64-px h-64-px radius-12 bg-white-opacity-10 d-flex justify-content-center align-items-center">
                                <Icon icon="heroicons:squares-2x2" className="text-white text-3xl" />
                            </div>
                            <div>
                                <h6 className="mb-1 text-white-50">Tüp Çeşidi</h6>
                                <h3 className="mb-0 text-white fw-bold">{stats.uniqueTypes}</h3>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-lg-3 col-sm-6">
                <div className="card h-100 radius-12 shadow-none" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                    <div className="card-body p-20 text-white">
                        <div className="d-flex align-items-center gap-3">
                            <div className="w-64-px h-64-px radius-12 bg-white-opacity-10 d-flex justify-content-center align-items-center">
                                <Icon icon="heroicons:beaker" className="text-white text-3xl" />
                            </div>
                            <div>
                                <h6 className="mb-1 text-white-50">Ort. Fiyat</h6>
                                <h3 className="mb-0 text-white fw-bold">₺{stats.avgPrice.toLocaleString('tr-TR')}</h3>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtreler */}
            <div className="col-12">
                <div className="card radius-12">
                    <div className="card-body p-16">
                        <div className="row g-3 align-items-end">
                            <div className="col-md-5">
                                <label className="form-label mb-2 fw-medium">Ara</label>
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        className="form-control ps-40"
                                        placeholder="Tüp cinsi veya açıklama ara..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <Icon icon="heroicons:magnifying-glass" className="position-absolute top-50 translate-middle-y ms-12 text-secondary-light text-xl" />
                                </div>
                            </div>
                            <div className="col-md-4">
                                <label className="form-label mb-2 fw-medium">Tüp Cinsi</label>
                                <select
                                    className="form-select"
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                >
                                    <option value="">Tüm Çeşitler</option>
                                    {tubeTypes.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-3">
                                <button
                                    className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2"
                                    onClick={() => { setSearchTerm(''); setTypeFilter(''); }}
                                >
                                    <Icon icon="heroicons:x-mark" className="text-xl" />
                                    Temizle
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fiyat Tablosu */}
            <div className="col-12">
                <div className="card radius-12">
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead>
                                    <tr>
                                        <th className="px-20 py-16 bg-primary-50 text-primary-600">Tüp Cinsi</th>
                                        <th className="px-20 py-16 bg-primary-50 text-primary-600">Kilo</th>
                                        <th className="px-20 py-16 bg-primary-50 text-primary-600 text-end">Ürün Fiyatı</th>
                                        <th className="px-20 py-16 bg-primary-50 text-primary-600 text-end">Dolum Fiyatı</th>
                                        <th className="px-20 py-16 bg-primary-50 text-primary-600 text-end">Hortum Fiyatı</th>
                                        <th className="px-20 py-16 bg-primary-50 text-primary-600 text-center">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPrices.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="text-center py-40">
                                                <div className="d-flex flex-column align-items-center gap-3">
                                                    <Icon icon="heroicons:currency-dollar" className="text-secondary-light" style={{ fontSize: '64px' }} />
                                                    <div>
                                                        <h6 className="text-secondary-light mb-1">{activeCategory} için fiyat kaydı bulunamadı</h6>
                                                        <p className="text-secondary-light mb-0">
                                                            {prices.length === 0
                                                                ? 'Yeni fiyat eklemek için butonu kullanın'
                                                                : 'Filtrelerinizi değiştirmeyi deneyin'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredPrices.map((price) => {
                                            // Dolum toplam hesapla
                                            const dolumParcalar = (price.dolum_manometre || 0) + (price.dolum_tetik || 0) + 
                                                                   (price.dolum_hortum || 0) + (price.dolum_boya || 0);
                                            const dolumToplam = dolumParcalar > 0 ? dolumParcalar : (price.dolum_fiyati || 0);
                                            const hasDolumDetails = dolumParcalar > 0;
                                            
                                            return (
                                            <tr key={price.id}>
                                                <td className="px-20 py-16">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="badge bg-primary-100 text-primary-600 px-12 py-8 radius-8 fw-semibold">
                                                            {price.tup_cinsi}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-20 py-16">
                                                    {price.kilo ? (
                                                        <span className="fw-medium">{price.kilo} kg</span>
                                                    ) : (
                                                        <span className="text-secondary-light">-</span>
                                                    )}
                                                </td>
                                                <td className="px-20 py-16 text-end">
                                                    <span className="text-success-600 fw-bold">{formatPrice(price.fiyat)}</span>
                                                </td>
                                                <td className="px-20 py-16 text-end">
                                                    <div className="d-flex align-items-center justify-content-end gap-1">
                                                        <span className="text-info-600 fw-medium">{formatPrice(dolumToplam)}</span>
                                                        {hasDolumDetails && (
                                                            <button 
                                                                className="btn btn-sm p-0 ms-1"
                                                                onClick={() => setShowDolumDetails(prev => ({...prev, [price.id]: !prev[price.id]}))}
                                                                title="Dolum detayları"
                                                            >
                                                                <Icon 
                                                                    icon={showDolumDetails[price.id] ? "heroicons:chevron-up" : "heroicons:chevron-down"} 
                                                                    className="text-info-600"
                                                                />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {showDolumDetails[price.id] && hasDolumDetails && (
                                                        <div className="mt-2 p-2 bg-light radius-4 text-start" style={{ fontSize: '11px' }}>
                                                            <div className="d-flex justify-content-between"><span>Manometre:</span><span>{formatPrice(price.dolum_manometre)}</span></div>
                                                            <div className="d-flex justify-content-between"><span>Tetik:</span><span>{formatPrice(price.dolum_tetik)}</span></div>
                                                            <div className="d-flex justify-content-between"><span>Hortum:</span><span>{formatPrice(price.dolum_hortum)}</span></div>
                                                            <div className="d-flex justify-content-between"><span>Boya:</span><span>{formatPrice(price.dolum_boya)}</span></div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-20 py-16 text-end">
                                                    <span className="text-warning-600 fw-medium">{formatPrice(price.hortum_fiyati)}</span>
                                                </td>
                                                <td className="px-20 py-16">
                                                    <div className="d-flex justify-content-center gap-2">
                                                        <button
                                                            className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                                                            onClick={() => openEditModal(price)}
                                                            title="Düzenle"
                                                        >
                                                            <Icon icon="heroicons:pencil-square" className="text-lg" />
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                                                            onClick={() => confirmDelete(price.id)}
                                                            title="Sil"
                                                        >
                                                            <Icon icon="heroicons:trash" className="text-lg" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )})
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/* Sonuç Bilgisi */}
                    {filteredPrices.length > 0 && (
                        <div className="card-footer bg-transparent border-top py-12 px-20">
                            <div className="d-flex justify-content-between align-items-center">
                                <span className="text-secondary-light">
                                    Toplam {filteredPrices.length} kayıt gösteriliyor
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Fiyat Kartları (Gruplu Görünüm) */}
            <div className="col-12">
                <h6 className="mb-16 d-flex align-items-center gap-2">
                    <Icon icon="heroicons:squares-2x2" className="text-primary-600" />
                    Tüp Cinsine Göre Fiyatlar
                </h6>
                <div className="row g-3">
                    {Object.entries(groupedPrices).map(([type, typePrices]) => (
                        <div key={type} className="col-lg-4 col-md-6">
                            <div className="card radius-12 h-100">
                                <div className="card-header bg-primary-50 py-12 px-16">
                                    <h6 className="mb-0 text-primary-600 fw-bold">{type}</h6>
                                </div>
                                <div className="card-body p-0">
                                    <table className="table table-sm mb-0">
                                        <thead>
                                            <tr>
                                                <th className="px-12 py-8 text-secondary-light fw-medium">Kilo</th>
                                                <th className="px-12 py-8 text-secondary-light fw-medium text-end">Fiyat</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {typePrices.map(p => (
                                                <tr key={p.id}>
                                                    <td className="px-12 py-8">{p.kilo ? `${p.kilo} kg` : 'Tümü'}</td>
                                                    <td className="px-12 py-8 text-end text-success-600">{formatPrice(p.fiyat)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Fiyat Ekleme/Düzenleme Modal */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content radius-12">
                            <div className="modal-header border-bottom py-16 px-24">
                                <h5 className="modal-title d-flex align-items-center gap-2">
                                    <Icon icon={editingPrice ? 'heroicons:pencil-square' : 'heroicons:plus-circle'} className="text-primary-600" />
                                    {editingPrice ? 'Fiyat Düzenle' : 'Yeni Fiyat Ekle'}
                                    <span className="badge bg-info-100 text-info-600 ms-2">{activeCategory}</span>
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowModal(false)}
                                />
                            </div>
                            <div className="modal-body p-24">
                                <div className="row g-3">
                                    {/* Ürün adı - kategoriye göre farklı input */}
                                    <div className="col-md-6">
                                        <label className="form-label fw-medium">
                                            {activeCategory === 'Yangın Tüpü' ? 'Tüp Cinsi' : 'Ürün Adı'} *
                                        </label>
                                        {activeCategory === 'Yangın Tüpü' ? (
                                            <select
                                                className="form-select"
                                                value={formData.tup_cinsi}
                                                onChange={(e) => setFormData({ ...formData, tup_cinsi: e.target.value })}
                                                required
                                            >
                                                <option value="">Seçin...</option>
                                                {tubeTypes.map(type => (
                                                    <option key={type.value} value={type.value}>{type.label}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Ürün adını girin"
                                                value={formData.tup_cinsi}
                                                onChange={(e) => setFormData({ ...formData, tup_cinsi: e.target.value })}
                                                required
                                            />
                                        )}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-medium">
                                            {activeCategory === 'Yangın Tüpü' ? 'Kilo' : 'Birim/Açıklama'}
                                        </label>
                                        <div className="input-group">
                                            <input
                                                type={activeCategory === 'Yangın Tüpü' ? 'number' : 'text'}
                                                className="form-control"
                                                placeholder={activeCategory === 'Yangın Tüpü' ? 'Boş = Tüm kilolar' : 'Adet, metre, vs.'}
                                                min="0"
                                                step="0.1"
                                                value={formData.kilo}
                                                onChange={(e) => setFormData({ ...formData, kilo: e.target.value })}
                                            />
                                            {activeCategory === 'Yangın Tüpü' && <span className="input-group-text">kg</span>}
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-medium">Ürün Fiyatı *</label>
                                        <div className="input-group">
                                            <span className="input-group-text">₺</span>
                                            <input
                                                type="number"
                                                className="form-control"
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                                value={formData.fiyat}
                                                onChange={(e) => setFormData({ ...formData, fiyat: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-medium">Hortum Fiyatı</label>
                                        <div className="input-group">
                                            <span className="input-group-text">₺</span>
                                            <input
                                                type="number"
                                                className="form-control"
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                                value={formData.hortum_fiyati}
                                                onChange={(e) => setFormData({ ...formData, hortum_fiyati: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-medium text-secondary-light">Dolum Toplam</label>
                                        <div className="input-group">
                                            <span className="input-group-text">₺</span>
                                            <input
                                                type="text"
                                                className="form-control bg-light"
                                                value={formatPrice(
                                                    (parseFloat(formData.dolum_manometre) || 0) +
                                                    (parseFloat(formData.dolum_tetik) || 0) +
                                                    (parseFloat(formData.dolum_hortum) || 0) +
                                                    (parseFloat(formData.dolum_boya) || 0) ||
                                                    (parseFloat(formData.dolum_fiyati) || 0)
                                                )}
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Dolum Parça Fiyatları */}
                                    <div className="col-12">
                                        <div className="border radius-8 p-16 bg-light">
                                            <h6 className="mb-12 d-flex align-items-center gap-2">
                                                <Icon icon="heroicons:wrench-screwdriver" className="text-info-600" />
                                                Dolum Parça Fiyatları
                                                <span className="text-secondary-light fw-normal" style={{fontSize: '12px'}}>(Opsiyonel - Detaylı fiyatlandırma)</span>
                                            </h6>
                                            <div className="row g-2">
                                                <div className="col-md-3 col-6">
                                                    <label className="form-label small">Manometre</label>
                                                    <div className="input-group input-group-sm">
                                                        <span className="input-group-text">₺</span>
                                                        <input
                                                            type="number"
                                                            className="form-control"
                                                            placeholder="0"
                                                            min="0"
                                                            step="0.01"
                                                            value={formData.dolum_manometre}
                                                            onChange={(e) => setFormData({ ...formData, dolum_manometre: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-md-3 col-6">
                                                    <label className="form-label small">Tetik</label>
                                                    <div className="input-group input-group-sm">
                                                        <span className="input-group-text">₺</span>
                                                        <input
                                                            type="number"
                                                            className="form-control"
                                                            placeholder="0"
                                                            min="0"
                                                            step="0.01"
                                                            value={formData.dolum_tetik}
                                                            onChange={(e) => setFormData({ ...formData, dolum_tetik: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-md-3 col-6">
                                                    <label className="form-label small">Hortum</label>
                                                    <div className="input-group input-group-sm">
                                                        <span className="input-group-text">₺</span>
                                                        <input
                                                            type="number"
                                                            className="form-control"
                                                            placeholder="0"
                                                            min="0"
                                                            step="0.01"
                                                            value={formData.dolum_hortum}
                                                            onChange={(e) => setFormData({ ...formData, dolum_hortum: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-md-3 col-6">
                                                    <label className="form-label small">Boya</label>
                                                    <div className="input-group input-group-sm">
                                                        <span className="input-group-text">₺</span>
                                                        <input
                                                            type="number"
                                                            className="form-control"
                                                            placeholder="0"
                                                            min="0"
                                                            step="0.01"
                                                            value={formData.dolum_boya}
                                                            onChange={(e) => setFormData({ ...formData, dolum_boya: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer border-top py-16 px-24">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowModal(false)}
                                >
                                    İptal
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary-600"
                                    onClick={handleSave}
                                >
                                    <Icon icon="heroicons:check" className="me-1" />
                                    {editingPrice ? 'Güncelle' : 'Kaydet'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Silme Onay Modal */}
            {showDeleteModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-sm">
                        <div className="modal-content radius-12">
                            <div className="modal-body p-24 text-center">
                                <div className="mb-16">
                                    <Icon icon="heroicons:exclamation-triangle" className="text-danger-600" style={{ fontSize: '48px' }} />
                                </div>
                                <h5 className="mb-8">Fiyatı Sil?</h5>
                                <p className="text-secondary-light mb-24">
                                    Bu fiyat kaydını silmek istediğinize emin misiniz?
                                </p>
                                <div className="d-flex gap-2 justify-content-center">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => setShowDeleteModal(false)}
                                    >
                                        İptal
                                    </button>
                                    <button
                                        className="btn btn-danger-600"
                                        onClick={handleDelete}
                                    >
                                        <Icon icon="heroicons:trash" className="me-1" />
                                        Sil
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toplu Fiyat Güncelleme Modal */}
            {showBulkUpdateModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content radius-12">
                            <div className="modal-header border-bottom py-16 px-24">
                                <h5 className="modal-title d-flex align-items-center gap-2">
                                    <Icon icon="heroicons:arrow-trending-up" className="text-warning-600" />
                                    Toplu Fiyat Güncelleme
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => {
                                        setShowBulkUpdateModal(false);
                                        setBulkUpdateData({ priceType: 'fiyat', operation: 'increase', percentage: '' });
                                    }}
                                />
                            </div>
                            <div className="modal-body p-24">
                                <div className="alert alert-info d-flex align-items-start gap-2 mb-20">
                                    <Icon icon="heroicons:information-circle" className="text-xl flex-shrink-0 mt-1" />
                                    <div>
                                        <strong>Dikkat:</strong> Bu işlem tüm fiyatları ({prices.length} adet) belirttiğiniz oranda güncelleyecektir.
                                    </div>
                                </div>

                                <div className="row g-3">
                                    <div className="col-12">
                                        <label className="form-label fw-medium">Fiyat Türü *</label>
                                        <div className="d-flex gap-2 flex-wrap">
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="priceType"
                                                    id="priceType_fiyat"
                                                    value="fiyat"
                                                    checked={bulkUpdateData.priceType === 'fiyat'}
                                                    onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, priceType: e.target.value })}
                                                />
                                                <label className="form-check-label" htmlFor="priceType_fiyat">
                                                    <span className="badge bg-success-100 text-success-600 px-12 py-8 radius-8">
                                                        <Icon icon="heroicons:banknotes" className="me-1" />
                                                        Ürün Fiyatı
                                                    </span>
                                                </label>
                                            </div>
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="priceType"
                                                    id="priceType_dolum"
                                                    value="dolum"
                                                    checked={bulkUpdateData.priceType === 'dolum'}
                                                    onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, priceType: e.target.value })}
                                                />
                                                <label className="form-check-label" htmlFor="priceType_dolum">
                                                    <span className="badge bg-info-100 text-info-600 px-12 py-8 radius-8">
                                                        <Icon icon="heroicons:arrow-path" className="me-1" />
                                                        Dolum Fiyatı
                                                    </span>
                                                </label>
                                            </div>
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="priceType"
                                                    id="priceType_hortum"
                                                    value="hortum"
                                                    checked={bulkUpdateData.priceType === 'hortum'}
                                                    onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, priceType: e.target.value })}
                                                />
                                                <label className="form-check-label" htmlFor="priceType_hortum">
                                                    <span className="badge bg-warning-100 text-warning-600 px-12 py-8 radius-8">
                                                        <Icon icon="heroicons:wrench-screwdriver" className="me-1" />
                                                        Hortum Fiyatı
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label fw-medium">İşlem Türü *</label>
                                        <div className="d-flex gap-3">
                                            <div className="form-check flex-fill">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="operation"
                                                    id="increase"
                                                    value="increase"
                                                    checked={bulkUpdateData.operation === 'increase'}
                                                    onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, operation: e.target.value })}
                                                />
                                                <label className="form-check-label w-100" htmlFor="increase">
                                                    <div className="card radius-8 border-2 border-success-600 h-100">
                                                        <div className="card-body p-12 text-center">
                                                            <Icon icon="heroicons:arrow-trending-up" className="text-success-600 text-2xl mb-2" />
                                                            <div className="fw-semibold text-success-600">Arttır</div>
                                                        </div>
                                                    </div>
                                                </label>
                                            </div>
                                            <div className="form-check flex-fill">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="operation"
                                                    id="decrease"
                                                    value="decrease"
                                                    checked={bulkUpdateData.operation === 'decrease'}
                                                    onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, operation: e.target.value })}
                                                />
                                                <label className="form-check-label w-100" htmlFor="decrease">
                                                    <div className="card radius-8 border-2 border-danger-600 h-100">
                                                        <div className="card-body p-12 text-center">
                                                            <Icon icon="heroicons:arrow-trending-down" className="text-danger-600 text-2xl mb-2" />
                                                            <div className="fw-semibold text-danger-600">Azalt</div>
                                                        </div>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label fw-medium">Yüzde Oranı *</label>
                                        <div className="input-group input-group-lg">
                                            <span className="input-group-text">%</span>
                                            <input
                                                type="number"
                                                className="form-control"
                                                placeholder="Örn: 10"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                value={bulkUpdateData.percentage}
                                                onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, percentage: e.target.value })}
                                            />
                                        </div>
                                        <small className="text-secondary-light mt-2 d-block">
                                            {bulkUpdateData.percentage && parseFloat(bulkUpdateData.percentage) > 0 ? (
                                                <span className={bulkUpdateData.operation === 'increase' ? 'text-success-600' : 'text-danger-600'}>
                                                    <Icon icon={bulkUpdateData.operation === 'increase' ? 'heroicons:arrow-up' : 'heroicons:arrow-down'} className="text-sm" />
                                                    {' '}Örnek: ₺100 → ₺{
                                                        bulkUpdateData.operation === 'increase'
                                                            ? (100 * (1 + parseFloat(bulkUpdateData.percentage) / 100)).toFixed(2)
                                                            : (100 * (1 - parseFloat(bulkUpdateData.percentage) / 100)).toFixed(2)
                                                    }
                                                </span>
                                            ) : (
                                                'Yüzde oranını girin'
                                            )}
                                        </small>
                                    </div>

                                    {bulkUpdateData.percentage && parseFloat(bulkUpdateData.percentage) > 0 && (
                                        <div className="col-12">
                                            <div className={`alert ${bulkUpdateData.operation === 'increase' ? 'alert-success' : 'alert-danger'} mb-0`}>
                                                <div className="d-flex align-items-center gap-2">
                                                    <Icon icon="heroicons:calculator" className="text-xl" />
                                                    <div>
                                                        <strong>Özet:</strong> {prices.length} fiyat kaydı %{bulkUpdateData.percentage} oranında 
                                                        {bulkUpdateData.operation === 'increase' ? ' artırılacak' : ' azaltılacak'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer border-top py-16 px-24">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowBulkUpdateModal(false);
                                        setBulkUpdateData({ priceType: 'fiyat', operation: 'increase', percentage: '' });
                                    }}
                                >
                                    İptal
                                </button>
                                <button
                                    type="button"
                                    className={`btn ${bulkUpdateData.operation === 'increase' ? 'btn-success' : 'btn-danger'}`}
                                    onClick={handleBulkUpdate}
                                    disabled={!bulkUpdateData.percentage || parseFloat(bulkUpdateData.percentage) <= 0}
                                >
                                    <Icon icon="heroicons:check" className="me-1" />
                                    Güncelle
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PricesLayer;
