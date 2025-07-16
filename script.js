class RestaurantOrderSystem {
    constructor() {
        this.deviceId = this.generateDeviceId();
        this.syncKey = 'comande-sync-' + Date.now();
        this.loadFromStorage();
        this.initializeEventListeners();
        this.initializeMultiselect();
        this.initializeNotifications();
        this.initializeWebSocket();
        this.initializeMenuManagement();
        this.startSyncLoop();
    }
    
    generateDeviceId() {
        let deviceId = localStorage.getItem('device-id');
        if (!deviceId) {
            deviceId = 'device-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('device-id', deviceId);
        }
        return deviceId;
    }
    
    loadFromStorage() {
        // Load orders
        const savedOrders = localStorage.getItem('orders');
        this.orders = savedOrders ? JSON.parse(savedOrders) : [];
        
        // Load order counter
        const savedCounter = localStorage.getItem('orderIdCounter');
        this.orderIdCounter = savedCounter ? parseInt(savedCounter) : 1;
        
        // Load dishes
        const savedDishes = localStorage.getItem('dishes');
        this.dishes = savedDishes ? JSON.parse(savedDishes) : [
            'Pasta al Pomodoro',
            'Pizza Margherita',
            'Risotto ai Funghi',
            'Cotoletta alla Milanese',
            'Insalata Mista'
        ];
        
        // Load drinks
        const savedDrinks = localStorage.getItem('drinks');
        this.drinks = savedDrinks ? JSON.parse(savedDrinks) : [
            'Acqua Naturale',
            'Acqua Frizzante',
            'Vino Rosso',
            'Birra',
            'Caffè'
        ];
    }
    
    saveToStorage() {
        localStorage.setItem('orders', JSON.stringify(this.orders));
        localStorage.setItem('orderIdCounter', this.orderIdCounter.toString());
        localStorage.setItem('dishes', JSON.stringify(this.dishes));
        localStorage.setItem('drinks', JSON.stringify(this.drinks));
        
        // Save sync data with timestamp
        const syncData = {
            orders: this.orders,
            orderIdCounter: this.orderIdCounter,
            dishes: this.dishes,
            drinks: this.drinks,
            deviceId: this.deviceId,
            timestamp: Date.now()
        };
        localStorage.setItem('sync-data', JSON.stringify(syncData));
    }
    
    startSyncLoop() {
        // Check for updates from other devices every 2 seconds
        setInterval(() => {
            this.checkForUpdates();
        }, 2000);
    }
    
    checkForUpdates() {
        const syncData = localStorage.getItem('sync-data');
        if (syncData) {
            const data = JSON.parse(syncData);
            if (data.deviceId !== this.deviceId && data.timestamp > (this.lastSyncTime || 0)) {
                this.lastSyncTime = data.timestamp;
                
                // Merge orders (avoid duplicates)
                const existingIds = new Set(this.orders.map(o => o.id));
                const newOrders = data.orders.filter(o => !existingIds.has(o.id));
                
                if (newOrders.length > 0) {
                    this.orders.push(...newOrders);
                    this.displayOrders();
                    this.showNotification(`${newOrders.length} nuovi ordini da altro dispositivo`, 'success');
                }
                
                // Update counter if needed
                if (data.orderIdCounter > this.orderIdCounter) {
                    this.orderIdCounter = data.orderIdCounter;
                }
                
                // Update menu items
                this.dishes = data.dishes;
                this.drinks = data.drinks;
                this.renderMenuItems();
                this.updateMultiselectOptions();
                
                this.saveToStorage();
            }
        }
    }

    initializeEventListeners() {
        const orderForm = document.getElementById('orderForm');
        orderForm.addEventListener('submit', (e) => this.handleOrderSubmit(e));
        
        // Menu management toggle
        const toggleBtn = document.getElementById('toggleMenuManagement');
        toggleBtn.addEventListener('click', () => this.toggleMenuManagement());
        
        // Clear all button
        const clearAllBtn = document.getElementById('clearAll');
        clearAllBtn.addEventListener('click', () => this.clearAll());
        
        // Add dish/drink buttons
        const addDishBtn = document.getElementById('addDish');
        const addDrinkBtn = document.getElementById('addDrink');
        addDishBtn.addEventListener('click', () => this.addDish());
        addDrinkBtn.addEventListener('click', () => this.addDrink());
        
        // Enter key support for adding items
        document.getElementById('newDishInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addDish();
        });
        document.getElementById('newDrinkInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addDrink();
        });
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
        // Add timestamp for better sync
        order.timestamp = new Date();
        order.deviceId = this.deviceId;
        
        // Simulate backend submission
        this.orders.push(order);
        this.saveToStorage();
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
            order.statusUpdatedBy = this.deviceId;
            order.statusUpdatedAt = new Date();
            
            this.saveToStorage();
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
        // Register service worker for push notifications
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                    this.swRegistration = registration;
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }
        
        // Request permission for push notifications
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        this.showNotification('Notifiche push attivate!', 'success');
                    }
                });
            }
        }
    }

    sendPushNotification(message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            // Send notification regardless of page visibility for testing
            const options = {
                body: message,
                icon: './icon-192x192.png',
                badge: './badge-72x72.png',
                tag: 'order-update',
                vibrate: [200, 100, 200],
                requireInteraction: true,
                actions: [
                    {
                        action: 'view',
                        title: 'Visualizza'
                    }
                ]
            };
            
            // Use service worker if available, otherwise fallback to simple notification
            if (this.swRegistration) {
                this.swRegistration.showNotification('Comande Restaurant', options);
            } else {
                new Notification('Comande Restaurant', options);
            }
        }
    }

    initializeWebSocket() {
        // Simulate WebSocket connection for real-time updates
        // In a real implementation, this would connect to your backend
        this.simulateRealTimeUpdates();
    }
    
    initializeMenuManagement() {
        this.renderMenuItems();
    }
    
    toggleMenuManagement() {
        const menuManagement = document.getElementById('menuManagement');
        const orderForm = document.getElementById('orderForm');
        const toggleBtn = document.getElementById('toggleMenuManagement');
        
        if (menuManagement.classList.contains('hidden')) {
            menuManagement.classList.remove('hidden');
            orderForm.classList.add('hidden');
            toggleBtn.textContent = 'Torna agli Ordini';
        } else {
            menuManagement.classList.add('hidden');
            orderForm.classList.remove('hidden');
            toggleBtn.textContent = 'Gestione Menù';
        }
    }
    
    clearAll() {
        if (confirm('Sei sicuro di voler cancellare tutti gli ordini e le notifiche?')) {
            // Clear orders
            this.orders = [];
            this.saveToStorage();
            this.displayOrders();
            
            // Clear notifications
            const notificationsList = document.getElementById('notificationsList');
            notificationsList.innerHTML = '';
            document.getElementById('notifications').classList.add('hidden');
            
            this.showNotification('Tutti gli ordini e le notifiche sono stati cancellati', 'success');
        }
    }
    
    addDish() {
        const input = document.getElementById('newDishInput');
        const dishName = input.value.trim();
        
        if (!dishName) {
            this.showNotification('Inserisci il nome del piatto', 'warning');
            return;
        }
        
        if (this.dishes.includes(dishName)) {
            this.showNotification('Questo piatto esiste già', 'warning');
            return;
        }
        
        this.dishes.push(dishName);
        input.value = '';
        this.saveToStorage();
        this.renderMenuItems();
        this.updateMultiselectOptions();
        this.showNotification(`Piatto "${dishName}" aggiunto`, 'success');
    }
    
    addDrink() {
        const input = document.getElementById('newDrinkInput');
        const drinkName = input.value.trim();
        
        if (!drinkName) {
            this.showNotification('Inserisci il nome della bevanda', 'warning');
            return;
        }
        
        if (this.drinks.includes(drinkName)) {
            this.showNotification('Questa bevanda esiste già', 'warning');
            return;
        }
        
        this.drinks.push(drinkName);
        input.value = '';
        this.saveToStorage();
        this.renderMenuItems();
        this.updateMultiselectOptions();
        this.showNotification(`Bevanda "${drinkName}" aggiunta`, 'success');
    }
    
    removeDish(dishName) {
        if (confirm(`Sei sicuro di voler rimuovere "${dishName}"?`)) {
            this.dishes = this.dishes.filter(dish => dish !== dishName);
            this.saveToStorage();
            this.renderMenuItems();
            this.updateMultiselectOptions();
            this.showNotification(`Piatto "${dishName}" rimosso`, 'success');
        }
    }
    
    removeDrink(drinkName) {
        if (confirm(`Sei sicuro di voler rimuovere "${drinkName}"?`)) {
            this.drinks = this.drinks.filter(drink => drink !== drinkName);
            this.saveToStorage();
            this.renderMenuItems();
            this.updateMultiselectOptions();
            this.showNotification(`Bevanda "${drinkName}" rimossa`, 'success');
        }
    }
    
    renderMenuItems() {
        const dishList = document.getElementById('dishManagementList');
        const drinkList = document.getElementById('drinkManagementList');
        
        dishList.innerHTML = '';
        drinkList.innerHTML = '';
        
        this.dishes.forEach(dish => {
            const item = document.createElement('div');
            item.className = 'management-item';
            item.innerHTML = `
                <span>${dish}</span>
                <button onclick="orderSystem.removeDish('${dish}')" class="remove-btn">Rimuovi</button>
            `;
            dishList.appendChild(item);
        });
        
        this.drinks.forEach(drink => {
            const item = document.createElement('div');
            item.className = 'management-item';
            item.innerHTML = `
                <span>${drink}</span>
                <button onclick="orderSystem.removeDrink('${drink}')" class="remove-btn">Rimuovi</button>
            `;
            drinkList.appendChild(item);
        });
    }
    
    updateMultiselectOptions() {
        const dishesOptions = document.getElementById('dishesOptions');
        const drinksOptions = document.getElementById('drinksOptions');
        
        dishesOptions.innerHTML = '';
        drinksOptions.innerHTML = '';
        
        this.dishes.forEach((dish, index) => {
            const option = document.createElement('div');
            option.className = 'option';
            option.innerHTML = `
                <input type="checkbox" id="dish${index + 1}" value="${dish}">
                <label for="dish${index + 1}">${dish}</label>
            `;
            dishesOptions.appendChild(option);
        });
        
        this.drinks.forEach((drink, index) => {
            const option = document.createElement('div');
            option.className = 'option';
            option.innerHTML = `
                <input type="checkbox" id="drink${index + 1}" value="${drink}">
                <label for="drink${index + 1}">${drink}</label>
            `;
            drinksOptions.appendChild(option);
        });
        
        // Re-setup multiselect updates
        this.setupMultiselectUpdates('dishesOptions', 'dishesHeader');
        this.setupMultiselectUpdates('drinksOptions', 'drinksHeader');
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