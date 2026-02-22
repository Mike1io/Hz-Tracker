import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, RefreshCw, Twitter, X } from 'lucide-react';

const SYMBOLS = [
    { id: 'BTCUSDT', name: 'Bitcoin', symbol: 'BTC', xLink: 'https://x.com/Bitcoin', embedLink: 'https://s.tradingview.com/widgetembed/?symbol=BINANCE:BTCUSDT&interval=D&theme=dark' },
    { id: 'ETHUSDT', name: 'Ethereum', symbol: 'ETH', xLink: 'https://x.com/ethereum', embedLink: 'https://s.tradingview.com/widgetembed/?symbol=BINANCE:ETHUSDT&interval=D&theme=dark' },
    { id: 'SOLUSDT', name: 'Solana', symbol: 'SOL', xLink: 'https://x.com/solana', embedLink: 'https://s.tradingview.com/widgetembed/?symbol=BINANCE:SOLUSDT&interval=D&theme=dark' },
    { id: 'BNBUSDT', name: 'BNB', symbol: 'BNB', xLink: 'https://x.com/BNBCHAIN', embedLink: 'https://s.tradingview.com/widgetembed/?symbol=BINANCE:BNBUSDT&interval=D&theme=dark' },
    { id: 'PUMPUSDT', name: 'Pump', symbol: 'PUMP', xLink: 'https://x.com/Pumpfun', embedLink: 'https://s.tradingview.com/widgetembed/?symbol=BYBIT:PUMPUSDT&interval=D&theme=dark' },
    { id: 'JUPUSDT', name: 'Jupiter', symbol: 'JUP', xLink: 'https://x.com/JupiterExchange', embedLink: 'https://s.tradingview.com/widgetembed/?symbol=BINANCE:JUPUSDT&interval=D&theme=dark' },
    { id: 'hyperliquid', name: 'Hype', symbol: 'HYPE', xLink: 'https://x.com/HyperliquidX', embedLink: 'https://s.tradingview.com/widgetembed/?symbol=BYBIT:HYPEUSDT&interval=D&theme=dark' },
    { id: 'ZROUSDT', name: 'LayerZero', symbol: 'ZRO', xLink: 'https://x.com/LayerZero_Core', embedLink: 'https://s.tradingview.com/widgetembed/?symbol=BINANCE:ZROUSDT&interval=D&theme=dark' }
];

export default function MarketPage() {
    const [prices, setPrices] = useState({});
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [selectedAsset, setSelectedAsset] = useState(null);

    const fetchPrices = async () => {
        try {
            // Binance API for standard pairs
            const binanceRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","PUMPUSDT","JUPUSDT","ZROUSDT"]');
            const binanceData = await binanceRes.json();

            const priceMap = {};
            if (Array.isArray(binanceData)) {
                binanceData.forEach(ticker => {
                    priceMap[ticker.symbol] = {
                        price: parseFloat(ticker.lastPrice),
                        change24h: parseFloat(ticker.priceChangePercent),
                        volume: parseFloat(ticker.quoteVolume)
                    };
                });
            }

            // CoinGecko API for Hype (not on Binance)
            try {
                const cgRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=hyperliquid&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true');
                const cgData = await cgRes.json();
                if (cgData && cgData.hyperliquid) {
                    priceMap['hyperliquid'] = {
                        price: cgData.hyperliquid.usd || 0,
                        change24h: cgData.hyperliquid.usd_24h_change || 0,
                        volume: cgData.hyperliquid.usd_24h_vol || 0
                    };
                }
            } catch (cgError) {
                console.error('Failed to fetch from CoinGecko:', cgError);
            }

            setPrices(priceMap);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to fetch market prices:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrices();
        // Refresh every 10 seconds
        const interval = setInterval(fetchPrices, 10000);
        return () => clearInterval(interval);
    }, []);

    const formatPrice = (price) => {
        if (!price) return '---';
        // Format large numbers with commas, and small numbers with correct decimals
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: price < 1 ? 4 : 2,
            maximumFractionDigits: price < 1 ? 4 : 2,
        }).format(price);
    };

    const formatVolume = (vol) => {
        if (!vol) return '---';
        if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
        if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
        return `$${vol.toLocaleString()}`;
    };

    return (
        <div className="market-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Market Overview</h1>
                    <p className="page-subtitle">Live cryptocurrency prices and 24h changes</p>
                </div>
                <button
                    onClick={() => { setLoading(true); fetchPrices(); }}
                    className="btn-icon"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    title="Refresh prices"
                >
                    <RefreshCw size={18} className={loading ? 'spin' : ''} />
                </button>
            </div>

            {loading && !Object.keys(prices).length ? (
                <div className="loading-screen">
                    <div className="spinner" />
                    <p>Loading market data...</p>
                </div>
            ) : (
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                    {SYMBOLS.map(asset => {
                        const data = prices[asset.id];
                        if (!data) return null;

                        const isPositive = data.change24h >= 0;

                        return (
                            <div
                                key={asset.id}
                                className={`stat-card market-card-hover ${isPositive ? 'positive' : 'negative'}`}
                                onClick={() => setSelectedAsset(asset)}
                            >
                                <div style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div className="stat-icon" style={{ width: '36px', height: '36px' }}>
                                                <Activity size={18} />
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{asset.name}</h3>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{asset.symbol}</span>
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                background: isPositive ? 'var(--green-bg)' : 'var(--red-bg)',
                                                color: isPositive ? 'var(--green)' : 'var(--red)',
                                                fontSize: '0.85rem',
                                                fontWeight: '600'
                                            }}
                                        >
                                            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                            {Math.abs(data.change24h).toFixed(2)}%
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '1.6rem', fontWeight: '700', fontFamily: '"Space Grotesk", sans-serif' }}>
                                                {formatPrice(data.price)}
                                            </span>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                Vol: {formatVolume(data.volume)}
                                            </span>
                                        </div>
                                        <a
                                            href={asset.xLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '8px',
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                color: 'var(--text-secondary)',
                                                transition: 'all 0.2s',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                                e.currentTarget.style.color = '#fff';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                                e.currentTarget.style.color = 'var(--text-secondary)';
                                            }}
                                            title={`Visit ${asset.name} on X`}
                                        >
                                            <Twitter size={16} />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )
            }

            {lastUpdated && (
                <div style={{ marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                    Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
            )}

            {selectedAsset && (
                <div
                    className="chart-modal-overlay"
                    onClick={() => setSelectedAsset(null)}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}
                >
                    <div
                        className="chart-modal-content"
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: '1000px',
                            height: '70vh',
                            minHeight: '400px',
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            position: 'relative',
                            border: '1px solid var(--border)',
                            boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
                        }}
                    >
                        <button
                            onClick={() => setSelectedAsset(null)}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                zIndex: 10,
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border)',
                                color: 'var(--text)',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--red-bg)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                        >
                            <X size={18} />
                        </button>
                        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {selectedAsset.name} ({selectedAsset.symbol}) Live Chart
                            </h3>
                        </div>
                        <iframe
                            src={selectedAsset.embedLink}
                            style={{ width: '100%', height: 'calc(100% - 58px)', border: 'none' }}
                            title={`${selectedAsset.name} Chart`}
                        />
                    </div>
                </div>
            )}

            <style>{`
        .spin { animation: spin 1s linear infinite; }
        .market-card-hover { cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
        .market-card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
      `}</style>
        </div >
    );
}
