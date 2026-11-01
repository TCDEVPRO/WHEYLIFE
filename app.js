/**
 * WHEY LIFE - App Gamificada para Tomas de Proteína en Polvo
 */

const STORAGE_KEY = 'wheylife_tomas_app_v1';

const defaultState = {
  onboardingDone: false,
  goal: 2, // Meta en TOMAS por defecto (ej. 2 tomas)
  todayIntake: 0, // Tomas registradas hoy
  streak: 0,
  lastActiveDate: null,
  todayCompleted: false,
  canUndo: false,
  weeklyLogs: {},
  notificationsEnabled: false
};

let appState = loadState();
let pendingStreakLostAnimation = false;
let previousStreakCount = 0;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...defaultState, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error cargando estado:', e);
  }
  return { ...defaultState };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (e) {
    console.error('Error guardando estado:', e);
  }
}

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Audio API
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx && AudioContextClass) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playGlugSound() {
  try {
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.14);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {}
}

function playPopSound() {
  try {
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {}
}

function playEpicFanfare() {
  try {
    initAudio();
    if (!audioCtx) return;

    const melody = [
      { f: 523.25, d: 0.14 },
      { f: 659.25, d: 0.14 },
      { f: 783.99, d: 0.14 },
      { f: 1046.50, d: 0.45 }
    ];

    let delay = 0;
    melody.forEach(item => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const start = audioCtx.currentTime + delay;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(item.f, start);

      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + item.d);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(start);
      osc.stop(start + item.d);

      delay += item.d;
    });
  } catch (e) {}
}

function playGlassShatterSound() {
  try {
    initAudio();
    if (!audioCtx) return;

    const bufferSize = audioCtx.sampleRate * 0.3;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, audioCtx.currentTime);

    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    whiteNoise.start(now);
  } catch (e) {}
}

function playTickDownSound() {
  try {
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.04);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  } catch (e) {}
}

// Consejos orientados ÚNICAMENTE a Proteína en Polvo
const wheyTips = [
  "Prepara tu toma de proteína en polvo agitándola en tu shaker durante 20 segundos para evitar grumos.",
  "Tomar tu suplemento de proteína en polvo justo después de entrenar apoya la recuperación de tus músculos.",
  "La proteína en polvo Whey Isolate se disuelve rápidamente y es muy ligera para la digestión.",
  "Bro, asegúrate de tomar tu toma de proteína con agua bien fría o leche de tu preferencia.",
  "Mantener la constancia en tus tomas diarias de proteína en polvo ayuda a cumplir tus objetivos físicos.",
  "Guarda tu bote de proteína en polvo en un lugar fresco y seco para conservar su calidad y frescura.",
  "Si viajas, puedes llevar tu toma de proteína en polvo en un shaker seco listo para mezclar."
];

let lastTipIndex = -1;

function getRandomTip() {
  let nextIdx;
  do {
    nextIdx = Math.floor(Math.random() * wheyTips.length);
  } while (nextIdx === lastTipIndex && wheyTips.length > 1);

  lastTipIndex = nextIdx;
  return wheyTips[nextIdx];
}

