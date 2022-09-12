import React, { useEffect, useState } from 'react'
import { Link, useHistory } from 'react-router-dom'
import { ref, set, onValue } from "firebase/database";
import { db } from "./firebase_config";
import * as XLSX from 'xlsx';
import {fieldHeadings, fieldKeys} from "./Requirements"


function SpareView() {
    // const location = useLocation()
    // const {spareData}=location.state
    let history = useHistory();

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
    const [filterSet, setFilterSet] = useState(null)
    // const [filterData, setFilterData] = useState([])
    // const [qty, setQty] = useState(0)
    const [loading, setLoading] = useState(true)

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
            const mySet=new Set();
            spareArray.forEach(item=>{
                mySet.add(item["code"])
            })
            var newFilterSet=[]
            mySet.forEach(item=>{
                newFilterSet.push(item)
            })
            setFilterSet(newFilterSet.sort());

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
        var rowclass=" w-10/12 p-2 grid grid-cols-8 "
        var totalQty=parseInt(item.totalQty)
        var minStock=parseInt(item.minStock)

        if(totalQty<minStock && totalQty!="0")
            rowclass+="bg-yellow-300 rounded-xl bg-opacity-90 "
        else if(minStock>0 && totalQty=="0")
        {
            rowclass+="bg-red-300 rounded-xl bg-opacity-90 "
        }

        return (
            // <div key={index} className={item.qty<item.minStock?"w-10/12 p-2 grid grid-cols-8 bg-red-400 rounded-xl bg-opacity-90 ring-2 ring-red-500":"w-10/12 p-2 grid grid-cols-8"}>
            <div key={index} className={rowclass}>
                <div className="flex items-center justify-center">
                    <div className="font-semibold bg-gray-300 p-5 rounded-xl w-10/12 break-all">{item.code}</div>
                </div>

                <div className="flex items-center justify-center">
                    <div className="font-semibold bg-gray-300 p-5 rounded-xl w-10/12 break-all">{item.nickName}</div>
                </div>

                <div className="flex items-center justify-center">
                    <div className="font-semibold bg-gray-300 p-5 rounded-xl w-10/12 break-all">{item.machine}</div>
                </div>

                <div className="flex items-center justify-center">
                    <div className="font-semibold bg-gray-300 p-5 rounded-xl w-10/12 break-all">{item.qty!=undefined?item.qty:""}</div>
                </div>

                <div className="flex items-center justify-center">
                    <div className="font-semibold bg-gray-300 p-5 rounded-xl w-10/12 break-all">{item.localQty!=undefined?item.localQty:""}</div>
                </div>

                <div className="flex items-center justify-center">
                    <div className="font-semibold bg-gray-300 p-5 rounded-xl w-10/12 break-all">{item.servQty!=undefined?item.servQty:""}</div>
                </div>

                {/* <div className="flex items-center justify-center">
                    <div className="font-semibold bg-gray-300 p-5 rounded-xl w-10/12 break-all">{item.machine}</div>
                </div>

                <div className="flex items-center justify-center">
                    <div className="font-semibold bg-gray-300 p-5 rounded-xl w-10/12 break-all">{item.partName}</div>
                </div>

                <div className="flex items-center justify-center">
                    <div className="font-semibold bg-gray-300 p-5 rounded-xl w-10/12 break-all">{item.partNumber}</div>
                </div>


                <div className="flex items-center justify-center">
                    <div className="font-semibold bg-gray-300 p-5 rounded-xl w-10/12 break-all">{item.spec}</div>
                </div> */}


                <div className="flex items-center justify-center">
                    <div 
                        className="font-semibold bg-blue-600 p-3 cursor-pointer rounded-3xl w-10/12 break-all text-white hover:bg-blue-800"
                        onClick={()=>{
                            setModalIndex(index)
                            RenderModal(index)
                        }}
                    >View</div>
                </div>

                <div className="flex items-center justify-center">
                    <div 
                        className="font-semibold cursor-pointer bg-green-600 p-3 rounded-3xl w-10/12 break-all text-white hover:bg-green-800"
                        onClick={()=>{
                            history.push({
                                pathname: "/sparehistory",
                                state: {spareId:item.id} 
                            });
                        }}
                    >History</div>
                </div>
            </div>
        )
    }

    const filterFunc=(dispItems)=>{
        var filters=[]
        // for(var key in filterItems){
        //     filterItems[key].map(item=>{
        //         filters.push(key+" : "+item)
        //     })
        // }
        for(var key in filterItems){
            if(filterItems[key]!="")
                filters.push(key+" : "+filterItems[key])
        }

        setFilterDisp(filters)

        // var keys=[]
        // for(var key in filterItems)
        //     keys.push(key)
        // var newData=[...filterData]

        // var count=0;
        // keys.forEach(key=>{
        //     var filters=[...filterItems[key]]
        //     count+=filters.length
        //     var items=[]
        //     filters.forEach(searchText=>{
        //         newData.forEach(item=>{
        //             if(item[key].includes(searchText))
        //                 items.push(item)
        //         })
        //     })
        //     newData=[...items]
        // })
        var newData=[...dispItems] //spareData so that filtering starts from the original data
        var count=0;

        for(var key in filterItems){
            var searchText=filterItems[key]
            count+=searchText.length
            if(searchText!="")
            {
                var items=[]
                newData.forEach(item=>{
                    if(item[key].toLowerCase().includes(searchText.toLowerCase()))
                    {
                        items.push(item)
                    }
                })
                newData=[...items]
            }
        }

        if(count>0)
        {
            dispItems=[...newData]

            const mySet=new Set();
            newData.forEach(item=>{
                mySet.add(item[filter])
            })
            var newFilterSet=[]
            mySet.forEach(item=>{
                newFilterSet.push(item)
            })
            setFilterSet(newFilterSet.sort());

        }
        else
        {
            dispItems=[...spareData]

            const mySet=new Set();
            spareData.forEach(item=>{
                mySet.add(item[filter])
            })
            var newFilterSet=[]
            mySet.forEach(item=>{
                newFilterSet.push(item)
            })
            setFilterSet(newFilterSet.sort());

        }
        return dispItems
    }

    useEffect(() => {
        if(dispData.length>0)
        {
            setRenderItems(dispData.map((item, index)=><RenderItem item={item} index={index}/>))
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
            const keys=["code","partName", "machine", "partNumber", "nickName", "spec", "origin"]
            var items=dispItems.filter((item,index)=>{
                // 
                var found=0;
                keys.forEach(key=>{
                    if(item[key].toLowerCase().includes(search.toLocaleLowerCase()))
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

    useEffect(() => {
        filterSearch();
    }, [search, spareData])
    
    useEffect(() => {
        filterSearch();
    }, [filterItems])

    return (
        <div className="h-full">
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

            <div className="h-5/12 pt-12 pb-6 flex flex-col items-center bg-blue-200 filter drop-shadow-lg">
                <div className="font-bold text-5xl w-full text-center text-gray-900">SPARE VIEW</div>
                <div className="flex flex-row items-center justify-between mt-5 w-full relative">
                    <div className="flex flex-row bg-green-300 justify-center items-center absolute ml-28">
                        <div className="p-2 bg-green-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white font-bold text-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                        </div>
                        <select 
                            className="bg-green-300 text-white font-bold p-2 outline-none" 
                            onChange={e=>{
                                setFilter(e.target.value)
                                const mySet=new Set();
                                dispData.forEach(item=>{
                                    mySet.add(item[e.target.value])
                                })
                                var newFilterSet=[]
                                mySet.forEach(item=>{
                                    newFilterSet.push(item)
                                })
                                setFilterSet(newFilterSet.sort());
                            }}
                        >
                            <option value="code" className="bg-green-600 p-3 font-bold">Code</option>
                            <option value="partName" className="bg-green-600 p-3 font-bold">Part Name</option>
                            <option value="partNumber" className="bg-green-600 p-3 font-bold">Part Number</option>
                            <option value="nickName" className="bg-green-600 p-3 font-bold">Nickname</option>
                            <option value="spec" className="bg-green-600 p-3 font-bold">Specification</option>
                            <option value="machine" className="bg-green-600 p-3 font-bold">Machine</option>
                        </select>
                    </div>
                    
                    <div className="flex flex-row space-x-3 w-full items-center justify-center">
                        <input 
                            value={search} 
                            onChange={e=>{setSearch(e.target.value)}} 
                            type="text" 
                            className="rounded-3xl h-10 w-5/12 p-3 pl-4 focus:outline-none" 
                            placeholder="Search by keyword"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <div className="flex flex-row mt-6 justify-between items-center relative w-full">

                    <div className="flex flex-row absolute ml-28">
                        <div className="bg-black text-md font-bold text-white px-3 p-1 rounded-l-3xl">{filter}</div>
                        {/* <input 
                            value={filterText} 
                            onChange={e=>{setFilterText(e.target.value)}} 
                            type="text" 
                            className="rounded-r-3xl p-1 pl-2 focus:outline-none w-40" 
                            placeholder="Search"
                        /> */}
                        <select 
                            className="text-black bg-white w-36 font-bold px-3 p-2 outline-none rounded-r-3xl" 
                            onChange={e=>{setFilterText(e.target.value)}}
                        >
                            <option value="" className="text-black p-3 font-bold">NIL</option>
                            {filterSet&&filterSet&&filterSet.map(item=>(
                                <option value={item} className="text-black p-3 font-bold">{item}</option>
                            ))}
                        </select>

                        <div 
                            className="ml-2 cursor-pointer text-md font-bold bg-red-600 hover:bg-red-500 text-white px-3 p-1 rounded-2xl"
                            onClick={()=>{
                                var items={...filterItems}
                                // if(items[filter]===undefined)
                                //     items[filter]=[]
                                // items[filter].push(filterText)
                                items[filter]=filterText
                                setFilterItems(items)
                            }}
                        >
                            Add
                        </div>
                    </div>
                    <div className="flex justify-center items-center w-full space-x-6">
                        <Link to="/sparehistory"
                            className="bg-yellow-400 hover:bg-yellow-500 text-sm font-bold text-white p-4 rounded-3xl"
                            onClick={()=>{}}
                        >
                                VIEW HISTORY
                        </Link>

                        <button
                            className="bg-green-400 hover:bg-green-500 text-sm font-bold text-white p-4 rounded-3xl"
                            onClick={()=>{DownloadExcel(spareData)}}
                        >
                                EXPORT EXCEL
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-row justify-center mt-5 items-center w-full self-center">
                {filterDisp.map(text=>(
                    <div className="flex flex-row space-x-2 bg-black rounded-3xl text-white px-3 py-2 mx-3">
                        <div>{text}</div>
                        <div 
                            className="text-white hover:text-red-500 font-bold"
                            onClick={()=>{
                                // var tmpFilter=filterItems[text.split(" : ")[0]]
                                // var newFilter=tmpFilter.filter(item=>{
                                //     if(item===text.split(" : ")[1])
                                //         return false;
                                //     else
                                //         return true
                                // })
                                // var newFilterItems={...filterItems}
                                // newFilterItems[text.split(" : ")[0]]=newFilter
                                var newFilter={...filterItems}
                                newFilter[text.split(" : ")[0]]=""
                                setFilterItems(newFilter)
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>))}
            </div>
            <div className="mt-10 mb-10 flex flex-col h-full space-y-2 items-center justify center items-center">
                <div className="w-10/12 p-3 grid grid-cols-8 border-2 border-black divide-x-2 divide-black divide-solid rounded-xl">
                    <div className="font-bold">Code</div>
                    <div className="font-bold">Nickname</div>
                    <div className="font-bold">Machine</div>
                    <div className="font-bold">New Qty</div>
                    <div className="font-bold">Local Qty</div>
                    <div className="font-bold">Service Qty</div>
                    {/* <div className="font-bold">Part Name</div>
                    <div className="font-bold">Part Number</div>
                    <div className="font-bold">Specification</div> */}
                </div>
                <div className="w-full h-full mt-24" >
                {
                    loading && 
                    (
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
                    )
                }
                </div>
                {renderItems}
            </div>
        </div>

    )
}

export default SpareView
