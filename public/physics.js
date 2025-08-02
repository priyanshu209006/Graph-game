class PhysicsEngine {
    constructor() {
        this.gravity = -0.15; // Reduced gravity for better control
        this.friction = 0.98;
        this.bounceThreshold = 0.5;
        this.pathSnapStrength = 0.3; // How strongly marbles snap to paths
        this.pathFollowSpeed = 0.12; // Speed when following paths
    }
    
    applyGravity(marble) {
        marble.velocity.y += this.gravity;
    }
    
    applyFriction(marble) {
        marble.velocity.x *= this.friction;
        marble.velocity.y *= this.friction;
    }
    
    updatePosition(marble, dt = 1) {
        marble.position.x += marble.velocity.x * dt;
        marble.position.y += marble.velocity.y * dt;
    }
    
    checkBounds(marble, bounds) {
        const { x, y } = marble.position;
        const { minX, maxX, minY, maxY } = bounds;
        
        if (x < minX || x > maxX || y < minY || y > maxY) {
            return false; // Out of bounds
        }
        return true;
    }
    
    checkCollision(marble, star) {
        const dx = marble.position.x - star.x;
        const dy = marble.position.y - star.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < (marble.radius + star.radius);
    }
    
    calculateDerivative(equation, x, dx = 0.01) {
        try {
            const y1 = equation.evaluate(x - dx/2);
            const y2 = equation.evaluate(x + dx/2);
            
            if (isNaN(y1) || isNaN(y2) || !isFinite(y1) || !isFinite(y2)) {
                return 0;
            }
            
            return (y2 - y1) / dx;
        } catch (error) {
            return 0;
        }
    }
    
    calculatePathVelocity(equation, x, speed = null) {
        try {
            const actualSpeed = speed || this.pathFollowSpeed;
            
            switch (equation.type) {
                case 'explicit_y':
                case 'piecewise':
                    const derivative = this.calculateDerivative(equation, x);
                    const magnitude = Math.sqrt(1 + derivative * derivative);
                    return {
                        x: actualSpeed / magnitude,
                        y: (actualSpeed * derivative) / magnitude
                    };
                    
                case 'explicit_x':
                    // For x = f(y), we need dy/dx = 1/(dx/dy)
                    const y = equation.evaluate ? equation.evaluate(x) : 0;
                    const dxdy = this.calculateDerivativeX(equation, y);
                    const dydx = dxdy !== 0 ? 1 / dxdy : 0;
                    const mag = Math.sqrt(1 + dydx * dydx);
                    return {
                        x: actualSpeed / mag,
                        y: (actualSpeed * dydx) / mag
                    };
                    
                case 'implicit':
                    // For implicit curves, estimate tangent from nearby points
                    return this.calculateImplicitVelocity(equation, x, actualSpeed);
                    
                default:
                    return { x: actualSpeed, y: 0 };
            }
        } catch (error) {
            return { x: 0, y: 0 };
        }
    }
    
    calculateDerivativeX(equation, y, dy = 0.01) {
        try {
            const x1 = equation.evaluate(y - dy/2);
            const x2 = equation.evaluate(y + dy/2);
            
            if (isNaN(x1) || isNaN(x2) || !isFinite(x1) || !isFinite(x2)) {
                return 0;
            }
            
            return (x2 - x1) / dy;
        } catch (error) {
            return 0;
        }
    }
    
    calculateImplicitVelocity(equation, x, speed) {
        // Estimate tangent direction by sampling nearby points
        const step = 0.1;
        const points = equation.getPoints(x - step, x + step, -10, 10, 20);
        
        if (points.length < 2) {
            return { x: speed, y: 0 };
        }
        
        // Find the best direction based on nearby points
        let bestDirection = { x: 1, y: 0 };
        let minDistance = Infinity;
        
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i-1].x;
            const dy = points[i].y - points[i-1].y;
            const distance = Math.abs(points[i].x - x);
            
            if (distance < minDistance && (dx !== 0 || dy !== 0)) {
                minDistance = distance;
                const magnitude = Math.sqrt(dx * dx + dy * dy);
                bestDirection = {
                    x: dx / magnitude,
                    y: dy / magnitude
                };
            }
        }
        
        return {
            x: speed * bestDirection.x,
            y: speed * bestDirection.y
        };
    }
    
    findClosestPointOnPath(marble, equation, searchRadius = 2.0) {
        const marbleX = marble.position.x;
        const marbleY = marble.position.y;
        
        switch (equation.type) {
            case 'explicit_y':
            case 'piecewise':
                return this.findClosestPointExplicitY(marble, equation, searchRadius);
            case 'explicit_x':
                return this.findClosestPointExplicitX(marble, equation, searchRadius);
            case 'implicit':
                return this.findClosestPointImplicit(marble, equation, searchRadius);
            default:
                return null;
        }
    }
    
    findClosestPointExplicitY(marble, equation, searchRadius) {
        const marbleX = marble.position.x;
        const marbleY = marble.position.y;
        
        let closestX = marbleX;
        let minDistance = Infinity;
        
        const step = 0.05;
        const startX = Math.max(-10, marbleX - searchRadius);
        const endX = Math.min(10, marbleX + searchRadius);
        
        for (let x = startX; x <= endX; x += step) {
            try {
                const y = equation.evaluate(x);
                if (!isNaN(y) && isFinite(y)) {
                    const distance = Math.sqrt((x - marbleX) ** 2 + (y - marbleY) ** 2);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestX = x;
                    }
                }
            } catch (error) {
                continue;
            }
        }
        
        try {
            const closestY = equation.evaluate(closestX);
            return {
                x: closestX,
                y: closestY,
                distance: minDistance
            };
        } catch (error) {
            return null;
        }
    }
    
    findClosestPointExplicitX(marble, equation, searchRadius) {
        const marbleX = marble.position.x;
        const marbleY = marble.position.y;
        
        let closestY = marbleY;
        let minDistance = Infinity;
        
        const step = 0.05;
        const startY = Math.max(-10, marbleY - searchRadius);
        const endY = Math.min(10, marbleY + searchRadius);
        
        for (let y = startY; y <= endY; y += step) {
            try {
                const x = equation.evaluate(y);
                if (!isNaN(x) && isFinite(x)) {
                    const distance = Math.sqrt((x - marbleX) ** 2 + (y - marbleY) ** 2);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestY = y;
                    }
                }
            } catch (error) {
                continue;
            }
        }
        
        try {
            const closestX = equation.evaluate(closestY);
            return {
                x: closestX,
                y: closestY,
                distance: minDistance
            };
        } catch (error) {
            return null;
        }
    }
    
    findClosestPointImplicit(marble, equation, searchRadius) {
        const marbleX = marble.position.x;
        const marbleY = marble.position.y;
        
        // Get points on the implicit curve
        const points = equation.getPoints(
            marbleX - searchRadius, marbleX + searchRadius,
            marbleY - searchRadius, marbleY + searchRadius,
            50
        );
        
        if (points.length === 0) return null;
        
        let closestPoint = points[0];
        let minDistance = Math.sqrt(
            (closestPoint.x - marbleX) ** 2 + (closestPoint.y - marbleY) ** 2
        );
        
        for (let i = 1; i < points.length; i++) {
            const distance = Math.sqrt(
                (points[i].x - marbleX) ** 2 + (points[i].y - marbleY) ** 2
            );
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = points[i];
            }
        }
        
        return {
            x: closestPoint.x,
            y: closestPoint.y,
            distance: minDistance
        };
    }
    
    findBestPathTowardStars(marble, candidatePaths, stars) {
        if (candidatePaths.length <= 1) {
            return candidatePaths[0] || null;
        }
        
        let bestPath = null;
        let bestScore = -Infinity;
        
        candidatePaths.forEach(pathData => {
            const score = this.calculatePathScore(marble, pathData, stars);
            if (score > bestScore) {
                bestScore = score;
                bestPath = pathData;
            }
        });
        
        return bestPath;
    }
    
    calculatePathScore(marble, pathData, stars) {
        const { equation, closestPoint } = pathData;
        let score = 0;
        
        // Get uncollected stars
        const uncollectedStars = stars.filter(star => !star.collected);
        if (uncollectedStars.length === 0) return 0;
        
        // Sample points along the path to see where it leads
        const samplePoints = this.samplePathPoints(equation, marble.position.x, 5.0, 20);
        
        uncollectedStars.forEach(star => {
            let minDistanceToStar = Infinity;
            
            // Find the closest approach to this star along the path
            samplePoints.forEach(point => {
                const distanceToStar = Math.sqrt(
                    (point.x - star.x) ** 2 + (point.y - star.y) ** 2
                );
                minDistanceToStar = Math.min(minDistanceToStar, distanceToStar);
            });
            
            // Higher score for paths that get closer to stars
            if (minDistanceToStar < 2.0) { // Within reasonable collection distance
                score += (2.0 - minDistanceToStar) * 100; // Higher score for closer approaches
            }
            
            // Bonus for paths that lead generally toward stars
            const directionToStar = {
                x: star.x - marble.position.x,
                y: star.y - marble.position.y
            };
            
            const pathDirection = this.calculatePathVelocity(equation, closestPoint.x);
            const dotProduct = directionToStar.x * pathDirection.x + directionToStar.y * pathDirection.y;
            
            if (dotProduct > 0) {
                score += dotProduct * 10; // Bonus for paths going toward stars
            }
        });
        
        return score;
    }
    
    samplePathPoints(equation, startX, distance, numSamples) {
        const points = [];
        
        switch (equation.type) {
            case 'explicit_y':
            case 'piecewise':
                const step = distance / numSamples;
                for (let i = 0; i <= numSamples; i++) {
                    const x = startX + (i * step);
                    try {
                        const y = equation.evaluate(x);
                        if (!isNaN(y) && isFinite(y)) {
                            points.push({ x, y });
                        }
                    } catch (error) {
                        continue;
                    }
                }
                break;
                
            case 'explicit_x':
                const yStep = distance / numSamples;
                for (let i = 0; i <= numSamples; i++) {
                    const y = -10 + (i * yStep);
                    try {
                        const x = equation.evaluate(y);
                        if (!isNaN(x) && isFinite(x) && x >= startX && x <= startX + distance) {
                            points.push({ x, y });
                        }
                    } catch (error) {
                        continue;
                    }
                }
                break;
                
            case 'implicit':
                const implicitPoints = equation.getPoints(startX, startX + distance, -10, 10, numSamples);
                points.push(...implicitPoints);
                break;
        }
        
        return points;
    }
}

