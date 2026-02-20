import { Icon } from '@iconify/react/dist/iconify.js';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { Turkish } from 'flatpickr/dist/l10n/tr.js';
import { getTubeTypeShortCode } from '../helper/constants';

// DatePicker Component
const DatePicker = ({ id, placeholder, value, onChange }) => {
    const datePickerRef = useRef(null);
    const fpRef = useRef(null);

    useEffect(() => {
        fpRef.current = flatpickr(datePickerRef.current, {
            dateFormat: 'd.m.Y',
            locale: Turkish,
            defaultDate: value || null,
            onChange: (selectedDates, dateStr) => {
                if (onChange) {
                    // ISO format olarak gönder
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
                className="form-control form-control-sm radius-8 h-40-px bg-base pe-40"
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

const CertificatesLayer = () => {
    const navigate = useNavigate();

    // State tanımları
    const [certificates, setCertificates] = useState([]);
    const [filteredCertificates, setFilteredCertificates] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [customerFilter, setCustomerFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Modal state'leri
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedCertificate, setSelectedCertificate] = useState(null);
    const [pendingPrintCertificate, setPendingPrintCertificate] = useState(null);
    
    // Toplu seçim state'i
    const [selectedCertificateIds, setSelectedCertificateIds] = useState([]);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [showCount, setShowCount] = useState(10);

    // Yeni sertifika oluşturma state - ÇOKLU SEÇİM
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [selectedTubeIds, setSelectedTubeIds] = useState([]); // Çoklu seçim
    const [customerTubes, setCustomerTubes] = useState([]); // Seçilen firmanın tüpleri
    const [availableTubes, setAvailableTubes] = useState([]);
    
    // Ek sertifika bilgileri
    const [certFormData, setCertFormData] = useState({
        gemi_adi: '',
        groston: '',
        gemi_cinsi: '',
        liman: 'MARMARİS'
    });

    // Toast state
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');
    // eslint-disable-next-line no-unused-vars
    const [loading, setLoading] = useState(true);

    // Müşteri verileri - veritabanından
    const [customers, setCustomers] = useState([]);
    
    // Şirket ayarları - dinamik veriler için
    const [companySettings, setCompanySettings] = useState(null);

    // Sertifikası olmayan tüpler - veritabanından
    // eslint-disable-next-line no-unused-vars
    const [tubesWithoutCert, setTubesWithoutCert] = useState([]);

    // Veritabanından verileri çek
    useEffect(() => {
        const fetchData = async () => {
            try {
                if (window.api) {
                    // Şirket ayarlarını çek
                    const settingsResult = await window.api.settings.get();
                    if (settingsResult.success) {
                        setCompanySettings(settingsResult.data);
                    }
                    
                    // Sertifikaları çek
                    const certResult = await window.api.certificate.list();
                    if (certResult.success) {
                        setCertificates(certResult.data);
                        setFilteredCertificates(certResult.data);
                    }

                    // Müşterileri çek
                    const customersResult = await window.api.customer.list();
                    if (customersResult.success) {
                        setCustomers(customersResult.data);
                    }

                    // Tüpleri çek (sertifikasız olanlar için)
                    const tubesResult = await window.api.tube.list();
                    if (tubesResult.success) {
                        // Sertifikası olmayan tüpleri filtrele
                        const certifiedTubeIds = certResult.success ? certResult.data.map(c => c.tube_id) : [];
                        const uncertified = tubesResult.data.filter(t => !certifiedTubeIds.includes(t.id));
                        setTubesWithoutCert(uncertified);
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

    // İstatistikler
    const getStats = () => {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        let thisMonthCount = 0;
        let thisYearCount = 0;

        certificates.forEach(cert => {
            const issueDate = new Date(cert.issue_date);
            if (issueDate.getFullYear() === thisYear) {
                thisYearCount++;
                if (issueDate.getMonth() === thisMonth) {
                    thisMonthCount++;
                }
            }
        });

        return {
            total: certificates.length,
            thisMonth: thisMonthCount,
            thisYear: thisYearCount
        };
    };

    const stats = getStats();

    // Toast göster
    const displayToast = (message, type = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    // Tarih formatla
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Filtreleme
    useEffect(() => {
        let result = certificates;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(cert =>
                cert.certificate_number.toLowerCase().includes(term) ||
                cert.firma_adi.toLowerCase().includes(term) ||
                cert.seri_no.toLowerCase().includes(term)
            );
        }

        if (customerFilter) {
            result = result.filter(cert => cert.customer_id === parseInt(customerFilter));
        }

        if (fromDate) {
            result = result.filter(cert => new Date(cert.issue_date) >= new Date(fromDate));
        }
        if (toDate) {
            result = result.filter(cert => new Date(cert.issue_date) <= new Date(toDate));
        }

        setFilteredCertificates(result);
    }, [certificates, searchTerm, customerFilter, fromDate, toDate]);

    // Filtreleri temizle
    const clearFilters = () => {
        setSearchTerm('');
        setCustomerFilter('');
        setFromDate('');
        setToDate('');
    };

    // Sertifika görüntüle
    const viewCertificate = (cert) => {
        setSelectedCertificate(cert);
        setIsViewModalOpen(true);
    };

    // Sertifika PDF oluştur ve yazdır
    const printCertificate = async (cert) => {
        try {
            if (window.api) {
                const result = await window.api.certificate.print(cert);
                if (result.success) {
                    displayToast(`Sertifika açıldı. Tarayıcıdan Ctrl+P ile yazdırabilirsiniz.`, 'success');
                } else {
                    displayToast('Yazdırma hatası: ' + result.error, 'danger');
                }
            }
        } catch (error) {
            console.error('Yazdırma hatası:', error);
            displayToast('Yazdırma işlemi başarısız oldu', 'danger');
        }
    };

    // PDF olarak indir
    const downloadCertificatePDF = async (cert) => {
        try {
            if (window.api) {
                const result = await window.api.certificate.downloadPDF(cert);
                if (result.success) {
                    displayToast(`PDF kaydediliyor: ${cert.certificate_number}`, 'success');
                } else {
                    displayToast('PDF indirme hatası: ' + result.error, 'danger');
                }
            }
        } catch (error) {
            console.error('PDF indirme hatası:', error);
            displayToast('PDF indirme işlemi başarısız oldu', 'danger');
        }
    };

    // Sertifika silme
    const openDeleteModal = (cert) => {
        setSelectedCertificate(cert);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        try {
            if (window.api) {
                // Sertifika numarasına göre sil (aynı numaralı tüm kayıtlar silinir)
                const result = await window.api.certificate.delete(selectedCertificate.certificate_number);

                if (result.success) {
                    setCertificates(prev => prev.filter(c => c.certificate_number !== selectedCertificate.certificate_number));
                    setIsDeleteModalOpen(false);
                    displayToast(`"${selectedCertificate.certificate_number}" sertifikası silindi`, 'success');
                } else {
                    displayToast('Silme işlemi başarısız: ' + result.error, 'danger');
                }
            }
        } catch (error) {
            console.error('Silme hatası:', error);
            displayToast('Silme işlemi sırasında hata oluştu', 'danger');
        }
    };

    // Yeni sertifika oluştur - Modal aç
    const openCreateModal = async () => {
        setSelectedCustomerId('');
        setSelectedTubeIds([]);
        setCustomerTubes([]);
        setCertFormData({
            gemi_adi: '',
            groston: '',
            gemi_cinsi: '',
            liman: 'MARMARİS'
        });

        // Tüm tüpleri yükle
        if (window.api) {
            const tubesResult = await window.api.tube.list();
            if (tubesResult.success) {
                setAvailableTubes(tubesResult.data);
            }
        }

        setIsCreateModalOpen(true);
    };

    // Firma seçildiğinde o firmaya ait tüpleri getir
    const handleCustomerSelect = (customerId) => {
        setSelectedCustomerId(customerId);
        setSelectedTubeIds([]);
        
        if (customerId) {
            const tubes = availableTubes.filter(t => t.customer_id === parseInt(customerId));
            setCustomerTubes(tubes);
            
            // Firma bilgilerini otomatik doldur
            const customer = customers.find(c => c.id === parseInt(customerId));
            if (customer) {
                setCertFormData(prev => ({
                    ...prev,
                    gemi_adi: customer.firma_adi || ''
                }));
            }
        } else {
            setCustomerTubes([]);
        }
    };

    // Tüp seçimi toggle
    const toggleTubeSelection = (tubeId) => {
        setSelectedTubeIds(prev => {
            if (prev.includes(tubeId)) {
                return prev.filter(id => id !== tubeId);
            } else {
                return [...prev, tubeId];
            }
        });
    };

    // Tümünü seç/kaldır (tüp seçimi için - modal içinde)
    const toggleSelectAll = () => {
        if (selectedTubeIds.length === customerTubes.length) {
            setSelectedTubeIds([]);
        } else {
            setSelectedTubeIds(customerTubes.map(t => t.id));
        }
    };

    // Pagination hesaplamaları
    const totalPages = Math.ceil(filteredCertificates.length / showCount);
    const startIndex = (currentPage - 1) * showCount;
    const endIndex = startIndex + showCount;
    const paginatedCertificates = filteredCertificates.slice(startIndex, endIndex);

    // Sayfa değiştirme
    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setSelectedCertificateIds([]);
        }
    };

    // Sertifika toplu seçim fonksiyonları
    const toggleSelectCertificate = (certId) => {
        setSelectedCertificateIds(prev => {
            if (prev.includes(certId)) {
                return prev.filter(id => id !== certId);
            } else {
                return [...prev, certId];
            }
        });
    };

    const toggleSelectAllCertificates = () => {
        if (selectedCertificateIds.length === paginatedCertificates.length) {
            setSelectedCertificateIds([]);
        } else {
            setSelectedCertificateIds(paginatedCertificates.map(c => c.id));
        }
    };

    // Toplu silme
    const handleBulkDelete = async () => {
        try {
            if (window.api && selectedCertificateIds.length > 0) {
                let successCount = 0;
                let failedCount = 0;

                for (const certId of selectedCertificateIds) {
                    const result = await window.api.certificate.delete(certId);
                    if (result.success) {
                        successCount++;
                    } else {
                        failedCount++;
                    }
                }

                // Verileri yenile
                const certResult = await window.api.certificate.list();
                if (certResult.success) {
                    setCertificates(certResult.data);
                    setFilteredCertificates(certResult.data);
                }

                setSelectedCertificateIds([]);
                setIsBulkDeleteModalOpen(false);
                displayToast(`${successCount} sertifika silindi${failedCount > 0 ? `, ${failedCount} sertifika silinemedi` : ''}`, failedCount > 0 ? 'warning' : 'success');
            }
        } catch (error) {
            console.error('Toplu silme hatası:', error);
            displayToast('Toplu silme işlemi sırasında hata oluştu', 'danger');
        }
    };

    const handleCreateCertificate = async () => {
        if (!selectedCustomerId) {
            displayToast('Lütfen bir firma seçin', 'warning');
            return;
        }
        
        if (selectedTubeIds.length === 0) {
            displayToast('Lütfen en az bir tüp seçin', 'warning');
            return;
        }

        try {
            if (window.api) {
                // Seçilen tüplerin bilgilerini al
                const selectedTubes = customerTubes.filter(t => selectedTubeIds.includes(t.id));
                
                const result = await window.api.certificate.addBatch({
                    customer_id: parseInt(selectedCustomerId),
                    tube_ids: selectedTubeIds,
                    tubes: selectedTubes,
                    gemi_adi: certFormData.gemi_adi,
                    groston: certFormData.groston,
                    gemi_cinsi: certFormData.gemi_cinsi,
                    liman: certFormData.liman
                });

                if (result.success) {
                    // Sertifikaları yeniden yükle
                    const certResult = await window.api.certificate.list();
                    if (certResult.success) {
                        setCertificates(certResult.data);
                        setFilteredCertificates(certResult.data);
                    }

                    setIsCreateModalOpen(false);
                    displayToast(`Sertifika oluşturuldu: ${result.certificate_number} (${selectedTubeIds.length} tüp)`, 'success');

                    // Yeni oluşturulan sertifikayı yazdırma için hazırla
                    if (result.certificateData) {
                        setPendingPrintCertificate(result.certificateData);
                    }
                } else {
                    displayToast('Sertifika oluşturulurken hata: ' + result.error, 'danger');
                }
            }
        } catch (error) {
            console.error('Sertifika oluşturma hatası:', error);
            displayToast('Sertifika oluşturulurken hata oluştu', 'danger');
        }
    };

    // Müşteri sayfasına git
    const goToCustomer = (customerId) => {
        navigate(`/customers?highlight=${customerId}`);
    };

    // CSV dışa aktar
    const exportToCSV = () => {
        if (filteredCertificates.length === 0) {
            displayToast('Dışa aktarılacak kayıt yok', 'warning');
            return;
        }

        const headers = ['Sertifika No', 'Firma', 'Tüp Barkod No', 'Tüp Cinsi', 'Kilo', 'Düzenleme Tarihi', 'Geçerlilik', 'Oluşturan'];
        const rows = filteredCertificates.map(cert => [
            cert.certificate_number,
            cert.firma_adi,
            cert.seri_no,
            cert.tup_cinsi,
            cert.kilo,
            cert.issue_date,
            cert.expiry_date,
            cert.created_by
        ]);

        const BOM = '\uFEFF';
        const csvContent = BOM + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `sertifikalar_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        displayToast(`${filteredCertificates.length} sertifika dışa aktarıldı`, 'success');
    };

    return (
        <>
            {/* İstatistik Kartları */}
            <div className="row gy-4 mb-24">
                <div className="col-xxl-4 col-sm-6">
                    <div className="card shadow-none border bg-gradient-start-1 h-100">
                        <div className="card-body p-20">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                                <div>
                                    <p className="fw-medium text-primary-light mb-1">Toplam Sertifika</p>
                                    <h6 className="mb-0">{stats.total}</h6>
                                </div>
                                <div className="w-50-px h-50-px bg-cyan rounded-circle d-flex justify-content-center align-items-center">
                                    <Icon icon="heroicons:document-check" className="text-white text-2xl mb-0" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-xxl-4 col-sm-6">
                    <div className="card shadow-none border bg-gradient-start-2 h-100">
                        <div className="card-body p-20">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                                <div>
                                    <p className="fw-medium text-primary-light mb-1">Bu Ay</p>
                                    <h6 className="mb-0">{stats.thisMonth}</h6>
                                </div>
                                <div className="w-50-px h-50-px bg-purple rounded-circle d-flex justify-content-center align-items-center">
                                    <Icon icon="heroicons:calendar" className="text-white text-2xl mb-0" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-xxl-4 col-sm-6">
                    <div className="card shadow-none border bg-gradient-start-3 h-100">
                        <div className="card-body p-20">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                                <div>
                                    <p className="fw-medium text-primary-light mb-1">Bu Yıl</p>
                                    <h6 className="mb-0">{stats.thisYear}</h6>
                                </div>
                                <div className="w-50-px h-50-px bg-info rounded-circle d-flex justify-content-center align-items-center">
                                    <Icon icon="heroicons:chart-bar" className="text-white text-2xl mb-0" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ana Tablo Kartı */}
            <div className="card h-100 p-0 radius-12">
                {/* Header */}
                <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                        <div className="d-flex align-items-center gap-2">
                            <div className="w-40-px h-40-px bg-primary-50 rounded-circle d-flex justify-content-center align-items-center">
                                <Icon icon="heroicons:document-check" className="text-primary-600 text-xl" />
                            </div>
                            <h6 className="mb-0 fw-semibold">Sertifika Listesi</h6>
                        </div>
                        <span className="bg-primary-50 text-primary-600 border border-primary-main px-16 py-4 radius-4 fw-medium text-sm">
                            {filteredCertificates.length} kayıt
                        </span>
                    </div>
                    <div className="d-flex flex-wrap align-items-center gap-8">
                        <button
                            className="btn btn-outline-neutral-600 text-sm btn-sm px-12 py-10 radius-8 d-flex align-items-center gap-2"
                            onClick={exportToCSV}
                        >
                            <Icon icon="heroicons:arrow-down-tray" className="text-lg" />
                            CSV
                        </button>
                        <button
                            className="btn btn-primary text-sm btn-sm px-12 py-10 radius-8 d-flex align-items-center gap-2"
                            onClick={openCreateModal}
                        >
                            <Icon icon="ic:baseline-plus" className="text-xl line-height-1" />
                            Yeni Sertifika
                        </button>
                    </div>
                </div>

                {/* Filtreler */}
                <div className="card-body border-bottom py-16 px-24">
                    <div className="row g-3 align-items-end">
                        <div className="col-lg-3 col-md-4">
                            <label className="form-label text-sm text-secondary-light mb-8">Ara</label>
                            <form className="navbar-search">
                                <input
                                    type="text"
                                    className="bg-base h-40-px w-100"
                                    name="search"
                                    placeholder="Sertifika no, firma, Barkod No..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <Icon icon="ion:search-outline" className="icon" />
                            </form>
                        </div>
                        <div className="col-lg-3 col-md-4">
                            <label className="form-label text-sm text-secondary-light mb-8">Müşteri</label>
                            <select
                                className="form-select form-select-sm w-100 radius-8 h-40-px"
                                value={customerFilter}
                                onChange={(e) => setCustomerFilter(e.target.value)}
                            >
                                <option value="">Tüm Müşteriler</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.firma_adi}</option>
                                ))}
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
                        <div className="col-lg-2 col-md-4">
                            <button
                                className="btn btn-outline-danger-600 w-100 radius-8 h-40-px d-flex align-items-center justify-content-center gap-8"
                                onClick={clearFilters}
                            >
                                <Icon icon="heroicons:x-mark" className="text-xl" />
                                Temizle
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tablo */}
                <div className="card-body p-24">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-16">
                        <div className="d-flex align-items-center gap-3">
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
                        {selectedCertificateIds.length > 0 && (
                            <button
                                onClick={() => setIsBulkDeleteModalOpen(true)}
                                className="btn btn-danger text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2"
                            >
                                <Icon icon="fluent:delete-24-regular" className="icon text-xl line-height-1" />
                                Seçilenleri Sil ({selectedCertificateIds.length})
                            </button>
                        )}
                    </div>
                    <div className="table-responsive scroll-sm">
                        <table className="table bordered-table sm-table mb-0">
                            <thead>
                                <tr>
                                    <th scope="col">
                                        <div className="form-check">
                                            <input 
                                                className="form-check-input" 
                                                type="checkbox"
                                                checked={paginatedCertificates.length > 0 && selectedCertificateIds.length === paginatedCertificates.length}
                                                onChange={toggleSelectAllCertificates}
                                            />
                                        </div>
                                    </th>
                                    <th scope="col">Sertifika No</th>
                                    <th scope="col">Firma</th>
                                    <th scope="col">Tüp Barkod No</th>
                                    <th scope="col" className="text-center">Tüp Cinsi</th>
                                    <th scope="col" className="text-center">Kilo</th>
                                    <th scope="col">Düzenleme</th>
                                    <th scope="col">Geçerlilik</th>
                                    <th scope="col" className="text-center">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedCertificates.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="text-center py-32">
                                            <div className="d-flex flex-column align-items-center gap-2">
                                                <div className="w-80-px h-80-px bg-neutral-100 rounded-circle d-flex justify-content-center align-items-center mb-8">
                                                    <Icon icon="heroicons:document-magnifying-glass" className="text-neutral-500 text-4xl" />
                                                </div>
                                                <h6 className="text-secondary-light mb-0">
                                                    {searchTerm || customerFilter ? 'Sonuç bulunamadı' : 'Henüz sertifika yok'}
                                                </h6>
                                                <p className="text-secondary-light text-sm mb-0">
                                                    {searchTerm || customerFilter ? 'Farklı filtreler deneyin' : 'Yeni sertifika oluşturmak için butonu kullanın'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedCertificates.map((cert, index) => (
                                        <tr key={`cert-${cert.id || index}`} className={selectedCertificateIds.includes(cert.id) ? 'bg-primary-50' : ''}>
                                            <td>
                                                <div className="form-check">
                                                    <input 
                                                        className="form-check-input" 
                                                        type="checkbox"
                                                        checked={selectedCertificateIds.includes(cert.id)}
                                                        onChange={() => toggleSelectCertificate(cert.id)}
                                                    />
                                                </div>
                                            </td>
                                            <td>
                                                <span className="fw-semibold text-primary-600 font-monospace">
                                                    {cert.certificate_number}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className="text-primary-600 fw-medium cursor-pointer"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => goToCustomer(cert.customer_id)}
                                                >
                                                    {cert.firma_adi}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="font-monospace text-md text-secondary-light">{cert.seri_no}</span>
                                            </td>
                                            <td className="text-center">
                                                <span className="bg-primary-50 text-primary-600 border border-primary-main px-12 py-4 radius-4 fw-medium text-sm">
                                                    {cert.tup_cinsi}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className="bg-neutral-100 text-secondary-light px-12 py-4 radius-4 fw-medium text-sm">{cert.kilo} KG</span>
                                            </td>
                                            <td>
                                                <span className="text-md fw-normal text-secondary-light">{formatDate(cert.issue_date)}</span>
                                            </td>
                                            <td>
                                                <span className="bg-success-focus text-success-600 border border-success-main px-16 py-4 radius-4 fw-medium text-sm">
                                                    {formatDate(cert.expiry_date)}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <div className="d-flex align-items-center justify-content-center gap-10">
                                                    <button
                                                        className="bg-info-focus bg-hover-info-200 text-info-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                                                        onClick={() => viewCertificate(cert)}
                                                        title="Görüntüle"
                                                    >
                                                        <Icon icon="majesticons:eye-line" className="icon text-xl" />
                                                    </button>
                                                    <button
                                                        className="bg-success-focus bg-hover-success-200 text-success-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                                                        onClick={() => printCertificate(cert)}
                                                        title="Yazdır"
                                                    >
                                                        <Icon icon="heroicons:printer" className="icon text-xl" />
                                                    </button>
                                                    <button
                                                        className="bg-warning-focus bg-hover-warning-200 text-warning-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                                                        onClick={() => downloadCertificatePDF(cert)}
                                                        title="PDF İndir"
                                                    >
                                                        <Icon icon="heroicons:arrow-down-tray" className="icon text-xl" />
                                                    </button>
                                                    <button
                                                        className="remove-item-btn bg-danger-focus bg-hover-danger-200 text-danger-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                                                        onClick={() => openDeleteModal(cert)}
                                                        title="Sil"
                                                    >
                                                        <Icon icon="fluent:delete-24-regular" className="menu-icon" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-24">
                        <span>Toplam {certificates.length} kayıttan {filteredCertificates.length} tanesi gösteriliyor (Sayfa {currentPage}/{totalPages || 1})</span>
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

            {/* Toplu Silme Modal */}
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
                                    <strong>{selectedCertificateIds.length}</strong> sertifikayı silmek istediğinize emin misiniz?
                                </p>
                                <p className="text-warning-600 text-sm mt-8">
                                    Bu işlem geri alınamaz.
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
                                    {selectedCertificateIds.length} Sertifikayı Sil
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Görüntüleme Modal */}
            {isViewModalOpen && selectedCertificate && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content radius-16 bg-base">
                            <div className="modal-header py-16 px-24 border-bottom">
                                <h5 className="modal-title fw-semibold d-flex align-items-center gap-2">
                                    <Icon icon="heroicons:document-check" className="text-primary-600" />
                                    Sertifika Detayı
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setIsViewModalOpen(false)}></button>
                            </div>
                            <div className="modal-body p-24">
                                <div className="row g-4">
                                    <div className="col-md-6">
                                        <div className="bg-neutral-50 radius-8 p-16">
                                            <p className="text-secondary-light text-sm mb-4">Sertifika No</p>
                                            <h6 className="text-primary-600 font-monospace">{selectedCertificate.certificate_number}</h6>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="bg-neutral-50 radius-8 p-16">
                                            <p className="text-secondary-light text-sm mb-4">Firma</p>
                                            <h6>{selectedCertificate.firma_adi}</h6>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="bg-neutral-50 radius-8 p-16">
                                            <p className="text-secondary-light text-sm mb-4">Tüp Barkod No</p>
                                            <h6 className="font-monospace">{selectedCertificate.seri_no}</h6>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="bg-neutral-50 radius-8 p-16">
                                            <p className="text-secondary-light text-sm mb-4">Tüp Bilgisi</p>
                                            <h6>{selectedCertificate.tup_cinsi} - {selectedCertificate.kilo} KG</h6>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="bg-neutral-50 radius-8 p-16">
                                            <p className="text-secondary-light text-sm mb-4">Düzenleme Tarihi</p>
                                            <h6>{formatDate(selectedCertificate.issue_date)}</h6>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="bg-success-50 radius-8 p-16">
                                            <p className="text-secondary-light text-sm mb-4">Geçerlilik Tarihi</p>
                                            <h6 className="text-success-600">{formatDate(selectedCertificate.expiry_date)}</h6>
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        <div className="text-center py-16">
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent((companySettings?.company_name?.split(' ')[0]?.toUpperCase()?.replace(/[^A-Z0-9]/g, '') || 'YANGIN') + '-CERT-' + selectedCertificate.certificate_number)}`}
                                                alt="QR Code"
                                                className="radius-8"
                                            />
                                            <p className="text-secondary-light text-sm mt-8 mb-0">Doğrulama QR Kodu</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer py-16 px-24 border-top">
                                <button
                                    className="btn btn-outline-secondary-600 radius-8"
                                    onClick={() => setIsViewModalOpen(false)}
                                >
                                    Kapat
                                </button>
                                <button
                                    className="btn btn-primary text-sm btn-sm px-12 py-10 radius-8 d-flex align-items-center gap-2"
                                    onClick={() => { setIsViewModalOpen(false); printCertificate(selectedCertificate); }}
                                >
                                    <Icon icon="heroicons:printer" className="text-xl" />
                                    Yazdır
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Silme Modal */}
            {isDeleteModalOpen && selectedCertificate && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content radius-16 bg-base">
                            <div className="modal-header py-16 px-24 border-bottom">
                                <h5 className="modal-title fw-semibold text-danger-600 d-flex align-items-center gap-2">
                                    <Icon icon="heroicons:exclamation-triangle" />
                                    Sertifika Sil
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setIsDeleteModalOpen(false)}></button>
                            </div>
                            <div className="modal-body p-24">
                                <p className="text-secondary-light mb-8">
                                    <strong className="text-primary-600">"{selectedCertificate.certificate_number}"</strong> numaralı sertifikayı silmek istediğinize emin misiniz?
                                </p>
                                <div className="bg-warning-50 radius-8 p-16">
                                    <p className="text-warning-600 text-sm mb-0 d-flex align-items-center gap-8">
                                        <Icon icon="heroicons:exclamation-circle" className="text-lg" />
                                        Bu işlem geri alınamaz!
                                    </p>
                                </div>
                            </div>
                            <div className="modal-footer py-16 px-24 border-top">
                                <button
                                    className="btn btn-outline-secondary-600 radius-8"
                                    onClick={() => setIsDeleteModalOpen(false)}
                                >
                                    İptal
                                </button>
                                <button
                                    className="btn btn-danger text-sm btn-sm px-12 py-10 radius-8 d-flex align-items-center gap-2"
                                    onClick={handleDelete}
                                >
                                    <Icon icon="heroicons:trash" className="text-xl" />
                                    Sil
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Yeni Sertifika Modal - ÇOKLU SEÇİM */}
            {isCreateModalOpen && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content radius-16 bg-base">
                            <div className="modal-header py-16 px-24 border-bottom">
                                <h5 className="modal-title fw-semibold d-flex align-items-center gap-2">
                                    <Icon icon="heroicons:plus-circle" className="text-primary-600" />
                                    Yeni Sertifika Oluştur
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setIsCreateModalOpen(false)}></button>
                            </div>
                            <div className="modal-body p-24" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                {/* Adım 1: Firma Seçimi */}
                                <div className="mb-20">
                                    <label className="form-label fw-semibold">1. Firma Seçin</label>
                                    <select
                                        className="form-select"
                                        value={selectedCustomerId}
                                        onChange={(e) => handleCustomerSelect(e.target.value)}
                                    >
                                        <option value="">-- Firma Seçin --</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.firma_adi}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Ek Bilgiler */}
                                {selectedCustomerId && (
                                    <div className="mb-20 p-16 bg-primary-50 radius-8 border border-primary-200">
                                        <label className="form-label fw-semibold mb-12 text-primary-700">
                                            <Icon icon="heroicons:document-text" className="me-8" />
                                            Gemi / Sertifika Bilgileri
                                        </label>
                                        <div className="row g-12">
                                            <div className="col-md-6">
                                                <label className="form-label text-sm fw-medium">Gemi Adı <span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    value={certFormData.gemi_adi}
                                                    onChange={(e) => setCertFormData(prev => ({ ...prev, gemi_adi: e.target.value }))}
                                                    placeholder="Geminin adını girin"
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label text-sm fw-medium">Groston (GRT)</label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    value={certFormData.groston}
                                                    onChange={(e) => setCertFormData(prev => ({ ...prev, groston: e.target.value }))}
                                                    placeholder="Groston değeri"
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label text-sm fw-medium">Gemi Cinsi / Tipi</label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    value={certFormData.gemi_cinsi}
                                                    onChange={(e) => setCertFormData(prev => ({ ...prev, gemi_cinsi: e.target.value }))}
                                                    placeholder="Yolcu gemisi, yat, tekne vb."
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label text-sm fw-medium">Liman / Bayrak</label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    value={certFormData.liman}
                                                    onChange={(e) => setCertFormData(prev => ({ ...prev, liman: e.target.value }))}
                                                    placeholder="Kayıtlı liman"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Adım 2: Tüp Seçimi */}
                                {selectedCustomerId && (
                                    <div>
                                        <div className="d-flex justify-content-between align-items-center mb-12">
                                            <label className="form-label fw-semibold mb-0">
                                                2. Tüpleri Seçin 
                                                <span className="text-primary-600 ms-8">({selectedTubeIds.length}/{customerTubes.length} seçili)</span>
                                            </label>
                                            {customerTubes.length > 0 && (
                                                <button
                                                    className="btn btn-outline-primary btn-sm"
                                                    onClick={toggleSelectAll}
                                                >
                                                    {selectedTubeIds.length === customerTubes.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                                                </button>
                                            )}
                                        </div>

                                        {customerTubes.length === 0 ? (
                                            <div className="text-center py-24 bg-light radius-8">
                                                <Icon icon="heroicons:inbox" className="text-secondary-light text-4xl mb-8" />
                                                <p className="text-secondary-light mb-0">Bu firmaya ait tüp bulunmuyor</p>
                                            </div>
                                        ) : (
                                            <div className="d-flex flex-column gap-8" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                                {customerTubes.map(tube => (
                                                    <div
                                                        key={tube.id}
                                                        className={`d-flex align-items-center justify-content-between p-12 radius-8 cursor-pointer border ${selectedTubeIds.includes(tube.id) ? 'border-primary-600 bg-primary-50' : 'border-neutral-200 bg-white'}`}
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => toggleTubeSelection(tube.id)}
                                                    >
                                                        <div className="d-flex align-items-center gap-12">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedTubeIds.includes(tube.id)}
                                                                onChange={() => toggleTubeSelection(tube.id)}
                                                                className="form-check-input"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                            <div>
                                                                <span className="fw-semibold font-monospace d-block">{tube.seri_no}</span>
                                                                <span className="text-xs text-secondary-light">
                                                                    Dolum: {tube.son_dolum_tarihi ? new Date(tube.son_dolum_tarihi).toLocaleDateString('tr-TR') : '-'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-end">
                                                            <span className="bg-primary-50 text-primary-600 border border-primary-main px-8 py-2 radius-4 fw-medium text-xs">
                                                                {tube.tup_cinsi}
                                                            </span>
                                                            <span className="ms-8 text-sm fw-medium">{tube.kilo} KG</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer py-16 px-24 border-top">
                                <button
                                    className="btn btn-outline-secondary-600 radius-8"
                                    onClick={() => setIsCreateModalOpen(false)}
                                >
                                    İptal
                                </button>
                                <button
                                    className="btn btn-primary text-sm px-20 py-10 radius-8 d-flex align-items-center gap-2"
                                    onClick={handleCreateCertificate}
                                    disabled={!selectedCustomerId || selectedTubeIds.length === 0}
                                >
                                    <Icon icon="heroicons:document-check" className="text-xl" />
                                    Sertifika Oluştur ({selectedTubeIds.length} Tüp)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Confirmation Modal */}
            {pendingPrintCertificate && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content radius-16 bg-base shadow-lg" style={{ border: '2px solid #487fff' }}>
                            <div className="modal-body p-32 text-center">
                                <div className="mb-24">
                                    <div className="w-80-px h-80-px bg-primary-50 rounded-circle d-flex justify-content-center align-items-center mx-auto mb-16" style={{ animation: 'pulse 2s infinite' }}>
                                        <Icon icon="heroicons:printer" className="text-primary-600 text-4xl" />
                                    </div>
                                    <h5 className="fw-bold mb-8">Sertifika Oluşturuldu!</h5>
                                    <p className="text-secondary-light mb-4">
                                        <span className="fw-semibold text-primary-600 font-monospace">{pendingPrintCertificate.certificate_number}</span> numaralı sertifika başarıyla oluşturuldu.
                                    </p>
                                    <div className="bg-neutral-50 radius-8 p-16 mt-16 mb-16">
                                        <div className="d-flex align-items-center justify-content-center gap-8 mb-8">
                                            <Icon icon="heroicons:building-office-2" className="text-secondary-light" />
                                            <span className="text-sm">{pendingPrintCertificate.firma_adi}</span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-center gap-8">
                                            <Icon icon="heroicons:fire" className="text-secondary-light" />
                                            <span className="text-sm">{pendingPrintCertificate.seri_no} - {pendingPrintCertificate.tup_cinsi}</span>
                                        </div>
                                    </div>
                                    <p className="text-secondary-light text-sm mb-0">
                                        Sertifikayı şimdi yazdırmak ister misiniz?
                                    </p>
                                </div>
                                <div className="d-flex gap-12 justify-content-center">
                                    <button
                                        className="btn btn-outline-secondary-600 radius-8 px-24 py-12"
                                        onClick={() => setPendingPrintCertificate(null)}
                                    >
                                        Şimdi Değil
                                    </button>
                                    <button
                                        className="btn btn-primary radius-8 px-24 py-12 d-flex align-items-center gap-8"
                                        onClick={() => {
                                            printCertificate(pendingPrintCertificate);
                                            setPendingPrintCertificate(null);
                                        }}
                                    >
                                        <Icon icon="heroicons:printer" className="text-xl" />
                                        Yazdır
                                    </button>
                                </div>
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

export default CertificatesLayer;
