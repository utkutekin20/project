import React from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import LogsLayer from '../components/LogsLayer';

const LogsPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title="İşlem Geçmişi" />
            <LogsLayer />
        </MasterLayout>
    );
};

export default LogsPage;
