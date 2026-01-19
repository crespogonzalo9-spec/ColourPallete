// Keyboard Counter Application
// Tracks and displays keystroke statistics

class KeyboardCounter {
    constructor() {
        this.totalCount = 0;
        this.keyStats = {};
        this.sessionStart = null;
        this.sortMode = 'alpha'; // 'alpha' or 'count'

        this.initElements();
        this.bindEvents();
        this.startSession();
    }

    initElements() {
        this.totalCountEl = document.getElementById('total-count');
        this.lastKeyEl = document.getElementById('last-key');
        this.lastKeyCodeEl = document.getElementById('last-key-code');
        this.keyStatsEl = document.getElementById('key-stats');
        this.sessionStartEl = document.getElementById('session-start');
        this.keysPerMinuteEl = document.getElementById('keys-per-minute');
        this.counterCircle = document.querySelector('.counter-circle');
        this.sortAlphaBtn = document.getElementById('sort-alpha');
        this.sortCountBtn = document.getElementById('sort-count');
        this.resetBtn = document.getElementById('reset-btn');
    }

    bindEvents() {
        // Listen for keydown events
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));

        // Sort buttons
        this.sortAlphaBtn.addEventListener('click', () => this.setSortMode('alpha'));
        this.sortCountBtn.addEventListener('click', () => this.setSortMode('count'));

        // Reset button
        this.resetBtn.addEventListener('click', () => this.resetStats());

        // Update keys per minute every second
        setInterval(() => this.updateKeysPerMinute(), 1000);
    }

    startSession() {
        this.sessionStart = new Date();
        this.sessionStartEl.textContent = this.formatTime(this.sessionStart);
    }

    formatTime(date) {
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    handleKeyPress(e) {
        // Prevent default for some keys to avoid browser actions
        if (['F5', 'F12'].indexOf(e.key) === -1) {
            e.preventDefault();
        }

        const keyName = this.getKeyName(e);
        const keyCode = e.code;

        // Update total count
        this.totalCount++;
        this.totalCountEl.textContent = this.totalCount;

        // Update last key display
        this.lastKeyEl.textContent = this.getDisplayName(e);
        this.lastKeyCodeEl.textContent = `Codigo: ${keyCode}`;

        // Add pulse animation to counter
        this.counterCircle.classList.remove('pulse');
        void this.counterCircle.offsetWidth; // Trigger reflow
        this.counterCircle.classList.add('pulse');

        // Add pressed animation to last key
        this.lastKeyEl.classList.add('pressed');
        setTimeout(() => this.lastKeyEl.classList.remove('pressed'), 150);

        // Update key statistics
        if (!this.keyStats[keyName]) {
            this.keyStats[keyName] = {
                count: 0,
                displayName: this.getDisplayName(e),
                code: keyCode
            };
        }
        this.keyStats[keyName].count++;

        // Render stats
        this.renderKeyStats(keyName);
    }

    getKeyName(e) {
        // Use code for special keys, key for regular characters
        if (e.key.length === 1) {
            return e.key.toUpperCase();
        }
        return e.code;
    }

    getDisplayName(e) {
        const specialKeys = {
            'Space': 'Space',
            'Enter': 'Enter',
            'Backspace': 'Back',
            'Tab': 'Tab',
            'Escape': 'Esc',
            'ArrowUp': 'Up',
            'ArrowDown': 'Down',
            'ArrowLeft': 'Left',
            'ArrowRight': 'Right',
            'ShiftLeft': 'L Shift',
            'ShiftRight': 'R Shift',
            'ControlLeft': 'L Ctrl',
            'ControlRight': 'R Ctrl',
            'AltLeft': 'L Alt',
            'AltRight': 'R Alt',
            'MetaLeft': 'L Meta',
            'MetaRight': 'R Meta',
            'CapsLock': 'Caps',
            'Delete': 'Del',
            'Insert': 'Ins',
            'Home': 'Home',
            'End': 'End',
            'PageUp': 'PgUp',
            'PageDown': 'PgDn'
        };

        if (e.key.length === 1) {
            return e.key.toUpperCase();
        }

        return specialKeys[e.code] || e.key;
    }

    renderKeyStats(highlightKey = null) {
        const keys = Object.keys(this.keyStats);

        if (keys.length === 0) {
            this.keyStatsEl.innerHTML = '<p class="empty-message">Aun no hay teclas registradas</p>';
            return;
        }

        // Sort keys based on current mode
        if (this.sortMode === 'alpha') {
            keys.sort((a, b) => a.localeCompare(b));
        } else {
            keys.sort((a, b) => this.keyStats[b].count - this.keyStats[a].count);
        }

        this.keyStatsEl.innerHTML = keys.map(key => {
            const stat = this.keyStats[key];
            const isHighlight = key === highlightKey ? 'highlight' : '';
            return `
                <div class="key-stat-item ${isHighlight}" data-key="${key}">
                    <span class="key-name">${stat.displayName}</span>
                    <span class="key-count">${stat.count}</span>
                </div>
            `;
        }).join('');
    }

    setSortMode(mode) {
        this.sortMode = mode;

        // Update button states
        this.sortAlphaBtn.classList.toggle('active', mode === 'alpha');
        this.sortCountBtn.classList.toggle('active', mode === 'count');

        // Re-render stats
        this.renderKeyStats();
    }

    updateKeysPerMinute() {
        if (!this.sessionStart || this.totalCount === 0) {
            this.keysPerMinuteEl.textContent = '0';
            return;
        }

        const minutesElapsed = (Date.now() - this.sessionStart.getTime()) / 60000;
        if (minutesElapsed < 0.1) {
            this.keysPerMinuteEl.textContent = '0';
            return;
        }

        const kpm = Math.round(this.totalCount / minutesElapsed);
        this.keysPerMinuteEl.textContent = kpm;
    }

    resetStats() {
        this.totalCount = 0;
        this.keyStats = {};
        this.totalCountEl.textContent = '0';
        this.lastKeyEl.textContent = '-';
        this.lastKeyCodeEl.textContent = 'Codigo: -';
        this.keysPerMinuteEl.textContent = '0';
        this.keyStatsEl.innerHTML = '<p class="empty-message">Aun no hay teclas registradas</p>';
        this.startSession();
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new KeyboardCounter();
});
