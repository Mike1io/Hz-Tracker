import { useState, useEffect, useMemo } from 'react';
import { Newspaper, RefreshCw, ExternalLink, WifiOff } from 'lucide-react';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function detectCategory(item) {
    const cats = (item.categories || '').toUpperCase();
    const text = (item.title + ' ' + (item.body || '')).toLowerCase();

    if (
        cats.includes('REGULATION') || cats.includes('MACROECONOMICS') || cats.includes('COMMODITY') ||
        /\b(congress|senate|president|government|regulation|bill|policy|federal|sec|cftc|eu|uk|ban|sanction|geopolit|iran|china|russia|trump|biden|war|strike|military|diplomat)\b/.test(text)
    ) return 'Politics';

    if (
        cats.includes('MARKET') || cats.includes('TRADING') || cats.includes('BUSINESS') || cats.includes('FIAT') ||
        /\b(stock|nasdaq|s&p|dow|inflation|fed|interest rate|economy|gdp|recession|earnings|ipo|macro|dollar|bonds|forex|treasury|etf|fund)\b/.test(text)
    ) return 'Finance';

    return 'Crypto';
}

const FILTERS = [
    { key: 'All', label: '🌐 All', color: null },
    { key: 'Crypto', label: '₿ Crypto', color: { bg: 'rgba(99,179,237,0.12)', text: '#63b3ed', border: 'rgba(99,179,237,0.3)' } },
    { key: 'Finance', label: '📈 Finance', color: { bg: 'rgba(0,212,170,0.12)', text: 'var(--green)', border: 'rgba(0,212,170,0.3)' } },
    { key: 'Politics', label: '🏛️ Politics', color: { bg: 'rgba(246,173,85,0.12)', text: '#f6ad55', border: 'rgba(246,173,85,0.3)' } },
];