function changeTipWithAnimation() {
  playPopSound();
  const tipMsg = document.getElementById('mascotMessage');
  const sideTip = document.getElementById('sideTipText');
  const mascot = document.getElementById('mascotSvg');

  const newTip = getRandomTip();

  tipMsg.animate([
    { opacity: 0, transform: 'translateY(6px)' },
    { opacity: 1, transform: 'translateY(0)' }
  ], { duration: 250, easing: 'ease-out' });

  tipMsg.textContent = newTip;
  if (sideTip) sideTip.textContent = newTip;

  const mouth = document.getElementById('mascotMouth');
  if (mouth) {
    mouth.classList.remove('mouth-talking-active');
    void mouth.offsetWidth;
    mouth.classList.add('mouth-talking-active');
  }

  mascot.animate([
    { transform: 'scale(1) rotate(0deg)' },
    { transform: 'scale(1.15) rotate(5deg)' },
    { transform: 'scale(0.95) rotate(-4deg)' },
    { transform: 'scale(1) rotate(0deg)' }
  ], { duration: 400, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
}

function checkDayRollover() {
  const today = getTodayString();
  const yesterday = getYesterdayString();

  if (appState.lastActiveDate !== today) {
    if (appState.lastActiveDate) {
      if (!appState.weeklyLogs) appState.weeklyLogs = {};
      appState.weeklyLogs[appState.lastActiveDate] = {
        intake: appState.todayIntake,
        goal: appState.goal,
        completed: appState.todayCompleted
      };

      if ((appState.lastActiveDate !== yesterday || !appState.todayCompleted) && appState.streak > 0) {
        previousStreakCount = appState.streak;
        appState.streak = 0;
        pendingStreakLostAnimation = true;
      }
    }

    appState.todayIntake = 0;
    appState.todayCompleted = false;
    appState.canUndo = false;
    appState.lastActiveDate = today;
    saveState();
  }
}

function triggerStreakLostAnimation(startDays) {
  const modal = document.getElementById('streakLostModal');
  const fallingGlass = document.getElementById('fallingGlass');
  const lostDisplay = document.getElementById('lostStreakDisplay');

  if (!modal) return;

  modal.classList.add('active');
  lostDisplay.textContent = startDays;

  setTimeout(() => {
    fallingGlass.classList.add('glass-shatter-anim');
    playGlassShatterSound();
  }, 350);

  setTimeout(() => {
    let current = startDays;
    const totalDuration = 600;
    const stepTime = Math.max(10, Math.floor(totalDuration / startDays));

    const interval = setInterval(() => {
      current--;
      if (current <= 0) {
        current = 0;
        clearInterval(interval);
      }
      lostDisplay.textContent = current;
      playTickDownSound();
    }, stepTime);
  }, 850);
}

// Notificaciones cel
function setupNotifications() {
  const notifBtn = document.getElementById('toggleNotificationsBtn');

  updateNotifUI();

  if (notifBtn) {
    notifBtn.addEventListener('click', () => {
      if (appState.notificationsEnabled) {
        appState.notificationsEnabled = false;
        saveState();
        updateNotifUI();
        alert("Notificaciones desactivadas.");
        return;
      }

      if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            appState.notificationsEnabled = true;
            saveState();
            updateNotifUI();
            sendDuolingoNotification("¡Notificaciones activadas! 🥤", "Te recordaremos tu toma de proteína en polvo para mantener tu racha viva 🔥");
          } else {
            alert("Debes permitir las notificaciones en la configuración de tu celular.");
          }
        });
      } else {
        alert("Tu dispositivo o navegador no soporta notificaciones.");
      }
    });
  }

  scheduleDuolingoReminders();
}

function updateNotifUI() {
  const notifBtn = document.getElementById('toggleNotificationsBtn');
  const notifStatus = document.getElementById('notifStatusText');

  if (!notifBtn) return;

  if (appState.notificationsEnabled && ('Notification' in window) && Notification.permission === 'granted') {
    notifBtn.innerHTML = '<span>🔕</span> Desactivar Notificaciones';
    notifBtn.style.backgroundColor = '#fecaca';
    notifBtn.style.color = '#991b1b';
    notifBtn.style.borderColor = '#fca5a5';
    if (notifStatus) notifStatus.textContent = "Notificaciones activadas 🔔";
  } else {
    notifBtn.innerHTML = '<span>🔔</span> Activar Notificaciones';
    notifBtn.style.backgroundColor = '#fee2e2';
    notifBtn.style.color = '#991b1b';
    notifBtn.style.borderColor = '#fca5a5';
    if (notifStatus) notifStatus.textContent = "Recibe alertas en tu celular antes de perder la racha";
  }
}

