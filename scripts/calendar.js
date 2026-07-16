// =============================================
// CALENDARIO DE DISPONIBILIDAD — PÚBLICO
// =============================================

(function () {
  'use strict';

  const SUPABASE_URL = 'https://dazootyjaeqhgccpnbta.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhem9vdHlqYWVxaGdjY3BuYnRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMjc3OTgsImV4cCI6MjA5OTgwMzc5OH0.50mHio1P3arZxXQ-k05LSkvFNyBsRcMNiTVHFjLdGhw';

  const MONTHS_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const WEEKDAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  let currentYear, currentMonth;
  let slotsCache = {};
  let selectedDate = null;

  // --- Init ---
  function init() {
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
    
    bindNavigation();
    renderCalendar();
    loadSlots();
  }

  // --- Navigation ---
  function bindNavigation() {
    const prevBtn = document.getElementById('cal-prev');
    const nextBtn = document.getElementById('cal-next');
    if (prevBtn) prevBtn.addEventListener('click', () => changeMonth(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changeMonth(1));
  }

  function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
    loadSlots();
  }

  // --- Fetch slots from Supabase ---
  async function loadSlots() {
    const key = `${currentYear}-${currentMonth}`;
    if (slotsCache[key]) {
      applySlots(slotsCache[key]);
      return;
    }

    const firstDay = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const lastDayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/disponibilidad?fecha=gte.${firstDay}&fecha=lte.${lastDayStr}&select=*`,
        {
          headers: {
            'apikey': SUPABASE_ANON,
            'Authorization': `Bearer ${SUPABASE_ANON}`
          }
        }
      );

      if (!res.ok) throw new Error('Error fetching');
      const data = await res.json();

      // Group by date
      const grouped = {};
      data.forEach(slot => {
        if (!grouped[slot.fecha]) grouped[slot.fecha] = [];
        grouped[slot.fecha].push(slot);
      });

      slotsCache[key] = grouped;
      applySlots(grouped);
    } catch (err) {
      console.error('Calendar: error loading slots', err);
      applySlots({});
    }
  }

  // --- Render calendar grid ---
  function renderCalendar() {
    const titleEl = document.getElementById('cal-title');
    const daysEl = document.getElementById('cal-days');
    const detailEl = document.getElementById('cal-detail');
    
    if (!titleEl || !daysEl) return;

    titleEl.textContent = `${MONTHS_ES[currentMonth]} ${currentYear}`;
    if (detailEl) detailEl.classList.remove('visible');
    selectedDate = null;

    // First day of month (adjust for Monday start)
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = '';

    // Empty cells before first day
    for (let i = 0; i < startOffset; i++) {
      html += '<div class="cal-day empty"></div>';
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isPast = dateObj < today;
      const isToday = dateObj.getTime() === today.getTime();

      let classes = 'cal-day';
      if (isPast) classes += ' past';
      if (isToday) classes += ' today';

      html += `<div class="${classes}" data-date="${dateStr}">
        <span class="cal-day-num">${d}</span>
        <div class="cal-day-dots" id="dots-${dateStr}"></div>
      </div>`;
    }

    daysEl.innerHTML = html;

    // Apply cached slots if available
    const key = `${currentYear}-${currentMonth}`;
    if (slotsCache[key]) applySlots(slotsCache[key]);
  }

  // --- Apply slot data to calendar ---
  function applySlots(grouped) {
    // Reset all day states
    document.querySelectorAll('.cal-day[data-date]').forEach(el => {
      el.classList.remove('has-slots');
      el.onclick = null;
    });

    Object.entries(grouped).forEach(([dateStr, slots]) => {
      const dayEl = document.querySelector(`.cal-day[data-date="${dateStr}"]`);
      const dotsEl = document.getElementById(`dots-${dateStr}`);
      if (!dayEl || !dotsEl) return;

      if (dayEl.classList.contains('past')) return;

      let dotsHtml = '';
      let hasAvailable = false;

      let totalReservas = 0;
      slots.forEach(slot => {
        if (slot.estado === 'cancelado') return;
        totalReservas += slot.plazas_reservadas || 0;
        hasAvailable = true;
      });

      let dotClass = 'available'; // default green
      if (totalReservas >= 3) {
        dotClass = 'reservas-3';
      } else if (totalReservas === 2) {
        dotClass = 'reservas-2';
      } else if (totalReservas === 1) {
        dotClass = 'reservas-1';
      }

      if (hasAvailable) {
        dotsHtml = `<span class="cal-dot ${dotClass}"></span>`;
      }

      dotsEl.innerHTML = dotsHtml;

      if (hasAvailable) {
        dayEl.classList.add('has-slots');
        dayEl.addEventListener('click', () => selectDate(dateStr, slots));
      }
    });
  }

  // --- Select a date ---
  function selectDate(dateStr, slots) {
    // Update selected state
    document.querySelectorAll('.cal-day.selected').forEach(el => el.classList.remove('selected'));
    const dayEl = document.querySelector(`.cal-day[data-date="${dateStr}"]`);
    if (dayEl) dayEl.classList.add('selected');

    selectedDate = dateStr;

    // Show detail panel
    const detailEl = document.getElementById('cal-detail');
    if (!detailEl) return;

    const dateObj = new Date(dateStr + 'T00:00:00');
    const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    let slotsHtml = '';
    slots.forEach(slot => {
      if (slot.estado === 'cancelado') return;

      const remaining = slot.plazas_totales - slot.plazas_reservadas;
      const isMorning = slot.modalidad === 'manana';
      const isAvailable = slot.estado === 'disponible' && remaining > 0;

      const label = isMorning ? 'Amanecer y pesca' : 'Demostración';
      const time = isMorning ? '5:00 h' : '16:30 h';
      const price = isMorning ? '120 €/persona' : '350 €/barco';
      const dotClass = isMorning ? 'morning' : 'evening';
      const plazasText = isAvailable
        ? `${remaining} plaza${remaining !== 1 ? 's' : ''} disponible${remaining !== 1 ? 's' : ''}`
        : 'Completo';

      slotsHtml += `
        <div class="cal-slot ${isAvailable ? '' : 'unavailable'}" 
             ${isAvailable ? `onclick="window.calSelectSlot('${dateStr}', '${slot.modalidad}', '${slot.id}')"` : ''}>
          <div class="cal-slot-label">
            <span class="cal-dot ${dotClass}"></span>
            ${label} — ${time}
          </div>
          <div class="cal-slot-info">${plazasText}</div>
          <div class="cal-slot-price">${price}</div>
        </div>
      `;
    });

    detailEl.innerHTML = `
      <h4>${dayName}</h4>
      <div class="cal-detail-slots">${slotsHtml}</div>
    `;
    detailEl.classList.add('visible');
    detailEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // --- Global: select a slot and fill the booking form ---
  window.calSelectSlot = function (dateStr, modalidad, disponibilidadId) {
    // Fill the form
    const fechaInput = document.getElementById('fecha');
    const modalidadSelect = document.getElementById('modalidad');
    
    if (fechaInput) fechaInput.value = dateStr;
    if (modalidadSelect) modalidadSelect.value = modalidad;

    // Store disponibilidad ID for payment
    const form = document.getElementById('reserva-form');
    if (form) {
      form.dataset.disponibilidadId = disponibilidadId;
    }

    // Scroll to form
    const reservaSection = document.getElementById('reserva');
    if (reservaSection) {
      reservaSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // --- Boot ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
