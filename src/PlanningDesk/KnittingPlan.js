import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { db} from "../firebase_config";
import { ref, set, push, onValue, remove, increment, update } from "firebase/database";
import * as XLSX from 'xlsx';
import {fieldHeadings, fieldKeys} from "../Requirements"


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
        date:""
    })

    const [planData, setPlanData] = useState([])

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
        const planRef = ref(db, 'knittingPlan/');

        onValue(planRef, (snapshot) => {
            const data = snapshot.val();
            
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

    const deleteFromDatabase=(item)=>{

        if(window.confirm("Please confirm deleting "+item.article))
        {
            const articleRef = ref(db, `knittingPlan/${item.id}`); 
            const reqRef = ref(db, `requirementsData/${item.reqId}`); 
        
            remove(articleRef).then(()=>{
                const updates={}
                updates[`requirementsData/${item.reqId}/caseQty`]=increment(parseInt(item.caseQty))
                update(ref(db),updates).then(()=>{
                    console.log("case qty incremented")
                }).catch((e)=>{
                    console.log("error : ",e)
                })
            })
        }
    }
    

    const pushToDatabase = (reqItem) => {
            // setUpdateLoad(true)

            const planRef = ref(db, `knittingPlan/`);
            const reqRef = ref(db, `requirementsData/${reqItem.id}`); 
            const newPlanRef = push(planRef);

            set(newPlanRef, {
                ...newKnittingPlan,
                reqId:reqItem.id,
                id:newPlanRef.key
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
                })
                set(reqRef, {
                    ...reqItem,
                    caseQty:reqItem.caseQty-newKnittingPlan.caseQty
                }).then(()=>{
                    console.log("case qty decremented")
                }).catch((e)=>{
                    console.log("error : ",e)
                })
                setEnableCaseQtyInput(-1)
            })
            .catch((error)=>{
                alert("Error while saving data : ",error)
            })            
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

    const RenderRequirementItem=(item, index)=>{

        return (
            // <div key={index} className={item.qty<item.minStock?"w-11/12 p-2 grid grid-cols-8 bg-red-400 rounded-xl bg-opacity-90 ring-2 ring-red-500":"w-11/12 p-2 grid grid-cols-8"}>
            <div className='flex flex-col w-full border-solid border-b border-gray-400 p-3 bg-gray-200'>
                {enableCaseQtyInput==index&&(<div className='grid grid-cols-12 gap-x-1 '>
                    <div/><div/><div/><div/><div/><div/><div/><div/><div/><div/>
                    <div className="text-sm py-2 col-span-2 text-left font-bold">ENTER REQUIRED CASE QTY</div>
                </div>)}
                <div key={index} className="grid grid-cols-12 gap-x-1 " >
                    <div className="flex items-center justify-center">
                        <div className="text-stone-900/30 w-10/12 break-all text-left">{index+1}</div>
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

                    {/* {enableCaseQtyInput==index&&(
                        <div className='flex flex-row space-x-2'>
                            <div 
                                onClick={()=>{
                                    pushToDatabase()
                                }}
                                className='relative text-center rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className='bg-green-400 w-2' fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>

                            <button 
                                className='text-center rounded py-2 px-5 cursor-pointer bg-red-500 hover:bg-red-800 text-white font-medium'
                                onClick={()=>{setEnableCaseQtyInput(-1)}}
                            >
                                Cancel
                        </button>

                        </div>
                    )} */}
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

                    <div className="w-full sticky top-0 p-3 grid grid-cols-12 gap-1 font-bold">
                        <div className="text-sm py-2 text-left">SI NO</div>
                        <div className="text-sm py-2 text-left">DATE</div>
                        <div className="text-sm py-2 text-left">ARTICLE</div>
                        <div className="text-sm py-2 text-left">COLOUR</div>
                        <div className="text-sm py-2 text-left">MODEL</div>
                        <div className="text-sm py-2 text-left">CATEGORY</div>
                        <div className="text-sm py-2 text-left">REGION</div>
                        <div className="text-sm py-2 text-left">SIZE GRID</div>
                        <div className="text-sm py-2 text-left">CASE QTY</div>
                        <div className="text-sm py-2 col-span-2 text-left">PCKNG COMB</div>
                    </div>
                    
                    {requirementsData.map((reqItem,index)=>RenderRequirementItem(reqItem, index))}
                </div>
            )
        }
    }

    useEffect(() => {
        if(Modal)
            RenderModal('planEntry')
    }, [newKnittingPlan.caseQty,enableCaseQtyInput]);

    const RenderItem=(item, index)=>{

        return (
            // <div key={index} className={item.qty<item.minStock?"w-11/12 p-2 grid grid-cols-8 bg-red-400 rounded-xl bg-opacity-90 ring-2 ring-red-500":"w-11/12 p-2 grid grid-cols-8"}>
            <div key={index} className="grid grid-cols-11 text-sm gap-x-1 border-solid border-b border-gray-400 p-3 bg-gray-200" >
                <div className="flex items-center justify-center">
                    <div className="text-stone-900/30 w-10/12 break-all text-left">{index+1}</div>
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

                <div className="flex items-center justify-center col-span-1">
                    <div className="text-stone-900/30 w-10/12 break-all text-left">{item.packingComb}</div>
                </div>
                
                <div className="flex items-center justify-center">
                    <div className="text-stone-900/30 w-10/12 break-all text-left">{item.caseQty}</div>
                </div>
                
                <div 
                    class="w-7 h-7 bg-white p-1 rounded-lg text-red-800 hover:text-red-500 self-center"
                    onClick={()=>{deleteFromDatabase(item)}}
                >
                    <svg  xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                </div>
            
                
            </div>
        )
    }

    useEffect(() => {
        
        if(planData.length>0)
        {
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
    }, [planData])

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
                        <button
                            className="text-sm font-medium text-blue-500 py-2 px-5 rounded ring-2 ring-blue-500 hover:bg-blue-500 hover:text-white"
                            onClick={()=>{DownloadExcel(spareData)}}
                        >
                                Export Excel
                        </button>

                        <div 
                            className='text-center rounded py-2 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                            onClick={()=>{RenderModal('planEntry')}}
                        >
                            Enter new Plan
                        </div>
                    </div>
                </div>
                <div className="w-full text-xs font-bold sticky top-0 p-3 grid grid-cols-11 gap-1 bg-gray-200">
                    <div className="py-2 text-left">SI NO</div>
                    <div className="py-2 text-left">DATE</div>
                    <div className="py-2 text-left">ARTICLE</div>
                    <div className="py-2 text-left">COLOUR</div>
                    <div className="py-2 text-left">MODEL</div>
                    <div className="py-2 text-left">CATEGORY</div>
                    <div className="py-2 text-left">REGION</div>
                    <div className="py-2 text-left">SIZE GRID</div>
                    <div className="py-2 col-span-1 text-left">PCKNG COMB</div>
                    <div className="py-2 text-left">CASE QTY</div>
                </div>
                
                {renderItems}
            </div>
        </div>

    )
}

export default KnittingPlan
