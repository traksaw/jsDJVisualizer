// src/audio.js
// Encapsulates Web Audio setup + RMS metering

export class AudioService {
    constructor() {
      this.audioContext = null;
      this.sourceNode = null;
      this.analyser = null;
      this._raf = null;
      this._onRMS = null;
      this._stream = null;
    }
  
    async start(deviceId) {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia not supported. Use Chrome over http(s) (localhost).');
      }
  
      const constraints = deviceId
        ? { audio: { deviceId: { exact: deviceId } } }
        : { audio: true };
  
      this._stream = await navigator.mediaDevices.getUserMedia(constraints);
  
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
  
      this.sourceNode = this.audioContext.createMediaStreamSource(this._stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024; // good balance for RMS
      this.sourceNode.connect(this.analyser);
  
      const time = new Float32Array(this.analyser.fftSize);
      const tick = () => {
        if (!this.analyser) return;
        this.analyser.getFloatTimeDomainData(time);
        let sum = 0;
        for (let i = 0; i < time.length; i++) sum += time[i] * time[i];
        const rms = Math.sqrt(sum / time.length);
        if (this._onRMS) this._onRMS(rms);
        this._raf = requestAnimationFrame(tick);
      };
      tick();
    }
  
    onRMS(callback) {
      this._onRMS = callback;
    }
  
    async stop() {
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = null;
  
      try {
        if (this.sourceNode) this.sourceNode.disconnect();
      } catch (_) {}
  
      if (this.analyser) this.analyser.disconnect?.();
      this.analyser = null;
      this.sourceNode = null;
  
      if (this._stream) {
        this._stream.getTracks().forEach(t => t.stop());
        this._stream = null;
      }
  
      if (this.audioContext) {
        try { await this.audioContext.close(); } catch (_) {}
        this.audioContext = null;
      }
    }
  }
  