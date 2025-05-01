import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { db} from "../firebase_config";
import { ref, set, push, onValue, remove, update, query, orderByChild, equalTo, orderByKey } from "firebase/database";
import * as XLSX from 'xlsx';
import {fieldHeadings, fieldKeys} from "../Requirements"
import BulkExcelUploadComponent from '../BulkExcelUploadComponent';
import Checkbox from '@mui/material/Checkbox';


function PackingCombination() {
    // const location = useLocation()
    // const {spareData}=location.state
    let navigate = useNavigate();

    const location=useLocation()

    const [setSelectedLink, setOpenedTab] = useOutletContext();
    useEffect(() => {
      setSelectedLink("admin/packingcombination-entry")
      setOpenedTab("adminDesk")
    }, [])
    

    const [packData, setPackData] = useState([])
    const [renderItems, setRenderItems] = useState(
        <div className="flex items-center justify-center w-full h-full">
            <div className="text-blue-300 text-5xl">Nothing here !</div>
        </div>
    )

    const [currentBomId, setCurrentBomId] = useState("")

    var packStruct={
        packingLabel:"",
        sizeGrid:"",
        "6":0,
        "7":0,
        "8":0,
        "9":0,
        "10":0,
        "11":0,
        "12":0,
        "13":0
    }

    const [newPackData, setNewPackData] = useState({...packStruct})
    
    const [editData, setEditData] = useState({...packStruct})

    const [bomIds, setBomIds] = useState("")

    //UseEffects
    
    useEffect(() => {
        const packRef = ref(db, `packingCombination/`);

        onValue(packRef, (snapshot) => {
            console.log("MypackData : ",snapshot.val())
            console.log("bomids : ",bomIds)
            const mypackData=snapshot.val()
            
            if(mypackData!=null)
            {
                var packArray=[];
                for(var key in mypackData)
                {
                    var item=mypackData[key]
                    console.log(item)
                    packArray.push(item)
                    // spareArray.push(item)
                }
                
                setPackData([...packArray])
            }
            else
                setPackData([])
        });
    }, [bomIds])
    
    useEffect(() => {
        
        if(packData.length>0)
        {
            setRenderItems(
                <div className='w-full h-full overflow-y-auto'>
                    {[...packData].reverse().map((item, index)=>RenderItem(item,index))}
                    {/* <RenderInputRow/> */}
                </div>
            )

        }
        else
        {
            setRenderItems(        
                <div/>
            )
        }
    }, [packData, editData])


    const deleteFromDatabase=(item)=>{
    
        if(window.confirm("Please confirm deleting "+item.packingLabel))
        {
            const packRef = ref(db, `packingCombination/${item.packingLabel}`); 
        
            remove(packRef).then(()=>{
                // alert("Removed article successfully")
            })
        }
    }

    const pushToDatabase = () => {
            // setUpdateLoad(true)

            const packRef = ref(db, `packingCombination/${newPackData.packingLabel}`);
            // const newpackRef = push(packRef);

            set(packRef, {
                ...newPackData,
            })
            .then((ref)=>{
                // setUpdateLoad(false)
                // alert("Successfully updated")

                // setNewArticleData({
                //     article:"",
                //     colour:"",
                //     model:"",
                //     category:"",
                //     size:""
                // })
            })
            .catch((error)=>{
                alert("Error while saving data : ",error)
                console.log(error)
            })            
    }


    const editItem = (item) => {
        // setUpdateLoad(true)
        item={...editData}

        const packRef = ref(db, `packingCombination/${item.packingLabel}`);

        set(packRef, {
            ...item
        })
        .then((ref)=>{
            // setUpdateLoad(false)
            // alert("Successfully updated")
        })
        .catch((error)=>{
            alert("Error while saving data : ",error)
            console.log(error)
        })            
    }


    const Submenu =({item, index})=> {
        return (
            <div className="nav__submenu drop-shadow-sm ring-1 ring-black rounded text-sm p-1 divide-y divide-gray-500">
                <div 
                    className="w-fit whitespace-nowrap px-2 py-1 font-medium cursor-pointer text-xs hover:bg-gray-200 hover:text-blue-500"
                    onClick={()=>{
                        setEditData({...item})
                        var temppackData=[...packData].reverse()
                        temppackData[index].edit=true
                        setPackData([...temppackData].reverse())
                    }}
                >
                    Edit
                </div>
                <div 
                    className="w-fit whitespace-nowrap px-2 py-1 font-medium cursor-pointer text-xs hover:bg-gray-200 hover:text-red-500"
                    onClick={()=>{
                        // deleteFromDatabase(item);
                    }}
                >
                    Delete
                </div>
            </div>
        )
    }
    const RenderItem=(item, index)=>{

        return (
            // <div key={index} className={item.qty<item.minStock?"w-11/12 p-2 grid grid-cols-8 bg-red-400 rounded-xl bg-opacity-90 ring-2 ring-red-500":"w-11/12 p-2 grid grid-cols-8"}>
            <div key={index} className="grid grid-flow-col auto-cols-fr gap-4 border-solid border-b border-gray-400 p-3 bg-gray-200" >
                <div className="flex items-center">
                    <div className="text-stone-900/30 w-10/12 break-all text-sm text-left">{index+1}</div>
                </div>

                {item.edit!=true&&(<>
                    <div className="flex items-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-sm text-left">{item.packingLabel}</div>
                    </div>

                    <div className="flex items-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-sm text-left">{item.sizeGrid}</div>
                    </div>
                </>)}

                {item.edit&&(<>
                    <div className="flex w-full flex flex-col items-start justify-center">
                        <input 
                            value={editData.packingLabel}
                            onChange={e=>{
                                setEditData({
                                    ...editData,
                                    packingLabel: e.target.value
                                })
                            }}
                            type="text" 
                            className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div>

                    <div className="flex w-full flex flex-col items-start justify-center">
                        <input 
                            value={editData.sizeGrid}
                            onChange={e=>{
                                setEditData({
                                    ...editData,
                                    sizeGrid: e.target.value
                                })
                            }}
                            type="text" 
                            className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div> 

                </>)}

                {Array.from({
                    length: 7 + 1}, 
                    (_, i) => 6 + i).map((size,index)=>(
                        <div className='flex flex-row gap-x-2 justify-start items-center'>
                            {item.edit==true?
                                (<input
                                    className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                                    value={editData[size]}
                                    onChange={(e)=>{
                                        setEditData({
                                            ...editData,
                                            [size]:e.target.value
                                        })
                                    }}
                                ></input>)
                                :
                                (<div className="flex items-center">
                                    <div className="text-stone-900/30 w-10/12 break-none text-sm text-left">{item[size]}</div>
                                </div>)
                            }
                        </div>
                    ))
                }

                <div className='grid grid-cols-2 gap-x-2'>

                    {item.edit&&(<div 
                        onClick={()=>{
                            var temppackData=[...packData].reverse()
                            temppackData[index].edit=false
                            setPackData([...temppackData].reverse())
                            // editItem(item);
                        }}
                        className='flex items-center justify-center rounded cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>)}

                    <div className='flex items-center'>
                        <div
                            className="nav__menu-item w-1/3"
                        >
                            {/* <a className=''><MenuDots className='h-6'/></a> */}
                            <div className='cursor-pointer bg-gray-300 rounded-full font-medium aspect-square'>
                                {/* <MenuDots className='h-3 '/> */}
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" fill="none"/><circle cx="128" cy="64" r="16"/><circle cx="128" cy="128" r="16"/><circle cx="128" cy="192" r="16"/></svg>
                            </div>
                            <Submenu item={item} index={index}/>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const renderInputRow=()=>{

        return (
            // <div key={index} className={item.qty<item.minStock?"w-11/12 p-2 grid grid-cols-8 bg-red-400 rounded-xl bg-opacity-90 ring-2 ring-red-500":"w-11/12 p-2 grid grid-cols-8"}>
            <div className='w-full bg-blue-100 p-4 flex-col gap-y-4'>
                <form 
                    className='w-full grid grid-flow-col auto-cols-fr gap-4 flex flex-row items-end my-4'
                    onSubmit={(e)=>{
                        e.preventDefault()
                        if(window.confirm("Please confirm entering the article"))
                            pushToDatabase();
                    }}
                >
                    {/* <div className='text-left text-sm font-semibold'>New Entry : </div> */}
                    <div className="flex w-full flex flex-col items-start justify-center">
                        <div>Packing Label</div>
                        <input
                            className='bg-white text-sm w-full ring-2 p-1 h-8 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                            onChange={e=>{
                                var val=e.target.value
                                setNewPackData({
                                    ...newPackData,
                                    packingLabel:val
                                })
                            }}
                        />
                    </div>
                    <div className="flex w-full flex flex-col items-start justify-center">
                        <div>Size Grid</div>
                        <input
                            className='bg-white text-sm w-full ring-2 p-1 h-8 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                            onChange={e=>{
                                var val=e.target.value
                                setNewPackData({
                                    ...newPackData,
                                    sizeGrid:val
                                })
                            }}
                        />
                    </div> 

                    {Array.from({length: 8}, 
                        (_, i) => 6+i).map((size,index)=>(
                            <div className='flex w-full flex flex-col items-start justify-center'>
                                <div>Size {size}</div>
                                <input
                                    onChange={(e)=>{
                                        setNewPackData({
                                            ...newPackData,
                                            [size]:e.target.value
                                        })
                                    }}
                                    className='w-3/4 ring-2 p-1 h-8 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                                />
                            </div>
                        ))
                    }
                    <input
                        type="submit" 
                        className='relative text-center rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                        value="Add"
                    />
                </form>
                <div className='flex justify-end'>
                    {/* <BulkExcelUploadComponent 
                        headings={[
                            ...Object.keys(newPackData),
                            ...Array.from({
                            length: parseInt(articleItem.size.toUpperCase().split('X')[1]) - parseInt(articleItem.size.toUpperCase().split('X')[0]) + 1}, 
                            (_, i) => parseInt(articleItem.size.toUpperCase().split('X')[0]) + i).map((size,index)=>(
                                size
                            ))
                        ]} 
                        templateName={"bom-template"}
                        pushFunction={pushToDatabaseBulk} 
                    /> */}
                </div>
            </div>
        )
    }

    return (
        <div className="pb-2 pt-4 bg-blue-50 h-full px-3">
            
            <div className="flex flex-col h-3xl space-y-2 items-center justify center items-center bg-white rounded p-4">

                {renderInputRow()}  
                <div className='flex flex-row justify-between w-full align-center'>
                    <div className='font-semibold text-lg'>Packing Combinations</div>

                    <div className='flex justify-end items-center space-x-2'>

                        <BulkExcelUploadComponent
                            headings={["PACKING LABEL","SIZE GRID",
                                ...Array.from({
                                    length: 8}, 
                                    (_, i) => 6 + i).map((size,index)=>(
                                        "SIZE "+size
                                ))
                            ]}
                            varNames={["packingLabel","sizeGrid","6","7","8","9","10","11","12","13"]} 
                            templateName={"packing-combinations-template"}
                            dbPath={`packingCombination/`}
                        />
                    </div>
                </div>

                <div className="w-full sticky top-0 p-3 grid grid-flow-col auto-cols-fr gap-4 bg-gray-200">
                    <div className="text-md py-2 text-left">SI NO</div>
                    <div className="text-md py-2 text-left">PACKING LABEL</div>
                    <div className="text-md py-2 text-left">SIZE GRID</div>
                    {Array.from({
                        length: 8}, 
                        (_, i) => 6 + i).map((size,index)=>(
                            <div className='text-left py-2 text-md'>
                                <div>SIZE {size}</div>
                            </div>
                        ))
                    }
                    <div></div>
                </div>
                
                {renderItems}
            </div>
        </div>

    )
}

export default PackingCombination
