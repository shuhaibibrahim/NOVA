import { useState } from 'react';
import * as XLSX from 'xlsx';


function BulkExcelUploadComponent({headings, templateName, pushFunction}){

    const [file, setFile] = useState(null)

    function downloadTemplate() {
        
        const Heading=[[...headings]]
    
        var ws = XLSX.utils.json_to_sheet([], { origin: 'A2', skipHeader: true });
        var wb = XLSX.utils.book_new();
    
        XLSX.utils.sheet_add_aoa(ws, Heading);
        
        XLSX.utils.book_append_sheet(wb, ws, "WorksheetName");
    
        XLSX.writeFile(wb, `${templateName}.xlsx`);
    }

    const readFileAndSetData = ()=>{

        const reader=new FileReader()

        reader.onload=(e)=>{
            const data=e.target.result
            const workbook = XLSX.read(data, {type:"buffer"})

            console.log("workbook : ",workbook)
            const wsname=workbook.SheetNames[0]
            const ws=workbook.Sheets[wsname]

            const parseData=XLSX.utils.sheet_to_json(ws).map(obj=>{
                var {__rowNum__,...newObj} = obj
                return newObj
            })

            console.log("parsedata : ",parseData)
            pushFunction(parseData)
            setFile(null)

        }

        reader.readAsArrayBuffer(file)
    }

    return (
        <div>
            <div className='flex flex-row space-x-2'>
                <div
                    className="py-1 px-5 flex items-center justify-center rounded cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium col-span-2"
                    onClick={e=>{downloadTemplate()}} 
                >
                    Download template
                </div>

                {file==null &&(<label
                    className='py-1 px-5 flex items-center justify-center rounded cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium col-span-2' 
                    htmlFor='fileInput'
                >
                    Import from excel
                </label>)}
                <input
                    type="file"
                    className='hidden'
                    accept='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel'
                    id="fileInput"
                    onChange={(e)=>{
                        console.log(e.target.files[0])
                        setFile(e.target.files[0])
                        e.target.value=null
                    }}
                />

                {file!=null &&(
                    <div className='flex flex row space-x-2 items-center'>
                        <span className='font-bold text-black'>{file.name}</span>

                        {/* cancel */}
                        <div 
                            className='p-1 flex items-center justify-center rounded cursor-pointer bg-red-500 hover:bg-red-800 text-white font-medium'
                            onClick={e=>{setFile(null)}}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>

                        {/* confirm */}
                        <div 
                            className='p-1 flex items-center justify-center rounded cursor-pointer bg-green-500 hover:bg-green-800 text-white font-medium'
                            onClick={e=>{readFileAndSetData()}}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>   
                )}
            </div>
        </div>
    )
    
}

export default BulkExcelUploadComponent
