import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity, RefreshCw, X, Search, Globe, Twitter, Heart, Newspaper, ExternalLink, Wifi, WifiOff, ChevronRight } from 'lucide-react';

// ─── News helpers ──────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function detectCategory(item) {
    // CryptoCompare provides pipe-separated categories like "BTC|MARKET|REGULATION|MACROECONOMICS"
    const cats = (item.categories || '').toUpperCase();
    const text = (item.title + ' ' + (item.body || '')).toLowerCase();

    if (
        cats.includes('REGULATION') || cats.includes('MACROECONOMICS') || cats.includes('COMMODITY') ||
        /\b(congress|senate|president|government|regulation|bill|policy|federal|sec|cftc|eu|uk|ban|sanction|geopolit|iran|china|russia|trump|biden|war|strike|military|diplomat)\b/.test(text)
    ) {
        return 'Politics';
    }
    if (
        cats.includes('MARKET') || cats.includes('TRADING') || cats.includes('BUSINESS') || cats.includes('FIAT') ||
        /\b(stock|nasdaq|s&p|dow|inflation|fed|interest rate|economy|gdp|recession|earnings|ipo|macro|dollar|bonds|forex|treasury|etf|fund)\b/.test(text)
    ) {
        return 'Finance';
    }
    return 'Crypto';
}

const CATEGORY_COLORS = {
    Crypto: { bg: 'rgba(99, 179, 237, 0.12)', color: '#63b3ed', border: 'rgba(99,179,237,0.3)' },
    Finance: { bg: 'rgba(0, 212, 170, 0.12)', color: 'var(--green)', border: 'rgba(0,212,170,0.3)' },
    Politics: { bg: 'rgba(246, 173, 85, 0.12)', color: '#f6ad55', border: 'rgba(246,173,85,0.3)' },
};

// ─── Main component ────────────────────────────────────────────────────────────

