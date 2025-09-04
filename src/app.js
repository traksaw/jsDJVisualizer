import { els, log, populateInputs, getSelectedDeviceId, setRunning } from './ui.js';
import { AnalysisService } from './analysis.js';
import { createVisuals } from './visuals.js';

const analysis = new AnalysisService();
const visuals = createVisuals();

async function init() {
  if (!navigator.mediaDevices) {
    log('⚠️ navigator.mediaDevices not available. Use Chrome and load via http(s) (localhost).');
    return;
  }

  await populateInputs();

  els.startBtn.addEventListener('click', async () => {
    try {
      setRunning(true);
      const deviceId = getSelectedDeviceId();
      await analysis.start(deviceId);

      analysis.onFeatures((features) => {
        visuals.updateFeatures(features);
        // Light heartbeat in the log (10% of frames)
        const { rms, bands } = features;
        if (Math.random() < 0.1) {
          log(`RMS: ${rms.toFixed(4)}  |  B:${bands.bass.toFixed(3)} M:${bands.mid.toFixed(3)} T:${bands.treble.toFixed(3)}`);
        }
      });

      log('✅ Analysis running. Play in Serato and watch the visuals react.');
    } catch (err) {
      setRunning(false);
      log('❌ Error starting: ' + (err?.message || err));
    }
  });

  els.stopBtn.addEventListener('click', async () => {
    await analysis.stop();
    setRunning(false);
    log('⏹️ Stopped.');
  });
}

init();
