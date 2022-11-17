import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { db} from "../firebase_config";
import { ref, set, push, onValue, remove } from "firebase/database";
import * as XLSX from 'xlsx';
import {fieldHeadings, fieldKeys} from "../Requirements"
import { ReactComponent as MenuDots} from "../VerticalDots.svg"


function DataEntry() {
    // const location = useLocation()
    // const {spareData}=location.state
    let navigate = useNavigate();

    const [setSelectedLink, setOpenedTab] = useOutletContext();
    useEffect(() => {
      setSelectedLink("admin/data-entry")
      setOpenedTab("adminDesk")
    }, [])
    

    const [articleData, setArticleData] = useState([])
    const [dispData, setDispData] = useState([]) //data displayed
    const [Modal, setModal] = useState(null)
    const [search, setSearch] = useState("")
    const [renderItems, setRenderItems] = useState(
        <div className="flex items-center justify-center w-full h-full">
            <div className="text-blue-300 text-5xl">Nothing here !</div>
        </div>
    )
    const [editData, setEditData] = useState({
        article:"",
        colour:"",
        model:"",
        category:"",
        size:""
    })
    const [editingInputElement, setEditingInputElement] = useState(null)

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

    const [newArticleData, setNewArticleData] = useState({
        article:"",
        colour:"",
        model:"",
        category:"",
        size:""
    })

    const deleteFromDatabase=(item)=>{

        if(window.confirm("Please confirm deleting "+item.article))
        {
            const articleRef = ref(db, `articleData/${item.id}`); 
        
            remove(articleRef).then(()=>{
                // alert("Removed article successfully")
            })
        }
    }

    const pushToDatabase = () => {
            // setUpdateLoad(true)

            const articleRef = ref(db, `articleData/`);
            const newArticleRef = push(articleRef);

            set(newArticleRef, {
                ...newArticleData,
                id:newArticleRef.key
            })
            .then((ref)=>{
                // setUpdateLoad(false)
                // alert("Successfully updated")

                // setNewArticleData({
                //     article:"",
                //     colour:"",
                //     model:"",
                //     category:"",
                //     size:""
                // })
            })
            .catch((error)=>{
                alert("Error while saving data : ",error)
                console.log(error)
            })            
    }

    const editItem = (item) => {
        // setUpdateLoad(true)
        item={...editData, id:item.id}

        const articleRef = ref(db, `articleData/${item.id}`);

        set(articleRef, {
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

    function DownloadExcel() {
        

        // const fields={
        //     "code" : "Code",
        //     "partName" : "Part Name",
        //     "partNumber" : "Part Number"
        // }

        const excelData=articleData.map(item=>{

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

    const Submenu =({item, index})=> {
        return (
            <div className="nav__submenu drop-shadow-sm rounded text-sm p-1 divide-y divide-gray-500">
                <div 
                    className="w-fit whitespace-nowrap px-2 py-1 font-medium cursor-pointer text-xs hover:bg-gray-200 hover:text-blue-500"
                    onClick={()=>{
                        setEditData({...item})
                        var tempArticleData=[...articleData].reverse()
                        tempArticleData[index].edit=true
                        setArticleData([...tempArticleData].reverse())
                    }}
                >
                    Edit
                </div>
                <div 
                    className="w-fit whitespace-nowrap px-2 py-1 font-medium cursor-pointer text-xs hover:bg-gray-200 hover:text-red-500"
                    onClick={()=>{
                        deleteFromDatabase(item);
                    }}
                >
                    Delete
                </div>
                <div>
                <Link to="../bom-data-entry" state={{articleItem:item}}>
                    <div className="w-fit whitespace-nowrap px-2 py-1 font-medium cursor-pointer text-xs hover:bg-gray-200 hover:text-green-500">
                        BOM Entry
                    </div>
                </Link>
                </div>
            </div>
        )
    }

    const RenderItem=(item, index)=>{

        return (
            // <div key={index} className={item.qty<item.minStock?"w-11/12 p-2 grid grid-cols-8 bg-red-400 rounded-xl bg-opacity-90 ring-2 ring-red-500":"w-11/12 p-2 grid grid-cols-8"}>
            <div key={index} className="grid grid-cols-7 gap-x-4 border-solid border-b border-gray-400 p-3 bg-gray-200" >
                <div className="flex items-center justify-center">
                    <div className="text-stone-900/30 w-10/12 break-all text-left">{index+1}</div>
                </div>

                {item.edit!=true&&(<>
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
                        <div className="text-stone-900/30 w-10/12 break-all text-left">
                            {item.size} <span className='text-md font-bold'>{item.sizeType}</span>
                        </div>
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



                    <div className="w-12/12 flex flex-row space-x-2 items-start justify-items-start">
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

                        <div className='flex flex-row space-x-2 items-center'>
                            <label className='flex flex-row items-center'>
                                <input 
                                    required
                                    name="sizeType"
                                    value={"IN"}
                                    onChange={e=>{
                                        setEditingInputElement(e.target)
                                        setEditData({
                                            ...editData,
                                            sizeType: e.target.value
                                        })
                                    }}
                                    type="radio" 
                                    // className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                                /><span>IN</span>
                            </label>

                            <label className='flex flex-row items-center'>
                                <input 
                                    required
                                    name="sizeType"
                                    value={"EU"}
                                    onChange={e=>{
                                        setEditingInputElement(e.target)
                                        setEditData({
                                            ...editData,
                                            sizeType: e.target.value
                                        })
                                    }}
                                    type="radio" 
                                    // className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                                /><span>EU</span>
                            </label>
                        </div>
                    </div>
                </>)}

                <div className='grid grid-cols-2 gap-x-2'>
                    {/* {item.edit!=true&&(<div 
                        onClick={()=>{
                            setEditData({...item})
                            var tempArticleData=[...articleData].reverse()
                            tempArticleData[index].edit=true
                            setArticleData([...tempArticleData].reverse())
                        }}
                        className='relative text-center rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                    </div>)} */}

                    {item.edit&&(<div 
                        onClick={()=>{
                            var tempArticleData=[...articleData].reverse()
                            tempArticleData[index].edit=false
                            setArticleData([...tempArticleData].reverse())
                            editItem(item);
                        }}
                        className='relative text-center rounded py-1 px-5 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>)}
{/* 
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
 */}
            
                    <div
                        className="nav__menu-item flex items-center"
                    >
                        {/* <a className=''><MenuDots className='h-6'/></a> */}
                        <div className='cursor-pointer bg-gray-300 rounded-full font-medium w-1/3 aspect-square'>
                            {/* <MenuDots className='h-3 '/> */}
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" fill="none"/><circle cx="128" cy="64" r="16"/><circle cx="128" cy="128" r="16"/><circle cx="128" cy="192" r="16"/></svg>
                        </div>
                        <Submenu item={item} index={index}/>
                    </div>
                </div>
               
            </div>
        )
    }

    const renderInputRow=()=>{
        return (
            // <div key={index} className={item.qty<item.minStock?"w-11/12 p-2 grid grid-cols-8 bg-red-400 rounded-xl bg-opacity-90 ring-2 ring-red-500":"w-11/12 p-2 grid grid-cols-8"}>
            <form 
                className='w-full grid grid-cols-7 gap-x-4 p-4 bg-blue-100'
                onSubmit={(e)=>{
                    e.preventDefault()
                    if(window.confirm("Please confirm entering the article"))
                        pushToDatabase();
                }}
            >
                <div className='text-left'>New Entry : </div>
                    <div className="flex w-full flex flex-col items-start justify-items-start">
                        <input 
                            required
                            value={newArticleData.article.toUpperCase()}
                            onChange={e=>{
                                setNewArticleData({
                                    ...newArticleData,
                                    article: e.target.value.toUpperCase()
                                })
                            }}
                            type="text" 
                            className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div> 

                    <div className="flex w-full flex flex-col items-start justify-items-start">
                        <input 
                            required
                            value={newArticleData.colour.toUpperCase()}
                            onChange={e=>{
                                setNewArticleData({
                                    ...newArticleData,
                                    colour: e.target.value.toUpperCase()
                                })
                            }}
                            type="text" 
                            className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div> 

                    <div className="flex w-full flex flex-col items-start justify-items-start">
                        <input 
                            required
                            value={newArticleData.model.toUpperCase()}
                            onChange={e=>{
                                setNewArticleData({
                                    ...newArticleData,
                                    model: e.target.value.toUpperCase()
                                })
                            }}
                            type="text" 
                            className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div> 

                    <div className="flex w-full flex flex-col items-start justify-items-start">
                        <input 
                            required
                            value={newArticleData.category.toUpperCase()}
                            onChange={e=>{
                                setNewArticleData({
                                    ...newArticleData,
                                    category: e.target.value.toUpperCase()
                                })
                            }}
                            type="text" 
                            className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />
                    </div> 

                    <div className="w-12/12 flex flex-row space-x-2 items-start justify-items-start">
                        <input 
                            required
                            value={newArticleData.size}
                            onChange={e=>{
                                setNewArticleData({
                                    ...newArticleData,
                                    size: e.target.value
                                })
                            }}
                            type="number" 
                            className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                        />

                        <div className='flex flex-row space-x-2 items-center'>
                            <label className='flex flex-row items-center'>
                                <input 
                                    required
                                    name="sizeType"
                                    value={"IN"}
                                    onChange={e=>{
                                        setNewArticleData({
                                            ...newArticleData,
                                            sizeType: e.target.value
                                        })
                                    }}
                                    type="radio" 
                                    // className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                                /><span>IN</span>
                            </label>

                            <label className='flex flex-row items-center'>
                                <input 
                                    required
                                    name="sizeType"
                                    value={"EU"}
                                    onChange={e=>{
                                        setNewArticleData({
                                            ...newArticleData,
                                            sizeType: e.target.value
                                        })
                                    }}
                                    type="radio" 
                                    // className='w-full ring-2 p-1 ring-blue-200 focus:outline-none focus:ring-blue-500 rounded'
                                /><span>EU</span>
                            </label>
                        </div>
                    </div> 

                    <div className='flex flex-row justify-center'>
                        <input
                            type="submit" 
                            className='self-center relative w-1/2 text-center rounded py-1 px-2 cursor-pointer bg-blue-500 hover:bg-blue-800 text-white font-medium'
                            value="Add"
                        />
                    </div>
            </form>
        )
    }

    useEffect(() => {
        
        if(articleData.length>0)
        {
            setRenderItems(
                <div className='w-full overflow-y-auto h-full'>
                    {[...articleData].reverse().map((item, index)=>RenderItem(item,index))}
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
    }, [articleData, editData])


    useEffect(() => {
        const articleRef = ref(db, 'articleData/');

        onValue(articleRef, (snapshot) => {
            const data = snapshot.val();
            // ;
            console.log(snapshot.val())
            if(data!=null)
            {
                var articleArray=[];
                for(var key in data)
                {
                    var item=data[key]
                    console.log(item)
                    articleArray.push(item)
                    // spareArray.push(item)
                }
                
                setArticleData([...articleArray])
            }
            else
                setArticleData([])
        });
    }, [])

    return (
        <div className="pb-2 pt-4 bg-blue-50 h-full px-3">
            
            <div className="flex flex-col h-3xl space-y-2 items-center justify center items-center bg-white rounded p-4">
                <div className='flex flex-row justify-between w-full align-center'>
                    <div className='font-semibold text-lg'>Data Entry</div>

                    {/* <button
                        className="text-sm font-medium text-blue-500 py-2 px-5 rounded ring-2 ring-blue-500 hover:bg-blue-500 hover:text-white"
                        onClick={()=>{DownloadExcel(spareData)}}
                    >
                            Export Excel
                    </button> */}
                </div>
                <div className="w-full sticky top-0 p-3 grid grid-cols-7 gap-x-4 bg-gray-200">
                    <div className="text-sm py-2 text-left">SI NO</div>
                    <div className="text-sm py-2 text-left">ARTICLE</div>
                    <div className="text-sm py-2 text-left">COLOUR</div>
                    <div className="text-sm py-2 text-left">MODEL</div>
                    <div className="text-sm py-2 text-left">CATEGORY</div>
                    <div className="text-sm py-2 text-left">SIZE</div>
                </div>

                {renderInputRow()}
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

export default DataEntry
