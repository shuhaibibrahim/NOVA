import React, { useEffect, useState } from 'react'
import { ref, set, onValue, push } from "firebase/database";
import { db } from "./firebase_config";
import {fieldHeadings,fieldKeys} from "./Requirements"

function SpareIn() {
    // const location = useLocation()
    // const {spareData}=location.state
    const [spareData, setSpareData] = useState([])

    const [modalToggle, setModalToggle] = useState(false)
    const [Modal, setModal] = useState(<div/>)
    const [modalItem, setModalItem] = useState({})

    const [search, setSearch] = useState("")
    const [renderItems, setRenderItems] = useState(
        <div className="flex items-center justify-center w-full h-full">
            <div className="text-blue-300 text-5xl">Nothing here !</div>
        </div>
    )

    const [myqty, setQty] = useState(0)
    const [selectedQty, setSelectedQty] = useState("localQty")
    const [loading, setLoading] = useState(true)

    const addQuantity=(item)=>{
        const spareRef = ref(db, `spares/${item.id}`);
        const historyRef = ref(db, `history/${item.id}`);
        const newHistoryRef=push(historyRef)

        var oldQty=item.qty

        var newLocalQty=item.localQty?item.localQty:0
        var newServQty=item.servQty?item.servQty:0
        var newQty=item.qty?item.qty:0

        if(selectedQty==="newQty")
        {
            newQty=parseInt(newQty)+parseInt(myqty)
        }
        else if(selectedQty==="localQty")
        {
            newLocalQty=parseInt(newLocalQty)+parseInt(myqty)
        }
        else if(selectedQty==="servQty")
        {
            newServQty=parseInt(newServQty)+parseInt(myqty)
        }
        
        //updating quantity
        set(spareRef, {
            ...item,
            qty:newQty,
            localQty:newLocalQty,
            servQty:newServQty
        })
        .then(()=>{
            alert("Successfully updated")

            setModalItem(
                {
                    ...item,
                    qty:newQty,
                    localQty:newLocalQty,
                    servQty:newServQty,
                    totalQty: parseInt(newQty)+parseInt(newLocalQty)+parseInt(newServQty),
                    totalValue:(parseFloat(newQty)*parseFloat(item.ogValue)+parseFloat(newLocalQty)*parseFloat(item.localValue)).toPrecision(10)
                }
            )

            var currentDate=new Date().toLocaleString('en-GB')
            // 
            //pushing histoty
            set(newHistoryRef, {
                // spareId: item.id,
                ...item,
                initialQty: selectedQty+" : "+oldQty,
                added: selectedQty+" : "+myqty, //quantity added
                date: currentDate
            })
            .then(()=>{
                // alert("Successfully updated")
            })
            .catch((error)=>{
                alert("Error while saving data : ",error)
            })
            .finally(()=>{
                setQty(0)
            })

        })
        .catch((error)=>{
            alert("Error while saving data : ",error)
        })

    }

    const backdropClickHandler = (event) => {
        if (event.target === event.currentTarget) {
            // setModal(<div/>)
            setModalToggle(false)
        }
    }

    const RenderModal=(item)=>{
        // 
        setModal(
            <div onClick={backdropClickHandler} className="bg-white z-20 bg-opacity-95 fixed inset-0 flex justify-center items-center">
               <div className="flex flex-col bg-blue-700 text-white h-2xl w-8/12 rounded-xl">
                    <div className="flex flex-row justify-end px-8 pt-3 ">
                        <svg onClick={()=>{setModal(<div/>)}} xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black hover:text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>

                    <div className="w-full h-xl px-8 py-4 text-white flex flex-row bg-blue-700 justify-between">    
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

                            <div className="flex flex-col space-y-4 w-full">
                                <div className="w-full text-left font-bold">Add quantity : </div>
                                <select className='p-3 text-black focus:outline-none' onChange={(e)=>{setSelectedQty(e.target.value)}}>
                                    <option value="localQty">Local Qty</option>
                                    <option value="servQty">Service Qty</option>
                                    <option value="newQty">New Qty</option>
                                </select>
                                <div className="flex flex-row w-full justify-between">
                                    <input 
                                        id="qty"
                                        type="number"
                                        name="qty"
                                        value={myqty}
                                        onChange={e=>{setQty(e.target.value)}} 
                                        className="w-3/12 text-black pl-2 rounded-xl ring-4 ring-blue-900 focus:outline-none"
                                        // className="text-black"
                                    />
                                    <button 
                                        onClick={()=>{addQuantity(item)}}
                                        className="p-3 w-8/12 ring-4 ring-red-900 bg-red-600 hover:bg-red-800 rounded-xl text-white font-semibold"
                                    >Update
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }


    const RenderItem=({item, index})=>{
        // 
        return (
            <div key={index} className="w-10/12 p-2 grid grid-cols-7">
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
                    <div className="font-semibold bg-gray-300 p-5 rounded-xl w-10/12 break-all">{item.qty?item.qty:""}</div>
                </div>

                <div className="flex items-center justify-center">
                    <div className="font-semibold bg-gray-300 p-5 rounded-xl w-10/12 break-all">{item.localQty?item.localQty:""}</div>
                </div>

                <div className="flex items-center justify-center">
                    <div className="font-semibold bg-gray-300 p-5 rounded-xl w-10/12 break-all">{item.servQty?item.servQty:""}</div>
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
                        className="font-semibold bg-blue-600 p-3 rounded-3xl w-10/12 break-all text-white hover:bg-blue-800"
                        onClick={()=>{
                            // RenderModal(item)
                            setModalItem(item)
                            setModalToggle(true)
                        }}
                    >View</div>
                </div>
            </div>
        )
    }


    useEffect(() => {
        const spareRef = ref(db, 'spares/');
        const historyRef = ref(db, 'history/');

        onValue(spareRef, (snapshot) => {
            const data = snapshot.val();
            // ;

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
            
            setSpareData(spareArray);
            setLoading(false);
        });
    }, [])

    useEffect(() => {
        RenderModal(modalItem)
    }, [myqty,modalItem])

    useEffect(() => {
        if(search==="")
            setRenderItems(spareData.map((item, index)=><RenderItem item={item} index={index}/>))
        else
        {
            const keys=["code","partName", "machine", "partNumber", "nickName", "spec", "origin"]
            var items=spareData.filter((item,index)=>{
                // 
                var found=0;
                keys.forEach(key=>{
                    if(item[key].includes(search))
                    {
                        // 
                        found=1;
                    }
                })
                return found===1
            })

            // 
            if(items.length>0)
                setRenderItems(items.map((item, index)=><RenderItem item={item} index={index}/>))
            else
                setRenderItems(        
                    <div className="flex items-center justify-center w-full h-full">
                        <div className="text-blue-300 text-5xl">Nothing here !</div>
                    </div>
                )
        }
    }, [search, spareData])

    return (
        <div className="h-full">
            {modalToggle&&Modal}
            <div className="h-5/12 pt-12 pb-6 flex flex-col items-center bg-blue-200 filter drop-shadow-lg w-full">
                <div className="font-bold text-5xl w-full text-center text-gray-900">SPARE INWARD</div>

                <div className="flex flex-row space-x-3 w-full items-center justify-center mt-5">
                    <input 
                        value={search} 
                        onChange={e=>{setSearch(e.target.value)}} 
                        type="text" 
                        className="rounded-3xl h-10 w-1/2 p-3 pl-4 focus:outline-none" 
                        placeholder="Search by keyword"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            <div className="mt-10 mb-10 flex flex-col h-full space-y-2 items-center justify center items-center">
                <div className="w-10/12 p-3 grid grid-cols-7 border-2 border-black divide-x-2 divide-black divide-solid rounded-xl">
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
                        <div class="w-full h-full flex justify-center items-center space-x-5 mt-24">
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

export default SpareIn
