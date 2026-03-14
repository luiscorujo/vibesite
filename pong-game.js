// Pong Multiplayer Game using WebRTC (PeerJS)
class PongGame {
    constructor() {
        this.canvas = document.getElementById('pong-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlay = document.getElementById('pong-overlay');
        this.instructions = document.getElementById('pong-instructions');
        this.playBtn = document.getElementById('play-btn');
        this.yourScoreElement = document.getElementById('your-score');
        this.opponentScoreElement = document.getElementById('opponent-score');
        this.matchScoreElement = document.getElementById('match-score');
        
        this.peer = null;
        this.conn = null;
        this.isHost = false;
        this.connected = false;
        this.ready = false;
        this.opponentReady = false;
        this.gameStarted = false;
        
        // Match tracking (best of 5)
        this.yourWins = 0;
        this.opponentWins = 0;
        this.maxWins = 3; // First to 3 wins (best of 5)
        
        this.frameCount = 0;
        this.matchEnded = false;
        this.setupCanvas();
        this.setupEventListeners();
        this.reset();
        this.animationId = null;
        this.gameLoop();
    }
    
    setupCanvas() {
        const container = this.canvas.parentElement;
        if (container) {
            this.canvas.width = container.clientWidth;
            this.canvas.height = 400;
            if (window.innerWidth < 768) {
                this.canvas.height = 300;
            }
        }
    }
    
    setupEventListeners() {
        // Setup buttons
        document.getElementById('create-room-btn').addEventListener('click', () => this.createRoom());
        document.getElementById('join-room-btn').addEventListener('click', () => this.showJoinInterface());
        document.getElementById('connect-btn').addEventListener('click', () => this.joinRoom());
        document.getElementById('copy-code-btn').addEventListener('click', () => this.copyRoomCode());
        this.playBtn.addEventListener('click', () => this.setReady());
        
        // Paddle controls
        document.addEventListener('keydown', (e) => {
            if (!this.gameStarted) return;
            
            if (this.isHost) {
                // Host controls left paddle (W/S or Arrow Up/Down)
                if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
                    this.leftPaddle.dy = -5;
                    this.sendPaddleUpdate();
                } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
                    this.leftPaddle.dy = 5;
                    this.sendPaddleUpdate();
                }
            } else {
                // Joiner controls right paddle (W/S or Arrow Up/Down)
                if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
                    this.rightPaddle.dy = -5;
                    this.sendPaddleUpdate();
                } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
                    this.rightPaddle.dy = 5;
                    this.sendPaddleUpdate();
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (!this.gameStarted) return;
            
            if (e.key === 'w' || e.key === 'W' || e.key === 's' || e.key === 'S' || 
                e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                if (this.isHost) {
                    this.leftPaddle.dy = 0;
                } else {
                    this.rightPaddle.dy = 0;
                }
                this.sendPaddleUpdate();
            }
        });
        
