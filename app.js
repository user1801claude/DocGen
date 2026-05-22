/* ═══════════════════════════════════════════════════
   DocGen — Application Controller
   Modes, wizard, fields, preview, export
   ═══════════════════════════════════════════════════ */

// ── State ───────────────────────────────────────────

let currentMode   = null;   // 'dragdrop' | 'wizard' | 'converter'
let currentType   = null;   // 'quote' | 'proforma' | 'invoice' | 'order_confirmation'
let currentValues = {};
let wizardStep    = 0;
let wizardAnswers = {};
let _editingHistoryId = null; // ID of the history entry currently being edited

// ── Service Selection ────────────────────────────────

let selectedService = null;

const SERVICE_PRESETS_MAP = {
  'testing': 'testing',
  'regulatory': 'testing',
  'manufacturing': 'manufacturing',
  'formulation': 'full_service',
};

const SERVICE_LABELS = {
  'testing': 'Compliance & Testing',
  'regulatory': 'Regulatory',
  'manufacturing': 'Contract Manufacturing',
  'formulation': 'Formula Development',
};

function selectService(service, el) {
  selectedService = service;
  document.querySelectorAll('.svc-card').forEach(c => c.classList.remove('selected'));
  if (el) el.classList.add('selected');
  currentValues.stats_preset = SERVICE_PRESETS_MAP[service] || 'testing';
  document.getElementById('serviceStep').classList.add('hidden');
  document.getElementById('docTypeStep').classList.remove('hidden');
  document.getElementById('docTypeServiceBadge').textContent = SERVICE_LABELS[service];
}

function selectDocTypeAndProceed(type) {
  currentType = type;
  activateMode('wizard');
}

function backToServices() {
  document.getElementById('docTypeStep').classList.add('hidden');
  document.getElementById('modeStep').classList.add('hidden');
  document.getElementById('serviceStep').classList.remove('hidden');
  selectedService = null;
}

function backToDocType() {
  document.getElementById('modeStep').classList.add('hidden');
  document.getElementById('docTypeStep').classList.remove('hidden');
  currentType = null;
}

// ── Mode Activation ─────────────────────────────────

function activateMode(mode) {
  currentMode = mode;
  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('dragdropMode').classList.add('hidden');
  document.getElementById('wizardMode').classList.add('hidden');
  document.getElementById('converterMode').classList.add('hidden');

  if (mode === 'dragdrop') {
    document.getElementById('dragdropMode').classList.remove('hidden');
  } else if (mode === 'converter') {
    document.getElementById('converterMode').classList.remove('hidden');
    initConverter();
  } else {
    document.getElementById('wizardMode').classList.remove('hidden');
    startWizard();
  }
}

function resetApp() {
  currentMode = null;
  currentType = null;
  currentValues = {};
  wizardStep = 0;
  wizardAnswers = {};
  selectedService = null;

  document.getElementById('startScreen').classList.remove('hidden');
  document.getElementById('serviceStep').classList.remove('hidden');
  document.getElementById('docTypeStep').classList.add('hidden');
  document.getElementById('modeStep').classList.add('hidden');
  document.getElementById('dragdropMode').classList.add('hidden');
  document.getElementById('wizardMode').classList.add('hidden');
  document.getElementById('converterMode').classList.add('hidden');

  // Reset drag-drop UI
  const dz = document.getElementById('dropZone');
  dz.classList.remove('has-file');
  document.getElementById('dropIcon').textContent = '📂';
  document.getElementById('dropTitle').textContent = 'Drag .md file here';
  document.getElementById('dropSub').textContent = 'or click to browse';
  document.getElementById('fileInput').value = '';
  document.getElementById('contextField').value = '';
  document.getElementById('ddFieldsSection').classList.add('hidden');
  document.getElementById('ddPreviewBar').classList.add('hidden');
  document.getElementById('ddDocCard').innerHTML = emptyHTML('📄', 'Drop a file to begin', 'Your document preview will appear here.');

  // Reset wizard UI
  document.getElementById('wizPreviewBar').classList.add('hidden');
  document.getElementById('wizDocCard').innerHTML = emptyHTML('💬', 'Answer the questions to build your document', 'A live preview will appear as you provide details.');

  // Reset converter UI
  _convType = 'md2pdf';
  _convFileData = null;
  _convFileName = '';
  _convResult = null;
  _convInitialised = false;
  const convDz = document.getElementById('convDropZone');
  if (convDz) {
    convDz.classList.remove('has-file');
    document.getElementById('convDropIcon').textContent = '📂';
    document.getElementById('convDropTitle').textContent = 'Drag .md file here';
    document.getElementById('convDropSub').textContent = 'or click to browse';
    document.getElementById('convFileInput').value = '';
    document.getElementById('convActionSection').style.display = 'none';
    document.getElementById('convPreviewBar').classList.add('hidden');
    document.getElementById('convDocCard').innerHTML = emptyHTML('🔄', 'Drop a file to convert', 'Choose a conversion type on the left, then drop your file.');
  }
}

