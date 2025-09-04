// Owns: getUserMedia + AudioContext + Meyda feature extraction.
// Emits: { rms, spectrum, bands: { bass, mid, treble } } via onFeatures.

export class AnalysisService {
    constructor() {
      this.audioContext = null;
      this.sourceNode = null;
      this.meyda = null;
      this.stream = null;
      this._onFeatures = null;
    }
  
    async start(deviceId) {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia not supported. Use Chrome over http(s) (localhost).');
      }
      if (!window.Meyda) {
        throw new Error('Meyda not found on window. Check <script> include.');
      }
  
      const constraints = deviceId
        ? { audio: { deviceId: { exact: deviceId } } }
        : { audio: true };
  
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (this.audioContext.state === 'suspended') await this.audioContext.resume();
  
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
  
      this.meyda = window.Meyda.createMeydaAnalyzer({
        audioContext: this.audioContext,
        source: this.sourceNode,
        bufferSize: 512, // ~86 fps @ 44.1kHz
        featureExtractors: ['rms', 'amplitudeSpectrum'],
        callback: (f) => {
          if (!this._onFeatures) return;
  
          const spectrum = f.amplitudeSpectrum || [];
          const sr = this.audioContext.sampleRate || 44100;
          const bands = {
            bass:   avgBand(spectrum, sr,  20,  250),
            mid:    avgBand(spectrum, sr, 250, 2000),
            treble: avgBand(spectrum, sr, 2000, 8000),
          };
  
          this._onFeatures({
            rms: f.rms || 0,
            spectrum,
            bands,
          });
        },
      });
  
      this.meyda.start();
    }
  
    onFeatures(cb) { this._onFeatures = cb; }
  
    async stop() {
      if (this.meyda) {
        try { this.meyda.stop(); } catch (_) {}
        this.meyda = null;
      }
      if (this.sourceNode) {
        try { this.sourceNode.disconnect(); } catch (_) {}
        this.sourceNode = null;
      }
      if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
      }
      if (this.audioContext) {
        try { await this.audioContext.close(); } catch (_) {}
        this.audioContext = null;
      }
    }
  }
  
  // Average energy in [fmin, fmax] Hz from amplitude spectrum
  function avgBand(spec, sampleRate, fmin, fmax) {
    if (!spec || spec.length === 0) return 0;
    const nyquist = sampleRate / 2;
    const binHz = nyquist / (spec.length - 1);
    const start = Math.max(0, Math.floor(fmin / binHz));
    const end = Math.min(spec.length - 1, Math.ceil(fmax / binHz));
    let sum = 0;
    for (let i = start; i <= end; i++) sum += spec[i];
    const count = Math.max(1, end - start + 1);
    return sum / count;
  }
  