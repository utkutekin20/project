import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { Turkish } from 'flatpickr/dist/l10n/tr.js';

// DatePicker Component
const DatePicker = ({ id, placeholder, value, onChange }) => {
    const datePickerRef = useRef(null);
    const fpRef = useRef(null);

    useEffect(() => {
        fpRef.current = flatpickr(datePickerRef.current, {
            dateFormat: 'd.m.Y',
            locale: Turkish,
            defaultDate: value || null,
            onChange: (selectedDates) => {
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
                className="form-control radius-8 bg-base pe-40"
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
                    <span>{message}</span>
                </div>
            </div>
        </div>
    );
};

const QuotesLayer = () => {
    const navigate = useNavigate();
    const [quotes, setQuotes] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [toast, setToast] = useState(null);
    // eslint-disable-next-line no-unused-vars
    const [loading, setLoading] = useState(true);

    // Firma ayarları
    const [companySettings, setCompanySettings] = useState({
        company_name: '',
        phone: '',
        email: '',
        address: '',
        tax_office: '',
        tax_number: '',
        kdv_rate: '20',
        logo: '' // Firma logosu (base64)
    });

    // Filtreler
    const [statusFilter, setStatusFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [selectedQuote, setSelectedQuote] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [editingQuote, setEditingQuote] = useState(null); // Düzenleme modu için
    
    // Toplu seçim state
    const [selectedQuoteIds, setSelectedQuoteIds] = useState([]);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [showCount, setShowCount] = useState(10);

    // Para birimi sembolleri
    const currencySymbols = {
        'TRY': '₺',
        'USD': '$',
        'EUR': '€'
    };

    // Form state
    const [formData, setFormData] = useState({
        customer_id: '',
        valid_days: 15,
        notes: '',
        include_kdv: true, // KDV dahil mi?
        currency: 'TRY' // Para birimi
    });
    const [quoteItems, setQuoteItems] = useState([{ description: '', quantity: 1, unit_price: 0 }]);

    // Veritabanından verileri çek
    useEffect(() => {
        const fetchData = async () => {
            try {
                if (window.api) {
                    // Firma ayarlarını çek
                    const settingsResult = await window.api.settings.get();
                    if (settingsResult.success && settingsResult.data) {
                        setCompanySettings(prev => ({ ...prev, ...settingsResult.data }));
                    }

                    // Teklifleri çek
                    const quotesResult = await window.api.quote.list();
                    if (quotesResult.success) {
                        // Veritabanı alanlarını komponentin beklediği formata dönüştür
                        const normalizedQuotes = quotesResult.data.map(q => ({
                            ...q,
                            quote_number: q.teklif_no || q.quote_number,
                            total_amount: q.toplam_tutar || q.total_amount || 0,
                            kdv_amount: q.kdv_tutar || q.kdv_amount || 0,
                            subtotal: q.ara_toplam || q.subtotal || 0,
                            kdv_rate: q.kdv_orani || q.kdv_rate || 20,
                            currency: q.currency || 'TRY',
                            status: q.durum === 'Onaylandı' ? 'accepted' :
                                q.durum === 'Reddedildi' ? 'rejected' :
                                    q.durum === 'Gönderildi' ? 'sent' :
                                        q.durum === 'Taslak' ? 'draft' : 'draft',
                            notes: q.notlar || q.notes || '',
                            valid_until: q.valid_until || new Date(new Date(q.created_at).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            items: [] // items sonradan yüklenecek
                        }));
                        setQuotes(normalizedQuotes);
                    }

                    // Müşterileri çek
                    const customersResult = await window.api.customer.list();
                    if (customersResult.success) {
                        setCustomers(customersResult.data);
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

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
    };

    // Durum etiketi ve renkleri
    const getStatusConfig = (status) => {
        const configs = {
            'draft': { label: 'Taslak', bg: 'bg-secondary-100', text: 'text-secondary-600', icon: 'heroicons:document' },
            'sent': { label: 'Gönderildi', bg: 'bg-info-100', text: 'text-info-600', icon: 'heroicons:paper-airplane' },
            'accepted': { label: 'Kabul Edildi', bg: 'bg-success-100', text: 'text-success-600', icon: 'heroicons:check-circle' },
            'rejected': { label: 'Reddedildi', bg: 'bg-danger-100', text: 'text-danger-600', icon: 'heroicons:x-circle' }
        };
        return configs[status] || configs['draft'];
    };

    // Filtrelenmiş teklifler
    const filteredQuotes = quotes.filter(quote => {
        const matchesStatus = statusFilter === '' || quote.status === statusFilter;

        let matchesDate = true;
        if (startDate) {
            matchesDate = matchesDate && quote.created_at >= startDate;
        }
        if (endDate) {
            matchesDate = matchesDate && quote.created_at <= endDate;
        }

        return matchesStatus && matchesDate;
    });

    // Pagination hesaplamaları
    const totalPages = Math.ceil(filteredQuotes.length / showCount);
    const startIndex = (currentPage - 1) * showCount;
    const endIndex = startIndex + showCount;
    const paginatedQuotes = filteredQuotes.slice(startIndex, endIndex);

    // Sayfa değiştirme
    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setSelectedQuoteIds([]);
        }
    };

    // Toplu seçim fonksiyonları
    const toggleSelectQuote = (quoteId) => {
        setSelectedQuoteIds(prev => {
            if (prev.includes(quoteId)) {
                return prev.filter(id => id !== quoteId);
            } else {
                return [...prev, quoteId];
            }
        });
    };

    const toggleSelectAll = () => {
        if (selectedQuoteIds.length === paginatedQuotes.length) {
            setSelectedQuoteIds([]);
        } else {
            setSelectedQuoteIds(paginatedQuotes.map(q => q.id));
        }
    };

    // Toplu silme
    const handleBulkDelete = async () => {
        try {
            if (window.api && selectedQuoteIds.length > 0) {
                let successCount = 0;
                let failedCount = 0;

                for (const quoteId of selectedQuoteIds) {
                    const result = await window.api.quote.delete(quoteId);
                    if (result.success) {
                        successCount++;
                    } else {
                        failedCount++;
                    }
                }

                // Verileri yenile
                const quotesResult = await window.api.quote.list();
                if (quotesResult.success) {
                    const normalizedQuotes = quotesResult.data.map(q => ({
                        ...q,
                        quote_number: q.teklif_no || q.quote_number,
                        total_amount: q.toplam_tutar || q.total_amount || 0,
                        status: q.durum === 'Onaylandı' ? 'accepted' :
                            q.durum === 'Reddedildi' ? 'rejected' :
                                q.durum === 'Gönderildi' ? 'sent' : 'draft'
                    }));
                    setQuotes(normalizedQuotes);
                }

                setSelectedQuoteIds([]);
                setShowBulkDeleteModal(false);
                showToast(`${successCount} teklif silindi${failedCount > 0 ? `, ${failedCount} teklif silinemedi` : ''}`, failedCount > 0 ? 'error' : 'success');
            }
        } catch (error) {
            console.error('Toplu silme hatası:', error);
            showToast('Toplu silme işlemi sırasında hata oluştu', 'error');
        }
    };

    // İstatistikler
    const stats = {
        total: quotes.length,
        draft: quotes.filter(q => q.status === 'draft').length,
        sent: quotes.filter(q => q.status === 'sent').length,
        accepted: quotes.filter(q => q.status === 'accepted').length,
        rejected: quotes.filter(q => q.status === 'rejected').length,
        totalAmount: quotes.reduce((sum, q) => sum + (q.total_amount || 0), 0)
    };

    // Kalem toplam hesapla (KDV hariç)
    const calculateSubtotal = (items) => {
        return items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);
    };

    // KDV hesapla
    const calculateKDV = (subtotal) => {
        const kdvRate = parseFloat(companySettings.kdv_rate) || 20;
        return subtotal * (kdvRate / 100);
    };

    // Genel toplam (KDV dahil)
    const calculateTotal = (items) => {
        const subtotal = calculateSubtotal(items);
        if (formData.include_kdv) {
            return subtotal + calculateKDV(subtotal);
        }
        return subtotal;
    };

    // Para birimi formatla
    const formatCurrency = (amount, currency = 'TRY') => {
        const symbol = currencySymbols[currency] || '₺';
        return `${symbol}${(amount || 0).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    };

    // Kalem ekle
    const addQuoteItem = () => {
        setQuoteItems([...quoteItems, { description: '', quantity: 1, unit_price: 0 }]);
    };

    // Kalem sil
    const removeQuoteItem = (index) => {
        if (quoteItems.length > 1) {
            setQuoteItems(quoteItems.filter((_, i) => i !== index));
        }
    };

    // Kalem güncelle
    const updateQuoteItem = (index, field, value) => {
        const updated = [...quoteItems];
        if (field === 'quantity' || field === 'unit_price') {
            updated[index][field] = parseFloat(value) || 0;
        } else {
            updated[index][field] = value;
        }
        setQuoteItems(updated);
    };

    // Modal aç
    const openAddModal = () => {
        setEditingQuote(null); // Düzenleme modunu kapat
        setFormData({ customer_id: '', valid_days: 15, notes: '', include_kdv: true, currency: 'TRY' });
        setQuoteItems([{ description: '', quantity: 1, unit_price: 0 }]);
        setShowModal(true);
    };

    // Teklif kaydet
    const handleSave = async () => {
        if (!formData.customer_id) {
            showToast('Lütfen müşteri seçin!', 'error');
            return;
        }

        const hasValidItem = quoteItems.some(item => item.description && item.quantity > 0);
        if (!hasValidItem) {
            showToast('En az bir kalem ekleyin!', 'error');
            return;
        }

        const customer = customers.find(c => c.id === parseInt(formData.customer_id));
        const now = new Date();
        const validDate = new Date(now);
        validDate.setDate(validDate.getDate() + parseInt(formData.valid_days));

        const subtotal = calculateSubtotal(quoteItems);
        const kdvRate = parseFloat(companySettings.kdv_rate) || 20;
        const kdvAmount = formData.include_kdv ? calculateKDV(subtotal) : 0;
        const totalAmount = subtotal + kdvAmount;

        const quoteData = {
            customer_id: parseInt(formData.customer_id),
            items: quoteItems.filter(item => item.description),
            subtotal: subtotal,
            kdv_rate: kdvRate,
            kdv_amount: kdvAmount,
            total_amount: totalAmount,
            include_kdv: formData.include_kdv,
            currency: formData.currency || 'TRY',
            notes: formData.notes,
            valid_until: validDate.toISOString().split('T')[0]
        };

        try {
            if (window.api) {
                let result;
                if (editingQuote) {
                    // Düzenleme modu
                    result = await window.api.quote.update(editingQuote.id, quoteData);
                } else {
                    // Yeni teklif
                    result = await window.api.quote.create(quoteData);
                }
                
                if (result.success) {
                    // Listeyi yeniden yükle
                    const quotesResult = await window.api.quote.list();
                    if (quotesResult.success) {
                        const normalizedQuotes = quotesResult.data.map(q => ({
                            id: q.id,
                            quote_number: q.teklif_no || q.quote_number,
                            customer_id: q.musteri_id || q.customer_id,
                            firma_adi: q.firma_adi,
                            telefon: q.telefon,
                            adres: q.adres,
                            created_at: q.created_at,
                            total_amount: q.toplam_tutar || q.total_amount || 0,
                            kdv_amount: q.kdv_tutar || q.kdv_amount || 0,
                            subtotal: q.ara_toplam || q.subtotal || 0,
                            kdv_rate: q.kdv_orani || q.kdv_rate || 20,
                            currency: q.currency || 'TRY',
                            status: q.durum === 'Onaylandı' ? 'accepted' :
                                q.durum === 'Reddedildi' ? 'rejected' :
                                    q.durum === 'Gönderildi' ? 'sent' :
                                        q.durum === 'Taslak' ? 'draft' : 'draft',
                            notes: q.notlar || q.notes || '',
                            valid_until: q.valid_until || new Date(new Date(q.created_at).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            items: []
                        }));
                        setQuotes(normalizedQuotes);
                    }
                    setShowModal(false);
                    setEditingQuote(null);
                    showToast(editingQuote ? 'Teklif başarıyla güncellendi' : 'Teklif başarıyla oluşturuldu', 'success');
                } else {
                    showToast((editingQuote ? 'Teklif güncellenirken' : 'Teklif oluşturulurken') + ' hata: ' + result.error, 'error');
                }
            } else {
                // Fallback for non-Electron environment
                if (editingQuote) {
                    // Düzenleme
                    setQuotes(quotes.map(q => q.id === editingQuote.id ? {
                        ...q,
                        customer_id: parseInt(formData.customer_id),
                        firma_adi: customer?.firma_adi || '',
                        telefon: customer?.telefon || '',
                        adres: customer?.adres || '',
                        items: quoteItems.filter(item => item.description),
                        subtotal: subtotal,
                        kdv_rate: kdvRate,
                        kdv_amount: kdvAmount,
                        total_amount: totalAmount,
                        include_kdv: formData.include_kdv,
                        notes: formData.notes,
                        valid_until: validDate.toISOString().split('T')[0]
                    } : q));
                    setShowModal(false);
                    setEditingQuote(null);
                    showToast('Teklif güncellendi', 'success');
                } else {
                    const newQuote = {
                        id: Date.now(),
                        quote_number: `TKL-${now.getFullYear()}-${String(quotes.length + 1).padStart(3, '0')}`,
                        customer_id: parseInt(formData.customer_id),
                        firma_adi: customer?.firma_adi || '',
                        telefon: customer?.telefon || '',
                        adres: customer?.adres || '',
                        items: quoteItems.filter(item => item.description),
                        subtotal: subtotal,
                        kdv_rate: kdvRate,
                        kdv_amount: kdvAmount,
                        total_amount: totalAmount,
                        include_kdv: formData.include_kdv,
                        status: 'draft',
                        notes: formData.notes,
                        valid_until: validDate.toISOString().split('T')[0],
                        created_at: now.toISOString().split('T')[0]
                    };
                    setQuotes([...quotes, newQuote]);
                    setShowModal(false);
                    showToast('Teklif oluşturuldu', 'success');
                }
            }
        } catch (error) {
            console.error(editingQuote ? 'Teklif güncelleme hatası:' : 'Teklif oluşturma hatası:', error);
            showToast(editingQuote ? 'Teklif güncellenirken hata oluştu' : 'Teklif oluşturulurken hata oluştu', 'error');
        }
    };

    // Görüntüle
    const viewQuote = async (quote) => {
        try {
            let quoteWithItems = { ...quote };
            
            // Items'ları yükle eğer yoksa
            if (!quoteWithItems.items || quoteWithItems.items.length === 0) {
                if (window.api) {
                    const itemsResult = await window.api.quote.getItems(quote.id);
                    if (itemsResult.success) {
                        quoteWithItems.items = itemsResult.data;
                    }
                }
            }
            
            setSelectedQuote(quoteWithItems);
            setShowViewModal(true);
        } catch (error) {
            console.error('Teklif görüntüleme hatası:', error);
            showToast('Teklif yüklenirken hata oluştu', 'error');
        }
    };

    // Düzenle
    const editQuote = async (quote) => {
        try {
            // Önce teklif kalemlerini çekelim
            let items = [];
            if (window.api) {
                const result = await window.api.quote.getById(quote.id);
                if (result.success && result.data && result.data.items) {
                    items = result.data.items;
                }
            }

            // Geçerlilik süresini hesapla (oluşturma tarihi ile geçerlilik tarihi arasındaki fark)
            const createdDate = new Date(quote.created_at);
            const validUntilDate = new Date(quote.valid_until);
            const diffDays = Math.ceil((validUntilDate - createdDate) / (1000 * 60 * 60 * 24));

            setEditingQuote(quote);
            setFormData({
                customer_id: quote.customer_id?.toString() || '',
                valid_days: diffDays > 0 ? diffDays : 15,
                notes: quote.notes || '',
                include_kdv: quote.include_kdv !== false,
                currency: quote.currency || 'TRY'
            });

            if (items.length > 0) {
                setQuoteItems(items.map(item => ({
                    description: item.aciklama || item.description || '',
                    quantity: item.miktar || item.quantity || 1,
                    unit_price: item.birim_fiyat || item.unit_price || 0
                })));
            } else {
                setQuoteItems([{ description: '', quantity: 1, unit_price: 0 }]);
            }

            setShowModal(true);
        } catch (error) {
            console.error('Teklif düzenleme hatası:', error);
            showToast('Teklif yüklenirken hata oluştu', 'error');
        }
    };

    // Durum güncelle
    const updateStatus = async (id, newStatus) => {
        try {
            if (window.api) {
                const result = await window.api.quote.updateStatus({ id, status: newStatus });
                if (result.success) {
                    setQuotes(quotes.map(q =>
                        q.id === id ? { ...q, status: newStatus } : q
                    ));
                    showToast('Teklif durumu güncellendi', 'success');
                } else {
                    showToast('Durum güncellenirken hata oluştu', 'error');
                }
            } else {
                // Fallback for non-Electron environment
                setQuotes(quotes.map(q =>
                    q.id === id ? { ...q, status: newStatus } : q
                ));
                showToast('Teklif durumu güncellendi', 'success');
            }
        } catch (error) {
            console.error('Durum güncelleme hatası:', error);
            showToast('Durum güncellenirken hata oluştu', 'error');
        }
    };

    // WhatsApp'tan gönder
    const sendWhatsApp = async (quote) => {
        if (!quote.telefon) {
            showToast('Müşteri telefon numarası bulunamadı', 'error');
            return;
        }

        // Para birimi
        const currency = quote.currency || 'TRY';
        const symbol = currencySymbols[currency] || '₺';

        const firmaAdi = quote.firma_adi || 'Sayın Müşterimiz';
        const itemsText = quote.items.map(item =>
            `• ${item.description}: ${item.quantity} adet x ${symbol}${(item.unit_price || 0).toLocaleString('tr-TR')} = ${symbol}${((item.quantity || 0) * (item.unit_price || 0)).toLocaleString('tr-TR')}`
        ).join('\n');

        // KDV hesaplamaları
        const subtotal = quote.subtotal || quote.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);
        const kdvRate = quote.kdv_rate || parseFloat(companySettings.kdv_rate) || 20;
        const kdvAmount = quote.kdv_amount || (subtotal * kdvRate / 100);
        const totalAmount = quote.total_amount || (subtotal + kdvAmount);
        const includeKdv = quote.include_kdv !== false;

        let priceBreakdown = `💰 Ara Toplam: ${symbol}${subtotal.toLocaleString('tr-TR')}`;
        if (includeKdv) {
            priceBreakdown += `\n💰 KDV (%${kdvRate}): ${symbol}${kdvAmount.toLocaleString('tr-TR')}`;
        }
        priceBreakdown += `\n\n💰 *GENEL TOPLAM: ${symbol}${totalAmount.toLocaleString('tr-TR')}*`;

        const message = `*${quote.quote_number}*

Sayın ${firmaAdi},

${companySettings.company_name} olarak hazırladığımız teklif:

${itemsText}

${priceBreakdown}

📅 Geçerlilik: ${new Date(quote.valid_until).toLocaleDateString('tr-TR')}
${quote.notes ? `\n📝 Not: ${quote.notes}` : ''}

📞 Bilgi için: ${companySettings.phone}

${companySettings.company_name}
Marmaris`;

        const cleanPhone = quote.telefon.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('90') ? cleanPhone : '90' + cleanPhone;
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

        // Electron shell API kullan
        if (window.api && window.api.shell) {
            await window.api.shell.openExternal(whatsappUrl);
            showToast('WhatsApp açılıyor...', 'success');
        } else {
            window.open(whatsappUrl, '_blank');
        }

        // Durumu gönderildi yap
        updateStatus(quote.id, 'sent');
    };

    // PDF yazdır
    const printQuote = (quote) => {
        const printWindow = window.open('', '_blank');

        // Para birimi sembolü
        const currency = quote.currency || 'TRY';
        const symbol = currencySymbols[currency] || '₺';

        // Hesaplamaları yap
        const subtotal = quote.subtotal || quote.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);
        const kdvRate = quote.kdv_rate || parseFloat(companySettings.kdv_rate) || 20;
        const kdvAmount = quote.kdv_amount || (subtotal * kdvRate / 100);
        const totalAmount = quote.total_amount || (subtotal + kdvAmount);
        const includeKdv = quote.include_kdv !== false;

        const itemsRows = quote.items.map((item, idx) => `
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${idx + 1}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${item.description}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${symbol}${(item.unit_price || 0).toLocaleString('tr-TR', {minimumFractionDigits: 2})}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${symbol}${((item.quantity || 0) * (item.unit_price || 0)).toLocaleString('tr-TR', {minimumFractionDigits: 2})}</td>
            </tr>
        `).join('');

        // Firma bilgileri (quote'dan veya settings'den)
        const companyName = quote.company_name || companySettings.company_name;
        const companyPhone = quote.company_phone || companySettings.phone;
        const companyAddress = quote.company_address || companySettings.address;
        const companyEmail = quote.company_email || companySettings.email;
        const taxOffice = quote.tax_office || companySettings.tax_office;
        const taxNumber = quote.tax_number || companySettings.tax_number;
        const companyLogo = companySettings.logo; // Firma logosu (base64)
        const bankName = companySettings.bank_name || '';
        const iban = companySettings.iban || '';

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
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
                    .quote-box { background: #c0392b; color: white; padding: 15px 20px; text-align: center; }
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
                    @media print { body { padding: 15px; } }
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
                                📞 ${companyPhone}<br>
                                ✉️ ${companyEmail}<br>
                                📍 ${companyAddress}
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
                        <p><strong>Geçerlilik:</strong> ${new Date(quote.valid_until).toLocaleDateString('tr-TR')}</p>
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

                <div class="validity">
                    📅 Bu teklif <strong>${new Date(quote.valid_until).toLocaleDateString('tr-TR')}</strong> tarihine kadar geçerlidir.
                </div>

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
        `);

        printWindow.document.close();
        setTimeout(() => printWindow.print(), 300);
    };

    // PDF İndir
    const downloadPDF = async (quote) => {
        try {
            // Items'ları yükle
            let quoteWithItems = { ...quote };
            
            if (!quoteWithItems.items || quoteWithItems.items.length === 0) {
                const itemsResult = await window.api.quote.getItems(quote.id);
                if (itemsResult.success) {
                    quoteWithItems.items = itemsResult.data;
                }
            }
            
            // PDF indir
            const result = await window.api.quote.downloadPDF(quoteWithItems);
            if (result.success) {
                showToast('PDF başarıyla kaydedildi', 'success');
            } else if (result.error !== 'İptal edildi') {
                showToast('PDF kaydedilemedi: ' + result.error, 'danger');
            }
        } catch (error) {
            console.error('PDF indirme hatası:', error);
            showToast('PDF indirme hatası', 'danger');
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
                const result = await window.api.quote.delete(deleteId);
                if (result.success) {
                    setQuotes(quotes.filter(q => q.id !== deleteId));
                    showToast('Teklif silindi', 'success');
                } else {
                    showToast('Teklif silinirken hata: ' + result.error, 'error');
                }
            } else {
                setQuotes(quotes.filter(q => q.id !== deleteId));
                showToast('Teklif silindi', 'success');
            }
        } catch (error) {
            console.error('Teklif silme hatası:', error);
            showToast('Teklif silinirken hata oluştu', 'error');
        } finally {
            setShowDeleteModal(false);
            setDeleteId(null);
        }
    };

    // Müşteriye git
    const goToCustomer = (customerId) => {
        navigate('/customers');
    };

    // Tarihi formatla
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('tr-TR');
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
                        <Icon icon="heroicons:document-text" className="text-primary-600 text-2xl" />
                        Teklif Yönetimi
                    </h4>
                    <button
                        className="btn btn-primary-600 d-flex align-items-center gap-2"
                        onClick={openAddModal}
                    >
                        <Icon icon="heroicons:plus" className="text-xl" />
                        Yeni Teklif
                    </button>
                </div>
            </div>

            {/* İstatistik Kartları */}
            <div className="col-lg-2 col-md-4 col-sm-6">
                <div className="card h-100 radius-12 shadow-none border">
                    <div className="card-body p-16 text-center">
                        <div className="w-48-px h-48-px radius-12 bg-primary-100 d-flex justify-content-center align-items-center mx-auto mb-12">
                            <Icon icon="heroicons:document-text" className="text-primary-600 text-2xl" />
                        </div>
                        <h3 className="mb-1 text-primary-600 fw-bold">{stats.total}</h3>
                        <span className="text-secondary-light text-sm">Toplam</span>
                    </div>
                </div>
            </div>

            <div className="col-lg-2 col-md-4 col-sm-6">
                <div className="card h-100 radius-12 shadow-none border">
                    <div className="card-body p-16 text-center">
                        <div className="w-48-px h-48-px radius-12 bg-secondary-100 d-flex justify-content-center align-items-center mx-auto mb-12">
                            <Icon icon="heroicons:document" className="text-secondary-600 text-2xl" />
                        </div>
                        <h3 className="mb-1 text-secondary-600 fw-bold">{stats.draft}</h3>
                        <span className="text-secondary-light text-sm">Taslak</span>
                    </div>
                </div>
            </div>

            <div className="col-lg-2 col-md-4 col-sm-6">
                <div className="card h-100 radius-12 shadow-none border">
                    <div className="card-body p-16 text-center">
                        <div className="w-48-px h-48-px radius-12 bg-info-100 d-flex justify-content-center align-items-center mx-auto mb-12">
                            <Icon icon="heroicons:paper-airplane" className="text-info-600 text-2xl" />
                        </div>
                        <h3 className="mb-1 text-info-600 fw-bold">{stats.sent}</h3>
                        <span className="text-secondary-light text-sm">Gönderildi</span>
                    </div>
                </div>
            </div>

            <div className="col-lg-2 col-md-4 col-sm-6">
                <div className="card h-100 radius-12 shadow-none border">
                    <div className="card-body p-16 text-center">
                        <div className="w-48-px h-48-px radius-12 bg-success-100 d-flex justify-content-center align-items-center mx-auto mb-12">
                            <Icon icon="heroicons:check-circle" className="text-success-600 text-2xl" />
                        </div>
                        <h3 className="mb-1 text-success-600 fw-bold">{stats.accepted}</h3>
                        <span className="text-secondary-light text-sm">Kabul</span>
                    </div>
                </div>
            </div>

            <div className="col-lg-2 col-md-4 col-sm-6">
                <div className="card h-100 radius-12 shadow-none border">
                    <div className="card-body p-16 text-center">
                        <div className="w-48-px h-48-px radius-12 bg-danger-100 d-flex justify-content-center align-items-center mx-auto mb-12">
                            <Icon icon="heroicons:x-circle" className="text-danger-600 text-2xl" />
                        </div>
                        <h3 className="mb-1 text-danger-600 fw-bold">{stats.rejected}</h3>
                        <span className="text-secondary-light text-sm">Ret</span>
                    </div>
                </div>
            </div>

            <div className="col-lg-2 col-md-4 col-sm-6">
                <div className="card h-100 radius-12 shadow-none" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
                    <div className="card-body p-16 text-center text-white">
                        <Icon icon="heroicons:currency-dollar" className="text-3xl mb-8" />
                        <h4 className="mb-1 fw-bold">₺{stats.totalAmount.toLocaleString('tr-TR')}</h4>
                        <span className="text-white-50 text-sm">Toplam Tutar</span>
                    </div>
                </div>
            </div>

            {/* Filtreler */}
            <div className="col-12">
                <div className="card radius-12">
                    <div className="card-body p-16">
                        <div className="row g-3 align-items-end">
                            <div className="col-md-3">
                                <label className="form-label mb-2 fw-medium">Durum</label>
                                <select
                                    className="form-select"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="">Tümü</option>
                                    <option value="draft">Taslak</option>
                                    <option value="sent">Gönderildi</option>
                                    <option value="accepted">Kabul Edildi</option>
                                    <option value="rejected">Reddedildi</option>
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label mb-2 fw-medium">Başlangıç</label>
                                <DatePicker
                                    id="startDate"
                                    placeholder="Tarih seçin"
                                    value={startDate}
                                    onChange={setStartDate}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label mb-2 fw-medium">Bitiş</label>
                                <DatePicker
                                    id="endDate"
                                    placeholder="Tarih seçin"
                                    value={endDate}
                                    onChange={setEndDate}
                                />
                            </div>
                            <div className="col-md-3">
                                <button
                                    className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2"
                                    onClick={() => { setStatusFilter(''); setStartDate(''); setEndDate(''); }}
                                >
                                    <Icon icon="heroicons:x-mark" className="text-xl" />
                                    Temizle
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tablo */}
            <div className="col-12">
                <div className="card radius-12">
                    <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
                        <div className="d-flex align-items-center flex-wrap gap-3">
                            <span className="text-md fw-medium text-secondary-light mb-0">Göster</span>
                            <select
                                className="form-select form-select-sm w-auto ps-12 py-6 radius-12 h-40-px"
                                value={showCount}
                                onChange={(e) => { setShowCount(Number(e.target.value)); setCurrentPage(1); }}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                        {selectedQuoteIds.length > 0 && (
                            <button
                                onClick={() => setShowBulkDeleteModal(true)}
                                className="btn btn-danger text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2"
                            >
                                <Icon icon="fluent:delete-24-regular" className="icon text-xl line-height-1" />
                                Seçilenleri Sil ({selectedQuoteIds.length})
                            </button>
                        )}
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead>
                                    <tr>
                                        <th className="px-20 py-16 bg-primary-50 text-primary-600">
                                            <div className="form-check">
                                                <input 
                                                    className="form-check-input" 
                                                    type="checkbox"
                                                    checked={paginatedQuotes.length > 0 && selectedQuoteIds.length === paginatedQuotes.length}
                                                    onChange={toggleSelectAll}
                                                />
                                            </div>
                                        </th>
                                        <th className="px-20 py-16 bg-primary-50 text-primary-600">Teklif No</th>
                                        <th className="px-20 py-16 bg-primary-50 text-primary-600">Müşteri</th>
                                        <th className="px-20 py-16 bg-primary-50 text-primary-600 text-end">Toplam</th>
                                        <th className="px-20 py-16 bg-primary-50 text-primary-600 text-center">Durum</th>
                                        <th className="px-20 py-16 bg-primary-50 text-primary-600">Tarih</th>
                                        <th className="px-20 py-16 bg-primary-50 text-primary-600">Geçerlilik</th>
                                        <th className="px-20 py-16 bg-primary-50 text-primary-600 text-center">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedQuotes.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="text-center py-40">
                                                <div className="d-flex flex-column align-items-center gap-3">
                                                    <Icon icon="heroicons:document-text" className="text-secondary-light" style={{ fontSize: '64px' }} />
                                                    <div>
                                                        <h6 className="text-secondary-light mb-1">Teklif bulunamadı</h6>
                                                        <p className="text-secondary-light mb-0">Yeni teklif oluşturmak için butonu kullanın</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedQuotes.map((quote, index) => {
                                            const statusConfig = getStatusConfig(quote.status);
                                            return (
                                                <tr key={`quote-${quote.id || index}`} className={selectedQuoteIds.includes(quote.id) ? 'bg-primary-50' : ''}>
                                                    <td className="px-20 py-16">
                                                        <div className="form-check">
                                                            <input 
                                                                className="form-check-input" 
                                                                type="checkbox"
                                                                checked={selectedQuoteIds.includes(quote.id)}
                                                                onChange={() => toggleSelectQuote(quote.id)}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-20 py-16">
                                                        <span className="fw-bold text-primary-600">{quote.quote_number}</span>
                                                    </td>
                                                    <td className="px-20 py-16">
                                                        <button
                                                            className="btn btn-link p-0 text-start text-decoration-none"
                                                            onClick={() => goToCustomer(quote.customer_id)}
                                                        >
                                                            <span className="fw-medium text-primary-light hover-text-primary-600">
                                                                {quote.firma_adi}
                                                            </span>
                                                        </button>
                                                    </td>
                                                    <td className="px-20 py-16 text-end">
                                                        <span className="fw-bold">{currencySymbols[quote.currency] || '₺'}{quote.total_amount.toLocaleString('tr-TR')}</span>
                                                    </td>
                                                    <td className="px-20 py-16 text-center">
                                                        <span className={`badge ${statusConfig.bg} ${statusConfig.text} px-12 py-8 radius-8 d-inline-flex align-items-center gap-1`}>
                                                            <Icon icon={statusConfig.icon} className="text-sm" />
                                                            {statusConfig.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-20 py-16">{formatDate(quote.created_at)}</td>
                                                    <td className="px-20 py-16">
                                                        <span className={new Date(quote.valid_until) < new Date() ? 'text-danger-600' : ''}>
                                                            {formatDate(quote.valid_until)}
                                                        </span>
                                                    </td>
                                                    <td className="px-20 py-16">
                                                        <div className="d-flex justify-content-center gap-1 flex-wrap">
                                                            <button
                                                                className="btn btn-sm btn-outline-primary d-flex align-items-center"
                                                                onClick={() => viewQuote(quote)}
                                                                title="Görüntüle"
                                                            >
                                                                <Icon icon="heroicons:eye" />
                                                            </button>
                                                            {/* Düzenleme butonu - taslak veya gönderildi ise */}
                                                            {(quote.status === 'draft' || quote.status === 'sent') && (
                                                                <button
                                                                    className="btn btn-sm btn-outline-warning d-flex align-items-center"
                                                                    onClick={() => editQuote(quote)}
                                                                    title="Düzenle"
                                                                >
                                                                    <Icon icon="heroicons:pencil-square" />
                                                                </button>
                                                            )}
                                                            <button
                                                                className="btn btn-sm btn-outline-info d-flex align-items-center"
                                                                onClick={() => printQuote(quote)}
                                                                title="Yazdır"
                                                            >
                                                                <Icon icon="heroicons:printer" />
                                                            </button>
                                                            <button
                                                                className="btn btn-sm btn-outline-secondary d-flex align-items-center"
                                                                onClick={() => downloadPDF(quote)}
                                                                title="PDF İndir"
                                                            >
                                                                <Icon icon="heroicons:arrow-down-tray" />
                                                            </button>
                                                            <button
                                                                className="btn btn-sm btn-outline-success d-flex align-items-center"
                                                                onClick={() => sendWhatsApp(quote)}
                                                                title="WhatsApp"
                                                            >
                                                                <Icon icon="mdi:whatsapp" />
                                                            </button>
                                                            {quote.status === 'draft' && (
                                                                <button
                                                                    className="btn btn-sm btn-primary d-flex align-items-center"
                                                                    onClick={() => updateStatus(quote.id, 'sent')}
                                                                    title="Gönderildi Olarak İşaretle"
                                                                >
                                                                    <Icon icon="heroicons:paper-airplane" />
                                                                </button>
                                                            )}
                                                            {quote.status === 'sent' && (
                                                                <button
                                                                    className="btn btn-sm btn-outline-secondary d-flex align-items-center"
                                                                    onClick={() => updateStatus(quote.id, 'draft')}
                                                                    title="Taslağa Çevir"
                                                                >
                                                                    <Icon icon="heroicons:arrow-uturn-left" />
                                                                </button>
                                                            )}
                                                            {(quote.status === 'draft' || quote.status === 'sent') && (
                                                                <button
                                                                    className="btn btn-sm btn-success d-flex align-items-center"
                                                                    onClick={() => updateStatus(quote.id, 'accepted')}
                                                                    title="Kabul Edildi"
                                                                >
                                                                    <Icon icon="heroicons:check" />
                                                                </button>
                                                            )}
                                                            {/* Sözleşme Oluştur - sadece kabul edilen teklifler için */}
                                                            {quote.status === 'accepted' && (
                                                                <button
                                                                    className="btn btn-sm btn-info d-flex align-items-center"
                                                                    onClick={() => navigate(`/contracts?quoteId=${quote.id}`)}
                                                                    title="Sözleşme Oluştur"
                                                                >
                                                                    <Icon icon="heroicons:document-text" />
                                                                </button>
                                                            )}
                                                            <button
                                                                className="btn btn-sm btn-outline-danger d-flex align-items-center"
                                                                onClick={() => confirmDelete(quote.id)}
                                                                title="Sil"
                                                            >
                                                                <Icon icon="heroicons:trash" />
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
                        {/* Pagination */}
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 p-24 border-top">
                            <span>Toplam {quotes.length} kayıttan {filteredQuotes.length} tanesi gösteriliyor (Sayfa {currentPage}/{totalPages || 1})</span>
                            <ul className="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center mb-0">
                                <li className="page-item">
                                    <button
                                        className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px text-md"
                                        onClick={() => goToPage(1)}
                                        disabled={currentPage === 1}
                                    >
                                        <Icon icon="ep:d-arrow-left" />
                                    </button>
                                </li>
                                <li className="page-item">
                                    <button
                                        className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px text-md"
                                        onClick={() => goToPage(currentPage - 1)}
                                        disabled={currentPage === 1}
                                    >
                                        <Icon icon="ep:arrow-left" />
                                    </button>
                                </li>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = currentPage - 2 + i;
                                    }
                                    return (
                                        <li key={pageNum} className="page-item">
                                            <button
                                                className={`page-link fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md ${currentPage === pageNum ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-secondary-light'}`}
                                                onClick={() => goToPage(pageNum)}
                                            >
                                                {pageNum}
                                            </button>
                                        </li>
                                    );
                                })}
                                <li className="page-item">
                                    <button
                                        className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px text-md"
                                        onClick={() => goToPage(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                    >
                                        <Icon icon="ep:arrow-right" />
                                    </button>
                                </li>
                                <li className="page-item">
                                    <button
                                        className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px text-md"
                                        onClick={() => goToPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                    >
                                        <Icon icon="ep:d-arrow-right" />
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toplu Silme Modal */}
            {showBulkDeleteModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content radius-16">
                            <div className="modal-header py-16 px-24 border-bottom">
                                <h6 className="modal-title fw-semibold text-danger-600">
                                    <Icon icon="fluent:warning-24-filled" className="me-2" />
                                    Toplu Silme Onayı
                                </h6>
                                <button type="button" className="btn-close" onClick={() => setShowBulkDeleteModal(false)}></button>
                            </div>
                            <div className="modal-body p-24 text-center">
                                <Icon icon="fluent:delete-24-regular" className="text-danger-600 mb-16" style={{ fontSize: '48px' }} />
                                <p className="text-secondary-light mb-0">
                                    <strong>{selectedQuoteIds.length}</strong> teklifi silmek istediğinize emin misiniz?
                                </p>
                                <p className="text-warning-600 text-sm mt-8">
                                    Bu işlem geri alınamaz.
                                </p>
                            </div>
                            <div className="modal-footer py-16 px-24 border-top">
                                <button
                                    type="button"
                                    className="btn btn-secondary-600 radius-8"
                                    onClick={() => setShowBulkDeleteModal(false)}
                                >
                                    İptal
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger-600 radius-8"
                                    onClick={handleBulkDelete}
                                >
                                    <Icon icon="fluent:delete-24-regular" className="me-2" />
                                    {selectedQuoteIds.length} Teklifi Sil
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Yeni Teklif Modal */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content radius-12">
                            <div className="modal-header border-bottom py-16 px-24">
                                <h5 className="modal-title d-flex align-items-center gap-2">
                                    <Icon icon={editingQuote ? "heroicons:pencil-square" : "heroicons:plus-circle"} className="text-primary-600" />
                                    {editingQuote ? `Teklif Düzenle: ${editingQuote.quote_number}` : 'Yeni Teklif Oluştur'}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => { setShowModal(false); setEditingQuote(null); }}
                                />
                            </div>
                            <div className="modal-body p-24">
                                <div className="row g-3 mb-20">
                                    <div className="col-md-6">
                                        <label className="form-label fw-medium">Müşteri *</label>
                                        <select
                                            className="form-select"
                                            value={formData.customer_id}
                                            onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                                        >
                                            <option value="">Müşteri Seçin</option>
                                            {customers.map(c => (
                                                <option key={c.id} value={c.id}>{c.firma_adi}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label fw-medium">Geçerlilik Süresi</label>
                                        <select
                                            className="form-select"
                                            value={formData.valid_days}
                                            onChange={(e) => setFormData({ ...formData, valid_days: e.target.value })}
                                        >
                                            <option value="7">7 Gün</option>
                                            <option value="15">15 Gün</option>
                                            <option value="30">30 Gün</option>
                                        </select>
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label fw-medium">Para Birimi</label>
                                        <select
                                            className="form-select"
                                            value={formData.currency}
                                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        >
                                            <option value="TRY">₺ Türk Lirası</option>
                                            <option value="USD">$ Dolar</option>
                                            <option value="EUR">€ Euro</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Teklif Kalemleri */}
                                <div className="mb-20">
                                    <div className="d-flex justify-content-between align-items-center mb-12">
                                        <h6 className="mb-0 fw-bold">Teklif Kalemleri</h6>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                                            onClick={addQuoteItem}
                                        >
                                            <Icon icon="heroicons:plus" />
                                            Kalem Ekle
                                        </button>
                                    </div>

                                    <div className="table-responsive">
                                        <table className="table table-bordered mb-0">
                                            <thead className="bg-light">
                                                <tr>
                                                    <th style={{ width: '50%' }}>Açıklama</th>
                                                    <th style={{ width: '15%' }}>Adet</th>
                                                    <th style={{ width: '20%' }}>Birim Fiyat ({currencySymbols[formData.currency]})</th>
                                                    <th style={{ width: '15%' }} className="text-center"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {quoteItems.map((item, index) => (
                                                    <tr key={index}>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                className="form-control form-control-sm"
                                                                placeholder="örn: 6kg KKT dolumu"
                                                                value={item.description}
                                                                onChange={(e) => updateQuoteItem(index, 'description', e.target.value)}
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                className="form-control form-control-sm"
                                                                min="1"
                                                                value={item.quantity}
                                                                onChange={(e) => updateQuoteItem(index, 'quantity', e.target.value)}
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                className="form-control form-control-sm"
                                                                min="0"
                                                                step="0.01"
                                                                value={item.unit_price}
                                                                onChange={(e) => updateQuoteItem(index, 'unit_price', e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="text-center">
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-danger"
                                                                onClick={() => removeQuoteItem(index)}
                                                                disabled={quoteItems.length === 1}
                                                            >
                                                                <Icon icon="heroicons:x-mark" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Toplam ve KDV Hesaplaması */}
                                    <div className="mt-12 p-16 bg-primary-50 radius-8">
                                        <div className="d-flex justify-content-between align-items-center mb-8">
                                            <span className="text-secondary-light">Ara Toplam:</span>
                                            <span className="fw-medium">
                                                {currencySymbols[formData.currency]}{calculateSubtotal(quoteItems).toLocaleString('tr-TR', {minimumFractionDigits: 2})}
                                            </span>
                                        </div>
                                        
                                        {/* KDV Seçeneği */}
                                        <div className="d-flex justify-content-between align-items-center mb-8 pb-8 border-bottom">
                                            <div className="form-check">
                                                <input 
                                                    type="checkbox" 
                                                    className="form-check-input" 
                                                    id="includeKdv"
                                                    checked={formData.include_kdv}
                                                    onChange={(e) => setFormData({ ...formData, include_kdv: e.target.checked })}
                                                />
                                                <label className="form-check-label" htmlFor="includeKdv">
                                                    KDV Ekle (%{companySettings.kdv_rate})
                                                </label>
                                            </div>
                                            <span className={`fw-medium ${!formData.include_kdv ? 'text-secondary-light' : ''}`}>
                                                {formData.include_kdv 
                                                    ? `${currencySymbols[formData.currency]}${calculateKDV(calculateSubtotal(quoteItems)).toLocaleString('tr-TR', {minimumFractionDigits: 2})}`
                                                    : `${currencySymbols[formData.currency]}0.00`
                                                }
                                            </span>
                                        </div>

                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="fw-bold text-lg">Genel Toplam:</span>
                                            <span className="fw-bold text-primary-600 text-xl">
                                                {currencySymbols[formData.currency]}{calculateTotal(quoteItems).toLocaleString('tr-TR', {minimumFractionDigits: 2})}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="form-label fw-medium">Notlar</label>
                                    <textarea
                                        className="form-control"
                                        rows="2"
                                        placeholder="Teklif notları..."
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    />
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
                                    Teklif Oluştur
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Görüntüle Modal */}
            {showViewModal && selectedQuote && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content radius-12">
                            <div className="modal-header border-bottom py-16 px-24">
                                <h5 className="modal-title d-flex align-items-center gap-2">
                                    <Icon icon="heroicons:document-text" className="text-primary-600" />
                                    {selectedQuote.quote_number}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowViewModal(false)}
                                />
                            </div>
                            <div className="modal-body p-24">
                                {/* Müşteri Bilgisi */}
                                <div className="bg-light radius-8 p-16 mb-20">
                                    <div className="row">
                                        <div className="col-md-6">
                                            <p className="mb-1 text-secondary-light">Müşteri</p>
                                            <h6 className="mb-0 fw-bold">{selectedQuote.firma_adi}</h6>
                                        </div>
                                        <div className="col-md-3">
                                            <p className="mb-1 text-secondary-light">Tarih</p>
                                            <h6 className="mb-0">{formatDate(selectedQuote.created_at)}</h6>
                                        </div>
                                        <div className="col-md-3">
                                            <p className="mb-1 text-secondary-light">Geçerlilik</p>
                                            <h6 className="mb-0">{formatDate(selectedQuote.valid_until)}</h6>
                                        </div>
                                    </div>
                                </div>

                                {/* Kalemler */}
                                <div className="table-responsive mb-20">
                                    <table className="table table-bordered mb-0">
                                        <thead className="bg-primary-50">
                                            <tr>
                                                <th>Açıklama</th>
                                                <th className="text-center" style={{ width: '100px' }}>Adet</th>
                                                <th className="text-end" style={{ width: '130px' }}>Birim Fiyat</th>
                                                <th className="text-end" style={{ width: '130px' }}>Toplam</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedQuote.items.map((item, index) => (
                                                <tr key={index}>
                                                    <td>{item.description}</td>
                                                    <td className="text-center">{item.quantity}</td>
                                                    <td className="text-end">{currencySymbols[selectedQuote.currency] || '₺'}{(item.unit_price || 0).toLocaleString('tr-TR', {minimumFractionDigits: 2})}</td>
                                                    <td className="text-end fw-medium">{currencySymbols[selectedQuote.currency] || '₺'}{((item.quantity || 0) * (item.unit_price || 0)).toLocaleString('tr-TR', {minimumFractionDigits: 2})}</td>
                                                </tr>
                                            ))}
                                            {/* Ara Toplam */}
                                            <tr className="bg-light">
                                                <td colSpan="3" className="text-end">Ara Toplam:</td>
                                                <td className="text-end">
                                                    {currencySymbols[selectedQuote.currency] || '₺'}{(selectedQuote.subtotal || selectedQuote.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0)).toLocaleString('tr-TR', {minimumFractionDigits: 2})}
                                                </td>
                                            </tr>
                                            {/* KDV */}
                                            {selectedQuote.include_kdv !== false && (
                                                <tr className="bg-warning-50">
                                                    <td colSpan="3" className="text-end">
                                                        KDV (%{selectedQuote.kdv_rate || companySettings.kdv_rate}):
                                                    </td>
                                                    <td className="text-end">
                                                        {currencySymbols[selectedQuote.currency] || '₺'}{(selectedQuote.kdv_amount || 0).toLocaleString('tr-TR', {minimumFractionDigits: 2})}
                                                    </td>
                                                </tr>
                                            )}
                                            {/* Genel Toplam */}
                                            <tr className="bg-primary-50">
                                                <td colSpan="3" className="text-end fw-bold">GENEL TOPLAM:</td>
                                                <td className="text-end fw-bold text-primary-600">{currencySymbols[selectedQuote.currency] || '₺'}{(selectedQuote.total_amount || 0).toLocaleString('tr-TR', {minimumFractionDigits: 2})}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Not */}
                                {selectedQuote.notes && (
                                    <div className="bg-warning-50 radius-8 p-12">
                                        <strong>Not:</strong> {selectedQuote.notes}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer border-top py-16 px-24">
                                <button
                                    className="btn btn-outline-success d-flex align-items-center gap-2"
                                    onClick={() => { sendWhatsApp(selectedQuote); setShowViewModal(false); }}
                                >
                                    <Icon icon="mdi:whatsapp" />
                                    WhatsApp
                                </button>
                                <button
                                    className="btn btn-outline-primary d-flex align-items-center gap-2"
                                    onClick={() => { printQuote(selectedQuote); }}
                                >
                                    <Icon icon="heroicons:printer" />
                                    Yazdır
                                </button>
                                <button
                                    className="btn btn-outline-secondary d-flex align-items-center gap-2"
                                    onClick={() => downloadPDF(selectedQuote)}
                                >
                                    <Icon icon="heroicons:arrow-down-tray" />
                                    PDF İndir
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowViewModal(false)}
                                >
                                    Kapat
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
                                <h5 className="mb-8">Teklifi Sil?</h5>
                                <p className="text-secondary-light mb-24">
                                    Bu teklifi silmek istediğinize emin misiniz?
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
        </div>
    );
};

export default QuotesLayer;
