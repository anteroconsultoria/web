/* ==========================================================================
   ANTERO® CONSULTORIA — INTERATIVIDADE, AGENDAMENTO E INTEGRAÇÃO GOOGLE SHEETS
   ========================================================================== */

const CONFIG = {
  companyName: 'Antero Consultoria',
  consultantWhatsApp: '558592550496', // WhatsApp oficial: (85) 9255-0496
  consultantEmail: 'contato@anteroconsultoria.com.br',
  storageKey: 'antero_consultoria_agendamentos_v1',
  logoStorageKey: 'antero_consultoria_logo_custom_v1',
  // Cole abaixo a URL do App da Web gerada ao implantar o arquivo google-apps-script.gs
  webhookUrl: '',
};

let currentView = 'site';

// 1. GERENCIAMENTO DA LOGO OFICIAL
function handleLogoError(imgEl, fallbackId) {
  imgEl.classList.add('hidden');
  const fallback = document.getElementById(fallbackId);
  if (fallback) fallback.classList.remove('hidden');
}

function applySavedLogo() {
  const savedLogo = localStorage.getItem(CONFIG.logoStorageKey);
  if (!savedLogo) return;

  ['brand-logo-header', 'brand-logo-footer'].forEach((id, idx) => {
    const img = document.getElementById(id);
    const fb = document.getElementById(
      idx === 0 ? 'logo-fallback-header' : 'logo-fallback-footer'
    );
    if (img) {
      img.src = savedLogo;
      img.classList.remove('hidden');
    }
    if (fb) fb.classList.add('hidden');
  });
}

function uploadCustomLogo(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      localStorage.setItem(CONFIG.logoStorageKey, e.target.result);
      applySavedLogo();
      showToast('Logo oficial aplicada com sucesso no cabeçalho e rodapé!');
    } catch (err) {
      showToast('Imagem muito grande para salvar no navegador. Use um arquivo menor.', 'error');
    }
  };
  reader.readAsDataURL(file);
}

// 2. BANCO DE DADOS LOCAL & UTILITÁRIOS
function getFutureDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

const DEMO_LEADS = [
  {
    id: 'lead-demo-1',
    name: 'Eduardo Cavalcante',
    company: 'Cavalcante Distribuidora',
    whatsapp: '(85) 98877-6655',
    email: 'eduardo@cavalcantedist.com.br',
    service: 'Registro de Marca (INPI)',
    date: getFutureDate(2),
    time: '10:30',
    notes: 'Quero registrar o nome e a logo nova antes de abrir a filial.',
    notifyWhatsapp: true,
    notifyEmail: true,
    status: 'Agendado',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'lead-demo-2',
    name: 'Camila Mendes',
    company: 'Mendes Moda Praia',
    whatsapp: '(85) 99911-2233',
    email: 'camila@mendesmodapraia.com.br',
    service: 'Internacionalização (Brasil–Paraguai)',
    date: getFutureDate(4),
    time: '14:00',
    notes: 'Interesse em exportar e avaliar operação no Paraguai.',
    notifyWhatsapp: true,
    notifyEmail: true,
    status: 'Confirmado',
    createdAt: new Date().toISOString(),
  },
];

