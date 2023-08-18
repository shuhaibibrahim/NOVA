import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { db} from "../firebase_config";
import { ref, set, push, onValue, remove, update, query, orderByChild, equalTo, orderByKey } from "firebase/database";
import * as XLSX from 'xlsx';
import {fieldHeadings, fieldKeys} from "../Requirements"


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
        process:""
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
        const articleBomRef=ref(db, `articleData/${articleItem.id}/bomIds`);

        onValue(articleBomRef, (snapshot) => {
            var myBomIds=snapshot.val();
            console.log("myBomIds : ",myBomIds)
            setBomIds(myBomIds);
        });
    }, [])

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
        const bomRef = ref(db, `bomData/`);

        onValue(bomRef, (snapshot) => {
            console.log("MyBomData : ",snapshot.val())
            console.log("bomids : ",bomIds)
            const myBomData=snapshot.val()

            // console.log()
            if(myBomData!=null)
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
        if(Modal)
            RenderModal()
    }, [newRawMaterialData, rawMaterialEditData, rawMaterialsData, leftSizes, rightSizes, leftSizesEditData, rightSizesEditData]);

    const deleteFromDatabase=(item)=>{

        const articleRef = ref(db, `articleData/${articleItem.id}`);
        if(window.confirm("Do you want to delete the BOM from this article? The Bom will be still available in the system!"))
        {
            update(articleRef,{bomIds:bomIds.split(',').filter(bomid=>bomid!=item.id).join(',')})
        }
    }

    const deleteRawMaterialFromDatabase=(item)=>{

        
        const rawMaterialRef = ref(db, `bomDependentMaterials/${item.id}`);
        if(window.confirm("Do you want to delete the BOM from this article? The Bom will be still available in the system!"))
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

    const pushRawMaterialToBom = () => {
        // setUpdateLoad(true)
        const rawMaterialRef = ref(db, `bomDependentMaterials`);
        const newRawMaterialRef = push(rawMaterialRef);

        const rawMaterialEntryData={
            ...newRawMaterialData,
            leftSizes:Object.entries(leftSizes).map(([key,value])=>`${key}:${value}`).join(','),
            rightSizes:Object.entries(rightSizes).map(([key,value])=>`${key}:${value}`).join(','),
            bomId:currentBomId,
            processed:false,
            id:newRawMaterialRef.key
        }

        set(newRawMaterialRef, {
            ...rawMaterialEntryData,
        })
        .then((ref)=>{
            console.log(newbomData)
        })
        .catch((error)=>{
            alert("Error while saving data : ",error)
            console.log(error)
        })            
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
                        <div>
                            {item.rawMaterialName}
                        </div>
                        <div>
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

                <div className='text-left px-5'>
                    <div>
                        <div className='grid grid-cols-10 gap-x-2'>
                            <div className="w-full">Enter raw material</div>
                            <div className="w-full">Enter the unit</div>
                            <div className="w-full"></div>
                            {Array.from(Array(7).keys()).map(size => (
                                <div key={size + 5} className='2 font-bold w-full'>
                                {size + 5}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <div className='py-1 grid grid-cols-10 gap-x-2'>
                            <div>
                                <input 
                                    type="text" 
                                    className='ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded w-full'
                                    value={newRawMaterialData.rawMaterialName}
                                    onChange={e=>{setNewRawMaterialData(item=>({...item, rawMaterialName:e.target.value}))}}
                                />
                            </div>
                            <div>
                                <input 
                                    type="text" 
                                    className='ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded w-full'
                                    value={newRawMaterialData.unit}
                                    onChange={e=>{setNewRawMaterialData(item=>({...item, unit:e.target.value}))}}
                                />
                            </div>
                            <div className='w-full grid grid-cols-2 font-bold'>
                                <div>Left sizes</div>
                                <div>:</div>
                            </div>
                            {Array.from(Array(7).keys()).map(size => (
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
                            <div className='w-full'></div>
                            <div className='w-full'></div>
                            <div className='w-full grid grid-cols-2 font-bold'>
                                <div>Right sizes</div>
                                <div>:</div>
                            </div>
                            {Array.from(Array(7).keys()).map(size => (
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
            <div key={index} className="grid grid-cols-10 gap-x-4 border-solid border-b border-gray-400 p-3 bg-gray-200" >
                <div className="flex items-center justify-center">
                    <div className="text-stone-900/30 w-10/12 break-all text-sm text-left">{index+1}</div>
                </div>

                {item.edit!=true&&(<>
                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-sm text-left">{item.item}</div>
                    </div>

                    <div className="flex items-center justify-center">
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
                </>)}

                <div 
                    className='py-1 px-5 flex items-center justify-center rounded cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium col-span-2'
                    onClick={()=>{
                        setCurrentBomId(item.id)
                        RenderModal()
                    }}
                >
                    Add/Update raw materials
                </div>

                <div className='grid grid-cols-2 gap-x-2'>
                    {/* {item.edit!=true&&(<div 
                        onClick={()=>{
                            setEditData({...item})
                            var tempbomData=[...bomData].reverse()
                            tempbomData[index].edit=true
                            setBomData([...tempbomData].reverse())
                        }}
                        className='relative text-center rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                    </div>)} */}

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

                    {/* <div 
                        onClick={()=>{
                            deleteFromDatabase(item);
                        }}
                        className='relative text-center rounded py-1 px-5 cursor-pointer bg-red-500 hover:bg-red-800 text-white font-medium'
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                    </div> */}

                    <div className='flex items-center justify-center'>
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
            <form 
                className='w-full grid grid-cols-10 gap-x-4 p-4 bg-blue-100 flex flex-row items-center'
                onSubmit={(e)=>{
                    e.preventDefault()
                    if(window.confirm("Please confirm entering the article"))
                        pushToDatabase();
                }}
            >
                <div className='text-left text-sm font-semibold'>New Entry : </div>
                <div className="flex w-full flex flex-col items-start justify-center">
                    <input 
                        value={newbomData.item.toUpperCase()}
                        onChange={e=>{
                            setNewbomData({
                                ...newbomData,
                                item: e.target.value.toUpperCase()
                            })
                        }}
                        type="text" 
                        className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                    />
                </div> 

                <div className="flex w-full flex flex-col items-start justify-center">
                    {/* <input 
                        value={newbomData.itemType.toUpperCase()}
                        onChange={e=>{
                            setNewbomData({
                                ...newbomData,
                                itemType: e.target.value.toUpperCase()
                            })
                        }}
                        type="text" 
                        className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                    /> */}
                    <select
                        className='bg-white text-sm w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
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

                <input
                    type="submit" 
                    className='relative text-center rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                    value="Add"
                />
            </form>
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
                    <div className='font-semibold text-lg'>BOM Entry : aritcle {articleItem.article}</div>

                    {/* <button
                        className="text-sm font-medium text-blue-500 py-2 px-5 rounded ring-2 ring-blue-500 hover:bg-blue-500 hover:text-white"
                        onClick={()=>{DownloadExcel(spareData)}}
                    >
                            Export Excel
                    </button> */}
                </div>
                <div className="w-full sticky top-0 p-3 grid grid-cols-10 gap-x-4 bg-gray-200">
                    <div className="text-sm py-2 text-left text-sm">SI NO</div>
                    <div className="text-sm py-2 text-left text-sm">ITEM</div>
                    <div className="text-sm py-2 text-left text-sm">PROCESS</div>
                </div>

                {renderInputRow()}
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
