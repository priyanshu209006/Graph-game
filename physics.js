/**
 * ============================================================================
 * ROBUST PHYSICS ENGINE FOR MARBLE-SLIDES GAME
 * ============================================================================
 * 
 * Features:
 * - Gravity and friction forces
 * - Tangent-based motion along curves
 * - Normal force preventing falling through curves
 * - Smooth path snapping and detachment
 * - Support for explicit_y, explicit_x, implicit, polar, parametric curves
 * - Star collision detection
 * - World boundary handling
 * 
 * ============================================================================
 */

// ============================================================================
// VECTOR2D UTILITY CLASS
// ============================================================================

/**
 * 2D Vector class for physics calculations
 */
class Vector2D {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    /** Create a copy of this vector */
    clone() {
        return new Vector2D(this.x, this.y);
    }

    /** Add another vector */
    add(v) {
        return new Vector2D(this.x + v.x, this.y + v.y);
    }

    /** Subtract another vector */
    sub(v) {
        return new Vector2D(this.x - v.x, this.y - v.y);
    }

    /** Multiply by a scalar */
    mul(s) {
        return new Vector2D(this.x * s, this.y * s);
    }

    /** Divide by a scalar */
    div(s) {
        if (s === 0) return new Vector2D(0, 0);
        return new Vector2D(this.x / s, this.y / s);
    }

    /** Get the magnitude (length) of this vector */
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /** Get the squared magnitude (faster, no sqrt) */
    magnitudeSq() {
        return this.x * this.x + this.y * this.y;
    }

    /** Normalize this vector (make unit length) */
    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector2D(0, 0);
        return this.div(mag);
    }

    /** Dot product with another vector */
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    /** Get perpendicular vector (rotate 90 degrees counter-clockwise) */
    perpendicular() {
        return new Vector2D(-this.y, this.x);
    }

    /** Rotate by angle (in radians) */
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2D(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }

    /** Linear interpolation to another vector */
    lerp(v, t) {
        return new Vector2D(
            this.x + (v.x - this.x) * t,
            this.y + (v.y - this.y) * t
        );
    }

    /** Distance to another point/vector */
    distanceTo(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /** Squared distance (faster, no sqrt) */
    distanceToSq(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return dx * dx + dy * dy;
    }

    /** Create from plain object */
    static fromObject(obj) {
        return new Vector2D(obj.x || 0, obj.y || 0);
    }

    /** Convert to plain object */
    toObject() {
        return { x: this.x, y: this.y };
    }
}

// ============================================================================
// PHYSICS ENGINE CLASS
// ============================================================================

/**
 * Main physics engine handling all marble physics simulation
 */
class PhysicsEngine {
    constructor(config = {}) {
        // -------------------------------------------------------------------
        // PHYSICS CONSTANTS (configurable)
        // -------------------------------------------------------------------

        /** Global gravity acceleration (negative = downward) */
        this.gravity = config.gravity ?? -9.8;

        /** Time scale factor for simulation speed */
        this.timeScale = config.timeScale ?? 0.016;

        /** Rolling friction coefficient (energy loss while rolling) */
        this.rollingFriction = config.rollingFriction ?? 0.02;

        /** Air drag coefficient (resistance in free fall) */
        this.airDrag = config.airDrag ?? 0.01;

        /** Path snap distance threshold */
        this.snapDistance = config.snapDistance ?? 0.5;

        /** Snap strength (0-1, how quickly marble snaps to path) */
        this.snapStrength = config.snapStrength ?? 0.4;

        /** Minimum velocity to stay on path (detach if slope too steep) */
        this.detachThreshold = config.detachThreshold ?? 0.3;

        /** Maximum slope angle before automatic detachment (radians) */
        this.maxSlopeAngle = config.maxSlopeAngle ?? Math.PI / 3; // 60 degrees

        /** Bounce coefficient for collisions */
        this.bounceCoefficient = config.bounceCoefficient ?? 0.6;

        /** Minimum velocity magnitude (prevent floating point issues) */
        this.minVelocity = config.minVelocity ?? 0.001;

        /** Derivative calculation step size */
        this.derivativeStep = config.derivativeStep ?? 0.001;

        /** Numerical search resolution for closest point */
        this.searchResolution = config.searchResolution ?? 0.05;
    }

