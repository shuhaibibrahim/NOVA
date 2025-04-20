import { push, ref, set } from 'firebase/database';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { db } from './firebase_config';


function ExportExcel({excelData, fileName}){

    function DownloadExcel() {
        
        const Heading=[Object.keys(excelData[0])]
        // console.log(fieldKeys.map(item=>item.split(':')[0]))

		var ws = XLSX.utils.json_to_sheet(excelData, { origin: 'A2', skipHeader: true });
        var wb = XLSX.utils.book_new();

        XLSX.utils.sheet_add_aoa(ws, Heading);
        
        XLSX.utils.book_append_sheet(wb, ws, "WorksheetName");

		XLSX.writeFile(wb, fileName+".xlsx");
    }

    return (
        <div>
            <button
                className="text-sm font-medium text-blue-500 py-2 px-5 rounded ring-2 ring-blue-500 hover:bg-blue-500 hover:text-white"
                onClick={()=>{DownloadExcel()}}
            >
                    Export Excel
            </button>
        </div>
    )
    
}

export default ExportExcel
