/* ═══════════════════════════════════════════════════
   DocGen — Core Engine  (MySwissLab templates)
   Parsing, detection, field schemas, value extraction
   ═══════════════════════════════════════════════════ */

// ── Company Constants ───────────────────────────────

const COMPANY = {
  name: 'MySwissLab',
  legal: 'SBR Group Sàrl (MySwissLab)',
  email: 'hello@myswisslab.ch',
  phone: '+41 21 781 16 84',
  address: '1B Route de l\'industrie, 1072 Forel (Lavaux), Switzerland',
  vat: 'CHE-454.205.462',
  bank: 'Banque Raiffeisen Lausanne-Haute-Broye-Jorat',
  bic: 'RAIFCH22',
  bankDetails: {
    CHF: { iban: 'CH60 8080 8002 4143 2892 7', iid: '80451', bic: 'RAIFCH22' },
    EUR: { iban: 'CH65 8080 8005 8713 8992 2', iid: '80451', bic: 'RAIFCH22' },
    USD: { iban: 'CH98 8080 8001 8697 8809 1', iid: '80808', bic: 'RAIFCH22' },
  },
  // Default (CHF) for backward compat
  iid: '80451',
  iban: 'CH60 8080 8002 4143 2892 7',
};

// ── Stats Bar Presets ────────────────────────────────

const STATS_PRESETS = {
  'testing': {
    label: 'Testing & Compliance',
    stats: [
      { num: '2018', lbl: 'FOUNDED' },
      { num: '100+', lbl: 'BRANDS SERVED' },
      { num: '3–5 Days', lbl: 'CPSR TURNAROUND' },
      { num: '4×', lbl: 'ISO CERTIFIED' },
      { num: 'EU · UK · ME', lbl: 'MARKETS COVERED' },
    ]
  },
  'manufacturing': {
    label: 'Private Label Manufacturing',
    stats: [
      { num: '2018', lbl: 'FOUNDED' },
      { num: '100+', lbl: 'BRANDS SERVED' },
      { num: '500+', lbl: 'FORMULAS DEVELOPED' },
      { num: 'GMP', lbl: 'CERTIFIED PRODUCTION' },
      { num: 'EU · UK · ME', lbl: 'MARKETS COVERED' },
    ]
  },
  'full_service': {
    label: 'Full Service (Testing + Manufacturing)',
    stats: [
      { num: '2018', lbl: 'FOUNDED' },
      { num: '100+', lbl: 'BRANDS SERVED' },
      { num: '500+', lbl: 'PRODUCTS LAUNCHED' },
      { num: '4× ISO', lbl: 'CERTIFIED' },
      { num: 'EU · UK · ME', lbl: 'MARKETS COVERED' },
    ]
  },
  'general': {
    label: 'General (No Service Focus)',
    stats: [
      { num: '2018', lbl: 'FOUNDED' },
      { num: '100+', lbl: 'BRANDS SERVED' },
      { num: 'Swiss', lbl: 'QUALITY STANDARDS' },
      { num: '4× ISO', lbl: 'CERTIFIED' },
      { num: 'EU · UK · ME', lbl: 'MARKETS COVERED' },
    ]
  },
};

// ── Field Schemas ────────────────────────────────────

