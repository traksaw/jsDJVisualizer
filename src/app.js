// src/app.js
import { els, log, populateInputs, getSelectedDeviceId, setRunning } from './ui.js';
import { AudioService } from './audio.js';

const audio = new AudioService();

async function init() {
  if (!navigator.mediaDevices) {
    log('⚠️ navigator.mediaDevices is not available. Use Chrome and load via http(s) (localhost).');
    return;
  }

  await populateInputs();

  els.startBtn.addEventListener('click', async () => {
    try {
      setRunning(true);
      const deviceId = getSelectedDeviceId();
      await audio.start(deviceId);
      audio.onRMS(v => log(`RMS: ${v.toFixed(4)}`));
      log('✅ Audio stream connected. Play in Serato and watch RMS change.');
    } catch (err) {
      setRunning(false);
      log('❌ Error starting audio: ' + (err?.message || err));
    }
  });

  els.stopBtn.addEventListener('click', async () => {
    await audio.stop();
    setRunning(false);
    log('⏹️ Stopped.');
  });
}

init();
