/**
 * ==============================================================================
 * NEBULA GATEWAY - INTERACTIVE SCRIPT & WARP DRIVE ENGINE
 * ==============================================================================
 * 
 * Configurable Gateway Script with:
 * - HTML5 Canvas Particle System & Radial Warp-Drive Mode
 * - Synthetic Web Audio FX (Zero External Assets Required)
 * - Seamless Telemetry Countdown HUD
 * - Configurable DNS / IP Destination with LocalStorage Persistence
 */

// --- Global Configuration Defaults ---
const CONFIG = {
  // Default fallback if user has not set a custom address
  DEFAULT_PROTOCOL: 'http://',
  DEFAULT_TARGET: '192.168.1.1',
  STORAGE_KEY_TARGET: 'nebula_gateway_target',
  STORAGE_KEY_PROTOCOL: 'nebula_gateway_protocol',
  STORAGE_KEY_SOUND: 'nebula_gateway_sound_enabled',
  WARP_DURATION_MS: 2400, // Total countdown duration before redirect
  AUTO_REDIRECT_SECONDS: 10 // Automatic countdown timer before redirect
};

// --- State Management ---
const state = {
  protocol: localStorage.getItem(CONFIG.STORAGE_KEY_PROTOCOL) || CONFIG.DEFAULT_PROTOCOL,
  targetHost: localStorage.getItem(CONFIG.STORAGE_KEY_TARGET) || CONFIG.DEFAULT_TARGET,
  soundEnabled: localStorage.getItem(CONFIG.STORAGE_KEY_SOUND) !== 'false',
  isWarping: false,
  warpProgress: 0,
  warpInterval: null,
  warpTimeout: null,
  // Auto-Redirect Timer
  autoTimerRemaining: 10,
  autoTimerPaused: false,
  autoTimerInterval: null
};

// --- DOM Element References ---
const elements = {
  canvas: document.getElementById('warp-canvas'),
  mainCard: document.getElementById('main-card'),
  continueBtn: document.getElementById('continue-btn'),
  displayTargetUrl: document.getElementById('display-target-url'),
  editDestBtn: document.getElementById('edit-destination-btn'),
  configToggleBtn: document.getElementById('config-toggle-btn'),
  soundToggleBtn: document.getElementById('sound-toggle-btn'),
  soundIconOn: document.getElementById('sound-icon-on'),
  soundIconOff: document.getElementById('sound-icon-off'),
  warpOverlay: document.getElementById('warp-overlay'),
  warpProgressCircle: document.getElementById('warp-progress-circle'),
  warpPercentage: document.getElementById('warp-percentage'),
  cancelWarpBtn: document.getElementById('cancel-warp-btn'),
  directRedirectLink: document.getElementById('direct-redirect-link'),
  teleLine1: document.getElementById('tele-line-1'),
  teleLine2: document.getElementById('tele-line-2'),
  teleLine3: document.getElementById('tele-line-3'),
  teleLine4: document.getElementById('tele-line-4'),
  hyperspaceFlash: document.getElementById('hyperspace-flash'),
  // Auto-timer elements
  countdownSeconds: document.getElementById('countdown-seconds'),
  timerProgressFill: document.getElementById('timer-progress-fill'),
  pauseTimerBtn: document.getElementById('pause-timer-btn'),
  pauseBtnText: document.getElementById('pause-btn-text'),
  // Modal elements
  configModal: document.getElementById('config-modal'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  modalCancelBtn: document.getElementById('modal-cancel-btn'),
  modalSaveBtn: document.getElementById('modal-save-btn'),
  customIpInput: document.getElementById('custom-ip-input'),
  protocolSelect: document.getElementById('protocol-select'),
  presetChips: document.querySelectorAll('.preset-chip')
};

// ==============================================================================
// 1. SYNTHETIC AUDIO ENGINE (Web Audio API)
// ==============================================================================
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

const SoundFX = {
  hover() {
    if (!state.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  },

  warpEngage() {
    if (!state.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      
      // Low sub bass whoosh
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 2.0);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 1.8);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.4);

      // Low pass filter
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(3500, ctx.currentTime + 2.0);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 2.4);
    } catch (e) {}
  },

  blip(freq = 600) {
    if (!state.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {}
  }
};