    // ========================================================================
    // MAIN UPDATE LOOP
    // ========================================================================

    /**
     * Main physics update for a marble
     * @param {Marble} marble - The marble to update
     * @param {number} dt - Delta time (seconds)
     * @param {Array} equations - Array of equation objects
     * @param {Array} stars - Array of star objects
     * @returns {Object} Update result with events (star collected, out of bounds, etc.)
     */
    update(marble, dt, equations, stars = []) {
        const result = {
            starsCollected: [],
            outOfBounds: false,
            detached: false,
            attached: false
        };

        // Scale dt by time factor
        const scaledDt = dt * this.timeScale;

        // Store previous state
        const wasOnPath = marble.onPath;
        const previousPosition = marble.position.clone();

        // -------------------------------------------------------------------
        // STEP 1: Find nearest path and determine if marble should be on it
        // -------------------------------------------------------------------
        const pathInfo = this.findNearestPath(marble, equations);

        // -------------------------------------------------------------------
        // STEP 2: Determine path state (on path, transitioning, or free fall)
        // -------------------------------------------------------------------
        if (pathInfo && pathInfo.distance < this.snapDistance) {
            // Close enough to a path
            const shouldAttach = this.shouldAttachToPath(marble, pathInfo);

            if (shouldAttach) {
                if (!wasOnPath) {
                    result.attached = true;
                }
                marble.onPath = true;
                marble.currentEquation = pathInfo.equation;

                // Apply path-following physics
                this.updateOnPath(marble, pathInfo, scaledDt);

                // Check if should detach (too steep, etc.)
                if (this.shouldDetachFromPath(marble, pathInfo)) {
                    marble.onPath = false;
                    marble.currentEquation = null;
                    result.detached = true;
                }
            } else {
                marble.onPath = false;
                marble.currentEquation = null;
                this.updateInAir(marble, scaledDt);
            }
        } else {
            // Too far from any path - free fall
            if (wasOnPath) {
                result.detached = true;
            }
            marble.onPath = false;
            marble.currentEquation = null;
            this.updateInAir(marble, scaledDt);
        }

        // -------------------------------------------------------------------
        // STEP 3: Update position
        // -------------------------------------------------------------------
        marble.position = marble.position.add(marble.velocity.mul(scaledDt));

        // -------------------------------------------------------------------
        // STEP 4: Check star collisions
        // -------------------------------------------------------------------
        for (const star of stars) {
            if (!star.collected && this.checkCollision(marble, star)) {
                star.collected = true;
                result.starsCollected.push(star);
            }
        }

        // -------------------------------------------------------------------
        // STEP 5: Update trail
        // -------------------------------------------------------------------
        marble.updateTrail();

        // -------------------------------------------------------------------
        // STEP 6: Clamp minimum velocity
        // -------------------------------------------------------------------
        if (marble.velocity.magnitude() < this.minVelocity) {
            // Give a tiny nudge in the direction of travel or gravity
            if (marble.velocity.magnitude() > 0) {
                marble.velocity = marble.velocity.normalize().mul(this.minVelocity * 2);
            } else {
                marble.velocity = new Vector2D(0.01, this.gravity * 0.01);
            }
        }

        return result;
    }

    // ========================================================================
    // PATH-FOLLOWING PHYSICS
    // ========================================================================

