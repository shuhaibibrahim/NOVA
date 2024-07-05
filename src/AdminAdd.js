import React, { useState } from 'react'
import { db, storage } from "./firebase_config";
import { ref, set, push } from "firebase/database";
import { ref as sref, uploadBytes, getDownloadURL } from "firebase/storage";
import { fieldHeadings, fieldKeys } from './Requirements';

function AdminAdd() {
    //whan a new field is to be added, add it in the Requirements.js and in the 'sparey state below
    //If it is calculated and not taken as input from admin, specify it in the 'notinclude' state
    const [spare, setSpare] = useState({
        code:"",
        partName:"",
        partNumber:"",
        nickName:"",
        spec:"",
        qty:"",
        unit:"",
        value:"",
        origin:"",
        machine:"",
        remarks:"",
        image:"",
        life:0,
        minStock:0,
        id:""
    })
    const [imageFile, setImageFile] = useState("")
    const [Modal, setModal] = useState(<div/>)
    const [updateLoad, setUpdateLoad] = useState(false)
    
    const [notInclude, setNotInclude]=useState({
        "totalQty":true,
        "totalValue":true,
        "materialNumber":true
    })

    const pushToDatabase = () => {
            setUpdateLoad(true)

            const spareRef = ref(db, `spares/`);
            const newSpareRef = push(spareRef);

            const storageRef = sref(storage,`spares/${newSpareRef.key}`);

            uploadBytes(storageRef, imageFile)
            .then((snapshot) => {

                getDownloadURL(sref(storage, `spares/${newSpareRef.key}`))
                .then((url) => {
                    // setSpare({...spare, image:url, id:newSpareRef.key})

                    set(newSpareRef, {
                        ...spare,
                        image:url, 
                        id:newSpareRef.key
                    })
                    .then((ref)=>{
                        setUpdateLoad(false)
                        alert("Successfully updated")
        
                        setSpare({
                            code:"",
                            partName:"",
                            partNumber:"",
                            nickName:"",
                            spec:"",
                            qty:"",
                            localQty:"",
                            localVendor:"",
                            unit:"",
                            value:"",
                            origin:"",
                            machine:"",
                            remarks:"",
                            image:"",
                            life:0,
                            minStock:0
                        })
                        setModal(<div/>)
                    })
                    .catch((error)=>{
                        alert("Error while saving data : ",error)
                    })
                })
                .catch((error) => {
                });
            })
            .catch(error=>{
                alert("Couldnt save data!");
                return;
            })
    }

    const backdropClickHandler = (event) => {
        if (event.target === event.currentTarget) {
            setModal(<div/>)
        }
    }

    const RenderModal = (e) => {
        e.preventDefault()
        setModal(
            <div onClick={backdropClickHandler} className="bg-white z-20 bg-opacity-95 fixed inset-0 flex justify-center items-center">
                <div className="flex flex-col bg-blue-700 text-white h-xl w-8/12 rounded-xl">
                    <div className="flex flex-row justify-end px-8 pt-3 ">
                        <svg onClick={()=>{setModal(<div/>)}} xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black hover:text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>

                    <div className="w-full h-lg px-8 py-4 text-white flex flex-row bg-blue-700 justify-between">    
                        <div className="mr-3 overflow-y-scroll flex flex-col space-y-4 items-start w-8/12">
                            
                            {fieldHeadings.map((heading,index)=>
                            !(fieldKeys[index].split(":")[0] in notInclude)&&(
                                <div className="w-full grid grid-cols-3">
                                    <div className="text-left font-bold">{heading}</div>
                                    <div className="text-center font-bold">:</div>
                                    <div className="text-left font-semibold">{spare[fieldKeys[index].split(":")[0]]}</div>
                                </div>
                            ))}
                            
                        </div>
                        
                        <div className="flex flex-col space-y-4 w-4/12 justify-between items-center">
                            <div className="flex h-full w-full rounded-2xl bg-blue-100 justify-center items-center">
                                <img className="h-64 w-56 rounded-xl" src={imageFile?URL.createObjectURL(imageFile):""} alt="imageq1" />
                            </div>

                            <div className="flex flex-row justify-end w-full">
                                <button 
                                    className="p-3 w-7/12 ring-4 ring-red-700 bg-red-600 hover:bg-red-500 rounded-2xl text-white font-semibold"
                                    onClick={e=>{pushToDatabase()}}
                                >
                                        Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
    

    const setMaterialFieldDialogueBox=()=>{
        setModal(
            <div onClick={backdropClickHandler} className="bg-white z-20 bg-opacity-95 fixed inset-0 flex justify-center items-center">
               <div className="flex flex-col bg-blue-100 text-black h-auto py-3 w-6/12 rounded-xl px-3 absolute">
                    <label htmlFor="materialNumber">
                        <div className="w-full text-left">Material Number</div>
                    </label>

                    <div className="flex flex-row justify-end absolute right-0 -top-2">
                        <svg onClick={()=>{setModal(<div/>)}} xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black hover:text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    
                    <input 
                        className="pl-3 focus:outline-none h-8 w-full rounded-xl" 
                        type="text"
                        name="materialNumber"
                        value={spare["materialNumber"]} 
                        onChange={(e)=>{setSpare({...spare, materialNumber:e.target.value})}} 
                    />

                </div>
            </div>
        )
    }


    return (
        <div className='w-full'>
            {updateLoad&&(<div className="bg-white z-40 bg-opacity-95 fixed inset-0 flex justify-center items-center">
                    <div class="w-full h-full flex justify-center items-center space-x-5 mt-24">
                        <div
                            className="animate-spin rounded-full h-8 w-8 border-b-4 border-blue-500"
                        />
                    </div>
                </div>)}
                
            {Modal}
            {/* <div className="p-12 flex flex-row items-center bg-blue-200 filter drop-shadow-lg w-full">
                <div className="font-bold text-5xl w-full text-center text-gray-900">SPARE ADD</div>
            </div> */}

            <div className="flex flex-col justify-center items-center">
                <form className="bg-white pt-4 rounded flex flex-col items-center justify-center w-full overflow-hidden h-mxl">
                        <div className="px-4 w-full grid grid-cols-2 gap-4 gap-x-16654r567876543456786543234567897654321 overflow-auto">

                            {fieldHeadings.map((heading,index)=>{
                                
                                // fieldKeys[index].split(":")[0] in notInclude
                                console.log(fieldKeys[index].split(":")[0], " ", notInclude[fieldKeys[index].split(":")[0]])
                                if(notInclude[fieldKeys[index].split(":")[0]]===undefined||notInclude[fieldKeys[index].split(":")[0]]===false)
                                    return (<div key={index} className="w-full space-y-2">
                                        <label htmlFor={fieldKeys[index].split(":")[0]}>
                                            <div className="w-full text-left text-sm font-medium text-black opacity-70">{heading}</div>
                                        </label>
                                        {fieldKeys[index].split(":")[1]!=="radio"?
                                            (<input 
                                                className="pl-3 py-5 focus:outline-none ring-1 ring-gray-300 h-8 w-full rounded" 
                                                type={fieldKeys[index].split(":")[1]} 
                                                id={index}
                                                name={fieldKeys[index].split(":")[0]} 
                                                value={spare[fieldKeys[index].split(":")[0]]} 
                                                onChange={(e)=>{setSpare({...spare, [fieldKeys[index].split(":")[0]]:e.target.value})}} 
                                            />)
                                            :
                                            (
                                                <div className='flex flex-row w-full space-x-4'>
                                                    {fieldKeys[index].split(":")[2].split(",").map((radioItem, radioIndex)=>(
                                                        <div className='flex flex-row w-fit items-center space-x-2' key={radioIndex}>
                                                            <div className="text-left">{radioItem}</div>
                                                            <input 
                                                                className="focus:outline-none h-4 w-4 rounded-xl " 
                                                                type={fieldKeys[index].split(":")[1]} 
                                                                id={index} 
                                                                name={fieldKeys[index].split(":")[0]} 
                                                                value={radioItem} 
                                                                onChange={(e)=>{
                                                                    setSpare({...spare, [fieldKeys[index].split(":")[0]]:e.target.value})

                                                                    if(fieldKeys[index].split(":")[0]==="sap")
                                                                    {
                                                                        if(e.target.value==="Yes")
                                                                        {
                                                                            setNotInclude({...notInclude, materialNumber:false})
                                                                        }
                                                                        else
                                                                        {
                                                                            setNotInclude({...notInclude, materialNumber:true})
                                                                            setSpare({...spare, "materialNumber":""})
                                                                        }
                                                                    }
                                                                }} 
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                        }
                                    </div>)
                                }
                            )}

                            <div className="w-full space-y-2">
                                <div className="w-full text-left text-sm font-medium text-black opacity-70" >Image {imageFile?`: ${imageFile.name}`:""} </div>
                                <div className="
                                    py-5
                                    w-full
                                    flex flex-row
                                    space-x-3
                                    items-center
                                    justify-center
                                    px-3
                                    h-8
                                    bg-white
                                    rounded
                                    border border-dashed border-gray-300
                                ">
                                    {/* <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z" />
                                        <path d="M9 13h2v5a1 1 0 11-2 0v-5z" />
                                    </svg> */}
                                    <span class="text-base leading-normal">
                                        <label className='text-blue-600 cursor-pointer hover:text-blue-800 underline'>
                                        Browse
                                        <input 
                                            id="image" 
                                            type="file" 
                                            className='hidden'
                                            onChange={e=>{
                                                if(e.target.files[0].size<=46080)
                                                    setImageFile(e.target.files[0])
                                                else    
                                                    alert("File size more than 45kb")
                                            }} 
                                        />
                                        </label>
                                        <span className='text-black opacity-60'> image to upload</span>
                                    </span>
                                </div>
                                <div className='text-sm text-left opacity-70'>Max file size: 45KB</div>
                            </div>

                            {/* <div className="p-1 pl-3 pb-2 bg-blue-100 rounded-xl w-full">
                                <label>
                                    <div className="text-left w-full" >Image {imageFile?`: ${imageFile.name}`:""} </div>
                                    <div className="
                                        w-full
                                        flex flex-row
                                        space-x-3
                                        items-center
                                        justify-center
                                        px-3
                                        h-8
                                        bg-white
                                        rounded-xl
                                        shadow-md
                                        tracking-wide
                                        border border-blue
                                        cursor-pointer
                                        hover:bg-purple-600 hover:text-white
                                        text-purple-600
                                        ease-linear
                                        transition-all
                                        duration-150
                                    ">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z" />
                                            <path d="M9 13h2v5a1 1 0 11-2 0v-5z" />
                                        </svg>
                                        <span class="text-base leading-normal uppercase">Select a file (max 45kb)</span>
                                        <input 
                                            id="image" 
                                            type="file" 
                                            class="hidden" 
                                            onChange={e=>{
                                                if(e.target.files[0].size<=46080)
                                                    setImageFile(e.target.files[0])
                                                else    
                                                    alert("File size more than 45kb")
                                            }} 
                                        />
                                    </div>
                                </label>
                            </div> */}
                        </div>

                        <div className="flex flex-row justify-end w-full px-4 py-2">
                            <input 
                                type="submit" 
                                className='text-center rounded py-2 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                                value="Add Spare"
                                onClick={RenderModal}
                            />
                        </div>
                </form>
            </div>
        </div>
    )
}

export default AdminAdd
