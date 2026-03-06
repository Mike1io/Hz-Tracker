import { useEffect, useState, useMemo } from 'react';
import { tradeStorage } from '../lib/tradeStorage';
import { useAuth } from '../context/AuthContext';
import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import {
    Search,
    Download,
    Edit3,
    Trash2,
    X,
    Check,
    Filter,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

const PAGE_SIZE = 15;

export default function HistoryPage() {
    const { user } = useAuth();
    const [trades, setTrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterAsset, setFilterAsset] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    useEffect(() => {
        fetchTrades();
    }, [user]);

    const fetchTrades = async () => {
        const { data, error } = await tradeStorage.fetchTradesDesc(user.id);

        if (!error) setTrades(data || []);
        setLoading(false);
    };

    const filteredTrades = useMemo(() => {
        let result = trades;
        if (filterAsset) {
            result = result.filter((t) =>
                t.asset.toLowerCase().includes(filterAsset.toLowerCase())
            );
        }
        if (filterDateFrom) {
            result = result.filter((t) => t.date >= filterDateFrom);
        }
        if (filterDateTo) {
            result = result.filter((t) => t.date <= filterDateTo);
        }
        return result;
    }, [trades, filterAsset, filterDateFrom, filterDateTo]);

    const totalPages = Math.ceil(filteredTrades.length / PAGE_SIZE);
    const paginatedTrades = filteredTrades.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    const totalPL = filteredTrades.reduce((s, t) => s + Number(t.amount), 0);

    const handleEdit = (trade) => {
        setEditingId(trade.id);
        setEditForm({
            date: trade.date,
            asset: trade.asset,
            trade_type: trade.trade_type,
            amount: trade.amount,
            notes: trade.notes || '',
        });
    };

    const handleSaveEdit = async () => {
        const { error } = await tradeStorage.updateTrade(editingId, user.id, {
            date: editForm.date,
            asset: editForm.asset,
            trade_type: editForm.trade_type,
            amount: parseFloat(editForm.amount),
            notes: editForm.notes || null,
        });

        if (error) {
            toast.error('Failed to update trade');
            return;
        }

        toast.success('Trade updated');
        setEditingId(null);
        fetchTrades();
    };

    const handleDelete = async (id) => {
        const { error } = await tradeStorage.deleteTrade(id, user.id);
        if (error) {
            toast.error('Failed to delete trade');
            return;
        }
        toast.success('Trade deleted');
        setDeleteConfirm(null);
        fetchTrades();
    };

    const exportToExcel = () => {
        const exportData = filteredTrades.map((t) => ({
            Date: t.date,
            Asset: t.asset,
            Type: t.trade_type,
            'P&L (USD)': Number(t.amount),
            Notes: t.notes || '',
        }));

        exportData.push({
            Date: '',
            Asset: '',
            Type: '',
            'P&L (USD)': totalPL,
            Notes: 'TOTAL',
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Trades');
        XLSX.writeFile(wb, `h-tracker-trades-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        toast.success('Exported to Excel!');
    };

    const formatMoney = (val) => {
        const n = Number(val);
        const sign = n >= 0 ? '+' : '';
        return `${sign}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const assets = useMemo(() => {
        return [...new Set(trades.map((t) => t.asset))];
    }, [trades]);

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
                <p>Loading history...</p>
            </div>
        );
    }

    return (
        <div className="history-page">
            <div className="page-header">
                <div>
                    <h1>Trade History</h1>
                    <p className="page-subtitle">{filteredTrades.length} trades found</p>
                </div>
                <button className="btn-export" onClick={exportToExcel}>
                    <Download size={18} />
                    Export Excel
                </button>
            </div>

            <div className="filters-bar">
                <div className="filter-group">
                    <Filter size={16} />
                    <select
                        value={filterAsset}
                        onChange={(e) => { setFilterAsset(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="">All Assets</option>
                        {assets.map((a) => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <span className="filter-label">From</span>
                    <input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => { setFilterDateFrom(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                <div className="filter-group">
                    <span className="filter-label">To</span>
                    <input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => { setFilterDateTo(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                {(filterAsset || filterDateFrom || filterDateTo) && (
                    <button
                        className="btn-clear-filters"
                        onClick={() => {
                            setFilterAsset('');
                            setFilterDateFrom('');
                            setFilterDateTo('');
                            setCurrentPage(1);
                        }}
                    >
                        <X size={14} /> Clear
                    </button>
                )}
            </div>

            <div className="history-total">
                <span>Filtered Total P&L:</span>
                <span className={totalPL >= 0 ? 'positive' : 'negative'}>
                    {formatMoney(totalPL)}
                </span>
            </div>

            <div className="trades-table-wrapper">
                <table className="trades-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Asset</th>
                            <th>Type</th>
                            <th>P&L</th>
                            <th>Notes</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedTrades.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="empty-row">
                                    No trades found
                                </td>
                            </tr>
                        ) : (
                            paginatedTrades.map((trade) => (
                                <tr key={trade.id}>
                                    {editingId === trade.id ? (
                                        <>
                                            <td>
                                                <input
                                                    type="date"
                                                    value={editForm.date}
                                                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={editForm.asset}
                                                    onChange={(e) => setEditForm({ ...editForm, asset: e.target.value })}
                                                />
                                            </td>
                                            <td>
                                                <select
                                                    value={editForm.trade_type}
                                                    onChange={(e) => setEditForm({ ...editForm, trade_type: e.target.value })}
                                                >
                                                    <option value="Long">Long</option>
                                                    <option value="Short">Short</option>
                                                    <option value="Spot">Spot</option>
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={editForm.amount}
                                                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={editForm.notes}
                                                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                                />
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button className="btn-icon save" onClick={handleSaveEdit}>
                                                        <Check size={16} />
                                                    </button>
                                                    <button className="btn-icon cancel" onClick={() => setEditingId(null)}>
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td>{format(parseISO(trade.date), 'MMM dd, yyyy')}</td>
                                            <td><span className="asset-badge">{trade.asset}</span></td>
                                            <td>
                                                <span className={`type-badge ${trade.trade_type.toLowerCase()}`}>
                                                    {trade.trade_type}
                                                </span>
                                            </td>
                                            <td className={Number(trade.amount) >= 0 ? 'positive' : 'negative'}>
                                                {formatMoney(trade.amount)}
                                            </td>
                                            <td className="notes-cell">{trade.notes || '—'}</td>
                                            <td>
                                                {deleteConfirm === trade.id ? (
                                                    <div className="action-buttons">
                                                        <button className="btn-icon danger" onClick={() => handleDelete(trade.id)}>
                                                            <Check size={16} />
                                                        </button>
                                                        <button className="btn-icon cancel" onClick={() => setDeleteConfirm(null)}>
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="action-buttons">
                                                        <button className="btn-icon edit" onClick={() => handleEdit(trade)}>
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button className="btn-icon danger" onClick={() => setDeleteConfirm(trade.id)}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="btn-icon"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => p - 1)}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="page-info">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        className="btn-icon"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => p + 1)}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}
        </div>
    );
}