    /**
     * Update marble physics while on a path
     */
    updateOnPath(marble, pathInfo, dt) {
        const { closestPoint, tangent, normal, equation } = pathInfo;

        // -------------------------------------------------------------------
        // Snap marble to path (smooth interpolation)
        // -------------------------------------------------------------------
        const targetPosition = new Vector2D(closestPoint.x, closestPoint.y);
        marble.position = marble.position.lerp(targetPosition, this.snapStrength);

        // -------------------------------------------------------------------
        // Project velocity onto tangent direction
        // -------------------------------------------------------------------
        const tangentUnit = tangent.normalize();
        const normalUnit = normal.normalize();

        // Get velocity component along tangent
        let tangentSpeed = marble.velocity.dot(tangentUnit);

        // -------------------------------------------------------------------
        // Apply gravity along tangent
        // The component of gravity along the tangent causes acceleration
        // Gravity vector is (0, gravity) where gravity is negative
        // -------------------------------------------------------------------
        const gravityVector = new Vector2D(0, this.gravity);
        const gravityAlongTangent = gravityVector.dot(tangentUnit);

        // Add gravity acceleration to tangent speed
        tangentSpeed += gravityAlongTangent * dt;

        // -------------------------------------------------------------------
        // Apply rolling friction (opposes motion)
        // -------------------------------------------------------------------
        const frictionForce = -Math.sign(tangentSpeed) * this.rollingFriction * Math.abs(this.gravity);

        // Only apply friction if it won't reverse the direction
        if (Math.abs(frictionForce * dt) < Math.abs(tangentSpeed)) {
            tangentSpeed += frictionForce * dt;
        } else {
            tangentSpeed *= 0.9; // Dampen instead of reversing
        }

        // -------------------------------------------------------------------
        // Ensure movement direction (prefer positive x direction for natural flow)
        // -------------------------------------------------------------------
        // If tangent points in negative x direction, reverse it
        // This ensures marble generally moves "right" along curves
        let effectiveTangent = tangentUnit;
        if (tangentUnit.x < 0 && Math.abs(tangentSpeed) < 0.1) {
            // At low speeds, prefer positive x direction
            effectiveTangent = tangentUnit.mul(-1);
            tangentSpeed = Math.abs(tangentSpeed);
        }

        // -------------------------------------------------------------------
        // Set new velocity along tangent
        // -------------------------------------------------------------------
        marble.velocity = effectiveTangent.mul(tangentSpeed);

        // -------------------------------------------------------------------
        // Apply small normal force to keep marble on path
        // (prevents drifting due to numerical errors)
        // -------------------------------------------------------------------
        const distanceFromPath = marble.position.distanceTo(targetPosition);
        if (distanceFromPath > 0.01) {
            const correctionForce = normalUnit.mul(-distanceFromPath * 0.5);
            marble.velocity = marble.velocity.add(correctionForce);
        }
    }

    /**
     * Check if marble should attach to a path
     */
    shouldAttachToPath(marble, pathInfo) {
        // Always attach if not moving fast perpendicular to path
        const normalSpeed = Math.abs(marble.velocity.dot(pathInfo.normal.normalize()));
        const tangentSpeed = Math.abs(marble.velocity.dot(pathInfo.tangent.normalize()));

        // If moving mostly along the path, or approaching it, attach
        if (tangentSpeed > normalSpeed * 0.5 || pathInfo.distance < 0.1) {
            return true;
        }

        // If falling toward the path (normal velocity points toward path)
        const toPath = new Vector2D(
            pathInfo.closestPoint.x - marble.position.x,
            pathInfo.closestPoint.y - marble.position.y
        ).normalize();

        const approachSpeed = marble.velocity.dot(toPath);
        if (approachSpeed > 0) {
            return true;
        }

        return false;
    }

    /**
     * Check if marble should detach from path
     */
    shouldDetachFromPath(marble, pathInfo) {
        // Calculate slope angle
        const slopeAngle = Math.atan2(Math.abs(pathInfo.tangent.y), Math.abs(pathInfo.tangent.x));

        // -------------------------------------------------------------------
        // Detach if slope is too steep and marble is moving too slow
        // (Would fall off in reality)
        // -------------------------------------------------------------------
        if (slopeAngle > this.maxSlopeAngle) {
            const speed = marble.velocity.magnitude();
            if (speed < this.detachThreshold) {
                return true;
            }
        }

        // -------------------------------------------------------------------
        // Detach if centrifugal force exceeds normal force
        // For curves with high curvature at high speeds
        // -------------------------------------------------------------------
        const curvature = pathInfo.curvature || 0;
        if (curvature !== 0) {
            const speed = marble.velocity.magnitude();
            const centripetalRequired = speed * speed * Math.abs(curvature);
            const normalForce = Math.abs(this.gravity * Math.cos(slopeAngle));

            // If centrifugal force exceeds what normal force can provide
            if (centripetalRequired > normalForce * 2) {
                return true;
            }
        }

        return false;
    }

