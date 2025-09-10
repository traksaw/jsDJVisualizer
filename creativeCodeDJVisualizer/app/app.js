class DJVisualizerApp {
  constructor() {
    this.audioProcessor = new AudioProcessor();
    this.visualizer = new DJVisualizer();
    this.isRunning = false;
    
    this.startBtn = null;
  }

  async init() {
    // Initialize DOM elements
    this.startBtn = document.getElementById('start');

    // Set up event listeners
    this.startBtn.addEventListener('click', () => this.toggleAudio());

    // Initialize visualizer
    this.visualizer.init();

    // Set up audio data callback
    this.audioProcessor.onDataUpdate = (data) => {
      this.visualizer.updateAudioData(data);
    };

    // Auto-start with default audio input
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
      const deviceId = this.selectedDeviceId || null;
      console.log('Starting audio with device:', deviceId);
      
      await this.audioProcessor.startAudio(deviceId);
      
      this.isRunning = true;
      this.startBtn.textContent = 'Stop';
      this.startBtn.style.backgroundColor = '#ff4444';
      
      console.log('DJ Visualizer started successfully');
      
    } catch (error) {
      console.error('Error starting audio:', error);
      console.error('Error details:', error.name, error.message);
      
      let errorMessage = 'Error starting audio. ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow microphone access in your browser.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No audio input device found.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Audio device is already in use by another application.';
      } else {
        errorMessage += 'Please check your audio settings and try again.';
      }
      
      alert(errorMessage);
    }
  }

  stopAudio() {
    this.audioProcessor.stop();
    
    this.isRunning = false;
    this.startBtn.textContent = 'Start';
    this.startBtn.style.backgroundColor = '';
    
    console.log('DJ Visualizer stopped');
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
