class EquationParser {
    constructor() {
        this.parser = math.parser();
        this.colors = ['#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];
        this.colorIndex = 0;
    }
    
    parseEquation(equationString) {
        try {
            // Clean up the equation string
            let cleanEquation = equationString.trim();
            
            // Handle piecewise functions
            if (cleanEquation.includes('{')) {
                return this.parsePiecewise(cleanEquation);
            }
            
            // Detect equation type
            const equationType = this.detectEquationType(cleanEquation);
            
            switch (equationType) {
                case 'explicit_y':
                    return this.parseExplicitY(cleanEquation);
                case 'explicit_x':
                    return this.parseExplicitX(cleanEquation);
                case 'implicit':
                    return this.parseImplicit(cleanEquation);
                case 'parametric':
                    return this.parseParametric(cleanEquation);
                default:
                    throw new Error('Unsupported equation type');
            }
        } catch (error) {
            throw new Error(`Invalid equation: ${error.message}`);
        }
    }
    
    detectEquationType(equation) {
        // Remove spaces for easier parsing
        const clean = equation.replace(/\s/g, '');
        
        // Check for parametric equations (contains 't' parameter)
        if (clean.includes('t') && (clean.includes('x(t)') || clean.includes('y(t)'))) {
            return 'parametric';
        }
        
        // Check for explicit y = f(x)
        if (clean.toLowerCase().startsWith('y=')) {
            return 'explicit_y';
        }
        
        // Check for explicit x = f(y)
        if (clean.toLowerCase().startsWith('x=')) {
            return 'explicit_x';
        }
        
        // Check for implicit equations (contains both x and y, with = sign)
        if (clean.includes('=') && clean.includes('x') && clean.includes('y')) {
            return 'implicit';
        }
        
        // Default to explicit y if only contains x
        if (clean.includes('x') && !clean.includes('y')) {
            return 'explicit_y';
        }
        
        throw new Error('Cannot determine equation type');
    }
    
    parseExplicitY(equationString) {
        let cleanEquation = equationString.trim();
        
        // Remove 'y =' if present
        if (cleanEquation.toLowerCase().startsWith('y=') || cleanEquation.toLowerCase().startsWith('y =')) {
            cleanEquation = cleanEquation.substring(cleanEquation.indexOf('=') + 1).trim();
        }
        
        cleanEquation = this.preprocessEquation(cleanEquation);
        
        const expr = math.parse(cleanEquation);
        const compiled = expr.compile();
        
        // Test evaluation
        const testResult = compiled.evaluate({ x: 0 });
        if (isNaN(testResult) && !isFinite(testResult)) {
            throw new Error('Invalid equation result');
        }
        
        return {
            original: equationString,
            expression: cleanEquation,
            compiled: compiled,
            color: this.getNextColor(),
            type: 'explicit_y',
            evaluate: function(x) {
                try {
                    return this.compiled.evaluate({ x: x });
                } catch (error) {
                    return NaN;
                }
            },
            getPoints: function(xMin, xMax, step = 0.1) {
                const points = [];
                for (let x = xMin; x <= xMax; x += step) {
                    const y = this.evaluate(x);
                    if (!isNaN(y) && isFinite(y)) {
                        points.push({ x, y });
                    }
                }
                return points;
            }
        };
    }
    
    parseExplicitX(equationString) {
        let cleanEquation = equationString.trim();
        
        // Remove 'x =' if present
        if (cleanEquation.toLowerCase().startsWith('x=') || cleanEquation.toLowerCase().startsWith('x =')) {
            cleanEquation = cleanEquation.substring(cleanEquation.indexOf('=') + 1).trim();
        }
        
        cleanEquation = this.preprocessEquation(cleanEquation.replace(/x/g, 'y')); // Replace x with y for evaluation
        
        const expr = math.parse(cleanEquation);
        const compiled = expr.compile();
        
        return {
            original: equationString,
            expression: cleanEquation,
            compiled: compiled,
            color: this.getNextColor(),
            type: 'explicit_x',
            evaluate: function(y) {
                try {
                    return this.compiled.evaluate({ y: y });
                } catch (error) {
                    return NaN;
                }
            },
            getPoints: function(yMin, yMax, step = 0.1) {
                const points = [];
                for (let y = yMin; y <= yMax; y += step) {
                    const x = this.evaluate(y);
                    if (!isNaN(x) && isFinite(x)) {
                        points.push({ x, y });
                    }
                }
                return points;
            }
        };
    }
    
    parseImplicit(equationString) {
        let cleanEquation = equationString.trim();
        
        // Split by = sign
        const parts = cleanEquation.split('=');
        if (parts.length !== 2) {
            throw new Error('Implicit equation must have exactly one = sign');
        }
        
        let leftSide = this.preprocessEquation(parts[0].trim());
        let rightSide = this.preprocessEquation(parts[1].trim());
        
        // Create function f(x,y) = leftSide - rightSide
        const expression = `(${leftSide}) - (${rightSide})`;
        const expr = math.parse(expression);
        const compiled = expr.compile();
        
        return {
            original: equationString,
            expression: expression,
            compiled: compiled,
            color: this.getNextColor(),
            type: 'implicit',
            evaluate: function(x, y) {
                try {
                    return this.compiled.evaluate({ x: x, y: y });
                } catch (error) {
                    return NaN;
                }
            },
            getPoints: function(xMin, xMax, yMin, yMax, resolution = 100) {
                const points = [];
                const xStep = (xMax - xMin) / resolution;
                const yStep = (yMax - yMin) / resolution;
                const tolerance = 0.1;
                
                // Use marching squares algorithm for implicit curves
                for (let i = 0; i < resolution; i++) {
                    for (let j = 0; j < resolution; j++) {
                        const x1 = xMin + i * xStep;
                        const x2 = xMin + (i + 1) * xStep;
                        const y1 = yMin + j * yStep;
                        const y2 = yMin + (j + 1) * yStep;
                        
                        // Check the four corners of the cell
                        const f11 = this.evaluate(x1, y1);
                        const f12 = this.evaluate(x1, y2);
                        const f21 = this.evaluate(x2, y1);
                        const f22 = this.evaluate(x2, y2);
                        
                        // If signs differ, there's likely a zero crossing
                        if (this.hasZeroCrossing(f11, f12, f21, f22, tolerance)) {
                            // Find approximate zero crossing using bisection
                            const point = this.findZeroCrossing(x1, x2, y1, y2, tolerance);
                            if (point) {
                                points.push(point);
                            }
                        }
                    }
                }
                
                return points;
            },
            hasZeroCrossing: function(f11, f12, f21, f22, tolerance) {
                const values = [f11, f12, f21, f22].filter(v => !isNaN(v) && isFinite(v));
                if (values.length < 2) return false;
                
                const minVal = Math.min(...values);
                const maxVal = Math.max(...values);
                
                return (minVal <= tolerance && maxVal >= -tolerance);
            },
            findZeroCrossing: function(x1, x2, y1, y2, tolerance) {
                // Simple grid search for zero crossing
                const steps = 5;
                const xStep = (x2 - x1) / steps;
                const yStep = (y2 - y1) / steps;
                
                for (let i = 0; i <= steps; i++) {
                    for (let j = 0; j <= steps; j++) {
                        const x = x1 + i * xStep;
                        const y = y1 + j * yStep;
                        const value = this.evaluate(x, y);
                        
                        if (Math.abs(value) <= tolerance) {
                            return { x, y };
                        }
                    }
                }
                
                return null;
            }
        };
    }
    
    parseParametric(equationString) {
        // For future implementation of parametric equations
        throw new Error('Parametric equations not yet supported');
    }
    
    parsePiecewise(equationString) {
        try {
            // Simple piecewise parsing for expressions like "x^2 {x > 0}"
            const parts = equationString.split('{');
            if (parts.length !== 2) {
                throw new Error('Invalid piecewise format');
            }
            
            let expression = parts[0].trim();
            if (expression.toLowerCase().startsWith('y=') || expression.toLowerCase().startsWith('y =')) {
                expression = expression.substring(expression.indexOf('=') + 1).trim();
            }
            
            let condition = parts[1].trim().replace('}', '');
            
            // Parse condition
            const conditionParts = this.parseCondition(condition);
            
            expression = this.preprocessEquation(expression);
            const expr = math.parse(expression);
            const compiled = expr.compile();
            
            return {
                original: equationString,
                expression: expression,
                compiled: compiled,
                condition: conditionParts,
                color: this.getNextColor(),
                type: 'piecewise',
                evaluate: function(x) {
                    if (this.checkCondition(x, this.condition)) {
                        try {
                            return this.compiled.evaluate({ x: x });
                        } catch (error) {
                            return NaN;
                        }
                    }
                    return NaN;
                },
                checkCondition: function(x, condition) {
                    switch (condition.operator) {
                        case '>': return x > condition.value;
                        case '<': return x < condition.value;
                        case '>=': return x >= condition.value;
                        case '<=': return x <= condition.value;
                        case '==': return Math.abs(x - condition.value) < 0.01;
                        default: return true;
                    }
                },
                getPoints: function(xMin, xMax, step = 0.1) {
                    const points = [];
                    for (let x = xMin; x <= xMax; x += step) {
                        if (this.checkCondition(x, this.condition)) {
                            const y = this.evaluate(x);
                            if (!isNaN(y) && isFinite(y)) {
                                points.push({ x, y });
                            }
                        }
                    }
                    return points;
                }
            };
        } catch (error) {
            throw new Error(`Invalid piecewise equation: ${error.message}`);
        }
    }
    
    parseCondition(conditionStr) {
        const operators = ['>=', '<=', '>', '<', '=='];
        
        for (let op of operators) {
            if (conditionStr.includes(op)) {
                const parts = conditionStr.split(op);
                if (parts.length === 2) {
                    const variable = parts[0].trim();
                    const value = parseFloat(parts[1].trim());
                    
                    if (variable === 'x' && !isNaN(value)) {
                        return { operator: op, value: value };
                    }
                }
            }
        }
        
        throw new Error('Invalid condition format');
    }
    
    preprocessEquation(equation) {
        // Replace mathematical notation
        equation = equation.replace(/\^/g, '^');
        equation = equation.replace(/π/g, 'pi');
        equation = equation.replace(/e(?![a-zA-Z])/g, 'e');
        
        // Handle absolute value notation
        equation = equation.replace(/\|([^|]+)\|/g, 'abs($1)');
        
        // Handle implicit multiplication
        equation = equation.replace(/(\d+)([a-zA-Z])/g, '$1*$2');
        equation = equation.replace(/([a-zA-Z])(\d+)/g, '$1*$2');
        equation = equation.replace(/(\))([a-zA-Z])/g, '$1*$2');
        equation = equation.replace(/([a-zA-Z])(\()/g, '$1*$2');
        
        // Handle trigonometric functions
        equation = equation.replace(/sin/g, 'sin');
        equation = equation.replace(/cos/g, 'cos');
        equation = equation.replace(/tan/g, 'tan');
        
        return equation;
    }
    
    getNextColor() {
        const color = this.colors[this.colorIndex];
        this.colorIndex = (this.colorIndex + 1) % this.colors.length;
        return color;
    }
    
    resetColorIndex() {
        this.colorIndex = 0;
    }
}

class EquationRenderer {
    constructor(p5Instance) {
        this.p5 = p5Instance;
    }
    
