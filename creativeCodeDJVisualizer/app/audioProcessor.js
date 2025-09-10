class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.sourceNode = null;
    this.analyserNode = null;
    
    // Audio processing properties
    this.rms = 0;
    this.bass = 0;
    this.mid = 0;
    this.high = 0;
    this.spectrum = [];
    
    // BPM detection properties
    this.bpm = 0;
    this.beatHistory = [];
    this.lastBeatTime = 0;
    this.beatThreshold = 0.1;
    this.minBeatInterval = 300; // Minimum 300ms between beats (200 BPM max)
    this.maxBeatInterval = 1200; // Maximum 1200ms between beats (50 BPM min)
    this.bpmSmoothingFactor = 0.3;
    this.dataArray = null;
    this.timeDataArray = null;
    this.isRunning = false;
    
    // Callbacks
    this.onDataUpdate = null;
  }

  async listInputs() {
    try {
      // Request permission first with basic constraints
      const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
      tmp.getTracks().forEach(t => t.stop());
    } catch(e) {
      console.warn('Could not get initial audio permission:', e.message);
      // Continue anyway, some devices might still be available
    }
    
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
    // Validate input to prevent NaN
    if (!spec || spec.length === 0) {
      return { bass: 0, mid: 0, high: 0 };
    }
    
    const nyquist = sampleRate / 2;
    // Calculate frequency bands with enhanced sensitivity
    const bassEnd = Math.max(1, Math.floor(spec.length * 0.12));
    const midEnd = Math.max(bassEnd + 1, Math.floor(spec.length * 0.45));
    
    let bass = 0, mid = 0, high = 0;
    
    // Bass (20-250Hz) - Much higher sensitivity
    for (let i = 1; i < bassEnd; i++) {
      const value = spec[i] || 0;
      bass += value * value; // Square for more dramatic response
    }
    const bassCount = Math.max(1, bassEnd - 1);
    bass = Math.sqrt(bass / bassCount) * 4.0; // Increased multiplier
    
    // Mid (250Hz-4kHz) - Enhanced sensitivity with emphasis on vocals
    for (let i = bassEnd; i < midEnd; i++) {
      const value = spec[i] || 0;
      const weight = i < bassEnd * 2 ? 1.5 : 1.0; // Boost lower mids
      mid += value * weight;
    }
    const midCount = Math.max(1, midEnd - bassEnd);
    mid = mid / midCount * 3.5; // Increased multiplier
    
    // Highs (4kHz-20kHz) - Higher sensitivity for crisp highs
    for (let i = midEnd; i < spec.length; i++) {
      const value = spec[i] || 0;
      const weight = i > spec.length * 0.8 ? 2.0 : 1.0; // Boost very high frequencies
      high += value * weight;
    }
    const highCount = Math.max(1, spec.length - midEnd);
    high = high / highCount * 5.0; // Much higher multiplier
    
    // Ensure no NaN values are returned
    return { 
      bass: isNaN(bass) ? 0 : bass, 
      mid: isNaN(mid) ? 0 : mid, 
      high: isNaN(high) ? 0 : high 
    };
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
      const bands = this.bandEnergy(this.spectrum, sr, 20, 250);
      const newBass = (bands.bass || 0) * 0.175;
      const newMid = (bands.mid || 0) * 0.375;
      const newHigh = (bands.high || 0) * 0.8;
      
      // Apply smoothing to prevent jittery visuals and ensure no NaN
      this.bass = isNaN(this.bass) ? 0 : this.bass * 0.7 + (isNaN(newBass) ? 0 : newBass) * 0.3;
      this.mid = isNaN(this.mid) ? 0 : this.mid * 0.7 + (isNaN(newMid) ? 0 : newMid) * 0.3;
      this.high = isNaN(this.high) ? 0 : this.high * 0.7 + (isNaN(newHigh) ? 0 : newHigh) * 0.3;
      
      // Detect beats and calculate BPM
      this.detectBeat();
      
      // Notify listeners of data update with validated data
      if (this.onDataUpdate) {
        this.onDataUpdate({
          rms: isNaN(this.rms) ? 0 : this.rms,
          bass: isNaN(this.bass) ? 0 : this.bass,
          mid: isNaN(this.mid) ? 0 : this.mid,
          high: isNaN(this.high) ? 0 : this.high,
          spectrum: this.spectrum || [],
          bpm: this.bpm,
          isActive: (this.rms || 0) > 0.001
        });
      }
      
    } catch (error) {
      console.error('Error in audio data update:', error);
      // Continue with fallback values
      this.rms = this.bass = this.mid = this.high = 0;
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
        : { audio: true };
      
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
      this.rms = this.bass = this.mid = this.high = 0;

      // Start audio analysis loop
      this.isRunning = true;
      this.updateAudioData();
      
      console.log('Audio started successfully with sample rate:', this.audioContext.sampleRate);
      
    } catch (error) {
      this.isRunning = false;
      console.error('Audio start error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to start audio: ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Microphone access denied. Please allow microphone permissions and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No audio input device found. Please connect an audio device.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Audio device is busy or unavailable. Please close other applications using audio.';
      } else {
        errorMessage += error.message;
      }
      
      throw new Error(errorMessage);
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
    this.rms = this.bass = this.mid = this.high = 0;
    this.spectrum = [];
    this.bpm = 0;
    this.beatHistory = [];
    this.lastBeatTime = 0;
    this.lastBassEnergy = 0;
    
    console.log('Audio stopped and cleaned up');
  }

  detectBeat() {
    const currentTime = Date.now();
    
    // Use bass energy for beat detection with peak detection
    const beatEnergy = this.bass;
    
    // Simple peak detection - only trigger on significant bass increases
    if (!this.lastBassEnergy) this.lastBassEnergy = 0;
    const bassIncrease = beatEnergy - this.lastBassEnergy;
    const isSignificantIncrease = bassIncrease > 0.02; // Lower threshold for increase
    
    // Debug: Reduce logging for performance in live use
    if (Math.random() < 0.05) { // Only 5% of the time for performance
      console.log(`BPM Debug - Bass: ${beatEnergy.toFixed(3)}, BPM: ${this.bpm}`);
    }
    
    // Check if we have a beat (bass energy above threshold AND significant increase)
    if (beatEnergy > this.beatThreshold && isSignificantIncrease) {
      console.log(`🥁 Beat detected! Bass: ${beatEnergy.toFixed(3)}, Increase: ${bassIncrease.toFixed(3)}`);
      
      // Ensure minimum time between beats to avoid false positives
      if (currentTime - this.lastBeatTime > this.minBeatInterval) {
        // Calculate interval since last beat
        const interval = currentTime - this.lastBeatTime;
        console.log(`⏱️  Beat interval: ${interval}ms`);
        
        // Only consider valid intervals for BPM calculation
        if (interval >= this.minBeatInterval && interval <= this.maxBeatInterval) {
          this.beatHistory.push(interval);
          console.log(`✅ Valid interval added. History length: ${this.beatHistory.length}`);
          
          // Keep only recent beat intervals (last 6 beats for better averaging)
          if (this.beatHistory.length > 6) {
            this.beatHistory.shift();
          }
          
          // Calculate BPM from average interval
          if (this.beatHistory.length >= 2) {
            const avgInterval = this.beatHistory.reduce((a, b) => a + b) / this.beatHistory.length;
            let instantBpm = 60000 / avgInterval; // Convert ms to BPM
            
            // Check if we're detecting half-tempo and double it if needed
            if (instantBpm < 90 && instantBpm > 45) {
              console.log(`🔄 Detected half-tempo (${instantBpm.toFixed(1)}), doubling to ${(instantBpm * 2).toFixed(1)}`);
              instantBpm *= 2;
            }
            
            console.log(`📊 Avg interval: ${avgInterval.toFixed(1)}ms, Instant BPM: ${instantBpm.toFixed(1)}`);
            
            // Smooth BPM changes to avoid jitter
            const oldBpm = this.bpm;
            if (this.bpm === 0) {
              this.bpm = instantBpm;
            } else {
              this.bpm = this.bpm * (1 - this.bpmSmoothingFactor) + instantBpm * this.bpmSmoothingFactor;
            }
            
            // Round to nearest integer for display
            this.bpm = Math.round(this.bpm);
            
            if (oldBpm !== this.bpm) {
              console.log(`🎵 BPM updated: ${oldBpm} → ${this.bpm}`);
            }
          }
        } else {
          console.log(`❌ Invalid interval: ${interval}ms (min: ${this.minBeatInterval}, max: ${this.maxBeatInterval})`);
        }
        
        this.lastBeatTime = currentTime;
      } else {
        console.log(`⏳ Beat too soon: ${currentTime - this.lastBeatTime}ms < ${this.minBeatInterval}ms`);
      }
    }
    
    // Store bass energy for next comparison
    this.lastBassEnergy = beatEnergy;
  }

  getAudioData() {
    return {
      rms: this.rms,
      bass: this.bass,
      mid: this.mid,
      high: this.high,
      spectrum: this.spectrum,
      bpm: this.bpm
    };
  }
}
