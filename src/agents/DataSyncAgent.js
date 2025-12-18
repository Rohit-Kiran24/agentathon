
import Papa from 'papaparse';

/**
 * Data Sync Agent
 * Handles ingestion and normalization of data from various sources.
 */
export const DataSyncAgent = {
    id: 'data_sync_agent',
    name: 'Data Sync Agent',
    description: 'Ingests and normalizes fragmented data.',

    /**
     * Parse a CSV file
     * @param {File} file 
     * @returns {Promise<Array>}
     */
    parseCSV: (file) => {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => resolve(results.data),
                error: (err) => reject(err),
            });
        });
    },

    /**
     * Normalize sales data to the unified schema
     * @param {Array} rawData 
     * @returns {Array}
     */
    normalizeSales: (rawData) => {
        return rawData.map(row => ({
            date: row.date || row.Date || '',
            order_id: row.order_id || row['Order ID'] || `GEN-${Math.random().toString(36).substr(2, 9)}`,
            sku_id: row.sku_id || row.SKU || 'UNKNOWN',
            product_name: row.product_name || row['Product Name'] || 'Unknown Product',
            quantity: Number(row.quantity || row.Quantity || 0),
            price: Number(row.price || row.Price || 0),
            channel: row.channel || row.Channel || 'Direct'
        })).filter(item => item.date && item.quantity > 0);
    },

    /**
     * Normalize inventory data
     */
    normalizeInventory: (rawData) => {
        return rawData.map(row => ({
            sku_id: row.sku_id || row.SKU || 'UNKNOWN',
            product_name: row.product_name || row['Product Name'] || 'Unknown Product',
            quantity: Number(row.quantity || row.Quantity || 0),
            cost_price: Number(row.cost_price || row['Cost Price'] || 0)
        }));
    },

    /**
     * Normalize expense data
     */
    normalizeExpenses: (rawData) => {
        return rawData.map(row => ({
            date: row.date || row.Date || '',
            type: row.type || row.Type || 'Expense',
            amount: Number(row.amount || row.Amount || 0),
            description: row.description || row.Description || ''
        }));
    }
};
