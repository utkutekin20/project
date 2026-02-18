import React from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import QuotesLayer from '../components/QuotesLayer';

const QuotesPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title="Teklifler" />
            <QuotesLayer />
        </MasterLayout>
    );
};

export default QuotesPage;
