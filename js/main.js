/**
 * DJ Audio Visualizer - Main Application
 * Entry point that orchestrates all components
 */

class DJVisualizerApp {
    constructor() {
        this.audioProcessor = null;
        this.visualizer = null;
        this.uiController = null;
        
        // Application state
        this.isInitialized = false;
        this.startTime = performance.now();
        
        // Performance monitoring
        this.performanceStats = {
            initTime: 0,
            totalFrames: 0,
            totalProcessingTime: 0
        };
        
        CONFIG.UTILS.log('info', 'DJ Visualizer App starting...');
    }
    
    /**
     * Initialize the complete application
     */
    async init() {
        try {
            CONFIG.UTILS.log('info', 'Initializing application components');
            
            // Check system requirements
            this._checkSystemRequirements();
            
            // Initialize components in order
            await this._initializeComponents();
            
            // Setup component communication
            this._setupComponentCommunication();
            
            // Setup global error handling
            this._setupErrorHandling();
            
            // Mark as initialized
            this.isInitialized = true;
            this.performanceStats.initTime = performance.now() - this.startTime;
            
            CONFIG.UTILS.log('info', 'Application initialized successfully', {
                initTime: this.performanceStats.initTime.toFixed(2) + 'ms'
            });
            
            // Setup performance monitoring if enabled
            if (CONFIG.DEBUG.LOG_PERFORMANCE) {
                this._startPerformanceMonitoring();
            }
            
            return true;
            
        } catch (error) {
            CONFIG.UTILS.log('error', 'Application initialization failed', error);
            this._handleCriticalError(error);
            return false;
        }
    }
    
    /**
     * Check system requirements and browser compatibility
     */
    _checkSystemRequirements() {
        // Check browser support
        if (!CONFIG.UTILS.isBrowserSupported()) {
            throw new Error(CONFIG.ERROR_CODES.BROWSER_NOT_SUPPORTED);
        }
        
        // Check for required APIs
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('getUserMedia API not available');
        }
        
        // Check for Web Audio API
        if (!window.AudioContext && !window.webkitAudioContext) {
            throw new Error('Web Audio API not supported');
        }
        
        // Check for p5.js
        if (typeof p5 === 'undefined') {
            throw new Error('p5.js library not loaded');
        }
        
        // Check for Meyda
        if (typeof Meyda === 'undefined') {
            throw new Error('Meyda.js library not loaded');
        }
        
