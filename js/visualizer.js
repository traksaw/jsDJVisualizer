/**
 * DJ Visualizer - P5.js Visualization Engine
 * Handles all visual rendering and effects
 */

class DJVisualizer {
    constructor() {
        this.currentMode = 'spectrum';
        this.audioData = null;
        this.isActive = false;
        
        // Visual parameters
        this.colorScheme = CONFIG.VISUALIZATION.COLOR_SCHEMES.DEFAULT;
        this.particles = [];
        this.trails = [];
        
        // Animation state
        this.animationTime = 0;
        this.rotationSpeed = 0.005;
        
        // Performance tracking
        this.frameRate = 60;
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.fpsBuffer = [];
        
        // Visual smoothing
        this.smoothedSpectrum = new Float32Array(CONFIG.AUDIO.BUFFER_SIZE);
        this.peakHold = new Float32Array(CONFIG.AUDIO.BUFFER_SIZE);
        this.peakDecay = 0.95;
        
        CONFIG.UTILS.log('info', 'DJVisualizer initialized');
    }
    
    /**
     * Initialize visualizer with p5.js
     */
    setup() {
        // Create canvas
        const canvas = createCanvas(
            windowWidth, 
            windowHeight, 
            CONFIG.VISUALIZATION.RENDERER
        );
        
        // Set pixel density for performance
        pixelDensity(CONFIG.VISUALIZATION.PIXEL_DENSITY);
        
        // Set initial styling
        colorMode(RGB, 255);
        
        CONFIG.UTILS.log('info', 'P5.js canvas created', {
            width: windowWidth,
            height: windowHeight,
            renderer: CONFIG.VISUALIZATION.RENDERER
        });
        
        // Initialize particle system
        this._initializeParticleSystem();
    }
    
    /**
     * Initialize particle system
     */
    _initializeParticleSystem() {
        this.particles = [];
        
        CONFIG.UTILS.log('debug', 'Particle system initialized');
    }
    
    /**
     * Main render loop
     */
    draw() {
        // Update animation time
        this.animationTime += CONFIG.VISUALIZATION.DEFAULT_ANIMATION_SPEED;
        
        // Track FPS
        this._updateFPS();
        
        // Set background
        background(...this.colorScheme.BACKGROUND);
        
        if (!this.isActive || !this.audioData) {
            this._drawWaitingScreen();
            return;
        }
        
        // Update visual data
        this._updateVisualData();
        
        // Render based on current mode
        switch (this.currentMode) {
            case 'spectrum':
                this._drawSpectrum();
                break;
            case 'waveform':
                this._drawWaveform();
                break;
            case 'particles':
                this._drawParticles();
                break;
            case 'eq-bars':
                this._drawEQBars();
                break;
            case 'dj-mixer':
                this._drawDJMixer();
                break;
            default:
                this._drawSpectrum();
        }
        
        // Draw debug info if enabled
        if (CONFIG.DEBUG.ENABLED) {
            this._drawDebugInfo();
        }
    }
    
    /**
     * Set audio data for visualization
     */
    setAudioData(data) {
        this.audioData = data;
        this.isActive = data && data.eqBands;
    }
    
    /**
     * Set visualization mode
     */
    setMode(mode) {
        if (mode !== this.currentMode) {
            CONFIG.UTILS.log('info', 'Switching visualization mode', { from: this.currentMode, to: mode });
            this.currentMode = mode;
            this._onModeChange();
        }
    }
    
    /**
     * Handle mode changes
     */
    _onModeChange() {
        // Clear particles when switching modes
        if (this.currentMode === 'particles') {
            this._initializeParticleSystem();
        }
    }
    
    /**
     * Update visual data with smoothing
     */
    _updateVisualData() {
        if (!this.audioData || !this.audioData.spectrum) return;
        
        // Apply smoothing to spectrum data
        const spectrum = this.audioData.spectrum;
        for (let i = 0; i < spectrum.length; i++) {
            this.smoothedSpectrum[i] = lerp(this.smoothedSpectrum[i], spectrum[i], 0.3);
            
            // Update peak hold
            if (spectrum[i] > this.peakHold[i]) {
                this.peakHold[i] = spectrum[i];
            } else {
                this.peakHold[i] *= this.peakDecay;
            }
        }
    }
    
    /**
     * Draw waiting screen
     */
    _drawWaitingScreen() {
        push();
        
        // Center text
        textAlign(CENTER, CENTER);
        textSize(24);
        fill(255, 150);
        text('Click "Start Audio" to begin visualization', width / 2, height / 2);
        
        // Animated subtitle
        textSize(16);
        fill(255, 100 + 50 * sin(this.animationTime * 0.02));
        text('Make sure Serato DJ is running with virtual audio enabled', 
             width / 2, height / 2 + 40);
        
        // Draw subtle background animation
        this._drawBackgroundAnimation();
        
        pop();
    }
    
