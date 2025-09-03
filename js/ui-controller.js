/**
 * DJ UI Controller
 * Handles all user interface interactions and updates
 */

class DJUIController {
    constructor() {
        this.elements = {};
        this.audioProcessor = null;
        this.visualizer = null;
        
        // UI state
        this.isProcessing = false;
        this.currentDevice = null;
        
        // Performance tracking for UI
        this.lastUIUpdate = 0;
        this.uiUpdateInterval = CONFIG.UI.UPDATE_INTERVAL;
        
        // EQ meter smoothing
        this.smoothedEQValues = { bass: 0, mid: 0, high: 0, rms: 0 };
        
        CONFIG.UTILS.log('info', 'DJUIController initialized');
    }
    
    /**
     * Initialize UI controller
     */
    init() {
        this._cacheElements();
        this._bindEvents();
        this._initializeUI();
        
        CONFIG.UTILS.log('info', 'UI Controller ready');
    }
    
    /**
     * Cache DOM elements for better performance
     */
    _cacheElements() {
        // Control elements
        this.elements.startBtn = document.getElementById('startBtn');
        this.elements.stopBtn = document.getElementById('stopBtn');
        this.elements.vizMode = document.getElementById('vizMode');
        this.elements.sensitivity = document.getElementById('sensitivity');
        this.elements.bassBoost = document.getElementById('bassBoost');
        this.elements.animSpeed = document.getElementById('animSpeed');
        
        // Display elements
        this.elements.sensitivityValue = document.getElementById('sensitivityValue');
        this.elements.bassBoostValue = document.getElementById('bassBoostValue');
        this.elements.animSpeedValue = document.getElementById('animSpeedValue');
        this.elements.status = document.getElementById('status');
        this.elements.fps = document.getElementById('fps');
        this.elements.latency = document.getElementById('latency');
        
        // EQ display elements
        this.elements.bassBar = document.getElementById('bassBar');
        this.elements.midBar = document.getElementById('midBar');
        this.elements.highBar = document.getElementById('highBar');
        this.elements.rmsBar = document.getElementById('rmsBar');
        this.elements.bassValue = document.getElementById('bassValue');
        this.elements.midValue = document.getElementById('midValue');
        this.elements.highValue = document.getElementById('highValue');
        this.elements.rmsValue = document.getElementById('rmsValue');
        
        // Device info elements
        this.elements.deviceList = document.getElementById('device-list');
        
        CONFIG.UTILS.log('debug', 'DOM elements cached', Object.keys(this.elements).length);
    }
    
