// =====================================================================
//  script.js — Lógica My Maps con soporte para carga masiva CSV
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
  'Ayuda humanitaria','Infraestructura','Protección ambiental','Salud pública',
  'Asistencia técnica','Seguridad alimentaria','Telecomunicaciones','Seguridad y paz',
  'Educación','Energía renovable','Finanzas sostenibles','Gestión del riesgo','Medio ambiente'
].sort();

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
  'GIZ','UNESCO','Oxfam','Fundación AVINA',
].sort((a,b) => a.localeCompare(b,'es'));

// ─── Configuración estilo My Maps ─────────────────────────────────────
const CONFIG_APOYO = {
  'Económico / Financiero':       { color: '#27ae60', icon: '💰' },
  'Asistencia Técnica':           { color: '#2980b9', icon: '⚙️' },
  'Insumos / Especie':            { color: '#e67e22', icon: '📦' },
  'Capacitación':                 { color: '#9b59b6', icon: '🎓' },
  'Mixto (Económico y Técnico)':  { color: '#16a085', icon: '🔄' },
  'Por defecto':                  { color: '#7f8c8d', icon: '📌' }
};

// ─── Estado global ────────────────────────────────────────────────────
let programas           = [];
let editandoId          = null;
let mapaObj             = null;
let marcadorObj         = null;
let leafletWorldMapObj  = null;
let markerGroupLayer    = null;

let paginaActual        = 1;
const elementosPorPagina = 6;

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

async function apiEstadisticasPaises() {
  const r = await fetch(`${API}/estadisticas/paises`);
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || 'Error al cargar estadísticas');
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