// ==============================================================================
// 2. INTERACTIVE CANVAS & HYPERDRIVE STARFIELD
// ==============================================================================
class WarpEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.numStars = 320;
    this.stars = [];
    this.warpMode = false;
    this.warpSpeedMultiplier = 1;
    this.centerX = 0;
    this.centerY = 0;
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    this.resize();
    this.initStars();
    this.bindEvents();
    this.loop();
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < this.numStars; i++) {
      this.stars.push({
        x: (Math.random() - 0.5) * this.width * 2,
        y: (Math.random() - 0.5) * this.height * 2,
        z: Math.random() * this.width,
        prevZ: 0,
        radius: Math.random() * 1.5 + 0.5,
        color: Math.random() > 0.4 ? '#f59e0b' : (Math.random() > 0.5 ? '#00f2fe' : (Math.random() > 0.5 ? '#fbbf24' : '#ffffff'))
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => {
      this.mouse.targetX = (e.clientX - this.centerX) * 0.05;
      this.mouse.targetY = (e.clientY - this.centerY) * 0.05;
    });
  }

  setWarpMode(active) {
    this.warpMode = active;
  }

  loop() {
    requestAnimationFrame(() => this.loop());

    // Smooth mouse parallax
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

    // Fade trail effect for high-velocity warp lines
    if (this.warpMode) {
      this.ctx.fillStyle = 'rgba(5, 7, 14, 0.28)';
      this.warpSpeedMultiplier = Math.min(this.warpSpeedMultiplier + 0.8, 35);
    } else {
      this.ctx.fillStyle = 'rgba(5, 7, 14, 0.7)';
      this.warpSpeedMultiplier = Math.max(this.warpSpeedMultiplier - 0.5, 1);
    }
    this.ctx.fillRect(0, 0, this.width, this.height);

    const speed = this.warpMode ? 12 * this.warpSpeedMultiplier : 1.2;

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      star.prevZ = star.z;
      star.z -= speed;

      // Wrap around when star passes camera plane
      if (star.z <= 0) {
        star.z = this.width;
        star.prevZ = star.z;
        star.x = (Math.random() - 0.5) * this.width * 2;
        star.y = (Math.random() - 0.5) * this.height * 2;
      }

      // 3D perspective projection
      const k = 250 / star.z;
      const px = star.x * k + this.centerX + this.mouse.x;
      const py = star.y * k + this.centerY + this.mouse.y;

      if (px >= 0 && px <= this.width && py >= 0 && py <= this.height) {
        const size = Math.max(0.6, (1 - star.z / this.width) * (this.warpMode ? 3.5 : 2.2));
        
        if (this.warpMode) {
          // Stretch streak line from previous projected coordinate
          const prevK = 250 / star.prevZ;
          const prevPx = star.x * prevK + this.centerX + this.mouse.x;
          const prevPy = star.y * prevK + this.centerY + this.mouse.y;

          this.ctx.beginPath();
          this.ctx.moveTo(prevPx, prevPy);
          this.ctx.lineTo(px, py);
          this.ctx.strokeStyle = star.color;
          this.ctx.lineWidth = size * 1.4;
          this.ctx.stroke();
        } else {
          // Normal floating star point
          this.ctx.beginPath();
          this.ctx.arc(px, py, size, 0, Math.PI * 2);
          this.ctx.fillStyle = star.color;
          this.ctx.shadowBlur = size > 1.5 ? 8 : 0;
          this.ctx.shadowColor = star.color;
          this.ctx.fill();
          this.ctx.shadowBlur = 0;
        }
      }
    }
  }
}

let warpEngine = null;

