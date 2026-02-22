import { useEffect, useState, useMemo } from 'react';
import { tradeStorage } from '../lib/tradeStorage';
import { useAuth } from '../context/AuthContext';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calendar,
    Target,
    Award,
    AlertTriangle,
    BarChart3,
} from 'lucide-react';
import {
    startOfDay,
    startOfWeek,
    startOfMonth,
    isAfter,
    parseISO,
    format,
} from 'date-fns';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export default function DashboardPage() {
    const { user } = useAuth();
    const [trades, setTrades] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTrades();
    }, [user]);

    const fetchTrades = async () => {
        const { data, error } = await tradeStorage.fetchTrades(user.id);

        if (!error) setTrades(data || []);
        setLoading(false);
    };

    const stats = useMemo(() => {
        if (!trades.length) {
            return {
                totalPL: 0, todayPL: 0, weekPL: 0, monthPL: 0,
                winRate: 0, totalTrades: 0, wins: 0, losses: 0,
                bestTrade: 0, worstTrade: 0, profitPercent: 0,
                bestAsset: '-', worstAsset: '-',
            };
        }

        const now = new Date();
        const todayStart = startOfDay(now);
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const monthStart = startOfMonth(now);

        let totalPL = 0, todayPL = 0, weekPL = 0, monthPL = 0;
        let wins = 0, losses = 0;
        let bestTrade = -Infinity, worstTrade = Infinity;

        trades.forEach((t) => {
            const amt = Number(t.amount);
            const d = parseISO(t.date);
            totalPL += amt;
            if (isAfter(d, todayStart) || d.toDateString() === now.toDateString()) todayPL += amt;
            if (isAfter(d, weekStart) || d >= weekStart) weekPL += amt;
            if (isAfter(d, monthStart) || d >= monthStart) monthPL += amt;
            if (amt >= 0) wins++;
            else losses++;
            if (amt > bestTrade) bestTrade = amt;
            if (amt < worstTrade) worstTrade = amt;
        });

        const totalTrades = trades.length;
        const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : 0;
        const totalPositive = trades.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
        const totalNegative = Math.abs(trades.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Number(t.amount), 0));
        const profitPercent = totalNegative > 0 ? (((totalPositive - totalNegative) / totalNegative) * 100).toFixed(1) : totalPositive > 0 ? 100 : 0;

        return {
            totalPL, todayPL, weekPL, monthPL,
            winRate, totalTrades, wins, losses,
            bestTrade: bestTrade === -Infinity ? 0 : bestTrade,
            worstTrade: worstTrade === Infinity ? 0 : worstTrade,
            profitPercent,
        };
    }, [trades]);

    const lineChartData = useMemo(() => {
        if (!trades.length) return null;
        let cumulative = 0;
        const labels = [];
        const data = [];
        trades.forEach((t) => {
            cumulative += Number(t.amount);
            labels.push(format(parseISO(t.date), 'MMM dd'));
            data.push(cumulative);
        });

        return {
            labels,
            datasets: [
                {
                    label: 'Cumulative P&L',
                    data,
                    borderColor: '#00d4aa',
                    backgroundColor: 'rgba(0, 212, 170, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#00d4aa',
                    borderWidth: 2,
                },
            ],
        };
    }, [trades]);

    const barChartData = useMemo(() => {
        if (!trades.length) return null;
        const dailyMap = {};
        trades.forEach((t) => {
            const key = t.date;
            dailyMap[key] = (dailyMap[key] || 0) + Number(t.amount);
        });
        const sortedKeys = Object.keys(dailyMap).sort();
        const labels = sortedKeys.map((k) => format(parseISO(k), 'MMM dd'));
        const data = sortedKeys.map((k) => dailyMap[k]);

        return {
            labels,
            datasets: [
                {
                    label: 'Daily P&L',
                    data,
                    backgroundColor: data.map((v) =>
                        v >= 0 ? 'rgba(0, 212, 170, 0.8)' : 'rgba(255, 75, 75, 0.8)'
                    ),
                    borderColor: data.map((v) =>
                        v >= 0 ? '#00d4aa' : '#ff4b4b'
                    ),
                    borderWidth: 1,
                    borderRadius: 4,
                },
            ],
        };
    }, [trades]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(18, 18, 26, 0.95)',
                titleColor: '#fff',
                bodyColor: '#a0a0b8',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                callbacks: {
                    label: (ctx) => `$${ctx.parsed.y.toFixed(2)}`,
                },
            },
        },
        scales: {
            x: {
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: '#6b6b80', maxTicksLimit: 10 },
            },
            y: {
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: {
                    color: '#6b6b80',
                    callback: (v) => `$${v}`,
                },
            },
        },
    };

    const formatMoney = (val) => {
        const n = Number(val);
        const sign = n >= 0 ? '+' : '';
        return `${sign}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
                <p>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            <div className="page-header">
                <h1>Dashboard</h1>
                <p className="page-subtitle">Your trading performance at a glance</p>
            </div>

            <div className="stats-grid">
                <div className={`stat-card ${stats.totalPL >= 0 ? 'positive' : 'negative'}`}>
                    <div className="stat-icon">
                        <DollarSign size={22} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Total P&L</span>
                        <span className="stat-value">{formatMoney(stats.totalPL)}</span>
                    </div>
                </div>

                <div className={`stat-card ${stats.todayPL >= 0 ? 'positive' : 'negative'}`}>
                    <div className="stat-icon">
                        <Calendar size={22} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Today</span>
                        <span className="stat-value">{formatMoney(stats.todayPL)}</span>
                    </div>
                </div>

                <div className={`stat-card ${stats.weekPL >= 0 ? 'positive' : 'negative'}`}>
                    <div className="stat-icon">
                        {stats.weekPL >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">This Week</span>
                        <span className="stat-value">{formatMoney(stats.weekPL)}</span>
                    </div>
                </div>

                <div className={`stat-card ${stats.monthPL >= 0 ? 'positive' : 'negative'}`}>
                    <div className="stat-icon">
                        <BarChart3 size={22} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">This Month</span>
                        <span className="stat-value">{formatMoney(stats.monthPL)}</span>
                    </div>
                </div>
            </div>

            <div className="stats-grid secondary">
                <div className="stat-card accent">
                    <div className="stat-icon"><Target size={22} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Win Rate</span>
                        <span className="stat-value">{stats.winRate}%</span>
                        <span className="stat-sub">{stats.wins}W / {stats.losses}L</span>
                    </div>
                </div>

                <div className="stat-card accent">
                    <div className="stat-icon"><TrendingUp size={22} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Profit %</span>
                        <span className="stat-value">{stats.profitPercent}%</span>
                    </div>
                </div>

                <div className="stat-card positive">
                    <div className="stat-icon"><Award size={22} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Best Trade</span>
                        <span className="stat-value">{formatMoney(stats.bestTrade)}</span>
                    </div>
                </div>

                <div className="stat-card negative">
                    <div className="stat-icon"><AlertTriangle size={22} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Worst Trade</span>
                        <span className="stat-value">{formatMoney(stats.worstTrade)}</span>
                    </div>
                </div>
            </div>

            <div className="charts-grid">
                <div className="chart-card">
                    <h3>Cumulative P&L</h3>
                    <div className="chart-wrapper">
                        {lineChartData ? (
                            <Line data={lineChartData} options={chartOptions} />
                        ) : (
                            <div className="chart-empty">
                                <p>No trades yet. Add your first trade to see the chart.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="chart-card">
                    <h3>Daily P&L</h3>
                    <div className="chart-wrapper">
                        {barChartData ? (
                            <Bar data={barChartData} options={chartOptions} />
                        ) : (
                            <div className="chart-empty">
                                <p>No trades yet. Add your first trade to see the chart.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
