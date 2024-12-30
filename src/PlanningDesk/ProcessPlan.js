import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { db} from "../firebase_config";
import { ref, set, push, onValue, remove, update, query, orderByChild, equalTo, orderByKey, get } from "firebase/database";
import * as XLSX from 'xlsx';
import {fieldHeadings, fieldKeys} from "../Requirements"
import BulkExcelUploadComponent from '../BulkExcelUploadComponent';
import Checkbox from '@mui/material/Checkbox';
import AutocompleteDropdown from '../components/AutoComplete';


function ProcessPlan() {
    // const location = useLocation()
    // const {spareData}=location.state
    let navigate = useNavigate();

    const location=useLocation()

    const {planItem}=location.state

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
        materialNumber:"",
        materialDesc:"",
        unit:"",
        process:""
    }

    var rawMaterialStruct={
        rawMaterialName:"",
        unit:"",
        leftSizes:"", // "5:3,6:5,7:4,8:1,9:4,10:8,11:7" comma separated string of size and quantity separated by :
        rightSizes:"" // similar to leftSizes
    }

    const materialIssueStruct={
        materialNumber:"",
        materialDesc:"",
        qty:"",
        unit:""
    } 

    const [newMaterialIssue, setNewMaterialIssue] = useState({...materialIssueStruct})

    const [newbomData, setNewbomData] = useState({...bomStruct})
    
    const [editData, setEditData] = useState({...bomStruct})

    const [stockDetails, setStockDetails] = useState([])
    //UseEffects
    useEffect(async () => {
        var materials=planItem["KNITTING::stockReq"].split(',').map(kv=>{
            return {
                material:kv.split("::")[0],
                reqQty:kv.split("::")[1]
            }
        })

        const materialIssueRef = ref(db, 'materialIssueData/');

        const materialQuery=query(materialIssueRef, orderByChild("planId"), equalTo(planItem.id))
        const materialsSnapshot = await get(materialQuery);
        console.log('materails Snapshot : ',materialsSnapshot)

        var materialsArray = [];
        materialsSnapshot.forEach((childSnapshot) => {
            materialsArray.push({
                id: childSnapshot.key, // The unique key for the material
                ...childSnapshot.val(), // The rest of the data
            });
        });

        console.log("Retrieved materials:", materialsArray);
        materialsArray=[...materialsArray.filter(m=>m.process=="Knitting")]

        const materialsReduced = Object.values(
            materialsArray.reduce((acc, obj) => {
              if (acc[obj.materialNumber]) {
                // If the name already exists, add the qty
                acc[obj.materialNumber].qty += obj.qty;
              } else {
                // Otherwise, create a new entry in the accumulator
                acc[obj.materialNumber] = {...obj};
              }
              return acc;
            }, {})
        );
        
        console.log("materials reduced : ",materialsReduced)

        setStockDetails([...materialsArray])
        // materials.forEach(m => {
            
        // });
    }, [])
    
    const pushToDatabase=()=>{
        const materialIssueRef = ref(db, `materialIssueData/`);

        const newMaterialIssueRef = push(materialIssueRef);

        set(newMaterialIssueRef, {
            materialNumber:newMaterialIssue.materialNumber,
            materialDesc:newMaterialIssue.materialDesc,
            requiredQty:newMaterialIssue.requiredQty,
            requestedQty:newMaterialIssue.qty,
            prodConsumption:newMaterialIssue.prodConsumption,
            qty:0,
            unit:newMaterialIssue.unit,
            reason:newMaterialIssue.reason,
            issueType:"materialIssue",
            process:'Knitting',
            qtyAllotted:false,
            id:newMaterialIssueRef.key,
            planId:planItem.id
        }).then(()=>{
            console.log("materialIssue update - plan issue")
        }).catch((e)=>{
            console.log("error : ",e)
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

    const RenderItem=(item, index)=>{

        return (
            // <div key={index} className={item.qty<item.minMaterialIssue?"w-11/12 p-2 grid grid-cols-5 bg-red-400 rounded-xl bg-opacity-90 ring-2 ring-red-500":"w-11/12 p-2 grid grid-cols-5"}>
            <div key={index} className={`grid gap-x-1 border-solid border-b border-gray-400 p-3 bg-gray-200 grid-cols-7`} >

                    <div className="text-stone-900/30 break-all text-left">{item.materialNumber}</div>

                    <div className="text-stone-900/30 break-all text-left">{item.materialDesc}</div>

                    <div className="text-stone-900/30 break-all text-left">{item.unit}</div>

                    <div className="text-stone-900/30 break-all text-left">{item.requiredQty}</div>
                    
                    <div className="text-stone-900/30 break-all text-left">{item.requestedQty}</div>
                    
                    <div className="text-stone-900/30 break-all text-left">{item.prodConsumption}</div>

                    <div className="text-stone-900/30 break-all text-left">{item.qty}</div>
               
            </div>
        )
    }

    useEffect(() => {
        
        if(stockDetails.length>0)
        {
            setRenderItems(
                <div className='w-full overflow-y-auto'>
                    {[...stockDetails].reverse().map((item, index)=>RenderItem(item,index))}
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
    }, [stockDetails, editData])

    const backdropClickHandler = (event) => {
        if (event.target === event.currentTarget) {
            setModal(null)
        }
    }

    const RenderInputRow=()=>{
        return (
            <div className='w-full flex-flex-row'>
                <div  className='w-full grid grid-cols-5 gap-4'>
                    <div className="flex w-full flex flex-col items-start justify-start">
                        <label className='text-sm'>Material Number</label>
                        <AutocompleteDropdown 
                            setValueOnSelect={(value)=>{
                                setNewMaterialIssue({
                                    ...newMaterialIssue,
                                    materialNumber: value,
                                    materialDesc:stockDetails.filter((s)=>s.materialNumber==value)[0].materialDesc,
                                    unit:stockDetails.filter((s)=>s.materialNumber==value)[0].unit,
                                    requiredQty:stockDetails.filter((s)=>s.materialNumber==value)[0].requiredQty,
                                    prodConsumption:stockDetails.filter((s)=>s.materialNumber==value)[0].prodConsumption
                                })
                            }}
                            options={stockDetails.map(s=>s.materialNumber)}
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

                    <div className="flex w-full flex flex-col items-start justify-start">
                        <label className='text-sm'>Reason for Request</label>
                        <input 
                            value={newMaterialIssue.reason}
                            onChange={e=>{
                                setNewMaterialIssue({
                                    ...newMaterialIssue,
                                    reason: e.target.value
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
            </div>
            // <div key={index} className={item.qty<item.minMaterialIssue?"w-11/12 p-2 grid grid-cols-5 bg-red-400 rounded-xl bg-opacity-90 ring-2 ring-red-500":"w-11/12 p-2 grid grid-cols-5"}>
        )
    }

    return (
        <div className="pb-2 pt-4 bg-blue-50 h-full px-3">

            {Modal&&(
                <div onClick={backdropClickHandler} className="bg-black z-20 bg-opacity-80 fixed inset-0 flex justify-center py-10">
                    {Modal}
                </div>)
            }

            <div className='w-full bg-white rounded p-3 my-2'>
                <div className='font-bold text-lg text-left mb-2'>Material Request</div>
                {/* <RenderInputRow/> */}
                {RenderInputRow()}
            </div>
            
            <div className="flex flex-col h-3xl space-y-2 items-center justify center items-center bg-white rounded p-4">
                <div className='flex flex-row justify-between w-full align-center'>
                    <div className='flex flex-row space-x-2 hover:cursor'>
                        <Link to="../knitting-plan">
                            <div className="text-md text-gray-700">
                                Knitting Plan
                            </div>
                        </Link>
                        <div className="text-md text-gray-700"> {">"} </div>
                        <div className='font-semibold text-lg'>Plan for {planItem.article}</div>
                    </div>
                </div>

                <div className="w-full sticky top-0 py-6 p-3 grid grid-cols-5 gap-4 bg-blue-100 rounded">
                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">Plan Date : {planItem.planDate}</div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">Article : {planItem.article}</div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">Colour : {planItem.colour}</div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">Model : {planItem.model}</div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">Category : {planItem.category}</div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">Region : {planItem.region}</div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">Sie Grid : {planItem.sizeGrid}</div>
                    </div>

                    <div className="flex items-center justify-center col-span-1">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">Packing Combination : {planItem.packingComb}</div>
                    </div>
                    
                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">Case Quantity : {planItem.caseQty}</div>
                    </div>
                </div>

                <div className='w-full'>
                    <div className='font-bold text-lg text-left'>Stock Requirements</div>
                </div>
                <div className={`w-full sticky top-0 p-3 grid gap-1 bg-gray-200 grid-cols-7`}>
                    <div className="text-sm py-2 text-left">MATERIAL NUMBER</div>
                    <div className="text-sm py-2 text-left">MATERIAL DESCRIPTION</div>
                    <div className="text-sm py-2 text-left">UNIT</div>
                    <div className="text-sm py-2 text-left">REQUIRED QUANTITY</div>
                    <div className="text-sm py-2 text-left">REQUESTED QUANTITY</div>
                    <div className="text-sm py-2 text-left">PRODUCTION USAGE</div>
                    <div className="text-sm py-2 text-left">STOCKS MOVED TO PRODUCTION</div>
                </div>
                {renderItems}
            </div>
        </div>

    )
}

export default ProcessPlan