        // Touch controls for mobile
        let touchStartY = 0;
        this.canvas.addEventListener('touchstart', (e) => {
            if (!this.gameStarted) return;
            e.preventDefault();
            touchStartY = e.touches[0].clientY;
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.gameStarted) return;
            e.preventDefault();
            const touchY = e.touches[0].clientY;
            const deltaY = touchY - touchStartY;
            
            if (this.isHost) {
                this.leftPaddle.dy = deltaY > 0 ? 5 : -5;
            } else {
                this.rightPaddle.dy = deltaY > 0 ? 5 : -5;
            }
            this.sendPaddleUpdate();
            touchStartY = touchY;
        });
        
        this.canvas.addEventListener('touchend', () => {
            if (!this.gameStarted) return;
            if (this.isHost) {
                this.leftPaddle.dy = 0;
            } else {
                this.rightPaddle.dy = 0;
            }
            this.sendPaddleUpdate();
        });
        
        window.addEventListener('resize', () => {
            this.setupCanvas();
        });
    }
    
    createRoom() {
        this.isHost = true;
        document.getElementById('room-interface').classList.remove('hidden');
        document.getElementById('join-interface').classList.add('hidden');
        
        this.peer = new Peer({
            debug: 2,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            }
        });
        
        this.peer.on('open', (id) => {
            document.getElementById('room-code-text').textContent = id;
            this.updateStatus('Waiting for player to join...', 'waiting');
            this.instructions.textContent = 'Share the room code with your friend!';
        });
        
        this.peer.on('connection', (conn) => {
            this.conn = conn;
            this.setupConnection();
        });
        
        this.peer.on('error', (err) => {
            console.error('Peer error:', err);
            this.updateStatus('Connection error. Please try again.', 'error');
        });
    }
    
    showJoinInterface() {
        this.isHost = false;
        document.getElementById('room-interface').classList.remove('hidden');
        document.getElementById('join-interface').classList.remove('hidden');
        document.getElementById('room-code-display').classList.add('hidden');
    }
    
    joinRoom() {
        const roomCode = document.getElementById('room-code-input').value.trim();
        if (!roomCode) {
            alert('Please enter a room code');
            return;
        }
        
        this.updateStatus('Connecting...', 'waiting');
        
        this.peer = new Peer({
            debug: 2,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            }
        });
        
        this.peer.on('open', () => {
            this.conn = this.peer.connect(roomCode);
            this.setupConnection();
        });
        
        this.peer.on('error', (err) => {
            console.error('Peer error:', err);
            this.updateStatus('Connection error. Please check the room code.', 'error');
        });
    }
    
    setupConnection() {
        this.conn.on('open', () => {
            this.connected = true;
            this.updateStatus('Connected! Click Play when ready', 'connected');
            this.instructions.textContent = 'Click Play when you\'re ready!';
            this.playBtn.classList.remove('hidden');
            
            // Sync initial game state
            if (this.isHost) {
                this.sendGameState();
            }
        });
        
        this.conn.on('data', (data) => {
            this.handleReceivedData(data);
        });
        
        this.conn.on('close', () => {
            this.connected = false;
            this.updateStatus('Connection lost', 'error');
        });
        
        this.conn.on('error', (err) => {
            console.error('Connection error:', err);
            this.updateStatus('Connection error', 'error');
        });
    }
    
    handleReceivedData(data) {
        if (data.type === 'ready') {
            this.opponentReady = true;
            this.checkBothReady();
        } else if (data.type === 'gameState') {
            if (!this.isHost) {
                this.syncGameState(data.state);
            }
        } else if (data.type === 'paddleUpdate') {
            if (this.isHost) {
                // Update right paddle (joiner's paddle)
                this.rightPaddle.y = data.y;
                this.rightPaddle.dy = data.dy;
            } else {
                // Update left paddle (host's paddle)
                this.leftPaddle.y = data.y;
                this.leftPaddle.dy = data.dy;
            }
        } else if (data.type === 'ballUpdate') {
            if (!this.isHost) {
                // Sync ball from host
                this.ball.x = data.x;
                this.ball.y = data.y;
                this.ball.dx = data.dx;
                this.ball.dy = data.dy;
            }
        } else if (data.type === 'score') {
            if (this.isHost) {
                this.rightScore = data.score;
            } else {
                this.leftScore = data.score;
            }
            this.updateScores();
        } else if (data.type === 'matchWin') {
            this.opponentWins = data.wins;
            this.updateMatchScore();
            this.checkMatchEnd();
        } else if (data.type === 'roundReset') {
            // Reset round when opponent scores
            if (!this.isHost) {
                this.leftScore = 0;
                this.rightScore = 0;
                this.updateScores();
            }
        }
    }
    
    setReady() {
        if (!this.connected) return;
        
        this.ready = true;
        this.playBtn.textContent = 'Waiting for opponent...';
        this.playBtn.disabled = true;
        
        if (this.conn && this.connected) {
            this.conn.send({ type: 'ready' });
        }
        
        this.checkBothReady();
    }
    
    checkBothReady() {
        if (this.ready && this.opponentReady && !this.gameStarted) {
            this.startGame();
        }
    }
    
    startGame() {
        this.gameStarted = true;
        this.overlay.classList.add('hidden');
        this.resetRound();
    }
    
    sendPaddleUpdate() {
        if (!this.conn || !this.connected || !this.gameStarted) return;
        
        const paddle = this.isHost ? this.leftPaddle : this.rightPaddle;
        this.conn.send({
            type: 'paddleUpdate',
            y: paddle.y,
            dy: paddle.dy
        });
    }
    
    sendGameState() {
        if (!this.conn || !this.connected || !this.gameStarted) return;
        
        this.conn.send({
            type: 'gameState',
            state: {
                ball: {
                    x: this.ball.x,
                    y: this.ball.y,
                    dx: this.ball.dx,
                    dy: this.ball.dy
                },
                leftPaddle: {
                    y: this.leftPaddle.y,
                    dy: this.leftPaddle.dy
                },
                rightPaddle: {
                    y: this.rightPaddle.y,
                    dy: this.rightPaddle.dy
                },
                leftScore: this.leftScore,
                rightScore: this.rightScore
            }
        });
    }
    
    syncGameState(state) {
        if (!this.isHost) {
            this.ball.x = state.ball.x;
            this.ball.y = state.ball.y;
            this.ball.dx = state.ball.dx;
            this.ball.dy = state.ball.dy;
            this.leftPaddle.y = state.leftPaddle.y;
            this.rightPaddle.y = state.rightPaddle.y;
            this.leftScore = state.leftScore;
            this.rightScore = state.rightScore;
            this.updateScores();
        }
    }
    
    copyRoomCode() {
        const code = document.getElementById('room-code-text').textContent;
        navigator.clipboard.writeText(code).then(() => {
            const btn = document.getElementById('copy-code-btn');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        });
    }
    
    updateStatus(text, type) {
        const statusText = document.getElementById('status-text');
        if (statusText) {
            statusText.textContent = text;
            const statusEl = document.getElementById('connection-status');
            statusEl.classList.remove('hidden', 'connected', 'waiting', 'error');
            statusEl.classList.add(type);
        }
    }
    
    reset() {
        this.leftPaddle = {
            x: 10,
            y: this.canvas.height / 2 - 50,
            width: 10,
            height: 100,
            dy: 0
        };
        
        this.rightPaddle = {
            x: this.canvas.width - 20,
            y: this.canvas.height / 2 - 50,
            width: 10,
            height: 100,
            dy: 0
        };
        
        this.ball = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            radius: 10,
            dx: 4,
            dy: 4
        };
        
        this.leftScore = 0;
        this.rightScore = 0;
        this.yourWins = 0;
        this.opponentWins = 0;
        
        this.overlay.classList.remove('hidden');
        this.updateScores();
        this.updateMatchScore();
    }
    
    resetRound() {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        this.ball.dx = (Math.random() > 0.5 ? 1 : -1) * 4;
        this.ball.dy = (Math.random() > 0.5 ? 1 : -1) * 4;
        
        this.leftPaddle.y = this.canvas.height / 2 - 50;
        this.rightPaddle.y = this.canvas.height / 2 - 50;
        this.leftPaddle.dy = 0;
        this.rightPaddle.dy = 0;
        
        this.leftScore = 0;
        this.rightScore = 0;
        this.updateScores();
    }
    
    update() {
        if (!this.gameStarted) return;
        
        // Host controls the ball physics
        if (this.isHost) {
            // Update ball
            this.ball.x += this.ball.dx;
            this.ball.y += this.ball.dy;
            
            // Ball collision with top/bottom walls
            if (this.ball.y - this.ball.radius <= 0 || this.ball.y + this.ball.radius >= this.canvas.height) {
                this.ball.dy = -this.ball.dy;
            }
            
            // Update paddles
            this.leftPaddle.y += this.leftPaddle.dy;
            this.rightPaddle.y += this.rightPaddle.dy;
            
            // Keep paddles in bounds
            if (this.leftPaddle.y < 0) this.leftPaddle.y = 0;
            if (this.leftPaddle.y + this.leftPaddle.height > this.canvas.height) {
                this.leftPaddle.y = this.canvas.height - this.leftPaddle.height;
            }
            if (this.rightPaddle.y < 0) this.rightPaddle.y = 0;
            if (this.rightPaddle.y + this.rightPaddle.height > this.canvas.height) {
                this.rightPaddle.y = this.canvas.height - this.rightPaddle.height;
            }
            
            // Ball collision with paddles
            if (this.ball.x - this.ball.radius <= this.leftPaddle.x + this.leftPaddle.width &&
                this.ball.x - this.ball.radius >= this.leftPaddle.x &&
                this.ball.y >= this.leftPaddle.y &&
                this.ball.y <= this.leftPaddle.y + this.leftPaddle.height) {
                this.ball.dx = Math.abs(this.ball.dx);
                this.ball.dy = (this.ball.y - (this.leftPaddle.y + this.leftPaddle.height / 2)) * 0.1;
            }
            
            if (this.ball.x + this.ball.radius >= this.rightPaddle.x &&
                this.ball.x + this.ball.radius <= this.rightPaddle.x + this.rightPaddle.width &&
                this.ball.y >= this.rightPaddle.y &&
                this.ball.y <= this.rightPaddle.y + this.rightPaddle.height) {
                this.ball.dx = -Math.abs(this.ball.dx);
                this.ball.dy = (this.ball.y - (this.rightPaddle.y + this.rightPaddle.height / 2)) * 0.1;
            }
            
            // Score points
            if (this.ball.x < 0) {
                this.rightScore++;
                this.updateScores();
                if (this.conn && this.connected) {
                    this.conn.send({ type: 'score', score: this.rightScore });
                    this.conn.send({ type: 'roundReset' });
                }
                this.resetRound();
            } else if (this.ball.x > this.canvas.width) {
                this.leftScore++;
                this.updateScores();
                this.resetRound();
            }
            
            // Check round win (first to 5 points in a round)
            if (this.leftScore >= 5 || this.rightScore >= 5) {
                const roundWinner = this.leftScore >= 5 ? 'left' : 'right';
                
                if (roundWinner === 'left') {
                    this.yourWins++;
                } else {
                    this.opponentWins++;
                }
                this.updateMatchScore();
                
                if (this.conn && this.connected) {
                    this.conn.send({ type: 'matchWin', wins: this.opponentWins });
                }
                
                this.checkMatchEnd();
                if (!this.matchEnded) {
                    // Reset scores for next round
                    this.leftScore = 0;
                    this.rightScore = 0;
                    this.updateScores();
                    setTimeout(() => this.resetRound(), 2000);
                }
            }
            
            // Send ball update to opponent
            if (this.frameCount % 2 === 0) {
                this.conn.send({
                    type: 'ballUpdate',
                    x: this.ball.x,
                    y: this.ball.y,
                    dx: this.ball.dx,
                    dy: this.ball.dy
                });
            }
            
            // Send full game state periodically
            if (this.frameCount % 30 === 0) {
                this.sendGameState();
            }
        } else {
            // Joiner: update own paddle
            const paddle = this.rightPaddle;
            paddle.y += paddle.dy;
            if (paddle.y < 0) paddle.y = 0;
            if (paddle.y + paddle.height > this.canvas.height) {
                paddle.y = this.canvas.height - paddle.height;
            }
        }
        
        this.frameCount++;
    }
    
    checkMatchEnd() {
        if (this.yourWins >= this.maxWins || this.opponentWins >= this.maxWins) {
            this.matchEnded = true;
            this.gameStarted = false;
            
            // Small delay to show final score
            setTimeout(() => {
                this.overlay.classList.remove('hidden');
                
                const startScreen = this.overlay.querySelector('.game-start-screen');
                const won = this.yourWins >= this.maxWins;
                
                startScreen.innerHTML = `
                    <h2>${won ? 'You Win! 🎉' : 'You Lose! 😢'}</h2>
                    <p class="final-score">Match Score: ${this.yourWins} - ${this.opponentWins}</p>
                    <button class="restart-btn" onclick="location.reload()">Play Again</button>
                `;
            }, 500);
        }
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw center line
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Draw paddles
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(this.leftPaddle.x, this.leftPaddle.y, this.leftPaddle.width, this.leftPaddle.height);
        this.ctx.fillRect(this.rightPaddle.x, this.rightPaddle.y, this.rightPaddle.width, this.rightPaddle.height);
        
        // Draw ball
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw scores
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.leftScore, this.canvas.width / 4, 50);
        this.ctx.fillText(this.rightScore, (3 * this.canvas.width) / 4, 50);
    }
    
    updateScores() {
        if (this.isHost) {
            this.yourScoreElement.textContent = this.leftScore;
            this.opponentScoreElement.textContent = this.rightScore;
        } else {
            this.yourScoreElement.textContent = this.rightScore;
            this.opponentScoreElement.textContent = this.leftScore;
        }
    }
    
    updateMatchScore() {
        this.matchScoreElement.textContent = `${this.yourWins} - ${this.opponentWins}`;
    }
    
    gameLoop() {
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize Pong game when DOM is loaded
let pongGame;
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        pongGame = new PongGame();
    }, 100);
});
