import { Icon } from '@iconify/react/dist/iconify.js';
import React, { useState, useEffect } from 'react';

const ReportsLayer = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');
    
    // Silme modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);

    useEffect(() => {
        loadReports();
    }, []);

    const loadReports = async () => {
        try {
            if (window.api) {
                const result = await window.api.report.list();
                if (result.success) {
                    setReports(result.data || []);
                }
            }
        } catch (error) {
            console.error('Rapor yükleme hatası:', error);
        } finally {
            setLoading(false);
        }
    };

    const displayToast = (message, type = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const viewReport = async (id) => {
        try {
            if (window.api) {
                await window.api.report.view(id);
            }
        } catch (error) {
            console.error('Rapor görüntüleme hatası:', error);
            displayToast('Rapor açılırken hata oluştu', 'danger');
        }
    };

    const downloadPdf = async (report) => {
        try {
            if (window.api) {
                displayToast('PDF oluşturuluyor...', 'warning');
                const result = await window.api.report.downloadPdf(report.id);
                if (result.success) {
                    displayToast('PDF başarıyla kaydedildi', 'success');
                } else if (result.cancelled) {
                    // Kullanıcı iptal etti, sessizce geç
                } else {
                    displayToast('PDF oluşturulurken hata oluştu', 'danger');
                }
            }
        } catch (error) {
            console.error('PDF indirme hatası:', error);
            displayToast('PDF indirirken hata oluştu', 'danger');
        }
    };

    const openDeleteModal = (report) => {
        setSelectedReport(report);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        try {
            if (window.api && selectedReport) {
                const result = await window.api.report.delete(selectedReport.id);
                if (result.success) {
                    setReports(prev => prev.filter(r => r.id !== selectedReport.id));
                    displayToast('Rapor silindi', 'success');
                } else {
                    displayToast('Rapor silinemedi', 'danger');
                }
            }
        } catch (error) {
            console.error('Silme hatası:', error);
            displayToast('Silme sırasında hata oluştu', 'danger');
        }
        setIsDeleteModalOpen(false);
        setSelectedReport(null);
    };

    // Filtreleme
    const filteredReports = reports.filter(report => {
        const searchLower = searchTerm.toLowerCase();
        return (
            report.ref_no?.toLowerCase().includes(searchLower) ||
            report.customer_name?.toLowerCase().includes(searchLower) ||
            report.tube_summary?.toLowerCase().includes(searchLower)
        );
    });

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="card h-100 p-0 radius-12">
            {/* Toast */}
            {showToast && (
                <div 
                    className={`toast show position-fixed top-0 end-0 m-3 bg-${toastType === 'success' ? 'success' : toastType === 'warning' ? 'warning' : 'danger'}-600 text-white`}
                    style={{ zIndex: 9999 }}
                >
                    <div className="toast-body d-flex align-items-center gap-2">
                        <Icon 
                            icon={toastType === 'success' ? 'mdi:check-circle' : toastType === 'warning' ? 'mdi:alert' : 'mdi:close-circle'} 
                            className="text-xl" 
                        />
                        {toastMessage}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="card-header border-bottom bg-base py-16 px-24 d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div className="d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center gap-2">
                        <div className="w-40-px h-40-px bg-warning-50 rounded-circle d-flex justify-content-center align-items-center">
                            <Icon icon="heroicons:clipboard-document" className="text-warning-600 text-xl" />
                        </div>
                        <h6 className="mb-0 fw-semibold">Denetim Raporları</h6>
                    </div>
                    <span className="bg-primary-50 text-primary-600 border border-primary-main px-16 py-4 radius-4 fw-medium text-sm">
                        {filteredReports.length} rapor
                    </span>
                </div>
            </div>

            {/* Filters */}
            <div className="card-body border-bottom py-16 px-24">
                <div className="row g-3 align-items-end">
                    <div className="col-lg-4 col-md-6">
                        <label className="form-label text-sm text-secondary-light mb-8">Arama</label>
                        <form className="navbar-search">
                            <input
                                type="text"
                                className="bg-base h-40-px w-100"
                                name="search"
                                placeholder="Ref No, Firma veya özet ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Icon icon="ion:search-outline" className="icon" />
                        </form>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card-body p-24">
                <div className="table-responsive scroll-sm">
                    <table className="table bordered-table sm-table mb-0">
                        <thead>
                            <tr>
                                <th scope="col" className="text-center">Ref No</th>
                                <th scope="col">Müşteri</th>
                                <th scope="col" className="text-center">Tüp Sayısı</th>
                                <th scope="col">Özet</th>
                                <th scope="col" className="text-center">Tarih</th>
                                <th scope="col" className="text-center">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReports.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-4">
                                        <div className="text-secondary-light">
                                            <Icon icon="heroicons:document-magnifying-glass" className="text-4xl mb-2 d-block mx-auto" />
                                            {searchTerm ? 'Arama kriterlerine uygun rapor bulunamadı' : 'Henüz rapor oluşturulmamış'}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredReports.map((report) => (
                                    <tr key={report.id}>
                                        <td className="text-center">
                                            <span className="bg-warning-100 text-warning-600 px-12 py-4 radius-4 fw-medium text-sm">
                                                {report.ref_no}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="fw-medium text-primary-600">
                                                {report.customer_name || report.customer_name_current || '-'}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <span className="bg-info-100 text-info-600 px-12 py-4 radius-4 fw-medium text-sm">
                                                {report.tube_count} adet
                                            </span>
                                        </td>
                                        <td>
                                            <span className="text-secondary-light text-sm">
                                                {report.tube_summary?.length > 50 
                                                    ? report.tube_summary.substring(0, 50) + '...' 
                                                    : report.tube_summary}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <span className="text-secondary-light text-sm">
                                                {formatDate(report.created_at)}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <div className="d-flex align-items-center gap-10 justify-content-center">
                                                <button
                                                    type="button"
                                                    className="bg-success-100 text-success-600 bg-hover-success-200 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                                                    onClick={() => viewReport(report.id)}
                                                    title="Görüntüle / Yazdır"
                                                >
                                                    <Icon icon="heroicons:eye" className="text-xl" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="bg-info-100 text-info-600 bg-hover-info-200 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                                                    onClick={() => downloadPdf(report)}
                                                    title="PDF İndir"
                                                >
                                                    <Icon icon="heroicons:arrow-down-tray" className="text-xl" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="bg-danger-100 text-danger-600 bg-hover-danger-200 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle"
                                                    onClick={() => openDeleteModal(report)}
                                                    title="Sil"
                                                >
                                                    <Icon icon="fluent:delete-24-regular" className="text-xl" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Silme Modal */}
            {isDeleteModalOpen && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content radius-16 border-0">
                            <div className="modal-body p-24 text-center">
                                <div className="mb-24">
                                    <Icon icon="mdi:alert-circle-outline" className="text-danger text-7xl" />
                                </div>
                                <h5 className="mb-12">Raporu Sil</h5>
                                <p className="text-secondary-light mb-24">
                                    <strong>{selectedReport?.ref_no}</strong> referans numaralı raporu silmek istediğinize emin misiniz?
                                    <br />
                                    <small className="text-warning-600">Bu işlem geri alınamaz!</small>
                                </p>
                                <div className="d-flex justify-content-center gap-12">
                                    <button 
                                        type="button" 
                                        className="btn btn-outline-secondary-600 radius-8 px-20"
                                        onClick={() => {
                                            setIsDeleteModalOpen(false);
                                            setSelectedReport(null);
                                        }}
                                    >
                                        İptal
                                    </button>
                                    <button 
                                        type="button" 
                                        className="btn btn-danger radius-8 px-20"
                                        onClick={handleDelete}
                                    >
                                        Evet, Sil
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

export default ReportsLayer;
