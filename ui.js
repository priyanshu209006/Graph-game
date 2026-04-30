/**
 * ============================================================================
 * UI MANAGER
 * ============================================================================
 */

class UIManager {
    constructor() {
        this.equationInput = document.getElementById('equationInput');
        this.addEquationBtn = document.getElementById('addEquationBtn');
        this.cancelEditBtn = document.getElementById('cancelEditBtn');
        this.launchBtn = document.getElementById('launchBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.newPuzzleBtn = document.getElementById('newPuzzleBtn');
        this.equationsList = document.getElementById('equationsList');
        this.feedback = document.getElementById('feedback');
        this.starsCollected = document.getElementById('starsCollected');
        this.totalStars = document.getElementById('totalStars');
        this.starsCollectedSide = document.getElementById('starsCollectedSide');
        this.totalStarsSide = document.getElementById('totalStarsSide');
        this.equationCount = document.getElementById('equationCount');
        this.bestScore = document.getElementById('bestScore');
        this.runCount = document.getElementById('runCount');
        this.streakCount = document.getElementById('streakCount');
        this.activeModeName = document.getElementById('activeModeName');
        this.modeHint = document.getElementById('modeHint');
        this.timerReadout = document.getElementById('timerReadout');
        this.missionTitle = document.getElementById('missionTitle');
        this.equationLimit = document.getElementById('equationLimit');
        this.modeGrid = document.getElementById('modeGrid');
        this.startX = document.getElementById('startX');
        this.startY = document.getElementById('startY');

        this.feedbackTimeout = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.addEquationBtn) {
            this.addEquationBtn.addEventListener('click', () => {
                window.game?.addEquation(this.equationInput.value);
            });
        }

        if (this.cancelEditBtn) {
            this.cancelEditBtn.addEventListener('click', () => window.game?.cancelEditEquation());
        }

        if (this.equationInput) {
            this.equationInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    window.game?.addEquation(this.equationInput.value);
                }
            });
        }

        if (this.launchBtn) {
            this.launchBtn.addEventListener('click', () => window.game?.launchMarbles());
        }

        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => window.game?.reset());
        }

        if (this.newPuzzleBtn) {
            this.newPuzzleBtn.addEventListener('click', () => window.game?.startNewPuzzle());
        }

        if (this.modeGrid) {
            this.modeGrid.addEventListener('click', (event) => {
                const button = event.target.closest('[data-mode]');
                if (button) {
                    window.game?.setMode(button.dataset.mode);
                }
            });
        }

        [this.startX, this.startY].forEach((input) => {
            if (input) {
                input.addEventListener('input', () => this.validateCoordinateInput(input));
            }
        });
    }

    validateCoordinateInput(input) {
        const value = parseFloat(input.value);
        const wrapper = input.closest('.coord-box');
        const invalid = Number.isNaN(value) || value < -10 || value > 10;
        input.style.borderColor = invalid ? '#ef4444' : '';
        if (wrapper) wrapper.style.borderColor = invalid ? '#ef4444' : '';
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

        if (this.feedbackTimeout) {
            clearTimeout(this.feedbackTimeout);
        }

        this.feedback.textContent = message;
        this.feedback.className = 'toast ' + type;

        this.feedbackTimeout = setTimeout(() => {
            this.feedback.className = 'toast';
            this.feedback.textContent = '';
        }, type === 'success' ? 5200 : 3200);
    }

    updateEquationsList(equations, editingIndex = -1) {
        if (this.equationCount) this.equationCount.textContent = equations.length;
        if (!this.equationsList) return;

        if (equations.length === 0) {
            this.equationsList.innerHTML = '<div class="empty-state">No equations yet. Add one above.</div>';
            return;
        }

        this.equationsList.innerHTML = '';

        equations.forEach((equation, index) => {
            const equationDiv = document.createElement('div');
            equationDiv.className = 'equation-item' + (index === editingIndex ? ' editing' : '');

            const color = document.createElement('div');
            color.className = 'equation-color';
            color.style.backgroundColor = equation.color;

            const text = document.createElement('div');
            text.className = 'equation-text';
            text.title = equation.original;
            text.textContent = equation.original;

            const buttons = document.createElement('div');
            buttons.className = 'equation-buttons';

            const edit = document.createElement('button');
            edit.className = 'edit-btn';
            edit.type = 'button';
            edit.textContent = index === editingIndex ? 'Editing' : 'Edit';
            edit.setAttribute('aria-label', `Edit equation ${index + 1}`);
            edit.addEventListener('click', () => window.game?.editEquation(index));

            const remove = document.createElement('button');
            remove.className = 'remove-btn';
            remove.type = 'button';
            remove.textContent = 'Del';
            remove.setAttribute('aria-label', `Remove equation ${index + 1}`);
            remove.addEventListener('click', () => window.game?.removeEquation(index));

            buttons.append(edit, remove);
            equationDiv.append(color, text, buttons);
            this.equationsList.appendChild(equationDiv);
        });
    }

    setEditingState(isEditing, equation = '') {
        if (this.addEquationBtn) {
            this.addEquationBtn.textContent = isEditing ? 'Save' : 'Plot';
        }

        const keyboardSubmit = document.querySelector('.keyboard-action.action-submit');
        if (keyboardSubmit) {
            keyboardSubmit.textContent = isEditing ? 'Save' : 'Plot';
        }

        if (this.cancelEditBtn) {
            this.cancelEditBtn.hidden = !isEditing;
        }

        if (isEditing && this.equationInput) {
            this.equationInput.value = equation;
            this.equationInput.focus();
            this.equationInput.select();
            window.mathKeyboard?.updatePreview();
        }
    }

    updateStats(starsCollected, totalStars) {
        if (this.starsCollected) this.starsCollected.textContent = starsCollected;
        if (this.totalStars) this.totalStars.textContent = totalStars;
        if (this.starsCollectedSide) this.starsCollectedSide.textContent = starsCollected;
        if (this.totalStarsSide) this.totalStarsSide.textContent = totalStars;
    }

    updateMode(mode, playerStats = {}) {
        if (!mode) return;

        if (this.activeModeName) this.activeModeName.textContent = mode.name;
        if (this.modeHint) this.modeHint.textContent = mode.hint;
        if (this.missionTitle) this.missionTitle.textContent = mode.mission;
        if (this.equationLimit) {
            const eqLabel = mode.maxEquations === Infinity ? 'unlimited plots' : `${mode.maxEquations} plot limit`;
            const marbles = mode.marbleCount || 3;
            this.equationLimit.textContent = `${eqLabel} · ${marbles} marble${marbles > 1 ? 's' : ''}`;
        }

        document.querySelectorAll('[data-mode]').forEach((button) => {
            button.classList.toggle('active', button.dataset.mode === mode.id);
        });

        this.updateTimer(mode.timer);
        this.updatePlayerStats(playerStats);
    }

    updatePlayerStats(stats = {}) {
        if (this.bestScore) this.bestScore.textContent = stats.bestScore ?? 0;
        if (this.runCount) this.runCount.textContent = stats.runs ?? 0;
        if (this.streakCount) this.streakCount.textContent = stats.streak ?? 0;
    }

    updateTimer(seconds) {
        if (!this.timerReadout) return;

        if (!Number.isFinite(seconds) || seconds < 0) {
            this.timerReadout.textContent = 'No timer';
            this.timerReadout.closest('.timer-chip')?.classList.remove('timer-urgent', 'timer-active');
            return;
        }

        if (seconds === 0 && (!window.game || !window.game.mode || !window.game.mode.timer)) {
            this.timerReadout.textContent = 'No timer';
            this.timerReadout.closest('.timer-chip')?.classList.remove('timer-urgent', 'timer-active');
            return;
        }

        const wholeSeconds = Math.max(0, Math.ceil(seconds));
        const minutes = Math.floor(wholeSeconds / 60);
        const remainder = wholeSeconds % 60;
        this.timerReadout.textContent = `${minutes}:${String(remainder).padStart(2, '0')}`;

        const chip = this.timerReadout.closest('.timer-chip');
        if (chip) {
            chip.classList.add('timer-active');
            chip.classList.toggle('timer-urgent', wholeSeconds <= 15 && wholeSeconds > 0);
        }

        if (wholeSeconds === 0) {
            this.timerReadout.textContent = '0:00';
        }
    }

    clearInput() {
        if (this.equationInput) {
            this.equationInput.value = '';
            window.mathKeyboard?.updatePreview();
        }
    }

    setButtonState(button, enabled) {
        if (!button) return;
        button.disabled = !enabled;
        button.style.opacity = enabled ? '1' : '0.6';
    }
}