    drawEquation(equation, xMin, xMax, yMin, yMax, width, height) {
        this.p5.stroke(equation.color);
        this.p5.strokeWeight(3);
        this.p5.noFill();
        
        switch (equation.type) {
            case 'explicit_y':
            case 'piecewise':
                this.drawExplicitY(equation, xMin, xMax, width, height);
                break;
            case 'explicit_x':
                this.drawExplicitX(equation, yMin, yMax, width, height);
                break;
            case 'implicit':
                this.drawImplicit(equation, xMin, xMax, yMin, yMax, width, height);
                break;
        }
    }
    
    drawExplicitY(equation, xMin, xMax, width, height) {
        const points = [];
        const step = Math.min(0.02, (xMax - xMin) / 1000); // Smaller step for smoother curves
        
        // Collect all valid points first
        for (let x = xMin; x <= xMax + step; x += step) {
            const y = equation.evaluate(x);
            
            if (!isNaN(y) && isFinite(y)) {
                const screenX = this.mapToScreen(x, xMin, xMax, 0, width);
                const screenY = this.mapToScreen(-y, -10, 10, 0, height);
                points.push({ x: screenX, y: screenY, valid: true });
            } else {
                points.push({ valid: false });
            }
        }
        
        // Draw continuous segments
        this.drawContinuousSegments(points);
    }
    
