import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { db} from "../firebase_config";
import { ref, set, push, onValue, remove, increment, update, query, orderByChild, equalTo, get } from "firebase/database";
import * as XLSX from 'xlsx';
import {fieldHeadings, fieldKeys} from "../Requirements"
import { Checkbox } from '@mui/material';
import ExportExcel from '../ExportExcel';


function KnittingPlan() {
    // const location = useLocation()
    // const {spareData}=location.state
    let navigate = useNavigate();

    const [setSelectedLink, setOpenedTab] = useOutletContext();
    useEffect(() => {
      setSelectedLink("planning-desk/knitting-plan")
      setOpenedTab("planningDesk")
    }, [])
    

    const [articleData, setArticleData] = useState([])
    const [articleSelectList, setArticleSelectList] = useState([])
    const [colourSelectList, setColourSelectList] = useState([])
    const [modelSelectList, setModelSelectList] = useState([])
    const [categorySelectList, setCategorySelectList] = useState([])

    const [requirementsData, setRequirementsData] = useState([])
    const [bomData, setBomData] = useState([])

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
    const [tempSizeAndQty, setTempSizeAndQty] = useState([])
    const [enableCaseQtyInput, setEnableCaseQtyInput] = useState(-1)
    const [stockData, setStockData] = useState({})

    const [newKnittingPlan, setNewKnittingPlan] = useState({
        planCode:"",
        planType:"",
        // remarks:""
        date:"",
        article:"",
        colour:"",
        model:"",
        category:"",
        region:"",
        sizeGrid:"",
        caseQty:"",
        packingComb:"",
        date:"",
        planDate:"",
        status:"",
        planUniqueKey:""
    })

    const [planData, setPlanData] = useState([])
    const [masterDetailIndex, setMasterDetailIndex] = useState(-1)

    useEffect(() => {
        const reqRef = ref(db, 'requirementsData/');
        const stockRef = ref(db, 'stockData/');

        onValue(stockRef, (snapshot) => {
            const data = snapshot.val();

            var stockArray=[];
            for(var key in data)
            {
                var item=data[key]
                console.log(item)
                stockArray.push(item)
            }
            
            setStockData([...stockArray])
        });

        onValue(reqRef, (snapshot) => {
            const data = snapshot.val();

            var reqArray=[];
            for(var key in data)
            {
                var item=data[key]
                reqArray.push(item)
            }
            
            console.log("re triggerred")
            setRequirementsData([...reqArray])
        });
    }, [])

    useEffect(() => {
        const articleRef = ref(db, 'articleData/');

        onValue(articleRef, (snapshot) => {
            const data = snapshot.val();
            // ;

            var articleArray=[];
            for(var key in data)
            {
                var item=data[key]
                console.log(item)
                articleArray.push(item)
            }

            console.log(articleArray)
            
            setArticleData([...articleArray])

            var tempArticleList=[]
            articleArray.forEach(item=>{
                if(!tempArticleList.includes(item.article))
                    tempArticleList.push(item.article)
            })

            console.log("article select list : ",tempArticleList)

            setArticleSelectList([...tempArticleList])
        });
    }, [])

    useEffect(() => {
        const bomRef = ref(db, `bomData/`);

        onValue(bomRef, (snapshot) => {
            const myBomData=snapshot.val()

            // console.log()
            if(myBomData!=null)
            {
                var bomArray=[];
                for(var key in myBomData)
                {
                    var item=myBomData[key]
                    bomArray.push(item)
                }
                
                setBomData([...bomArray])
            }
            else
                setBomData([])
        });
    }, [])

    useEffect(() => {
        const planRef = ref(db, 'knittingPlan/');

        onValue(planRef, (snapshot) => {
            const data = snapshot.val();
            console.log("triggered")
            
            var planArray=[];
            for(var key in data)
            {
                var item=data[key]
                planArray.push(item)
            }
            
            setPlanData([...planArray])
        });
    }, [])

    useEffect(() => {
        var tempColourList=[]
        var tempModelList=[]
        var tempCatList=[]
        
        articleData.forEach(item=>{
            if(item.article==newKnittingPlan.article)
            {
                if(!tempColourList.includes(item.colour))
                    tempColourList.push(item.colour)
            }
            if(item.article==newKnittingPlan.article && item.colour==newKnittingPlan.colour)
            {
                if(!tempModelList.includes(item.model))
                    tempModelList.push(item.model)
            }
            if(item.article==newKnittingPlan.article && item.colour==newKnittingPlan.colour && item.model==newKnittingPlan.model)
            {
                if(!tempCatList.includes(item.category))
                    tempCatList.push(item.category)
            }
        })

        console.log("colourlist : ",tempColourList)

        setColourSelectList([...tempColourList])
        setModelSelectList([...tempModelList])
        setCategorySelectList([...tempCatList])

    }, [newKnittingPlan.article, newKnittingPlan.colour, newKnittingPlan.model, newKnittingPlan])

    // Beginning of read write 
    const deleteFromDatabase= async (item)=>{

        if(window.confirm("Please confirm deleting "+item.article))
        {
            const articleRef = ref(db, `knittingPlan/${item.id}`); 
            const reqRef = ref(db, `requirementsData/${item.reqId}`);
             
            const materialIssueRef = ref(db, `materialIssueData/`); 
        
            //delete article and update requirements table
            remove(articleRef).then(()=>{
                const updates={}
                updates[`requirementsData/${item.reqId}/caseQty`]=increment(parseInt(item.caseQty))
                update(ref(db),updates).then(()=>{
                    console.log("case qty incremented")
                }).catch((e)=>{
                    console.log("error : ",e)
                })
            })

            const updates={}
            const stocks=[]

            console.log("plan id : ",item.id)
            
            const materialQuery=query(materialIssueRef, orderByChild("planId"), equalTo(item.id))
            const materialsSnapshot = await get(materialQuery);
            console.log('materails Snapshot : ',materialsSnapshot)

            // Delete all material issues with the matching planId
            const deletePromises = [];
            materialsSnapshot.forEach((material) => {
                deletePromises.push(remove(ref(db, `/materialIssueData/${material.key}`)));
            });

            // Wait for all material deletions to complete
            await Promise.all(deletePromises);
            
            //update stocks
            item["KNITTING::stockReq"].split(',').map(kv=>{
                var stock=stockData.find(s=>s.materialNumber==kv.split("::")[0])

                updates[`/stockData/${kv.split("::")[0]}`]={
                    ...stock,
                    // qty:stock.qty+Number(kv.split("::")[1])*item.caseQty
                    lockedQty:stock.lockedQty-Number(kv.split("::")[1])*item.caseQty
                }
            })

            update(ref(db),updates).then(()=>{
                console.log("stock incremented")

            }).catch((e)=>{
                console.log("error : ",e)
            })
        }
    }
    

    const pushToDatabase = (reqItem) => {
            // setUpdateLoad(true)

            const planRef = ref(db, `knittingPlan/`);
            const reqRef = ref(db, `requirementsData/${reqItem.id}`); 
            const materialIssueRef = ref(db, `materialIssueData/`);
            
            const newPlanRef = push(planRef);

            const today=new Date()
            var planUKey=today.toISOString().split('T')[0].split("-").join("")+"-"+(planData.filter(p=>p.planDate==today.toISOString().split('T')[0]).length+1)
            console.log("today : ",today)

            set(newPlanRef, {
                ...newKnittingPlan,
                status:"in-progress",
                planDate:today.toISOString().split('T')[0],
                reqId:reqItem.id,
                markedAsComplete:false,
                id:newPlanRef.key,
                planUniqueKey:planUKey
            })
            .then((ref)=>{
                // setUpdateLoad(false)
                alert("Successfully updated")

                setNewKnittingPlan({
                    ...newKnittingPlan,
                    planCode:"",
                    planType:"",
                    article:"",
                    colour:"",
                    model:"",
                    category:"",
                    region:"",
                    sizeGrid:"",
                    caseQty:"",
                    packingComb:"",
                    status:"",
                    planUniqueKey:""
                })

                setEnableCaseQtyInput(-1)
            })
            .catch((error)=>{
                alert("Error while saving data : ",error)
                return
            })

            const updates={}
            const stocks=[]

            reqItem["KNITTING::stockReq"].split(',').map(kv=>{
                var stock=stockData.find(s=>s.materialNumber==kv.split("::")[0])
                var prodQty=stock.prodQty!=undefined?stock.prodQty:0

                if(Number(kv.split("::")[1])*newKnittingPlan.caseQty<=prodQty){
                    stock={
                        ...stock,
                        prodQty:(prodQty-Number(kv.split("::")[1])*newKnittingPlan.caseQty) //using up production stock
                    }

                    stocks.push({
                        ...stock,
                        requiredQty: Number(kv.split("::")[1])*newKnittingPlan.caseQty,
                        requestedQty:0,
                        prodConsumption:Number(kv.split("::")[1])*newKnittingPlan.caseQty
                    })
                }
                else{
                    stock={
                        ...stock,
                        prodQty:0,//using up production stock
                        lockedQty:(stock.lockedQty!=undefined?stock.lockedQty:0)+(Number(kv.split("::")[1])*newKnittingPlan.caseQty-prodQty) //locking the actual stock
                    }

                    stocks.push({
                        ...stock,
                        requiredQty: Number(kv.split("::")[1])*newKnittingPlan.caseQty,
                        requestedQty:(Number(kv.split("::")[1])*newKnittingPlan.caseQty-prodQty),
                        prodConsumption:prodQty
                    })
                }
                
                updates[`/stockData/${kv.split("::")[0]}`]={
                    ...stock,
                }
                
            })

            update(ref(db),updates).then(()=>{
                console.log("stock decremented")

                stocks.forEach((s)=>{
                    const newMaterialIssueRef = push(materialIssueRef);

                    set(newMaterialIssueRef, {
                        materialNumber:s.materialNumber,
                        materialDesc:s.materialDesc,
                        requiredQty:s.requiredQty,
                        requestedQty:s.requestedQty,
                        prodConsumption:s.prodConsumption,
                        qty:0,
                        unit:s.unit,
                        issueType:"planIssue",
                        process:'Knitting',
                        qtyAllotted:false,
                        id:newMaterialIssueRef.key,
                        planId:newPlanRef.key,
                        planUniqueKey:planUKey
                    }).then(()=>{
                        console.log("materialIssue update - plan issue")
                    }).catch((e)=>{
                        console.log("error : ",e)
                    })

                })

                set(reqRef, {
                    ...reqItem,
                    caseQty:reqItem.caseQty-newKnittingPlan.caseQty
                }).then(()=>{
                    console.log("case qty decremented")
                }).catch((e)=>{
                    console.log("error : ",e)
                })

            }).catch((e)=>{
                console.log("error : ",e)
            })
    }
    // End of read write

    
    const checkStockAvailability=(item)=>{
        var article=articleData.filter(a=>a.id==item.articleDataId)[0]
        if(article==undefined)
            return 0

        var bomIds=article.bomIds.split(',')

        const [start, end] = item.sizeGrid.split('X').map(Number);
        
        var processes=["KNITTING","CLICKING","PRINTING","STITCHING","STUCKONG"]

        var availability={}

        processes.forEach(p=>{
            console.log(p)
            var bomReq=bomData.filter(bom=>(
                bomIds.includes(bom.id)&&bom.process==p)
            ).map(bom=>{
                var stock=stockData.filter(s=>
                    s.materialNumber==bom.materialNumber)[0]
                
                var stockQty=stock!=undefined?stock.qty-(stock.lockedQty!=undefined?stock.lockedQty:0):0
                var reqSum=0
                
                if(bom.dependantOn=="PR"){
                    reqSum=Object.keys(bom)
                        .filter(key => key >= start && key <= end)
                        .reduce((acc, key) => acc + Number(bom[key])*item.packingComb.split(',')[parseInt(key)-start], 0)
                }
                else{
                    reqSum=bom.qty
                }    
                return {
                    materialNumber:bom.materialNumber,
                    reqSum:reqSum,
                    stockQty:stockQty
                }
            })

            console.log("bomreq :: ",bomReq)
            
            if(bomReq.length==0)
            {
                return
            }

            bomReq=bomReq.map(bom=>({
                ...bom,
                possibleStockQty:Math.floor(bom.stockQty/bom.reqSum)
            }))
    
            item[p+"::stockReq"]=bomReq.map(bom=>(bom.materialNumber+"::"+bom.reqSum)).join(',')
    
            var available=bomReq.reduce((min, obj) => obj.possibleStockQty < min.possibleStockQty ? obj : min).possibleStockQty
            availability[p]=available
        })

        return availability
    }

    const RenderRequirementItem=(item, index)=>{

        var availability=checkStockAvailability(item)
        console.log(availability, item.caseQty, availability["KNITTING"]>0)
        console.log("re rendered")

        return (
            // <div key={index} className={item.qty<item.minStock?"w-11/12 p-2 grid grid-cols-8 bg-red-400 rounded-xl bg-opacity-90 ring-2 ring-red-500":"w-11/12 p-2 grid grid-cols-8"}>
            <div className='flex flex-col w-full border-solid border-b border-gray-400 p-3 bg-gray-200'>
                {enableCaseQtyInput==index&&(<div className='grid grid-flow-col auto-cols-fr gap-1'>
                    <div/><div/><div/><div/><div/><div/><div/><div/><div/><div/><div/>
                    <div className="text-sm py-2 col-span-2 text-left font-bold">ENTER REQUIRED CASE QTY</div>
                </div>)}
                <div key={index} className="grid grid-flow-col auto-cols-fr gap-1" >
                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-none text-left flex flex-row space-x-1">
                            <div className={(Number(availability["KNITTING"])>=Number(item.caseQty)?"text-green-500":
                            (Number(availability["KNITTING"])>0?"text-yellow-500":
                            "text-red-500"
                            ))+" font-bold text-md "}>K</div>

                            <div className={(Number(availability["CLICKING"])>=Number(item.caseQty)?"text-green-500":
                            (Number(availability["CLICKING"])>0?"text-yellow-500":
                            "text-red-500"
                            ))+" font-bold text-md "}>C</div>
                            <div className={(Number(availability["PRINTING"])>=Number(item.caseQty)?"text-green-500":
                            (Number(availability["PRINTING"])>0?"text-yellow-500":
                            "text-red-500"
                            ))+" font-bold text-md "}>P</div>
                            <div className={(Number(availability["STITCHING"])>=Number(item.caseQty)?"text-green-500":
                            (Number(availability["STITCHING"])>0?"text-yellow-500":
                            "text-red-500"
                            ))+" font-bold text-md "}>ST</div>
                            <div className={(Number(availability["STUCKON"])>=Number(item.caseQty)?"text-green-500":
                            (Number(availability["STUCKON"])>0?"text-yellow-500":
                            "text-red-500"
                            ))+" font-bold text-md "}>SC</div>
                        </div>
                    </div>
                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">{item.date}</div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">{item.article}</div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">{item.colour}</div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">{item.model}</div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">{item.category}</div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">{item.region}</div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">{item.sizeGrid}</div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">{item.caseQty}</div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">{availability["KNITTING"]}</div>
                    </div>

                    <div className="flex items-center justify-center col-span-1">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">{item.packingComb}</div>
                    </div>

                    {enableCaseQtyInput==index?(
                        <div className='flex col-span-2 space-x-2'>
                            <input 
                                value={newKnittingPlan.caseQty}
                                onChange={e=>{
                                    setNewKnittingPlan({
                                        ...item,
                                        date:newKnittingPlan.date,
                                        caseQty:e.target.value
                                    })
                                }}
                                type="number" 
                                className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                            />
                            
                            <div className='flex flex-row space-x-2 w-full'>
                                <div 
                                    onClick={()=>{
                                        pushToDatabase(item)
                                    }}
                                    className='relative text-center rounded p-2 cursor-pointer bg-green-500 hover:bg-green-800 text-white font-medium'
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className='bg-green-400 w-2' fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>

                                <button 
                                    className='text-center rounded p-2 cursor-pointer bg-red-500 hover:bg-red-800 text-white font-medium'
                                    onClick={()=>{setEnableCaseQtyInput(-1)}}
                                >
                                        Cancel
                                </button>

                            </div>
                        </div>
                        )
                        :(
                        
                        <>
                            <div>
                                
                            </div>
                            <button 
                                className='text-center rounded py-2 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                                onClick={()=>{setEnableCaseQtyInput(index)}}
                            >
                                Plan
                            </button>
                        </>
                        )
                    }   
                </div>
            </div>
        )
    }

    const backdropClickHandler = (event) => {
        if (event.target === event.currentTarget) {
            setModal(null)
        }
    }

    const RenderModal=(modalType)=>{
        var rowIndex=-1;
        
        if(modalType=='sizeAndQty')
        {

            setModal(
                <div className="flex flex-col bg-white h-auto w-5/12 rounded overflow-hidden p-2">
                    <div className="flex flex-row justify-end">
                        {/* <svg  xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black hover:text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg> */}
    
                        <svg onClick={()=>{setModal(null)}} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
    
                    <table className='table-auto border-collapse border border-black p-1'>
                        <tr className=''>
                            <th className='font-medium text-left border-collapse border border-black p-1'>Size</th>
                            <th className='font-medium text-left border-collapse border border-black p-1'>Left Qty</th>
                            <th className='font-medium text-left border-collapse border border-black p-1'>Right Qty</th>
                        </tr>
                        <tbody>
                            {articleData.map((item, index)=>{
                                if(item.article==newKnittingPlan.article && item.colour==newKnittingPlan.colour && item.model==newKnittingPlan.model && item.category==newKnittingPlan.category)
                                {
                                    console.log("item.size : ",item.size)
                                    
                                    rowIndex++;
                                    setTempSizeAndQty([...tempSizeAndQty,{size:item.size, leftQty:0, rightQty:0}])
    
                                    return (
                                        <tr className='p-3'>
                                            <td className='border-collapse border border-black p-1'>{item.size}</td>
                                            <td className='border-collapse border border-black p-1'>
                                                <input 
                                                    value={newKnittingPlan.remarks}
                                                    onChange={e=>{
                                                        var mySizeAndQty=[...tempSizeAndQty]
                                                        mySizeAndQty[rowIndex].leftQty=e.target.value
                                                        setTempSizeAndQty([...mySizeAndQty])
                                                    }}
                                                    type="number" 
                                                    className='ring-2 w-full ring-blue-200 bg-white  h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                                                />
                                            </td>
                                            <td className='border-collapse border border-black p-1'>
                                                <input 
                                                    value={newKnittingPlan.remarks}
                                                    onChange={e=>{
                                                        var mySizeAndQty=[...tempSizeAndQty]
                                                        mySizeAndQty[rowIndex].rightQty=e.target.value
                                                        setTempSizeAndQty([...mySizeAndQty])
                                                    }}
                                                    type="number" 
                                                    className='ring-2 w-full ring-blue-200 bg-white  h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                                                />
                                            </td>
                                        </tr>
                                    )
                                }
                            })}
                        </tbody>
                    </table>
                </div>
            )
        }
        if(modalType=='planEntry')
        {
            setModal(
                <div className="flex flex-col bg-white h-5/6 w-full mx-3 rounded overflow-hidden p-2">
                    <div className="flex flex-row justify-end">
                        {/* <svg  xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black hover:text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg> */}
    
                        <svg onClick={()=>{setModal(null)}} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>

                    <div className="w-full sticky top-0 p-3 grid grid-flow-col auto-cols-fr gap-1 font-bold">
                        <div className="text-sm py-2 text-left"></div>
                        <div className="text-sm py-2 text-left">DATE</div>
                        <div className="text-sm py-2 text-left">ARTICLE</div>
                        <div className="text-sm py-2 text-left">COLOUR</div>
                        <div className="text-sm py-2 text-left">MODEL</div>
                        <div className="text-sm py-2 text-left">CATEGORY</div>
                        <div className="text-sm py-2 text-left">REGION</div>
                        <div className="text-sm py-2 text-left">SIZE GRID</div>
                        <div className="text-sm py-2 text-left">CASE QTY</div>
                        <div className="text-sm py-2 text-left">CASES AVAILABLE FOR PLANNING</div>
                        <div className="text-sm py-2 col-span-2 text-left">PCKNG COMB</div>
                        <div></div>
                    </div>
                    
                    {requirementsData.map((reqItem,index)=>RenderRequirementItem(reqItem, index))}
                </div>
            )
        }
    }

    useEffect(() => {
        if(Modal)
            RenderModal('planEntry')
    }, [newKnittingPlan.caseQty,enableCaseQtyInput,requirementsData]);

    const markItemAsCompleted=(item)=>{
        if(window.confirm("Please confirm that knitting is completed for the item")){
            const updates={}
            updates[`knittingPlan/${item.id}/markedAsComplete`]=true
            update(ref(db),updates).then(()=>{
                console.log("item marked as completed")
            }).catch((e)=>{
                console.log("error : ",e)
            })
        
        }
    }

    const RenderItem=(item, index)=>{

        return (
            // <div key={index} className={item.qty<item.minStock?"w-11/12 p-2 grid grid-cols-8 bg-red-400 rounded-xl bg-opacity-90 ring-2 ring-red-500":"w-11/12 p-2 grid grid-cols-8"}>
            // <div key={index}>
            <Link key={index} to="../process-plan" state={{planItem:item}} 
                onClick={(e) => {
                    // Prevent navigation if the click originates from a button or input
                    if (e.target.closest(".prevent-link")){
                    e.preventDefault();
                    }
                }}
            >
                <div
                    // onClick={()=>{
                    //     var i=masterDetailIndex==index?-1:index
                    //     console.log(i)
                    //     setMasterDetailIndex(i)
                    //     console.log("masterDetailIndex : ",masterDetailIndex,index)
                    // }} 
                    className="cursor-pointer hover:bg-gray-300 grid grid-cols-12 text-sm gap-x-1 border-solid border-b border-gray-400 p-3 bg-gray-200" 
                >
                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">{item.planUniqueKey}</div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">{item.planDate}</div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">{item.article}</div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">{item.colour}</div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">{item.model}</div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">{item.category}</div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">{item.region}</div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">{item.sizeGrid}</div>
                    </div>

                    <div className="flex items-center justify-center col-span-1">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">{item.packingComb}</div>
                    </div>
                    
                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">{item.caseQty}</div>
                    </div>

                    <div className='flex items-center'>
                        {item.markedAsComplete
                        ?(<input
                            type='checkbox'
                            checked={true}
                            disabled
                            className='h-4 w-4 prevent-link'
                        />)
                        :(<input
                            type='checkbox'
                            onChange={()=>{markItemAsCompleted(item)}}
                            className='h-4 w-4 prevent-link'
                            checked={false}
                        />)}
                        {/* <Checkbox
                            checked={item.markedAsComplete}
                            onChange={()=>{markItemAsCompleted(item)}}
                            disabled={item.markedAsComplete}
                            inputProps={{ 'aria-label': 'controlled' }}
                        /> */}
                    </div>
                    
                    <div 
                        class="w-7 h-7 bg-white p-1 rounded-lg text-red-800 hover:text-red-500 self-center prevent-link"
                        onClick={()=>{deleteFromDatabase(item)}}
                    >
                        <svg  xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" >
                            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                    </div>  
                </div>
            </Link>
                
            // </div>
        )
    }

    useEffect(() => {
        if(planData.length>0)
            {
            console.log("retriggered")
            setRenderItems(
                <div className='w-full overflow-y-auto'>
                    {[...planData].reverse().map((item, index)=>RenderItem(item,index))}
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
    }, [planData,masterDetailIndex])

    return (
        <div className="pb-2 bg-blue-50 h-full px-3">
            {Modal&&(
                <div onClick={backdropClickHandler} className="h-full bg-black z-20 bg-opacity-80 fixed inset-0 flex justify-center items-center">
                    {Modal}
                </div>)
            }

            <div className="h-5/12 pt-4 pb-2 flex flex-col items-center filter drop-shadow-lg">
                <div className='flex flex-row w-full justify-between'>
                    <div className="bg-white pl-2 w-fit flex flex-row self-start items-center space-x-3 w-auto ring ring-1 ring-gray-300 rounded-sm">
                        <div className='font-medium w-auto'>Date : </div>
                        <input  
                            type="date" 
                            className="w-fit py-2 focus:outline-none" 
                            value={newKnittingPlan.date}
                            onChange={e=>{
                                setNewKnittingPlan({
                                    ...newKnittingPlan,
                                    date: e.target.value
                                })
                            }}  
                        />
                    </div>

                    <div className='flex flex-row space-x-2 items-center'>
                        <Link to="../previous-knitting-plan">
                            <div className='text-center rounded py-2 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'>
                                Previous Plan
                            </div>
                        </Link>
                        <div className='flex flex-row font-medium bg-white rounded items-center'>
                            <div className='border border-gray-300 p-2'>Total Pair : </div>
                            <div className='border border-gray-300 p-2'>Last Created Plan Code : </div>
                        </div>
                    </div>


                </div>
            </div>
            
            <div className="flex flex-col h-xxl space-y-2 items-center justify center items-center bg-white rounded p-4">
                <div className='flex flex-row justify-between w-full align-center'>
                    <div className='font-semibold text-lg'>Knitting Planning Sheet</div>

                    <div className='flex flex-row space-x-2'>
                        <ExportExcel
                            excelData={planData}
                            fileName={"Knitting-Plan"}
                        />

                        <div 
                            className='text-center rounded py-2 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                            onClick={()=>{RenderModal('planEntry')}}
                        >
                            Enter new Plan
                        </div>
                    </div>
                </div>
                <div className="w-full text-xs font-bold sticky top-0 p-3 grid grid-cols-12 gap-1 bg-gray-200">
                    <div className="py-2 text-left">PLAN ID</div>
                    <div className="py-2 text-left">DATE</div>
                    <div className="py-2 text-left">ARTICLE</div>
                    <div className="py-2 text-left">COLOUR</div>
                    <div className="py-2 text-left">MODEL</div>
                    <div className="py-2 text-left">CATEGORY</div>
                    <div className="py-2 text-left">REGION</div>
                    <div className="py-2 text-left">SIZE GRID</div>
                    <div className="py-2 col-span-1 text-left">PCKNG COMB</div>
                    <div className="py-2 text-left">CASE QTY</div>
                    <div className="text-sm py-2 col-span-2 text-left">MARK AS COMPLETE</div>
                </div>
                
                {renderItems}
            </div>
        </div>

    )
}

export default KnittingPlan
