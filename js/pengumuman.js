// ========================================
// KPU MONASMUDA INSTITUTE - PENGUMUMAN RESULTS
// Real-time Election Results Display
// ========================================

// Configuration
const CONFIG = {
    API_BASE_URL: 'database/kpu_api.php',
    REFRESH_INTERVAL: 30000, // 30 seconds
    CHART_COLORS: [
        '#3498db', '#e74c3c', '#2ecc71', '#f39c12',
        '#9b59b6', '#1abc9c', '#34495e', '#e67e22'
    ]
};

// Global variables
let currentCategory = 'all';
let refreshTimer = null;
let charts = {};

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Pengumuman KPU MI - Initializing...');

    // Check Chart.js availability
    if (typeof Chart === 'undefined') {
        console.warn('⚠️ Chart.js not loaded - charts will be disabled');
        // Wait a bit for potential CDN fallback to load
        setTimeout(() => {
            if (typeof Chart !== 'undefined') {
                console.log('✅ Chart.js loaded via fallback');
            }
        }, 2000);
    } else {
        console.log('✅ Chart.js is available');
    }

    // Initialize the application
    initializeApp();

    // Test database connection first
    testDatabaseConnection().then(() => {
        // Start auto-refresh
        startAutoRefresh();

        // Load initial data
        loadAllData();
    }).catch((error) => {
        console.error('❌ Database connection failed:', error);
        showError('Tidak dapat terhubung ke database. Pastikan server XAMPP berjalan dan database tersedia.');
    });
});

function initializeApp() {
    console.log('📋 Initializing application...');

    // Set up event listeners
    setupEventListeners();

    // Initialize charts
    initializeCharts();

    console.log('✅ Application initialized successfully');
}

function setupEventListeners() {
    // Handle window resize for charts
    window.addEventListener('resize', function() {
        Object.values(charts).forEach(chart => {
            if (chart) chart.resize();
        });
    });

    // Handle visibility change for auto-refresh
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            stopAutoRefresh();
        } else {
            startAutoRefresh();
            refreshData();
        }
    });
}

// ========================================
// DATABASE CONNECTION TEST
// ========================================

