import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { db} from "../firebase_config";
import { ref, set, push, onValue } from "firebase/database";
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

    const [newKnittingPlan, setNewKnittingPlan] = useState({
        planCode:"",
        article:"",
        colour:"",
        model:"",
        category:"",
        size:"",
        leftQty:"",
        rightQty:"",
        planType:"",
        remarks:""
    })

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
                // spareArray.push(item)
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
            // setSpareData(spareArray);
            // setLoading(false);
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
    

    const pushToDatabase = () => {
            // setUpdateLoad(true)

            const planRef = ref(db, `knittingPlan/`);
            const newPlanRef = push(planRef);

            set(newPlanRef, {
                ...newKnittingPlan,
                id:newPlanRef.key
            })
            .then((ref)=>{
                // setUpdateLoad(false)
                alert("Successfully updated")

                setNewKnittingPlan({
                    planCode:"",
                    article:"",
                    colour:"",
                    model:"",
                    category:"",
                    size:"",
                    leftQty:"",
                    rightQty:"",
                    planType:"",
                    remarks:""
                })
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



    const backdropClickHandler = (event) => {
        if (event.target === event.currentTarget) {
            setModal(null)
        }
    }

    const RenderModal=()=>{
        var rowIndex=-1;
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
                
                {/* <div className='grid grid-cols-4 gap-4 text-sm p-3'>
                    <div className='font-medium text-left'>Size</div>
                    <div className='font-medium text-left'>Left Qty</div>
                    <div className='font-medium text-left'>Right Qty</div>
                </div> */}

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

                {/* <div className='h-auto max-h-56 flex flex-col overflow-y-scroll w-full p-2 space-y-2'>
                    {tempSizeList.map((size,index)=>(
                        <div className='grid grid-cols-4 gap-4'>
                            <div className='text-left'>
                                {size}        
                            </div>
                            <div className='text-left'>
                                {tempLeftQty[index]}
                            </div>
                            <div className='text-left'>
                                {tempRightQty[index]}
                            </div>
                            <div 
                                onClick={()=>{
                                    var tempArr=[...tempSizeList]
                                    tempArr.splice(index,1)
                                    setTempSizeList([...tempArr])
                                    var tempArr=[...tempLeftQtyList]
                                    tempArr.splice(index,1)
                                    setTempLeftQtyList([...tempArr])
                                    var tempArr=[...tempRightQtyList]
                                    tempArr.splice(index,1)
                                    setTempRightQtyList([...tempArr])
                                }}
                                className='relative text-center rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                            >
                                Delete
                            </div>
                        </div>
                    ))}
                </div> */}
            </div>
        )
    }

    useEffect(() => {
        if(Modal)
            RenderModal()
    }, [tempSize, tempLeftQty, tempRightQty, tempSizeList, tempLeftQtyList, tempRightQtyList]);

    const RenderItem=({item, index})=>{
        var rowclass=" w-full p-2 grid grid-cols-8 gap-2 text-sm "
        var totalQty=parseInt(item.totalQty)
        var minStock=parseInt(item.minStock)

        if(totalQty<minStock && totalQty!="0")
            rowclass+="bg-yellow-300 bg-opacity-90 "
        else if(minStock>0 && totalQty=="0")
        {
            rowclass+="bg-red-300 bg-opacity-90 "
        }

        return (
            // <div key={index} className={item.qty<item.minStock?"w-11/12 p-2 grid grid-cols-8 bg-red-400 rounded-xl bg-opacity-90 ring-2 ring-red-500":"w-11/12 p-2 grid grid-cols-8"}>
            <div key={index} className={rowclass} >
                <div className="flex items-center justify-center">
                    <div className="text-stone-900/30 w-10/12 break-all">{item.code}</div>
                </div>

                <div className="flex items-center justify-center">
                    <div className="text-stone-900/30 w-10/12 break-all">{item.nickName}</div>
                </div>

                <div className="flex items-center justify-center">
                    <div className="text-stone-900/30 w-10/12 break-all">{item.machine}</div>
                </div>

                <div className="flex items-center justify-center">
                    <div className="text-stone-900/30 w-10/12 break-all">{item.qty!=undefined?item.qty:""}</div>
                </div>

                <div className="flex items-center justify-center">
                    <div className="text-stone-900/30 w-10/12 break-all">{item.localQty!=undefined?item.localQty:""}</div>
                </div>

                <div className="flex items-center justify-center">
                    <div className="text-stone-900/30 w-10/12 break-all">{item.servQty!=undefined?item.servQty:""}</div>
                </div>

                {/* <div className="flex items-center justify-center">
                    <div className="text-sm text-stone-900/30 w-10/12 break-all">{item.machine}</div>
                </div>

                <div className="flex items-center justify-center">
                    <div className="text-sm text-stone-900/30 w-10/12 break-all">{item.partName}</div>
                </div>

                <div className="flex items-center justify-center">
                    <div className="text-sm text-stone-900/30 w-10/12 break-all">{item.partNumber}</div>
                </div>


                <div className="flex items-center justify-center">
                    <div className="text-sm text-stone-900/30 w-10/12 break-all">{item.spec}</div>
                </div> */}


                <div className="flex items-center justify-center">
                    <div 
                        className="font-semibold cursor-pointer text-blue-500 hover:text-blue-800"
                        onClick={()=>{
                            setModalIndex(index)
                            RenderModal(index)
                        }}
                    >View</div>
                </div>

                <div className="flex items-center justify-center">
                    <div 
                        className="font-semibold cursor-pointer text-blue-500 hover:text-blue-800"
                        onClick={()=>{
                            navigate("../sparehistory",{
                                state: {spareId:item.id} 
                            });
                        }}
                    >History</div>
                </div>
            </div>
        )
    }


    const RenderInputRow=()=>{
        return (
            // <div key={index} className={item.qty<item.minStock?"w-11/12 p-2 grid grid-cols-8 bg-red-400 rounded-xl bg-opacity-90 ring-2 ring-red-500":"w-11/12 p-2 grid grid-cols-8"}>
            <div  className='w-full grid grid-cols-7 gap-4'>
                <div className="flex w-full flex flex-col items-start justify-items-start">
                    <label className='text-sm'>Enter the plan code</label>
                    <input 
                        value={newKnittingPlan.planCode}
                        onChange={e=>{
                            setNewKnittingPlan({
                                ...newKnittingPlan,
                                planCode: e.target.value
                            })
                        }}
                        type="text" 
                        className='w-full ring-2 ring-blue-200 bg-white h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    />
                </div> 

                <div className="flex w-full flex flex-col items-start justify-items-start">
                    <label className='text-sm'>Enter the article</label>
                    <select
                        onChange={e=>{
                            setNewKnittingPlan({
                                ...newKnittingPlan,
                                article: e.target.value
                            })
                        }}
                        value={newKnittingPlan.article}
                        className='w-full ring-2 ring-blue-200 bg-white  h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    >
                        <option>- SELECT -</option>
                        {articleSelectList.map((item,index)=>(
                            <option key={index} value={item}>{item}</option>
                        ))}
                    </select>
                    {/* <input 
                        value={newKnittingPlan.article}
                        onChange={e=>{
                            setNewKnittingPlan({
                                ...newKnittingPlan,
                                article: e.target.value
                            })
                        }}
                        type="text" 
                        className='w-full ring-2 ring-blue-200 bg-white  h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    /> */}
                </div> 

                <div className="flex w-full flex flex-col items-start justify-items-start">
                    <label className='text-sm'>Enter the colour</label>
                    <select
                        onChange={e=>{
                            setNewKnittingPlan({
                                ...newKnittingPlan,
                                colour: e.target.value
                            })
                        }}
                        value={newKnittingPlan.colour}
                        className='w-full ring-2 ring-blue-200 bg-white  h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    >
                        <option>- SELECT -</option>
                        {colourSelectList.map((item,index)=>(
                            <option key={index} value={item}>{item}</option>
                        ))}
                    </select>
                    {/* <input 
                        value={newKnittingPlan.colour}
                        onChange={e=>{
                            setNewKnittingPlan({
                                ...newKnittingPlan,
                                colour: e.target.value
                            })
                        }}
                        type="text" 
                        className='w-full ring-2 ring-blue-200 bg-white  h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    /> */}
                </div> 

                <div className="flex w-full flex flex-col items-start justify-items-start">
                    <label className='text-sm'>Enter the model</label>
                    <select
                        onChange={e=>{
                            setNewKnittingPlan({
                                ...newKnittingPlan,
                                model: e.target.value
                            })
                        }}
                        value={newKnittingPlan.model}
                        className='w-full ring-2 ring-blue-200 bg-white  h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    >
                        <option>- SELECT -</option>
                        {modelSelectList.map((item,index)=>(
                            <option key={index} value={item}>{item}</option>
                        ))}
                    </select>
                    {/* <input 
                        value={newKnittingPlan.model}
                        onChange={e=>{
                            setNewKnittingPlan({
                                ...newKnittingPlan,
                                model: e.target.value
                            })
                        }}
                        type="text" 
                        className='w-full ring-2 ring-blue-200 bg-white  h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    /> */}
                </div> 

                <div className="flex w-full flex flex-col items-start justify-items-start">
                    <label className='text-sm'>Enter the category</label>
                    <select
                        onChange={e=>{
                            setNewKnittingPlan({
                                ...newKnittingPlan,
                                category: e.target.value
                            })
                        }}
                        value={newKnittingPlan.category}
                        className='w-full ring-2 ring-blue-200 bg-white  h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    >
                        <option>- SELECT -</option>
                        {categorySelectList.map((item,index)=>(
                            <option key={index} value={item}>{item}</option>
                        ))}
                    </select>
                    {/* <input 
                        value={newKnittingPlan.category}
                        onChange={e=>{
                            setNewKnittingPlan({
                                ...newKnittingPlan,
                                category: e.target.value
                            })
                        }}
                        type="text" 
                        className='w-full ring-2 ring-blue-200 bg-white  h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    /> */}
                </div> 

                <div className="flex w-full flex flex-col items-start justify-items-start">
                    <label className='text-sm'>Enter the plan type</label>
                    <input 
                        value={newKnittingPlan.planType}
                        onChange={e=>{
                            setNewKnittingPlan({
                                ...newKnittingPlan,
                                planType: e.target.value
                            })
                        }}
                        type="text" 
                        className='w-full ring-2 ring-blue-200 bg-white  h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    />
                </div> 

                <div className="flex w-full flex flex-col items-start justify-items-start">
                    <label className='text-sm'>Enter the remarks</label>
                    <input 
                        value={newKnittingPlan.remarks}
                        onChange={e=>{
                            setNewKnittingPlan({
                                ...newKnittingPlan,
                                remarks: e.target.value
                            })
                
                        }}
                        type="text" 
                        className='w-full ring-2 ring-blue-200 bg-white  h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    />
                </div>

                <div 
                    onClick={()=>{RenderModal()}}
                    className='relative col-span-2 text-center rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                >
                    Enter size and quantities
                </div>

                <div className='flex flex-row space-x-1  items-end'>
                    <div className='relative text-center rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'>
                        Verify
                    </div>
                    <div 
                        className='relative text-center rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                        onClick={()=>{
                            if(window.confirm("Update the knitting plan?"))
                                pushToDatabase()
                        }}
                    >
                        Update
                    </div>
                    <div className='relative text-center rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'>
                        Mail
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="pb-2 bg-blue-50 h-full px-3">
            {Modal&&(
                <div onClick={backdropClickHandler} className="bg-black z-20 bg-opacity-80 fixed inset-0 flex justify-center items-center">
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

                {/* <div className="flex flex-row mt-2 justify-between items-center relative w-full">
                    

                    <div className='flex flex-row space-x-1'>
                        <div className='text-center rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'>
                            Verify
                        </div>
                        <div className='text-center rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'>
                            Update
                        </div>
                        <div className='text-center rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'>
                            Mail
                        </div>
                    </div>
                </div> */}
            </div>

            <div className='w-full bg-white rounded p-3 my-2'>
                {/* <RenderInputRow/> */}
                {RenderInputRow()}
            </div>
            
            
            <div className="flex flex-col h-lg space-y-2 items-center justify center items-center bg-white rounded p-4">
                <div className='flex flex-row justify-between w-full align-center'>
                    <div className='font-semibold text-lg'>Knitting Planning Sheet</div>

                    <button
                        className="text-sm font-medium text-blue-500 py-2 px-5 rounded ring-2 ring-blue-500 hover:bg-blue-500 hover:text-white"
                        onClick={()=>{DownloadExcel(spareData)}}
                    >
                            Export Excel
                    </button>
                </div>
                <div className="w-full sticky top-0 p-3 grid grid-cols-11 gap-1 bg-gray-200">
                    <div className="text-sm py-2 text-left">SI NO</div>
                    <div className="text-sm py-2 text-left">PLAN CODE</div>
                    <div className="text-sm py-2 text-left">ARTICLE</div>
                    <div className="text-sm py-2 text-left">COLOUR</div>
                    <div className="text-sm py-2 text-left">MODEL</div>
                    <div className="text-sm py-2 text-left">CATEGORY</div>
                    <div className="text-sm py-2 text-left">SIZE</div>
                    <div className="text-sm py-2 text-left">LEFT QTY</div>
                    <div className="text-sm py-2 text-left">RIGHT QTY</div>
                    <div className="text-sm py-2 text-left">PLAN TYPE</div>
                    <div className="text-sm py-2 text-left">REMARKS</div>
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

export default KnittingPlan