function emptyHTML(icon, title, sub) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div><div class="empty-sub">${sub}</div></div>`;
}

// ═══════════════════════════════════════════════════
// FUNCTION 1 — DRAG & DROP
// ═══════════════════════════════════════════════════

// Drop zone events
const dropZone = document.getElementById('dropZone');
dropZone.addEventListener('click', () => document.getElementById('fileInput').click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
});

function handleFile(e) {
  if (e.target.files[0]) processFile(e.target.files[0]);
}

function processFile(file) {
  _editingHistoryId = null;
  const reader = new FileReader();
  reader.onload = e => {
    const raw = e.target.result;
    const { fm, body } = parseFrontmatter(raw);
    const type = detectType(raw, fm);
    const values = extractValues(type, fm, body);

    // Update drop zone
    dropZone.classList.add('has-file');
    document.getElementById('dropIcon').textContent = '✅';
    document.getElementById('dropTitle').textContent = file.name;
    document.getElementById('dropSub').textContent = 'Detected: ' + SCHEMAS[type].label;

    currentType = type;
    currentValues = values;
    renderEditableFields('dd');
    generatePreview();

    // Import feedback: count how many fields were auto-filled
    const schema = SCHEMAS[type];
    const totalReq = schema.fields.filter(f => f.req).length;
    const filledReq = schema.fields.filter(f => f.req && values[f.id] && values[f.id].trim()).length;
    const totalFilled = schema.fields.filter(f => values[f.id] && String(values[f.id]).trim()).length;
    const total = schema.fields.length;
    const hasFrontmatter = Object.keys(fm).length > 0;

    if (!hasFrontmatter) {
      showToast(`ℹ️ No YAML frontmatter found — extracted ${totalFilled} fields from body text. Fill in missing fields manually.`, 'info');
    } else if (filledReq === totalReq) {
      showToast(`✅ Imported ${totalFilled}/${total} fields — all required fields filled`, 'success');
    } else {
      const missingReq = schema.fields.filter(f => f.req && (!values[f.id] || !values[f.id].trim())).map(f => f.label);
      showToast(`⚠️ Imported ${totalFilled}/${total} fields — missing required: ${missingReq.join(', ')}`, 'warning');
    }
  };
  reader.readAsText(file);
}

// ── Render Editable Fields ──────────────────────────

function renderEditableFields(prefix) {
  const schema = SCHEMAS[currentType];
  const container = document.getElementById(prefix + 'FieldsContainer');
  const section   = document.getElementById(prefix + 'FieldsSection');

  // Set badge
  const badge = document.getElementById(prefix + 'TypeBadge');
  badge.textContent = schema.label;
  badge.className = 'type-badge ' + schema.cls;

  container.innerHTML = '';

  schema.fields.forEach(f => {
    // Hide the services textarea in wizard mode — services are managed by dropdown rows
    if (f.id === 'services' && currentMode === 'wizard') return;

    const val = currentValues[f.id] !== undefined ? currentValues[f.id] : '';
    const prefilled = val !== '';

    const div = document.createElement('div');
    div.className = 'field-item';

    const dot = prefilled ? '<div class="field-ai-dot" title="AI pre-filled from source data"></div>' : '';
    const req = f.req ? '<span class="field-required">*</span>' : '';

    let input;
    if (f.type === 'select') {
      const opts = (f.options || []).map(o => {
        const sel = (val || f.options[0]) === o ? ' selected' : '';
        const cur = CURRENCIES[o];
        const preset = STATS_PRESETS[o];
        const label = cur ? `${cur.flag} ${o}` : preset ? preset.label : o;
        return `<option value="${o}"${sel}>${label}</option>`;
      }).join('');
      input = `<select class="field-input${prefilled ? ' ai-filled' : ''}" id="${prefix}-f-${f.id}" onchange="onFieldEdit('${f.id}', this.value)">${opts}</select>`;
    } else if (f.type === 'textarea') {
      input = `<textarea class="field-input${prefilled ? ' ai-filled' : ''}" id="${prefix}-f-${f.id}" placeholder="${f.ph || ''}" onchange="onFieldEdit('${f.id}', this.value)" oninput="onFieldEdit('${f.id}', this.value)">${esc(val)}</textarea>`;
    } else {
      input = `<input class="field-input${prefilled ? ' ai-filled' : ''}" type="${f.type}" id="${prefix}-f-${f.id}" value="${escAttr(val)}" placeholder="${f.ph || ''}" onchange="onFieldEdit('${f.id}', this.value)" oninput="onFieldEdit('${f.id}', this.value)">`;
    }

    const hint = f.hint ? `<div class="field-hint">${esc(f.hint).replace(/!(.+?)!/g,'<b style="color:#31AD8A">$1</b>').replace(/~~(.+?)~~/g,'<b style="color:#5A3E8A">$1</b>')}</div>` : '';
    div.innerHTML = `<div class="field-label">${dot}${f.label}${req}</div>${input}${hint}`;
    container.appendChild(div);
  });

  section.classList.remove('hidden');
}

function onFieldEdit(fieldId, value) {
  currentValues[fieldId] = value;
  const prefix = currentMode === 'dragdrop' ? 'dd' : 'wiz';
  const el = document.getElementById(prefix + '-f-' + fieldId);
  if (el) el.classList.remove('field-error');

  if (fieldId === 'currency') {
    _updateSvcPricesForCurrency(value);
  }

  schedulePreviewUpdate();
}

let _previewTimer = null;
function schedulePreviewUpdate() {
  if (_previewTimer) clearTimeout(_previewTimer);
  _previewTimer = setTimeout(() => {
    if (currentType) generatePreview();
  }, 400);
}

// ── Validation ─────────────────────────────────────

function validateFields(showWarnings) {
  if (!currentType) return { ok: false, missing: [] };
  const prefix = currentMode === 'dragdrop' ? 'dd' : 'wiz';
  const schema = SCHEMAS[currentType];
  const missing = [];

  schema.fields.forEach(f => {
    const el = document.getElementById(prefix + '-f-' + f.id);
    if (!el) return;
    const val = (el.value || '').trim();
    if (f.req && !val) {
      missing.push(f.label);
      if (showWarnings) el.classList.add('field-error');
    } else {
      el.classList.remove('field-error');
    }
  });

  if (showWarnings && missing.length > 0) {
    showToast('⚠️ Missing required: ' + missing.join(', '), 'warning');
  }
  return { ok: missing.length === 0, missing };
}

// ── Generate Preview ────────────────────────────────

function generatePreview() {
  if (!currentType) {
    showToast('⚠️ Drop a file first to detect the document type', 'warning');
    return;
  }
  collectFieldValues();

  const html = renderTemplate(currentType, currentValues);

  if (currentMode === 'dragdrop') {
    document.getElementById('ddDocCard').innerHTML = html;
    document.getElementById('ddPreviewBar').classList.remove('hidden');
    document.getElementById('ddPreviewTitle').textContent = SCHEMAS[currentType].label + ' — Preview';
  } else {
    document.getElementById('wizDocCard').innerHTML = html;
    document.getElementById('wizPreviewBar').classList.remove('hidden');
    document.getElementById('wizPreviewTitle').textContent = SCHEMAS[currentType].label + ' — Preview';
  }
}

function collectFieldValues() {
  const prefix = currentMode === 'dragdrop' ? 'dd' : 'wiz';
  SCHEMAS[currentType].fields.forEach(f => {
    if (f.id === 'services' && currentMode === 'wizard') return;
    const el = document.getElementById(prefix + '-f-' + f.id);
    if (el) currentValues[f.id] = el.value;
  });
}

// ═══════════════════════════════════════════════════
// FUNCTION 2 — GUIDED WIZARD (Mini-program)
// ═══════════════════════════════════════════════════

function startWizard() {
  wizardStep = 0;
  wizardAnswers = {};

  const container = document.getElementById('wizardContainer');
  container.innerHTML = '';

  // If doc type already selected from home page, skip to questions
  if (currentType) {
    currentValues = currentValues || {};
    selectDocType(currentType, null);
    return;
  }

  // Fallback: Step 1: Choose document type
  const step = document.createElement('div');
  step.className = 'wiz-step active';
  step.id = 'wiz-s-0';
  step.innerHTML = `
    <div class="wiz-step-header">
      <div class="wiz-step-num">1</div>
      <div class="wiz-step-question">What type of document do you need?</div>
    </div>
    <div class="wiz-step-body">
      <div class="wiz-type-grid">
        <div class="wiz-type-option" onclick="selectDocType('quote', this)">
          <div class="wiz-type-icon">📄</div>
          <div class="wiz-type-name">Quotation</div>
        </div>
        <div class="wiz-type-option" onclick="selectDocType('proforma', this)">
          <div class="wiz-type-icon">💳</div>
          <div class="wiz-type-name">Pro Forma Invoice</div>
        </div>
        <div class="wiz-type-option" onclick="selectDocType('invoice', this)">
          <div class="wiz-type-icon">🧾</div>
          <div class="wiz-type-name">Commercial Invoice</div>
        </div>
        <div class="wiz-type-option" onclick="selectDocType('order_confirmation', this)">
          <div class="wiz-type-icon">✅</div>
          <div class="wiz-type-name">Order Confirmation</div>
        </div>
      </div>
    </div>`;
  container.appendChild(step);
}

function selectDocType(type, el) {
  _editingHistoryId = null;
  currentType = type;
  const savedPreset = currentValues.stats_preset;
  currentValues = {};
  if (savedPreset) currentValues.stats_preset = savedPreset;

  if (el) {
    el.parentElement.querySelectorAll('.wiz-type-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
  }

  const s0 = document.getElementById('wiz-s-0');
  if (s0) {
    s0.classList.remove('active');
    s0.classList.add('done');
  }

  // Auto-fill defaults (dates + common fields)
  const tod = _today();
  // Shared defaults across all types
  currentValues.currency = 'CHF';
  currentValues.stats_preset = 'testing';
  currentValues.vat_rate = '0';
  currentValues.vat_note = 'Export exempt';

  if (type === 'quote') {
    currentValues.date = tod;
    currentValues.valid_until = _addDays(tod, 14);
  } else if (type === 'proforma') {
    currentValues.date = tod;
    currentValues.valid_until = _addDays(tod, 14);
  } else if (type === 'invoice') {
    currentValues.date = tod;
    currentValues.due_date = _addDays(tod, 14);
  } else if (type === 'order_confirmation') {
    currentValues.date = tod;
    currentValues.est_delivery = '3–5 business days after samples received';
  }

  // Build question steps
  wizardStep = 1;
  buildWizardQuestions();
}

function buildWizardQuestions() {
  const questions = WIZARD_QUESTIONS[currentType];
  const container = document.getElementById('wizardContainer');

  questions.forEach((q, i) => {
    const stepNum = i + 2;
    const step = document.createElement('div');
    step.className = 'wiz-step' + (i === 0 ? ' active' : '');
    step.id = 'wiz-s-' + stepNum;

    const inputType = q.type || 'text';
    let inputHTML;
    if (inputType === 'currency') {
      const curSel = currentValues.currency || 'CHF';
      inputHTML = `<div class="currency-picker" id="wiz-cur-picker">
        ${['CHF', 'EUR', 'USD'].map(c => {
          const cur = CURRENCIES[c];
          const sel = c === curSel ? ' selected' : '';
          return `<button class="currency-btn${sel}" data-cur="${c}" onclick="_selectWizCurrency('${c}', ${stepNum})">${cur.flag} ${c}</button>`;
        }).join('')}
      </div>`;
    } else if (inputType === 'services') {
      const catalog = getCatalogForService(selectedService || 'testing');
      const curSel = currentValues.currency || 'CHF';
      inputHTML = `<div class="line-items-hint">Prices are pre-filled from the MSL price sheet — editable if needed</div>
      <div class="svc-header"><span>Service</span><span>Unit</span><span style="text-align:center">Qty</span><span style="text-align:right">Unit price</span><span style="text-align:right">Total</span><span></span></div>
      <div id="wiz-svc-rows">
        <div class="svc-row" data-idx="0">
          ${_buildSvcDropdown(catalog, curSel, 0)}
        </div>
      </div>
      <button class="btn btn-secondary btn-sm svc-add-btn" onclick="_addWizSvcRow()">+ Add line item</button>`;
    } else if (inputType === 'textarea') {
      inputHTML = `<textarea class="field-input" id="wiz-q-${q.id}" placeholder="${q.ph || ''}" oninput="onWizardInput('${q.id}', this.value, ${stepNum})" rows="3"></textarea>`;
    } else {
      inputHTML = `<input class="field-input" type="${inputType}" id="wiz-q-${q.id}" placeholder="${q.ph || ''}" oninput="onWizardInput('${q.id}', this.value, ${stepNum})"${inputType === 'text' ? ` onkeydown="if(event.key==='Enter'){event.preventDefault();advanceWizard(${stepNum});}"` : ''}>`;
    }

    step.innerHTML = `
      <div class="wiz-step-header">
        <div class="wiz-step-num">${stepNum}</div>
        <div class="wiz-step-question">${q.q}</div>
      </div>
      <div class="wiz-step-body">
        ${inputHTML}
        <div class="wiz-nav">
          <button class="btn btn-primary btn-sm" onclick="advanceWizard(${stepNum})">Next →</button>
          <button class="btn btn-ghost btn-sm" onclick="skipWizardStep(${stepNum})">Skip</button>
        </div>
      </div>`;
    container.appendChild(step);
  });

  // Add-ons step (between last question and review)
  const addonsNum = questions.length + 2;
  const addonsStep = document.createElement('div');
  addonsStep.className = 'wiz-step';
  addonsStep.id = 'wiz-s-' + addonsNum;
  addonsStep.innerHTML = `
    <div class="wiz-step-header">
      <div class="wiz-step-num">${addonsNum}</div>
      <div class="wiz-step-question">Optional Add-ons</div>
    </div>
    <div class="wiz-step-body">
      <div class="addons-section" id="addonsContainer">
        ${_buildAddonsUI()}
      </div>
      <div class="wiz-nav">
        <button class="btn btn-primary btn-sm" onclick="advanceWizard(${addonsNum})">Next →</button>
        <button class="btn btn-ghost btn-sm" onclick="skipWizardStep(${addonsNum})">Skip</button>
      </div>
    </div>`;
  container.appendChild(addonsStep);

  // Final step: review + generate
  const finalNum = questions.length + 3;
  const final = document.createElement('div');
  final.className = 'wiz-step';
  final.id = 'wiz-s-' + finalNum;
  final.innerHTML = `
    <div class="wiz-step-header">
      <div class="wiz-step-num">${finalNum}</div>
      <div class="wiz-step-question">Review & Generate</div>
    </div>
    <div class="wiz-step-body" id="wizReviewBody">
      <p style="font-size:13px;color:#6B7280;margin-bottom:12px;">Review your answers below and make any final edits before generating.</p>
      <div id="wizFieldsContainer"></div>
      <div class="type-row" style="margin-top:12px;">
        <span class="type-badge ${SCHEMAS[currentType].cls}" id="wizTypeBadge">${SCHEMAS[currentType].label}</span>
      </div>
      <button class="btn btn-primary btn-full" onclick="generateFromWizard()">📄 Generate Document</button>
    </div>`;
  container.appendChild(final);

  // Focus on first question
  setTimeout(() => {
    const firstInput = document.getElementById('wiz-q-' + questions[0].id);
    if (firstInput) firstInput.focus();
  }, 200);
}

function onWizardInput(fieldId, value, stepNum) {
  wizardAnswers[fieldId] = value;
  currentValues[fieldId] = value;
}



// ── Wizard: service line items with dropdown ──────

function _buildSvcDropdown(catalog, currency, idx) {
  const options = catalog.map(s => {
    const price = getServicePrice(s, currency);
    const star = s.popular ? ' ★' : '';
    const descAttr = s.desc ? ' data-desc="' + s.desc.replace(/\n/g, '<br>').replace(/"/g, '&quot;') + '"' : '';
    return '<option value="' + s.id + '" data-unit="' + s.unit + '" data-price="' + price + '" data-custom="' + (s.custom || false) + '"' + descAttr + '>' + s.name + star + '</option>';
  }).join('');

  const firstItem = catalog[0];
  const firstPrice = getServicePrice(firstItem, currency);
  const firstDesc = (firstItem.desc || '').replace(/\n/g, '<br>');
  const cur = currency || 'CHF';

  return `
    <select class="field-input svc-select" onchange="_onSvcSelect(this)">
      ${options}
    </select>
    <input class="field-input svc-unit" value="${firstItem.unit}" readonly tabindex="-1">
    <input class="field-input svc-qty" type="number" value="1" min="1" step="1" oninput="_syncWizServices()">
    <input class="field-input svc-price" type="number" value="${firstPrice}" step="1" oninput="_syncWizServices()">
    <span class="svc-total">${cur} ${(firstPrice * 1).toFixed(2)}</span>
    <button class="svc-remove-btn" onclick="_removeWizSvcRow(this)" title="Remove">✕</button>
    <input class="field-input svc-desc" type="hidden" value="${firstDesc.replace(/"/g, '&quot;')}">`;
}

