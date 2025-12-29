/**
 * ============================================================================
 * UI MANAGER - Enhanced for new design
 * ============================================================================
 */

class UIManager {
    constructor() {
        this.equationInput = document.getElementById('equationInput');
        this.addEquationBtn = document.getElementById('addEquationBtn');
        this.launchBtn = document.getElementById('launchBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.newLevelBtn = document.getElementById('newLevelBtn');
        this.equationsList = document.getElementById('equationsList');
        this.feedback = document.getElementById('feedback');
        this.starsCollected = document.getElementById('starsCollected');
        this.totalStars = document.getElementById('totalStars');
        this.currentLevel = document.getElementById('currentLevel');
        this.startX = document.getElementById('startX');
        this.startY = document.getElementById('startY');

        this.feedbackTimeout = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add equation button
        if (this.addEquationBtn) {
            this.addEquationBtn.addEventListener('click', () => {
                if (window.game) {
                    window.game.addEquation(this.equationInput.value);
                }
            });
        }

        // Enter key on input
        if (this.equationInput) {
            this.equationInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (window.game) {
                        window.game.addEquation(this.equationInput.value);
                    }
                }
            });
        }

        // Launch button
        if (this.launchBtn) {
            this.launchBtn.addEventListener('click', () => {
                if (window.game) {
                    window.game.launchMarbles();
                }
            });
        }

        // Reset button
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => {
                if (window.game) {
                    window.game.reset();
                }
            });
        }

        // New level button
        if (this.newLevelBtn) {
            this.newLevelBtn.addEventListener('click', () => {
                if (window.game) {
                    window.game.generateNewLevel();
                }
            });
        }

        // Coordinate input validation
        if (this.startX) {
            this.startX.addEventListener('input', () => {
                this.validateCoordinateInput(this.startX);
            });
        }

        if (this.startY) {
            this.startY.addEventListener('input', () => {
                this.validateCoordinateInput(this.startY);
            });
        }
    }

    validateCoordinateInput(input) {
        const value = parseFloat(input.value);
        if (isNaN(value) || value < -10 || value > 10) {
            input.style.borderColor = '#ef4444';
        } else {
            input.style.borderColor = '';
        }
    }

    getStartPosition() {
        const x = parseFloat(this.startX?.value) || -8;
        const y = parseFloat(this.startY?.value) || 8;

        return {
            x: Math.max(-10, Math.min(10, x)),
            y: Math.max(-10, Math.min(10, y))
        };
    }

    showFeedback(message, type = 'info') {
        if (!this.feedback) return;

        // Clear any existing timeout
        if (this.feedbackTimeout) {
            clearTimeout(this.feedbackTimeout);
        }

        this.feedback.textContent = message;
        this.feedback.className = 'toast ' + type;

        // Auto-hide after 3 seconds for non-success messages
        this.feedbackTimeout = setTimeout(() => {
            this.feedback.className = 'toast';
            this.feedback.textContent = '';
        }, type === 'success' ? 5000 : 3000);
    }

    updateEquationsList(equations) {
        if (!this.equationsList) return;

        if (equations.length === 0) {
            this.equationsList.innerHTML = '<div class="empty-state">No equations yet. Add one above!</div>';
            return;
        }

        this.equationsList.innerHTML = '';

        equations.forEach((equation, index) => {
            const equationDiv = document.createElement('div');
            equationDiv.className = 'equation-item';

            equationDiv.innerHTML = `
                <div class="equation-color" style="background-color: ${equation.color}"></div>
                <div class="equation-text" title="${equation.original}">${equation.original}</div>
                <div class="equation-buttons">
                    <button class="edit-btn" onclick="window.game.editEquation(${index})">✏️</button>
                    <button class="remove-btn" onclick="window.game.removeEquation(${index})">✕</button>
                </div>
            `;

            this.equationsList.appendChild(equationDiv);
        });
    }

    updateStats(starsCollected, totalStars, level) {
        if (this.starsCollected) this.starsCollected.textContent = starsCollected;
        if (this.totalStars) this.totalStars.textContent = totalStars;
        if (this.currentLevel) this.currentLevel.textContent = level;
    }

    clearInput() {
        if (this.equationInput) {
            this.equationInput.value = '';
            // Also update the keyboard preview if available
            if (window.mathKeyboard) {
                window.mathKeyboard.updatePreview();
            }
        }
    }

    setButtonState(button, enabled) {
        if (!button) return;

        if (enabled) {
            button.disabled = false;
            button.style.opacity = '1';
        } else {
            button.disabled = true;
            button.style.opacity = '0.6';
        }
    }
}