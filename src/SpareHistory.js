import React, { useEffect, useState } from 'react'
import { useLocation, useOutletContext } from 'react-router-dom'
// import historyData from './DummyData'
import { ref, onValue, remove } from "firebase/database";
import { db } from "./firebase_config";
import {fieldHeadings, fieldKeys} from "./Requirements"

function SpareHistory() {
    // const location = useLocation()
    // const {historyData}=location.state
    const location = useLocation()

    const [setSelectedLink] = useOutletContext();
    useEffect(() => {
      setSelectedLink("sparehistory")
    }, [])

    const { spareId } = location.state || {undefined}

    const [historyData, setHistoryData] = useState([])
    const [dispData, setDispData] = useState([]) //data displayed
    const [Modal, setModal] = useState(<div/>)
    const [search, setSearch] = useState("")
    const [renderItems, setRenderItems] = useState(
        <div className="flex items-center justify-center w-full h-full">
            <div className="text-blue-300 text-5xl">Nothing here !</div>
        </div>
    )

    const [loading, setLoading] = useState(true)
    const [from, setFrom] = useState(null)
    const [to, setTo] = useState(null)
    const [minDate, setMinDate] = useState(null)
    const [maxDate, setMaxDate] = useState(null)

    useEffect(() => {

        var historyRef;
        if(spareId===undefined) 
            historyRef = ref(db, 'history/');
        else    
            historyRef = ref(db, `history/${spareId}`); // for specific history of a spare from spareview page

        onValue(historyRef, (snapshot) => {
            const data = snapshot.val();
           
            var historyArray=[];
            // // var spareRef=[]
            if(spareId===undefined)
            {
                // for(var key in data)
                // {
                //     // historyArray.push(data[key])
                //     var spareItem=data[key]
                //     for(var id in spareItem)
                //     {
                        
                //         historyArray.push({
                //             ...spareItem[id],
                //             historyId:id,
                //             selected:false
                //         })
                //     }
                // }
                for(var key in data)
                {
                    var spareItem=data[key]
                    
                    for(var id in spareItem)
                    {
                        var qty=spareItem[id].qty||0
                        var localQty=spareItem[id].localQty||0
                        var servQty=spareItem[id].servQty||0
            
                        var ogValue=spareItem[id].value||0
                        var localValue=spareItem[id].localValue||0
            
                        spareItem[id]["totalQty"]=parseInt(qty)+parseInt(localQty)+parseInt(servQty)
                        spareItem[id]["totalValue"]=(parseFloat(qty)*parseFloat(ogValue)+parseFloat(localQty)*parseFloat(localValue)).toPrecision(10)

                        historyArray.push({
                            ...spareItem[id],
                            historyId:id,
                            selected:false
                        })
                    }
                }
            }
            else
            {
                for(var key in data)
                {
                    var spareItem=data[key]
                    var qty=spareItem.qty||0
                    var localQty=spareItem.localQty||0
                    var servQty=spareItem.servQty||0
        
                    var ogValue=spareItem.value||0
                    var localValue=spareItem.localValue||0
        
                    spareItem["totalQty"]=parseInt(qty)+parseInt(localQty)+parseInt(servQty)
                    spareItem["totalValue"]=(parseFloat(qty)*parseFloat(ogValue)+parseFloat(localQty)*parseFloat(localValue)).toPrecision(10)

                    historyArray.push({
                        ...spareItem,
                        historyId:key
                    })
                }
            }

            if(historyArray[0]!==undefined)
            {
                historyArray.sort((a,b)=> {
                    if(a!==undefined)
                        return a.date < b.date ? 1 : -1
                    else
                        return 1;
                })
                var maxD=historyArray[0].date.split(',')[0]
                var minD=historyArray[historyArray.length-1].date.split(',')[0]
            }
            setMinDate(minD)
            setMaxDate(maxD)

            setDispData(historyArray)
            setHistoryData(historyArray);
            setLoading(false);
        });
    }, [])

    const backdropClickHandler = (event) => {
        if (event.target === event.currentTarget) {
            setModal(<div/>)
        }
    }

    const RenderModal=(item)=>{
        setModal(
            <div onClick={backdropClickHandler} className="bg-white z-20 bg-opacity-95 fixed inset-0 flex justify-center items-center">
                <div className="flex flex-col bg-blue-700 text-white h-xl w-8/12 rounded-xl">
                    <div className="flex flex-row justify-end px-8 pt-3 ">
                        <svg onClick={()=>{setModal(<div/>)}} xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black hover:text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                <div className="text-left font-semibold">{item[fieldKeys[index].split(":")[0]]}</div>
                                </div>
                            ))}

                        </div>
                        <div className="flex flex-col space-y-4 w-4/12 justify-between items-center">
                            <div className="flex h-full w-full rounded-2xl bg-blue-100 justify-center items-center">
                                <img className="h-64 w-56 rounded-xl" src={item.image} alt="imageq1" />
                            </div>

                            {/* <div className="flex flex-col space-y-4 w-full">
                                <div className="w-full text-left font-bold">Take quantity : </div>
                                <div className="flex flex-row w-full justify-between">
                                    <input 
                                        id="qty"
                                        type="number"
                                        name="qty"
                                        defaultValue={0}
                                        min={0}
                                        onChange={(e)=>{setQty(parseInt(e.target.value))}} 
                                        // value={qty}
                                        className="w-3/12 text-black pl-2 rounded-xl ring-4 ring-blue-900 focus:outline-none"
                                        // className="text-black"
                                    />
                                    <button 
                                        onClick={()=>{minusQuantity(item)}}
                                        className="p-3 w-8/12 ring-4 ring-red-900 bg-red-600 hover:bg-red-800 rounded-xl text-white font-semibold"
                                    >Update
                                    </button>
                                </div>
                            </div> */}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    useEffect(() => {
        if(search==="")
        {
            setDispData(historyData)
            setRenderItems(historyData.map((item, index)=><RenderItem item={item} index={index}/>))
        }
        else
        {
            const keys=["code","partName", "machine", "partNumber", "nickName", "spec", "origin"]
            var items=historyData.filter((item,index)=>{
                var found=0;
                keys.forEach(key=>{
                    if(item[key] && String(item[key]).toLowerCase().includes(search.toLowerCase))
                    {
                        found=1;
                    }
                })
                return found===1
            })

            setDispData(items)
            if(items.length>0)
                setRenderItems(items.map((item, index)=><RenderItem item={item} index={index}/>))
            else
                setRenderItems(        
                    <div className="flex items-center justify-center w-full h-full">
                        <div className="text-blue-300 text-5xl">Nothing here !</div>
                    </div>
                )
        }
    }, [search, historyData])

    useEffect(() => {
        setRenderItems(dispData.map((item, index)=><RenderItem item={item} index={index}/>))
    }, [dispData])

    const RenderItem=({item, index})=>{
        return (
            <div key={index} 
            className={item.selected?" w-10/12 p-2 grid grid-cols-7 bg-black bg-opacity-20 ":" w-10/12 p-2 grid grid-cols-7 "}>
                <div className="flex items-center justify-center">
                    <div className="font-semibold bg-gray-300 p-5 rounded-xl w-10/12 break-all">{item.code}</div>
                </div>

                <div className="flex items-center justify-center">
                    <div className="font-semibold bg-gray-300 p-5 rounded-xl w-10/12 break-all">{item.partName}</div>
                </div>

                <div className="flex items-center justify-center">
                    <div className="font-semibold bg-gray-300 p-5 rounded-xl w-10/12 break-all">{item.partNumber}</div>
                </div>

                <div className="flex items-center justify-center">
                    <div className="font-semibold bg-gray-300 p-5 rounded-xl w-10/12 break-all">{item.machine}</div>
                </div>

                {item.added&&
                    <div className="flex items-center justify-center">
                        <div className="flex justify-center font-semibold bg-gray-300 p-5 space-x-2 rounded-xl w-10/12 break-all">
                            <span>{item.added}</span>
     
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 font-bold text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                            </svg>
                        </div>
                    </div>
                }

                {item.removed&&
                    <div className="flex items-center justify-center">
                        <div className="flex justify-center font-semibold bg-gray-300 p-5 flex flex-row space-x-2 rounded-xl w-10/12 break-all">
                            <span>{item.removed}</span>
     
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 font-bold text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                            </svg>
                        </div>
                    </div>
                }

                {item.deleted&&
                    <div className="flex items-center justify-center">
                        <div className="font-semibold bg-gray-300 p-5 rounded-xl w-10/12 break-all text-red-600">
                            deleted
                        </div>
                    </div>
                }

                {item.edited&&
                    <div className="flex items-center justify-center">
                        <div className="font-semibold bg-gray-300 p-5 rounded-xl w-10/12 break-all text-blue-600">
                            edited
                        </div>
                    </div>
                }

                <div className="flex items-center justify-center">
                    <div className="flex flex-col justify-center items-center font-semibold text-sm bg-gray-300 p-5 rounded-xl w-10/12 break-all">
                        <span>{item.date.split(',')[0]}</span>
                        <span>{item.date.split(',')[1]}</span>
                    </div>
                </div>

                <div className="flex flex-row space-x-3 items-center justify-center">
                    <div 
                        className="font-semibold bg-blue-600 p-3 rounded-3xl w-10/12 break-all text-white hover:bg-blue-800"
                        onClick={()=>{RenderModal(item)}}
                    >View</div>

                    <div>
                        <input 
                            type="checkbox"
                            value={item.selected}
                            checked={item.selected}
                            onChange={e=>{
                                var historyArray=[...dispData]
                                console.log(historyArray)
                                historyArray[index].selected=!historyArray[index].selected
                                setDispData([...historyArray])
                            }}
                        />
                    </div>
                </div>
            </div>
        )
    }

    const selectHistory=()=>{
        
        if(dispData.length!=0 && (from!=null || to!=null))
        {
            var historyArray=[...dispData]
    
            historyArray=historyArray.map(item=>{
                var itemDate=item.date.split(',')[0]
                
                var fromDate=from||minDate
                var toDate=to||maxDate
    
                if(itemDate>=fromDate && itemDate<=toDate)
                {
                    item.selected=true;
                }
                else
                {
                    item.selected=false;
                }
                return item;
            })
    
            setDispData(historyArray)
        }

    }

    const deleteHistory=()=>{
        
        var historyRef;
        // if(spareId===undefined)
        // {
        var selected=false
        dispData.forEach(item=>{
            if(item.selected===true)
            {
                if(selected===false)
                {
                    var confirm=window.confirm("Clear history data?")
                    selected=true
                    if(!confirm)
                        return;
                }
                historyRef = ref(db, `history/${item.id}/${item.historyId}`);
                remove(historyRef)
            }
        })
        // }
    }

    useEffect(() => {
        selectHistory()
    }, [from, to]) //to change selected items on changing date range

    return (
        <div className="h-full">
            {Modal}
            <div className="h-5/12 pt-12 pb-6 flex flex-col items-center bg-blue-200 filter drop-shadow-lg w-full">
                <div className="font-bold text-5xl w-full text-center text-gray-900">SPARE HISTORY</div>

                <div className="flex flex-row space-x-3 w-full items-center justify-center mt-5">
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

                <div className="flex flex-row justify-between w-4/12 mt-3">
                    <div className="flex flex-col justify-center items-start w-5/12">
                        <label htmlFor="from" className="font-vold text-black text-opacity-70">
                            From
                        </label>
                        <input 
                            id="from"
                            type="date" 
                            className="text-black text-opacity-70 p-1 focus:outline-none pl-3 ring-2 w-full ring-blue-100 focus:ring-blue-300 rounded-xl"
                            onChange={(e)=>{
                                var date=e.target.value.split('-')
                                var yy=date[0]
                                var mm=date[1]
                                var dd=date[2]
                                date=[dd,mm,yy].join('/')
                                setFrom(date)
                            }}
                        />
                    </div>

                    <span className="flex items-center font-bold text-xl mt-6">-</span>

                    <div className="flex flex-col justify-center items-start w-5/12">
                        <label htmlFor="to" className="font-vold text-black text-opacity-70">
                            to
                        </label>
                        <input 
                            id="to"
                            type="date" 
                            className="text-black text-opacity-70 p-1 focus:outline-none pl-3 ring-2 w-full ring-blue-100 focus:ring-blue-300 rounded-xl"
                            onChange={(e)=>{
                                var date=e.target.value.split('-')
                                var yy=date[0]
                                var mm=date[1]
                                var dd=date[2]
                                date=[dd,mm,yy].join('/')
                                setTo(date)
                            }}
                        />
                    </div>

                    <div className="flex flex-col justify-end">
                        <div 
                            className="rounded-xl bg-red-500 hover:bg-red-600 p-2"
                            onClick={()=>{deleteHistory()}}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 text-white font-bold  w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-10 mb-10 flex flex-col h-full space-y-2 items-center justify center items-center">
                <div className="w-10/12 p-3 grid grid-cols-7 border-2 border-black divide-x-2 divide-black divide-solid rounded-xl">
                    <div className="font-bold">Code</div>
                    <div className="font-bold">Part Name</div>
                    <div className="font-bold">Part Number</div>
                    <div className="font-bold">Machine</div>
                    <div className="font-bold">Update</div>
                    <div className="font-bold">Date & TIme</div>
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

export default SpareHistory
