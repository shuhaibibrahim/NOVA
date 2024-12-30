import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { db} from "../firebase_config";
import { ref, set, push, onValue, remove, update } from "firebase/database";
import * as XLSX from 'xlsx';
import {fieldHeadings, fieldKeys} from "../Requirements"
import BulkExcelUploadComponent from '../BulkExcelUploadComponent';
import { isArray } from '@craco/craco/lib/utils';

function MaterialIssueEntry() {
    // const location = useLocation()
    // const {spareData}=location.state
    let navigate = useNavigate();

    const [setSelectedLink, setOpenedTab] = useOutletContext();
    useEffect(() => {
        setSelectedLink("mmdept/material-outward")
        setOpenedTab("mmDept")
    }, [])

    const materialIssueStruct={
        materialNumber:"",
        materialDesc:"",
        qty:"",
        unit:""
    } 

    const stockStruct={
        materialGroup:"",
        materialNumber:"",
        materialDesc:"",
        qty:"",
        unit:""
    }  

    const [materialIssueData, setMaterialIssueData] = useState([])
    const [stockData, setStockData] = useState([])

    const [requirementsData, setRequirementsData] = useState([])
    const [editData, setEditData] = useState({...materialIssueStruct})
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

    const [newMaterialIssue, setNewMaterialIssue] = useState({...materialIssueStruct})

    const [packageInput, setPackageInput] = useState([])

    const [validateMessage, setValidateMessage] = useState(null)

    const [expand, setExpand] = useState(false)

    const [tabSelected, setTabSelected] = useState("materialIssue")

    useEffect(() => {
        const materialIssueRef = ref(db, 'materialIssueData/');

        onValue(materialIssueRef, (snapshot) => {
            const data = snapshot.val();
            // ;

            var MaterialIssueArray=[];
            for(var key in data)
            {
                var item=data[key]
                console.log(item)
                MaterialIssueArray.push(item)
                // spareArray.push(item)
            }
            
            setMaterialIssueData([...MaterialIssueArray])
        });

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

    const displayValidateMessage=(validate)=>{
        setValidateMessage(
            <div className="flex flex-col bg-white h-auto w-5/12 rounded overflow-hidden p-2">
                <div className="flex flex-row justify-end">
                    {/* <svg  xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black hover:text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg> */}

                    <svg onClick={()=>{setValidateMessage(null)}} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                <div className='flex flex-col m-4 bg-red-400 rounded p-4 text-left'>
                    <div className='font-bold my-1 text-lg'>The following materials cant be issued</div>
                    <div className='font-bold my-1 text-lg'>{validate}</div>
                </div>
            </div>
        )
    }

    const validateMaterialIssue=(materialNumber, qty, unit)=>{
        var stock=stockData.filter(item=>(item.materialNumber==materialNumber))[0]
        var errorMessage="\n"+materialNumber
        var mssgCount=0
        if(stock==undefined){
            errorMessage=errorMessage+"stock is not avaiable"
        }
        if(stock!=undefined && stock.qty<qty){
            errorMessage=errorMessage+" : stock is deficient"
        }

        console.log(unit,Array.isArray(unit))
        if(stock!=undefined && Array.isArray(unit) && unit.length>1){
            var misMatchUnits=unit.filter(u=>u!=stock.unit)
            errorMessage=errorMessage+" : "+misMatchUnits.join(',')+" mistaches with stock unit "+stock.unit
        }
        else if(stock!=undefined && Array.isArray(unit) && stock.unit!=unit[0]){
            errorMessage=errorMessage+" : unit "+unit+" mismatches with stock unit "+stock.unit
        }
        else if(stock!=undefined && stock.unit!=unit){
            errorMessage=errorMessage+" : unit "+unit+" mismatches with stock unit "+stock.unit
        }
        
        if(errorMessage!="\n"+materialNumber)
            return errorMessage
        else
            return ""
    }

    const reduceStockQty=(materialNumber,qty)=>{

        var stock=stockData.filter(item=>(item.materialNumber==materialNumber))[0]
        var item={...stock, qty:Number(stock.qty)-Number(qty)}

        const stockRef = ref(db, `stockData/${stock.id}`);

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

    const pushToDatabase = () => {
            // setUpdateLoad(true)
            var validate=validateMaterialIssue(newMaterialIssue.materialNumber, newMaterialIssue.qty, newMaterialIssue.unit)
            if(validate!=""){
                displayValidateMessage(validate)
                return
            }

            const materialIssueRef = ref(db, `materialIssueData/`);
            const newMaterialIssueRef = push(materialIssueRef);

            set(newMaterialIssueRef, {
                ...newMaterialIssue,
                issueType:"materialIssue",
                id:newMaterialIssueRef.key
            })
            .then(()=>{
                // setUpdateLoad(false)
                console.log("Successfully updated")
                reduceStockQty(newMaterialIssue.materialNumber, newMaterialIssue.qty)
            })
            .catch((error)=>{
                console.log("Error while saving data : ",error)
            })            
    }

    const pushMaterialIssueToDatabaseBulk = (bulkData) => {
        // setUpdateLoad(true)
        const materialIssueRef = ref(db, `materialIssueData/`);
        var validate=""
        var consolidatedData=bulkData.reduce((accumulator, currentValue) => {
            // Check if there's already an entry with the same name in accumulator
            let existingItem = accumulator.find(item => item.materialNumber === currentValue.materialNumber);
          
            if (existingItem) {
              // If name already exists, update qty and add new unit if not already present
              existingItem.qty += currentValue.qty;
              if (!existingItem.units.includes(currentValue.unit)) {
                existingItem.units.push(currentValue.unit);
              }
            }else {
              // If name doesn't exist, add new entry
              accumulator.push({
                materialNumber: currentValue.materialNumber,
                qty: currentValue.qty,
                units: [currentValue.unit]
              });
            }
          
            return accumulator;
        }, []);

        var inValidMaterials=[]
        console.log(consolidatedData)
        consolidatedData.forEach(material=>{
            console.log(material)
            var mssg=validateMaterialIssue(material.materialNumber,material.qty,material.units)
            console.log(material)
            if(mssg!=""){
                validate=validate+mssg+"\n"
                inValidMaterials.push(material.materialNumber)
            }
        })

        if(validate!=""){
            displayValidateMessage(validate)
        }

        bulkData.forEach(item=>{
            if(!inValidMaterials.includes(item.materialNumber)){
                const newMaterialIssueRef = push(materialIssueRef);
                set(newMaterialIssueRef, {
                    ...item,
                    id:newMaterialIssueRef.key
                })
                .then(()=>{
                    // setUpdateLoad(false)
                    // console.log("Successfully updated")
                    // reduceStockQty(item.materialNumber,item.qty)
                })
                .catch((error)=>{
                    console.log("Error while saving data : ",error)
                })            
            }
        })

        var stockUpdates={}
        stockData.forEach(s=>{
            if(!inValidMaterials.includes(s.materialNumber)){
                console.log("s : ",s)
                var consoldatedMaterial=consolidatedData.find(m=>m.materialNumber==s.materialNumber)
                if(consoldatedMaterial!=undefined){
                    stockUpdates[`stockData/${s.id}`]={...s, 
                        qty:parseFloat(Number(s.qty)-Number(consoldatedMaterial.qty)).toFixed(2)
                    }
                }
            }
        })

        update(ref(db), stockUpdates).then(()=>{
            console.log("stock updated")
        }).catch((e)=>{
            console.log("stock update error : ",e)
        })

        // var stockItemsToUpdateList=stockData.filter(
        //     s=>!inValidMaterials.includes(s.materialNumber)
        // ).map(s=>({[`stockData/${s.id}`]:{...s, qty:Number(s.qty)-Number(consolidatedData.find(m=>m.materialNumber==s.materialNumber).qty)}}))

        // let stockItemsToUpdateObject = stockItemsToUpdateList.reduce((acc, obj) => {
        //     // Extract the key and value from each object and add it to the accumulator object
        //     let path = Object.keys(obj)[0]; // Assuming each object has only one key
        //     acc[path] = obj[path];
        //     return acc;
        // }, {});
    }

    const editItem = (item) => {
        var validate=validateMaterialIssue(item.materialNumber, item.qty, item.unit)

        if(validate!=""){
            displayValidateMessage(validate)
            return
        }

        item={
            ...item, 
            qtyAllotted:true,
            id:item.id
        }

        const materialIssueRef = ref(db, `materialIssueData/${item.id}`);

        set(materialIssueRef, {
            ...item
        })
        .then(()=>{
            // setUpdateLoad(false)
            // alert("Successfully updated")
            var stock=stockData.filter(s=>(s.materialNumber==item.materialNumber))[0]
            stock["prodQty"]=stock["prodQty"]!=undefined?stock["prodQty"]:0

            if(item.qty>=item.requestedQty){
                stock.lockedQty=Number(stock.lockedQty)-Number(item.qty)
                stock.qty=Number(stock.qty)-Number(item.qty)
                stock.prodQty=Number(stock.prodQty)+(Number(item.qty)-Number(item.requestedQty))
            }
            else{
                stock.lockedQty=Number(stock.lockedQty)-Number(item.qty)
                stock.qty=Number(stock.qty)-Number(item.qty)
            }

            const stockRef = ref(db, `stockData/${stock.id}`);
            console.log("prd : ",stock["prodQty"])

            set(stockRef, {
                ...stock
            })
            .then((ref)=>{
                // setUpdateLoad(false)
                // alert("Successfully updated")
            })
            .catch((error)=>{
                alert("Error while saving data : ",error)
                console.log(error)
            })
        })
        .catch((error)=>{
            alert("Error while saving data : ",error)
            console.log(error)
        })            
    }

    const deleteFromDatabase=(item)=>{

        if(window.confirm("Please confirm deleting "+item.article))
        {
            const reqRef = ref(db, `materialIssueData/${item.id}`); 
        
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
            // <div key={index} className={item.qty<item.minMaterialIssue?"w-11/12 p-2 grid grid-cols-5 bg-red-400 rounded-xl bg-opacity-90 ring-2 ring-red-500":"w-11/12 p-2 grid grid-cols-5"}>
            <div key={index} className={`grid gap-x-1 border-solid border-b border-gray-400 p-3 bg-gray-200  ${tabSelected=="materialIssue"?"grid-cols-7":"grid-cols-6"}`} >
                {item.edit!=true&&(<>
                    <div className="text-stone-900/30 break-all text-left">{item.materialNumber}</div>

                    <div className="text-stone-900/30 break-all text-left">{item.materialDesc}</div>

                    <div className="text-stone-900/30 break-all text-left">{item.unit}</div>

                    <div className="text-stone-900/30 break-all text-left">{item.requestedQty}</div>

                    {tabSelected=="materialIssue"&&(<div className="text-stone-900/30 break-all text-left">{item.reason}</div>)}

                    {(tabSelected=="planIssue" || tabSelected=="materialIssue")&&
                    (<div className="flex w-full flex flex-col items-start justify-start">
                        <input 
                            value={materialIssueData.find(m => m.id === item.id)?.qty || ''}
                            disabled={item.qtyAllotted}
                            onChange={e => {
                                const updatedMaterialIssueData = materialIssueData.map(m => 
                                    m.id === item.id ? { ...m, qty: e.target.value } : m
                                );
                                setMaterialIssueData(updatedMaterialIssueData);
                            }}
                            type="text" 
                            className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div>)}

                    {(tabSelected=="planIssue" || tabSelected=="materialIssue")&&(
                    <div className='flex justify-center'>
                        <div 
                            onClick={()=>{
                                editItem(item);
                            }}
                            className='relative text-center rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>    
                    )} 
                </>)}

                {item.edit&&(<>
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

                </>)}

                {/* <div className='col-span-1'>
                    <div className='grid grid-cols-2 gap-x-2 w-full'>
                        {item.edit!=true&&(
                        <div className='flex justify-center'>
                            <div 
                                onClick={()=>{
                                    // setEditData({...item})
                                    // var tempMaterialIssueData=[...materialIssueData].reverse()
                                    // tempMaterialIssueData[index].edit=true
                                    // setMaterialIssueData([...tempMaterialIssueData].reverse())
                                }}
                                className={"relative text-center rounded py-1 px-5 text-white font-medium "+(true==false?"bg-blue-500 hover:bg-blue-800 cursor-pointer":"bg-gray-500")}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                            </div>
                        </div>
                        )}

                        {item.edit&&(
                        <div className='flex justify-center'>
                            <div 
                                onClick={()=>{
                                    var tempMaterialIssueData=[...materialIssueData].reverse()
                                    tempMaterialIssueData[index].edit=false
                                    setMaterialIssueData([...tempMaterialIssueData].reverse())
                                    editItem(item);
                                }}
                                className='relative text-center rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>    
                        )}

                        
                        <div className='flex justify-center'>
                            <div 
                                onClick={()=>{
                                    deleteFromDatabase(item);
                                }}
                                className='relative text-center rounded py-1 px-5 cursor-pointer bg-red-500 hover:bg-red-800 text-white font-medium'
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div> */}
               
            </div>
        )
    }

    useEffect(() => {
        
        if(materialIssueData.length>0)
        {
            setRenderItems(
                <div className='w-full overflow-y-auto'>
                    {[...materialIssueData].filter((m)=>m.issueType==tabSelected).reverse().map((item, index)=>{
                        if(tabSelected=="planIssue" && item.requestedQty>0)
                            return RenderItem(item,index)
                        else if(tabSelected=="planIssue")
                            return <div/>
                        return RenderItem(item,index)
                    })}
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
    }, [materialIssueData, editData, tabSelected])


    const RenderInputRow=()=>{
        return (
            <div className='w-full flex-flex-row'>
                <div  className='w-full grid grid-cols-5 gap-4'>
                    <div className="flex w-full flex flex-col items-start justify-start">
                        <label className='text-sm'>Material Number</label>
                        <input 
                            value={newMaterialIssue.materialNumber}
                            onChange={e=>{
                                setNewMaterialIssue({
                                    ...newMaterialIssue,
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
                            value={newMaterialIssue.materialDesc}
                            onChange={e=>{
                                setNewMaterialIssue({
                                    ...newMaterialIssue,
                                    materialDesc: e.target.value
                                })
                            }}
                            type="text" 
                            className='w-full ring-2 ring-blue-200 bg-white h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div> 

                    <div className="flex w-full flex flex-col items-start justify-start">
                        <label className='text-sm'>Quantity</label>
                        <input 
                            value={newMaterialIssue.qty}
                            onChange={e=>{
                                setNewMaterialIssue({
                                    ...newMaterialIssue,
                                    qty: e.target.value
                                })
                            }}
                            type="text" 
                            className='w-full ring-2 ring-blue-200 bg-white h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div>

                    <div className="flex w-full flex flex-col items-start justify-start">
                        <label className='text-sm'>Unit</label>
                        <input 
                            value={newMaterialIssue.unit}
                            onChange={e=>{
                                setNewMaterialIssue({
                                    ...newMaterialIssue,
                                    unit: e.target.value
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
                                if(window.confirm("Add new MaterialIssue?"))
                                    pushToDatabase()
                            }}
                        >
                            Submit
                        </div>
                    </div>
                </div>
                <div className='flex justify-start items-end mt-4'>
                    <BulkExcelUploadComponent 
                        headings={["materialNumber","materialDesc","qty","unit"]} 
                        templateName={"material-issue-template"}
                        pushFunction={pushMaterialIssueToDatabaseBulk}
                    />
                </div>
            </div>
            // <div key={index} className={item.qty<item.minMaterialIssue?"w-11/12 p-2 grid grid-cols-5 bg-red-400 rounded-xl bg-opacity-90 ring-2 ring-red-500":"w-11/12 p-2 grid grid-cols-5"}>
        )
    }

    const backdropClickHandler = (event) => {
        if (event.target === event.currentTarget) {
            setValidateMessage(null)
        }
    }

    return (
        <div className="pb-2 bg-blue-50 h-full px-3 pt-4">

            {validateMessage&&(
                <div onClick={backdropClickHandler} className="bg-black z-20 bg-opacity-80 fixed inset-0 flex justify-center items-center">
                    {validateMessage}
                </div>)
            }

            {/* <div className='w-full bg-white rounded p-3 my-2'>
                {RenderInputRow()}
            </div> */}
            
            
            <div className={expand==true
                ?"flex flex-col absolute z-20 inset-0 margin-2 space-y-2 items-center justify center items-center bg-white rounded p-4"
                :"flex flex-col h-4/5 space-y-2 items-center justify center items-center bg-white rounded p-4"}>
                <div className='flex flex-row justify-between w-full items-center'>
                    <div className='grid grid-cols-2 gap-x-4'>
                        <div 
                            onClick={()=>{setTabSelected("materialIssue")}}
                            className={`cursor-pointer font-semibold text-lsg p-1 px-4 border-b-4 border-gray-400 ${tabSelected=="materialIssue"?"bg-gray-200 rounded-t":""}`}
                        >
                            Material Issue
                        </div>
                        <div 
                            onClick={()=>{setTabSelected("planIssue")}}
                            className={`cursor-pointer font-semibold text-lsg p-1 px-4 border-b-4 border-gray-400 ${tabSelected=="planIssue"?"bg-gray-200 rounded-t":""}`}
                        >
                            Plan Issue
                        </div>
                    </div>

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
                <div className={`w-full sticky top-0 p-3 grid gap-1 bg-gray-200 ${tabSelected=="materialIssue"?"grid-cols-7":"grid-cols-6"}`}>
                    <div className="text-sm py-2 text-left">MATERIAL NUMBER</div>
                    <div className="text-sm py-2 text-left">MATERIAL DESCRIPTION</div>
                    {/* {tabSelected!="planIssue"&&(<div className="text-sm py-2 text-left">QUANTITY</div>)} */}
                    <div className="text-sm py-2 text-left">UNIT</div>
                    <div className="text-sm py-2 text-left">REQUESTED QUANTITY</div>
                    {tabSelected=="materialIssue"&&(<div className="text-sm py-2 text-left">REASON FOR REQUEST</div>)}
                    <div className="text-sm py-2 text-left">QUANTITY ALLOTED</div>
                </div>
                {renderItems}
            </div>
        </div>

    )
}

export default MaterialIssueEntry
