
import React, { useState } from 'react';
import { FileText, CheckCircle, Database } from 'lucide-react';
import { DataSyncAgent } from '../agents/DataSyncAgent';
import Papa from 'papaparse';

export function UploadView({ onDataUpdate }) {
    const [status, setStatus] = useState({ sales: null, inventory: null, expenses: null });

    // Load Mock Data Handler
    const loadMockData = async () => {
        try {
            const loadCsv = async (path) => {
                const response = await fetch(path);
                const text = await response.text();
                return new Promise((resolve) => {
                    Papa.parse(text, { header: true, skipEmptyLines: true, complete: res => resolve(res.data) });
                });
            };

            const [sales, inventory, expenses] = await Promise.all([
                loadCsv('/mock_sales.csv'),
                loadCsv('/mock_inventory.csv'),
                loadCsv('/mock_expenses.csv')
            ]);

            const normalizedSales = DataSyncAgent.normalizeSales(sales);
            const normalizedInventory = DataSyncAgent.normalizeInventory(inventory);
            const normalizedExpenses = DataSyncAgent.normalizeExpenses(expenses);

            onDataUpdate({ sales: normalizedSales, inventory: normalizedInventory, expenses: normalizedExpenses });
            setStatus({ sales: 'Loaded', inventory: 'Loaded', expenses: 'Loaded' });

        } catch (e) {
            console.error(e);
            alert("Failed to load mock data");
        }
    };

    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const data = await DataSyncAgent.parseCSV(file);
            let normalized;
            if (type === 'sales') normalized = DataSyncAgent.normalizeSales(data);
            if (type === 'inventory') normalized = DataSyncAgent.normalizeInventory(data);
            if (type === 'expenses') normalized = DataSyncAgent.normalizeExpenses(data);

            onDataUpdate({ [type]: normalized });
            setStatus(prev => ({ ...prev, [type]: 'Uploaded' }));
        } catch (err) {
            console.error(err);
            alert("Error parsing CSV");
        }
    };

    return (
        <div>
            <header style={{ marginBottom: '2rem' }}>
                <h1>Data Sources</h1>
                <p>Upload your CSV exports to sync the agents.</p>
            </header>

            <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                {['sales', 'inventory', 'expenses'].map(type => (
                    <div key={type} className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ marginBottom: '1rem', color: status[type] ? '#10b981' : '#94a3b8' }}>
                            {status[type] ? <CheckCircle size={40} /> : <FileText size={40} />}
                        </div>
                        <h3 style={{ textTransform: 'capitalize' }}>{type} Data</h3>
                        <p style={{ fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                            {status[type] ? 'Data Synchronized' : 'Waiting for file...'}
                        </p>

                        <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-block' }}>
                            Upload CSV
                            <input
                                type="file"
                                accept=".csv"
                                onChange={(e) => handleFileUpload(e, type)}
                                style={{ display: 'none' }}
                            />
                        </label>
                    </div>
                ))}
            </div>

            <div className="glass-card" style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Database size={20} /> Use Demo Data
                    </h3>
                    <p style={{ margin: 0 }}>Quickly populate the dashboard to see it in action.</p>
                </div>
                <button onClick={loadMockData} className="btn-primary">
                    Load Mock Data
                </button>
            </div>
        </div>
    );
}