function _onSvcSelect(sel) {
  const row = sel.closest('.svc-row');
  const opt = sel.options[sel.selectedIndex];
  const price = parseInt(opt.dataset.price) || 0;
  const unit = opt.dataset.unit;
  const isCustom = opt.dataset.custom === 'true';
  const desc = opt.dataset.desc || '';

  row.querySelector('.svc-unit').value = unit;
  const priceInput = row.querySelector('.svc-price');
  priceInput.value = isCustom ? '' : price;
  if (isCustom) priceInput.placeholder = 'Custom';

  // Auto-fill description from catalog
  const descInput = row.querySelector('.svc-desc');
  if (descInput) descInput.value = desc;

  _syncWizServices();
}

function _addWizSvcRow() {
  const container = document.getElementById('wiz-svc-rows');
  if (!container) return;
  const catalog = getCatalogForService(selectedService || 'testing');
  const curSel = currentValues.currency || 'CHF';
  const idx = container.children.length;
  const row = document.createElement('div');
  row.className = 'svc-row';
  row.dataset.idx = idx;
  row.innerHTML = _buildSvcDropdown(catalog, curSel, idx);
  container.appendChild(row);
  _syncWizServices();
}

function _removeWizSvcRow(btn) {
  const container = document.getElementById('wiz-svc-rows');
  if (container.children.length <= 1) return;
  btn.closest('.svc-row').remove();
  _syncWizServices();
}

function _selectWizCurrency(cur, stepNum) {
  currentValues.currency = cur;
  wizardAnswers.currency = cur;
  // Update button states
  const picker = document.getElementById('wiz-cur-picker');
  if (picker) {
    picker.querySelectorAll('.currency-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.cur === cur);
    });
  }
  // Update service row prices
  _updateSvcPricesForCurrency(cur);
  schedulePreviewUpdate();
}

function _updateSvcPricesForCurrency(newCurrency) {
  const container = document.getElementById('wiz-svc-rows');
  if (!container) return;
  const catalog = getCatalogForService(selectedService || 'testing');

  container.querySelectorAll('.svc-row').forEach(row => {
    const sel = row.querySelector('.svc-select');
    if (!sel) return;
    const selectedId = sel.value;
    const item = catalog.find(s => s.id === selectedId);
    if (item && !item.custom) {
      const newPrice = getServicePrice(item, newCurrency);
      row.querySelector('.svc-price').value = newPrice;
      // Update all option prices in the dropdown
      Array.from(sel.options).forEach(opt => {
        const catItem = catalog.find(s => s.id === opt.value);
        if (catItem) opt.dataset.price = getServicePrice(catItem, newCurrency);
      });
    }
  });

  _syncWizServices();
}

function _syncWizServices() {
  const container = document.getElementById('wiz-svc-rows');
  if (!container) return;
  const cur = currentValues.currency || 'CHF';
  const lines = [];

  container.querySelectorAll('.svc-row').forEach(row => {
    const sel = row.querySelector('.svc-select');
    const name = sel ? sel.options[sel.selectedIndex].text.replace(/\s*★$/, '') : '';
    const unit = row.querySelector('.svc-unit') ? row.querySelector('.svc-unit').value : '';
    const qty = parseInt(row.querySelector('.svc-qty') ? row.querySelector('.svc-qty').value : '1') || 1;
    const price = parseFloat(row.querySelector('.svc-price').value) || 0;
    const desc = row.querySelector('.svc-desc') ? row.querySelector('.svc-desc').value.trim() : '';
    const totalSpan = row.querySelector('.svc-total');
    if (totalSpan) totalSpan.textContent = cur + ' ' + (price * qty).toFixed(2);

    if (name) {
      let line = name + ' | ' + unit + ' | ' + qty + ' | ' + price;
      if (desc) line += ' | ' + desc;
      lines.push(line);
    }
  });

  const value = lines.join('\n');
  wizardAnswers.services = value;
  currentValues.services = value;
  schedulePreviewUpdate();
}