function formatDateBR(isoDate) {
  if (!isoDate) return '-';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function sanitizePhone(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function maskWhatsApp(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getLeads() {
  const raw = localStorage.getItem(CONFIG.storageKey);
  if (!raw) {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(DEMO_LEADS));
    return [...DEMO_LEADS];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLeads(leads) {
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(leads));
  updateHeaderBadge();
}

function updateHeaderBadge() {
  const leads = getLeads();
  const pending = leads.filter(
    (l) => l.status === 'Agendado' || l.status === 'Confirmado'
  ).length;
  const badge = document.getElementById('header-badge-count');
  if (badge) badge.textContent = pending;
}

// 3. NAVEGAÇÃO ENTRE SITE E PAINEL CRM + TOASTS
function switchView(view) {
  currentView = view;
  const siteEl = document.getElementById('view-site');
  const crmEl = document.getElementById('view-crm');
  const btnLabel = document.getElementById('crm-btn-label');
  const mobileLabel = document.getElementById('mobile-crm-label');

  if (view === 'crm') {
    siteEl.classList.add('hidden');
    crmEl.classList.remove('hidden');
    btnLabel.textContent = 'Voltar ao Site';
    mobileLabel.textContent = 'Voltar para o Site';
    renderCRM();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    crmEl.classList.add('hidden');
    siteEl.classList.remove('hidden');
    btnLabel.textContent = 'Aba Agendamentos';
    mobileLabel.textContent = 'Abrir Aba de Agendamentos (CRM)';
  }
}

function toggleView() {
  switchView(currentView === 'site' ? 'crm' : 'site');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const colorClass =
    type === 'success'
      ? 'bg-antero-dark text-white border-antero-teal'
      : 'bg-red-600 text-white border-red-400';

  toast.className = `toast-enter flex items-center gap-2.5 px-4 py-3 rounded-xl border-l-4 shadow-xl text-sm font-medium ${colorClass}`;
  toast.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4 text-antero-teal shrink-0"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  lucide.createIcons();
  setTimeout(() => toast.remove(), 3800);
}

// 4. FORMULÁRIO DE AGENDAMENTO (COM ENVIO PARA GOOGLE SHEETS VIA APPS SCRIPT)
function initBookingForm() {
  const form = document.getElementById('booking-form');
  const phoneInput = document.getElementById('client-whatsapp');

  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      e.target.value = maskWhatsApp(e.target.value);
    });
  }

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('opacity-70', 'cursor-wait');
    }

    const newLead = {
      id: 'lead-' + Date.now(),
      name: document.getElementById('client-name').value.trim(),
      company: document.getElementById('client-company').value.trim(),
      whatsapp: document.getElementById('client-whatsapp').value.trim(),
      email: document.getElementById('client-email').value.trim(),
      service: document.getElementById('client-service').value,
      date: document.getElementById('client-date').value,
      time: document.getElementById('client-time').value,
      notes: document.getElementById('client-notes').value.trim(),
      notifyWhatsapp: document.getElementById('notify-whatsapp').checked,
      notifyEmail: document.getElementById('notify-email').checked,
      status: 'Agendado',
      createdAt: new Date().toISOString(),
    };

    const leads = getLeads();
    leads.unshift(newLead);
    saveLeads(leads);

    // Envio para Google Sheets via Google Apps Script Web App
    if (CONFIG.webhookUrl) {
      try {
        await fetch(CONFIG.webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(newLead),
        });
      } catch (err) {
        console.warn('Webhook Google Sheets indisponível:', err);
      }
    }

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-70', 'cursor-wait');
    }

    form.classList.add('hidden');
    document.getElementById('booking-success').classList.remove('hidden');

    document.getElementById('success-summary').textContent =
      `Obrigado, ${newLead.name}! Sua 1ª Consultoria Grátis (${newLead.service}) para a marca "${newLead.company}" foi pré-agendada para ${formatDateBR(newLead.date)} às ${newLead.time}.`;

    const clientMsg = encodeURIComponent(
      `Olá, ${CONFIG.companyName}! Acabei de agendar minha 1ª Consultoria Grátis pelo site.\n\n` +
        `*Nome:* ${newLead.name}\n` +
        `*Empresa/Marca:* ${newLead.company}\n` +
        `*Assunto:* ${newLead.service}\n` +
        `*Data/Hora:* ${formatDateBR(newLead.date)} às ${newLead.time}`
    );

    document.getElementById('success-wa-link').href =
      `https://wa.me/${CONFIG.consultantWhatsApp}?text=${clientMsg}`;

    showToast(
      CONFIG.webhookUrl
        ? 'Agendamento salvo no painel e enviado ao Google Sheets!'
        : 'Agendamento salvo no painel local!'
    );
    lucide.createIcons();
  });
}

function resetBookingForm() {
  document.getElementById('booking-form').reset();
  document.getElementById('client-date').min = getFutureDate(0);
  document.getElementById('booking-success').classList.add('hidden');
  document.getElementById('booking-form').classList.remove('hidden');
}