const duolingoMessages = [
  { title: "¡Toma de proteína pendiente! 🥤", body: "Recuerda prepararte tu toma de proteína en polvo para mantener tu racha activa hoy." },
  { title: "¡Bro, es hora de tu toma! 🔥", body: "Solo una toma de proteína te acerca a tu meta del día." },
  { title: "¡Mantén la racha anabólica! 💪", body: "Que no se te pase tu toma de proteína en polvo diaria." }
];

function sendDuolingoNotification(customTitle, customBody) {
  if (appState.notificationsEnabled && ('Notification' in window) && Notification.permission === 'granted') {
    const randomMsg = duolingoMessages[Math.floor(Math.random() * duolingoMessages.length)];
    const title = customTitle || randomMsg.title;
    const body = customBody || randomMsg.body;

    const options = {
      body: body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🥤</text></svg>',
      vibrate: [200, 100, 200]
    };

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, options);
      });
    } else {
      new Notification(title, options);
    }
  }
}

function scheduleDuolingoReminders() {
  setInterval(() => {
    if (!appState.notificationsEnabled || appState.todayCompleted) return;

    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour >= 9 && currentHour <= 21) {
      sendDuolingoNotification();
    }
  }, 1000 * 60 * 60 * 3);
}

// Actualizar Interfaz
function updateUI(animated = false) {
  const percent = Math.min(Math.round((appState.todayIntake / appState.goal) * 100), 100);
  const remaining = Math.max(0, appState.goal - appState.todayIntake);

  const currentIntakeEl = document.getElementById('currentIntake');
  if (currentIntakeEl) currentIntakeEl.textContent = appState.todayIntake;

  const goalIntakeEl = document.getElementById('goalIntake');
  if (goalIntakeEl) goalIntakeEl.textContent = appState.goal;

  const proteinPercentageEl = document.getElementById('proteinPercentage');
  if (proteinPercentageEl) proteinPercentageEl.textContent = `${percent}%`;

  ['mobileStreakCount', 'desktopStreakCount'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = appState.streak;
  });

  ['mobileNavPercent', 'desktopNavPercent'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = `${percent}%`;
  });

  const proteinLiquid = document.getElementById('proteinLiquid');
  if (proteinLiquid) {
    proteinLiquid.style.height = `${percent}%`;
  }

  const challengeBar = document.getElementById('challengeBarFill');
  if (challengeBar) {
    challengeBar.style.width = `${percent}%`;
  }

  const statusBadge = document.getElementById('statusBadge');
  if (statusBadge) {
    if (percent >= 100) {
      statusBadge.innerHTML = '🎉 <strong>¡Meta de tomas cumplida con éxito hoy!</strong>';
      statusBadge.style.background = '#dcfce7';
      statusBadge.style.color = '#15803d';
      statusBadge.style.borderColor = '#86efac';
    } else {
      statusBadge.innerHTML = `🥤 Faltan <strong id="remainingIntake">${remaining}</strong> ${remaining === 1 ? 'toma' : 'tomas'} para la meta de hoy`;
      statusBadge.style.background = '#fee2e2';
      statusBadge.style.color = '#991b1b';
      statusBadge.style.borderColor = '#fca5a5';
    }
  }

  const undoBtn = document.getElementById('undoBtn');
  if (undoBtn) {
    undoBtn.disabled = !appState.canUndo;
    if (appState.canUndo) {
      undoBtn.textContent = `↩️ Deshacer última toma (-1 Toma)`;
      undoBtn.style.opacity = '1';
      undoBtn.style.pointerEvents = 'auto';
    } else {
      undoBtn.textContent = '↩️ Deshacer última toma (Solo 1 vez)';
      undoBtn.style.opacity = '0.35';
      undoBtn.style.pointerEvents = 'none';
    }
  }

  const sunglasses = document.getElementById('sunglasses');
  const mascotMouth = document.getElementById('mascotMouth');
  if (percent >= 100) {
    if (sunglasses) sunglasses.style.display = 'block';
    if (mascotMouth) mascotMouth.setAttribute('d', 'M65 94 Q80 110 95 94');
  } else {
    if (sunglasses) sunglasses.style.display = 'none';
    if (mascotMouth) mascotMouth.setAttribute('d', 'M72 98 Q80 108 88 98');
  }

  renderWeekPills();

  if (animated) {
    const mascot = document.getElementById('mascotSvg');
    if (mascot) {
      mascot.animate([
        { transform: 'scale(1)' },
        { transform: 'scale(1.15) rotate(4deg)' },
        { transform: 'scale(0.95) rotate(-3deg)' },
        { transform: 'scale(1)' }
      ], { duration: 400, easing: 'ease-out' });
    }
  }
}

