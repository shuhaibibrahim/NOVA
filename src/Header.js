import React from 'react'
import { auth } from './firebase_config';

function Header({heading, setUser}) {
    
    const logout = () => {
        auth.signOut().then(() => {
            setUser(null);
        });
    };

    return (
        <div className="p-12 flex flex-row items-center bg-blue-200 filter drop-shadow-lg w-full">
            <div className="font-bold text-5xl w-full text-center text-gray-900">{heading}</div>

            <button 
                className="self-end rounded-xl float-right p-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold"
                onClick={logout}
            >
                    Logout
            </button>
        </div>
    )
}

export default Header
