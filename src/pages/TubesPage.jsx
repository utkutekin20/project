import React from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import TubesLayer from '../components/TubesLayer';

const TubesPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title="Tüp Kayıt" />
            <TubesLayer />
        </MasterLayout>
    );
};

export default TubesPage;
