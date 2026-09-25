import './App.css';
import SpareIn from './SpareIn';
// import {
//   BrowserRouter as Router,
//   Switch,
//   Route,
//   Redirect
// } from "react-router-dom";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import SpareOut from './SpareOut';
import SpareView from './SpareView';
import AdminAdd from './AdminAdd';
import SpareHistory from './SpareHistory';
import AdminDelete from './AdminDelete';
import AdminEdit from './AdminEdit';
import UserMain from './UserMain';
import { useEffect, useState } from 'react';
import { auth } from "./firebase_config";
import AdminHome from './AdminHome';
import { ref, set, onValue } from "firebase/database";
import { db } from "./firebase_config";
import AdminAddExcel from './AdminAddExcel';
import UserLogin from './UserLogin';
import ResetPassword from './ResetPassword';
import HomePage from './HomePage';
import MainScreen from './MainScreen';
import KnittingPlan from './PlanningDesk/KnittingPlan';
import PreviousKnittingPlan from './PlanningDesk/PreviousKnittingPlan';
import ClickingPlan from './PlanningDesk/ClickingPlan';
import PreviousClickingPlan from './PlanningDesk/PreviousClickingPlan';
import PrintingPlan from './PlanningDesk/PrintingPlan';
import PreviousPrintingPlan from './PlanningDesk/PreviousPrintingPlan';
import StitchingPlan from './PlanningDesk/StitchingPlan';
import PreviousStitchingPlan from './PlanningDesk/PreviousStitchingPlan';
import StuckonPlan from './PlanningDesk/StuckonPlan';
import PreviousStuckonPlan from './PlanningDesk/PreviousStuckonPlan';
import DataEntry from './AdminDesk/DataEntry';
import RequirementEntry from './AdminDesk/RequirementEntry';
import BOMDataEntry from './AdminDesk/BomDataEntry';
import StockEntry from './AdminDesk/StockEntry';
import MaterialIssueEntry from './AdminDesk/MaterialOutward';
import MaterialInwardEntry from './AdminDesk/MaterialInward';
import ProcessPlan from './PlanningDesk/ProcessPlan';
import UserManagement from './AdminDesk/UserManagement';
import PackingCombination from './AdminDesk/PackingCombination';
import ArticleEntryHistory from './History/ArticleEntryHistory';
import FiuQc from './QCDepartment/FiuQc';
import LoopStock from './PlanningDesk/LoopStock';
import SfgStore from './MMDepartment/SfgStore';
import UserSettings from './UserSettings';
import Signup from './Signup';
import UserRequest from './UserRequest';
import ForgotPassword from './ForgotPassword';
import UserControl from './UserControl';
import { controlKey } from './userControls';

