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
import HomePage from './HomePage';
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

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [preallocatedProcesses, setPreallocatedProcesses] = useState([]);

  useEffect(() => {
      auth.onAuthStateChanged((user) => {
          if (user) {
              setUser(user);

              // 
              const userRef = ref(db, `users/${user.uid}`);

              onValue(userRef, (snapshot) => {
                const data = snapshot.val();
                ;
                  
                setUserRole(data.role); // Fetch and store user role
                setPreallocatedProcesses(data.preallocatedProcesses || []); // Fetch and store preallocated processes
                setIsAdmin(data.admin)
                setUserData(data)
                console.log(data)
                // console.log(data.admin)
              });
          } else {
              setUser(null);
          }
      });
  }, []);

  return (
    <div className="App bg-slate-100 h-screen">
      <BrowserRouter >
        <Routes >
            {!user&&(<Route path="/" element={<UserLogin userRole={userRole}/>} />)}
            {user&&(
            <Route path="/" element={<HomePage userRole={userRole} preallocatedProcesses={preallocatedProcesses} isAdmin={isAdmin}/>}>
              <Route index element={<SpareView/>} />
              {/* Spare Routes - Assuming accessible to all logged-in users for now */}
              <Route path="spareview" element={<SpareView userRole={userRole} />} />
              <Route path="sparein" element={<SpareIn userRole={userRole} />} />
              <Route path="spareout" element={<SpareOut userRole={userRole} />} />
              <Route path="sparehistory" element={<SpareHistory userRole={userRole} />}/>

              {(isAdmin || userRole === 'PP Head' || userRole === 'Production Section Charge') && (
                <Route path="planning-desk">
                  <Route path="knitting-plan" element={<KnittingPlan userRole={userRole} preallocatedProcesses={preallocatedProcesses} />}/>
                  <Route path="previous-knitting-plan" element={<PreviousKnittingPlan userRole={userRole} preallocatedProcesses={preallocatedProcesses} />}/>
                  <Route path="clicking-plan" element={<ClickingPlan userRole={userRole} preallocatedProcesses={preallocatedProcesses} />}/>
                  <Route path="previous-clicking-plan" element={ <PreviousClickingPlan userRole={userRole} preallocatedProcesses={preallocatedProcesses} /> }/>
                  <Route path="printing-plan" element={<PrintingPlan userRole={userRole} preallocatedProcesses={preallocatedProcesses} />}/>
                  <Route path="previous-printing-plan" element={<PreviousPrintingPlan userRole={userRole} preallocatedProcesses={preallocatedProcesses} />}/>
                  <Route path="stitching-plan" element={<StitchingPlan userRole={userRole} preallocatedProcesses={preallocatedProcesses} />}/>
                  <Route path="previous-stitching-plan" element={<PreviousStitchingPlan userRole={userRole} preallocatedProcesses={preallocatedProcesses} />}/>
                  <Route path="stuckon-plan" element={<StuckonPlan userRole={userRole} preallocatedProcesses={preallocatedProcesses} />}/>
                  <Route path="previous-stuckon-plan" element={<PreviousStuckonPlan userRole={userRole} preallocatedProcesses={preallocatedProcesses} />}/>
                  <Route path="process-plan" element={<ProcessPlan userRole={userRole} preallocatedProcesses={preallocatedProcesses} />}/>
                </Route>
              )}
              
              {/* Admin Routes - Accessible only to admins */}
              {isAdmin && (
                <Route path="admin">
                  <Route path="adminadd" element={<AdminAddExcel/>} />
                  <Route path="admindelete" element={<AdminDelete/>} />
                  <Route path="adminedit" element={<AdminEdit/>} />
                  <Route path="data-entry" element={<DataEntry/>}/>
                  <Route path="bom-data-entry" element={<BOMDataEntry />}/>
                  <Route path="requirement-entry" element={<RequirementEntry/>}/>
                  <Route path="stock-entry" element={<StockEntry/>}/>
                  <Route path="packingcombination-entry" element={<PackingCombination/>}/>
                  <Route path="user-management" element={<UserManagement/>}/>
                </Route>
              )}

              {/* MM Department Routes - Accessible to MM Head and Store Incharge */}
              {(isAdmin || userRole === 'MM Head' || userRole === 'Store Incharge' || userRole === 'Production Section Charge') && (
                <Route path="mmdept">
                  <Route path="stock-entry" element={<StockEntry user={userData}/>}/>
                  <Route path="material-outward" element={<MaterialIssueEntry userRole={userRole} />}/>
                 <Route path="material-inward" element={<MaterialInwardEntry userRole={userRole} />}/>
               </Route>
             )}

            </Route>
            )}

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
