/* Calendar View - Positioned Week with Overlap Handling */

// Override the renderWeek function to use positioned layout
function renderWeekPositioned() {
  const cont = document.getElementById('view-week');
  const current = new Date(datePicker.value);
  const start = new Date(current);
  start.setDate(current.getDate() - ((current.getDay() + 6) % 7)); // Monday

  const hourStart = 8;
  const hourEnd = 20;
  const hourHeight = 60; // pixels per hour

  let html = `<h3>🗓️ Semaine du ${start.toISOString().slice(0, 10)}</h3>`;
  html += `<div class="cv-week-container">`;

  // Hour column
  html += `<div class="cv-hour-column">`;
  html += `<div class="cv-hour-header">Heure</div>`;
  for (let h = hourStart; h < hourEnd; h++) {
    html += `<div class="cv-hour-slot">${String(h).padStart(2, '0')}:00</div>`;
  }
  html += `</div>`;

  // Day columns
  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const ds = day.toISOString().slice(0, 10);
    const dayAppts = byDate(ds);

    html += `<div class="cv-day-column">`;
    html += `<div class="cv-day-header">`;
    html += `<div class="cv-day-name">${dayNames[i]}</div>`;
    html += `<div class="cv-day-date">${day.getDate()}/${day.getMonth() + 1}</div>`;
    html += `</div>`;
    html += `<div class="cv-day-grid" data-date="${ds}">`;

    // Add hour lines
    for (let h = hourStart; h < hourEnd; h++) {
      const top = (h - hourStart) * hourHeight;
      html += `<div class="cv-hour-line" style="top:${top}px"></div>`;
    }

    html += `</div>`; // cv-day-grid
    html += `</div>`; // cv-day-column
  }

  html += `</div>`; // cv-week-container
  cont.innerHTML = html;

  // Now position events for each day
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const ds = day.toISOString().slice(0, 10);
    const dayAppts = byDate(ds);

    if (dayAppts.length > 0) {
      const gridEl = cont.querySelector(`.cv-day-grid[data-date="${ds}"]`);
      if (gridEl) {
        positionEvents(gridEl, dayAppts, hourStart, hourHeight);
      }
    }
  }
}

// Position events in a day grid with overlap handling
function positionEvents(gridEl, appts, hourStart, hourHeight) {
  if (!appts || appts.length === 0) return;

  // Parse time to minutes since midnight
  const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Convert appointments to positioned events
  const events = appts.map(a => {
    const startMins = timeToMinutes(a.start);
    const endMins = timeToMinutes(a.end);
    return {
      appt: a,
      start: startMins,
      end: endMins,
      column: 0,
      width: 1
    };
  });

  // Sort by start time, then by duration (longer first)
  events.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return (b.end - b.start) - (a.end - a.start);
  });

  // Column packing algorithm - assign lanes for overlapping events
  const columns = [];
  for (const event of events) {
    let placed = false;
    // Try to place in existing column
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const lastEvent = col[col.length - 1];
      if (lastEvent.end <= event.start) {
        // No overlap, can place here
        col.push(event);
        event.column = i;
        placed = true;
        break;
      }
    }
    // Create new column if needed
    if (!placed) {
      event.column = columns.length;
      columns.push([event]);
    }
  }

  const totalColumns = columns.length;

  // Create DOM elements for events
  events.forEach(event => {
    const a = event.appt;
    const top = ((event.start / 60) - hourStart) * hourHeight;
    const height = Math.max(((event.end - event.start) / 60) * hourHeight, 20);
    const left = (event.column / totalColumns) * 100;
    const width = (1 / totalColumns) * 100;

    const eventEl = document.createElement('div');
    eventEl.className = 'cv-event';
    
    // Get service color
    const srvColor = col(a.serviceId);
    const bgColor = hexToPastel(srvColor);
    
    eventEl.style.cssText = `
      top: ${top}px;
      height: ${height}px;
      left: ${left}%;
      width: ${width}%;
      background: ${bgColor};
      border-left-color: ${srvColor};
    `;

    const paid = a.paid ? "✅" : "💵";
    const conf = a.confirm ? "📲" : "⌛";

    eventEl.innerHTML = `
      <div class="cv-event-time">${a.start}-${a.end}</div>
      <div class="cv-event-title">${srvName(a.serviceId)}</div>
      <div class="cv-event-client">${cliName(a.clientId)}</div>
      <div class="cv-event-icons">${paid} ${conf}</div>
    `;

    // Add click handler to edit appointment
    eventEl.addEventListener('click', () => {
      editAppt(a);
    });

    gridEl.appendChild(eventEl);
  });
}

// Override original renderWeek
const originalRenderWeek = window.renderWeek;
window.renderWeek = renderWeekPositioned;

// TTS functionality for Babine
let ttsEnabled = false;
let currentUtterance = null;

function speakBabine(message) {
  if (!('speechSynthesis' in window)) {
    alert('La synthèse vocale n\'est pas disponible dans ce navigateur.');
    return;
  }

  // Stop any current speech
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = 'fr-FR';
  utterance.rate = 0.9;
  utterance.pitch = 1.1;

  const avatar = document.querySelector('.avatar-animated');
  const ttsBtn = document.getElementById('tts-btn');

  if (avatar) {
    avatar.classList.add('speaking');
  }
  if (ttsBtn) {
    ttsBtn.disabled = true;
    ttsBtn.textContent = '🗣️ Parle...';
  }

  utterance.onend = () => {
    if (avatar) {
      avatar.classList.remove('speaking');
    }
    if (ttsBtn) {
      ttsBtn.disabled = false;
      ttsBtn.innerHTML = '<span class="btn-tts-icon">🔊</span> Babine parle';
    }
  };

  utterance.onerror = () => {
    if (avatar) {
      avatar.classList.remove('speaking');
    }
    if (ttsBtn) {
      ttsBtn.disabled = false;
      ttsBtn.innerHTML = '<span class="btn-tts-icon">🔊</span> Babine parle';
    }
  };

  window.speechSynthesis.speak(utterance);
}

function getBabineMessage() {
  const d = datePicker.value || new Date().toISOString().slice(0, 10);
  const list = byDate(d);
  
  if (list.length === 0) {
    return `Bonjour! Vous n'avez aucun rendez-vous pour aujourd'hui. Profitez de votre journée!`;
  }

  const count = list.length;
  const plural = count > 1 ? 's' : '';
  let message = `Bonjour! Voici vos ${count} rendez-vous${plural} pour aujourd'hui. `;

  list.forEach((a, idx) => {
    const srv = srvName(a.serviceId);
    const cli = cliName(a.clientId);
    message += `${idx + 1}. ${a.start}, ${srv} avec ${cli}. `;
  });

  message += 'Bonne journée!';
  return message;
}

function activateTTS() {
  const message = getBabineMessage();
  speakBabine(message);
}

// Export function for use in HTML
window.activateTTS = activateTTS;
