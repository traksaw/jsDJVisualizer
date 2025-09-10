class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.sourceNode = null;
    this.analyserNode = null;
    
    // Audio data
    this.rms = 0;
    this.bass = 0;
    this.mid = 0;
    this.treble = 0;
    this.spectrum = [];
    this.dataArray = null;
    this.timeDataArray = null;
    this.isRunning = false;
    
    // Callbacks
    this.onDataUpdate = null;
  }

  async listInputs() {
    try {
      // Request permission first
      const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
      tmp.getTracks().forEach(t => t.stop());
    } catch(e) {}
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    const allInputs = devices.filter(d => d.kind === 'audioinput');
    
    // Show all available audio inputs
    const inputs = allInputs;
    
    console.log('Available audio inputs:', inputs.map(d => d.label));
    
    // Remove duplicates and redundant default entries
    const uniqueInputs = [];
    const seenLabels = new Set();
    const seenDeviceIds = new Set();
    
    inputs.forEach((d, i) => {
      let label = d.label || `Input ${i+1}`;
      
      // Skip if we've already seen this exact device ID
      if (seenDeviceIds.has(d.deviceId)) {
        return;
      }
      
      // Remove "Default - " prefix if the base device name already exists
      if (label.startsWith('Default - ')) {
        const baseLabel = label.replace('Default - ', '');
        const hasBaseDevice = inputs.some(input => 
          input.deviceId !== d.deviceId && 
          (input.label === baseLabel || input.label?.includes(baseLabel))
        );
        if (hasBaseDevice) {
          return; // Skip this default entry as the actual device exists
        }
      }
      
      // Handle duplicate labels by adding a counter
      if (seenLabels.has(label)) {
        let counter = 2;
        let newLabel = `${label} (${counter})`;
        while (seenLabels.has(newLabel)) {
          counter++;
          newLabel = `${label} (${counter})`;
        }
        label = newLabel;
      }
      
      seenLabels.add(label);
      seenDeviceIds.add(d.deviceId);
      uniqueInputs.push({
        deviceId: d.deviceId,
        label: label
      });
    });
    
    return uniqueInputs;
  }

  findDJInput(inputs) {
    // Look for Pioneer DDJ-REV1 first (hardware controller)
    const ddjRev1 = inputs.find(d => /ddj.*rev1/i.test(d.label));
    if (ddjRev1) return ddjRev1;
    
    // Look for any DDJ controller
    const ddj = inputs.find(d => /ddj/i.test(d.label));
    if (ddj) return ddj;
    
    // Look for Pioneer devices
    const pioneer = inputs.find(d => /pioneer/i.test(d.label));
    if (pioneer) return pioneer;
    
    return null;
  }

  bandEnergy(spec, sampleRate, fmin, fmax) {
    const nyquist = sampleRate / 2;
    const binHz = nyquist / (spec.length - 1);
    const start = Math.max(0, Math.floor(fmin / binHz));
    const end = Math.min(spec.length - 1, Math.ceil(fmax / binHz));
    
    let sum = 0;
    for (let i = start; i <= end; i++) {
      sum += spec[i];
    }
    
    const count = Math.max(1, end - start + 1);
    return sum / count;
  }

  calculateRMS(timeData) {
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const normalized = (timeData[i] - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / timeData.length);
  }

  updateAudioData() {
    if (!this.analyserNode || !this.isRunning) return;
    
    try {
      // Get frequency data
      this.analyserNode.getByteFrequencyData(this.dataArray);
      
      // Get time domain data for RMS calculation
      this.analyserNode.getByteTimeDomainData(this.timeDataArray);
      
      // Calculate RMS with smoothing
      const currentRMS = this.calculateRMS(this.timeDataArray) * 0.4;
      this.rms = this.rms * 0.8 + currentRMS * 0.2; // Smooth transitions
      
      // Convert byte frequency data to float spectrum
      this.spectrum = Array.from(this.dataArray).map(val => val / 255);
      
      // Calculate frequency bands with smoothing for stable visualization
      const sr = this.audioContext.sampleRate;
      const newBass = this.bandEnergy(this.spectrum, sr, 20, 250) * 0.175;
      const newMid = this.bandEnergy(this.spectrum, sr, 251, 4000) * 0.375;
      const newTreble = this.bandEnergy(this.spectrum, sr, 4001, 20000) * 0.5;
      
      // Apply smoothing to prevent jittery visuals
      this.bass = this.bass * 0.7 + newBass * 0.3;
      this.mid = this.mid * 0.7 + newMid * 0.3;
      this.treble = this.treble * 0.7 + newTreble * 0.3;
      
      // Notify listeners of data update
      if (this.onDataUpdate) {
        this.onDataUpdate({
          rms: this.rms,
          bass: this.bass,
          mid: this.mid,
          treble: this.treble,
          spectrum: this.spectrum,
          isActive: this.rms > 0.001
        });
      }
      
    } catch (error) {
      console.error('Error in audio data update:', error);
      // Continue with fallback values
      this.rms = this.bass = this.mid = this.treble = 0;
    }
    
    // Continue updating
    if (this.isRunning) {
      requestAnimationFrame(() => this.updateAudioData());
    }
  }

  async startAudio(deviceId = null) {
    try {
      // Stop any existing audio first
      this.stop();
      
      const constraints = deviceId 
        ? { 
            audio: { 
              deviceId: { exact: deviceId },
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false
            } 
          } 
        : { 
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false
            }
          };
      
      console.log('Requesting audio with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Store stream for cleanup
      this.stream = stream;

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.sourceNode = this.audioContext.createMediaStreamSource(stream);

      // Configure analyser for stable performance
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 1024;
      this.analyserNode.smoothingTimeConstant = 0.3; // Less smoothing for more responsive visuals
      this.analyserNode.minDecibels = -90;
      this.analyserNode.maxDecibels = -10;
      
      this.sourceNode.connect(this.analyserNode);

      // Initialize data arrays
      const bufferLength = this.analyserNode.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      this.timeDataArray = new Uint8Array(this.analyserNode.fftSize);

      // Reset audio values
      this.rms = this.bass = this.mid = this.treble = 0;

      // Start audio analysis loop
      this.isRunning = true;
      this.updateAudioData();
      
      console.log('Audio started successfully with sample rate:', this.audioContext.sampleRate);
      
    } catch (error) {
      this.isRunning = false;
      console.error('Failed to start audio:', error);
      throw error;
    }
  }

  stop() {
    this.isRunning = false;
    
    // Stop all audio tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    // Disconnect and clean up audio nodes
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    // Reset audio data
    this.rms = this.bass = this.mid = this.treble = 0;
    this.spectrum = [];
    
    console.log('Audio stopped and cleaned up');
  }

  getAudioData() {
    return {
      rms: this.rms,
      bass: this.bass,
      mid: this.mid,
      treble: this.treble,
      spectrum: this.spectrum
    };
  }
}
