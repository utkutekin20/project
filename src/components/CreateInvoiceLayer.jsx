import { Icon } from '@iconify/react/dist/iconify.js';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const CreateInvoiceLayer = () => {
    const navigate = useNavigate();

    // Mock müşteri verileri
    const mockCustomers = [
        { id: 1, name: 'ABC Şirketi', address: 'İstanbul, Kadıköy', phone: '0532 111 22 33', tax_no: '1234567890' },
        { id: 2, name: 'XYZ Limited', address: 'Ankara, Çankaya', phone: '0533 222 33 44', tax_no: '0987654321' },
        { id: 3, name: 'DEF Holding', address: 'İzmir, Konak', phone: '0534 333 44 55', tax_no: '5678901234' },
        { id: 4, name: 'GHI Marketleri', address: 'Bursa, Nilüfer', phone: '0535 444 55 66', tax_no: '4321098765' },
        { id: 5, name: 'JKL Fabrika', address: 'Kocaeli, Gebze', phone: '0536 555 66 77', tax_no: '6789012345' }
    ];

    // Form state
    const [formData, setFormData] = useState({
        // Fatura Bilgileri
        invoice_name: '',
        customer_id: '',
        payment_status: 'pending', // pending, paid
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        invoice_series: '',
        invoice_number: '',
        currency: 'TRY',
        invoice_note: '',
        include_balance_note: false,
        
        // Sipariş Bilgileri
        order_no: '',
        order_date: '',
        
        // Stok
        stock_deduction: 'yes', // yes, no
        
        // Sağ Panel
        category: '',
        tags: []
    });

    // Fatura kalemleri
    const [items, setItems] = useState([
        { id: 1, product: '', quantity: 1, unit: 'Adet', unit_price: 0, tax_rate: 20, total: 0 }
    ]);

    // UI State
    const [showOrderSection, setShowOrderSection] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [newTag, setNewTag] = useState('');

    // Döviz seçenekleri
    const currencies = [
        { code: 'TRY', symbol: '₺', name: 'Türk Lirası' },
        { code: 'USD', symbol: '$', name: 'Amerikan Doları' },
        { code: 'EUR', symbol: '€', name: 'Euro' }
    ];

    // Birim seçenekleri
    const units = ['Adet', 'Paket', 'Saat', 'Gün', 'Kg', 'Lt', 'M²'];

    // KDV oranları
    const taxRates = [0, 1, 10, 20];

    // Kategori seçenekleri
    const categories = [
        'Dolum Hizmeti',
        'Satış',
        'Bakım/Onarım',
        'Sertifika',
        'Diğer'
    ];

    // Bugünün tarihi
    const today = new Date().toISOString().split('T')[0];

    // Vade tarihi hızlı seçim
    const setDueDateQuick = (days) => {
        const date = new Date(formData.issue_date);
        date.setDate(date.getDate() + days);
        setFormData(prev => ({ ...prev, due_date: date.toISOString().split('T')[0] }));
    };

    // Müşteri seçimi
    const handleCustomerSelect = (customer) => {
        setSelectedCustomer(customer);
        setFormData(prev => ({ ...prev, customer_id: customer.id }));
        setCustomerSearch(customer.name);
        setShowCustomerDropdown(false);
    };

    // Filtrelenmiş müşteriler
    const filteredCustomers = mockCustomers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase())
    );

    // Kalem ekleme
    const addItem = () => {
        const newId = Math.max(...items.map(i => i.id), 0) + 1;
        setItems([...items, { id: newId, product: '', quantity: 1, unit: 'Adet', unit_price: 0, tax_rate: 20, total: 0 }]);
    };

    // Kalem silme
    const removeItem = (id) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    // Kalem güncelleme
    const updateItem = (id, field, value) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                // Toplam hesapla
                const quantity = parseFloat(updated.quantity) || 0;
                const unitPrice = parseFloat(updated.unit_price) || 0;
                updated.total = quantity * unitPrice;
                return updated;
            }
            return item;
        }));
    };

    // Hesaplamalar
    const calculations = {
        subtotal: items.reduce((sum, item) => sum + (item.total || 0), 0),
        totalTax: items.reduce((sum, item) => {
            const taxAmount = (item.total || 0) * (item.tax_rate / 100);
            return sum + taxAmount;
        }, 0),
        get grandTotal() {
            return this.subtotal + this.totalTax;
        }
    };

    // Para formatla
    const formatMoney = (amount) => {
        const currency = currencies.find(c => c.code === formData.currency) || currencies[0];
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: currency.code
        }).format(amount);
    };

    // Etiket ekleme
    const addTag = () => {
        if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
            setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
            setNewTag('');
        }
    };

    // Etiket silme
    const removeTag = (tagToRemove) => {
        setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
    };

    // Form gönderimi
    const handleSubmit = (e) => {
        e.preventDefault();
        
        const invoiceData = {
            ...formData,
            customer: selectedCustomer,
            items: items,
            calculations: {
                subtotal: calculations.subtotal,
                totalTax: calculations.totalTax,
                grandTotal: calculations.grandTotal
            },
            created_at: new Date().toISOString()
        };

        console.log('=== FATURA VERİSİ ===');
        console.log(JSON.stringify(invoiceData, null, 2));
        alert('Fatura verisi console\'a yazdırıldı. (Backend entegrasyonu yapılacak)');
    };

    // İptal
    const handleCancel = () => {
        if (window.confirm('Değişiklikler kaydedilmeyecek. Çıkmak istediğinize emin misiniz?')) {
            navigate('/invoices');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className='row gy-4'>
                {/* Sayfa Başlığı */}
                <div className='col-12'>
                    <div className='d-flex flex-wrap align-items-center justify-content-between gap-3'>
                        <div className='d-flex align-items-center gap-2'>
                            <Link to='/invoices' className='btn btn-light btn-sm'>
                                <Icon icon='heroicons:arrow-left' className='text-lg' />
                            </Link>
                            <h6 className='fw-semibold mb-0 d-flex align-items-center gap-2'>
                                <Icon icon='heroicons:document-plus' className='text-primary-600 text-xl' />
                                Yeni Fatura
                            </h6>
                        </div>
                        <div className='d-flex gap-2'>
                            <button type='button' className='btn btn-outline-secondary px-20 py-10 radius-8' onClick={handleCancel}>
                                Vazgeç
                            </button>
                            <button type='submit' className='btn btn-primary-600 px-20 py-10 radius-8 d-flex align-items-center gap-2'>
                                <Icon icon='heroicons:check' className='text-lg' />
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sol Taraf - Ana Form */}
                <div className='col-lg-9'>
                    {/* Fatura Bilgileri */}
                    <div className='card radius-12 mb-4'>
                        <div className='card-header py-16 px-24 bg-base border-bottom'>
                            <h6 className='text-lg mb-0 fw-semibold'>
                                <Icon icon='heroicons:document-text' className='me-2 text-primary-600' />
                                Fatura Bilgileri
                            </h6>
                        </div>
                        <div className='card-body p-24'>
                            <div className='row g-3'>
                                {/* Fatura İsmi */}
                                <div className='col-12'>
                                    <label className='form-label fw-semibold text-primary-light text-sm mb-8'>
                                        Fatura İsmi
                                    </label>
                                    <input
                                        type='text'
                                        className='form-control radius-8'
                                        placeholder='Fatura açıklaması...'
                                        value={formData.invoice_name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, invoice_name: e.target.value }))}
                                    />
                                </div>

                                {/* Müşteri Seçimi */}
                                <div className='col-12'>
                                    <label className='form-label fw-semibold text-primary-light text-sm mb-8'>
                                        Müşteri <span className='text-danger-600'>*</span>
                                    </label>
                                    <div className='position-relative'>
                                        <input
                                            type='text'
                                            className='form-control radius-8'
                                            placeholder='Müşteri ara...'
                                            value={customerSearch}
                                            onChange={(e) => {
                                                setCustomerSearch(e.target.value);
                                                setShowCustomerDropdown(true);
                                                if (!e.target.value) setSelectedCustomer(null);
                                            }}
                                            onFocus={() => setShowCustomerDropdown(true)}
                                            required
                                        />
                                        <Icon icon='heroicons:magnifying-glass' className='position-absolute top-50 translate-middle-y end-0 me-16 text-secondary-light' />
                                        
                                        {/* Müşteri Dropdown */}
                                        {showCustomerDropdown && customerSearch && (
                                            <div className='position-absolute w-100 bg-base border radius-8 mt-1 shadow-lg z-3' style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                {filteredCustomers.length > 0 ? (
                                                    filteredCustomers.map(customer => (
                                                        <div
                                                            key={customer.id}
                                                            className='px-16 py-12 cursor-pointer hover-bg-neutral-100 border-bottom'
                                                            onClick={() => handleCustomerSelect(customer)}
                                                        >
                                                            <div className='fw-medium'>{customer.name}</div>
                                                            <small className='text-secondary-light'>{customer.address}</small>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className='px-16 py-12 text-secondary-light text-center'>
                                                        Müşteri bulunamadı
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Seçilen Müşteri Kartı */}
                                    {selectedCustomer && (
                                        <div className='mt-12 p-16 bg-neutral-50 radius-8 border'>
                                            <div className='d-flex justify-content-between align-items-start'>
                                                <div>
                                                    <h6 className='fw-semibold mb-1'>{selectedCustomer.name}</h6>
                                                    <p className='text-sm text-secondary-light mb-4'>{selectedCustomer.address}</p>
                                                    <div className='d-flex gap-3 text-sm'>
                                                        <span><Icon icon='heroicons:phone' className='me-1' />{selectedCustomer.phone}</span>
                                                        <span><Icon icon='heroicons:identification' className='me-1' />VKN: {selectedCustomer.tax_no}</span>
                                                    </div>
                                                </div>
                                                <button type='button' className='btn btn-sm btn-light' onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}>
                                                    <Icon icon='heroicons:x-mark' />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Tahsilat Durumu */}
                                <div className='col-12'>
                                    <label className='form-label fw-semibold text-primary-light text-sm mb-8'>
                                        Tahsilat Durumu
                                    </label>
                                    <div className='d-flex gap-4'>
                                        <div className='form-check'>
                                            <input
                                                className='form-check-input'
                                                type='radio'
                                                name='payment_status'
                                                id='payment_pending'
                                                checked={formData.payment_status === 'pending'}
                                                onChange={() => setFormData(prev => ({ ...prev, payment_status: 'pending' }))}
                                            />
                                            <label className='form-check-label' htmlFor='payment_pending'>
                                                Tahsil Edilecek
                                            </label>
                                        </div>
                                        <div className='form-check'>
                                            <input
                                                className='form-check-input'
                                                type='radio'
                                                name='payment_status'
                                                id='payment_paid'
                                                checked={formData.payment_status === 'paid'}
                                                onChange={() => setFormData(prev => ({ ...prev, payment_status: 'paid' }))}
                                            />
                                            <label className='form-check-label' htmlFor='payment_paid'>
                                                Tahsil Edildi
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Tarihler */}
                                <div className='col-md-6'>
                                    <label className='form-label fw-semibold text-primary-light text-sm mb-8'>
                                        Düzenlenme Tarihi
                                    </label>
                                    <input
                                        type='date'
                                        className='form-control radius-8'
                                        value={formData.issue_date}
                                        onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                                    />
                                </div>
                                <div className='col-md-6'>
                                    <label className='form-label fw-semibold text-primary-light text-sm mb-8'>
                                        Vade Tarihi
                                    </label>
                                    <input
                                        type='date'
                                        className='form-control radius-8'
                                        value={formData.due_date}
                                        onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                                    />
                                    {/* Hızlı Vade Butonları */}
                                    <div className='d-flex gap-2 mt-8 flex-wrap'>
                                        <button type='button' className='btn btn-outline-primary-600 btn-sm py-4 px-8 text-xs' onClick={() => setDueDateQuick(0)}>Aynı Gün</button>
                                        <button type='button' className='btn btn-outline-secondary btn-sm py-4 px-8 text-xs' onClick={() => setDueDateQuick(7)}>7 Gün</button>
                                        <button type='button' className='btn btn-outline-secondary btn-sm py-4 px-8 text-xs' onClick={() => setDueDateQuick(14)}>14 Gün</button>
                                        <button type='button' className='btn btn-outline-secondary btn-sm py-4 px-8 text-xs' onClick={() => setDueDateQuick(30)}>30 Gün</button>
                                        <button type='button' className='btn btn-outline-secondary btn-sm py-4 px-8 text-xs' onClick={() => setDueDateQuick(60)}>60 Gün</button>
                                    </div>
                                </div>

                                {/* Fatura No */}
                                <div className='col-md-6'>
                                    <label className='form-label fw-semibold text-primary-light text-sm mb-8'>
                                        Fatura No
                                    </label>
                                    <div className='d-flex gap-2'>
                                        <input
                                            type='text'
                                            className='form-control radius-8'
                                            placeholder='Seri'
                                            style={{ maxWidth: '100px' }}
                                            value={formData.invoice_series}
                                            onChange={(e) => setFormData(prev => ({ ...prev, invoice_series: e.target.value.toUpperCase() }))}
                                        />
                                        <input
                                            type='text'
                                            className='form-control radius-8'
                                            placeholder='Sıra'
                                            value={formData.invoice_number}
                                            onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                {/* Döviz */}
                                <div className='col-md-6'>
                                    <label className='form-label fw-semibold text-primary-light text-sm mb-8'>
                                        Fatura Dövizi
                                    </label>
                                    <select
                                        className='form-select radius-8'
                                        value={formData.currency}
                                        onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                                    >
                                        {currencies.map(cur => (
                                            <option key={cur.code} value={cur.code}>
                                                {cur.symbol} - {cur.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Sipariş Bilgisi Ekleme */}
                                <div className='col-12'>
                                    <button
                                        type='button'
                                        className='btn btn-outline-primary-600 btn-sm d-flex align-items-center gap-2'
                                        onClick={() => setShowOrderSection(!showOrderSection)}
                                    >
                                        <Icon icon={showOrderSection ? 'heroicons:minus' : 'heroicons:plus'} />
                                        Sipariş Bilgisi Ekle
                                    </button>
                                    
                                    {showOrderSection && (
                                        <div className='mt-12 p-16 bg-neutral-50 radius-8 border'>
                                            <div className='row g-3'>
                                                <div className='col-md-6'>
                                                    <label className='form-label text-sm'>Sipariş No</label>
                                                    <input
                                                        type='text'
                                                        className='form-control radius-8'
                                                        value={formData.order_no}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, order_no: e.target.value }))}
                                                    />
                                                </div>
                                                <div className='col-md-6'>
                                                    <label className='form-label text-sm'>Sipariş Tarihi</label>
                                                    <input
                                                        type='date'
                                                        className='form-control radius-8'
                                                        value={formData.order_date}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, order_date: e.target.value }))}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Fatura Notu */}
                                <div className='col-12'>
                                    <label className='form-label fw-semibold text-primary-light text-sm mb-8'>
                                        Fatura Notu
                                    </label>
                                    <textarea
                                        className='form-control radius-8'
                                        rows='3'
                                        placeholder='Faturaya eklenecek not...'
                                        value={formData.invoice_note}
                                        onChange={(e) => setFormData(prev => ({ ...prev, invoice_note: e.target.value }))}
                                    />
                                    <div className='form-check mt-8'>
                                        <input
                                            className='form-check-input'
                                            type='checkbox'
                                            id='include_balance'
                                            checked={formData.include_balance_note}
                                            onChange={(e) => setFormData(prev => ({ ...prev, include_balance_note: e.target.checked }))}
                                        />
                                        <label className='form-check-label text-sm' htmlFor='include_balance'>
                                            Müşteri bakiyesini not olarak ekle
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stok Takibi */}
                    <div className='card radius-12 mb-4'>
                        <div className='card-header py-16 px-24 bg-base border-bottom'>
                            <h6 className='text-lg mb-0 fw-semibold'>
                                <Icon icon='heroicons:archive-box' className='me-2 text-primary-600' />
                                Stok Takibi
                            </h6>
                        </div>
                        <div className='card-body p-24'>
                            <div className='row g-3'>
                                <div className='col-md-6'>
                                    <div className={`p-16 radius-8 border cursor-pointer ${formData.stock_deduction === 'yes' ? 'border-primary-600 bg-primary-50' : 'border-neutral-200'}`}
                                        onClick={() => setFormData(prev => ({ ...prev, stock_deduction: 'yes' }))}>
                                        <div className='d-flex align-items-center gap-3'>
                                            <div className='form-check'>
                                                <input
                                                    className='form-check-input'
                                                    type='radio'
                                                    checked={formData.stock_deduction === 'yes'}
                                                    onChange={() => {}}
                                                />
                                            </div>
                                            <div>
                                                <h6 className='fw-semibold mb-1'>Stok Çıkışı Yapılsın</h6>
                                                <p className='text-sm text-secondary-light mb-0'>
                                                    Stok çıkışı fatura ile yapılır. Daha sonra faturadan irsaliye oluşturulmaz ve Satışınıza irsaliye eşleştirilemez.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className='col-md-6'>
                                    <div className={`p-16 radius-8 border cursor-pointer ${formData.stock_deduction === 'no' ? 'border-primary-600 bg-primary-50' : 'border-neutral-200'}`}
                                        onClick={() => setFormData(prev => ({ ...prev, stock_deduction: 'no' }))}>
                                        <div className='d-flex align-items-center gap-3'>
                                            <div className='form-check'>
                                                <input
                                                    className='form-check-input'
                                                    type='radio'
                                                    checked={formData.stock_deduction === 'no'}
                                                    onChange={() => {}}
                                                />
                                            </div>
                                            <div>
                                                <h6 className='fw-semibold mb-1'>Stok Çıkışı Yapılmasın</h6>
                                                <p className='text-sm text-secondary-light mb-0'>
                                                    Stok takibi gerektirmeyen hizmet/ürünler için kullanılır. Daha sonra Satışınıza ilişkin irsaliye oluşturulabilir.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Hizmet / Ürün Satırları */}
                    <div className='card radius-12 mb-4'>
                        <div className='card-header py-16 px-24 bg-base border-bottom'>
                            <h6 className='text-lg mb-0 fw-semibold'>
                                <Icon icon='heroicons:shopping-cart' className='me-2 text-primary-600' />
                                Hizmet / Ürün
                            </h6>
                        </div>
                        <div className='card-body p-24'>
                            <div className='table-responsive'>
                                <table className='table bordered-table mb-0'>
                                    <thead>
                                        <tr>
                                            <th style={{ minWidth: '200px' }}>Hizmet / Ürün</th>
                                            <th style={{ width: '100px' }}>Miktar</th>
                                            <th style={{ width: '120px' }}>Birim</th>
                                            <th style={{ width: '140px' }}>Birim Fiyat</th>
                                            <th style={{ width: '120px' }}>Vergi</th>
                                            <th style={{ width: '140px' }} className='text-end'>Toplam</th>
                                            <th style={{ width: '60px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, index) => (
                                            <tr key={item.id}>
                                                <td>
                                                    <input
                                                        type='text'
                                                        className='form-control form-control-sm radius-8'
                                                        placeholder='Hizmet/ürün adı...'
                                                        value={item.product}
                                                        onChange={(e) => updateItem(item.id, 'product', e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type='number'
                                                        className='form-control form-control-sm radius-8 text-center'
                                                        min='0'
                                                        step='0.01'
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                    />
                                                </td>
                                                <td>
                                                    <select
                                                        className='form-select form-select-sm radius-8'
                                                        value={item.unit}
                                                        onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                                    >
                                                        {units.map(unit => (
                                                            <option key={unit} value={unit}>{unit}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td>
                                                    <input
                                                        type='number'
                                                        className='form-control form-control-sm radius-8 text-end'
                                                        min='0'
                                                        step='0.01'
                                                        value={item.unit_price}
                                                        onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                                    />
                                                </td>
                                                <td>
                                                    <select
                                                        className='form-select form-select-sm radius-8'
                                                        value={item.tax_rate}
                                                        onChange={(e) => updateItem(item.id, 'tax_rate', parseInt(e.target.value))}
                                                    >
                                                        {taxRates.map(rate => (
                                                            <option key={rate} value={rate}>KDV %{rate}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className='text-end fw-semibold'>
                                                    {formatMoney(item.total)}
                                                </td>
                                                <td className='text-center'>
                                                    <button
                                                        type='button'
                                                        className='btn btn-sm btn-outline-danger rounded-circle w-32-px h-32-px p-0 d-flex align-items-center justify-content-center'
                                                        onClick={() => removeItem(item.id)}
                                                        disabled={items.length === 1}
                                                    >
                                                        <Icon icon='heroicons:trash' />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            <button type='button' className='btn btn-outline-primary-600 btn-sm mt-16 d-flex align-items-center gap-2' onClick={addItem}>
                                <Icon icon='heroicons:plus' />
                                Yeni Satır Ekle
                            </button>

                            {/* Toplam Özeti */}
                            <div className='mt-24 d-flex justify-content-end'>
                                <div className='w-100' style={{ maxWidth: '350px' }}>
                                    <div className='d-flex justify-content-between py-8 border-bottom'>
                                        <span className='text-secondary-light'>Ara Toplam</span>
                                        <span className='fw-medium'>{formatMoney(calculations.subtotal)}</span>
                                    </div>
                                    <div className='d-flex justify-content-between py-8 border-bottom'>
                                        <span className='text-secondary-light'>Toplam KDV</span>
                                        <span className='fw-medium'>{formatMoney(calculations.totalTax)}</span>
                                    </div>
                                    <div className='d-flex justify-content-between py-12 bg-primary-50 px-12 radius-8 mt-8'>
                                        <span className='fw-semibold text-lg'>Genel Toplam</span>
                                        <span className='fw-bold text-lg text-primary-600'>{formatMoney(calculations.grandTotal)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sağ Panel */}
                <div className='col-lg-3'>
                    <div className='card radius-12 position-sticky' style={{ top: '100px' }}>
                        <div className='card-header py-16 px-20 bg-base border-bottom'>
                            <h6 className='text-md mb-0 fw-semibold'>Ek Bilgiler</h6>
                        </div>
                        <div className='card-body p-20'>
                            {/* Kategori */}
                            <div className='mb-20'>
                                <label className='form-label fw-semibold text-primary-light text-sm mb-8'>
                                    Fatura Kategorisi
                                </label>
                                <select
                                    className='form-select radius-8'
                                    value={formData.category}
                                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                >
                                    <option value=''>Kategori seçin...</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Etiketler */}
                            <div>
                                <label className='form-label fw-semibold text-primary-light text-sm mb-8'>
                                    Etiketler
                                </label>
                                <div className='d-flex gap-2 mb-8'>
                                    <input
                                        type='text'
                                        className='form-control form-control-sm radius-8'
                                        placeholder='Etiket ekle...'
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                    />
                                    <button type='button' className='btn btn-primary-600 btn-sm px-12' onClick={addTag}>
                                        <Icon icon='heroicons:plus' />
                                    </button>
                                </div>
                                <div className='d-flex flex-wrap gap-2'>
                                    {formData.tags.map(tag => (
                                        <span key={tag} className='badge bg-primary-100 text-primary-600 px-12 py-6 radius-4 d-flex align-items-center gap-1'>
                                            {tag}
                                            <Icon 
                                                icon='heroicons:x-mark' 
                                                className='cursor-pointer' 
                                                onClick={() => removeTag(tag)}
                                            />
                                        </span>
                                    ))}
                                </div>
                                <p className='text-xs text-secondary-light mt-8'>
                                    Etiketler fatura filtreleme işlemlerinde kullanılır.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default CreateInvoiceLayer;
