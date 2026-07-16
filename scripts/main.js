// === DE LA MAR A SA TAULA — MAIN JS ===
document.addEventListener('DOMContentLoaded', () => {
  // --- Scroll: header background ---
  const header = document.querySelector('.header');
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 60);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // --- Mobile menu ---
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileNav.classList.toggle('open');
      document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
    });
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // --- Reveal on scroll (IntersectionObserver) ---
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => observer.observe(el));

  // --- Active nav link on scroll ---
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
  const updateActiveLink = () => {
    let current = '';
    sections.forEach(section => {
      const top = section.offsetTop - 120;
      if (window.scrollY >= top) current = section.id;
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + current);
    });
  };
  window.addEventListener('scroll', updateActiveLink, { passive: true });

  // --- Form validation (inline on blur — submit handled by payment.js) ---
  const form = document.getElementById('reserva-form');
  if (form) {
    const required = form.querySelectorAll('[required]');
    
    const validateField = (field) => {
      const group = field.closest('.form-group');
      if (!group) return true;
      let valid = true;

      if (field.value.trim() === '') {
        valid = false;
      } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
        valid = false;
      } else if (field.type === 'tel' && field.value.trim().length < 6) {
        valid = false;
      }

      group.classList.toggle('has-error', !valid);
      return valid;
    };

    required.forEach(field => {
      field.addEventListener('blur', () => validateField(field));
    });
  }

  // --- Tarifa card CTA → pre-select modality ---
  document.querySelectorAll('[data-modalidad]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mod = e.currentTarget.dataset.modalidad;
      const select = document.getElementById('modalidad');
      if (select) select.value = mod;
    });
  });
});
