// Calendar View - Enhanced Week View with Time-based Positioning
(function() {
  'use strict';
  
  // Save original renderWeek if it exists
  const originalRenderWeek = window.renderWeek;
  
  // Override renderWeek with time-based positioning
  window.renderWeek = function() {
    const cont = document.getElementById('view-week');
    const current = new Date(datePicker.value);
    const start = new Date(current);
    start.setDate(current.getDate() - ((current.getDay() + 6) % 7)); // Monday
    
    const hourStart = 8;
    const hourEnd = 20;
    const hourHeight = 60; // pixels per hour
    
    // Build header
    let html = `<h3>🗓️ Semaine du ${start.toISOString().slice(0,10)}</h3>`;
    html += `<div class="calendar-week-grid">`;
    
    // Hour labels column
    for (let h = hourStart; h < hourEnd; h++) {
      html += `<div class="calendar-hour-label">${String(h).padStart(2,'0')}:00</div>`;
    }
    
    // Day columns
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const ds = day.toISOString().slice(0,10);
      const dayName = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"][i];
      
      html += `<div class="calendar-day-column" data-date="${ds}">`;
      html += `<div class="calendar-day-header">${dayName}<br>${ds}</div>`;
      
      // Add hour lines
      for (let h = hourStart; h <= hourEnd; h++) {
        const top = (h - hourStart) * hourHeight;
        html += `<div class="calendar-hour-line" style="top:${top}px"></div>`;
      }
      
      html += `</div>`;
    }
    
    html += `</div>`;
    cont.innerHTML = html;
    
    // Now position events
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const ds = day.toISOString().slice(0,10);
      const dayCol = cont.querySelector(`.calendar-day-column[data-date="${ds}"]`);
      
      if (!dayCol) continue;
      
      const dayAppts = byDate(ds);
      
      // Detect overlaps and position events
      const positioned = detectOverlaps(dayAppts);
      
      for (const item of positioned) {
        const eventEl = createEventElement(item.appt, item.top, item.height, item.column, item.totalColumns);
        dayCol.appendChild(eventEl);
      }
    }
  };
  
  // Convert time string (HH:MM) to minutes since midnight
  function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }
  
  // Detect overlapping appointments and assign columns
  function detectOverlaps(appts) {
    if (appts.length === 0) return [];
    
    const hourStart = 8;
    const hourHeight = 60;
    
    // Sort by start time
    const sorted = [...appts].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
    
    const positioned = [];
    const columns = []; // Track end times of events in each column
    
    for (const appt of sorted) {
      const startMin = timeToMinutes(appt.start);
      const endMin = timeToMinutes(appt.end);
      
      // Find a column where this event doesn't overlap
      let columnIndex = 0;
      while (columnIndex < columns.length && columns[columnIndex] > startMin) {
        columnIndex++;
      }
      
      // If we need a new column
      if (columnIndex >= columns.length) {
        columns.push(endMin);
      } else {
        columns[columnIndex] = endMin;
      }
      
      // Calculate position
      const top = ((startMin / 60) - hourStart) * hourHeight;
      const duration = (endMin - startMin) / 60; // hours
      const height = duration * hourHeight;
      
      positioned.push({
        appt,
        top: Math.max(0, top),
        height: Math.max(20, height - 2), // minimum height
        column: columnIndex,
        totalColumns: columns.length
      });
    }
    
    return positioned;
  }
  
  // Create event DOM element
  function createEventElement(appt, top, height, column, totalColumns) {
    const div = document.createElement('div');
    div.className = 'calendar-event';
    
    // Apply overlap classes
    if (totalColumns > 1) {
      div.classList.add(`overlap-${totalColumns}`);
      if (column > 0) {
        div.classList.add(`overlap-offset-${column}`);
      }
    }
    
    // Position
    div.style.top = `${top}px`;
    div.style.height = `${height}px`;
    
    // Color
    const color = col(appt.serviceId);
    div.style.background = hexToPastel(color);
    div.style.borderLeftColor = color;
    
    // Content
    const time = `${appt.start}-${appt.end}`;
    const service = srvName(appt.serviceId);
    const client = cliName(appt.clientId);
    const paid = appt.paid ? "✅" : "💵";
    const conf = appt.confirm ? "📲" : "⌛";
    
    div.innerHTML = `
      <div class="calendar-event-time">${time}</div>
      <div class="calendar-event-title">${service}</div>
      <div class="calendar-event-client">${client}</div>
      <div class="calendar-event-pills">
        <span class="calendar-event-pill">${paid}</span>
        <span class="calendar-event-pill">${conf}</span>
      </div>
    `;
    
    // Click handler to edit
    div.onclick = function(e) {
      e.stopPropagation();
      editAppt(findAppt(appt.id));
    };
    
    return div;
  }
  
  // Initialize Babine avatar animation
  function initBabineAvatar() {
    const avatar = document.querySelector('.avatar');
    if (avatar && !avatar.classList.contains('animated')) {
      avatar.classList.add('animated');
    }
  }
  
  // Initialize TTS functionality
  function initTTS() {
    // Check if TTS button already exists
    if (document.getElementById('tts-button')) return;
    
    const header = document.querySelector('header .bar');
    if (!header) return;
    
    const ttsBtn = document.createElement('button');
    ttsBtn.id = 'tts-button';
    ttsBtn.className = 'tts-button';
    ttsBtn.innerHTML = '🔊';
    ttsBtn.title = 'Babine parle';
    ttsBtn.onclick = speakBabine;
    
    // Insert before other buttons
    header.insertBefore(ttsBtn, header.firstChild);
  }
  
  // Text-to-Speech function
  function speakBabine() {
    if (!('speechSynthesis' in window)) {
      alert('Désolée, ton navigateur ne supporte pas la synthèse vocale.');
      return;
    }
    
    const avatar = document.querySelector('.avatar');
    const ttsBtn = document.getElementById('tts-button');
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Get current view and context
    const d = datePicker.value || new Date().toISOString().slice(0,10);
    const list = byDate(d);
    const total = list.length;
    
    let message = '';
    if (total === 0) {
      message = `Bonjour! Tu n'as aucun rendez-vous aujourd'hui. Profite de ta journée!`;
    } else if (total === 1) {
      message = `Bonjour! Tu as ${total} rendez-vous aujourd'hui.`;
    } else {
      message = `Bonjour! Tu as ${total} rendez-vous aujourd'hui. Bonne journée!`;
    }
    
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    
    // Add speaking animations
    utterance.onstart = function() {
      if (avatar) {
        avatar.classList.remove('animated');
        avatar.classList.add('speaking');
      }
      if (ttsBtn) {
        ttsBtn.classList.add('speaking');
      }
    };
    
    utterance.onend = function() {
      if (avatar) {
        avatar.classList.remove('speaking');
        avatar.classList.add('animated');
      }
      if (ttsBtn) {
        ttsBtn.classList.remove('speaking');
      }
    };
    
    utterance.onerror = function() {
      if (avatar) {
        avatar.classList.remove('speaking');
        avatar.classList.add('animated');
      }
      if (ttsBtn) {
        ttsBtn.classList.remove('speaking');
      }
    };
    
    window.speechSynthesis.speak(utterance);
  }
  
  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initBabineAvatar();
      initTTS();
    });
  } else {
    initBabineAvatar();
    initTTS();
  }
  
  // Make speakBabine available globally
  window.speakBabine = speakBabine;
  
})();