const SCHEMAS = {
  quote: {
    label: '📄 Quotation', cls: 'quote',
    fields: [
      { id:'client_company', label:'Client Company',       type:'text',     req:true,  ph:'e.g. Maison Élara Beauté' },
      { id:'client_name',    label:'Contact Person',       type:'text',     req:true,  ph:'e.g. Sophie Laurent' },
      { id:'client_email',   label:'Client Email',         type:'text',     req:false, ph:'sophie@elara-beaute.fr' },
      { id:'client_phone',   label:'Client Phone',         type:'text',     req:false, ph:'+33 1 42 00 00 00' },
      { id:'client_address', label:'Client Address',       type:'text',     req:false, ph:'42 Rue du Faubourg, 75008 Paris, France' },
      { id:'client_vat',     label:'Client VAT Number',    type:'text',     req:false, ph:'FR 76 987 654 321' },
      { id:'order_number',   label:'Order / Reference #',  type:'text',     req:true,  ph:'2026-0320' },
      { id:'date',           label:'Date Issued',          type:'date',     req:true,  ph:'' },
      { id:'valid_until',    label:'Valid Until',           type:'date',     req:false, ph:'' },
      { id:'currency',       label:'Currency',              type:'select',   req:false, ph:'', options:['CHF','EUR','USD'] },
      { id:'stats_preset',   label:'Stats Bar Style',        type:'select',   req:false, ph:'', options:['testing','manufacturing','full_service','general'] },
      { id:'subtitle',       label:'Tagline / Summary',    type:'text',     req:false, ph:'5 products, !EU-ready! in ~~weeks~~.', hint:'Use !text! for teal and ~~text~~ for purple. Example: 5 products, !EU-ready! in ~~weeks~~.' },
      { id:'description',    label:'Brief Description',    type:'textarea', req:false, ph:'Safety assessment, variant CPSR & microbiological testing...' },
      { id:'services',       label:'Services (one per line — flexible format)', type:'textarea', req:true, ph:'Service name, CHF 250, QTY 3\nor: Name | Detail | Qty | Price\nor: Service name CHF 175' },
      { id:'vat_rate',       label:'VAT Rate (%)',          type:'number',   req:false, ph:'0' },
      { id:'vat_note',       label:'VAT Note',              type:'text',     req:false, ph:'export exempt' },
      { id:'deposit_pct',   label:'Deposit Required (%)',   type:'number',   req:false, ph:'0 (e.g. 20 for 20%)' },
      { id:'notes',          label:'Notes',                 type:'textarea', req:false, ph:'' },
    ]
  },
  proforma: {
    label: '💳 Pro Forma Invoice', cls: 'proforma',
    fields: [
      { id:'client_company', label:'Client Company',       type:'text',     req:true,  ph:'e.g. Maison Élara Beauté' },
      { id:'client_name',    label:'Contact Person',       type:'text',     req:true,  ph:'e.g. Sophie Laurent' },
      { id:'client_email',   label:'Client Email',         type:'text',     req:false, ph:'' },
      { id:'client_phone',   label:'Client Phone',         type:'text',     req:false, ph:'' },
      { id:'client_address', label:'Client Address',       type:'text',     req:false, ph:'' },
      { id:'client_vat',     label:'Client VAT Number',    type:'text',     req:false, ph:'' },
      { id:'order_number',   label:'Order / Reference #',  type:'text',     req:true,  ph:'OC-2026-0320' },
      { id:'date',           label:'Date Issued',          type:'date',     req:true,  ph:'' },
      { id:'valid_until',    label:'Valid Until',           type:'date',     req:false, ph:'' },
      { id:'currency',       label:'Currency',              type:'select',   req:false, ph:'', options:['CHF','EUR','USD'] },
      { id:'stats_preset',   label:'Stats Bar Style',        type:'select',   req:false, ph:'', options:['testing','manufacturing','full_service','general'] },
      { id:'description',    label:'Service Offer / Description', type:'textarea', req:false, ph:'e.g. Private Label Contract Manufacturing — Facial Cleanser 100ml, 2000 pcs' },
      { id:'services',       label:'Services (one per line — flexible format)', type:'textarea', req:true, ph:'Service name, CHF 250, QTY 3\nor: Name | Detail | Qty | Price\nor: Service name CHF 175' },
      { id:'vat_rate',       label:'VAT Rate (%)',          type:'number',   req:false, ph:'0' },
      { id:'vat_note',       label:'VAT Note',              type:'text',     req:false, ph:'export exempt' },
      { id:'deposit_pct',   label:'Deposit Required (%)',   type:'number',   req:false, ph:'0 (e.g. 20 for 20%)' },
      { id:'notes',          label:'Notes',                 type:'textarea', req:false, ph:'' },
    ]
  },
  invoice: {
    label: '🧾 Commercial Invoice', cls: 'invoice',
    fields: [
      { id:'client_company', label:'Client Company',       type:'text',     req:true,  ph:'e.g. Maison Élara Beauté' },
      { id:'client_name',    label:'Contact Person',       type:'text',     req:true,  ph:'' },
      { id:'client_email',   label:'Client Email',         type:'text',     req:false, ph:'' },
      { id:'client_phone',   label:'Client Phone',         type:'text',     req:false, ph:'' },
      { id:'client_address', label:'Client Address',       type:'text',     req:false, ph:'' },
      { id:'client_vat',     label:'Client VAT Number',    type:'text',     req:false, ph:'' },
      { id:'order_number',   label:'Order / Reference #',  type:'text',     req:true,  ph:'OC-2026-0320' },
      { id:'date',           label:'Date Issued',          type:'date',     req:true,  ph:'' },
      { id:'due_date',       label:'Payment Due Date',     type:'date',     req:true,  ph:'' },
      { id:'currency',       label:'Currency',              type:'select',   req:false, ph:'', options:['CHF','EUR','USD'] },
      { id:'stats_preset',   label:'Stats Bar Style',        type:'select',   req:false, ph:'', options:['testing','manufacturing','full_service','general'] },
      { id:'description',    label:'Service Offer / Description', type:'textarea', req:false, ph:'e.g. Testing and compliance services for cosmetic products' },
      { id:'services',       label:'Services (one per line — flexible format)', type:'textarea', req:true, ph:'Service name, CHF 250, QTY 3\nor: Name | Detail | Qty | Price\nor: Service name CHF 175' },
      { id:'vat_rate',       label:'VAT Rate (%)',          type:'number',   req:false, ph:'0' },
      { id:'vat_note',       label:'VAT Note',              type:'text',     req:false, ph:'export exempt' },
      { id:'deposit_pct',   label:'Deposit Required (%)',   type:'number',   req:false, ph:'0 (e.g. 20 for 20%)' },
      { id:'notes',          label:'Notes',                 type:'textarea', req:false, ph:'' },
    ]
  },
  order_confirmation: {
    label: '✅ Order Confirmation', cls: 'order_confirmation',
    fields: [
      { id:'client_company', label:'Client Company',       type:'text',     req:true,  ph:'e.g. Maison Élara Beauté' },
      { id:'client_name',    label:'Contact Person',       type:'text',     req:true,  ph:'' },
      { id:'client_email',   label:'Client Email',         type:'text',     req:false, ph:'' },
      { id:'client_phone',   label:'Client Phone',         type:'text',     req:false, ph:'' },
      { id:'client_address', label:'Client Address',       type:'text',     req:false, ph:'' },
      { id:'client_vat',     label:'Client VAT Number',    type:'text',     req:false, ph:'' },
      { id:'order_number',   label:'Order / Reference #',  type:'text',     req:true,  ph:'OC-2026-0320' },
      { id:'date',           label:'Date',                 type:'date',     req:true,  ph:'' },
      { id:'est_delivery',   label:'Est. Delivery',        type:'text',     req:false, ph:'3–5 business days after samples received' },
      { id:'currency',       label:'Currency',              type:'select',   req:false, ph:'', options:['CHF','EUR','USD'] },
      { id:'stats_preset',   label:'Stats Bar Style',        type:'select',   req:false, ph:'', options:['testing','manufacturing','full_service','general'] },
      { id:'description',    label:'Service Offer / Description', type:'textarea', req:false, ph:'e.g. Private label manufacturing — product details' },
      { id:'services',       label:'Services (one per line — flexible format)', type:'textarea', req:true, ph:'Service name, CHF 250, QTY 3\nor: Name | Detail | Qty | Price\nor: Service name CHF 175' },
      { id:'vat_rate',       label:'VAT Rate (%)',          type:'number',   req:false, ph:'0' },
      { id:'vat_note',       label:'VAT Note',              type:'text',     req:false, ph:'export exempt' },
      { id:'deposit_pct',   label:'Deposit Required (%)',   type:'number',   req:false, ph:'0 (e.g. 20 for 20%)' },
      { id:'next_steps',     label:'Next Steps (one per line)', type:'textarea', req:false, ph:'Complete payment · Transfer CHF ... · Ref: INV-...\nShip minimum 3 units per product to our laboratory\nTesting begins within 24h of payment + sample receipt\nReports delivered by email upon completion' },
      { id:'notes',          label:'Notes',                 type:'textarea', req:false, ph:'' },
    ]
  }
};