    drawContinuousSegments(points) {
        let currentSegment = [];
        
        for (let i = 0; i < points.length; i++) {
            if (points[i].valid) {
                currentSegment.push(points[i]);
            } else {
                // End current segment and start new one
                if (currentSegment.length > 1) {
                    this.drawSmoothCurve(currentSegment);
                }
                currentSegment = [];
            }
        }
        
        // Draw final segment
        if (currentSegment.length > 1) {
            this.drawSmoothCurve(currentSegment);
        }
    }
    
    drawSmoothCurve(points) {
        if (points.length < 2) return;
        
        this.p5.beginShape();
        this.p5.noFill();
        
        // Use curveVertex for smoother curves
        if (points.length > 3) {
            // First point
            this.p5.curveVertex(points[0].x, points[0].y);
            
            // All points
            for (let i = 0; i < points.length; i++) {
                this.p5.curveVertex(points[i].x, points[i].y);
            }
            
            // Last point
            this.p5.curveVertex(points[points.length - 1].x, points[points.length - 1].y);
        } else {
            // For short segments, use regular vertices
            for (let i = 0; i < points.length; i++) {
                this.p5.vertex(points[i].x, points[i].y);
            }
        }
        
        this.p5.endShape();
    }
    
    drawExplicitX(equation, yMin, yMax, width, height) {
        const points = [];
        const step = Math.min(0.02, (yMax - yMin) / 1000); // Smaller step for smoother curves
        
        // Collect all valid points first
        for (let y = yMin; y <= yMax + step; y += step) {
            const x = equation.evaluate(y);
            
            if (!isNaN(x) && isFinite(x)) {
                const screenX = this.mapToScreen(x, -10, 10, 0, width);
                const screenY = this.mapToScreen(-y, -10, 10, 0, height);
                points.push({ x: screenX, y: screenY, valid: true });
            } else {
                points.push({ valid: false });
            }
        }
        
        // Draw continuous segments
        this.drawContinuousSegments(points);
    }
    
