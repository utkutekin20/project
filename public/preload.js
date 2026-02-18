const { contextBridge, ipcRenderer } = require('electron');

// Renderer process'e güvenli API'ler sun
contextBridge.exposeInMainWorld('api', {
    // Müşteri işlemleri
    customer: {
        add: (customer) => ipcRenderer.invoke('customer:add', customer),
        list: () => ipcRenderer.invoke('customer:list'),
        update: (customer) => ipcRenderer.invoke('customer:update', customer),
        delete: (id) => ipcRenderer.invoke('customer:delete', id),
        getDetails: (id) => ipcRenderer.invoke('customer:getDetails', id)
    },

    // Tüp işlemleri
    tube: {
        add: (tube) => ipcRenderer.invoke('tube:add', tube),
        list: () => ipcRenderer.invoke('tube:list'),
        update: (tube) => ipcRenderer.invoke('tube:update', tube),
        updateLocation: (data) => ipcRenderer.invoke('tube:updateLocation', data),
        delete: (id) => ipcRenderer.invoke('tube:delete', id),
        bulkDelete: (ids) => ipcRenderer.invoke('tube:bulkDelete', ids),
        getExpiring: () => ipcRenderer.invoke('tube:getExpiring'),
        getByCustomer: (customerId) => ipcRenderer.invoke('tube:getByCustomer', customerId),
        bulkRefill: (data) => ipcRenderer.invoke('tube:bulkRefill', data)
    },

    // Rapor işlemleri
    report: {
        fieldMaintenanceForm: (customerId) => ipcRenderer.invoke('report:fieldMaintenanceForm', customerId),
        createInspectionReport: (data) => ipcRenderer.invoke('report:createInspectionReport', data),
        list: () => ipcRenderer.invoke('report:list'),
        get: (id) => ipcRenderer.invoke('report:get', id),
        view: (id) => ipcRenderer.invoke('report:view', id),
        delete: (id) => ipcRenderer.invoke('report:delete', id),
        downloadPdf: (id) => ipcRenderer.invoke('report:downloadPdf', id)
    },

    // İstatistikler
    stats: {
        get: () => ipcRenderer.invoke('stats:get')
    },

    // Yedekleme
    backup: {
        create: () => ipcRenderer.invoke('backup:create'),
        list: () => ipcRenderer.invoke('backup:list'),
        restore: (path) => ipcRenderer.invoke('backup:restore', path)
    },

    // Loglar
    logs: {
        list: (limit) => ipcRenderer.invoke('logs:list', limit)
    },

    // Ayarlar
    settings: {
        get: () => ipcRenderer.invoke('settings:get'),
        save: (settings) => ipcRenderer.invoke('settings:save', settings),
        uploadLogo: () => ipcRenderer.invoke('settings:uploadLogo')
    },

    // Shell işlemleri (harici URL açma)
    shell: {
        openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
    },

    // Sertifika işlemleri
    certificate: {
        create: (tubeId, createdBy) => ipcRenderer.invoke('certificate:create', tubeId, createdBy),
        list: (filters) => ipcRenderer.invoke('certificate:list', filters),
        get: (id) => ipcRenderer.invoke('certificate:get', id),
        delete: (id) => ipcRenderer.invoke('certificate:delete', id),
        openPDF: (pdfPath) => ipcRenderer.invoke('certificate:openPDF', pdfPath),
        checkTube: (tubeId) => ipcRenderer.invoke('certificate:checkTube', tubeId)
    },

    // Sertifika işlemleri
    certificate: {
        list: () => ipcRenderer.invoke('certificate:list'),
        add: (data) => ipcRenderer.invoke('certificate:add', data),
        addBatch: (data) => ipcRenderer.invoke('certificate:addBatch', data),
        delete: (id) => ipcRenderer.invoke('certificate:delete', id),
        print: (certData) => ipcRenderer.invoke('certificate:print', certData),
        downloadPDF: (certData) => ipcRenderer.invoke('certificate:downloadPDF', certData)
    },

    // Fiyat işlemleri
    price: {
        save: (data) => ipcRenderer.invoke('price:save', data),
        list: () => ipcRenderer.invoke('price:list'),
        delete: (id) => ipcRenderer.invoke('price:delete', id),
        getByType: (data) => ipcRenderer.invoke('price:getByType', data),
        bulkUpdate: (data) => ipcRenderer.invoke('price:bulkUpdate', data),
        importExcel: (pricesData) => ipcRenderer.invoke('price:importExcel', pricesData)
    },

    // Teklif işlemleri
    quote: {
        create: (data) => ipcRenderer.invoke('quote:create', data),
        update: (id, data) => ipcRenderer.invoke('quote:update', id, data),
        list: (filters) => ipcRenderer.invoke('quote:list', filters),
        get: (id) => ipcRenderer.invoke('quote:get', id),
        getById: (id) => ipcRenderer.invoke('quote:get', id),
        getItems: (quoteId) => ipcRenderer.invoke('quote:getItems', quoteId),
        updateStatus: (data) => ipcRenderer.invoke('quote:updateStatus', data),
        delete: (id) => ipcRenderer.invoke('quote:delete', id),
        generateWhatsAppText: (id) => ipcRenderer.invoke('quote:generateWhatsAppText', id),
        openPDF: (pdfPath) => ipcRenderer.invoke('quote:openPDF', pdfPath),
        downloadPDF: (quoteData) => ipcRenderer.invoke('quote:downloadPDF', quoteData)
    },

    // Etiket yazdırma
    label: {
        getTubeData: (id) => ipcRenderer.invoke('label:getTubeData', id),
        preview: (id) => ipcRenderer.invoke('label:preview', id),
        print: (id) => ipcRenderer.invoke('label:print', id),
        printBulk: (ids) => ipcRenderer.invoke('label:printBulk', ids)
    },

    // Dışa aktarma
    export: {
        csv: (filters) => ipcRenderer.invoke('export:csv', filters),
        xlsx: (filters) => ipcRenderer.invoke('export:xlsx', filters)
    },

    // Arama işlemleri (Bugün Aranacaklar)
    call: {
        getTodayCalls: (options) => ipcRenderer.invoke('call:getTodayCalls', options),
        markAsCalled: (data) => ipcRenderer.invoke('call:markAsCalled', data),
        addNote: (data) => ipcRenderer.invoke('call:addNote', data),
        getHistory: (customerId) => ipcRenderer.invoke('call:getHistory', customerId)
    },

    // Sözleşme işlemleri
    contract: {
        create: (data) => ipcRenderer.invoke('contract:create', data),
        update: (id, data) => ipcRenderer.invoke('contract:update', id, data),
        list: () => ipcRenderer.invoke('contract:list'),
        get: (id) => ipcRenderer.invoke('contract:get', id),
        delete: (id) => ipcRenderer.invoke('contract:delete', id),
        updateStatus: (data) => ipcRenderer.invoke('contract:updateStatus', data),
        getQuoteForContract: (quoteId) => ipcRenderer.invoke('contract:getQuoteForContract', quoteId),
        downloadPDF: (contractData) => ipcRenderer.invoke('contract:downloadPDF', contractData),
        getExpiring: () => ipcRenderer.invoke('contract:getExpiring')
    },

    // Veri içe aktarma (Excel Import)
    dataImport: {
        importCustomers: (data) => ipcRenderer.invoke('import:customers', data),
        importTubes: (data) => ipcRenderer.invoke('import:tubes', data)
    },

    // Güncelleme işlemleri
    updater: {
        check: () => ipcRenderer.invoke('updater:check'),
        download: () => ipcRenderer.invoke('updater:download'),
        install: () => ipcRenderer.invoke('updater:install'),
        getVersion: () => ipcRenderer.invoke('updater:getVersion'),
        onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_, data) => callback(data)),
        onDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', (_, data) => callback(data)),
        onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', () => callback())
    }
});
