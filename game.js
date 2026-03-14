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
    }
    
    setupCanvas() {
        // Set canvas size based on container
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = 400;
        
        // Adjust for mobile
        if (window.innerWidth < 768) {
            this.canvas.height = 300;
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
            gravity: 0.5,
            jumpPower: -8
        };
        
        this.pipes = [];
        this.score = 0;
        this.started = false;
        this.gameOver = false;
        this.frameCount = 0;
        
        this.overlay.classList.remove('hidden');
        this.updateScore();
    }
    
    start() {
        this.started = true;
        this.gameOver = false;
        this.overlay.classList.add('hidden');
        this.gameLoop();
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
        
        // Create new pipes
        if (this.frameCount % 100 === 0) {
            this.createPipe();
        }
        
        // Update pipes
        this.pipes.forEach(pipe => {
            pipe.x -= 3;
        });
        
        // Remove off-screen pipes
        this.pipes = this.pipes.filter(pipe => pipe.x + pipe.width > -50);
        
        // Check collisions
        this.checkCollisions();
        
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
        const gap = 150;
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
        // Ground and ceiling collision
        if (this.bird.y + this.bird.radius > this.canvas.height || 
            this.bird.y - this.bird.radius < 0) {
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
        this.gameOver = true;
        this.saveHighScore();
        this.overlay.classList.remove('hidden');
        const startScreen = this.overlay.querySelector('.game-start-screen');
        startScreen.innerHTML = `
            <h2>Game Over!</h2>
            <p>Score: ${this.score}</p>
            <p>Press SPACE or TAP to play again</p>
        `;
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw ground
        this.ctx.fillStyle = '#90EE90';
        this.ctx.fillRect(0, this.canvas.height - 30, this.canvas.width, 30);
        
        // Draw grass pattern
        this.ctx.fillStyle = '#7CCD7C';
        for (let i = 0; i < this.canvas.width; i += 20) {
            this.ctx.fillRect(i, this.canvas.height - 30, 10, 5);
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
        if (!this.started || this.gameOver) return;
        
        this.update();
        this.draw();
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new FlappyBird();
});
