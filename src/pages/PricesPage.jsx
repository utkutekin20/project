import React from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import PricesLayer from '../components/PricesLayer';

const PricesPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title="Fiyatlar" />
            <PricesLayer />
        </MasterLayout>
    );
};

export default PricesPage;
