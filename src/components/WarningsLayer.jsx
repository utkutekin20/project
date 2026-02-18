import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';

// Tarih yardımcı fonksiyonları
const dateUtils = {
    // Bugünün tarihini saat olmadan al
    getToday: () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    },

    // Tarih string'ini Date objesine çevir
    parseDate: (dateStr) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        return date;
    },

    // İki tarih arasındaki gün farkını hesapla
    getDaysDiff: (date1, date2) => {
        const diffTime = date1 - date2;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },

    // Tarihi formatla
    formatDate: (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
};

const WarningsLayer = () => {
    const [tubes, setTubes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('expiring');

    // Firma ayarları
    const [companySettings, setCompanySettings] = useState({
        company_name: '',
        phone: '',
        address: ''
    });

    // Verileri çek
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                if (window.api) {
                    // Uyarı gerektiren tüpleri çek
                    const result = await window.api.tube.getExpiring();
                    if (result.success) {
                        // Her tüp için durum hesapla
                        const today = dateUtils.getToday();
                        const processedTubes = result.data.map(tube => {
                            const expDate = dateUtils.parseDate(tube.son_kullanim_tarihi);
                            const daysDiff = dateUtils.getDaysDiff(expDate, today);

                            let status, remainingDays;
                            if (daysDiff < 0) {
                                status = 'expired';
                                remainingDays = daysDiff; // Negatif değer
                            } else {
                                status = 'expiring';
                                remainingDays = daysDiff;
                            }

                            return {
                                ...tube,
                                status,
                                remainingDays
                            };
                        });
                        setTubes(processedTubes);
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

    // Filtrelenmiş tüpler
    const filteredTubes = tubes.filter(tube => tube.status === activeTab);

    // İstatistikler
    const stats = {
        expiring: tubes.filter(t => t.status === 'expiring').length,
        expired: tubes.filter(t => t.status === 'expired').length,
        critical: tubes.filter(t => t.status === 'expiring' && t.remainingDays <= 7).length,
    };

    // WhatsApp mesajı gönder
    const sendWhatsApp = async (tube) => {
        if (!tube.telefon) return;

        const yetkili = tube.yetkili || 'Sayın Yetkili';
        const firmaAdi = tube.firma_adi || '';

        // Firma bilgilerini ayarlardan al
        const firmName = companySettings.company_name || 'Firma';
        const firmPhone = companySettings.phone || '';
        const firmCity = companySettings.address ? companySettings.address.split('/').pop()?.split(',').pop()?.trim() || '' : '';

        let message;
        if (tube.status === 'expired') {
            message = `Sayın ${yetkili},

${firmName} olarak sizinle iletişime geçiyoruz.

🔴 ${firmaAdi} firmasına ait ${tube.seri_no} seri numaralı yangın tüpünün dolum süresi ${Math.abs(tube.remainingDays)} gün önce DOLMUŞTUR.

Güvenliğiniz için acil yenileme gerekmektedir.

📞 Randevu için: ${firmPhone}

${firmName}${firmCity ? '\n' + firmCity : ''}`;
        } else {
            message = `Sayın ${yetkili},

${firmName} olarak sizinle iletişime geçiyoruz.

⚠️ ${firmaAdi} firmasına ait ${tube.seri_no} seri numaralı yangın tüpünün dolum süresine ${tube.remainingDays} gün kalmıştır.

Yenileme randevusu almak ister misiniz?

📞 Randevu için: ${firmPhone}

${firmName}${firmCity ? '\n' + firmCity : ''}`;
        }

        const cleanPhone = tube.telefon.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('90') ? cleanPhone : '90' + cleanPhone;
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

        // Electron shell API kullan
        if (window.api && window.api.shell) {
            await window.api.shell.openExternal(whatsappUrl);
        } else {
            window.open(whatsappUrl, '_blank');
        }
    };

    // Toplu WhatsApp gönder
    const sendBulkWhatsApp = async () => {
        const tubesToNotify = filteredTubes.filter(t => t.telefon);
        if (tubesToNotify.length === 0) {
            alert('Telefon numarası kayıtlı müşteri bulunamadı.');
            return;
        }

        // İlk müşteriyi aç, diğerleri için uyarı ver
        if (tubesToNotify.length > 1) {
            alert(`${tubesToNotify.length} müşteriye bildirim gönderilecek. İlk müşteri ile başlıyorsunuz.`);
        }
        await sendWhatsApp(tubesToNotify[0]);
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

    return (
        <div className="row gy-4">
            {/* İstatistik Kartları */}
            <div className="col-lg-4 col-sm-6">
                <div className="card p-20 radius-12">
                    <div className="d-flex align-items-center gap-16">
                        <div className="w-56-px h-56-px bg-warning-100 text-warning-600 d-flex justify-content-center align-items-center radius-12 flex-shrink-0">
                            <Icon icon="heroicons:clock" className="text-2xl" />
                        </div>
                        <div>
                            <span className="text-secondary-light text-sm">Süresi Yaklaşan</span>
                            <h4 className="fw-semibold mb-0">{stats.expiring}</h4>
                        </div>
                    </div>
                </div>
            </div>
            <div className="col-lg-4 col-sm-6">
                <div className="card p-20 radius-12">
                    <div className="d-flex align-items-center gap-16">
                        <div className="w-56-px h-56-px bg-danger-100 text-danger-600 d-flex justify-content-center align-items-center radius-12 flex-shrink-0">
                            <Icon icon="heroicons:x-circle" className="text-2xl" />
                        </div>
                        <div>
                            <span className="text-secondary-light text-sm">Süresi Dolmuş</span>
                            <h4 className="fw-semibold mb-0">{stats.expired}</h4>
                        </div>
                    </div>
                </div>
            </div>
            <div className="col-lg-4 col-sm-6">
                <div className="card p-20 radius-12">
                    <div className="d-flex align-items-center gap-16">
                        <div className="w-56-px h-56-px bg-danger-100 text-danger-600 d-flex justify-content-center align-items-center radius-12 flex-shrink-0">
                            <Icon icon="heroicons:exclamation-triangle" className="text-2xl" />
                        </div>
                        <div>
                            <span className="text-secondary-light text-sm">Kritik (7 gün içinde)</span>
                            <h4 className="fw-semibold mb-0">{stats.critical}</h4>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab ve Tablo */}
            <div className="col-12">
                <div className="card">
                    <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
                        <ul className="nav nav-pills" role="tablist">
                            <li className="nav-item" role="presentation">
                                <button
                                    className={`nav-link d-flex align-items-center gap-2 ${activeTab === 'expiring' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('expiring')}
                                    type="button"
                                >
                                    Süresi Yaklaşan
                                    <span className="badge bg-warning-600">{stats.expiring}</span>
                                </button>
                            </li>
                            <li className="nav-item" role="presentation">
                                <button
                                    className={`nav-link d-flex align-items-center gap-2 ${activeTab === 'expired' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('expired')}
                                    type="button"
                                >
                                    Süresi Dolmuş
                                    <span className="badge bg-danger-600">{stats.expired}</span>
                                </button>
                            </li>
                        </ul>
                        <div className="d-flex gap-2">
                            {filteredTubes.length > 0 && (
                                <button
                                    type="button"
                                    onClick={sendBulkWhatsApp}
                                    className="btn btn-success-600 d-flex align-items-center gap-2 radius-8 px-16 py-8"
                                >
                                    <Icon icon="mdi:whatsapp" className="text-lg" />
                                    Toplu Bildirim
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="card-body">
                        {filteredTubes.length === 0 ? (
                            <div className="text-center py-40">
                                <Icon icon="heroicons:check-circle" className="text-success-600 text-5xl mb-12" />
                                <h6 className="text-primary-light">
                                    {activeTab === 'expiring' ? 'Süresi yaklaşan tüp yok' : 'Süresi dolmuş tüp yok'}
                                </h6>
                                <p className="text-secondary-light">Tüm tüpler normal durumda.</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table bordered-table mb-0">
                                    <thead>
                                        <tr>
                                            <th>Barkod No</th>
                                            <th>Firma</th>
                                            <th>Yetkili</th>
                                            <th>Telefon</th>
                                            <th>Tüp Cinsi</th>
                                            <th>Kilo</th>
                                            <th>Son Kullanım</th>
                                            <th>Kalan Süre</th>
                                            <th className="text-center">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTubes.map((tube) => {
                                            const isExpired = tube.status === 'expired';
                                            const isCritical = !isExpired && tube.remainingDays <= 7;

                                            return (
                                                <tr key={tube.id} className={isExpired ? 'bg-danger-50' : isCritical ? 'bg-warning-50' : ''}>
                                                    <td className="fw-medium font-monospace">{tube.seri_no}</td>
                                                    <td>
                                                        <span className="fw-medium">{tube.firma_adi || '-'}</span>
                                                    </td>
                                                    <td>
                                                        <span className="text-secondary-light">{tube.yetkili || '-'}</span>
                                                    </td>
                                                    <td>
                                                        <span className="text-secondary-light">{tube.telefon || '-'}</span>
                                                    </td>
                                                    <td>{tube.tup_cinsi}</td>
                                                    <td>{tube.kilo} kg</td>
                                                    <td>{dateUtils.formatDate(tube.son_kullanim_tarihi)}</td>
                                                    <td>
                                                        <span className={`${isExpired ? 'bg-danger-focus text-danger-main' : isCritical ? 'bg-danger-focus text-danger-main' : 'bg-warning-focus text-warning-main'} px-16 py-4 rounded-pill fw-medium text-sm`}>
                                                            {isExpired
                                                                ? `${Math.abs(tube.remainingDays)} gün geçti`
                                                                : `${tube.remainingDays} gün kaldı`
                                                            }
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        {tube.telefon ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => sendWhatsApp(tube)}
                                                                className="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center"
                                                                title="WhatsApp ile bilgilendir"
                                                            >
                                                                <Icon icon="mdi:whatsapp" />
                                                            </button>
                                                        ) : (
                                                            <span className="text-secondary-light text-sm">-</span>
                                                        )}
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
        </div>
    );
};

export default WarningsLayer;
