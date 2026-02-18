import { Icon } from '@iconify/react/dist/iconify.js';
import React, { useState, useEffect } from 'react';

// Varsayılan ayarlar
const defaultSettings = {
    company_name: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    tax_office: '', // Vergi Dairesi
    tax_number: '', // Vergi No
    bank_name: '', // Banka Adı
    iban: '', // IBAN
    certificate_validity: '12',
    warning_days: '30',
    kdv_rate: '20' // KDV Oranı (%)
};

const SettingsLayer = () => {
    const [imagePreview, setImagePreview] = useState('assets/images/user-grid/user-grid-img13.png');
    const [settings, setSettings] = useState(defaultSettings);
    const [isSaving, setIsSaving] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [loading, setLoading] = useState(true);
    
    // Toast state
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');

    // Veritabanından ayarları çek
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                if (window.api) {
                    const result = await window.api.settings.get();
                    if (result.success && result.data) {
                        // null değerleri boş string'e çevir
                        const sanitizedData = {};
                        Object.keys(result.data).forEach(key => {
                            sanitizedData[key] = result.data[key] ?? '';
                        });
                        setSettings(prev => ({ ...prev, ...sanitizedData }));
                        // Logo varsa imagePreview'a set et
                        if (result.data.logo) {
                            setImagePreview(result.data.logo);
                        }
                    }
                }
            } catch (error) {
                console.error('Ayar çekme hatası:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const showToastMsg = (message, type = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    // Logo yükleme
    const readURL = (input) => {
        if (input.target.files && input.target.files[0]) {
            const file = input.target.files[0];
            if (file.size > 2 * 1024 * 1024) {
                showToastMsg('Logo dosyası 2MB\'dan küçük olmalıdır', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Logo = e.target.result;
                setImagePreview(base64Logo);
                // Logo'yu settings'e de ekle
                setSettings(prev => ({ ...prev, logo: base64Logo }));
                showToastMsg('Logo yüklendi!', 'success');
            };
            reader.readAsDataURL(file);
        }
    };

    // Ayarları kaydet
    const handleSave = async (e) => {
        e.preventDefault();

        if (!settings.company_name.trim()) {
            showToastMsg('Firma adı zorunludur!', 'error');
            return;
        }

        setIsSaving(true);

        try {
            if (window.api) {
                const result = await window.api.settings.save(settings);
                if (result.success) {
                    showToastMsg('Ayarlar başarıyla kaydedildi', 'success');
                } else {
                    showToastMsg('Ayarlar kaydedilemedi!', 'error');
                }
            }
        } catch (error) {
            console.error('Ayar kaydetme hatası:', error);
            showToastMsg('Ayarlar kaydedilirken hata oluştu!', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Formu sıfırla
    const handleReset = () => {
        setSettings(defaultSettings);
        setImagePreview('assets/images/user-grid/user-grid-img13.png');
        showToastMsg('Form sıfırlandı', 'info');
    };

    return (
        <div className="row gy-4">
            {/* Sol Panel - Firma Kartı */}
            <div className="col-lg-4">
                <div className="user-grid-card position-relative border radius-16 overflow-hidden bg-base h-100">
                    <img
                        src="assets/images/user-grid/user-grid-bg1.png"
                        alt=""
                        className="w-100 object-fit-cover"
                    />
                    <div className="pb-24 ms-16 mb-24 me-16 mt--100">
                        <div className="text-center border border-top-0 border-start-0 border-end-0">
                            <img
                                src={imagePreview}
                                alt="Firma Logo"
                                className="border br-white border-width-2-px w-200-px h-200-px rounded-circle object-fit-cover"
                            />
                            <h6 className="mb-0 mt-16">{settings.company_name}</h6>
                            <span className="text-secondary-light mb-16">{settings.email}</span>
                        </div>
                        <div className="mt-24">
                            <h6 className="text-xl mb-16">Firma Bilgileri</h6>
                            <ul>
                                <li className="d-flex align-items-center gap-1 mb-12">
                                    <span className="w-30 text-md fw-semibold text-primary-light">
                                        Firma Adı
                                    </span>
                                    <span className="w-70 text-secondary-light fw-medium">
                                        : {settings.company_name}
                                    </span>
                                </li>
                                <li className="d-flex align-items-center gap-1 mb-12">
                                    <span className="w-30 text-md fw-semibold text-primary-light">
                                        E-posta
                                    </span>
                                    <span className="w-70 text-secondary-light fw-medium">
                                        : {settings.email}
                                    </span>
                                </li>
                                <li className="d-flex align-items-center gap-1 mb-12">
                                    <span className="w-30 text-md fw-semibold text-primary-light">
                                        Telefon
                                    </span>
                                    <span className="w-70 text-secondary-light fw-medium">
                                        : {settings.phone}
                                    </span>
                                </li>
                                <li className="d-flex align-items-center gap-1 mb-12">
                                    <span className="w-30 text-md fw-semibold text-primary-light">
                                        Web Sitesi
                                    </span>
                                    <span className="w-70 text-secondary-light fw-medium">
                                        : {settings.website}
                                    </span>
                                </li>
                                <li className="d-flex align-items-center gap-1 mb-12">
                                    <span className="w-30 text-md fw-semibold text-primary-light">
                                        Sertifika Süresi
                                    </span>
                                    <span className="w-70 text-secondary-light fw-medium">
                                        : {settings.certificate_validity} Ay
                                    </span>
                                </li>
                                <li className="d-flex align-items-center gap-1 mb-12">
                                    <span className="w-30 text-md fw-semibold text-primary-light">
                                        KDV Oranı
                                    </span>
                                    <span className="w-70 text-secondary-light fw-medium">
                                        : %{settings.kdv_rate}
                                    </span>
                                </li>
                                <li className="d-flex align-items-center gap-1">
                                    <span className="w-30 text-md fw-semibold text-primary-light">
                                        Adres
                                    </span>
                                    <span className="w-70 text-secondary-light fw-medium">
                                        : {settings.address}
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sağ Panel - Düzenleme Formu */}
            <div className="col-lg-8">
                <div className="card h-100">
                    <div className="card-body p-24">
                        <ul
                            className="nav border-gradient-tab nav-pills mb-20 d-inline-flex"
                            id="pills-tab"
                            role="tablist"
                        >
                            <li className="nav-item" role="presentation">
                                <button
                                    className="nav-link d-flex align-items-center px-24 active"
                                    id="pills-edit-profile-tab"
                                    data-bs-toggle="pill"
                                    data-bs-target="#pills-edit-profile"
                                    type="button"
                                    role="tab"
                                    aria-controls="pills-edit-profile"
                                    aria-selected="true"
                                >
                                    Firma Bilgileri
                                </button>
                            </li>
                            <li className="nav-item" role="presentation">
                                <button
                                    className="nav-link d-flex align-items-center px-24"
                                    id="pills-settings-tab"
                                    data-bs-toggle="pill"
                                    data-bs-target="#pills-settings"
                                    type="button"
                                    role="tab"
                                    aria-controls="pills-settings"
                                    aria-selected="false"
                                    tabIndex={-1}
                                >
                                    Sistem Ayarları
                                </button>
                            </li>
                            <li className="nav-item" role="presentation">
                                <button
                                    className="nav-link d-flex align-items-center px-24"
                                    id="pills-about-tab"
                                    data-bs-toggle="pill"
                                    data-bs-target="#pills-about"
                                    type="button"
                                    role="tab"
                                    aria-controls="pills-about"
                                    aria-selected="false"
                                    tabIndex={-1}
                                >
                                    Hakkında
                                </button>
                            </li>
                        </ul>
                        <div className="tab-content" id="pills-tabContent">
                            {/* Firma Bilgileri Tab */}
                            <div
                                className="tab-pane fade show active"
                                id="pills-edit-profile"
                                role="tabpanel"
                                aria-labelledby="pills-edit-profile-tab"
                                tabIndex={0}
                            >
                                <h6 className="text-md text-primary-light mb-16">Firma Logosu</h6>
                                {/* Upload Image Start */}
                                <div className="mb-24 mt-16">
                                    <div className="avatar-upload">
                                        <div className="avatar-edit position-absolute bottom-0 end-0 me-24 mt-16 z-1 cursor-pointer">
                                            <input
                                                type="file"
                                                id="imageUpload"
                                                accept=".png, .jpg, .jpeg"
                                                hidden
                                                onChange={readURL}
                                            />
                                            <label
                                                htmlFor="imageUpload"
                                                className="w-32-px h-32-px d-flex justify-content-center align-items-center bg-primary-50 text-primary-600 border border-primary-600 bg-hover-primary-100 text-lg rounded-circle"
                                            >
                                                <Icon icon="solar:camera-outline" className="icon" />
                                            </label>
                                        </div>
                                        <div className="avatar-preview">
                                            <div
                                                id="imagePreview"
                                                style={{
                                                    backgroundImage: `url(${imagePreview})`,
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                {/* Upload Image End */}
                                <form onSubmit={handleSave}>
                                    <div className="row">
                                        <div className="col-sm-6">
                                            <div className="mb-20">
                                                <label
                                                    htmlFor="companyName"
                                                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                                                >
                                                    Firma Adı
                                                    <span className="text-danger-600">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control radius-8"
                                                    id="companyName"
                                                    placeholder="Firma adını girin"
                                                    value={settings.company_name}
                                                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-sm-6">
                                            <div className="mb-20">
                                                <label
                                                    htmlFor="email"
                                                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                                                >
                                                    E-posta
                                                </label>
                                                <input
                                                    type="email"
                                                    className="form-control radius-8"
                                                    id="email"
                                                    placeholder="E-posta adresini girin"
                                                    value={settings.email}
                                                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-sm-6">
                                            <div className="mb-20">
                                                <label
                                                    htmlFor="phone"
                                                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                                                >
                                                    Telefon
                                                </label>
                                                <input
                                                    type="tel"
                                                    className="form-control radius-8"
                                                    id="phone"
                                                    placeholder="Telefon numarasını girin"
                                                    value={settings.phone}
                                                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-sm-6">
                                            <div className="mb-20">
                                                <label
                                                    htmlFor="website"
                                                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                                                >
                                                    Web Sitesi
                                                </label>
                                                <input
                                                    type="url"
                                                    className="form-control radius-8"
                                                    id="website"
                                                    placeholder="Web sitesi URL"
                                                    value={settings.website}
                                                    onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-sm-12">
                                            <div className="mb-20">
                                                <label
                                                    htmlFor="address"
                                                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                                                >
                                                    Adres
                                                </label>
                                                <textarea
                                                    className="form-control radius-8"
                                                    id="address"
                                                    placeholder="Tam adresi girin"
                                                    value={settings.address}
                                                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-center justify-content-center gap-3">
                                        <button
                                            type="button"
                                            className="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-56 py-11 radius-8"
                                            onClick={handleReset}
                                        >
                                            Sıfırla
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary border border-primary-600 text-md px-56 py-12 radius-8"
                                            disabled={isSaving}
                                        >
                                            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Sistem Ayarları Tab */}
                            <div
                                className="tab-pane fade"
                                id="pills-settings"
                                role="tabpanel"
                                aria-labelledby="pills-settings-tab"
                                tabIndex={0}
                            >
                                <form onSubmit={handleSave}>
                                    <div className="row">
                                        <div className="col-sm-6">
                                            <div className="mb-20">
                                                <label
                                                    htmlFor="certificateValidity"
                                                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                                                >
                                                    Sertifika Geçerlilik Süresi
                                                    <span className="text-danger-600">*</span>
                                                </label>
                                                <select
                                                    className="form-control radius-8 form-select"
                                                    id="certificateValidity"
                                                    value={settings.certificate_validity}
                                                    onChange={(e) => setSettings({ ...settings, certificate_validity: e.target.value })}
                                                >
                                                    <option value="6">6 Ay</option>
                                                    <option value="12">12 Ay</option>
                                                    <option value="24">24 Ay</option>
                                                    <option value="36">36 Ay</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="col-sm-6">
                                            <div className="mb-20">
                                                <label
                                                    htmlFor="warningDays"
                                                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                                                >
                                                    Uyarı Süresi (Gün)
                                                    <span className="text-danger-600">*</span>
                                                </label>
                                                <select
                                                    className="form-control radius-8 form-select"
                                                    id="warningDays"
                                                    value={settings.warning_days}
                                                    onChange={(e) => setSettings({ ...settings, warning_days: e.target.value })}
                                                >
                                                    <option value="7">7 Gün</option>
                                                    <option value="14">14 Gün</option>
                                                    <option value="30">30 Gün</option>
                                                    <option value="45">45 Gün</option>
                                                    <option value="60">60 Gün</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* KDV ve Vergi Ayarları */}
                                    <h6 className="text-md text-primary-light mb-16 mt-8">
                                        <Icon icon="heroicons:receipt-percent" className="me-2" />
                                        Vergi Ayarları
                                    </h6>
                                    <div className="row">
                                        <div className="col-sm-4">
                                            <div className="mb-20">
                                                <label
                                                    htmlFor="kdvRate"
                                                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                                                >
                                                    KDV Oranı (%)
                                                    <span className="text-danger-600">*</span>
                                                </label>
                                                <div className="input-group">
                                                    <span className="input-group-text">%</span>
                                                    <input
                                                        type="number"
                                                        className="form-control radius-8"
                                                        id="kdvRate"
                                                        placeholder="20"
                                                        min="0"
                                                        max="100"
                                                        value={settings.kdv_rate}
                                                        onChange={(e) => setSettings({ ...settings, kdv_rate: e.target.value })}
                                                    />
                                                </div>
                                                <small className="text-secondary-light">Tekliflerde kullanılacak KDV oranı</small>
                                            </div>
                                        </div>
                                        <div className="col-sm-4">
                                            <div className="mb-20">
                                                <label
                                                    htmlFor="taxOffice"
                                                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                                                >
                                                    Vergi Dairesi
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control radius-8"
                                                    id="taxOffice"
                                                    placeholder="Marmaris V.D."
                                                    value={settings.tax_office}
                                                    onChange={(e) => setSettings({ ...settings, tax_office: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-sm-4">
                                            <div className="mb-20">
                                                <label
                                                    htmlFor="taxNumber"
                                                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                                                >
                                                    Vergi No
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control radius-8"
                                                    id="taxNumber"
                                                    placeholder="1234567890"
                                                    value={settings.tax_number}
                                                    onChange={(e) => setSettings({ ...settings, tax_number: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Banka Bilgileri */}
                                    <h6 className="text-md text-primary-light fw-semibold mb-16 mt-24 border-top pt-24">
                                        <Icon icon="heroicons:building-library" className="me-2" />
                                        Banka Bilgileri
                                    </h6>
                                    <div className="row">
                                        <div className="col-sm-6">
                                            <div className="mb-20">
                                                <label
                                                    htmlFor="bankName"
                                                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                                                >
                                                    Banka Adı
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control radius-8"
                                                    id="bankName"
                                                    placeholder="Örn: Ziraat Bankası"
                                                    value={settings.bank_name || ''}
                                                    onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-sm-6">
                                            <div className="mb-20">
                                                <label
                                                    htmlFor="iban"
                                                    className="form-label fw-semibold text-primary-light text-sm mb-8"
                                                >
                                                    IBAN
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control radius-8"
                                                    id="iban"
                                                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                                                    value={settings.iban || ''}
                                                    onChange={(e) => setSettings({ ...settings, iban: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-switch switch-primary py-12 px-16 border radius-8 position-relative mb-16">
                                        <label
                                            htmlFor="autoBackup"
                                            className="position-absolute w-100 h-100 start-0 top-0"
                                        />
                                        <div className="d-flex align-items-center gap-3 justify-content-between">
                                            <span className="form-check-label line-height-1 fw-medium text-secondary-light">
                                                Otomatik Yedekleme
                                            </span>
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                role="switch"
                                                id="autoBackup"
                                                defaultChecked
                                            />
                                        </div>
                                    </div>
                                    <div className="form-switch switch-primary py-12 px-16 border radius-8 position-relative mb-16">
                                        <label
                                            htmlFor="emailNotification"
                                            className="position-absolute w-100 h-100 start-0 top-0"
                                        />
                                        <div className="d-flex align-items-center gap-3 justify-content-between">
                                            <span className="form-check-label line-height-1 fw-medium text-secondary-light">
                                                E-posta Bildirimleri
                                            </span>
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                role="switch"
                                                id="emailNotification"
                                                defaultChecked
                                            />
                                        </div>
                                    </div>
                                    <div className="form-switch switch-primary py-12 px-16 border radius-8 position-relative mb-16">
                                        <label
                                            htmlFor="expiryWarning"
                                            className="position-absolute w-100 h-100 start-0 top-0"
                                        />
                                        <div className="d-flex align-items-center gap-3 justify-content-between">
                                            <span className="form-check-label line-height-1 fw-medium text-secondary-light">
                                                Süre Dolum Uyarıları
                                            </span>
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                role="switch"
                                                id="expiryWarning"
                                                defaultChecked
                                            />
                                        </div>
                                    </div>
                                    <div className="form-switch switch-primary py-12 px-16 border radius-8 position-relative mb-16">
                                        <label
                                            htmlFor="customerPortal"
                                            className="position-absolute w-100 h-100 start-0 top-0"
                                        />
                                        <div className="d-flex align-items-center gap-3 justify-content-between">
                                            <span className="form-check-label line-height-1 fw-medium text-secondary-light">
                                                Müşteri Portalı Aktif
                                            </span>
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                role="switch"
                                                id="customerPortal"
                                                defaultChecked
                                            />
                                        </div>
                                    </div>

                                    <div className="d-flex align-items-center justify-content-center gap-3 mt-24">
                                        <button
                                            type="button"
                                            className="border border-danger-600 bg-hover-danger-200 text-danger-600 text-md px-56 py-11 radius-8"
                                            onClick={handleReset}
                                        >
                                            Sıfırla
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary border border-primary-600 text-md px-56 py-12 radius-8"
                                            disabled={isSaving}
                                        >
                                            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Hakkında Tab */}
                            <div
                                className="tab-pane fade"
                                id="pills-about"
                                role="tabpanel"
                                aria-labelledby="pills-about-tab"
                                tabIndex={0}
                            >
                                <div className="text-center mb-32">
                                    <Icon icon="heroicons:fire" className="text-danger-main" style={{ fontSize: '80px' }} />
                                    <h4 className="mb-8 mt-16">Tüp Takip Sistemi</h4>
                                    <p className="text-secondary-light mb-16">Yangın tüpü ve söndürme ekipmanları yönetim yazılımı</p>
                                    <span className="bg-success-100 text-success-600 px-24 py-8 radius-8 fw-medium">
                                        Versiyon 1.0.0
                                    </span>
                                </div>

                                <h6 className="text-md text-primary-light mb-16">Özellikler</h6>
                                <div className="row g-3 mb-24">
                                    <div className="col-md-6">
                                        <div className="d-flex align-items-center gap-10 p-16 border radius-8">
                                            <Icon icon="heroicons:users" className="text-primary-600 text-2xl" />
                                            <span className="text-secondary-light">Müşteri Yönetimi</span>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="d-flex align-items-center gap-10 p-16 border radius-8">
                                            <Icon icon="heroicons:cube" className="text-success-600 text-2xl" />
                                            <span className="text-secondary-light">Tüp Takibi</span>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="d-flex align-items-center gap-10 p-16 border radius-8">
                                            <Icon icon="heroicons:document-check" className="text-info-600 text-2xl" />
                                            <span className="text-secondary-light">Sertifika Oluşturma</span>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="d-flex align-items-center gap-10 p-16 border radius-8">
                                            <Icon icon="heroicons:bell-alert" className="text-warning-600 text-2xl" />
                                            <span className="text-secondary-light">Süre Uyarıları</span>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="d-flex align-items-center gap-10 p-16 border radius-8">
                                            <Icon icon="heroicons:qr-code" className="text-purple-600 text-2xl" />
                                            <span className="text-secondary-light">QR Kod Sistemi</span>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="d-flex align-items-center gap-10 p-16 border radius-8">
                                            <Icon icon="heroicons:document-text" className="text-cyan-600 text-2xl" />
                                            <span className="text-secondary-light">Teklif Yönetimi</span>
                                        </div>
                                    </div>
                                </div>

                                <h6 className="text-md text-primary-light mb-16">Müşteri Portalı</h6>
                                <div className="bg-neutral-50 radius-8 p-20">
                                    <div className="d-flex align-items-center gap-16">
                                        <Icon icon="heroicons:device-phone-mobile" className="text-primary-600 text-4xl" />
                                        <div>
                                            <h6 className="mb-4">Müşteri Erişim Portalı</h6>
                                            <p className="text-secondary-light text-sm mb-8">
                                                Müşteriler QR kod okutarak tüplerinin durumunu görebilir.
                                            </p>
                                            <code className="bg-base px-12 py-4 radius-4 text-sm border">
                                                http://192.168.1.100:3001
                                            </code>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            {showToast && (
                <div 
                    className="position-fixed bottom-0 end-0 p-3"
                    style={{ zIndex: 9999 }}
                >
                    <div className={`toast show ${toastType === 'success' ? 'bg-success-600' : toastType === 'error' ? 'bg-danger-600' : 'bg-info-600'} text-white radius-8`}>
                        <div className="toast-body d-flex align-items-center gap-12 px-16 py-12">
                            <Icon 
                                icon={toastType === 'success' ? 'heroicons:check-circle' : toastType === 'error' ? 'heroicons:x-circle' : 'heroicons:information-circle'} 
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

export default SettingsLayer;
