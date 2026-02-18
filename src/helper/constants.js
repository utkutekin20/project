// Tüp Cinsleri Tanımları
export const TUBE_TYPES = [
    { value: 'KKT', label: 'Kuru Kimyevi Tozlu (KKT) / Dry Chemical Powder (DCP)', shortCode: 'DCP' },
    { value: 'CO2', label: 'Karbondioksit (CO2) / Carbon Dioxide (CO2)', shortCode: 'CO2' },
    { value: 'Köpüklü', label: 'Köpüklü / Foam', shortCode: 'FOAM' },
    { value: 'AFF', label: 'AFF / Aqueous Film Forming Foam (AFFF)', shortCode: 'AFFF' },
    { value: 'Potasyum', label: 'Potasyum Bikarbonat / Purple K (PKP)', shortCode: 'PKP' },
    { value: 'Biyolojik', label: 'Biyolojik / Biological', shortCode: 'BIO' },
    { value: 'Ekobiyolojik', label: 'Ekobiyolojik / Eco-Biological', shortCode: 'ECO-BIO' },
    { value: 'FM200', label: 'FM200 (HFC-227ea)', shortCode: 'FM200' },
    { value: 'Tekne', label: 'Tekne Tipi / Marine Type', shortCode: 'MARINE' },
    { value: 'Trafo', label: 'Trafo / Transformer', shortCode: 'TRAFO' },
    { value: 'Su', label: 'Su / Water', shortCode: 'WATER' },
    { value: 'Halokarbon', label: 'Halokarbon / Halocarbon', shortCode: 'HALOCARBON' },
    { value: 'Oksijen', label: 'Oksijen / Oxygen', shortCode: 'O2' },
    { value: 'Davlumbaz', label: 'Davlumbaz / Hood System', shortCode: 'HOOD' },
    { value: 'Otomatik', label: 'Otomatik Söndürme / Automatic Extinguisher', shortCode: 'AUTO' },
];

export const getTubeTypeLabel = (value) => {
    const type = TUBE_TYPES.find(t => t.value === value);
    return type ? type.label : value;
};

export const getTubeTypeShortCode = (value) => {
    if (!value) return 'DCP';
    
    // Direkt eşleşme
    const type = TUBE_TYPES.find(t => t.value === value);
    if (type) return type.shortCode;
    
    // İçerik kontrolü
    const lower = value.toLowerCase();
    
    if (lower.includes('kkt') || lower.includes('kuru') || lower.includes('kimyevi') || lower.includes('tozlu') || lower.includes('abc') || lower.includes('powder') || lower.includes('dry')) {
        return 'DCP';
    }
    if (lower.includes('co2') || lower.includes('karbon')) {
        return 'CO2';
    }
    if (lower.includes('köpük') || lower.includes('foam')) {
        return 'FOAM';
    }
    if (lower.includes('afff') || lower.includes('aff') || lower.includes('aqueous')) {
        return 'AFFF';
    }
    if (lower.includes('potasyum') || lower.includes('pkp') || lower.includes('purple')) {
        return 'PKP';
    }
    if (lower.includes('trafo') || lower.includes('transformer')) {
        return 'TRAFO';
    }
    if (lower.includes('ekobiyolojik') || lower.includes('eco')) {
        return 'ECO-BIO';
    }
    if (lower.includes('biyolojik') || lower.includes('bio')) {
        return 'BIO';
    }
    if (lower.includes('fm200') || lower.includes('fm-200') || lower.includes('hfc')) {
        return 'FM200';
    }
    if (lower.includes('tekne') || lower.includes('marine')) {
        return 'MARINE';
    }
    if (lower.includes('su') || lower.includes('water')) {
        return 'WATER';
    }
    if (lower.includes('halokarbon') || lower.includes('halon')) {
        return 'HALOCARBON';
    }
    if (lower.includes('oksijen') || lower.includes('oxygen') || lower.includes('o2')) {
        return 'O2';
    }
    if (lower.includes('davlumbaz') || lower.includes('hood')) {
        return 'HOOD';
    }
    if (lower.includes('otomatik') || lower.includes('auto')) {
        return 'AUTO';
    }
    
    return value;
};