const DESIGNATED_ADMIN_EMAIL = 'ajimsha.albac@walkaroo.co.in';

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [preallocatedProcesses, setPreallocatedProcesses] = useState([]);
  const [accessMessage, setAccessMessage] = useState('');
  const [canAccessUserSettings, setCanAccessUserSettings] = useState(false);
  const [ribbonPermissions, setRibbonPermissions] = useState(null);
  const [permissionsConfigured, setPermissionsConfigured] = useState(false);
  const canAccessRibbon = (path, fallback = false) =>
    isAdmin || (permissionsConfigured
      ? Boolean(ribbonPermissions?.[controlKey(path)])
      : fallback);

  useEffect(() => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
          if (user) {
              setUser(user);

              // 
              const userRef = ref(db, `users/${user.uid}`);

              onValue(userRef, (snapshot) => {
                const data = snapshot.val() || {};
                  
                setUserRole(data.role); // Fetch and store user role
                setPreallocatedProcesses(data.preallocatedProcesses || []); // Fetch and store preallocated processes
                const isDesignatedAdmin = user.email.toLowerCase() === DESIGNATED_ADMIN_EMAIL;
                setIsAdmin(Boolean(data.admin) || isDesignatedAdmin)
                setCanAccessUserSettings(isDesignatedAdmin);
                setUserData(data)
                onValue(ref(db, 'userControls'), (controlsSnapshot) => {
                  const controls = controlsSnapshot.val() || {};
                  const userControls = controls.users?.[user.uid];
                  const departmentControls = data.department
                    ? controls.departments?.[encodeURIComponent(data.department)]
                    : null;
                  const activeControls = userControls || departmentControls;
                  setPermissionsConfigured(Boolean(activeControls));
                  setRibbonPermissions(activeControls?.permissions || null);
                });
                setAccessMessage(data.status === 'pending'
                  ? 'Your registration request is awaiting administrator approval.'
                  : data.status === 'rejected'
                    ? 'Your registration request was not approved.'
                    : data.status === 'removed'
                      ? 'Your account access has been removed.'
                    : '');
              });
          } else {
              setUser(null);
              setUserData(null);
              setAccessMessage('');
              setCanAccessUserSettings(false);
              setRibbonPermissions(null);
              setPermissionsConfigured(false);
          }
      });
      return unsubscribe;
  }, []);

  return (
    <div className="App bg-slate-100 h-screen">
      <BrowserRouter >
        <Routes >
            {!user&&(<Route path="/" element={<UserLogin userRole={userRole}/>} />)}
            {!user&&(<Route path="/signup" element={<Signup />} />)}
            {!user&&(<Route path="/forgot-password" element={<ForgotPassword />} />)}
            {!user&&(<Route path="/reset-password" element={<ResetPassword />} />)}
            {user && accessMessage && (
              <Route path="*" element={
                <div className="flex min-h-screen items-center justify-center p-6 text-center">
                  <div className="rounded bg-white p-8 shadow-md">
                    <h1 className="text-xl font-semibold">Account access unavailable</h1>
                    <p className="mt-3 text-gray-600">{accessMessage}</p>
                  </div>
                </div>
              } />
            )}
            {user && !accessMessage && (
            <Route path="/" element={<HomePage userRole={userRole} preallocatedProcesses={preallocatedProcesses} isAdmin={isAdmin} canAccessUserSettings={canAccessUserSettings} ribbonPermissions={ribbonPermissions} permissionsConfigured={permissionsConfigured}/>}>
              <Route index element={<MainScreen />} />
              {/* Spare Routes - Assuming accessible to all logged-in users for now */}
              <Route path="spareview" element={canAccessRibbon('spareview', true) ? <SpareView userRole={userRole} /> : <Navigate to="/" replace />} />
              <Route path="sparein" element={canAccessRibbon('sparein', true) ? <SpareIn userRole={userRole} /> : <Navigate to="/" replace />} />
              <Route path="spareout" element={canAccessRibbon('spareout', true) ? <SpareOut userRole={userRole} /> : <Navigate to="/" replace />} />
              <Route path="sparehistory" element={canAccessRibbon('sparehistory', true) ? <SpareHistory userRole={userRole} /> : <Navigate to="/" replace />}/>
              <Route path="history/article-entry" element={canAccessRibbon('history/article-entry', true) ? <ArticleEntryHistory /> : <Navigate to="/" replace />}/>
              {canAccessUserSettings && (
                <>
                  <Route path="user-settings/request" element={<UserRequest isAdmin={isAdmin} />}/>
                  <Route path="user-settings/control" element={<UserControl />}/>
                  <Route path="user-settings/password" element={<UserSettings section="Password Settings" />}/>
                </>
              )}
              <Route path="qc-department/fiu-qc" element={canAccessRibbon('qc-department/fiu-qc', true) ? <FiuQc /> : <Navigate to="/" replace />}/>

              {(isAdmin || userRole === 'PP Head' || userRole === 'Production Section Charge' || (permissionsConfigured && Object.keys(ribbonPermissions || {}).some((key) => key.startsWith('planning-desk%2F')))) && (
                <Route path="planning-desk">
                  <Route path="knitting-plan" element={canAccessRibbon('planning-desk/knitting-plan', userRole === 'PP Head' || userRole === 'Production Section Charge') ? <KnittingPlan userRole={userRole} preallocatedProcesses={preallocatedProcesses} /> : <Navigate to="/" replace />}/>
                  <Route path="previous-knitting-plan" element={canAccessRibbon('planning-desk/knitting-plan', userRole === 'PP Head' || userRole === 'Production Section Charge') ? <PreviousKnittingPlan userRole={userRole} preallocatedProcesses={preallocatedProcesses} /> : <Navigate to="/" replace />}/>
                  <Route path="clicking-plan" element={canAccessRibbon('planning-desk/clicking-plan', userRole === 'PP Head' || userRole === 'Production Section Charge') ? <ClickingPlan userRole={userRole} preallocatedProcesses={preallocatedProcesses} /> : <Navigate to="/" replace />}/>
                  <Route path="previous-clicking-plan" element={canAccessRibbon('planning-desk/clicking-plan', userRole === 'PP Head' || userRole === 'Production Section Charge') ? <PreviousClickingPlan userRole={userRole} preallocatedProcesses={preallocatedProcesses} /> : <Navigate to="/" replace />}/>
                  <Route path="printing-plan" element={canAccessRibbon('planning-desk/printing-plan', userRole === 'PP Head' || userRole === 'Production Section Charge') ? <PrintingPlan userRole={userRole} preallocatedProcesses={preallocatedProcesses} /> : <Navigate to="/" replace />}/>
                  <Route path="previous-printing-plan" element={canAccessRibbon('planning-desk/printing-plan', userRole === 'PP Head' || userRole === 'Production Section Charge') ? <PreviousPrintingPlan userRole={userRole} preallocatedProcesses={preallocatedProcesses} /> : <Navigate to="/" replace />}/>
                  <Route path="stitching-plan" element={canAccessRibbon('planning-desk/stitching-plan', userRole === 'PP Head' || userRole === 'Production Section Charge') ? <StitchingPlan userRole={userRole} preallocatedProcesses={preallocatedProcesses} /> : <Navigate to="/" replace />}/>
                  <Route path="previous-stitching-plan" element={canAccessRibbon('planning-desk/stitching-plan', userRole === 'PP Head' || userRole === 'Production Section Charge') ? <PreviousStitchingPlan userRole={userRole} preallocatedProcesses={preallocatedProcesses} /> : <Navigate to="/" replace />}/>
                  <Route path="stuckon-plan" element={canAccessRibbon('planning-desk/stuckon-plan', userRole === 'PP Head' || userRole === 'Production Section Charge') ? <StuckonPlan userRole={userRole} preallocatedProcesses={preallocatedProcesses} /> : <Navigate to="/" replace />}/>
                  <Route path="previous-stuckon-plan" element={canAccessRibbon('planning-desk/stuckon-plan', userRole === 'PP Head' || userRole === 'Production Section Charge') ? <PreviousStuckonPlan userRole={userRole} preallocatedProcesses={preallocatedProcesses} /> : <Navigate to="/" replace />}/>
                  <Route path="process-plan" element={canAccessRibbon('planning-desk/clicking-plan', userRole === 'PP Head' || userRole === 'Production Section Charge') ? <ProcessPlan userRole={userRole} preallocatedProcesses={preallocatedProcesses} /> : <Navigate to="/" replace />}/>
                  <Route path="loop-stock" element={<LoopStock />}/>
                </Route>
              )}
              
              {/* Admin Routes - Accessible only to admins */}
              {(isAdmin || (permissionsConfigured && Object.keys(ribbonPermissions || {}).some((key) => key.startsWith('admin%2F')))) && (
                <Route path="admin">
                  {isAdmin && <Route path="adminadd" element={<AdminAddExcel/>} />}
                  {isAdmin && <Route path="admindelete" element={<AdminDelete/>} />}
                  {isAdmin && <Route path="adminedit" element={<AdminEdit/>} />}
                  <Route path="data-entry" element={canAccessRibbon('admin/data-entry') ? <DataEntry/> : <Navigate to="/" replace />} />
                  <Route path="bom-data-entry" element={canAccessRibbon('admin/bom-data-entry') ? <BOMDataEntry /> : <Navigate to="/" replace />} />
                  <Route path="requirement-entry" element={canAccessRibbon('admin/requirement-entry') ? <RequirementEntry/> : <Navigate to="/" replace />} />
                  <Route path="packingcombination-entry" element={canAccessRibbon('admin/packingcombination-entry') ? <PackingCombination/> : <Navigate to="/" replace />} />
                  {isAdmin && <Route path="stock-entry" element={<StockEntry/>} />}
                  {isAdmin && <Route path="user-management" element={<UserManagement/>} />}
                </Route>
              )}

              {/* MM Department Routes - Accessible to MM Head and Store Incharge */}
              {(isAdmin || userRole === 'MM Head' || userRole === 'Store Incharge' || userRole === 'Production Section Charge' || (permissionsConfigured && Object.keys(ribbonPermissions || {}).some((key) => key.startsWith('mmdept%2F')))) && (
                <Route path="mmdept">
                  <Route path="stock-entry" element={canAccessRibbon('mmdept/stock-entry', true) ? <StockEntry user={userData}/> : <Navigate to="/" replace />}/>
                  <Route path="material-outward" element={canAccessRibbon('mmdept/material-outward', true) ? <MaterialIssueEntry userRole={userRole} /> : <Navigate to="/" replace />}/>
                 <Route path="material-inward" element={canAccessRibbon('mmdept/material-inward', true) ? <MaterialInwardEntry userRole={userRole} /> : <Navigate to="/" replace />}/>
                  <Route path="clicker-comp-store" element={canAccessRibbon('mmdept/clicker-comp-store', true) ? <SfgStore title="Clicker Comp Store" route="mmdept/clicker-comp-store" /> : <Navigate to="/" replace />}/>
                  <Route path="printing-comp-store" element={canAccessRibbon('mmdept/printing-comp-store', true) ? <SfgStore title="Printing Comp Store" route="mmdept/printing-comp-store" /> : <Navigate to="/" replace />}/>
                  <Route path="molding-receiving-store" element={canAccessRibbon('mmdept/molding-receiving-store', true) ? <SfgStore title="Molding Receiving Store" route="mmdept/molding-receiving-store" /> : <Navigate to="/" replace />}/>
               </Route>
             )}

            </Route>
            )}

            <Route path="*" element={<Navigate to="/" replace />} />

            {/* <Route path="/" exact>
              <UserMain setUser={setUser} user={user}/>
            </Route>

            <Route path="/sparein" exact>
              {user?<SpareIn/>:<Redirect to="/" />}
            </Route>

            <Route path="/spareout" exact>
              {user?<SpareOut/>:<Redirect to="/" />}
            </Route>

            <Route path="/spareview" exact>
              {user?<SpareView/>:<Redirect to="/" />}
            </Route>

            <Route path="/sparehistory" exact>
              {user?<SpareHistory/>:<Redirect to="/" />}
            </Route>

            <Route path="/admin" exact>
              {user&&isAdmin?<AdminHome setUser={setUser} user={user}/>:<Redirect to="/" />}
            </Route>

            <Route path="/adminAdd" exact>
              {user&&isAdmin?<AdminAddExcel/>:<Redirect to="/"/>}
            </Route>

            <Route path="/adminDelete" exact>
              {user&&isAdmin?<AdminDelete/>:<Redirect to="/"/>}
            </Route>

            <Route path="/adminEdit" exact>
              {user&&isAdmin?<AdminEdit/>:<Redirect to="/"/>}
            </Route> */}
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
