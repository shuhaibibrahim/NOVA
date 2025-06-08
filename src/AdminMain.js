import React from 'react'
import AdminLogin from './AdminLogin';
import AdminHome from './AdminHome';
import UserManagement from './AdminDesk/UserManagement';

function AdminMain({user, setUser}) {

    return (
        <>
            {!user ? <AdminLogin /> : <AdminHome setUser={setUser} />}
        </>
    )
}

export default AdminMain;