class Marble {
    constructor(x, y, color = 'blue') {
        this.position = { x, y };
        this.velocity = { x: 0.05, y: 0 }; // Small initial horizontal velocity
        this.radius = 0.15;
        this.color = color;
        this.onPath = false;
        this.currentEquation = null;
        this.trail = [];
        this.maxTrailLength = 25;
        this.pathThreshold = 0.8; // Distance threshold for path detection
        this.timeOffPath = 0; // Track how long marble has been off path
    }
    
    reset(x, y) {
        this.position = { x, y };
        this.velocity = { x: 0.05, y: 0 }; // Small initial horizontal velocity
        this.onPath = false;
        this.currentEquation = null;
        this.trail = [];
        this.timeOffPath = 0;
    }
    
    update(physics, equations) {
        // Add current position to trail
        this.trail.push({ x: this.position.x, y: this.position.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        
        // Find all nearby paths within threshold
        let candidatePaths = [];
        
        for (let equation of equations) {
            const closestPoint = physics.findClosestPointOnPath(this, equation);
            if (closestPoint && closestPoint.distance < this.pathThreshold) {
                candidatePaths.push({
                    equation: equation,
                    closestPoint: closestPoint,
                    distance: closestPoint.distance
                });
            }
        }
        
        // If multiple paths are available, choose the best one toward stars
        let bestPathData = null;
        if (candidatePaths.length > 0) {
            bestPathData = physics.findBestPathTowardStars(this, candidatePaths, this.stars || []);
        }
        
        const wasOnPath = this.onPath;
        this.onPath = bestPathData !== null;
        
        if (this.onPath && bestPathData) {
            this.currentEquation = bestPathData.equation;
            const bestPoint = bestPathData.closestPoint;
            this.timeOffPath = 0;
            
            // Snap marble towards the path
            const snapStrength = physics.pathSnapStrength;
            this.position.x += (bestPoint.x - this.position.x) * snapStrength;
            this.position.y += (bestPoint.y - this.position.y) * snapStrength;
            
            // Calculate velocity along the path
            const pathVel = physics.calculatePathVelocity(bestPathData.equation, this.position.x);
            
            // Blend path velocity with current velocity for smooth transitions
            const blendFactor = wasOnPath ? 0.8 : 0.5;
            this.velocity.x = this.velocity.x * (1 - blendFactor) + pathVel.x * blendFactor;
            this.velocity.y = this.velocity.y * (1 - blendFactor) + pathVel.y * blendFactor;
            
            // Add slight gravity influence even on paths for more realistic physics
            this.velocity.y += physics.gravity * 0.3;
            
        } else {
            // Not on any path - apply full physics
            this.currentEquation = null;
            this.timeOffPath++;
            
            // Apply gravity
            physics.applyGravity(this);
            
            // Apply air resistance
            this.velocity.x *= 0.995;
            this.velocity.y *= 0.995;
        }
        
        // Apply friction
        physics.applyFriction(this);
        
        // Update position
        physics.updatePosition(this);
        
        // Ensure marble doesn't get stuck with zero velocity
        if (Math.abs(this.velocity.x) < 0.001 && Math.abs(this.velocity.y) < 0.001) {
            this.velocity.x += 0.01; // Small nudge to keep moving
        }
    }
}