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

      // Update audio analysis panel once per second
      const statusEl = document.getElementById('audioStatus');
      const bpmEl = document.getElementById('bpmVal');
      const rmsEl = document.getElementById('rmsVal');
      const centEl = document.getElementById('centroidVal');
      const bassEl = document.getElementById('bassVal');
      const midEl = document.getElementById('midVal');
      const trebEl = document.getElementById('trebleVal');
      if (statusEl && bpmEl && rmsEl && centEl && bassEl && midEl && trebEl) {
        statusEl.textContent = isAudioActive ? 'active' : 'inactive';
        bpmEl.textContent = bpm || 0;
        rmsEl.textContent = (rms || 0).toFixed(3);
        // spectralCentroid is in Hz already per Meyda
        centEl.textContent = Math.round(spectralCentroid || 0);
        bassEl.textContent = (bass || 0).toFixed(2);
        midEl.textContent = (mid || 0).toFixed(2);
        trebEl.textContent = (treble || 0).toFixed(2);
      }
    }
    
    // Show audio status when no music is playing
    if (!isAudioActive) {
      p.push();
      p.fill(100, 100, 100, 0.7);
      p.textAlign(p.CENTER);
      p.textSize(24);
      p.text('Waiting for audio...', p.width/2, p.height/2);
      p.textSize(16);
      p.text('Play some music to see visualizations', p.width/2, p.height/2 + 40);
      p.pop();
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
      case 'puzzle':
        drawEQPuzzleMode();
        break;
    }
  };
});
