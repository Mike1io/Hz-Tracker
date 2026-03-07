import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { profileStorage } from '../lib/profileStorage';

export default function PublicHeader() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState({ displayName: '', avatarUrl: '' });

    const loadProfile = () => {
        if (user) {
            setProfile(profileStorage.getProfile(user.id));
        }
    };

    useEffect(() => {
        loadProfile();
        window.addEventListener('profileUpdated', loadProfile);
        return () => window.removeEventListener('profileUpdated', loadProfile);
    }, [user]);

    return (
        <header className="public-header">
            <div className="container">
                <div className="header-content">
                    <Link to="/" className="brand">
                        <img src="/logo.jpg.png" alt="H-Tracker Logo" className="brand-logo" />
                        <span className="brand-text">H-Tracker</span>
                    </Link>

                    <nav className="auth-nav">
                        {user ? (
                            <div className="header-user-section">
                                <Link to="/dashboard" className="btn-dashboard-link">
                                    <LayoutDashboard size={18} />
                                    <span>Dashboard</span>
                                </Link>
                                <Link to="/profile" className="header-user-info">
                                    {profile.avatarUrl ? (
                                        <img src={profile.avatarUrl} alt="Avatar" className="user-avatar-img-sm" />
                                    ) : (
                                        <div className="user-avatar-sm">
                                            {profile.displayName
                                                ? profile.displayName.charAt(0).toUpperCase()
                                                : user?.email?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <span className="user-name-sm">{profile.displayName || user?.email?.split('@')[0]}</span>
                                </Link>
                            </div>
                        ) : (
                            <>
                                <button
                                    className="btn-text"
                                    onClick={() => navigate('/login', { state: { isSignUp: false } })}
                                >
                                    Log In
                                </button>
                                <button
                                    className="btn-primary-sm"
                                    onClick={() => navigate('/login', { state: { isSignUp: true } })}
                                >
                                    Sign Up
                                </button>
                            </>
                        )}
                    </nav>
                </div>
            </div>
        </header>
    );
}
