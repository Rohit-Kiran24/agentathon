
import { v4 as uuidv4 } from 'uuid';

/**
 * StreamService
 * Simulates real-time WebSockets from external platforms (WhatsApp, Shopify, Bank).
 */
export class StreamService {
    constructor(onEvent) {
        this.onEvent = onEvent;
        this.intervals = {};
        this.isConnected = {
            whatsapp: false,
            shopify: false,
            bank: false
        };
    }

    connect(source) {
        if (this.isConnected[source]) return;
        this.isConnected[source] = true;

        // Simulate incoming events
        this.intervals[source] = setInterval(() => {
            this.emitRandomEvent(source);
        }, this.getRandomInterval());
    }

    disconnect(source) {
        if (!this.isConnected[source]) return;
        this.isConnected[source] = false;
        clearInterval(this.intervals[source]);
    }

    getRandomInterval() {
        return Math.random() * (15000 - 5000) + 5000; // 5s to 15s
    }

    emitRandomEvent(source) {
        let event = null;

        if (source === 'whatsapp') {
            const products = ['Cotton T-Shirt', 'Denim Jeans', 'Summer Hat'];
            const product = products[Math.floor(Math.random() * products.length)];
            event = {
                id: uuidv4(),
                source: 'WhatsApp',
                type: 'NEW_ORDER',
                message: `New Order via WhatsApp: 2x ${product}`,
                data: {
                    product_name: product,
                    quantity: 2,
                    amount: 1000,
                    timestamp: new Date()
                }
            };
        } else if (source === 'shopify') {
            event = {
                id: uuidv4(),
                source: 'Shopify',
                type: 'INVENTORY_UPDATE',
                message: `Stock Update: Returns processed for Order #992`,
                data: {
                    product_name: 'Sneakers',
                    quantity_change: 1,
                    timestamp: new Date()
                }
            };
        }

        if (event && this.onEvent) {
            this.onEvent(event);
        }
    }
}