// ─── Renderizado del Dashboard principal ──────────────────────────────
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
    renderPagination(0);
    return;
  }

  const totalPaginas = Math.ceil(filteredList.length / elementosPorPagina);
  if (paginaActual > totalPaginas) paginaActual = Math.max(1, totalPaginas);

  const inicio = (paginaActual - 1) * elementosPorPagina;
  const fin    = inicio + elementosPorPagina;
  const itemsPaginados = filteredList.slice(inicio, fin);

  $('#grid').innerHTML = itemsPaginados.map(p => {
    const lat   = p.lat   ?? null;
    const lon   = p.lng   ?? p.lon ?? null;
    return `
      <article class="card">
        <div class="card-head">
          <div class="card-title">🏷️ ${escapeHtml(p.nombre)}</div>
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
              <span class="geo-link" onclick="abrirMapaEnlace(${lat},${lon})" style="color: #3282b8; cursor:pointer;">
                📌 ${escapeHtml(p.ubicacion||'No especificada')}
              </span>
            </span>
          </div>
        </div>
        <div class="card-tags">
          <span class="tag" style="background:#e3f5ee; color:#138a72; font-weight:600;">💰 ${fmtMoney(p.monto)}</span>
          <span class="tag tech-tag">🤝 ${escapeHtml(p.tipo_apoyo||'—')}</span>
        </div>
        <div class="card-foot">
          <span class="card-org">${escapeHtml(p.organizacion||'—')}</span>
          <div class="card-actions">
            <button class="icon-btn" data-action="edit" data-id="${p.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button class="icon-btn danger" data-action="delete" data-id="${p.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg></button>
          </div>
        </div>
      </article>`;
  }).join('');

  renderPagination(totalPaginas);
}

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
  if (lat && lon) window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=12/${lat}/${lon}`,'_blank');
}

function renderAll() { renderStats(); renderGrid(); }

function populateSelects() {
  const paisOpts = PAISES.map(p=> `<option value="${p.nombre}">${p.nombre}</option>`).join('');
  const catOpts  = CATEGORIAS.map(c=> `<option value="${c}">${c}</option>`).join('');
  const orgOpts  = ORGANIZACIONES.map(o=> `<option value="${o}">${o}</option>`).join('');

  $('#f-beneficiario').innerHTML = paisOpts;
  $('#f-creador').innerHTML      = paisOpts;
  $('#f-categoria').innerHTML    = `<option value="" disabled selected>Selecciona…</option>${catOpts}`;
  $('#f-organizacion').innerHTML = `<option value="" disabled selected>Selecciona…</option>${orgOpts}`;
  $('#filterCategoria').innerHTML = `<option value="">Todas las categorías</option>${CATEGORIAS.map(c=>`<option value="${c}">${c}</option>`).join('')}`;
}

// ─── Modal Formulario Manual ─────────────────────────────────────────
function openModal(id=null) {
  $('#form').reset();
  $$('.field').forEach(f=>f.classList.remove('invalid'));

  let inicialLat = 20.0, inicialLon = 0.0, tieneCoordenadas = false;

  if (id) {
    editandoId = id;
    $('#modalTitle').textContent = 'Editar programa de cooperación';
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
      $('#f-tipo-apoyo').value  = prog.tipo_apoyo;
      $('#f-categoria').value   = prog.categoria;
      $('#f-organizacion').value= prog.organizacion;
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
    $('#f-lat').value = ''; $('#f-lon').value = '';
  }

  $('#modal').classList.add('is-open');

  setTimeout(()=>{
    if (mapaObj) { mapaObj.remove(); mapaObj=null; marcadorObj=null; }
    mapaObj = L.map('mapa-formulario').setView([inicialLat,inicialLon], tieneCoordenadas?9:2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapaObj);
    if (tieneCoordenadas) marcadorObj = L.marker([inicialLat,inicialLon]).addTo(mapaObj);
    mapaObj.on('click', e=>{
      $('#f-lat').value = e.latlng.lat;
      $('#f-lon').value = e.latlng.lng;
      if (marcadorObj) marcadorObj.setLatLng(e.latlng);
      else marcadorObj = L.marker(e.latlng).addTo(mapaObj);
    });
  }, 220);
}

function closeModal() { $('#modal').classList.remove('is-open'); editandoId=null; }

async function saveForm() {
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
    if (editandoId !== null) await apiPut(editandoId, data);
    else await apiPost(data);
    closeModal();
    await cargarProgramas();
    showToast('✅ Registro procesado exitosamente.', 'success');
  } catch(e) { showToast('❌ Error: ' + e.message, 'error'); }
}

async function deletePrograma(id) {
  if (!confirm('¿Eliminar este registro permanentemente de MySQL?')) return;
  try {
    await apiDelete(id);
    await cargarProgramas();
    showToast('🗑️ Registro removido.', 'success');
  } catch(e) { showToast('❌ Error al eliminar.', 'error'); }
}

async function abrirEstadisticasPaises() {
  $('#modalStats').classList.add('is-open');
  try {
    const datos = await apiEstadisticasPaises();
    $('#statsPaisesBody').innerHTML = datos.map(d => `
      <tr>
        <td>${escapeHtml(d.pais)}</td>
        <td class="num">${fmtMoney(d.ayuda_recibida)}</td>
        <td class="num given" style="color:#138a72;">${fmtMoney(d.ayuda_otorgada)}</td>
        <td class="num count">${d.total_programas}</td>
      </tr>`).join('');
  } catch(e) { $('#statsPaisesBody').innerHTML = '<tr><td colspan="4">Error de carga.</td></tr>'; }
}

function closeStatsModal() { $('#modalStats').classList.remove('is-open'); }

// =====================================================================
// ─── MAPA INTERACTIVO ESTILO GOOGLE MY MAPS ──────────────────────────
// =====================================================================
function abrirMapaMundial() {
  $('#modalWorldMap').classList.add('is-open');
  setTimeout(() => {
    if (!leafletWorldMapObj) construirMyMaps();
    else { leafletWorldMapObj.invalidateSize(); cargarMarcadoresMyMaps(); }
  }, 50);
}

function cerrarMapaMundial() { $('#modalWorldMap').classList.remove('is-open'); }

function construirMyMaps() {
  leafletWorldMapObj = L.map('worldmap').setView([12.0, -10.0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletWorldMapObj);
  markerGroupLayer = L.layerGroup().addTo(leafletWorldMapObj);
  cargarMarcadoresMyMaps();
}

function cargarMarcadoresMyMaps() {
  if (!markerGroupLayer) return;
  markerGroupLayer.clearLayers();

  $('#sidebar-content').innerHTML = `<div style="color:#6b7c93; font-style:italic; font-size:13px; text-align:center; margin-top:60px;">Haz clic en cualquier pin para cargar su información completa.</div>`;

  const coordenadasMap = {};
  programas.forEach(p => {
    const lat = p.lat ?? null; const lng = p.lng ?? p.lon ?? null;
    if (lat && lng) {
      const key = `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
      if (!coordenadasMap[key]) coordenadasMap[key] = [];
      coordenadasMap[key].push(p);
    }
  });

  Object.keys(coordenadasMap).forEach(key => {
    const listaCasos = coordenadasMap[key];
    const primerCaso = listaCasos[0];
    const latlng = key.split(',').map(Number);
    const config = CONFIG_APOYO[primerCaso.tipo_apoyo] || CONFIG_APOYO['Por defecto'];

    const pinStyleHtml = `
      <div style="background-color:${config.color}; width:32px; height:32px; border-radius:50% 50% 50% 0; position:relative; transform:rotate(-45deg); display:grid; place-items:center; border:2px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.35);">
        <span style="transform:rotate(45deg); font-size:14px;">${config.icon}</span>
      </div>`;

    const divIcon = L.divIcon({ html: pinStyleHtml, className:'mymaps-pin-wrapper', iconSize:[32,32], iconAnchor:[16,32] });
    const marcador = L.marker(latlng, { icon: divIcon });

    marcador.on('click', () => mostrarCasosEnSidebar(listaCasos));
    marcador.bindTooltip(listaCasos.length === 1 ? `<strong>${escapeHtml(primerCaso.nombre)}</strong>` : `<strong>${listaCasos.length} Casos agrupados aquí</strong>`);
    markerGroupLayer.addLayer(marcador);
  });
}

