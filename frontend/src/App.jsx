import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

export default function App() {
  const { user, loading } = useAuth();
  const [view, setView] = useState('landing');

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-ink/50 text-sm">Loading…</p>
      </div>
    );
  }

  if (user) return <Dashboard />;

  if (view === 'login') {
    return <Login onSwitchToRegister={() => setView('register')} />;
  }
  if (view === 'register') {
    return <Register onSwitchToLogin={() => setView('login')} />;
  }
  return <LandingPage onGetStarted={() => setView('login')} />;
}