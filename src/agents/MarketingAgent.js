
/**
 * Marketing Agent
 * Identifies opportunities and generates content.
 */

export const MarketingAgent = {
    id: 'marketing_agent',
    name: 'Marketing Creative Agent',
    description: 'Generates campaigns for inventory opportunities.',

    analyze: (salesData, inventoryData) => {
        const insights = [];

        // Identify Slow Movers (High Stock, Low Sales)
        // Reuse logic or pass in calculated metrics? For independence, we recalculate or ideally receive enriched data.
        // For simplicity, we'll do a quick pass similar to InventoryAgent but focused on "Opportunities".

        const salesStats = {};
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        salesData.forEach(sale => {
            if (new Date(sale.date) >= thirtyDaysAgo) {
                if (!salesStats[sale.sku_id]) salesStats[sale.sku_id] = 0;
                salesStats[sale.sku_id] += Number(sale.quantity);
            }
        });

        inventoryData.forEach(item => {
            const sold30d = salesStats[item.sku_id] || 0;
            const currentStock = Number(item.quantity);

            // Rule: Zero sales in 30 days but have stock -> Dead Stock Promo
            if (sold30d === 0 && currentStock > 5) {
                insights.push({
                    type: 'opportunity',
                    category: 'Dead Stock Clearance',
                    title: `Clearance: ${item.product_name}`,
                    message: `0 units sold in 30 days. ${currentStock} units sitting idle.`,
                    recommendation: 'Run a "Flash Sale" to recover cash.',
                    content: {
                        platform: 'WhatsApp/Instagram',
                        text: `🔥 FLASH SALE! We need to make room for new stock. Get our ${item.product_name} at a special price for the next 24 hours only! DM to order. #Clearance #Deal`,
                    },
                    confidence: 0.9
                });
            }

            // Rule: High sales -> "Restock Alert" or "Social Proof" post
            if (sold30d > 20) {
                insights.push({
                    type: 'opportunity',
                    category: 'Bestseller Hype',
                    title: `Trending: ${item.product_name}`,
                    message: `Selling fast (${sold30d} sold recently). Leverage this momentum.`,
                    recommendation: 'Post a "Low Stock" or "Customer Favorite" update.',
                    content: {
                        platform: 'Instagram Story',
                        text: `Our ${item.product_name} is flying off the shelves! 🚀 Only ${currentStock} left. Grab yours before they're gone!`,
                    },
                    confidence: 0.85
                });
            }
        });

        return {
            agent: 'Marketing Agent',
            insights
        };
    }
};
