// =============================================
// RESERVA — GUARDAR EN SUPABASE (SIN PAGO OBLIGATORIO)
// =============================================

(function () {
  'use strict';

  function initBooking() {
    const form = document.getElementById('reserva-form');
    if (!form) return;

    form.addEventListener('submit', handleBookingSubmit);
  }

  async function handleBookingSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const btn = form.querySelector('.btn-submit');
    const originalText = btn.textContent;

    // Validate all required fields
    const required = form.querySelectorAll('[required]');
    let allValid = true;
    required.forEach(field => {
      const group = field.closest('.form-group');
      if (!group) return;
      let valid = true;

      if (field.type === 'checkbox') {
        valid = field.checked;
      } else if (field.value.trim() === '') {
        valid = false;
      } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
        valid = false;
      } else if (field.type === 'tel' && field.value.trim().length < 6) {
        valid = false;
      }

      group.classList.toggle('has-error', !valid);
      if (!valid) allValid = false;
    });

    if (!allValid) {
      const firstError = form.querySelector('.has-error');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Collect data
    const modalidad = form.querySelector('#modalidad').value;
    const personas = parseInt(form.querySelector('#personas').value, 10) || 1;
    const importe = modalidad === 'manana' ? 12000 * personas : 35000 * personas;

    const reserva = {
      nombre: form.querySelector('#nombre').value.trim(),
      email: form.querySelector('#email').value.trim(),
      telefono: form.querySelector('#telefono').value.trim(),
      personas: personas,
      mensaje: form.querySelector('#mensaje')?.value.trim() || '',
      estado_pago: 'pendiente',
      importe_cents: importe,
      disponibilidad_id: form.dataset.disponibilidadId || null
    };

    // Show loading
    btn.textContent = 'Enviando reserva…';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    try {
      // Save via serverless function (uses service key, bypasses RLS)
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: reserva.nombre,
          email: reserva.email,
          telefono: reserva.telefono,
          modalidad: modalidad,
          fecha: form.querySelector('#fecha').value,
          personas: reserva.personas,
          mensaje: reserva.mensaje,
          disponibilidad_id: reserva.disponibilidad_id
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al guardar la reserva');
      }

      // Success — show confirmation
      showConfirmation(form, reserva);

    } catch (err) {
      console.error('Booking error:', err);
      btn.textContent = originalText;
      btn.disabled = false;
      btn.style.opacity = '';

      showToast(err.message || 'Error al enviar la reserva. Inténtalo de nuevo.', 'error');
    }
  }

  function showConfirmation(form, reserva) {
    const modalidad = form.querySelector('#modalidad').value;
    const fecha = form.querySelector('#fecha').value;
    const fechaFormatted = fecha
      ? new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
      : '';
    const modalidadLabel = modalidad === 'manana' ? 'Amanecer y pesca' : 'Demostración al atardecer';
    const importeTotal = modalidad === 'manana' ? reserva.personas * 120 : reserva.personas * 350;
    const importeText = modalidad === 'manana'
      ? `${reserva.personas} × 120 € = ${importeTotal} €`
      : `${reserva.personas} × 350 € = ${reserva.personas * 350} €`;

    // Replace form with confirmation
    const container = form.closest('.container');
    const formSection = container.querySelector('.reserva-form');

    formSection.innerHTML = `
      <div style="text-align: center; padding: 2rem 0;">
        <div style="width: 72px; height: 72px; border-radius: 50%; background: #2d8a56; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; animation: confirmPop 0.4s ease;">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h3 style="font-family: 'DM Serif Display', serif; font-size: 1.6rem; color: #1a2d40; margin-bottom: 0.5rem;">¡Reserva recibida!</h3>
        <p style="color: #3a4d5e; margin-bottom: 1.5rem; max-width: 480px; margin-left: auto; margin-right: auto; line-height: 1.5;">
          Hemos registrado tu solicitud. Nos pondremos en contacto contigo para confirmar la disponibilidad.
        </p>
        <div style="background: #f0ede6; border-radius: 12px; padding: 1.25rem 1.5rem; max-width: 420px; margin: 0 auto 1.5rem; text-align: left; border: 1px solid #d4c9b8;">
          <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #ccc3b3;">
            <span style="color: #5a6a78; font-size: 0.88rem; font-weight: 500;">Nombre</span>
            <span style="font-weight: 700; font-size: 0.88rem; color: #1a2d40;">${escapeHtml(reserva.nombre)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #ccc3b3;">
            <span style="color: #5a6a78; font-size: 0.88rem; font-weight: 500;">Modalidad</span>
            <span style="font-weight: 700; font-size: 0.88rem; color: #1a2d40;">${modalidadLabel}</span>
          </div>
          ${fechaFormatted ? `<div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #ccc3b3;">
            <span style="color: #5a6a78; font-size: 0.88rem; font-weight: 500;">Fecha</span>
            <span style="font-weight: 700; font-size: 0.88rem; color: #1a2d40; text-transform: capitalize;">${fechaFormatted}</span>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #ccc3b3;">
            <span style="color: #5a6a78; font-size: 0.88rem; font-weight: 500;">Personas</span>
            <span style="font-weight: 700; font-size: 0.88rem; color: #1a2d40;">${reserva.personas}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 0.5rem 0;">
            <span style="color: #5a6a78; font-size: 0.88rem; font-weight: 500;">Importe</span>
            <span style="font-weight: 800; font-size: 1rem; color: #c97b3a;">${importeText}</span>
          </div>
        </div>
        <p style="font-size: 0.85rem; color: #5a6a78; margin-bottom: 1.5rem; line-height: 1.4;">
          Puedes pagar ahora online o el mismo día de la salida.
        </p>
        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
          <a href="/api/payment/init?amount=${importeTotal * 100}&order=PES${Date.now().toString().slice(-8)}" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; padding: 0.85rem 2rem; font-weight: 600;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Pagar ahora
          </a>
          <a href="#modalidades" class="btn" style="display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; padding: 0.85rem 2rem; font-weight: 600; background: transparent; color: #1a2d40; border: 2px solid #d4c9b8;">
            Volver al inicio
          </a>
        </div>
      </div>
      <style>
        @keyframes confirmPop {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
      </style>
    `;

    // Scroll to confirmation
    formSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showToast(message, type) {
    const existing = document.querySelector('.booking-toast');
    if (existing) existing.remove();

    const bg = type === 'error' ? '#c0392b' : '#2d8a56';
    const toast = document.createElement('div');
    toast.className = 'booking-toast';
    toast.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>${message}</span>
    `;
    toast.style.cssText = `
      position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
      background: ${bg}; color: #fff; padding: 1rem 1.5rem;
      border-radius: 12px; display: flex; align-items: center; gap: 0.75rem;
      font-size: 0.9rem; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      z-index: 9999; max-width: 90vw; animation: toastIn 0.3s ease;
    `;
    if (!document.querySelector('#toast-style')) {
      const style = document.createElement('style');
      style.id = 'toast-style';
      style.textContent = '@keyframes toastIn { from { opacity:0; transform: translateX(-50%) translateY(10px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }';
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBooking);
  } else {
    initBooking();
  }
})();