    // ========================================================================
    // FREE-FALL PHYSICS
    // ========================================================================

    /**
     * Update marble physics while in free fall
     */
    updateInAir(marble, dt) {
        // -------------------------------------------------------------------
        // Apply gravity
        // -------------------------------------------------------------------
        marble.velocity.y += this.gravity * dt;

        // -------------------------------------------------------------------
        // Apply air drag (velocity-dependent resistance)
        // -------------------------------------------------------------------
        const speed = marble.velocity.magnitude();
        if (speed > 0) {
            const dragMagnitude = this.airDrag * speed * speed;
            const dragForce = marble.velocity.normalize().mul(-dragMagnitude);
            marble.velocity = marble.velocity.add(dragForce.mul(dt));
        }
    }

    // ========================================================================
    // CURVE GEOMETRY CALCULATIONS
    // ========================================================================

    /**
     * Find the nearest path to the marble among all equations
     * @returns {Object|null} Path info with closest point, tangent, normal, distance
     */
    findNearestPath(marble, equations) {
        let nearestInfo = null;
        let minDistance = Infinity;

        for (const equation of equations) {
            // Skip non-solid curve types (inequalities are regions, not paths)
            if (equation.type === 'inequality') continue;

            const info = this.analyzePathAtPoint(marble, equation);
            if (info && info.distance < minDistance) {
                minDistance = info.distance;
                nearestInfo = info;
            }
        }

        return nearestInfo;
    }

    /**
     * Analyze a path at the marble's position
     * Returns closest point, tangent, normal, curvature
     */
    analyzePathAtPoint(marble, equation) {
        const marblePos = marble.position;

        switch (equation.type) {
            case 'explicit_y':
            case 'piecewise':
            case 'constant_y':
                return this.analyzeExplicitY(marblePos, equation);

            case 'explicit_x':
            case 'constant_x':
                return this.analyzeExplicitX(marblePos, equation);

            case 'implicit':
                return this.analyzeImplicit(marblePos, equation);

            case 'polar':
                return this.analyzePolar(marblePos, equation);

            case 'parametric':
                return this.analyzeParametric(marblePos, equation);

            default:
                return null;
        }
    }

    /**
     * Analyze y = f(x) curve
     */
    analyzeExplicitY(pos, equation) {
        // Find closest x using golden section search
        const closestX = this.findClosestXOnCurve(pos, equation, pos.x - 3, pos.x + 3);

        if (closestX === null) return null;

        try {
            const y = equation.evaluate(closestX);
            if (!isFinite(y)) return null;

            const closestPoint = { x: closestX, y: y };
            const distance = pos.distanceTo(Vector2D.fromObject(closestPoint));

            // Calculate derivative for tangent
            const derivative = this.calculateDerivative(equation, closestX);

            // Tangent direction: (1, dy/dx) normalized
            const tangent = new Vector2D(1, derivative).normalize();

            // Normal is perpendicular to tangent (pointing "up" from curve)
            const normal = tangent.perpendicular();

            // Calculate curvature: κ = |y''| / (1 + y'^2)^(3/2)
            const secondDerivative = this.calculateSecondDerivative(equation, closestX);
            const curvature = Math.abs(secondDerivative) / Math.pow(1 + derivative * derivative, 1.5);

            return {
                equation,
                closestPoint,
                distance,
                tangent,
                normal,
                curvature
            };
        } catch (e) {
            return null;
        }
    }

