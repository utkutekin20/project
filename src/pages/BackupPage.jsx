import React from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import BackupLayer from '../components/BackupLayer';

const BackupPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title="Yedekleme" />
            <BackupLayer />
        </MasterLayout>
    );
};

export default BackupPage;
