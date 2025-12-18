
/**
 * Inventory Agent
 * Analyzes sales and inventory data to predict stockouts and recommend reorders.
 */

export const InventoryAgent = {
  id: 'inventory_agent',
  name: 'Inventory Operations Agent',
  description: 'Analyzes stock levels and predicts demand.',

  /**
   * Main analysis function
   * @param {Array} salesData - List of sales transactions
   * @param {Array} inventoryData - Current stock levels
   * @returns {Object} { insights: [], summary: {} }
   */
  analyze: (salesData, inventoryData) => {
    const insights = [];
    const leadTimeDays = 7; // Assumption for MSME supply chain
    const safetyStockDays = 14;

    // Helper: Calculate sales velocity per SKU
    const salesStats = {};
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // 1. Aggregating Sales
    salesData.forEach(sale => {
      const date = new Date(sale.date);
      if (date >= thirtyDaysAgo) {
        if (!salesStats[sale.sku_id]) {
          salesStats[sale.sku_id] = { totalSold: 0, name: sale.product_name, revenue: 0 };
        }
        salesStats[sale.sku_id].totalSold += Number(sale.quantity);
        salesStats[sale.sku_id].revenue += Number(sale.price) * Number(sale.quantity);
      }
    });

    // 2. Analyzing Inventory vs Demand
    inventoryData.forEach(item => {
      const stat = salesStats[item.sku_id] || { totalSold: 0, name: item.product_name || "Unknown Product" };
      const dailyVelocity = stat.totalSold / 30; // 30-day average
      const currentStock = Number(item.quantity);

      // Impact analysis
      const daysUntilStockout = dailyVelocity > 0 ? (currentStock / dailyVelocity) : 999;

      if (daysUntilStockout < leadTimeDays) {
        // CRITICAL ALERT
        const reorderNeeded = Math.ceil((safetyStockDays * dailyVelocity) - currentStock);

        insights.push({
          type: 'critical',
          category: 'Stockout Risk',
          title: `Low Stock Alert: ${stat.name}`,
          message: `Only ${Math.floor(daysUntilStockout)} days of stock remaining based on recent sales.`,
          recommendation: `Reorder ${reorderNeeded} units immediately to maintain safety stock.`,
          data: { sku: item.sku_id, currentStock, dailyVelocity, daysUntilStockout },
          confidence: 0.95
        });
      } else if (daysUntilStockout < safetyStockDays) {
        // WARNING
        insights.push({
          type: 'warning',
          category: 'Reorder Soon',
          title: `Plan Reorder: ${stat.name}`,
          message: `Stock will likely be depleted in ${Math.floor(daysUntilStockout)} days.`,
          recommendation: `Check supplier availability.`,
          data: { sku: item.sku_id, currentStock, dailyVelocity },
          confidence: 0.85
        });
      } else if (currentStock > (dailyVelocity * 90) && dailyVelocity > 0) {
        // OVERSTOCK
        insights.push({
          type: 'info',
          category: 'Overstock Risk',
          title: `Excess Inventory: ${stat.name}`,
          message: `You have >3 months of supply. Money is tied up here.`,
          recommendation: `Consider running a promotion to clear space.`,
          data: { sku: item.sku_id, currentStock, dailyVelocity },
          confidence: 0.90
        });
      }
    });

    return {
      agent: 'Inventory Agent',
      insights: insights.sort((a, b) => {
        if (a.type === 'critical') return -1;
        if (b.type === 'critical') return 1;
        return 0;
      })
    };
  }
};
