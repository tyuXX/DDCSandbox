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
    
    for (let y = rows - 1; y >= 0; y--) {
        for (let x = 0; x < cols; x++) {
            const particle = oldGrid[y][x];
            
            if (particle.type === 'empty' || !particleProperties[particle.type].movable) continue;

            if (particleProperties[particle.type].gravity) {
                // Check below
                if (y < rows - 1 && grid[y + 1][x].type === 'empty') {
                    grid[y + 1][x] = particle;
                    grid[y][x] = { type: 'empty', color: particleProperties.empty.color };
                    continue;
                }

                // If it's a liquid, try to move diagonally or sideways
                if (particleProperties[particle.type].liquid) {
                    const directions = [[-1, 0], [1, 0]];
                    for (const [dx, dy] of directions) {
                        const newX = x + dx;
                        if (newX >= 0 && newX < cols && 
                            grid[y][newX].type === 'empty') {
                            grid[y][newX] = particle;
                            grid[y][x] = { type: 'empty', color: particleProperties.empty.color };
                            break;
                        }
                    }
                }
            }
            
            // Gas behavior (floats upwards and spreads)
            if (particleProperties[particle.type].gas) {
                // Try to move up
                if (y > 0 && grid[y - 1][x].type === 'empty') {
                    grid[y - 1][x] = particle;
                    grid[y][x] = { type: 'empty', color: particleProperties.empty.color };
                    continue;
                }
                
                // If can't go up, try to spread sideways
                const directions = [[-1, 0], [1, 0]];
                for (const [dx, dy] of directions) {
                    const newX = x + dx;
                    if (newX >= 0 && newX < cols && 
                        grid[y][newX].type === 'empty') {
                        grid[y][newX] = particle;
                        grid[y][x] = { type: 'empty', color: particleProperties.empty.color };
                        break;
                    }
                }
            }

            // Handle TNT explosions
            if (particle.type === 'tnt') {
                if (Math.random() < 0.001) {
                    createExplosion(x, y);
                }
            }
        }
    }
}

function createExplosion(x, y) {
    const explosionRadius = 10;
    
    for (let dy = -explosionRadius; dy <= explosionRadius; dy++) {
        for (let dx = -explosionRadius; dx <= explosionRadius; dx++) {
            const newX = x + dx;
            const newY = y + dy;
            
            // Check if within grid and within explosion radius
            if (newX >= 0 && newX < cols && 
                newY >= 0 && newY < rows && 
                Math.sqrt(dx*dx + dy*dy) <= explosionRadius) {
                
                // Randomly create CO2 gas around the explosion
                if (Math.random() < 0.5) {
                    grid[newY][newX] = { 
                        type: 'co2', 
                        color: particleProperties.co2.color 
                    };
                } else {
                    grid[newY][newX] = { 
                        type: 'empty', 
                        color: particleProperties.empty.color 
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
