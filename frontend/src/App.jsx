import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './css/App.css';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './components/Dashboard';
import ReportPage from './components/ReportPage';
import ClientList from './components/ClientList';
import ClientDocuments from './components/ClientDocuments';
import ClientEdit from './components/ClientEdit';
import ReminderSettings from './components/ReminderSettings';
import DocumentStatus from './components/DocumentStatus';
import UserManagement from './pages/UserManagement';
import CommunicationLogs from './components/CommunicationLogs';
import { 
  selectToken, 
  selectUser,
  selectLastPath, 
  selectInitialDataLoaded,
  setLastPath,
  logout,
  verifyAuth
} from './redux/authSlice';

function App() {
  return (
    <div className="App">
      <Header />
      <div className="content-container">
        <AppRoutes />
      </div>
      <ToastContainer 
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}

function AppRoutes() {
  const token = useSelector(selectToken);
  const user = useSelector(selectUser);
  const lastPath = useSelector(selectLastPath);
  const initialDataLoaded = useSelector(selectInitialDataLoaded);
  const dispatch = useDispatch();
  
  const location = useLocation();
  const navigate = useNavigate();
  const [initializing, setInitializing] = useState(true);
  
  // Track current path for restoring on reload/login
  useEffect(() => {
    if (token && location.pathname !== '/login') {
      dispatch(setLastPath(location.pathname));
    }
  }, [token, location.pathname, dispatch]);
  
  // Verify authentication on app load
  useEffect(() => {
    const verifyAuthentication = async () => {
      // Skip verification for login page
      if (location.pathname === '/login') {
        setInitializing(false);
        return;
      }
      
      // If no token exists, redirect to login
      if (!token) {
        setInitializing(false);
        return;
      }
      
      try {
        // Verify token with server
        await dispatch(verifyAuth()).unwrap();
        setInitializing(false);
      } catch (error) {
        console.error('Authentication verification failed:', error);
        // Already handled in the slice
        setInitializing(false);
      }
    };
    
    verifyAuthentication();
  }, [token, dispatch, location.pathname]);
  
  // Redirect to last path on login
  useEffect(() => {
    if (token && initialDataLoaded && location.pathname === '/login') {
      navigate(lastPath);
    }
  }, [token, initialDataLoaded, lastPath, location.pathname, navigate]);

  // Show loading state during initialization
  if (initializing) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading application...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={token ? <Dashboard /> : <Navigate to="/login" />} />
      <Route path="/reports" element={token ? <ReportPage /> : <Navigate to="/login" />} />
      <Route path="/status" element={token ? <DocumentStatus /> : <Navigate to="/login" />} />
      
      {/* Client management routes */}
      <Route path="/clients" element={token ? <ClientList /> : <Navigate to="/login" />} />
      <Route path="/client/:clientId/documents" element={token ? <ClientDocuments /> : <Navigate to="/login" />} />
      <Route path="/client/:clientId/edit" element={token ? <ClientEdit /> : <Navigate to="/login" />} />
      <Route path="/settings" element={token ? <ReminderSettings /> : <Navigate to="/login" />} />
      <Route path="/users" element={token ? <UserManagement /> : <Navigate to="/login" />} />
      <Route path="/logs" element={token ? <CommunicationLogs /> : <Navigate to="/login" />} />
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