    /**
     * Analyze x = f(y) curve
     */
    analyzeExplicitX(pos, equation) {
        // Find closest y
        const closestY = this.findClosestYOnCurve(pos, equation, pos.y - 3, pos.y + 3);

        if (closestY === null) return null;

        try {
            const x = equation.evaluate(closestY);
            if (!isFinite(x)) return null;

            const closestPoint = { x: x, y: closestY };
            const distance = pos.distanceTo(Vector2D.fromObject(closestPoint));

            // Calculate derivative dx/dy
            const dxdy = this.calculateDerivativeX(equation, closestY);

            // Tangent direction: (dx/dy, 1) normalized
            const tangent = new Vector2D(dxdy, 1).normalize();
            const normal = tangent.perpendicular();

            // Curvature
            const secondDerivative = this.calculateSecondDerivativeX(equation, closestY);
            const curvature = Math.abs(secondDerivative) / Math.pow(1 + dxdy * dxdy, 1.5);

            return {
                equation,
                closestPoint,
                distance,
                tangent,
                normal,
                curvature
            };
        } catch (e) {
            return null;
        }
    }

    /**
     * Analyze implicit curve f(x,y) = 0
     */
    analyzeImplicit(pos, equation) {
        // Use gradient descent to find closest point
        const closestPoint = this.findClosestPointImplicit(pos, equation);

        if (!closestPoint) return null;

        const distance = pos.distanceTo(Vector2D.fromObject(closestPoint));

        // Calculate gradient ∇f = (∂f/∂x, ∂f/∂y)
        const gradient = this.calculateGradient(equation, closestPoint.x, closestPoint.y);

        // Normal is along gradient, tangent is perpendicular
        const normal = gradient.normalize();
        const tangent = normal.perpendicular();

        // Curvature for implicit curves (more complex, approximate)
        const curvature = this.calculateImplicitCurvature(equation, closestPoint.x, closestPoint.y);

        return {
            equation,
            closestPoint,
            distance,
            tangent,
            normal,
            curvature
        };
    }

    /**
     * Analyze polar curve r = f(θ)
     */
    analyzePolar(pos, equation) {
        // Convert marble position to polar
        const marbleTheta = Math.atan2(pos.y, pos.x);
        const marbleR = pos.magnitude();

        // Find closest theta
        let closestTheta = marbleTheta;
        let minDistance = Infinity;

        // Search around marble's theta
        for (let theta = marbleTheta - Math.PI; theta <= marbleTheta + Math.PI; theta += 0.05) {
            try {
                const r = equation.evaluate(theta);
                if (!isFinite(r)) continue;

                const x = r * Math.cos(theta);
                const y = r * Math.sin(theta);
                const dist = pos.distanceTo(new Vector2D(x, y));

                if (dist < minDistance) {
                    minDistance = dist;
                    closestTheta = theta;
                }
            } catch (e) {
                continue;
            }
        }

        try {
            const r = equation.evaluate(closestTheta);
            const closestPoint = {
                x: r * Math.cos(closestTheta),
                y: r * Math.sin(closestTheta)
            };

            // Tangent for polar: dr/dθ determines direction
            const drdt = (equation.evaluate(closestTheta + 0.01) - equation.evaluate(closestTheta - 0.01)) / 0.02;

            // Tangent in Cartesian: (dx/dθ, dy/dθ)
            // dx/dθ = dr/dθ * cos(θ) - r * sin(θ)
            // dy/dθ = dr/dθ * sin(θ) + r * cos(θ)
            const dxdt = drdt * Math.cos(closestTheta) - r * Math.sin(closestTheta);
            const dydt = drdt * Math.sin(closestTheta) + r * Math.cos(closestTheta);

            const tangent = new Vector2D(dxdt, dydt).normalize();
            const normal = tangent.perpendicular();

            return {
                equation,
                closestPoint,
                distance: minDistance,
                tangent,
                normal,
                curvature: 0 // Simplified
            };
        } catch (e) {
            return null;
        }
    }

