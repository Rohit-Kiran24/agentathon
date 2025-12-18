
/**
 * ContextBuilder
 * Prepares the most relevant data slice for the LLM.
 * In a full system, this would use Vector Search. 
 * For this localized demo, we do "Keyword Filtering" + "Summary".
 */
export const ContextBuilder = {

    build: (query, allData) => {
        const queryLower = query.toLowerCase();

        // 1. Filter Sales
        const relevantSales = allData.sales.filter(s =>
            s.product_name.toLowerCase().includes(queryLower) ||
            s.channel.toLowerCase().includes(queryLower)
        ).slice(0, 50); // Limit to 50 recent relevant transactions

        // 2. Filter Inventory
        const relevantInventory = allData.inventory.filter(i =>
            i.product_name.toLowerCase().includes(queryLower) ||
            queryLower.includes('stock') ||
            queryLower.includes('inventory')
        );

        // 3. Finance Summary (Always include if query mentions 'money', 'cash', 'profit')
        let financeContext = null;
        if (['cash', 'money', 'profit', 'expense', 'finance'].some(k => queryLower.includes(k))) {
            financeContext = {
                recentExpenses: allData.expenses.slice(0, 10),
                totalRevenueEstimates: relevantSales.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0)
            };
        }

        // 4. Construct Payload
        return {
            topic: 'Business Query',
            relevantInventory: relevantInventory.length > 0 ? relevantInventory : "No specific inventory matched",
            relevantSalesSummary: {
                count: relevantSales.length,
                samples: relevantSales.slice(0, 5) // Give a few examples
            },
            financeContext: financeContext || "Not requested",
            fullContextAvailable: "If no specific keyword matched, this is a general query."
        };
    }
};