function advanceWizard(fromStep) {
  const step = document.getElementById('wiz-s-' + fromStep);
  step.classList.remove('active');
  step.classList.add('done');

  const next = document.getElementById('wiz-s-' + (fromStep + 1));
  if (next) {
    next.classList.add('active');
    // Focus the input in next step
    const input = next.querySelector('.field-input');
    if (input) setTimeout(() => input.focus(), 100);
    // Scroll to the next step
    next.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // If this is the add-ons step (just before review), populate the review fields
  const questions = WIZARD_QUESTIONS[currentType];
  if (fromStep === questions.length + 2) {
    populateReviewFields();
  }
}

function skipWizardStep(fromStep) {
  advanceWizard(fromStep);
}

function populateReviewFields() {
  // Merge wizard answers into currentValues
  Object.assign(currentValues, wizardAnswers);
  renderEditableFields('wiz');
}

// ── Wizard: Optional Add-ons ────────────────────────

function _buildAddonsUI() {
  const cur = currentValues.currency || 'CHF';
  const items = ['timeline', 'insurance', 'bundle'];
  return items.map(id => {
    const a = ADDONS[id];
    const checked = currentValues['addon_' + id] ? ' checked' : '';
    let priceLabel = a.priceLabel || '';
    if (id === 'insurance') {
      const p = getAddonPrice('insurance', cur);
      priceLabel = cur + ' ' + p;
    }
    return `<div class="addon-item${checked ? ' checked' : ''}" onclick="_toggleAddon('${id}', this)">
      <div class="addon-check">${checked ? '✓' : ''}</div>
      <div class="addon-info">
        <div class="addon-name">${esc(a.label)}</div>
        <div class="addon-desc">${esc(a.description)}</div>
      </div>
      <div class="addon-price">${esc(priceLabel)}</div>
    </div>`;
  }).join('');
}

function _toggleAddon(id, el) {
  const key = 'addon_' + id;
  const isNowOn = !currentValues[key];
  currentValues[key] = isNowOn;

  if (isNowOn) {
    el.classList.add('checked');
    el.querySelector('.addon-check').textContent = '✓';
  } else {
    el.classList.remove('checked');
    el.querySelector('.addon-check').textContent = '';
  }

  schedulePreviewUpdate();
}

function generateFromWizard() {
  collectFieldValues();
  _syncWizServices();
  validateFields(true);
  generatePreview();
}

// ═══════════════════════════════════════════════════
// SAMPLE LOADING
// ═══════════════════════════════════════════════════

function loadSample(type) {
  _editingHistoryId = null;
  const sample = SAMPLES[type];
  currentType = sample.type;
  currentValues = { ...sample.values };

  // Activate drag-drop mode for samples
  activateMode('dragdrop');

  // Update drop zone
  dropZone.classList.add('has-file');
  document.getElementById('dropIcon').textContent = '📄';
  document.getElementById('dropTitle').textContent = 'Sample — ' + SCHEMAS[type].label;
  document.getElementById('dropSub').textContent = 'Loaded from built-in demo data';

  renderEditableFields('dd');
  generatePreview();
}

// ═══════════════════════════════════════════════════
// EXPORT & SAVE
// ═══════════════════════════════════════════════════

function downloadDocument() {
  if (!currentType) return;
  collectFieldValues();
  const v = validateFields(true);
  if (!v.ok) {
    setTimeout(() => _doDownload(), 800);
    return;
  }
  _doDownload();
}

function downloadDocumentPdf() {
  if (!currentType) return;
  collectFieldValues();
  const v = validateFields(true);
  if (!v.ok) {
    setTimeout(() => _doDownloadPdf(), 800);
    return;
  }
  _doDownloadPdf();
}

function _doDownloadPdf() {
  const html = renderTemplate(currentType, currentValues);
  const fullHTML = wrapForExport(html);
  const name = buildFileName();

  if (window.desktopApp && window.desktopApp.savePdf) {
    showToast('⏳ Generating PDF...', 'info');
    window.desktopApp.savePdf(fullHTML, name + '.pdf').then(result => {
      if (result.success) {
        showToast('✅ PDF saved: ' + result.filePath.split(/[/\\]/).pop(), 'success');
        _recordDocHistory();
        _showSuccessScreen(name);
      } else if (result.reason === 'cancelled') {
        showToast('ℹ️ Save cancelled', 'info');
      } else {
        showToast('❌ PDF save failed: ' + result.reason, 'error');
      }
    });
    return;
  }

  const w = window.open('', '_blank');
  if (!w || w.closed) {
    showToast('⚠️ Popup blocked — please allow popups and try again', 'warning');
    return;
  }
  w.document.write(fullHTML);
  w.document.close();
  setTimeout(() => {
    w.print();
    showToast('💡 In the print dialog, select "Save as PDF"', 'info');
    _recordDocHistory();
    _showSuccessScreen(name);
  }, 500);
}

// ── Success Screen (shown after PDF download) ────────

function _showSuccessScreen(fileName) {
  const schema = SCHEMAS[currentType];
  const ref = currentValues.order_number || '';
  const client = currentValues.client_company || currentValues.client_name || '';
  const serviceLabel = SERVICE_LABELS[selectedService] || '';

  const container = document.getElementById('wizardContainer');
  if (!container) return; // Only works in wizard mode

  container.innerHTML = `
    <div class="success-screen">
      <div class="success-icon">✓</div>
      <h2 class="success-title">${esc(schema.label)} generated</h2>
      <p class="success-detail">
        ${ref ? 'Ref: ' + esc(ref) : ''}${serviceLabel ? ' · ' + esc(serviceLabel) : ''}
        ${client ? '<br>Client: ' + esc(client) : ''}
      </p>
      <div class="success-card">
        <div class="success-card-header">
          <span>${esc(schema.label)}${ref ? ' — ' + esc(ref) : ''}</span>
          <span class="success-card-cur">${esc(currentValues.currency || 'CHF')}</span>
        </div>
        <div class="success-card-body">
          <div class="success-card-file">${esc(fileName)}.pdf</div>
        </div>
      </div>
      <div class="success-actions">
        <button class="btn btn-primary" onclick="downloadDocumentPdf()">↓ Download PDF</button>
        <button class="btn btn-secondary" onclick="_startNewDocument()">+ New document</button>
      </div>
      <button class="success-back" onclick="resetApp()">← Back to Services</button>
    </div>`;
}

function _startNewDocument() {
  // Go back to doc type selection, keeping the same service
  currentType = null;
  currentValues = {};
  wizardStep = 0;
  wizardAnswers = {};
  document.getElementById('wizPreviewBar').classList.add('hidden');
  document.getElementById('wizDocCard').innerHTML = emptyHTML('💬', 'Answer the questions to build your document', 'A live preview will appear as you provide details.');
  document.getElementById('wizardMode').classList.add('hidden');
  document.getElementById('startScreen').classList.remove('hidden');
  document.getElementById('serviceStep').classList.add('hidden');
  document.getElementById('docTypeStep').classList.remove('hidden');
}

function _doDownload() {
  const html = renderTemplate(currentType, currentValues);
  const fullHTML = wrapForExport(html);
  const name = buildFileName();

  const blob = new Blob([fullHTML], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name + '.html';
  a.click();
  URL.revokeObjectURL(a.href);

  showToast('✅ Downloaded: ' + name + '.html');
  _recordDocHistory();
}

function saveToFolder() {
  // In a real Vercel app, this would save to a server-side output folder.
  // In this local version, we use the download mechanism.
  downloadDocument();
}

function buildFileName() {
  const v = currentValues;
  const client = (v.client_company || v.client_name || 'client').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const ref = v.order_number || '';
  const typeLabels = { quote: 'Quote', proforma: 'ProForma', invoice: 'CommInvoice', order_confirmation: 'OrderConf' };
  const typeLabel = typeLabels[currentType] || currentType;
  const date = (v.date || _today()).replace(/-/g, '');
  return ref ? `${typeLabel}_${ref}` : `${typeLabel}_${client}_${date}`;
}

// ── Toast ───────────────────────────────────────────

// ═══════════════════════════════════════════════════
// FUNCTION 3 — FILE CONVERTER
// ═══════════════════════════════════════════════════

let _convType     = 'md2pdf';   // 'md2pdf' | 'pdf2md' | 'md2txt'
let _convFileData = null;       // raw file content (text or ArrayBuffer)
let _convFileName = '';
let _convResult   = null;       // { blob, ext, preview }

const _CONV_ACCEPT = {
  md2pdf:   '.md,.txt,.markdown',
  pdf2md:   '.pdf',
  md2txt:   '.md,.txt,.markdown',
  html2pdf: '.html,.htm',
};

const _CONV_DROP_LABEL = {
  md2pdf:   { title: 'Drag .md file here', sub: 'or click to browse' },
  pdf2md:   { title: 'Drag .pdf file here', sub: 'or click to browse' },
  md2txt:   { title: 'Drag .md file here', sub: 'or click to browse' },
  html2pdf: { title: 'Drag .html file here', sub: 'or click to browse' },
};

let _convInitialised = false;
function initConverter() {
  // Only wire up event listeners once (avoids resetting state when revisiting the tab)
  if (_convInitialised) return;
  _convInitialised = true;
  const dz = document.getElementById('convDropZone');
  const fi = document.getElementById('convFileInput');
  dz.onclick = () => fi.click();
  dz.ondragover = e => { e.preventDefault(); dz.classList.add('drag-over'); };
  dz.ondragleave = () => dz.classList.remove('drag-over');
  dz.ondrop = e => {
    e.preventDefault();
    dz.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) processConvFile(e.dataTransfer.files[0]);
  };
  selectConvType('md2pdf', document.querySelector('.conv-type-option.selected'));
}

function selectConvType(type, el) {
  const prevType = _convType;
  _convType = type;
  // Visual
  document.querySelectorAll('.conv-type-option').forEach(o => o.classList.remove('selected'));
  if (el) el.classList.add('selected');
  // Update accept + labels
  document.getElementById('convFileInput').accept = _CONV_ACCEPT[type];
  const lbl = _CONV_DROP_LABEL[type];

  // Check if file type is compatible — MD-based types are interchangeable, HTML stays separate
  const mdTypes = ['md2pdf', 'md2txt'];
  const wasCompatible = (mdTypes.includes(prevType) && mdTypes.includes(type))
    || (prevType === 'pdf2md' && type === 'pdf2md')
    || (prevType === 'html2pdf' && type === 'html2pdf');

  if (_convFileData && wasCompatible) {
    // Keep the file and auto-reconvert
    _convResult = null;
    runConversion();
    return;
  }

  // Incompatible switch — reset file state
  _convFileData = null;
  _convFileName = '';
  _convResult = null;
  document.getElementById('convDropTitle').textContent = lbl.title;
  document.getElementById('convDropSub').textContent = lbl.sub;
  const dz = document.getElementById('convDropZone');
  dz.classList.remove('has-file');
  document.getElementById('convDropIcon').textContent = '📂';
  document.getElementById('convFileInput').value = '';
  document.getElementById('convActionSection').style.display = 'none';
  document.getElementById('convPreviewBar').classList.add('hidden');
  document.getElementById('convDocCard').innerHTML = emptyHTML('🔄', 'Drop a file to convert', 'Choose a conversion type on the left, then drop your file.');
}

function handleConvFile(e) {
  if (e.target.files[0]) processConvFile(e.target.files[0]);
}

function processConvFile(file) {
  _convFileName = file.name;
  const isPdf = _convType === 'pdf2md';
  const isHtml = _convType === 'html2pdf';

  // Validate file type
  if (isPdf && !file.name.toLowerCase().endsWith('.pdf')) {
    showToast('⚠️ Please drop a .pdf file for PDF → MD conversion', 'warning');
    return;
  }
  if (isHtml && !file.name.match(/\.(html?|htm)$/i)) {
    showToast('⚠️ Please drop an .html file for HTML → PDF conversion', 'warning');
    return;
  }
  if (!isPdf && !isHtml && !file.name.match(/\.(md|txt|markdown)$/i)) {
    showToast('⚠️ Please drop an .md or .txt file for this conversion', 'warning');
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    _convFileData = e.target.result;

    // Update drop zone
    const dz = document.getElementById('convDropZone');
    dz.classList.add('has-file');
    document.getElementById('convDropIcon').textContent = '✅';
    document.getElementById('convDropTitle').textContent = file.name;
    document.getElementById('convDropSub').textContent = _fmtFileSize(file.size);

    // Show action section
    const act = document.getElementById('convActionSection');
    act.style.display = '';
    const labels = { md2pdf: 'Markdown → PDF', pdf2md: 'PDF → Markdown', md2txt: 'Markdown → Plain Text', html2pdf: 'HTML → PDF' };
    document.getElementById('convFileInfo').innerHTML =
      `<span class="conv-file-name">${esc(file.name)}</span> <span class="conv-file-size">(${_fmtFileSize(file.size)})</span> — ${labels[_convType]}`;

    // Auto-convert and show preview
    runConversion();
  };

  if (isPdf) {
    reader.readAsArrayBuffer(file);
  } else {
    reader.readAsText(file);
  }
}

function _fmtFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── Markdown → HTML renderer (lightweight) ─────────

function _mdToHtml(md, titleToStrip) {
  // Strip YAML frontmatter
  let text = md.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');

  // Strip first H1 if it matches the extracted title (avoids duplicate in MSL wrapper)
  if (titleToStrip) {
    text = text.replace(/^#\s+(.+)$/m, (match, h1text) => {
      return h1text.trim() === titleToStrip.trim() ? '' : match;
    });
  }

  // Strip emojis for professional output (line-by-line to preserve structure)
  text = text.split('\n').map(l => _stripEmoji(l)).join('\n');

  // Escape HTML
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Fenced code blocks (``` ... ```)
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="lang-${lang}">${code.trimEnd()}</code></pre>`;
  });

  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headings (must be before bold)
  text = text.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Horizontal rule
  text = text.replace(/^---+\s*$/gm, '<hr>');

  // Strikethrough (must come before bold/italic to avoid conflicts)
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Bold + italic (asterisk and underscore variants)
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  text = text.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/(?<!\w)_(.+?)_(?!\w)/g, '<em>$1</em>');

  // Obsidian callouts in blockquotes: &gt; [!type] → styled blockquote
  text = text.replace(/^&gt;\s*\[!(\w+)\]\s*(.*)$/gm, (_, type, rest) => {
    return `<blockquote><strong>${type.charAt(0).toUpperCase() + type.slice(1)}:</strong> ${rest}</blockquote>`;
  });

  // Blockquote
  text = text.replace(/^&gt;\s?(.+)$/gm, '<blockquote>$1</blockquote>');
  // Merge consecutive blockquotes
  text = text.replace(/<\/blockquote>\n<blockquote>/g, '\n');

  // Images and links (sanitise URLs — block javascript: protocol)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    if (/^\s*javascript:/i.test(src)) return alt;
    return `<img src="${src}" alt="${alt}">`;
  });
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    if (/^\s*javascript:/i.test(href)) return label;
    return `<a href="${href}">${label}</a>`;
  });

  // Obsidian wikilinks: [[Page|Display]] and [[Page]]
  text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '<a>$2</a>');
  text = text.replace(/\[\[([^\]]+)\]\]/g, '<a>$1</a>');

  // Tables
  text = _convertTables(text);

  // Lists (unordered + ordered) with nesting support
  text = _convertLists(text);

  // Wrap bare lines in paragraphs (skip tags, empty lines, and elements already wrapped)
  const lines = text.split('\n');
  const block = /^<(h[1-6]|p|pre|ul|ol|li|blockquote|table|thead|tbody|tr|th|td|hr|div|img)/;
  const result = [];
  let inPre = false;
  for (const line of lines) {
    if (line.includes('<pre')) inPre = true;
    if (line.includes('</pre>')) { inPre = false; result.push(line); continue; }
    if (inPre) { result.push(line); continue; }
    const trimmed = line.trim();
    if (!trimmed) { result.push(''); continue; }
    if (block.test(trimmed) || trimmed.startsWith('</')) { result.push(line); continue; }
    result.push(`<p>${trimmed}</p>`);
  }

  return result.join('\n');
}

function _splitTableRow(line) {
  // Split on | but preserve empty cells; trim leading/trailing pipes
  let s = line;
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map(c => c.trim());
}

function _convertTables(text) {
  const lines = text.split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    // Detect table: line with |, followed by separator |---|, followed by more | lines
    if (lines[i] && lines[i].includes('|') && i + 1 < lines.length && /^\|?\s*[-:|]+\s*\|/.test(lines[i + 1])) {
      const headerCells = _splitTableRow(lines[i]);
      const aligns = _splitTableRow(lines[i + 1]).map(c => {
        if (c.startsWith(':') && c.endsWith(':')) return 'center';
        if (c.endsWith(':')) return 'right';
        return 'left';
      });

      let table = '<table><thead><tr>';
      headerCells.forEach((c, idx) => {
        const a = aligns[idx] || 'left';
        table += `<th style="text-align:${a}">${c}</th>`;
      });
      table += '</tr></thead><tbody>';

      i += 2; // skip header + separator
      while (i < lines.length && lines[i].includes('|')) {
        const cells = _splitTableRow(lines[i]);
        table += '<tr>';
        // Ensure we emit the same number of cells as headers
        for (let ci = 0; ci < headerCells.length; ci++) {
          const a = aligns[ci] || 'left';
          table += `<td style="text-align:${a}">${cells[ci] !== undefined ? cells[ci] : ''}</td>`;
        }
        table += '</tr>';
        i++;
      }
      table += '</tbody></table>';
      out.push(table);
    } else {
      out.push(lines[i]);
      i++;
    }
  }

  return out.join('\n');
}

function _convertLists(text) {
  const lines = text.split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    // Detect start of a list block (unordered or ordered)
    const ulMatch = lines[i].match(/^(\s*)([-*])\s+(.+)$/);
    const olMatch = !ulMatch && lines[i].match(/^(\s*)(\d+)\.\s+(.+)$/);

    if (ulMatch || olMatch) {
      // Collect all consecutive list items
      const items = [];
      while (i < lines.length) {
        const um = lines[i].match(/^(\s*)([-*])\s+(.+)$/);
        const om = !um && lines[i].match(/^(\s*)(\d+)\.\s+(.+)$/);
        if (!um && !om) break;
        const m = um || om;
        const indent = m[1].length;
        const level = Math.floor(indent / 2);
        const ordered = !!om;
        items.push({ level, text: m[3], ordered });
        i++;
      }

      // Build nested HTML
      let html = '';
      const stack = []; // stack of { level, ordered }

      for (const item of items) {
        const tag = item.ordered ? 'ol' : 'ul';
        while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
          const popped = stack.pop();
          html += `</li></${popped.ordered ? 'ol' : 'ul'}>`;
        }
        if (stack.length === 0 || item.level > stack[stack.length - 1].level) {
          html += `<${tag}>`;
          stack.push({ level: item.level, ordered: item.ordered });
        } else {
          html += '</li>';
        }
        html += `<li>${item.text}`;
      }
      // Close remaining
      while (stack.length > 0) {
        const popped = stack.pop();
        html += `</li></${popped.ordered ? 'ol' : 'ul'}>`;
      }

      out.push(html);
    } else {
      out.push(lines[i]);
      i++;
    }
  }

  return out.join('\n');
}

// ── Markdown → Plain Text ──────────────────────────

function _mdToPlainText(md) {
  // Strip YAML frontmatter
  let text = md.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');

  // Strip emojis for professional output (line-by-line to preserve structure)
  text = text.split('\n').map(l => _stripEmoji(l)).join('\n');

  // Code blocks → keep content, remove fences
  text = text.replace(/```\w*\n([\s\S]*?)```/g, '$1');

  // Headings → uppercase text with underline
  text = text.replace(/^####\s+(.+)$/gm, (_, t) => t.toUpperCase());
  text = text.replace(/^###\s+(.+)$/gm, (_, t) => '\n' + t.toUpperCase());
  text = text.replace(/^##\s+(.+)$/gm, (_, t) => '\n' + t.toUpperCase() + '\n' + '─'.repeat(t.length));
  text = text.replace(/^#\s+(.+)$/gm, (_, t) => t.toUpperCase() + '\n' + '═'.repeat(t.length));

  // Bold / italic → strip markers
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/_(.+?)_/g, '$1');

  // Inline code → strip backticks
  text = text.replace(/`([^`]+)`/g, '$1');

  // Links → "text (url)"
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '[Image: $1]');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');

  // Obsidian wikilinks [[...]]
  text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
  text = text.replace(/\[\[([^\]]+)\]\]/g, '$1');

  // Obsidian callouts: > [!type] → "TYPE:" prefix
  text = text.replace(/^>\s*\[!(\w+)\]\s*(.*)$/gm, (_, type, rest) => {
    return '  ' + type.toUpperCase() + ':' + (rest ? ' ' + rest : '');
  });

  // Blockquote markers
  text = text.replace(/^>\s?/gm, '  ');

  // Horizontal rules
  text = text.replace(/^---+\s*$/gm, '────────────────────');

  // Table: extract rows as tab-separated
  text = _convertTableToText(text);

  // List markers: keep as-is (they're already readable)

  // Clean up excessive blank lines
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