    /**
     * Draw background animation when no audio
     */
    _drawBackgroundAnimation() {
        push();
        
        translate(width / 2, height / 2);
        noFill();
        strokeWeight(1);
        
        for (let i = 0; i < 5; i++) {
            stroke(255, 30 - i * 5);
            let radius = 100 + i * 50 + 20 * sin(this.animationTime * 0.01 + i);
            circle(0, 0, radius);
        }
        
        pop();
    }
    
    /**
     * Draw frequency spectrum visualization
     */
    _drawSpectrum() {
        if (!this.audioData.spectrum) return;
        
        push();
        
        const spectrum = this.smoothedSpectrum;
        const barWidth = width / spectrum.length;
        const maxHeight = height * 0.8;
        
        // Draw spectrum bars
        for (let i = 0; i < spectrum.length; i++) {
            const amplitude = spectrum[i];
            const barHeight = amplitude * maxHeight;
            const x = i * barWidth;
            const y = height - barHeight;
            
            // Color based on frequency range
            const color = this._getFrequencyColor(i, spectrum.length);
            fill(...color, 200);
            noStroke();
            
            // Main bar
            rect(x, y, barWidth * CONFIG.VISUALIZATION.MODES.SPECTRUM.BAR_WIDTH_RATIO, barHeight);
            
            // Peak indicator
            const peakHeight = this.peakHold[i] * maxHeight;
            if (peakHeight > barHeight + 5) {
                fill(...color, 255);
                rect(x, height - peakHeight, barWidth * 0.8, 2);
            }
        }
        
        // Add reflection effect
        this._drawSpectrumReflection(spectrum, barWidth, maxHeight);
        
        pop();
    }
    
    /**
     * Draw spectrum reflection
     */
    _drawSpectrumReflection(spectrum, barWidth, maxHeight) {
        push();
        
        // Flip and translate for reflection
        translate(0, height);
        scale(1, -0.3);
        
        for (let i = 0; i < spectrum.length; i++) {
            const amplitude = spectrum[i];
            const barHeight = amplitude * maxHeight;
            const x = i * barWidth;
            
            const color = this._getFrequencyColor(i, spectrum.length);
            fill(...color, 50); // More transparent for reflection
            noStroke();
            
            rect(x, 0, barWidth * 0.8, barHeight);
        }
        
        pop();
    }
    
    /**
     * Draw waveform visualization
     */
    _drawWaveform() {
        if (!this.audioData.eqBands) return;
        
        push();
        translate(width / 2, height / 2);
        
        const { bass, mid, high } = this.audioData.eqBands;
        const config = CONFIG.VISUALIZATION.MODES.WAVEFORM;
        
        // Multiple concentric waveforms
        this._drawCircularWaveform(config.BASE_RADIUS * 0.7, bass, CONFIG.FREQUENCY_BANDS.BASS.COLOR, 8);
        this._drawCircularWaveform(config.BASE_RADIUS * 1.0, mid, CONFIG.FREQUENCY_BANDS.MID.COLOR, 12);
        this._drawCircularWaveform(config.BASE_RADIUS * 1.3, high, CONFIG.FREQUENCY_BANDS.HIGH.COLOR, 16);
        
        pop();
    }
    
    /**
     * Draw circular waveform
     */
    _drawCircularWaveform(baseRadius, amplitude, color, detail) {
        push();
        
        noFill();
        strokeWeight(3);
        stroke(...color, 200);
        
        beginShape();
        for (let i = 0; i < CONFIG.VISUALIZATION.MODES.WAVEFORM.CIRCLE_POINTS; i++) {
            const angle = map(i, 0, CONFIG.VISUALIZATION.MODES.WAVEFORM.CIRCLE_POINTS, 0, TWO_PI);
            
            // Create organic variation
            const variation = amplitude * 50 * sin(angle * detail + this.animationTime * 0.02);
            const radius = baseRadius + variation;
            
            const x = cos(angle) * radius;
            const y = sin(angle) * radius;
            
            vertex(x, y);
        }
        endShape(CLOSE);
        
        pop();
    }
    
