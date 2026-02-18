import React from 'react'
import MasterLayout from '../masterLayout/MasterLayout'
import Breadcrumb from '../components/Breadcrumb'
import ContractsLayer from '../components/ContractsLayer'

const ContractsPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title="Sözleşmeler" />
            <ContractsLayer />
        </MasterLayout>
    )
}

export default ContractsPage
