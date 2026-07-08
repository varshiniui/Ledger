import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
  const { user, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-ink/50 text-sm">Loading…</p>
      </div>
    );
  }

  if (user) return <Dashboard />;

  return showLogin ? (
    <Login />
  ) : (
    <LandingPage onGetStarted={() => setShowLogin(true)} />
  );
}