// ========================================
// KPU MONASMUDA DATABASE INTEGRATION
// JavaScript API Client
// ========================================

class KPUDatabase {
    constructor(apiUrl = null) {
        // 🔥 FIXED: Auto-detect XAMPP URL structure
        if (!apiUrl) {
            // Check if we're running in XAMPP environment
            const currentPath = window.location.pathname;
            if (currentPath.includes('/kpu-monasmuda/')) {
                // Running in XAMPP with kpu-monasmuda directory
                this.apiUrl = '/kpu-monasmuda/database/kpu_api.php';
            } else if (window.location.hostname === 'localhost' && window.location.port) {
                // Running on localhost with port (like XAMPP)
                this.apiUrl = '/kpu-monasmuda/database/kpu_api.php';
            } else {
                // Fallback to relative path
                this.apiUrl = 'database/kpu_api.php';
            }
        } else {
            this.apiUrl = apiUrl;
        }

        this.isOnline = false;
        this.connectionChecked = false;
        console.log('🔗 KPUDatabase initialized with API URL:', this.apiUrl);
        // Don't auto-check in constructor, let admin panel control it
    }

    // ========================================
    // CONNECTION MANAGEMENT
    // ========================================

    async checkConnection() {
        try {
            console.log('🔍 Checking database connection...');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

            const response = await fetch(`${this.apiUrl}?action=get_election_status`, {
                signal: controller.signal,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const result = await response.json();
                console.log('🔍 Connection check response:', result);

                // ✅ FIXED: Check if response has success property OR if it has data (both indicate working API)
                this.isOnline = (result.success === true) || (result.data !== undefined) || (result.status !== undefined);

                if (this.isOnline) {
                    console.log('✅ Database connection active - API responding correctly');
                } else {
                    console.log('❌ Database connection failed - API not responding correctly');
                    console.log('📊 Response details:', result);
                }
            } else {
                this.isOnline = false;
                console.log(`❌ Database connection failed - HTTP ${response.status}`);
            }

            this.connectionChecked = true;
            return this.isOnline;
        } catch (error) {
            this.isOnline = false;
            this.connectionChecked = true;
            console.log('❌ Database offline, using localStorage fallback:', error.message);
            return false;
        }
    }

    async apiCall(action, method = 'GET', data = null) {
        try {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                // Add timeout to prevent long-running requests
                signal: AbortSignal.timeout(10000) // 10 second timeout
            };

            if (data && method !== 'GET') {
                options.body = JSON.stringify(data);
            }

            const url = method === 'GET' && data ?
                `${this.apiUrl}?action=${action}&${new URLSearchParams(data).toString()}` :
                `${this.apiUrl}?action=${action}`;

            console.log(`🌐 API Call: ${method} ${url}`);

            const response = await fetch(url, options);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'API call failed');
            }

