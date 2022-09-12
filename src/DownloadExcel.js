import React, { useEffect } from 'react'
import ReactExport from "react-export-excel";

const ExcelFile = ReactExport.ExcelFile;
const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

function DownloadExcel({spareData}) {
    return (
        <ExcelFile>
            <ExcelSheet data={spareData} name="Employees">
                <ExcelColumn label="Code" value="code"/>
                <ExcelColumn label="Part Name" value="partName"/>
                <ExcelColumn label="Part Number" value="partNumber"/>
                <ExcelColumn label="Nick Name" value="nickName"/>
            </ExcelSheet>
        </ExcelFile>
    )
}

export default DownloadExcel
