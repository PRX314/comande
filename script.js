class RestaurantOrderSystem {
    constructor() {
        this.orders = [];
        this.orderIdCounter = 1;
        this.initializeEventListeners();
        this.initializeMultiselect();
        this.initializeNotifications();
        this.initializeWebSocket();
    }

    initializeEventListeners() {
        const orderForm = document.getElementById('orderForm');
        orderForm.addEventListener('submit', (e) => this.handleOrderSubmit(e));
    }

    initializeMultiselect() {
        const dishesHeader = document.getElementById('dishesHeader');
        const dishesOptions = document.getElementById('dishesOptions');
        const drinksHeader = document.getElementById('drinksHeader');
        const drinksOptions = document.getElementById('drinksOptions');

        this.setupMultiselect(dishesHeader, dishesOptions);
        this.setupMultiselect(drinksHeader, drinksOptions);

        // Update header text when options are selected
        this.setupMultiselectUpdates('dishesOptions', 'dishesHeader');
        this.setupMultiselectUpdates('drinksOptions', 'drinksHeader');
    }

    setupMultiselect(header, options) {
        header.addEventListener('click', () => {
            const isOpen = options.classList.contains('show');
            
            // Close all other multiselects
            document.querySelectorAll('.multiselect-options').forEach(opt => {
                opt.classList.remove('show');
            });
            document.querySelectorAll('.multiselect-header').forEach(head => {
                head.classList.remove('active');
            });
            document.querySelectorAll('.arrow').forEach(arrow => {
                arrow.classList.remove('rotated');
            });

            if (!isOpen) {
                options.classList.add('show');
                header.classList.add('active');
                header.querySelector('.arrow').classList.add('rotated');
            }
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!header.contains(e.target) && !options.contains(e.target)) {
                options.classList.remove('show');
                header.classList.remove('active');
                header.querySelector('.arrow').classList.remove('rotated');
            }
        });
    }

    setupMultiselectUpdates(optionsId, headerId) {
        const options = document.getElementById(optionsId);
        const header = document.getElementById(headerId);
        
        options.addEventListener('change', () => {
            const selected = options.querySelectorAll('input[type="checkbox"]:checked');
            const headerSpan = header.querySelector('span');
            
            if (selected.length === 0) {
                headerSpan.textContent = optionsId.includes('dishes') ? 'Seleziona piatti' : 'Seleziona bevande';
            } else {
                headerSpan.textContent = `${selected.length} selezionati`;
            }
        });
    }

    handleOrderSubmit(e) {
        e.preventDefault();
        
        const tableInput = document.getElementById('tableInput').value;
        const selectedDishes = this.getSelectedItems('dishesOptions');
        const selectedDrinks = this.getSelectedItems('drinksOptions');
        
        if (selectedDishes.length === 0 && selectedDrinks.length === 0) {
            this.showNotification('Seleziona almeno un piatto o una bevanda', 'warning');
            return;
        }

        const order = {
            id: this.orderIdCounter++,
            table: tableInput,
            dishes: selectedDishes,
            drinks: selectedDrinks,
            timestamp: new Date(),
            status: 'pending'
        };

        this.submitOrder(order);
        this.resetForm();
    }

    getSelectedItems(containerId) {
        const container = document.getElementById(containerId);
        const selectedCheckboxes = container.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(selectedCheckboxes).map(cb => cb.value);
    }

    submitOrder(order) {
        // Simulate backend submission
        this.orders.push(order);
        this.showNotification(`Ordine #${order.id} inviato per ${order.table}`, 'success');
        this.displayOrders();
        
        // Simulate processing
        setTimeout(() => {
            this.updateOrderStatus(order.id, 'preparing');
        }, 2000);
        
        setTimeout(() => {
            this.updateOrderStatus(order.id, 'ready');
        }, 10000);
    }

    updateOrderStatus(orderId, status) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            order.status = status;
            this.displayOrders();
            
            let message = '';
            switch(status) {
                case 'preparing':
                    message = `Ordine #${orderId} in preparazione`;
                    break;
                case 'ready':
                    message = `Ordine #${orderId} pronto!`;
                    break;
                case 'served':
                    message = `Ordine #${orderId} servito`;
                    break;
            }
            
            this.showNotification(message, 'success');
            this.sendPushNotification(message);
        }
    }

    displayOrders() {
        const ordersContainer = document.getElementById('orders');
        const ordersList = document.getElementById('ordersList');
        
        if (this.orders.length === 0) {
            ordersContainer.classList.add('hidden');
            return;
        }
        
        ordersContainer.classList.remove('hidden');
        ordersList.innerHTML = '';
        
        this.orders.forEach(order => {
            const orderElement = document.createElement('div');
            orderElement.className = 'order-item';
            orderElement.innerHTML = `
                <div class="order-header">
                    <span class="order-table">Ordine #${order.id} - ${order.table}</span>
                    <span class="order-status status-${order.status}">
                        ${this.getStatusText(order.status)}
                    </span>
                </div>
                <div class="order-items">
                    ${order.dishes.length > 0 ? `
                        <h4>Piatti (Cucina):</h4>
                        <ul>
                            ${order.dishes.map(dish => `<li>${dish}</li>`).join('')}
                        </ul>
                    ` : ''}
                    ${order.drinks.length > 0 ? `
                        <h4>Bevande (Bar):</h4>
                        <ul>
                            ${order.drinks.map(drink => `<li>${drink}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
                <div style="margin-top: 10px; font-size: 12px; color: #666;">
                    Ordinato: ${order.timestamp.toLocaleTimeString()}
                </div>
                ${order.status === 'ready' ? `
                    <button onclick="orderSystem.markAsServed(${order.id})" 
                            style="margin-top: 10px; padding: 5px 10px; background-color: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Segna come Servito
                    </button>
                ` : ''}
            `;
            ordersList.appendChild(orderElement);
        });
    }

    getStatusText(status) {
        const statusMap = {
            pending: 'In Attesa',
            preparing: 'In Preparazione',
            ready: 'Pronto',
            served: 'Servito'
        };
        return statusMap[status] || status;
    }

    markAsServed(orderId) {
        this.updateOrderStatus(orderId, 'served');
    }

    showNotification(message, type = 'success') {
        const notificationsContainer = document.getElementById('notifications');
        const notificationsList = document.getElementById('notificationsList');
        
        notificationsContainer.classList.remove('hidden');
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div>${message}</div>
            <div style="font-size: 12px; color: #666; margin-top: 5px;">
                ${new Date().toLocaleTimeString()}
            </div>
        `;
        
        notificationsList.insertBefore(notification, notificationsList.firstChild);
        
        // Remove old notifications (keep only last 5)
        while (notificationsList.children.length > 5) {
            notificationsList.removeChild(notificationsList.lastChild);
        }
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    resetForm() {
        document.getElementById('orderForm').reset();
        
        // Reset multiselect headers
        document.getElementById('dishesHeader').querySelector('span').textContent = 'Seleziona piatti';
        document.getElementById('drinksHeader').querySelector('span').textContent = 'Seleziona bevande';
        
        // Close all multiselects
        document.querySelectorAll('.multiselect-options').forEach(opt => {
            opt.classList.remove('show');
        });
        document.querySelectorAll('.multiselect-header').forEach(head => {
            head.classList.remove('active');
        });
        document.querySelectorAll('.arrow').forEach(arrow => {
            arrow.classList.remove('rotated');
        });
    }

    initializeNotifications() {
        // Request permission for push notifications
        if ('Notification' in window && 'serviceWorker' in navigator) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
    }

    sendPushNotification(message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            // Only send if page is not visible
            if (document.hidden) {
                new Notification('Comande Restaurant', {
                    body: message,
                    icon: '/favicon.ico',
                    tag: 'order-update'
                });
            }
        }
    }

    initializeWebSocket() {
        // Simulate WebSocket connection for real-time updates
        // In a real implementation, this would connect to your backend
        this.simulateRealTimeUpdates();
    }

    simulateRealTimeUpdates() {
        // Simulate incoming orders from other devices
        setInterval(() => {
            if (Math.random() > 0.95) { // 5% chance every interval
                const randomTables = ['Tavolo 5', 'Tavolo 12', 'Tavolo 3', 'Tavolo 8'];
                const randomDishes = ['Pasta al Pomodoro', 'Pizza Margherita', 'Risotto ai Funghi'];
                const randomDrinks = ['Acqua Naturale', 'Vino Rosso', 'Birra'];
                
                const simulatedOrder = {
                    id: this.orderIdCounter++,
                    table: randomTables[Math.floor(Math.random() * randomTables.length)],
                    dishes: [randomDishes[Math.floor(Math.random() * randomDishes.length)]],
                    drinks: [randomDrinks[Math.floor(Math.random() * randomDrinks.length)]],
                    timestamp: new Date(),
                    status: 'pending'
                };
                
                this.orders.push(simulatedOrder);
                this.showNotification(`Nuovo ordine da ${simulatedOrder.table}`, 'success');
                this.displayOrders();
            }
        }, 3000);
    }
}

// Initialize the system when the page loads
let orderSystem;
document.addEventListener('DOMContentLoaded', () => {
    orderSystem = new RestaurantOrderSystem();
});