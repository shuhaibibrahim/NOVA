import React, { useState } from 'react'
import {Outlet} from "react-router-dom";
import spareData from './DummyData';
import Header from './Header';
import Sidebar from './Sidebar';

function HomePage({setUser}) {

    const [selectedLink, setSelectedLink] = useState("")

    return (
        <div className='h-screen flex flex-col'>
            <Header heading="N O V A" setUser={setUser}/>
            <div className='flex h-full w-full flex-row'>
                {/* <div className="p-12 flex flex-row items-center bg-blue-200 filter drop-shadow-lg w-full">
                    <div className="font-bold text-5xl w-full text-center text-gray-900">SPARE MANAGEMENT CONSOLE</div>
                </div> */}
                <div className='w-2/12'>
                    <Sidebar spareData={spareData} selectedLink={selectedLink}/>
                </div>

                <div className='w-10/12 h-full'>
                    <Outlet context={[setSelectedLink]}/>
                </div>
            </div>
        </div>
    )
}

export default HomePage
