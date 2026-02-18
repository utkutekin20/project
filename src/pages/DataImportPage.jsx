import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import DataImportLayer from "../components/DataImportLayer";

const DataImportPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title="Veri Aktarımı" />
            <DataImportLayer />
        </MasterLayout>
    );
};

export default DataImportPage;