        // Warn about performance issues
        if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
            CONFIG.UTILS.log('warn', 'Low CPU core count detected, performance may be affected');
        }
        
        CONFIG.UTILS.log('info', 'System requirements check passed');
    }
    
    /**
     * Initialize all application components
     */
    async _initializeComponents() {
        // Initialize UI Controller first (handles DOM)
        CONFIG.UTILS.log('info', 'Initializing UI Controller...');
        this.uiController = new DJUIController();
        this.uiController.init();
        
        // Initialize Audio Processor
        CONFIG.UTILS.log('info', 'Initializing Audio Processor...');
        this.audioProcessor = new DJAudioProcessor();
        
        // Initialize Visualizer (will be setup by p5.js)
        CONFIG.UTILS.log('info', 'Preparing Visualizer...');
        this.visualizer = new DJVisualizer();
        
        // Pass components to UI controller
        this.uiController.setComponents(this.audioProcessor, this.visualizer);
    }
    
    /**
     * Setup communication between components
     */
    _setupComponentCommunication() {
        // Audio Processor -> Visualizer data flow
        this.audioProcessor.on('dataProcessed', (audioData) => {
            if (this.visualizer) {
                this.visualizer.setAudioData(audioData);
            }
        });
        
        // Audio Processor -> Performance tracking
        this.audioProcessor.on('dataProcessed', (audioData) => {
            this.performanceStats.totalFrames++;
            if (audioData.performance) {
                this.performanceStats.totalProcessingTime += audioData.performance.lastProcessingTime;
            }
        });
        
        // UI Controller -> App notifications
        if (this.uiController.showNotification) {
            this.audioProcessor.on('started', () => {
                this.uiController.showNotification('Audio processing started', 'success');
            });
            
            this.audioProcessor.on('stopped', () => {
                this.uiController.showNotification('Audio processing stopped', 'info');
            });
            
            this.audioProcessor.on('error', (errorData) => {
                this.uiController.showNotification(`Error: ${errorData.message}`, 'error');
            });
        }
        
        CONFIG.UTILS.log('info', 'Component communication setup complete');
    }
    
    /**
     * Setup global error handling
     */
    _setupErrorHandling() {
        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            CONFIG.UTILS.log('error', 'Unhandled promise rejection', event.reason);
            
            // Try to recover gracefully
            if (this.audioProcessor && this.audioProcessor.isProcessing) {
                this.audioProcessor.stop();
            }
            
            event.preventDefault(); // Prevent default browser error handling
        });
        
        // Catch general JavaScript errors
        window.addEventListener('error', (event) => {
            CONFIG.UTILS.log('error', 'JavaScript error', {
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno
            });
        });
        
        // Audio context state monitoring
        if (this.audioProcessor && this.audioProcessor.audioContext) {
            this.audioProcessor.audioContext.addEventListener('statechange', () => {
                const state = this.audioProcessor.audioContext.state;
                
                if (state === 'interrupted' || state === 'closed') {
                    CONFIG.UTILS.log('warn', 'Audio context interrupted', state);
                    
                    if (this.uiController) {
                        this.uiController.showNotification('Audio interrupted, please restart', 'warning');
                    }
                }
            });
        }
    }
    
    /**
     * Handle critical errors that prevent app functionality
     */
    _handleCriticalError(error) {
        const errorMessage = `Critical Error: ${error.message}`;
        
        // Update UI to show error state
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = errorMessage;
            statusElement.style.color = '#ef4444';
        }
        
        // Disable controls
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.textContent = 'System Error';
        }
        
        // Show user-friendly error message
        const errorDialog = `
            DJ Audio Visualizer Error
            
            ${errorMessage}
            
            Please check:
            - Browser compatibility (Chrome recommended)
            - Microphone permissions
            - Audio device connectivity
            - JavaScript console for details
            
            Error Code: ${error.code || 'UNKNOWN'}
        `;
        
        alert(errorDialog);
        
        CONFIG.UTILS.log('error', 'Critical error handled', error);
    }
    
    /**
     * Start performance monitoring
     */
    _startPerformanceMonitoring() {
        const monitorInterval = CONFIG.PERFORMANCE.PERFORMANCE_LOG_INTERVAL;
        
        setInterval(() => {
            if (this.isInitialized) {
                const stats = this.getPerformanceStats();
                CONFIG.UTILS.log('debug', 'Performance Stats', stats);
            }
        }, monitorInterval);
        
        CONFIG.UTILS.log('info', 'Performance monitoring started');
    }
    
    /**
     * Get current performance statistics
     */
    getPerformanceStats() {
        const runtime = performance.now() - this.startTime;
        const avgProcessingTime = this.performanceStats.totalFrames > 0 ? 
            this.performanceStats.totalProcessingTime / this.performanceStats.totalFrames : 0;
        
        return {
            runtime: runtime.toFixed(2) + 'ms',
            initTime: this.performanceStats.initTime.toFixed(2) + 'ms',
            totalFrames: this.performanceStats.totalFrames,
            avgProcessingTime: avgProcessingTime.toFixed(2) + 'ms',
            currentFPS: this.visualizer ? this.visualizer.getFPS().toFixed(1) : 0,
            memoryUsage: performance.memory ? {
                used: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
                total: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
                limit: (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + 'MB'
            } : 'Not available'
        };
    }
    
    /**
     * Get application state
     */
    getAppState() {
        return {
            isInitialized: this.isInitialized,
            audioProcessor: this.audioProcessor ? {
                isProcessing: this.audioProcessor.isProcessing,
                currentData: this.audioProcessor.getCurrentData()
            } : null,
            visualizer: this.visualizer ? {
                currentMode: this.visualizer.currentMode,
                isActive: this.visualizer.isActive,
                fps: this.visualizer.getFPS()
            } : null,
            uiController: this.uiController ? this.uiController.getUIState() : null,
            performance: this.getPerformanceStats()
        };
    }
    
    /**
     * Cleanup and shutdown
     */
    shutdown() {
        CONFIG.UTILS.log('info', 'Shutting down application...');
        
        // Stop audio processing
        if (this.audioProcessor) {
            this.audioProcessor.destroy();
        }
        
        // Clean up visualizer
        if (this.visualizer) {
            this.visualizer = null;
        }
        
        // Clean up UI controller
        if (this.uiController) {
            this.uiController = null;
        }
        
        this.isInitialized = false;
        
        CONFIG.UTILS.log('info', 'Application shutdown complete');
    }
    
    /**
     * Restart application (for error recovery)
     */
    async restart() {
        CONFIG.UTILS.log('info', 'Restarting application...');
        
        this.shutdown();
        
        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Reinitialize
        return await this.init();
    }
}

// Global application instance
let djApp = null;

// P5.js setup function - called automatically by p5.js
function setup() {
    if (djApp && djApp.visualizer) {
        djApp.visualizer.setup();
    }
}

// P5.js draw function - called automatically by p5.js
function draw() {
    if (djApp && djApp.visualizer) {
        djApp.visualizer.draw();
    }
}

// P5.js window resize handler
function windowResized() {
    if (djApp && djApp.visualizer) {
        djApp.visualizer.windowResized();
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    CONFIG.UTILS.log('info', 'DOM loaded, starting DJ Visualizer App');
    
    try {
        // Create and initialize application
        djApp = new DJVisualizerApp();
        const success = await djApp.init();
        
        if (success) {
            CONFIG.UTILS.log('info', 'DJ Visualizer App ready!');
            
            // Make app globally accessible for debugging
            if (CONFIG.DEBUG.ENABLED) {
                window.djApp = djApp;
                window.CONFIG = CONFIG;
                
                console.log('Debug mode enabled. Access app via window.djApp and config via window.CONFIG');
                console.log('Available debug commands:');
                console.log('- djApp.getAppState() - Get current application state');
                console.log('- djApp.getPerformanceStats() - Get performance statistics');
                console.log('- djApp.restart() - Restart application');
            }
            
        } else {
            throw new Error('Application initialization failed');
        }
        
    } catch (error) {
        CONFIG.UTILS.log('error', 'Failed to start DJ Visualizer App', error);
        
        // Show critical error to user
        if (djApp) {
            djApp._handleCriticalError(error);
        }
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (djApp) {
        djApp.shutdown();
    }
});