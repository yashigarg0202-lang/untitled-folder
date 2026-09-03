/**
 * SoulSync — Bay Leaf Manifestation by Pooja Garg
 * High-Visual, Low-Text Interactive UI Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  initSacredCanvas();
  initAudioAmbience();
  initOrbDiagram();
  initProcessStepper();
  initCard3DTilt();
  initSuggestionChips();
  initFormHandling();
  initModalHandling();
  initNavigation();
  initPWA();
});

/* ==========================================================================
   1. SACRED GOLDEN & EMERALD COSMIC CANVAS
   ========================================================================== */
function initSacredCanvas() {
  const canvas = document.getElementById('sacredCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  class Particle {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.size = Math.random() * 2.2 + 0.6;
      this.speedY = -(Math.random() * 0.35 + 0.15);
      this.speedX = (Math.random() - 0.5) * 0.25;
      this.alpha = Math.random() * 0.6 + 0.2;
      this.alphaChange = (Math.random() - 0.5) * 0.006;
      this.isGold = Math.random() > 0.3;
      this.color = this.isGold 
        ? `rgba(249, 226, 175, ${this.alpha})`
        : `rgba(82, 183, 136, ${this.alpha * 0.8})`;
    }
    update() {
      this.y += this.speedY;
      this.x += this.speedX;
      this.alpha += this.alphaChange;

      if (this.alpha <= 0.1 || this.alpha >= 0.8) {
        this.alphaChange = -this.alphaChange;
      }

      if (this.y < -10 || this.x < -10 || this.x > width + 10) {
        this.reset();
        this.y = height + 5;
      }
      this.color = this.isGold 
        ? `rgba(249, 226, 175, ${Math.max(0.05, this.alpha)})`
        : `rgba(82, 183, 136, ${Math.max(0.05, this.alpha * 0.8)})`;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.shadowBlur = this.size * 3;
      ctx.shadowColor = this.isGold ? 'rgba(212, 175, 55, 0.6)' : 'rgba(82, 183, 136, 0.4)';
      ctx.fill();
    }
  }

  const particleCount = Math.min(60, Math.floor(window.innerWidth / 24));
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    for (let p of particles) {
      p.update();
      p.draw();
    }
    requestAnimationFrame(animate);
  }
  animate();
}

/* ==========================================================================
   2. 528Hz SOLFEGGIO MEDITATION HARMONIC AMBIENCE (WEB AUDIO API)
   ========================================================================== */
let audioCtx = null;
let isAudioPlaying = false;
let masterGain = null;
let oscillators = [];

function initAudioAmbience() {
  const soundBtn = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');
  if (!soundBtn) return;

  soundBtn.addEventListener('click', () => {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (!isAudioPlaying) {
      startSolfeggioTone();
      isAudioPlaying = true;
      soundBtn.classList.add('playing');
      if (soundIcon) soundIcon.textContent = '🔊';
    } else {
      stopSolfeggioTone();
      isAudioPlaying = false;
      soundBtn.classList.remove('playing');
      if (soundIcon) soundIcon.textContent = '🔇';
    }
  });
}

function startSolfeggioTone() {
  if (!audioCtx) return;
  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
  masterGain.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 3);

  const freqs = [528, 264, 528 * 1.5, 528 * 0.75];

  oscillators = freqs.map((freq, idx) => {
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    
    osc.type = idx === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    if (idx === 0) osc.detune.setValueAtTime(1.5, audioCtx.currentTime);

    const relativeGain = idx === 0 ? 0.6 : (idx === 1 ? 0.3 : 0.1);
    oscGain.gain.setValueAtTime(relativeGain, audioCtx.currentTime);

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, audioCtx.currentTime);

    osc.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(masterGain);

    osc.start();
    return { osc, gain: oscGain };
  });

  masterGain.connect(audioCtx.destination);
}

function stopSolfeggioTone() {
  if (!masterGain || !audioCtx) return;
  masterGain.gain.setValueAtTime(masterGain.gain.value, audioCtx.currentTime);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.5);
  setTimeout(() => {
    oscillators.forEach(o => {
      try { o.osc.stop(); o.osc.disconnect(); } catch (e) {}
    });
    oscillators = [];
  }, 1600);
}