export default function MarketPage() {
    // Market state
    const [coins, setCoins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [coinDetails, setCoinDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [favorites, setFavorites] = useState(() => {
        const saved = localStorage.getItem('market_favorites');
        try { return saved ? JSON.parse(saved) : []; } catch { return []; }
    });

    // News state
    const [news, setNews] = useState([]);
    const [newsLoading, setNewsLoading] = useState(false);
    const [newsError, setNewsError] = useState(null);
    const [newsFilter, setNewsFilter] = useState('All');
    const [newsLastUpdated, setNewsLastUpdated] = useState(null);

    // Global Market state
    const [globalStats, setGlobalStats] = useState(null);
    const [globalStatsLoading, setGlobalStatsLoading] = useState(true);

    useEffect(() => {
        localStorage.setItem('market_favorites', JSON.stringify(favorites));
    }, [favorites]);

    // ── Market data ──────────────────────────────────────────────────────────
    const fetchPrices = async () => {
        try {
            const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h');
            const data = await res.json();
            if (Array.isArray(data)) {
                setCoins(data);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error('Failed to fetch market prices:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchGlobalStats = async () => {
        try {
            const res = await fetch('https://api.coingecko.com/api/v3/global');
            const data = await res.json();
            if (data && data.data) {
                setGlobalStats(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch global stats:', error);
        } finally {
            setGlobalStatsLoading(false);
        }
    };

    useEffect(() => {
        fetchPrices();
        fetchGlobalStats();
        const interval = setInterval(() => {
            fetchPrices();
            fetchGlobalStats();
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedAsset) fetchCoinDetails(selectedAsset.id);
        else setCoinDetails(null);
    }, [selectedAsset]);

    const fetchCoinDetails = async (id) => {
        setDetailsLoading(true);
        try {
            const res = await fetch(`https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`);
            const data = await res.json();
            setCoinDetails(data);
        } catch (error) {
            console.error('Failed to fetch coin details:', error);
        } finally {
            setDetailsLoading(false);
        }
    };

    // ── News data (CryptoCompare public API — no key, CORS ok) ───────────────
    const fetchNews = async () => {
        setNewsLoading(true);
        setNewsError(null);
        try {
            const res = await fetch(
                'https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest&extraParams=hz-tracker'
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.Type !== 100) throw new Error(data.Message || 'API error');
            const items = (data.Data || []).map(item => ({
                id: item.id,
                title: item.title,
                url: item.url,
                body: item.body,
                published_at: new Date(item.published_on * 1000).toISOString(),
                categories: item.categories,
                source: { title: item.source_info?.name || item.source },
                imageurl: item.imageurl,
                _category: detectCategory(item),
            }));
            setNews(items);
            setNewsLastUpdated(new Date());
        } catch (err) {
            console.error('News fetch failed:', err);
            setNewsError('Unable to load news. Please try again.');
        } finally {
            setNewsLoading(false);
        }
    };

    // Fetch news when News tab is first opened
    useEffect(() => {
        if (activeTab === 'news' && news.length === 0 && !newsLoading) {
            fetchNews();
        }
    }, [activeTab]);

    // ── Filtered coin list ───────────────────────────────────────────────────
    const filteredCoins = useMemo(() => {
        let result = coins;
        if (activeTab === 'favorites') result = result.filter(c => favorites.includes(c.id));
        if (searchQuery) result = result.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.symbol.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return result;
    }, [coins, searchQuery, activeTab, favorites]);

    // ── Filtered news list ───────────────────────────────────────────────────
    const filteredNews = useMemo(() => {
        if (newsFilter === 'All') return news;
        return news.filter(n => n._category === newsFilter);
    }, [news, newsFilter]);

    const toggleFavorite = (e, coinId) => {
        e.stopPropagation();
        setFavorites(prev => prev.includes(coinId) ? prev.filter(id => id !== coinId) : [...prev, coinId]);
    };

    const formatPrice = (price) => {
        if (price === undefined || price === null) return '---';
        return new Intl.NumberFormat('en-US', {
            style: 'currency', currency: 'USD',
            minimumFractionDigits: price < 1 ? 4 : 2,
            maximumFractionDigits: price < 1 ? 6 : 2,
        }).format(price);
    };

    const formatVolume = (vol) => {
        if (!vol) return '---';
        if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
        if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
        return `$${vol.toLocaleString()}`;
    };

    const getTradingViewLink = (coin) =>
        `https://s.tradingview.com/widgetembed/?symbol=BINANCE:${coin.symbol.toUpperCase()}USDT&interval=D&theme=dark`;

    const isNewsTab = activeTab === 'news';
    const isMarketTab = activeTab === 'all' || activeTab === 'favorites';

    return (
        <div className="market-page">
            {/* ── Page header ── */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h1>Market Overview</h1>
                    <p className="page-subtitle">Top 100 Cryptocurrencies by Market Cap</p>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* Search — only shown for market tabs */}
                    {isMarketTab && (
                        <div className="search-container" style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Search tokens..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    padding: '10px 12px 10px 40px',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    color: 'var(--text)',
                                    width: '250px',
                                    fontSize: '0.9rem',
                                    transition: 'all 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                            />
                        </div>
                    )}

                    {/* ── Tab switcher ── */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-card)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <TabBtn active={activeTab === 'all'} onClick={() => setActiveTab('all')} icon={<Activity size={16} />} label="All Tokens" />
                        <TabBtn active={activeTab === 'favorites'} onClick={() => setActiveTab('favorites')}
                            icon={<Heart size={16} fill={activeTab === 'favorites' ? 'var(--red)' : 'none'} color={activeTab === 'favorites' ? 'var(--red)' : 'currentColor'} />}
                            label="Favorites" />
                        <TabBtn active={activeTab === 'news'} onClick={() => setActiveTab('news')} icon={<Newspaper size={16} />} label="News" accent />
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={() => {
                            if (isNewsTab) { fetchNews(); }
                            else { setLoading(true); fetchPrices(); }
                        }}
                        className="btn-icon"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', width: '40px', height: '40px' }}
                        title={isNewsTab ? 'Refresh news' : 'Refresh prices'}
                    >
                        <RefreshCw size={18} className={(loading && !coins.length) || newsLoading ? 'spin' : ''} />
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════ */}
            {/* ── GLOBAL MARKET STATS WIDGETS ── */}
            {/* ══════════════════════════════════════════════ */}
            {isMarketTab && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', marginBottom: '24px', marginTop: '16px' }}>
                    {globalStatsLoading ? (
                        <>
                            <div style={{ background: '#1c1e24', borderRadius: '20px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div className="spinner" style={{ width: '24px', height: '24px', borderTopColor: 'var(--text-muted)' }} />
                            </div>
                            <div style={{ background: '#1c1e24', borderRadius: '20px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', display: 'none' }} className="hide-on-mobile">
                                <div className="spinner" style={{ width: '24px', height: '24px', borderTopColor: 'var(--text-muted)' }} />
                            </div>
                        </>
                    ) : globalStats ? (
                        <>
                            {/* Market Cap Widget */}
                            <div style={{ background: '#1c1e24', borderRadius: '20px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Market Cap <ChevronRight size={16} color="var(--text-muted)" style={{ marginTop: '2px' }} />
                                    </h3>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', position: 'relative', zIndex: 2 }}>
                                    <span style={{ fontSize: '2.2rem', fontWeight: '800', fontFamily: '"Space Grotesk", sans-serif', color: '#fff', letterSpacing: '-0.5px' }}>
                                        {formatVolume(globalStats.total_market_cap?.usd).replace('.00', '')}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', color: globalStats.market_cap_change_percentage_24h_usd >= 0 ? '#00d4aa' : 'var(--red)', fontSize: '1rem', fontWeight: '700' }}>
                                        {globalStats.market_cap_change_percentage_24h_usd >= 0 ? <TrendingUp size={16} style={{ marginRight: '4px' }} /> : <TrendingDown size={16} style={{ marginRight: '4px' }} />}
                                        {Math.abs(globalStats.market_cap_change_percentage_24h_usd || 0).toFixed(2)}%
                                    </div>
                                </div>

                                {/* Abstract decorative sparkline */}
                                <svg width="100%" height="45" viewBox="0 0 200 45" preserveAspectRatio="none" style={{ position: 'absolute', bottom: '12px', left: 0, right: 0, zIndex: 1, opacity: 0.9 }}>
                                    <path d="M10,25 L30,26 L40,26 L60,25 L75,26 L80,35 L90,42 L100,40 L110,40 L120,38 L130,42 L140,40 L150,38 L160,26 L170,22 L175,25 L180,25 L185,20 L190,22 L195,12 L200,16" fill="none" stroke="#00d4aa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>

                            {/* 24h Volume Widget */}
                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        24h Volume <ChevronRight size={14} color="var(--text-muted)" />
                                    </h3>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', position: 'relative', zIndex: 2 }}>
                                    <span style={{ fontSize: '1.8rem', fontWeight: '800', fontFamily: '"Space Grotesk", sans-serif' }}>
                                        {formatVolume(globalStats.total_volume?.usd)}
                                    </span>
                                    {/* Using global volume doesn't have a direct 24h change percentage in CoinGecko global API, so we show the volume ratio to market cap approx */}
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                        Global Crypto Trading Volume
                                    </span>
                                </div>

                                {/* Abstract decorative sparkline for volume (usually very volatile, drawn spiky) */}
                                <svg width="100%" height="40" viewBox="0 0 200 40" preserveAspectRatio="none" style={{ position: 'absolute', bottom: '10px', left: 0, right: 0, zIndex: 1, opacity: 0.6 }}>
                                    <rect x="10" y="20" width="8" height="20" fill="var(--primary)" rx="2" opacity="0.4" />
                                    <rect x="30" y="15" width="8" height="25" fill="var(--primary)" rx="2" opacity="0.6" />
                                    <rect x="50" y="25" width="8" height="15" fill="var(--primary)" rx="2" opacity="0.3" />
                                    <rect x="70" y="10" width="8" height="30" fill="var(--primary)" rx="2" opacity="0.7" />
                                    <rect x="90" y="18" width="8" height="22" fill="var(--primary)" rx="2" opacity="0.5" />
                                    <rect x="110" y="5" width="8" height="35" fill="var(--primary)" rx="2" opacity="0.8" />
                                    <rect x="130" y="15" width="8" height="25" fill="var(--primary)" rx="2" opacity="0.6" />
                                    <rect x="150" y="22" width="8" height="18" fill="var(--primary)" rx="2" opacity="0.4" />
                                    <rect x="170" y="8" width="8" height="32" fill="var(--primary)" rx="2" opacity="0.7" />
                                    <rect x="190" y="12" width="8" height="28" fill="var(--primary)" rx="2" opacity="0.5" />
                                </svg>
                            </div>
                        </>
                    ) : null}
                </div>
            )}

            {/* ══════════════════════════════════════════════ */}
            {/* ── MARKET VIEW (Coin List) ── */}
            {/* ══════════════════════════════════════════════ */}
            {isMarketTab && (
                <>
                    {loading && !coins.length ? (
                        <div className="loading-screen">
                            <div className="spinner" />
                            <p>Loading market data...</p>
                        </div>
                    ) : (
                        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                            {filteredCoins.map(coin => {
                                const isPositive = coin.price_change_percentage_24h >= 0;
                                return (
                                    <div
                                        key={coin.id}
                                        className={`stat-card market-card-hover ${isPositive ? 'positive' : 'negative'}`}
                                        onClick={() => setSelectedAsset(coin)}
                                    >
                                        <div style={{ width: '100%' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {coin.image ? <img src={coin.image} alt={coin.name} style={{ width: '100%', height: '100%' }} /> : <Activity size={18} />}
                                                    </div>
                                                    <div>
                                                        <h3 style={{ fontSize: '1.1rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>{coin.name}</h3>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{coin.symbol.toUpperCase()}</span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <button
                                                        onClick={(e) => toggleFavorite(e, coin.id)}
                                                        className="fav-toggle"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: favorites.includes(coin.id) ? 'var(--red)' : 'var(--text-muted)', transition: 'transform 0.2s' }}
                                                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                                                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                                    >
                                                        <Heart size={20} fill={favorites.includes(coin.id) ? 'var(--red)' : 'none'} />
                                                    </button>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', background: isPositive ? 'rgba(0, 212, 170, 0.1)' : 'rgba(255, 75, 75, 0.1)', color: isPositive ? 'var(--green)' : 'var(--red)', fontSize: '0.85rem', fontWeight: '600' }}>
                                                        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                        {Math.abs(coin.price_change_percentage_24h || 0).toFixed(2)}%
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <span style={{ fontSize: '1.6rem', fontWeight: '700', fontFamily: '"Space Grotesk", sans-serif' }}>{formatPrice(coin.current_price)}</span>
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>MCap: {formatVolume(coin.market_cap)}</span>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>
                                                    Rank #{coin.market_cap_rank}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {filteredCoins.length === 0 && !loading && (
                        <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-secondary)' }}>
                            {activeTab === 'favorites' ? <Heart size={48} style={{ marginBottom: '16px', opacity: 0.2 }} /> : <Search size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />}
                            <h3>{activeTab === 'favorites' ? 'No favorites yet' : 'No tokens found'}</h3>
                            <p>{activeTab === 'favorites' ? 'Start favoriting tokens to see them here' : 'Try searching for a different name or symbol'}</p>
                        </div>
                    )}

                    {lastUpdated && (
                        <div style={{ marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                            Last updated: {lastUpdated.toLocaleTimeString()} (CoinGecko)
                        </div>
                    )}
                </>
            )}

            {/* ══════════════════════════════════════════════ */}
            {/* ── NEWS VIEW ── */}
            {/* ══════════════════════════════════════════════ */}
            {isNewsTab && (
                <div style={{ marginTop: '8px' }}>
                    {/* News filter tabs */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {['All', 'Crypto', 'Finance', 'Politics'].map(cat => {
                            const colors = cat !== 'All' ? CATEGORY_COLORS[cat] : null;
                            const isActive = newsFilter === cat;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setNewsFilter(cat)}
                                    style={{
                                        padding: '8px 18px',
                                        borderRadius: '20px',
                                        border: isActive
                                            ? `1px solid ${colors?.border || 'var(--primary)'}`
                                            : '1px solid var(--border)',
                                        background: isActive
                                            ? (colors?.bg || 'rgba(99,179,237,0.12)')
                                            : 'var(--bg-card)',
                                        color: isActive
                                            ? (colors?.color || 'var(--primary)')
                                            : 'var(--text-muted)',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {cat === 'All' ? '🌐 All' : cat === 'Crypto' ? '₿ Crypto' : cat === 'Finance' ? '📈 Finance' : '🏛️ Politics'}
                                    {cat !== 'All' && news.length > 0 && (
                                        <span style={{ marginLeft: '6px', opacity: 0.6, fontSize: '0.78rem' }}>
                                            {news.filter(n => n._category === cat).length}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                        {newsLastUpdated && (
                            <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                Updated {newsLastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                    </div>

                    {/* Loading state */}
                    {newsLoading && (
                        <div className="loading-screen">
                            <div className="spinner" />
                            <p>Loading latest news...</p>
                        </div>
                    )}

                    {/* Error state */}
                    {newsError && !newsLoading && (
                        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-secondary)' }}>
                            <WifiOff size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                            <h3 style={{ marginBottom: '8px' }}>{newsError}</h3>
                            <button
                                onClick={fetchNews}
                                style={{ marginTop: '16px', padding: '10px 24px', borderRadius: '10px', background: 'var(--primary)', color: '#000', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* News grid */}
                    {!newsLoading && !newsError && filteredNews.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                            {filteredNews.map((article, i) => {
                                const cat = article._category;
                                const colors = CATEGORY_COLORS[cat];
                                const sentiment = article.votes
                                    ? (article.votes.positive > article.votes.negative ? 'bullish' : article.votes.negative > article.votes.positive ? 'bearish' : null)
                                    : null;
                                return (
                                    <a
                                        key={article.id || i}
                                        href={article.url || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ textDecoration: 'none' }}
                                    >
                                        <div className="news-card" style={{
                                            background: 'var(--bg-card)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '14px',
                                            padding: '20px',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '12px',
                                            transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                                            cursor: 'pointer',
                                        }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.transform = 'translateY(-3px)';
                                                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
                                                e.currentTarget.style.borderColor = colors.border;
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                                e.currentTarget.style.borderColor = 'var(--border)';
                                            }}
                                        >
                                            {/* Top row: badges */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '700',
                                                    background: colors.bg, color: colors.color, border: `1px solid ${colors.border}`,
                                                    letterSpacing: '0.03em', textTransform: 'uppercase',
                                                }}>
                                                    {cat}
                                                </span>
                                                {sentiment && (
                                                    <span style={{
                                                        padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '700',
                                                        background: sentiment === 'bullish' ? 'rgba(0,212,170,0.1)' : 'rgba(255,75,75,0.1)',
                                                        color: sentiment === 'bullish' ? 'var(--green)' : 'var(--red)',
                                                        border: `1px solid ${sentiment === 'bullish' ? 'rgba(0,212,170,0.3)' : 'rgba(255,75,75,0.3)'}`,
                                                        textTransform: 'uppercase', letterSpacing: '0.03em',
                                                    }}>
                                                        {sentiment === 'bullish' ? '▲ Bullish' : '▼ Bearish'}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Headline */}
                                            <h3 style={{
                                                margin: 0, fontSize: '0.97rem', fontWeight: '600', lineHeight: '1.45',
                                                color: 'var(--text)', flex: 1,
                                                display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                            }}>
                                                {article.title}
                                            </h3>

                                            {/* Footer: source + time + link icon */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                                        {article.source?.title || article.domain || 'News'}
                                                    </span>
                                                    {article.published_at && (
                                                        <>
                                                            <span style={{ color: 'var(--border)', fontSize: '0.7rem' }}>•</span>
                                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                                {timeAgo(article.published_at)}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                                <ExternalLink size={14} style={{ color: 'var(--text-muted)', opacity: 0.5, flexShrink: 0 }} />
                                            </div>
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                    )}

                    {/* Empty state */}
                    {!newsLoading && !newsError && filteredNews.length === 0 && news.length > 0 && (
                        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-secondary)' }}>
                            <Newspaper size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                            <h3>No {newsFilter} articles right now</h3>
                            <p>Try a different category or check back later.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Chart modal ── */}
            {selectedAsset && (
                <div
                    className="chart-modal-overlay"
                    onClick={() => setSelectedAsset(null)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                >
                    <div
                        className="chart-modal-content"
                        onClick={e => e.stopPropagation()}
                        style={{ width: '100%', maxWidth: '1000px', height: '80vh', minHeight: '500px', backgroundColor: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden', position: 'relative', border: '1px solid var(--border)', boxShadow: '0 24px 48px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}
                    >
                        <button
                            onClick={() => setSelectedAsset(null)}
                            style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--red-bg)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                        >
                            <X size={18} />
                        </button>
                        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img src={selectedAsset.image} alt="" style={{ width: '28px', height: '28px' }} />
                                <h3 style={{ margin: 0 }}>{selectedAsset.name} ({selectedAsset.symbol.toUpperCase()})</h3>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginRight: '40px' }}>
                                {detailsLoading ? (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading info...</span>
                                ) : coinDetails ? (
                                    <>
                                        {coinDetails.links?.homepage?.[0] && (
                                            <a href={coinDetails.links.homepage[0]} target="_blank" rel="noopener noreferrer" className="token-link" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}>
                                                <Globe size={16} /> Website
                                            </a>
                                        )}
                                        {coinDetails.links?.twitter_screen_name && (
                                            <a href={`https://x.com/${coinDetails.links.twitter_screen_name}`} target="_blank" rel="noopener noreferrer" className="token-link" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#fff', textDecoration: 'none', fontWeight: '500' }}>
                                                <Twitter size={16} /> Twitter
                                            </a>
                                        )}
                                    </>
                                ) : null}
                            </div>
                        </div>
                        <iframe src={getTradingViewLink(selectedAsset)} style={{ width: '100%', flex: 1, border: 'none' }} title={`${selectedAsset.name} Chart`} />
                    </div>
                </div>
            )}

            <style>{`
        .spin { animation: spin 1s linear infinite; }
        .market-card-hover { cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
        .market-card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
}

// ─── Small reusable tab button ─────────────────────────────────────────────────
function TabBtn({ active, onClick, icon, label, accent }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: active ? (accent ? 'rgba(99,179,237,0.15)' : 'var(--bg-elevated)') : 'transparent',
                color: active ? (accent ? '#63b3ed' : 'var(--text)') : 'var(--text-muted)',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                outline: active && accent ? '1px solid rgba(99,179,237,0.3)' : 'none',
            }}
        >
            {icon} {label}
        </button>
    );
}
