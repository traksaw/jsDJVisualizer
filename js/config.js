/**
 * DJ Audio Visualizer Configuration
 * Central configuration file for all constants and settings
 */

// Disable p5.js friendly errors for better performance
if (typeof p5 !== 'undefined') {
    p5.disableFriendlyErrors = true;
}

const CONFIG = {
    // Audio Settings
    AUDIO: {
        SAMPLE_RATE: 44100,
        BUFFER_SIZE: 512,
        LATENCY_HINT: 'interactive',
        
        // Audio constraints for getUserMedia
        CONSTRAINTS: {
            sampleRate: 44100,
            channelCount: 2,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            latency: 0
        },
        
        // Virtual audio device detection keywords
        VIRTUAL_DEVICE_KEYWORDS: [
            'serato',
            'virtual audio',
            'vac',
            'voicemeeter',
            'obs',
            'audio repeater',
            'virtual cable'
        ]
    },

    // Frequency Band Definitions
    FREQUENCY_BANDS: {
        BASS: {
            MIN: 20,    // Hz
            MAX: 250,   // Hz
            COLOR: [255, 68, 68],      // RGB
            BOOST_DEFAULT: 1.0
        },
        MID: {
            MIN: 250,   // Hz  
            MAX: 4000,  // Hz
            COLOR: [34, 197, 94],      // RGB
            BOOST_DEFAULT: 1.0
        },
        HIGH: {
            MIN: 4000,  // Hz
            MAX: 20000, // Hz
            COLOR: [59, 130, 246],     // RGB
            BOOST_DEFAULT: 1.0
        },
        SUB_BASS: {
            MIN: 20,    // Hz
            MAX: 80,    // Hz
            COLOR: [139, 69, 19],      // RGB
            BOOST_DEFAULT: 1.0
        }
    },

    // Meyda.js Feature Extractors (using only stable features)
    MEYDA_FEATURES: [
        'amplitudeSpectrum',
        'rms',
        'energy', 
        'spectralCentroid'
        // Removed spectralFlux, loudness, zcr - causing TypeError issues
        // Can be added back individually if needed
    ],

    // Performance Settings
    PERFORMANCE: {
        TARGET_FPS: 60,
        UPDATE_INTERVAL: 16,        // ms (~60fps)
        SMOOTHING_FACTOR: 0.8,      // For amplitude smoothing
        MEMORY_CLEANUP_INTERVAL: 5000, // ms
        MAX_PARTICLES: 500,
        
        // Performance monitoring
        FPS_SAMPLE_SIZE: 30,        // Number of frames to average
        PERFORMANCE_LOG_INTERVAL: 1000 // ms
    },

    // Visualization Settings
    VISUALIZATION: {
        // Default parameters
        DEFAULT_SENSITIVITY: 1.0,
        DEFAULT_BASS_BOOST: 1.0,
        DEFAULT_ANIMATION_SPEED: 1.0,
        
        // Canvas settings
        PIXEL_DENSITY: 1,           // Optimize for performance
        RENDERER: 'P2D',            // Use 2D mode for better compatibility
        
        // Color schemes
        COLOR_SCHEMES: {
            DEFAULT: {
                BACKGROUND: [0, 0, 0],
                PRIMARY: [255, 255, 255],
                ACCENT: [34, 197, 94]
            },
            DJ_CLUB: {
                BACKGROUND: [10, 0, 20],
                PRIMARY: [255, 0, 128],
                ACCENT: [0, 255, 255]
            },
            RETRO: {
                BACKGROUND: [20, 0, 40],
                PRIMARY: [255, 20, 147],
                ACCENT: [0, 255, 127]
            }
        },

        // Visualization modes configuration
        MODES: {
            SPECTRUM: {
                BAR_WIDTH_RATIO: 0.8,
                MIN_HEIGHT: 5,
                MAX_HEIGHT_RATIO: 0.8
            },
            WAVEFORM: {
                CIRCLE_POINTS: 128,
                BASE_RADIUS: 150,
                MAX_AMPLITUDE: 100
            },
            PARTICLES: {
                BASS_PARTICLE_COUNT: 50,
                MID_PARTICLE_COUNT: 100, 
                HIGH_PARTICLE_COUNT: 200,
                PARTICLE_LIFETIME: 60,   // frames
                GRAVITY: 0.1
            },
            EQ_BARS: {
                BAR_WIDTH: 100,
                MAX_HEIGHT: 300,
                SPACING: 150,
                REFLECTION: true
            }
        }
    },

    // UI Settings
    UI: {
        UPDATE_INTERVAL: 50,        // ms - UI update frequency
        ANIMATION_DURATION: 300,    // ms - CSS transition duration
        DEBOUNCE_DELAY: 100,        // ms - Input debouncing
        
        // Control panel settings
        PANEL_OPACITY: 0.9,
        PANEL_BLUR: 10,             // px - backdrop filter blur
        
        // EQ meter settings
        METER_SMOOTHING: 0.7,       // Smoothing factor for EQ meters
        METER_DECAY: 0.95,          // Decay rate for peak indicators
        
        // Status messages
        MESSAGES: {
            READY: 'Ready to start audio processing',
            INITIALIZING: 'Initializing audio system...',
            REQUESTING_PERMISSION: 'Requesting microphone access...',
            STARTING: 'Starting audio processing...',
            ACTIVE: 'Audio processing active',
            STOPPED: 'Audio processing stopped',
            ERROR: 'Error occurred',
            NO_VIRTUAL_DEVICE: 'No virtual audio device detected',
            VIRTUAL_DEVICE_FOUND: 'Virtual audio device found'
        }
    },

    // Debug and Development
    DEBUG: {
        ENABLED: false,             // Set to true for debug mode
        LOG_AUDIO_DATA: false,      // Log raw audio data
        LOG_PERFORMANCE: true,      // Log performance metrics
        SHOW_FPS: true,            // Show FPS counter
        CONSOLE_LEVEL: 'info',      // console log level
        
        // Development helpers
        MOCK_AUDIO_DATA: false,     // Use mock data when no audio
        FORCE_VIRTUAL_DEVICE: false // Force virtual device detection
    },

    // Browser Compatibility
    BROWSER: {
        // Minimum requirements
        MIN_CHROME_VERSION: 70,
        MIN_FIREFOX_VERSION: 70,
        MIN_SAFARI_VERSION: 14,
        
        // Feature detection
        REQUIRED_FEATURES: [
            'AudioContext',
            'getUserMedia',
            'MediaStreamSource',
            'AnalyserNode'
        ],
        
        // Fallbacks
        USE_WEBKIT_PREFIX: true,    // For Safari compatibility
        POLYFILL_AUDIO_WORKLET: true
    },

    // Error Handling
    ERROR_CODES: {
        AUDIO_CONTEXT_FAILED: 'AUDIO_001',
        MICROPHONE_ACCESS_DENIED: 'AUDIO_002',
        DEVICE_NOT_FOUND: 'AUDIO_003',
        MEYDA_INITIALIZATION_FAILED: 'AUDIO_004',
        BROWSER_NOT_SUPPORTED: 'BROWSER_001',
        WEBGL_NOT_SUPPORTED: 'RENDER_001'
    },

    // API Keys and External Resources (if needed in future)
    EXTERNAL: {
        // Placeholder for future integrations
        // SPOTIFY_CLIENT_ID: '',
        // SOUNDCLOUD_CLIENT_ID: ''
    }
};