/* ==========================================================================
   3. 1. INTERACTIVE ENERGY ORB & 4 ORBITAL NODES
   ========================================================================== */
const ORB_DATA = {
  abundance: {
    badge: '💰 UNLOCK ABUNDANCE',
    text: 'Attract financial growth, open unexpected career avenues, and remove ancestral money limitations into effortless prosperity.',
    ctaText: 'Manifest Career & Wealth →'
  },
  blockages: {
    badge: '🧘 CLEAR BLOCKAGES',
    text: 'Dissolve subconscious fear, chronic anxiety, and self-limiting karmic patterns that hold you back from living fully.',
    ctaText: 'Clear Subconscious Blocks →'
  },
  clarity: {
    badge: '💡 FIND CLARITY',
    text: 'Sharpen your intuitive compass, eliminate confusion, and make confident, decisive daily choices on your true life path.',
    ctaText: 'Attain Deep Clarity →'
  },
  relationships: {
    badge: '❤️ HARMONIZE RELATIONSHIPS',
    text: 'Deepen loving bonds, release past emotional baggage, and attract a harmonious soulmate connection filled with peace.',
    ctaText: 'Harmonize Soulmate Love →'
  }
};

function initOrbDiagram() {
  const nodes = document.querySelectorAll('.orb-node');
  const detailBadge = document.getElementById('detailBadge');
  const detailText = document.getElementById('detailText');
  const detailCta = document.getElementById('detailCta');
  const centralOrb = document.getElementById('centralOrb');

  function selectNode(key) {
    if (!ORB_DATA[key]) return;
    nodes.forEach(n => {
      if (n.getAttribute('data-node') === key) {
        n.classList.add('active');
      } else {
        n.classList.remove('active');
      }
    });

    if (detailBadge) detailBadge.textContent = ORB_DATA[key].badge;
    if (detailText) detailText.textContent = ORB_DATA[key].text;
    if (detailCta) detailCta.textContent = ORB_DATA[key].ctaText;
  }

  nodes.forEach(node => {
    const key = node.getAttribute('data-node');
    node.addEventListener('mouseenter', () => selectNode(key));
    node.addEventListener('click', (e) => {
      selectNode(key);
      createSparkleBurst(e.clientX, e.clientY);
    });
  });

  if (centralOrb) {
    centralOrb.addEventListener('click', (e) => {
      createSparkleBurst(e.clientX, e.clientY);
      // Cycle through nodes
      const keys = Object.keys(ORB_DATA);
      const activeNode = document.querySelector('.orb-node.active');
      const currentKey = activeNode ? activeNode.getAttribute('data-node') : keys[0];
      const nextIdx = (keys.indexOf(currentKey) + 1) % keys.length;
      selectNode(keys[nextIdx]);
    });
  }
}

/* ==========================================================================
   4. 3. INTERACTIVE 3-STEP PROCESS FLOW COMPONENT
   ========================================================================== */
const STEP_DATA = [
  {
    step: 1,
    title: 'Step 1: Share Your Intention',
    subtitle: 'Define your wish & target timeline',
    text: 'State your heartfelt wish or life goal clearly in the form below. Pooja assesses your numerological vibration and tailors the exact sacred bay leaf intention phrasing suited for your energy blueprint.'
  },
  {
    step: 2,
    title: 'Step 2: Sacred Bay Leaf Ritual',
    subtitle: 'Pooja guides Prana alchemy & timing',
    text: 'Pooja charges your custom bay leaf with Prana energy, performs auric block cleansing, and conducts the sacred fire ceremony timed with your most auspicious planetary transit.'
  },
  {
    step: 3,
    title: 'Step 3: Receive Guidance & Achieve',
    subtitle: 'Follow daily protocol into reality',
    text: 'Receive 1-on-1 WhatsApp follow-ups, maintain your daily vibrational anchor protocol, and watch your intention materialize swiftly into tangible physical reality.'
  }
];

let currentStepIndex = 0;

