let game;

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
        this.level = 1;
        this.starsCollected = 0;
        this.gameRunning = false;

        this.canvasWidth = 600;
        this.canvasHeight = 600;
        this.xMin = -10;
        this.xMax = 10;
        this.yMin = -10;
        this.yMax = 10;

        this.marbleStartY = 8; // Start above the visible area

        this.setupP5();
        this.generateLevel();
    }

    setupP5() {
        new p5((p5) => {
            p5.setup = () => {
                // Get container dimensions for responsive sizing
                const container = document.getElementById('gameCanvas');
                const rect = container.getBoundingClientRect();
                const size = Math.min(rect.width, rect.height, 600);
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
                const rect = container.getBoundingClientRect();
                const size = Math.min(rect.width, rect.height, 600);
                this.canvasWidth = size;
                this.canvasHeight = size;
                p5.resizeCanvas(this.canvasWidth, this.canvasHeight);
            };
        });
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
                this.ui.updateStats(this.starsCollected, this.stars.length, this.level);

                if (this.starsCollected === this.stars.length) {
                    this.ui.showFeedback('🌟 Success! All stars collected! 🌟', 'success');
                    this.gameRunning = false;
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
                this.ui.updateStats(this.starsCollected, this.stars.length, this.level);
                this.ui.showFeedback('Try again! Adjust your equations to collect all stars.', 'info');
            }
        }
    }

    addEquation(equationString) {
        if (!equationString.trim()) {
            this.ui.showFeedback('Please enter an equation.', 'error');
            return;
        }

        try {
            const equation = this.equationParser.parseEquation(equationString);
            this.equations.push(equation);
            this.ui.updateEquationsList(this.equations);
            this.ui.clearInput();
            this.ui.showFeedback(`Equation added: ${equation.original}`, 'info');
        } catch (error) {
            this.ui.showFeedback(error.message, 'error');
        }
    }

    removeEquation(index) {
        if (index >= 0 && index < this.equations.length) {
            const removed = this.equations.splice(index, 1)[0];
            this.ui.updateEquationsList(this.equations);
            this.ui.showFeedback(`Equation removed: ${removed.original}`, 'info');
        }
    }

    editEquation(index) {
        if (index >= 0 && index < this.equations.length) {
            const equation = this.equations[index];

            // Pre-fill the input with the current equation
            this.ui.equationInput.value = equation.original;
            this.ui.equationInput.focus();
            this.ui.equationInput.select();

            // Remove the equation temporarily
            this.equations.splice(index, 1);
            this.ui.updateEquationsList(this.equations);
            this.ui.showFeedback(`Editing: ${equation.original}`, 'info');
        }
    }

    launchMarbles() {
        if (this.equations.length === 0) {
            this.ui.showFeedback('Add at least one equation before launching marbles.', 'error');
            return;
        }

        this.marbles = [];

        // Get starting position from UI
        const startPos = this.ui.getStartPosition();
        const startX = startPos.x;
        const startY = startPos.y;

        // Create marbles with the new Marble class
        const colors = ['#4A90D9', '#E74C3C', '#2ECC71'];
        for (let i = 0; i < Math.min(this.equations.length, 3); i++) {
            const marble = new Marble(startX, startY - (i * 0.5), {
                vx: 0.5,
                vy: 0,
                color: colors[i % colors.length]
            });
            // Pass stars reference to marble for path selection
            marble.stars = this.stars;
            this.marbles.push(marble);
        }

        this.gameRunning = true;
        this.ui.showFeedback(`Marbles launched from (${startX}, ${startY})! 🚀`, 'info');
    }

    reset() {
        this.gameRunning = false;
        this.marbles = [];
        this.stars.forEach(star => star.collected = false);
        this.starsCollected = 0;
        this.ui.updateStats(this.starsCollected, this.stars.length, this.level);
        this.ui.showFeedback('Game reset. Ready to launch!', 'info');
    }

    generateLevel() {
        this.stars = [];
        this.starsCollected = 0;

        // Generate completely random stars
        const baseStarCount = Math.min(3 + this.level, 8); // 4-8 stars based on level
        const randomVariation = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
        const starCount = Math.max(2, baseStarCount + randomVariation);

        // Generate stars with various distribution patterns
        const patterns = ['scattered', 'clustered', 'linear', 'mixed'];
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];

        this.generateStarPattern(pattern, starCount);

        this.ui.updateStats(this.starsCollected, this.stars.length, this.level);
    }

    generateStarPattern(pattern, starCount) {
        switch (pattern) {
            case 'scattered':
                this.generateScatteredStars(starCount);
                break;
            case 'clustered':
                this.generateClusteredStars(starCount);
                break;
            case 'linear':
                this.generateLinearStars(starCount);
                break;
            case 'mixed':
                this.generateMixedStars(starCount);
                break;
        }
    }

    generateScatteredStars(count) {
        for (let i = 0; i < count; i++) {
            let x, y;
            let attempts = 0;

            // Ensure stars are within visible bounds with some margin
            do {
                x = (Math.random() - 0.5) * 16; // -8 to 8
                y = (Math.random() - 0.3) * 14; // -4 to 10 (favor upper area)
                attempts++;
            } while ((x < this.xMin + 0.5 || x > this.xMax - 0.5 ||
                y < this.yMin + 0.5 || y > this.yMax - 0.5) && attempts < 50);

            // Fallback to safe position if we can't find a good spot
            if (attempts >= 50) {
                x = this.xMin + 1 + Math.random() * (this.xMax - this.xMin - 2);
                y = this.yMin + 1 + Math.random() * (this.yMax - this.yMin - 2);
            }

            this.stars.push({
                x: x,
                y: y,
                radius: 0.25 + Math.random() * 0.15, // Varying sizes
                collected: false
            });
        }
    }

    generateClusteredStars(count) {
        const clusterCount = Math.ceil(count / 3);
        let starsPlaced = 0;

        for (let cluster = 0; cluster < clusterCount && starsPlaced < count; cluster++) {
            // Ensure cluster centers are within bounds
            const centerX = this.xMin + 2 + Math.random() * (this.xMax - this.xMin - 4);
            const centerY = this.yMin + 2 + Math.random() * (this.yMax - this.yMin - 4);
            const clusterRadius = 1.5 + Math.random() * 2; // 1.5 to 3.5
            const starsInCluster = Math.min(Math.ceil(count / clusterCount), count - starsPlaced);

            for (let i = 0; i < starsInCluster; i++) {
                const angle = Math.random() * 2 * Math.PI;
                const distance = Math.sqrt(Math.random()) * clusterRadius;
                const x = centerX + distance * Math.cos(angle);
                const y = centerY + distance * Math.sin(angle);

                // Only add star if it's within bounds
                if (x >= this.xMin + 0.5 && x <= this.xMax - 0.5 &&
                    y >= this.yMin + 0.5 && y <= this.yMax - 0.5) {
                    this.stars.push({
                        x: x,
                        y: y,
                        radius: 0.25 + Math.random() * 0.15,
                        collected: false
                    });
                    starsPlaced++;
                }
            }
        }
    }

    generateLinearStars(count) {
        // Ensure starting point is within bounds
        const startX = this.xMin + 1 + Math.random() * (this.xMax - this.xMin - 2);
        const startY = this.yMin + 1 + Math.random() * (this.yMax - this.yMin - 2);
        const angle = Math.random() * Math.PI - Math.PI / 2; // -90 to 90 degrees
        const spacing = 1.5 + Math.random() * 1.5; // 1.5 to 3

        for (let i = 0; i < count; i++) {
            const distance = i * spacing;
            const x = startX + distance * Math.cos(angle);
            const y = startY + distance * Math.sin(angle);

            // Keep within bounds with margin
            if (x >= this.xMin + 0.5 && x <= this.xMax - 0.5 &&
                y >= this.yMin + 0.5 && y <= this.yMax - 0.5) {
                this.stars.push({
                    x: x,
                    y: y,
                    radius: 0.25 + Math.random() * 0.15,
                    collected: false
                });
            }
        }
    }

    generateMixedStars(count) {
        const scatteredCount = Math.floor(count * 0.6);
        const clusteredCount = count - scatteredCount;

        this.generateScatteredStars(scatteredCount);
        this.generateClusteredStars(clusteredCount);
    }

    generateRandomPositionInDisc(centerX, centerY, radius) {
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.sqrt(Math.random()) * radius;

        return {
            x: centerX + distance * Math.cos(angle),
            y: centerY + distance * Math.sin(angle)
        };
    }

    generateNewLevel() {
        this.level++;
        this.generateLevel();
        this.reset();
        this.equations = [];
        this.equationParser.resetColorIndex();
        this.ui.updateEquationsList(this.equations);
        this.ui.showFeedback(`Level ${this.level} - New challenge! 🎯`, 'info');
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