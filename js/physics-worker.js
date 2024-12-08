// Physics simulation worker
let grid = [];
let cols = 0;
let rows = 0;
let particleProperties = null;

// TPS tracking
let targetTPS = 60;
let currentTPS = 0;
let tickCount = 0;
let lastTPSUpdate = performance.now();
let updateInterval = null;

self.onmessage = function(e) {
    const { type, data } = e.data;
    
    switch(type) {
        case 'init':
            grid = data.grid;
            cols = data.cols;
            rows = data.rows;
            particleProperties = data.particleProperties;
            startPhysicsLoop();
            break;
            
        case 'setParticle':
            const { x, y, particle } = data;
            if (x >= 0 && x < cols && y >= 0 && y < rows) {
                grid[y][x] = particle;
            }
            break;
            
        case 'resize':
            resizeGrid(data.newGrid, data.newCols, data.newRows);
            break;

        case 'setTPS':
            targetTPS = data.tps;
            restartPhysicsLoop();
            break;
    }
};

function startPhysicsLoop() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    const msPerTick = 1000 / targetTPS;
    updateInterval = setInterval(() => {
        const now = performance.now();
        
        updatePhysics();
        
        // TPS counting
        tickCount++;
        if (now - lastTPSUpdate >= 1000) {
            currentTPS = Math.round(tickCount * 1000 / (now - lastTPSUpdate));
            self.postMessage({ type: 'tpsUpdate', currentTPS });
            tickCount = 0;
            lastTPSUpdate = now;
        }
        
        self.postMessage({ type: 'gridUpdate', grid: grid });
    }, msPerTick);
}

function restartPhysicsLoop() {
    startPhysicsLoop();
}

function updatePhysics() {
    // Create a copy of the grid for reading while we modify the original
    const oldGrid = grid.map(row => [...row]);
    
    // Process particles from bottom to top to prevent multiple updates
    for (let y = rows - 1; y >= 0; y--) {
        // Randomize horizontal direction to prevent bias
        const horizontalDirections = Math.random() < 0.5 ? [1, -1] : [-1, 1];
        
        for (let x = 0; x < cols; x++) {
            const particle = oldGrid[y][x];
            
            // Skip empty or immovable particles
            if (particle.type === 'empty' || !particleProperties[particle.type].movable) continue;

            // Gravity-based particles (sand, water, etc.)
            if (particleProperties[particle.type].gravity) {
                // Attempt to move directly down
                if (y < rows - 1 && grid[y + 1][x].type === 'empty') {
                    grid[y + 1][x] = particle;
                    grid[y][x] = { type: 'empty', color: particleProperties.empty.color };
                    continue;
                }

                // Liquid behavior
                if (particleProperties[particle.type].liquid) {
                    // Try to spread out horizontally to level the surface
                    const levelingDirections = [
                        [horizontalDirections[0], 0],  // primary horizontal direction
                        [horizontalDirections[1], 0],  // opposite horizontal direction
                        [horizontalDirections[0], 1],  // diagonal down
                        [horizontalDirections[1], 1]   // opposite diagonal down
                    ];
                    
                    for (const [dx, dy] of levelingDirections) {
                        const newX = x + dx;
                        const newY = y + dy;
                        
                        if (newX >= 0 && newX < cols && 
                            newY < rows && 
                            grid[newY][newX].type === 'empty') {
                            grid[newY][newX] = particle;
                            grid[y][x] = { type: 'empty', color: particleProperties.empty.color };
                            break;
                        }
                    }
                }
                // Sand-like behavior for non-liquid gravity particles
                else {
                    const sandDirections = [
                        [horizontalDirections[0], 1],  // primary diagonal down
                        [horizontalDirections[1], 1]   // opposite diagonal down
                    ];
                    
                    for (const [dx, dy] of sandDirections) {
                        const newX = x + dx;
                        const newY = y + dy;
                        
                        if (newX >= 0 && newX < cols && 
                            newY < rows && 
                            grid[newY][newX].type === 'empty') {
                            grid[newY][newX] = particle;
                            grid[y][x] = { type: 'empty', color: particleProperties.empty.color };
                            break;
                        }
                    }
                }
            }
            
            // Gas behavior
            if (particleProperties[particle.type].gas) {
                // Try to spread out and move upwards
                const gasDirections = [
                    [0, -1],    // directly up
                    [-1, -1],   // up-left
                    [1, -1],    // up-right
                    [-1, 0],    // left
                    [1, 0],     // right
                    [-1, -2],   // further up-left
                    [1, -2]     // further up-right
                ];
                
                for (const [dx, dy] of gasDirections) {
                    const newX = x + dx;
                    const newY = y + dy;
                    
                    if (newX >= 0 && newX < cols && 
                        newY >= 0 && newY < rows && 
                        grid[newY][newX].type === 'empty') {
                        
                        // Check surrounding cells to simulate leveling
                        const surroundingEmptySpaces = [
                            [newX-1, newY],
                            [newX+1, newY]
                        ].filter(([sx, sy]) => 
                            sx >= 0 && sx < cols && 
                            sy >= 0 && sy < rows && 
                            grid[sy][sx].type === 'empty'
                        );
                        
                        // Move if there are empty spaces around to spread out
                        if (surroundingEmptySpaces.length > 0) {
                            grid[newY][newX] = particle;
                            grid[y][x] = { type: 'empty', color: particleProperties.empty.color };
                            break;
                        }
                    }
                }
            }
        }
    }
}

function createExplosion(x, y) {
    const explosionRadius = 10;
    const gasDensity = 0.7; // Probability of creating gas
    
    for (let dy = -explosionRadius; dy <= explosionRadius; dy++) {
        for (let dx = -explosionRadius; dx <= explosionRadius; dx++) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            const newX = x + dx;
            const newY = y + dy;
            
            // Check if within grid and explosion radius
            if (newX >= 0 && newX < cols && 
                newY >= 0 && newY < rows && 
                distance <= explosionRadius) {
                
                // Randomize explosion effects
                if (Math.random() < 0.8) {
                    grid[newY][newX] = { type: 'empty', color: particleProperties.empty.color };
                }
                
                // Create CO2 gas with variable density
                if (Math.random() < gasDensity) {
                    grid[newY][newX] = { 
                        type: 'co2', 
                        color: particleProperties.co2.color 
                    };
                }
            }
        }
    }
}

function resizeGrid(newGrid, newCols, newRows) {
    grid = newGrid;
    cols = newCols;
    rows = newRows;
}
