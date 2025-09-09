// Audio handling for DJ Visualizer

let audioContext, sourceNode, meydaAnalyzer, analyserNode;
let mediaStream; // keep reference to stop tracks
let rms = 0, bass = 0, mid = 0, treble = 0;
let spectrum = [];
// Additional exposed features for UI/debug
let spectralCentroid = 0;
let chroma = [];
let mfcc = [];

// BPM detection variables using Web Audio approach
let bpm = 0;
let peaks = [];
let filteredBuffer = null;
let sampleRate = 44100;

// Enhanced frequency analysis for DJ mixer
let subBass = 0, lowMid = 0, highMid = 0, presence = 0, brilliance = 0;
let spectrumHistory = [];

// Audio detection for visualization control
let audioThreshold = 0.01; // Increased threshold to reduce noise sensitivity
let isAudioActive = false;
let audioInactiveTime = 0;
let lastAudioTime = 0;

// Audio input elements - will be initialized when DOM is ready
let startBtn, stopBtn, inputSelect;

// Audio initialization
async function startAudio() {
  const deviceId = inputSelect.value;
  const constraints = deviceId ? 
    { audio: { deviceId: { exact: deviceId } } } : 
    { audio: true };
  
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  mediaStream = stream;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  sourceNode = audioContext.createMediaStreamSource(stream);
  
  // Create analyzer for visualization
  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 1024;
  sourceNode.connect(analyserNode);
  
  // Initialize Meyda for feature extraction
  meydaAnalyzer = Meyda.createMeydaAnalyzer({
    audioContext,
    source: sourceNode,
    bufferSize: 512,
    featureExtractors: ['rms', 'spectralCentroid', 'mfcc', 'chroma'],
    callback: features => {
      rms = features.rms || 0;
      spectralCentroid = features.spectralCentroid || 0;
      chroma = features.chroma || [];
      mfcc = features.mfcc || [];
      
      // Web Audio BPM detection approach
      detectBeatsWebAudio();
      
      // Check if audio is active (music is playing)
      const currentTime = Date.now();
      if (rms > audioThreshold) {
        isAudioActive = true;
        lastAudioTime = currentTime;
        audioInactiveTime = 0;
      } else {
        audioInactiveTime = currentTime - lastAudioTime;
        // Consider audio inactive after 500ms of silence
        if (audioInactiveTime > 500) {
          isAudioActive = false;
        }
      }
      
      // Get frequency spectrum for EQ analysis
      const freqData = new Uint8Array(analyserNode.frequencyBinCount);
      analyserNode.getByteFrequencyData(freqData);
      spectrum = Array.from(freqData);
      
      // Enhanced frequency band analysis for DJ mixer
      const nyquist = audioContext.sampleRate / 2;
      const binSize = nyquist / freqData.length;
      
      // More precise frequency ranges for DJ mixing
      subBass = getFrequencyRange(freqData, 20, 60, binSize);      // Sub bass
      bass = getFrequencyRange(freqData, 60, 250, binSize);        // Bass 
      lowMid = getFrequencyRange(freqData, 250, 500, binSize);     // Low mid
      mid = getFrequencyRange(freqData, 500, 2000, binSize);       // Mid
      highMid = getFrequencyRange(freqData, 2000, 4000, binSize);  // High mid
      presence = getFrequencyRange(freqData, 4000, 6000, binSize); // Presence
      treble = getFrequencyRange(freqData, 6000, 20000, binSize);  // Treble/brilliance
      
      // Keep spectrum history for smoother visualizations
      spectrumHistory.push([...spectrum]);
      if (spectrumHistory.length > 10) spectrumHistory.shift();
    }
  });
  
  meydaAnalyzer.start();

  // Simple BPM detection is handled in Meyda callback

  // Update UI button states
  if (startBtn) {
    startBtn.textContent = 'Audio Started';
    startBtn.disabled = true;
  }
  if (stopBtn) {
    stopBtn.disabled = false;
  }
}

// Calculate energy in a frequency range
function getFrequencyRange(freqData, minHz, maxHz, binSize) {
  const minBin = Math.floor(minHz / binSize);
  const maxBin = Math.floor(maxHz / binSize);
  
  let sum = 0;
  let count = 0;
  
  for (let i = minBin; i <= maxBin && i < freqData.length; i++) {
    sum += freqData[i];
    count++;
  }
  
  return count > 0 ? (sum / count) / 255 : 0; // Normalize to 0-1
}

// Calculate energy in a frequency band
function bandEnergy(spec, sampleRate, fmin, fmax) {
  const nyquist = sampleRate / 2;
  const binHz = nyquist / (spec.length - 1);
  const start = Math.max(0, Math.floor(fmin / binHz));
  const end = Math.min(spec.length - 1, Math.ceil(fmax / binHz));
  
  let energy = 0;
  for (let i = start; i <= end; i++) {
    energy += spec[i] * spec[i];
  }
  return Math.sqrt(energy / (end - start + 1));
}

// List available audio inputs
async function listInputs() {
  try { 
    const tmp = await navigator.mediaDevices.getUserMedia({ audio: true }); 
    tmp.getTracks().forEach(t => t.stop()); 
  } catch(e){}
  
  const devices = await navigator.mediaDevices.enumerateDevices();
  const inputs = devices.filter(d => d.kind === 'audioinput');
  inputSelect.innerHTML = '';
  
  inputs.forEach((d, i) => {
    const opt = document.createElement('option');
    opt.value = d.deviceId;
    opt.textContent = d.label || `Input ${i+1}`;
    inputSelect.appendChild(opt);
  });
  
  const serato = inputs.find(d => /serato/i.test(d.label));
  if (serato) inputSelect.value = serato.deviceId;
}