    /**
     * Analyze parametric curve x=f(t), y=g(t)
     */
    analyzeParametric(pos, equation) {
        // Find closest t parameter
        let closestT = 0;
        let minDistance = Infinity;

        for (let t = 0; t <= 2 * Math.PI; t += 0.05) {
            try {
                const x = equation.evaluateX(t);
                const y = equation.evaluateY(t);
                if (!isFinite(x) || !isFinite(y)) continue;

                const dist = pos.distanceTo(new Vector2D(x, y));
                if (dist < minDistance) {
                    minDistance = dist;
                    closestT = t;
                }
            } catch (e) {
                continue;
            }
        }

        try {
            const x = equation.evaluateX(closestT);
            const y = equation.evaluateY(closestT);

            // Calculate tangent: (dx/dt, dy/dt)
            const dt = 0.01;
            const dxdt = (equation.evaluateX(closestT + dt) - equation.evaluateX(closestT - dt)) / (2 * dt);
            const dydt = (equation.evaluateY(closestT + dt) - equation.evaluateY(closestT - dt)) / (2 * dt);

            const tangent = new Vector2D(dxdt, dydt).normalize();
            const normal = tangent.perpendicular();

            return {
                equation,
                closestPoint: { x, y },
                distance: minDistance,
                tangent,
                normal,
                curvature: 0
            };
        } catch (e) {
            return null;
        }
    }

    // ========================================================================
    // NUMERICAL METHODS
    // ========================================================================

    /**
     * Find closest x on y=f(x) curve using golden section search
     */
    findClosestXOnCurve(pos, equation, xMin, xMax) {
        const phi = (1 + Math.sqrt(5)) / 2;
        const tolerance = 0.001;

        let a = xMin;
        let b = xMax;
        let c = b - (b - a) / phi;
        let d = a + (b - a) / phi;

        const distanceAt = (x) => {
            try {
                const y = equation.evaluate(x);
                if (!isFinite(y)) return Infinity;
                return pos.distanceTo(new Vector2D(x, y));
            } catch (e) {
                return Infinity;
            }
        };

        let iterations = 0;
        while (Math.abs(b - a) > tolerance && iterations < 50) {
            if (distanceAt(c) < distanceAt(d)) {
                b = d;
            } else {
                a = c;
            }
            c = b - (b - a) / phi;
            d = a + (b - a) / phi;
            iterations++;
        }

        return (a + b) / 2;
    }

    /**
     * Find closest y on x=f(y) curve
     */
    findClosestYOnCurve(pos, equation, yMin, yMax) {
        const phi = (1 + Math.sqrt(5)) / 2;
        const tolerance = 0.001;

        let a = yMin;
        let b = yMax;
        let c = b - (b - a) / phi;
        let d = a + (b - a) / phi;

        const distanceAt = (y) => {
            try {
                const x = equation.evaluate(y);
                if (!isFinite(x)) return Infinity;
                return pos.distanceTo(new Vector2D(x, y));
            } catch (e) {
                return Infinity;
            }
        };

        let iterations = 0;
        while (Math.abs(b - a) > tolerance && iterations < 50) {
            if (distanceAt(c) < distanceAt(d)) {
                b = d;
            } else {
                a = c;
            }
            c = b - (b - a) / phi;
            d = a + (b - a) / phi;
            iterations++;
        }

        return (a + b) / 2;
    }

    /**
     * Find closest point on implicit curve using gradient descent
     */
    findClosestPointImplicit(pos, equation) {
        let x = pos.x;
        let y = pos.y;

        const stepSize = 0.1;
        const iterations = 20;

        for (let i = 0; i < iterations; i++) {
            try {
                const f = equation.evaluate(x, y);

                // If we're on the curve, we're done
                if (Math.abs(f) < 0.01) {
                    return { x, y };
                }

                // Calculate gradient
                const grad = this.calculateGradient(equation, x, y);
                const gradMag = grad.magnitude();

                if (gradMag < 0.001) break;

                // Move along gradient toward curve (f = 0)
                const step = f / (gradMag * gradMag);
                x -= grad.x * step * stepSize;
                y -= grad.y * step * stepSize;
            } catch (e) {
                break;
            }
        }

        return { x, y };
    }

