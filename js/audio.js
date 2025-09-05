// Audio handling for DJ Visualizer

let audioContext, sourceNode, meydaAnalyzer, analyserNode;
let rms = 0, bass = 0, mid = 0, treble = 0;
let spectrum = [];

// Enhanced frequency analysis for DJ mixer
let subBass = 0, lowMid = 0, highMid = 0, presence = 0, brilliance = 0;
let spectrumHistory = [];

// Audio detection for visualization control
let audioThreshold = 0.005; // Minimum RMS level to consider "music playing"
let isAudioActive = false;
let audioInactiveTime = 0;
let lastAudioTime = 0;

// Audio input elements - will be initialized when DOM is ready
let startBtn, inputSelect;

// Audio initialization
async function startAudio() {
  const deviceId = inputSelect.value;
  const constraints = deviceId ? 
    { audio: { deviceId: { exact: deviceId } } } : 
    { audio: true };
  
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
  inputSelect = document.getElementById('inputs');
  
  if (navigator.mediaDevices) listInputs();
  
  // Add start button event listener
  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      try {
        await startAudio();
        startBtn.textContent = 'Audio Started';
        startBtn.disabled = true;
      } catch (error) {
        console.error('Audio start failed:', error);
        startBtn.textContent = 'Audio Failed - Retry';
      }
    });
  }
}
