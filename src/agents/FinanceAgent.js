
/**
 * Finance Agent
 * Forecasts cash flow and analyzes financial health.
 */

export const FinanceAgent = {
    id: 'finance_agent',
    name: 'Finance Strategy Agent',
    description: 'Monitors cash flow and expense patterns.',

    /**
     * Analysis function
     * @param {Array} salesData - Sales history
     * @param {Array} expenseData - Expense history
     * @returns {Object} Insights
     */
    analyze: (salesData, expenseData) => {
        const insights = [];
        const now = new Date();

        // 1. Calculate Monthly Burn Rate and Revenue
        let totalRevenue30Days = 0;
        let totalExpenses30Days = 0;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        salesData.forEach(sale => {
            if (new Date(sale.date) >= thirtyDaysAgo) {
                totalRevenue30Days += (Number(sale.price) * Number(sale.quantity));
            }
        });

        expenseData.forEach(exp => {
            if (new Date(exp.date) >= thirtyDaysAgo) {
                totalExpenses30Days += Number(exp.amount);
            }
        });

        const netCashFlow = totalRevenue30Days - totalExpenses30Days;
        const margin = totalRevenue30Days > 0 ? (netCashFlow / totalRevenue30Days) * 100 : 0;

        // 2. Generate Insights
        if (netCashFlow < 0) {
            insights.push({
                type: 'critical',
                category: 'Cash Flow Alert',
                title: 'Negative Cash Flow (Last 30 Days)',
                message: `You spent ${Math.abs(netCashFlow).toFixed(2)} more than you earned.`,
                recommendation: 'Review non-essential expenses immediately or delay upcoming inventory purchases.',
                confidence: 1.0
            });
        } else {
            insights.push({
                type: 'success',
                category: 'Health Check',
                title: 'Positive Cash Flow',
                message: `Net positive by ${netCashFlow.toFixed(2)} this month.`,
                recommendation: 'Good time to reinvest in fast-moving inventory.',
                confidence: 1.0
            });
        }

        if (margin < 10 && margin > 0) {
            insights.push({
                type: 'warning',
                category: 'Low Margin',
                title: 'Tight Profit Margins',
                message: `Operating at only ${margin.toFixed(1)}% margin.`,
                recommendation: 'Analyze pricing strategy or reduce variable costs.',
                confidence: 0.95
            });
        }

        return {
            agent: 'Finance Agent',
            summary: {
                revenue30d: totalRevenue30Days,
                expenses30d: totalExpenses30Days,
                net: netCashFlow
            },
            insights
        };
    }
};
