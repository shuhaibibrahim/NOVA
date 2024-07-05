import React, {useCallback,useState} from 'react';
import {useDropzone} from 'react-dropzone';
import {motion} from 'framer-motion/dist/framer-motion'
// import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import Sheets from '../icons/sheets.png'
import * as XLSX from 'xlsx'
// import { DeleteForever } from '@material-ui/icons';

function Uploader({uploaded, setUploaded, setJsonData, fileName, setFileName}) {
  

  const onDrop = useCallback((acceptedFiles) => {
    acceptedFiles.forEach((uploadedfile) => {
      setFileName(uploadedfile.name)
      setUploaded(true)
      const reader=new FileReader();
        reader.onload = (e)=>{
            const bstr = e.target.result;
            const workbook = XLSX.read(bstr, { type: "binary" });
            var worksheet = workbook.Sheets[workbook.SheetNames[0]];
            
            //getting the complete sheet
            // console.log(worksheet);

            var headers = {};
            var data = [];
            // console.log(workbook)
            for (var z in worksheet) {
                if (z[0] === "!") continue;
                //parse out the column, row, and value
                var col = z.substring(0, 1);
                // console.log(col);
            
                var row = parseInt(z.substring(1));
                console.log(row);
            
                var value = worksheet[z].v;
                // console.log(value);
            
                //store header names
                if (row == 1) {
                    headers[col] = value;
                    // storing the header names
                    continue;
                }
            
                if (!data[row]) data[row] = {};
                data[row][headers[col]] = value;
            }
            //drop those first two rows which are empty
            data.shift();
            data.shift();
            console.log(data);
            setJsonData(data);  
        }
        reader.readAsBinaryString(uploadedfile);
    })
    
  }, [])
  const {getRootProps, getInputProps} = useDropzone({onDrop})

  return (
    <>
      {uploaded?
        <motion.div className='flex items-center justify-center w-full bg-gray-100 h-40'>
          <img src={Sheets} className="w-8"/> {fileName}
          <div 
            onClick={()=>{
              setUploaded(false)
              setJsonData([])
            }} 
            className="ml-2 bg-red"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500 hover:text-red-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
          </div>
        </motion.div>:
        <motion.div className=" w-full h-56 rounded-lg">
          <div {...getRootProps({className:'dropzone'})} className="border-dashed border-2 border-teal-500 rounded-lg w-full h-full flex flex-col items-center justify-center">
            <label className='text-blue-500 text-xl cursor-pointer'>
            Browse a file to upload
            <input {...getInputProps()} className="hidden"/>
            </label>
            {/* <img src={Sheets} className="w-8" alt="" /> */}
            <div className='text-gray-400 text-md'>or drag and drop it here</div>
            <p></p>
          </div>
        </motion.div>
      }
    </>
  )
}
export default Uploader