function mostrarCasosEnSidebar(listaCasos) {
  const contenedor = $('#sidebar-content');
  contenedor.innerHTML = listaCasos.length > 1 ? `<div style="background:#e6f0fa; padding:10px; border-radius:6px; font-size:12px; font-weight:600; color:#0f4c75; margin-bottom:14px; border-left:4px solid #3282b8;">📂 Coincidencia Múltiple: ${listaCasos.length} programas en este punto.</div>` : '';

  listaCasos.forEach((p, idx) => {
    const config = CONFIG_APOYO[p.tipo_apoyo] || CONFIG_APOYO['Por defecto'];
    contenedor.innerHTML += `
      <div style="border:1px solid #e2e8f0; border-radius:8px; padding:14px; margin-bottom:14px; background:#fff; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
        <div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:8px;">
          <span style="background:${config.color}15; padding:5px; border-radius:6px; font-size:14px;">${config.icon}</span>
          <h4 style="font-size:13.5px; font-weight:700; color:#1f2d3d; line-height:1.35; margin:0;">${escapeHtml(p.nombre)}</h4>
        </div>
        <p style="font-size:12px; color:#6b7c93; margin-bottom:12px; line-height:1.45;">${escapeHtml(p.descripcion || 'Sin descripción.')}</p>
        <div style="display:flex; flex-direction:column; gap:5px; font-size:11.5px; border-top:1px solid #f1f5f9; padding-top:8px; color:#1f2d3d;">
          <div><strong style="color:#6b7c93;">🌍 Beneficiario:</strong> ${escapeHtml(p.pais_beneficiario)}</div>
          <div><strong style="color:#6b7c93;">🏳️ Creador:</strong> ${escapeHtml(p.pais_creador)}</div>
          <div><strong style="color:#6b7c93;">💼 Ejecutor:</strong> ${escapeHtml(p.organizacion)}</div>
          <div><strong style="color:#6b7c93;">🤝 Apoyo:</strong> <span style="color:${config.color}; font-weight:600;">${escapeHtml(p.tipo_apoyo)}</span></div>
          <div><strong style="color:#6b7c93;">💰 Monto:</strong> <span style="color:#27ae60; font-weight:700;">${fmtMoney(p.monto)}</span></div>
          <div><strong style="color:#6b7c93;">📅 Inicio:</strong> ${fmtDate(p.fecha_inicio)}</div>
          <div><strong style="color:#6b7c93;">📍 Región:</strong> ${escapeHtml(p.ubicacion||'—')}</div>
        </div>
      </div>`;
  });
}

