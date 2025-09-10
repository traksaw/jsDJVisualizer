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
    
    // Get frequency data
    this.analyserNode.getByteFrequencyData(this.dataArray);
    
    // Get time domain data for RMS calculation
    this.analyserNode.getByteTimeDomainData(this.timeDataArray);
    
    // Calculate RMS with 65% reduction (30% + 50% of remaining)
    this.rms = this.calculateRMS(this.timeDataArray) * 0.35;
    
    // Convert byte frequency data to float spectrum
    this.spectrum = Array.from(this.dataArray).map(val => val / 255);
    
    // Calculate frequency bands using proper EQ ranges with different reductions
    const sr = this.audioContext.sampleRate;
    this.bass = this.bandEnergy(this.spectrum, sr, 20, 250) * 0.15;      // Bass: 20-250 Hz (85% reduction)
    this.mid = this.bandEnergy(this.spectrum, sr, 251, 6000) * 0.35;    // Mid: 251-6000 Hz (65% reduction)
    this.treble = this.bandEnergy(this.spectrum, sr, 6001, 20000) * 0.35; // High: 6001-20000 Hz (65% reduction)
    
    // Log audio analysis data for debugging
    if (Math.random() < 0.1) { // Log every ~10th frame to avoid spam
      console.log('Audio Analysis:', {
        rms: this.rms.toFixed(4),
        bass: this.bass.toFixed(4),
        mid: this.mid.toFixed(4),
        treble: this.treble.toFixed(4),
        timestamp: new Date().toLocaleTimeString()
      });
    }
    
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

    // Use only AnalyserNode - no deprecated ScriptProcessorNode becasue of error 
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
