
import React, { useState, useMemo, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { InventoryView } from './components/InventoryView';
import { FinanceView } from './components/FinanceView';
import { MarketingView } from './components/MarketingView';
import { UploadView } from './components/UploadView';
import { IntegrationHub } from './components/IntegrationHub';
import { AdvancedChat } from './components/Chat/AdvancedChat';

import { InventoryAgent } from './agents/InventoryAgent';
import { FinanceAgent } from './agents/FinanceAgent';
import { MarketingAgent } from './agents/MarketingAgent';
import { StreamService } from './services/StreamService';

import { Toaster, toast } from 'sonner'; // Using sonner for toasts if available, or basic alert. Wait, I didn't install sonner.
// I will simulate toast for now or just use console. Let's use a custom lightweight Toast.

function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: '#3b82f6', padding: '1rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 1000, color: 'white' }}>
      🔔 {message}
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState({ sales: [], inventory: [], expenses: [] });
  const [connections, setConnections] = useState({});
  const [toastMsg, setToastMsg] = useState(null);

  // Initialize Stream Service
  const streamService = useMemo(() => new StreamService((event) => {
    setToastMsg(event.message);
    setTimeout(() => setToastMsg(null), 4000);

    // Handle Data Updates based on event
    if (event.type === 'NEW_ORDER') {
      setData(prev => ({
        ...prev,
        sales: [event.data, ...prev.sales] // Add to top
      }));
    }
  }), []);

  const toggleConnection = (id) => {
    setConnections(prev => {
      const newState = { ...prev, [id]: !prev[id] };
      if (newState[id]) streamService.connect(id);
      else streamService.disconnect(id);
      return newState;
    });
  };

  const handleDataUpdate = (newData) => {
    setData(prev => ({ ...prev, ...newData }));
  };

  // Agent Thinking
  const inventoryResult = useMemo(() => InventoryAgent.analyze(data.sales, data.inventory), [data.sales, data.inventory]);
  const financeResult = useMemo(() => FinanceAgent.analyze(data.sales, data.expenses), [data.sales, data.expenses]);
  const marketingResult = useMemo(() => MarketingAgent.analyze(data.sales, data.inventory), [data.sales, data.inventory]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard insights={[...inventoryResult.insights, ...financeResult.insights, ...marketingResult.insights]} summaryData={financeResult.summary} />;
      case 'inventory': return <InventoryView insights={inventoryResult.insights} inventoryData={data.inventory} />;
      case 'finance': return <FinanceView insights={financeResult.insights} summary={financeResult.summary} />;
      case 'marketing': return <MarketingView insights={marketingResult.insights} />;
      case 'upload': return <UploadView onDataUpdate={handleDataUpdate} />;
      case 'integrations': return <IntegrationHub connections={connections} onToggle={toggleConnection} />;
      case 'chat': return <AdvancedChat allData={data} />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <div className="main-content">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="content-area">
          {renderContent()}
        </main>
      </div>
      <Toast message={toastMsg} />
    </div>
  );
}

export default App;
