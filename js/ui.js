// UI handling for DJ Visualizer

// UI state
let currentMode = 'smoke';
let sensitivity = 1.0;
let colorHue = 180;
let frameCount = 0;
let lastFpsUpdate = 0;

// EQ Colors - distinct bass/mid/high colors (will be updated based on colorHue)
let EQ_COLORS = {
  bass: { hue: 0, sat: 80, bright: 100 },    // Red
  mid: { hue: 120, sat: 80, bright: 100 },   // Green  
  high: { hue: 240, sat: 80, bright: 100 }   // Blue
};

// Function to update EQ colors based on current hue - shifts entire color wheel
function updateEQColors() {
  EQ_COLORS = {
    bass: { hue: (0 + colorHue) % 360, sat: 80, bright: 100 },    // Red base + hue shift
    mid: { hue: (120 + colorHue) % 360, sat: 80, bright: 100 },   // Green base + hue shift  
    high: { hue: (240 + colorHue) % 360, sat: 80, bright: 100 }   // Blue base + hue shift
  };
}

// UI element references - will be initialized when DOM is ready
let sensitivitySlider, colorHueSlider;
let modeButtons = {};

// Initialize UI elements and event listeners
function initializeUI() {
  // Get UI element references
  sensitivitySlider = document.getElementById('sensitivity');
  colorHueSlider = document.getElementById('colorHue');
  
  // Get mode buttons
  modeButtons = {
    smoke: document.getElementById('mode-smoke'),
    flocking: document.getElementById('mode-flocking'),
    connected: document.getElementById('mode-connected'),
    eq: document.getElementById('mode-eq'),
    separated: document.getElementById('mode-separated'),
    puzzle: document.getElementById('mode-puzzle')
  };
  
  setupEventListeners();
  
  // Initialize EQ colors
  updateEQColors();
}

// Event listeners setup
function setupEventListeners() {
  // Mode switching
  Object.keys(modeButtons).forEach(mode => {
    if (modeButtons[mode]) {
      modeButtons[mode].addEventListener('click', () => {
        currentMode = mode;
        Object.values(modeButtons).forEach(btn => {
          if (btn) btn.classList.remove('active');
        });
        if (modeButtons[mode]) {
          modeButtons[mode].classList.add('active');
        }
      });
    }
  });
  
  // Sliders
  if (sensitivitySlider) {
    sensitivitySlider.addEventListener('input', (e) => {
      sensitivity = parseFloat(e.target.value);
    });
  }
  
  if (colorHueSlider) {
    colorHueSlider.addEventListener('input', (e) => {
      colorHue = parseInt(e.target.value);
      updateEQColors();
    });
  }
}
