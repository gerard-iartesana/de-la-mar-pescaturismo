/* ============================================
   Admin Panel JS — De la Mar a sa Taula
   ============================================ */

// --- Supabase Init ---
const SUPABASE_URL = 'https://dazootyjaeqhgccpnbta.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhem9vdHlqYWVxaGdjY3BuYnRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMjc3OTgsImV4cCI6MjA5OTgwMzc5OH0.50mHio1P3arZxXQ-k05LSkvFNyBsRcMNiTVHFjLdGhw';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- State ---
const state = {
  user: null,
  profile: null,
  calendarDate: new Date(),
  disponibilidad: [],
  reservas: [],
  users: [],
};

// --- DOM References ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Screens
const loginScreen = $('#login-screen');
const pendingScreen = $('#pending-screen');
const adminLayout = $('#admin-layout');

// Sidebar & topbar
const sidebar = $('#sidebar');
const sidebarOverlay = $('#sidebar-overlay');

// Tab links & panels
const tabLinks = $$('[data-tab]');
const tabPanels = $$('.tab-panel');

// Calendar
const calMonthTitle = $('#cal-month-title');
const calGrid = $('#cal-grid');

// Reservas
const reservasBody = $('#reservas-body');
const reservasFilterDate = $('#reservas-filter-date');
const reservasFilterEstado = $('#reservas-filter-estado');

// Usuarios
const usersGrid = $('#users-grid');

// Modal
const dayModal = $('#day-modal');
const dayModalTitle = $('#day-modal-title');
const dayModalSlots = $('#day-modal-slots');
const dayModalForm = $('#day-modal-form');

// ============================================
//  AUTH
// ============================================

async function handleAuth() {
  const { data: { session } } = await sb.auth.getSession();

  if (session) {
    state.user = session.user;
    await loadProfile();
  } else {
    showScreen('login');
  }

  // Listen for auth changes (e.g. redirect back from Google)
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      state.user = session.user;
      await loadProfile();
    } else if (event === 'SIGNED_OUT') {
      state.user = null;
      state.profile = null;
      showScreen('login');
    }
  });
}

async function signInWithGoogle() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/admin.html',
    },
  });
  if (error) showToast('Error al iniciar sesión: ' + error.message, 'error');
}

async function signOut() {
  await sb.auth.signOut();
  state.user = null;
  state.profile = null;
  showScreen('login');
}

async function loadProfile() {
  if (!state.user) return;

  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', state.user.id)
    .single();

  if (error || !data) {
    // Profile may not exist yet; user just signed up
    showScreen('pending');
    return;
  }

  state.profile = data;

  if (data.rol === 'pendiente' || !data.rol) {
    showScreen('pending');
  } else {
    showScreen('admin');
    initAdmin();
  }
}

// ============================================
//  SCREEN MANAGEMENT
// ============================================

function showScreen(screen) {
  loginScreen.classList.add('hidden');
  pendingScreen.classList.add('hidden');
  adminLayout.classList.add('hidden');

  if (screen === 'login') {
    loginScreen.classList.remove('hidden');
  } else if (screen === 'pending') {
    pendingScreen.classList.remove('hidden');
    // Update pending screen with user info
    const pendingEmail = $('#pending-email');
    if (pendingEmail && state.user) {
      pendingEmail.textContent = state.user.email;
    }
  } else if (screen === 'admin') {
    adminLayout.classList.remove('hidden');
  }
}

// ============================================
//  ADMIN INITIALIZATION
// ============================================

function initAdmin() {
  setupUserInfo();
  setupNavigation();
  setupTabVisibility();
  switchTab('calendario'); // Default tab
}

function setupUserInfo() {
  const p = state.profile;
  if (!p) return;

  // Sidebar
  const avatarEl = $('#sidebar-avatar');
  const nameEl = $('#sidebar-name');
  const roleEl = $('#sidebar-role');

  if (avatarEl) avatarEl.src = p.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.nombre || p.email) + '&background=1a2d40&color=f5f0e8';
  if (nameEl) nameEl.textContent = p.nombre || p.email;
  if (roleEl) roleEl.textContent = p.rol;

  // Topbar
  const topAvatar = $('#topbar-avatar');
  if (topAvatar) topAvatar.src = avatarEl.src;
}

