let game;

const GAME_MODES = {
    classic: {
        id: 'classic',
        name: 'Classic',
        hint: 'Balanced puzzle',
        mission: 'Collect every star with your equations.',
        starRange: [4, 6],
        patterns: ['scattered', 'clustered', 'linear', 'mixed', 'parabolicArc', 'sineWave', 'diagonal', 'quadrantSpread', 'staircase'],
        maxEquations: 10,
        marbleCount: 3,
        timer: 0,
        start: { x: -8, y: 8 }
    },
    precision: {
        id: 'precision',
        name: 'Precision',
        hint: 'Win with fewer plots',
        mission: 'Use clean, intentional equations to collect the stars.',
        starRange: [3, 4],
        patterns: ['linear', 'parabolicArc', 'circleArc', 'vShape', 'diagonal', 'staircase'],
        maxEquations: 4,
        marbleCount: 2,
        timer: 0,
        start: { x: -8, y: 8 }
    },
    blitz: {
        id: 'blitz',
        name: 'Blitz',
        hint: '75 second sprint',
        mission: 'Plot fast, launch fast, and beat the timer.',
        starRange: [5, 7],
        patterns: ['scattered', 'mixed', 'diagonal', 'funnel', 'quadrantSpread', 'sineWave', 'cross'],
        maxEquations: 8,
        marbleCount: 3,
        timer: 75,
        start: { x: -8, y: 8 }
    },
    zen: {
        id: 'zen',
        name: 'Zen',
        hint: 'Unlimited practice',
        mission: 'Experiment freely and build the smoothest marble path.',
        starRange: [5, 8],
        patterns: ['scattered', 'clustered', 'linear', 'mixed', 'parabolicArc', 'sineWave', 'circleArc', 'diagonal', 'vShape', 'staircase', 'spiral', 'cross', 'quadrantSpread', 'funnel'],
        maxEquations: Infinity,
        marbleCount: 4,
        timer: 0,
        start: { x: -8, y: 8 }
    },
    daily: {
        id: 'daily',
        name: 'Daily',
        hint: 'One shared puzzle today',
        mission: 'Solve today\'s comeback challenge and protect your streak.',
        starRange: [5, 5],
        patterns: ['mixed', 'parabolicArc', 'sineWave', 'circleArc', 'vShape', 'spiral', 'cross', 'funnel', 'quadrantSpread'],
        maxEquations: 6,
        marbleCount: 3,
        timer: 0,
        start: { x: -8, y: 8 },
        seeded: true
    }
};

class Game {
    constructor() {
        this.canvas = null;
        this.physics = new PhysicsEngine();
        this.equationParser = new EquationParser();
        this.equationRenderer = null;
        this.ui = new UIManager();

        this.equations = [];
        this.marbles = [];
        this.stars = [];
        this.editingIndex = -1;
        this.starsCollected = 0;
        this.gameRunning = false;
        this.mode = GAME_MODES.classic;
        this.timerRemaining = 0;
        this.timerInterval = null;
        this.timerStarted = false;
        this.playerStats = this.loadPlayerStats();
        this.random = Math.random;

        this.canvasWidth = 600;
        this.canvasHeight = 600;
        this.xMin = -10;
        this.xMax = 10;
        this.yMin = -10;
        this.yMax = 10;

        this.marbleStartY = 8; // Start above the visible area

        this.setupP5();
        this.applyStartPosition();
        this.generatePuzzle();
        this.ui.updateMode(this.mode, this.getStatsForMode());
    }

    setupP5() {
        new p5((p5) => {
            p5.setup = () => {
                // Use clientWidth/clientHeight — immune to CSS transform scaling
                const container = document.getElementById('gameCanvas');
                const size = Math.min(container.clientWidth, container.clientHeight, 1040);
                this.canvasWidth = size;
                this.canvasHeight = size;

                this.canvas = p5.createCanvas(this.canvasWidth, this.canvasHeight);
                this.canvas.parent('gameCanvas');
                this.equationRenderer = new EquationRenderer(p5);
                p5.background(255);
            };

            p5.draw = () => {
                this.draw(p5);
            };

            p5.windowResized = () => {
                const container = document.getElementById('gameCanvas');
                const size = Math.min(container.clientWidth, container.clientHeight, 1040);
                this.canvasWidth = size;
                this.canvasHeight = size;
                p5.resizeCanvas(this.canvasWidth, this.canvasHeight);
            };
        });
    }

    loadPlayerStats() {
        try {
            return JSON.parse(localStorage.getItem('marbleslidesPlayerStats')) || {};
        } catch (error) {
            return {};
        }
    }

    savePlayerStats() {
        localStorage.setItem('marbleslidesPlayerStats', JSON.stringify(this.playerStats));
    }

