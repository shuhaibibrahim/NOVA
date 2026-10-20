import React, { useState } from 'react'
import {Outlet} from "react-router-dom";
import spareData from './DummyData';
import Header from './Header';
import Sidebar from './Sidebar';

function HomePage({setUser, userRole, preallocatedProcesses, isAdmin, canAccessUserSettings, ribbonPermissions, permissionsConfigured}) {

    const [selectedLink, setSelectedLink] = useState("")
    const [openedTab, setOpenedTab] = useState("")

    const [hideSideBar, setHideSideBar] = useState(false)

    return (
        <div className='home-page flex h-full min-h-0 flex-col'>
            <Header heading="N O V A" setUser={setUser} setHideSideBar={setHideSideBar}/>
            <div className='flex min-h-0 w-full flex-1 flex-row'>
                {/* <div className="p-12 flex flex-row items-center bg-blue-200 filter drop-shadow-lg w-full">
                    <div className="font-bold text-5xl w-full text-center text-gray-900">SPARE MANAGEMENT CONSOLE</div>
                </div> */}
                <div className={'flex flex-col items-start '+(hideSideBar?' sidebar-hidden ':' sidebar-visible ')}>
                    <div className={'w-96'}>
                        <Sidebar spareData={spareData} selectedLink={selectedLink} openedTab={openedTab} setOpenedTab={setOpenedTab} userRole={userRole} preallocatedProcesses={preallocatedProcesses} isAdmin={isAdmin} canAccessUserSettings={canAccessUserSettings} ribbonPermissions={ribbonPermissions} permissionsConfigured={permissionsConfigured} className={hideSideBar?'sidebar-content-hidden':''}/>
                    </div>
                </div>

                <div className={'h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden'}>
                    <Outlet context={[setSelectedLink, setOpenedTab]}/>
                </div>
            </div>
        </div>
    )
}

export default HomePage