function setupTabVisibility() {
  const role = state.profile?.rol;

  // Hide tabs based on role
  tabLinks.forEach((link) => {
    const tab = link.dataset.tab;
    if (tab === 'usuarios' && role !== 'admin') {
      link.classList.add('hidden');
    } else {
      link.classList.remove('hidden');
    }
  });
}

// ============================================
//  NAVIGATION
// ============================================

function setupNavigation() {
  // Tab switching
  tabLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(link.dataset.tab);
      closeSidebar();
    });
  });

  // Mobile menu
  const menuToggle = $('#btn-menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', toggleSidebar);
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
  }
}

function switchTab(tabName) {
  // Update active link
  tabLinks.forEach((link) => {
    link.classList.toggle('active', link.dataset.tab === tabName);
  });

  // Show active panel
  tabPanels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === 'tab-' + tabName);
  });

  // Update header title
  const titles = {
    calendario: 'Calendario de Disponibilidad',
    reservas: 'Gestión de Reservas',
    usuarios: 'Gestión de Usuarios',
  };
  const titleEl = $('#main-title');
  if (titleEl) titleEl.textContent = titles[tabName] || '';

  // Load data
  if (tabName === 'calendario') loadCalendar();
  else if (tabName === 'reservas') loadReservas();
  else if (tabName === 'usuarios') loadUsers();
}

function toggleSidebar() {
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('active');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
}

// ============================================
//  CALENDAR
// ============================================

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

async function loadCalendar() {
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();

  calMonthTitle.textContent = `${MONTHS_ES[month]} ${year}`;

  // Fetch disponibilidad for the month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const { data, error } = await sb
    .from('disponibilidad')
    .select('*')
    .gte('fecha', formatDate(firstDay))
    .lte('fecha', formatDate(lastDay));

  if (error) {
    showToast('Error cargando calendario: ' + error.message, 'error');
    return;
  }

  state.disponibilidad = data || [];
  renderCalendar(year, month);
}

function renderCalendar(year, month) {
  calGrid.innerHTML = '';

  // Day names
  DAYS_ES.forEach((day) => {
    const el = document.createElement('div');
    el.className = 'calendar-grid__dayname';
    el.textContent = day;
    calGrid.appendChild(el);
  });

  // Calculate grid
  const firstDay = new Date(year, month, 1);
  let startDay = firstDay.getDay(); // 0=Sun
  startDay = startDay === 0 ? 6 : startDay - 1; // Convert to Mon=0

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const today = new Date();
  const todayStr = formatDate(today);

  // Previous month days
  for (let i = startDay - 1; i >= 0; i--) {
    const cell = createCalendarCell(daysInPrevMonth - i, true);
    calGrid.appendChild(cell);
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = formatDate(new Date(year, month, d));
    const isToday = dateStr === todayStr;
    const slots = state.disponibilidad.filter((s) => s.fecha === dateStr);
    const cell = createCalendarCell(d, false, isToday, dateStr, slots);
    calGrid.appendChild(cell);
  }

  // Next month days to fill grid
  const totalCells = calGrid.children.length;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  // Account for header row of 7 day names
  const cellsAfterHeader = totalCells - 7;
  const remainingAfter = cellsAfterHeader % 7 === 0 ? 0 : 7 - (cellsAfterHeader % 7);

  for (let i = 1; i <= remainingAfter; i++) {
    const cell = createCalendarCell(i, true);
    calGrid.appendChild(cell);
  }
}

function createCalendarCell(day, isOtherMonth, isToday = false, dateStr = '', slots = []) {
  const cell = document.createElement('div');
  cell.className = 'calendar-grid__cell';
  if (isOtherMonth) cell.classList.add('other-month');
  if (isToday) cell.classList.add('today');

  const dateEl = document.createElement('div');
  dateEl.className = 'calendar-grid__date';
  dateEl.textContent = day;
  cell.appendChild(dateEl);

  if (!isOtherMonth && slots.length > 0) {
    const slotsContainer = document.createElement('div');
    slotsContainer.className = 'calendar-grid__slots';

    slots.forEach((slot) => {
      const badge = document.createElement('div');
      const isCancelled = slot.estado === 'cancelado';
      badge.className = `slot-badge slot-badge--${isCancelled ? 'cancelado' : slot.modalidad}`;

      const label = slot.modalidad === 'manana' ? '☀️ Mañana' : '🌅 Tarde';
      badge.innerHTML = `<span>${label}</span>`;

      if (!isCancelled) {
        const plazas = document.createElement('span');
        plazas.textContent = `${slot.plazas_reservadas || 0}/${slot.plazas_totales}`;
        badge.appendChild(plazas);
      }

      slotsContainer.appendChild(badge);
    });

    cell.appendChild(slotsContainer);
  }

  if (!isOtherMonth) {
    cell.addEventListener('click', () => openDayModal(dateStr, slots));
  }

  return cell;
}