function initProcessStepper() {
  const stepNodes = document.querySelectorAll('.step-interactive-node');
  const prevBtn = document.getElementById('prevStepBtn');
  const nextBtn = document.getElementById('nextStepBtn');
  const progressFill = document.getElementById('stepperProgressFill');
  const titleEl = document.getElementById('stepPreviewTitle');
  const subEl = document.getElementById('stepPreviewSubtitle');
  const textEl = document.getElementById('stepPreviewText');

  function updateStepper(index) {
    currentStepIndex = Math.max(0, Math.min(index, STEP_DATA.length - 1));
    const data = STEP_DATA[currentStepIndex];

    stepNodes.forEach((node, idx) => {
      if (idx === currentStepIndex) {
        node.classList.add('active');
      } else {
        node.classList.remove('active');
      }
    });

    if (progressFill) {
      const percentage = (currentStepIndex / (STEP_DATA.length - 1)) * 100;
      progressFill.style.width = `${percentage}%`;
    }

    if (titleEl) titleEl.textContent = data.title;
    if (subEl) subEl.textContent = data.subtitle;
    if (textEl) textEl.textContent = data.text;

    if (prevBtn) prevBtn.disabled = currentStepIndex === 0;
    if (nextBtn) {
      if (currentStepIndex === STEP_DATA.length - 1) {
        nextBtn.textContent = 'Set Intention Now ✨';
      } else {
        nextBtn.textContent = 'Next Step →';
      }
    }
  }

  stepNodes.forEach((node, idx) => {
    node.addEventListener('click', (e) => {
      updateStepper(idx);
      createSparkleBurst(e.clientX, e.clientY);
    });
  });

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      updateStepper(currentStepIndex - 1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentStepIndex === STEP_DATA.length - 1) {
        document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' });
      } else {
        updateStepper(currentStepIndex + 1);
      }
    });
  }

  updateStepper(0);
}

/* ==========================================================================
   5. 3D CARD TILT MICRO-INTERACTIONS
   ========================================================================== */
function initCard3DTilt() {
  const cards = document.querySelectorAll('.feature-flip-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;

      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

/* ==========================================================================
   6. QUICK CHIP SUGGESTIONS
   ========================================================================== */
function initSuggestionChips() {
  const chips = document.querySelectorAll('.quick-chip-btn');
  const textarea = document.getElementById('manifestationGoal');
  if (!textarea) return;

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.getAttribute('data-text');
      if (textarea.value.trim() === '') {
        textarea.value = text;
      } else {
        textarea.value += ', ' + text;
      }
      textarea.focus();
    });
  });
}

/* ==========================================================================
   7. 4-FIELD REGISTRATION FORM & PARTICLE SPARKLE BURST
   ========================================================================== */
function initFormHandling() {
  const form = document.getElementById('manifestationForm');
  const submitBtn = document.getElementById('submitBtn');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const fullName = form.fullName.value.trim();
    const countryCode = form.countryCode.value;
    const phone = form.phone.value.trim();
    const manifestationGoal = form.manifestationGoal.value.trim();
    const timeline = form.timeline.value;

    let hasError = false;

    if (!fullName || fullName.length < 2) {
      showError('fullNameError', 'Please enter your full name');
      hasError = true;
    }

    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (!cleanPhone || cleanPhone.length < 7 || !/^\d+$/.test(cleanPhone)) {
      showError('phoneError', 'Please enter a valid phone or WhatsApp number');
      hasError = true;
    }

    if (!manifestationGoal || manifestationGoal.length < 5) {
      showError('manifestationGoalError', 'Please share the wish or goal you want to manifest');
      hasError = true;
    }

    if (hasError) return;

    // Trigger soft particle celebration burst around button
    const btnRect = submitBtn.getBoundingClientRect();
    createSparkleBurst(btnRect.left + btnRect.width / 2, btnRect.top + btnRect.height / 2, 20);

    submitBtn.classList.add('submitting');
    submitBtn.disabled = true;

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          countryCode,
          phone: cleanPhone,
          manifestationGoal,
          timeline,
          preferredContact: 'WhatsApp'
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        form.reset();
        openThankYouModal(result.applicant || { name: fullName, timeline, contact: `${countryCode} ${cleanPhone}` }, manifestationGoal);
      } else {
        alert(result.error || 'There was an issue setting your intention. Please try again.');
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert('Unable to connect to the intention server. Please message Pooja directly on WhatsApp.');
    } finally {
      submitBtn.classList.remove('submitting');
      submitBtn.disabled = false;
    }
  });
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function clearErrors() {
  document.querySelectorAll('.clean-field-error').forEach(el => el.textContent = '');
}