const CAT_COLORS = {
    Crypto: { bg: 'rgba(99,179,237,0.12)', color: '#63b3ed', border: 'rgba(99,179,237,0.3)' },
    Finance: { bg: 'rgba(0,212,170,0.12)', color: 'var(--green)', border: 'rgba(0,212,170,0.3)' },
    Politics: { bg: 'rgba(246,173,85,0.12)', color: '#f6ad55', border: 'rgba(246,173,85,0.3)' },
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function NewsPage() {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('All');
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchNews = async () => {
        setLoading(true);
        setError(null);
        try {
            // ── Fetch both sources in parallel ──────────────────────────────
            // ── CoinGecko blog RSS + CoinDesk RSS via rss2json (CORS-friendly) ─
            const RSS_FEEDS = [
                { url: 'https://www.coingecko.com/en/news/feed', src: 'CoinGecko' },
                { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', src: 'CoinDesk' },
            ];
            const toRss2JsonUrl = feed =>
                `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}&count=30`;

            const [ccResult, ...rssResults] = await Promise.allSettled([
                fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest&extraParams=h-tracker')
                    .then(r => r.json()),
                ...RSS_FEEDS.map(f =>
                    fetch(toRss2JsonUrl(f.url))
                        .then(r => r.json())
                        .then(data => ({ data, src: f.src }))
                ),
            ]);

            const articles = [];

            // ── CryptoCompare ────────────────────────────────────────────────
            if (ccResult.status === 'fulfilled') {
                const data = ccResult.value;
                if (data.Type === 100 && Array.isArray(data.Data)) {
                    data.Data.forEach(item => articles.push({
                        id: `cc-${item.id}`,
                        title: item.title,
                        url: item.url,
                        body: item.body || '',
                        published_at: new Date(item.published_on * 1000).toISOString(),
                        categories: item.categories || '',
                        source: { title: item.source_info?.name || item.source || 'CryptoCompare' },
                        _src: 'CryptoCompare',
                        _category: detectCategory({ title: item.title, body: item.body || '', categories: item.categories || '' }),
                    }));
                }
            }

            // ── RSS feeds (CoinGecko blog + CoinDesk via rss2json) ────────────
            rssResults.forEach(result => {
                if (result.status !== 'fulfilled') return;
                const { data, src } = result.value;
                if (data.status !== 'ok' || !Array.isArray(data.items)) return;
                data.items.forEach(item => {
                    const title = item.title || '';
                    if (!title) return;
                    articles.push({
                        id: `rss-${src}-${item.link}`,
                        title,
                        url: item.link || '#',
                        body: item.description || '',
                        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                        categories: '',
                        source: { title: item.author || src },
                        _src: src,
                        _category: detectCategory({ title, body: item.description || '', categories: '' }),
                    });
                });
            });

            if (articles.length === 0) throw new Error('No articles loaded');

            // ── Deduplicate by normalised title, sort newest-first ───────────
            const seen = new Set();
            const deduped = articles
                .filter(a => {
                    const key = a.title.toLowerCase().slice(0, 60);
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                })
                .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

            setNews(deduped);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('News fetch failed:', err);
            setError('Unable to load news. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchNews(); }, []);

    const filtered = useMemo(() =>
        filter === 'All' ? news : news.filter(n => n._category === filter),
        [news, filter]
    );

    return (
        <div className="market-page">
            {/* ── Header ── */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1>Market News</h1>
                    <p className="page-subtitle">Crypto, Finance &amp; Politics · CryptoCompare + CoinGecko</p>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* Filter pills */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {FILTERS.map(f => {
                            const active = filter === f.key;
                            const c = f.color;
                            return (
                                <button
                                    key={f.key}
                                    onClick={() => setFilter(f.key)}
                                    style={{
                                        padding: '8px 18px',
                                        borderRadius: '20px',
                                        border: active ? `1px solid ${c?.border || 'var(--primary)'}` : '1px solid var(--border)',
                                        background: active ? (c?.bg || 'rgba(99,179,237,0.1)') : 'var(--bg-card)',
                                        color: active ? (c?.text || 'var(--primary)') : 'var(--text-muted)',
                                        fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                >
                                    {f.label}
                                    {f.key !== 'All' && news.length > 0 && (
                                        <span style={{ marginLeft: '6px', opacity: 0.6, fontSize: '0.78rem' }}>
                                            {news.filter(n => n._category === f.key).length}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={fetchNews}
                        className="btn-icon"
                        title="Refresh"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', width: '40px', height: '40px' }}
                    >
                        <RefreshCw size={18} className={loading ? 'spin' : ''} />
                    </button>
                </div>
            </div>

            {lastUpdated && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'right', marginBottom: '8px' }}>
                    Updated {lastUpdated.toLocaleTimeString()}
                </div>
            )}

            {/* ── Loading ── */}
            {loading && (
                <div className="loading-screen">
                    <div className="spinner" />
                    <p>Loading latest news...</p>
                </div>
            )}

            {/* ── Error ── */}
            {error && !loading && (
                <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-secondary)' }}>
                    <WifiOff size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                    <h3 style={{ marginBottom: '8px' }}>{error}</h3>
                    <button
                        onClick={fetchNews}
                        style={{ marginTop: '16px', padding: '10px 24px', borderRadius: '10px', background: 'var(--primary)', color: '#000', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* ── News grid ── */}
            {!loading && !error && filtered.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                    {filtered.map((article, i) => {
                        const cat = article._category;
                        const colors = CAT_COLORS[cat];
                        return (
                            <a
                                key={article.id || i}
                                href={article.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ textDecoration: 'none' }}
                            >
                                <div
                                    style={{
                                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                                        borderRadius: '14px', padding: '20px', height: '100%',
                                        display: 'flex', flexDirection: 'column', gap: '12px',
                                        transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s', cursor: 'pointer',
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
                                    {/* Badge */}
                                    <span style={{
                                        alignSelf: 'flex-start', padding: '3px 10px', borderRadius: '20px',
                                        fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.03em', textTransform: 'uppercase',
                                        background: colors.bg, color: colors.color, border: `1px solid ${colors.border}`,
                                    }}>
                                        {cat}
                                    </span>

                                    {/* Headline */}
                                    <h3 style={{
                                        margin: 0, fontSize: '0.97rem', fontWeight: '600', lineHeight: '1.45',
                                        color: 'var(--text)', flex: 1,
                                        display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                    }}>
                                        {article.title}
                                    </h3>

                                    {/* Footer */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                                {article.source?.title || 'News'}
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

            {/* ── Empty ── */}
            {!loading && !error && filtered.length === 0 && news.length > 0 && (
                <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-secondary)' }}>
                    <Newspaper size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                    <h3>No {filter} articles right now</h3>
                    <p>Try a different category or check back later.</p>
                </div>
            )}

            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
