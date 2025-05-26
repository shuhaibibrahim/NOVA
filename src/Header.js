import React from 'react'
import { auth } from './firebase_config';

function Header({heading, setUser, setHideSideBar}) {
    
    const logout = () => {
        auth.signOut().then(() => {
            setUser(null);
        });
    };

    return (
        <div className=" py-4 pl-2 pr-4 flex flex-row items-center justify-between bg-primary filter drop-shadow-lg w-full">
            <div className='flex flex-row items-center'> {/* Added flex-row to align items horizontally */}
                 <div onClick={()=>{setHideSideBar(t=>!t)}} className='cursor-pointer pt-2 hover:opacity-80 mr-4'> {/* Added margin-right for spacing */}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6 text-white"> {/* Changed stroke to text-white */}
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                </div>
                <div className='flex flex-col text-white text-left'> {/* Changed text color to text-white */}
                    <div className="font-bold text-xl">
                    {heading}   
                    </div>
                </div>
                <div className='text-brandnote'>4 WALKAROO</div>
            </div>

            <button 
                className="text-blue-500 hover:text-blue-800 font-bold"
                onClick={logout}
            >
                    Logout
            </button>
        </div>
    )
}

export default Header