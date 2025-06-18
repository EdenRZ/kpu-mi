// Hybrid Data Sync Solution
// Works with localStorage + external sync

class DataSync {
    constructor(options = {}) {
        this.apiUrl = options.apiUrl || 'database/kpu_api.php';
        this.syncInterval = options.syncInterval || 10000; // 10 seconds (less aggressive)
        this.isOnline = navigator.onLine;
        this.lastSyncTime = 0;
        this.setupEventListeners();
        this.startSync();
        console.log('🔄 DataSync initialized with correct API:', this.apiUrl);
    }

    setupEventListeners() {
        // Monitor online/offline status
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🌐 Back online - resuming sync');
            this.syncToServer();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📴 Offline - using local data');
        });
    }

    startSync() {
        // Initial sync
        this.syncFromServer();

        // Periodic sync
        setInterval(() => {
            if (this.isOnline) {
                this.syncFromServer();
            }
        }, this.syncInterval);
    }

    // Sync data from server to localStorage
    async syncFromServer() {
        try {
            const now = Date.now();

            // Throttle sync requests (max once per 5 seconds)
            if (now - this.lastSyncTime < 5000) {
                console.log('🔄 Sync throttled, too frequent');
                return;
            }

            this.lastSyncTime = now;
            console.log('🌐 Syncing from database API...');

            // Get users using correct API
            try {
                const usersResponse = await fetch(`${this.apiUrl}?action=get_users`);
                if (usersResponse.ok) {
                    const usersResult = await usersResponse.json();
                    if (usersResult.success && usersResult.data) {
                        localStorage.setItem('kpu_users', JSON.stringify(usersResult.data));
                        console.log('✅ Users synced from database:', usersResult.data.length, 'users');
                    }
                }
            } catch (error) {
                console.log('⚠️ Users sync failed:', error.message);
            }

            // Get election status using correct API
            try {
                const electionResponse = await fetch(`${this.apiUrl}?action=get_election_status`);
                if (electionResponse.ok) {
                    const electionResult = await electionResponse.json();
                    if (electionResult.success && electionResult.data) {
                        const newStatus = electionResult.data.status;
                        const currentStatus = localStorage.getItem('election_status');

                        // Only update if status actually changed
                        if (newStatus !== currentStatus) {
                            localStorage.setItem('election_status', newStatus);
                            console.log('✅ Election status synced from database:', currentStatus, '→', newStatus);

                            // Force update UI immediately
                            this.updateElectionStatusUI(newStatus);
                        } else {
                            console.log('📊 Election status unchanged:', newStatus);
                        }
                    }
                }
            } catch (error) {
                console.log('⚠️ Election status sync failed:', error.message);
            }

            // Get candidates using correct API
            try {
                const candidatesResponse = await fetch(`${this.apiUrl}?action=get_candidates`);
                if (candidatesResponse.ok) {
                    const candidatesResult = await candidatesResponse.json();
                    if (candidatesResult.success && candidatesResult.data) {
                        const newCandidates = candidatesResult.data;
                        const currentCandidates = localStorage.getItem('kpu_candidates');
                        const newCandidatesStr = JSON.stringify(newCandidates);

                        // Only update if candidates actually changed
                        if (newCandidatesStr !== currentCandidates) {
                            localStorage.setItem('kpu_candidates', newCandidatesStr);
                            console.log('✅ Candidates synced from database:', newCandidates.length, 'candidates');

                            // Trigger candidates update event
                            this.updateCandidatesUI(newCandidates);
                        } else {
                            console.log('📊 Candidates unchanged');
                        }
                    }
                }
            } catch (error) {
                console.log('⚠️ Candidates sync failed:', error.message);
            }

        } catch (error) {
            console.log('⚠️ Sync failed, using local data:', error.message);
        }
    }

    // Sync data from localStorage to server (DISABLED - read-only sync)
    async syncToServer() {
        // DISABLED: This function is now read-only to prevent conflicts
        // Admin panel and login page handle their own database updates
        console.log('📝 syncToServer disabled - using read-only sync to prevent conflicts');
        return true;
    }

    // Force sync now (read-only)
    async forceSyncNow() {
        console.log('🔄 Force syncing data from database...');
        await this.syncFromServer();
        // Note: syncToServer is disabled to prevent conflicts
    }

    // Get data with fallback
    async getData(key) {
        // Try localStorage first
        let data = localStorage.getItem(key);

        // If not found and online, try server
        if (!data && this.isOnline) {
            await this.syncFromServer();
            data = localStorage.getItem(key);
        }

        return data;
    }

    // Set data with sync (DISABLED - read-only mode)
    async setData(key, value) {
        // Set in localStorage only
        localStorage.setItem(key, value);
        console.log('📝 Data set in localStorage only (read-only sync mode):', key);

        // Note: Server sync disabled to prevent conflicts
        // Use admin panel or direct API calls for database updates
    }

    // Force update election status UI
    updateElectionStatusUI(status) {
        console.log('🔄 Updating election status UI to:', status);

        try {
            // Method 1: Try updateElectionStatusIndicator function
            if (typeof window.updateElectionStatusIndicator === 'function') {
                window.updateElectionStatusIndicator();
                console.log('✅ UI updated via updateElectionStatusIndicator()');
            }

            // Method 2: Direct DOM manipulation for login page
            const statusBadge = document.getElementById('statusBadge');
            const statusDot = document.getElementById('statusDot');
            const statusText = document.getElementById('statusText');
            const statusDescription = document.getElementById('statusDescription');

            if (statusBadge && statusDot && statusText && statusDescription) {
                let badgeClass, dotClass, text, description;

                switch (status) {
                    case 'running':
                        badgeClass = 'bg-green-100 text-green-800';
                        dotClass = 'bg-green-400';
                        text = 'PEMILIHAN AKTIF';
                        description = 'Anda dapat melakukan voting sekarang';
                        break;
                    case 'ended':
                        badgeClass = 'bg-red-100 text-red-800';
                        dotClass = 'bg-red-400';
                        text = 'PEMILIHAN BERAKHIR';
                        description = 'Terima kasih atas partisipasi Anda';
                        break;
                    default: // stopped
                        badgeClass = 'bg-gray-100 text-gray-800';
                        dotClass = 'bg-gray-400';
                        text = 'PEMILIHAN BELUM DIMULAI';
                        description = 'Silakan tunggu pengumuman dari administrator';
                        break;
                }

                statusBadge.className = `inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badgeClass}`;
                statusDot.className = `w-2 h-2 rounded-full mr-2 ${dotClass}`;
                statusText.textContent = text;
                statusDescription.textContent = description;

                console.log('✅ UI updated via direct DOM manipulation');
            }

            // Method 3: Trigger custom event for other components
            const statusChangeEvent = new CustomEvent('electionStatusChanged', {
                detail: { status: status, timestamp: new Date().toISOString() }
            });
            window.dispatchEvent(statusChangeEvent);
            console.log('✅ Custom event dispatched: electionStatusChanged');

        } catch (error) {
            console.error('❌ Error updating election status UI:', error);
        }
    }

    // Force update candidates UI
    updateCandidatesUI(candidates) {
        console.log('🔄 Updating candidates UI with:', candidates.length, 'candidates');

        try {
            // Method 1: Try updateCandidatesDisplay function
            if (typeof window.updateCandidatesDisplay === 'function') {
                window.updateCandidatesDisplay(candidates);
                console.log('✅ Candidates UI updated via updateCandidatesDisplay()');
            }

            // Method 2: Try loadCandidates function
            if (typeof window.loadCandidates === 'function') {
                window.loadCandidates();
                console.log('✅ Candidates UI updated via loadCandidates()');
            }

            // Method 3: Direct DOM manipulation for candidate cards
            this.updateCandidateCards(candidates);

            // Method 4: Trigger custom event for other components
            const candidatesChangeEvent = new CustomEvent('candidatesChanged', {
                detail: { candidates: candidates, timestamp: new Date().toISOString() }
            });
            window.dispatchEvent(candidatesChangeEvent);
            console.log('✅ Custom event dispatched: candidatesChanged');

        } catch (error) {
            console.error('❌ Error updating candidates UI:', error);
        }
    }

    // Update candidate cards directly
    updateCandidateCards(candidates) {
        try {
            // Group candidates by category
            const candidatesByCategory = {};
            candidates.forEach(candidate => {
                if (!candidatesByCategory[candidate.category]) {
                    candidatesByCategory[candidate.category] = [];
                }
                candidatesByCategory[candidate.category].push(candidate);
            });

            // Update each category
            Object.keys(candidatesByCategory).forEach(category => {
                const categoryContainer = document.querySelector(`[data-category="${category}"]`);
                if (categoryContainer) {
                    this.updateCategoryCards(categoryContainer, candidatesByCategory[category]);
                }
            });

            console.log('✅ Candidate cards updated directly');
        } catch (error) {
            console.error('❌ Error updating candidate cards:', error);
        }
    }

    // Update cards for a specific category
    updateCategoryCards(container, candidates) {
        candidates.forEach(candidate => {
            // Update candidate name
            const nameElement = container.querySelector(`[data-candidate-id="${candidate.id}"] .candidate-name`);
            if (nameElement && nameElement.textContent !== candidate.name) {
                nameElement.textContent = candidate.name;
                console.log(`✅ Updated name for ${candidate.id}: ${candidate.name}`);
            }

            // Update candidate photo
            const photoElement = container.querySelector(`[data-candidate-id="${candidate.id}"] .candidate-photo`);
            if (photoElement && candidate.photo && photoElement.src !== candidate.photo) {
                photoElement.src = candidate.photo;
                photoElement.alt = candidate.name;
                console.log(`✅ Updated photo for ${candidate.id}: ${candidate.photo}`);
            }

            // Update candidate description
            const descElement = container.querySelector(`[data-candidate-id="${candidate.id}"] .candidate-description`);
            if (descElement && candidate.description && descElement.textContent !== candidate.description) {
                descElement.textContent = candidate.description;
                console.log(`✅ Updated description for ${candidate.id}`);
            }
        });
    }
}

// Initialize data sync
const dataSync = new DataSync();
window.dataSync = dataSync;

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataSync;
}

console.log(`
🔄 DATA SYNC INITIALIZED (FIXED VERSION)

Features:
✅ Auto-sync every 10 seconds (throttled)
✅ Uses correct database API: database/kpu_api.php
✅ Read-only sync to prevent conflicts
✅ Works offline with localStorage
✅ Cross-browser compatibility
✅ Real-time status updates

Fixed Issues:
🔧 Correct API endpoints
🔧 Throttled sync requests
🔧 Read-only mode to prevent conflicts
🔧 Better error handling
🔧 Status change detection

Usage:
- dataSync.forceSyncNow() - Force sync from database
- dataSync.getData('key') - Get with fallback
- dataSync.setData('key', 'value') - Set in localStorage only
`);
