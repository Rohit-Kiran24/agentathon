
import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

export function InventoryView({ insights, inventoryData }) {
    const alerts = insights.filter(i => i.type === 'critical' || i.type === 'warning');

    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1>Inventory Agent</h1>
                <p>Stock leveling and reorder predictions.</p>
            </header>

            {/* Insights Carousel */}
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                {alerts.map((alert, idx) => (
                    <div key={idx} className="glass-card" style={{ minWidth: '300px', borderTop: `4px solid ${alert.type === 'critical' ? '#ef4444' : '#f59e0b'}` }}>
                        <h4 style={{ fontWeight: 'bold' }}>{alert.title}</h4>
                        <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}>{alert.message}</p>
                        <div style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                            👉 {alert.recommendation}
                        </div>
                    </div>
                ))}
            </div>

            <div className="glass-panel">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <th style={{ padding: '1rem' }}>Product Name</th>
                            <th style={{ padding: '1rem' }}>SKU</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Current Stock</th>
                            <th style={{ padding: '1rem' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventoryData.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '1rem' }}>{item.product_name}</td>
                                <td style={{ padding: '1rem', opacity: 0.7 }}>{item.sku_id}</td>
                                <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                                    {item.quantity}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    {item.quantity < 5 ? (
                                        <span className="badge badge-critical">Low Stock</span>
                                    ) : item.quantity > 50 ? (
                                        <span className="badge badge-info">Overstocked</span>
                                    ) : (
                                        <span className="badge badge-success">Healthy</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {inventoryData.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
                                    No inventory data loaded.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