function _convertTableToText(text) {
  const lines = text.split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i] && lines[i].includes('|') && i + 1 < lines.length && /^\|?\s*[-:|]+\s*\|/.test(lines[i + 1])) {
      const headerCells = _splitTableRow(lines[i]);
      // Compute column widths
      const allRows = [headerCells];
      let j = i + 2;
      while (j < lines.length && lines[j].includes('|')) {
        allRows.push(_splitTableRow(lines[j]));
        j++;
      }
      const colWidths = [];
      for (let c = 0; c < headerCells.length; c++) {
        colWidths[c] = Math.max(...allRows.map(r => (r[c] || '').length), 3);
      }
      // Render
      const sep = colWidths.map(w => '─'.repeat(w + 2)).join('┼');
      out.push(allRows[0].map((c, idx) => c.padEnd(colWidths[idx])).join('  │  '));
      out.push(sep);
      for (let r = 1; r < allRows.length; r++) {
        out.push(allRows[r].map((c, idx) => (c || '').padEnd(colWidths[idx] || 0)).join('  │  '));
      }
      i = j;
    } else {
      out.push(lines[i]);
      i++;
    }
  }

  return out.join('\n');
}

// ── PDF → Markdown (text extraction via pdf.js) ────

let _pdfJsLoaded = false;
function _loadPdfJs() {
  return new Promise((resolve, reject) => {
    if (_pdfJsLoaded && window.pdfjsLib) { resolve(); return; }
    // Show loading indicator
    const docCard = document.getElementById('convDocCard');
    if (docCard) docCard.innerHTML = '<div class="empty-state"><div class="empty-icon">📡</div><div class="empty-title">Loading PDF reader...</div></div>';

    // Try local bundle first (desktop app), then fall back to CDN (web use)
    const localPath = 'lib/pdf.min.js';
    const cdnPath = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    const localWorker = 'lib/pdf.worker.min.js';
    const cdnWorker = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    function tryLoad(src, workerSrc, fallback) {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
        _pdfJsLoaded = true;
        resolve();
      };
      s.onerror = () => {
        if (fallback) {
          fallback();
        } else {
          reject(new Error('Failed to load PDF reader. If you are offline, make sure you ran "node setup.js" first.'));
        }
      };
      document.head.appendChild(s);
    }

    // Try local first → CDN fallback
    tryLoad(localPath, localWorker, () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return reject(new Error('You are offline and the local PDF library was not found. Run "node setup.js" to download it.'));
      }
      tryLoad(cdnPath, cdnWorker, null);
    });
  });
}

