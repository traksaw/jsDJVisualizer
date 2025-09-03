/**
 * DJ Audio Processor
 * Handles all Web Audio API and Meyda.js integration
 */

class DJAudioProcessor {
    constructor() {
        this.audioContext = null;
        this.analyzer = null;
        this.source = null;
        this.stream = null;
        this.gainNode = null;
        
        // Audio analysis data
        this.currentEQBands = { bass: 0, mid: 0, high: 0, subBass: 0 };
        this.currentFeatures = {};
        this.spectrum = new Float32Array(CONFIG.AUDIO.BUFFER_SIZE);
        this.waveform = new Float32Array(CONFIG.AUDIO.BUFFER_SIZE * 2);
        
        // Processing parameters
        this.sensitivity = CONFIG.VISUALIZATION.DEFAULT_SENSITIVITY;
        this.bassBoost = CONFIG.VISUALIZATION.DEFAULT_BASS_BOOST;
        this.animationSpeed = CONFIG.VISUALIZATION.DEFAULT_ANIMATION_SPEED;
        
        // Performance tracking
        this.lastProcessTime = 0;
        this.processingTimes = [];
        this.isProcessing = false;
        
        // Smoothing for visual stability
        this.smoothedEQBands = { bass: 0, mid: 0, high: 0, subBass: 0 };
        
        // Event listeners
        this.eventListeners = new Map();
        
        // Device information
        this.availableDevices = [];
        this.activeDevice = null;
        
        CONFIG.UTILS.log('info', 'AudioProcessor initialized');
    }
    
    /**
     * Initialize the audio system
     */
    async initialize() {
        try {
            CONFIG.UTILS.log('info', 'Starting audio system initialization');
            
            // Check browser compatibility
            if (!CONFIG.UTILS.isBrowserSupported()) {
                throw new Error('Browser not supported for Web Audio API');
            }
            
            // Create audio context
            await this._createAudioContext();
            
            // Enumerate and select audio device
            await this._setupAudioDevice();
            
            // Setup Meyda analyzer
            this._setupMeydaAnalyzer();
            
            CONFIG.UTILS.log('info', 'Audio system initialized successfully');
            this._emit('initialized', { success: true });
            
            return true;
            
        } catch (error) {
            CONFIG.UTILS.log('error', 'Audio initialization failed', error);
            this._emit('error', { 
                code: this._getErrorCode(error),
                message: error.message,
                error 
            });
            return false;
        }
    }
    
    /**
     * Create and configure audio context
     */
    async _createAudioContext() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        
        this.audioContext = new AudioContextClass({
            latencyHint: CONFIG.AUDIO.LATENCY_HINT,
            sampleRate: CONFIG.AUDIO.SAMPLE_RATE
        });
        
        // Handle audio context state changes
        this.audioContext.addEventListener('statechange', () => {
            CONFIG.UTILS.log('info', `Audio context state: ${this.audioContext.state}`);
            this._emit('contextStateChange', { state: this.audioContext.state });
        });
        
