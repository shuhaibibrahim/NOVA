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
            <Header heading="N O V A" setUser={setUser} setHideSideBar={setHideSideBar}/>
            <div className='flex h-full w-full flex-row'>
                {/* <div className="p-12 flex flex-row items-center bg-blue-200 filter drop-shadow-lg w-full">
                    <div className="font-bold text-5xl w-full text-center text-gray-900">SPARE MANAGEMENT CONSOLE</div>
                </div> */}
                <div className={'flex flex-col items-start '+(hideSideBar?' sidebar-hidden ':' sidebar-visible ')}>
                    <div className={'w-full '}>
                        <Sidebar spareData={spareData} selectedLink={selectedLink} openedTab={openedTab} setOpenedTab={setOpenedTab} userRole={userRole} preallocatedProcesses={preallocatedProcesses} className={hideSideBar?'sidebar-content-hidden':''}/>
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