function renderWeekPills() {
  const container = document.getElementById('weekPills');
  if (!container) return;

  container.innerHTML = '';
  const daysNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dayName = daysNames[d.getDay()];
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    const isToday = i === 0;
    const isCompleted = isToday 
      ? appState.todayCompleted 
      : (appState.weeklyLogs && appState.weeklyLogs[dateStr] && appState.weeklyLogs[dateStr].completed);

    const item = document.createElement('div');
    item.className = 'day-item';
    item.innerHTML = `
      <span class="day-label">${dayName}</span>
      <div class="day-circle ${isCompleted ? 'completed' : ''} ${isToday ? 'today' : ''}">
        ${isCompleted ? '✓' : (isToday ? '🥤' : '·')}
      </div>
    `;
    container.appendChild(item);
  }
}

function logSingleTake() {
  initAudio();
  playGlugSound();

  const tambo = document.querySelector('.tambo-container');
  if (tambo) {
    tambo.classList.remove('tambo-splash');
    void tambo.offsetWidth;
    tambo.classList.add('tambo-splash');
  }

  appState.todayIntake += 1;
  appState.canUndo = true;

  const reachedGoal = (appState.todayIntake >= appState.goal);
  const wasAlreadyCompleted = appState.todayCompleted;

  if (reachedGoal && !wasAlreadyCompleted) {
    appState.todayCompleted = true;
    appState.streak += 1;
    saveState();
    updateUI(true);
    triggerEpicCelebration();
  } else {
    saveState();
    updateUI(true);
  }
}

function undoLastTake() {
  if (!appState.canUndo || appState.todayIntake <= 0) {
    alert("Solo puedes deshacer 1 sola vez.");
    return;
  }

  appState.todayIntake = Math.max(0, appState.todayIntake - 1);
  appState.canUndo = false;

  if (appState.todayIntake < appState.goal && appState.todayCompleted) {
    appState.todayCompleted = false;
    appState.streak = Math.max(0, appState.streak - 1);
  }

  saveState();
  updateUI(false);
}

function triggerEpicCelebration() {
  const modal = document.getElementById('epicCelebration');
  const glassScene = document.getElementById('glassScene');
  const spinningGlass = document.getElementById('spinningGlass');
  const glassLiquid = document.getElementById('glassLiquid');
  const streakScene = document.getElementById('streakScene');
  const celebrationDaysCount = document.getElementById('celebrationDaysCount');

  streakScene.style.display = 'none';
  glassScene.style.display = 'flex';
  glassLiquid.style.height = '0%';
  spinningGlass.classList.remove('spinning-glass-anim');

  celebrationDaysCount.textContent = `${appState.streak} ${appState.streak === 1 ? 'DÍA' : 'DÍAS'}`;
  modal.classList.add('active');

  setTimeout(() => {
    glassLiquid.style.height = '100%';
  }, 300);

  setTimeout(() => {
    spinningGlass.classList.add('spinning-glass-anim');
  }, 1200);

  setTimeout(() => {
    glassScene.style.display = 'none';
    streakScene.style.display = 'flex';
    playEpicFanfare();

    if (typeof confetti === 'function') {
      confetti({
        particleCount: 110,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#dc2626', '#ef4444', '#18181b', '#f97316', '#ffffff']
      });
    }
  }, 2700);
}

