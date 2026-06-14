// =====================================================================
//  script.js — consume la API REST en lugar de localStorage
// =====================================================================

const API = 'http://localhost:3000/api';

// ─── Catálogos locales (para los selects del formulario) ─────────────
const PAISES = [
  {codigo:'GTM',nombre:'Guatemala'},{codigo:'ESP',nombre:'España'},
  {codigo:'MEX',nombre:'México'},{codigo:'COL',nombre:'Colombia'},
  {codigo:'PER',nombre:'Perú'},{codigo:'BGD',nombre:'Bangladés'},
  {codigo:'VNM',nombre:'Vietnam'},{codigo:'NGA',nombre:'Nigeria'},
  {codigo:'KEN',nombre:'Kenia'},{codigo:'ETH',nombre:'Etiopía'},
  {codigo:'MOZ',nombre:'Mozambique'},{codigo:'HTI',nombre:'Haití'},
  {codigo:'PHL',nombre:'Filipinas'},{codigo:'FJI',nombre:'Fiyi'},
  {codigo:'DEU',nombre:'Alemania'},{codigo:'JPN',nombre:'Japón'},
  {codigo:'CAN',nombre:'Canadá'},{codigo:'USA',nombre:'Estados Unidos'},
  {codigo:'FRA',nombre:'Francia'},{codigo:'GBR',nombre:'Reino Unido'},
  {codigo:'KOR',nombre:'Corea del Sur'},{codigo:'NLD',nombre:'Países Bajos'},
  {codigo:'ITA',nombre:'Italia'},{codigo:'CRI',nombre:'Costa Rica'},
  {codigo:'ARG',nombre:'Argentina'},{codigo:'CHL',nombre:'Chile'},
  {codigo:'BRA',nombre:'Brasil'},{codigo:'CHN',nombre:'China'},
  {codigo:'IND',nombre:'India'},{codigo:'ZAF',nombre:'Sudáfrica'},
  {codigo:'UKR',nombre:'Ucrania'},{codigo:'TUR',nombre:'Turquía'},
  {codigo:'SYR',nombre:'Siria'},{codigo:'MDA',nombre:'Moldavia'},
  {codigo:'SRB',nombre:'Serbia'},{codigo:'BIH',nombre:'Bosnia y Herzegovina'},
  {codigo:'ALB',nombre:'Albania'},{codigo:'IDN',nombre:'Indonesia'},
  {codigo:'NPL',nombre:'Nepal'},{codigo:'TCD',nombre:'Chad'},
  {codigo:'NER',nombre:'Níger'},{codigo:'MAR',nombre:'Marruecos'},
  {codigo:'VUT',nombre:'Vanuatu'},{codigo:'TON',nombre:'Tonga'},
  {codigo:'PNG',nombre:'Papúa Nueva Guinea'},{codigo:'PLW',nombre:'Palaos'},
  {codigo:'KIR',nombre:'Kiribati'},{codigo:'BEL',nombre:'Bélgica'},
  {codigo:'CUB',nombre:'Cuba'},{codigo:'LAO',nombre:'Laos'},
  {codigo:'AUS',nombre:'Australia'},{codigo:'NZL',nombre:'Nueva Zelanda'},
].sort((a,b) => a.nombre.localeCompare(b.nombre, 'es'));

const CATEGORIAS = [
  {id:1, nombre:'Ayuda humanitaria',    icono:'🆘'},
  {id:2, nombre:'Infraestructura',      icono:'🏗️'},
  {id:3, nombre:'Protección ambiental', icono:'🌱'},
  {id:4, nombre:'Salud pública',        icono:'🏥'},
  {id:5, nombre:'Asistencia técnica',   icono:'⚙️'},
  {id:6, nombre:'Seguridad alimentaria',icono:'🌾'},
  {id:7, nombre:'Telecomunicaciones',   icono:'📡'},
  {id:8, font: 'Seguridad y paz',       icono:'🕊️'},
  {id:9, nombre:'Educación',            icono:'🎓'},
  {id:10,nombre:'Energía renovable',    icono:'☀️'},
  {id:11,nombre:'Finanzas sostenibles', icono:'💼'},
  {id:12,nombre:'Gestión del riesgo',   icono:'⚠️'},
];