async function testDatabaseConnection() {
    console.log('🔌 Testing database connection...');
    updateDatabaseStatus('connecting');

    try {
        // First test with debug script
        console.log('🔍 Testing with debug script...');
        const debugUrl = 'debug_api_simple.php?action=test';
        const debugResponse = await fetch(debugUrl);
        const debugResult = await debugResponse.json();
        console.log('🔍 Debug response:', debugResult);

        // Now test actual API
        const url = `${CONFIG.API_BASE_URL}?action=get_statistics&_t=${Date.now()}`;
        console.log('🔗 Testing API URL:', url);

        const response = await fetch(url);
        console.log('📡 Response status:', response.status, response.statusText);

        if (!response.ok) {
            // Try to get error details
            const errorText = await response.text();
            console.error('❌ Response error text:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        console.log('📊 API response:', result);

        if (result.success !== undefined) {
            console.log('✅ Database connection successful');
            updateDatabaseStatus('connected');
            return true;
        } else {
            throw new Error('Invalid API response format');
        }
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        updateDatabaseStatus('disconnected');
        throw error;
    }
}

function updateDatabaseStatus(status) {
    const indicator = document.getElementById('dbStatusIndicator');
    const statusText = document.getElementById('dbStatusText');

    if (!indicator || !statusText) return;

    switch (status) {
        case 'connected':
            indicator.style.background = '#27ae60';
            statusText.textContent = 'CONNECTED';
            indicator.title = 'Database terhubung dan berfungsi normal';
            break;
        case 'disconnected':
            indicator.style.background = '#e74c3c';
            statusText.textContent = 'DISCONNECTED';
            indicator.title = 'Database tidak terhubung - periksa XAMPP';
            break;
        case 'connecting':
        default:
            indicator.style.background = '#f39c12';
            statusText.textContent = 'CONNECTING...';
            indicator.title = 'Mencoba terhubung ke database...';
            break;
    }
}

// ========================================
// DATA LOADING FUNCTIONS
// ========================================

async function loadAllData() {
    console.log('📊 Loading all data...');
    showLoading(true);

    try {
        // Load statistics first
        console.log('📈 Loading statistics...');
        await loadStatistics();

        // Load vote results
        console.log('🗳️ Loading vote results...');
        await loadVoteResults();

        // Load voting details
        console.log('📋 Loading voting details...');
        await loadVotingDetails();

        // Update refresh time
        updateLastRefreshTime();

        console.log('✅ All data loaded successfully');

    } catch (error) {
        console.error('❌ Error loading data:', error);
        showError('Gagal memuat data dari database. Pastikan server database berjalan dan coba lagi.');
    } finally {
        showLoading(false);
    }
}

async function loadStatistics() {
    try {
        console.log('🔗 Fetching statistics from API...');
        const url = `${CONFIG.API_BASE_URL}?action=get_statistics&_t=${Date.now()}`;
        console.log('📡 Statistics URL:', url);

        const response = await fetch(url);
        console.log('📡 Statistics response status:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Statistics error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        console.log('📊 Statistics response:', result);

        if (result.success) {
            updateStatistics(result.data);
            console.log('✅ Statistics updated successfully');
        } else {
            console.error('❌ Failed to load statistics:', result.message);
            // Use default statistics if API fails
            updateStatistics({
                total_users: 0,
                voted_users: 0,
                total_votes: 0,
                participation_rate: 0
            });
        }
    } catch (error) {
        console.error('❌ Error loading statistics:', error);
        // Use default statistics if network fails
        updateStatistics({
            total_users: 0,
            voted_users: 0,
            total_votes: 0,
            participation_rate: 0
        });
    }
}

async function loadVoteResults() {
    try {
        console.log('🔗 Fetching vote results from API...');
        const url = `${CONFIG.API_BASE_URL}?action=get_vote_results&_t=${Date.now()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('🗳️ Vote results response:', result);

        if (result.success) {
            displayVoteResults(result.data);
            console.log('✅ Vote results displayed successfully');
        } else {
            console.error('❌ Failed to load vote results:', result.message);
            displayVoteResults([]); // Show empty state
        }
    } catch (error) {
        console.error('❌ Error loading vote results:', error);
        displayVoteResults([]); // Show empty state on error
    }
}

async function loadVotingDetails() {
    try {
        // Get voting activity with masked user IDs and timestamps
        const categoryParam = currentCategory !== 'all' ? `&category=${currentCategory}` : '';
        console.log(`🔗 Fetching voting details from API (category: ${currentCategory})...`);

        const url = `${CONFIG.API_BASE_URL}?action=get_voting_activity&limit=50${categoryParam}&_t=${Date.now()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('📋 Voting details response:', result);

        if (result.success) {
            displayVotingDetails(result.data);
            console.log('✅ Voting details displayed successfully');
        } else {
            console.error('❌ Failed to load voting details:', result.message);
            displayVotingDetails([]); // Show empty state
        }
    } catch (error) {
        console.error('❌ Error loading voting details:', error);
        displayVotingDetails([]); // Show empty state on error
    }
}

// ========================================
// DISPLAY FUNCTIONS
// ========================================

function updateStatistics(stats) {
    document.getElementById('totalVoters').textContent = stats.total_users || 0;
    document.getElementById('votedCount').textContent = stats.voted_users || 0;
    document.getElementById('totalVotes').textContent = stats.total_votes || 0;
    document.getElementById('participationRate').textContent = `${stats.participation_rate || 0}%`;
}

function displayVoteResults(results) {
    const content = document.getElementById('resultsContent');

    if (!results || results.length === 0) {
        content.innerHTML = `
            <div class="no-data">
                <i class="fas fa-inbox fa-3x mb-3"></i>
                <h4>Belum Ada Data Voting</h4>
                <p>Data hasil voting akan muncul setelah pemilih mulai memberikan suara.</p>
            </div>
        `;
        return;
    }

    // Group results by category
    const groupedResults = groupResultsByCategory(results);

    let html = '';

    // Display results based on current category
    if (currentCategory === 'all') {
        // Show all categories
        Object.keys(groupedResults).forEach(category => {
            html += createCategorySection(category, groupedResults[category]);
        });
    } else {
        // Show specific category
        if (groupedResults[currentCategory]) {
            html += createCategorySection(currentCategory, groupedResults[currentCategory]);
        } else {
            html = `
                <div class="no-data">
                    <i class="fas fa-search fa-3x mb-3"></i>
                    <h4>Tidak Ada Data untuk Kategori ${getCategoryDisplayName(currentCategory)}</h4>
                </div>
            `;
        }
    }

    content.innerHTML = html;

    // Create charts for visible categories
    setTimeout(() => {
        createChartsForVisibleCategories(groupedResults);
    }, 100);
}

function createCategorySection(category, results) {
    const categoryName = getCategoryDisplayName(category);
    const categoryIcon = getCategoryIcon(category);

    let html = `
        <div class="results-card" data-category="${category}">
            <div class="card-header-custom">
                <h4 class="mb-0">
                    <i class="${categoryIcon} me-2"></i>
                    Hasil ${categoryName}
                </h4>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <div class="chart-container">
                            <canvas id="chart-${category}"></canvas>
                        </div>
                    </div>
                    <div class="col-md-6">
    `;

    // Sort results by vote count (descending)
    results.sort((a, b) => (b.total_votes || 0) - (a.total_votes || 0));

    results.forEach((result, index) => {
        const isWinner = index === 0 && result.total_votes > 0;
        html += `
            <div class="vote-item ${isWinner ? 'border-warning' : ''}">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="candidate-name">
                            ${isWinner ? '<i class="fas fa-crown text-warning me-2"></i>' : ''}
                            ${result.candidate_name || result.candidate_id}
                        </div>
                        <small class="text-muted">Posisi ${result.position_number || 'N/A'}</small>
                    </div>
                    <div class="vote-count">${result.total_votes || 0}</div>
                </div>
            </div>
        `;
    });

    html += `
                    </div>
                </div>
            </div>
        </div>
    `;

    return html;
}

function displayVotingDetails(activities) {
    const tbody = document.getElementById('votingDetailsBody');

    if (!activities || activities.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <i class="fas fa-inbox fa-2x mb-2 text-muted"></i>
                    <br>Belum ada aktivitas voting
                </td>
            </tr>
        `;
        return;
    }

    let html = '';

    activities.forEach((activity) => {
        // Create individual rows for each vote count
        for (let i = 0; i < activity.vote_count; i++) {
            html += `
                <tr>
                    <td class="voter-id">${activity.masked_user_id}</td>
                    <td>
                        <span class="badge bg-primary">${getCategoryDisplayName(activity.category)}</span>
                    </td>
                    <td>${activity.candidate_name || activity.candidate_id}</td>
                    <td class="text-center">1</td>
                    <td class="timestamp">${formatTimestamp(new Date(activity.voted_at))}</td>
                </tr>
            `;
        }
    });

    tbody.innerHTML = html;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function groupResultsByCategory(results) {
    const grouped = {};

    results.forEach(result => {
        const category = result.category;
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(result);
    });

    return grouped;
}

function getCategoryDisplayName(category) {
    const names = {
        'presiden': 'Presiden',
        'pm': 'Perdana Menteri',
        'parlemen': 'Parlemen'
    };
    return names[category] || category;
}

function getCategoryIcon(category) {
    const icons = {
        'presiden': 'fas fa-crown',
        'pm': 'fas fa-user-tie',
        'parlemen': 'fas fa-users'
    };
    return icons[category] || 'fas fa-vote-yea';
}

function formatTimestamp(date) {
    return new Intl.DateTimeFormat('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(date);
}

function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const content = document.getElementById('resultsContent');

    if (show) {
        spinner.style.display = 'block';
        content.style.opacity = '0.5';
    } else {
        spinner.style.display = 'none';
        content.style.opacity = '1';
    }
}

function showError(message) {
    const content = document.getElementById('resultsContent');
    content.innerHTML = `
        <div class="alert alert-danger text-center">
            <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
            <h5>Terjadi Kesalahan</h5>
            <p>${message}</p>
            <div class="mt-3">
                <button class="btn btn-outline-danger me-2" onclick="refreshData()">
                    <i class="fas fa-sync-alt me-2"></i>Coba Lagi
                </button>
                <button class="btn btn-outline-info" onclick="testDatabaseConnection().then(() => location.reload()).catch(() => alert('Database masih tidak tersedia'))">
                    <i class="fas fa-database me-2"></i>Test Koneksi
                </button>
            </div>
            <div class="mt-3">
                <small class="text-muted">
                    <strong>Tips:</strong> Pastikan XAMPP berjalan dan database kpu_monasmuda tersedia.<br>
                    URL API: ${CONFIG.API_BASE_URL}
                </small>
            </div>
        </div>
    `;
}

function updateLastRefreshTime() {
    const now = new Date();
    const timeString = formatTimestamp(now);

    // Update real-time indicator
    const indicator = document.getElementById('realTimeIndicator');
    indicator.title = `Terakhir diperbarui: ${timeString}`;
}

// ========================================
// CHART FUNCTIONS
// ========================================

function initializeCharts() {
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.warn('⚠️ Chart.js not loaded - charts will be disabled');
        return;
    }

    try {
        // Chart.js default configuration
        Chart.defaults.font.family = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        Chart.defaults.color = '#2c3e50';
        console.log('✅ Chart.js initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing Chart.js:', error);
    }
}

function createChartsForVisibleCategories(groupedResults) {
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.warn('⚠️ Chart.js not available - skipping chart creation');
        // Hide chart containers and show text-only results
        Object.keys(groupedResults).forEach(category => {
            const canvas = document.getElementById(`chart-${category}`);
            if (canvas) {
                const container = canvas.closest('.chart-container');
                if (container) {
                    container.innerHTML = '<div class="text-center text-muted"><i class="fas fa-chart-pie fa-2x mb-2"></i><br>Chart tidak tersedia</div>';
                }
            }
        });
        return;
    }

    // Destroy existing charts
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    charts = {};

    // Create new charts
    Object.keys(groupedResults).forEach(category => {
        const canvas = document.getElementById(`chart-${category}`);
        if (canvas) {
            try {
                charts[category] = createCategoryChart(canvas, groupedResults[category]);
            } catch (error) {
                console.error(`❌ Error creating chart for ${category}:`, error);
                // Show error message in chart container
                const container = canvas.closest('.chart-container');
                if (container) {
                    container.innerHTML = '<div class="text-center text-danger"><i class="fas fa-exclamation-triangle fa-2x mb-2"></i><br>Error loading chart</div>';
                }
            }
        }
    });
}

function createCategoryChart(canvas, results) {
    // Double-check Chart.js availability
    if (typeof Chart === 'undefined') {
        throw new Error('Chart.js is not available');
    }

    const ctx = canvas.getContext('2d');

    const labels = results.map(r => r.candidate_name || r.candidate_id);
    const data = results.map(r => r.total_votes || 0);
    const colors = CONFIG.CHART_COLORS.slice(0, results.length);

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                            return `${context.label}: ${context.parsed} suara (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ========================================
// AUTO-REFRESH FUNCTIONS
// ========================================

function startAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }

    refreshTimer = setInterval(async () => {
        console.log('🔄 Auto-refreshing data...');

        try {
            // Test connection first
            await testDatabaseConnection();
            // If connection is good, load data
            await loadAllData();
        } catch (error) {
            console.error('❌ Auto-refresh failed:', error);
            updateDatabaseStatus('disconnected');
        }
    }, CONFIG.REFRESH_INTERVAL);

    console.log(`⏰ Auto-refresh started (${CONFIG.REFRESH_INTERVAL / 1000}s interval)`);
}

function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
        console.log('⏸️ Auto-refresh stopped');
    }
}

// ========================================
// PUBLIC FUNCTIONS (called from HTML)
// ========================================

function refreshData() {
    console.log('🔄 Manual refresh triggered');
    loadAllData();
}

function forceRefresh() {
    console.log('🔄 Force refresh triggered - clearing all data first');

    // Clear current display
    document.getElementById('totalVoters').textContent = '0';
    document.getElementById('votedCount').textContent = '0';
    document.getElementById('totalVotes').textContent = '0';
    document.getElementById('participationRate').textContent = '0%';
    document.getElementById('resultsContent').innerHTML = '';
    document.getElementById('votingDetailsBody').innerHTML = '';

    // Force refresh data
    refreshData();
}

function showCategory(category) {
    console.log(`📂 Switching to category: ${category}`);

    // Update active tab
    document.querySelectorAll('#categoryTabs .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');

    // Update current category
    currentCategory = category;

    // Reload results for the selected category
    loadVoteResults();
}

// ========================================
// ERROR HANDLING
// ========================================

window.addEventListener('error', function(event) {
    console.error('💥 JavaScript Error:', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('💥 Unhandled Promise Rejection:', event.reason);
});

console.log('✅ Pengumuman KPU MI JavaScript loaded successfully');
