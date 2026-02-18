import { Icon } from '@iconify/react/dist/iconify.js';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const DashboardLayer = () => {
    const [stats, setStats] = useState({
        customerCount: 0,
        tubeCount: 0,
        activeTubeCount: 0,
        certificateCount: 0,
        recentTubes: 0,
        expiringTubes: 0
    });
    const [recentTubes, setRecentTubes] = useState([]);
    const [recentCustomers, setRecentCustomers] = useState([]);
    const [tubeDistribution, setTubeDistribution] = useState([]);
    const [todayCalls, setTodayCalls] = useState([]);
    const [daysFilter, setDaysFilter] = useState(7);
    const [loading, setLoading] = useState(true);
    const [companySettings, setCompanySettings] = useState({
        company_name: '',
        phone: '',
        address: ''
    });

    // Veritabanından verileri çek
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Electron API kontrolü
                if (window.api) {
                    // İstatistikler
                    const statsResult = await window.api.stats.get();
                    if (statsResult.success) {
                        setStats(statsResult.data);
                    }

                    // Son tüpler
                    const tubesResult = await window.api.tube.list();
                    if (tubesResult.success) {
                        const tubes = tubesResult.data.slice(0, 5).map(tube => {
                            const now = new Date();
                            const expDate = new Date(tube.son_kullanim_tarihi);
                            const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
                            let status = 'active';
                            if (diffDays <= 0) status = 'expired';
                            else if (diffDays <= 30) status = 'warning';

                            return {
                                ...tube,
                                status,
                                tarih: new Date(tube.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
                            };
                        });
                        setRecentTubes(tubes);

                        // Tüp cinsi dağılımı
                        const distribution = {};
                        tubesResult.data.forEach(tube => {
                            distribution[tube.tup_cinsi] = (distribution[tube.tup_cinsi] || 0) + 1;
                        });
                        const colors = ['bg-primary-600', 'bg-success-main', 'bg-warning-main', 'bg-info-main', 'bg-purple', 'bg-secondary-main'];
                        const distArray = Object.entries(distribution).map(([name, count], index) => ({
                            name,
                            count,
                            color: colors[index % colors.length]
                        }));
                        setTubeDistribution(distArray);
                    }

                    // Son müşteriler
                    const customersResult = await window.api.customer.list();
                    if (customersResult.success) {
                        const customers = customersResult.data.slice(0, 5).map(c => ({
                            id: c.id,
                            firma_adi: c.firma_adi,
                            yetkili: c.yetkili_adi || '-',
                            telefon: c.telefon || '-',
                            tubeCount: c.tup_sayisi || 0
                        }));
                        setRecentCustomers(customers);
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

    // Bugün aranacakları getir
    useEffect(() => {
        const loadTodayCalls = async () => {
            if (window.api && window.api.call) {
                try {
                    const result = await window.api.call.getTodayCalls({ daysAhead: daysFilter });
                    if (result.success) {
                        setTodayCalls(result.data);
                    }
                } catch (error) {
                    console.error('Bugün aranacaklar yüklenirken hata:', error);
                }
            }
        };
        loadTodayCalls();
    }, [daysFilter]);

    const handleWhatsApp = async (call) => {
        if (!window.api || !window.api.shell || !call.telefon) return;
        const cleanPhone = call.telefon.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('90') ? cleanPhone : '90' + cleanPhone;
        
        const expiryDate = new Date(call.earliest_expiry).toLocaleDateString('tr-TR');
        const today = new Date();
        const expDate = new Date(call.earliest_expiry);
        const isExpired = expDate < today;
        
        // Firma bilgilerini ayarlardan al
        const firmName = companySettings.company_name || 'Firma';
        const firmPhone = companySettings.phone || '';
        const firmCity = companySettings.address ? companySettings.address.split('/').pop()?.split(',').pop()?.trim() || '' : '';
        
        let message = '';
        if (isExpired) {
            message = `Sayın ${call.firma_adi},

${firmName} olarak sizinle iletişime geçiyoruz.

🔴 Firmanıza ait ${call.expiring_tube_count} adet yangın tüpünün dolum süresi ${expiryDate} tarihinde DOLMUŞTUR.

Güvenliğiniz için tüplerinizin acil olarak yenilenmesi gerekmektedir.

📞 Randevu için: ${firmPhone}

${firmName}${firmCity ? '\n' + firmCity : ''}`;
        } else {
            message = `Sayın ${call.firma_adi},

${firmName} olarak sizinle iletişime geçiyoruz.

⚠️ Firmanıza ait ${call.expiring_tube_count} adet yangın tüpünün dolum süresi ${expiryDate} tarihinde dolacaktır.

Süresi dolmadan yenileme randevusu almanızı öneriyoruz.

📞 Randevu için: ${firmPhone}

${firmName}${firmCity ? '\n' + firmCity : ''}`;
        }
        
        await window.api.shell.openExternal(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`);
    };

    const handleMarkAsCalled = async (customerId) => {
        if (window.api && window.api.call) {
            try {
                await window.api.call.markAsCalled({ customerId, status: 'called' });
                // Listeyi yenile
                const result = await window.api.call.getTodayCalls({ daysAhead: daysFilter });
                if (result.success) setTodayCalls(result.data);
            } catch (error) {
                console.error('İşaretleme hatası:', error);
            }
        }
    };

    // Durum badge'i
    const getStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <span className="bg-success-focus text-success-main px-16 py-4 rounded-pill fw-medium text-sm">Aktif</span>;
            case 'warning':
                return <span className="bg-warning-focus text-warning-main px-16 py-4 rounded-pill fw-medium text-sm">Yaklaşıyor</span>;
            case 'expired':
                return <span className="bg-danger-focus text-danger-main px-16 py-4 rounded-pill fw-medium text-sm">Dolmuş</span>;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Uyarı Banner */}
            {stats.expiringTubes > 0 && (
                <div className="card border border-warning-200 bg-warning-50 mb-24">
                    <div className="card-body p-16 d-flex flex-wrap align-items-center justify-content-between gap-3">
                        <div className="d-flex align-items-center gap-12">
                            <div className="w-48-px h-48-px bg-warning-main rounded-circle d-flex justify-content-center align-items-center flex-shrink-0">
                                <Icon icon="heroicons:exclamation-triangle" className="text-white text-xl" />
                            </div>
                            <div>
                                <h6 className="fw-semibold text-warning-600 mb-4">Dikkat Edilmesi Gereken Tüpler</h6>
                                <p className="text-secondary-light text-sm mb-0">
                                    {stats.expiringTubes} tüpün süresi 30 gün içinde dolacak.
                                </p>
                            </div>
                        </div>
                        <Link to="/warnings" className="btn btn-warning-600 text-white radius-8 px-20 py-10">
                            Detayları Gör
                        </Link>
                    </div>
                </div>
            )}

            {/* Bugün Aranacaklar Paneli */}
            <div className="card h-100 mb-24">
                <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-2">
                        <div className="w-32-px h-32-px bg-primary-100 text-primary-600 rounded-circle d-flex justify-content-center align-items-center">
                            <Icon icon="heroicons:phone" className="text-lg" />
                        </div>
                        <h6 className="text-lg fw-bold mb-0">Bugün Aranacaklar</h6>
                    </div>
                    <select
                        className="form-select w-auto text-sm py-8"
                        value={daysFilter}
                        onChange={(e) => setDaysFilter(parseInt(e.target.value))}
                    >
                        <option value={7}>7 Gün İçinde</option>
                        <option value={14}>14 Gün İçinde</option>
                        <option value={30}>30 Gün İçinde</option>
                    </select>
                </div>
                <div className="card-body p-24">
                    {todayCalls.length === 0 ? (
                        <div className="text-center py-40">
                            <div className="w-64-px h-64-px bg-success-50 text-success-main rounded-circle d-flex justify-content-center align-items-center mx-auto mb-16">
                                <Icon icon="heroicons:check" className="text-3xl" />
                            </div>
                            <h6 className="mb-8">Harika!</h6>
                            <p className="text-secondary-light mb-0">Bugün aranacak müşteri bulunmuyor.</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table bordered-table mb-0">
                                <thead>
                                    <tr>
                                        <th>Firma</th>
                                        <th>Yetkili</th>
                                        <th>Süresi Biten Tüp</th>
                                        <th>Tarih</th>
                                        <th>Durum</th>
                                        <th className="text-end">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {todayCalls.map((call) => (
                                        <tr key={call.customer_id} className={call.call_status === 'called' ? 'bg-success-50' : ''}>
                                            <td>
                                                <div className="fw-medium text-primary-dark">{call.firma_adi}</div>
                                                <div className="text-xs text-secondary-light">{call.telefon || '-'}</div>
                                            </td>
                                            <td>{call.yetkili || '-'}</td>
                                            <td>
                                                <span className="badge bg-danger-focus text-danger-main px-8 py-4 rounded-pill">
                                                    {call.expiring_tube_count} Tüp
                                                </span>
                                            </td>
                                            <td>
                                                {new Date(call.earliest_expiry).toLocaleDateString('tr-TR')}
                                            </td>
                                            <td>
                                                {call.call_status === 'called' ? (
                                                    <span className="badge bg-success-100 text-success-700 px-8 py-4 rounded-pill">
                                                        Arandı
                                                    </span>
                                                ) : (
                                                    <span className="badge bg-warning-100 text-warning-700 px-8 py-4 rounded-pill">
                                                        Bekliyor
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center justify-content-end gap-2">
                                                    {call.telefon && (
                                                        <button
                                                            className="btn btn-sm btn-success-600 text-white p-8 d-flex align-items-center justify-content-center rounded-circle"
                                                            onClick={() => handleWhatsApp(call)}
                                                            title="WhatsApp ile hatırlatma gönder"
                                                        >
                                                            <Icon icon="logos:whatsapp-icon" width="18" />
                                                        </button>
                                                    )}
                                                    {call.call_status !== 'called' && (
                                                        <button
                                                            className="btn btn-sm btn-primary-600 text-white d-flex align-items-center gap-2 px-12 py-6 rounded-pill"
                                                            onClick={() => handleMarkAsCalled(call.customer_id)}
                                                        >
                                                            <Icon icon="heroicons:check" />
                                                            Arandı
                                                        </button>
                                                    )}
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

            {/* İstatistik Kartları */}
            <div className="row row-cols-xxxl-5 row-cols-lg-3 row-cols-sm-2 row-cols-1 gy-4">
                <div className="col">
                    <div className="card shadow-none border bg-gradient-start-1 h-100">
                        <div className="card-body p-20">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                                <div>
                                    <p className="fw-medium text-primary-light mb-1">Toplam Müşteri</p>
                                    <h6 className="mb-0">{stats.customerCount}</h6>
                                </div>
                                <div className="w-50-px h-50-px bg-cyan rounded-circle d-flex justify-content-center align-items-center">
                                    <Icon icon="heroicons:user-group" className="text-white text-2xl mb-0" />
                                </div>
                            </div>
                            <p className="fw-medium text-sm text-primary-light mt-12 mb-0">
                                <Link to="/customers" className="text-primary-600 d-inline-flex align-items-center gap-1">
                                    Müşterilere Git <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
                <div className="col">
                    <div className="card shadow-none border bg-gradient-start-2 h-100">
                        <div className="card-body p-20">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                                <div>
                                    <p className="fw-medium text-primary-light mb-1">Toplam Tüp</p>
                                    <h6 className="mb-0">{stats.tubeCount}</h6>
                                </div>
                                <div className="w-50-px h-50-px bg-purple rounded-circle d-flex justify-content-center align-items-center">
                                    <Icon icon="mdi:fire-extinguisher" className="text-white text-2xl mb-0" />
                                </div>
                            </div>
                            <p className="fw-medium text-sm text-primary-light mt-12 mb-0">
                                <Link to="/tube-list" className="text-primary-600 d-inline-flex align-items-center gap-1">
                                    Tüp Listesine Git <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
                <div className="col">
                    <div className="card shadow-none border bg-gradient-start-3 h-100">
                        <div className="card-body p-20">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                                <div>
                                    <p className="fw-medium text-primary-light mb-1">Aktif Tüp</p>
                                    <h6 className="mb-0">{stats.activeTubeCount}</h6>
                                </div>
                                <div className="w-50-px h-50-px bg-info rounded-circle d-flex justify-content-center align-items-center">
                                    <Icon icon="heroicons:check-circle" className="text-white text-2xl mb-0" />
                                </div>
                            </div>
                            <p className="fw-medium text-sm text-primary-light mt-12 mb-0 d-flex align-items-center gap-2">
                                <span className="d-inline-flex align-items-center gap-1 text-success-main">
                                    <Icon icon="heroicons:check" className="text-xs" /> Kullanımda
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
                <div className="col">
                    <div className="card shadow-none border bg-gradient-start-4 h-100">
                        <div className="card-body p-20">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                                <div>
                                    <p className="fw-medium text-primary-light mb-1">Süresi Yaklaşan</p>
                                    <h6 className="mb-0">{stats.expiringTubes}</h6>
                                </div>
                                <div className="w-50-px h-50-px bg-success-main rounded-circle d-flex justify-content-center align-items-center">
                                    <Icon icon="heroicons:exclamation-triangle" className="text-white text-2xl mb-0" />
                                </div>
                            </div>
                            <p className="fw-medium text-sm text-primary-light mt-12 mb-0 d-flex align-items-center gap-2">
                                <span className="d-inline-flex align-items-center gap-1 text-warning-main">
                                    <Icon icon="heroicons:clock" className="text-xs" /> 30 gün içinde
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
                <div className="col">
                    <div className="card shadow-none border bg-gradient-start-5 h-100">
                        <div className="card-body p-20">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                                <div>
                                    <p className="fw-medium text-primary-light mb-1">Sertifikalar</p>
                                    <h6 className="mb-0">{stats.certificateCount}</h6>
                                </div>
                                <div className="w-50-px h-50-px bg-red rounded-circle d-flex justify-content-center align-items-center">
                                    <Icon icon="heroicons:document-check" className="text-white text-2xl mb-0" />
                                </div>
                            </div>
                            <p className="fw-medium text-sm text-primary-light mt-12 mb-0">
                                <Link to="/certificates" className="text-primary-600 d-inline-flex align-items-center gap-1">
                                    Sertifikalara Git <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <section className="row gy-4 mt-1">
                {/* Son Kayıtlar */}
                <div className="col-xxl-8 col-xl-12">
                    <div className="card h-100">
                        <div className="card-body p-24">
                            <div className="d-flex flex-wrap align-items-center gap-1 justify-content-between mb-16">
                                <h6 className="mb-0 fw-bold text-lg">Son Tüp Kayıtları</h6>
                                <Link
                                    to="/tube-list"
                                    className="text-primary-600 hover-text-primary d-flex align-items-center gap-1"
                                >
                                    Tümünü Gör
                                    <Icon icon="solar:alt-arrow-right-linear" className="icon" />
                                </Link>
                            </div>
                            <div className="table-responsive scroll-sm">
                                <table className="table bordered-table sm-table mb-0">
                                    <thead>
                                        <tr>
                                            <th scope="col">Barkod No</th>
                                            <th scope="col">Firma</th>
                                            <th scope="col">Tüp Cinsi</th>
                                            <th scope="col">Tarih</th>
                                            <th scope="col" className="text-center">Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentTubes.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="text-center text-secondary-light py-20">
                                                    Henüz kayıt yok
                                                </td>
                                            </tr>
                                        ) : (
                                            recentTubes.map((tube) => (
                                                <tr key={tube.id}>
                                                    <td>
                                                        <span className="fw-medium">{tube.seri_no}</span>
                                                    </td>
                                                    <td>{tube.customer_name}</td>
                                                    <td>{tube.tup_cinsi} - {tube.kilo}kg</td>
                                                    <td>{tube.tarih}</td>
                                                    <td className="text-center">{getStatusBadge(tube.status)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Son Müşteriler */}
                <div className="col-xxl-4 col-xl-12">
                    <div className="card h-100">
                        <div className="card-body">
                            <div className="d-flex align-items-center flex-wrap gap-2 justify-content-between">
                                <h6 className="mb-2 fw-bold text-lg mb-0">Son Müşteriler</h6>
                                <Link
                                    to="/customers"
                                    className="text-primary-600 hover-text-primary d-flex align-items-center gap-1"
                                >
                                    Tümünü Gör
                                    <Icon icon="solar:alt-arrow-right-linear" className="icon" />
                                </Link>
                            </div>
                            <div className="mt-24">
                                {recentCustomers.length === 0 ? (
                                    <p className="text-center text-secondary-light py-20">Henüz müşteri yok</p>
                                ) : (
                                    recentCustomers.map((customer, index) => (
                                        <div
                                            key={customer.id}
                                            className={`d-flex align-items-center justify-content-between gap-3 ${index !== recentCustomers.length - 1 ? 'mb-20 pb-20 border-bottom' : ''}`}
                                        >
                                            <div className="d-flex align-items-center">
                                                <div className="w-40-px h-40-px bg-primary-100 rounded-circle flex-shrink-0 me-12 d-flex align-items-center justify-content-center">
                                                    <span className="text-primary-600 fw-semibold text-sm">
                                                        {customer.firma_adi.substring(0, 2).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="flex-grow-1">
                                                    <h6 className="text-md mb-0 fw-medium">{customer.firma_adi}</h6>
                                                    <span className="text-sm text-secondary-light fw-medium">
                                                        {customer.yetkili}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-primary-light text-md fw-medium">{customer.tubeCount} tüp</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tüp Cinsi Dağılımı */}
                <div className="col-xxl-6 col-xl-12">
                    <div className="card h-100">
                        <div className="card-body p-24">
                            <div className="d-flex align-items-center flex-wrap gap-2 justify-content-between mb-20">
                                <h6 className="mb-0 fw-bold text-lg">Tüp Cinsi Dağılımı</h6>
                            </div>
                            {tubeDistribution.length === 0 ? (
                                <p className="text-center text-secondary-light py-20">Henüz tüp yok</p>
                            ) : (
                                <div className="row g-3">
                                    {tubeDistribution.map((item, index) => (
                                        <div key={index} className="col-sm-4 col-6">
                                            <div className="bg-neutral-50 p-16 radius-8">
                                                <div className="d-flex align-items-center gap-12 mb-12">
                                                    <div className={`w-12-px h-12-px ${item.color} rounded-circle`}></div>
                                                    <span className="text-secondary-light text-sm fw-medium">{item.name}</span>
                                                </div>
                                                <h5 className="fw-semibold mb-0">{item.count}</h5>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Hızlı İşlemler */}
                <div className="col-xxl-6 col-xl-12">
                    <div className="card h-100">
                        <div className="card-body p-24">
                            <div className="d-flex align-items-center flex-wrap gap-2 justify-content-between mb-20">
                                <h6 className="mb-0 fw-bold text-lg">Hızlı İşlemler</h6>
                            </div>
                            <div className="row g-3">
                                <div className="col-sm-6">
                                    <Link to="/tubes" className="card border bg-gradient-end-1 h-100 text-decoration-none">
                                        <div className="card-body p-20 d-flex align-items-center gap-16">
                                            <div className="w-56-px h-56-px bg-primary-600 rounded-circle d-flex justify-content-center align-items-center flex-shrink-0">
                                                <Icon icon="mdi:fire-extinguisher" className="text-white text-2xl" />
                                            </div>
                                            <div>
                                                <h6 className="fw-semibold mb-4">Tüp Kaydet</h6>
                                                <p className="text-secondary-light text-sm mb-0">Yeni tüp kaydı oluştur</p>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                                <div className="col-sm-6">
                                    <Link to="/customers" className="card border bg-gradient-end-2 h-100 text-decoration-none">
                                        <div className="card-body p-20 d-flex align-items-center gap-16">
                                            <div className="w-56-px h-56-px bg-success-main rounded-circle d-flex justify-content-center align-items-center flex-shrink-0">
                                                <Icon icon="heroicons:user-plus" className="text-white text-2xl" />
                                            </div>
                                            <div>
                                                <h6 className="fw-semibold mb-4">Müşteri Ekle</h6>
                                                <p className="text-secondary-light text-sm mb-0">Yeni müşteri kaydı</p>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                                <div className="col-sm-6">
                                    <Link to="/quotes" className="card border bg-gradient-end-3 h-100 text-decoration-none">
                                        <div className="card-body p-20 d-flex align-items-center gap-16">
                                            <div className="w-56-px h-56-px bg-warning-main rounded-circle d-flex justify-content-center align-items-center flex-shrink-0">
                                                <Icon icon="heroicons:document-text" className="text-white text-2xl" />
                                            </div>
                                            <div>
                                                <h6 className="fw-semibold mb-4">Teklif Oluştur</h6>
                                                <p className="text-secondary-light text-sm mb-0">Yeni teklif hazırla</p>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                                <div className="col-sm-6">
                                    <Link to="/warnings" className="card border bg-gradient-end-4 h-100 text-decoration-none">
                                        <div className="card-body p-20 d-flex align-items-center gap-16">
                                            <div className="w-56-px h-56-px bg-danger-main rounded-circle d-flex justify-content-center align-items-center flex-shrink-0">
                                                <Icon icon="heroicons:exclamation-triangle" className="text-white text-2xl" />
                                            </div>
                                            <div>
                                                <h6 className="fw-semibold mb-4">Uyarıları Gör</h6>
                                                <p className="text-secondary-light text-sm mb-0">Süre takibi ve uyarılar</p>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default DashboardLayer;
