import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tradeStorage } from '../lib/tradeStorage';
import { useAuth } from '../context/AuthContext';
import { sendTelegramNotification } from '../lib/telegramNotify';
import {
    Calendar,
    Coins,
    ArrowUpDown,
    DollarSign,
    FileText,
    Send,
    CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ASSETS = ['USDT', 'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC', 'LINK', 'UNI', 'Other'];
const TRADE_TYPES = ['Long', 'Short', 'Spot'];

export default function AddTradePage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        asset: 'USDT',
        customAsset: '',
        trade_type: 'Long',
        amount: '',
        notes: '',
    });

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const asset = form.asset === 'Other' ? form.customAsset.toUpperCase() : form.asset;
        if (!asset) {
            toast.error('Please enter an asset name');
            setLoading(false);
            return;
        }

        const tradeData = {
            user_id: user.id,
            date: form.date,
            asset,
            trade_type: form.trade_type,
            amount: parseFloat(form.amount),
            notes: form.notes || null,
        };

        const { error } = await tradeStorage.insertTrade(user.id, tradeData);

        if (error) {
            toast.error('Failed to save trade: ' + error.message);
            setLoading(false);
            return;
        }

        // Send Telegram notification (non-blocking)
        sendTelegramNotification(tradeData);

        setSuccess(true);
        toast.success('Trade added successfully!');

        setTimeout(() => {
            setSuccess(false);
            setForm({
                date: new Date().toISOString().split('T')[0],
                asset: 'USDT',
                customAsset: '',
                trade_type: 'Long',
                amount: '',
                notes: '',
            });
            setLoading(false);
        }, 1500);
    };

    return (
        <div className="add-trade-page">
            <div className="page-header">
                <h1>Add Trade</h1>
                <p className="page-subtitle">Record a new trade entry</p>
            </div>

            <div className="trade-form-card">
                <form onSubmit={handleSubmit} className={`trade-form ${success ? 'success' : ''}`}>
                    {success && (
                        <div className="success-overlay">
                            <CheckCircle size={48} />
                            <p>Trade Added!</p>
                        </div>
                    )}

                    <div className="form-grid">
                        <div className="form-group">
                            <label>
                                <Calendar size={16} />
                                Date
                            </label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => handleChange('date', e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>
                                <Coins size={16} />
                                Asset
                            </label>
                            <select
                                value={form.asset}
                                onChange={(e) => handleChange('asset', e.target.value)}
                            >
                                {ASSETS.map((a) => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                            </select>
                            {form.asset === 'Other' && (
                                <input
                                    type="text"
                                    placeholder="Enter asset name"
                                    value={form.customAsset}
                                    onChange={(e) => handleChange('customAsset', e.target.value)}
                                    className="mt-8"
                                    required
                                />
                            )}
                        </div>

                        <div className="form-group">
                            <label>
                                <ArrowUpDown size={16} />
                                Trade Type
                            </label>
                            <div className="trade-type-buttons">
                                {TRADE_TYPES.map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        className={`type-btn ${form.trade_type === type ? 'active' : ''} ${type.toLowerCase()}`}
                                        onClick={() => handleChange('trade_type', type)}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>
                                <DollarSign size={16} />
                                Profit / Loss (USD)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="e.g. 150 or -50"
                                value={form.amount}
                                onChange={(e) => handleChange('amount', e.target.value)}
                                required
                            />
                            <span className="form-hint">Use negative for losses</span>
                        </div>

                        <div className="form-group full-width">
                            <label>
                                <FileText size={16} />
                                Notes (optional)
                            </label>
                            <textarea
                                placeholder="Trade strategy, entry/exit points, thoughts..."
                                value={form.notes}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? (
                                <div className="btn-spinner" />
                            ) : (
                                <>
                                    <Send size={18} />
                                    Save Trade
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
