// p5 sketch & visual mapping from features → drawing

export function createVisuals() {
    const state = {
      rms: 0,
      bass: 0,
      mid: 0,
      treble: 0,
      smooth: { rms: 0, bass: 0, mid: 0, treble: 0 },
    };
  
    function updateFeatures({ rms, bands }) {
      state.rms = rms ?? 0;
      state.bass = bands?.bass ?? 0;
      state.mid = bands?.mid ?? 0;
      state.treble = bands?.treble ?? 0;
    }
  
    new p5((p) => {
      let w, h;
      p.setup = () => {
        w = p.windowWidth; h = p.windowHeight;
        const c = p.createCanvas(w, h);
        c.addClass('p5Canvas');
        p.noStroke();
        p.frameRate(60);
      };
      p.windowResized = () => {
        w = p.windowWidth; h = p.windowHeight;
        p.resizeCanvas(w, h);
      };
  
      p.draw = () => {
        // Faded background for trails
        p.fill(0, 40);
        p.rect(0, 0, p.width, p.height);
  
        // Easing for smooth visuals
        const k = 0.15;
        state.smooth.rms    += (state.rms    - state.smooth.rms)    * k;
        state.smooth.bass   += (state.bass   - state.smooth.bass)   * k;
        state.smooth.mid    += (state.mid    - state.smooth.mid)    * k;
        state.smooth.treble += (state.treble - state.smooth.treble) * k;
  
        // RMS-driven circle in center
        const r = p.map(state.smooth.rms, 0, 0.3, 20, Math.min(w, h) / 2, true);
        p.push();
        p.translate(w / 2, h / 2);
        p.fill(255, 220);
        p.ellipse(0, 0, r * 2, r * 2);
        p.pop();
  
        // 3-band bars (bass, mid, treble)
        const barW = p.width / 8;
        const maxH = p.height * 0.6;
  
        const bassH = p.constrain(p.map(state.smooth.bass,   0, 0.10, 0, maxH), 0, maxH);
        const midH  = p.constrain(p.map(state.smooth.mid,    0, 0.05, 0, maxH), 0, maxH);
        const trebH = p.constrain(p.map(state.smooth.treble, 0, 0.02, 0, maxH), 0, maxH);
  
        p.fill(255, 90, 90);    p.rect(p.width * 0.25 - barW / 2, p.height - bassH, barW, bassH);
        p.fill(90, 255, 150);   p.rect(p.width * 0.50 - barW / 2, p.height - midH,  barW, midH);
        p.fill(140, 170, 255);  p.rect(p.width * 0.75 - barW / 2, p.height - trebH, barW, trebH);
      };
    });
  
    return { updateFeatures };
  }
  