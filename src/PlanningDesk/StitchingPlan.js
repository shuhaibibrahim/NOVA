import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { ref, set, onValue } from "firebase/database";
import { db } from "../firebase_config";
import * as XLSX from 'xlsx';
import {fieldHeadings, fieldKeys} from "../Requirements"


function StitchingPlan() {
    // const location = useLocation()
    // const {spareData}=location.state
    let navigate = useNavigate();

    const [setSelectedLink, setOpenedTab] = useOutletContext();
    useEffect(() => {
      setSelectedLink("planning-desk/stitching-plan")
      setOpenedTab("planningDesk")
    }, [])
    

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
    // const [filterData, setFilterData] = useState([])
    // const [qty, setQty] = useState(0)
    const [loading, setLoading] = useState(true)

    const filterKeys=["code","partName", "machine", "partNumber", "nickName", "spec", "origin"]

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

    useEffect(() => {
        const spareRef = ref(db, 'spares/');

        onValue(spareRef, (snapshot) => {
            const data = snapshot.val();

            var spareArray=[];
            for(var key in data)
            {
                var item=data[key]
                var qty=item.qty||0
                var localQty=item.localQty||0
                var servQty=item.servQty||0
    
                var ogValue=item.value||0
                var localValue=item.localValue||0
    
                item["totalQty"]=parseInt(qty)+parseInt(localQty)+parseInt(servQty)
                item["totalValue"]=(parseFloat(qty)*parseFloat(ogValue)+parseFloat(localQty)*parseFloat(localValue)).toPrecision(10)
                spareArray.push(item)
            }

            setDispData(spareArray)
            setSpareData(spareArray);
            setLoading(false);

        });
    }, [])


    const backdropClickHandler = (event) => {
        if (event.target === event.currentTarget) {
            setModal(null)
        }
    }

    const RenderModal=(mindex)=>{
        setModal(
            <div className="flex flex-col bg-blue-700 text-white h-2xl w-8/12 rounded-xl">
                <div className="flex flex-row justify-end px-8 pt-3 ">
                    <svg onClick={()=>{setModal(null)}} xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black hover:text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>

                <div className="w-full h-lg px-8 py-4 text-white flex flex-row bg-blue-700 justify-between">    
                    <div className="mr-3 overflow-y-scroll flex flex-col space-y-4 items-start w-8/12">
                        
                        {fieldHeadings.map((heading,index)=>(
                            <div className="w-full grid grid-cols-2">
                            <div className="text-left font-bold flex flex-row justify-between mr-3">
                                <span>{heading}</span> 
                                <span>:</span>
                            </div>
                            {/* <div className="text-center font-bold">:</div> */}
                            <div className="text-left font-semibold">{dispData[mindex][fieldKeys[index].split(":")[0]]}</div>
                            </div>
                        ))}

                    </div>
                    <div className="flex flex-col space-y-4 w-4/12 justify-between items-center">
                        <div className="flex h-full w-full rounded-2xl bg-blue-100 justify-center items-center">
                            <img className="h-64 w-56 rounded-xl" src={dispData[mindex].image} alt="image" />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

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

    const filterFunc=(dispItems)=>{
        var filters=[] // filter display

        for(var key in filterItems){
            if(filterItems[key]!="")
                filters.push(key+" : "+filterItems[key]) //each filter is displayed as key:text eg: code:1001
        }

        setFilterDisp(filters)

        var newData=[...dispItems] //spareData so that filtering starts from the original data
        var count=0;

        for(var key in filterItems){
            var searchText=filterItems[key]
            count+=searchText.length
            if(searchText!="")
            {
                var items=[]

                newData.forEach(item=>{
                    if(String(item[key]).toLowerCase().includes(searchText.toLowerCase()))
                    {
                        items.push(item)
                    }
                })
                newData=[...items]
            }
        }

        dispItems=[...newData]
        // if(count>0)
        // {
        //     dispItems=[...newData]

        //     const mySet=new Set();
        //     newData.forEach(item=>{
        //         mySet.add(item[filter])
        //     })
        //     var newFilterSet=[]
        //     mySet.forEach(item=>{
        //         newFilterSet.push(item)
        //     })
        //     setFilterSet(newFilterSet.sort());

        // }
        // else
        // {
        //     dispItems=[...spareData]

        //     const mySet=new Set();
        //     spareData.forEach(item=>{
        //         mySet.add(item[filter])
        //     })
        //     var newFilterSet=[]
        //     mySet.forEach(item=>{
        //         newFilterSet.push(item)
        //     })
        //     setFilterSet(newFilterSet.sort());

        // }
        return dispItems
    }

    useEffect(() => {
        if(dispData.length>0)
        {
            setRenderItems(
                <div className='w-full overflow-y-auto divide-y-2 divide-gray-300'>
                    {dispData.map((item, index)=><RenderItem item={item} index={index}/>)}
                </div>
            )
        }
        else
            setRenderItems(        
                <div className="flex items-center justify-center w-full h-full">
                    <div className="text-blue-300 text-5xl">Nothing here !</div>
                </div>
            )
    }, [dispData])

    const filterSearch=()=>{

        //applying filter items
        var dispItems=[...spareData]
        dispItems=[...filterFunc(dispItems)] //arrays are passed by reference

        if(search==="")
        {
            setDispData([...dispItems])
            var items=[...dispItems]
            // setRenderItems(items.map((item, index)=><RenderItem item={item} index={index}/>))
        }
        else
        {
            var items=dispItems.filter((item,index)=>{
                // 
                var found=0;
                filterKeys.forEach(key=>{
                    if(String(item[key]).toLowerCase().includes(search.toLocaleLowerCase()))
                    {
                        
                        found=1;
                    }
                })
                return found===1
            })

            setDispData([...items])
            // if(items.length>0)
            // {
            //     setRenderItems(items.map((item, index)=><RenderItem item={item} index={index}/>))
            // }
            // else
            //     setRenderItems(        
            //         <div className="flex items-center justify-center w-full h-full">
            //             <div className="text-blue-300 text-5xl">Nothing here !</div>
            //         </div>
            //     )
        }
    }

    //to set the filterset of each keys (filterset contails each value to be displayed) 
    //and to initiate filter search
    useEffect(() => {

        filterSearch();
    }, [search, spareData, filterItems])

    
    
    useEffect(() => {
        var filterSet={}

        //setting filter set for each keys
        filterKeys.forEach(key=>{
            const mySet=new Set();
            dispData.forEach(item=>{
                mySet.add(item[key])
            })
            var newFilterSet=[]
            mySet.forEach(item=>{
                newFilterSet.push(item)
            })
            filterSet[key]=[...newFilterSet.sort()];
        })

        setFilterSet({...filterSet})
    }, [dispData])

    return (
        <div className="pb-6 bg-blue-50 h-full px-3">
            {Modal&&(
                <div onClick={backdropClickHandler} className="bg-white z-20 bg-opacity-95 space-x-10 fixed inset-0 flex justify-center items-center">
                    <div className="p-3 bg-blue-400 text-white rounded-3xl hover:bg-blue-800" onClick={()=>{
                        var mindex=modalIndex-1>=0?modalIndex-1:dispData.length-1
                        setModalIndex(mindex)
                        RenderModal(mindex)
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </div>
                    {Modal}

                    <div className="p-3 bg-blue-400 text-white rounded-3xl hover:bg-blue-800" onClick={()=>{
                        var mindex=(modalIndex+1)%dispData.length
                        setModalIndex(mindex)
                        RenderModal(mindex)
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>      
                    </div>
                </div>)
            }

            <div className="h-5/12 pt-6 pb-6 flex flex-col items-center filter drop-shadow-lg">
                <div className='flex flex-row w-full justify-between'>
                    <div className="bg-white pl-2 w-fit flex flex-row self-start items-center space-x-3 w-auto ring ring-1 ring-gray-300 rounded-sm">
                        <div className='font-medium w-auto'>Date : </div>
                        <input  
                            type="date" 
                            className="w-fit py-2 focus:outline-none" 
                        />
                    </div>

                    <div className='flex flex-row font-medium bg-white rounded items-center'>
                        <div className='border border-gray-300 p-2'>Total Pair : </div>
                        <div className='border border-gray-300 p-2'>Last Created Plan Code : </div>
                    </div>

                </div>

                <div className="flex flex-row mt-6 justify-between items-center relative w-full">
                    <Link to="../previous-stitching-plan">
                        <div className='text-center rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'>
                            Previous Plan
                        </div>
                    </Link>

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
                </div>
            </div>
            
            
            <div className="flex flex-col h-lg space-y-2 items-center justify center items-center bg-white rounded-xl p-4">
                <div className='flex flex-row justify-between py-3 w-full align-center'>
                    <div className='font-semibold text-lg'>Stitching Planning Sheet</div>

                    <button
                        className="text-sm font-medium text-blue-500 py-2 px-5 rounded ring-2 ring-blue-500 hover:bg-blue-500 hover:text-white"
                        onClick={()=>{DownloadExcel(spareData)}}
                    >
                            Export Excel
                    </button>
                </div>
                <div className="w-full sticky top-0 p-3 grid grid-cols-11 gap-1 bg-gray-200">
                    <div className="text-sm py-2 ">SI NO</div>
                    <div className="text-sm py-2 ">PLAN CODE</div>
                    <div className="text-sm py-2 ">ARTICLE</div>
                    <div className="text-sm py-2 ">COLOUR</div>
                    <div className="text-sm py-2 ">MODEL</div>
                    <div className="text-sm py-2 ">CATEGORY</div>
                    <div className="text-sm py-2 ">SIZE</div>
                    <div className="text-sm py-2 ">LEFT QTY</div>
                    <div className="text-sm py-2 ">RIGHT QTY</div>
                    <div className="text-sm py-2 ">PLAN TYPE</div>
                    <div className="text-sm py-2 ">REMARKS</div>
                </div>
                
                {
                    loading && 
                    (
                        <div className="w-full h-full mt-24" >
                            <div className="w-full h-full flex justify-center items-center space-x-5 mt-24">
                                <div
                                    className="animate-spin rounded-full h-8 w-8 border-b-4 border-blue-500"
                                />
                                {/* <div
                                    className="animate-spin rounded-full h-8 w-8 border-b-4 border-red-600"
                                />
                                <div
                                    className="animate-spin rounded-full h-8 w-8 border-b-4 border-yellow-500"
                                />
                                <div
                                    className="animate-spin rounded-full h-8 w-8 border-b-4 border-green-500"
                                /> */}
                            </div>
                        </div>
                    )
                }
                {renderItems}
            </div>
        </div>

    )
}

export default StitchingPlan