    /**
     * Calculate first derivative dy/dx for y=f(x)
     */
    calculateDerivative(equation, x, h = null) {
        const step = h || this.derivativeStep;
        try {
            const y1 = equation.evaluate(x - step);
            const y2 = equation.evaluate(x + step);

            if (!isFinite(y1) || !isFinite(y2)) return 0;
            return (y2 - y1) / (2 * step);
        } catch (e) {
            return 0;
        }
    }

    /**
     * Calculate second derivative d²y/dx² for y=f(x)
     */
    calculateSecondDerivative(equation, x, h = null) {
        const step = h || this.derivativeStep;
        try {
            const y0 = equation.evaluate(x - step);
            const y1 = equation.evaluate(x);
            const y2 = equation.evaluate(x + step);

            if (!isFinite(y0) || !isFinite(y1) || !isFinite(y2)) return 0;
            return (y0 - 2 * y1 + y2) / (step * step);
        } catch (e) {
            return 0;
        }
    }

    /**
     * Calculate first derivative dx/dy for x=f(y)
     */
    calculateDerivativeX(equation, y, h = null) {
        const step = h || this.derivativeStep;
        try {
            const x1 = equation.evaluate(y - step);
            const x2 = equation.evaluate(y + step);

            if (!isFinite(x1) || !isFinite(x2)) return 0;
            return (x2 - x1) / (2 * step);
        } catch (e) {
            return 0;
        }
    }

    /**
     * Calculate second derivative d²x/dy² for x=f(y)
     */
    calculateSecondDerivativeX(equation, y, h = null) {
        const step = h || this.derivativeStep;
        try {
            const x0 = equation.evaluate(y - step);
            const x1 = equation.evaluate(y);
            const x2 = equation.evaluate(y + step);

            if (!isFinite(x0) || !isFinite(x1) || !isFinite(x2)) return 0;
            return (x0 - 2 * x1 + x2) / (step * step);
        } catch (e) {
            return 0;
        }
    }

    /**
     * Calculate gradient of implicit function ∇f = (∂f/∂x, ∂f/∂y)
     */
    calculateGradient(equation, x, y, h = null) {
        const step = h || this.derivativeStep;
        try {
            const dfdx = (equation.evaluate(x + step, y) - equation.evaluate(x - step, y)) / (2 * step);
            const dfdy = (equation.evaluate(x, y + step) - equation.evaluate(x, y - step)) / (2 * step);

            if (!isFinite(dfdx) || !isFinite(dfdy)) return new Vector2D(0, 1);
            return new Vector2D(dfdx, dfdy);
        } catch (e) {
            return new Vector2D(0, 1);
        }
    }

    /**
     * Calculate curvature for implicit curve
     */
    calculateImplicitCurvature(equation, x, y) {
        // κ = |fx²*fyy - 2*fx*fy*fxy + fy²*fxx| / (fx² + fy²)^(3/2)
        const h = this.derivativeStep;

        try {
            const fx = (equation.evaluate(x + h, y) - equation.evaluate(x - h, y)) / (2 * h);
            const fy = (equation.evaluate(x, y + h) - equation.evaluate(x, y - h)) / (2 * h);

            const fxx = (equation.evaluate(x + h, y) - 2 * equation.evaluate(x, y) + equation.evaluate(x - h, y)) / (h * h);
            const fyy = (equation.evaluate(x, y + h) - 2 * equation.evaluate(x, y) + equation.evaluate(x, y - h)) / (h * h);
            const fxy = (equation.evaluate(x + h, y + h) - equation.evaluate(x + h, y - h) -
                equation.evaluate(x - h, y + h) + equation.evaluate(x - h, y - h)) / (4 * h * h);

            const num = Math.abs(fx * fx * fyy - 2 * fx * fy * fxy + fy * fy * fxx);
            const den = Math.pow(fx * fx + fy * fy, 1.5);

            if (den === 0) return 0;
            return num / den;
        } catch (e) {
            return 0;
        }
    }

