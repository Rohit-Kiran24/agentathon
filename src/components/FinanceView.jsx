
import React from 'react';
import { TrendingDown, TrendingUp, DollarSign } from 'lucide-react';

export function FinanceView({ insights, summary }) {
    const netPositive = (summary?.net || 0) >= 0;

    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1>Finance Agent</h1>
                <p>Cash flow stability and forecasting.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="glass-card">
                    <h4>30-Day Revenue</h4>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                        +${summary?.revenue30d?.toFixed(2) || '0.00'}
                    </div>
                </div>
                <div className="glass-card">
                    <h4>30-Day Expenses</h4>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>
                        -${summary?.expenses30d?.toFixed(2) || '0.00'}
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                <h3>Net Cash Flow</h3>
                <div style={{
                    fontSize: '3rem',
                    fontWeight: 'bold',
                    color: netPositive ? '#10b981' : '#ef4444',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', margin: '1rem 0'
                }}>
                    {netPositive ? <TrendingUp size={40} /> : <TrendingDown size={40} />}
                    ${Math.abs(summary?.net || 0).toFixed(2)}
                </div>
                <p>{netPositive ? 'You are cash positive.' : 'Warning: Outflow exceeds inflow.'}</p>
            </div>

            <h3>Agent Insights</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
                {insights.map((insight, idx) => (
                    <div key={idx} className="glass-card" style={{ borderLeft: insight.type === 'critical' ? '4px solid #ef4444' : '4px solid #3b82f6' }}>
                        <h4>{insight.title}</h4>
                        <p>{insight.message}</p>
                        <p className="mt-2 text-sm opacity-80">💡 {insight.recommendation}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
