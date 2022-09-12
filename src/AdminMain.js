import React from 'react'
import AdminLogin from './AdminLogin';
import AdminHome from './AdminHome';

function AdminMain({user, setUser}) {

    return (
        // <div className="h-full min-h-screen flex items-center justify-center">
        <>
            {!user?<AdminLogin/>:<AdminHome setUser={setUser}/>}
        </>
        // </div>
    )
}

export default AdminMain;
