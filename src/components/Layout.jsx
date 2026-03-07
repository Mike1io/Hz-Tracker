import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    PlusCircle,
    History,
    LogOut,
    Menu,
    X,
    Twitter,
    UserCircle,
    Activity,
    Newspaper,
} from 'lucide-react';
import { profileStorage } from '../lib/profileStorage';
import toast from 'react-hot-toast';

export default function Layout() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
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

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/login');
            toast.success('Signed out successfully');
        } catch {
            toast.error('Failed to sign out');
        }
    };

    const navItems = [
        { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
        { to: '/add-trade', icon: <PlusCircle size={20} />, label: 'Add Trade' },
        { to: '/history', icon: <History size={20} />, label: 'History' },
        { to: '/profile', icon: <UserCircle size={20} />, label: 'Account' },
        { to: '/market', icon: <Activity size={20} />, label: 'Market' },
        { to: '/news', icon: <Newspaper size={20} />, label: 'News' },
    ];

    return (
        <div className="app-layout">
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <Link to="/" className="logo">
                        <img src="/logo.jpg.png" alt="H-Tracker Logo" className="logo-img" />
                        <span className="logo-text">H-Tracker</span>
                    </Link>
                    <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
                        <X size={20} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <a
                        href="https://x.com/HTracker_"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="nav-link x-link"
                        style={{ marginBottom: '12px', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' }}
                    >
                        <Twitter size={18} />
                        <span>Follow on X</span>
                    </a>
                    <div className="user-info">
                        {profile.avatarUrl ? (
                            <img src={profile.avatarUrl} alt="Avatar" className="user-avatar-img" />
                        ) : (
                            <div className="user-avatar">
                                {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span className="user-email">{profile.displayName || user?.email}</span>
                    </div>
                    <button className="btn-signout" onClick={handleSignOut}>
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

            <main className="main-content">
                <header className="topbar">
                    <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
                        <Menu size={24} />
                    </button>
                    <Link to="/" className="topbar-logo">
                        <img src="/logo.jpg.png" alt="H-Tracker Logo" className="topbar-logo-img" />
                        <span>H-Tracker</span>
                    </Link>
                </header>
                <div className="page-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