// --- Day Modal ---

function openDayModal(dateStr, slots) {
  dayModalTitle.textContent = formatDateDisplay(dateStr);
  dayModalForm.dataset.date = dateStr;

  // Render existing slots
  renderExistingSlots(dateStr, slots);

  // Reset form
  const modalidadSelect = $('#modal-modalidad');
  const plazasInput = $('#modal-plazas');
  if (modalidadSelect) modalidadSelect.value = 'manana';
  if (plazasInput) plazasInput.value = '12';

  dayModal.classList.add('active');
}

function closeDayModal() {
  dayModal.classList.remove('active');
}

function renderExistingSlots(dateStr, slots) {
  if (!slots || slots.length === 0) {
    dayModalSlots.innerHTML = '<p class="empty-state__text" style="padding: .5rem 0; font-size: .85rem; opacity: .5;">No hay turnos configurados para este día.</p>';
    return;
  }

  dayModalSlots.innerHTML = '';
  const title = document.createElement('h4');
  title.textContent = 'Turnos existentes';
  dayModalSlots.appendChild(title);

  slots.forEach((slot) => {
    const item = document.createElement('div');
    item.className = 'existing-slot-item';

    const label = slot.modalidad === 'manana' ? '☀️ Mañana' : '🌅 Tarde';
    const statusText = slot.estado === 'cancelado' ? ' (Cancelado)' : ` — ${slot.plazas_reservadas || 0}/${slot.plazas_totales} plazas`;

    item.innerHTML = `
      <div class="existing-slot-item__info">
        <span>${label}${statusText}</span>
      </div>
      <div class="existing-slot-item__actions">
        ${slot.estado === 'cancelado'
          ? `<button class="btn-slot-action btn-slot-restore" data-id="${slot.id}" data-action="restore" title="Restaurar">Restaurar</button>`
          : `<button class="btn-slot-action btn-slot-cancel" data-id="${slot.id}" data-action="cancel" title="Cancelar">Cancelar</button>`
        }
        <button class="btn-slot-action btn-slot-delete" data-id="${slot.id}" data-action="delete" title="Eliminar">Eliminar</button>
      </div>
    `;

    dayModalSlots.appendChild(item);
  });

  // Bind slot action buttons
  dayModalSlots.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'cancel') cancelSlot(id, dateStr);
      else if (action === 'restore') restoreSlot(id, dateStr);
      else if (action === 'delete') deleteSlot(id, dateStr);
    });
  });
}

async function addSlot() {
  const dateStr = dayModalForm.dataset.date;
  const modalidad = $('#modal-modalidad').value;
  const plazas = parseInt($('#modal-plazas').value) || 12;

  if (!dateStr) return;

  // Check for duplicate
  const existing = state.disponibilidad.find(
    (s) => s.fecha === dateStr && s.modalidad === modalidad
  );
  if (existing) {
    showToast('Ya existe un turno de ' + (modalidad === 'manana' ? 'mañana' : 'tarde') + ' para este día.', 'error');
    return;
  }

  const { data, error } = await sb
    .from('disponibilidad')
    .insert({
      fecha: dateStr,
      modalidad,
      plazas_totales: plazas,
      plazas_reservadas: 0,
      estado: 'disponible',
      created_by: state.user.id,
    })
    .select()
    .single();

  if (error) {
    showToast('Error al añadir turno: ' + error.message, 'error');
    return;
  }

  showToast('Turno añadido correctamente', 'success');
  closeDayModal();
  loadCalendar();
}

async function cancelSlot(id, dateStr) {
  const { error } = await sb
    .from('disponibilidad')
    .update({ estado: 'cancelado' })
    .eq('id', id);

  if (error) {
    showToast('Error al cancelar: ' + error.message, 'error');
    return;
  }

  showToast('Turno cancelado', 'success');
  closeDayModal();
  loadCalendar();
}

