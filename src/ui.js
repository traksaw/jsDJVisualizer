export const els = {
  startBtn: document.getElementById('start'),
  stopBtn: document.getElementById('stop'),
  inputSelect: document.getElementById('inputs'),
  log: document.getElementById('log'),
};

export function log(msg) {
  els.log.textContent += msg + '\n';
  els.log.scrollTop = els.log.scrollHeight;
}

export async function populateInputs() {
  // Prime permissions so device labels appear
  try {
    const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
    tmp.getTracks().forEach(t => t.stop());
  } catch (_) {}

  const devices = await navigator.mediaDevices.enumerateDevices();
  const inputs = devices.filter(d => d.kind === 'audioinput');

  els.inputSelect.innerHTML = '';
  inputs.forEach((d, i) => {
    const opt = document.createElement('option');
    opt.value = d.deviceId;
    opt.textContent = d.label || `Input ${i + 1}`;
    els.inputSelect.appendChild(opt);
  });

  const serato = inputs.find(d => /serato/i.test(d.label));
  if (serato) els.inputSelect.value = serato.deviceId;

  return inputs;
}

export function getSelectedDeviceId() {
  return els.inputSelect.value || undefined;
}

export function setRunning(isRunning) {
  els.startBtn.disabled = isRunning;
  els.stopBtn.disabled = !isRunning;
}
