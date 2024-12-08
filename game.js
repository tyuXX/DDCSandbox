class Particle {
    constructor(type) {
        this.type = type;
        this.color = PARTICLE_PROPERTIES[type].color;
    }
}

const PARTICLE_PROPERTIES = {
    sand: {
        color: '#e3c078',
        gravity: true,
        movable: true,
        name: 'Sand'
    },
    water: {
        color: '#4287f5',
        gravity: true,
        movable: true,
        liquid: true,
        name: 'Water'
    },
    wall: {
        color: '#666666',
        gravity: false,
        movable: false,
        name: 'Wall'
    },
    tnt: {
        color: '#ff0000',
        gravity: true,
        movable: true,
        explosive: true,
        name: 'TNT'
    },
    empty: {
        color: '#000000',
        name: 'Empty'
    }
};

class SandboxGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.cellSize = 4;
        this.isDrawing = false;
        this.currentElement = 'sand';
        this.cursorSize = 1;
        
        // Grid size properties
        this.pendingWidth = 800;
        this.pendingHeight = 600;
        this.pendingCellSize = 4;
        
        // TPS related properties
        this.targetTPS = 60;
        this.currentTPS = 0;
        this.lastTickTime = performance.now();
        this.tickCount = 0;
        this.lastTPSUpdate = performance.now();
        this.msPerTick = 1000 / this.targetTPS;
        
        this.setupCanvas();
        this.setupGrid();
        this.setupEventListeners();
        this.startGameLoop();
    }

    setupCanvas() {
        this.canvas.width = this.pendingWidth;
        this.canvas.height = this.pendingHeight;
        this.cellSize = this.pendingCellSize;
        this.cols = Math.floor(this.canvas.width / this.cellSize);
        this.rows = Math.floor(this.canvas.height / this.cellSize);
    }

    setupGrid() {
        this.grid = Array(this.rows).fill().map(() => 
            Array(this.cols).fill().map(() => new Particle('empty'))
        );
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDrawing = true;
            this.draw(e);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDrawing) this.draw(e);
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDrawing = false;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isDrawing = false;
        });

        // Create element buttons dynamically
        const elementSelector = document.querySelector('.element-selector');
        Object.entries(PARTICLE_PROPERTIES).forEach(([type, props]) => {
            if (type !== 'empty') {
                const button = document.createElement('button');
                button.className = 'element-btn' + (type === 'sand' ? ' active' : '');
                button.dataset.element = type;
                button.textContent = props.name;
                button.style.backgroundColor = props.color;
                button.style.color = this.getContrastColor(props.color);
                elementSelector.appendChild(button);
                
                button.addEventListener('click', () => {
                    document.querySelector('.element-btn.active')?.classList.remove('active');
                    button.classList.add('active');
                    this.currentElement = type;
                });
            }
        });

        // Add cursor size control
        const sizeSlider = document.getElementById('cursor-size');
        const sizeValue = document.getElementById('size-value');
        
        sizeSlider.addEventListener('input', (e) => {
            this.cursorSize = parseInt(e.target.value);
            sizeValue.textContent = this.cursorSize;
        });

        // Add TPS control
        const tpsSlider = document.getElementById('target-tps');
        const tpsValue = document.getElementById('tps-value');
        const setTPS = document.getElementById('set-tps');
        
        tpsSlider.addEventListener('input', (e) => {
            this.targetTPS = parseInt(e.target.value);
            this.msPerTick = 1000 / this.targetTPS;
            tpsValue.textContent = this.targetTPS;
            setTPS.textContent = this.targetTPS;
        });

        // Add grid size controls
        const cellSizeSlider = document.getElementById('cell-size');
        const cellSizeValue = document.getElementById('cell-size-value');
        const widthSlider = document.getElementById('canvas-width');
        const widthValue = document.getElementById('width-value');
        const heightSlider = document.getElementById('canvas-height');
        const heightValue = document.getElementById('height-value');
        const applyButton = document.getElementById('apply-size');

        cellSizeSlider.addEventListener('input', (e) => {
            this.pendingCellSize = parseInt(e.target.value);
            cellSizeValue.textContent = this.pendingCellSize;
        });

        widthSlider.addEventListener('input', (e) => {
            this.pendingWidth = parseInt(e.target.value);
            widthValue.textContent = this.pendingWidth;
        });

        heightSlider.addEventListener('input', (e) => {
            this.pendingHeight = parseInt(e.target.value);
            heightValue.textContent = this.pendingHeight;
        });

        applyButton.addEventListener('click', () => {
            const oldGrid = this.grid;
            const oldCols = this.cols;
            const oldRows = this.rows;
            
            this.setupCanvas();
            this.setupGrid();
            
            // Copy over existing particles where possible
            const copyRows = Math.min(oldRows, this.rows);
            const copyCols = Math.min(oldCols, this.cols);
            
            for (let y = 0; y < copyRows; y++) {
                for (let x = 0; x < copyCols; x++) {
                    this.grid[y][x] = oldGrid[y][x];
                }
            }
        });

        document.getElementById('clear-btn').addEventListener('click', () => {
            this.setupGrid();
        });
    }

    // Helper function to determine text color based on background
    getContrastColor(hexcolor) {
        // Convert hex to RGB
        const r = parseInt(hexcolor.substr(1,2), 16);
        const g = parseInt(hexcolor.substr(3,2), 16);
        const b = parseInt(hexcolor.substr(5,2), 16);
        
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    draw(e) {
        const rect = this.canvas.getBoundingClientRect();
        const centerX = Math.floor((e.clientX - rect.left) / this.cellSize);
        const centerY = Math.floor((e.clientY - rect.top) / this.cellSize);
        
        const radius = Math.floor(this.cursorSize / 2);
        
        // Draw in a square pattern around the cursor
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                
                if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
                    this.grid[y][x] = new Particle(this.currentElement);
                }
            }
        }
    }

    update() {
        for (let y = this.rows - 1; y >= 0; y--) {
            for (let x = 0; x < this.cols; x++) {
                const particle = this.grid[y][x];
                
                if (particle.type === 'empty' || !PARTICLE_PROPERTIES[particle.type].movable) continue;

                if (PARTICLE_PROPERTIES[particle.type].gravity) {
                    // Check below
                    if (y < this.rows - 1 && this.grid[y + 1][x].type === 'empty') {
                        this.grid[y + 1][x] = particle;
                        this.grid[y][x] = new Particle('empty');
                        continue;
                    }

                    // If it's a liquid, try to move diagonally or sideways
                    if (PARTICLE_PROPERTIES[particle.type].liquid) {
                        const directions = [[-1, 0], [1, 0]];
                        for (const [dx, dy] of directions) {
                            const newX = x + dx;
                            if (newX >= 0 && newX < this.cols && 
                                this.grid[y][newX].type === 'empty') {
                                this.grid[y][newX] = particle;
                                this.grid[y][x] = new Particle('empty');
                                break;
                            }
                        }
                    } else {
                        // For sand-like particles, try to move diagonally down
                        const directions = [[-1, 1], [1, 1]];
                        for (const [dx, dy] of directions) {
                            const newX = x + dx;
                            const newY = y + dy;
                            if (newX >= 0 && newX < this.cols && newY < this.rows && 
                                this.grid[newY][newX].type === 'empty') {
                                this.grid[newY][newX] = particle;
                                this.grid[y][x] = new Particle('empty');
                                break;
                            }
                        }
                    }
                }

                // Handle TNT explosions
                if (particle.type === 'tnt') {
                    // Random chance to explode
                    if (Math.random() < 0.001) {
                        this.createExplosion(x, y);
                    }
                }
            }
        }
    }

    createExplosion(x, y) {
        const radius = 10;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= radius) {
                    const newX = x + dx;
                    const newY = y + dy;
                    if (newX >= 0 && newX < this.cols && newY >= 0 && newY < this.rows) {
                        this.grid[newY][newX] = new Particle('empty');
                    }
                }
            }
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const particle = this.grid[y][x];
                if (particle.type !== 'empty') {
                    this.ctx.fillStyle = particle.color;
                    this.ctx.fillRect(
                        x * this.cellSize,
                        y * this.cellSize,
                        this.cellSize,
                        this.cellSize
                    );
                }
            }
        }
    }

    startGameLoop() {
        let lastRenderTime = performance.now();
        let accumulator = 0;

        const gameLoop = () => {
            const currentTime = performance.now();
            const deltaTime = currentTime - lastRenderTime;
            lastRenderTime = currentTime;

            // Add to accumulator
            accumulator += deltaTime;

            // Update physics at fixed timestep
            while (accumulator >= this.msPerTick) {
                this.update();
                accumulator -= this.msPerTick;
                
                // TPS counting
                this.tickCount++;
                if (currentTime - this.lastTPSUpdate >= 1000) {
                    this.currentTPS = Math.round(this.tickCount * 1000 / (currentTime - this.lastTPSUpdate));
                    document.getElementById('current-tps').textContent = this.currentTPS;
                    this.tickCount = 0;
                    this.lastTPSUpdate = currentTime;
                }
            }

            // Render as fast as possible
            this.render();
            requestAnimationFrame(gameLoop);
        };

        gameLoop();
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new SandboxGame();
});
