import { Icon } from '@iconify/react/dist/iconify.js';
import React, { useState, useEffect } from 'react';

const CustomersLayer = () => {
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCount, setShowCount] = useState(10);
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerTubes, setCustomerTubes] = useState([]);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    
    // Toplu seçim state
    const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
    
    const [formData, setFormData] = useState({
        firma_adi: '',
        yetkili: '',
        telefon: '',
        email: '',
        adres: '',
        notlar: ''
    });
    const [loading, setLoading] = useState(true);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');
    
    // Firma ayarları
    const [companySettings, setCompanySettings] = useState({
        company_name: '',
        phone: '',
        address: ''
    });

    // Veritabanından müşterileri çek
    useEffect(() => {
        fetchCustomers();
        fetchCompanySettings();
    }, []);

    const fetchCompanySettings = async () => {
        try {
            if (window.api && window.api.settings) {
                const result = await window.api.settings.get();
                if (result.success && result.data) {
                    setCompanySettings({
                        company_name: result.data.company_name || '',
                        phone: result.data.phone || '',
                        address: result.data.address || ''
                    });
                }
            }
        } catch (error) {
            console.error('Firma ayarları çekilemedi:', error);
        }
    };

    const displayToast = (message, type = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const fetchCustomers = async () => {
        try {
            if (window.api) {
                const result = await window.api.customer.list();
                if (result.success) {
                    const customersData = result.data.map(c => ({
                        ...c,
                        tubeCount: c.tup_sayisi || 0,
                        status: c.durum === 'Aktif' ? 'active' : 'inactive'
                    }));
                    setCustomers(customersData);
                    setFilteredCustomers(customersData);
                }
            }
        } catch (error) {
            console.error('Müşteri çekme hatası:', error);
        } finally {
            setLoading(false);
        }
    };

    // Müşterinin tüplerini çek
    const fetchCustomerTubes = async (customerId) => {
        try {
            if (window.api) {
                const result = await window.api.tube.getByCustomer(customerId);
                if (result.success) {
                    setCustomerTubes(result.data);
                }
            }
        } catch (error) {
            console.error('Tüp çekme hatası:', error);
            setCustomerTubes([]);
        }
    };

    // Tüp durumu hesaplama
    const getTubeStatus = (sonKullanim) => {
        const today = new Date();
        const expDate = new Date(sonKullanim);
        const diffTime = expDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return { status: 'expired', label: 'Süresi Dolmuş', class: 'bg-danger-focus text-danger-main', days: Math.abs(diffDays) + ' gün geçti' };
        } else if (diffDays <= 30) {
            return { status: 'warning', label: 'Yaklaşıyor', class: 'bg-warning-focus text-warning-main', days: diffDays + ' gün kaldı' };
        } else {
            return { status: 'active', label: 'Normal', class: 'bg-success-focus text-success-main', days: diffDays + ' gün kaldı' };
        }
    };

    // Tarih formatla
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('tr-TR');
    };

    // Arama ve filtreleme
    useEffect(() => {
        let filtered = customers;

        // Arama filtresi
        if (searchTerm) {
            filtered = filtered.filter(customer =>
                customer.firma_adi.toLowerCase().includes(searchTerm.toLowerCase()) ||
                customer.firma_adi.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (customer.yetkili && customer.yetkili.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (customer.telefon && customer.telefon.includes(searchTerm))
            );
        }

        // Durum filtresi
        if (selectedStatus !== 'all') {
            filtered = filtered.filter(c => c.status === selectedStatus);
        }

        setFilteredCustomers(filtered);
        setCurrentPage(1); // Filtreleme değişince sayfa 1'e dön
        setSelectedCustomerIds([]); // Seçimleri temizle
    }, [searchTerm, customers, selectedStatus]);

    // Pagination hesaplamaları
    const totalPages = Math.ceil(filteredCustomers.length / showCount);
    const startIndex = (currentPage - 1) * showCount;
    const endIndex = startIndex + showCount;
    const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

    // Sayfa değiştirme
    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setSelectedCustomerIds([]); // Sayfa değişince seçimleri temizle
        }
    };

    // Toplu seçim fonksiyonları
    const toggleSelectCustomer = (customerId) => {
        setSelectedCustomerIds(prev => {
            if (prev.includes(customerId)) {
                return prev.filter(id => id !== customerId);
            } else {
                return [...prev, customerId];
            }
        });
    };

    const toggleSelectAll = () => {
        if (selectedCustomerIds.length === paginatedCustomers.length) {
            setSelectedCustomerIds([]);
        } else {
            setSelectedCustomerIds(paginatedCustomers.map(c => c.id));
        }
    };

    // Toplu silme
    const handleBulkDelete = async () => {
        try {
            if (window.api && selectedCustomerIds.length > 0) {
                let successCount = 0;
                let failedCount = 0;
                let relationErrors = [];

                for (const customerId of selectedCustomerIds) {
                    const result = await window.api.customer.delete(customerId);
                    if (result.success) {
                        successCount++;
                    } else if (result.hasRelations) {
                        failedCount++;
                        const customer = customers.find(c => c.id === customerId);
                        relationErrors.push(customer?.firma_adi || 'Bilinmeyen');
                    } else {
                        failedCount++;
                    }
                }

                await fetchCustomers();
                setSelectedCustomerIds([]);
                setIsBulkDeleteModalOpen(false);

                if (relationErrors.length > 0) {
                    displayToast(`${successCount} müşteri silindi, ${failedCount} müşteri bağlı kayıtlar nedeniyle silinemedi`, 'warning');
                } else {
                    displayToast(`${successCount} müşteri başarıyla silindi`, 'success');
                }
            }
        } catch (error) {
            console.error('Toplu silme hatası:', error);
            displayToast('Toplu silme işlemi sırasında hata oluştu', 'danger');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const openAddModal = () => {
        setSelectedCustomer(null);
        setFormData({
            firma_adi: '',
            yetkili: '',
            telefon: '',
            email: '',
            adres: '',
            notlar: ''
        });
        setIsModalOpen(true);
    };

    const openEditModal = (customer) => {
        setSelectedCustomer(customer);
        setFormData({
            firma_adi: customer.firma_adi || '',
            yetkili: customer.yetkili || '',
            telefon: customer.telefon || '',
            email: customer.email || '',
            adres: customer.adres || '',
            notlar: customer.notlar || ''
        });
        setIsModalOpen(true);
    };


    const openDeleteModal = (customer) => {
        setSelectedCustomer(customer);
        setIsDeleteModalOpen(true);
    };

    const openViewModal = async (customer) => {
        setSelectedCustomer(customer);
        await fetchCustomerTubes(customer.id);
        setIsViewModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedCustomer) {
                // Güncelleme - id'yi formData içine ekle
                if (window.api) {
                    const updateData = { ...formData, id: selectedCustomer.id };
                    const result = await window.api.customer.update(updateData);
                    if (result.success) {
                        await fetchCustomers();
                        displayToast('Müşteri başarıyla güncellendi', 'success');
                    } else {
                        displayToast('Kayıt sırasında bir hata oluştu', 'danger');
                    }
                }
            } else {
                // Yeni ekleme
                if (window.api) {
                    const result = await window.api.customer.add(formData);
                    if (result.success) {
                        await fetchCustomers();
                        displayToast('Yeni müşteri başarıyla eklendi', 'success');
                    } else {
                        displayToast('Kayıt sırasında bir hata oluştu', 'danger');
                    }
                }
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Kayıt hatası:', error);
            displayToast('Kayıt sırasında teknik bir hata oluştu', 'danger');
        }
    };

    const handleDelete = async () => {
        try {
            if (window.api && selectedCustomer) {
                const result = await window.api.customer.delete(selectedCustomer.id);
                if (result.success) {
                    await fetchCustomers();
                    displayToast('Müşteri kaydı silindi', 'success');
                } else if (result.hasRelations) {
                    // Bağlı kayıtlar var
                    const { tubes, quotes, certificates } = result.relations;
                    let msg = 'Bu müşteriye bağlı kayıtlar var:\n';
                    if (tubes > 0) msg += `• ${tubes} adet tüp\n`;
                    if (quotes > 0) msg += `• ${quotes} adet teklif\n`;
                    if (certificates > 0) msg += `• ${certificates} adet sertifika\n`;
                    msg += '\nÖnce bu kayıtları silmeniz gerekiyor.';
                    displayToast(msg, 'warning');
                } else {
                    displayToast(result.error || 'Müşteri silinirken bir hata oluştu', 'danger');
                }
            }
            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error('Silme hatası:', error);
            displayToast('Silme işlemi sırasında teknik bir hata oluştu', 'danger');
        }
    };

    // WhatsApp - Müşteri durumuna göre otomatik mesaj (Electron shell API)
    const handleWhatsApp = async (customer) => {
        if (!customer.telefon) {
            displayToast('Bu müşterinin telefon numarası kayıtlı değil!', 'warning');
            return;
        }
        
        const cleanPhone = customer.telefon.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('90') ? cleanPhone : '90' + cleanPhone;
        
        let message = '';
        const tubeCount = customer.tube_count || 0;
        const firmaAdi = customer.firma_adi || 'Sayın Müşterimiz';
        
        // Firma bilgilerini ayarlardan al
        const firmName = companySettings.company_name || 'Firma';
        const firmPhone = companySettings.phone || '';
        const firmCity = companySettings.address ? companySettings.address.split('/').pop()?.split(',').pop()?.trim() || '' : '';
        
        // Duruma göre mesaj belirle
        switch (customer.status) {
            case 'expired':
                message = `Sayın ${firmaAdi},

${firmName} olarak sizinle iletişime geçiyoruz.

🔴 Firmanıza ait ${tubeCount} adet yangın tüpünün dolum süresi DOLMUŞTUR.

Güvenliğiniz için tüplerinizin acil olarak yenilenmesi gerekmektedir.

📞 Randevu ve bilgi için: ${firmPhone}

${firmName}${firmCity ? '\n' + firmCity : ''}`;
                break;
            case 'warning':
                message = `Sayın ${firmaAdi},

${firmName} olarak sizinle iletişime geçiyoruz.

⚠️ Firmanıza ait ${tubeCount} adet yangın tüpünün dolum süresi yaklaşmaktadır.

Süresi dolmadan önce yenileme randevusu almanızı öneriyoruz.

📞 Randevu ve bilgi için: ${firmPhone}

${firmName}${firmCity ? '\n' + firmCity : ''}`;
                break;
            case 'active':
                message = `Sayın ${firmaAdi},

${firmName} olarak sizinle iletişime geçiyoruz.

✅ Firmanıza ait ${tubeCount} adet yangın tüpü kaydınız bulunmaktadır.

Herhangi bir soru veya talebiniz için bize ulaşabilirsiniz.

📞 İletişim: ${firmPhone}

${firmName}${firmCity ? '\n' + firmCity : ''}`;
                break;
            default:
                message = `Sayın ${firmaAdi},

${firmName} olarak sizinle iletişime geçmek istiyoruz.

Yangın tüpü dolum, bakım ve kontrol hizmetlerimiz hakkında bilgi almak ister misiniz?

📞 İletişim: ${firmPhone}

${firmName}${firmCity ? '\n' + firmCity : ''}`;
        }
        
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
        
        // Electron shell API kullan
        if (window.api && window.api.shell) {
            await window.api.shell.openExternal(whatsappUrl);
            displayToast('WhatsApp açılıyor...', 'success');
        } else {
            window.open(whatsappUrl, '_blank');
        }
    };

    // Durum badge'i
    const getStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <span className="bg-success-focus text-success-600 border border-success-main px-24 py-4 radius-4 fw-medium text-sm">Aktif</span>;
            case 'warning':
                return <span className="bg-warning-focus text-warning-600 border border-warning-main px-24 py-4 radius-4 fw-medium text-sm">Dikkat</span>;
            case 'expired':
                return <span className="bg-danger-focus text-danger-600 border border-danger-main px-24 py-4 radius-4 fw-medium text-sm">Süresi Dolmuş</span>;
            case 'inactive':
                return <span className="bg-neutral-200 text-neutral-600 border border-neutral-400 px-24 py-4 radius-4 fw-medium text-sm">Pasif</span>;
            default:
                return <span className="bg-neutral-200 text-neutral-600 border border-neutral-400 px-24 py-4 radius-4 fw-medium text-sm">-</span>;
        }
    };

    return (
        <>
            <div className="card h-100 p-0 radius-12">
                <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
                    <div className="d-flex align-items-center flex-wrap gap-3">
                        <span className="text-md fw-medium text-secondary-light mb-0">Göster</span>
                        <select
                            className="form-select form-select-sm w-auto ps-12 py-6 radius-12 h-40-px"
                            value={showCount}
                            onChange={(e) => setShowCount(Number(e.target.value))}
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <form className="navbar-search">
                            <input
                                type="text"
                                className="bg-base h-40-px w-auto"
                                name="search"
                                placeholder="Müşteri Ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Icon icon="ion:search-outline" className="icon" />
                        </form>
                        <select
                            className="form-select form-select-sm w-auto ps-12 py-6 radius-12 h-40-px"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                            <option value="all">Tüm Durumlar</option>
                            <option value="active">Aktif</option>
                            <option value="warning">Dikkat</option>
                            <option value="expired">Süresi Dolmuş</option>
                            <option value="inactive">Pasif</option>
                        </select>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        {selectedCustomerIds.length > 0 && (
                            <button
                                onClick={() => setIsBulkDeleteModalOpen(true)}
                                className="btn btn-danger text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2"
                            >
                                <Icon icon="fluent:delete-24-regular" className="icon text-xl line-height-1" />
                                Seçilenleri Sil ({selectedCustomerIds.length})
                            </button>
                        )}
                        <button
                            onClick={openAddModal}
                            className="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2"
                        >
                            <Icon icon="ic:baseline-plus" className="icon text-xl line-height-1" />
                            Yeni Müşteri
                        </button>
                    </div>
                </div>
                <div className="card-body p-24">
                    <div className="table-responsive scroll-sm">
                        <table className="table bordered-table sm-table mb-0">
                            <thead>
                                <tr>
                                    <th scope="col">
                                        <div className="d-flex align-items-center gap-10">
                                            <div className="form-check style-check d-flex align-items-center">
                                                <input 
                                                    className="form-check-input radius-4 border input-form-dark" 
                                                    type="checkbox" 
                                                    id="selectAll"
                                                    checked={paginatedCustomers.length > 0 && selectedCustomerIds.length === paginatedCustomers.length}
                                                    onChange={toggleSelectAll}
                                                />
                                            </div>
                                            S.N
                                        </div>
                                    </th>
                                    <th scope="col">Firma Adı</th>
                                    <th scope="col">Yetkili</th>
                                    <th scope="col">Telefon</th>
                                    <th scope="col" className="text-center">Tüp Sayısı</th>
                                    <th scope="col" className="text-center">Durum</th>
                                    <th scope="col" className="text-center">İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-4">
                                            <div className="spinner-border text-primary" role="status">
                                                <span className="visually-hidden">Yükleniyor...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedCustomers.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-4">
                                            <span className="text-secondary-light">Kayıt bulunamadı</span>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedCustomers.map((customer, index) => (
                                        <tr key={customer.id} className={selectedCustomerIds.includes(customer.id) ? 'bg-primary-50' : ''}>
                                            <td>
                                                <div className="d-flex align-items-center gap-10">
                                                    <div className="form-check style-check d-flex align-items-center">
                                                        <input 
                                                            className="form-check-input radius-4 border border-neutral-400" 
                                                            type="checkbox"
                                                            checked={selectedCustomerIds.includes(customer.id)}
                                                            onChange={() => toggleSelectCustomer(customer.id)}
                                                        />
                                                    </div>
                                                    {String(startIndex + index + 1).padStart(2, '0')}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <div className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden bg-primary-50 d-flex align-items-center justify-content-center">
                                                        <span className="text-primary-600 fw-semibold text-sm">
                                                            {customer.firma_adi.substring(0, 2).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <span className="text-md mb-0 fw-normal text-secondary-light">{customer.firma_adi}</span>
                                                        {customer.email && (
                                                            <span className="d-block text-sm text-secondary-light">{customer.email}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="text-md mb-0 fw-normal text-secondary-light">{customer.yetkili || '-'}</span>
                                            </td>
                                            <td>
                                                <span className="text-md mb-0 fw-normal text-secondary-light">{customer.telefon || '-'}</span>
                                            </td>
                                            <td className="text-center">
                                                <span className="bg-primary-50 text-primary-600 border border-primary-main px-16 py-4 radius-4 fw-medium text-sm">{customer.tubeCount}</span>
                                            </td>
                                            <td className="text-center">{getStatusBadge(customer.status)}</td>
                                            <td className="text-center">
                                                <div className="d-flex align-items-center gap-10 justify-content-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => openViewModal(customer)}
                                                        className="bg-info-focus bg-hover-info-200 text-info-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                                                    >
                                                        <Icon icon="majesticons:eye-line" className="icon text-xl" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(customer)}
                                                        className="bg-success-focus text-success-600 bg-hover-success-200 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                                                    >
                                                        <Icon icon="lucide:edit" className="menu-icon" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openDeleteModal(customer)}
                                                        className="remove-item-btn bg-danger-focus bg-hover-danger-200 text-danger-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                                                    >
                                                        <Icon icon="fluent:delete-24-regular" className="menu-icon" />
                                                    </button>
                                                    {customer.telefon && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleWhatsApp(customer)}
                                                            className="bg-success-focus bg-hover-success-200 text-success-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                                                            title="WhatsApp ile mesaj gönder"
                                                        >
                                                            <Icon icon="mdi:whatsapp" className="icon text-xl" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-24">
                        <span>Toplam {customers.length} kayıttan {filteredCustomers.length} tanesi gösteriliyor (Sayfa {currentPage}/{totalPages || 1})</span>
                        <ul className="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
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
                            {/* Sayfa numaraları */}
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
                                    <strong>{selectedCustomerIds.length}</strong> müşteri kaydını silmek istediğinize emin misiniz?
                                </p>
                                <p className="text-warning-600 text-sm mt-8">
                                    Bu işlem geri alınamaz. Bağlı tüp kayıtları olan müşteriler silinemeyecektir.
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
                                    {selectedCustomerIds.length} Müşteriyi Sil
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Müşteri Ekleme/Düzenleme Modal */}
            {isModalOpen && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content radius-16">
                            <div className="modal-header py-16 px-24 border-bottom">
                                <h6 className="modal-title fw-semibold">
                                    {selectedCustomer ? 'Müşteri Düzenle' : 'Yeni Müşteri'}
                                </h6>
                                <button type="button" className="btn-close" onClick={() => setIsModalOpen(false)}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body p-24">
                                    <div className="row gy-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold text-primary-light text-sm mb-8">
                                                Firma Adı <span className="text-danger-600">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="firma_adi"
                                                className="form-control radius-8"
                                                placeholder="Firma adını girin"
                                                value={formData.firma_adi}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold text-primary-light text-sm mb-8">Yetkili Adı</label>
                                            <input
                                                type="text"
                                                name="yetkili"
                                                className="form-control radius-8"
                                                placeholder="Yetkili adı"
                                                value={formData.yetkili}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold text-primary-light text-sm mb-8">Telefon</label>
                                            <input
                                                type="tel"
                                                name="telefon"
                                                className="form-control radius-8"
                                                placeholder="0532 123 4567"
                                                value={formData.telefon}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold text-primary-light text-sm mb-8">E-posta</label>
                                            <input
                                                type="email"
                                                name="email"
                                                className="form-control radius-8"
                                                placeholder="ornek@email.com"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-semibold text-primary-light text-sm mb-8">Adres</label>
                                            <textarea
                                                name="adres"
                                                className="form-control radius-8"
                                                rows="2"
                                                placeholder="Açık adres"
                                                value={formData.adres}
                                                onChange={handleInputChange}
                                            ></textarea>
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label fw-semibold text-primary-light text-sm mb-8">Notlar</label>
                                            <textarea
                                                name="notlar"
                                                className="form-control radius-8"
                                                rows="3"
                                                placeholder="Müşteri hakkında notlar..."
                                                value={formData.notlar}
                                                onChange={handleInputChange}
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer py-16 px-24 border-top d-flex justify-content-center gap-3">
                                    <button
                                        type="button"
                                        className="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-40 py-11 radius-8"
                                        onClick={() => setIsModalOpen(false)}
                                    >
                                        İptal
                                    </button>
                                    <button type="submit" className="btn btn-primary border border-primary-600 text-md px-24 py-12 radius-8">
                                        {selectedCustomer ? 'Güncelle' : 'Kaydet'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Silme Onay Modal */}
            {isDeleteModalOpen && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content radius-16">
                            <div className="modal-header py-16 px-24 border-bottom">
                                <h6 className="modal-title fw-semibold text-danger-600">Müşteri Sil</h6>
                                <button type="button" className="btn-close" onClick={() => setIsDeleteModalOpen(false)}></button>
                            </div>
                            <div className="modal-body p-24">
                                <p className="text-secondary-light mb-8">
                                    <strong className="text-primary-light">{selectedCustomer?.firma_adi}</strong> müşterisini silmek istediğinize emin misiniz?
                                </p>
                                <p className="text-sm text-danger-600 mb-0">Bu işlem geri alınamaz. Müşteriye ait tüm tüp kayıtları da silinecektir.</p>
                            </div>
                            <div className="modal-footer py-16 px-24 border-top d-flex justify-content-center gap-3">
                                <button
                                    type="button"
                                    className="border border-neutral-400 text-secondary-light text-md px-40 py-11 radius-8"
                                    onClick={() => setIsDeleteModalOpen(false)}
                                >
                                    İptal
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger border border-danger-600 text-md px-24 py-12 radius-8"
                                    onClick={handleDelete}
                                >
                                    Sil
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Müşteri Detay Modal */}
            {isViewModalOpen && selectedCustomer && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content radius-16">
                            <div className="modal-header py-16 px-24 border-bottom">
                                <h6 className="modal-title fw-semibold">Müşteri Detayı</h6>
                                <button type="button" className="btn-close" onClick={() => setIsViewModalOpen(false)}></button>
                            </div>
                            <div className="modal-body p-24">
                                <div className="row gy-4">
                                    {/* Sol Kolon */}
                                    <div className="col-lg-4">
                                        <div className="card border radius-12 h-100">
                                            <div className="card-body p-20">
                                                <div className="text-center mb-20">
                                                    <div className="w-80-px h-80-px bg-primary-100 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-12">
                                                        <span className="text-primary-600 fw-bold text-2xl">
                                                            {selectedCustomer.firma_adi.substring(0, 2).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <h6 className="mb-4">{selectedCustomer.firma_adi}</h6>
                                                </div>
                                                <ul className="list-unstyled">
                                                    <li className="d-flex align-items-center gap-1 mb-12">
                                                        <span className="w-30 text-md fw-semibold text-primary-light">Yetkili</span>
                                                        <span className="w-70 text-secondary-light fw-medium">: {selectedCustomer.yetkili || '-'}</span>
                                                    </li>
                                                    <li className="d-flex align-items-center gap-1 mb-12">
                                                        <span className="w-30 text-md fw-semibold text-primary-light">Telefon</span>
                                                        <span className="w-70 text-secondary-light fw-medium">: {selectedCustomer.telefon || '-'}</span>
                                                    </li>
                                                    <li className="d-flex align-items-center gap-1 mb-12">
                                                        <span className="w-30 text-md fw-semibold text-primary-light">E-posta</span>
                                                        <span className="w-70 text-secondary-light fw-medium">: {selectedCustomer.email || '-'}</span>
                                                    </li>

                                                    <li className="d-flex align-items-center gap-1 mb-12">
                                                        <span className="w-30 text-md fw-semibold text-primary-light">Adres</span>
                                                        <span className="w-70 text-secondary-light fw-medium">: {selectedCustomer.adres || '-'}</span>
                                                    </li>
                                                    <li className="d-flex align-items-center gap-1 mb-12">
                                                        <span className="w-30 text-md fw-semibold text-primary-light">Kayıt</span>
                                                        <span className="w-70 text-secondary-light fw-medium">: {formatDate(selectedCustomer.created_at)}</span>
                                                    </li>
                                                </ul>
                                                {selectedCustomer.notlar && (
                                                    <div className="mt-16 p-12 bg-warning-50 radius-8">
                                                        <span className="text-sm fw-semibold text-warning-600 d-block mb-4">Not:</span>
                                                        <span className="text-sm text-secondary-light">{selectedCustomer.notlar}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sağ Kolon: Tüp Listesi */}
                                    <div className="col-lg-8">
                                        <div className="card border radius-12">
                                            <div className="card-header py-12 px-16 border-bottom d-flex justify-content-between align-items-center">
                                                <h6 className="mb-0">Tüp Listesi</h6>
                                                <span className="text-sm text-secondary-light">{customerTubes.length} kayıt</span>
                                            </div>
                                            <div className="card-body p-0">
                                                {customerTubes.length === 0 ? (
                                                    <div className="text-center py-40">
                                                        <Icon icon="mdi:fire-extinguisher" className="text-secondary-light text-4xl mb-8" />
                                                        <p className="text-secondary-light mb-0">Kayıtlı tüp bulunmuyor</p>
                                                    </div>
                                                ) : (
                                                    <table className="table bordered-table mb-0">
                                                        <thead>
                                                            <tr>
                                                                <th>Barkod No</th>
                                                                <th>Tüp Cinsi</th>
                                                                <th>Kilo</th>
                                                                <th>Son Kullanım</th>
                                                                <th>Durum</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {customerTubes.map(tube => {
                                                                const tubeStatus = getTubeStatus(tube.son_kullanim_tarihi);
                                                                return (
                                                                    <tr key={tube.id}>
                                                                        <td className="fw-medium">{tube.seri_no}</td>
                                                                        <td>{tube.tup_cinsi}</td>
                                                                        <td>{tube.kilo} kg</td>
                                                                        <td>{formatDate(tube.son_kullanim_tarihi)}</td>
                                                                        <td>
                                                                            <span className={`${tubeStatus.class} px-16 py-4 rounded-pill fw-medium text-sm`}>
                                                                                {tubeStatus.label}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer py-16 px-24 border-top d-flex justify-content-center gap-3">
                                <button
                                    type="button"
                                    className="btn btn-success text-md px-24 py-12 radius-8 d-flex align-items-center gap-2"
                                    onClick={async () => {
                                        if (window.api && window.api.report) {
                                            const result = await window.api.report.fieldMaintenanceForm(selectedCustomer.id);
                                            if (result.success) {
                                                displayToast('Saha bakım formu yazdırılıyor...', 'success');
                                            } else {
                                                displayToast('Yazdırma hatası: ' + result.error, 'danger');
                                            }
                                        }
                                    }}
                                >
                                    <Icon icon="heroicons:printer" className="text-lg" />
                                    Saha Formu Yazdır
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-primary text-md px-24 py-12 radius-8"
                                    onClick={() => {
                                        setIsViewModalOpen(false);
                                        openEditModal(selectedCustomer);
                                    }}
                                >
                                    Düzenle
                                </button>
                                <button
                                    type="button"
                                    className="border border-neutral-400 text-secondary-light text-md px-40 py-11 radius-8"
                                    onClick={() => setIsViewModalOpen(false)}
                                >
                                    Kapat
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
                    <div className={`toast show ${toastType === 'success' ? 'bg-success-600' : 'bg-danger-600'} text-white radius-8`}>
                        <div className="toast-body d-flex align-items-center gap-12 px-16 py-12">
                            <Icon
                                icon={toastType === 'success' ? 'heroicons:check-circle' : 'heroicons:x-circle'}
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

export default CustomersLayer;