// Derived configurations (computed from base config)
CONFIG.DERIVED = {
    // Calculate Nyquist frequency
    NYQUIST_FREQUENCY: CONFIG.AUDIO.SAMPLE_RATE / 2,
    
    // Calculate bin size for frequency analysis
    BIN_SIZE: (CONFIG.AUDIO.SAMPLE_RATE / 2) / CONFIG.AUDIO.BUFFER_SIZE,
    
    // Calculate frequency band indices
    BASS_BIN_START: Math.floor(CONFIG.FREQUENCY_BANDS.BASS.MIN / 
                               ((CONFIG.AUDIO.SAMPLE_RATE / 2) / CONFIG.AUDIO.BUFFER_SIZE)),
    BASS_BIN_END: Math.floor(CONFIG.FREQUENCY_BANDS.BASS.MAX / 
                             ((CONFIG.AUDIO.SAMPLE_RATE / 2) / CONFIG.AUDIO.BUFFER_SIZE)),
    MID_BIN_START: Math.floor(CONFIG.FREQUENCY_BANDS.MID.MIN / 
                              ((CONFIG.AUDIO.SAMPLE_RATE / 2) / CONFIG.AUDIO.BUFFER_SIZE)),
    MID_BIN_END: Math.floor(CONFIG.FREQUENCY_BANDS.MID.MAX / 
                            ((CONFIG.AUDIO.SAMPLE_RATE / 2) / CONFIG.AUDIO.BUFFER_SIZE)),
    HIGH_BIN_START: Math.floor(CONFIG.FREQUENCY_BANDS.HIGH.MIN / 
                               ((CONFIG.AUDIO.SAMPLE_RATE / 2) / CONFIG.AUDIO.BUFFER_SIZE)),
    HIGH_BIN_END: Math.floor(CONFIG.FREQUENCY_BANDS.HIGH.MAX / 
                             ((CONFIG.AUDIO.SAMPLE_RATE / 2) / CONFIG.AUDIO.BUFFER_SIZE))
};

// Utility functions for configuration
CONFIG.UTILS = {
    /**
     * Get frequency band color as p5.js color
     */
    getBandColor: (bandName, alpha = 255) => {
        const band = CONFIG.FREQUENCY_BANDS[bandName.toUpperCase()];
        return band ? [...band.COLOR, alpha] : [255, 255, 255, alpha];
    },

    /**
     * Check if browser is supported
     */
    isBrowserSupported: () => {
        return CONFIG.BROWSER.REQUIRED_FEATURES.every(feature => {
            switch(feature) {
                case 'AudioContext':
                    return !!(window.AudioContext || window.webkitAudioContext);
                case 'getUserMedia':
                    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
                case 'MediaStreamSource':
                    return !!(window.AudioContext && AudioContext.prototype.createMediaStreamSource);
                case 'AnalyserNode':
                    return !!(window.AudioContext && AudioContext.prototype.createAnalyser);
                default:
                    return true;
            }
        });
    },

    /**
     * Get optimal buffer size based on browser and performance
     */
    getOptimalBufferSize: () => {
        const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
        const isSafari = navigator.userAgent.toLowerCase().includes('safari') && 
                        !navigator.userAgent.toLowerCase().includes('chrome');
        
        if (isSafari) return 2048;      // Safari needs larger buffers
        if (isFirefox) return 1024;     // Firefox works well with medium buffers
        return CONFIG.AUDIO.BUFFER_SIZE; // Default for Chrome
    },

    /**
     * Debug logger
     */
    log: (level, message, data = null) => {
        if (!CONFIG.DEBUG.ENABLED) return;
        
        const levels = ['error', 'warn', 'info', 'debug'];
        const configLevel = CONFIG.DEBUG.CONSOLE_LEVEL;
        
        if (levels.indexOf(level) <= levels.indexOf(configLevel)) {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
            
            console[level](logMessage, data || '');
        }
    }
};

// Export for ES6 modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// Make config globally available
window.DJ_CONFIG = CONFIG;