async function restoreSlot(id, dateStr) {
  const { error } = await sb
    .from('disponibilidad')
    .update({ estado: 'disponible' })
    .eq('id', id);

  if (error) {
    showToast('Error al restaurar: ' + error.message, 'error');
    return;
  }

  showToast('Turno restaurado', 'success');
  closeDayModal();
  loadCalendar();
}

async function deleteSlot(id, dateStr) {
  if (!confirm('¿Seguro que quieres eliminar este turno? Esta acción no se puede deshacer.')) return;

  const { error } = await sb
    .from('disponibilidad')
    .delete()
    .eq('id', id);

  if (error) {
    showToast('Error al eliminar: ' + error.message, 'error');
    return;
  }

  showToast('Turno eliminado', 'success');
  closeDayModal();
  loadCalendar();
}

function navigateMonth(direction) {
  state.calendarDate.setMonth(state.calendarDate.getMonth() + direction);
  loadCalendar();
}

function goToToday() {
  state.calendarDate = new Date();
  loadCalendar();
}

// ============================================
//  RESERVAS
// ============================================

async function loadReservas() {
  reservasBody.innerHTML = '<tr><td colspan="8"><div class="loading-spinner"><div class="spinner"></div><span>Cargando reservas…</span></div></td></tr>';

  // Build query — left join so reservas without disponibilidad_id also show
  let query = sb
    .from('reservas')
    .select('*, disponibilidad(fecha, modalidad)')
    .order('created_at', { ascending: false });

  // Apply filters
  const filterDate = reservasFilterDate?.value;
  const filterEstado = reservasFilterEstado?.value;

  if (filterDate) {
    query = query.eq('disponibilidad.fecha', filterDate);
  }
  if (filterEstado && filterEstado !== 'todos') {
    query = query.eq('estado_pago', filterEstado);
  }

  const { data, error } = await query;

  if (error) {
    showToast('Error cargando reservas: ' + error.message, 'error');
    reservasBody.innerHTML = '<tr><td colspan="8" class="empty-state"><div class="empty-state__icon">⚠️</div><div class="empty-state__text">Error al cargar reservas</div></td></tr>';
    return;
  }

  state.reservas = data || [];
  renderReservas();
}

function renderReservas() {
  if (state.reservas.length === 0) {
    reservasBody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="empty-state__icon">📋</div><div class="empty-state__text">No se encontraron reservas</div></div></td></tr>';
    return;
  }

  // Group by date
  const grouped = {};
  state.reservas.forEach((r) => {
    const fecha = r.disponibilidad?.fecha || 'Sin fecha';
    if (!grouped[fecha]) grouped[fecha] = [];
    grouped[fecha].push(r);
  });

  // Sort dates descending
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  reservasBody.innerHTML = '';

  sortedDates.forEach((fecha) => {
    // Date group header
    const headerRow = document.createElement('tr');
    headerRow.className = 'date-group-header';
    headerRow.innerHTML = `<td colspan="8">📅 ${formatDateDisplay(fecha)} — ${grouped[fecha].length} reserva(s)</td>`;
    reservasBody.appendChild(headerRow);

    grouped[fecha].forEach((r) => {
      const row = document.createElement('tr');
      const modalidadLabel = r.disponibilidad?.modalidad === 'manana' ? 'Mañana' : 'Tarde';
      const estadoClass = getEstadoClass(r.estado_pago);

      row.innerHTML = `
        <td><strong>${escapeHtml(r.nombre)}</strong></td>
        <td>${escapeHtml(r.email)}</td>
        <td>${escapeHtml(r.telefono || '—')}</td>
        <td style="text-align:center">${r.personas}</td>
        <td>${modalidadLabel}</td>
        <td><span class="estado-badge estado-badge--${estadoClass}">${escapeHtml(r.estado_pago || 'pendiente')}</span></td>
        <td>${r.importe_cents ? (r.importe_cents / 100).toFixed(2) + ' €' : '—'}</td>
        <td>${formatDateTime(r.created_at)}</td>
      `;
      reservasBody.appendChild(row);
    });
  });
}

function getEstadoClass(estado) {
  if (!estado) return 'pendiente';
  switch (estado.toLowerCase()) {
    case 'pagado': return 'pagado';
    case 'pendiente': return 'pendiente';
    case 'cancelado': return 'cancelado';
    case 'reembolsado': return 'reembolsado';
    default: return 'pendiente';
  }
}

// ============================================
//  USUARIOS
// ============================================

