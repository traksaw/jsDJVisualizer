// Audio handling for DJ Visualizer

let audioContext, sourceNode, meydaAnalyzer, analyserNode;
let rms = 0, bass = 0, mid = 0, treble = 0;
let spectrum = [];

// Enhanced frequency analysis for DJ mixer
let subBass = 0, lowMid = 0, highMid = 0, presence = 0, brilliance = 0;
let spectrumHistory = [];

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
    featureExtractors: ['rms', 'amplitudeSpectrum'],
    callback: (features) => {
      rms = features.rms || 0;
      spectrum = features.amplitudeSpectrum || spectrum;

      const sr = audioContext.sampleRate;
      bass   = bandEnergy(spectrum, sr,  20,  250) * 0.1;
      mid    = bandEnergy(spectrum, sr, 250, 2000) * 0.1;
      treble = bandEnergy(spectrum, sr, 2000, 8000) * 0.1;

      subBass   = bandEnergy(spectrum, sr,  20,   60) * 0.1;
      lowMid    = bandEnergy(spectrum, sr, 250,  500) * 0.1;
      highMid   = bandEnergy(spectrum, sr, 500, 1000) * 0.1;
      presence  = bandEnergy(spectrum, sr, 2000, 4000) * 0.1;
      brilliance = bandEnergy(spectrum, sr, 4000, 8000) * 0.1;
    }
  });
  
  meydaAnalyzer.start();
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