// ── Wizard Questions ────────────────────────────────

const _SVC_Q = 'Add your services';
const _SVC_PH = '';

const WIZARD_QUESTIONS = {
  quote: [
    { id:'client_company', q:'What company is this quote for?', ph:'Maison Élara Beauté' },
    { id:'client_name',    q:'Who is the contact person?', ph:'Sophie Laurent' },
    { id:'client_email',   q:'Their email address?', ph:'sophie@elara-beaute.fr' },
    { id:'client_address', q:'Their address? (optional)', ph:'42 Rue du Faubourg, 75008 Paris, France' },
    { id:'order_number',   q:'Reference / order number?', ph:'2026-0320' },
    { id:'subtitle',       q:'Short tagline for the quote? (optional)', ph:'4 products, fast-tracked to EU compliance.' },
    { id:'services',       q:_SVC_Q, ph:_SVC_PH, type:'services' },
    { id:'notes',          q:'Any additional notes? (optional)', ph:'' },
  ],
  proforma: [
    { id:'client_company', q:'Which company is this pro forma for?', ph:'Maison Élara Beauté' },
    { id:'client_name',    q:'Contact person name?', ph:'Sophie Laurent' },
    { id:'client_email',   q:'Their email?', ph:'sophie@elara-beaute.fr' },
    { id:'order_number',   q:'Order / reference number?', ph:'OC-2026-0320' },
    { id:'services',       q:_SVC_Q, ph:_SVC_PH, type:'services' },
    { id:'notes',          q:'Any notes? (optional)', ph:'Urgent' },
  ],
  invoice: [
    { id:'client_company', q:'Which company are you invoicing?', ph:'Maison Élara Beauté' },
    { id:'client_name',    q:'Contact person name?', ph:'Sophie Laurent' },
    { id:'client_email',   q:'Their email?', ph:'' },
    { id:'client_address', q:'Their address?', ph:'42 Rue du Faubourg, 75008 Paris, France' },
    { id:'order_number',   q:'Order / reference number?', ph:'OC-2026-0320' },
    { id:'due_date',       q:'When is payment due?', ph:'', type:'date' },
    { id:'services',       q:_SVC_Q, ph:_SVC_PH, type:'services' },
    { id:'notes',          q:'Any notes?', ph:'' },
  ],
  order_confirmation: [
    { id:'client_company', q:'Which company is this order confirmation for?', ph:'Maison Élara Beauté' },
    { id:'client_name',    q:'Contact person?', ph:'Sophie Laurent' },
    { id:'client_email',   q:'Their email?', ph:'' },
    { id:'order_number',   q:'Order / reference number?', ph:'OC-2026-0320' },
    { id:'est_delivery',   q:'Estimated delivery time?', ph:'3–5 business days after samples received' },
    { id:'services',       q:_SVC_Q, ph:_SVC_PH, type:'services' },
    { id:'notes',          q:'Any notes?', ph:'' },
  ],
};

// ── Sample Data ─────────────────────────────────────