// 5. PAINEL DE ACOMPANHAMENTO (CRM)
function renderCRM() {
  const leads = getLeads();
  const search = (document.getElementById('crm-search').value || '').toLowerCase();
  const statusFilter = document.getElementById('crm-filter-status').value;

  document.getElementById('stat-total').textContent = leads.length;
  document.getElementById('stat-agendado').textContent = leads.filter((l) => l.status === 'Agendado').length;
  document.getElementById('stat-confirmado').textContent = leads.filter((l) => l.status === 'Confirmado').length;
  document.getElementById('stat-concluido').textContent = leads.filter((l) => l.status === 'Concluído').length;

  const filtered = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(search) ||
      lead.company.toLowerCase().includes(search) ||
      lead.email.toLowerCase().includes(search) ||
      lead.whatsapp.toLowerCase().includes(search);
    const matchesStatus = statusFilter === 'TODOS' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const tbody = document.getElementById('crm-table-body');
  const emptyState = document.getElementById('crm-empty-state');
  tbody.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  const statusColors = {
    Agendado: 'bg-amber-50 text-amber-700 border-amber-200',
    Confirmado: 'bg-antero-tealSoft text-antero-tealDark border-antero-teal/30',
    Concluído: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Cancelado: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  filtered.forEach((lead) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 transition-colors';
    tr.innerHTML = `
      <td class="py-4 px-5 align-top">
        <p class="font-display font-bold text-antero-dark">${escapeHtml(lead.name)}</p>
        <p class="text-xs font-medium text-antero-teal mt-0.5">${escapeHtml(lead.company)}</p>
        ${lead.notes ? `<p class="text-xs text-slate-500 mt-1 max-w-xs line-clamp-2">"${escapeHtml(lead.notes)}"</p>` : ''}
      </td>
      <td class="py-4 px-5 align-top text-xs space-y-1">
        <p class="font-medium text-slate-700 flex items-center gap-1.5">
          <i data-lucide="phone" class="w-3.5 h-3.5 text-emerald-600"></i>
          ${escapeHtml(lead.whatsapp)}
        </p>
        <p class="text-slate-500 flex items-center gap-1.5">
          <i data-lucide="mail" class="w-3.5 h-3.5 text-slate-400"></i>
          ${escapeHtml(lead.email)}
        </p>
      </td>
      <td class="py-4 px-5 align-top">
        <span class="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
          ${escapeHtml(lead.service)}
        </span>
        <p class="text-xs font-bold text-antero-dark mt-1.5 flex items-center gap-1.5">
          <i data-lucide="calendar" class="w-3.5 h-3.5 text-antero-teal"></i>
          ${formatDateBR(lead.date)} às ${escapeHtml(lead.time)}
        </p>
      </td>
      <td class="py-4 px-5 align-top">
        <select
          onchange="updateLeadStatus('${lead.id}', this.value)"
          class="text-xs font-bold px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer ${statusColors[lead.status] || ''}"
        >
          <option value="Agendado" ${lead.status === 'Agendado' ? 'selected' : ''}>Agendado</option>
          <option value="Confirmado" ${lead.status === 'Confirmado' ? 'selected' : ''}>Confirmado</option>
          <option value="Concluído" ${lead.status === 'Concluído' ? 'selected' : ''}>Concluído</option>
          <option value="Cancelado" ${lead.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
        </select>
      </td>
      <td class="py-4 px-5 align-top text-right">
        <div class="flex flex-wrap justify-end gap-1.5">
          <button type="button" onclick="sendWhatsApp('${lead.id}', 'confirmacao')" class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors" title="Enviar confirmação via WhatsApp">
            <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
            <span>Confirmar WA</span>
          </button>
          <button type="button" onclick="sendWhatsApp('${lead.id}', 'lembrete')" class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-colors" title="Enviar lembrete via WhatsApp">
            <i data-lucide="bell" class="w-3.5 h-3.5"></i>
            <span>Lembrete WA</span>
          </button>
          <button type="button" onclick="sendEmail('${lead.id}', 'confirmacao')" class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-antero-teal hover:bg-antero-tealDark text-white text-xs font-semibold transition-colors" title="Enviar confirmação por E-mail">
            <i data-lucide="mail-check" class="w-3.5 h-3.5"></i>
            <span>E-mail</span>
          </button>
          <button type="button" onclick="sendEmail('${lead.id}', 'lembrete')" class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors" title="Enviar lembrete por E-mail">
            <i data-lucide="clock" class="w-3.5 h-3.5"></i>
            <span>Lembrar E-mail</span>
          </button>
          <button type="button" onclick="deleteLead('${lead.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Remover registro">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  lucide.createIcons();
}

function updateLeadStatus(id, newStatus) {
  const leads = getLeads();
  const idx = leads.findIndex((l) => l.id === id);
  if (idx !== -1) {
    leads[idx].status = newStatus;
    saveLeads(leads);
    renderCRM();
    showToast(`Status atualizado para "${newStatus}".`);
  }
}

function deleteLead(id) {
  if (!confirm('Deseja realmente remover este agendamento da base?')) return;
  saveLeads(getLeads().filter((l) => l.id !== id));
  renderCRM();
  showToast('Registro removido.');
}

function sendWhatsApp(id, type) {
  const lead = getLeads().find((l) => l.id === id);
  if (!lead) return;
  const phone = sanitizePhone(lead.whatsapp);
  const dateStr = formatDateBR(lead.date);

  const text =
    type === 'confirmacao'
      ? `Olá, *${lead.name}*! Tudo bem? 👋\n\nAqui é da *${CONFIG.companyName}*. Sua *1ª Consultoria Gratuita* para a marca *${lead.company}* está *CONFIRMADA*!\n\n📌 *Tema:* ${lead.service}\n📅 *Data:* ${dateStr}\n⏰ *Horário:* ${lead.time}\n\nQualquer imprevisto, basta nos avisar por aqui. Até lá!`
      : `Olá, *${lead.name}*! Passando para lembrar da nossa *1ª Consultoria Gratuita* pela *${CONFIG.companyName}*! ⏰\n\n📌 *Marca:* ${lead.company}\n📅 *Data:* ${dateStr}\n🕒 *Horário:* ${lead.time}\n\nPodemos confirmar sua presença?`;

  window.open(
    `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
    '_blank',
    'noopener,noreferrer'
  );
  showToast(
    type === 'confirmacao'
      ? 'WhatsApp aberto com confirmação!'
      : 'WhatsApp aberto com lembrete!'
  );
}

function sendEmail(id, type) {
  const lead = getLeads().find((l) => l.id === id);
  if (!lead) return;
  const dateStr = formatDateBR(lead.date);

  const subject =
    type === 'confirmacao'
      ? `Confirmação: 1ª Consultoria Grátis — ${CONFIG.companyName}`
      : `Lembrete: Sua Consultoria Grátis (${dateStr} às ${lead.time}) — ${CONFIG.companyName}`;

  const body =
    type === 'confirmacao'
      ? `Olá, ${lead.name}!\n\nConfirmamos o agendamento da sua 1ª Consultoria Gratuita com a ${CONFIG.companyName}.\n\n- Empresa/Marca: ${lead.company}\n- Assunto: ${lead.service}\n- Data: ${dateStr}\n- Horário: ${lead.time}\n\nAtenciosamente,\nEquipe ${CONFIG.companyName}`
      : `Olá, ${lead.name}!\n\nEste é um lembrete amigável da sua 1ª Consultoria Gratuita com a ${CONFIG.companyName}.\n\n- Empresa/Marca: ${lead.company}\n- Data: ${dateStr}\n- Horário: ${lead.time}\n\nAté breve,\nEquipe ${CONFIG.companyName}`;

  window.location.href = `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  showToast('Cliente de e-mail aberto com mensagem pronta!');
}

function exportToCSV() {
  const leads = getLeads();
  if (leads.length === 0) {
    showToast('Não há dados para exportar.', 'error');
    return;
  }
  const headers = [
    'Nome',
    'Empresa/Marca',
    'WhatsApp',
    'E-mail',
    'Serviço',
    'Data',
    'Horário',
    'Status',
    'Observações',
  ];
  const rows = leads.map((l) =>
    [
      l.name,
      l.company,
      l.whatsapp,
      l.email,
      l.service,
      formatDateBR(l.date),
      l.time,
      l.status,
      l.notes || '',
    ]
      .map((val) => `"${String(val).replace(/"/g, '""')}"`)
      .join(';')
  );

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `clientes-antero-consultoria-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Base exportada em CSV com sucesso!');
}

// 6. MENU MOBILE, ACORDEÃO FAQ E SCROLL REVEAL
function closeMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const iconOpen = document.getElementById('menu-icon-open');
  const iconClose = document.getElementById('menu-icon-close');

  menuBtn.setAttribute('aria-expanded', 'false');
  mobileMenu.classList.add('hidden');
  iconOpen.classList.remove('hidden');
  iconClose.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  applySavedLogo();
  initBookingForm();

  document.getElementById('current-year').textContent = new Date().getFullYear();
  document.getElementById('client-date').min = getFutureDate(0);
  updateHeaderBadge();

  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const iconOpen = document.getElementById('menu-icon-open');
  const iconClose = document.getElementById('menu-icon-close');

  menuBtn.addEventListener('click', () => {
    const isOpen = menuBtn.getAttribute('aria-expanded') === 'true';
    if (isOpen) {
      closeMobileMenu();
    } else {
      menuBtn.setAttribute('aria-expanded', 'true');
      mobileMenu.classList.remove('hidden');
      iconOpen.classList.add('hidden');
      iconClose.classList.remove('hidden');
    }
  });

  document
    .querySelectorAll('.mobile-link')
    .forEach((link) => link.addEventListener('click', closeMobileMenu));

  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    const trigger = item.querySelector('.faq-trigger');
    trigger.addEventListener('click', () => {
      const isOpen = item.getAttribute('data-open') === 'true';
      faqItems.forEach((other) => {
        other.setAttribute('data-open', 'false');
        other.querySelector('.faq-trigger').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.setAttribute('data-open', 'true');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
});
