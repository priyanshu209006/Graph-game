class EquationParser {
    constructor() {
        this.parser = math.parser();
        this.colors = ['#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];
        this.colorIndex = 0;

        // List of math functions to preserve during preprocessing
        this.mathFunctions = [
            'sin', 'cos', 'tan', 'sec', 'csc', 'cot',
            'sinh', 'cosh', 'tanh', 'sech', 'csch', 'coth',
            'asin', 'acos', 'atan', 'asec', 'acsc', 'acot',
            'asinh', 'acosh', 'atanh',
            'arcsin', 'arccos', 'arctan', 'arcsec', 'arccsc', 'arccot',
            'sqrt', 'cbrt', 'abs', 'log', 'ln', 'exp',
            'floor', 'ceil', 'round', 'sign', 'mod'
        ];
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
                case 'constant_x':
                    return this.parseConstantX(cleanEquation);
                case 'constant_y':
                    return this.parseConstantY(cleanEquation);
                case 'implicit':
                    return this.parseImplicit(cleanEquation);
                case 'parametric':
                    return this.parseParametric(cleanEquation);
                case 'polar':
                    return this.parsePolar(cleanEquation);
                case 'inequality':
                    return this.parseInequality(cleanEquation);
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
        const lower = clean.toLowerCase();

        // Check for polar equations (r = ..., uses θ or theta)
        if (lower.startsWith('r=') && (clean.includes('θ') || lower.includes('theta'))) {
            return 'polar';
        }

        // Check for parametric equations (x = f(t), y = g(t) or x(t) = ..., y(t) = ...)
        if ((clean.includes('x(t)') || clean.includes('y(t)')) ||
            (clean.includes(',') && clean.includes('t') && !clean.includes('theta'))) {
            return 'parametric';
        }

        // Check for inequality equations
        if (clean.includes('>=') || clean.includes('<=') ||
            clean.includes('≥') || clean.includes('≤') ||
            (clean.includes('>') && !clean.includes('=')) ||
            (clean.includes('<') && !clean.includes('='))) {
            return 'inequality';
        }

        // Check for constant x = number (vertical line)
        if (lower.startsWith('x=')) {
            const rightSide = clean.substring(2);
            // If right side is just a number, it's a constant
            if (/^-?\d+\.?\d*$/.test(rightSide)) {
                return 'constant_x';
            }
            // If right side contains only y (and numbers/operators), it's explicit_x
            if (!clean.includes('y') || rightSide.includes('y')) {
                return 'explicit_x';
            }
        }

        // Check for constant y = number (horizontal line)
        if (lower.startsWith('y=')) {
            const rightSide = clean.substring(2);
            // If right side is just a number, it's a constant
            if (/^-?\d+\.?\d*$/.test(rightSide)) {
                return 'constant_y';
            }
            return 'explicit_y';
        }

        // Check for explicit y = f(x)
        if (lower.startsWith('y=')) {
            return 'explicit_y';
        }

        // Check for explicit x = f(y)
        if (lower.startsWith('x=')) {
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
        try {
            const testResult = compiled.evaluate({ x: 0 });
        } catch (e) {
            // Some functions may not work at x=0, that's ok
        }

        return {
            original: equationString,
            expression: cleanEquation,
            compiled: compiled,
            color: this.getNextColor(),
            type: 'explicit_y',
            evaluate: function (x) {
                try {
                    return this.compiled.evaluate({ x: x });
                } catch (error) {
                    return NaN;
                }
            },
            getPoints: function (xMin, xMax, step = 0.1) {
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
            evaluate: function (y) {
                try {
                    return this.compiled.evaluate({ y: y });
                } catch (error) {
                    return NaN;
                }
            },
            getPoints: function (yMin, yMax, step = 0.1) {
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

    parseConstantX(equationString) {
        let cleanEquation = equationString.trim();

        // Extract the constant value
        const value = parseFloat(cleanEquation.substring(cleanEquation.indexOf('=') + 1).trim());

        if (isNaN(value)) {
            throw new Error('Invalid constant value');
        }

        return {
            original: equationString,
            expression: `x = ${value}`,
            value: value,
            color: this.getNextColor(),
            type: 'constant_x',
            evaluate: function (y) {
                return this.value;
            },
            getPoints: function (yMin, yMax, step = 0.1) {
                const points = [];
                for (let y = yMin; y <= yMax; y += step) {
                    points.push({ x: this.value, y });
                }
                return points;
            }
        };
    }

    parseConstantY(equationString) {
        let cleanEquation = equationString.trim();

        // Extract the constant value
        const value = parseFloat(cleanEquation.substring(cleanEquation.indexOf('=') + 1).trim());

        if (isNaN(value)) {
            throw new Error('Invalid constant value');
        }

        return {
            original: equationString,
            expression: `y = ${value}`,
            value: value,
            color: this.getNextColor(),
            type: 'constant_y',
            evaluate: function (x) {
                return this.value;
            },
            getPoints: function (xMin, xMax, step = 0.1) {
                const points = [];
                for (let x = xMin; x <= xMax; x += step) {
                    points.push({ x, y: this.value });
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
            evaluate: function (x, y) {
                try {
                    return this.compiled.evaluate({ x: x, y: y });
                } catch (error) {
                    return NaN;
                }
            },
            getPoints: function (xMin, xMax, yMin, yMax, resolution = 100) {
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
            hasZeroCrossing: function (f11, f12, f21, f22, tolerance) {
                const values = [f11, f12, f21, f22].filter(v => !isNaN(v) && isFinite(v));
                if (values.length < 2) return false;

                const minVal = Math.min(...values);
                const maxVal = Math.max(...values);

                return (minVal <= tolerance && maxVal >= -tolerance);
            },
            findZeroCrossing: function (x1, x2, y1, y2, tolerance) {
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

    parsePolar(equationString) {
        let cleanEquation = equationString.trim();

        // Remove 'r =' if present
        if (cleanEquation.toLowerCase().startsWith('r=') || cleanEquation.toLowerCase().startsWith('r =')) {
            cleanEquation = cleanEquation.substring(cleanEquation.indexOf('=') + 1).trim();
        }

        // Replace theta symbols
        cleanEquation = cleanEquation.replace(/θ/g, 'theta');
        cleanEquation = this.preprocessEquation(cleanEquation);

        const expr = math.parse(cleanEquation);
        const compiled = expr.compile();

        return {
            original: equationString,
            expression: cleanEquation,
            compiled: compiled,
            color: this.getNextColor(),
            type: 'polar',
            evaluate: function (theta) {
                try {
                    return this.compiled.evaluate({ theta: theta });
                } catch (error) {
                    return NaN;
                }
            },
            getPoints: function (thetaMin = 0, thetaMax = 4 * Math.PI, step = 0.02) {
                const points = [];
                for (let theta = thetaMin; theta <= thetaMax; theta += step) {
                    const r = this.evaluate(theta);
                    if (!isNaN(r) && isFinite(r)) {
                        // Convert polar to Cartesian
                        const x = r * Math.cos(theta);
                        const y = r * Math.sin(theta);
                        if (isFinite(x) && isFinite(y)) {
                            points.push({ x, y, r, theta });
                        }
                    }
                }
                return points;
            }
        };
    }

    parseParametric(equationString) {
        let cleanEquation = equationString.trim();

        // Split by comma or semicolon
        let parts = cleanEquation.split(/[,;]/);

        if (parts.length !== 2) {
            throw new Error('Parametric equation must have two parts: x = f(t), y = g(t)');
        }

        let xPart = parts[0].trim();
        let yPart = parts[1].trim();

        // Remove 'x =' and 'y =' prefixes
        if (xPart.toLowerCase().startsWith('x=') || xPart.toLowerCase().startsWith('x =') ||
            xPart.toLowerCase().startsWith('x(t)=') || xPart.toLowerCase().startsWith('x(t) =')) {
            xPart = xPart.substring(xPart.indexOf('=') + 1).trim();
        }
        if (yPart.toLowerCase().startsWith('y=') || yPart.toLowerCase().startsWith('y =') ||
            yPart.toLowerCase().startsWith('y(t)=') || yPart.toLowerCase().startsWith('y(t) =')) {
            yPart = yPart.substring(yPart.indexOf('=') + 1).trim();
        }

        xPart = this.preprocessEquation(xPart);
        yPart = this.preprocessEquation(yPart);

        const xExpr = math.parse(xPart);
        const yExpr = math.parse(yPart);
        const xCompiled = xExpr.compile();
        const yCompiled = yExpr.compile();

        return {
            original: equationString,
            xExpression: xPart,
            yExpression: yPart,
            xCompiled: xCompiled,
            yCompiled: yCompiled,
            color: this.getNextColor(),
            type: 'parametric',
            evaluateX: function (t) {
                try {
                    return this.xCompiled.evaluate({ t: t });
                } catch (error) {
                    return NaN;
                }
            },
            evaluateY: function (t) {
                try {
                    return this.yCompiled.evaluate({ t: t });
                } catch (error) {
                    return NaN;
                }
            },
            getPoints: function (tMin = 0, tMax = 2 * Math.PI, step = 0.02) {
                const points = [];
                for (let t = tMin; t <= tMax; t += step) {
                    const x = this.evaluateX(t);
                    const y = this.evaluateY(t);
                    if (!isNaN(x) && !isNaN(y) && isFinite(x) && isFinite(y)) {
                        points.push({ x, y, t });
                    }
                }
                return points;
            }
        };
    }

    parseInequality(equationString) {
        let cleanEquation = equationString.trim();

        // Determine inequality type
        let operator = '';
        let parts = [];

        if (cleanEquation.includes('>=') || cleanEquation.includes('≥')) {
            operator = '>=';
            parts = cleanEquation.split(/>=|≥/);
        } else if (cleanEquation.includes('<=') || cleanEquation.includes('≤')) {
            operator = '<=';
            parts = cleanEquation.split(/<=|≤/);
        } else if (cleanEquation.includes('>')) {
            operator = '>';
            parts = cleanEquation.split('>');
        } else if (cleanEquation.includes('<')) {
            operator = '<';
            parts = cleanEquation.split('<');
        }

        if (parts.length !== 2) {
            throw new Error('Invalid inequality format');
        }

        let leftSide = this.preprocessEquation(parts[0].trim());
        let rightSide = this.preprocessEquation(parts[1].trim());

        // Create comparison function
        const expression = `(${leftSide}) - (${rightSide})`;
        const expr = math.parse(expression);
        const compiled = expr.compile();

        return {
            original: equationString,
            expression: expression,
            operator: operator,
            compiled: compiled,
            color: this.getNextColor() + '40', // Semi-transparent for regions
            type: 'inequality',
            evaluate: function (x, y) {
                try {
                    const diff = this.compiled.evaluate({ x: x, y: y });
                    switch (this.operator) {
                        case '>=': return diff >= 0;
                        case '<=': return diff <= 0;
                        case '>': return diff > 0;
                        case '<': return diff < 0;
                        default: return false;
                    }
                } catch (error) {
                    return false;
                }
            },
            getRegion: function (xMin, xMax, yMin, yMax, resolution = 50) {
                const region = [];
                const xStep = (xMax - xMin) / resolution;
                const yStep = (yMax - yMin) / resolution;

                for (let i = 0; i <= resolution; i++) {
                    for (let j = 0; j <= resolution; j++) {
                        const x = xMin + i * xStep;
                        const y = yMin + j * yStep;
                        if (this.evaluate(x, y)) {
                            region.push({ x, y });
                        }
                    }
                }

                return region;
            }
        };
    }

    parsePiecewise(equationString) {
        try {
            // Parse expressions like "x^2 {x > 0}" or "x^2 {0 < x < 5}"
            const parts = equationString.split('{');
            if (parts.length !== 2) {
                throw new Error('Invalid piecewise format');
            }

            let expression = parts[0].trim();
            if (expression.toLowerCase().startsWith('y=') || expression.toLowerCase().startsWith('y =')) {
                expression = expression.substring(expression.indexOf('=') + 1).trim();
            }

            let condition = parts[1].trim().replace('}', '');

            // Parse condition (supports single and double conditions like "0 < x < 5")
            const conditions = this.parseConditions(condition);

            expression = this.preprocessEquation(expression);
            const expr = math.parse(expression);
            const compiled = expr.compile();

            return {
                original: equationString,
                expression: expression,
                compiled: compiled,
                conditions: conditions,
                color: this.getNextColor(),
                type: 'piecewise',
                evaluate: function (x) {
                    if (this.checkConditions(x, this.conditions)) {
                        try {
                            return this.compiled.evaluate({ x: x });
                        } catch (error) {
                            return NaN;
                        }
                    }
                    return NaN;
                },
                checkConditions: function (x, conditions) {
                    return conditions.every(cond => {
                        switch (cond.operator) {
                            case '>': return x > cond.value;
                            case '<': return x < cond.value;
                            case '>=': return x >= cond.value;
                            case '<=': return x <= cond.value;
                            case '==': return Math.abs(x - cond.value) < 0.01;
                            case '!=': return Math.abs(x - cond.value) >= 0.01;
                            default: return true;
                        }
                    });
                },
                getPoints: function (xMin, xMax, step = 0.1) {
                    const points = [];
                    for (let x = xMin; x <= xMax; x += step) {
                        if (this.checkConditions(x, this.conditions)) {
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

    parseConditions(conditionStr) {
        const conditions = [];

        // Check for double inequality like "0 < x < 5" or "-2 <= x <= 2"
        const doubleMatch = conditionStr.match(/(-?\d+\.?\d*)\s*([<>]=?)\s*([xy])\s*([<>]=?)\s*(-?\d+\.?\d*)/);
        if (doubleMatch) {
            const leftValue = parseFloat(doubleMatch[1]);
            const leftOp = doubleMatch[2];
            const variable = doubleMatch[3];
            const rightOp = doubleMatch[4];
            const rightValue = parseFloat(doubleMatch[5]);

            // Convert to variable-centric conditions
            // "0 < x" means x > 0
            const invertedLeftOp = leftOp === '<' ? '>' : (leftOp === '<=' ? '>=' : (leftOp === '>' ? '<' : '<='));
            conditions.push({ operator: invertedLeftOp, value: leftValue });
            conditions.push({ operator: rightOp, value: rightValue });

            return conditions;
        }

        // Single condition
        const operators = ['>=', '<=', '!=', '>', '<', '=='];

        for (let op of operators) {
            if (conditionStr.includes(op)) {
                const parts = conditionStr.split(op);
                if (parts.length === 2) {
                    const left = parts[0].trim();
                    const right = parts[1].trim();

                    // Determine which side is the variable
                    if (left === 'x' || left === 'y') {
                        conditions.push({ operator: op, value: parseFloat(right) });
                    } else if (right === 'x' || right === 'y') {
                        // Need to invert the operator
                        const invertedOp = op === '<' ? '>' : (op === '<=' ? '>=' : (op === '>' ? '<' : (op === '>=' ? '<=' : op)));
                        conditions.push({ operator: invertedOp, value: parseFloat(left) });
                    }
                    return conditions;
                }
            }
        }

        throw new Error('Invalid condition format');
    }

    preprocessEquation(equation) {
        // Handle Unicode and special characters first
        equation = equation.replace(/π/g, 'pi');
        equation = equation.replace(/θ/g, 'theta');
        equation = equation.replace(/√/g, 'sqrt');
        equation = equation.replace(/∞/g, 'Infinity');

        // Handle absolute value notation
        equation = equation.replace(/\|([^|]+)\|/g, 'abs($1)');

        // Handle ln -> log conversion (math.js uses log for natural log)
        equation = equation.replace(/\bln\b/g, 'log');

        // Handle arc function names -> a-prefix
        equation = equation.replace(/\barcsin\b/gi, 'asin');
        equation = equation.replace(/\barccos\b/gi, 'acos');
        equation = equation.replace(/\barctan\b/gi, 'atan');
        equation = equation.replace(/\barcsec\b/gi, 'asec');
        equation = equation.replace(/\barccsc\b/gi, 'acsc');
        equation = equation.replace(/\barccot\b/gi, 'acot');

        // CRITICAL FIX: Handle function names followed directly by variable (sinx -> sin(x))
        // This must happen BEFORE implicit multiplication
        const funcPattern = /\b(sin|cos|tan|sec|csc|cot|sinh|cosh|tanh|sech|csch|coth|asin|acos|atan|asec|acsc|acot|asinh|acosh|atanh|sqrt|cbrt|abs|log|exp|floor|ceil|round|sign)([a-zA-Z])/gi;
        equation = equation.replace(funcPattern, '$1($2)');

        // Handle function names followed by number (sin2 -> sin(2))
        const funcNumPattern = /\b(sin|cos|tan|sec|csc|cot|sinh|cosh|tanh|sech|csch|coth|asin|acos|atan|asec|acsc|acot|asinh|acosh|atanh|sqrt|cbrt|abs|log|exp|floor|ceil|round|sign)(\d)/gi;
        equation = equation.replace(funcNumPattern, '$1($2)');

        // Handle e^x specially (only standalone e not part of other words)
        equation = equation.replace(/\be\^/g, 'exp(');
        // Need to find matching close for exp(
        // Simple approach: if we added exp(, we need a closing paren
        // This is tricky, let's use a simpler approach
        equation = equation.replace(/exp\(([^()]+)\)/g, 'exp($1)');
        // Handle remaining exp( without closing - add closing at end of number/variable sequence
        equation = equation.replace(/exp\(([a-zA-Z0-9\.\+\-\*\/\^]+)(?!\))/g, 'exp($1)');

        // Handle implicit multiplication between number and variable: 2x -> 2*x
        // But NOT inside function names
        equation = equation.replace(/(\d)([a-zA-Z])/g, (match, num, letter, offset, str) => {
            // Check if this is part of a function name by looking ahead
            const remaining = str.substring(offset + match.length);
            const funcNames = ['sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'sinh', 'cosh', 'tanh',
                'asin', 'acos', 'atan', 'sqrt', 'cbrt', 'abs', 'log', 'exp',
                'floor', 'ceil', 'round', 'sign', 'pi', 'theta'];

            // Check if letter + remaining forms a function
            for (const fn of funcNames) {
                if ((letter + remaining).toLowerCase().startsWith(fn.substring(1))) {
                    return num + '*' + letter;
                }
            }
            return num + '*' + letter;
        });

        // Handle implicit multiplication: )( -> )*(
        equation = equation.replace(/\)\(/g, ')*(');

        // Handle implicit multiplication: )x -> )*x
        equation = equation.replace(/\)([a-zA-Z])/g, ')*$1');

        // Handle implicit multiplication: x( -> x*( but NOT for functions
        // This needs care to not break function calls
        equation = equation.replace(/([a-zA-Z])(\()/g, (match, letter, paren, offset, str) => {
            // Look backwards to see if this is a function name
            const before = str.substring(0, offset + 1);
            const funcNames = ['sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'sinh', 'cosh', 'tanh',
                'sech', 'csch', 'coth', 'asin', 'acos', 'atan', 'asec', 'acsc', 'acot',
                'asinh', 'acosh', 'atanh', 'sqrt', 'cbrt', 'abs', 'log', 'exp',
                'floor', 'ceil', 'round', 'sign', 'mod'];

            for (const fn of funcNames) {
                if (before.toLowerCase().endsWith(fn)) {
                    return match; // Keep as is - it's a function call
                }
            }
            return letter + '*' + paren;
        });

        // Handle 2(x) -> 2*(x)
        equation = equation.replace(/(\d)(\()/g, '$1*$2');

        // Handle )(5) -> )*(5)
        equation = equation.replace(/\)(\d)/g, ')*$1');

        // Handle x2 -> x*2 (but be careful with function names)
        equation = equation.replace(/([a-zA-Z])(\d)/g, '$1*$2');

        // Clean up any double multiplication signs
        equation = equation.replace(/\*\*/g, '^');
        equation = equation.replace(/\*\*/g, '*');

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
            case 'constant_y':
                this.drawExplicitY(equation, xMin, xMax, yMin, yMax, width, height);
                break;
            case 'explicit_x':
            case 'constant_x':
                this.drawExplicitX(equation, yMin, yMax, xMin, xMax, width, height);
                break;
            case 'implicit':
                this.drawImplicit(equation, xMin, xMax, yMin, yMax, width, height);
                break;
            case 'polar':
                this.drawPolar(equation, xMin, xMax, yMin, yMax, width, height);
                break;
            case 'parametric':
                this.drawParametric(equation, xMin, xMax, yMin, yMax, width, height);
                break;
            case 'inequality':
                this.drawInequality(equation, xMin, xMax, yMin, yMax, width, height);
                break;
        }
    }

    drawExplicitY(equation, xMin, xMax, yMin, yMax, width, height) {
        const points = [];
        const step = Math.min(0.02, (xMax - xMin) / 1000);

        for (let x = xMin; x <= xMax + step; x += step) {
            const y = equation.evaluate(x);

            // Clip y values to be within bounds - prevent drawing outside graph
            if (!isNaN(y) && isFinite(y)) {
                // Only include points that are within or close to the visible range
                if (y >= yMin - 1 && y <= yMax + 1) {
                    const screenX = this.mapToScreen(x, xMin, xMax, 0, width);
                    const screenY = this.mapToScreen(-y, -yMax, -yMin, 0, height);
                    // Clamp screen coordinates to prevent overflow
                    const clampedY = Math.max(-10, Math.min(height + 10, screenY));
                    points.push({ x: screenX, y: clampedY, valid: true });
                } else {
                    // Point is outside visible range - break the segment
                    points.push({ valid: false });
                }
            } else {
                points.push({ valid: false });
            }
        }

        this.drawContinuousSegments(points);
    }

    drawContinuousSegments(points) {
        let currentSegment = [];

        for (let i = 0; i < points.length; i++) {
            if (points[i].valid) {
                // Check for large jumps (discontinuities like tan(x))
                if (currentSegment.length > 0) {
                    const last = currentSegment[currentSegment.length - 1];
                    const dist = Math.abs(points[i].y - last.y);
                    if (dist > 100) { // Discontinuity detected
                        if (currentSegment.length > 1) {
                            this.drawSmoothCurve(currentSegment);
                        }
                        currentSegment = [];
                    }
                }
                currentSegment.push(points[i]);
            } else {
                if (currentSegment.length > 1) {
                    this.drawSmoothCurve(currentSegment);
                }
                currentSegment = [];
            }
        }

        if (currentSegment.length > 1) {
            this.drawSmoothCurve(currentSegment);
        }
    }

    drawSmoothCurve(points) {
        if (points.length < 2) return;

        this.p5.beginShape();
        this.p5.noFill();

        if (points.length > 3) {
            this.p5.curveVertex(points[0].x, points[0].y);

            for (let i = 0; i < points.length; i++) {
                this.p5.curveVertex(points[i].x, points[i].y);
            }

            this.p5.curveVertex(points[points.length - 1].x, points[points.length - 1].y);
        } else {
            for (let i = 0; i < points.length; i++) {
                this.p5.vertex(points[i].x, points[i].y);
            }
        }

        this.p5.endShape();
    }

    drawExplicitX(equation, yMin, yMax, xMin, xMax, width, height) {
        const points = [];
        const step = Math.min(0.02, (yMax - yMin) / 1000);

        for (let y = yMin; y <= yMax + step; y += step) {
            const x = equation.evaluate(y);

            if (!isNaN(x) && isFinite(x)) {
                const screenX = this.mapToScreen(x, xMin, xMax, 0, width);
                const screenY = this.mapToScreen(-y, -yMax, -yMin, 0, height);
                points.push({ x: screenX, y: screenY, valid: true });
            } else {
                points.push({ valid: false });
            }
        }

        this.drawContinuousSegments(points);
    }

    drawImplicit(equation, xMin, xMax, yMin, yMax, width, height) {
        const points = equation.getPoints(xMin, xMax, yMin, yMax, 80);

        if (points.length === 0) return;

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
                const point = curve[0];
                const screenX = this.mapToScreen(point.x, xMin, xMax, 0, width);
                const screenY = this.mapToScreen(-point.y, -yMax, -yMin, 0, height);
                this.p5.point(screenX, screenY);
            }
        });
    }

    drawPolar(equation, xMin, xMax, yMin, yMax, width, height) {
        const points = equation.getPoints(0, 4 * Math.PI, 0.02);

        if (points.length < 2) return;

        const screenPoints = points.map(point => ({
            x: this.mapToScreen(point.x, xMin, xMax, 0, width),
            y: this.mapToScreen(-point.y, -yMax, -yMin, 0, height),
            valid: true
        }));

        this.drawContinuousSegments(screenPoints);
    }

    drawParametric(equation, xMin, xMax, yMin, yMax, width, height) {
        // Determine appropriate t range based on the equation
        // Default to 0 to 2π for most curves, extend for spirals, etc.
        const points = equation.getPoints(0, 2 * Math.PI, 0.02);

        if (points.length < 2) return;

        const screenPoints = points.map(point => ({
            x: this.mapToScreen(point.x, xMin, xMax, 0, width),
            y: this.mapToScreen(-point.y, -yMax, -yMin, 0, height),
            valid: true
        }));

        this.drawContinuousSegments(screenPoints);
    }

    drawInequality(equation, xMin, xMax, yMin, yMax, width, height) {
        // Draw the boundary first (solid line)
        this.p5.stroke(equation.color.substring(0, 7));
        this.p5.strokeWeight(2);

        // Draw filled region
        this.p5.noStroke();
        this.p5.fill(equation.color);

        const resolution = 40;
        const xStep = (xMax - xMin) / resolution;
        const yStep = (yMax - yMin) / resolution;
        const rectWidth = width / resolution;
        const rectHeight = height / resolution;

        for (let i = 0; i < resolution; i++) {
            for (let j = 0; j < resolution; j++) {
                const x = xMin + (i + 0.5) * xStep;
                const y = yMin + (j + 0.5) * yStep;

                if (equation.evaluate(x, y)) {
                    const screenX = this.mapToScreen(x - xStep / 2, xMin, xMax, 0, width);
                    const screenY = this.mapToScreen(-(y + yStep / 2), -yMax, -yMin, 0, height);
                    this.p5.rect(screenX, screenY, rectWidth + 1, rectHeight + 1);
                }
            }
        }

        // Reset stroke for other drawings
        this.p5.stroke(equation.color.substring(0, 7));
        this.p5.noFill();
    }

    groupPointsIntoCurves(points, maxDistance) {
        if (points.length === 0) return [];

        const curves = [];
        const used = new Set();

        for (let i = 0; i < points.length; i++) {
            if (used.has(i)) continue;

            const curve = [points[i]];
            used.add(i);

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