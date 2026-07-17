// =============================================
// BOOKING LOOKUP FRONTEND HANDLER — INLINE TABS
// =============================================

(function () {
  'use strict';

  function initLookup() {
    // Tabs elements
    const tabNew = document.getElementById('tab-new-booking');
    const tabLookup = document.getElementById('tab-lookup-booking');
    
    // Forms containers
    const newForm = document.getElementById('reserva-form');
    const lookupContainer = document.getElementById('lookup-inline-container');
    
    // Form and Results elements
    const form = document.getElementById('lookup-form');
    const resultDiv = document.getElementById('lookup-result');

    // Trigger links
    const openBtn = document.getElementById('open-lookup-btn');
    const mobileOpenBtn = document.getElementById('mobile-open-lookup-btn');
    const bodyBtn = document.getElementById('body-lookup-btn');

    if (!tabNew || !tabLookup) return;

    // --- Tab Toggle Functions ---
    const activateNewBooking = () => {
      tabNew.classList.add('active');
      tabNew.style.color = 'var(--azul-texto)';
      tabNew.style.borderBottomColor = 'var(--acento)';

      tabLookup.classList.remove('active');
      tabLookup.style.color = '#5a6a78';
      tabLookup.style.borderBottomColor = 'transparent';

      if (newForm) newForm.style.display = 'block';
      if (lookupContainer) lookupContainer.style.display = 'none';
    };

    const activateLookupBooking = () => {
      tabLookup.classList.add('active');
      tabLookup.style.color = 'var(--azul-texto)';
      tabLookup.style.borderBottomColor = 'var(--acento)';

      tabNew.classList.remove('active');
      tabNew.style.color = '#5a6a78';
      tabNew.style.borderBottomColor = 'transparent';

      if (newForm) newForm.style.display = 'none';
      if (lookupContainer) lookupContainer.style.display = 'block';
    };

    // Bind tab clicks
    tabNew.addEventListener('click', activateNewBooking);
    tabLookup.addEventListener('click', activateLookupBooking);

    // --- External trigger functions ---
    const triggerLookupAndScroll = (e) => {
      if (e) e.preventDefault();
      activateLookupBooking();
      const section = document.getElementById('reserva');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    if (openBtn) openBtn.addEventListener('click', triggerLookupAndScroll);
    if (bodyBtn) bodyBtn.addEventListener('click', triggerLookupAndScroll);
    if (mobileOpenBtn) {
      mobileOpenBtn.addEventListener('click', (e) => {
        triggerLookupAndScroll(e);
        // Close mobile hamburger menu
        const mobileNav = document.querySelector('.mobile-nav');
        const hamburger = document.querySelector('.hamburger');
        if (mobileNav) mobileNav.classList.remove('active');
        if (hamburger) hamburger.classList.remove('active');
      });
    }

    // --- Lookup Submission Handler ---
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
          <div style="margin-top: 1.25rem;">
            <a href="/api/payment/init?amount=${r.importe_cents}&order=${r.localizador}" class="btn btn-primary" style="display: inline-block; text-decoration: none; padding: 0.85rem 2rem; font-weight: 600; text-align: center;">
              Pagar ahora online (${totalEur} €)
            </a>
          </div>
        `;
      }

      resultDiv.innerHTML = `
        <h4 style="font-family: 'DM Serif Display', serif; font-size: 1.3rem; color: #1a2d40; margin: 1.5rem 0 0.5rem;">Detalles de la Reserva</h4>
        <div class="lookup-result-card" style="background:#f0ede6;border-radius:12px;padding:1.25rem 1.5rem;max-width:500px;border:1px solid #d4c9b8;">
          <div class="lookup-result-row" style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid #ccc3b3;">
            <span class="lookup-result-label" style="color:#5a6a78;font-weight:500;">Localizador</span>
            <span class="lookup-result-val" style="font-weight:800;color:#c97b3a;">${r.localizador}</span>
          </div>
          <div class="lookup-result-row" style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid #ccc3b3;">
            <span class="lookup-result-label" style="color:#5a6a78;font-weight:500;">Cliente</span>
            <span class="lookup-result-val" style="font-weight:700;color:#1a2d40;">${escapeHtml(r.nombre)}</span>
          </div>
          <div class="lookup-result-row" style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid #ccc3b3;">
            <span class="lookup-result-label" style="color:#5a6a78;font-weight:500;">Modalidad</span>
            <span class="lookup-result-val" style="font-weight:700;color:#1a2d40;">${modLabel}</span>
          </div>
          <div class="lookup-result-row" style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid #ccc3b3;">
            <span class="lookup-result-label" style="color:#5a6a78;font-weight:500;">Fecha</span>
            <span class="lookup-result-val" style="font-weight:700;color:#1a2d40;text-transform:capitalize;">${fechaFormatted}</span>
          </div>
          <div class="lookup-result-row" style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid #ccc3b3;">
            <span class="lookup-result-label" style="color:#5a6a78;font-weight:500;">Personas</span>
            <span class="lookup-result-val" style="font-weight:700;color:#1a2d40;">${r.personas}</span>
          </div>
          <div class="lookup-result-row" style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid #ccc3b3;">
            <span class="lookup-result-label" style="color:#5a6a78;font-weight:500;">Importe</span>
            <span class="lookup-result-val" style="font-weight:700;color:#1a2d40;">${totalEur} €</span>
          </div>
          <div class="lookup-result-row" style="display:flex;justify-content:space-between;padding:0.5rem 0;">
            <span class="lookup-result-label" style="color:#5a6a78;font-weight:500;">Estado Pago</span>
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