    getStatsForMode() {
        const modeStats = this.playerStats[this.mode.id] || {};
        return {
            bestScore: modeStats.bestScore || 0,
            runs: modeStats.runs || 0,
            streak: this.playerStats.dailyStreak || 0
        };
    }

    updateModeStats(updater) {
        const current = this.playerStats[this.mode.id] || { bestScore: 0, runs: 0, wins: 0 };
        this.playerStats[this.mode.id] = updater(current);
        this.savePlayerStats();
        this.ui.updatePlayerStats(this.getStatsForMode());
    }

    applyStartPosition() {
        if (this.ui.startX) this.ui.startX.value = this.mode.start.x;
        if (this.ui.startY) this.ui.startY.value = this.mode.start.y;
    }

    setMode(modeId) {
        const nextMode = GAME_MODES[modeId] || GAME_MODES.classic;
        if (this.mode.id === nextMode.id) return;

        this.mode = nextMode;
        this.applyStartPosition();
        this.ui.updateMode(this.mode, this.getStatsForMode());
        this.startNewPuzzle(true);

        if (this.mode.timer) {
            this.ui.showFeedback(`${this.mode.name} mode — ${this.mode.timer}s timer starts on launch!`, 'info');
        } else {
            this.ui.showFeedback(`${this.mode.name} mode loaded. New puzzle ready.`, 'info');
        }
    }

    startNewPuzzle(silent = false) {
        this.stopTimer();
        this.gameRunning = false;
        this.marbles = [];
        this.equations = [];
        this.editingIndex = -1;
        this.equationParser.resetColorIndex();
        this.ui.setEditingState(false);
        this.ui.updateEquationsList(this.equations);
        this.generatePuzzle();

        if (!silent) {
            this.ui.showFeedback(`${this.mode.name} puzzle remixed.`, 'info');
        }
    }

    resetTimer() {
        this.timerRemaining = this.mode.timer || 0;
        this.timerStarted = false;
        this.ui.updateTimer(this.timerRemaining);
    }