        CONFIG.UTILS.log('info', 'Audio context created', {
            sampleRate: this.audioContext.sampleRate,
            state: this.audioContext.state
        });
    }
    
    /**
     * Setup audio input device
     */
    async _setupAudioDevice() {
        // Enumerate available devices
        this.availableDevices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = this.availableDevices.filter(device => device.kind === 'audioinput');
        
        CONFIG.UTILS.log('info', 'Available audio inputs', audioInputs.map(d => d.label));
        
        // Try to find virtual audio device
        const virtualDevice = this._findVirtualAudioDevice(audioInputs);
        
        // Setup constraints
        const constraints = {
            audio: {
                ...CONFIG.AUDIO.CONSTRAINTS,
                deviceId: virtualDevice ? { exact: virtualDevice.deviceId } : undefined
            }
        };
        
        // Get user media
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Store active device info
        this.activeDevice = virtualDevice || audioInputs[0];
        
        // Create audio source
        this.source = this.audioContext.createMediaStreamSource(this.stream);
        
        // Create gain node for volume control
        this.gainNode = this.audioContext.createGain();
        this.source.connect(this.gainNode);
        
        CONFIG.UTILS.log('info', 'Audio device setup complete', {
            device: this.activeDevice?.label || 'Default',
            isVirtual: !!virtualDevice
        });
        
        this._emit('deviceSelected', { 
            device: this.activeDevice,
            isVirtual: !!virtualDevice,
            allDevices: audioInputs
        });
    }
    
    /**
     * Find virtual audio device from available inputs
     */
    _findVirtualAudioDevice(devices) {
        return devices.find(device => {
            const label = device.label.toLowerCase();
            return CONFIG.AUDIO.VIRTUAL_DEVICE_KEYWORDS.some(keyword => 
                label.includes(keyword.toLowerCase())
            );
        });
    }
    
    /**
     * Setup Meyda analyzer
     */
    _setupMeydaAnalyzer() {
        if (!window.Meyda) {
            throw new Error('Meyda.js not loaded');
        }
        
        this.analyzer = Meyda.createMeydaAnalyzer({
            audioContext: this.audioContext,
            source: this.gainNode,
            bufferSize: CONFIG.UTILS.getOptimalBufferSize(),
            featureExtractors: CONFIG.MEYDA_FEATURES,
            callback: (features) => this._processAudioFeatures(features)
        });
        
        CONFIG.UTILS.log('info', 'Meyda analyzer created', {
            bufferSize: CONFIG.UTILS.getOptimalBufferSize(),
            features: CONFIG.MEYDA_FEATURES
        });
    }
    
    /**
     * Start audio processing
     */
    start() {
        if (!this.analyzer || !this.audioContext) {
            CONFIG.UTILS.log('error', 'Cannot start: audio system not initialized');
            return false;
        }
        
        try {
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // Start Meyda analyzer
            this.analyzer.start();
            this.isProcessing = true;
            
            CONFIG.UTILS.log('info', 'Audio processing started');
            this._emit('started', { timestamp: performance.now() });
            
            return true;
            
        } catch (error) {
            CONFIG.UTILS.log('error', 'Failed to start audio processing', error);
            this._emit('error', { 
                code: CONFIG.ERROR_CODES.MEYDA_INITIALIZATION_FAILED,
                message: error.message,
                error 
            });
            return false;
        }
    }
    
    /**
     * Stop audio processing
     */
    stop() {
        if (this.analyzer) {
            this.analyzer.stop();
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        
        this.isProcessing = false;
        
        // Reset data
        this.currentEQBands = { bass: 0, mid: 0, high: 0, subBass: 0 };
        this.smoothedEQBands = { bass: 0, mid: 0, high: 0, subBass: 0 };
        
        CONFIG.UTILS.log('info', 'Audio processing stopped');
        this._emit('stopped', { timestamp: performance.now() });
    }
    
    /**
     * Process audio features from Meyda with error handling
     */
    _processAudioFeatures(features) {
        const startTime = performance.now();
        
        // Throttle processing for performance
        if (startTime - this.lastProcessTime < CONFIG.PERFORMANCE.UPDATE_INTERVAL) {
            return;
        }
        
        if (!features || !features.amplitudeSpectrum) {
            CONFIG.UTILS.log('debug', 'No valid amplitude spectrum data');
            return;
        }
        
        try {
            // Store raw features (with safety checks)
            this.currentFeatures = {
                rms: features.rms || 0,
                energy: features.energy || 0,
                spectralCentroid: features.spectralCentroid || 0,
                // Add other features only if they exist and are valid
                ...(features.spectralRolloff && !isNaN(features.spectralRolloff) && { spectralRolloff: features.spectralRolloff }),
                ...(features.loudness && Array.isArray(features.loudness) && { loudness: features.loudness })
            };
            
            this.spectrum = features.amplitudeSpectrum;
            
            // Extract custom EQ bands
            this.currentEQBands = this._extractEQBands(features.amplitudeSpectrum);
            
            // Apply smoothing
            this._applySmoothingToEQBands();
            
            // Track processing time
            const processingTime = performance.now() - startTime;
            this._trackPerformance(processingTime);
            
            this.lastProcessTime = startTime;
            
            // Emit processed data
            this._emit('dataProcessed', {
                eqBands: this.smoothedEQBands,
                rawEQBands: this.currentEQBands,
                spectrum: this.spectrum,
                features: this.currentFeatures,
                timestamp: startTime
            });
            
        } catch (error) {
            CONFIG.UTILS.log('error', 'Error processing audio features', error);
            
            // Continue with basic processing even if advanced features fail
            if (features.amplitudeSpectrum) {
                this.currentEQBands = this._extractEQBands(features.amplitudeSpectrum);
                this._applySmoothingToEQBands();
                
                this._emit('dataProcessed', {
                    eqBands: this.smoothedEQBands,
                    rawEQBands: this.currentEQBands,
                    spectrum: features.amplitudeSpectrum,
                    features: { rms: features.rms || 0 },
                    timestamp: startTime
                });
            }
        }
    }
    
    /**
     * Extract EQ bands from spectrum data
     */
    _extractEQBands(spectrum) {
        const sampleRate = this.audioContext.sampleRate;
        const nyquist = sampleRate / 2;
        const binSize = nyquist / spectrum.length;
        
        let bass = 0, mid = 0, high = 0, subBass = 0;
        let bassCount = 0, midCount = 0, highCount = 0, subBassCount = 0;
        
        for (let i = 0; i < spectrum.length; i++) {
            const frequency = i * binSize;
            const amplitude = spectrum[i];
            
            // Sub-bass: 20-80 Hz
            if (frequency >= CONFIG.FREQUENCY_BANDS.SUB_BASS.MIN && 
                frequency <= CONFIG.FREQUENCY_BANDS.SUB_BASS.MAX) {
                subBass += amplitude;
                subBassCount++;
            }
            
            // Bass: 20-250 Hz
            if (frequency >= CONFIG.FREQUENCY_BANDS.BASS.MIN && 
                frequency <= CONFIG.FREQUENCY_BANDS.BASS.MAX) {
                bass += amplitude;
                bassCount++;
            }
            
            // Mid: 250-4000 Hz
            else if (frequency > CONFIG.FREQUENCY_BANDS.MID.MIN && 
                     frequency <= CONFIG.FREQUENCY_BANDS.MID.MAX) {
                mid += amplitude;
                midCount++;
            }
            
            // High: 4000-20000 Hz
            else if (frequency > CONFIG.FREQUENCY_BANDS.HIGH.MIN && 
                     frequency <= CONFIG.FREQUENCY_BANDS.HIGH.MAX) {
                high += amplitude;
                highCount++;
            }
        }
        
        // Calculate averages and apply boosts/sensitivity
        return {
            subBass: this._applyProcessing(subBassCount > 0 ? subBass / subBassCount : 0, 1.0),
            bass: this._applyProcessing(bassCount > 0 ? bass / bassCount : 0, this.bassBoost),
            mid: this._applyProcessing(midCount > 0 ? mid / midCount : 0, 1.0),
            high: this._applyProcessing(highCount > 0 ? high / highCount : 0, 1.0)
        };
    }
    
    /**
     * Apply sensitivity and boost processing
     */
    _applyProcessing(value, boost) {
        return Math.min(value * this.sensitivity * boost * this.animationSpeed, 1.0);
    }
    
    /**
     * Apply smoothing to EQ bands for visual stability
     */
    _applySmoothingToEQBands() {
        const factor = CONFIG.PERFORMANCE.SMOOTHING_FACTOR;
        
        this.smoothedEQBands.subBass = this._smooth(this.smoothedEQBands.subBass, this.currentEQBands.subBass, factor);
        this.smoothedEQBands.bass = this._smooth(this.smoothedEQBands.bass, this.currentEQBands.bass, factor);
        this.smoothedEQBands.mid = this._smooth(this.smoothedEQBands.mid, this.currentEQBands.mid, factor);
        this.smoothedEQBands.high = this._smooth(this.smoothedEQBands.high, this.currentEQBands.high, factor);
    }
    
    /**
     * Smooth value transition
     */
    _smooth(current, target, factor) {
        return current * factor + target * (1 - factor);
    }
    
    /**
     * Track processing performance
     */
    _trackPerformance(processingTime) {
        this.processingTimes.push(processingTime);
        
        // Keep only recent samples
        if (this.processingTimes.length > CONFIG.PERFORMANCE.FPS_SAMPLE_SIZE) {
            this.processingTimes.shift();
        }
        
        // Log performance periodically
        if (CONFIG.DEBUG.LOG_PERFORMANCE && 
            performance.now() % CONFIG.PERFORMANCE.PERFORMANCE_LOG_INTERVAL < 50) {
            const avgTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
            CONFIG.UTILS.log('debug', 'Processing performance', {
                avgProcessingTime: avgTime.toFixed(2) + 'ms',
                currentTime: processingTime.toFixed(2) + 'ms'
            });
        }
    }
    
    /**
     * Set processing parameters
     */
    setSensitivity(value) {
        this.sensitivity = Math.max(0.1, Math.min(3.0, value));
        CONFIG.UTILS.log('debug', 'Sensitivity set to', this.sensitivity);
    }
    
    setBassBoost(value) {
        this.bassBoost = Math.max(0.5, Math.min(3.0, value));
        CONFIG.UTILS.log('debug', 'Bass boost set to', this.bassBoost);
    }
    
    setAnimationSpeed(value) {
        this.animationSpeed = Math.max(0.1, Math.min(2.0, value));
        CONFIG.UTILS.log('debug', 'Animation speed set to', this.animationSpeed);
    }
    
    setGain(value) {
        if (this.gainNode) {
            this.gainNode.gain.value = Math.max(0, Math.min(2, value));
        }
    }
    
    /**
     * Get current processing data
     */
    getCurrentData() {
        return {
            isProcessing: this.isProcessing,
            eqBands: this.smoothedEQBands,
            rawEQBands: this.currentEQBands,
            spectrum: this.spectrum,
            features: this.currentFeatures,
            performance: {
                avgProcessingTime: this.processingTimes.length > 0 ? 
                    this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length : 0,
                lastProcessingTime: this.processingTimes[this.processingTimes.length - 1] || 0
            },
            device: this.activeDevice
        };
    }
    
    /**
     * Get available devices
     */
    getAvailableDevices() {
        return this.availableDevices.filter(device => device.kind === 'audioinput');
    }
    
    /**
     * Event system
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    _emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    CONFIG.UTILS.log('error', `Error in event listener for ${event}`, error);
                }
            });
        }
    }
    
    /**
     * Get appropriate error code for error
     */
    _getErrorCode(error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            return CONFIG.ERROR_CODES.MICROPHONE_ACCESS_DENIED;
        }
        if (error.name === 'NotFoundError') {
            return CONFIG.ERROR_CODES.DEVICE_NOT_FOUND;
        }
        if (error.message.includes('AudioContext')) {
            return CONFIG.ERROR_CODES.AUDIO_CONTEXT_FAILED;
        }
        return 'UNKNOWN_ERROR';
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        this.stop();
        
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        this.eventListeners.clear();
        
        CONFIG.UTILS.log('info', 'AudioProcessor destroyed');
    }
}

// Make available globally
window.DJAudioProcessor = DJAudioProcessor;