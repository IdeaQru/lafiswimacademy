let eventSource = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    connectSSE();
    refreshStatus();
});

// Connect to Server-Sent Events for real-time updates
function connectSSE() {
    if (eventSource) {
        eventSource.close();
    }

    eventSource = new EventSource('/api/whatsapp/stream');
    
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateUI(data);
    };

    eventSource.onerror = (error) => {
        console.error('SSE Connection Error:', error);
        eventSource.close();
        // Retry connection after 5 seconds
        setTimeout(connectSSE, 5000);
    };
}

// Update UI with current status
function updateUI(data) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const connectionStatus = document.getElementById('connectionStatus');
    const phoneNumber = document.getElementById('phoneNumber');
    const lastConnected = document.getElementById('lastConnected');
    const uptime = document.getElementById('uptime');
    const qrSection = document.getElementById('qrSection');
    const qrImage = document.getElementById('qrImage');
    const connectBtn = document.getElementById('connectBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');

    // Update status indicator
    statusDot.className = `status-dot ${data.status}`;
    
    switch(data.status) {
        case 'connected':
            statusText.textContent = '✅ Connected';
            connectionStatus.textContent = '🟢 Terhubung';
            connectBtn.disabled = true;
            disconnectBtn.disabled = false;
            qrSection.style.display = 'none';
            break;
            
        case 'qr':
            statusText.textContent = '⏳ Waiting for QR Scan';
            connectionStatus.textContent = '🟡 Menunggu Scan QR';
            connectBtn.disabled = true;
            disconnectBtn.disabled = false;
            qrSection.style.display = 'block';
            if (data.qr) {
                qrImage.src = data.qr;
            }
            break;
            
        case 'disconnected':
            statusText.textContent = '🔴 Disconnected';
            connectionStatus.textContent = '🔴 Terputus';
            connectBtn.disabled = false;
            disconnectBtn.disabled = true;
            qrSection.style.display = 'none';
            break;
            
        default:
            statusText.textContent = '⚪ Unknown';
            connectionStatus.textContent = '⚪ Tidak Diketahui';
    }

    // Update phone number
    phoneNumber.textContent = data.phoneNumber || '-';

    // Update last connected time
    if (data.lastConnected) {
        const date = new Date(data.lastConnected);
        lastConnected.textContent = date.toLocaleString('id-ID');
    } else {
        lastConnected.textContent = '-';
    }

    // Update uptime
    if (data.uptime > 0) {
        const hours = Math.floor(data.uptime / 3600000);
        const minutes = Math.floor((data.uptime % 3600000) / 60000);
        uptime.textContent = `${hours}h ${minutes}m`;
    } else {
        uptime.textContent = '-';
    }
}

// Connect WhatsApp
async function connectWhatsApp() {
    try {
        showToast('🔄 Menghubungkan WhatsApp...', 'info');
        
        const response = await fetch('/api/whatsapp/connect-public', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Silakan scan QR Code yang muncul', 'success');
        } else {
            showToast('❌ Error: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Connect error:', error);
        showToast('❌ Gagal connect. Pastikan server backend berjalan.', 'error');
    }
}

// Disconnect WhatsApp
async function disconnectWhatsApp() {
    if (!confirm('Apakah Anda yakin ingin disconnect WhatsApp Gateway?')) {
        return;
    }

    try {
        showToast('🔄 Memutuskan koneksi...', 'info');
        
        const response = await fetch('/api/whatsapp/disconnect-public', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const result = await response.json();
        
        if (result.success) {
            showToast('✅ WhatsApp berhasil diputus', 'success');
        } else {
            showToast('❌ Error: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Disconnect error:', error);
        showToast('❌ Gagal disconnect', 'error');
    }
}

// Refresh status manually
async function refreshStatus() {
    try {
        const response = await fetch('/api/whatsapp/status');
        const result = await response.json();
        
        if (result.success) {
            updateUI(result.data);
        }
    } catch (error) {
        console.error('Refresh status error:', error);
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}
// Clear session and reconnect
// Clear session via API
async function clearSession() {
    if (!confirm('Clear session akan menghapus autentikasi WhatsApp. Lanjutkan?')) {
        return;
    }

    try {
        showToast('🔄 Clearing session...', 'info');
        
        const response = await fetch('/api/whatsapp/clear-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Session cleared. QR code baru akan muncul', 'success');
        } else {
            showToast('❌ Error: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Clear session error:', error);
        showToast('❌ Gagal clear session', 'error');
    }
}

