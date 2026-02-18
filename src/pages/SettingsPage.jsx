import React from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import SettingsLayer from '../components/SettingsLayer';

const SettingsPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title="Ayarlar" />
            <SettingsLayer />
        </MasterLayout>
    );
};

export default SettingsPage;