async function loadUsers() {
  usersGrid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Cargando usuarios…</span></div>';

  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    showToast('Error cargando usuarios: ' + error.message, 'error');
    return;
  }

  state.users = data || [];
  renderUsers();
}

function renderUsers() {
  if (state.users.length === 0) {
    usersGrid.innerHTML = '<div class="empty-state"><div class="empty-state__icon">👥</div><div class="empty-state__text">No hay usuarios registrados</div></div>';
    return;
  }

  usersGrid.innerHTML = '';

  state.users.forEach((user) => {
    const card = document.createElement('div');
    card.className = 'user-card';

    const avatarUrl = user.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.nombre || user.email) + '&background=1a2d40&color=f5f0e8';

    card.innerHTML = `
      <img class="user-card__avatar" src="${avatarUrl}" alt="${escapeHtml(user.nombre || user.email)}">
      <div class="user-card__info">
        <div class="user-card__name">${escapeHtml(user.nombre || 'Sin nombre')}</div>
        <div class="user-card__email">${escapeHtml(user.email)}</div>
        <div class="user-card__created">Registrado: ${formatDateTime(user.created_at)}</div>
      </div>
      <select class="user-card__role-select" data-user-id="${user.id}" ${user.id === state.user.id ? 'disabled title="No puedes cambiar tu propio rol"' : ''}>
        <option value="admin" ${user.rol === 'admin' ? 'selected' : ''}>Admin</option>
        <option value="staff" ${user.rol === 'staff' ? 'selected' : ''}>Staff</option>
        <option value="client" ${user.rol === 'client' ? 'selected' : ''}>Client</option>
        <option value="pendiente" ${user.rol === 'pendiente' ? 'selected' : ''}>Pendiente</option>
      </select>
    `;

    // Role change handler
    const select = card.querySelector('select');
    if (select && !select.disabled) {
      select.addEventListener('change', () => changeUserRole(user.id, select.value, user.nombre || user.email));
    }

    usersGrid.appendChild(card);
  });
}

async function changeUserRole(userId, newRole, userName) {
  if (!confirm(`¿Cambiar el rol de "${userName}" a "${newRole}"?`)) {
    loadUsers(); // Reset select
    return;
  }

  const { error } = await sb
    .from('profiles')
    .update({ rol: newRole })
    .eq('id', userId);

  if (error) {
    showToast('Error al cambiar rol: ' + error.message, 'error');
    loadUsers();
    return;
  }

  showToast(`Rol de ${userName} actualizado a "${newRole}"`, 'success');
  loadUsers();
}

// ============================================
//  TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'info') {
  const container = $('#toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast__close" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);

  // Auto-remove after 4s
  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 4000);
}

// ============================================
//  UTILITY FUNCTIONS
// ============================================

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================
//  EVENT BINDINGS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Google Sign-In button
  const btnGoogle = $('#btn-google-login');
  if (btnGoogle) btnGoogle.addEventListener('click', signInWithGoogle);

  // Logout buttons
  const btnLogout = $('#btn-logout');
  if (btnLogout) btnLogout.addEventListener('click', signOut);

  const btnLogoutPending = $('#btn-logout-pending');
  if (btnLogoutPending) btnLogoutPending.addEventListener('click', signOut);

  // Calendar navigation
  const btnPrev = $('#btn-cal-prev');
  const btnNext = $('#btn-cal-next');
  const btnToday = $('#btn-cal-today');
  if (btnPrev) btnPrev.addEventListener('click', () => navigateMonth(-1));
  if (btnNext) btnNext.addEventListener('click', () => navigateMonth(1));
  if (btnToday) btnToday.addEventListener('click', goToToday);

  // Day modal
  const btnCloseModal = $('#btn-close-modal');
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeDayModal);

  const btnAddSlot = $('#btn-add-slot');
  if (btnAddSlot) btnAddSlot.addEventListener('click', addSlot);

  // Close modal on overlay click
  if (dayModal) {
    dayModal.addEventListener('click', (e) => {
      if (e.target === dayModal) closeDayModal();
    });
  }

  // Reservas filters
  if (reservasFilterDate) reservasFilterDate.addEventListener('change', loadReservas);
  if (reservasFilterEstado) reservasFilterEstado.addEventListener('change', loadReservas);

  // Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDayModal();
      closeSidebar();
    }
  });

  // Start auth flow
  handleAuth();
});
