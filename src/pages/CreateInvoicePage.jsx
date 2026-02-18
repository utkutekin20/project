import React from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import CreateInvoiceLayer from '../components/CreateInvoiceLayer';

const CreateInvoicePage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title='Yeni Fatura' />
            <CreateInvoiceLayer />
        </MasterLayout>
    );
};

export default CreateInvoicePage;