/* ==========================================================================
   8. ANIMATED SUCCESS MODAL (5. DATA PRIVACY & CONFIRMATION)
   ========================================================================== */
function initModalHandling() {
  const modal = document.getElementById('thankYouModal');
  const closeBtn = document.getElementById('closeModalBtn');
  const closeActionBtn = document.getElementById('closeModalActionBtn');

  if (!modal) return;

  function closeModal() {
    modal.setAttribute('hidden', 'true');
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (closeActionBtn) closeActionBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hasAttribute('hidden')) closeModal();
  });
}

function openThankYouModal(applicant, goal) {
  const modal = document.getElementById('thankYouModal');
  const detailsSummary = document.getElementById('modalDetailsSummary');
  const whatsappBtn = document.getElementById('instantWhatsAppBtn');

  if (!modal) return;

  if (detailsSummary) {
    detailsSummary.innerHTML = `
      <p><strong>Applicant:</strong> ${applicant.name}</p>
      <p><strong>Timeline:</strong> ${applicant.timeline}</p>
      <p><strong>WhatsApp / Phone:</strong> ${applicant.contact}</p>
    `;
  }

  if (whatsappBtn) {
    const encodedMsg = encodeURIComponent(
      `Hello Pooja Garg,\n\nI just submitted my manifestation intention on SoulSync!\nName: ${applicant.name}\nTimeline: ${applicant.timeline}\nLooking forward to speaking with you.`
    );
    whatsappBtn.href = `https://wa.me/?text=${encodedMsg}`;
  }

  modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
}

/* ==========================================================================
   9. PARTICLE SPARKLE BURST UTILITY
   ========================================================================== */
function createSparkleBurst(x, y, count = 12) {
  for (let i = 0; i < count; i++) {
    const spark = document.createElement('div');
    spark.textContent = ['✦', '✨', '•', 'ॐ', '🌿'][Math.floor(Math.random() * 5)];
    spark.style.position = 'fixed';
    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;
    spark.style.color = '#FCE8B3';
    spark.style.fontSize = `${Math.random() * 16 + 12}px`;
    spark.style.pointerEvents = 'none';
    spark.style.zIndex = '9999';
    spark.style.transition = 'all 0.75s cubic-bezier(0.16, 1, 0.3, 1)';

    document.body.appendChild(spark);

    const destX = (Math.random() - 0.5) * 180;
    const destY = (Math.random() - 0.5) * 180 - 20;

    requestAnimationFrame(() => {
      spark.style.transform = `translate(${destX}px, ${destY}px) scale(0)`;
      spark.style.opacity = '0';
    });

    setTimeout(() => spark.remove(), 800);
  }
}

/* ==========================================================================
   10. NAVIGATION & SMOOTH SCROLLING
   ========================================================================== */
function initNavigation() {
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const navMenu = document.getElementById('navMenu');

  if (mobileBtn && navMenu) {
    mobileBtn.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });

    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => navMenu.classList.remove('active'));
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* ==========================================================================
   11. PWA SERVICE WORKER & INSTALL BANNER
   ========================================================================== */
function initPWA() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('Service Worker registration skipped:', err);
      });
    });
  }

  let deferredPrompt;
  const banner = document.getElementById('androidInstallBanner');
  const installBtn = document.getElementById('installPwaBtn');
  const dismissBtn = document.getElementById('dismissInstallBtn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (banner && !sessionStorage.getItem('pwa_banner_dismissed')) {
      banner.removeAttribute('hidden');
    }
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        if (banner) banner.setAttribute('hidden', 'true');
      }
      deferredPrompt = null;
    });
  }

  if (dismissBtn && banner) {
    dismissBtn.addEventListener('click', () => {
      banner.setAttribute('hidden', 'true');
      sessionStorage.setItem('pwa_banner_dismissed', '1');
    });
  }
}
