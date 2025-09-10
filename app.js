class DJVisualizerApp {
  constructor() {
    this.audioProcessor = new AudioProcessor();
    this.visualizer = new DJVisualizer();
    this.isRunning = false;
    
    this.startBtn = null;
    this.inputSelect = null;
  }

  async init() {
    // Initialize DOM elements
    this.startBtn = document.getElementById('start');
    this.inputSelect = document.getElementById('inputs');

    // Set up event listeners
    this.startBtn.addEventListener('click', () => this.toggleAudio());

    // Initialize visualizer
    this.visualizer.init();

    // Set up audio data callback
    this.audioProcessor.onDataUpdate = (data) => {
      this.visualizer.updateAudioData(data);
    };

    // Load audio inputs
    await this.loadAudioInputs();
  }

  async loadAudioInputs() {
    if (!navigator.mediaDevices) {
      console.error('MediaDevices API not supported in this browser');
      return;
    }

    try {
      console.log('Loading audio inputs...');
      const inputs = await this.audioProcessor.listInputs();
      console.log('Available audio inputs:', inputs);
      
      // Clear existing options
      this.inputSelect.innerHTML = '';
      
      if (inputs.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'No audio inputs found';
        this.inputSelect.appendChild(option);
        console.warn('No audio input devices detected');
        return;
      }
      
      // Add input options
      inputs.forEach((input, index) => {
        const option = document.createElement('option');
        option.value = input.deviceId;
        option.textContent = input.label;
        this.inputSelect.appendChild(option);
        console.log(`Input ${index + 1}: ${input.label} (${input.deviceId})`);
      });

      // Auto-select Serato if available
      const seratoInput = this.audioProcessor.findSeratoInput(inputs);
      if (seratoInput) {
        this.inputSelect.value = seratoInput.deviceId;
        console.log('Auto-selected Serato input:', seratoInput.label);
      } else {
        console.log('No Serato input found, using default');
      }
    } catch (error) {
      console.error('Error loading audio inputs:', error);
      const option = document.createElement('option');
      option.textContent = 'Error loading inputs';
      this.inputSelect.appendChild(option);
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
      const deviceId = this.inputSelect.value || null;
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