async function _pdfToMarkdown(arrayBuffer) {
  // Desktop app: use native Node.js pdfjs-dist via IPC (no browser script loading needed)
  if (window.desktopApp && window.desktopApp.extractPdfText) {
    const result = await window.desktopApp.extractPdfText(arrayBuffer);
    if (!result.success) throw new Error(result.reason || 'PDF extraction failed');
    let md = '';
    result.pages.forEach((pageLines, idx) => {
      for (const line of pageLines) {
        if (line.fontSize >= 20) md += `# ${line.text}\n\n`;
        else if (line.fontSize >= 16) md += `## ${line.text}\n\n`;
        else if (line.fontSize >= 14) md += `### ${line.text}\n\n`;
        else md += line.text + '\n';
      }
      if (idx < result.pages.length - 1) md += '\n---\n\n';
    });
    md = md.replace(/([^\n])\n([^\n#\-|>*\d])/g, '$1 $2');
    md = md.replace(/\n{3,}/g, '\n\n');
    return md.trim();
  }

  // Web fallback: load pdf.js from CDN
  await _loadPdfJs();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  let md = '';

  for (let p = 1; p <= totalPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items;

    if (items.length === 0) continue;

    // Group items by Y position to form lines
    const lineMap = new Map();
    items.forEach(item => {
      const y = Math.round(item.transform[5]); // Y coordinate
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push({ text: item.str, x: item.transform[4], fontSize: item.height || 12 });
    });

    // Sort by Y descending (PDF coords: bottom-up)
    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);

    for (const y of sortedYs) {
      const lineItems = lineMap.get(y).sort((a, b) => a.x - b.x);
      const lineText = lineItems.map(i => i.text).join(' ').trim();
      if (!lineText) continue;

      // Heuristic: detect headings by font size
      const maxFontSize = Math.max(...lineItems.map(i => i.fontSize));
      if (maxFontSize >= 20) {
        md += `# ${lineText}\n\n`;
      } else if (maxFontSize >= 16) {
        md += `## ${lineText}\n\n`;
      } else if (maxFontSize >= 14) {
        md += `### ${lineText}\n\n`;
      } else {
        md += lineText + '\n';
      }
    }

    if (p < totalPages) md += '\n---\n\n';
  }

  // Clean up: merge single newlines into paragraphs, keep double newlines as breaks
  md = md.replace(/([^\n])\n([^\n#\-|>*\d])/g, '$1 $2');
  md = md.replace(/\n{3,}/g, '\n\n');

  return md.trim();
}

// ── Run Conversion ─────────────────────────────────

async function runConversion() {
  if (!_convFileData) {
    showToast('⚠️ Drop a file first', 'warning');
    return;
  }

  const docCard = document.getElementById('convDocCard');
  docCard.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-title">Converting...</div></div>';

  try {
    if (_convType === 'md2pdf') {
      const title = _extractMdTitle(_convFileData);
      const bodyHtml = _mdToHtml(_convFileData, title);
      const mslInner = _renderMslWrapper(bodyHtml, title, _convFileData);
      const pdfHtml = _buildPdfHtml(mslInner);
      _convResult = { html: pdfHtml, preview: mslInner, ext: 'pdf', type: 'md2pdf' };
      docCard.innerHTML = mslInner;

    } else if (_convType === 'pdf2md') {
      const mdText = await _pdfToMarkdown(_convFileData);
      _convResult = { text: mdText, ext: 'md', type: 'pdf2md' };
      // Preview: render the extracted MD
      const html = _mdToHtml(mdText);
      docCard.innerHTML = `<div class="conv-preview-md">${html}</div>`;

    } else if (_convType === 'md2txt') {
      const plain = _mdToPlainText(_convFileData);
      _convResult = { text: plain, ext: 'txt', type: 'md2txt' };
      docCard.innerHTML = `<div class="conv-preview-txt">${plain.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`;

    } else if (_convType === 'html2pdf') {
      // HTML→PDF: pass through as-is, no wrapping or modification
      const pdfHtml = _convFileData;
      _convResult = { html: pdfHtml, ext: 'pdf', type: 'html2pdf' };
      docCard.innerHTML = `<iframe srcdoc="${pdfHtml.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" style="width:100%;min-width:820px;border:none;min-height:800px;background:#fff;" onload="this.style.height=this.contentDocument.body.scrollHeight+40+'px'"></iframe>`;
    }

    // Show preview bar
    document.getElementById('convPreviewBar').classList.remove('hidden');
    const labels = { md2pdf: 'PDF Preview', pdf2md: 'Extracted Markdown', md2txt: 'Plain Text', html2pdf: 'PDF Preview' };
    document.getElementById('convPreviewTitle').textContent = labels[_convType];

    showToast('✅ Conversion complete — preview ready', 'success');

  } catch (err) {
    console.error('Conversion error:', err);
    docCard.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Conversion Failed</div><div class="empty-sub">${esc(err.message)}</div></div>`;
    showToast('❌ Conversion failed: ' + err.message, 'warning');
  }
}

// ── Extract title from MD (first H1 or filename) ───

function _extractMdTitle(md) {
  // Try first H1 — most reliable for document title
  const h1 = md.match(/^#\s+(.+)/m);
  if (h1) return h1[1].trim();
  // Try frontmatter title/subject (not "client" — that's a company name, not a title)
  const fmMatch = md.match(/^---\s*\n[\s\S]*?\n---/);
  if (fmMatch) {
    const titleMatch = fmMatch[0].match(/(?:title|subject|project_title):\s*["']?(.+?)["']?\s*$/m);
    if (titleMatch) return titleMatch[1].trim();
  }
  // Fallback to filename
  return _convFileName.replace(/\.[^.]+$/, '');
}

// ── Extract title from HTML ───────────────────────

function _extractHtmlTitle(html) {
  // Try <title> tag
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleTag && titleTag[1].trim()) return titleTag[1].trim();
  // Try first <h1>
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return h1[1].replace(/<[^>]+>/g, '').trim();
  // Fallback to filename
  return _convFileName.replace(/\.[^.]+$/, '');
}

// ── Extract body content from HTML ────────────────

function _extractHtmlBody(html) {
  // Strip emojis line-by-line for professional output
  let content = html;

  // Try to extract just the <body> content
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    content = bodyMatch[1];
  } else {
    // No <body> tag — strip <head>, <html>, <!DOCTYPE> etc.
    content = content.replace(/<!DOCTYPE[^>]*>/i, '');
    content = content.replace(/<html[^>]*>/i, '').replace(/<\/html>/i, '');
    content = content.replace(/<head[^>]*>[\s\S]*?<\/head>/i, '');
  }

  // Remove <script> and <style> blocks (security + clean output)
  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Strip event handler attributes (onclick, onerror, etc.) for security
  content = content.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  content = content.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');

  // Strip emojis for professional output (line-by-line to preserve structure)
  content = content.split('\n').map(l => _stripEmoji(l)).join('\n');

  return content.trim();
}

// ── Wrap content in MySwissLab branded template ────

function _extractMdDate(md) {
  const fmMatch = md.match(/^---\s*\n[\s\S]*?\n---/);
  if (fmMatch) {
    const dateMatch = fmMatch[0].match(/(?:date):\s*["']?(\d{4}-\d{2}-\d{2})["']?\s*$/m);
    if (dateMatch) {
      const d = new Date(dateMatch[1] + 'T00:00:00');
      if (!isNaN(d)) return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  }
  return null;
}

function _renderMslWrapper(bodyHtml, title, mdSource) {
  const docDate = (mdSource ? _extractMdDate(mdSource) : null) ||
    new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return `
  <!-- MSL branded header -->
  <div class="quote-header-bar">
    <div class="quote-logo-text">MySwissLab<sup class="quote-logo-plus">+</sup></div>
    <div class="quote-header-right">
      <span>${COMPANY.email}</span>
      <span>${COMPANY.phone}</span>
    </div>
  </div>

  <!-- Document title -->
  <div style="margin-bottom:20px;">
    <div class="quote-label">DOCUMENT</div>
    <div class="quote-title">${esc(title)}</div>
    <div style="font-size:11px;color:#6e6e73;margin-top:4px;">${docDate} · Converted from ${esc(_convFileName)}</div>
  </div>

  <!-- Stats bar -->
  ${statsBarBlock({ stats_preset: 'general' })}

  <!-- Rendered content -->
  <div class="msl-conv-body">
    ${bodyHtml}
  </div>

  <!-- Footer -->
  <div class="msl-footer">${COMPANY.legal} · VAT: ${COMPANY.vat}<br>myswisslab.ch</div>`;
}

// ── Build PDF HTML for print (MSL branded) ─────────

function _buildPdfHtml(mslInnerHtml) {
  // MSL_CSS is defined in templates.js — reuse it + add MD content styling
  const mdContentCss = `
.msl-conv-body { margin-top: 20px; font-size: 12px; line-height: 1.7; }
.msl-conv-body h1 { font-size: 18px; font-weight: 700; margin: 20px 0 8px; color: #1a6b4a; border-bottom: 1px solid #d2d2d7; padding-bottom: 6px; }
.msl-conv-body h2 { font-size: 15px; font-weight: 700; margin: 18px 0 6px; color: #1a6b4a; }
.msl-conv-body h3 { font-size: 13px; font-weight: 700; margin: 14px 0 4px; color: #333; }
.msl-conv-body h4 { font-size: 12px; font-weight: 700; margin: 10px 0 4px; color: #555; }
.msl-conv-body p { margin: 0 0 8px; }
.msl-conv-body ul, .msl-conv-body ol { margin: 0 0 8px; padding-left: 20px; }
.msl-conv-body li { margin-bottom: 3px; }
.msl-conv-body strong { font-weight: 700; }
.msl-conv-body em { font-style: italic; }
.msl-conv-body code { background: #f3f4f6; padding: 1px 5px; border-radius: 3px; font-family: 'SF Mono', monospace; font-size: 0.9em; }
.msl-conv-body pre { background: #1f2937; color: #e5e7eb; padding: 12px 14px; border-radius: 8px; overflow-x: auto; margin: 0 0 10px; font-size: 11px; line-height: 1.5; }
.msl-conv-body pre code { background: none; padding: 0; color: inherit; }
.msl-conv-body blockquote { border-left: 3px solid #1a6b4a; padding: 6px 14px; margin: 0 0 8px; background: #e8f4ef; color: #555; font-style: italic; border-radius: 0 6px 6px 0; }
.msl-conv-body hr { border: none; border-top: 1px solid #d2d2d7; margin: 14px 0; }
.msl-conv-body table { width: 100%; border-collapse: collapse; margin: 0 0 10px; font-size: 11px; }
.msl-conv-body th { text-align: left; padding: 6px 8px; border-bottom: 2px solid #d2d2d7; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; color: #6e6e73; }
.msl-conv-body td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; }
.msl-conv-body a { color: #1a6b4a; text-decoration: underline; }
.msl-conv-body img { max-width: 100%; border-radius: 6px; }`;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>${esc(_convFileName.replace(/\.[^.]+$/, ''))} — MySwissLab</title>
<style>${MSL_CSS}
${mdContentCss}
@media print { .no-print { display: none } @page { margin: 1.5cm; } }
</style></head><body>
${mslInnerHtml}
<button class="no-print" onclick="window.print()" style="position:fixed;bottom:20px;right:20px;background:#1a6b4a;color:white;border:none;padding:10px 22px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.2)">⬇ Print / Save PDF</button>
</body></html>`;
}

// ── Download Conversion Result ─────────────────────

function downloadConversion() {
  if (!_convResult) {
    showToast('⚠️ Nothing to download — convert a file first', 'warning');
    return;
  }

  const baseName = _convFileName.replace(/\.[^.]+$/, '');

  if (_convResult.type === 'md2pdf' || _convResult.type === 'html2pdf') {
    // Desktop app: use native Save dialog → real PDF file
    if (window.desktopApp && window.desktopApp.savePdf) {
      const defaultName = baseName + '.pdf';
      showToast('⏳ Generating PDF...', 'info');
      window.desktopApp.savePdf(_convResult.html, defaultName).then(result => {
        if (result.success) {
          showToast('✅ PDF saved: ' + result.filePath.split(/[/\\]/).pop(), 'success');
          _recordConvHistory();
        } else if (result.reason === 'cancelled') {
          showToast('ℹ️ Save cancelled', 'info');
        } else {
          showToast('❌ PDF save failed: ' + result.reason, 'error');
        }
      });
      return;
    }
    // Web fallback: open in new window for print-to-PDF
    const w = window.open('', '_blank');
    if (!w || w.closed) {
      showToast('⚠️ Popup blocked — please allow popups for this site and try again', 'warning');
      return;
    }
    w.document.write(_convResult.html);
    w.document.close();
    setTimeout(() => {
      w.print();
      showToast('💡 In the print dialog, select "Save as PDF" as the destination to download your PDF file', 'info');
      _recordConvHistory();
    }, 500);
    return;
  }

  // Text-based downloads (MD, TXT)
  const mimeTypes = { md: 'text/markdown', txt: 'text/plain' };
  const blob = new Blob([_convResult.text], { type: mimeTypes[_convResult.ext] || 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = baseName + '.' + _convResult.ext;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('✅ Downloaded: ' + baseName + '.' + _convResult.ext, 'success');
  _recordConvHistory();
}

// ═══════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════

function showToast(msg, type) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.remove('toast-warning', 'toast-success', 'toast-info');
  if (type) toast.classList.add('toast-' + type);
  toast.classList.add('show');
  const dur = type === 'warning' ? 4000 : 2500;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), dur);
}

// ═══════════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════════

let _history = [];

function toggleHistory() {
  const overlay = document.getElementById('historyOverlay');
  overlay.classList.toggle('hidden');
}

function addToHistory(entry) {
  // entry: { type, label, name, detail, timestamp, data? }
  entry.timestamp = new Date();
  entry.id = Date.now();
  _history.unshift(entry); // newest first
  _updateHistoryUI();
}

function _updateHistoryUI() {
  const body = document.getElementById('historyBody');
  const count = document.getElementById('historyCount');
  count.textContent = _history.length || '';

  if (_history.length === 0) {
    body.innerHTML = '<div class="history-empty">No documents yet. Create or convert a document to see it here.</div>';
    return;
  }

  body.innerHTML = _history.map(h => {
    const time = h.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const date = h.timestamp.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const typeCls = h.type.startsWith('conv') ? 'ht-converter' : 'ht-' + h.type;
    const editBtn = h.snapshot
      ? `<button class="btn btn-primary btn-sm" onclick="editHistory(${h.id})">✏ Edit</button>`
      : '';
    const editedBadge = h.edited ? '<span class="history-item-edited">edited</span>' : '';
    return `<div class="history-item">
      <div class="history-item-top">
        <span class="history-item-type ${typeCls}">${esc(h.label)}</span>
        <span class="history-item-time">${editedBadge}${date} ${time}</span>
      </div>
      <div class="history-item-name">${esc(h.name)}</div>
      <div class="history-item-detail">${esc(h.detail)}</div>
      <div class="history-item-actions">
        <button class="btn btn-outline btn-sm" onclick="redownloadHistory(${h.id})">↓ Download</button>
        ${editBtn}
      </div>
    </div>`;
  }).join('');
}

function redownloadHistory(id) {
  const h = _history.find(e => e.id === id);
  if (!h) return;
  if (h.downloadFn) h.downloadFn();
  else showToast('This item cannot be re-downloaded', 'info');
}

function editHistory(id) {
  const h = _history.find(e => e.id === id);
  if (!h || !h.snapshot) return;

  const savedValues = { ...h.snapshot.values };
  const savedType = h.snapshot.type;
  if (h.snapshot.selectedService) selectedService = h.snapshot.selectedService;

  _editingHistoryId = id;
  currentType = savedType;

  // Activate wizard mode — this builds all steps with defaults
  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('dragdropMode').classList.add('hidden');
  document.getElementById('wizardMode').classList.remove('hidden');
  document.getElementById('converterMode').classList.add('hidden');
  currentMode = 'wizard';

  // Build wizard (startWizard sees currentType is set, calls selectDocType which resets currentValues)
  startWizard();

  // Restore saved values on top of the defaults selectDocType created
  Object.assign(currentValues, savedValues);
  wizardAnswers = { ...savedValues };

  // Pre-fill all wizard text/date inputs
  const questions = WIZARD_QUESTIONS[savedType];
  questions.forEach(q => {
    if (q.type === 'services' || q.type === 'currency') return;
    const input = document.getElementById('wiz-q-' + q.id);
    if (input && savedValues[q.id]) input.value = savedValues[q.id];
  });

  // Pre-fill currency buttons
  const curVal = savedValues.currency || 'CHF';
  const picker = document.getElementById('wiz-cur-picker');
  if (picker) {
    picker.querySelectorAll('.currency-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.cur === curVal);
    });
  }

  // Pre-fill service rows from saved services string
  if (savedValues.services) {
    const svcContainer = document.getElementById('wiz-svc-rows');
    if (svcContainer) {
      const lines = savedValues.services.split('\n').filter(l => l.trim());
      const catalog = getCatalogForService(selectedService || 'testing');
      svcContainer.innerHTML = '';
      lines.forEach((line, idx) => {
        const parts = line.split(' | ');
        const name = (parts[0] || '').trim();
        const unit = (parts[1] || '').trim();
        const qty = parseInt(parts[2]) || 1;
        const price = parseFloat(parts[3]) || 0;
        const desc = (parts[4] || '').trim();
        const row = document.createElement('div');
        row.className = 'svc-row';
        row.dataset.idx = idx;
        row.innerHTML = _buildSvcDropdown(catalog, curVal, idx);
        svcContainer.appendChild(row);
        // Select the matching service in dropdown
        const sel = row.querySelector('.svc-select');
        if (sel) {
          const matchOpt = Array.from(sel.options).find(o => o.text.replace(/\s*★$/, '') === name);
          if (matchOpt) sel.value = matchOpt.value;
        }
        // Fill unit, qty, price
        const unitInput = row.querySelector('.svc-unit');
        if (unitInput) unitInput.value = unit;
        const qtyInput = row.querySelector('.svc-qty');
        if (qtyInput) qtyInput.value = qty;
        const priceInput = row.querySelector('.svc-price');
        if (priceInput) priceInput.value = price;
        const descInput = row.querySelector('.svc-desc');
        if (descInput) descInput.value = desc;
        const totalSpan = row.querySelector('.svc-total');
        if (totalSpan) totalSpan.textContent = curVal + ' ' + (price * qty).toFixed(2);
      });
    }
  }

  // Pre-fill add-on checkboxes
  ['timeline', 'insurance', 'bundle'].forEach(addonId => {
    if (savedValues['addon_' + addonId]) {
      const addonEl = document.querySelector(`.addon-item[onclick*="${addonId}"]`);
      if (addonEl && !addonEl.classList.contains('checked')) {
        addonEl.classList.add('checked');
        addonEl.querySelector('.addon-check').textContent = '✓';
      }
    }
  });

  // Open all steps so the user can see/edit everything
  document.querySelectorAll('.wiz-step').forEach(s => {
    s.classList.add('active');
    s.classList.remove('done');
  });

  generatePreview();
  toggleHistory();
  showToast('📝 Editing: ' + h.name, 'info');
}

function _recordDocHistory() {
  if (!currentType) return;
  const schema = SCHEMAS[currentType];
  const name = buildFileName();
  const client = currentValues.client_company || currentValues.client_name || 'Unknown';

  if (_editingHistoryId !== null) {
    const h = _history.find(e => e.id === _editingHistoryId);
    _editingHistoryId = null;
    if (h) {
      h.name = name;
      h.detail = 'For: ' + client;
      h.snapshot = { type: currentType, values: { ...currentValues }, selectedService: selectedService };
      h.downloadFn = () => { _doDownloadSilent(); };
      h.edited = true;
      _updateHistoryUI();
      return;
    }
  }

  addToHistory({
    type: currentType,
    label: schema.label.replace(/[^\w\s]/g, '').trim(),
    name: name,
    detail: 'For: ' + client,
    downloadFn: () => { _doDownloadPdf(); },
    snapshot: { type: currentType, values: { ...currentValues }, selectedService: selectedService },
  });
}

function _doDownloadSilent() {
  if (!currentType) return;
  collectFieldValues();
  const html = renderTemplate(currentType, currentValues);
  const fullHTML = wrapForExport(html);
  const name = buildFileName();
  const blob = new Blob([fullHTML], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name + '.html';
  a.click();
  URL.revokeObjectURL(a.href);
}

function _recordConvHistory() {
  if (!_convResult) return;
  const labels = { md2pdf: 'MD to PDF', pdf2md: 'PDF to MD', md2txt: 'MD to TXT', html2pdf: 'HTML to PDF' };
  const baseName = _convFileName.replace(/\.[^.]+$/, '');
  addToHistory({
    type: 'conv-' + _convType,
    label: labels[_convType] || 'Conversion',
    name: baseName + '.' + _convResult.ext,
    detail: 'From: ' + _convFileName,
    downloadFn: () => { downloadConversion(); },
  });
}

// ── Version Badge ────────────────────────────────────
(function () {
  if (window.desktopApp && window.desktopApp.version) {
    const el = document.getElementById('appVersion');
    if (el) el.textContent = 'v' + window.desktopApp.version;
  }
})();
