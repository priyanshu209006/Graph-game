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
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.addEquationBtn.addEventListener('click', () => {
            if (window.game) {
                window.game.addEquation(this.equationInput.value);
            }
        });
        
        this.equationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (window.game) {
                    window.game.addEquation(this.equationInput.value);
                }
            }
        });
        
        this.launchBtn.addEventListener('click', () => {
            if (window.game) {
                window.game.launchMarbles();
            }
        });
        
        this.resetBtn.addEventListener('click', () => {
            if (window.game) {
                window.game.reset();
            }
        });
        
        this.newLevelBtn.addEventListener('click', () => {
            if (window.game) {
                window.game.generateNewLevel();
            }
        });
        
        // Add validation for coordinate inputs
        this.startX.addEventListener('input', () => {
            this.validateCoordinateInput(this.startX);
        });
        
        this.startY.addEventListener('input', () => {
            this.validateCoordinateInput(this.startY);
        });
    }
    
    validateCoordinateInput(input) {
        const value = parseFloat(input.value);
        if (isNaN(value) || value < -10 || value > 10) {
            input.style.borderColor = '#ef4444';
        } else {
            input.style.borderColor = '#e5e7eb';
        }
    }
    
    getStartPosition() {
        const x = parseFloat(this.startX.value) || -8;
        const y = parseFloat(this.startY.value) || 8;
        
        // Clamp values to valid range
        return {
            x: Math.max(-10, Math.min(10, x)),
            y: Math.max(-10, Math.min(10, y))
        };
    }
    
    showFeedback(message, type = 'info') {
        this.feedback.textContent = message;
        this.feedback.className = `feedback ${type}`;
        
        // Auto-hide after 3 seconds for non-success messages
        if (type !== 'success') {
            setTimeout(() => {
                this.feedback.textContent = '';
                this.feedback.className = 'feedback';
            }, 3000);
        }
    }
    
    updateEquationsList(equations) {
        this.equationsList.innerHTML = '';
        
        equations.forEach((equation, index) => {
            const equationDiv = document.createElement('div');
            equationDiv.className = 'equation-item';
            
            equationDiv.innerHTML = `
                <div class="equation-color" style="background-color: ${equation.color}"></div>
                <div class="equation-text">${equation.original}</div>
                <div class="equation-buttons">
                    <button class="edit-btn" onclick="window.game.editEquation(${index})">Edit</button>
                    <button class="remove-btn" onclick="window.game.removeEquation(${index})">Remove</button>
                </div>
            `;
            
            this.equationsList.appendChild(equationDiv);
        });
    }
    
    updateStats(starsCollected, totalStars, level) {
        this.starsCollected.textContent = starsCollected;
        this.totalStars.textContent = totalStars;
        this.currentLevel.textContent = level;
    }
    
    clearInput() {
        this.equationInput.value = '';
    }
    
    setButtonState(button, enabled) {
        if (enabled) {
            button.disabled = false;
            button.style.opacity = '1';
        } else {
            button.disabled = true;
            button.style.opacity = '0.6';
        }
    }
}