// ─── PROCESADOR DEL ARCHIVO CSV ADICIONADO ───────────────────────────
function inicializarManejadorCSV() {
  const btnUpload = $('#btnUploadCSV');
  const fileInput = $('#csvFileInput');
  if (!btnUpload || !fileInput) return;

  btnUpload.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    if (!archivo.name.endsWith('.csv')) {
      showToast('❌ El archivo seleccionado debe ser un formato .csv válido.', 'error');
      return;
    }

    const lector = new FileReader();
    lector.onload = async (evento) => {
      try {
        const registros = parsearTextoCSV(evento.target.result);
        if (registros.length === 0) throw new Error('El archivo CSV no contiene filas legibles.');

        showToast('⏳ Cargando registros masivos a MySQL...', 'info');
        const respuesta = await fetch(`${API}/programas/cargar-csv`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filas: registros })
        });
        const resJson = await respuesta.json();
        if (!respuesta.ok) throw new Error(resJson.error);

        showToast(`🎉 ${resJson.message}`, 'success');
        await cargarProgramas();
      } catch (err) { showToast('❌ Error CSV: ' + err.message, 'error'); }
      finally { fileInput.value = ''; }
    };
    lector.readAsText(archivo, 'UTF-8');
  });
}

function parsearTextoCSV(texto) {
  const lineas = texto.split(/\r?\n/);
  if (lineas.length < 2) return [];
  const cabeceras = lineas[0].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
  const resultado = [];

  for (let i = 1; i < lineas.length; i++) {
    const lineaActual = lineas[i].trim();
    if (!lineaActual) continue;
    const columnas = lineaActual.split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));
    const objFila = {};
    cabeceras.forEach((cab, index) => { objFila[cab] = columnas[index] || ''; });
    resultado.push(objFila);
  }
  return resultado;
}

function parsearTextoCSV(texto) {
  const lineas = texto.split(/\r?\n/);
  if (lineas.length < 2) return [];

  // DETECTOR AUTOMÁTICO DE SEPARADOR: Evalúa si la cabecera usa punto y coma o comas
  const primerLinea = lineas[0];
  const separador = primerLinea.includes(';') ? ';' : ',';

  // Extraer cabeceras limpiando espacios y comillas involuntarias
  const cabeceras = primerLinea.split(separador).map(c => c.trim().replace(/^["']|["']$/g, ''));
  const resultado = [];

  for (let i = 1; i < lineas.length; i++) {
    const lineaActual = lineas[i].trim();
    if (!lineaActual) continue; // Saltarse líneas vacías al final del archivo

    // Cortar la línea usando el separador detectado
    const columnas = lineaActual.split(separador).map(col => col.trim().replace(/^["']|["']$/g, ''));

    const objFila = {};
    cabeceras.forEach((cab, index) => {
      // Si el campo viene vacío o dice "null" en texto, lo dejamos como string vacío para que el servidor lo sanitice
      let valor = columnas[index] || '';
      if (valor === 'null' || valor === 'NULL') valor = '';
      objFila[cab] = valor;
    });

    resultado.push(objFila);
  }
  return resultado;
}

// ─── Toasts del sistema ───────────────────────────────────────────────
let toastTimer;
function showToast(msg, type='') {
  const t = $('#toast'); t.className = 'toast '+type; t.innerHTML = msg;
  requestAnimationFrame(()=>t.classList.add('is-visible'));
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>t.classList.remove('is-visible'), 2800);
}

// ─── Inicialización global ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  populateSelects();
  cargarProgramas();
  inicializarManejadorCSV();

  $('#btnNew').addEventListener('click', ()=>openModal());
  $('#btnClose').addEventListener('click', closeModal);
  $('#btnCancel').addEventListener('click', closeModal);
  $('#btnSave').addEventListener('click', saveForm);
  $('#btnStats').addEventListener('click', abrirEstadisticasPaises);
  $('#btnCloseStats').addEventListener('click', closeStatsModal);
  $('#btnCloseStats2').addEventListener('click', closeStatsModal);
  $('#btnWorldMap').addEventListener('click', abrirMapaMundial);
  $('#btnCloseWorldMap').addEventListener('click', cerrarMapaMundial);
  $('#btnCloseWorldMap2').addEventListener('click', cerrarMapaMundial);

  $('#btnReset').addEventListener('click', () => alert('Usa "node setup-db.js" en la consola para resetear la BD de MySQL.'));
  $('#form').addEventListener('submit', e=>{ e.preventDefault(); saveForm(); });

  $('#btnPrev').addEventListener('click', () => { if (paginaActual > 1) { paginaActual--; renderGrid(); } });
  $('#btnNext').addEventListener('click', () => { paginaActual++; renderGrid(); });

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
