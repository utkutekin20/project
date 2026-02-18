import { Icon } from '@iconify/react/dist/iconify.js';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const InvoicesLayer = () => {
    // Mock fatura verileri
    const [invoices] = useState([
        {
            id: 1,
            invoice_name: 'Ocak 2026 Dolum Hizmeti',
            customer_name: 'ABC Şirketi',
            issue_date: '2026-01-15',
            due_date: '2026-02-15',
            total: 12500.00,
            status: 'paid', // draft, issued, paid, cancelled
            currency: 'TRY'
        },
        {
            id: 2,
            invoice_name: 'Yangın Tüpü Satışı',
            customer_name: 'XYZ Limited',
            issue_date: '2026-01-20',
            due_date: '2026-01-20',
            total: 8750.50,
            status: 'issued',
            currency: 'TRY'
        },
        {
            id: 3,
            invoice_name: 'Bakım Hizmeti',
            customer_name: 'DEF Holding',
            issue_date: '2026-01-10',
            due_date: '2026-02-10',
            total: 3200.00,
            status: 'draft',
            currency: 'TRY'
        },
        {
            id: 4,
            invoice_name: 'Sertifika Yenileme',
            customer_name: 'GHI Marketleri',
            issue_date: '2026-01-05',
            due_date: '2026-01-05',
            total: 1500.00,
            status: 'cancelled',
            currency: 'TRY'
        },
        {
            id: 5,
            invoice_name: 'Toplu Dolum İşlemi',
            customer_name: 'JKL Fabrika',
            issue_date: '2026-01-22',
            due_date: '2026-02-22',
            total: 45000.00,
            status: 'issued',
            currency: 'TRY'
        }
    ]);

    // Arama ve filtreleme
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Sayfalama
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Durum badge'i
    const getStatusBadge = (status) => {
        const statusConfig = {
            draft: { label: 'Taslak', class: 'bg-secondary-100 text-secondary-600' },
            issued: { label: 'Kesildi', class: 'bg-info-100 text-info-600' },
            paid: { label: 'Tahsil Edildi', class: 'bg-success-100 text-success-600' },
            cancelled: { label: 'İptal', class: 'bg-danger-100 text-danger-600' }
        };
        const config = statusConfig[status] || statusConfig.draft;
        return (
            <span className={`${config.class} px-16 py-4 rounded-pill fw-medium text-sm`}>
                {config.label}
            </span>
        );
    };

    // Tarih formatla
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Para formatla
    const formatMoney = (amount, currency = 'TRY') => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    // Filtreleme
    const filteredInvoices = invoices.filter(invoice => {
        const matchesSearch = 
            invoice.invoice_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Sayfalama hesaplamaları
    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + itemsPerPage);

    // Özet istatistikler
    const stats = {
        total: invoices.length,
        draft: invoices.filter(i => i.status === 'draft').length,
        issued: invoices.filter(i => i.status === 'issued').length,
        paid: invoices.filter(i => i.status === 'paid').length,
        totalAmount: invoices.filter(i => i.status !== 'cancelled').reduce((sum, i) => sum + i.total, 0)
    };

    return (
        <div className='row gy-4'>
            {/* Sayfa Başlığı */}
            <div className='col-12'>
                <div className='d-flex flex-wrap align-items-center justify-content-between gap-3'>
                    <h6 className='fw-semibold mb-0 d-flex align-items-center gap-2'>
                        <Icon icon='heroicons:document-currency-dollar' className='text-primary-600 text-xl' />
                        Faturalar
                    </h6>
                    <Link to='/invoices/new' className='btn btn-primary-600 text-sm px-20 py-10 radius-8 d-flex align-items-center gap-2'>
                        <Icon icon='ic:baseline-plus' className='text-xl' />
                        Yeni Fatura Oluştur
                    </Link>
                </div>
            </div>

            {/* İstatistik Kartları */}
            <div className='col-12'>
                <div className='row g-3'>
                    <div className='col-sm-6 col-xl-3'>
                        <div className='card shadow-none border bg-gradient-start-1 h-100'>
                            <div className='card-body p-20'>
                                <div className='d-flex flex-wrap align-items-center justify-content-between gap-3'>
                                    <div>
                                        <p className='fw-medium text-primary-light mb-1'>Toplam Fatura</p>
                                        <h6 className='mb-0'>{stats.total}</h6>
                                    </div>
                                    <div className='w-50-px h-50-px bg-primary-600 rounded-circle d-flex justify-content-center align-items-center'>
                                        <Icon icon='heroicons:document-text' className='text-white text-2xl' />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='col-sm-6 col-xl-3'>
                        <div className='card shadow-none border bg-gradient-start-2 h-100'>
                            <div className='card-body p-20'>
                                <div className='d-flex flex-wrap align-items-center justify-content-between gap-3'>
                                    <div>
                                        <p className='fw-medium text-primary-light mb-1'>Bekleyen</p>
                                        <h6 className='mb-0'>{stats.issued}</h6>
                                    </div>
                                    <div className='w-50-px h-50-px bg-info-main rounded-circle d-flex justify-content-center align-items-center'>
                                        <Icon icon='heroicons:clock' className='text-white text-2xl' />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='col-sm-6 col-xl-3'>
                        <div className='card shadow-none border bg-gradient-start-3 h-100'>
                            <div className='card-body p-20'>
                                <div className='d-flex flex-wrap align-items-center justify-content-between gap-3'>
                                    <div>
                                        <p className='fw-medium text-primary-light mb-1'>Tahsil Edilen</p>
                                        <h6 className='mb-0'>{stats.paid}</h6>
                                    </div>
                                    <div className='w-50-px h-50-px bg-success-main rounded-circle d-flex justify-content-center align-items-center'>
                                        <Icon icon='heroicons:check-circle' className='text-white text-2xl' />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='col-sm-6 col-xl-3'>
                        <div className='card shadow-none border bg-gradient-start-4 h-100'>
                            <div className='card-body p-20'>
                                <div className='d-flex flex-wrap align-items-center justify-content-between gap-3'>
                                    <div>
                                        <p className='fw-medium text-primary-light mb-1'>Toplam Tutar</p>
                                        <h6 className='mb-0 text-lg'>{formatMoney(stats.totalAmount)}</h6>
                                    </div>
                                    <div className='w-50-px h-50-px bg-warning-main rounded-circle d-flex justify-content-center align-items-center'>
                                        <Icon icon='heroicons:banknotes' className='text-white text-2xl' />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fatura Listesi Tablosu */}
            <div className='col-12'>
                <div className='card h-100 p-0 radius-12'>
                    <div className='card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between'>
                        <div className='d-flex align-items-center flex-wrap gap-3'>
                            {/* Arama */}
                            <div className='navbar-search'>
                                <input
                                    type='text'
                                    className='bg-base h-40-px w-auto'
                                    name='search'
                                    placeholder='Fatura veya müşteri ara...'
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                />
                                <Icon icon='ion:search-outline' className='icon' />
                            </div>
                            {/* Durum Filtresi */}
                            <select
                                className='form-select form-select-sm w-auto bg-base'
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value='all'>Tüm Durumlar</option>
                                <option value='draft'>Taslak</option>
                                <option value='issued'>Kesildi</option>
                                <option value='paid'>Tahsil Edildi</option>
                                <option value='cancelled'>İptal</option>
                            </select>
                        </div>
                        <span className='text-secondary-light text-sm'>
                            Toplam: <strong>{filteredInvoices.length}</strong> fatura
                        </span>
                    </div>
                    <div className='card-body p-24'>
                        <div className='table-responsive scroll-sm'>
                            <table className='table bordered-table sm-table mb-0'>
                                <thead>
                                    <tr>
                                        <th scope='col'>Fatura Adı</th>
                                        <th scope='col'>Müşteri</th>
                                        <th scope='col'>Tarih</th>
                                        <th scope='col'>Vade</th>
                                        <th scope='col' className='text-end'>Toplam</th>
                                        <th scope='col' className='text-center'>Durum</th>
                                        <th scope='col' className='text-center'>İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedInvoices.length === 0 ? (
                                        <tr>
                                            <td colSpan='7' className='text-center py-4 text-secondary-light'>
                                                <Icon icon='heroicons:document-magnifying-glass' className='text-4xl mb-2 d-block mx-auto' />
                                                Fatura bulunamadı
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedInvoices.map((invoice) => (
                                            <tr key={invoice.id}>
                                                <td>
                                                    <div className='d-flex align-items-center gap-2'>
                                                        <Icon icon='heroicons:document-text' className='text-primary-600 text-xl' />
                                                        <span className='fw-medium'>{invoice.invoice_name}</span>
                                                    </div>
                                                </td>
                                                <td>{invoice.customer_name}</td>
                                                <td>{formatDate(invoice.issue_date)}</td>
                                                <td>{formatDate(invoice.due_date)}</td>
                                                <td className='text-end fw-semibold'>{formatMoney(invoice.total, invoice.currency)}</td>
                                                <td className='text-center'>{getStatusBadge(invoice.status)}</td>
                                                <td className='text-center'>
                                                    <div className='d-flex align-items-center gap-2 justify-content-center'>
                                                        <button
                                                            type='button'
                                                            className='w-32-px h-32-px bg-primary-light text-primary-600 rounded-circle d-inline-flex justify-content-center align-items-center'
                                                            title='Görüntüle'
                                                            onClick={() => console.log('Görüntüle:', invoice)}
                                                        >
                                                            <Icon icon='iconamoon:eye-light' />
                                                        </button>
                                                        <button
                                                            type='button'
                                                            className='w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex justify-content-center align-items-center'
                                                            title='Düzenle'
                                                            onClick={() => console.log('Düzenle:', invoice)}
                                                        >
                                                            <Icon icon='lucide:edit' />
                                                        </button>
                                                        <button
                                                            type='button'
                                                            className='w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex justify-content-center align-items-center'
                                                            title='Sil'
                                                            onClick={() => console.log('Sil:', invoice)}
                                                        >
                                                            <Icon icon='mingcute:delete-2-line' />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Sayfalama */}
                        {totalPages > 1 && (
                            <div className='d-flex align-items-center justify-content-between flex-wrap gap-2 mt-24'>
                                <span className='text-secondary-light text-sm'>
                                    Gösterilen: {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredInvoices.length)} / {filteredInvoices.length}
                                </span>
                                <ul className='pagination d-flex flex-wrap align-items-center gap-2 justify-content-center'>
                                    <li className='page-item'>
                                        <button
                                            className='page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px text-md'
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <Icon icon='ep:d-arrow-left' />
                                        </button>
                                    </li>
                                    {[...Array(totalPages)].map((_, index) => (
                                        <li className='page-item' key={index}>
                                            <button
                                                className={`page-link fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md ${
                                                    currentPage === index + 1
                                                        ? 'bg-primary-600 text-white'
                                                        : 'bg-neutral-200 text-secondary-light'
                                                }`}
                                                onClick={() => setCurrentPage(index + 1)}
                                            >
                                                {index + 1}
                                            </button>
                                        </li>
                                    ))}
                                    <li className='page-item'>
                                        <button
                                            className='page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px text-md'
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                        >
                                            <Icon icon='ep:d-arrow-right' />
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicesLayer;
