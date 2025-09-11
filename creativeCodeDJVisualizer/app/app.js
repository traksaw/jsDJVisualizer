class DJVisualizerApp {
  constructor() {
    this.audioProcessor = new AudioProcessor();
    this.visualizer = new DJVisualizer();
    this.isRunning = false;
    
    this.startBtn = null;
    this.fullscreenBtn = null;
    this.deviceStatusSpan = null;
    this.bpmCounter = null;
    this.fpsCounter = null;
    this.lastFrameTime = 0;
    this.frameCount = 0;
    
    // Gain controls
    this.bassGain = 1.0;
    this.midGain = 1.0;
    this.highGain = 1.0;
  }

  async init() {
    // Initialize DOM elements
    this.startBtn = document.getElementById('start');
    this.fullscreenBtn = document.getElementById('fullscreen');
    this.deviceStatusSpan = document.getElementById('deviceStatus');
    this.bpmCounter = document.getElementById('bpmCounter');
    this.beatIndicator = document.getElementById('beatIndicator');
    this.fpsCounter = document.getElementById('fpsCounter');

    // Set up event listeners
    this.startBtn.addEventListener('click', () => this.toggleAudio());
    this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    
    // Set up gain controls
    this.setupGainControls();
    
    // Set up keyboard shortcuts for live performance
    document.addEventListener('keydown', (e) => {
      // Prevent shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT') return;
      
      switch(e.code) {
        case 'Space':
          e.preventDefault();
          this.toggleAudio();
          break;
        case 'KeyF':
          e.preventDefault();
          this.toggleFullscreen();
          break;
        case 'Digit1':
          e.preventDefault();
          this.switchVisualizationMode('spectrum');
          break;
        case 'Digit2':
          e.preventDefault();
          this.switchVisualizationMode('particles');
          break;
        case 'Digit3':
          e.preventDefault();
          this.switchVisualizationMode('rings');
          break;
        case 'Digit4':
          e.preventDefault();
          this.switchVisualizationMode('waves');
          break;
        case 'KeyR':
          e.preventDefault();
          this.resetGains();
          break;
        case 'Slash':
        case 'Question':
          e.preventDefault();
          this.toggleHelp();
          break;
        case 'Escape':
          e.preventDefault();
          this.hideHelp();
          break;
      }
    });

    // Initialize visualizer
    this.visualizer.init();

    // Set up audio data callback with gain adjustment
    this.audioProcessor.onDataUpdate = (data) => {
      // Apply gain adjustments
      const adjustedData = {
        ...data,
        bass: data.bass * this.bassGain,
        mid: data.mid * this.midGain,
        high: data.high * this.highGain
      };
      this.visualizer.updateAudioData(adjustedData);
      console.log(`Received BPM data: ${data.bpm}`);
      this.updateBPM(data.bpm);
      this.updateFPS();
    };

    // Populate audio devices and auto-start
    await this.populateAudioDevices();
    await this.setupDefaultAudio();
  }

  async setupDefaultAudio() {
    if (!navigator.mediaDevices) {
      console.error('MediaDevices API not supported in this browser');
      return;
    }

    try {
      console.log('Setting up default audio input...');
      const inputs = await this.audioProcessor.listInputs();
      console.log('Available audio inputs:', inputs);
      
      if (inputs.length === 0) {
        console.warn('No audio input devices detected');
        return;
      }
      
      // Auto-select preferred input (prioritizes DDJ-REV1, then any available device)
      const preferredInput = this.audioProcessor.findDJInput(inputs);
      if (preferredInput) {
        this.selectedDeviceId = preferredInput.deviceId;
        console.log('Auto-selected preferred input:', preferredInput.label);
      } else if (inputs.length > 0) {
        // Default to first available input if no DJ device found
        this.selectedDeviceId = inputs[0].deviceId;
        console.log('Auto-selected first available input:', inputs[0].label);
      }
    } catch (error) {
      console.error('Error setting up default audio:', error);
      this.selectedDeviceId = null;
    }
  }

  async toggleAudio() {
    if (!this.isRunning) {
      await this.startAudio();
    } else {
      this.stopAudio();
    }
  }

  async startAudio() {
    try {
      await this.audioProcessor.startAudio();
      this.visualizer.start(); // Start visualizer
      this.isRunning = true;
      this.startBtn.textContent = 'Stop';
      this.startBtn.style.backgroundColor = '#ff4444';
      
      console.log('DJ Visualizer started');
    } catch (error) {
      console.error('Failed to start audio:', error);
      alert('Failed to start audio. Please check your microphone permissions.');
    }
  }

  stopAudio() {
    this.audioProcessor.stop();
    this.visualizer.stop(); // Stop visualizer
    
    this.isRunning = false;
    this.startBtn.textContent = 'Start';
    this.startBtn.style.backgroundColor = '';
    
    console.log('DJ Visualizer stopped');
  }

  setupGainControls() {
    const bassSlider = document.getElementById('bassGain');
    const midSlider = document.getElementById('midGain');
    const highSlider = document.getElementById('highGain');
    const bassValue = document.getElementById('bassValue');
    const midValue = document.getElementById('midValue');
    const highValue = document.getElementById('highValue');
    
    bassSlider.addEventListener('input', (e) => {
      this.bassGain = parseFloat(e.target.value);
      bassValue.textContent = this.bassGain.toFixed(1);
    });
    
    midSlider.addEventListener('input', (e) => {
      this.midGain = parseFloat(e.target.value);
      midValue.textContent = this.midGain.toFixed(1);
    });
    
    highSlider.addEventListener('input', (e) => {
      this.highGain = parseFloat(e.target.value);
      highValue.textContent = this.highGain.toFixed(1);
    });
  }
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      
      switch(e.code) {
        case 'Space':
          e.preventDefault();
          this.toggleAudio();
          break;
        case 'KeyF':
          e.preventDefault();
          this.toggleFullscreen();
          break;
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
        case 'Digit5':
        case 'Digit6':
        case 'Digit7':
        case '6': case '7': case '8': case '9':
          e.preventDefault();
          this.switchVisualizationMode(parseInt(e.key) - 1);
          break;
      }
    });
  }
  
  switchVisualizationMode(index) {
    const visualModeSelect = document.getElementById('visualMode');
    if (index < visualModeSelect.options.length) {
      visualModeSelect.selectedIndex = index;
      visualModeSelect.dispatchEvent(new Event('change'));
    }
  }
  
  async autoSelectAudioDevice() {
    try {
      const inputs = await this.audioProcessor.listInputs();
      
      // Auto-select DJ device if found
      const djDevice = this.audioProcessor.findDJInput(inputs);
      if (djDevice) {
        this.deviceStatusSpan.textContent = `Auto-selected: ${djDevice.label}`;
        return djDevice.deviceId;
      } else {
        this.deviceStatusSpan.textContent = 'Using default audio device';
        return null;
      }
    } catch (error) {
      console.error('Error selecting audio device:', error);
      this.deviceStatusSpan.textContent = 'Using default audio device';
      return null;
    }
  }
  
  
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error entering fullscreen:', err);
      });
      this.fullscreenBtn.textContent = 'Exit Fullscreen';
    } else {
      document.exitFullscreen();
      this.fullscreenBtn.textContent = 'Fullscreen';
    }
  }
  
  switchVisualizationMode(mode) {
    const visualModeSelect = document.getElementById('visualMode');
    if (visualModeSelect) {
      visualModeSelect.value = mode;
      visualModeSelect.dispatchEvent(new Event('change'));
    }
  }

  resetGains() {
    this.bassGain = 1.0;
    this.midGain = 1.0;
    this.highGain = 1.0;
    
    // Update UI sliders
    const bassSlider = document.getElementById('bassGain');
    const midSlider = document.getElementById('midGain');
    const highSlider = document.getElementById('highGain');
    
    if (bassSlider) {
      bassSlider.value = 1.0;
      document.getElementById('bassValue').textContent = '1.0';
    }
    if (midSlider) {
      midSlider.value = 1.0;
      document.getElementById('midValue').textContent = '1.0';
    }
    if (highSlider) {
      highSlider.value = 1.0;
      document.getElementById('highValue').textContent = '1.0';
    }
  }

  updateBPM(bpm) {
    if (this.bpmCounter) {
      this.bpmCounter.textContent = `BPM: ${bpm || '--'}`;
      console.log(`UI BPM Display: ${bpm || '--'}`);
    }
    
    // Flash beat indicator when BPM is detected
    if (bpm > 0 && this.beatIndicator) {
      this.beatIndicator.classList.add('flash');
      setTimeout(() => {
        this.beatIndicator.classList.remove('flash');
      }, 150);
    }
  }

  toggleHelp() {
    const helpOverlay = document.getElementById('helpOverlay');
    if (helpOverlay) {
      helpOverlay.style.display = helpOverlay.style.display === 'none' ? 'flex' : 'none';
    }
  }

  hideHelp() {
    const helpOverlay = document.getElementById('helpOverlay');
    if (helpOverlay) {
      helpOverlay.style.display = 'none';
    }
  }

  updateFPS() {
    this.frameCount++;
    const currentTime = performance.now();
    
    if (currentTime - this.lastFrameTime >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFrameTime));
      this.fpsCounter.textContent = `FPS: ${fps}`;
      this.frameCount = 0;
      this.lastFrameTime = currentTime;
    }
  }

  destroy() {
    this.stopAudio();
    this.visualizer.destroy();
  }
}

// Initialize the app when the page loads
let djApp;

document.addEventListener('DOMContentLoaded', async () => {
  djApp = new DJVisualizerApp();
  await djApp.init();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (djApp) {
    djApp.destroy();
  }
});