    /**
     * Bind UI event listeners
     */
    _bindEvents() {
        // Audio control buttons
        this.elements.startBtn.addEventListener('click', () => this._handleStart());
        this.elements.stopBtn.addEventListener('click', () => this._handleStop());
        
        // Visualization mode selector
        this.elements.vizMode.addEventListener('change', (e) => {
            this._handleModeChange(e.target.value);
        });
        
        // Parameter sliders with debouncing
        this._addSliderListener('sensitivity', (value) => {
            this.audioProcessor?.setSensitivity(value);
            this.elements.sensitivityValue.textContent = value.toFixed(1);
        });
        
        this._addSliderListener('bassBoost', (value) => {
            this.audioProcessor?.setBassBoost(value);
            this.elements.bassBoostValue.textContent = value.toFixed(1);
        });
        
        this._addSliderListener('animSpeed', (value) => {
            this.audioProcessor?.setAnimationSpeed(value);
            this.elements.animSpeedValue.textContent = value.toFixed(1);
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this._handleKeyboard(e));
        
        // Window events
        window.addEventListener('beforeunload', () => this._handleBeforeUnload());
        window.addEventListener('visibilitychange', () => this._handleVisibilityChange());
        
        CONFIG.UTILS.log('debug', 'Event listeners bound');
    }
    
    /**
     * Add debounced slider listener
     */
    _addSliderListener(elementName, callback) {
        let timeout;
        
        this.elements[elementName].addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                callback(parseFloat(e.target.value));
            }, CONFIG.UI.DEBOUNCE_DELAY);
        });
    }
    
    /**
     * Initialize UI state
     */
    _initializeUI() {
        this._updateStatus('Ready');
        this._updateDeviceList([]);
        
        // Set initial values
        this.elements.sensitivityValue.textContent = this.elements.sensitivity.value;
        this.elements.bassBoostValue.textContent = this.elements.bassBoost.value;
        this.elements.animSpeedValue.textContent = this.elements.animSpeed.value;
    }
    
    /**
     * Set references to audio processor and visualizer
     */
    setComponents(audioProcessor, visualizer) {
        this.audioProcessor = audioProcessor;
        this.visualizer = visualizer;
        
        // Bind audio processor events
        if (this.audioProcessor) {
            this._bindAudioProcessorEvents();
        }
        
        CONFIG.UTILS.log('info', 'Components set for UI controller');
    }
    
    /**
     * Bind audio processor event listeners
     */
    _bindAudioProcessorEvents() {
        this.audioProcessor.on('initialized', (data) => {
            this._updateStatus('Audio system ready');
        });
        
        this.audioProcessor.on('started', () => {
            this.isProcessing = true;
            this._updateControlsState();
            this._updateStatus('Audio processing active');
            document.body.classList.add('active-processing');
        });
        
        this.audioProcessor.on('stopped', () => {
            this.isProcessing = false;
            this._updateControlsState();
            this._updateStatus('Audio processing stopped');
            document.body.classList.remove('active-processing');
            this._resetEQDisplay();
        });
        
        this.audioProcessor.on('error', (data) => {
            this._updateStatus(`Error: ${data.message}`, 'error');
            this._showErrorDialog(data);
        });
        
        this.audioProcessor.on('deviceSelected', (data) => {
            this.currentDevice = data.device;
            this._updateDeviceList(data.allDevices, data.device);
            
            if (data.isVirtual) {
                this._updateStatus(`Using virtual device: ${data.device.label}`, 'success');
            } else {
                this._updateStatus(`Using default device: ${data.device.label}`, 'warning');
            }
        });
        
        this.audioProcessor.on('dataProcessed', (data) => {
            this._updateAudioDisplay(data);
        });
    }
    
    /**
     * Handle start button click
     */
    async _handleStart() {
        if (this.isProcessing) return;
        
        this._updateStatus('Initializing audio system...');
        this.elements.startBtn.disabled = true;
        this.elements.startBtn.classList.add('loading');
        
        try {
            const success = await this.audioProcessor.initialize();
            
            if (success && this.audioProcessor.start()) {
                CONFIG.UTILS.log('info', 'Audio processing started successfully');
            } else {
                throw new Error('Failed to start audio processing');
            }
        } catch (error) {
            CONFIG.UTILS.log('error', 'Failed to start audio processing', error);
            this._updateStatus(`Failed to start: ${error.message}`, 'error');
            this._updateControlsState();
        }
        
        this.elements.startBtn.classList.remove('loading');
    }
    
    /**
     * Handle stop button click
     */
    _handleStop() {
        if (!this.isProcessing) return;
        
        this.audioProcessor.stop();
        CONFIG.UTILS.log('info', 'Audio processing stopped by user');
    }
    
    /**
     * Handle visualization mode change
     */
    _handleModeChange(mode) {
        if (this.visualizer) {
            this.visualizer.setMode(mode);
            CONFIG.UTILS.log('info', 'Visualization mode changed', mode);
        }
    }
    
    /**
     * Handle keyboard shortcuts
     */
    _handleKeyboard(e) {
        // Only handle shortcuts when not typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        
        switch (e.key.toLowerCase()) {
            case ' ':
                e.preventDefault();
                if (this.isProcessing) {
                    this._handleStop();
                } else {
                    this._handleStart();
                }
                break;
            case '1':
                this.elements.vizMode.value = 'spectrum';
                this._handleModeChange('spectrum');
                break;
            case '2':
                this.elements.vizMode.value = 'waveform';
                this._handleModeChange('waveform');
                break;
            case '3':
                this.elements.vizMode.value = 'particles';
                this._handleModeChange('particles');
                break;
            case '4':
                this.elements.vizMode.value = 'eq-bars';
                this._handleModeChange('eq-bars');
                break;
            case '5':
                this.elements.vizMode.value = 'dj-mixer';
                this._handleModeChange('dj-mixer');
                break;
            case 'arrowup':
                e.preventDefault();
                this._adjustSlider('sensitivity', 0.1);
                break;
            case 'arrowdown':
                e.preventDefault();
                this._adjustSlider('sensitivity', -0.1);
                break;
        }
    }
    
    /**
     * Adjust slider value with keyboard
     */
    _adjustSlider(sliderName, delta) {
        const slider = this.elements[sliderName];
        if (!slider) return;
        
        const currentValue = parseFloat(slider.value);
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        const step = parseFloat(slider.step);
        
        const newValue = Math.max(min, Math.min(max, currentValue + delta));
        slider.value = newValue.toFixed(1);
        
        // Trigger input event
        slider.dispatchEvent(new Event('input'));
    }
    
    /**
     * Update control button states
     */
    _updateControlsState() {
        this.elements.startBtn.disabled = this.isProcessing;
        this.elements.stopBtn.disabled = !this.isProcessing;
    }
    
    /**
     * Update status display
     */
    _updateStatus(message, type = 'info') {
        this.elements.status.textContent = `Status: ${message}`;
        
        // Remove existing status classes
        this.elements.status.classList.remove('status-info', 'status-success', 'status-warning', 'status-error');
        
        // Add appropriate status class
        this.elements.status.classList.add(`status-${type}`);
        
        CONFIG.UTILS.log(type === 'error' ? 'error' : 'info', `Status: ${message}`);
    }
    
    /**
     * Update audio level displays
     */
    _updateAudioDisplay(data) {
        // Throttle UI updates for performance
        const now = performance.now();
        if (now - this.lastUIUpdate < this.uiUpdateInterval) {
            return;
        }
        this.lastUIUpdate = now;
        
        if (!data.eqBands) return;
        
        const { bass, mid, high } = data.eqBands;
        const rms = data.features?.rms || 0;
        
        // Apply smoothing to EQ values for UI
        const smoothing = CONFIG.UI.METER_SMOOTHING;
        this.smoothedEQValues.bass = this._smoothValue(this.smoothedEQValues.bass, bass, smoothing);
        this.smoothedEQValues.mid = this._smoothValue(this.smoothedEQValues.mid, mid, smoothing);
        this.smoothedEQValues.high = this._smoothValue(this.smoothedEQValues.high, high, smoothing);
        this.smoothedEQValues.rms = this._smoothValue(this.smoothedEQValues.rms, rms, smoothing);
        
        // Update EQ meters
        this._updateEQMeter('bass', this.smoothedEQValues.bass);
        this._updateEQMeter('mid', this.smoothedEQValues.mid);
        this._updateEQMeter('high', this.smoothedEQValues.high);
        this._updateEQMeter('rms', this.smoothedEQValues.rms);
        
        // Update performance info
        if (this.visualizer && CONFIG.PERFORMANCE.SHOW_FPS) {
            this.elements.fps.textContent = this.visualizer.getFPS().toFixed(1);
        }
        
        if (data.performance && data.performance.lastProcessingTime) {
            this.elements.latency.textContent = data.performance.lastProcessingTime.toFixed(1) + 'ms';
        }
    }
    
    /**
     * Update individual EQ meter
     */
    _updateEQMeter(band, value) {
        const percentage = Math.min(Math.max(value * 100, 0), 100);
        const bar = this.elements[`${band}Bar`];
        const valueDisplay = this.elements[`${band}Value`];
        
        if (bar) {
            bar.style.width = percentage + '%';
            
            // Add glow effect for high values
            if (percentage > 70) {
                bar.style.boxShadow = `0 0 ${percentage/10}px currentColor`;
            } else {
                bar.style.boxShadow = 'none';
            }
        }
        
        if (valueDisplay) {
            valueDisplay.textContent = Math.round(percentage);
        }
    }
    
    /**
     * Reset EQ display when audio stops
     */
    _resetEQDisplay() {
        ['bass', 'mid', 'high', 'rms'].forEach(band => {
            this._updateEQMeter(band, 0);
        });
        
        this.smoothedEQValues = { bass: 0, mid: 0, high: 0, rms: 0 };
        
        if (this.elements.fps) this.elements.fps.textContent = '0';
        if (this.elements.latency) this.elements.latency.textContent = '0ms';
    }
    
    /**
     * Update device list display
     */
    _updateDeviceList(devices, activeDevice = null) {
        if (!this.elements.deviceList) return;
        
        if (devices.length === 0) {
            this.elements.deviceList.innerHTML = '<p>Click "Start Audio" to detect devices</p>';
            return;
        }
        
        const deviceHTML = devices.map(device => {
            const isActive = activeDevice && device.deviceId === activeDevice.deviceId;
            const isVirtual = CONFIG.AUDIO.VIRTUAL_DEVICE_KEYWORDS.some(keyword => 
                device.label.toLowerCase().includes(keyword.toLowerCase())
            );
            
            return `
                <div class="device-item ${isActive ? 'device-active' : ''}">
                    ${isVirtual ? '🎵' : '🎤'} ${device.label || 'Unknown Device'}
                    ${isActive ? ' (Active)' : ''}
                </div>
            `;
        }).join('');
        
        this.elements.deviceList.innerHTML = deviceHTML;
    }
    
    /**
     * Show error dialog
     */
    _showErrorDialog(errorData) {
        const messages = {
            [CONFIG.ERROR_CODES.MICROPHONE_ACCESS_DENIED]: 
                'Microphone access was denied. Please check your browser permissions and refresh the page.',
            [CONFIG.ERROR_CODES.DEVICE_NOT_FOUND]: 
                'No audio input device found. Please check your audio setup.',
            [CONFIG.ERROR_CODES.AUDIO_CONTEXT_FAILED]: 
                'Failed to initialize audio system. Your browser may not support Web Audio API.',
            [CONFIG.ERROR_CODES.BROWSER_NOT_SUPPORTED]: 
                'Your browser is not supported. Please use Chrome, Firefox, or Edge.'
        };
        
        const message = messages[errorData.code] || errorData.message || 'An unknown error occurred.';
        
        // Simple error display (can be enhanced with modal later)
        alert(`Audio Error:\n\n${message}\n\nError Code: ${errorData.code}`);
        
        CONFIG.UTILS.log('error', 'Error dialog shown', errorData);
    }
    
    /**
     * Handle page before unload
     */
    _handleBeforeUnload() {
        if (this.audioProcessor && this.isProcessing) {
            this.audioProcessor.stop();
        }
    }
    
    /**
     * Handle visibility change (tab switching)
     */
    _handleVisibilityChange() {
        if (document.hidden && this.isProcessing) {
            // Optionally reduce processing when tab is hidden
            CONFIG.UTILS.log('info', 'Tab hidden, continuing audio processing');
        } else if (!document.hidden && this.isProcessing) {
            CONFIG.UTILS.log('info', 'Tab visible, audio processing active');
        }
    }
    
    /**
     * Smooth value transition for UI
     */
    _smoothValue(current, target, factor) {
        return current * factor + target * (1 - factor);
    }
    
    /**
     * Add CSS class animations
     */
    _addTemporaryClass(element, className, duration = 1000) {
        if (element) {
            element.classList.add(className);
            setTimeout(() => element.classList.remove(className), duration);
        }
    }
    
    /**
     * Show temporary notification
     */
    showNotification(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#3b82f6',
            color: 'white',
            padding: '15px 25px',
            borderRadius: '8px',
            zIndex: '1000',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });
        
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
        });
        
        // Remove after duration
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }
    
    /**
     * Get current UI state
     */
    getUIState() {
        return {
            isProcessing: this.isProcessing,
            currentDevice: this.currentDevice,
            visualizationMode: this.elements.vizMode.value,
            sensitivity: parseFloat(this.elements.sensitivity.value),
            bassBoost: parseFloat(this.elements.bassBoost.value),
            animationSpeed: parseFloat(this.elements.animSpeed.value)
        };
    }
    
    /**
     * Update visualization mode in UI
     */
    updateVisualizationMode(mode) {
        if (this.elements.vizMode.value !== mode) {
            this.elements.vizMode.value = mode;
        }
    }
}

// Make available globally
window.DJUIController = DJUIController;