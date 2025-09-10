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
    const inputs = devices.filter(d => d.kind === 'audioinput');
    
    return inputs.map((d, i) => ({
      deviceId: d.deviceId,
      label: d.label || `Input ${i+1}`
    }));
  }

  findSeratoInput(inputs) {
    return inputs.find(d => /serato/i.test(d.label));
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
    
    // Get frequency data
    this.analyserNode.getByteFrequencyData(this.dataArray);
    
    // Get time domain data for RMS calculation
    this.analyserNode.getByteTimeDomainData(this.timeDataArray);
    
    // Calculate RMS
    this.rms = this.calculateRMS(this.timeDataArray);
    
    // Convert byte frequency data to float spectrum
    this.spectrum = Array.from(this.dataArray).map(val => val / 255);
    
    // Calculate frequency bands using proper EQ ranges
    const sr = this.audioContext.sampleRate;
    this.bass = this.bandEnergy(this.spectrum, sr, 20, 250);     // Bass: 20-250 Hz (sub-bass + fundamental bass)
    this.mid = this.bandEnergy(this.spectrum, sr, 251, 6000);    // Mid: 251-6000 Hz
    this.treble = this.bandEnergy(this.spectrum, sr, 6001, 20000); // High: 6001-20000 Hz
    
    // Notify listeners of data update
    if (this.onDataUpdate) {
      this.onDataUpdate({
        rms: this.rms,
        bass: this.bass,
        mid: this.mid,
        treble: this.treble,
        spectrum: this.spectrum
      });
    }
    
    // Continue updating
    requestAnimationFrame(() => this.updateAudioData());
  }

  async startAudio(deviceId = null) {
    const constraints = deviceId 
      ? { audio: { deviceId: { exact: deviceId } } } 
      : { audio: true };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.sourceNode = this.audioContext.createMediaStreamSource(stream);

    // Use only AnalyserNode - no deprecated ScriptProcessorNode
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 1024;
    this.analyserNode.smoothingTimeConstant = 0.8;
    this.sourceNode.connect(this.analyserNode);

    // Initialize data arrays
    const bufferLength = this.analyserNode.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
    this.timeDataArray = new Uint8Array(this.analyserNode.fftSize);

    // Start audio analysis loop
    this.isRunning = true;
    this.updateAudioData();
  }

  stop() {
    this.isRunning = false;
    if (this.audioContext) {
      this.audioContext.close();
    }
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
