import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { db} from "../firebase_config";
import { ref, set, push, onValue, remove, get } from "firebase/database";
import * as XLSX from 'xlsx';
import {fieldHeadings, fieldKeys} from "../Requirements"
import BulkExcelUploadComponent from '../BulkExcelUploadComponent';

function StockEntry({user}) {
    // const location = useLocation()
    // const {spareData}=location.state
    let navigate = useNavigate();

    const [setSelectedLink, setOpenedTab] = useOutletContext();
    useEffect(() => {
        console.log("user Data : ",user)
        setSelectedLink("mmdept/stock-entry")
        setOpenedTab("mmDept")
    }, [])

    const stockStruct={
        materialGroup:"",
        materialNumber:"",
        materialDesc:"",
        qty:"",
        unit:"",
        rackPosition:"",
        numberOfLayers:"",
        rate:""
    }    

    const [stockData, setStockData] = useState([])
    const [requirementsData, setRequirementsData] = useState([])
    const [editData, setEditData] = useState({...stockStruct})
    const [editingInputElement, setEditingInputElement] = useState(null)

    const [articleSelectList, setArticleSelectList] = useState([])
    const [colourSelectList, setColourSelectList] = useState([])
    const [modelSelectList, setModelSelectList] = useState([])
    const [categorySelectList, setCategorySelectList] = useState([])



    const [spareData, setSpareData] = useState([])
    const [dispData, setDispData] = useState([]) //data displayed
    const [Modal, setModal] = useState(null)
    const [search, setSearch] = useState("")
    const [renderItems, setRenderItems] = useState(
        <div className="flex items-center justify-center w-full h-full">
            <div className="text-blue-300 text-5xl">Nothing here !</div>
        </div>
    )

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

    const [newStock, setNewStock] = useState({...stockStruct})

    const [packageInput, setPackageInput] = useState([])

    const [expand, setExpand] = useState(false)

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

    const pushToDatabase = async() => {
            // setUpdateLoad(true)
            const stockRef = ref(db, `stockData/${newStock.materialNumber}`);
            try{
                
                const snapshot=await get(stockRef)
                // const stockRef = push(stockRef);
                if(!snapshot.exists()){
                    if(window.confirm("Add new stock?")){
                        await set(stockRef, {
                            ...newStock,
                            id:newStock.materialNumber
                        })
                        .then(()=>{
                            // setUpdateLoad(false)
                            console.log("Successfully updated")
                        })
                        .catch((error)=>{
                            console.log("Error while saving data : ",error)
                        })
                    }
                }else{
                    window.alert(`Material ${newStock.materialNumber} already exists in the stock`)
                }

            }catch(error){
                console.log(error)
            }
            }

    const pushStockToDatabaseBulk = async (bulkData) => {
        // setUpdateLoad(true)
        // const stockRef = ref(db, `stockData/`);
        var existingMaterials=new Set()
        await bulkData.forEach(async(item, index)=>{
            const stockRef = ref(db, `stockData/${item.materialNumber}`);
            try{
                const snapshot=await get(stockRef)
                if(!snapshot.exists()){
                    await set(stockRef, {
                        ...item,
                        qty:0,
                        id:item.materialNumber
                    })
                    .then(()=>{
                        // setUpdateLoad(false)
                        // console.log("Successfully updated")
                    })
                    .catch((error)=>{
                        console.log("Error while saving data : ",error)
                    }) 
                }else{
                    existingMaterials.add(item.materialNumber)
                }
            }catch(error){
                console.log(error)
            }
                    
            console.log(index, bulkData.length, existingMaterials.size)
            if(index==bulkData.length-1 && existingMaterials.size>0){
                window.alert(`Materials ${[...existingMaterials].join(', ')} already exists in the stock`)
            }
        })
        
    }

    const editItem = (item) => {
        item={...editData, id:item.id}

        const stockRef = ref(db, `stockData/${item.id}`);

        set(stockRef, {
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

    const deleteFromDatabase=(item)=>{

        if(window.confirm("Please confirm deleting "+item.article))
        {
            const reqRef = ref(db, `stockData/${item.id}`); 
        
            remove(reqRef).then(()=>{
                // alert("Removed article successfully")
            })
        }
    }

    function DownloadExcel() {
        

        // const fields={
        //     "code" : "Code",
        //     "partName" : "Part Name",
        //     "partNumber" : "Part Number"
        // }

        const excelData=spareData.map(item=>{

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

        const Heading=[[...fieldHeadings]]
        // console.log(fieldKeys.map(item=>item.split(':')[0]))

		var ws = XLSX.utils.json_to_sheet(excelData, { origin: 'A2', skipHeader: true });
        var wb = XLSX.utils.book_new();

        XLSX.utils.sheet_add_aoa(ws, Heading);
        
        XLSX.utils.book_append_sheet(wb, ws, "WorksheetName");

		XLSX.writeFile(wb, "sheetjs.xlsx");
    }

    const RenderItem=(item, index)=>{

        return (
            // <div key={index} className={item.qty<item.minStock?"w-11/12 p-2 grid grid-cols-9 bg-red-400 rounded-xl bg-opacity-90 ring-2 ring-red-500":"w-11/12 p-2 grid grid-cols-9"}>
            <div key={index} className="grid grid-cols-9 gap-x-1 border-solid border-b border-gray-400 p-3 bg-gray-200" >
                {item.edit!=true&&(<>
                    <div className="text-stone-900/30 break-all text-left">{item.materialGroup}</div>

                    <div className="text-stone-900/30 break-all text-left">{item.materialNumber}</div>

                    <div className="text-stone-900/30 break-all text-left">{item.materialDesc}</div>

                    <div className="text-stone-900/30 break-all text-left">{item.qty}</div>

                    <div className="text-stone-900/30 break-all text-left">{item.unit}</div>

                    <div className="text-stone-900/30 break-all text-left">{item.rackPosition}</div>

                    <div className="text-stone-900/30 break-all text-left">{item.numberOfLayers}</div>

                    <div className="text-stone-900/30 break-all text-left">{item.rate}</div>
                </>)}

                {item.edit&&(<>
                    <div className="flex w-full flex flex-col items-start justify-start">
                        <input 
                            value={editData.materialGroup}
                            onChange={e=>{
                                setEditingInputElement(e.target)
                                setEditData({
                                    ...editData,
                                    materialGroup: e.target.value
                                })
                            }}
                            type="text" 
                            className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div> 

                    <div className="flex w-full flex flex-col items-start justify-start">
                        <input 
                            value={editData.materialNumber}
                            onChange={e=>{
                                setEditingInputElement(e.target)
                                setEditData({
                                    ...editData,
                                    materialNumber: e.target.value
                                })
                            }}
                            type="text" 
                            className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div> 

                    <div className="flex w-full flex flex-col items-start justify-start">
                        <input 
                            value={editData.materialDesc}
                            onChange={e=>{
                                setEditingInputElement(e.target)
                                setEditData({
                                    ...editData,
                                    materialDesc: e.target.value
                                })
                            }}
                            type="text" 
                            className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div> 

                    <div className="flex w-full flex flex-col items-start justify-start">
                        <input 
                            value={editData.qty}
                            onChange={e=>{
                                setEditingInputElement(e.target)
                                setEditData({
                                    ...editData,
                                    qty: e.target.value
                                })
                            }}
                            type="text" 
                            className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div> 

                    <div className="flex w-full flex flex-col items-start justify-start">
                        <input 
                            value={editData.unit}
                            onChange={e=>{
                                setEditingInputElement(e.target)
                                setEditData({
                                    ...editData,
                                    unit: e.target.value
                                })
                            }}
                            type="text" 
                            className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div>  

                    <div className="flex w-full flex flex-col items-start justify-start">
                        <input 
                            value={editData.rackPosition}
                            onChange={e=>{
                                setEditingInputElement(e.target)
                                setEditData({
                                    ...editData,
                                    rackPosition: e.target.value
                                })
                            }}
                            type="text" 
                            className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div>  

                    <div className="flex w-full flex flex-col items-start justify-start">
                        <input 
                            value={editData.numberOfLayers}
                            onChange={e=>{
                                setEditingInputElement(e.target)
                                setEditData({
                                    ...editData,
                                    numberOfLayers: e.target.value
                                })
                            }}
                            type="text" 
                            className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div>  

                    <div className="flex w-full flex flex-col items-start justify-start">
                        <input 
                            value={editData.rate}
                            onChange={e=>{
                                setEditingInputElement(e.target)
                                setEditData({
                                    ...editData,
                                    rate: e.target.value
                                })
                            }}
                            type="text" 
                            className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div> 

                </>)}

                <div className='col-span-1'>
                    <div className='grid grid-cols-2 gap-x-2 w-full'>
                        {item.edit!=true&&(
                        <div className='flex justify-center'>
                            <div 
                                onClick={()=>{
                                    if(user.admin==true){
                                        setEditData({...item})
                                        var tempStockData=[...stockData].reverse()
                                        tempStockData[index].edit=true
                                        setStockData([...tempStockData].reverse())
                                    }
                                }}
                                className={"relative text-center rounded py-1 px-5 text-white font-medium "+(user.admin==true?"bg-blue-500 hover:bg-blue-800 cursor-pointer":"bg-gray-500")}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                            </div>
                        </div>
                        )}

                        {item.edit&&(
                        <div className="flex justify-center">
                            <div 
                                onClick={()=>{
                                    if(user.admin==true){
                                        var tempStockData=[...stockData].reverse()
                                        tempStockData[index].edit=false
                                        setStockData([...tempStockData].reverse())
                                        editItem(item);
                                    }
                                }}
                                className={"relative text-center rounded py-1 px-5 text-white font-medium "+(user.admin==true?"bg-blue-500 hover:bg-blue-800 cursor-pointer":"bg-gray-500")}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>    
                        )}

                        
                        <div className="flex justify-center">
                            <div 
                                onClick={()=>{
                                    if(user.admin==true){
                                        deleteFromDatabase(item);
                                    }
                                }}
                                className={"relative text-center rounded py-1 px-5 text-white font-medium "+(user.admin==true?"bg-blue-500 hover:bg-blue-800 cursor-pointer":"bg-gray-500")}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

               
            </div>
        )
    }

    useEffect(() => {
        
        if(stockData.length>0)
        {
            setRenderItems(
                <div className='w-full overflow-y-auto'>
                    {[...stockData].reverse().map((item, index)=>RenderItem(item,index))}
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
    }, [stockData, editData])


    const RenderInputRow=()=>{
        return (
            // <div key={index} className={item.qty<item.minStock?"w-11/12 p-2 grid grid-cols-9 bg-red-400 rounded-xl bg-opacity-90 ring-2 ring-red-500":"w-11/12 p-2 grid grid-cols-9"}>
            <div  className='w-full grid grid-cols-9 gap-4'>
                <div className="flex w-full flex flex-col items-start justify-start">
                    <label className='text-sm'>Material Group</label>
                    <input 
                        value={newStock.materialGroup}
                        onChange={e=>{
                            setNewStock({
                                ...newStock,
                                materialGroup: e.target.value
                            })
                        }}
                        type="text" 
                        className='w-full ring-2 ring-blue-200 bg-white h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    />
                </div> 

                <div className="flex w-full flex flex-col items-start justify-start">
                    <label className='text-sm'>Material Number</label>
                    <input 
                        value={newStock.materialNumber}
                        onChange={e=>{
                            setNewStock({
                                ...newStock,
                                materialNumber: e.target.value
                            })
                        }}
                        type="text" 
                        className='w-full ring-2 ring-blue-200 bg-white h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    />
                </div> 

                <div className="flex w-full flex flex-col items-start justify-start">
                    <label className='text-sm'>Material Description</label>
                    <input 
                        value={newStock.materialDesc}
                        onChange={e=>{
                            setNewStock({
                                ...newStock,
                                materialDesc: e.target.value
                            })
                        }}
                        type="text" 
                        className='w-full ring-2 ring-blue-200 bg-white h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    />
                </div> 

                {/* <div className="flex w-full flex flex-col items-start justify-start">
                    <label className='text-sm'>Quantity</label>
                    <input 
                        value={newStock.qty}
                        onChange={e=>{
                            setNewStock({
                                ...newStock,
                                qty: e.target.value
                            })
                        }}
                        type="text" 
                        className='w-full ring-2 ring-blue-200 bg-white h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    />
                </div> */}

                <div className="flex w-full flex flex-col items-start justify-start">
                    <label className='text-sm'>Unit</label>
                    <input 
                        value={newStock.unit}
                        onChange={e=>{
                            setNewStock({
                                ...newStock,
                                unit: e.target.value
                            })
                        }}
                        type="text" 
                        className='w-full ring-2 ring-blue-200 bg-white h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    />
                </div>

                <div className="flex w-full flex flex-col items-start justify-start">
                    <label className='text-sm'>Rack Position</label>
                    <input 
                        value={newStock.rackPosition}
                        onChange={e=>{
                            setNewStock({
                                ...newStock,
                                rackPosition: e.target.value
                            })
                        }}
                        type="text" 
                        className='w-full ring-2 ring-blue-200 bg-white h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    />
                </div>

                <div className="flex w-full flex flex-col items-start justify-start">
                    <label className='text-sm'>No. of Layers</label>
                    <input 
                        value={newStock.numberOfLayers}
                        onChange={e=>{
                            setNewStock({
                                ...newStock,
                                numberOfLayers: e.target.value
                            })
                        }}
                        type="text" 
                        className='w-full ring-2 ring-blue-200 bg-white h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    />
                </div>

                <div className="flex w-full flex flex-col items-start justify-start">
                    <label className='text-sm'>Rate</label>
                    <input 
                        value={newStock.rate}
                        onChange={e=>{
                            setNewStock({
                                ...newStock,
                                rate: e.target.value
                            })
                        }}
                        type="text" 
                        className='w-full ring-2 ring-blue-200 bg-white h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    />
                </div>

                <div className='flex flex-row space-x-1  items-end'>
                    <div 
                        className='relative text-center rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                        onClick={()=>{
                            pushToDatabase()
                        }}
                    >
                        Submit
                    </div>
                </div>

                <div className='col-span-3 flex justify-start items-end'>
                    <BulkExcelUploadComponent 
                        headings={["materialGroup","materialNumber","materialDesc","unit"]} 
                        templateName={"stock-template"}
                        pushFunction={pushStockToDatabaseBulk}
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="pb-2 bg-blue-50 h-full px-3 pt-4">

            <div className='w-full bg-white rounded p-3 my-2'>
                {/* <RenderInputRow/> */}
                {RenderInputRow()}
            </div>
            
            
            <div className={expand==true
                ?"flex flex-col absolute z-20 inset-0 margin-2 space-y-2 items-center justify center items-center bg-white rounded p-4"
                :"flex flex-col bottom-2 space-y-2 items-center justify center items-center bg-white rounded p-4"}>
                <div className='flex flex-row justify-between w-full items-center'>
                    <div className='font-semibold text-lg'>Stock Entry</div>

                    <div className='flex flex-row space-x-4 items-center justify-center'>
                        {expand==false && (<div className='h-6 w-6 font-bold' onClick={()=>{setExpand(true)}}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                            </svg>
                        </div>)}
                        {expand==true &&(<div className='h-6 w-6 font-bold' onClick={()=>{setExpand(false)}}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
                            </svg>
                        </div>)}
                        <button
                            className="text-sm font-medium text-blue-500 py-2 px-5 rounded ring-2 ring-blue-500 hover:bg-blue-500 hover:text-white"
                            onClick={()=>{DownloadExcel(spareData)}}
                        >
                                Export Excel
                        </button>
                    </div>
                </div>
                <div className="w-full sticky top-0 p-3 grid grid-cols-9 gap-1 bg-gray-200">
                    <div className="text-sm py-2 text-left">MATERIAL GROUP</div>
                    <div className="text-sm py-2 text-left">MATERIAL NUMBER</div>
                    <div className="text-sm py-2 text-left">MATERIAL DESCRIPTION</div>
                    <div className="text-sm py-2 text-left">QUANTITY</div>
                    <div className="text-sm py-2 text-left">UNIT</div>
                    <div className="text-sm py-2 text-left">RACK POSITION</div>
                    <div className="text-sm py-2 text-left">NO. OF LAYERS</div>
                    <div className="text-sm py-2 text-left">RATE</div>
                </div>
                {renderItems}
            </div>
        </div>

    )
}

export default StockEntry