    startTimer() {
        if (!this.mode.timer || this.timerStarted) return;

        this.timerStarted = true;
        this.timerRemaining = this.mode.timer;
        this.ui.updateTimer(this.timerRemaining);
        const startedAt = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = (Date.now() - startedAt) / 1000;
            this.timerRemaining = Math.max(0, this.mode.timer - elapsed);
            this.ui.updateTimer(this.timerRemaining);

            if (this.timerRemaining <= 0) {
                this.clearTimerInterval();
                this.timerRemaining = 0;
                this.ui.updateTimer(0);
                this.gameRunning = false;
                this.marbles = [];
                this.stars.forEach(star => star.collected = false);
                this.starsCollected = 0;
                this.ui.updateStats(this.starsCollected, this.stars.length);
                this.ui.showFeedback('⏱️ Time is up! Reset and try again before the clock runs out.', 'error');
            }
        }, 200);
    }

    stopTimer() {
        this.clearTimerInterval();
        this.resetTimer();
    }

    clearTimerInterval() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    createSeededRandom(seedText) {
        let seed = 2166136261;
        for (let i = 0; i < seedText.length; i++) {
            seed ^= seedText.charCodeAt(i);
            seed = Math.imul(seed, 16777619);
        }

        return () => {
            seed += 0x6D2B79F5;
            let t = seed;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    todayKey() {
        return new Date().toISOString().slice(0, 10);
    }

    yesterdayKey() {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        return date.toISOString().slice(0, 10);
    }

    draw(p5) {
        p5.background(250, 250, 255);

        // Draw grid
        this.drawGrid(p5);

        // Draw axes
        this.drawAxes(p5);

        // Draw equations
        this.equations.forEach(equation => {
            this.equationRenderer.drawEquation(equation, this.xMin, this.xMax, this.yMin, this.yMax, this.canvasWidth, this.canvasHeight);
        });

        // Draw stars
        this.drawStars(p5);

        // Draw marbles
        this.drawMarbles(p5);

        // Update game state
        if (this.gameRunning) {
            this.update();
        }
    }

    drawGrid(p5) {
        p5.stroke(220);
        p5.strokeWeight(1);

        // Vertical lines
        for (let x = this.xMin; x <= this.xMax; x++) {
            const screenX = this.mapToScreen(x, this.xMin, this.xMax, 0, this.canvasWidth);
            p5.line(screenX, 0, screenX, this.canvasHeight);
        }

        // Horizontal lines
        for (let y = this.yMin; y <= this.yMax; y++) {
            const screenY = this.mapToScreen(-y, -this.yMax, -this.yMin, 0, this.canvasHeight);
            p5.line(0, screenY, this.canvasWidth, screenY);
        }
    }

    drawAxes(p5) {
        p5.stroke(100);
        p5.strokeWeight(2);

        // X-axis
        const yAxisScreen = this.mapToScreen(0, this.yMin, this.yMax, this.canvasHeight, 0);
        p5.line(0, yAxisScreen, this.canvasWidth, yAxisScreen);

        // Y-axis
        const xAxisScreen = this.mapToScreen(0, this.xMin, this.xMax, 0, this.canvasWidth);
        p5.line(xAxisScreen, 0, xAxisScreen, this.canvasHeight);

        // Axis labels
        p5.fill(100);
        p5.noStroke();
        p5.textAlign(p5.CENTER, p5.CENTER);
        p5.textSize(12);

        // X-axis labels
        for (let x = this.xMin; x <= this.xMax; x += 2) {
            if (x !== 0) {
                const screenX = this.mapToScreen(x, this.xMin, this.xMax, 0, this.canvasWidth);
                p5.text(x, screenX, yAxisScreen + 15);
            }
        }

        // Y-axis labels
        for (let y = this.yMin; y <= this.yMax; y += 2) {
            if (y !== 0) {
                const screenY = this.mapToScreen(-y, -this.yMax, -this.yMin, 0, this.canvasHeight);
                p5.text(y, xAxisScreen - 15, screenY);
            }
        }

        // Origin
        p5.text('0', xAxisScreen - 15, yAxisScreen + 15);
    }

    drawStars(p5) {
        this.stars.forEach(star => {
            if (!star.collected) {
                const screenX = this.mapToScreen(star.x, this.xMin, this.xMax, 0, this.canvasWidth);
                const screenY = this.mapToScreen(-star.y, -this.yMax, -this.yMin, 0, this.canvasHeight);

                p5.fill(255, 215, 0);
                p5.stroke(255, 165, 0);
                p5.strokeWeight(2);

                // Draw star shape
                p5.push();
                p5.translate(screenX, screenY);
                p5.rotate(p5.frameCount * 0.02);
                const starSize = Math.max(15, star.radius * 40); // Minimum size for mobile
                this.drawStar(p5, 0, 0, starSize, starSize * 0.5, 5);
                p5.pop();
            }
        });
    }

    drawStar(p5, x, y, radius1, radius2, npoints) {
        let angle = p5.TWO_PI / npoints;
        let halfAngle = angle / 2.0;
        p5.beginShape();
        for (let a = 0; a < p5.TWO_PI; a += angle) {
            let sx = x + p5.cos(a) * radius2;
            let sy = y + p5.sin(a) * radius2;
            p5.vertex(sx, sy);
            sx = x + p5.cos(a + halfAngle) * radius1;
            sy = y + p5.sin(a + halfAngle) * radius1;
            p5.vertex(sx, sy);
        }
        p5.endShape(p5.CLOSE);
    }

    drawMarbles(p5) {
        this.marbles.forEach(marble => {
            const screenX = this.mapToScreen(marble.position.x, this.xMin, this.xMax, 0, this.canvasWidth);
            const screenY = this.mapToScreen(-marble.position.y, -this.yMax, -this.yMin, 0, this.canvasHeight);

            // Draw trail
            if (marble.trail.length > 1) {
                p5.stroke(marble.color);
                p5.strokeWeight(Math.max(1, this.canvasWidth / 300)); // Responsive trail width
                for (let i = 1; i < marble.trail.length; i++) {
                    const trailX1 = this.mapToScreen(marble.trail[i - 1].x, this.xMin, this.xMax, 0, this.canvasWidth);
                    const trailY1 = this.mapToScreen(-marble.trail[i - 1].y, -this.yMax, -this.yMin, 0, this.canvasHeight);
                    const trailX2 = this.mapToScreen(marble.trail[i].x, this.xMin, this.xMax, 0, this.canvasWidth);
                    const trailY2 = this.mapToScreen(-marble.trail[i].y, -this.yMax, -this.yMin, 0, this.canvasHeight);

                    const alpha = (i / marble.trail.length) * 100;
                    p5.stroke(p5.red(marble.color), p5.green(marble.color), p5.blue(marble.color), alpha);
                    p5.line(trailX1, trailY1, trailX2, trailY2);
                }
            }

            // Draw marble
            p5.fill(70, 130, 220);
            p5.stroke(50, 100, 180);
            p5.strokeWeight(Math.max(1, this.canvasWidth / 300));
            const marbleSize = Math.max(20, marble.radius * 80); // Minimum size for mobile
            p5.ellipse(screenX, screenY, marbleSize, marbleSize);

            // Draw highlight
            p5.fill(120, 180, 255, 150);
            p5.noStroke();
            const highlightSize = marbleSize * 0.5;
            const offset = Math.max(2, this.canvasWidth / 120);
            p5.ellipse(screenX - offset, screenY - offset, highlightSize, highlightSize);
        });
    }

    update() {
        let marblesInBounds = false;

        const bounds = {
            minX: this.xMin - 2,
            maxX: this.xMax + 2,
            minY: this.yMin - 5,
            maxY: this.yMax + 2
        };

        this.marbles.forEach(marble => {
            // Use new physics engine update
            const result = this.physics.update(marble, 1, this.equations, this.stars);

            // Handle star collections from physics result
            if (result.starsCollected && result.starsCollected.length > 0) {
                this.starsCollected += result.starsCollected.length;
                this.ui.updateStats(this.starsCollected, this.stars.length);

                if (this.starsCollected === this.stars.length) {
                    this.completePuzzle();
                }
            }

            // Check bounds
            if (this.physics.checkBounds(marble, bounds)) {
                marblesInBounds = true;
            }
        });

        // Stop simulation if all marbles are out of bounds
        if (!marblesInBounds && this.marbles.length > 0) {
            this.gameRunning = false;
            if (this.starsCollected < this.stars.length) {
                // Reset all stars to uncollected when simulation fails
                this.stars.forEach(star => {
                    star.collected = false;
                });
                this.starsCollected = 0;
                this.ui.updateStats(this.starsCollected, this.stars.length);
                this.ui.showFeedback('Try again! Adjust your equations to collect all stars.', 'info');
            }
        }
    }

    completePuzzle() {
        const timerBonus = this.mode.timer ? Math.ceil(this.timerRemaining * 5) : 0;
        const maxEquations = this.mode.maxEquations === Infinity ? 20 : this.mode.maxEquations;
        const equationBonus = Math.max(0, maxEquations - this.equations.length) * 75;
        const score = this.stars.length * 100 + timerBonus + equationBonus;

        this.gameRunning = false;
        this.clearTimerInterval();

        this.updateModeStats((stats) => ({
            ...stats,
            wins: (stats.wins || 0) + 1,
            bestScore: Math.max(stats.bestScore || 0, score)
        }));

        if (this.mode.id === 'daily') {
            this.recordDailyWin();
        }

        this.ui.showFeedback(`Solved. Score ${score}. New puzzle when you are ready.`, 'success');
    }

    recordDailyWin() {
        const today = this.todayKey();
        if (this.playerStats.lastDailySolved === today) return;

        this.playerStats.dailyStreak = this.playerStats.lastDailySolved === this.yesterdayKey()
            ? (this.playerStats.dailyStreak || 0) + 1
            : 1;
        this.playerStats.lastDailySolved = today;
        this.savePlayerStats();
        this.ui.updatePlayerStats(this.getStatsForMode());
    }

    addEquation(equationString) {
        if (!equationString.trim()) {
            this.ui.showFeedback('Please enter an equation.', 'error');
            return;
        }

        const isEditing = this.editingIndex >= 0;
        if (!isEditing && this.equations.length >= this.mode.maxEquations) {
            const limit = this.mode.maxEquations;
            this.ui.showFeedback(`${this.mode.name} allows ${limit} plotted equation${limit === 1 ? '' : 's'}.`, 'error');
            return;
        }

        try {
            const equation = this.equationParser.parseEquation(equationString);

            if (isEditing) {
                const oldEquation = this.equations[this.editingIndex];
                equation.color = oldEquation.color;
                this.equations[this.editingIndex] = equation;
                this.ui.showFeedback(`Equation updated: ${equation.original}`, 'info');
                this.editingIndex = -1;
                this.ui.setEditingState(false);
            } else {
                this.equations.push(equation);
                this.ui.showFeedback(`Equation added: ${equation.original}`, 'info');
            }

            this.ui.updateEquationsList(this.equations, this.editingIndex);
            this.ui.clearInput();
        } catch (error) {
            this.ui.showFeedback(error.message, 'error');
        }
    }

    removeEquation(index) {
        if (index >= 0 && index < this.equations.length) {
            const removed = this.equations.splice(index, 1)[0];
            if (this.editingIndex === index) {
                this.cancelEditEquation(false);
            } else if (this.editingIndex > index) {
                this.editingIndex--;
            }
            this.ui.updateEquationsList(this.equations, this.editingIndex);
            this.ui.showFeedback(`Equation removed: ${removed.original}`, 'info');
        }
    }

    editEquation(index) {
        if (index >= 0 && index < this.equations.length) {
            const equation = this.equations[index];
            this.editingIndex = index;
            this.ui.setEditingState(true, equation.original);
            this.ui.updateEquationsList(this.equations, this.editingIndex);
            this.ui.showFeedback(`Editing equation ${index + 1}. Save when ready.`, 'info');
        }
    }

    cancelEditEquation(showMessage = true) {
        this.editingIndex = -1;
        this.ui.clearInput();
        this.ui.setEditingState(false);
        this.ui.updateEquationsList(this.equations, this.editingIndex);
        if (showMessage) {
            this.ui.showFeedback('Edit cancelled.', 'info');
        }
    }

    launchMarbles() {
        if (this.equations.length === 0) {
            this.ui.showFeedback('Add at least one equation before launching marbles.', 'error');
            return;
        }

        // Reset stars and collected count for a fresh run
        this.stars.forEach(star => star.collected = false);
        this.starsCollected = 0;
        this.ui.updateStats(this.starsCollected, this.stars.length);
        this.marbles = [];

        // Get starting position from UI
        const startPos = this.ui.getStartPosition();
        const startX = startPos.x;
        const startY = startPos.y;

        // Launch a fixed number of marbles per mode (independent of equation count)
        const count = this.mode.marbleCount || 3;
        const colors = ['#2563eb', '#dc2626', '#0f9f6e', '#9333ea', '#d97706', '#0891b2'];
        const verticalSpacing = 0.32;
        const horizontalSpacing = 0.08;
        const velocitySpread = 0.03;
        const centerOffset = (count - 1) / 2;
        for (let i = 0; i < count; i++) {
            const formationOffset = i - centerOffset;
            const marble = new Marble(
                startX + (formationOffset * horizontalSpacing),
                startY - (formationOffset * verticalSpacing),
                {
                    vx: 0.5 + (formationOffset * velocitySpread),
                    vy: -formationOffset * 0.01,
                color: colors[i % colors.length]
                }
            );
            // Pass stars reference to marble for path selection
            marble.stars = this.stars;
            this.marbles.push(marble);
        }

        this.gameRunning = true;
        this.startTimer();
        this.updateModeStats((stats) => ({
            ...stats,
            runs: (stats.runs || 0) + 1
        }));
        this.ui.showFeedback(`${count} marble${count > 1 ? 's' : ''} launched from (${startX}, ${startY}).`, 'info');
    }

    reset() {
        this.stopTimer();
        this.gameRunning = false;
        this.marbles = [];
        this.cancelEditEquation(false);
        this.stars.forEach(star => star.collected = false);
        this.starsCollected = 0;
        this.ui.updateStats(this.starsCollected, this.stars.length);
        this.ui.showFeedback('Game reset. Ready to launch!', 'info');
    }

    generatePuzzle() {
        this.stars = [];
        this.starsCollected = 0;
        this.resetTimer();
        this.random = this.mode.seeded
            ? this.createSeededRandom(`${this.mode.id}-${this.todayKey()}`)
            : Math.random;

        const [minStars, maxStars] = this.mode.starRange;
        const starCount = minStars + Math.floor(this.random() * (maxStars - minStars + 1));

        // Pick a pattern from the mode's allowed list
        const patterns = this.mode.patterns;
        const pattern = patterns[Math.floor(this.random() * patterns.length)];

        this.generateStarPattern(pattern, starCount);

        // Guarantee we hit the star count — fill shortfall with spaced scatter
        this.fillToCount(starCount);

        this.ui.updateStats(this.starsCollected, this.stars.length);
    }

    // ── helpers ──────────────────────────────────────────────────────────

    /** Safe bounds for star placement (1-unit margin from graph edges) */
    get starBounds() {
        return {
            xMin: this.xMin + 1,
            xMax: this.xMax - 1,
            yMin: this.yMin + 1,
            yMax: this.yMax - 1
        };
    }

    /** Returns true if (x,y) is inside the safe star bounds */
    inBoundsForStar(x, y) {
        const b = this.starBounds;
        return x >= b.xMin && x <= b.xMax && y >= b.yMin && y <= b.yMax;
    }

    /** Minimum allowed distance between any two stars */
    get minStarSpacing() { return 1.4; }

    /** Check whether a candidate position is far enough from every existing star */
    isFarEnough(x, y) {
        const minDist = this.minStarSpacing;
        return this.stars.every(s => {
            const dx = s.x - x;
            const dy = s.y - y;
            return dx * dx + dy * dy >= minDist * minDist;
        });
    }

    /** Push a star only if it passes bounds + spacing checks */
    addStar(x, y) {
        if (!this.inBoundsForStar(x, y)) return false;
        if (!this.isFarEnough(x, y)) return false;
        this.stars.push({
            x: Math.round(x * 100) / 100,
            y: Math.round(y * 100) / 100,
            radius: 0.25 + this.random() * 0.12,
            collected: false
        });
        return true;
    }

    /** After a pattern runs, fill any remaining deficit with well-spaced random stars */
    fillToCount(target) {
        let remaining = target - this.stars.length;
        let safetyLimit = remaining * 60;
        const b = this.starBounds;
        while (remaining > 0 && safetyLimit-- > 0) {
            const x = b.xMin + this.random() * (b.xMax - b.xMin);
            const y = b.yMin + this.random() * (b.yMax - b.yMin);
            if (this.addStar(x, y)) remaining--;
        }
    }

    // ── pattern router ──────────────────────────────────────────────────

    /** All available pattern generators */
    static PATTERN_GENERATORS = [
        'scattered', 'clustered', 'linear', 'mixed',
        'parabolicArc', 'sineWave', 'circleArc', 'diagonal',
        'vShape', 'staircase', 'spiral', 'cross', 'quadrantSpread', 'funnel'
    ];

    generateStarPattern(pattern, starCount) {
        switch (pattern) {
            case 'scattered':      this.patternScattered(starCount); break;
            case 'clustered':      this.patternClustered(starCount); break;
            case 'linear':         this.patternLinear(starCount); break;
            case 'mixed':          this.patternMixed(starCount); break;
            case 'parabolicArc':   this.patternParabolicArc(starCount); break;
            case 'sineWave':       this.patternSineWave(starCount); break;
            case 'circleArc':      this.patternCircleArc(starCount); break;
            case 'diagonal':       this.patternDiagonal(starCount); break;
            case 'vShape':         this.patternVShape(starCount); break;
            case 'staircase':      this.patternStaircase(starCount); break;
            case 'spiral':         this.patternSpiral(starCount); break;
            case 'cross':          this.patternCross(starCount); break;
            case 'quadrantSpread': this.patternQuadrantSpread(starCount); break;
            case 'funnel':         this.patternFunnel(starCount); break;
            default:               this.patternScattered(starCount); break;
        }
    }

    // ── pattern implementations ─────────────────────────────────────────

    /** Random placement with spacing enforcement */
    patternScattered(count) {
        const b = this.starBounds;
        for (let i = 0; i < count; i++) {
            for (let attempt = 0; attempt < 80; attempt++) {
                const x = b.xMin + this.random() * (b.xMax - b.xMin);
                const y = b.yMin + this.random() * (b.yMax - b.yMin);
                if (this.addStar(x, y)) break;
            }
        }
    }

    /** 2-3 tight clusters, each with well-spaced stars */
    patternClustered(count) {
        const clusterCount = 2 + Math.floor(this.random() * 2); // 2 or 3
        const b = this.starBounds;

        // Pick cluster centres that are spread apart
        const centres = [];
        for (let c = 0; c < clusterCount; c++) {
            for (let attempt = 0; attempt < 40; attempt++) {
                const cx = b.xMin + 1 + this.random() * (b.xMax - b.xMin - 2);
                const cy = b.yMin + 1 + this.random() * (b.yMax - b.yMin - 2);
                const farFromOthers = centres.every(p => {
                    const dx = p.x - cx, dy = p.y - cy;
                    return Math.sqrt(dx * dx + dy * dy) > 4;
                });
                if (farFromOthers) { centres.push({ x: cx, y: cy }); break; }
            }
        }
        if (centres.length === 0) centres.push({ x: 0, y: 0 });

        const perCluster = Math.ceil(count / centres.length);
        for (const centre of centres) {
            const radius = 1.5 + this.random() * 1.5;
            for (let i = 0; i < perCluster; i++) {
                for (let attempt = 0; attempt < 40; attempt++) {
                    const angle = this.random() * Math.PI * 2;
                    const dist = Math.sqrt(this.random()) * radius;
                    if (this.addStar(centre.x + dist * Math.cos(angle),
                                     centre.y + dist * Math.sin(angle))) break;
                }
            }
        }
    }

    /** Stars along a straight line with jitter */
    patternLinear(count) {
        const b = this.starBounds;
        // Pick two endpoints that span a good portion of the graph
        const x1 = b.xMin + this.random() * 4;
        const y1 = b.yMin + this.random() * (b.yMax - b.yMin);
        const x2 = b.xMax - this.random() * 4;
        const y2 = b.yMin + this.random() * (b.yMax - b.yMin);

        for (let i = 0; i < count; i++) {
            const t = count === 1 ? 0.5 : i / (count - 1);
            const jitter = 0.3 + this.random() * 0.4;
            const x = x1 + (x2 - x1) * t + (this.random() - 0.5) * jitter;
            const y = y1 + (y2 - y1) * t + (this.random() - 0.5) * jitter;
            this.addStar(x, y);
        }
    }

    /** Combo: half along a curve, half scattered */
    patternMixed(count) {
        const curveStars = Math.ceil(count * 0.5);
        const scatterStars = count - curveStars;

        // Pick a random curve pattern for the first half
        const curves = ['parabolicArc', 'sineWave', 'circleArc', 'diagonal'];
        const pick = curves[Math.floor(this.random() * curves.length)];
        this.generateStarPattern(pick, curveStars);
        this.patternScattered(scatterStars);
    }

    /** Stars along a parabola y = a(x-h)² + k */
    patternParabolicArc(count) {
        const b = this.starBounds;
        const h = b.xMin + 1 + this.random() * (b.xMax - b.xMin - 2);   // vertex x
        const k = b.yMin + 2 + this.random() * (b.yMax - b.yMin - 4);   // vertex y
        const a = (this.random() < 0.5 ? -1 : 1) * (0.1 + this.random() * 0.25); // curvature
        const span = 4 + this.random() * 6; // x-range around vertex

        for (let i = 0; i < count; i++) {
            const t = count === 1 ? 0 : i / (count - 1);
            const x = h - span / 2 + span * t;
            const y = a * (x - h) * (x - h) + k;
            this.addStar(x, y);
        }
    }

    /** Stars along a sine curve y = A·sin(Bx + C) + D */
    patternSineWave(count) {
        const b = this.starBounds;
        const amplitude = 1.5 + this.random() * 3;
        const freq = 0.3 + this.random() * 0.5;
        const phase = this.random() * Math.PI * 2;
        const yOffset = (b.yMin + b.yMax) / 2 + (this.random() - 0.5) * 4;

        for (let i = 0; i < count; i++) {
            const t = count === 1 ? 0.5 : i / (count - 1);
            const x = b.xMin + (b.xMax - b.xMin) * t;
            const y = amplitude * Math.sin(freq * x + phase) + yOffset;
            this.addStar(x, y);
        }
    }

    /** Stars along a circular arc */
    patternCircleArc(count) {
        const b = this.starBounds;
        const cx = (b.xMin + b.xMax) / 2 + (this.random() - 0.5) * 6;
        const cy = (b.yMin + b.yMax) / 2 + (this.random() - 0.5) * 6;
        const r = 2.5 + this.random() * 3.5;
        const startAngle = this.random() * Math.PI * 2;
        const sweep = Math.PI * (0.5 + this.random() * 1.2); // 90°–310° arc

        for (let i = 0; i < count; i++) {
            const t = count === 1 ? 0.5 : i / (count - 1);
            const angle = startAngle + sweep * t;
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            this.addStar(x, y);
        }
    }

    /** Stars cascading diagonally (top-left to bottom-right or mirrored) */
    patternDiagonal(count) {
        const b = this.starBounds;
        const goingRight = this.random() < 0.5;
        const xStart = goingRight ? b.xMin + 0.5 : b.xMax - 0.5;
        const xEnd   = goingRight ? b.xMax - 0.5 : b.xMin + 0.5;
        const yStart = b.yMax - 1;
        const yEnd   = b.yMin + 1;

        for (let i = 0; i < count; i++) {
            const t = count === 1 ? 0.5 : i / (count - 1);
            const x = xStart + (xEnd - xStart) * t + (this.random() - 0.5) * 1.2;
            const y = yStart + (yEnd - yStart) * t + (this.random() - 0.5) * 1.2;
            this.addStar(x, y);
        }
    }

    /** Stars in a V or chevron shape — needs two equations to solve */
    patternVShape(count) {
        const b = this.starBounds;
        const tipX = b.xMin + 2 + this.random() * (b.xMax - b.xMin - 4);
        const tipY = b.yMin + 1 + this.random() * 3; // tip near bottom
        const armLength = 3 + this.random() * 3;
        const spread = 0.5 + this.random() * 0.8; // how wide the V opens

        const leftCount = Math.ceil(count / 2);
        const rightCount = count - leftCount;

        // Left arm
        for (let i = 0; i < leftCount; i++) {
            const t = (i + 1) / leftCount;
            const x = tipX - armLength * t * spread;
            const y = tipY + armLength * t;
            this.addStar(x, y);
        }
        // Right arm
        for (let i = 0; i < rightCount; i++) {
            const t = (i + 1) / rightCount;
            const x = tipX + armLength * t * spread;
            const y = tipY + armLength * t;
            this.addStar(x, y);
        }
    }

    /** Stars in a descending staircase pattern */
    patternStaircase(count) {
        const b = this.starBounds;
        const goRight = this.random() < 0.5;
        const stepWidth = (b.xMax - b.xMin - 1) / count;
        const stepHeight = (b.yMax - b.yMin - 1) / count;
        const startX = goRight ? b.xMin + 0.5 : b.xMax - 0.5;
        const startY = b.yMax - 0.5;

        for (let i = 0; i < count; i++) {
            const x = startX + (goRight ? 1 : -1) * (i * stepWidth + stepWidth / 2);
            const y = startY - i * stepHeight + (this.random() - 0.5) * 0.6;
            this.addStar(x, y);
        }
    }

    /** Stars spiralling outward from a centre */
    patternSpiral(count) {
        const b = this.starBounds;
        const cx = (b.xMin + b.xMax) / 2 + (this.random() - 0.5) * 4;
        const cy = (b.yMin + b.yMax) / 2 + (this.random() - 0.5) * 4;
        const maxR = 3 + this.random() * 3;
        const turns = 1 + this.random() * 1.5;
        const startAngle = this.random() * Math.PI * 2;

        for (let i = 0; i < count; i++) {
            const t = count === 1 ? 1 : i / (count - 1);
            const angle = startAngle + turns * Math.PI * 2 * t;
            const r = 0.8 + maxR * t;
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            this.addStar(x, y);
        }
    }

    /** Stars in a plus/cross shape — needs horizontal + vertical equations */
    patternCross(count) {
        const b = this.starBounds;
        const cx = (b.xMin + b.xMax) / 2 + (this.random() - 0.5) * 4;
        const cy = (b.yMin + b.yMax) / 2 + (this.random() - 0.5) * 4;
        const armLen = 2 + this.random() * 3;
        const hCount = Math.ceil(count / 2);
        const vCount = count - hCount;

        // Horizontal arm
        for (let i = 0; i < hCount; i++) {
            const t = hCount === 1 ? 0 : (i / (hCount - 1)) * 2 - 1; // -1 to 1
            this.addStar(cx + armLen * t, cy + (this.random() - 0.5) * 0.4);
        }
        // Vertical arm
        for (let i = 0; i < vCount; i++) {
            const t = vCount === 1 ? 0 : (i / (vCount - 1)) * 2 - 1;
            this.addStar(cx + (this.random() - 0.5) * 0.4, cy + armLen * t);
        }
    }

    /** One star guaranteed in each occupied quadrant */
    patternQuadrantSpread(count) {
        const b = this.starBounds;
        const quadrants = [
            { xMin: b.xMin, xMax: 0, yMin: 0, yMax: b.yMax },         // Q2 top-left
            { xMin: 0, xMax: b.xMax, yMin: 0, yMax: b.yMax },         // Q1 top-right
            { xMin: b.xMin, xMax: 0, yMin: b.yMin, yMax: 0 },         // Q3 bottom-left
            { xMin: 0, xMax: b.xMax, yMin: b.yMin, yMax: 0 }          // Q4 bottom-right
        ];

        // Shuffle quadrants
        for (let i = quadrants.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [quadrants[i], quadrants[j]] = [quadrants[j], quadrants[i]];
        }

        // Place at least one star per quadrant (up to count)
        const perQuadrant = Math.max(1, Math.floor(count / 4));
        let placed = 0;
        for (const q of quadrants) {
            if (placed >= count) break;
            const qty = Math.min(perQuadrant, count - placed);
            for (let i = 0; i < qty; i++) {
                for (let attempt = 0; attempt < 40; attempt++) {
                    const x = q.xMin + 0.5 + this.random() * (q.xMax - q.xMin - 1);
                    const y = q.yMin + 0.5 + this.random() * (q.yMax - q.yMin - 1);
                    if (this.addStar(x, y)) { placed++; break; }
                }
            }
        }
    }

    /** Stars spread in a widening funnel shape (narrow top, wide bottom) */
    patternFunnel(count) {
        const b = this.starBounds;
        const flip = this.random() < 0.5; // flip vertical direction
        const cx = (b.xMin + b.xMax) / 2 + (this.random() - 0.5) * 4;

        for (let i = 0; i < count; i++) {
            const t = count === 1 ? 0.5 : i / (count - 1);
            const yRaw = flip ? (b.yMin + t * (b.yMax - b.yMin)) : (b.yMax - t * (b.yMax - b.yMin));
            const spread = 0.5 + t * 4; // narrow at top, wide at bottom
            const x = cx + (this.random() - 0.5) * spread * 2;
            this.addStar(x, yRaw);
        }
    }

    mapToScreen(value, min, max, screenMin, screenMax) {
        return screenMin + (value - min) * (screenMax - screenMin) / (max - min);
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
    game = window.game; // For global access
});
