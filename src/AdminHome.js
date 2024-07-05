import React, { useState } from 'react'
import {Link} from "react-router-dom";
import Header from './Header';

function AdminHome({setUser}) {
    const [machine, setMachine] = useState("")
    return (
        <div className="h-full">
            {/* <div className="p-12 flex flex-row items-center bg-blue-200 filter drop-shadow-lg w-full">
                <div className="font-bold text-5xl w-full text-center text-gray-900">SPARE MANAGEMENT CONSOLE</div>
            </div> */}
            <Header heading="ADMIN CONSOLE" setUser={setUser}/>

            <div className="flex justify-center items-center mt-24">
                <div className="h-11/12 w-fit grid grid-cols-4 gap-4">
                    <Link to="/adminAdd" className="admin-home-button">
                        <div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-36 w-36 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="font-bold text-xl">ADD SPARE</div>
                    </Link>
                    
                    <Link to="/adminDelete" className="admin-home-button">
                        <div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-36 w-36 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <div className="font-bold text-xl">DELETE SPARE</div>
                    </Link>

                    <Link to="/adminEdit" className="admin-home-button">
                        <div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-36 w-36 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </div>
                        <div className="font-bold text-xl">EDIT SPARE</div>
                    </Link>

                    <div className="flex flex-col w-64 border-l-4 border-b-4 rounded-xl bg-green-300 hover:border-green-900 border-green-700 p-4 m-5 h-full items-start justify-center space-y-4">
                        <input
                            className='w-full rounded-xl ring ring-2 focus-outline-none ring-blue-200 p-3'
                            value={machine}
                            onChange={(e)=>{setMachine(e.target.value)}}
                        />
                        <div className="rounded-full bg-blue-600 hover:bg-blue-800 p-3 px-4 cursor-pointer text-white font-semibold">View Machines</div>
                    </div>

                </div>
            </div>
        </div>
    )
}

export default AdminHome
