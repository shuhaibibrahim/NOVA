import React, { useState } from 'react'
import {Outlet} from "react-router-dom";
import spareData from './DummyData';
import Header from './Header';
import Sidebar from './Sidebar';

function HomePage({setUser, userRole, preallocatedProcesses}) {

    const [selectedLink, setSelectedLink] = useState("")
    const [openedTab, setOpenedTab] = useState("")

    const [hideSideBar, setHideSideBar] = useState(false)

    return (
        <div className='home-page h-full flex flex-col'>
            <Header heading="N O V A" setUser={setUser}/>
            <div className='flex h-full w-full flex-row'>
                {/* <div className="p-12 flex flex-row items-center bg-blue-200 filter drop-shadow-lg w-full">
                    <div className="font-bold text-5xl w-full text-center text-gray-900">SPARE MANAGEMENT CONSOLE</div>
                </div> */}
                <div className={'flex flex-col items-start '+(hideSideBar?' sidebar-hidden ':' sidebar-visible ')}>
                    <div onClick={()=>{setHideSideBar(t=>!t)}} className='cursor-pointer pt-2 hover:text-blue-500'>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </div>
                    <div className={'w-full '+(hideSideBar?'hidden':'')}>
                        <Sidebar spareData={spareData} selectedLink={selectedLink} openedTab={openedTab} setOpenedTab={setOpenedTab} userRole={userRole} preallocatedProcesses={preallocatedProcesses}/>
                    </div>
                </div>

                <div className={'h-full '+(hideSideBar?' w-full ':' w-10/12 ')}>
                    <Outlet context={[setSelectedLink, setOpenedTab]}/>
                </div>
            </div>
        </div>
    )
}

export default HomePage