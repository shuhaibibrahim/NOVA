<<<<<<< HEAD
import React from 'react'
import {Link} from "react-router-dom";
import spareData from './DummyData';
import Header from './Header';

function HomePage({setUser}) {
    return (
        <div className="h-full">
            {/* <div className="p-12 flex flex-row items-center bg-blue-200 filter drop-shadow-lg w-full">
                <div className="font-bold text-5xl w-full text-center text-gray-900">SPARE MANAGEMENT CONSOLE</div>
            </div> */}
            <Header heading="SPARE MANAGEMENT CONSOLE" setUser={setUser}/>
            
            <div className="flex justify-center items-center mt-24">
                <div className="h-11/12 w-11/12 grid grid-cols-4 gap-4">
                    <Link to="/sparein" state={{spareData:spareData}} className="home-button">
                        <div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-36 w-36" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
                            </svg>
                        </div>
                        <div className="font-bold text-2xl">SPARE IN</div>
                    </Link>
                    
                    <Link to="/spareout" state={{spareData:spareData}} className="home-button">
                        <div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-36 w-36" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                            </svg>
                        </div>
                        <div className="font-bold text-2xl">SPARE OUT</div>
                    </Link>

                    <Link to="/spareview" state={{spareData:spareData}} className="home-button">
                        <div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-36 w-36" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
                            </svg>
                        </div>
                        <div className="font-bold text-2xl">SPARE VIEW</div>
                    </Link>

                    <Link to="/admin" state={{spareData:spareData}} className="home-button">
                        <div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-36 w-36" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        </div>
                        <div className="font-bold text-2xl">ADMIN</div>
                    </Link>

=======
import React, { useState } from 'react'
import {Outlet} from "react-router-dom";
import spareData from './DummyData';
import Header from './Header';
import Sidebar from './Sidebar';

function HomePage({setUser}) {

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
                        <Sidebar spareData={spareData} selectedLink={selectedLink} openedTab={openedTab} setOpenedTab={setOpenedTab}/>
                    </div>
                </div>

                <div className={'h-full '+(hideSideBar?' w-full ':' w-10/12 ')}>
                    <Outlet context={[setSelectedLink, setOpenedTab]}/>
>>>>>>> dev
                </div>
            </div>
        </div>
    )
}

export default HomePage
