/* Calendar Week View - Positioned events with overlap detection */

// Override the default renderWeek function
(function() {
  'use strict';

  // Store original renderWeek if we need to fallback
  const originalRenderWeek = window.renderWeek;

  /**
   * Parse time string "HH:MM" to minutes from midnight
   */
  function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  /**
   * Calculate top position for an event based on start time
   */
  function getEventTop(startTime, hourStart) {
    const minutes = timeToMinutes(startTime);
    const startMinutes = hourStart * 60;
    const relativeMinutes = minutes - startMinutes;
    const hourHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cv-hour-height')) || 60;
    return (relativeMinutes / 60) * hourHeight;
  }

  /**
   * Calculate height for an event based on duration
   */
  function getEventHeight(startTime, endTime) {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const duration = endMinutes - startMinutes;
    const hourHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cv-hour-height')) || 60;
    return Math.max((duration / 60) * hourHeight, 30); // Minimum 30px height
  }

  /**
   * Check if two events overlap
   */
  function eventsOverlap(event1, event2) {
    const start1 = timeToMinutes(event1.start);
    const end1 = timeToMinutes(event1.end);
    const start2 = timeToMinutes(event2.start);
    const end2 = timeToMinutes(event2.end);
    return start1 < end2 && start2 < end1;
  }

  /**
   * Group overlapping events into columns
   */
  function layoutOverlappingEvents(events) {
    if (events.length === 0) return [];
    
    // Sort events by start time, then by duration (longer first)
    const sorted = [...events].sort((a, b) => {
      const cmp = a.start.localeCompare(b.start);
      if (cmp !== 0) return cmp;
      // If same start time, longer events first
      const durA = timeToMinutes(a.end) - timeToMinutes(a.start);
      const durB = timeToMinutes(b.end) - timeToMinutes(b.start);
      return durB - durA;
    });

    // Find overlapping groups
    const columns = [];
    for (const event of sorted) {
      let placed = false;
      // Try to place in existing columns
      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];
        const overlaps = column.some(e => eventsOverlap(event, e));
        if (!overlaps) {
          column.push(event);
          event._column = i;
          placed = true;
          break;
        }
      }
      // Create new column if needed
      if (!placed) {
        event._column = columns.length;
        columns.push([event]);
      }
    }

    // Assign column count to each event
    const maxColumns = columns.length;
    sorted.forEach(event => {
      event._totalColumns = maxColumns;
    });

    return sorted;
  }

  /**
   * Render a positioned event
   */
  function renderPositionedEvent(event, hourStart) {
    const top = getEventTop(event.start, hourStart);
    const height = getEventHeight(event.start, event.end);
    
    // Calculate width and left position for overlapping events
    let leftPercent = 0;
    let widthPercent = 100;
    if (event._totalColumns > 1) {
      widthPercent = 100 / event._totalColumns;
      leftPercent = widthPercent * event._column;
    }

    const serviceColor = window.col(event.serviceId);
    const backgroundColor = window.hexToPastel(serviceColor);
    const paid = event.paid ? "✅" : "💵";
    const conf = event.confirm ? "📲" : "⌛";

    const style = `
      top: ${top}px;
      height: ${height}px;
      left: calc(${leftPercent}% + 4px);
      width: calc(${widthPercent}% - 8px);
      background: ${backgroundColor};
      border-left-color: ${serviceColor};
    `;

    const overlappingClass = event._totalColumns > 1 ? 'overlapping' : '';

    return `
      <div class="calendar-event ${overlappingClass}" style="${style}" 
           onclick="editAppt(findAppt('${event.id}'))" 
           title="${window.srvName(event.serviceId)} - ${window.cliName(event.clientId)}">
        <div class="calendar-event-time">${event.start}</div>
        <div class="calendar-event-title">${window.srvName(event.serviceId)}</div>
        <div class="calendar-event-client">${window.cliName(event.clientId)}</div>
        <div class="calendar-event-badges">${paid} ${conf}</div>
      </div>
    `;
  }

  /**
   * New positioned week view renderer
   */
  window.renderWeek = function() {
    const cont = document.getElementById('view-week');
    const current = new Date(window.datePicker.value);
    const start = new Date(current);
    start.setDate(current.getDate() - ((current.getDay() + 6) % 7)); // Monday

    const hourStart = 8;
    const hourEnd = 20;

    // Update CSS variables
    document.documentElement.style.setProperty('--cv-hour-start', hourStart);
    document.documentElement.style.setProperty('--cv-hour-end', hourEnd);

    // Add positioned class to container
    cont.classList.add('positioned');

    let html = `<h3>🗓️ Semaine du ${start.toISOString().slice(0, 10)}</h3>`;
    html += `<div class="calendar-grid">`;

    // Hour labels column
    html += `<div class="calendar-hour-labels">`;
    html += `<div class="calendar-day-header" style="border-bottom: 2px solid transparent;">&nbsp;</div>`;
    for (let h = hourStart; h < hourEnd; h++) {
      html += `<div class="calendar-hour-label">${String(h).padStart(2, '0')}:00</div>`;
    }
    html += `</div>`;

    // Day columns
    const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const ds = day.toISOString().slice(0, 10);
      
      // Get events for this day
      const dayEvents = window.byDate(ds);
      const layoutEvents = layoutOverlappingEvents(dayEvents);

      html += `<div class="calendar-day-column">`;
      html += `<div class="calendar-day-header">${dayNames[i]}<br>${day.getDate()}</div>`;
      
      // Hour grid lines
      html += `<div class="calendar-hour-grid">`;
      for (let h = hourStart; h < hourEnd; h++) {
        const top = (h - hourStart) * 60;
        html += `<div class="calendar-hour-line" style="top: ${top}px;"></div>`;
      }
      html += `</div>`;
      
      // Positioned events
      for (const event of layoutEvents) {
        html += renderPositionedEvent(event, hourStart);
      }
      
      html += `</div>`;
    }

    html += `</div>`;
    cont.innerHTML = html;
  };

  // TTS functionality for Babine avatar
  window.babineSpeak = function(text) {
    if (!('speechSynthesis' in window)) {
      alert('Désolée, votre navigateur ne supporte pas la synthèse vocale.');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    
    const avatar = document.querySelector('.avatar-babine');
    const button = document.querySelector('.tts-button');
    
    if (avatar) avatar.classList.add('speaking');
    if (button) button.classList.add('speaking');
    
    utterance.onend = function() {
      if (avatar) avatar.classList.remove('speaking');
      if (button) button.classList.remove('speaking');
    };
    
    utterance.onerror = function() {
      if (avatar) avatar.classList.remove('speaking');
      if (button) button.classList.remove('speaking');
    };
    
    window.speechSynthesis.speak(utterance);
  };

  // Default greeting for TTS button
  window.babineGreet = function() {
    const date = window.datePicker.value || new Date().toISOString().slice(0, 10);
    const appointments = window.byDate(date);
    const count = appointments.length;
    
    let message = `Bonjour! Aujourd'hui, vous avez ${count} rendez-vous. `;
    if (count > 0) {
      message += `Le premier est à ${appointments[0].start}. `;
    }
    message += `Passez une excellente journée!`;
    
    window.babineSpeak(message);
  };

})();