function initApp() {
  checkDayRollover();
  updateUI();
  setupNotifications();

  if (pendingStreakLostAnimation && previousStreakCount > 0) {
    pendingStreakLostAnimation = false;
    setTimeout(() => {
      triggerStreakLostAnimation(previousStreakCount);
    }, 500);
  }

  const onboardingModal = document.getElementById('onboardingModal');
  if (!appState.onboardingDone && onboardingModal && !pendingStreakLostAnimation) {
    onboardingModal.classList.add('active');
  }

  document.getElementById('closeStreakLostBtn')?.addEventListener('click', () => {
    document.getElementById('streakLostModal').classList.remove('active');
  });

  document.getElementById('testNotifBtn')?.addEventListener('click', () => {
    sendDuolingoNotification("🧪 Prueba WHEY LIFE", "¡Las notificaciones en tu celular funcionan perfectamente! 🥤");
  });

  document.querySelectorAll('.goal-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.goal-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const val = chip.getAttribute('data-goal');
      const manualInput = document.getElementById('onboardingManualGoal');
      if (manualInput) manualInput.value = val;
    });
  });

  const finishOnboarding = (goalTomas) => {
    appState.goal = Math.max(1, goalTomas || 2);
    appState.onboardingDone = true;
    saveState();
    updateUI();

    if (onboardingModal) {
      onboardingModal.classList.remove('active');
      onboardingModal.style.display = 'none';
    }
    initAudio();
    playGlugSound();
  };

  const onboardingSubmitBtn = document.getElementById('onboardingSubmitBtn');
  if (onboardingSubmitBtn) {
    onboardingSubmitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const goalVal = parseInt(document.getElementById('onboardingManualGoal')?.value, 10) || 2;
      finishOnboarding(goalVal);
    });
  }

  const onboardingSkipBtn = document.getElementById('onboardingSkipBtn');
  if (onboardingSkipBtn) {
    onboardingSkipBtn.addEventListener('click', (e) => {
      e.preventDefault();
      finishOnboarding(2);
    });
  }

  document.getElementById('mascotWrapper').addEventListener('click', changeTipWithAnimation);
  document.getElementById('speechBubble').addEventListener('click', changeTipWithAnimation);

  // BOTÓN ÚNICO
  document.getElementById('singleTakeBtn')?.addEventListener('click', logSingleTake);
  document.getElementById('undoBtn')?.addEventListener('click', undoLastTake);

  document.getElementById('closeCelebrationBtn')?.addEventListener('click', () => {
    document.getElementById('epicCelebration').classList.remove('active');
  });

  document.getElementById('navTipsBtn')?.addEventListener('click', changeTipWithAnimation);
  document.getElementById('navNotifBtn')?.addEventListener('click', () => {
    document.getElementById('toggleNotificationsBtn')?.click();
  });

  const openSettings = () => {
    document.getElementById('inputManualGoal').value = appState.goal;
    document.getElementById('settingsModal').classList.add('active');
  };

  document.getElementById('navSettingsBtn')?.addEventListener('click', openSettings);
  document.getElementById('mobileSettingsBtn')?.addEventListener('click', openSettings);

  document.getElementById('resetOnboardingBtn')?.addEventListener('click', () => {
    document.getElementById('settingsModal')?.classList.remove('active');
    const onboardingModal = document.getElementById('onboardingModal');
    if (onboardingModal) {
      onboardingModal.style.display = 'flex';
      onboardingModal.classList.add('active');
    }
  });

  document.getElementById('closeSettingsBtn')?.addEventListener('click', () => {
    document.getElementById('settingsModal').classList.remove('active');
  });

  const manualForm = document.getElementById('manualForm');
  if (manualForm) {
    manualForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const manualGoal = parseInt(document.getElementById('inputManualGoal').value, 10);
      if (manualGoal && manualGoal >= 1) {
        appState.goal = manualGoal;
        saveState();
        updateUI();
        document.getElementById('settingsModal').classList.remove('active');
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}