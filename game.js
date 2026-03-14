// Flappy Bird Game
class FlappyBird {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlay = document.getElementById('game-overlay');
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('high-score');
        this.fullscreenBtn = document.getElementById('fullscreen-btn');
        this.gameWrapper = document.querySelector('.game-wrapper');
        
        this.setupCanvas();
        this.loadHighScore();
        this.setupEventListeners();
        this.reset();
        // Start the game loop
        this.animationId = null;
        this.gameLoop();
    }
    
    setupCanvas() {
        // Set canvas size based on container
        const container = this.canvas.parentElement;
        if (container) {
            this.canvas.width = container.clientWidth;
            this.canvas.height = 400;
            
            // Adjust for mobile
            if (window.innerWidth < 768) {
                this.canvas.height = 300;
            }
            
            // Reset bird position if it exists
            if (this.bird) {
                this.bird.x = this.canvas.width / 4;
                this.bird.y = this.canvas.height / 2;
            }
        }
    }
    
    setupEventListeners() {
        // Spacebar and touch controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.handleInput();
            }
        });
        
        // Touch controls
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleInput();
        });
        
        this.canvas.addEventListener('click', () => {
            this.handleInput();
        });
        
        // Fullscreen button
        this.fullscreenBtn.addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        // Handle fullscreen change
        document.addEventListener('fullscreenchange', () => {
            this.handleFullscreenChange();
        });
        
        // Resize handler
        window.addEventListener('resize', () => {
            this.setupCanvas();
        });
    }
    
    handleInput() {
        if (!this.started) {
            this.start();
        } else if (!this.gameOver) {
            this.jump();
        } else {
            this.reset();
        }
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.gameWrapper.requestFullscreen().catch(err => {
                console.log('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }
    
    handleFullscreenChange() {
        if (document.fullscreenElement) {
            this.gameWrapper.classList.add('fullscreen');
            this.canvas.height = window.innerHeight;
            this.canvas.width = window.innerWidth;
        } else {
            this.gameWrapper.classList.remove('fullscreen');
            this.setupCanvas();
        }
    }
    
    reset() {
        this.bird = {
            x: this.canvas.width / 4,
            y: this.canvas.height / 2,
            radius: 15,
            velocity: 0,
            gravity: 0.15,
            jumpPower: -5.5
        };
        
        this.pipes = [];
        this.score = 0;
        this.started = false;
        this.gameOver = false;
        this.frameCount = 0;
        
        this.overlay.classList.remove('hidden');
        const startScreen = this.overlay.querySelector('.game-start-screen');
        startScreen.innerHTML = `
            <h2>Flappy Bird</h2>
            <p>Press SPACE or TAP to start</p>
            <p class="instructions">Use SPACE or TAP to fly</p>
        `;
        this.updateScore();
        
        // Ensure game loop is running
        if (!this.animationId) {
            this.gameLoop();
        }
    }
    
    start() {
        this.started = true;
        this.gameOver = false;
        this.frameCount = 0;
        this.pipes = [];
        this.bird.y = this.canvas.height / 2;
        this.bird.velocity = 0;
        this.overlay.classList.add('hidden');
    }
    
    jump() {
        this.bird.velocity = this.bird.jumpPower;
    }
    
    update() {
        if (!this.started || this.gameOver) return;
        
        this.frameCount++;
        
        // Update bird
        this.bird.velocity += this.bird.gravity;
        this.bird.y += this.bird.velocity;
        
        // Check collisions BEFORE clamping (so ground collision is detected)
        this.checkCollisions();
        
        // If game over was triggered, don't continue
        if (this.gameOver) return;
        
        // Clamp bird position to prevent visual glitches (only if not hitting ground/ceiling)
        const groundY = this.canvas.height - 30;
        const maxY = groundY - this.bird.radius;
        const minY = this.bird.radius;
        if (this.bird.y > maxY) this.bird.y = maxY;
        if (this.bird.y < minY) this.bird.y = minY;
        
        // Create new pipes every 90 frames (adjust for difficulty)
        if (this.frameCount % 90 === 0) {
            this.createPipe();
        }
        
        // Update pipes (move them left)
        this.pipes.forEach(pipe => {
            pipe.x -= 3;
        });
        
        // Remove off-screen pipes
        this.pipes = this.pipes.filter(pipe => pipe.x + pipe.width > -50);
        
        // Update score
        this.pipes.forEach(pipe => {
            if (!pipe.scored && pipe.x + pipe.width < this.bird.x) {
                pipe.scored = true;
                this.score++;
                this.updateScore();
            }
        });
    }
    
    createPipe() {
        const gap = 180;
        const minHeight = 50;
        const maxHeight = this.canvas.height - gap - minHeight;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        
        this.pipes.push({
            x: this.canvas.width,
            topHeight: topHeight,
            bottomY: topHeight + gap,
            width: 60,
            scored: false
        });
    }
    
    checkCollisions() {
        // Ground collision (account for ground height of 30px)
        const groundY = this.canvas.height - 30;
        if (this.bird.y + this.bird.radius >= groundY || 
            this.bird.y - this.bird.radius <= 0) {
            this.endGame();
            return;
        }
        
        // Pipe collision
        for (let pipe of this.pipes) {
            if (this.bird.x + this.bird.radius > pipe.x &&
                this.bird.x - this.bird.radius < pipe.x + pipe.width) {
                if (this.bird.y - this.bird.radius < pipe.topHeight ||
                    this.bird.y + this.bird.radius > pipe.bottomY) {
                    this.endGame();
                    return;
                }
            }
        }
    }
    
    endGame() {
        if (this.gameOver) return; // Prevent multiple calls
        
        this.gameOver = true;
        this.saveHighScore();
        this.overlay.classList.remove('hidden');
        const startScreen = this.overlay.querySelector('.game-start-screen');
        startScreen.innerHTML = `
            <h2>Game Over!</h2>
            <p class="final-score">Score: ${this.score}</p>
            <p class="high-score-text">High Score: ${this.highScore}</p>
            <button class="restart-btn">Play Again</button>
            <p class="instructions">Or press SPACE/TAP to restart</p>
        `;
        
        // Add restart button listener
        const restartBtn = startScreen.querySelector('.restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.reset();
            });
        }
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw ground base (darker green)
        this.ctx.fillStyle = '#228B22';
        this.ctx.fillRect(0, this.canvas.height - 30, this.canvas.width, 30);
        
        // Draw grass layer (lighter green)
        this.ctx.fillStyle = '#32CD32';
        this.ctx.fillRect(0, this.canvas.height - 25, this.canvas.width, 25);
        
        // Draw individual grass blades
        this.ctx.fillStyle = '#228B22';
        this.ctx.strokeStyle = '#228B22';
        this.ctx.lineWidth = 2;
        
        for (let i = 0; i < this.canvas.width; i += 8) {
            const grassY = this.canvas.height - 25;
            const bladeHeight = 5 + Math.random() * 8;
            const bladeX = i + Math.random() * 4;
            
            // Draw grass blade
            this.ctx.beginPath();
            this.ctx.moveTo(bladeX, grassY);
            this.ctx.lineTo(bladeX - 1, grassY - bladeHeight);
            this.ctx.lineTo(bladeX + 1, grassY - bladeHeight);
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        // Add some texture with small dots
        this.ctx.fillStyle = '#2E8B57';
        for (let i = 0; i < this.canvas.width; i += 15) {
            const dotX = i + Math.random() * 10;
            const dotY = this.canvas.height - 20 + Math.random() * 5;
            this.ctx.beginPath();
            this.ctx.arc(dotX, dotY, 1, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw pipes
        this.ctx.fillStyle = '#228B22';
        this.pipes.forEach(pipe => {
            // Top pipe
            this.ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
            // Bottom pipe
            this.ctx.fillRect(pipe.x, pipe.bottomY, pipe.width, this.canvas.height - pipe.bottomY);
            
            // Pipe caps
            this.ctx.fillStyle = '#32CD32';
            this.ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, pipe.width + 10, 20);
            this.ctx.fillRect(pipe.x - 5, pipe.bottomY, pipe.width + 10, 20);
            this.ctx.fillStyle = '#228B22';
        });
        
        // Draw bird
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(this.bird.x, this.bird.y, this.bird.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Bird eye
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(this.bird.x + 5, this.bird.y - 3, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Bird beak
        this.ctx.fillStyle = '#FF8C00';
        this.ctx.beginPath();
        this.ctx.moveTo(this.bird.x + this.bird.radius, this.bird.y);
        this.ctx.lineTo(this.bird.x + this.bird.radius + 8, this.bird.y - 3);
        this.ctx.lineTo(this.bird.x + this.bird.radius + 8, this.bird.y + 3);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    updateScore() {
        this.scoreElement.textContent = this.score;
        this.highScoreElement.textContent = this.highScore;
    }
    
    saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('flappyBirdHighScore', this.highScore);
            this.updateScore();
        }
    }
    
    loadHighScore() {
        this.highScore = parseInt(localStorage.getItem('flappyBirdHighScore')) || 0;
        this.updateScore();
    }
    
    gameLoop() {
        if (this.started && !this.gameOver) {
            this.update();
        }
        this.draw();
        
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when DOM is loaded
let game;
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure canvas is rendered
    setTimeout(() => {
        game = new FlappyBird();
    }, 100);
});
