import React from 'react'
import { auth } from './firebase_config';

function Header({heading, setUser}) {
    
    const logout = () => {
        auth.signOut().then(() => {
            setUser(null);
        });
    };

    return (
<<<<<<< HEAD
        <div className="p-12 flex flex-row items-center bg-blue-200 filter drop-shadow-lg w-full">
            <div className="font-bold text-5xl w-full text-center text-gray-900">{heading}</div>

            <button 
                className="self-end rounded-xl float-right p-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold"
=======
        <div className=" py-4 pl-2 pr-4 flex flex-row items-center justify-between bg-gray-100 filter drop-shadow-lg w-full">
            <div className='flex flex-col text-gray-900 text-left'>
                <div className="font-bold text-xl">
                    {heading}   
                </div>
                <div className='text-brandnote'>4 WALKAROO</div>
                {/* <div className='text-brandnote'>WALKAROO</div> */}
            </div>

            <button 
                className="text-blue-500 hover:text-blue-800 font-bold"
>>>>>>> dev
                onClick={logout}
            >
                    Logout
            </button>
        </div>
    )
}

export default Header
