# DJ Visualizer MVP - JavaScript Audio Visualization

A real-time audio visualizer built with p5.js and Meyda.js, optimized for live DJ performances with Serato DJ and Pioneer DDJ-REV1.

## 🎵 Features

### 🎛️ DJ-Focused Visualization Modes
- **Classic Mode**: Traditional 3-band EQ visualization with RMS-driven center circle
- **DJ Mixer Mode**: Professional 5-band EQ display mimicking hardware DJ mixers
- **Spectrum Mode**: Full frequency spectrum analysis with labeled frequency ranges
- **Particles Mode**: Dynamic particle system responding to bass, mid, and treble
- **Waveform Mode**: Real-time waveform display across frequency bands

### 🎚️ Live Performance Controls
- **Sensitivity Adjustment**: Real-time audio sensitivity control (0.5x - 3x)
- **Color Customization**: HSV color wheel control (0-360°)
- **Performance Mode**: Minimizes UI for clean presentation
- **Freeze Colors**: Locks current color scheme during performance
- **Serato Integration**: Auto-detects and prioritizes Serato DJ audio input

### ⌨️ Keyboard Shortcuts
- `SPACEBAR`: Toggle fullscreen mode
- `F`: Freeze/unfreeze color changes
- `Click`: Randomize colors (when not frozen)

## 🎧 Hardware Compatibility

### Tested With
- **Serato DJ Pro/Lite** - Auto-detection enabled
- **Pioneer DDJ-REV1** - Full compatibility
- **Standard audio interfaces** - Universal Web Audio API support

### Audio Input Detection
The visualizer automatically scans for available audio inputs and prioritizes Serato DJ when detected. Manual input selection available via dropdown.

## 🔧 Technical Implementation

### Audio Analysis
- **Library**: Meyda.js for real-time audio feature extraction
- **Buffer Size**: 512 samples for low-latency response
- **Sample Rate**: Adaptive (typically 44.1kHz or 48kHz)
- **Features**: RMS, Amplitude Spectrum

### Frequency Bands
#### Standard 3-Band EQ
- **Bass**: 20Hz - 250Hz
- **Mid**: 250Hz - 2kHz  
- **Treble**: 2kHz - 8kHz

#### Enhanced 5-Band EQ (DJ Mixer Mode)
- **Sub Bass**: 20Hz - 60Hz
- **Bass**: 20Hz - 250Hz
- **Low Mid**: 250Hz - 500Hz
- **High Mid**: 1kHz - 2kHz
- **Presence**: 2kHz - 4kHz
- **Brilliance**: 4kHz - 8kHz

### Visualization Engine
- **Framework**: p5.js for hardware-accelerated graphics
- **Frame Rate**: 60 FPS target
- **Color Space**: HSB for intuitive color manipulation
- **Responsive**: Auto-adapts to window size changes

## 🚀 Setup Instructions

### For Live Performance
1. Connect your DDJ-REV1 to your computer
2. Launch Serato DJ and configure audio output
3. Open the visualizer in a web browser
4. Click "Start" and grant microphone permissions
5. Select your Serato audio input from the dropdown
6. Choose your preferred visualization mode
7. Press `SPACEBAR` for fullscreen presentation

### For Development
```bash
# Clone or download the project
# No build process required - pure HTML/JS

# Serve locally (optional)
python -m http.server 8000
# or
npx serve .
```

### Browser Requirements
- Modern browser with Web Audio API support
- Microphone/audio input permissions
- Hardware acceleration recommended for smooth 60fps

## 🎤 Presentation Notes

### For JavaScript Meetups
This project demonstrates:
- **Web Audio API**: Real-time audio processing in the browser
- **Meyda.js**: Advanced audio feature extraction
- **p5.js**: Creative coding and data visualization
- **Real-time Performance**: 60fps audio-reactive graphics
- **Hardware Integration**: Professional DJ equipment compatibility

### Key Learning Points
1. **Audio Analysis**: How to extract meaningful data from audio streams
2. **Frequency Domain**: Understanding FFT and frequency band separation
3. **Real-time Graphics**: Optimizing JavaScript for smooth animations
4. **User Experience**: Building intuitive controls for live performance
5. **Hardware Integration**: Connecting web apps to professional audio gear

## 🎨 Customization

### Adding New Visualization Modes
1. Add button to HTML UI
2. Create new case in `p.draw()` switch statement
3. Implement drawing function using available audio data:
   - `rms`: Overall audio level
   - `bass`, `mid`, `treble`: 3-band EQ values
   - `subBass`, `lowMid`, `highMid`, `presence`, `brilliance`: 5-band EQ
   - `spectrum`: Full frequency spectrum array

### Color Schemes
Colors are controlled via HSB color space:
- Hue: 0-360° (color wheel position)
- Saturation: Fixed at 80% for vibrant colors
- Brightness: Varies with audio intensity

## 📊 Performance Optimization

### For Smooth 60fps
- Particle count auto-adjusts based on audio intensity
- Waveform history limited to screen width
- Background fade effects for visual trails
- Efficient array operations for spectrum analysis

### Memory Management
- Automatic particle cleanup when off-screen
- Limited history buffers prevent memory leaks
- Optimized drawing calls with p5.js best practices

## 🔗 Dependencies

- **p5.js v1.9.0**: Creative coding framework
- **Meyda.js**: Audio feature extraction library
- **Web Audio API**: Browser-native audio processing
- **No build tools required**: Pure HTML/CSS/JS implementation

## 📱 Browser Support

- ✅ Chrome 66+
- ✅ Firefox 60+
- ✅ Safari 11.1+
- ✅ Edge 79+

## 🎯 Future Enhancements

- MIDI controller integration for real-time parameter control
- Audio recording and playback capabilities
- Preset saving and loading
- Multi-channel audio analysis
- WebGL shaders for advanced visual effects

---

**Perfect for JavaScript meetups, DJ performances, and audio visualization demonstrations!**
