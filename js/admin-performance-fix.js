// ========================================
// ADMIN PERFORMANCE OPTIMIZATION
// Fixes for slow click handlers and setInterval issues
// ========================================

class AdminPerformanceOptimizer {
    constructor() {
        this.debounceTimers = new Map();
        this.throttleTimers = new Map();
        this.lastExecutionTimes = new Map();
        this.isProcessing = new Map();
        
        console.log('🚀 Admin Performance Optimizer initialized');
        this.setupOptimizations();
    }

    // ========================================
    // DEBOUNCE AND THROTTLE UTILITIES
    // ========================================

    debounce(func, delay, key) {
        return (...args) => {
            if (this.debounceTimers.has(key)) {
                clearTimeout(this.debounceTimers.get(key));
            }
            
            const timer = setTimeout(() => {
                func.apply(this, args);
                this.debounceTimers.delete(key);
            }, delay);
            
            this.debounceTimers.set(key, timer);
        };
    }

    throttle(func, delay, key) {
        return (...args) => {
            const now = Date.now();
            const lastExecution = this.lastExecutionTimes.get(key) || 0;
            
            if (now - lastExecution >= delay) {
                this.lastExecutionTimes.set(key, now);
                return func.apply(this, args);
            }
        };
    }

    // Prevent multiple simultaneous executions
    preventConcurrent(func, key) {
        return async (...args) => {
            if (this.isProcessing.get(key)) {
                console.warn(`⚠️ ${key} already in progress, skipping...`);
                return;
            }
            
            this.isProcessing.set(key, true);
            try {
                const result = await func.apply(this, args);
                return result;
            } finally {
                this.isProcessing.set(key, false);
            }
        };
    }

    // ========================================
    // PERFORMANCE OPTIMIZATIONS
    // ========================================

    setupOptimizations() {
        // Optimize setInterval handlers
        this.optimizeSetIntervals();
        
        // Optimize click handlers
        this.optimizeClickHandlers();
        
        // Optimize table loading
        this.optimizeTableLoading();
        
        console.log('✅ Performance optimizations applied');
    }

    optimizeSetIntervals() {
        // Replace aggressive intervals with throttled versions
        const originalSetInterval = window.setInterval;
        
        window.setInterval = (callback, delay) => {
            if (delay < 5000) { // If interval is less than 5 seconds
                console.warn(`⚠️ Throttling aggressive interval from ${delay}ms to 5000ms`);
                delay = 5000; // Minimum 5 seconds
            }
            
            const throttledCallback = this.throttle(callback, delay, `interval_${Date.now()}`);
            return originalSetInterval(throttledCallback, delay);
        };
    }

    optimizeClickHandlers() {
        // Add event delegation for better performance
        document.addEventListener('click', this.debounce((event) => {
            const target = event.target;
            
            // Handle user table actions with debouncing
            if (target.matches('.user-action-btn, .delete-user-btn, .reset-votes-btn')) {
                this.handleUserAction(event);
            }
            
            // Handle tab switches with throttling
            if (target.matches('.tab-button, .nav-link')) {
                this.handleTabSwitch(event);
            }
        }, 300, 'click_handler'));
    }

    optimizeTableLoading() {
        // Create optimized table loading function
        window.loadUsersTableOptimized = this.preventConcurrent(async () => {
            console.log('📊 Loading users table (optimized)...');
            
            try {
                // Show loading indicator
                this.showLoadingIndicator();
                
                // Load users with timeout
                const users = await Promise.race([
                    window.kpuDB.getUsers(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout')), 5000)
                    )
                ]);
                
                // Process users in batches to prevent UI blocking
                await this.processUsersInBatches(users);
                
            } catch (error) {
                console.error('❌ Error loading users table:', error);
                this.showErrorMessage('Gagal memuat data pengguna');
            } finally {
                this.hideLoadingIndicator();
            }
        }, 'load_users_table');
    }

    async processUsersInBatches(users, batchSize = 10) {
        const tbody = document.querySelector('#usersTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = ''; // Clear existing content
        
        for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);
            
            // Process batch
            for (const user of batch) {
                const row = this.createUserRow(user);
                tbody.appendChild(row);
            }
            
            // Yield control to prevent UI blocking
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    createUserRow(user) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-2 text-sm">${user.id || 'N/A'}</td>
            <td class="px-4 py-2 text-sm font-medium">${user.name || 'N/A'}</td>
            <td class="px-4 py-2 text-sm">${user.username || 'N/A'}</td>
            <td class="px-4 py-2 text-sm">
                <span class="px-2 py-1 text-xs rounded-full ${this.getStatusClass(user.status)}">
                    ${user.status || 'Belum Voting'}
                </span>
            </td>
            <td class="px-4 py-2 text-sm">${user.vote_count || user.voteCount || 20}</td>
            <td class="px-4 py-2 text-sm">
                <div class="flex space-x-2">
                    <button class="reset-votes-btn px-2 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600" 
                            data-user-id="${user.id}">
                        Reset
                    </button>
                    <button class="delete-user-btn px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600" 
                            data-user-id="${user.id}">
                        Delete
                    </button>
                </div>
            </td>
        `;
        return row;
    }

    getStatusClass(status) {
        switch (status) {
            case 'Sudah Voting':
                return 'bg-green-100 text-green-800';
            case 'Belum Voting':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }

    // ========================================
    // UI HELPERS
    // ========================================

    showLoadingIndicator() {
        const indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.style.display = 'block';
        }
    }

    hideLoadingIndicator() {
        const indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    showErrorMessage(message) {
        console.error('❌', message);
        // You can implement a toast notification here
    }

    // ========================================
    // EVENT HANDLERS
    // ========================================

    handleUserAction(event) {
        const target = event.target;
        const userId = target.dataset.userId;
        
        if (target.classList.contains('reset-votes-btn')) {
            this.handleResetVotes(userId);
        } else if (target.classList.contains('delete-user-btn')) {
            this.handleDeleteUser(userId);
        }
    }

    handleTabSwitch(event) {
        // Throttled tab switching
        console.log('🔄 Tab switch:', event.target.textContent);
    }

    async handleResetVotes(userId) {
        if (!confirm('Reset votes untuk user ini?')) return;
        
        try {
            await window.kpuDB.resetUserVotes(userId);
            console.log('✅ Votes reset successfully');
            // Refresh table
            if (window.loadUsersTableOptimized) {
                window.loadUsersTableOptimized();
            }
        } catch (error) {
            console.error('❌ Error resetting votes:', error);
        }
    }

    async handleDeleteUser(userId) {
        if (!confirm('Hapus user ini?')) return;
        
        try {
            await window.kpuDB.deleteUser(userId);
            console.log('✅ User deleted successfully');
            // Refresh table
            if (window.loadUsersTableOptimized) {
                window.loadUsersTableOptimized();
            }
        } catch (error) {
            console.error('❌ Error deleting user:', error);
        }
    }
}

// ========================================
// INITIALIZE PERFORMANCE OPTIMIZER
// ========================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.adminPerformanceOptimizer = new AdminPerformanceOptimizer();
    });
} else {
    window.adminPerformanceOptimizer = new AdminPerformanceOptimizer();
}

console.log('🚀 Admin Performance Fix loaded');
