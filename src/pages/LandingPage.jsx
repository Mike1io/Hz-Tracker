import { useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, TrendingUp, History, Activity, ShieldCheck, Zap, Twitter } from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import '../Landing.css';

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="landing-page">
            <PublicHeader />

            <section className="hero-section">
                <div className="container">
                    <div className="hero-content">
                        <h1>Master Your Crypto Trading Journey</h1>
                        <p className="hero-subtitle">
                            The ultimate professional trading journal and market tracker designed specifically for serious high-frequency and swing traders.
                        </p>
                        <div className="hero-actions">
                            <button
                                className="btn-primary"
                                onClick={() => navigate('/login', { state: { isSignUp: true } })}
                            >
                                Get Started Free <ArrowRight size={20} />
                            </button>
                            <button className="btn-secondary">View Demo</button>
                        </div>
                    </div>
                </div>

                <div className="hero-illustration">
                    <div className="illustration-glow" />
                    <div className="illustration-grid" />
                </div>
            </section>

            <section className="diagram-section">
                <div className="container">
                    <div className="section-header">
                        <h2>How H-Tracker Works</h2>
                        <p>A seamless workflow designed for peak performance</p>
                    </div>

                    <div className="feature-diagram">
                        <div className="diagram-step active">
                            <div className="step-icon">
                                <History size={32} />
                            </div>
                            <h3>Log Your Trades</h3>
                            <p>Capture every entry, exit, and reason with our lightning-fast interface.</p>
                            <div className="step-connector">
                                <div className="connector-line" />
                                <ArrowRight className="connector-arrow" size={16} />
                            </div>
                        </div>

                        <div className="diagram-step active">
                            <div className="step-icon">
                                <Activity size={32} />
                            </div>
                            <h3>Monitor Markets</h3>
                            <p>Real-time data and advanced charts to keep you ahead of the trend.</p>
                            <div className="step-connector">
                                <div className="connector-line" />
                                <ArrowRight className="connector-arrow" size={16} />
                            </div>
                        </div>

                        <div className="diagram-step active">
                            <div className="step-icon">
                                <BarChart3 size={32} />
                            </div>
                            <h3>Analyze Stats</h3>
                            <p>Deep dive into your PnL, win rates, and behavioral patterns.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="features-grid-section">
                <div className="container">
                    <div className="features-grid">
                        <div className="feature-card">
                            <Zap className="feature-icon" size={24} />
                            <h4>Fast Infrastructure</h4>
                            <p>Real-time updates and low-latency data fetching for active traders.</p>
                        </div>
                        <div className="feature-card">
                            <ShieldCheck className="feature-icon" size={24} />
                            <h4>Secure Data</h4>
                            <p>Your trading history is encrypted and stored safely with Supabase.</p>
                        </div>
                        <div className="feature-card">
                            <TrendingUp className="feature-icon" size={24} />
                            <h4>Growth Focused</h4>
                            <p>Tools designed to help you identify mistakes and replicate success.</p>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="landing-footer">
                <div className="container">
                    <div className="footer-content">
                        <div className="footer-left">
                            <div className="brand">
                                <TrendingUp size={24} />
                                <span>H-Tracker</span>
                            </div>
                            <p>&copy; 2026 H-Tracker. Built for the next generation of traders.</p>
                        </div>

                        <div className="footer-right">
                            <a
                                href="https://x.com/HTracker_"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="twitter-link"
                                title="Follow HTracker_ on X"
                            >
                                <Twitter size={20} />
                                <span>Follow on X</span>
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