const SAMPLES = {
  quote: {
    type: 'quote',
    values: {
      client_company: 'Maison Élara Beauté', client_name: 'Sophie Laurent',
      client_email: 'sophie@elara-beaute.fr', client_phone: '+33 1 42 00 00 00',
      client_address: '42 Rue du Faubourg Saint-Honoré, 75008 Paris, France',
      client_vat: 'FR 76 987 654 321',
      order_number: '2026-0320', date: _today(), valid_until: _addDays(_today(), 14),
      subtitle: '4 products, fast-tracked to EU compliance.',
      description: 'Safety assessment, variant CPSR & microbiological testing — handled end-to-end by our Swiss laboratory.',
      services: 'Cosmetic Safety Assessment — Base Formula | Full safety evaluation per Regulation (EC) No 1223/2009. Includes Product Information File. | 1 | 250.00\nCosmetic Safety Assessment — Variant | Variant report per additional shade/form derived from the base formula. | 2 | 125.00\nMicrobiological Testing | Microbial limit testing per ISO 17516 for EU cosmetic safety compliance. | 1 | 175.00',
      vat_rate: '0', vat_note: 'export exempt', stats_preset: 'testing', notes: '',
    }
  },
  proforma: {
    type: 'proforma',
    values: {
      client_company: 'Maison Élara Beauté', client_name: 'Sophie Laurent',
      client_email: 'sophie@elara-beaute.fr', client_phone: '+33 1 42 00 00 00',
      client_address: '42 Rue du Faubourg Saint-Honoré, 75008 Paris, France',
      client_vat: 'FR 76 987 654 321',
      order_number: 'OC-2026-0320', date: _today(),
      services: 'Cosmetic Safety Assessment — Base Formula | Full safety evaluation per Regulation (EC) No 1223/2009. Includes Product Information File. | 1 | 250.00\nCosmetic Safety Assessment — Variant | Variant report per additional shade/form derived from the base formula. | 2 | 125.00\nMicrobiological Testing | Microbial limit testing per ISO 17516 for EU cosmetic safety compliance. | 1 | 175.00',
      vat_rate: '0', vat_note: 'export exempt', stats_preset: 'testing', notes: 'Urgent',
    }
  },
  invoice: {
    type: 'invoice',
    values: {
      client_company: 'Maison Élara Beauté', client_name: 'Sophie Laurent',
      client_email: 'sophie@elara-beaute.fr', client_phone: '+33 1 42 00 00 00',
      client_address: '42 Rue du Faubourg Saint-Honoré, 75008 Paris, France',
      client_vat: 'FR 76 987 654 321',
      order_number: 'OC-2026-0320', date: _today(), due_date: _addDays(_today(), 14),
      services: 'Cosmetic Safety Assessment — Base Formula | Full CPSR per Reg. (EC) No 1223/2009. Includes PIF. | 3 | 250.00\nCosmetic Safety Assessment — Variant | Variant report per additional shade or form. | 1 | 125.00\nStability Testing | Accelerated & real-time shelf-life assessment. | 1 | 250.00\nMicrobiological Testing | Microbial limit testing per ISO 17516. | 4 | 175.00\nPreservative Efficacy (Challenge) Testing | PET per ISO 11930. | 1 | 250.00',
      vat_rate: '0', vat_note: 'export exempt', stats_preset: 'testing', notes: '',
    }
  },
  order_confirmation: {
    type: 'order_confirmation',
    values: {
      client_company: 'Maison Élara Beauté', client_name: 'Sophie Laurent',
      client_email: 'sophie@elara-beaute.fr', client_phone: '+33 1 42 00 00 00',
      client_address: '42 Rue du Faubourg Saint-Honoré, 75008 Paris, France',
      client_vat: 'FR 76 987 654 321',
      order_number: 'OC-2026-0320', date: _today(),
      est_delivery: '3–5 business days after samples received',
      services: 'Cosmetic Safety Assessment — Base Formula | Full CPSR per Reg. (EC) No 1223/2009. Includes PIF. | 3 | 250.00\nCosmetic Safety Assessment — Variant | Variant report per additional shade or form. | 1 | 125.00\nStability Testing | Accelerated & real-time shelf-life assessment. | 1 | 250.00\nMicrobiological Testing | Microbial limit testing per ISO 17516. | 4 | 175.00\nPreservative Efficacy (Challenge) Testing | PET per ISO 11930. | 1 | 250.00',
      vat_rate: '0', vat_note: 'export exempt', stats_preset: 'testing',
      next_steps: 'Complete payment · Transfer CHF 2\'075.00 · Ref: INV-2026-0320\nShip minimum 3 units per product to our Forel (Lavaux) laboratory\nTesting begins within 24 hours of payment confirmation + sample receipt\nCPSR reports and test certificates delivered by email upon completion',
      notes: '',
    }
  }
};

// ── Date Helpers ─────────────────────────────────────

function _today() { return new Date().toISOString().split('T')[0]; }
function _addDays(d, n) {
  const dt = new Date(d + 'T12:00:00');
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().split('T')[0];
}
function fmtDate(s) {
  if (!s) return '\u2014';
  try { return new Date(s + 'T12:00:00').toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }); }
  catch(e) { return s; }
}
// Currency formatting — reads _activeCurrency (set before each render)
let _activeCurrency = 'CHF';
const CURRENCIES = {
  CHF: { code: 'CHF', symbol: 'CHF', locale: 'de-CH', flag: '🇨🇭' },
  EUR: { code: 'EUR', symbol: '€',   locale: 'de-DE', flag: '🇪🇺' },
  USD: { code: 'USD', symbol: '$',   locale: 'en-US', flag: '🇺🇸' },
};

