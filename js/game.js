class Particle {
    constructor(type) {
        this.type = type;
        this.color = PARTICLE_PROPERTIES[type].color;
    }
}

class SandboxGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.displayWidth = 800;
        this.displayHeight = 600;
        this.cellSize = 4;
        this.isDrawing = false;
        this.currentElement = 'sand';
        this.cursorSize = 1;
        
        // Grid size properties
        this.pendingWidth = 800;
        this.pendingHeight = 600;
        this.pendingCellSize = 4;
        
        // FPS tracking
        this.currentFPS = 0;
        this.frameCount = 0;
        this.lastFPSUpdate = performance.now();
        
        // Initialize physics worker
        this.physicsWorker = new Worker('/js/physics-worker.js');
        this.physicsWorker.onmessage = this.handleWorkerMessage.bind(this);
        
        this.setupCanvas();
        this.setupGrid();
        this.setupEventListeners();
        this.startGameLoop();
    }

    handleWorkerMessage(e) {
        const { type, grid, currentTPS } = e.data;
        switch(type) {
            case 'gridUpdate':
                this.grid = grid;
                break;
            case 'tpsUpdate':
                document.getElementById('current-tps').textContent = currentTPS;
                break;
        }
    }

    setupCanvas() {
        // Set internal resolution
        this.canvas.width = this.pendingWidth;
        this.canvas.height = this.pendingHeight;
        this.cellSize = this.pendingCellSize;
        this.cols = Math.floor(this.canvas.width / this.cellSize);
        this.rows = Math.floor(this.canvas.height / this.cellSize);
        
        // Enable smooth scaling
        this.ctx.imageSmoothingEnabled = false;
        
        // Set display size
        this.canvas.style.width = this.displayWidth + 'px';
        this.canvas.style.height = this.displayHeight + 'px';
    }

    setupGrid() {
        this.grid = Array(this.rows).fill().map(() => 
            Array(this.cols).fill().map(() => ({ type: 'empty', color: PARTICLE_PROPERTIES.empty.color }))
        );

        // Initialize worker with grid data
        this.physicsWorker.postMessage({
            type: 'init',
            data: {
                grid: this.grid,
                cols: this.cols,
                rows: this.rows,
                particleProperties: PARTICLE_PROPERTIES
            }
        });
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
            const newTPS = parseInt(e.target.value);
            this.physicsWorker.postMessage({
                type: 'setTPS',
                data: { tps: newTPS }
            });
            tpsValue.textContent = newTPS;
            setTPS.textContent = newTPS;
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
            this.applyGridResize();
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
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const centerX = Math.floor((e.clientX - rect.left) * scaleX / this.cellSize);
        const centerY = Math.floor((e.clientY - rect.top) * scaleY / this.cellSize);
        
        const radius = Math.floor(this.cursorSize / 2);
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                
                if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
                    const particle = { type: this.currentElement, color: PARTICLE_PROPERTIES[this.currentElement].color };
                    this.grid[y][x] = particle;
                    this.physicsWorker.postMessage({
                        type: 'setParticle',
                        data: { x, y, particle }
                    });
                }
            }
        }
    }

    applyGridResize() {
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

        // Update worker with new grid
        this.physicsWorker.postMessage({
            type: 'resize',
            data: {
                newGrid: this.grid,
                newCols: this.cols,
                newRows: this.rows
            }
        });
    }

    startGameLoop() {
        const gameLoop = () => {
            // FPS counting
            this.frameCount++;
            const now = performance.now();
            if (now - this.lastFPSUpdate >= 1000) {
                this.currentFPS = Math.round(this.frameCount * 1000 / (now - this.lastFPSUpdate));
                document.getElementById('current-fps').textContent = this.currentFPS;
                this.frameCount = 0;
                this.lastFPSUpdate = now;
            }

            // Render as fast as possible
            this.render();
            requestAnimationFrame(gameLoop);
        };

        gameLoop();
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
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new SandboxGame();
});
