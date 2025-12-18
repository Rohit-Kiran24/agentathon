
import React from 'react';
import { AlertTriangle, TrendingUp, DollarSign, Package } from 'lucide-react';

export function Dashboard({ insights, summaryData }) {
    const criticalAlerts = insights.filter(i => i.type === 'critical');
    const opportunities = insights.filter(i => i.type === 'opportunity');

    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1>Executive Overview</h1>
                <p>Real-time operational intelligence.</p>
            </header>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>Net Cash Flow (30d)</span>
                        <DollarSign size={20} color="#10b981" />
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                        ${summaryData.netCash?.toFixed(0) || '0'}
                    </div>
                </div>
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>Active Alerts</span>
                        <AlertTriangle size={20} color="#ef4444" />
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                        {criticalAlerts.length}
                    </div>
                </div>
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>Promo Opportunities</span>
                        <TrendingUp size={20} color="#3b82f6" />
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                        {opportunities.length}
                    </div>
                </div>
            </div>

            {/* Critical Alerts Section */}
            <section>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={20} color="#ef4444" /> Action Required
                </h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {criticalAlerts.length === 0 ? (
                        <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
                            <p>All systems operational. No critical issues detected.</p>
                        </div>
                    ) : (
                        criticalAlerts.map((alert, idx) => (
                            <div key={idx} className="glass-card" style={{ borderLeft: '4px solid #ef4444' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span className="badge badge-critical">{alert.category}</span>
                                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Confidence: {(alert.confidence * 100).toFixed(0)}%</span>
                                </div>
                                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{alert.title}</h4>
                                <p style={{ marginBottom: '1rem' }}>{alert.message}</p>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px' }}>
                                    <strong>Recommendation:</strong> {alert.recommendation}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}
