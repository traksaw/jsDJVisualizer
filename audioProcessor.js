class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.sourceNode = null;
    this.meydaAnalyzer = null;
    this.analyserNode = null;
    
    // Audio data
    this.rms = 0;
    this.bass = 0;
    this.mid = 0;
    this.treble = 0;
    this.spectrum = [];
    
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

    // Optional extra analyser for future smoothing
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 1024;
    this.sourceNode.connect(this.analyserNode);

    this.meydaAnalyzer = Meyda.createMeydaAnalyzer({
      audioContext: this.audioContext,
      source: this.sourceNode,
      bufferSize: 512,
      featureExtractors: ['rms', 'amplitudeSpectrum'],
      callback: (features) => {
        this.rms = features.rms || 0;
        this.spectrum = features.amplitudeSpectrum || this.spectrum;

        const sr = this.audioContext.sampleRate;
        this.bass = this.bandEnergy(this.spectrum, sr, 20, 250);
        this.mid = this.bandEnergy(this.spectrum, sr, 250, 2000);
        this.treble = this.bandEnergy(this.spectrum, sr, 2000, 8000);

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
      }
    });

    this.meydaAnalyzer.start();
  }

  stop() {
    if (this.meydaAnalyzer) {
      this.meydaAnalyzer.stop();
    }
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
