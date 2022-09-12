import React,{useContext, useState} from 'react'
import { saveAs } from "file-saver";
import excelfile from "./components/sample-template.xlsx"
// importrom '@mui/icons-material/Download';
// import TelegramIcon from '@mui/icons-material/Telegram';
import AdminAdd from './AdminAdd';
import Uploader from './components/Uploader';
import { push, ref, set } from 'firebase/database';
import { db } from './firebase_config';
import { Link } from 'react-router-dom';

function AdminAddExcel() {
    const saveFile = () => {
        saveAs(
        // "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        // "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        excelfile,
        "SpareData_Template.xlsx"
        );
    };

    const [uploaded,setUploaded]=useState(false);
    const [jsonData,setJsonData]=useState([])
    const [updateLoad, setUpdateLoad] = useState(false)
    const [fileName,setFileName]=useState("")
    
    const [Modal, setModal] = useState(null)

    var updateCount=0

    const backdropClickHandler = (event) => {
        if (event.target === event.currentTarget) {
            setModal(null)
        }
    }

    const RenderModal=()=>{
        setModal(
            <div className="flex flex-col bg-white text-white px-8 py-4 h-auto w-6/12 rounded-xl">
                <div className="flex flex-row justify-between ">
                    <div className='text-black text-xl'>Upload your file</div>
                    <svg onClick={()=>{setModal(null)}} xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black hover:text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>


                <div className='mt-3'>
                    <Uploader uploaded={uploaded} setUploaded={setUploaded} fileName={fileName} setFileName={setFileName} jsonData={jsonData} setJsonData={setJsonData}/>
                </div>
                
                <div className='w-full flex justify-end my-3'>
                    <button 
                        className='text-center rounded py-2 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                        onClick={()=>{
                            uploadData()
                        }}
                    >
                        Upload
                    </button> 
                </div>
            </div>
        )
    }

    const pushToDatabase = (item) => {
        setUpdateLoad(true)

        const spareRef = ref(db, `spares/`);
        const newSpareRef = push(spareRef);

        set(newSpareRef, {
            ...item,
            image:"", 
            id:newSpareRef.key
        })
        .then((ref)=>{

            if(updateCount===jsonData.length-1)
            {
                setUpdateLoad(false)
                updateCount=0
                setJsonData([])
                setFileName("")
                alert("Data uploaded successfully")
            }
            else
                updateCount++
        })
        .catch(error=>{
            alert("Couldnt save data!");
            return;
        })
    }

  const uploadData=()=>{
    if(jsonData.length===0)
    {
        alert("Please select an excel file with valid data")
    }
    else
    {
        setUpdateLoad(true)
        updateCount=0
        for(var index in jsonData)
        {
            if(jsonData[index].sap.toLowerCase()==="yes")
                jsonData[index].sap="Yes"
            if(jsonData[index].sap.toLowerCase()==="no")
                jsonData[index].sap="No"
            
            pushToDatabase(jsonData[index])
            // console.log(jsonData[index])
        }
    }
  }

  return (
    <div className='bg-blue-50 h-full px-3'>
        {Modal&&(
            <div onClick={backdropClickHandler} className="bg-black z-20 bg-opacity-80 space-x-10 fixed inset-0 flex justify-center items-center">
                {Modal}
            </div>)
        }
        {updateLoad&&(<div className="bg-white z-40 bg-opacity-95 fixed inset-0 flex justify-center items-center">
            <div class="w-full h-full flex justify-center items-center space-x-5 mt-24">
                <div
                    className="animate-spin rounded-full h-8 w-8 border-b-4 border-blue-500"
                />
            </div>
        </div>)}

         {/* <div className="p-12 flex flex-row items-center bg-blue-200 filter drop-shadow-lg w-full">
            <div className="font-bold text-5xl w-full text-center text-gray-900">SPARE ADD</div>
        </div> */}
        
        <div className='w-full flex flex-col space-y-3 pb-6 '>
            <div className='w-full flex flex-row items-center justify-between mt-5'>
                <div className='space-y-2 flex flex-col items-start'>
                    <div className='text-xl'>Add New Spare</div>
                    <div className='text-sm flex space-x-2 items-center'>
                        <Link to="../../spareview" > 
                            <span className='text-black opacity-70 cursor-pointer hover:opacity-100'>Spare View</span> 
                        </Link>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-black opacity-70 " fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                        <span>Add New Spare</span>
                    </div>
                </div>
                <div className='flex flex-row space-x-2'>
                    <button 
                        className="text-sm font-medium text-blue-500 py-2 px-5 rounded ring-2 ring-blue-500 hover:bg-blue-500 hover:text-white"
                        onClick={saveFile}> 
                        Download Template
                    </button>

                    {/* <button 
                        className='text-center rounded py-2 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                        onClick={()=>{
                            uploadData()
                        }}
                    >
                        Upload spare data
                    </button> */}

                    <button 
                        className='text-center rounded py-2 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                        onClick={()=>{
                            RenderModal()
                        }}
                    >
                        Upload spare data
                    </button>
                </div>
            </div>
            
            {/* <Uploader uploaded={uploaded} setUploaded={setUploaded} fileName={fileName} setFileName={setFileName} jsonData={jsonData} setJsonData={setJsonData}/> */}
            
            {/* <div className="w-full flex items-end justify-end ">
                <button className='mb-3 p-3 py-2 cursor-pointer hover:bg-green-600 px-3 bg-green-800 text-white text-sm font-semibold rounded-2xl'> Add spare</button>
            </div> */}
        </div>

        <AdminAdd/>
    </div>
  )
}

export default AdminAddExcel