    /**
     * Draw particle system
     */
    _drawParticles() {
        if (!this.audioData.eqBands) return;
        
        const { bass, mid, high } = this.audioData.eqBands;
        
        // Update existing particles
        this._updateParticles();
        
        // Generate new particles based on audio
        this._generateParticles(bass, mid, high);
        
        // Draw all particles
        this._renderParticles();
        
        // Add connecting lines between nearby particles
        this._drawParticleConnections();
    }
    
    /**
     * Initialize particle system
     */
    _initializeParticleSystem() {
        this.particles = [];
        
        CONFIG.UTILS.log('debug', 'Particle system initialized');
    }
    
    /**
     * Update particle positions and lifecycle
     */
    _updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.z += particle.vz;
            
            // Apply gravity/forces
            particle.vy += particle.gravity;
            
            // Update lifecycle
            particle.life--;
            particle.alpha = map(particle.life, 0, particle.maxLife, 0, 255);
            
            // Remove dead particles
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    /**
     * Generate new particles based on audio
     */
    _generateParticles(bass, mid, high) {
        const config = CONFIG.VISUALIZATION.MODES.PARTICLES;
        
        // Bass particles - large, slow
        if (bass > 0.1) {
            for (let i = 0; i < bass * config.BASS_PARTICLE_COUNT; i++) {
                this._addParticle({
                    x: random(-width/3, width/3),
                    y: random(-height/3, height/3),
                    z: random(-100, 100),
                    size: 8 + bass * 15,
                    color: CONFIG.FREQUENCY_BANDS.BASS.COLOR,
                    speed: 0.5 + bass,
                    maxLife: config.PARTICLE_LIFETIME * 2
                });
            }
        }
        
        // Mid particles - medium
        if (mid > 0.1) {
            for (let i = 0; i < mid * config.MID_PARTICLE_COUNT; i++) {
                this._addParticle({
                    x: random(-width/2, width/2),
                    y: random(-height/2, height/2),
                    z: random(-200, 200),
                    size: 4 + mid * 8,
                    color: CONFIG.FREQUENCY_BANDS.MID.COLOR,
                    speed: 1 + mid * 2,
                    maxLife: config.PARTICLE_LIFETIME
                });
            }
        }
        
        // High particles - small, fast
        if (high > 0.1) {
            for (let i = 0; i < high * config.HIGH_PARTICLE_COUNT; i++) {
                this._addParticle({
                    x: random(-width/4, width/4),
                    y: random(-height/4, height/4),
                    z: random(-50, 50),
                    size: 2 + high * 4,
                    color: CONFIG.FREQUENCY_BANDS.HIGH.COLOR,
                    speed: 2 + high * 3,
                    maxLife: config.PARTICLE_LIFETIME / 2
                });
            }
        }
        
        // Limit total particles for performance
        if (this.particles.length > CONFIG.PERFORMANCE.MAX_PARTICLES) {
            this.particles.splice(0, this.particles.length - CONFIG.PERFORMANCE.MAX_PARTICLES);
        }
    }
    
    /**
     * Add a new particle
     */
    _addParticle(options) {
        const particle = {
            x: options.x || 0,
            y: options.y || 0,
            z: options.z || 0,
            vx: random(-options.speed, options.speed),
            vy: random(-options.speed, options.speed),
            vz: random(-options.speed/2, options.speed/2),
            size: options.size || 5,
            color: options.color || [255, 255, 255],
            maxLife: options.maxLife || 60,
            life: options.maxLife || 60,
            alpha: 255,
            gravity: CONFIG.VISUALIZATION.MODES.PARTICLES.GRAVITY
        };
        
        this.particles.push(particle);
    }
    
    /**
     * Render all particles
     */
    _renderParticles() {
        push();
        translate(width / 2, height / 2);
        
        for (const particle of this.particles) {
            push();
            
            translate(particle.x, particle.y, particle.z);
            
            fill(...particle.color, particle.alpha);
            noStroke();
            
            sphere(particle.size);
            
            pop();
        }
        
        pop();
    }
    