const ORGANIZACIONES = [
  'ACNUR — Alto Comisionado de la ONU para Refugiados',
  'Alcaldía de Sídney',
  'AMEXCID',
  'Banco Africano de Desarrollo',
  'Banco Asiático de Desarrollo',
  'Banco Europeo de Inversiones (BEI)',
  'Banco Interamericano de Desarrollo (BID)',
  'Banco Mundial',
  'Centro AHA de la ASEAN',
  'China Eximbank',
  'Comisión Europea (ECHO/ERCC)',
  'Comunidad del Pacífico (SPC)',
  'Cruz Roja Internacional',
  'FAO — Organización de la ONU para la Alimentación',
  'Gobierno de Australia — DFAT',
  'Gobierno de Cuba',
  'Gobierno de España — AECID',
  'Gobierno de Estados Unidos — USAID',
  'Gobierno de India',
  'Gobierno de Japón — JICA',
  'Gobierno de Nueva Zelanda — NZDF',
  'Green Climate Fund (GCF)',
  'Handicap International',
  'Médicos Sin Fronteras',
  'OPS — Organización Panamericana de la Salud',
  'PNUD — Programa de las Naciones Unidas para el Desarrollo',
  'Programa Mundial de Alimentos (PMA/WFP)',
  'Red de Ciudades C40',
  'UNICEF',
  'Unión Africana',
  'World Wildlife Fund (WWF)',
  'AECID','GIZ','UNESCO','Oxfam','Fundación AVINA',
].sort((a,b) => a.localeCompare(b,'es'));

// ─── Estado global ────────────────────────────────────────────────────
let programas           = [];
let editandoId          = null;
let mapaObj             = null;
let marcadorObj         = null;

// variables de paginación
let paginaActual        = 1;
const elementosPorPagina = 6; // Puedes cambiar este número a 9 o 12 si prefieres

// ─── Helpers ──────────────────────────────────────────────────────────
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const fmtMoney = n => new Intl.NumberFormat('en-US',{
  style:'currency',currency:'USD',maximumFractionDigits:0
}).format(n||0);

const fmtDate = iso => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES',{year:'numeric',month:'short',day:'numeric'});
};

