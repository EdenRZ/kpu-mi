// ========================================
// VOTING STATUS FIX
// Fixes for getUserVotes API calls and voting status determination
// ========================================

class VotingStatusManager {
    constructor() {
        this.cache = new Map();
        this.pendingRequests = new Map();
        
        console.log('🗳️ Voting Status Manager initialized');
    }

    // ========================================
    // OPTIMIZED USER VOTES RETRIEVAL
    // ========================================

    async getUserVotesOptimized(userId) {
        // Check cache first
        const cacheKey = `user_votes_${userId}`;
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 30000) { // 30 second cache
                console.log(`📊 Using cached votes for user ${userId}`);
                return cached.data;
            }
        }

        // Check if request is already pending
        if (this.pendingRequests.has(userId)) {
            console.log(`⏳ Waiting for pending request for user ${userId}`);
            return await this.pendingRequests.get(userId);
        }

        // Create new request
        const requestPromise = this.fetchUserVotes(userId);
        this.pendingRequests.set(userId, requestPromise);

        try {
            const result = await requestPromise;
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
            
            return result;
        } finally {
            this.pendingRequests.delete(userId);
        }
    }

    async fetchUserVotes(userId) {
        console.log(`🔍 Fetching votes for user: ${userId}`);

        // Try database first if online
        if (window.kpuDB && window.kpuDB.isOnline) {
            try {
                // Use direct API call with proper format
                const apiUrl = window.kpuDB.apiUrl;
                const url = `${apiUrl}?action=get_user_votes&user_id=${encodeURIComponent(userId)}`;
                
                console.log(`🌐 API URL: ${url}`);
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    signal: AbortSignal.timeout(5000) // 5 second timeout
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(result.message || 'API call failed');
                }

                console.log(`✅ Database votes for user ${userId}:`, result.data);
                return result.data || [];
                
            } catch (error) {
                console.warn(`⚠️ Database fetch failed for user ${userId}:`, error.message);
                // Fall back to localStorage
            }
        }

        // Fallback to localStorage
        console.log(`📱 Using localStorage fallback for user ${userId}`);
        return this.getUserVotesFromLocalStorage(userId);
    }

    getUserVotesFromLocalStorage(userId) {
        try {
            const votes = JSON.parse(localStorage.getItem('kpu_votes') || '[]');
            const userVotes = votes.filter(vote => 
                vote.user_id === userId || vote.username === userId
            );
            
            console.log(`📊 Local votes for user ${userId}:`, userVotes.length);
            return userVotes;
        } catch (error) {
            console.error(`❌ Error reading localStorage votes for user ${userId}:`, error);
            return [];
        }
    }

    // ========================================
    // VOTING STATUS DETERMINATION
    // ========================================

    async determineVotingStatusOptimized(userId) {
        try {
            const userVotes = await this.getUserVotesOptimized(userId);
            
            if (!userVotes || userVotes.length === 0) {
                return {
                    status: 'Belum Voting',
                    details: 'Tidak ada vote ditemukan',
                    categories: {
                        presiden: false,
                        pm: false,
                        parlemen: false
                    }
                };
            }

            // Analyze votes by category
            const categories = {
                presiden: false,
                pm: false,
                parlemen: false
            };

            let totalVotes = 0;

            // Process votes
            userVotes.forEach(voteEntry => {
                if (voteEntry.votes && Array.isArray(voteEntry.votes)) {
                    voteEntry.votes.forEach(vote => {
                        const candidateId = vote.candidate_id;
                        const voteCount = parseInt(vote.count) || 0;
                        
                        if (voteCount > 0) {
                            totalVotes += voteCount;
                            
                            if (candidateId.startsWith('presiden')) {
                                categories.presiden = true;
                            } else if (candidateId.startsWith('pm')) {
                                categories.pm = true;
                            } else if (candidateId.startsWith('parlemen')) {
                                categories.parlemen = true;
                            }
                        }
                    });
                } else {
                    // Handle direct vote format
                    const candidateId = voteEntry.candidate_id;
                    const voteCount = parseInt(voteEntry.vote_count) || 0;
                    
                    if (voteCount > 0) {
                        totalVotes += voteCount;
                        
                        if (candidateId && candidateId.startsWith('presiden')) {
                            categories.presiden = true;
                        } else if (candidateId && candidateId.startsWith('pm')) {
                            categories.pm = true;
                        } else if (candidateId && candidateId.startsWith('parlemen')) {
                            categories.parlemen = true;
                        }
                    }
                }
            });

            // Determine overall status
            const completedCategories = Object.values(categories).filter(Boolean).length;
            const allCategoriesComplete = completedCategories === 3;

            let status;
            let details;

            if (allCategoriesComplete && totalVotes >= 60) {
                status = 'Sudah Voting';
                details = `Lengkap - ${totalVotes} suara`;
            } else if (completedCategories > 0) {
                status = 'Voting bermasalah';
                details = `Tidak lengkap - ${completedCategories}/3 kategori, ${totalVotes} suara`;
            } else {
                status = 'Belum Voting';
                details = 'Tidak ada vote';
            }

            return {
                status,
                details,
                categories,
                totalVotes,
                completedCategories
            };

        } catch (error) {
            console.error(`❌ Error determining voting status for user ${userId}:`, error);
            return {
                status: 'Error',
                details: 'Gagal mengecek status',
                categories: {
                    presiden: false,
                    pm: false,
                    parlemen: false
                }
            };
        }
    }

    // ========================================
    // BATCH PROCESSING FOR ADMIN TABLE
    // ========================================

    async processUsersVotingStatus(users, batchSize = 5) {
        console.log(`🔄 Processing voting status for ${users.length} users in batches of ${batchSize}`);
        
        const results = [];
        
        for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);
            
            // Process batch in parallel
            const batchPromises = batch.map(async (user) => {
                const votingStatus = await this.determineVotingStatusOptimized(user.id);
                return {
                    ...user,
                    votingStatus
                };
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Small delay between batches to prevent overwhelming the system
            if (i + batchSize < users.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Update progress
            const progress = Math.round(((i + batchSize) / users.length) * 100);
            console.log(`📊 Progress: ${progress}%`);
        }
        
        console.log(`✅ Completed processing ${results.length} users`);
        return results;
    }

    // ========================================
    // CACHE MANAGEMENT
    // ========================================

    clearCache() {
        this.cache.clear();
        console.log('🧹 Voting status cache cleared');
    }

    clearUserCache(userId) {
        const cacheKey = `user_votes_${userId}`;
        this.cache.delete(cacheKey);
        console.log(`🧹 Cache cleared for user ${userId}`);
    }
}

// ========================================
// GLOBAL FUNCTIONS FOR COMPATIBILITY
// ========================================

// Create global instance
window.votingStatusManager = new VotingStatusManager();

// Override the problematic determineVotingStatus function
window.determineVotingStatusOptimized = async function(userId) {
    return await window.votingStatusManager.determineVotingStatusOptimized(userId);
};

// Override getUserVotes function
window.getUserVotesOptimized = async function(userId) {
    return await window.votingStatusManager.getUserVotesOptimized(userId);
};

// Batch processing function for admin table
window.processUsersVotingStatusOptimized = async function(users, batchSize = 5) {
    return await window.votingStatusManager.processUsersVotingStatus(users, batchSize);
};

console.log('🗳️ Voting Status Fix loaded');