function fmtMoney(v) {
  if (v === '' || v == null) return '\u2014';
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return String(v);
  const cur = CURRENCIES[_activeCurrency] || CURRENCIES.CHF;
  const formatted = n.toLocaleString(cur.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return cur.code + '\u202F' + formatted;
}

// Keep backward-compat alias
function fmtCHF(v) { return fmtMoney(v); }
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function nl2br(s) { return String(s || '').replace(/\n/g, '<br>'); }

// ── Service Line Parser (flexible) ──────────────────
// Accepts many formats per line:
//   Name | Detail | Qty | Unit            (4 pipes — canonical)
//   Name | Detail | Qty | CHF Unit        (with CHF prefix)
//   Name | Qty | Unit                     (3 pipes — no detail)
//   Name | Unit                           (2 pipes — qty=1, no detail)
//   Name, Qty x CHF Unit                  (comma + "x" + price)
//   Name, Qty @ CHF Unit                  (comma + "@" + price)
//   Name (detail), Qty @ Unit             (parenthetical detail)
//   Name — Detail, Qty @ Unit             (em-dash detail)
//   Name  250.00                          (just name + trailing number)
//   - Name | Detail | Qty | Unit          (markdown list prefix)

function parseServices(raw) {
  if (!raw) return [];
  return raw.split('\n').filter(l => l.trim()).map((line, i) => {
    // Strip markdown list prefix (-, *, numbered)
    let ln = line.trim().replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '');

    // ── Strategy 1: pipe-delimited ──
    if (ln.includes('|')) {
      const parts = ln.split('|').map(p => p.trim());
      if (parts.length >= 4) {
        // Name | Detail | Qty | Unit
        return _svc(i, parts[0], parts[1], parts[2], parts[3]);
      } else if (parts.length === 3) {
        // Could be Name | Qty | Unit  OR  Name | Detail | Unit
        const maybeQty = _extractNum(parts[1]);
        const maybePrice = _extractPrice(parts[2]);
        if (maybeQty !== null && maybePrice !== null) {
          return _svc(i, parts[0], '', maybeQty, maybePrice);
        }
        // Treat as Name | Detail | Unit (qty=1)
        return _svc(i, parts[0], parts[1], '1', parts[2]);
      } else if (parts.length === 2) {
        // Name | Unit (qty=1)
        return _svc(i, parts[0], '', '1', parts[1]);
      }
    }

    // ── Strategy 2: comma-delimited (smart label detection) ──
    // Handles: "Name, CHF 250, QTY 10", "Name, 250, 10", "Name, 10 x 250"
    if (ln.includes(',')) {
      const parts = ln.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        // Pass 1: detect labeled segments (CHF/EUR/USD/€/$ → price, QTY/pcs/units → qty)
        let labeledPrice = null, labeledQty = null;
        const textParts = [];  // segments that are neither price nor qty
        const _curRx = /^(?:CHF|EUR|USD|€|\$)\s*/i;
        const _qtyRx = /^(?:QTY|qty|pcs|units?|x)\s*/i;

        parts.forEach(p => {
          if (_curRx.test(p)) {
            labeledPrice = _extractPrice(p);
          } else if (_qtyRx.test(p)) {
            labeledQty = _extractNum(p.replace(_qtyRx, ''));
          } else {
            textParts.push(p);
          }
        });

        // If we found at least one labeled value, use label-based parsing
        if (labeledPrice !== null || labeledQty !== null) {
          // Check remaining text parts for unlabeled numbers
          const numParts = [];
          const nameParts = [];
          textParts.forEach(p => {
            if (_isPlainNumber(p)) numParts.push(p);
            else nameParts.push(p);
          });
          // Fill in missing price/qty from remaining numbers
          if (labeledPrice === null && numParts.length > 0) labeledPrice = _extractPrice(numParts.pop());
          if (labeledQty === null && numParts.length > 0) labeledQty = _extractNum(numParts.shift());
          // Any leftover numbers go back to name parts
          nameParts.push(...numParts);

          const name = nameParts[0] || '';
          const detail = nameParts.slice(1).join(', ');
          return _svc(i, name, detail, labeledQty || 1, labeledPrice || 0);
        }

        // Pass 2: no labels — check if last segments are bare numbers
        const nums = [];  // { index, value } of numeric-only segments from the end
        for (let k = parts.length - 1; k >= 1; k--) {
          if (_isPlainNumber(parts[k])) nums.unshift({ idx: k, val: parts[k] });
          else break;  // stop at first non-numeric segment
        }

        if (nums.length >= 2) {
          // Two trailing numbers: use smart heuristic — larger = price, smaller = qty
          const a = _extractPrice(nums[0].val);
          const b = _extractPrice(nums[1].val);
          const price = Math.max(a, b);
          const qty   = Math.min(a, b);
          const nameParts = parts.slice(0, nums[0].idx);
          const name = nameParts[0] || '';
          const detail = nameParts.slice(1).join(', ');
          return _svc(i, name, detail, qty, price);
        }
        if (nums.length === 1) {
          // One trailing number → price (qty=1)
          const nameParts = parts.slice(0, nums[0].idx);
          const name = nameParts[0] || '';
          const detail = nameParts.slice(1).join(', ');
          return _svc(i, name, detail, '1', nums[0].val);
        }
      }
    }

    // ── Strategy 3: "qty x price" or "qty @ price" pattern (with comma before qty) ──
    // e.g. "CPSR Assessment — Full evaluation, 3 x CHF 250.00"
    // e.g. "Frontend development (React), 60h @ CHF 150"
    const qtyPriceMatch = ln.match(/^(.+?)[,;]\s*(\d+)\s*[hH]?\s*[x×@]\s*(?:CHF\s*)?(\d[\d',. ]*)/);
    if (qtyPriceMatch) {
      const namePart = qtyPriceMatch[1].trim();
      const qty = qtyPriceMatch[2];
      const price = qtyPriceMatch[3];
      const { name, detail } = _splitNameDetail(namePart);
      return _svc(i, name, detail, qty, price);
    }

    // ── Strategy 4: "Nx price" without comma, e.g. "CPSR Assessment 3x 250" ──
    const inlineQtyMatch = ln.match(/^(.+?)\s+(\d+)\s*[x×]\s*(?:CHF\s*)?(\d[\d',. ]*)/);
    if (inlineQtyMatch) {
      const { name, detail } = _splitNameDetail(inlineQtyMatch[1].trim());
      return _svc(i, name, detail, inlineQtyMatch[2], inlineQtyMatch[3]);
    }

    // ── Strategy 5: trailing price only, e.g. "Microbiological Testing CHF 175.00" ──
    // Use tighter regex: no spaces inside number (prevents "10, 250" matching as one)
    const trailingPriceMatch = ln.match(/^(.+?)\s+(?:CHF\s*)?(\d[\d',.]*\d|\d)$/);
    if (trailingPriceMatch && _isPlainNumber(trailingPriceMatch[2]) && _extractPrice(trailingPriceMatch[2]) !== null) {
      const { name, detail } = _splitNameDetail(trailingPriceMatch[1].trim());
      return _svc(i, name, detail, '1', trailingPriceMatch[2]);
    }

    // ── Fallback: treat entire line as a service name with no price ──
    return _svc(i, ln, '', '1', '0');
  });
}

// Build a service object from raw strings
function _svc(idx, name, detail, qtyRaw, priceRaw) {
  const qty = _extractNum(String(qtyRaw)) || 1;
  const unit = _extractPrice(String(priceRaw)) || 0;
  // Clean up name — remove trailing commas, dashes
  name = String(name || '').replace(/[,;:\-–—|]+$/, '').trim();
  detail = String(detail || '').trim();
  return { num: String(idx + 1).padStart(2, '0'), name, detail, qty, unit, total: qty * unit };
}

// Extract integer from string like "3", " 60h", "1x"
function _extractNum(s) {
  const m = String(s).match(/(\d+)/);
  return m ? parseInt(m[1]) : null;
}

// Check if a string is essentially just a number (with optional CHF prefix / thousand seps)
// Rejects strings that contain letters other than CHF, e.g. "Shampoo huy" → false
function _isPlainNumber(s) {
  const cleaned = String(s).replace(/CHF/gi, '').trim();
  return /^\d[\d'.,]*$/.test(cleaned);
}

// Extract price float from string like "250.00", "CHF 250", "€ 250", "$1,200.50"
function _extractPrice(s) {
  const cleaned = String(s).replace(/CHF|EUR|USD/gi, '').replace(/[€$£]/g, '').replace(/[' ,]/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

// Split "Name — Detail" or "Name (detail)" into parts
function _splitNameDetail(s) {
  // Try "Name — Detail" or "Name - Detail"
  const dashMatch = s.match(/^(.+?)\s*[—–-]\s+(.+)$/);
  if (dashMatch) return { name: dashMatch[1].trim(), detail: dashMatch[2].trim() };
  // Try "Name (detail)"
  const parenMatch = s.match(/^(.+?)\s*\((.+?)\)\s*$/);
  if (parenMatch) return { name: parenMatch[1].trim(), detail: parenMatch[2].trim() };
  return { name: s, detail: '' };
}

// Normalize freeform body lines into canonical pipe format for the services field
function normalizeServicesToCanonical(raw) {
  if (!raw) return '';
  const services = parseServices(raw);
  return services.map(s => {
    const parts = [s.name];
    if (s.detail) parts.push(s.detail);
    else parts.push('');
    parts.push(String(s.qty));
    parts.push(s.unit.toFixed(2));
    return parts.join(' | ');
  }).join('\n');
}

function calcTotals(services, vatRate) {
  const subtotal = services.reduce((s, item) => s + item.total, 0);
  const rate = parseFloat(vatRate) || 0;
  const vatAmt = subtotal * rate / 100;
  return { subtotal, vatAmt, total: subtotal + vatAmt };
}

// ── YAML Frontmatter Parser (robust) ────────────────
// Handles: quoted/unquoted values, YAML lists, multi-line,
// dates with/without quotes, nested keys flattened

function parseFrontmatter(raw) {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return { fm: {}, body: raw };
  const fm = {};
  const lines = m[1].split('\n');
  let currentKey = null;

  lines.forEach(line => {
    // Skip blank lines and comments
    if (!line.trim() || line.trim().startsWith('#')) return;

    // Check if this is a continuation line (indented, part of a list or multiline)
    if (/^\s+/.test(line) && currentKey) {
      const val = line.trim().replace(/^[-*]\s*/, ''); // strip list markers
      if (val) {
        fm[currentKey] = fm[currentKey] ? fm[currentKey] + '\n' + val : val;
      }
      return;
    }

    const i = line.indexOf(':');
    if (i > 0) {
      const k = line.slice(0, i).trim();
      let v = line.slice(i + 1).trim();
      // Strip surrounding quotes
      v = v.replace(/^["']|["']$/g, '');
      // Strip inline YAML comments
      v = v.replace(/\s+#\s.*$/, '');
      currentKey = k;
      if (v) fm[k] = v;
    }
  });
  return { fm, body: raw.slice(m[0].length).trim() };
}

// ── Frontmatter Key Lookup Helper ──────────────────
// Searches fm for the first matching key (case-insensitive, underscore/dash/space agnostic)
function _fmGet(fm, ...aliases) {
  for (const alias of aliases) {
    // Direct match
    if (fm[alias] !== undefined) return fm[alias];
    // Case-insensitive + normalized match
    const norm = alias.toLowerCase().replace(/[-_ ]/g, '');
    for (const k of Object.keys(fm)) {
      if (k.toLowerCase().replace(/[-_ ]/g, '') === norm) return fm[k];
    }
  }
  return '';
}

// ── Date Normalizer ─────────────────────────────────
// Accepts: "2026-04-14", "April 14, 2026", "14.04.2026", "14/04/2026", "March 20, 2026"
function _normalizeDate(s) {
  if (!s) return '';
  s = String(s).trim();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD.MM.YYYY or DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dmy) return dmy[3] + '-' + dmy[2].padStart(2,'0') + '-' + dmy[1].padStart(2,'0');
  // Try Date.parse for "March 20, 2026" etc.
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return s;
}

// ── Document Type Detection (expanded) ──────────────

function detectType(raw, fm) {
  const t = (raw + ' ' + JSON.stringify(fm)).toLowerCase();

  // Explicit type declaration in frontmatter
  const exp = _fmGet(fm, 'type', 'document_type', 'doc_type', 'template', 'status').toLowerCase();
  if (exp.match(/quote|quotation|devis|proposal|offre|offer/)) return 'quote';
  if (exp.match(/pro.?forma/))                                 return 'proforma';
  if (exp.match(/invoice|facture|rechnung/))                   return 'invoice';
  if (exp.match(/order.?conf|confirmation|bestätigung/))       return 'order_confirmation';

  // Keyword scoring
  const s = { quote: 0, proforma: 0, invoice: 0, order_confirmation: 0 };
  ['quote','quotation','devis','valid until','proposal','offre','offer','bid','estimate','scope of work','deliverables'].forEach(k => { if (t.includes(k)) s.quote += 2; });
  ['pro forma','proforma','pre-payment','prepayment','advance payment','customs clearance'].forEach(k => { if (t.includes(k)) s.proforma += 2; });
  ['invoice','facture','due date','payment due','overdue','inv-','rechnung','invoice_number','invoice number','amount due'].forEach(k => { if (t.includes(k)) s.invoice += 2; });
  ['order confirmation','order confirmed','next steps','ship samples','est. delivery','oc-','what happens next','send samples'].forEach(k => { if (t.includes(k)) s.order_confirmation += 2; });

  // Bonus from specific frontmatter keys
  if (_fmGet(fm, 'valid_until', 'validity', 'expires'))  s.quote += 3;
  if (_fmGet(fm, 'deal_value', 'project_title', 'scope', 'timeline')) s.quote += 2;
  if (_fmGet(fm, 'due_date', 'payment_due', 'invoice_number', 'inv_number')) s.invoice += 3;
  if (_fmGet(fm, 'est_delivery', 'delivery', 'next_steps', 'shipping')) s.order_confirmation += 3;
  if (_fmGet(fm, 'prepayment', 'advance', 'customs')) s.proforma += 3;

  return Object.keys(s).reduce((a, b) => s[a] >= s[b] ? a : b);
}

// ── Strip emoji from text for matching ─────────────
function _stripEmoji(s) {
  // Remove common emoji ranges (misc technical, emoticons, dingbats, supplemental, flags, etc.)
  return s.replace(/[\u2300-\u23FF\u2600-\u27BF\u2B50-\u2B55\uFE00-\uFE0F\u{1F000}-\u{1FAFF}\u{E0020}-\u{E007F}\u200D\u{FE0F}]/gu, '').replace(/\s+/g, ' ');
}

// ── Body Section Extractor ─────────────────────────
// Finds content under a markdown heading that matches any keyword
// Only matches heading lines (starting with #), strips emoji before comparing
function _bodySection(body, keywords) {
  if (!body) return '';
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    // Only match markdown headings (lines starting with #)
    if (!/^#{1,4}\s/.test(raw)) continue;
    const lower = _stripEmoji(raw).toLowerCase().trim();
    if (keywords.some(k => lower.includes(k))) {
      const out = [];
      for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
        if (/^#{1,3}\s/.test(lines[j])) break;
        if (/^---+\s*$/.test(lines[j])) break;  // stop at horizontal rules
        if (lines[j].trim()) out.push(lines[j].trim());
      }
      if (out.length) return out.join('\n');
    }
  }
  return '';
}

// ── Smart email/phone/address detection from body ───
function _findInBody(body, pattern) {
  if (!body) return '';
  const lines = body.split('\n');
  for (const line of lines) {
    const m = line.match(pattern);
    if (m) return m[0].trim();
  }
  return '';
}

// ── Value Extraction from MD (comprehensive) ────────
// Maps dozens of frontmatter key variants → schema fields
// Falls back to body section extraction and normalization

function extractValues(type, fm, body) {
  const v = {};

  // ── Client Information (many aliases) ──
  v.client_company = _fmGet(fm,
    'client_company','company','corporation','organisation','organization',
    'firm','brand','brand_name','business','entity','société','societe') || '';

  v.client_name = _fmGet(fm,
    'client_name','contact','contact_name','contact_person','client',
    'name','person','recipient','attention','attn','full_name') || '';

  v.client_email = _fmGet(fm,
    'client_email','email','contact_email','mail','e-mail','e_mail') || '';

  v.client_phone = _fmGet(fm,
    'client_phone','phone','telephone','tel','mobile','contact_phone') || '';

  v.client_address = _fmGet(fm,
    'client_address','address','street','postal_address','shipping_address',
    'billing_address','addr','location','city') || '';

  v.client_vat = _fmGet(fm,
    'client_vat','vat_number','vat_id','tax_id','tax_number',
    'tva','mwst','ust_id') || '';

  // ── Order / Reference ──
  v.order_number = _fmGet(fm,
    'order_number','reference','ref','ref_number','reference_number',
    'invoice_number','inv_number','quote_number','quotation_number',
    'order_id','order','po_number','project_id','number') || '';

  // ── Dates (with normalization) ──
  const rawDate = _fmGet(fm, 'date','issue_date','issued','created','created_at','date_issued');
  v.date = _normalizeDate(rawDate) || _today();

  // ── VAT ──
  const rawVat = _fmGet(fm, 'vat_rate','vat_percent','tax_rate','mwst_rate');
  // Be careful: "vat" could be client VAT number or rate — only use if it looks numeric
  if (!rawVat) {
    const maybeVat = _fmGet(fm, 'vat','tax');
    if (maybeVat && /^\d/.test(maybeVat)) {
      v.vat_rate = maybeVat;
    } else {
      // Non-numeric "vat" value — likely a client VAT number
      if (maybeVat && !v.client_vat) v.client_vat = maybeVat;
      v.vat_rate = '0';
    }
  } else {
    v.vat_rate = rawVat;
  }
  v.vat_note = _fmGet(fm, 'vat_note','tax_note') || (v.vat_rate === '0' ? 'export exempt' : '');

  // ── Deposit ──
  v.deposit_pct = _fmGet(fm, 'deposit_pct','deposit','deposit_percent','advance_pct') || '0';

  // ── Currency ──
  const rawCur = _fmGet(fm, 'currency','cur','curr');
  if (rawCur) {
    const upper = rawCur.toUpperCase().trim();
    if (CURRENCIES[upper]) v.currency = upper;
  }
  if (!v.currency) {
    // Try to detect from deal_value or body text
    if (body) {
      if (/\bEUR\b|€/.test(body)) v.currency = 'EUR';
      else if (/\bUSD\b|\$/.test(body)) v.currency = 'USD';
    }
  }
  if (!v.currency) v.currency = 'CHF';

  // ── Stats preset ──
  v.stats_preset = _fmGet(fm, 'stats_preset', 'stats', 'service_type') || 'testing';

  // ── Notes ──
  v.notes = _fmGet(fm, 'notes','note','remarks','comments','comment','memo') || '';
  // Also extract from body ## Notes section
  if (!v.notes) {
    v.notes = _bodySection(body, ['notes', 'remarks', 'comments']);
  }

  // ── Services — try frontmatter first, then body sections ──
  let rawServices = _fmGet(fm, 'services','items','line_items','products','scope_items');

  if (!rawServices) {
    // Search body for service-like sections (exact heading matches only)
    rawServices = _bodySection(body, [
      'services', 'line items', 'items', 'scope of work',
      'deliverables', 'services rendered', 'pricing',
      'what we will do', 'what\'s included', 'key deliverables',
      'invoices', 'billing', 'charges'
    ]);
  }

  // Normalize freeform body lines into canonical format the renderer can parse
  // Filter out non-service lines (correspondence log entries, metadata, etc.)
  if (rawServices) {
    const filtered = rawServices.split('\n').filter(line => {
      const l = line.toLowerCase().trim();
      // Skip lines that look like correspondence metadata, not services
      if (l.startsWith('**follow-up')) return false;
      if (l.startsWith('**subject')) return false;
      if (l.startsWith('**summary')) return false;
      if (l.startsWith('**date')) return false;
      if (l.startsWith('**from') || l.startsWith('**to:')) return false;
      if (/^---+$/.test(l)) return false;
      return true;
    }).join('\n');
    v.services = normalizeServicesToCanonical(filtered);
  } else {
    v.services = '';
  }

  // ── deal_value fallback: create a service line if no services found ──
  if (!v.services || v.services.trim() === '') {
    const dealVal = _fmGet(fm, 'deal_value','deal_amount','total','total_value','contract_value','project_value');
    if (dealVal) {
      const price = _extractPrice(dealVal);
      if (price !== null) {
        const dealDesc = _fmGet(fm, 'description','summary','overview','subject','project_title','title') || 'Project';
        v.services = dealDesc + ' | — | 1 | ' + price;
      }
    }
  }

  // ── If client info is missing, try to extract from body ──

  // Extract company from H1 heading: "# Correspondence — Acme Corp" or "# Quote for Acme Corp"
  if (!v.client_company && body) {
    const h1 = body.match(/^#\s+(.+)/m);
    if (h1) {
      const h1text = h1[1].trim();
      // Try "Something — Company Name" or "Something - Company Name"
      const dashPart = h1text.match(/[—–\-]\s*(.+)/);
      if (dashPart) {
        v.client_company = dashPart[1].trim();
      } else {
        // Try "Something for Company Name"
        const forPart = h1text.match(/\bfor\s+(.+)/i);
        if (forPart) v.client_company = forPart[1].trim();
      }
    }
  }

  // Extract contact name from body prose (look for named people)
  if (!v.client_name && body) {
    // Look for patterns like "John Smith is the main contact", "Contact: John Smith",
    // "Meeting with John Smith", or bold names "**John Smith**"
    const namePatterns = [
      /\*\*([A-Z][a-z]+ [A-Z][a-z]+)\*\*/,                       // **John Smith**
      /(?:contact person|recipient|attention|attn)[:]\s*([A-Z][a-z]+ [A-Z][a-z]+)/i,  // "Contact person: John Smith"
      /(?:meeting|call|spoke|talked) (?:with|from) ([A-Z][a-z]+ [A-Z][a-z]+)/i,
    ];
    for (const pat of namePatterns) {
      const m = body.match(pat);
      if (m) { v.client_name = m[1].trim(); break; }
    }
    // Fallback: look for a first name used with action verbs (likely the contact)
    if (!v.client_name) {
      const nameRefs = body.match(/\b([A-Z][a-z]{2,})\s+(?:said|asked|explained|sent|acknowledged|replied|confirmed|mentioned|requested|called|emailed|noted|agreed|was very|reviewed|approved)/g);
      if (nameRefs && nameRefs.length >= 1) {
        // Extract just the name, count occurrences to find most-mentioned person
        const names = nameRefs.map(r => r.split(/\s+/)[0]);
        const counts = {};
        names.forEach(n => { counts[n] = (counts[n] || 0) + 1; });
        v.client_name = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
      }
    }
  }

  // Extract most recent date from dated headings: "### 2026-04-10 — Email"
  if (body && v.date === _today()) {
    const datedHeading = body.match(/^#{1,4}\s+(\d{4}-\d{2}-\d{2})/m);
    if (datedHeading) {
      v.date = datedHeading[1];
    }
  }

  if (!v.client_email) {
    v.client_email = _findInBody(body, /[\w.+-]+@[\w-]+\.[\w.-]+/);
  }
  if (!v.client_phone) {
    // Require + prefix or explicit "phone/tel" context to avoid matching dates
    v.client_phone = _findInBody(body, /\+\d[\d\s()-]{8,}/) ||
                     _findInBody(body, /(?:phone|tel|mobile|call)[:\s]+(\d[\d\s()-]{8,})/i);
  }

  // ── Description / Service Offer (all doc types) ──
  v.description = _fmGet(fm,
    'description','summary','overview','abstract','scope','brief','service_offer') || '';
  if (!v.description) {
    v.description = _bodySection(body, ['description', 'summary', 'overview', 'abstract', 'service offer']);
  }
  if (!v.description && body) {
    const summaryMatch = body.match(/\*\*Summary:\*\*\s*(.+)/i);
    if (summaryMatch) v.description = summaryMatch[1].trim();
  }

  // ── Type-specific fields ──
  if (type === 'quote') {
    const rawValid = _fmGet(fm, 'valid_until','validity','expires','expiry','valid_through','expiration');
    v.valid_until = _normalizeDate(rawValid) || _addDays(v.date, 14);

    v.subtitle = _fmGet(fm,
      'subtitle','tagline','title','project_title','subject','headline','summary_line') || '';
  } else if (type === 'proforma') {
    const rawValid = _fmGet(fm, 'valid_until','validity','expires','expiry','valid_through');
    v.valid_until = _normalizeDate(rawValid) || _addDays(v.date, 14);
  } else if (type === 'invoice') {
    const rawDue = _fmGet(fm, 'due_date','payment_due','due','pay_by','payment_deadline');
    v.due_date = _normalizeDate(rawDue) || _addDays(v.date, 14);
  } else if (type === 'order_confirmation') {
    v.est_delivery = _fmGet(fm,
      'est_delivery','delivery','delivery_time','estimated_delivery',
      'turnaround','lead_time','eta') || '3–5 business days after samples received';

    v.next_steps = _fmGet(fm, 'next_steps','steps','what_next') || '';
    if (!v.next_steps) {
      v.next_steps = _bodySection(body, ['next steps', 'what happens next', 'process', 'workflow']);
    }
  }

  // ── Fill client_name from company if only one is present ──
  if (!v.client_name && v.client_company) v.client_name = v.client_company;
  if (!v.client_company && v.client_name) v.client_company = v.client_name;

  return v;
}
