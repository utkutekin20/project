import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
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
        <div className={`position-fixed bottom-0 end-0 m-3 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg d-flex align-items-center gap-2`} style={{ zIndex: 9999 }}>
            <Icon icon={type === 'success' ? 'heroicons:check-circle' : type === 'error' ? 'heroicons:x-circle' : 'heroicons:information-circle'} className="text-xl" />
            <span>{message}</span>
        </div>
    );
};

const LogsLayer = () => {
    const [logs, setLogs] = useState([]);
    const [toast, setToast] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    // eslint-disable-next-line no-unused-vars
    const [loading, setLoading] = useState(true);

    // Veritabanından logları çek
    useEffect(() => {
        const fetchLogs = async () => {
            try {
                if (window.api) {
                    const result = await window.api.logs.list();
                    if (result.success) {
                        setLogs(result.data);
                    }
                }
            } catch (error) {
                console.error('Log çekme hatası:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
    };

    // İşlem tipi yapılandırması
    const getActionConfig = (action) => {
        const configs = {
            'TÜP_EKLE': { label: 'Tüp Ekleme', icon: 'heroicons:plus-circle', bg: 'bg-success-focus', text: 'text-success-main' },
            'TÜP_SİL': { label: 'Tüp Silme', icon: 'heroicons:trash', bg: 'bg-danger-focus', text: 'text-danger-main' },
            'MÜŞTERİ_EKLE': { label: 'Müşteri Ekleme', icon: 'heroicons:user-plus', bg: 'bg-info-focus', text: 'text-info-main' },
            'MÜŞTERİ_GÜNCELLE': { label: 'Müşteri Güncelleme', icon: 'heroicons:pencil', bg: 'bg-warning-focus', text: 'text-warning-main' },
            'MÜŞTERİ_SİL': { label: 'Müşteri Silme', icon: 'heroicons:user-minus', bg: 'bg-danger-focus', text: 'text-danger-main' },
            'YEDEKLEME': { label: 'Yedekleme', icon: 'heroicons:cloud-arrow-up', bg: 'bg-primary-focus', text: 'text-primary-main' },
            'GERİ_YÜKLEME': { label: 'Geri Yükleme', icon: 'heroicons:arrow-path', bg: 'bg-purple-focus', text: 'text-purple-main' },
            'SERTİFİKA_EKLE': { label: 'Sertifika Oluşturma', icon: 'heroicons:document-check', bg: 'bg-success-focus', text: 'text-success-main' },
            'FİYAT_GÜNCELLE': { label: 'Fiyat Güncelleme', icon: 'heroicons:currency-dollar', bg: 'bg-warning-focus', text: 'text-warning-main' },
            'system': { label: 'Sistem', icon: 'heroicons:cpu-chip', bg: 'bg-secondary-focus', text: 'text-secondary-main' },
        };
        return configs[action] || { label: action || 'İşlem', icon: 'heroicons:information-circle', bg: 'bg-secondary-focus', text: 'text-secondary-main' };
    };

    // Filtrelenmiş loglar
    const filteredLogs = logs.filter(log => {
        const matchesSearch = searchTerm === '' ||
            (log.islem_detay && log.islem_detay.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (log.islem_tipi && log.islem_tipi.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesAction = actionFilter === '' || log.islem_tipi === actionFilter;

        let matchesDate = true;
        if (dateFilter) {
            const logDate = new Date(log.created_at).toISOString().split('T')[0];
            matchesDate = logDate === dateFilter;
        }

        return matchesSearch && matchesAction && matchesDate;
    });

    // Benzersiz işlem tipleri
    const uniqueActions = [...new Set(logs.map(l => l.islem_tipi))];

    // Tarihi formatla
    const formatDateTime = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Meta verisini formatla
    const formatMeta = (meta) => {
        if (!meta || Object.keys(meta).length === 0) return '-';
        return Object.entries(meta)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
    };

    // Logları temizle
    const clearLogs = () => {
        if (window.confirm('Tüm log kayıtlarını silmek istediğinize emin misiniz?')) {
            setLogs([]);
            showToast('Log kayıtları temizlendi', 'success');
        }
    };

    // CSV dışa aktar
    const exportToCSV = () => {
        const headers = ['Tarih', 'İşlem', 'Açıklama', 'Detay'];
        const csvContent = [
            '\uFEFF' + headers.join(';'),
            ...filteredLogs.map(log => [
                formatDateTime(log.created_at),
                getActionConfig(log.action).label,
                log.message,
                formatMeta(log.meta)
            ].join(';'))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `islem_gecmisi_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        showToast('Log dosyası indirildi', 'success');
    };

    // İstatistikler
    const stats = {
        total: logs.length,
        today: logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length,
        thisWeek: logs.filter(l => {
            const logDate = new Date(l.created_at);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return logDate >= weekAgo;
        }).length,
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
                <div className="card radius-12 border-0 bg-primary-600">
                    <div className="card-body p-24">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                            <div className="d-flex align-items-center gap-3">
                                <div className="w-64-px h-64-px bg-white rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
                                    <Icon icon="heroicons:clock" className="text-primary-600 text-3xl" />
                                </div>
                                <div>
                                    <h4 className="mb-1 text-white fw-bold">İşlem Geçmişi</h4>
                                    <p className="text-white text-opacity-75 mb-0 text-sm">Sistem üzerindeki tüm kritik işlemlerin kronolojik kayıtları</p>
                                </div>
                            </div>
                            <div className="d-flex flex-wrap gap-2">
                                <button
                                    className="btn btn-white text-primary-600 d-flex align-items-center gap-2 radius-8 px-20 py-10 fw-semibold shadow-sm"
                                    onClick={exportToCSV}
                                >
                                    <Icon icon="heroicons:arrow-down-tray" className="text-xl" />
                                    Dışa Aktar (CSV)
                                </button>
                                <button
                                    className="btn btn-danger-600 text-white d-flex align-items-center gap-2 radius-8 px-20 py-10 fw-semibold shadow-sm"
                                    onClick={clearLogs}
                                >
                                    <Icon icon="heroicons:trash" className="text-xl" />
                                    Tümünü Temizle
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* İstatistik Kartları */}
            <div className="col-lg-4 col-sm-6">
                <div className="card h-100 radius-12 shadow-none border">
                    <div className="card-body p-20">
                        <div className="d-flex align-items-center gap-3">
                            <div className="w-56-px h-56-px radius-12 bg-primary-100 d-flex justify-content-center align-items-center">
                                <Icon icon="heroicons:document-text" className="text-primary-600 text-2xl" />
                            </div>
                            <div>
                                <span className="text-secondary-light text-sm">Toplam Kayıt</span>
                                <h4 className="mb-0 text-primary-600 fw-bold">{stats.total}</h4>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-lg-4 col-sm-6">
                <div className="card h-100 radius-12 shadow-none border">
                    <div className="card-body p-20">
                        <div className="d-flex align-items-center gap-3">
                            <div className="w-56-px h-56-px radius-12 bg-success-100 d-flex justify-content-center align-items-center">
                                <Icon icon="heroicons:calendar" className="text-success-600 text-2xl" />
                            </div>
                            <div>
                                <span className="text-secondary-light text-sm">Bugün</span>
                                <h4 className="mb-0 text-success-600 fw-bold">{stats.today}</h4>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-lg-4 col-sm-6">
                <div className="card h-100 radius-12 shadow-none border">
                    <div className="card-body p-20">
                        <div className="d-flex align-items-center gap-3">
                            <div className="w-56-px h-56-px radius-12 bg-info-100 d-flex justify-content-center align-items-center">
                                <Icon icon="heroicons:calendar-days" className="text-info-600 text-2xl" />
                            </div>
                            <div>
                                <span className="text-secondary-light text-sm">Bu Hafta</span>
                                <h4 className="mb-0 text-info-600 fw-bold">{stats.thisWeek}</h4>
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
                            <div className="col-md-4">
                                <label className="form-label fw-semibold text-primary-light text-sm mb-8">
                                    Ara
                                </label>
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        className="form-control radius-8 ps-40"
                                        placeholder="Mesaj veya detay ara..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <Icon icon="heroicons:magnifying-glass" className="position-absolute top-50 translate-middle-y ms-12 text-secondary-light text-xl" />
                                </div>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-semibold text-primary-light text-sm mb-8">
                                    İşlem Tipi
                                </label>
                                <select
                                    className="form-control radius-8 form-select"
                                    value={actionFilter}
                                    onChange={(e) => setActionFilter(e.target.value)}
                                >
                                    <option value="">Tümü</option>
                                    {uniqueActions.map((action, index) => (
                                        <option key={`action-${action}-${index}`} value={action}>
                                            {getActionConfig(action).label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-semibold text-primary-light text-sm mb-8">
                                    Tarih
                                </label>
                                <DatePicker
                                    id="dateFilter"
                                    placeholder="Tarih seçin"
                                    value={dateFilter}
                                    onChange={setDateFilter}
                                />
                            </div>
                            <div className="col-md-2">
                                <button
                                    className="btn btn-outline-secondary w-100 radius-8 d-flex align-items-center justify-content-center gap-2"
                                    onClick={() => { setSearchTerm(''); setActionFilter(''); setDateFilter(''); }}
                                >
                                    <Icon icon="heroicons:x-mark" className="text-xl" />
                                    Temizle
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Log Tablosu */}
            <div className="col-12">
                <div className="card basic-data-table radius-12">
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table bordered-table mb-0">
                                <thead>
                                    <tr>
                                        <th scope="col" className="bg-primary-50 text-primary-600" style={{ width: '180px' }}>Tarih</th>
                                        <th scope="col" className="bg-primary-50 text-primary-600" style={{ width: '180px' }}>Kategori</th>
                                        <th scope="col" className="bg-primary-50 text-primary-600">İşlem Detayı</th>
                                        <th scope="col" className="bg-primary-50 text-primary-600" style={{ width: '150px' }}>Kullanıcı</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="text-center py-40">
                                                <div className="d-flex flex-column align-items-center gap-3">
                                                    <Icon icon="heroicons:inbox" className="text-secondary-light" style={{ fontSize: '64px' }} />
                                                    <div>
                                                        <h6 className="text-secondary-light mb-1">Log kaydı bulunamadı</h6>
                                                        <p className="text-secondary-light mb-0">İşlem geçmişi boş veya filtrelerinize uygun kayıt yok</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLogs.map((log, index) => {
                                            const actionConfig = getActionConfig(log.islem_tipi);
                                            return (
                                                <tr key={`log-${log.id || index}`}>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div className="w-32-px h-32-px d-flex justify-content-center align-items-center bg-neutral-100 rounded-circle flex-shrink-0">
                                                                <Icon icon="heroicons:calendar" className="text-secondary-light text-sm" />
                                                            </div>
                                                            <span className="text-secondary-light text-sm fw-medium">
                                                                {formatDateTime(log.created_at)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`${actionConfig.bg} ${actionConfig.text} px-16 py-6 rounded-pill fw-semibold text-xs d-inline-flex align-items-center gap-2 border`}>
                                                            <Icon icon={actionConfig.icon} />
                                                            {actionConfig.label}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div className={`w-8-px h-8-px rounded-circle ${actionConfig.bg.replace('-focus', '-main')}`}></div>
                                                            <span className="text-primary-light fw-semibold text-md">{log.islem_detay || '-'}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <Icon icon="heroicons:user-circle" className="text-secondary-light" />
                                                            <small className="text-secondary-light fw-medium">{log.kullanici || 'Admin'}</small>
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

                    {/* Alt Bilgi */}
                    {filteredLogs.length > 0 && (
                        <div className="card-footer bg-transparent border-top py-12 px-20">
                            <div className="d-flex justify-content-between align-items-center">
                                <span className="text-secondary-light text-sm">
                                    Toplam {filteredLogs.length} kayıt gösteriliyor
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LogsLayer;
