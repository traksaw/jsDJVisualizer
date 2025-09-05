// Main p5.js sketch for DJ Visualizer

let p; // p5.js instance
let w, h; // Canvas dimensions

// Initialize p5.js sketch
new p5(sketch => {
  p = sketch;
  
  p.setup = () => {
    w = p.windowWidth; 
    h = p.windowHeight;
    p.createCanvas(w, h);
    p.frameRate(60);
    p.colorMode(p.RGB);
  };
  
  // Get safe visualization bounds (avoiding UI overlap)
  p.getVisBounds = () => {
    const topMargin = 140;   // Increased space for top UI controls
    const bottomMargin = 100; // Space for bottom info text
    const sideMargin = 40;   // Increased side padding
    
    return {
      x: sideMargin,
      y: topMargin,
      width: p.width - (sideMargin * 2),
      height: p.height - topMargin - bottomMargin
    };
  };
  
  p.windowResized = () => {
    w = p.windowWidth; 
    h = p.windowHeight;
    p.resizeCanvas(w, h);
  };
  
  p.keyPressed = () => {
    if (p.key === ' ') {
      p.fullscreen(!p.fullscreen());
    }
  };
  
  // Mouse event handler removed to prevent button interference
  // Color changes now handled by slider and keyboard shortcuts only
  
  p.draw = () => {
    // Performance monitoring
    frameCount++;
    if (p.millis() - lastFpsUpdate > 1000) {
      document.getElementById('fps').textContent = Math.round(p.frameRate());
      document.getElementById('particleCount').textContent = particles.length;
      lastFpsUpdate = p.millis();
    }
    
    switch(currentMode) {
      case 'smoke':
        drawSmokeMode();
        break;
      case 'flocking':
        drawFlockingMode();
        break;
      case 'connected':
        drawConnectedMode();
        break;
      case 'eq':
        drawEQMode();
        break;
      case 'separated':
        drawSeparatedMode();
        break;
    }
  };
});
