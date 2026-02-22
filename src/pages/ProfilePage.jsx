import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileStorage } from '../lib/profileStorage';
import { User, Image as ImageIcon, Save, CheckCircle, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [credLoading, setCredLoading] = useState(false);
    const [credSuccess, setCredSuccess] = useState(false);

    const [form, setForm] = useState({
        displayName: '',
        avatarUrl: ''
    });

    const [credentials, setCredentials] = useState({
        email: '',
        password: ''
    });
    useEffect(() => {
        if (user) {
            const p = profileStorage.getProfile(user.id);
            setForm({
                displayName: p.displayName || '',
                avatarUrl: p.avatarUrl || ''
            });
            setCredentials(prev => ({ ...prev, email: user.email }));
        }
    }, [user]);

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleCredChange = (field, value) => {
        setCredentials((prev) => ({ ...prev, [field]: value }));
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm((prev) => ({ ...prev, avatarUrl: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const result = profileStorage.saveProfile(user.id, {
            displayName: form.displayName,
            avatarUrl: form.avatarUrl
        });

        setLoading(false);

        if (result.error) {
            toast.error('Failed to save account');
        } else {
            setSuccess(true);
            toast.success('Account updated');
            setTimeout(() => setSuccess(false), 2000);
        }
    };

    const handleCredentialSubmit = async (e) => {
        e.preventDefault();

        if (!credentials.email && !credentials.password) {
            toast.error('Please enter an email or password to update.');
            return;
        }

        setCredLoading(true);

        try {
            const updates = {};
            if (credentials.email && credentials.email !== user.email) updates.email = credentials.email;
            if (credentials.password) updates.password = credentials.password;

            if (Object.keys(updates).length > 0) {
                await updateUser(updates);
                setCredSuccess(true);
                toast.success('Security details updated! Check your email if you changed your address.');
                setTimeout(() => setCredSuccess(false), 2000);
                setCredentials(prev => ({ ...prev, password: '' })); // Clear password field
            }
        } catch (error) {
            toast.error(error.message || 'Failed to update credentials');
        } finally {
            setCredLoading(false);
        }
    };

    // Preview logic
    const defaultInitial = form.displayName
        ? form.displayName.charAt(0).toUpperCase()
        : user?.email?.charAt(0).toUpperCase();

    return (
        <div className="profile-page">
            <div className="page-header">
                <h1>User Account</h1>
                <p className="page-subtitle">Manage your personal information</p>
            </div>

            <div className="trade-form-card" style={{ maxWidth: '600px' }}>
                <form onSubmit={handleSubmit} className={`trade-form ${success ? 'success' : ''}`}>
                    {success && (
                        <div className="success-overlay">
                            <CheckCircle size={48} />
                            <p>Account Saved!</p>
                        </div>
                    )}

                    <div className="profile-preview" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
                        <div
                            className="preview-avatar"
                            style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '20px',
                                background: form.avatarUrl ? `url(${form.avatarUrl}) center/cover` : 'linear-gradient(135deg, var(--purple), var(--accent))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2rem',
                                fontWeight: '700',
                                color: '#fff',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                flexShrink: 0
                            }}
                        >
                            {!form.avatarUrl && defaultInitial}
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.4rem', marginBottom: '4px', fontFamily: '"Space Grotesk", sans-serif' }}>
                                {form.displayName || user?.email.split('@')[0]}
                            </h2>
                            <p style={{ color: 'var(--text-secondary)' }}>{user?.email}</p>
                        </div>
                    </div>

                    <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                        <div className="form-group">
                            <label>
                                <User size={16} />
                                Display Name
                            </label>
                            <input
                                type="text"
                                placeholder="How should we call you?"
                                value={form.displayName}
                                onChange={(e) => handleChange('displayName', e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label>
                                <ImageIcon size={16} />
                                Profile Picture
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                style={{
                                    padding: '10px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text)',
                                    cursor: 'pointer'
                                }}
                            />
                            <span className="form-hint">Select an image from your device. Leave blank to use initials.</span>
                        </div>
                    </div>

                    <div className="form-actions" style={{ marginTop: '30px' }}>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? (
                                <div className="btn-spinner" />
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <div className="page-header" style={{ marginTop: '40px' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Security Settings</h2>
                <p className="page-subtitle" style={{ margin: 0 }}>Update your login credentials</p>
            </div>

            <div className="trade-form-card" style={{ maxWidth: '600px', marginBottom: '40px' }}>
                <form onSubmit={handleCredentialSubmit} className={`trade-form ${credSuccess ? 'success' : ''}`}>
                    {credSuccess && (
                        <div className="success-overlay">
                            <CheckCircle size={48} />
                            <p>Details Updated!</p>
                        </div>
                    )}

                    <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                        <div className="form-group">
                            <label>
                                <Mail size={16} />
                                Email Address
                            </label>
                            <input
                                type="email"
                                placeholder="Your email address"
                                value={credentials.email}
                                onChange={(e) => handleCredChange('email', e.target.value)}
                            />
                            <span className="form-hint">Changing your email will require verification.</span>
                        </div>

                        <div className="form-group">
                            <label>
                                <Lock size={16} />
                                New Password
                            </label>
                            <input
                                type="password"
                                placeholder="Leave blank to keep current password"
                                value={credentials.password}
                                onChange={(e) => handleCredChange('password', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-actions" style={{ marginTop: '30px' }}>
                        <button type="submit" className="btn-primary" disabled={credLoading}>
                            {credLoading ? (
                                <div className="btn-spinner" />
                            ) : (
                                <>
                                    <Save size={18} />
                                    Update Security Data
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