    /**
     * Draw connections between nearby particles
     */
    _drawParticleConnections() {
        if (this.particles.length < 2) return;
        
        push();
        translate(width / 2, height / 2);
        
        stroke(255, 50);
        strokeWeight(1);
        
        for (let i = 0; i < this.particles.length - 1; i++) {
            const p1 = this.particles[i];
            
            for (let j = i + 1; j < this.particles.length; j++) {
                const p2 = this.particles[j];
                
                const distance = dist(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
                
                if (distance < 100) {
                    const alpha = map(distance, 0, 100, 100, 0);
                    stroke(255, alpha);
                    line(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
                }
            }
        }
        
        pop();
    }
    
    /**
     * Draw EQ bars visualization
     */
    _drawEQBars() {
        if (!this.audioData.eqBands) return;
        
        push();
        translate(width / 2, height / 2);
        
        const { bass, mid, high } = this.audioData.eqBands;
        const config = CONFIG.VISUALIZATION.MODES.EQ_BARS;
        
        // Draw bars
        this._drawEQBar(-config.SPACING, bass, CONFIG.FREQUENCY_BANDS.BASS.COLOR, 'BASS');
        this._drawEQBar(0, mid, CONFIG.FREQUENCY_BANDS.MID.COLOR, 'MID');
        this._drawEQBar(config.SPACING, high, CONFIG.FREQUENCY_BANDS.HIGH.COLOR, 'HIGH');
        
        pop();
    }
    
    /**
     * Draw individual EQ bar
     */
    _drawEQBar(x, amplitude, color, label) {
        const config = CONFIG.VISUALIZATION.MODES.EQ_BARS;
        const barHeight = amplitude * config.MAX_HEIGHT;
        
        push();
        
        // Main bar
        fill(...color, 200);
        noStroke();
        rect(x - config.BAR_WIDTH/2, 0, config.BAR_WIDTH, -barHeight);
        
        // Glow effect
        fill(...color, 50);
        rect(x - config.BAR_WIDTH*0.6, 0, config.BAR_WIDTH*1.2, -barHeight*1.1);
        
        // Label
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(16);
        text(label, x, 30);
        
        // Value display
        textSize(12);
        fill(...color);
        text(Math.round(amplitude * 100), x, -barHeight - 20);
        
        pop();
    }
    
    /**
     * Draw DJ mixer style visualization
     */
    _drawDJMixer() {
        if (!this.audioData.eqBands) return;
        
        push();
        
        // Draw mixer background
        this._drawMixerBackground();
        
        // Draw channel strips
        this._drawChannelStrip(width * 0.2, this.audioData.eqBands, 'Channel A');
        this._drawChannelStrip(width * 0.8, this.audioData.eqBands, 'Channel B');
        
        // Draw master section
        this._drawMasterSection();
        
        pop();
    }
    
    /**
     * Draw mixer background
     */
    _drawMixerBackground() {
        // Dark mixer surface
        fill(30, 30, 40);
        rect(0, 0, width, height);
        
        // Grid lines
        stroke(60, 60, 80);
        strokeWeight(1);
        
        for (let i = 0; i < 10; i++) {
            line(0, i * height/10, width, i * height/10);
            line(i * width/10, 0, i * width/10, height);
        }
    }
    
    /**
     * Draw channel strip
     */
    _drawChannelStrip(x, eqBands, label) {
        push();
        translate(x, 0);
        
        // Channel background
        fill(40, 40, 50);
        rect(-50, 50, 100, height - 100);
        
        // EQ knobs
        this._drawEQKnob(0, 120, eqBands.high, 'HIGH', CONFIG.FREQUENCY_BANDS.HIGH.COLOR);
        this._drawEQKnob(0, 200, eqBands.mid, 'MID', CONFIG.FREQUENCY_BANDS.MID.COLOR);
        this._drawEQKnob(0, 280, eqBands.bass, 'BASS', CONFIG.FREQUENCY_BANDS.BASS.COLOR);
        
        // Channel fader
        this._drawFader(0, 400, (eqBands.bass + eqBands.mid + eqBands.high) / 3);
        
        // Label
        fill(255);
        textAlign(CENTER);
        textSize(14);
        text(label, 0, 30);
        
        pop();
    }
    
    /**
     * Draw EQ knob
     */
    _drawEQKnob(x, y, value, label, color) {
        push();
        translate(x, y);
        
        // Knob body
        fill(60, 60, 70);
        stroke(80, 80, 90);
        strokeWeight(2);
        circle(0, 0, 40);
        
        // Knob indicator
        const angle = map(value, 0, 1, -PI * 0.75, PI * 0.75);
        stroke(...color);
        strokeWeight(3);
        line(0, 0, cos(angle - PI/2) * 15, sin(angle - PI/2) * 15);
        
        // Label
        fill(200);
        textAlign(CENTER);
        textSize(10);
        text(label, 0, 35);
        
        pop();
    }
    
    /**
     * Draw fader
     */
    _drawFader(x, y, value) {
        push();
        translate(x, y);
        
        const faderHeight = 100;
        const faderPos = map(value, 0, 1, faderHeight/2, -faderHeight/2);
        
        // Fader track
        stroke(80, 80, 90);
        strokeWeight(6);
        line(0, -faderHeight/2, 0, faderHeight/2);
        
        // Fader handle
        fill(200, 200, 210);
        stroke(150);
        strokeWeight(2);
        rect(-8, faderPos - 6, 16, 12);
        
        pop();
    }
    
    /**
     * Draw master section
     */
    _drawMasterSection() {
        // Master level meters
        push();
        translate(width / 2, height - 150);
        
        const { bass, mid, high } = this.audioData.eqBands;
        const masterLevel = (bass + mid + high) / 3;
        
        // Left channel meter
        this._drawLevelMeter(-30, 0, masterLevel, 'L');
        // Right channel meter  
        this._drawLevelMeter(30, 0, masterLevel * 0.9, 'R');
        
        // Master label
        fill(255);
        textAlign(CENTER);
        textSize(16);
        text('MASTER', 0, -40);
        
        pop();
    }
    
    /**
     * Draw level meter
     */
    _drawLevelMeter(x, y, level, label) {
        push();
        translate(x, y);
        
        const meterHeight = 100;
        const segments = 20;
        
        for (let i = 0; i < segments; i++) {
            const segmentLevel = i / segments;
            const segmentY = map(i, 0, segments, meterHeight/2, -meterHeight/2);
            
            if (level > segmentLevel) {
                // Green for low levels, yellow for mid, red for high
                if (segmentLevel < 0.7) {
                    fill(0, 255, 0);
                } else if (segmentLevel < 0.9) {
                    fill(255, 255, 0);
                } else {
                    fill(255, 0, 0);
                }
            } else {
                fill(30, 30, 30);
            }
            
            rect(-4, segmentY, 8, 3);
        }
        
        // Label
        fill(200);
        textAlign(CENTER);
        textSize(12);
        text(label, 0, meterHeight/2 + 15);
        
        pop();
    }
    
    /**
     * Get color based on frequency position
     */
    _getFrequencyColor(index, total) {
        const position = index / total;
        
        if (position < 0.1) {
            return CONFIG.FREQUENCY_BANDS.BASS.COLOR;
        } else if (position < 0.6) {
            return CONFIG.FREQUENCY_BANDS.MID.COLOR;
        } else {
            return CONFIG.FREQUENCY_BANDS.HIGH.COLOR;
        }
    }
    
    /**
     * Update FPS tracking
     */
    _updateFPS() {
        const now = performance.now();
        if (this.lastFrameTime > 0) {
            const deltaTime = now - this.lastFrameTime;
            const fps = 1000 / deltaTime;
            
            this.fpsBuffer.push(fps);
            if (this.fpsBuffer.length > CONFIG.PERFORMANCE.FPS_SAMPLE_SIZE) {
                this.fpsBuffer.shift();
            }
            
            this.frameRate = this.fpsBuffer.reduce((a, b) => a + b) / this.fpsBuffer.length;
        }
        this.lastFrameTime = now;
    }
    
    /**
     * Draw debug information
     */
    _drawDebugInfo() {
        push();
        
        fill(255, 200);
        textAlign(LEFT, TOP);
        textSize(12);
        
        const debugInfo = [
            `FPS: ${this.frameRate.toFixed(1)}`,
            `Mode: ${this.currentMode}`,
            `Particles: ${this.particles.length}`,
            `Animation Time: ${this.animationTime.toFixed(2)}`
        ];
        
        if (this.audioData && this.audioData.eqBands) {
            debugInfo.push(`Bass: ${(this.audioData.eqBands.bass * 100).toFixed(1)}`);
            debugInfo.push(`Mid: ${(this.audioData.eqBands.mid * 100).toFixed(1)}`);
            debugInfo.push(`High: ${(this.audioData.eqBands.high * 100).toFixed(1)}`);
        }
        
        for (let i = 0; i < debugInfo.length; i++) {
            text(debugInfo[i], 10, 10 + i * 15);
        }
        
        pop();
    }
    
    /**
     * Handle window resize
     */
    windowResized() {
        resizeCanvas(windowWidth, windowHeight);
        CONFIG.UTILS.log('info', 'Canvas resized', { width: windowWidth, height: windowHeight });
    }
    
    /**
     * Get current FPS
     */
    getFPS() {
        return this.frameRate;
    }
    
    /**
     * Set color scheme
     */
    setColorScheme(schemeName) {
        if (CONFIG.VISUALIZATION.COLOR_SCHEMES[schemeName]) {
            this.colorScheme = CONFIG.VISUALIZATION.COLOR_SCHEMES[schemeName];
            CONFIG.UTILS.log('info', 'Color scheme changed', schemeName);
        }
    }
}

// Make available globally
window.DJVisualizer = DJVisualizer;