// ==============================================================================
// 3. TARGET DESTINATION RESOLVER & URL LOGIC
// ==============================================================================
function getCleanDestinationUrl() {
  let target = (state.targetHost || '').trim();
  let proto = state.protocol || 'http://';

  if (!target) {
    target = CONFIG.DEFAULT_TARGET;
  }

  // If user already typed http:// or https:// in the input
  if (/^https?:\/\//i.test(target)) {
    return target;
  }

  return `${proto}${target}`;
}

function updateDestinationUI() {
  const fullUrl = getCleanDestinationUrl();
  if (elements.displayTargetUrl) {
    elements.displayTargetUrl.textContent = state.targetHost;
  }
  if (elements.directRedirectLink) {
    elements.directRedirectLink.href = fullUrl;
    elements.directRedirectLink.textContent = `Direct Link (${fullUrl}) \u2192`;
  }
}

// ==============================================================================
// 3.5. AUTOMATIC 10-SECOND REDIRECT TIMER
// ==============================================================================
function initAutoTimer() {
  state.autoTimerRemaining = CONFIG.AUTO_REDIRECT_SECONDS;
  state.autoTimerPaused = false;
  updateTimerUI();

  if (state.autoTimerInterval) {
    clearInterval(state.autoTimerInterval);
  }

  const stepMs = 50;
  const decrement = stepMs / 1000;

  state.autoTimerInterval = setInterval(() => {
    if (state.autoTimerPaused || state.isWarping) return;

    state.autoTimerRemaining = Math.max(0, state.autoTimerRemaining - decrement);
    updateTimerUI();

    if (state.autoTimerRemaining <= 0) {
      clearInterval(state.autoTimerInterval);
      state.autoTimerInterval = null;
      startWarpSequence();
    }
  }, stepMs);
}

function updateTimerUI() {
  if (!elements.countdownSeconds || !elements.timerProgressFill) return;
  const wholeSeconds = Math.ceil(state.autoTimerRemaining);
  elements.countdownSeconds.textContent = `${wholeSeconds}s`;
  const pct = (state.autoTimerRemaining / CONFIG.AUTO_REDIRECT_SECONDS) * 100;
  elements.timerProgressFill.style.width = `${pct}%`;
}

function toggleTimerPause() {
  state.autoTimerPaused = !state.autoTimerPaused;
  if (state.autoTimerPaused) {
    if (elements.pauseBtnText) elements.pauseBtnText.textContent = 'Resume';
    if (elements.pauseTimerBtn) elements.pauseTimerBtn.classList.add('paused');
  } else {
    if (elements.pauseBtnText) elements.pauseBtnText.textContent = 'Pause';
    if (elements.pauseTimerBtn) elements.pauseTimerBtn.classList.remove('paused');
  }
  SoundFX.hover();
}

function stopAutoTimer() {
  if (state.autoTimerInterval) {
    clearInterval(state.autoTimerInterval);
    state.autoTimerInterval = null;
  }
}