// Initialize audio elements and input list when DOM is ready
function initializeAudio() {
  startBtn = document.getElementById('start');
  stopBtn = document.getElementById('stop');
  inputSelect = document.getElementById('inputs');
  
  if (navigator.mediaDevices) listInputs();
  
  // Add start button event listener
  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      try {
        await startAudio();
      } catch (error) {
        console.error('Audio start failed:', error);
        startBtn.textContent = 'Audio Failed - Retry';
      }
    });
  }

  // Configure stop button initial state and handler
  if (stopBtn) {
    stopBtn.disabled = true;
    stopBtn.addEventListener('click', () => {
      try {
        stopAudio();
      } catch (e) {
        console.error('Audio stop failed:', e);
      }
    });
  }
}

// Improved BPM detection with better accuracy
function detectBeatsWebAudio() {
  if (!isAudioActive) return;
  
  const energy = bass + subBass; // Combined low frequency energy
  const currentTime = Date.now();
  
  // More selective threshold to reduce false positives
  const threshold = 0.25; // Increased from 0.15
  
  if (energy > threshold) {
    const timeSinceLastPeak = peaks.length > 0 ? currentTime - peaks[peaks.length - 1] : 1000;
    
    // Stricter minimum time between peaks (500ms = 120 BPM max)
    if (timeSinceLastPeak > 500) {
      peaks.push(currentTime);
      
      // Keep only recent peaks (last 8 seconds for better accuracy)
      peaks = peaks.filter(peak => currentTime - peak < 8000);
      
      // Calculate BPM with at least 6 peaks for better accuracy
      if (peaks.length >= 6) {
        const intervals = [];
        for (let i = 1; i < peaks.length; i++) {
          intervals.push(peaks[i] - peaks[i-1]);
        }
        
        // Filter out outlier intervals (remove top and bottom 20%)
        intervals.sort((a, b) => a - b);
        const trimCount = Math.floor(intervals.length * 0.2);
        const filteredIntervals = intervals.slice(trimCount, intervals.length - trimCount);
        
        if (filteredIntervals.length > 0) {
          // Use average of filtered intervals for stability
          const avgInterval = filteredIntervals.reduce((a, b) => a + b) / filteredIntervals.length;
          
          let detectedBPM = 60000 / avgInterval;
          
          // More conservative BPM range correction
          while (detectedBPM > 180) detectedBPM /= 2;
          while (detectedBPM < 60) detectedBPM *= 2;
          
          // Ensure reasonable dance music range (70-150 BPM)
          if (detectedBPM >= 70 && detectedBPM <= 150) {
            detectedBPM = Math.round(detectedBPM);
            
            // More conservative BPM smoothing
            if (bpm === 0) {
              bpm = detectedBPM;
            } else {
              const difference = Math.abs(detectedBPM - bpm);
              if (difference > 10) {
                // Large change - adapt moderately
                bpm = Math.round((bpm * 0.6) + (detectedBPM * 0.4));
              } else {
                // Small change - smooth heavily
                bpm = Math.round((bpm * 0.8) + (detectedBPM * 0.2));
              }
            }
          }
        }
      }
    }
  }
}

// Count intervals between nearby peaks (from the article)
function countIntervalsBetweenNearbyPeaks(peaks) {
  const intervalCounts = [];
  
  peaks.forEach((peak, index) => {
    for (let i = 1; i < Math.min(10, peaks.length - index); i++) {
      const interval = peaks[index + i] - peak;
      intervalCounts.push(interval);
    }
  });
  
  return intervalCounts;
}

// Group neighbors by tempo (from the article)
function groupNeighborsByTempo(intervalCounts) {
  const tempoCounts = [];
  
  intervalCounts.forEach(interval => {
    const tempo = 60000 / interval;
    
    // Find existing tempo group or create new one
    let found = false;
    for (let group of tempoCounts) {
      if (Math.abs(group.tempo - tempo) < 5) {
        group.count++;
        found = true;
        break;
      }
    }
    
    if (!found) {
      tempoCounts.push({ tempo: tempo, count: 1 });
    }
  });
  
  return tempoCounts;
}

// Initialize audio system
function initAudio() {
  setupAudioButtons();
}

// Stop audio analysis and release resources
function stopAudio() {
  try {
    if (meydaAnalyzer) {
      try { meydaAnalyzer.stop(); } catch (_) {}
      meydaAnalyzer = null;
    }
    if (sourceNode) {
      try { sourceNode.disconnect(); } catch (_) {}
      sourceNode = null;
    }
    if (analyserNode) {
      try { analyserNode.disconnect(); } catch (_) {}
      analyserNode = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => {
        try { t.stop(); } catch (_) {}
      });
      mediaStream = null;
    }
    if (audioContext) {
      try { if (audioContext.state !== 'closed') audioContext.close(); } catch (_) {}
      audioContext = null;
    }

    // Reset analysis values
    rms = 0; bass = 0; mid = 0; treble = 0;
    subBass = 0; lowMid = 0; highMid = 0; presence = 0; brilliance = 0;
    spectrum = [];
    spectrumHistory = [];
    isAudioActive = false;
    
    // Reset BPM detection
    bpm = 0;
    peaks = [];
    filteredBuffer = null;

    // Update UI buttons
    if (startBtn) {
      startBtn.textContent = 'Start';
      startBtn.disabled = false;
    }
    if (stopBtn) {
      stopBtn.disabled = true;
    }
  } catch (err) {
    console.error('Error stopping audio:', err);
  }
}
