import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { db} from "../firebase_config";
import { ref, set, push, onValue, remove, update, query, orderByChild, equalTo, orderByKey } from "firebase/database";
import * as XLSX from 'xlsx';
import {fieldHeadings, fieldKeys} from "../Requirements"
import BulkExcelUploadComponent from '../BulkExcelUploadComponent';
import Checkbox from '@mui/material/Checkbox';


function BOMDataEntry() {
    // const location = useLocation()
    // const {spareData}=location.state
    let navigate = useNavigate();

    const location=useLocation()

    const {articleItem}=location.state

    const [setSelectedLink, setOpenedTab] = useOutletContext();
    useEffect(() => {
      setSelectedLink("admin/data-entry")
      setOpenedTab("adminDesk")
    }, [])
    

    const [bomData, setBomData] = useState([])
    const [dispData, setDispData] = useState([]) //data displayed
    const [Modal, setModal] = useState(null)
    const [search, setSearch] = useState("")
    const [rawMaterialsData, setRawMaterialsData] = useState([])
    const [renderItems, setRenderItems] = useState(
        <div className="flex items-center justify-center w-full h-full">
            <div className="text-blue-300 text-5xl">Nothing here !</div>
        </div>
    )

    const [currentBomId, setCurrentBomId] = useState("")

    var bomStruct={
        item:"",
        process:"",
        sizes:""
    }

    var rawMaterialStruct={
        rawMaterialName:"",
        unit:"",
        leftSizes:"", // "5:3,6:5,7:4,8:1,9:4,10:8,11:7" comma separated string of size and quantity separated by :
        rightSizes:"" // similar to leftSizes
    }

    const [newbomData, setNewbomData] = useState({...bomStruct})
    
    const [editData, setEditData] = useState({...bomStruct})

    const [bomIds, setBomIds] = useState("")

    const [newRawMaterialData, setNewRawMaterialData] = useState({...rawMaterialStruct})

    const [rawMaterialEditData, setRawMaterialEditData] = useState({...rawMaterialStruct})

    const [leftSizes, setLeftSizes] = useState({})

    const [rightSizes, setRightSizes] = useState({})

    const [leftSizesEditData, setLeftSizesEditData] = useState({})

    const [rightSizesEditData, setRightSizesEditData] = useState({})

    const [selectedMaterialType, setSelectedMaterialType] = useState("processed")

    const [stockData, setStockData] = useState([])
    
    const [editingInputElement, setEditingInputElement] = useState(null)

    const [modalIndex, setModalIndex] = useState(0)
    const [filter, setFilter] = useState("code")
    const [filterText, setFilterText] = useState("")
    const [filterItems, setFilterItems] = useState({})
    const [filterDisp, setFilterDisp] = useState([])
    const [filterSet, setFilterSet] = useState({})

    const [tempSize, setTempSize] = useState("")
    const [tempLeftQty, setTempLeftQty] = useState("")
    const [tempRightQty, setTempRightQty] = useState("")

    const [tempSizeList, setTempSizeList] = useState([])
    const [tempLeftQtyList, setTempLeftQtyList] = useState([])
    const [tempRightQtyList, setTempRightQtyList] = useState([])
    // const [filterData, setFilterData] = useState([])
    // const [qty, setQty] = useState(0)
    const [loading, setLoading] = useState(true)

    const filterKeys=["code","partName", "machine", "partNumber", "nickName", "spec", "origin"]

    //UseEffects

    useEffect(() => {
        if(currentBomId!=undefined || currentBomId!="")
        {
            const rawMaterialsRef=query(ref(db, `bomDependentMaterials/`), orderByChild("bomId"), equalTo(`${currentBomId}`));

            onValue(rawMaterialsRef, (snapshot) => {
                // var myBomIds=snapshot.val();

                console.log("raw material : ", snapshot.val())
                var rawMaterials={...snapshot.val()}
                var tempRawMaterialsData=[]
                for(var key in rawMaterials)
                {
                    tempRawMaterialsData.push({
                        ...rawMaterials[key],
                        id:key
                        
                    })
                }

                setRawMaterialsData([...tempRawMaterialsData])
            });
        }
    }, [currentBomId])
    
    useEffect(() => {
        const articleBomRef=ref(db, `articleData/${articleItem.id}/bomIds`);

        onValue(articleBomRef, (snapshot) => {
            var myBomIds=snapshot.val();
            console.log("myBomIds : ",myBomIds)
            setBomIds(myBomIds);
        });
    }, [])
    
    useEffect(() => {
        const bomRef = ref(db, `bomData/`);

        onValue(bomRef, (snapshot) => {
            console.log("MyBomData : ",snapshot.val())
            console.log("bomids : ",bomIds)
            const myBomData=snapshot.val()

            // console.log()
            if(bomIds && myBomData!=null)
            {
                var bomArray=[];
                for(var key in myBomData)
                {
                    var item=myBomData[key]
                    
                    if(bomIds.includes(item.id))
                    {
                        console.log(item)
                        bomArray.push(item)
                    }
                    // spareArray.push(item)
                }
                
                setBomData([...bomArray])
            }
            else
                setBomData([])
        });
    }, [bomIds])
    
    useEffect(() => {
        
        if(bomData.length>0)
        {
            setRenderItems(
                <div className='w-full h-full overflow-y-auto'>
                    {[...bomData].reverse().map((item, index)=>RenderItem(item,index))}
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
    }, [bomData, editData])

    useEffect(() => {
        const stockRef = ref(db, 'stockData/');

        onValue(stockRef, (snapshot) => {
            const data = snapshot.val();
            // ;

            var stockArray=[];
            for(var key in data)
            {
                var item=data[key]
                console.log(item)
                stockArray.push(item)
                // spareArray.push(item)
            }
            
            setStockData([...stockArray])
        });
    }, [])
    
    useEffect(() => {
        if(Modal)
            RenderModal()
    }, [newRawMaterialData, rawMaterialEditData, rawMaterialsData, leftSizes, rightSizes, leftSizesEditData, rightSizesEditData, selectedMaterialType]);

    const deleteFromDatabase=(item)=>{

        const articleRef = ref(db, `articleData/${articleItem.id}`);
        if(window.confirm("Do you want to delete the BOM from this article? The Bom will be still available in the system!"))
        {
            update(articleRef,{bomIds:bomIds.split(',').filter(bomid=>bomid!=item.id).join(',')})
        }
    }

    const deleteRawMaterialFromDatabase=(item)=>{

        
        const rawMaterialRef = ref(db, `bomDependentMaterials/${item.id}`);
        if(window.confirm("Do you want to delete raw material?"))
        {
            remove(rawMaterialRef).then(()=>{
            
            }).catch(()=>{
                alert("There was some error while deleting")
            })
        }
    }

    const pushToDatabase = () => {
            // setUpdateLoad(true)

            const articleRef = ref(db, `articleData/${articleItem.id}`);
            const bomRef = ref(db, `bomData/`);
            const newbomRef = push(bomRef);

            set(newbomRef, {
                ...newbomData,
                id:newbomRef.key
            })
            .then((ref)=>{
                console.log(newbomData)
                update(articleRef,{bomIds:bomIds!=undefined?bomIds+","+newbomRef.key:newbomRef.key})
            })
            .catch((error)=>{
                alert("Error while saving data : ",error)
                console.log(error)
            })            
    }

    const pushToDatabaseBulk = async(bulkData=[]) => {
        // setUpdateLoad(true)

        const articleRef = ref(db, `articleData/${articleItem.id}`);
        const bomRef = ref(db, `bomData/`);
        
        const asyncPromises=[]
        var newBomIds=""

        bulkData.forEach((bom=>{
            const newbomRef = push(bomRef);
    
            asyncPromises.push(
                set(newbomRef, {
                    ...bom,
                    id:newbomRef.key
                })
                .then((ref)=>{
                    newBomIds=newBomIds==""?newbomRef.key:newBomIds+","+newbomRef.key
                })
                .catch((error)=>{
                    console.log(error)
                }) 
            )           
        }))

        await Promise.all(asyncPromises)
        
        if(newBomIds!="")
        {
            update(articleRef,{bomIds:(bomIds!=undefined && bomIds!="")?bomIds+","+newBomIds:newBomIds})
            console.log("updated ids : ", (bomIds!=undefined && bomIds!="")?bomIds+","+newBomIds:newBomIds)
        }

        console.log("bomids  ",bomIds)
        console.log("newbomids : ",newBomIds)
    }   

    const pushRawMaterialToBom = () => {
        // setUpdateLoad(true)
        const rawMaterialRef = ref(db, `bomDependentMaterials`);
        const newRawMaterialRef = push(rawMaterialRef);

        const rawMaterialEntryData={
            ...newRawMaterialData,
            leftSizes:Object.entries(leftSizes).map(([key,value])=>`${key}:${value}`).join(','),
            rightSizes:Object.entries(rightSizes).map(([key,value])=>`${key}:${value}`).join(','),
            bomId:currentBomId,
            processed:selectedMaterialType=="processed",
            id:newRawMaterialRef.key
        }

        set(newRawMaterialRef, {
            ...rawMaterialEntryData,
        })
        .then((ref)=>{
            console.log("raw material entered")
        })
        .catch((error)=>{
            alert("Error while saving data : ",error)
            console.log(error)
        })            
    }

    const pushMaterialsToDatabaseBulk = async(bulkData=[]) => {
        // setUpdateLoad(true)
        const rawMaterialRef = ref(db, `bomDependentMaterials`);

        const asyncPromises=[]

        bulkData.forEach((item=>{
            const newRawMaterialRef = push(rawMaterialRef);

            var leftSizes=[]
            var rightSizes=[]

            for(var key in item)
            {
                var leftReg=/\d+L/
                if(leftReg.test(key))
                {
                    leftSizes.push(key.slice(0,-1)+":"+item[key])
                    const {[key]:_,...newitem} = item
                }
                
                var rightReg=/\d+R/
                if(rightReg.test(key))
                {
                    rightSizes.push(key.slice(0,-1)+":"+item[key])
                    const {[key]:_,...newitem} = item
                }
            }

            const rawMaterialEntryData={
                ...item,
                leftSizes:leftSizes.join(','),
                rightSizes:rightSizes.join(','),
                bomId:currentBomId,
                id:newRawMaterialRef.key
            }

            asyncPromises.push(
                set(newRawMaterialRef, {
                    ...rawMaterialEntryData
                })
                .then((ref)=>{
                    console.log("success")
                })
                .catch((error)=>{
                    console.log(error)
                }) 
            )           
        }))

        // await Promise.all(asyncPromises)
    }

    const editItem = (item) => {
        // setUpdateLoad(true)
        item={...editData, id:item.id}
        const bomRef = ref(db, `bomData/${item.id}`);

        set(bomRef, {
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

    const editRawMaterialItem = (item) => {
        // setUpdateLoad(true)
        item={...rawMaterialEditData, id:item.id}
        const rawMaterialRef = ref(db, `bomDependentMaterials/${item.id}`);

        
        update(rawMaterialRef, {
            rawMaterialName:rawMaterialEditData.rawMaterialName,
            unit:rawMaterialEditData.unit,
            leftSizes:Object.entries(leftSizesEditData).map(([key,value])=>`${key}:${value!=undefined?value:''}`).join(','),
            rightSizes:Object.entries(rightSizesEditData).map(([key,value])=>`${key}:${value!=undefined?value:''}`).join(',')
        }).then((ref)=>{
            // setUpdateLoad(false)
            // alert("Successfully updated")
        })
        .catch((error)=>{
            alert("Error while saving data : ",error)
            console.log(error)
        })            
    }

    function DownloadExcel() {
        

        // const fields={
        //     "code" : "Code",
        //     "partName" : "Part Name",
        //     "partNumber" : "Part Number"
        // }

        const excelData=bomData.map(item=>{

            var qty=item.qty||0
            var localQty=item.localQty||0
            var servQty=item.servQty||0

            var ogValue=item.value||0
            var localValue=item.localValue||0

            item["totalQty"]=parseInt(qty)+parseInt(localQty)+parseInt(servQty)
            item["totalValue"]=(parseFloat(qty)*parseFloat(ogValue)+parseFloat(localQty)*parseFloat(localValue)).toPrecision(10)
             
            var data={}
            fieldKeys.forEach(key=>{
                var mykey=key.split(":")[0]
                data={
                    ...data,
                    [mykey]:item[mykey]
                }
            })
            return data;
        })

        const fileName = 'test.xlsx';
        // const Heading=[[
        //     "Code",
        //     "Machine",
        //     "Nickname",
        //     "Part Name",
        //     "Part Number",
        //     "Origin",
        //     "Minimum Stock",
        //     "Quantity",
        //     "Local Quantity",
        //     "Unit",
        //     "Local Vendor Name",
        //     "Value",
        //     "Total Value",
        //     "Specification",
        //     "Life",
        //     "Remarks",
        // ]]
        const Heading=[[...fieldHeadings]]
        // console.log(fieldKeys.map(item=>item.split(':')[0]))

		var ws = XLSX.utils.json_to_sheet(excelData, { origin: 'A2', skipHeader: true });
        var wb = XLSX.utils.book_new();

        XLSX.utils.sheet_add_aoa(ws, Heading);
        
        XLSX.utils.book_append_sheet(wb, ws, "WorksheetName");

		XLSX.writeFile(wb, "sheetjs.xlsx");
    }

    const backdropClickHandler = (event) => {
        if (event.target === event.currentTarget) {
            setModal(null)
        }
    }

    const RenderRawMaterialItem=(item, index)=>{

        return (
            // <div key={index} className={item.qty<item.minStock?"w-11/12 p-2 grid grid-cols-8 bg-red-400 rounded-xl bg-opacity-90 ring-2 ring-red-500":"w-11/12 p-2 grid grid-cols-8"}>
            <div key={index} className="flex flex-row space-x-4 border-solid border-b border-gray-400 p-3 bg-gray-200" >
                <div className="flex items-center justify-center">
                    <div className="text-stone-900/30 w-10/12 text-sm text-left">{index+1}</div>
                </div>
                <div key={index} className="flex-1 grid grid-cols-11 gap-x-2 flex items-center" >

                    {item.edit!=true&&(<>
                        <div className='text-left'>
                            {item.rawMaterialName}
                        </div>
                        <div className='text-left'>
                            {item.unit}
                        </div>
                        <div className='text-left px-5 col-span-8'>
                            <div className='py-1 grid grid-cols-8 gap-x-2'>
                                <div className='w-full font-bold'>
                                    <div>Left sizes</div>
                                </div>
                                {item.leftSizes.split(',').map((sizeQtyPair,index) => (
                                    <div key={index + 5} className=''>
                                    {sizeQtyPair}
                                    </div>
                                ))}
                            </div>
                            <div className='py-1 grid grid-cols-8 gap-x-2'>
                                <div className='w-full font-bold'>
                                    <div>Right sizes</div>
                                </div>
                                {item.rightSizes.split(',').map((sizeQtyPair,index) => (
                                    <div key={index + 5} className=''>
                                    {sizeQtyPair}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>)}

                    {item.edit&&(<>
                        <div>
                            <input 
                                type="text" 
                                className='ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded w-full'
                                value={rawMaterialEditData.rawMaterialName}
                                onChange={e=>{setRawMaterialEditData(item=>({...item, rawMaterialName:e.target.value}))}}
                            />
                        </div>
                        <div>
                            <input 
                                type="text" 
                                className='ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded w-full'
                                value={rawMaterialEditData.unit}
                                onChange={e=>{setRawMaterialEditData(item=>({...item, unit:e.target.value}))}}
                            />
                        </div>
                        
                        <div className='text-left px-5 col-span-8'>
                            <div className='py-1 grid grid-cols-8 gap-x-2'>
                                
                                <div className='w-full font-bold'>
                                    <div>Left sizes</div>
                                </div>
                                {Array.from(Array(7).keys()).map(size => (
                                    <div key={size + 5} className=''>
                                    <label>
                                        {size+5} :
                                        <input
                                            type="text"
                                            className='ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded w-full'
                                            value={leftSizesEditData[size+5]}
                                            onChange={e=>{setLeftSizesEditData(item=>({...item, [size+5]:e.target.value}))}}
                                        />
                                    </label>
                                    </div>
                                ))}
                            </div>
                            <div className='py-1 grid grid-cols-8 gap-x-2'>
                                <div className='w-full font-bold'>
                                    <div>Right sizes</div>
                                </div>
                                {Array.from(Array(7).keys()).map(size => (
                                    <div key={size + 5} className=''>
                                    <label>
                                        {size+5} :
                                        <input
                                            type="text"
                                            className='ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded w-full'
                                            value={rightSizesEditData[size+5]}
                                            onChange={e=>{setRightSizesEditData(item=>({...item, [size+5]:e.target.value}))}}
                                        />
                                    </label>
                                    </div>
                                ))}
                            </div>  
                        </div>
                    </>)}

                    <div className='grid grid-cols-2 gap-x-2 w-auto' style={{minWidth:'10%'}}>
                        {item.edit&&(<div 
                            onClick={()=>{
                                var tempRawMaterialsData=[...rawMaterialsData].reverse()
                                tempRawMaterialsData[index].edit=false
                                setRawMaterialsData([...tempRawMaterialsData].reverse())
                                editRawMaterialItem(item);
                            }}
                            className='flex items-center justify-center rounded cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>)}

                        <div className='flex items-center justify-center'>
                            <div
                                className="nav__menu-item w-1/3"
                            >
                                {/* <a className=''><MenuDots className='h-6'/></a> */}
                                <div className='cursor-pointer bg-gray-300 rounded-full font-medium aspect-square'>
                                    {/* <MenuDots className='h-3 '/> */}
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" fill="none"/><circle cx="128" cy="64" r="16"/><circle cx="128" cy="128" r="16"/><circle cx="128" cy="192" r="16"/></svg>
                                </div>
                                <SubmenuRawMaterial item={item} index={index}/>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const RenderModal=()=>{
        setModal(
            <div className="flex flex-col bg-white h-auto w-11/12 rounded overflow-hidden p-2 relative">
                <div className="flex flex-row justify-end">
                    {/* <svg  xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black hover:text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg> */}

                    <svg onClick={()=>{setModal(null)}} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>

                <div className='text-left px-5 flex flex-col space-y-2 w-full'>
                    <div className='flex flex-row space-x-2'>
                        <label>
                            Material type
                            <select
                                value={selectedMaterialType}
                                onChange={e=>{
                                    setSelectedMaterialType(e.target.value)
                                    setNewRawMaterialData(item=>({
                                        ...item,
                                        rawMaterialName:"",
                                        unit:""
                                    }))
                                }}
                                className='w-full ring-2 ring-blue-200 bg-white p-1 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                            >
                                <option value="processed">Processed</option>
                                <option value="not processed">Not processed</option>
                            </select>
                        </label>

                        <label>
                            Material
                            {selectedMaterialType=="processed" && (
                                <select
                                    onChange={e=>{setNewRawMaterialData(item=>({...item, rawMaterialName:bomData.filter(item=>item.id===e.target.value)[0].item}))}}
                                    className='w-full ring-2 ring-blue-200 bg-white p-1 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                                >
                                    <option>- SELECT -</option>
                                    {bomData.map((item,index)=>(
                                        <option key={index} value={item.id}>{item.item}</option>
                                    ))}
                                </select>
                            )}
                            
                            {selectedMaterialType==="not processed" && (
                                <select
                                    onChange={e=>{
                                        setNewRawMaterialData(item=>({...item, 
                                            rawMaterialName:stockData.filter(item=>item.id===e.target.value)[0].materialName,
                                            unit: stockData.filter(item=>item.id===e.target.value)[0].unit
                                        }))
                                    }}
                                    className='w-full ring-2 ring-blue-200 bg-white p-1 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                                >
                                    <option>- SELECT -</option>
                                    {stockData.map((item,index)=>(
                                        <option key={index} value={item.id}>{item.materialName}</option>
                                    ))}
                                </select>
                            )}
                        </label>

                        {selectedMaterialType==="processed"&&(<label>
                            Unit
                            <input 
                                type="text" 
                                className='ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded w-full'
                                value={newRawMaterialData.unit}
                                onChange={e=>{setNewRawMaterialData(item=>({...item, unit:e.target.value}))}}
                            />
                        </label>)}

                        {selectedMaterialType==="not processed"&& newRawMaterialData.unit!=="" &&(<label>
                            Unit
                            <div>{newRawMaterialData.unit}</div>
                        </label>)}

                        <div className='flex w-full justify-end items-end'>
                            <BulkExcelUploadComponent 
                                headings={["rawMaterialName","processed","unit","5L","6L","7L","8L","9L","10L","11L","12L","13L","5R","6R","7R","8R","9R","10R","11R","12R","13R"]} 
                                templateName={"material-template"}
                                pushFunction={pushMaterialsToDatabaseBulk} 
                            />
                        </div>
                    </div>
                    <div className='w-full'>
                        <div>
                            <div className='grid grid-cols-10 gap-x-2'>
                                <div className="w-full"></div>
                                {Array.from(Array(9).keys()).map(size => (
                                    <div key={size + 5} className='2 font-bold w-full'>
                                    {size + 5}
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div>
                            <div className='py-1 grid grid-cols-10 gap-x-2'>
                                <div className='w-full grid grid-cols-2 font-bold'>
                                    <div>Left sizes</div>
                                    <div>:</div>
                                </div>
                                {Array.from(Array(9).keys()).map(size => (
                                    <div key={size + 5} className=''>
                                    <input
                                        type="text"
                                        className='ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded w-full'
                                        value={leftSizes[size+5]}
                                        onChange={e=>{setLeftSizes(item=>({...item, [size+5]:e.target.value}))}}
                                    />
                                    </div>
                                ))}
                            </div>
                            <div className='py-1 grid grid-cols-10 gap-x-2'>
                                <div className='w-full grid grid-cols-2 font-bold'>
                                    <div>Right sizes</div>
                                    <div>:</div>
                                </div>
                                {Array.from(Array(9).keys()).map(size => (
                                    <div key={size + 5} className=''>
                                    <input
                                        type="text"
                                        className='ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded w-full'
                                        value={rightSizes[size+5]}
                                        onChange={e=>{setRightSizes(item=>({...item, [size+5]:e.target.value}))}}
                                    />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className='flex justify-end w-full py-1'>
                        <button 
                            className='py-1 px-5 flex items-center justify-center rounded cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                            onClick={e=>{pushRawMaterialToBom()}}
                        >
                            Add raw material
                        </button>
                    </div>
                </div>

                <div className='flex-1 bg-gray-200 mx-5 mt-1 rounded overflow-y-hidden'>
                    <div className='w-full h-full overflow-y-auto'>
                        {[...rawMaterialsData].reverse().map((item, index)=>RenderRawMaterialItem(item,index))}
                    </div>
                </div>
            </div>
        )
    }

    const Submenu =({item, index})=> {
        return (
            <div className="nav__submenu drop-shadow-sm ring-1 ring-black rounded text-sm p-1 divide-y divide-gray-500">
                <div 
                    className="w-fit whitespace-nowrap px-2 py-1 font-medium cursor-pointer text-xs hover:bg-gray-200 hover:text-blue-500"
                    onClick={()=>{
                        setEditData({...item})
                        var tempbomData=[...bomData].reverse()
                        tempbomData[index].edit=true
                        setBomData([...tempbomData].reverse())
                    }}
                >
                    Edit
                </div>
                <div 
                    className="w-fit whitespace-nowrap px-2 py-1 font-medium cursor-pointer text-xs hover:bg-gray-200 hover:text-red-500"
                    onClick={()=>{
                        deleteFromDatabase(item);
                    }}
                >
                    Delete
                </div>
                <div 
                    className="w-fit whitespace-nowrap px-2 py-1 font-medium cursor-pointer text-xs hover:bg-gray-200 hover:text-green-500"
                    onClick={()=>{
                        setCurrentBomId(item.id)
                        RenderModal()
                    }}
                >
                    Add/Update raw materials
                </div>
            </div>
        )
    }

    const SubmenuRawMaterial =({item, index})=> {
        return (
            <div className="nav__submenu drop-shadow-sm ring-1 ring-black rounded text-sm p-1 divide-y divide-gray-500">
                <div 
                    className="w-fit whitespace-nowrap px-2 py-1 font-medium cursor-pointer text-xs hover:bg-gray-200 hover:text-blue-500"
                    onClick={()=>{
                        setRawMaterialEditData({...item})
                        var tmpLeftSizes={}
                        item.leftSizes.split(',').map(sizeQtyPair=>{
                            tmpLeftSizes[sizeQtyPair.split(':')[0]]=sizeQtyPair.split(':')[1]
                        })
                        var tmpRightSizes={}
                        item.rightSizes.split(',').map(sizeQtyPair=>{
                            tmpRightSizes[sizeQtyPair.split(':')[0]]=sizeQtyPair.split(':')[1]
                        })

                        setLeftSizesEditData({...tmpLeftSizes})
                        setRightSizesEditData({...tmpRightSizes})

                        var tempRawMaterialData=[...rawMaterialsData].reverse()
                        tempRawMaterialData[index].edit=true
                        setRawMaterialsData([...tempRawMaterialData].reverse())
                    }}
                >
                    Edit
                </div>
                <div 
                    className="w-fit whitespace-nowrap px-2 py-1 font-medium cursor-pointer text-xs hover:bg-gray-200 hover:text-red-500"
                    onClick={()=>{
                        deleteRawMaterialFromDatabase(item);
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
                        <div className="text-stone-900/30 w-10/12 break-all text-sm text-left">{item.item}</div>
                    </div>

                    <div className="flex items-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-sm text-left">{item.process}</div>
                    </div>
                </>)}

                {item.edit&&(<>
                    <div className="flex w-full flex flex-col items-start justify-center">
                        <input 
                            value={editData.item.toUpperCase()}
                            onChange={e=>{
                                setEditingInputElement(e.target)
                                setEditData({
                                    ...editData,
                                    item: e.target.value.toUpperCase()
                                })
                            }}
                            type="text" 
                            className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div> 

                    <div className="flex w-full flex flex-col items-start justify-center">
                        <select
                            className='bg-white text-sm w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                            onChange={e=>{
                                setEditingInputElement(e.target)
                                setEditData({
                                    ...editData,
                                    process: e.target.value.toUpperCase()
                                })
                            }}
                            value={editData.process}
                        >
                            <option value="">--select--</option>
                            <option value="Knitting">Knitting</option>
                            <option value="Clicking">Clicking</option>
                            <option value="Printing">Printing</option>
                            <option value="Embossing">Embossing</option>
                            <option value="Stitching">Stitching</option>
                            <option value="Strobling">Strobling</option>
                            <option value="Stuckon">Stuckon</option>
                        </select>
                    </div>  
                </>)}

                {Array.from({
                    length: parseInt(articleItem.size.toUpperCase().split('X')[1]) - parseInt(articleItem.size.toUpperCase().split('X')[0]) + 1}, 
                    (_, i) => parseInt(articleItem.size.toUpperCase().split('X')[0]) + i).map((size,index)=>(
                        <div className='flex flex-row gap-x-2 justify-start items-center'>
                            {/* <div>{size}</div> */}
                            <Checkbox
                                onChange={()=>{
                                    var tempArr=editData.sizes==""?[]:editData.sizes.split(',')
                                    var sizes=tempArr.includes(size.toString())?
                                            tempArr.filter(s=>s!=size).join(',')
                                            :[...tempArr,size].join(',')
                                    setEditData({
                                        ...editData,
                                        sizes:sizes
                                    })
                                }}
                                // value={newbomData.sizes.split(',').includes(size)}
                                checked={item.edit?
                                    editData.sizes.split(',').includes(size.toString())
                                    :item.sizes.split(',').includes(size.toString())}
                                disabled={!item.edit}
                            />
                        </div>
                    ))
                }

                <div className='grid grid-cols-2 gap-x-2'>

                    {item.edit&&(<div 
                        onClick={()=>{
                            var tempbomData=[...bomData].reverse()
                            tempbomData[index].edit=false
                            setBomData([...tempbomData].reverse())
                            editItem(item);
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
                        <div>Item</div>
                        <input 
                            value={newbomData.item.toUpperCase()}
                            onChange={e=>{
                                setNewbomData({
                                    ...newbomData,
                                    item: e.target.value.toUpperCase()
                                })
                            }}
                            type="text" 
                            className='w-full ring-2 p-1 h-8 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div> 

                    <div className="flex w-full flex flex-col items-start justify-center">
                        <div>Process</div>
                        <select
                            className='bg-white text-sm w-full ring-2 p-1 h-8 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                            onChange={e=>{
                                setNewbomData({
                                    ...newbomData,
                                    process: e.target.value.toUpperCase()
                                })
                            }}
                        >
                            <option>--select--</option>
                            <option value="Knitting">Knitting</option>
                            <option value="Clicking">Clicking</option>
                            <option value="Printing">Printing</option>
                            <option value="Embossing">Embossing</option>
                            <option value="Stitching">Stitching</option>
                            <option value="Strobling">Strobling</option>
                            <option value="Stuckon">Stuckon</option>
                        </select>
                    </div> 

                    {Array.from({
                        length: parseInt(articleItem.size.toUpperCase().split('X')[1]) - parseInt(articleItem.size.toUpperCase().split('X')[0]) + 1}, 
                        (_, i) => parseInt(articleItem.size.toUpperCase().split('X')[0]) + i).map((size,index)=>(
                            <div className='flex flex-row gap-x-2 justify-start items-center'>
                                <div>{size}</div>
                                <Checkbox
                                    onChange={()=>{
                                        var tempArr=newbomData.sizes==""?[]:newbomData.sizes.split(',')
                                        var sizes=tempArr.includes(size.toString())?
                                                tempArr.filter(s=>s!=size).join(',')
                                                :[...tempArr,size].join(',')
                                        setNewbomData({
                                            ...newbomData,
                                            sizes:sizes
                                        })
                                    }}
                                    // value={newbomData.sizes.split(',').includes(size)}
                                    checked={newbomData.sizes.split(',').includes(size.toString())}
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
                    <BulkExcelUploadComponent 
                        headings={["item","process"]} 
                        templateName={"bom-template"}
                        pushFunction={pushToDatabaseBulk} 
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="pb-2 pt-4 bg-blue-50 h-full px-3">

            {Modal&&(
                <div onClick={backdropClickHandler} className="bg-black z-20 bg-opacity-80 fixed inset-0 flex justify-center py-10">
                    {Modal}
                </div>)
            }
            
            <div className="flex flex-col h-3xl space-y-2 items-center justify center items-center bg-white rounded p-4">
                <div className='flex flex-row justify-between w-full align-center'>
                    <div className='flex flex-row space-x-2 hover:cursor'>
                        <Link to="../data-entry">
                            <div className="text-md text-gray-700">
                                Data Entry
                            </div>
                        </Link>
                        <div className="text-md text-gray-700"> > </div>
                        <div className='font-semibold text-lg'>BOM Entry : aritcle {articleItem.article}</div>
                    </div>

                    {/* <button
                        className="text-sm font-medium text-blue-500 py-2 px-5 rounded ring-2 ring-blue-500 hover:bg-blue-500 hover:text-white"
                        onClick={()=>{DownloadExcel(spareData)}}
                    >
                            Export Excel
                    </button> */}
                </div>

                {renderInputRow()}

                <div className="w-full sticky top-0 p-3 grid grid-flow-col auto-cols-fr gap-4 bg-gray-200">
                    <div className="text-md py-2 text-left">SI NO</div>
                    <div className="text-md py-2 text-left">ITEM</div>
                    <div className="text-md py-2 text-left">PROCESS</div>
                    {Array.from({
                        length: parseInt(articleItem.size.toUpperCase().split('X')[1]) - parseInt(articleItem.size.toUpperCase().split('X')[0]) + 1}, 
                        (_, i) => parseInt(articleItem.size.toUpperCase().split('X')[0]) + i).map((size,index)=>(
                            <div className='text-left py-2 text-md'>
                                <div>{size}</div>
                            </div>
                        ))
                    }
                    <div></div>
                </div>
{/*                 
                {
                    loading && 
                    (
                        <div className="w-full h-full mt-24" >
                            <div className="w-full h-full flex justify-center items-center space-x-5 mt-24">
                                <div
                                    className="animate-spin rounded-full h-8 w-8 border-b-4 border-blue-500"
                                />
                            </div>
                        </div>
                    )
                } */}
                
                {renderItems}
            </div>
        </div>

    )
}

export default BOMDataEntry
