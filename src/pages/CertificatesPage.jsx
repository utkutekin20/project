import React from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import CertificatesLayer from '../components/CertificatesLayer';

const CertificatesPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title="Sertifikalar" />
            <CertificatesLayer />
        </MasterLayout>
    );
};

export default CertificatesPage;
