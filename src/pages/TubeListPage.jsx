import React from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import TubeListLayer from '../components/TubeListLayer';

const TubeListPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title="Tüp Listesi" />
            <TubeListLayer />
        </MasterLayout>
    );
};

export default TubeListPage;
