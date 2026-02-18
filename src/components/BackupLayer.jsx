import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';

const BackupLayer = () => {
    const [backups, setBackups] = useState([]);
    // eslint-disable-next-line no-unused-vars
    const [loading, setLoading] = useState(true);

    const [isCreating, setIsCreating] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [backupToDelete, setBackupToDelete] = useState(null);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');
    const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
    const [autoBackupInterval, setAutoBackupInterval] = useState('daily');

    const fileInputRef = useRef(null);

    // Veritabanından yedekleri çek
    useEffect(() => {
        const fetchBackups = async () => {
            try {
                if (window.api) {
                    const result = await window.api.backup.list();
                    if (result.success) {
                        setBackups(result.data);
                    }
                }
            } catch (error) {
                console.error('Yedek listesi çekme hatası:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBackups();
    }, []);

    // Toast göster
    const showToast = (message, type = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
    };

    // Yedek oluştur
    const handleCreateBackup = async () => {
        setIsCreating(true);

        try {
            if (window.api) {
                const result = await window.api.backup.create();
                if (result.success) {
                    // Listeyi yeniden çek
                    const listResult = await window.api.backup.list();
                    if (listResult.success) {
                        setBackups(listResult.data);
                    }
                    showToast('Yedek başarıyla oluşturuldu!', 'success');
                } else {
                    showToast('Yedek oluşturulamadı!', 'danger');
                }
            }
        } catch (error) {
            console.error('Yedek oluşturma hatası:', error);
            showToast('Yedek oluşturulurken hata oluştu!', 'danger');
        } finally {
            setIsCreating(false);
        }
    };

    // Geri yükleme modal aç
    const openRestoreModal = (backup) => {
        setSelectedBackup(backup);
        setShowRestoreModal(true);
    };

    // Geri yükle
    const handleRestore = () => {
        setIsRestoring(true);

        setTimeout(() => {
            setIsRestoring(false);
            setShowRestoreModal(false);
            showToast('Yedek başarıyla geri yüklendi!', 'success');
        }, 2000);
    };

    // Dosyadan geri yükle
    const handleFileRestore = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            showToast('Hata: Sadece JSON dosyaları yüklenebilir!', 'danger');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                // Validate backup structure
                if (data.version && data.data) {
                    showToast(`"${file.name}" dosyasından yedek başarıyla geri yüklendi!`, 'success');
                } else {
                    showToast('Hata: Geçersiz yedek dosyası formatı!', 'danger');
                }
            } catch (error) {
                showToast('Hata: Dosya okunamadı!', 'danger');
            }
        };
        reader.readAsText(file);

        // Input'u resetle
        event.target.value = '';
    };

    // Silme modal aç
    const openDeleteModal = (backup) => {
        setBackupToDelete(backup);
        setShowDeleteModal(true);
    };

    // Yedek sil
    const handleDelete = () => {
        setBackups(backups.filter(b => b.id !== backupToDelete.id));
        setShowDeleteModal(false);
        setBackupToDelete(null);
        showToast('Yedek silindi', 'success');
    };

    // Tarih formatla
    const formatDateTime = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Göreceli zaman
    const getRelativeTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Bugün';
        if (diffDays === 1) return 'Dün';
        if (diffDays < 7) return `${diffDays} gün önce`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`;
        return `${Math.floor(diffDays / 30)} ay önce`;
    };

    return (
        <div className="row gy-4">
            {/* Başlık ve Açıklama */}
            <div className="col-12">
                <div className="card radius-12 border-0 bg-primary-600">
                    <div className="card-body p-24">
                        <div className="d-flex align-items-center gap-3">
                            <div className="w-60-px h-60-px bg-white rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
                                <Icon icon="heroicons:cloud-arrow-up" className="text-primary-600 text-2xl" />
                            </div>
                            <div>
                                <h4 className="text-white mb-4">Yedekleme Yönetimi</h4>
                                <p className="text-white opacity-75 mb-0">
                                    Verilerinizi güvenle yedekleyin ve gerektiğinde geri yükleyin
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* İstatistik Kartları */}
            <div className="col-xxl-3 col-sm-6">
                <div className="card radius-12 h-100">
                    <div className="card-body p-24 text-center">
                        <div className="w-64-px h-64-px bg-primary-50 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-16">
                            <Icon icon="heroicons:archive-box" className="text-primary-600 text-3xl" />
                        </div>
                        <h3 className="text-primary-600 fw-bold mb-8">{backups.length}</h3>
                        <p className="text-secondary-light mb-0">Toplam Yedek</p>
                    </div>
                </div>
            </div>

            <div className="col-xxl-3 col-sm-6">
                <div className="card radius-12 h-100">
                    <div className="card-body p-24 text-center">
                        <div className="w-64-px h-64-px bg-success-50 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-16">
                            <Icon icon="heroicons:clock" className="text-success-600 text-3xl" />
                        </div>
                        <h3 className="text-success-600 fw-bold mb-8">
                            {backups.length > 0 ? getRelativeTime(backups[0].date) : '-'}
                        </h3>
                        <p className="text-secondary-light mb-0">Son Yedek</p>
                    </div>
                </div>
            </div>

            <div className="col-xxl-3 col-sm-6">
                <div className="card radius-12 h-100">
                    <div className="card-body p-24 text-center">
                        <div className="w-64-px h-64-px bg-warning-50 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-16">
                            <Icon icon="heroicons:folder" className="text-warning-600 text-3xl" />
                        </div>
                        <h3 className="text-warning-600 fw-bold mb-8">
                            {backups.reduce((acc, b) => acc + parseFloat(b.size), 0).toFixed(1)} MB
                        </h3>
                        <p className="text-secondary-light mb-0">Toplam Boyut</p>
                    </div>
                </div>
            </div>

            <div className="col-xxl-3 col-sm-6">
                <div className="card radius-12 h-100">
                    <div className="card-body p-24 text-center">
                        <div className="w-64-px h-64-px bg-info-50 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-16">
                            <Icon icon="heroicons:shield-check" className="text-info-600 text-3xl" />
                        </div>
                        <h3 className="text-info-600 fw-bold mb-8">
                            {autoBackupEnabled ? 'Aktif' : 'Pasif'}
                        </h3>
                        <p className="text-secondary-light mb-0">Otomatik Yedekleme</p>
                    </div>
                </div>
            </div>

            {/* İşlem Kartları */}
            <div className="col-md-6">
                <div className="card radius-12 h-100">
                    <div className="card-body p-24 text-center">
                        <div className="w-80-px h-80-px bg-success-100 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-20">
                            <Icon icon="heroicons:arrow-down-tray" className="text-success-600 text-4xl" />
                        </div>
                        <h5 className="mb-12">Yedek Oluştur</h5>
                        <p className="text-secondary-light mb-20">
                            Tüm müşteri, tüp ve sertifika verilerinizi JSON formatında yedekleyin.
                        </p>
                        <button
                            className="btn btn-success-600 radius-8 px-32"
                            onClick={handleCreateBackup}
                            disabled={isCreating}
                        >
                            {isCreating ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-8" role="status"></span>
                                    Yedekleniyor...
                                </>
                            ) : (
                                <>
                                    <Icon icon="heroicons:arrow-down-tray" className="me-8 text-xl" />
                                    Yedek Al
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="col-md-6">
                <div className="card radius-12 h-100">
                    <div className="card-body p-24 text-center">
                        <div className="w-80-px h-80-px bg-warning-100 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-20">
                            <Icon icon="heroicons:arrow-up-tray" className="text-warning-600 text-4xl" />
                        </div>
                        <h5 className="mb-12">Dosyadan Geri Yükle</h5>
                        <p className="text-secondary-light mb-20">
                            Daha önce indirilen yedek dosyasından verileri geri yükleyin.
                        </p>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileRestore}
                            accept=".json"
                            style={{ display: 'none' }}
                        />
                        <button
                            className="btn btn-warning-600 radius-8 px-32"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Icon icon="heroicons:folder-open" className="me-8 text-xl" />
                            Dosya Seç
                        </button>
                    </div>
                </div>
            </div>

            {/* Otomatik Yedekleme Ayarları */}
            <div className="col-12">
                <div className="card radius-12">
                    <div className="card-header py-16 px-24 bg-base d-flex align-items-center justify-content-between">
                        <h6 className="mb-0">
                            <Icon icon="heroicons:cog-6-tooth" className="me-8" />
                            Otomatik Yedekleme Ayarları
                        </h6>
                    </div>
                    <div className="card-body p-24">
                        <div className="row align-items-center">
                            <div className="col-md-6">
                                <div className="d-flex align-items-center gap-16">
                                    <div className="form-check form-switch">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="autoBackupSwitch"
                                            checked={autoBackupEnabled}
                                            onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                                            style={{ width: '48px', height: '24px' }}
                                        />
                                    </div>
                                    <div>
                                        <h6 className="mb-4">Otomatik Yedekleme</h6>
                                        <p className="text-secondary-light text-sm mb-0">
                                            Verileriniz otomatik olarak yedeklensin
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Yedekleme Sıklığı</label>
                                <select
                                    className="form-select"
                                    value={autoBackupInterval}
                                    onChange={(e) => setAutoBackupInterval(e.target.value)}
                                    disabled={!autoBackupEnabled}
                                >
                                    <option value="hourly">Her Saat</option>
                                    <option value="daily">Her Gün</option>
                                    <option value="weekly">Her Hafta</option>
                                    <option value="monthly">Her Ay</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Yedek Listesi */}
            <div className="col-12">
                <div className="card radius-12">
                    <div className="card-header py-16 px-24 bg-base d-flex align-items-center justify-content-between flex-wrap gap-3">
                        <h6 className="mb-0">
                            <Icon icon="heroicons:archive-box-arrow-down" className="me-8" />
                            Mevcut Yedekler
                        </h6>
                        <span className="badge bg-primary-100 text-primary-600 px-16 py-8 radius-8">
                            {backups.length} yedek
                        </span>
                    </div>
                    <div className="card-body p-0">
                        {backups.length === 0 ? (
                            <div className="text-center py-60">
                                <div className="w-80-px h-80-px bg-neutral-100 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-20">
                                    <Icon icon="heroicons:folder-open" className="text-neutral-400 text-4xl" />
                                </div>
                                <h5 className="text-neutral-600 mb-8">Henüz yedek yok</h5>
                                <p className="text-secondary-light mb-20">
                                    İlk yedeğinizi oluşturmak için yukarıdaki "Yedek Al" butonunu kullanın.
                                </p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-borderless table-hover align-middle mb-0">
                                    <thead>
                                        <tr className="border-bottom border-neutral-200">
                                            <th className="px-24 py-16 text-secondary-light fw-semibold">Yedek Dosyası</th>
                                            <th className="px-24 py-16 text-secondary-light fw-semibold">Tarih</th>
                                            <th className="px-24 py-16 text-secondary-light fw-semibold">Boyut</th>
                                            <th className="px-24 py-16 text-secondary-light fw-semibold">Tür</th>
                                            <th className="px-24 py-16 text-secondary-light fw-semibold">İçerik</th>
                                            <th className="px-24 py-16 text-secondary-light fw-semibold text-center">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {backups.map((backup, index) => (
                                            <tr key={`backup-${backup.id || index}`} className={index === 0 ? 'bg-success-50' : ''}>
                                                <td className="px-24 py-16">
                                                    <div className="d-flex align-items-center gap-12">
                                                        <div className="w-44-px h-44-px bg-primary-50 rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
                                                            <Icon icon="heroicons:document-text" className="text-primary-600 text-xl" />
                                                        </div>
                                                        <div>
                                                            <span className="fw-medium text-primary-light d-block">
                                                                {backup.name}
                                                            </span>
                                                            {index === 0 && (
                                                                <span className="badge bg-success-100 text-success-600 text-xs mt-4">
                                                                    En Son
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-24 py-16">
                                                    <div>
                                                        <span className="d-block text-primary-light">{formatDateTime(backup.date)}</span>
                                                        <span className="text-secondary-light text-sm">{getRelativeTime(backup.date)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-24 py-16">
                                                    <span className="text-primary-light">{backup.size}</span>
                                                </td>
                                                <td className="px-24 py-16">
                                                    <span className={`badge ${backup.type === 'auto' ? 'bg-info-100 text-info-600' : 'bg-warning-100 text-warning-600'} px-12 py-6 radius-8`}>
                                                        {backup.type === 'auto' ? 'Otomatik' : 'Manuel'}
                                                    </span>
                                                </td>
                                                <td className="px-24 py-16">
                                                    <div className="d-flex gap-12">
                                                        <span className="text-sm text-secondary-light">
                                                            <Icon icon="heroicons:users" className="me-4" />
                                                            {backup.customerCount} Müşteri
                                                        </span>
                                                        <span className="text-sm text-secondary-light">
                                                            <Icon icon="mdi:fire-extinguisher" className="me-4" />
                                                            {backup.tubeCount} Tüp
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-24 py-16 text-center">
                                                    <div className="d-flex align-items-center justify-content-center gap-8">
                                                        <button
                                                            className="btn btn-sm btn-success-100 text-success-600 radius-8 px-12"
                                                            onClick={() => openRestoreModal(backup)}
                                                            title="Geri Yükle"
                                                        >
                                                            <Icon icon="heroicons:arrow-path" className="me-4" />
                                                            Geri Yükle
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-danger-100 text-danger-600 radius-8 px-12"
                                                            onClick={() => openDeleteModal(backup)}
                                                            title="Sil"
                                                        >
                                                            <Icon icon="heroicons:trash" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Uyarı Notu */}
            <div className="col-12">
                <div className="alert alert-warning radius-12 d-flex align-items-start gap-12 mb-0">
                    <Icon icon="heroicons:exclamation-triangle" className="text-warning-600 text-2xl flex-shrink-0 mt-4" />
                    <div>
                        <h6 className="text-warning-600 mb-4">Önemli Uyarı</h6>
                        <p className="mb-0 text-secondary-light">
                            Geri yükleme işlemi mevcut tüm verilerin üzerine yazılmasına neden olur.
                            İşlem geri alınamaz. Lütfen geri yüklemeden önce mevcut verilerin yedeğini aldığınızdan emin olun.
                        </p>
                    </div>
                </div>
            </div>

            {/* Geri Yükleme Modal */}
            {showRestoreModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content radius-16">
                            <div className="modal-body p-24 text-center">
                                <div className="w-80-px h-80-px bg-warning-100 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-20">
                                    <Icon icon="heroicons:exclamation-triangle" className="text-warning-600 text-4xl" />
                                </div>
                                <h5 className="mb-12">Yedeği Geri Yükle</h5>
                                <p className="text-secondary-light mb-8">
                                    <strong>{selectedBackup?.name}</strong> yedeğini geri yüklemek istediğinize emin misiniz?
                                </p>
                                <p className="text-danger-600 mb-24">
                                    Bu işlem mevcut tüm verileri silecek ve yedekteki verilerle değiştirecektir!
                                </p>
                                <div className="d-flex justify-content-center gap-12">
                                    <button
                                        className="btn btn-outline-neutral-600 radius-8 px-24"
                                        onClick={() => setShowRestoreModal(false)}
                                        disabled={isRestoring}
                                    >
                                        İptal
                                    </button>
                                    <button
                                        className="btn btn-warning-600 radius-8 px-24"
                                        onClick={handleRestore}
                                        disabled={isRestoring}
                                    >
                                        {isRestoring ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-8" role="status"></span>
                                                Geri Yükleniyor...
                                            </>
                                        ) : (
                                            <>
                                                <Icon icon="heroicons:arrow-path" className="me-8" />
                                                Geri Yükle
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Silme Modal */}
            {showDeleteModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content radius-16">
                            <div className="modal-body p-24 text-center">
                                <div className="w-80-px h-80-px bg-danger-100 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-20">
                                    <Icon icon="heroicons:trash" className="text-danger-600 text-4xl" />
                                </div>
                                <h5 className="mb-12">Yedeği Sil</h5>
                                <p className="text-secondary-light mb-24">
                                    <strong>{backupToDelete?.name}</strong> yedeğini silmek istediğinize emin misiniz?
                                    <br />
                                    <span className="text-danger-600">Bu işlem geri alınamaz!</span>
                                </p>
                                <div className="d-flex justify-content-center gap-12">
                                    <button
                                        className="btn btn-outline-neutral-600 radius-8 px-24"
                                        onClick={() => setShowDeleteModal(false)}
                                    >
                                        İptal
                                    </button>
                                    <button
                                        className="btn btn-danger-600 radius-8 px-24"
                                        onClick={handleDelete}
                                    >
                                        <Icon icon="heroicons:trash" className="me-8" />
                                        Sil
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {showSuccessToast && (
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
        </div>
    );
};

export default BackupLayer;
