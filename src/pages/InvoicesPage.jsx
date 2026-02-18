import React from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import InvoicesLayer from '../components/InvoicesLayer';

const InvoicesPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title='Faturalar' />
            <InvoicesLayer />
        </MasterLayout>
    );
};

export default InvoicesPage;