    // ========================================================================
    // COLLISION DETECTION
    // ========================================================================

    /**
     * Check circle-circle collision between marble and star
     */
    checkCollision(marble, star) {
        const dx = marble.position.x - star.x;
        const dy = marble.position.y - star.y;
        const distanceSq = dx * dx + dy * dy;
        const radiusSum = marble.radius + star.radius;

        return distanceSq < radiusSum * radiusSum;
    }

    /**
     * Check if marble is within world bounds
     */
    checkBounds(marble, bounds) {
        const { x, y } = marble.position;
        const { minX, maxX, minY, maxY } = bounds;

        return x >= minX && x <= maxX && y >= minY && y <= maxY;
    }

    /**
     * Apply boundary bounce/clamp
     */
    applyBoundaryBounce(marble, bounds) {
        const { minX, maxX, minY, maxY } = bounds;

        if (marble.position.x < minX) {
            marble.position.x = minX;
            marble.velocity.x = Math.abs(marble.velocity.x) * this.bounceCoefficient;
        } else if (marble.position.x > maxX) {
            marble.position.x = maxX;
            marble.velocity.x = -Math.abs(marble.velocity.x) * this.bounceCoefficient;
        }

        if (marble.position.y < minY) {
            marble.position.y = minY;
            marble.velocity.y = Math.abs(marble.velocity.y) * this.bounceCoefficient;
        } else if (marble.position.y > maxY) {
            marble.position.y = maxY;
            marble.velocity.y = -Math.abs(marble.velocity.y) * this.bounceCoefficient;
        }
    }
}

// ============================================================================
// MARBLE CLASS
// ============================================================================

/**
 * Marble entity with physics properties
 */
class Marble {
    constructor(x, y, config = {}) {
        /** Position vector */
        this.position = new Vector2D(x, y);

        /** Velocity vector */
        this.velocity = new Vector2D(config.vx ?? 0.1, config.vy ?? 0);

        /** Marble radius in world units */
        this.radius = config.radius ?? 0.2;

        /** Display color */
        this.color = config.color ?? '#4A90D9';

        /** Whether marble is currently following a path */
        this.onPath = false;

        /** Reference to current equation being followed */
        this.currentEquation = null;

        /** Trail of previous positions for visual effect */
        this.trail = [];

        /** Maximum trail length */
        this.maxTrailLength = config.maxTrailLength ?? 30;

        /** Unique identifier */
        this.id = config.id ?? Math.random().toString(36).substr(2, 9);

        /** Whether marble is active (not collected/destroyed) */
        this.active = true;
    }

    /**
     * Update the position trail
     */
    updateTrail() {
        this.trail.push(this.position.clone());

        while (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
    }

    /**
     * Reset marble to initial state
     */
    reset(x, y) {
        this.position = new Vector2D(x, y);
        this.velocity = new Vector2D(0.1, 0);
        this.onPath = false;
        this.currentEquation = null;
        this.trail = [];
        this.active = true;
    }

    /**
     * Get current speed
     */
    getSpeed() {
        return this.velocity.magnitude();
    }

    /**
     * Get direction angle (radians)
     */
    getDirection() {
        return Math.atan2(this.velocity.y, this.velocity.x);
    }

    /**
     * Apply an impulse force
     */
    applyImpulse(force) {
        this.velocity = this.velocity.add(force);
    }

    /**
     * Legacy update method for backward compatibility with game.js
     * Delegates to physics engine
     */
    update(physics, equations) {
        // This method is called by the old game.js
        // Convert to new physics system
        const result = physics.update(this, 1, equations, this.stars || []);

        // Handle old update mechanism
        this.trail.push({ x: this.position.x, y: this.position.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
    }
}

// ============================================================================
// EXPORT FOR USE
// ============================================================================

// Make classes available globally for browser usage
if (typeof window !== 'undefined') {
    window.Vector2D = Vector2D;
    window.PhysicsEngine = PhysicsEngine;
    window.Marble = Marble;
}