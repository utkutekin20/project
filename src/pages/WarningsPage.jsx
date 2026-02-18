import React from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import WarningsLayer from '../components/WarningsLayer';

const WarningsPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title="Uyarılar" />
            <WarningsLayer />
        </MasterLayout>
    );
};

export default WarningsPage;