// ==============================================================================
// 4. TRANSITION & REDIRECTION CONTROLLER
// ==============================================================================
function startWarpSequence(e) {
  if (state.isWarping) return;
  state.isWarping = true;

  // Halt any auto timer
  stopAutoTimer();

  // Trigger button ripple
  createButtonRipple(e);

  // Sound FX
  SoundFX.warpEngage();

  // Activate canvas warp drive
  if (warpEngine) {
    warpEngine.setWarpMode(true);
  }

  // Smoothly transform card away
  elements.mainCard.style.transform = 'scale(0.85) translateY(-30px)';
  elements.mainCard.style.opacity = '0';
  elements.mainCard.style.pointerEvents = 'none';

  // Open HUD Overlay
  elements.warpOverlay.classList.add('active');

  // Reset Progress Gauge
  const maxDash = 276.46; // 2 * PI * 44
  elements.warpProgressCircle.style.strokeDashoffset = maxDash;
  elements.warpPercentage.textContent = '0%';

  // Reset Telemetry Lines
  const teleLines = [elements.teleLine1, elements.teleLine2, elements.teleLine3, elements.teleLine4];
  teleLines.forEach((line) => {
    line.className = 'telemetry-line';
  });

  const startTime = Date.now();
  const duration = CONFIG.WARP_DURATION_MS;

  state.warpInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const percent = Math.floor(progress * 100);

    // Update progress circle & label
    const offset = maxDash - (progress * maxDash);
    elements.warpProgressCircle.style.strokeDashoffset = offset;
    elements.warpPercentage.textContent = `${percent}%`;

    // Step telemetry lines sequentially
    if (percent >= 15 && !teleLines[0].classList.contains('done')) {
      teleLines[0].className = 'telemetry-line done';
      teleLines[1].className = 'telemetry-line active';
      SoundFX.blip(520);
    }
    if (percent >= 45 && !teleLines[1].classList.contains('done')) {
      teleLines[1].className = 'telemetry-line done';
      teleLines[2].className = 'telemetry-line active';
      SoundFX.blip(660);
    }
    if (percent >= 75 && !teleLines[2].classList.contains('done')) {
      teleLines[2].className = 'telemetry-line done';
      teleLines[3].className = 'telemetry-line active';
      SoundFX.blip(800);
    }
    if (percent >= 92 && !teleLines[3].classList.contains('done')) {
      teleLines[3].className = 'telemetry-line done';
      SoundFX.blip(980);
    }

    // Near completion: engage blinding flash
    if (percent >= 95 && !elements.hyperspaceFlash.classList.contains('trigger')) {
      elements.hyperspaceFlash.classList.add('trigger');
    }

    // Final redirection execution
    if (progress >= 1) {
      clearInterval(state.warpInterval);
      const destination = getCleanDestinationUrl();
      console.log('Nebula Gateway: Initiating redirection to:', destination);

      // Perform redirection
      setTimeout(() => {
        window.location.href = destination;
      }, 150);
    }
  }, 30);
}

function cancelWarpSequence() {
  if (!state.isWarping) return;
  state.isWarping = false;

  clearInterval(state.warpInterval);
  clearTimeout(state.warpTimeout);

  if (warpEngine) {
    warpEngine.setWarpMode(false);
  }

  // Remove hyperspace flash if triggered
  elements.hyperspaceFlash.classList.remove('trigger');

  // Hide HUD Overlay
  elements.warpOverlay.classList.remove('active');

  // Restore main welcome card
  elements.mainCard.style.transform = '';
  elements.mainCard.style.opacity = '';
  elements.mainCard.style.pointerEvents = '';

  // Pause the auto-timer so user can explore without immediate redirection
  state.autoTimerPaused = true;
  if (elements.pauseBtnText) elements.pauseBtnText.textContent = 'Resume';
  if (elements.pauseTimerBtn) elements.pauseTimerBtn.classList.add('paused');
}