            return result.data;
        } catch (error) {
            console.error(`❌ API Error (${action}):`, error);
            throw error;
        }
    }

    // ========================================
    // USER MANAGEMENT
    // ========================================

    async getUsers() {
        if (!this.isOnline) {
            return JSON.parse(localStorage.getItem('kpu_users') || '[]');
        }

        try {
            const users = await this.apiCall('get_users');
            // Sync with localStorage
            localStorage.setItem('kpu_users', JSON.stringify(users));
            return users;
        } catch (error) {
            console.warn('Falling back to localStorage for users');
            return JSON.parse(localStorage.getItem('kpu_users') || '[]');
        }
    }

    async addUser(userData) {
        if (!this.isOnline) {
            // Fallback to localStorage
            const users = JSON.parse(localStorage.getItem('kpu_users') || '[]');
            users.push(userData);
            localStorage.setItem('kpu_users', JSON.stringify(users));
            return userData;
        }

        try {
            const result = await this.apiCall('add_user', 'POST', userData);
            // Update localStorage
            const users = await this.getUsers();
            return result;
        } catch (error) {
            console.warn('Falling back to localStorage for add user');
            const users = JSON.parse(localStorage.getItem('kpu_users') || '[]');
            users.push(userData);
            localStorage.setItem('kpu_users', JSON.stringify(users));
            return userData;
        }
    }

    // Alias for addUser to maintain compatibility
    async createUser(userData) {
        return this.addUser(userData);
    }

    async updateUser(userId, updates) {
        if (!this.isOnline) {
            return this.updateLocalUser(userId, updates);
        }

        try {
            // 🔥 FIXED: Only send fields that are actually being updated
            const updateData = { id: userId };

            // Only include fields that are explicitly provided and not empty
            if (updates.name !== undefined && updates.name !== null && updates.name.trim() !== '') {
                updateData.name = updates.name.trim();
            }
            if (updates.username !== undefined && updates.username !== null && updates.username.trim() !== '') {
                updateData.username = updates.username.trim();
            }
            if (updates.password !== undefined && updates.password !== null && updates.password.trim() !== '') {
                updateData.password = updates.password.trim();
            }
            if (updates.vote_count !== undefined || updates.voteCount !== undefined) {
                updateData.vote_count = updates.vote_count || updates.voteCount || 20;
            }
            if (updates.verified !== undefined) {
                updateData.verified = updates.verified;
            }
            if (updates.status !== undefined && updates.status !== null && updates.status.trim() !== '') {
                updateData.status = updates.status.trim();
            }

            console.log(`🔄 Updating user ${userId} with data:`, updateData);

            const result = await this.apiCall('update_user', 'PUT', updateData);
            console.log(`✅ User ${userId} updated in database`);
            return result;
        } catch (error) {
            console.error('❌ API Error (update_user):', error);
            console.error('❌ Error details:', error.message);
            console.warn('🔄 Falling back to local user update');

            // 🔥 ENHANCED: Don't throw error - just log and continue
            try {
                const result = this.updateLocalUser(userId, updates);
                console.log('✅ User updated locally as fallback');
                return result;
            } catch (fallbackError) {
                console.error('❌ Fallback user update also failed:', fallbackError);
                console.warn('⚠️ All user update methods failed, but continuing...');
                return true; // Return success to prevent blocking vote submission
            }
        }
    }

    updateLocalUser(userId, updates) {
        const users = JSON.parse(localStorage.getItem('kpu_users') || '[]');
        const userIndex = users.findIndex(user => user.id === userId);

        if (userIndex !== -1) {
            Object.assign(users[userIndex], updates);
            localStorage.setItem('kpu_users', JSON.stringify(users));
            console.log(`✅ User ${userId} updated locally`);
            return true;
        }

        console.warn(`❌ User ${userId} not found locally`);
        return false;
    }

    async deleteUser(userId) {
        console.log(`🗑️ Attempting to delete user: ${userId}`);

        if (!this.isOnline) {
            console.log('📱 Deleting user from localStorage...');
            const users = JSON.parse(localStorage.getItem('kpu_users') || '[]');
            const userToDelete = users.find(u => u.id === userId);
            const filtered = users.filter(u => u.id !== userId);
            localStorage.setItem('kpu_users', JSON.stringify(filtered));

            if (userToDelete) {
                console.log(`✅ User ${userToDelete.username} deleted from localStorage`);
                return { success: true, deleted_user: userToDelete };
            } else {
                console.warn(`⚠️ User ${userId} not found in localStorage`);
                return { success: false, error: 'User not found' };
            }
        }

        try {
            // Send userId as query parameter for DELETE request
            const url = `${this.apiUrl}?action=delete_user&id=${userId}`;
            console.log(`🌐 Sending DELETE request to: ${url}`);

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();
            console.log('🔄 Delete API response:', result);

            if (!result.success) {
                throw new Error(result.message || 'Delete failed');
            }

            // Clear any cached user data
            this.clearUserCache();

            console.log(`✅ User ${userId} deleted from database successfully`);
            console.log('📊 Delete details:', result.data);

            return { success: true, ...result.data };
        } catch (error) {
            console.error(`❌ Database delete failed for user ${userId}:`, error);
            console.warn('🔄 Falling back to localStorage for delete user');

            const users = JSON.parse(localStorage.getItem('kpu_users') || '[]');
            const userToDelete = users.find(u => u.id === userId);
            const filtered = users.filter(u => u.id !== userId);
            localStorage.setItem('kpu_users', JSON.stringify(filtered));

            if (userToDelete) {
                console.log(`✅ User ${userToDelete.username} deleted from localStorage (fallback)`);
                return { success: true, deleted_user: userToDelete, fallback: true };
            } else {
                console.warn(`⚠️ User ${userId} not found in localStorage (fallback)`);
                return { success: false, error: 'User not found', fallback: true };
            }
        }
    }

    // Helper method to clear user cache
    clearUserCache() {
        // Clear any cached user data that might interfere
        if (this.userCache) {
            delete this.userCache;
        }
        console.log('🧹 User cache cleared');
    }

    // ========================================
    // CANDIDATE MANAGEMENT
    // ========================================

    async getCandidates() {
        if (!this.isOnline) {
            return this.getDefaultCandidates();
        }

        try {
            const candidates = await this.apiCall('get_candidates');
            return candidates;
        } catch (error) {
            console.warn('Falling back to default candidates');
            return this.getDefaultCandidates();
        }
    }

    async updateCandidate(candidateData) {
        if (!this.isOnline) {
            // Store in localStorage for sync later
            const pendingUpdates = JSON.parse(localStorage.getItem('pending_candidate_updates') || '[]');
            pendingUpdates.push(candidateData);
            localStorage.setItem('pending_candidate_updates', JSON.stringify(pendingUpdates));
            return candidateData;
        }

        try {
            const result = await this.apiCall('update_candidate', 'PUT', candidateData);
            return result;
        } catch (error) {
            console.warn('Storing candidate update for later sync');
            const pendingUpdates = JSON.parse(localStorage.getItem('pending_candidate_updates') || '[]');
            pendingUpdates.push(candidateData);
            localStorage.setItem('pending_candidate_updates', JSON.stringify(pendingUpdates));
            return candidateData;
        }
    }

    getDefaultCandidates() {
        // NAMA YANG BENAR SESUAI DATABASE
        return [
            { id: 'presiden1', name: 'NENENG & INAYAH', category: 'presiden', position_number: 1 },
            { id: 'presiden2', name: 'AISYAH & EVI', category: 'presiden', position_number: 2 },
            { id: 'pm1', name: 'KUKUH', category: 'pm', position_number: 1 },
            { id: 'pm2', name: 'SAYYIDAH', category: 'pm', position_number: 2 },
            { id: 'parlemen1', name: 'ADINUR KHOLIFAH', category: 'parlemen', position_number: 1 },
            { id: 'parlemen2', name: 'ENI FATMAWATI', category: 'parlemen', position_number: 2 },
            { id: 'parlemen3', name: 'FAIZAH MAULIDA', category: 'parlemen', position_number: 3 },
            { id: 'parlemen4', name: 'AHMAD NASHUKA', category: 'parlemen', position_number: 4 }
        ];
    }

    // ========================================
    // VOTING SYSTEM
    // ========================================

    async castVote(voteData) {
        console.log('🗳️ castVote called with data:', voteData);
        console.log('🔍 Database online status:', this.isOnline);

        if (!this.isOnline) {
            console.log('📱 Database offline - storing vote in localStorage');
            // Store votes in localStorage
            const votes = JSON.parse(localStorage.getItem('kpu_votes') || '[]');
            const voteEntry = {
                ...voteData,
                timestamp: new Date().toISOString(),
                synced: false
            };
            votes.push(voteEntry);
            localStorage.setItem('kpu_votes', JSON.stringify(votes));
            console.log('✅ Vote stored locally for later sync:', voteEntry);
            return true;
        }

        try {
            console.log('🌐 Attempting to send vote to API...');
            console.log('📤 API URL:', this.apiUrl);
            console.log('📊 Vote data being sent:', JSON.stringify(voteData, null, 2));

            const result = await this.apiCall('cast_vote', 'POST', voteData);
            console.log('✅ Vote successfully sent to API:', result);

            // Also store in localStorage for offline access
            const votes = JSON.parse(localStorage.getItem('kpu_votes') || '[]');
            const voteEntry = {
                ...voteData,
                timestamp: new Date().toISOString(),
                synced: true
            };
            votes.push(voteEntry);
            localStorage.setItem('kpu_votes', JSON.stringify(votes));
            console.log('✅ Vote also stored locally as backup:', voteEntry);

            return true;
        } catch (error) {
            console.error('❌ Failed to send vote to API:', error);
            console.error('❌ Error details:', error.message);
            console.warn('📱 Storing vote for later sync due to API error');

            const votes = JSON.parse(localStorage.getItem('kpu_votes') || '[]');
            const voteEntry = {
                ...voteData,
                timestamp: new Date().toISOString(),
                synced: false,
                error: error.message
            };
            votes.push(voteEntry);
            localStorage.setItem('kpu_votes', JSON.stringify(votes));
            console.log('✅ Vote stored locally for later sync:', voteEntry);

            throw error;
        }
    }

    async getVoteResults() {
        if (!this.isOnline) {
            return this.calculateLocalResults();
        }

        try {
            return await this.apiCall('get_vote_results');
        } catch (error) {
            console.warn('Falling back to local vote calculation');
            return this.calculateLocalResults();
        }
    }

    // 🔥 FIXED: Get votes for specific user (for deduplication check)
    async getUserVotes(userId) {
        console.log('👤 getUserVotes called for user:', userId);
        console.log('🔍 Database online status:', this.isOnline);

        if (!this.isOnline) {
            console.log('📱 Database offline - getting user votes from localStorage');
            // Get user votes from localStorage
            const votes = JSON.parse(localStorage.getItem('kpu_votes') || '[]');
            const userVotes = votes.filter(vote => vote.user_id === userId);
            console.log('📊 Local user votes found:', userVotes.length);
            return userVotes;
        }

        try {
            console.log('🌐 Getting user votes from API...');
            // 🔥 FIXED: Use correct API call format
            const result = await this.apiCall('get_user_votes', 'GET', { user_id: userId });
            console.log('✅ User votes from API:', result);
            return result;
        } catch (error) {
            console.error('❌ Failed to get user votes from API:', error);
            console.log('📱 Falling back to localStorage...');
            // Fallback to localStorage
            const votes = JSON.parse(localStorage.getItem('kpu_votes') || '[]');
            const userVotes = votes.filter(vote => vote.user_id === userId);
            console.log('📊 Fallback: Local user votes found:', userVotes.length);
            return userVotes;
        }
    }

    calculateLocalResults() {
        const votes = JSON.parse(localStorage.getItem('kpu_votes') || '[]');
        console.log('🔄 Calculating local results from votes:', votes);

        // Initialize all candidates - NAMA YANG BENAR SESUAI DATABASE
        const candidateMapping = {
            'presiden1': { category: 'presiden', name: 'NENENG & INAYAH' },
            'presiden2': { category: 'presiden', name: 'AISYAH & EVI' },
            'pm1': { category: 'pm', name: 'KUKUH' },
            'pm2': { category: 'pm', name: 'SAYYIDAH' },
            'parlemen1': { category: 'parlemen', name: 'ADINUR KHOLIFAH' },
            'parlemen2': { category: 'parlemen', name: 'ENI FATMAWATI' },
            'parlemen3': { category: 'parlemen', name: 'FAIZAH MAULIDA' },
            'parlemen4': { category: 'parlemen', name: 'AHMAD NASHUKA' }
        };

        const results = {};

        // Initialize all candidates with 0 votes
        Object.keys(candidateMapping).forEach(candidateId => {
            results[candidateId] = {
                candidate_id: candidateId,
                candidate_name: candidateMapping[candidateId].name,
                total_votes: 0,
                category: candidateMapping[candidateId].category
            };
        });

        // Count votes from localStorage
        votes.forEach(vote => {
            if (vote.votes && Array.isArray(vote.votes)) {
                vote.votes.forEach(v => {
                    if (v.candidate_id && results[v.candidate_id]) {
                        results[v.candidate_id].total_votes += parseInt(v.count) || 0;
                    }
                });
            }
        });

        const resultArray = Object.values(results);
        console.log('📊 Local results calculated:', resultArray);
        return resultArray;
    }

    // ========================================
    // ELECTION STATUS
    // ========================================

    async getElectionStatus() {
        if (!this.isOnline) {
            return { status: localStorage.getItem('election_status') || 'stopped' };
        }

        try {
            const status = await this.apiCall('get_election_status');
            localStorage.setItem('election_status', status.status);
            return status;
        } catch (error) {
            return { status: localStorage.getItem('election_status') || 'stopped' };
        }
    }

    async updateElectionStatus(status) {
        localStorage.setItem('election_status', status);

        if (!this.isOnline) {
            return true;
        }

        try {
            await this.apiCall('update_election_status', 'PUT', { status });
            return true;
        } catch (error) {
            console.warn('Election status stored locally, will sync when online');
            return true;
        }
    }

    // ========================================
    // ACTIVITY LOGGING
    // ========================================

    // 🔥 ENHANCED: Activity logging with better data validation
    async logActivity(userType, userId, action, details) {
        // 🔥 ENHANCED: Validate and sanitize input data
        const sanitizedUserType = userType && userType !== 'undefined' ? String(userType) : 'UNKNOWN';
        const sanitizedUserId = userId && userId !== 'undefined' ? String(userId) : null;
        const sanitizedAction = action && action !== 'undefined' ? String(action) : 'UNKNOWN_ACTION';
        const sanitizedDetails = details && details !== 'undefined' ? String(details) : '';

        const logData = {
            user_type: sanitizedUserType,
            user_id: sanitizedUserId,
            action: sanitizedAction,
            details: sanitizedDetails,
            timestamp: new Date().toISOString()
        };

        console.log('📝 Database integration logging activity:', logData);

        // Always store locally
        const logs = JSON.parse(localStorage.getItem('activity_logs') || '[]');
        logs.push(logData);
        localStorage.setItem('activity_logs', JSON.stringify(logs.slice(-100))); // Keep last 100

        if (!this.isOnline) {
            console.log('📱 Activity logged locally (offline mode)');
            return true;
        }

        try {
            const result = await this.apiCall('log_activity', 'POST', logData);
            console.log('✅ Activity logged to database via API');
            return true;
        } catch (error) {
            console.warn('⚠️ Activity logged locally, will sync when online:', error.message);
            return true;
        }
    }

    // ========================================
    // SYNC OPERATIONS
    // ========================================

    async syncPendingData() {
        if (!this.isOnline) {
            console.log('Cannot sync - database offline');
            return false;
        }

        try {
            console.log('🔄 Starting data sync...');

            // First, sync users to ensure they exist in database
            await this.syncUsersToDatabase();

            // Then sync pending votes
            const votes = JSON.parse(localStorage.getItem('kpu_votes') || '[]');
            const unsyncedVotes = votes.filter(v => !v.synced);

            console.log(`📊 Found ${unsyncedVotes.length} unsynced votes`);

            for (const vote of unsyncedVotes) {
                try {
                    // Validate user exists before syncing vote
                    if (await this.validateUserExists(vote.user_id)) {
                        await this.apiCall('cast_vote', 'POST', vote);
                        vote.synced = true;
                        console.log(`✅ Vote synced for user: ${vote.user_id}`);
                    } else {
                        console.warn(`⚠️ Skipping vote sync - user ${vote.user_id} not found in database`);
                        // Mark as synced to prevent repeated attempts
                        vote.synced = true;
                        vote.sync_error = 'User not found in database';
                    }
                } catch (error) {
                    console.error(`❌ Failed to sync vote for user ${vote.user_id}:`, error);
                    // Don't mark as synced if it's a temporary error
                    if (error.message.includes('foreign key constraint')) {
                        vote.sync_error = 'Foreign key constraint violation';
                        vote.synced = true; // Skip this vote to prevent infinite retries
                    }
                }
            }

            localStorage.setItem('kpu_votes', JSON.stringify(votes));

            // Sync pending candidate updates
            const pendingUpdates = JSON.parse(localStorage.getItem('pending_candidate_updates') || '[]');
            for (const update of pendingUpdates) {
                try {
                    await this.apiCall('update_candidate', 'PUT', update);
                } catch (error) {
                    console.error('Failed to sync candidate update:', error);
                }
            }

            if (pendingUpdates.length > 0) {
                localStorage.removeItem('pending_candidate_updates');
            }

            console.log('✅ Data sync completed');
            return true;
        } catch (error) {
            console.error('❌ Sync failed:', error);
            return false;
        }
    }

    // ========================================
    // STATISTICS
    // ========================================

    async getStatistics() {
        if (!this.isOnline) {
            return this.calculateLocalStatistics();
        }

        try {
            const stats = await this.apiCall('get_statistics');
            return stats;
        } catch (error) {
            console.warn('Falling back to local statistics calculation');
            return this.calculateLocalStatistics();
        }
    }

    calculateLocalStatistics() {
        const users = JSON.parse(localStorage.getItem('kpu_users') || '[]');
        const votes = JSON.parse(localStorage.getItem('kpu_votes') || '[]');

        const totalUsers = users.length;
        const votedUsers = votes.length;
        const totalVotes = votes.reduce((sum, vote) => {
            return sum + (vote.votes ? vote.votes.reduce((voteSum, v) => voteSum + (parseInt(v.count) || 0), 0) : 0);
        }, 0);
        const participationRate = totalUsers > 0 ? Math.round((votedUsers / totalUsers) * 100) : 0;

        return {
            total_users: totalUsers,
            voted_users: votedUsers,
            total_votes: totalVotes,
            participation_rate: participationRate
        };
    }

    // ========================================
    // SYNC HELPER METHODS
    // ========================================

    async syncUsersToDatabase() {
        if (!this.isOnline) {
            console.log('📱 Database offline - users will sync when online');
            return;
        }

        try {
            console.log('👥 Syncing users to database...');
            const localUsers = JSON.parse(localStorage.getItem('kpu_users') || '[]');

            if (localUsers.length === 0) {
                console.log('📱 No local users to sync');
                return;
            }

            // Get existing users from database
            const dbUsers = await this.apiCall('get_users');
            const dbUserIds = dbUsers.map(user => user.id.toString());
            const dbUsernames = dbUsers.map(user => user.username);

            console.log('🔍 Database users:', dbUserIds);
            console.log('🔍 Local users:', localUsers.map(u => u.id));

            // 🔥 FIXED: Only sync real users, not test users or auto-generated users
            const usersToAdd = localUsers.filter(user => {
                const userIdExists = dbUserIds.includes(user.id.toString());
                const usernameExists = dbUsernames.includes(user.username);

                if (userIdExists || usernameExists) {
                    console.log(`⚠️ User ${user.id} (${user.username}) already exists in database - skipping`);
                    return false;
                }

                // 🚨 CRITICAL: Skip ALL test users and auto-generated users
                if (user.id.startsWith('test') || user.username.startsWith('test_user') ||
                    user.username.startsWith('test') || user.id.includes('test') ||
                    user.username.includes('test') || user.name.includes('Test')) {
                    console.log(`🚫 Skipping test/auto-generated user: ${user.id} (${user.username})`);
                    return false;
                }

                // Only sync real users with proper data
                if (!user.name || !user.username || user.name.trim() === '' || user.username.trim() === '') {
                    console.log(`🚫 Skipping user with invalid data: ${user.id}`);
                    return false;
                }

                console.log(`✅ Real user will be synced: ${user.id} (${user.username})`);
                return true;
            });

            if (usersToAdd.length > 0) {
                console.log(`📤 Adding ${usersToAdd.length} users to database...`);

                for (const user of usersToAdd) {
                    try {
                        await this.apiCall('add_user', 'POST', {
                            id: user.id,
                            name: user.name,
                            username: user.username,
                            password: user.password,
                            vote_count: user.vote_count || user.voteCount || 20,
                            verified: user.verified || false
                        });
                        console.log(`✅ User ${user.id} (${user.username}) added to database`);
                    } catch (error) {
                        if (error.message.includes('Duplicate entry')) {
                            console.warn(`⚠️ User ${user.id} already exists in database (duplicate entry) - skipping`);
                        } else {
                            console.error(`❌ Failed to add user ${user.id}:`, error);
                        }
                    }
                }
            } else {
                console.log('✅ All users already exist in database or are test users');
            }
        } catch (error) {
            console.error('❌ Failed to sync users to database:', error);
        }
    }

    async validateUserExists(userId) {
        try {
            const users = await this.apiCall('get_users');
            const userExists = users.some(user => user.id === userId);
            console.log(`🔍 User ${userId} exists in database: ${userExists}`);
            return userExists;
        } catch (error) {
            console.error(`❌ Failed to validate user ${userId}:`, error);
            return false;
        }
    }

    // ========================================
    // ADDITIONAL METHODS FOR ADMIN PANEL
    // ========================================

    async getUsers() {
        if (!this.isOnline) {
            return this.calculateLocalUsers();
        }

        try {
            const users = await this.apiCall('get_users');
            return users;
        } catch (error) {
            console.warn('Falling back to local users calculation');
            return this.calculateLocalUsers();
        }
    }

    calculateLocalUsers() {
        const users = JSON.parse(localStorage.getItem('kpu_users') || '[]');
        console.log('📱 Local users calculated:', users);
        return users;
    }



    // 🔥 ENHANCED: Get activity log with better data handling
    async getActivityLog() {
        if (!this.isOnline) {
            return this.calculateLocalActivityLog();
        }

        try {
            const activities = await this.apiCall('get_activity_log');
            console.log('📊 Database activity log retrieved:', activities.length, 'activities');

            // 🔥 ENHANCED: Validate and sanitize database activities
            const sanitizedActivities = activities.map(activity => ({
                id: activity.id,
                user_type: activity.user_type || 'UNKNOWN',
                user_id: activity.user_id || 'UNKNOWN',
                action: activity.action || 'UNKNOWN_ACTION',
                details: activity.details || '',
                created_at: activity.created_at || activity.timestamp,
                timestamp: activity.created_at || activity.timestamp
            }));

            return sanitizedActivities;
        } catch (error) {
            console.warn('⚠️ Falling back to local activity log:', error.message);
            return this.calculateLocalActivityLog();
        }
    }

    calculateLocalActivityLog() {
        const activities = JSON.parse(localStorage.getItem('audit_log') || '[]');
        console.log('📱 Local activity log calculated:', activities.length, 'activities');

        // 🔥 ENHANCED: Validate and sanitize local activities
        const sanitizedActivities = activities.map(activity => ({
            user: activity.user || 'UNKNOWN',
            user_id: activity.user || 'UNKNOWN',
            action: activity.action || 'UNKNOWN_ACTION',
            details: activity.action || '',
            timestamp: activity.timestamp,
            type: activity.type || 'general'
        }));

        return sanitizedActivities;
    }

    // 🔥 ENHANCED: Unified activity logging method (FIXED - removed duplicate)
    async logActivityUnified(activity) {
        // Handle both old and new activity object formats
        let activityData;

        if (activity.user_type && activity.user_id) {
            // New format (database compatible)
            activityData = activity;
        } else {
            // Old format (convert to database compatible)
            activityData = {
                user_type: 'ADMIN',
                user_id: activity.user || 'UNKNOWN',
                action: activity.action || 'UNKNOWN_ACTION',
                details: activity.action || '',
                timestamp: activity.timestamp || new Date().toISOString()
            };
        }

        if (!this.isOnline) {
            return this.logLocalActivity(activityData);
        }

        try {
            const result = await this.apiCall('log_activity', 'POST', activityData);
            console.log('✅ Activity logged to database via unified method');
            return result;
        } catch (error) {
            console.warn('⚠️ Falling back to local activity logging:', error.message);
            return this.logLocalActivity(activityData);
        }
    }

    logLocalActivity(activity) {
        const activities = JSON.parse(localStorage.getItem('audit_log') || '[]');

        // Convert database format to local format for consistency
        const localActivity = {
            timestamp: activity.timestamp || new Date().toISOString(),
            user: activity.user_id || activity.user || 'UNKNOWN',
            action: activity.action || 'UNKNOWN_ACTION',
            type: activity.details ? 'database' : 'general'
        };

        activities.push(localActivity);

        // Keep only last 1000 activities
        if (activities.length > 1000) {
            activities.splice(0, activities.length - 1000);
        }

        localStorage.setItem('audit_log', JSON.stringify(activities));
        console.log('✅ Activity logged locally:', localActivity.action);
        return true;
    }

    async resetAllVotes() {
        if (!this.isOnline) {
            return this.resetLocalVotes();
        }

        try {
            const result = await this.apiCall('reset_all_votes', 'POST');
            return result;
        } catch (error) {
            console.warn('Falling back to local vote reset');
            return this.resetLocalVotes();
        }
    }

    async resetUserVotes(userId) {
        if (!this.isOnline) {
            return this.resetLocalUserVotes(userId);
        }

        try {
            const result = await this.apiCall('reset_user_votes', 'POST', { user_id: userId });
            return result;
        } catch (error) {
            console.warn('Falling back to local user vote reset');
            return this.resetLocalUserVotes(userId);
        }
    }

    resetLocalVotes() {
        localStorage.removeItem('kpu_votes');

        // Reset user status
        const users = JSON.parse(localStorage.getItem('kpu_users') || '[]');
        users.forEach(user => {
            user.status = 'Belum Voting';
        });
        localStorage.setItem('kpu_users', JSON.stringify(users));

        console.log('✅ All votes reset locally');
        return true;
    }

    resetLocalUserVotes(userId) {
        // Reset specific user's votes in localStorage
        const votes = JSON.parse(localStorage.getItem('kpu_votes') || '[]');
        const filteredVotes = votes.filter(vote => vote.username !== userId && vote.user_id !== userId);
        localStorage.setItem('kpu_votes', JSON.stringify(filteredVotes));

        // Reset user status
        const users = JSON.parse(localStorage.getItem('kpu_users') || '[]');
        const user = users.find(u => u.id === userId || u.username === userId);
        if (user) {
            user.status = 'Belum Voting';
            user.lastLogin = null;
            localStorage.setItem('kpu_users', JSON.stringify(users));
        }

        console.log(`✅ User ${userId} votes reset locally`);
        return { success: true, user: user, deleted_votes: votes.length - filteredVotes.length };
    }

    // ========================================
    // BULK OPERATIONS
    // ========================================

    async bulkAddUsers(users) {
        if (!this.isOnline) {
            const existingUsers = JSON.parse(localStorage.getItem('kpu_users') || '[]');
            const allUsers = [...existingUsers, ...users];
            localStorage.setItem('kpu_users', JSON.stringify(allUsers));
            return true;
        }

        try {
            await this.apiCall('bulk_add_users', 'POST', { users });
            await this.getUsers(); // Refresh cache
            return true;
        } catch (error) {
            console.warn('Bulk add stored locally, will sync when online');
            const existingUsers = JSON.parse(localStorage.getItem('kpu_users') || '[]');
            const allUsers = [...existingUsers, ...users];
            localStorage.setItem('kpu_users', JSON.stringify(allUsers));
            return true;
        }
    }
}

// ========================================
// GLOBAL INSTANCE
// ========================================

// Create global database instance
window.kpuDB = new KPUDatabase();

// Auto-sync disabled - handled by admin panel real-time updates
// setInterval(() => {
//     if (window.kpuDB.isOnline) {
//         window.kpuDB.syncPendingData();
//     }
// }, 30000);

// Sync when page becomes visible (user returns to tab)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.kpuDB.isOnline) {
        window.kpuDB.syncPendingData();
    }
});

console.log('🚀 KPU Database Integration loaded');
