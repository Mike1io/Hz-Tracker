import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, ArrowRight, Eye, EyeOff, ChevronLeft, Twitter } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const location = useLocation();
    const [view, setView] = useState(location.state?.isSignUp ? 'signup' : 'login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { signIn, signUp, resetPassword, updateUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (location.state?.isSignUp !== undefined) {
            setView(location.state.isSignUp ? 'signup' : 'login');
        }

        // Check for password recovery hash on initial load
        if (window.location.hash && window.location.hash.includes('type=recovery')) {
            setView('update-password');
        }

        // Listen for PASSWORD_RECOVERY event
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setView('update-password');
            }
        });

        return () => subscription.unsubscribe();
    }, [location]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (view === 'signup') {
                await signUp(email, password);
                toast.success('Account created! Check your email to confirm.');
            } else if (view === 'login') {
                await signIn(email, password);
                toast.success('Welcome back!');
                navigate('/dashboard');
            } else if (view === 'forgot') {
                await resetPassword(email);
                toast.success('Password reset email sent! Check your inbox.');
                setView('login');
            } else if (view === 'update-password') {
                await updateUser({ password: newPassword });
                toast.success('Password updated successfully!');
                navigate('/dashboard');
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        if (view === 'signup') return 'Create your trading journal';
        if (view === 'login') return 'Welcome back, trader';
        if (view === 'update-password') return 'Set new password';
        return 'Reset your password';
    };

    return (
        <div className="login-page">
            <div className="login-bg">
                <div className="bg-gradient-1" />
                <div className="bg-gradient-2" />
                <div className="bg-grid" />
            </div>

            <div className="login-container">
                <div className="login-card">
                    {(view === 'forgot' || view === 'update-password') && (
                        <button
                            className="back-btn"
                            onClick={() => setView('login')}
                            style={{
                                position: 'absolute',
                                left: '20px',
                                top: '24px',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.9rem',
                                padding: 0
                            }}
                        >
                            <ChevronLeft size={18} /> Back
                        </button>
                    )}

                    <div className="login-header">
                        <div className="login-logo">
                            <img src="/logo.jpg.png" alt="H-Tracker Logo" />
                        </div>
                        <h1>H-Tracker</h1>
                        <p>{getTitle()}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        {view !== 'update-password' && (
                            <div className="input-group">
                                <Mail size={18} className="input-icon" />
                                <input
                                    type="email"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        {view !== 'forgot' && view !== 'update-password' && (
                            <div className="input-group">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        )}

                        {view === 'update-password' && (
                            <div className="input-group">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="New Password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        )}

                        {view === 'login' && (
                            <div style={{ textAlign: 'right', marginTop: '-8px', marginBottom: '16px' }}>
                                <button
                                    type="button"
                                    className="btn-link"
                                    onClick={() => setView('forgot')}
                                    style={{ fontSize: '0.85rem' }}
                                >
                                    Forgot your password?
                                </button>
                            </div>
                        )}

                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? (
                                <div className="btn-spinner" />
                            ) : (
                                <>
                                    {view === 'signup' ? 'Create Account' :
                                        view === 'login' ? 'Sign In' :
                                            view === 'update-password' ? 'Update Password' :
                                                'Send Reset Link'}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="login-footer">
                        {view !== 'forgot' && view !== 'update-password' ? (
                            <p>
                                {view === 'signup' ? 'Already have an account?' : "Don't have an account?"}
                                <button
                                    className="btn-link"
                                    onClick={() => setView(view === 'signup' ? 'login' : 'signup')}
                                >
                                    {view === 'signup' ? 'Sign In' : 'Sign Up'}
                                </button>
                            </p>
                        ) : (
                            <p>
                                {view === 'update-password' ? 'Need to login instead?' : 'Remember your password?'}
                                <button
                                    className="btn-link"
                                    onClick={() => setView('login')}
                                >
                                    Sign In
                                </button>
                            </p>
                        )}

                        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '24px', display: 'flex', justifyContent: 'center' }}>
                            <a
                                href="https://x.com/HTracker_"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 24px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.95rem',
                                    fontWeight: '500',
                                    transition: 'all 0.2s ease',
                                    textDecoration: 'none'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                    e.currentTarget.style.borderColor = 'var(--border-light)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                    e.currentTarget.style.borderColor = 'var(--border)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <Twitter size={20} style={{ color: 'var(--accent)' }} />
                                <span>Follow on X</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