function createButtonRipple(e) {
  const btn = elements.continueBtn;
  const rect = btn.getBoundingClientRect();
  const rippleBox = document.getElementById('ripple-box');
  if (!rippleBox) return;

  const ripple = document.createElement('span');
  ripple.classList.add('click-ripple');

  let x = rect.width / 2;
  let y = rect.height / 2;

  if (e && e.clientX) {
    x = e.clientX - rect.left;
    y = e.clientY - rect.top;
  }

  const size = Math.max(rect.width, rect.height) * 1.5;
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${x - size / 2}px`;
  ripple.style.top = `${y - size / 2}px`;

  rippleBox.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 800);
}

// ==============================================================================
// 5. CONFIGURATION MODAL CONTROLS
// ==============================================================================
function openModal() {
  // Pause countdown while user is typing destination
  if (!state.autoTimerPaused) {
    toggleTimerPause();
  }

  elements.customIpInput.value = state.targetHost;
  elements.protocolSelect.value = state.protocol;
  elements.configModal.classList.add('open');
  elements.customIpInput.focus();
}

function closeModal() {
  elements.configModal.classList.remove('open');
}

function saveDestination() {
  let val = elements.customIpInput.value.trim();
  if (!val) {
    val = CONFIG.DEFAULT_TARGET;
  }

  let selectedProto = elements.protocolSelect.value;

  // If user included protocol in the text field, split it out
  if (/^https:\/\//i.test(val)) {
    selectedProto = 'https://';
    val = val.replace(/^https:\/\//i, '');
  } else if (/^http:\/\//i.test(val)) {
    selectedProto = 'http://';
    val = val.replace(/^http:\/\//i, '');
  }

  state.targetHost = val;
  state.protocol = selectedProto;

  localStorage.setItem(CONFIG.STORAGE_KEY_TARGET, val);
  localStorage.setItem(CONFIG.STORAGE_KEY_PROTOCOL, selectedProto);

  updateDestinationUI();
  closeModal();
  SoundFX.blip(750);
}

// ==============================================================================
// 6. INITIALIZATION & EVENT LISTENERS
// ==============================================================================
function init() {
  // 1. Initialize Canvas Particle System
  if (elements.canvas) {
    warpEngine = new WarpEngine(elements.canvas);
  }

  // 2. Set Initial Destination Display
  updateDestinationUI();

  // 3. Sound Toggle Button (if present)
  const updateSoundIcon = () => {
    if (!elements.soundToggleBtn) return;
    if (state.soundEnabled) {
      if (elements.soundIconOn) elements.soundIconOn.classList.remove('hidden');
      if (elements.soundIconOff) elements.soundIconOff.classList.add('hidden');
      elements.soundToggleBtn.setAttribute('title', 'Sound FX: ON');
    } else {
      if (elements.soundIconOn) elements.soundIconOn.classList.add('hidden');
      if (elements.soundIconOff) elements.soundIconOff.classList.remove('hidden');
      elements.soundToggleBtn.setAttribute('title', 'Sound FX: OFF');
    }
  };
  updateSoundIcon();

  if (elements.soundToggleBtn) {
    elements.soundToggleBtn.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      localStorage.setItem(CONFIG.STORAGE_KEY_SOUND, state.soundEnabled ? 'true' : 'false');
      updateSoundIcon();
      if (state.soundEnabled) SoundFX.blip(880);
    });
  }

  // 4. Auto-Timer Controls (10 Seconds Automatic Redirection)
  if (elements.pauseTimerBtn) {
    elements.pauseTimerBtn.addEventListener('click', toggleTimerPause);
  }
  initAutoTimer();

  // 5. Continue Button Interactions
  if (elements.continueBtn) {
    elements.continueBtn.addEventListener('mouseenter', () => SoundFX.hover());
    elements.continueBtn.addEventListener('click', (e) => startWarpSequence(e));
  }

  // 5. Cancel Warp Button
  if (elements.cancelWarpBtn) {
    elements.cancelWarpBtn.addEventListener('click', () => cancelWarpSequence());
  }

  // 6. Destination Configuration Modal Events
  if (elements.editDestBtn) elements.editDestBtn.addEventListener('click', openModal);
  if (elements.configToggleBtn) elements.configToggleBtn.addEventListener('click', openModal);
  if (elements.closeModalBtn) elements.closeModalBtn.addEventListener('click', closeModal);
  if (elements.modalCancelBtn) elements.modalCancelBtn.addEventListener('click', closeModal);
  if (elements.modalSaveBtn) elements.modalSaveBtn.addEventListener('click', saveDestination);

  // Close modal when clicking outside
  elements.configModal.addEventListener('click', (e) => {
    if (e.target === elements.configModal) {
      closeModal();
    }
  });

  // Preset chips click
  elements.presetChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      elements.customIpInput.value = chip.dataset.val;
      SoundFX.hover();
    });
  });

  // Enter key inside modal saves
  elements.customIpInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveDestination();
    } else if (e.key === 'Escape') {
      closeModal();
    }
  });

  // Global ESC key closes modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (elements.configModal.classList.contains('open')) {
        closeModal();
      } else if (state.isWarping) {
        cancelWarpSequence();
      }
    }
  });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
