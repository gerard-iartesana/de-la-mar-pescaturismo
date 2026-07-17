// =============================================
// BOOKING LOOKUP FRONTEND HANDLER
// =============================================

(function () {
  'use strict';

  function initLookup() {
    // Buttons to open modal
    const openBtn = document.getElementById('open-lookup-btn');
    const mobileOpenBtn = document.getElementById('mobile-open-lookup-btn');
    const modal = document.getElementById('lookup-modal');
    const closeBtn = document.getElementById('lookup-modal-close');
    const form = document.getElementById('lookup-form');
    const resultDiv = document.getElementById('lookup-result');

    if (!modal) return;

    const openModal = (e) => {
      if (e) e.preventDefault();
      modal.style.display = 'flex';
      // Force reflow for opacity transition
      modal.offsetHeight;
      modal.classList.add('active');
      document.body.style.overflow = 'hidden'; // Lock background scroll
    };

    const closeModal = () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      setTimeout(() => {
        modal.style.display = 'none';
        // Reset form and result
        if (form) form.reset();
        if (resultDiv) {
          resultDiv.innerHTML = '';
          resultDiv.style.display = 'none';
        }
      }, 300);
    };

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (mobileOpenBtn) mobileOpenBtn.addEventListener('click', (e) => {
      openModal(e);
      // Close mobile menu if open
      const mobileNav = document.querySelector('.mobile-nav');
      const hamburger = document.querySelector('.hamburger');
      if (mobileNav) mobileNav.classList.remove('active');
      if (hamburger) hamburger.classList.remove('active');
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const order = document.getElementById('lookup-order').value.trim();
        const email = document.getElementById('lookup-email').value.trim();

        if (!order || !email) return;

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Buscando reserva…';
        resultDiv.style.display = 'none';
        resultDiv.innerHTML = '';

        try {
          const res = await fetch('/api/booking-lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order, email })
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'No se pudo encontrar la reserva');
          }

          const { reserva } = await res.json();
          renderResult(reserva);
        } catch (err) {
          console.error(err);
          resultDiv.innerHTML = `
            <div style="background: rgba(192,57,43,0.08); border: 1px solid #c0392b; border-radius: 8px; padding: 1rem; color: #c0392b; font-size: 0.9rem; margin-top: 1rem; text-align: center;">
              <strong>Error:</strong> ${err.message}
            </div>
          `;
          resultDiv.style.display = 'block';
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      });
    }

    function renderResult(r) {
      const fechaFormatted = r.fecha
        ? new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
        : 'Pendiente de confirmación';
      
      const modLabel = r.modalidad === 'manana' ? 'Amanecer y pesca (Mañana)' : 'Demostración al atardecer (Tarde)';
      const totalEur = (r.importe_cents / 100).toFixed(2);

      let estadoLabel = 'Pendiente de pago';
      let estadoColor = '#e88b2e'; // orange
      if (r.estado_pago === 'pagado') {
        estadoLabel = 'Pagada';
        estadoColor = '#2d8a56'; // green
      } else if (r.estado_pago === 'reembolsado') {
        estadoLabel = 'Reembolsada';
        estadoColor = '#5a6a78'; // grey
      } else if (r.estado_pago === 'error') {
        estadoLabel = 'Error en pago';
        estadoColor = '#c0392b'; // red
      }

      let payButtonHtml = '';
      if (r.estado_pago === 'pendiente') {
        payButtonHtml = `
          <div style="text-align: center; margin-top: 1.25rem;">
            <a href="/api/payment/init?amount=${r.importe_cents}&order=${r.localizador}" class="btn btn-primary btn-block" style="display: block; text-decoration: none; padding: 0.85rem; font-weight: 600; text-align: center;">
              Pagar ahora online (${totalEur} €)
            </a>
          </div>
        `;
      }

      resultDiv.innerHTML = `
        <h4 style="font-family: 'DM Serif Display', serif; font-size: 1.3rem; color: #1a2d40; margin: 1.5rem 0 0.5rem;">Detalles de la Reserva</h4>
        <div class="lookup-result-card">
          <div class="lookup-result-row">
            <span class="lookup-result-label">Localizador</span>
            <span class="lookup-result-val" style="color:#c97b3a;">${r.localizador}</span>
          </div>
          <div class="lookup-result-row">
            <span class="lookup-result-label">Cliente</span>
            <span class="lookup-result-val">${escapeHtml(r.nombre)}</span>
          </div>
          <div class="lookup-result-row">
            <span class="lookup-result-label">Modalidad</span>
            <span class="lookup-result-val">${modLabel}</span>
          </div>
          <div class="lookup-result-row">
            <span class="lookup-result-label">Fecha</span>
            <span class="lookup-result-val" style="text-transform: capitalize;">${fechaFormatted}</span>
          </div>
          <div class="lookup-result-row">
            <span class="lookup-result-label">Personas</span>
            <span class="lookup-result-val">${r.personas}</span>
          </div>
          <div class="lookup-result-row">
            <span class="lookup-result-label">Importe</span>
            <span class="lookup-result-val">${totalEur} €</span>
          </div>
          <div class="lookup-result-row">
            <span class="lookup-result-label">Estado Pago</span>
            <span class="lookup-result-val" style="color: ${estadoColor}; font-weight: 800;">${estadoLabel}</span>
          </div>
        </div>
        ${payButtonHtml}
      `;
      resultDiv.style.display = 'block';
    }

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLookup);
  } else {
    initLookup();
  }
})();