    drawImplicit(equation, xMin, xMax, yMin, yMax, width, height) {
        const points = equation.getPoints(xMin, xMax, yMin, yMax, 80);
        
        if (points.length === 0) return;
        
        // Group nearby points into continuous curves
        const curves = this.groupPointsIntoCurves(points, 0.5);
        
        curves.forEach(curve => {
            if (curve.length > 1) {
                this.p5.beginShape();
                curve.forEach(point => {
                    const screenX = this.mapToScreen(point.x, xMin, xMax, 0, width);
                    const screenY = this.mapToScreen(-point.y, -yMax, -yMin, 0, height);
                    this.p5.vertex(screenX, screenY);
                });
                this.p5.endShape();
            } else if (curve.length === 1) {
                // Draw single points
                const point = curve[0];
                const screenX = this.mapToScreen(point.x, xMin, xMax, 0, width);
                const screenY = this.mapToScreen(-point.y, -yMax, -yMin, 0, height);
                this.p5.point(screenX, screenY);
            }
        });
    }
    
    groupPointsIntoCurves(points, maxDistance) {
        if (points.length === 0) return [];
        
        const curves = [];
        const used = new Set();
        
        for (let i = 0; i < points.length; i++) {
            if (used.has(i)) continue;
            
            const curve = [points[i]];
            used.add(i);
            
            // Find nearby points to form a curve
            let added = true;
            while (added) {
                added = false;
                const lastPoint = curve[curve.length - 1];
                
                for (let j = 0; j < points.length; j++) {
                    if (used.has(j)) continue;
                    
                    const distance = Math.sqrt(
                        (points[j].x - lastPoint.x) ** 2 + 
                        (points[j].y - lastPoint.y) ** 2
                    );
                    
                    if (distance <= maxDistance) {
                        curve.push(points[j]);
                        used.add(j);
                        added = true;
                        break;
                    }
                }
            }
            
            curves.push(curve);
        }
        
        return curves;
    }
    
    mapToScreen(value, min, max, screenMin, screenMax) {
        return screenMin + (value - min) * (screenMax - screenMin) / (max - min);
    }
}