const escapeHtml = s => String(s??'').replace(/[&<>"']/g, c=>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])
);

// ─── API calls ────────────────────────────────────────────────────────
async function apiGet() {
  const r = await fetch(`${API}/programas`);
  if (!r.ok) throw new Error('Error al cargar programas');
  return r.json();
}

async function apiPost(data) {
  const r = await fetch(`${API}/programas`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(data)
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || 'Error al guardar');
  return json;
}

async function apiPut(id, data) {
  const r = await fetch(`${API}/programas/${id}`, {
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(data)
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || 'Error al actualizar');
  return json;
}

async function apiDelete(id) {
  const r = await fetch(`${API}/programas/${id}`, { method:'DELETE' });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || 'Error al eliminar');
  return json;
}

// ─── Cargar programas desde MySQL ─────────────────────────────────────
async function cargarProgramas() {
  try {
    programas = await apiGet();
    renderAll();
  } catch(e) {
    showToast('❌ No se pudo conectar con el servidor: ' + e.message, 'error');
  }
}

// ─── Render ───────────────────────────────────────────────────────────
const ICONS = {
  blue:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>',
  green:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  orange: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20"/></svg>',
  gray:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  purple: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
};

function renderStats() {
  const total      = programas.length;
  const activos    = programas.filter(p=>p.estado==='activo').length;
  const finalizados= programas.filter(p=>p.estado==='finalizado').length;
  const planificados=programas.filter(p=>p.estado==='planificado').length;
  const paises     = new Set(programas.map(p=>p.pais_beneficiario)).size;

  $('#stats').innerHTML = [
    {icon:'blue',   value:total,        label:'Programas totales'},
    {icon:'green',  value:activos,      label:'Activos'},
    {icon:'gray',   value:finalizados,  label:'Finalizados'},
    {icon:'orange', value:planificados, label:'Planificados'},
    {icon:'purple', value:paises,       label:'Países beneficiarios'},
  ].map(c=>`
    <div class="stat-card">
      <div class="stat-icon ${c.icon}">${ICONS[c.icon]}</div>
      <div class="stat-value">${c.value}</div>
      <div class="stat-label">${c.label}</div>
    </div>`).join('');
}

function renderGrid() {
  const q      = ($('#search').value||'').toLowerCase().trim();
  const fEst   = $('#filterEstado').value;
  const fCat   = $('#filterCategoria').value;
  const fAlc   = $('#filterAlcance').value;

  // 1. Filtrar la lista completa primero
  const filteredList = programas.filter(p=>{
    if (fEst && p.estado !== fEst) return false;
    if (fAlc && p.tipo_alcance !== fAlc) return false;
    if (fCat && p.categoria !== fCat) return false;
    if (q) {
      const hay = (
          (p.nombre||'')+' '+(p.pais_beneficiario||'')+' '+(p.pais_creador||'')+
          ' '+(p.categoria||'')+' '+(p.organizacion||'')+' '+(p.descripcion||'')+
          ' '+(p.ubicacion||'')
      ).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (!filteredList.length) {
    $('#grid').innerHTML = `
      <div class="empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <h3>No se encontraron programas</h3>
        <p>Ajusta los filtros o agrega un nuevo programa.</p>
      </div>`;
    renderPagination(0); // Ocultar o resetear controles
    return;
  }

  // 2. Calcular límites de paginación sobre los datos filtrados
  const totalPaginas = Math.ceil(filteredList.length / elementosPorPagina);

  // Guardián por si los filtros dejan la página actual fuera de rango
  if (paginaActual > totalPaginas) paginaActual = Math.max(1, totalPaginas);

  const inicio = (paginaActual - 1) * elementosPorPagina;
  const fin    = inicio + elementosPorPagina;

  // 3. Obtener sólo el segmento de la página actual
  const itemsPaginados = filteredList.slice(inicio, fin);

  // 4. Renderizar las tarjetas correspondientes
  $('#grid').innerHTML = itemsPaginados.map(p => {
    const cat   = CATEGORIAS.find(c => c.nombre === p.categoria);
    const emoji = cat ? cat.icono : '🏷️';
    const lat   = p.lat   ?? null;
    const lon   = p.lng   ?? p.lon ?? null;
    return `
      <article class="card">
        <div class="card-head">
          <div class="card-title">${emoji} ${escapeHtml(p.nombre)}</div>
          <span class="badge ${p.estado}">${p.estado}</span>
        </div>
        <p class="card-desc">${escapeHtml(p.descripcion||'Sin descripción.')}</p>
        <div class="card-meta">
          <div class="meta-item">
            <span class="meta-label">Beneficiario</span>
            <span class="meta-value">🌍 ${escapeHtml(p.pais_beneficiario)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Creador</span>
            <span class="meta-value">🏳️ ${escapeHtml(p.pais_creador)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Inicio</span>
            <span class="meta-value">📅 ${fmtDate(p.fecha_inicio)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Alcance</span>
            <span class="meta-value"><span class="badge ${p.tipo_alcance}">${p.tipo_alcance}</span></span>
          </div>
          <div class="meta-item" style="grid-column:span 2">
            <span class="meta-label">📍 Ubicación</span>
            <span class="meta-value">
              <span class="geo-link" onclick="abrirMapaEnlace(${lat},${lon})" title="Ver en OpenStreetMap">
                📌 ${escapeHtml(p.ubicacion||'No especificada')}
                ${lat ? `(${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)})` : ''}
              </span>
            </span>
          </div>
        </div>
        <div class="card-tags">
          <span class="tag">💰 ${fmtMoney(p.monto)}</span>
          <span class="tag tech-tag">🤝 ${escapeHtml(p.tipo_apoyo||'—')}</span>
        </div>
        <div class="card-foot">
          <span class="card-org">${escapeHtml(p.organizacion||'—')}</span>
          <div class="card-actions">
            <button class="icon-btn" data-action="edit" data-id="${p.id}" title="Editar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="icon-btn danger" data-action="delete" data-id="${p.id}" title="Eliminar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </article>`;
  }).join('');

  // 5. Actualizar la botonera de navegación
  renderPagination(totalPaginas);
}

// Nueva función para gestionar la interfaz de la paginación
function renderPagination(totalPaginas) {
  const container = $('.pagination-container');
  if (!container) return;

  if (totalPaginas <= 1) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  $('#pageInfo').textContent = `Página ${paginaActual} de ${totalPaginas}`;
  $('#btnPrev').disabled = (paginaActual === 1);
  $('#btnNext').disabled = (paginaActual === totalPaginas);
}

function abrirMapaEnlace(lat, lon) {
  if (lat && lon) {
    window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=12/${lat}/${lon}`,'_blank');
  } else {
    alert('Este programa no tiene coordenadas geográficas.');
  }
}

function renderAll() { renderStats(); renderGrid(); }

// ─── Selects del formulario ───────────────────────────────────────────
function populateSelects() {
  const paisOpts = PAISES.map(p=>
      `<option value="${p.nombre}">${p.nombre} (${p.codigo})</option>`
  ).join('');

  const catOpts = CATEGORIAS.map(c=>
      `<option value="${c.nombre}">${c.icono} ${c.nombre}</option>`
  ).join('');

  const orgOpts = ORGANIZACIONES.map(o=>
      `<option value="${o}">${o}</option>`
  ).join('');

  $('#f-beneficiario').innerHTML = paisOpts;
  $('#f-creador').innerHTML      = paisOpts;
  $('#f-categoria').innerHTML    = `<option value="" disabled selected>Selecciona…</option>${catOpts}`;
  $('#f-organizacion').innerHTML = `<option value="" disabled selected>Selecciona…</option>${orgOpts}`;

  $('#filterCategoria').innerHTML =
      `<option value="">Todas las categorías</option>${
          CATEGORIAS.map(c=>`<option value="${c.nombre}">${c.icono} ${c.nombre}</option>`).join('')
      }`;
}

// ─── Modal ────────────────────────────────────────────────────────────
function openModal(id=null) {
  $('#form').reset();
  $$('.field').forEach(f=>f.classList.remove('invalid'));
  $$('.field .err').forEach(e=>e.textContent='');

  let inicialLat = 20.0, inicialLon = 0.0, tieneCoordenadas = false;

  if (id) {
    editandoId = id;
    $('#modalTitle').textContent = 'Editar programa de cooperación';
    $('#btnSave').textContent    = 'Actualizar programa';
    const prog = programas.find(p=>p.id===id);
    if (prog) {
      $('#f-nombre').value      = prog.nombre;
      $('#f-descripcion').value = prog.descripcion||'';
      $('#f-beneficiario').value= prog.pais_beneficiario;
      $('#f-creador').value     = prog.pais_creador;
      $('#f-alcance').value     = prog.tipo_alcance;
      $('#f-estado').value      = prog.estado;
      $('#f-fecha').value       = (prog.fecha_inicio||'').slice(0,10);
      $('#f-monto').value       = prog.monto||0;
      $('#f-tipo-apoyo').value  = prog.tipo_apoyo||'Económico / Financiero';
      $('#f-categoria').value   = prog.categoria||'';
      $('#f-organizacion').value= prog.organizacion||'';
      $('#f-ubicacion').value   = prog.ubicacion||'';
      const lat = prog.lat ?? null;
      const lon = prog.lng ?? prog.lon ?? null;
      $('#f-lat').value = lat||'';
      $('#f-lon').value = lon||'';
      if (lat && lon) { inicialLat=lat; inicialLon=lon; tieneCoordenadas=true; }
    }
  } else {
    editandoId = null;
    $('#modalTitle').textContent = 'Nuevo programa de cooperación';
    $('#btnSave').textContent    = 'Guardar programa';
    $('#f-alcance').value = 'internacional';
    $('#f-estado').value  = 'activo';
    $('#f-lat').value = '';
    $('#f-lon').value = '';
  }

  $('#modal').classList.add('is-open');

  setTimeout(()=>{
    if (mapaObj) { mapaObj.remove(); mapaObj=null; marcadorObj=null; }
    mapaObj = L.map('mapa-formulario').setView([inicialLat,inicialLon], tieneCoordenadas?9:2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'© OpenStreetMap contributors'
    }).addTo(mapaObj);
    if (tieneCoordenadas) marcadorObj = L.marker([inicialLat,inicialLon]).addTo(mapaObj);
    mapaObj.on('click', e=>{
      $('#f-lat').value = e.latlng.lat;
      $('#f-lon').value = e.latlng.lng;
      if (marcadorObj) marcadorObj.setLatLng(e.latlng);
      else marcadorObj = L.marker(e.latlng).addTo(mapaObj);
    });
    $('#f-nombre').focus();
  }, 220);
}

function closeModal() { $('#modal').classList.remove('is-open'); editandoId=null; }

// ─── Validación ───────────────────────────────────────────────────────
function validateForm() {
  let ok = true;
  $$('.field').forEach(f=>f.classList.remove('invalid'));
  $$('.field .err').forEach(e=>e.textContent='');
  const checks = [
    {id:'f-nombre',      msg:'Indica el nombre del programa.'},
    {id:'f-beneficiario',msg:'Selecciona el país beneficiario.'},
    {id:'f-creador',     msg:'Selecciona el país creador.'},
    {id:'f-alcance',     msg:'Selecciona el tipo de alcance.'},
    {id:'f-estado',      msg:'Selecciona el estado.'},
    {id:'f-fecha',       msg:'Indica la fecha de inicio.'},
    {id:'f-monto',       msg:'Indica un monto válido.'},
    {id:'f-tipo-apoyo',  msg:'Selecciona el tipo de apoyo.'},
    {id:'f-categoria',   msg:'Selecciona una categoría.'},
    {id:'f-organizacion',msg:'Selecciona una organización.'},
    {id:'f-ubicacion',   msg:'Especifica la ubicación geográfica.'},
  ];
  checks.forEach(c=>{
    const el  = $('#'+c.id);
    const val = (el.value||'').toString().trim();
    let invalid = !val;
    if (c.id==='f-monto' && val && Number(val)<0) invalid=true;
    if (invalid) {
      ok=false;
      const field=el.closest('.field');
      field.classList.add('invalid');
      field.querySelector('.err').textContent=c.msg;
    }
  });
  return ok;
}

// ─── Guardar (POST / PUT) ─────────────────────────────────────────────
async function saveForm() {
  if (!validateForm()) { showToast('Revisa los campos marcados en rojo.','error'); return; }

  const data = {
    nombre:           $('#f-nombre').value.trim(),
    descripcion:      $('#f-descripcion').value.trim(),
    pais_beneficiario:$('#f-beneficiario').value,
    pais_creador:     $('#f-creador').value,
    tipo_alcance:     $('#f-alcance').value,
    estado:           $('#f-estado').value,
    fecha_inicio:     $('#f-fecha').value,
    monto:            Number($('#f-monto').value),
    tipo_apoyo:       $('#f-tipo-apoyo').value,
    categoria:        $('#f-categoria').value,
    organizacion:     $('#f-organizacion').value,
    ubicacion:        $('#f-ubicacion').value.trim(),
    lat: $('#f-lat').value ? Number($('#f-lat').value) : null,
    lng: $('#f-lon').value ? Number($('#f-lon').value) : null,
  };

  try {
    if (editandoId !== null) {
      await apiPut(editandoId, data);
      showToast('✅ Programa actualizado correctamente.','success');
    } else {
      await apiPost(data);
      showToast('✅ Programa guardado correctamente.','success');
    }
    closeModal();
    await cargarProgramas();
  } catch(e) {
    showToast('❌ ' + e.message, 'error');
  }
}

// ─── Eliminar (DELETE) ────────────────────────────────────────────────
async function deletePrograma(id) {
  const prog = programas.find(p=>p.id===id);
  if (!prog) return;
  if (!confirm(`¿Eliminar el programa "${prog.nombre}"? Esta acción no se puede deshacer.`)) return;
  try {
    await apiDelete(id);
    showToast('🗑️ Programa eliminado.','success');
    await cargarProgramas();
  } catch(e) {
    showToast('❌ ' + e.message,'error');
  }
}

// ─── Toast ────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type='') {
  const t = $('#toast');
  t.className = 'toast '+type;
  t.innerHTML = msg;
  requestAnimationFrame(()=>t.classList.add('is-visible'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('is-visible'), 2800);
}

// ─── Init ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  populateSelects();
  cargarProgramas();

  $('#btnNew').addEventListener('click', ()=>openModal());
  $('#btnClose').addEventListener('click', closeModal);
  $('#btnCancel').addEventListener('click', closeModal);
  $('#btnSave').addEventListener('click', saveForm);

  $('#btnReset').addEventListener('click', ()=>{
    alert('Los datos viven en MySQL. Para restaurarlos, vuelve a correr el seed.sql.');
  });

  $('#modal').addEventListener('click', e=>{ if(e.target.id==='modal') closeModal(); });
  document.addEventListener('keydown', e=>{
    if(e.key==='Escape' && $('#modal').classList.contains('is-open')) closeModal();
  });
  $('#form').addEventListener('submit', e=>{ e.preventDefault(); saveForm(); });

  // Manejadores de eventos para la paginación
  $('#btnPrev').addEventListener('click', () => {
    if (paginaActual > 1) {
      paginaActual--;
      renderGrid();
    }
  });

  $('#btnNext').addEventListener('click', () => {
    paginaActual++;
    renderGrid();
  });

  // Resetear a la página 1 cuando se altere cualquier filtro o búsqueda
  ['search','filterEstado','filterCategoria','filterAlcance'].forEach(id=>{
    $('#'+id).addEventListener('input', () => { paginaActual = 1; renderGrid(); });
    $('#'+id).addEventListener('change', () => { paginaActual = 1; renderGrid(); });
  });

  $('#grid').addEventListener('click', e=>{
    const btnEdit   = e.target.closest('[data-action="edit"]');
    const btnDelete = e.target.closest('[data-action="delete"]');
    if (btnEdit)   openModal(Number(btnEdit.dataset.id));
    if (btnDelete) deletePrograma(Number(btnDelete.dataset.id));
  });
});