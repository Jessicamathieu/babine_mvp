// Calendar View - Positioned Week View Implementation
// This script overrides the renderWeek() function with a time-grid positioned layout

(function() {
  'use strict';
  
  // Configuration from CSS variables
  const HOUR_START = 8;
  const HOUR_END = 20;
  const HOUR_HEIGHT = 60; // pixels per hour
  
  /**
   * Convert time string (HH:MM) to minutes from start of day
   */
  function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }
  
  /**
   * Calculate top position in pixels for an event
   */
  function calculateTop(startTime) {
    const startMinutes = timeToMinutes(startTime);
    const offsetMinutes = startMinutes - (HOUR_START * 60);
    return (offsetMinutes / 60) * HOUR_HEIGHT;
  }
  
  /**
   * Calculate height in pixels for an event
   */
  function calculateHeight(startTime, endTime) {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const durationMinutes = endMinutes - startMinutes;
    return Math.max((durationMinutes / 60) * HOUR_HEIGHT, 24); // minimum 24px
  }
  
  /**
   * Create event element with positioning
   */
  function createEventElement(appt) {
    if (!appt || !appt.start || !appt.end) return '';
    
    const top = calculateTop(appt.start);
    const height = calculateHeight(appt.start, appt.end);
    
    // Get service color - use global functions if available
    const serviceColor = (typeof col === 'function') ? col(appt.serviceId) : '#ddd';
    const serviceName = (typeof srvName === 'function') ? srvName(appt.serviceId) : 'Service';
    const clientName = (typeof cliName === 'function') ? cliName(appt.clientId) : 'Client';
    const bgColor = (typeof hexToPastel === 'function') ? hexToPastel(serviceColor) : '#eef4ff';
    
    // Check for paid/confirmed status
    const paid = appt.paid ? "✅" : "💵";
    const conf = appt.confirm ? "📲" : "⌛";
    
    return `<div class="cv-event" 
      style="top: ${top}px; height: ${height}px; background: ${bgColor}; border-left-color: ${serviceColor}"
      onclick="editAppt(findAppt('${appt.id}'))">
      <div class="cv-event-time">${appt.start}-${appt.end}</div>
      <div class="cv-event-service">${serviceName}</div>
      <div class="cv-event-client">${clientName} ${paid} ${conf}</div>
    </div>`;
  }
  
  /**
   * Create hour lines for background grid
   */
  function createHourLines() {
    let html = '';
    for (let h = HOUR_START; h < HOUR_END; h++) {
      const top = (h - HOUR_START) * HOUR_HEIGHT;
      html += `<div class="cv-hour-line" style="top: ${top}px"></div>`;
    }
    return html;
  }
  
  /**
   * Override the global renderWeek function with positioned layout
   */
  window.renderWeek = function() {
    const cont = document.getElementById('view-week');
    if (!cont) return;
    
    // Get current date and calculate Monday start
    const datePicker = document.getElementById('datePicker');
    const current = new Date(datePicker?.value || new Date());
    const start = new Date(current);
    start.setDate(current.getDate() - ((current.getDay() + 6) % 7)); // Monday
    
    // Build header
    let html = `<h3>🗓️ Semaine du ${start.toISOString().slice(0,10)}</h3>`;
    html += `<div class="cv-week-container">`;
    
    // Time column (left side)
    html += `<div class="cv-time-column">`;
    html += `<div style="height: 44px"></div>`; // space for day headers
    for (let h = HOUR_START; h < HOUR_END; h++) {
      html += `<div class="cv-time-slot">${String(h).padStart(2, '0')}:00</div>`;
    }
    html += `</div>`;
    
    // Day columns (Monday to Sunday)
    const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const dateStr = day.toISOString().slice(0, 10);
      
      html += `<div class="cv-day-column">`;
      html += `<div class="cv-day-header">${dayNames[i]}<br><span style="font-weight:400;font-size:11px">${dateStr}</span></div>`;
      
      // Add hour lines
      html += createHourLines();
      
      // Get appointments for this day
      const dayAppts = (typeof byDate === 'function') ? byDate(dateStr) : [];
      
      // Add positioned events
      for (const appt of dayAppts) {
        html += createEventElement(appt);
      }
      
      html += `</div>`;
    }
    
    html += `</div>`;
    cont.innerHTML = html;
  };
  
  // Auto-render if week view is already visible
  if (typeof render === 'function') {
    const weekView = document.getElementById('view-week');
    if (weekView && weekView.style.display !== 'none') {
      window.renderWeek();
    }
  }
  
})();
