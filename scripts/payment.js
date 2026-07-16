// =============================================
// PAYMENT FLOW — BOOKING FORM → REDSYS
// =============================================

(function () {
  'use strict';

  function initPayment() {
    const form = document.getElementById('reserva-form');
    if (!form) return;

    // Override default form submit to route through Redsys
    form.addEventListener('submit', handleBookingSubmit);
  }

  async function handleBookingSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const btn = form.querySelector('.btn-submit');
    const originalText = btn.textContent;

    // Validate all required fields first (re-use existing validation)
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
    const data = {
      nombre: form.querySelector('#nombre').value.trim(),
      email: form.querySelector('#email').value.trim(),
      telefono: form.querySelector('#telefono').value.trim(),
      modalidad: form.querySelector('#modalidad').value,
      fecha: form.querySelector('#fecha').value,
      personas: parseInt(form.querySelector('#personas').value, 10) || 1,
      mensaje: form.querySelector('#mensaje').value.trim(),
      disponibilidad_id: form.dataset.disponibilidadId || null
    };

    // Show loading
    btn.textContent = 'Procesando…';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    try {
      const res = await fetch('/api/payment/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al procesar la reserva');
      }

      const result = await res.json();

      // Create hidden form and auto-submit to Redsys
      redirectToRedsys(result);

    } catch (err) {
      console.error('Payment init error:', err);
      btn.textContent = originalText;
      btn.disabled = false;
      btn.style.opacity = '';
      
      showPaymentError(err.message || 'Error al conectar con la pasarela de pago. Inténtalo de nuevo.');
    }
  }

  function redirectToRedsys(data) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = data.url;
    form.style.display = 'none';

    const fields = {
      'Ds_SignatureVersion': data.Ds_SignatureVersion,
      'Ds_MerchantParameters': data.Ds_MerchantParameters,
      'Ds_Signature': data.Ds_Signature
    };

    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  }

  function showPaymentError(message) {
    // Remove existing error if any
    const existing = document.querySelector('.payment-error-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'payment-error-toast';
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>${message}</span>
    `;
    toast.style.cssText = `
      position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
      background: #c0392b; color: #fff; padding: 1rem 1.5rem;
      border-radius: 12px; display: flex; align-items: center; gap: 0.75rem;
      font-size: 0.9rem; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      z-index: 9999; max-width: 90vw; animation: toastIn 0.3s ease;
    `;
    const style = document.createElement('style');
    style.textContent = '@keyframes toastIn { from { opacity:0; transform: translateX(-50%) translateY(10px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }';
    document.head.appendChild(style);

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPayment);
  } else {
    initPayment();
  }
})();
