import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { db} from "../firebase_config";
import { ref, set, push, onValue, remove } from "firebase/database";
import * as XLSX from 'xlsx';
import {fieldHeadings, fieldKeys} from "../Requirements"


function RequirementEntry() {
    // const location = useLocation()
    // const {spareData}=location.state
    let navigate = useNavigate();

    const [setSelectedLink, setOpenedTab] = useOutletContext();
    useEffect(() => {
        setSelectedLink("admin/requirement-entry")
        setOpenedTab("adminDesk")
    }, [])
    

    const [articleData, setArticleData] = useState([])
    const [requirementsData, setRequirementsData] = useState([])
    const [editData, setEditData] = useState({
        date:"",
        article:"",
        colour:"",
        model:"",
        category:"",
        region:"",
        sizeGrid:"",
        caseQty:"",
        packingComb:""
    })
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

    const [newRequirement, setNewRequirement] = useState({
        date:"",
        article:"",
        colour:"",
        model:"",
        category:"",
        region:"",
        sizeGrid:"",
        caseQty:"",
        packingComb:""
    })

    const [packageInput, setPackageInput] = useState([])

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
        const reqRef = ref(db, 'requirementsData/');

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
        var tempColourList=[]
        var tempModelList=[]
        var tempCatList=[]
        
        articleData.forEach(item=>{
            if(item.article==newRequirement.article)
            {
                if(!tempColourList.includes(item.colour))
                    tempColourList.push(item.colour)
            }
            if(item.article==newRequirement.article && item.colour==newRequirement.colour)
            {
                if(!tempModelList.includes(item.model))
                    tempModelList.push(item.model)
            }
            if(item.article==newRequirement.article && item.colour==newRequirement.colour && item.model==newRequirement.model)
            {
                if(!tempCatList.includes(item.category))
                    tempCatList.push(item.category)
            }
        })

        console.log("colourlist : ",tempColourList)

        setColourSelectList([...tempColourList])
        setModelSelectList([...tempModelList])
        setCategorySelectList([...tempCatList])

    }, [newRequirement.article, newRequirement.colour, newRequirement.model, newRequirement])

    const pushToDatabase = () => {
            // setUpdateLoad(true)

            const reqRef = ref(db, `requirementsData/`);
            const newReqRef = push(reqRef);

            set(newReqRef, {
                ...newRequirement,
                packingComb: packageInput.join(','),
                id:newReqRef.key
            })
            .then((ref)=>{
                // setUpdateLoad(false)
                alert("Successfully updated")

                // setNewRequirement({
                //     date:"",
                //     article:"",
                //     colour:"",
                //     model:"",
                //     category:"",
                //     size:"",
                //     leftQty:"",
                //     rightQty:"",
                //     region:"",
                //     sizeGrid:"",
                //     caseQty:""
                // })
            })
            .catch((error)=>{
                alert("Error while saving data : ",error)
            })            
    }

    const editItem = (item) => {
        item={...editData, id:item.id}

        const reqRef = ref(db, `requirementsData/${item.id}`);

        set(reqRef, {
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

    const deleteFromDatabase=(item)=>{

        if(window.confirm("Please confirm deleting "+item.article))
        {
            const reqRef = ref(db, `requirementsData/${item.id}`); 
        
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



    const backdropClickHandler = (event) => {
        if (event.target === event.currentTarget) {
            setModal(null)
        }
    }

    const renderSizes=()=>{
        var firstSize=parseInt(newRequirement.sizeGrid.toUpperCase().split('X')[0])
        var secondSize=parseInt(newRequirement.sizeGrid.toUpperCase().split('X')[1])

        var sizeArray=[]
        for(var i=firstSize;i<=secondSize;i++)
            sizeArray.push(i)
        
        return sizeArray.map((size,index)=>(
            <th className='font-medium text-left border-collapse border border-black p-1' key={index}>{size}</th>
        ))
    }

    const renderPackageInput=()=>{
        
        return (
            <tr>
            {
                packageInput.map((pi,index)=>(
                    <td className='text-left border-collapse border border-black p-1'>
                        <input 
                            value={packageInput[index]}
                            onChange={e=>{
                                var tempArr=[...packageInput]
                                tempArr[index]=e.target.value
                                setPackageInput([...tempArr])
                            }}
                            type="number" 
                            className='w-full ring-2 ring-blue-200 bg-white  h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </td>
                ))
            }
            </tr>
        )
    }

    const RenderModal=()=>{
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
                        {renderSizes()}
                        {/* <th className='font-medium text-left border-collapse border border-black p-1'>Size</th>
                        <th className='font-medium text-left border-collapse border border-black p-1'>Left Qty</th>
                        <th className='font-medium text-left border-collapse border border-black p-1'>Right Qty</th> */}
                    </tr>
                    <tbody>
                        {renderPackageInput()}
                    </tbody>
                </table>

                <div className="flex flex-row justify-end mt-2">
                    <div 
                        className='relative  text-center rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                        onClick={()=>{setModal(null)}}
                    >
                        Submit
                    </div>
                </div>

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
        var firstSize=parseInt(newRequirement.sizeGrid.split('X')[0])
        var secondSize=parseInt(newRequirement.sizeGrid.split('X')[1])

        var sizeArray=[]
        var tempPackageInput=[]
        for(var i=firstSize;i<=secondSize;i++)
        {
            sizeArray.push(i)
            tempPackageInput.push(0)
        }

        setPackageInput([...tempPackageInput])
    }, [newRequirement.sizeGrid])
    
    useEffect(() => {
        if(Modal)
            RenderModal()
    }, [packageInput]);

    const RenderItem=(item, index)=>{

        return (
            // <div key={index} className={item.qty<item.minStock?"w-11/12 p-2 grid grid-cols-8 bg-red-400 rounded-xl bg-opacity-90 ring-2 ring-red-500":"w-11/12 p-2 grid grid-cols-8"}>
            <div key={index} className="grid grid-cols-12 gap-x-1 border-solid border-b border-gray-400 p-3 bg-gray-200" >
                <div className="flex items-center justify-center">
                    <div className="text-stone-900/30 w-10/12 break-all text-left">{index+1}</div>
                </div>

                {item.edit!=true&&(<>
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
                </>)}

                {item.edit&&(<>
                    <div className="flex w-full flex flex-col items-start justify-items-start">
                        <input 
                            value={editData.article.toUpperCase()}
                            onChange={e=>{
                                setEditingInputElement(e.target)
                                setEditData({
                                    ...editData,
                                    article: e.target.value.toUpperCase()
                                })
                            }}
                            type="text" 
                            className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div> 

                    <div className="flex w-full flex flex-col items-start justify-items-start">
                        <input 
                            value={editData.colour.toUpperCase()}
                            onChange={e=>{
                                setEditingInputElement(e.target)
                                setEditData({
                                    ...editData,
                                    colour: e.target.value.toUpperCase()
                                })
                            }}
                            type="text" 
                            className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div> 

                    <div className="flex w-full flex flex-col items-start justify-items-start">
                        <input 
                            value={editData.model.toUpperCase()}
                            onChange={e=>{
                                setEditingInputElement(e.target)
                                setEditData({
                                    ...editData,
                                    model: e.target.value.toUpperCase()
                                })
                            }}
                            type="text" 
                            className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div> 

                    <div className="flex w-full flex flex-col items-start justify-items-start">
                        <input 
                            value={editData.category.toUpperCase()}
                            onChange={e=>{
                                setEditingInputElement(e.target)
                                setEditData({
                                    ...editData,
                                    category: e.target.value.toUpperCase()
                                })
                            }}
                            type="text" 
                            className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div> 

                    <div className="flex w-full flex flex-col items-start justify-items-start">
                        <input 
                            value={editData.size}
                            onChange={e=>{
                                setEditingInputElement(e.target)
                                setEditData({
                                    ...editData,
                                    size: e.target.value
                                })
                            }}
                            type="number" 
                            className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div> 
                </>)}

                <div className='col-span-2'>
                    <div className='grid grid-cols-2 gap-x-2 w-full'>
                        {item.edit!=true&&(<div 
                            onClick={()=>{
                                setEditData({...item})
                                var tempReqData=[...requirementsData].reverse()
                                tempReqData[index].edit=true
                                setRequirementsData([...tempReqData].reverse())
                            }}
                            className='relative text-center rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                        </div>)}

                        {item.edit&&(
                        <div 
                            onClick={()=>{
                                var tempReqData=[...requirementsData].reverse()
                                tempReqData[index].edit=false
                                setRequirementsData([...tempReqData].reverse())
                                editItem(item);
                            }}
                            className='relative text-center rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>)}

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

               
            </div>
        )
    }

    useEffect(() => {
        
        if(requirementsData.length>0)
        {
            setRenderItems(
                <div className='w-full overflow-y-auto'>
                    {[...requirementsData].reverse().map((item, index)=>RenderItem(item,index))}
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
    }, [requirementsData, editData])


    const RenderInputRow=()=>{
        return (
            // <div key={index} className={item.qty<item.minStock?"w-11/12 p-2 grid grid-cols-8 bg-red-400 rounded-xl bg-opacity-90 ring-2 ring-red-500":"w-11/12 p-2 grid grid-cols-8"}>
            <div  className='w-full grid grid-cols-7 gap-4'>
                <div className="flex w-full flex flex-col items-start justify-items-start">
                    <label className='text-sm'>Enter the date</label>
                    <input 
                        value={newRequirement.date}
                        onChange={e=>{
                            setNewRequirement({
                                ...newRequirement,
                                date: e.target.value
                            })
                        }}
                        type="date" 
                        className='w-full ring-2 ring-blue-200 bg-white h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    />
                </div> 

                <div className="flex w-full flex flex-col items-start justify-items-start">
                    <label className='text-sm'>Enter the article</label>
                    <select
                        onChange={e=>{
                            setNewRequirement({
                                ...newRequirement,
                                article: e.target.value
                            })
                        }}
                        value={newRequirement.article}
                        className='w-full ring-2 ring-blue-200 bg-white  h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    >
                        <option>- SELECT -</option>
                        {articleSelectList.map((item,index)=>(
                            <option key={index} value={item}>{item}</option>
                        ))}
                    </select>
                    {/* <input 
                        value={newRequirement.article}
                        onChange={e=>{
                            setNewRequirement({
                                ...newRequirement,
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
                            setNewRequirement({
                                ...newRequirement,
                                colour: e.target.value
                            })
                        }}
                        value={newRequirement.colour}
                        className='w-full ring-2 ring-blue-200 bg-white  h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    >
                        <option>- SELECT -</option>
                        {colourSelectList.map((item,index)=>(
                            <option key={index} value={item}>{item}</option>
                        ))}
                    </select>
                    {/* <input 
                        value={newRequirement.colour}
                        onChange={e=>{
                            setNewRequirement({
                                ...newRequirement,
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
                            setNewRequirement({
                                ...newRequirement,
                                model: e.target.value
                            })
                        }}
                        value={newRequirement.model}
                        className='w-full ring-2 ring-blue-200 bg-white  h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    >
                        <option>- SELECT -</option>
                        {modelSelectList.map((item,index)=>(
                            <option key={index} value={item}>{item}</option>
                        ))}
                    </select>
                    {/* <input 
                        value={newRequirement.model}
                        onChange={e=>{
                            setNewRequirement({
                                ...newRequirement,
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
                            setNewRequirement({
                                ...newRequirement,
                                category: e.target.value
                            })
                        }}
                        value={newRequirement.category}
                        className='w-full ring-2 ring-blue-200 bg-white  h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    >
                        <option>- SELECT -</option>
                        {categorySelectList.map((item,index)=>(
                            <option key={index} value={item}>{item}</option>
                        ))}
                    </select>
                    {/* <input 
                        value={newRequirement.category}
                        onChange={e=>{
                            setNewRequirement({
                                ...newRequirement,
                                category: e.target.value
                            })
                        }}
                        type="text" 
                        className='w-full ring-2 ring-blue-200 bg-white  h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    /> */}
                </div> 

                <div className="flex w-full flex flex-col items-start justify-items-start">
                    <label className='text-sm'>Enter the region</label>
                    <input 
                        value={newRequirement.region}
                        onChange={e=>{
                            setNewRequirement({
                                ...newRequirement,
                                region: e.target.value
                            })
                        }}
                        type="text" 
                        className='w-full ring-2 ring-blue-200 bg-white  h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    />
                </div> 

                <div className="flex w-full flex flex-col items-start justify-items-start">
                    <label className='text-sm'>Size grid</label>
                    <input 
                        value={newRequirement.sizeGrid}
                        onChange={e=>{
                            setNewRequirement({
                                ...newRequirement,
                                sizeGrid: e.target.value
                            })
                
                        }}
                        type="text" 
                        className='w-full ring-2 ring-blue-200 bg-white  h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    />
                </div>

                <div className="flex w-full flex flex-col items-start justify-items-start">
                    <label className='text-sm'>Case Qty</label>
                    <input 
                        value={newRequirement.caseQty}
                        onChange={e=>{
                            setNewRequirement({
                                ...newRequirement,
                                caseQty: e.target.value
                            })
                
                        }}
                        type="text" 
                        className='w-full ring-2 ring-blue-200 bg-white  h-7 pl-1 focus:outline-none focus:ring-blue-500 rounded'
                    />
                </div>

                <div className='col-span-2 flex items-end'>
                    <div 
                        onClick={()=>{RenderModal()}}
                        className='relative text-center w-full rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                    >
                        Enter packing combination
                    </div>
                </div>

                <div className='flex flex-row space-x-1  items-end'>
                    <div 
                        className='relative text-center rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                        onClick={()=>{
                            if(window.confirm("Update the knitting plan?"))
                                pushToDatabase()
                        }}
                    >
                        Submit
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="pb-2 bg-blue-50 h-full px-3 pt-4">
            {Modal&&(
                <div onClick={backdropClickHandler} className="bg-black z-20 bg-opacity-80 fixed inset-0 flex justify-center items-center">
                    {Modal}
                </div>)
            }

            <div className='w-full bg-white rounded p-3 my-2'>
                {/* <RenderInputRow/> */}
                {RenderInputRow()}
            </div>
            
            
            <div className="flex flex-col h-xlg space-y-2 items-center justify center items-center bg-white rounded p-4">
                <div className='flex flex-row justify-between w-full align-center'>
                    <div className='font-semibold text-lg'>Knitting Planning Sheet</div>

                    <button
                        className="text-sm font-medium text-blue-500 py-2 px-5 rounded ring-2 ring-blue-500 hover:bg-blue-500 hover:text-white"
                        onClick={()=>{DownloadExcel(spareData)}}
                    >
                            Export Excel
                    </button>
                </div>
                <div className="w-full sticky top-0 p-3 grid grid-cols-12 gap-1 bg-gray-200">
                    <div className="text-sm py-2 text-left">SI NO</div>
                    <div className="text-sm py-2 text-left">DATE</div>
                    <div className="text-sm py-2 text-left">ARTICLE</div>
                    <div className="text-sm py-2 text-left">COLOUR</div>
                    <div className="text-sm py-2 text-left">MODEL</div>
                    <div className="text-sm py-2 text-left">CATEGORY</div>
                    <div className="text-sm py-2 text-left">REGION</div>
                    <div className="text-sm py-2 text-left">SIZE GRID</div>
                    <div className="text-sm py-2 text-left">CASE QTY</div>
                    <div className="text-sm py-2 col-span-2 text-left">PACKING COMB</div>
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

export default RequirementEntry
