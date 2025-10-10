/* Calendar View - Week Grid with Time Positioning and Overlap Detection */

// Constants
const HOUR_START = 8;
const HOUR_END = 20;
const HOUR_HEIGHT = 60; // pixels per hour

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Calculate top position in pixels for a given time
 */
function calculateTopPosition(timeStr) {
  const minutes = timeToMinutes(timeStr);
  const startMinutes = HOUR_START * 60;
  const offsetMinutes = minutes - startMinutes;
  return (offsetMinutes / 60) * HOUR_HEIGHT;
}

/**
 * Calculate height in pixels for duration between start and end times
 */
function calculateHeight(startTime, endTime) {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const durationMinutes = endMinutes - startMinutes;
  return Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20); // minimum 20px
}

/**
 * Detect overlapping appointments
 * Returns groups of overlapping appointments
 */
function detectOverlaps(appointments) {
  const sorted = [...appointments].sort((a, b) => a.start.localeCompare(b.start));
  const groups = [];
  
  for (const appt of sorted) {
    const startMin = timeToMinutes(appt.start);
    const endMin = timeToMinutes(appt.end);
    
    // Find existing group that overlaps
    let added = false;
    for (const group of groups) {
      // Check if this appointment overlaps with any in the group
      const overlaps = group.some(existing => {
        const existingStart = timeToMinutes(existing.start);
        const existingEnd = timeToMinutes(existing.end);
        return (startMin < existingEnd && endMin > existingStart);
      });
      
      if (overlaps) {
        group.push(appt);
        added = true;
        break;
      }
    }
    
    if (!added) {
      groups.push([appt]);
    }
  }
  
  return groups;
}

/**
 * Enhanced renderWeek with time grid positioning
 */
function renderWeekGrid() {
  const cont = document.getElementById('view-week');
  const current = new Date(datePicker.value);
  const start = new Date(current);
  start.setDate(current.getDate() - ((current.getDay() + 6) % 7)); // Monday
  
  cont.classList.add('calendar-grid');
  
  let html = `<h3 style="grid-column: 1 / -1; margin: 12px;">🗓️ Semaine du ${start.toISOString().slice(0,10)}</h3>`;
  
  // Time column header
  html += `<div class="cv-day-header" style="grid-row: 2;"></div>`;
  
  // Day headers
  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const ds = day.toISOString().slice(0,10);
    const isToday = ds === new Date().toISOString().slice(0,10);
    html += `<div class="cv-day-header" style="grid-row: 2; ${isToday ? 'background:#fff7fc;' : ''}">${dayNames[i]}<br><small>${day.getDate()}</small></div>`;
  }
  
  // Time column with hour labels
  html += `<div class="cv-time-col" style="grid-row: 3;">`;
  for (let h = HOUR_START; h < HOUR_END; h++) {
    html += `<div class="cv-time-slot">${String(h).padStart(2, '0')}:00</div>`;
  }
  html += `</div>`;
  
  // Day columns with events
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const ds = day.toISOString().slice(0,10);
    const dayAppts = byDate(ds);
    
    html += `<div class="cv-day-col" style="grid-row: 3;">`;
    html += `<div class="cv-day-grid">`;
    
    // Add hour grid lines
    for (let h = HOUR_START; h <= HOUR_END; h++) {
      const top = (h - HOUR_START) * HOUR_HEIGHT;
      html += `<div class="cv-hour-line" style="top:${top}px"></div>`;
    }
    
    // Detect overlaps and render events
    const overlapGroups = detectOverlaps(dayAppts);
    
    for (const group of overlapGroups) {
      const overlapClass = group.length > 1 ? `overlap-${Math.min(group.length, 4)}` : '';
      
      for (let idx = 0; idx < group.length; idx++) {
        const a = group[idx];
        const top = calculateTopPosition(a.start);
        const height = calculateHeight(a.start, a.end);
        const c = col(a.serviceId);
        const bgColor = hexToPastel(c);
        const paid = a.paid ? "✅" : "💵";
        const conf = a.confirm ? "📲" : "⌛";
        
        html += `<div class="cv-event ${overlapClass}" 
          style="top:${top}px; height:${height}px; background:${bgColor}; border-left-color:${c}"
          onclick="editAppt(findAppt('${a.id}'))">
          <div class="cv-event-time">${a.start}-${a.end}</div>
          <div class="cv-event-title">${srvName(a.serviceId)}</div>
          <div class="cv-event-client">${cliName(a.clientId)}</div>
          <div class="cv-event-icons">${paid} ${conf}</div>
        </div>`;
      }
    }
    
    html += `</div></div>`;
  }
  
  cont.innerHTML = html;
}

// Override the original renderWeek function
if (typeof renderWeek !== 'undefined') {
  window.originalRenderWeek = renderWeek;
}
window.renderWeek = renderWeekGrid;

/**
 * Text-to-Speech using Web Speech API
 */
const BabineTTS = {
  synth: window.speechSynthesis,
  isSpeaking: false,
  
  speak(text, lang = 'fr-CA') {
    if (!this.synth) {
      console.warn('Speech Synthesis not supported');
      return;
    }
    
    // Cancel any ongoing speech
    this.synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    
    utterance.onstart = () => {
      this.isSpeaking = true;
      this.updateUI(true);
    };
    
    utterance.onend = () => {
      this.isSpeaking = false;
      this.updateUI(false);
    };
    
    utterance.onerror = (event) => {
      console.error('Speech error:', event);
      this.isSpeaking = false;
      this.updateUI(false);
    };
    
    this.synth.speak(utterance);
  },
  
  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.updateUI(false);
    }
  },
  
  updateUI(speaking) {
    const avatar = document.querySelector('.avatar-babine');
    const ttsBtn = document.querySelector('.tts-button');
    
    if (avatar) {
      avatar.classList.toggle('speaking', speaking);
    }
    
    if (ttsBtn) {
      ttsBtn.classList.toggle('speaking', speaking);
      const icon = ttsBtn.querySelector('.tts-icon');
      if (icon) {
        icon.textContent = speaking ? '🔊' : '🎤';
      }
    }
  },
  
  greet() {
    const messages = [
      "Bonjour! Je suis Babine, ton assistante beauté.",
      "Bienvenue! Comment puis-je t'aider aujourd'hui?",
      "Salut! Prête à gérer tes rendez-vous?",
      "Coucou! Je suis là pour t'aider avec ton agenda."
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];
    this.speak(message);
  },
  
  announceAppointments() {
    const d = datePicker.value || new Date().toISOString().slice(0,10);
    const list = byDate(d);
    
    if (list.length === 0) {
      this.speak("Tu n'as aucun rendez-vous aujourd'hui.");
    } else {
      const count = list.length;
      const message = `Tu as ${count} rendez-vous aujourd'hui.`;
      this.speak(message);
    }
  }
};

// Initialize TTS button click handler
window.addEventListener('load', () => {
  const ttsBtn = document.getElementById('tts-button');
  if (ttsBtn) {
    ttsBtn.addEventListener('click', () => {
      if (BabineTTS.isSpeaking) {
        BabineTTS.stop();
      } else {
        BabineTTS.announceAppointments();
      }
    });
  }
  
  const avatar = document.querySelector('.avatar-babine');
  if (avatar) {
    avatar.addEventListener('click', () => {
      if (BabineTTS.isSpeaking) {
        BabineTTS.stop();
      } else {
        BabineTTS.greet();
      }
    });
  }
});

// Export for global access
window.BabineTTS = BabineTTS;
