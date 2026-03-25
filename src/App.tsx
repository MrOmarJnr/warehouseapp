import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Search,
  User as UserIcon,
  Users,
  PlusCircle
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import WorkOrderList from './components/WorkOrderList';
import WorkOrderDetails from './components/WorkOrderDetails';
import CreateWorkOrder from './components/CreateWorkOrder';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import { User } from './types';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { userService } from './services/userService';
import { cn } from './lib/utils';

import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Bootstrap admin if no users exist
    userService.bootstrapAdmin().catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userData = await userService.getUser(firebaseUser.uid);
          setUser(userData);
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={(u) => setUser(u)} />;
  }

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: ClipboardList, label: 'Work Orders', path: '/work-orders' },
  ];

  if (user.role === 'SUPER_ADMIN') {
    navItems.push({ icon: Users, label: 'User Management', path: '/users' });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 transition-transform duration-300 ease-in-out transform lg:relative lg:translate-x-0",
        !isSidebarOpen && "-translate-x-full lg:w-20"
      )}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 px-2 mb-10">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 shrink-0">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            {isSidebarOpen && <span className="text-xl font-bold text-gray-900 tracking-tight truncate">LEF Warehouse MS</span>}
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group",
                  location.pathname === item.path 
                    ? 'bg-indigo-50 text-indigo-600 shadow-sm' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
                  !isSidebarOpen && "justify-center px-0"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-colors",
                  location.pathname === item.path ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'
                )} />
                {isSidebarOpen && <span className="font-bold text-sm">{item.label}</span>}
              </Link>
            ))}
          </nav>

          <div className="pt-6 border-t border-gray-50 space-y-4">
              <div className={cn(
                "px-4 py-4 bg-gray-50 rounded-2xl flex items-center gap-3",
                !isSidebarOpen && "justify-center px-0"
              )}>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 font-bold shadow-sm shrink-0">
                  {user.firstName.charAt(0)}
                </div>
                {isSidebarOpen && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-gray-500 truncate">{user.role.replace('_', ' ')}</p>
                  </div>
                )}
              </div>
            <button 
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 text-red-500 hover:bg-red-50 rounded-2xl transition-all font-bold text-sm group",
                !isSidebarOpen && "justify-center px-0"
              )}
            >
              <LogOut className="w-5 h-5 text-red-400 group-hover:text-red-500" />
              {isSidebarOpen && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-50 rounded-xl transition-all"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
          
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-gray-100 mx-2"></div>
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-gray-500">@{user.username}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
                {user.firstName.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard user={user} />} />
              <Route path="/work-orders" element={<WorkOrderList user={user} />} />
              <Route path="/work-orders/new" element={<CreateWorkOrder user={user} />} />
              <Route path="/work-orders/:id" element={<WorkOrderDetails user={user} />} />
              {user.role === 'SUPER_ADMIN' && (
                <Route path="/users" element={<UserManagement />} />
              )}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}
