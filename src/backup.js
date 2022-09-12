//spareview
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
                        <div className="w-full grid grid-cols-2">
                            <div className="text-left font-bold flex flex-row justify-between mr-3">
                                <span>CODE</span> 
                                <span>:</span>
                            </div>
                            {/* <div className="text-center font-bold">:</div> */}
                            <div className="text-left font-semibold">{item.code}</div>
                        </div>

                        <div className="w-full grid grid-cols-2">
                            <div className="text-left font-bold flex flex-row justify-between mr-3">
                                <span>PART NAME</span> 
                                <span>:</span>
                            </div>
                            {/* <div className="text-center font-bold">:</div> */}
                            <div className="text-left font-semibold">{item.partName}</div>
                        </div>

                        <div className="w-full grid grid-cols-2">
                            <div className="text-left font-bold flex flex-row justify-between mr-3">
                                <span>MACHINE</span> 
                                <span>:</span>
                            </div>
                            {/* <div className="text-center font-bold">:</div> */}
                            <div className="text-left font-semibold">{item.machine}</div>
                        </div>

                        <div className="w-full grid grid-cols-2">
                            <div className="text-left font-bold flex flex-row justify-between mr-3">
                                <span>PART NUMBER</span> 
                                <span>:</span>
                            </div>
                            {/* <div className="text-center font-bold">:</div> */}
                            <div className="text-left font-semibold">{item.partNumber}</div>
                        </div>

                        <div className="w-full grid grid-cols-2">
                            <div className="text-left font-bold flex flex-row justify-between mr-3">
                                <span>NICKNAME</span> 
                                <span>:</span>
                            </div>
                            {/* <div className="text-center font-bold">:</div> */}
                            <div className="text-left font-semibold">{item.nickName}</div>
                        </div>

                        <div className="w-full grid grid-cols-2">
                            <div className="text-left font-bold flex flex-row justify-between mr-3">
                                <span>SPECIFICATION</span> 
                                <span>:</span>
                            </div>
                            {/* <div className="text-center font-bold">:</div> */}
                            <div className="text-left font-semibold">{item.spec}</div>
                        </div>

                        <div className="w-full grid grid-cols-2">
                            <div className="text-left font-bold flex flex-row justify-between mr-3">
                                <span>VALUE (INR)</span> 
                                <span>:</span>
                            </div>
                            {/* <div className="text-center font-bold">:</div> */}
                            <div className="text-left font-semibold">{item.value}</div>
                        </div>

                        <div className="w-full grid grid-cols-2">
                            <div className="text-left font-bold flex flex-row justify-between mr-3">
                                <span>TOTAL VALUE</span> 
                                <span>:</span>
                            </div>
                            {/* <div className="text-center font-bold">:</div> */}
                            <div className="text-left font-semibold">{parseInt(item.value)*parseInt(item.qty)}</div>
                        </div>

                        <div className="w-full grid grid-cols-2">
                            <div className="text-left font-bold flex flex-row justify-between mr-3">
                                <span>ORIGIN</span> 
                                <span>:</span>
                            </div>
                            {/* <div className="text-center font-bold">:</div> */}
                            <div className="text-left font-semibold">{item.origin}</div>
                        </div>

                        <div className="w-full grid grid-cols-2">
                            <div className="text-left font-bold flex flex-row justify-between mr-3">
                                <span>REMARKS</span> 
                                <span>:</span>
                            </div>
                            {/* <div className="text-center font-bold">:</div> */}
                            <div className="text-left font-semibold">{item.remarks}</div>
                        </div>

                        <div className="w-full grid grid-cols-2">
                            <div className="text-left font-bold flex flex-row justify-between mr-3">
                                <span>QUANTITY</span> 
                                <span>:</span>
                            </div>
                            {/* <div className="text-center font-bold">:</div> */}
                            <div className="text-left font-semibold">{item.qty}</div>
                        </div>

                        <div className="w-full grid grid-cols-2">
                            <div className="text-left font-bold flex flex-row justify-between mr-3">
                                <span>LOCAL QUANTITY</span> 
                                <span>:</span>
                            </div>
                            {/* <div className="text-center font-bold">:</div> */}
                            <div className="text-left font-semibold">{item.localQty}</div>
                        </div>
                        
                        <div className="w-full grid grid-cols-2">
                            <div className="text-left font-bold flex flex-row justify-between mr-3">
                                <span>UNIT</span> 
                                <span>:</span>
                            </div>
                            {/* <div className="text-center font-bold">:</div> */}
                            <div className="text-left font-semibold">{item.unit}</div>
                        </div>

                        <div className="w-full grid grid-cols-2">
                            <div className="text-left font-bold flex flex-row justify-between mr-3">
                                <span>LOCAL VENDOR</span> 
                                <span>:</span>
                            </div>
                            {/* <div className="text-center font-bold">:</div> */}
                            <div className="text-left font-semibold">{item.localVendor}</div>
                        </div>


                        <div className="w-full grid grid-cols-2">
                            <div className="text-left font-bold flex flex-row justify-between mr-3">
                                <span>LIFE (in days)</span> 
                                <span>:</span>
                            </div>
                            {/* <div className="text-center font-bold">:</div> */}
                            <div className="text-left font-semibold">{item.life}</div>
                        </div>

                        <div className="w-full grid grid-cols-2">
                            <div className="text-left font-bold flex flex-row justify-between mr-3">
                                <span>MINIMUM STOCK</span> 
                                <span>:</span>
                            </div>
                            {/* <div className="text-center font-bold">:</div> */}
                            <div className="text-left font-semibold">{item.minStock}</div>
                        </div>

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



{fieldHeadings.map((heading,index)=>(
    <div className="p-1 pl-3 pb-2 bg-blue-100 rounded-xl w-full">
        <label htmlFor="code">
            <div className="w-full text-left">{heading}</div>
        </label>
        <input 
            className="pl-3 focus:outline-none h-8 w-full rounded-xl" 
            type="text" 
            id="code" 
            value={item[fieldKeys[index].split(":")[0]]} 
            onChange={(e)=>{setSpare({...spare, code:e.target.value})}} 
        />
    </div>
))}