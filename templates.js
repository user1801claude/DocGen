/* ═══════════════════════════════════════════════════
   DocGen — Document Templates (MySwissLab design)
   Faithful reproduction of the real MySwissLab HTML
   ═══════════════════════════════════════════════════ */

function renderTemplate(type, v) {
  // Set active currency for this render
  _activeCurrency = v.currency || 'CHF';
  _lastQuoteExportHtml = null;
  _lastProformaExportHtml = null;
  _lastInvoiceExportHtml = null;
  _lastOrderConfExportHtml = null;
  switch (type) {
    case 'quote':              return renderQuote(v);
    case 'proforma':           return renderProForma(v);
    case 'invoice':            return renderInvoice(v);
    case 'order_confirmation': return renderOrderConf(v);
    default: return '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Unknown type</div></div>';
  }
}

// ── Shared Fragments ────────────────────────────────

function statsBarBlock(v) {
  const preset = STATS_PRESETS[v.stats_preset] || STATS_PRESETS['testing'];
  return `<div class="quote-stats-bar">${preset.stats.map(s =>
    `<div class="quote-stat"><div class="quote-stat-num">${esc(s.num)}</div><div class="quote-stat-lbl">${esc(s.lbl)}</div></div>`
  ).join('')}</div>`;
}

function clientBlock(v) {
  const parts = [esc(v.client_name)];
  if (v.client_email) parts.push(esc(v.client_email));
  if (v.client_phone) parts.push(esc(v.client_phone));
  if (v.client_address) parts.push(esc(v.client_address));
  if (v.client_vat) parts.push('VAT: ' + esc(v.client_vat));
  return parts.join('<br>');
}

function issuerBlock() {
  return `${COMPANY.legal}<br>${COMPANY.email}<br>${COMPANY.phone}<br>${COMPANY.address}`;
}

function serviceTable(services) {
  if (!services.length) return '<p style="color:#6e6e73;font-size:11px">No services defined.</p>';
  const cur = (CURRENCIES[_activeCurrency] || CURRENCIES.CHF).code;
  const rows = services.map(s => `<tr>
    <td style="color:#6e6e73;font-size:10px;width:28px">${s.num}</td>
    <td><strong>${esc(s.name)}</strong>${s.detail ? '<br><span style="font-size:10px;color:#6e6e73">' + esc(s.detail) + '</span>' : ''}</td>
    <td style="text-align:center">${s.qty}</td>
    <td class="num">${fmtMoney(s.unit)}</td>
    <td class="num">${fmtMoney(s.total)}</td>
  </tr>`).join('');
  return `<table><thead><tr>
    <th>#</th><th>Service / Description</th>
    <th style="text-align:center">Qty</th>
    <th style="text-align:right">Unit (${cur})</th>
    <th style="text-align:right">Total (${cur})</th>
  </tr></thead><tbody>${rows}</tbody></table>`;
}

function totalsBlock(totals, vatRate, vatNote, depositPct) {
  const rate = parseFloat(vatRate) || 0;
  const depPct = parseFloat(depositPct) || 0;
  const depAmt = depPct > 0 ? totals.total * depPct / 100 : 0;
  const addonRow = totals.addonExtra > 0
    ? `<div class="row"><span>Add-ons</span><span>${fmtMoney(totals.addonExtra)}</span></div>`
    : '';
  return `<div class="totals">
    <div class="row"><span>Subtotal</span><span>${fmtMoney(totals.subtotal)}</span></div>
    ${addonRow}
    <div class="row"><span>VAT (${rate}%${vatNote ? ' — ' + esc(vatNote) : ''})</span><span>${fmtMoney(totals.vatAmt)}</span></div>
    <div class="grand">Total Due: ${fmtMoney(totals.total)}</div>
    ${depPct > 0 ? `<div class="deposit">${depPct}% Deposit Required: ${fmtMoney(depAmt)}</div>` : ''}
  </div>`;
}

function bankBox(refNum, total) {
  const cur = (CURRENCIES[_activeCurrency] || CURRENCIES.CHF).code;
  const bd = (COMPANY.bankDetails && COMPANY.bankDetails[cur]) || COMPANY.bankDetails.CHF;
  return `<div class="bankbox">
    <div class="lbl">Payment Details — ${cur}</div>
    <div class="row"><span>Bank</span><span>${COMPANY.bank}</span></div>
    <div class="row"><span>BIC / SWIFT</span><span>${bd.bic}</span></div>
    <div class="row"><span>IID (NCB)</span><span>${bd.iid}</span></div>
    <div class="row"><span>IBAN (${cur})</span><span>${bd.iban}</span></div>
    <div class="row"><span>Payment Reference</span><span>${esc(refNum)}</span></div>
    <div class="row"><span>Amount Due</span><span style="font-weight:800;color:#1a6b4a">${fmtMoney(total)}</span></div>
  </div>`;
}

function footerBlock() {
  return `<div class="msl-footer">${COMPANY.legal} · VAT: ${COMPANY.vat}<br>myswisslab.ch</div>`;
}

function notesBlock(notes) {
  if (!notes) return '';
  return `<div style="margin-top:14px;font-size:11px;color:#6e6e73;word-break:break-all;overflow-wrap:break-word"><strong>Notes:</strong> ${esc(notes)}</div>`;
}

function templateNotesBlock(notes) {
  if (!notes) return '';
  return `<div style="margin:14px 0; padding:10px 14px; background:var(--bg-light, #f5f5f7); border-radius:6px; border-left:3px solid var(--teal, #31AD8A); font-size:10px; color:var(--text, #1d1d1f); line-height:1.6; word-break:break-word; overflow-wrap:break-word;"><span style="font-weight:700; text-transform:uppercase; font-size:8px; letter-spacing:1px; color:var(--teal, #31AD8A); display:block; margin-bottom:4px;">Notes</span>${esc(notes)}</div>`;
}

function descriptionBlock(desc) {
  if (!desc) return '';
  return `<div style="font-size:10.5px;color:#6e6e6e;line-height:1.5;margin:6px 0 12px;font-style:italic">${esc(desc)}</div>`;
}

// ── Add-on Blocks for Document Rendering ────────────

function addonTimelineBlock(services, v) {
  if (!v.addon_timeline) return '';
  // Only show durations for services that have a known duration
  const catalog = getCatalogForService(selectedService || 'testing');
  const rows = [];
  services.forEach(s => {
    // Match service name to catalog to find its ID
    const catItem = catalog.find(c => s.name.toLowerCase().includes(c.name.toLowerCase().split(' ')[0].toLowerCase()));
    const dur = catItem ? getTimelineDuration(catItem.id) : '';
    if (dur) {
      rows.push({ name: s.name, duration: dur });
    }
  });
  if (!rows.length) return '';
  const rowsHtml = rows.map(r =>
    `<div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #f0f0f0; font-size:10px;">
      <span style="color:var(--text, #1d1d1f);">${esc(r.name)}</span>
      <span style="font-weight:700; color:var(--teal, #31AD8A);">${esc(r.duration)}</span>
    </div>`
  ).join('');
  return `<div style="background:#f0faf6; border:1px solid #d4ede4; border-radius:6px; padding:14px 18px; margin:12px 0;">
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
      <span style="font-size:14px;">⏱</span>
      <span style="font-size:10px; font-weight:700; color:var(--dark, #1d1d1f); text-transform:uppercase; letter-spacing:1.5px;">Estimated Turnaround</span>
    </div>
    ${rowsHtml}
  </div>`;
}

function addonInsuranceBlock(v) {
  const cur = (CURRENCIES[_activeCurrency] || CURRENCIES.CHF).code;
  const price = getAddonPrice('insurance', cur);
  const desc = esc(v.addon_insurance_desc || ADDONS.insurance.description);
  if (v.addon_insurance) {
    return `<div style="background:#f0faf6; border:1px solid #d4ede4; border-radius:6px; padding:14px 18px; margin:12px 0; display:flex; align-items:flex-start; gap:10px;">
    <div style="font-size:16px; flex-shrink:0; line-height:1;">🛡</div>
    <div style="font-size:9.5px; line-height:1.5; color:var(--text, #1d1d1f);">
      <strong style="color:var(--dark, #1d1d1f);">Testing Insurance — ${cur} ${price.toFixed(2)}</strong><br>
      ${desc}
    </div>
  </div>`;
  }
  return `<div style="padding:8px 0; font-size:9.5px; color:var(--text-light, #6e6e6e); line-height:1.5;">
    <span style="font-weight:600; color:var(--dark, #1d1d1f);">Testing Insurance</span> — ${cur} ${price.toFixed(2)} per product · <span style="font-style:italic;">Optional</span> — ${desc}
  </div>`;
}

function addonBundleBlock(services, v) {
  if (!v.addon_bundle) return '';
  if (!services.length) return '';
  const cur = (CURRENCIES[_activeCurrency] || CURRENCIES.CHF).code;
  // Calculate total across all services (the "bundle price per product")
  const totalAll = services.reduce((sum, s) => sum + s.total, 0);
  // Count unique quantities (most common use: all qty=1 so bundle = sum of unit prices)
  // But if mixed quantities, show "total across all tests"
  const maxQty = Math.max(...services.map(s => s.qty));
  const perProduct = maxQty > 0 ? (totalAll / maxQty) : totalAll;

  return `<div style="background:#f5f0ff; border:1px solid #d9ccf0; border-radius:6px; padding:14px 18px; margin:12px 0;">
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
      <span style="font-size:14px;">📦</span>
      <span style="font-size:10px; font-weight:700; color:var(--dark, #1d1d1f); text-transform:uppercase; letter-spacing:1.5px;">Full Bundle — Price per Product</span>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:baseline;">
      <span style="font-size:10px; color:var(--text-light, #6e6e73);">${services.length} test${services.length > 1 ? 's' : ''} included</span>
      <span style="font-size:16px; font-weight:800; color:#5a3e8a;">${cur} ${perProduct.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
    </div>
  </div>`;
}

function addonsTotalAmount(v) {
  // Returns the total add-on charges to add to the invoice
  let extra = 0;
  if (v.addon_insurance) {
    const cur = (CURRENCIES[_activeCurrency] || CURRENCIES.CHF).code;
    extra += getAddonPrice('insurance', cur);
  }
  return extra;
}

function svcDetailHtml(detail) {
  if (!detail) return '';
  // detail may contain "unit\ndescription" or "unit\ndesc with <br> and <b>bold</b> markers"
  // Split on first \n to separate unit from description
  const parts = detail.split('\n');
  const unit = parts[0] || '';
  const descRaw = parts.slice(1).join(' ').trim();
  // Split on <b>...</b> to separate catalog desc from user brief
  const boldMatch = descRaw.match(/^(.*?)(?:<b>(.*?)<\/b>)?$/s);
  const catalogPart = (boldMatch ? boldMatch[1] : descRaw).replace(/<br>/g, '\n').replace(/\n$/, '').trim();
  const briefPart = (boldMatch && boldMatch[2]) ? boldMatch[2].trim() : '';
  let html = '';
  if (unit) {
    html += '<div style="font-size:9px; color:var(--text-light); line-height:1.45;">' + esc(unit) + '</div>';
  }
  if (catalogPart) {
    html += '<div style="font-size:9px; color:var(--text-muted); line-height:1.45; margin-top:3px; font-style:italic; font-weight:300;">' + esc(catalogPart).replace(/\n/g, '<br>') + '</div>';
  }
  if (briefPart) {
    html += '<div style="font-size:9px; color:var(--dark, #1d1d1f); line-height:1.45; margin-top:3px; font-weight:600;">' + esc(briefPart) + '</div>';
  }
  return html;
}

// ── 1. QUOTATION (uses external template) ───────────

let _lastQuoteExportHtml = null;
// Template is loaded from quote-template-data.js
var _quoteTemplateCache = (typeof QUOTE_TEMPLATE_HTML !== 'undefined') ? QUOTE_TEMPLATE_HTML : (typeof window !== 'undefined' && window.QUOTE_TEMPLATE_HTML) ? window.QUOTE_TEMPLATE_HTML : null;
if (!_quoteTemplateCache) console.warn('Quote template not loaded — check quote-template-data.js');

function renderQuote(v) {
  const services = parseServices(v.services);
  const addonExtra = addonsTotalAmount(v);
  const totals = calcTotals(services, v.vat_rate, addonExtra);
  const ref = v.order_number || '—';
  const cur = (CURRENCIES[_activeCurrency] || CURRENCIES.CHF).code;

  // If external template is loaded, use it
  if (_quoteTemplateCache) {
    const svcRows = services.map((s, i) => `
    <tr>
      <td style="padding:12px 0; vertical-align:top; border-bottom:1px solid #f0f0f0; font-size:10px; color:var(--text-muted); padding-top:14px; width:28px;">${i + 1}</td>
      <td style="padding:12px 0; vertical-align:top; border-bottom:1px solid #f0f0f0;">
        <div style="font-size:11.5px; font-weight:700; color:var(--dark); margin-bottom:3px;">${esc(s.name)}</div>
        ${s.detail ? svcDetailHtml(s.detail) : ''}
      </td>
      <td style="padding:12px 0; vertical-align:top; border-bottom:1px solid #f0f0f0; text-align:center; font-size:10px; padding-top:14px; width:50px;">${s.qty}</td>
      <td style="padding:12px 0; vertical-align:top; border-bottom:1px solid #f0f0f0; text-align:right; font-size:10px; font-weight:600; padding-top:14px; width:75px;">${s.unit.toFixed(2)}</td>
      <td style="padding:12px 0; vertical-align:top; border-bottom:1px solid #f0f0f0; text-align:right; font-size:10px; font-weight:600; padding-top:14px; width:80px;">${s.total.toFixed(2)}</td>
    </tr>`).join('');

    let subtitle = v.subtitle || 'Quotation #' + esc(ref);
    subtitle = esc(subtitle)
      .replace(/!(.+?)!/g, '<span style="color:var(--teal);font-weight:700">$1</span>')
      .replace(/~~(.+?)~~/g, '<span style="color:#5A3E8A;font-weight:700">$1</span>');
    const totalQty = services.reduce((sum, s) => sum + s.qty, 0);
    const perProduct = totalQty > 0 ? (totals.total / totalQty).toFixed(2) : '0.00';
    const fmtTotal = cur + ' ' + totals.total.toLocaleString('de-CH', { minimumFractionDigits: 2 });
    const fmtSubtotal = cur + ' ' + totals.subtotal.toLocaleString('de-CH', { minimumFractionDigits: 2 });
    const fmtVat = cur + ' ' + totals.vatAmt.toLocaleString('de-CH', { minimumFractionDigits: 2 });

    let html = _quoteTemplateCache;
    html = html.replace(/\{\{REF\}\}/g, esc(ref));
    html = html.replace(/\{\{CLIENT_NAME\}\}/g, esc(v.client_name || ''));
    html = html.replace(/\{\{CLIENT_COMPANY\}\}/g, esc(v.client_company || ''));
    html = html.replace(/\{\{CLIENT_EMAIL\}\}/g, esc(v.client_email || ''));
    html = html.replace(/\{\{CLIENT_ADDRESS\}\}/g, esc(v.client_address || '').replace(/\n/g, '<br>'));
    html = html.replace(/\{\{DATE_ISSUED\}\}/g, fmtDate(v.date));
    html = html.replace(/\{\{DATE_VALID\}\}/g, fmtDate(v.valid_until));
    html = html.replace(/\{\{SUBTITLE\}\}/g, subtitle);
    // Remove global description placeholder (descriptions are now per-service)
    html = html.replace(/<div[^>]*>\{\{DESCRIPTION\}\}<\/div>/g, '');
    html = html.replace(/\{\{DESCRIPTION\}\}/g, '');
    html = html.replace(/\{\{SERVICE_ROWS\}\}/g, svcRows);
    html = html.replace(/\{\{SUBTOTAL_CHF\}\}/g, fmtSubtotal);
    html = html.replace(/\{\{TOTAL_CHF\}\}/g, fmtTotal);
    html = html.replace(/\{\{VAT_CHF\}\}/g, fmtVat);
    html = html.replace(/\{\{PER_PRODUCT\}\}/g, cur + ' ' + perProduct);

    // Add-ons: build dynamic content
    const addonsHtml = addonTimelineBlock(services, v) + addonInsuranceBlock(v) + addonBundleBlock(services, v);
    // Replace static add-ons heading with dynamic content (or empty if none selected)
    html = html.replace(/OPTIONAL ADD-ONS<\/div>/g, 'OPTIONAL ADD-ONS</div>' + addonsHtml);
    // Replace the static insurance box with nothing (we render dynamically above)
    // Remove static insurance promo placeholder (replaced in template data with marker)
    html = html.replace(/<!-- STATIC_INSURANCE_BOX -->/g, '');
    // Replace "Optional add-ons | on request" row in totals with actual add-on total
    const addonsLineHtml = addonExtra > 0
      ? `<span style="color:var(--text-light);">Add-ons</span><span style="font-weight:600; color:var(--dark);">${cur} ${addonExtra.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>`
      : `<span style="color:var(--text-light);">Optional add-ons</span><span style="color:var(--text-muted); font-style:italic;">none selected</span>`;
    html = html.replace(/<span[^>]*>Optional add-ons<\/span><span[^>]*>on request<\/span>/g, addonsLineHtml);

    // Dynamic stats bar based on selected preset
    const preset = STATS_PRESETS[v.stats_preset] || STATS_PRESETS['testing'];
    const statsHtml = `<div style="display:flex; background:var(--bg-light); margin:0 calc(-1 * var(--pad-x)); padding:12px var(--pad-x); margin-bottom:12px;">
      ${preset.stats.map(s => `<div style="flex:1; text-align:center;">
        <div style="font-family:var(--font-display); font-size:16px; font-weight:800; color:var(--teal);">${esc(s.num)}</div>
        <div style="font-size:7px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-top:1px;">${esc(s.lbl)}</div>
      </div>`).join('')}
    </div>`;
    html = html.replace(/\{\{STATS_BAR\}\}/g, statsHtml);

    // VAT label + deposit row
    const vatRate = parseFloat(v.vat_rate) || 0;
    const vatLabel = 'VAT (' + vatRate.toFixed(2) + '%' + (v.vat_note ? ' — ' + esc(v.vat_note) : '') + ')';
    html = html.replace(/\{\{VAT_LABEL\}\}/g, vatLabel);

    const depPct = parseFloat(v.deposit_pct) || 0;
    const depAmt = depPct > 0 ? totals.total * depPct / 100 : 0;
    const depositRow = depPct > 0
      ? `<div style="display:flex; justify-content:space-between; padding-top:8px; margin-top:4px; border-top:1px dashed var(--teal, #31AD8A);">
          <span style="font-family:var(--font-display, inherit); font-size:12px; font-weight:800; color:#5a3e8a;">${depPct}% Deposit</span>
          <span style="font-family:var(--font-display, inherit); font-size:12px; font-weight:800; color:#5a3e8a;">${cur} ${depAmt.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
        </div>`
      : '';
    html = html.replace(/\{\{DEPOSIT_ROW\}\}/g, depositRow);

    // Compliance warning box — only for Testing & Compliance
    const complianceBox = (v.stats_preset === 'testing')
      ? '<div style="background:#f9f9f9; border:1px solid var(--border); border-radius:4px; padding:14px 16px; font-size:9.5px; line-height:1.55; color:var(--text); max-width:320px;">Products placed on the EU market without a valid CPSR face penalties of <strong>€10,000–25,000 per product</strong> and risk of product recalls via <strong>Safety Gate RAPEX</strong>. Brands without compliant safety reports also risk <strong>retailer de-listing</strong>.</div>'
      : '';
    html = html.replace(/\{\{COMPLIANCE_BOX\}\}/g, complianceBox);

    // Store full HTML for export (with page sizing for print)
    // Bank details based on selected currency
    const _bd = (COMPANY.bankDetails && COMPANY.bankDetails[cur]) || COMPANY.bankDetails.CHF;
    html = html.replace(/\{\{BANK_IBAN\}\}/g, _bd.iban);
    html = html.replace(/\{\{BANK_BIC\}\}/g, _bd.bic);
    html = html.replace(/\{\{BANK_IID\}\}/g, _bd.iid);

    // Notes
    html = html.replace(/\{\{NOTES\}\}/g, templateNotesBlock(v.notes));

    // Inject auto-height for pages so long service lists don't get clipped
    const exportPatch = '<style>.page{height:auto !important; min-height:var(--page-h); overflow:visible !important; display:flex !important; flex-direction:column !important;} .page-inner{height:auto !important; min-height:0 !important; flex:1 1 auto !important;} .page > div:not(.page-inner){position:relative !important; bottom:auto !important; left:0 !important; right:0 !important; flex-shrink:0 !important; margin-left:0 !important; margin-right:0 !important; box-sizing:border-box !important;}</style>';
    html = html.replace(/<\/head>/i, exportPatch + '</head>');
    _lastQuoteExportHtml = html;

    // For preview: render in iframe for perfect isolation
    // Inject CSS override to remove grey background, let pages flow, and auto-expand for long service lists
    const previewPatch = '<style>body{background:#fff !important;padding:0 !important;} .page{margin:0 auto 20px !important;}</style>';
    const patched = html.replace(/<\/head>/i, previewPatch + '</head>');
    const escaped = patched.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    return `<iframe srcdoc="${escaped}" style="width:100%;min-width:820px;border:none;min-height:3400px;background:#fff;" onload="this.style.height=this.contentDocument.body.scrollHeight+40+'px'"></iframe>`;
  }

  // Fallback: simple inline render
  function fmtSubtitle(s) {
    if (!s) return '';
    return esc(s)
      .replace(/!(.+?)!/g, '<span style="color:#31AD8A;font-weight:700">$1</span>')
      .replace(/~~(.+?)~~/g, '<span style="color:#5A3E8A;font-weight:700">$1</span>');
  }

  return `
  <!-- Quote header bar -->
  <div class="quote-header-bar">
    <div class="quote-logo-text">MySwissLab<sup class="quote-logo-plus">+</sup></div>
    <div class="quote-header-right">
      <span>${COMPANY.email}</span>
      <span>${COMPANY.phone}</span>
      <span class="quote-ref-badge">#${esc(ref)}</span>
    </div>
  </div>

  <!-- Title block -->
  <div style="margin-bottom:20px;">
    <div class="quote-label">QUOTATION #${esc(ref)}</div>
    <div class="quote-title">${v.subtitle ? fmtSubtitle(v.subtitle) : 'Quotation #' + esc(ref)}</div>
  </div>

  <!-- Date / Valid / Reference row -->
  <div class="quote-dates-row">
    <div>
      <div class="quote-date-label">DATE ISSUED</div>
      <div class="quote-date-value">${fmtDate(v.date)}</div>
    </div>
    ${v.valid_until ? `<div>
      <div class="quote-date-label">VALID UNTIL</div>
      <div class="quote-date-value">${fmtDate(v.valid_until)}</div>
    </div>` : ''}
    <div>
      <div class="quote-date-label">REFERENCE</div>
      <div class="quote-date-value">${esc(ref)}</div>
    </div>
  </div>

  <!-- Stats bar -->
  ${statsBarBlock(v)}

  <div class="msl-meta">
    <div class="meta-block">
      <div class="lbl">Prepared For</div>
      <div class="val">${esc(v.client_company) || '\u2014'}</div>
      <div class="sub">${clientBlock(v)}</div>
    </div>
    <div class="meta-block">
      <div class="lbl">Issued By</div>
      <div class="val">${COMPANY.name}</div>
      <div class="sub">${issuerBlock()}</div>
    </div>
  </div>

  ${serviceTable(services)}
  ${addonTimelineBlock(services, v)}
  ${addonInsuranceBlock(v)}
  ${addonBundleBlock(services, v)}
  ${totalsBlock(totals, v.vat_rate, v.vat_note, v.deposit_pct)}

  ${v.stats_preset === 'testing' ? '<div class="guarantee"><strong>Our Guarantee:</strong> Turnaround time is guaranteed at 3–5 business days from receipt of samples and payment. Pricing is fixed for the duration of validity.</div>' : '<div class="guarantee">Pricing is fixed for the duration of validity.</div>'}

  ${notesBlock(v.notes)}
  ${footerBlock()}`;
}

// ── 2. PRO FORMA INVOICE (uses external template) ───

let _lastProformaExportHtml = null;
var _proformaTemplateCache = (typeof PROFORMA_TEMPLATE_HTML !== 'undefined') ? PROFORMA_TEMPLATE_HTML : (typeof window !== 'undefined' && window.PROFORMA_TEMPLATE_HTML) ? window.PROFORMA_TEMPLATE_HTML : null;
if (!_proformaTemplateCache) console.warn('ProForma template not loaded');

function renderProForma(v) {
  const services = parseServices(v.services);
  const addonExtra = addonsTotalAmount(v);
  const totals = calcTotals(services, v.vat_rate, addonExtra);
  const ref = v.order_number || '\u2014';
  const invRef = 'PI-' + ref.replace(/^OC-|^PI-|^CI-/g, '');
  const cur = (CURRENCIES[_activeCurrency] || CURRENCIES.CHF).code;

  if (_proformaTemplateCache) {
    const svcRows = services.map((s, i) => `
    <tr>
      <td style="padding:12px 0; vertical-align:top; border-bottom:1px solid #f0f0f0; font-size:10px; color:var(--text-muted); padding-top:14px; width:28px;">${i + 1}</td>
      <td style="padding:12px 0; vertical-align:top; border-bottom:1px solid #f0f0f0;">
        <div style="font-size:11.5px; font-weight:700; color:var(--dark); margin-bottom:3px;">${esc(s.name)}</div>
        ${s.detail ? svcDetailHtml(s.detail) : ''}
      </td>
      <td style="padding:12px 0; vertical-align:top; border-bottom:1px solid #f0f0f0; text-align:center; font-size:10px; padding-top:14px; width:50px;">${s.qty}</td>
      <td style="padding:12px 0; vertical-align:top; border-bottom:1px solid #f0f0f0; text-align:right; font-size:10px; font-weight:600; padding-top:14px; width:75px;">${s.unit.toFixed(2)}</td>
      <td style="padding:12px 0; vertical-align:top; border-bottom:1px solid #f0f0f0; text-align:right; font-size:10px; font-weight:600; padding-top:14px; width:80px;">${s.total.toFixed(2)}</td>
    </tr>`).join('');

    const fmtTotal = cur + ' ' + totals.total.toLocaleString('de-CH', { minimumFractionDigits: 2 });
    const fmtSubtotal = cur + ' ' + totals.subtotal.toLocaleString('de-CH', { minimumFractionDigits: 2 });
    const fmtVat = cur + ' ' + totals.vatAmt.toLocaleString('de-CH', { minimumFractionDigits: 2 });
    const totalQty = services.reduce((sum, s) => sum + s.qty, 0);
    const perProduct = totalQty > 0 ? (totals.total / totalQty).toFixed(2) : '0.00';
    const vatRate = parseFloat(v.vat_rate) || 0;
    const vatLabel = 'VAT (' + vatRate.toFixed(2) + '%' + (v.vat_note ? ' \u2014 ' + esc(v.vat_note) : '') + ')';

    let html = _proformaTemplateCache;
    html = html.replace(/\{\{REF\}\}/g, esc(ref));
    html = html.replace(/\{\{CLIENT_NAME\}\}/g, esc(v.client_name || ''));
    html = html.replace(/\{\{CLIENT_COMPANY\}\}/g, esc(v.client_company || ''));
    html = html.replace(/\{\{CLIENT_EMAIL\}\}/g, esc(v.client_email || ''));
    html = html.replace(/\{\{CLIENT_ADDRESS\}\}/g, esc(v.client_address || '').replace(/\n/g, '<br>'));
    html = html.replace(/\{\{CLIENT_PHONE\}\}/g, esc(v.client_phone || ''));
    html = html.replace(/\{\{CLIENT_VAT\}\}/g, esc(v.client_vat || ''));
    html = html.replace(/\{\{CLIENT_COUNTRY\}\}/g, esc(v.client_country || ''));
    html = html.replace(/\{\{DATE_ISSUED\}\}/g, fmtDate(v.date));
    html = html.replace(/\{\{DATE_VALID\}\}/g, fmtDate(v.valid_until || ''));
    // Subtitle
    html = html.replace(/\{\{SUBTITLE\}\}/g, esc(v.quote_subtitle || v.subtitle || ''));
    // Currency code for disclaimer
    html = html.replace(/\{\{CURRENCY_CODE\}\}/g, cur);
    // Payment due text
    const depPct = parseFloat(v.deposit_pct) || 0;
    const depAmt = depPct > 0 ? totals.total * depPct / 100 : 0;
    const paymentDueText = depPct > 0 ? depPct + '% upon confirmation' : 'Pre-payment required';
    html = html.replace(/\{\{PAYMENT_DUE\}\}/g, paymentDueText);
    // Payment schedule box
    const balAmt = totals.total - depAmt;
    const paymentSchedule = depPct > 0
      ? `<div style="margin-top:12px; padding:10px 14px; background:var(--teal-light); border-radius:6px;">
      <div style="font-size:8px; font-weight:700; color:var(--teal-dark); text-transform:uppercase; letter-spacing:1px; margin-bottom:6px;">Payment Schedule</div>
      <div style="display:flex; justify-content:space-between; font-size:10px; margin-bottom:3px;"><span style="color:var(--text-light);">Deposit due now (${depPct}%)</span><span style="font-weight:700; color:var(--dark);">${cur} ${depAmt.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span></div>
      <div style="display:flex; justify-content:space-between; font-size:10px;"><span style="color:var(--text-light);">Balance before shipment (${100 - depPct}%)</span><span style="font-weight:700; color:var(--dark);">${cur} ${balAmt.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span></div>
    </div>`
      : '';
    html = html.replace(/\{\{PAYMENT_SCHEDULE\}\}/g, paymentSchedule);
    html = html.replace(/\{\{SERVICE_ROWS\}\}/g, svcRows);
    // Add-ons injection
    const pfAddonsHtml = addonTimelineBlock(services, v) + addonInsuranceBlock(v) + addonBundleBlock(services, v);
    html = html.replace(/OPTIONAL ADD-ONS<\/div>/g, 'OPTIONAL ADD-ONS</div>' + pfAddonsHtml);
    // Remove static insurance promo placeholder (replaced in template data with marker)
    html = html.replace(/<!-- STATIC_INSURANCE_BOX -->/g, '');
    const pfAddonsLine = addonExtra > 0
      ? `<span style="color:var(--text-light);">Add-ons</span><span style="font-weight:600; color:var(--dark);">${cur} ${addonExtra.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>`
      : `<span style="color:var(--text-light);">Optional add-ons</span><span style="color:var(--text-muted); font-style:italic;">none selected</span>`;
    html = html.replace(/<span[^>]*>Optional add-ons<\/span><span[^>]*>on request<\/span>/g, pfAddonsLine);
    html = html.replace(/\{\{SUBTOTAL_CHF\}\}/g, fmtSubtotal);
    html = html.replace(/\{\{TOTAL_CHF\}\}/g, fmtTotal);
    html = html.replace(/\{\{VAT_CHF\}\}/g, fmtVat);
    html = html.replace(/\{\{VAT_LABEL\}\}/g, vatLabel);
    html = html.replace(/\{\{PER_PRODUCT\}\}/g, cur + ' ' + perProduct);

    // Bank details based on selected currency
    const _bd = (COMPANY.bankDetails && COMPANY.bankDetails[cur]) || COMPANY.bankDetails.CHF;
    html = html.replace(/\{\{BANK_IBAN\}\}/g, _bd.iban);
    html = html.replace(/\{\{BANK_BIC\}\}/g, _bd.bic);
    html = html.replace(/\{\{BANK_IID\}\}/g, _bd.iid);

    // Notes
    html = html.replace(/\{\{NOTES\}\}/g, templateNotesBlock(v.notes));

    const exportPatch2 = '<style>.page{height:auto !important; min-height:var(--page-h); overflow:visible !important; display:flex !important; flex-direction:column !important;} .page-inner{height:auto !important; min-height:0 !important; flex:1 1 auto !important;} .page > div:not(.page-inner){position:relative !important; bottom:auto !important; left:0 !important; right:0 !important; flex-shrink:0 !important; margin-left:0 !important; margin-right:0 !important; box-sizing:border-box !important;}</style>';
    html = html.replace(/<\/head>/i, exportPatch2 + '</head>');
    _lastProformaExportHtml = html;

    const previewPatch = '<style>body{background:#fff !important;padding:0 !important;} .page{margin:0 auto 20px !important;}</style>';
    const patched = html.replace(/<\/head>/i, previewPatch + '</head>');
    const escaped = patched.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    return `<iframe srcdoc="${escaped}" style="width:100%;min-width:820px;border:none;min-height:2400px;background:#fff;" onload="this.style.height=this.contentDocument.body.scrollHeight+40+'px'"></iframe>`;
  }

  // Fallback
  return `
  <div class="quote-header-bar">
    <div class="quote-logo-text">MySwissLab<sup class="quote-logo-plus">+</sup></div>
    <div class="quote-header-right"><span>${COMPANY.email}</span><span>${COMPANY.phone}</span><span class="quote-ref-badge">#${esc(invRef)}</span></div>
  </div>
  <div style="margin-bottom:20px;">
    <div class="quote-label" style="color:#5a3e8a">PRO FORMA INVOICE #${esc(invRef)}</div>
    <div class="quote-title">Pro Forma Invoice</div>
  </div>
  ${statsBarBlock(v)}
  <div class="msl-meta">
    <div class="meta-block"><div class="lbl">Prepared For</div><div class="val">${esc(v.client_company) || '\u2014'}</div><div class="sub">${clientBlock(v)}</div></div>
    <div class="meta-block"><div class="lbl">Issued By</div><div class="val">${COMPANY.name}</div><div class="sub">${issuerBlock()}</div></div>
  </div>
  ${serviceTable(services)}
  ${addonTimelineBlock(services, v)}
  ${addonInsuranceBlock(v)}
  ${addonBundleBlock(services, v)}
  ${totalsBlock(totals, v.vat_rate, v.vat_note, v.deposit_pct)}
  ${bankBox(invRef, totals.total)}
  ${notesBlock(v.notes)}
  ${footerBlock()}`;
}

// ── 3. COMMERCIAL INVOICE (uses external template) ──

let _lastInvoiceExportHtml = null;
var _invoiceTemplateCache = (typeof INVOICE_TEMPLATE_HTML !== 'undefined') ? INVOICE_TEMPLATE_HTML : (typeof window !== 'undefined' && window.INVOICE_TEMPLATE_HTML) ? window.INVOICE_TEMPLATE_HTML : null;
if (!_invoiceTemplateCache) console.warn('Invoice template not loaded');

function renderInvoice(v) {
  const services = parseServices(v.services);
  const addonExtra = addonsTotalAmount(v);
  const totals = calcTotals(services, v.vat_rate, addonExtra);
  const ref = v.order_number || '\u2014';
  const invRef = 'CI-' + ref.replace(/^OC-|^PI-|^CI-/g, '');
  const cur = (CURRENCIES[_activeCurrency] || CURRENCIES.CHF).code;

  if (_invoiceTemplateCache) {
    const svcRows = services.map((s, i) => `
    <tr>
      <td style="padding:12px 0; vertical-align:top; border-bottom:1px solid #f0f0f0; font-size:10px; color:var(--text-muted); padding-top:14px; width:28px;">${i + 1}</td>
      <td style="padding:12px 0; vertical-align:top; border-bottom:1px solid #f0f0f0;">
        <div style="font-size:11.5px; font-weight:700; color:var(--dark); margin-bottom:3px;">${esc(s.name)}</div>
        ${s.detail ? svcDetailHtml(s.detail) : ''}
      </td>
      <td style="padding:12px 0; vertical-align:top; border-bottom:1px solid #f0f0f0; text-align:center; font-size:10px; padding-top:14px; width:50px;">${s.qty}</td>
      <td style="padding:12px 0; vertical-align:top; border-bottom:1px solid #f0f0f0; text-align:right; font-size:10px; font-weight:600; padding-top:14px; width:75px;">${s.unit.toFixed(2)}</td>
      <td style="padding:12px 0; vertical-align:top; border-bottom:1px solid #f0f0f0; text-align:right; font-size:10px; font-weight:600; padding-top:14px; width:80px;">${s.total.toFixed(2)}</td>
    </tr>`).join('');

    const fmtTotal = cur + ' ' + totals.total.toLocaleString('de-CH', { minimumFractionDigits: 2 });
    const fmtSubtotal = cur + ' ' + totals.subtotal.toLocaleString('de-CH', { minimumFractionDigits: 2 });
    const fmtVat = cur + ' ' + totals.vatAmt.toLocaleString('de-CH', { minimumFractionDigits: 2 });
    const totalQty = services.reduce((sum, s) => sum + s.qty, 0);
    const perProduct = totalQty > 0 ? (totals.total / totalQty).toFixed(2) : '0.00';
    const vatRate = parseFloat(v.vat_rate) || 0;
    const vatLabel = 'VAT (' + vatRate.toFixed(2) + '%' + (v.vat_note ? ' \u2014 ' + esc(v.vat_note) : '') + ')';

    let html = _invoiceTemplateCache;
    html = html.replace(/\{\{REF\}\}/g, esc(ref));
    html = html.replace(/\{\{CLIENT_NAME\}\}/g, esc(v.client_name || ''));
    html = html.replace(/\{\{CLIENT_COMPANY\}\}/g, esc(v.client_company || ''));
    html = html.replace(/\{\{CLIENT_EMAIL\}\}/g, esc(v.client_email || ''));
    html = html.replace(/\{\{CLIENT_ADDRESS\}\}/g, esc(v.client_address || '').replace(/\n/g, '<br>'));
    html = html.replace(/\{\{CLIENT_PHONE\}\}/g, esc(v.client_phone || ''));
    html = html.replace(/\{\{CLIENT_VAT\}\}/g, esc(v.client_vat || ''));
    // Description: remove from title area, inject as a row below services
    html = html.replace(/<div[^>]*>\{\{DESCRIPTION\}\}<\/div>/g, '');
    html = html.replace(/\{\{DESCRIPTION\}\}/g, '');
    html = html.replace(/\{\{DATE_ISSUED\}\}/g, fmtDate(v.date));
    html = html.replace(/\{\{DATE_DUE\}\}/g, fmtDate(v.due_date || ''));
    html = html.replace(/<div[^>]*>\{\{DESCRIPTION\}\}<\/div>/g, '');
    html = html.replace(/\{\{DESCRIPTION\}\}/g, '');
    html = html.replace(/\{\{SERVICE_ROWS\}\}/g, svcRows);
    // Add-ons injection
    const invAddonsHtml = addonTimelineBlock(services, v) + addonInsuranceBlock(v) + addonBundleBlock(services, v);
    html = html.replace(/OPTIONAL ADD-ONS<\/div>/g, 'OPTIONAL ADD-ONS</div>' + invAddonsHtml);
    // Remove static insurance promo placeholder (replaced in template data with marker)
    html = html.replace(/<!-- STATIC_INSURANCE_BOX -->/g, '');
    const invAddonsLine = addonExtra > 0
      ? `<span style="color:var(--text-light);">Add-ons</span><span style="font-weight:600; color:var(--dark);">${cur} ${addonExtra.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>`
      : `<span style="color:var(--text-light);">Optional add-ons</span><span style="color:var(--text-muted); font-style:italic;">none selected</span>`;
    html = html.replace(/<span[^>]*>Optional add-ons<\/span><span[^>]*>on request<\/span>/g, invAddonsLine);
    html = html.replace(/\{\{SUBTOTAL_CHF\}\}/g, fmtSubtotal);
    html = html.replace(/\{\{TOTAL_CHF\}\}/g, fmtTotal);
    html = html.replace(/\{\{VAT_CHF\}\}/g, fmtVat);
    html = html.replace(/\{\{VAT_LABEL\}\}/g, vatLabel);
    html = html.replace(/\{\{PER_PRODUCT\}\}/g, cur + ' ' + perProduct);

    const depPct = parseFloat(v.deposit_pct) || 0;
    const depAmt = depPct > 0 ? totals.total * depPct / 100 : 0;
    const depositRow = depPct > 0
      ? `<div style="display:flex; justify-content:space-between; padding-top:8px; margin-top:4px; border-top:1px dashed var(--teal, #31AD8A);">
          <span style="font-family:var(--font-display, inherit); font-size:12px; font-weight:800; color:#5a3e8a;">${depPct}% Deposit</span>
          <span style="font-family:var(--font-display, inherit); font-size:12px; font-weight:800; color:#5a3e8a;">${cur} ${depAmt.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
        </div>`
      : '';
    html = html.replace(/\{\{DEPOSIT_ROW\}\}/g, depositRow);

    // Bank details based on selected currency
    const _bd = (COMPANY.bankDetails && COMPANY.bankDetails[cur]) || COMPANY.bankDetails.CHF;
    html = html.replace(/\{\{BANK_IBAN\}\}/g, _bd.iban);
    html = html.replace(/\{\{BANK_BIC\}\}/g, _bd.bic);
    html = html.replace(/\{\{BANK_IID\}\}/g, _bd.iid);

    // Notes
    html = html.replace(/\{\{NOTES\}\}/g, templateNotesBlock(v.notes));

    const exportPatch3 = '<style>.page{height:auto !important; min-height:var(--page-h); overflow:visible !important; display:flex !important; flex-direction:column !important;} .page-inner{height:auto !important; min-height:0 !important; flex:1 1 auto !important;} .page > div:not(.page-inner){position:relative !important; bottom:auto !important; left:0 !important; right:0 !important; flex-shrink:0 !important; margin-left:0 !important; margin-right:0 !important; box-sizing:border-box !important;}</style>';
    html = html.replace(/<\/head>/i, exportPatch3 + '</head>');
    _lastInvoiceExportHtml = html;

    const previewPatch = '<style>body{background:#fff !important;padding:0 !important;} .page{margin:0 auto 20px !important;}</style>';
    const patched = html.replace(/<\/head>/i, previewPatch + '</head>');
    const escaped = patched.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    return `<iframe srcdoc="${escaped}" style="width:100%;min-width:820px;border:none;min-height:2400px;background:#fff;" onload="this.style.height=this.contentDocument.body.scrollHeight+40+'px'"></iframe>`;
  }

  // Fallback
  return `
  <div class="quote-header-bar">
    <div class="quote-logo-text">MySwissLab<sup class="quote-logo-plus">+</sup></div>
    <div class="quote-header-right"><span>${COMPANY.email}</span><span>${COMPANY.phone}</span><span class="quote-ref-badge" style="background:#c0392b">#${esc(invRef)}</span></div>
  </div>
  <div style="margin-bottom:20px;">
    <div class="quote-label" style="color:#c0392b">COMMERCIAL INVOICE #${esc(invRef)}</div>
    <div class="quote-title">Commercial Invoice</div>
  </div>
  ${statsBarBlock(v)}
  <div class="msl-meta">
    <div class="meta-block"><div class="lbl">Prepared For</div><div class="val">${esc(v.client_company) || '\u2014'}</div><div class="sub">${clientBlock(v)}</div></div>
    <div class="meta-block"><div class="lbl">Issued By</div><div class="val">${COMPANY.name}</div><div class="sub">${issuerBlock()}</div></div>
  </div>
  ${serviceTable(services)}
  ${addonTimelineBlock(services, v)}${addonInsuranceBlock(v)}${addonBundleBlock(services, v)}
  ${totalsBlock(totals, v.vat_rate, v.vat_note, v.deposit_pct)}
  ${bankBox(invRef, totals.total)}
  ${notesBlock(v.notes)}
  ${footerBlock()}`;
}

// ── 4. ORDER CONFIRMATION (uses external template) ──

let _lastOrderConfExportHtml = null;
var _orderConfTemplateCache = (typeof ORDERCONF_TEMPLATE_HTML !== 'undefined') ? ORDERCONF_TEMPLATE_HTML : (typeof window !== 'undefined' && window.ORDERCONF_TEMPLATE_HTML) ? window.ORDERCONF_TEMPLATE_HTML : null;
if (!_orderConfTemplateCache) console.warn('OrderConf template not loaded');

function renderOrderConf(v) {
  const services = parseServices(v.services);
  const addonExtra = addonsTotalAmount(v);
  const totals = calcTotals(services, v.vat_rate, addonExtra);
  const ref = v.order_number || '\u2014';
  const cur = (CURRENCIES[_activeCurrency] || CURRENCIES.CHF).code;

  if (_orderConfTemplateCache) {
    const svcRows = services.map((s, i) => `
    <tr>
      <td style="padding:12px 0; vertical-align:top; border-bottom:1px solid #f0f0f0; font-size:10px; color:var(--text-muted); padding-top:14px; width:28px;">${i + 1}</td>
      <td style="padding:12px 0; vertical-align:top; border-bottom:1px solid #f0f0f0;">
        <div style="font-size:11.5px; font-weight:700; color:var(--dark); margin-bottom:3px;">${esc(s.name)}</div>
        ${s.detail ? svcDetailHtml(s.detail) : ''}
      </td>
      <td style="padding:12px 0; vertical-align:top; border-bottom:1px solid #f0f0f0; text-align:center; font-size:10px; padding-top:14px; width:50px;">${s.qty}</td>
      <td style="padding:12px 0; vertical-align:top; border-bottom:1px solid #f0f0f0; text-align:right; font-size:10px; font-weight:600; padding-top:14px; width:75px;">${s.unit.toFixed(2)}</td>
      <td style="padding:12px 0; vertical-align:top; border-bottom:1px solid #f0f0f0; text-align:right; font-size:10px; font-weight:600; padding-top:14px; width:80px;">${s.total.toFixed(2)}</td>
    </tr>`).join('');

    const fmtTotal = cur + ' ' + totals.total.toLocaleString('de-CH', { minimumFractionDigits: 2 });
    const fmtSubtotal = cur + ' ' + totals.subtotal.toLocaleString('de-CH', { minimumFractionDigits: 2 });
    const fmtVat = cur + ' ' + totals.vatAmt.toLocaleString('de-CH', { minimumFractionDigits: 2 });
    const totalQty = services.reduce((sum, s) => sum + s.qty, 0);
    const perProduct = totalQty > 0 ? (totals.total / totalQty).toFixed(2) : '0.00';
    const vatRate = parseFloat(v.vat_rate) || 0;
    const vatLabel = 'VAT (' + vatRate.toFixed(2) + '%' + (v.vat_note ? ' \u2014 ' + esc(v.vat_note) : '') + ')';

    let html = _orderConfTemplateCache;
    html = html.replace(/\{\{REF\}\}/g, esc(ref));
    html = html.replace(/\{\{CLIENT_NAME\}\}/g, esc(v.client_name || ''));
    html = html.replace(/\{\{CLIENT_COMPANY\}\}/g, esc(v.client_company || ''));
    html = html.replace(/\{\{CLIENT_EMAIL\}\}/g, esc(v.client_email || ''));
    html = html.replace(/\{\{CLIENT_ADDRESS\}\}/g, esc(v.client_address || '').replace(/\n/g, '<br>'));
    html = html.replace(/\{\{CLIENT_PHONE\}\}/g, esc(v.client_phone || ''));
    html = html.replace(/\{\{CLIENT_VAT\}\}/g, esc(v.client_vat || ''));
    // Description: remove from title area, inject as a row below services
    html = html.replace(/<div[^>]*>\{\{DESCRIPTION\}\}<\/div>/g, '');
    html = html.replace(/\{\{DESCRIPTION\}\}/g, '');
    html = html.replace(/\{\{DATE_ISSUED\}\}/g, fmtDate(v.date));
    html = html.replace(/\{\{DATE_DUE\}\}/g, fmtDate(v.due_date || v.est_delivery || ''));
    html = html.replace(/<div[^>]*>\{\{DESCRIPTION\}\}<\/div>/g, '');
    html = html.replace(/\{\{DESCRIPTION\}\}/g, '');
    html = html.replace(/\{\{SERVICE_ROWS\}\}/g, svcRows);
    // Add-ons injection
    const ocAddonsHtml = addonTimelineBlock(services, v) + addonInsuranceBlock(v) + addonBundleBlock(services, v);
    html = html.replace(/OPTIONAL ADD-ONS<\/div>/g, 'OPTIONAL ADD-ONS</div>' + ocAddonsHtml);
    // Remove static insurance promo placeholder (replaced in template data with marker)
    html = html.replace(/<!-- STATIC_INSURANCE_BOX -->/g, '');
    const ocAddonsLine = addonExtra > 0
      ? `<span style="color:var(--text-light);">Add-ons</span><span style="font-weight:600; color:var(--dark);">${cur} ${addonExtra.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>`
      : `<span style="color:var(--text-light);">Optional add-ons</span><span style="color:var(--text-muted); font-style:italic;">none selected</span>`;
    html = html.replace(/<span[^>]*>Optional add-ons<\/span><span[^>]*>on request<\/span>/g, ocAddonsLine);
    html = html.replace(/\{\{SUBTOTAL_CHF\}\}/g, fmtSubtotal);
    html = html.replace(/\{\{TOTAL_CHF\}\}/g, fmtTotal);
    html = html.replace(/\{\{VAT_CHF\}\}/g, fmtVat);
    html = html.replace(/\{\{VAT_LABEL\}\}/g, vatLabel);
    html = html.replace(/\{\{PER_PRODUCT\}\}/g, cur + ' ' + perProduct);

    const depPctOC = parseFloat(v.deposit_pct) || 0;
    const depAmtOC = depPctOC > 0 ? totals.total * depPctOC / 100 : 0;
    const depositRowOC = depPctOC > 0
      ? `<div style="display:flex; justify-content:space-between; padding-top:8px; margin-top:4px; border-top:1px dashed var(--teal, #31AD8A);">
          <span style="font-family:var(--font-display, inherit); font-size:12px; font-weight:800; color:#5a3e8a;">${depPctOC}% Deposit</span>
          <span style="font-family:var(--font-display, inherit); font-size:12px; font-weight:800; color:#5a3e8a;">${cur} ${depAmtOC.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
        </div>`
      : '';
    html = html.replace(/\{\{DEPOSIT_ROW\}\}/g, depositRowOC);

    // Bank details based on selected currency
    const _bd = (COMPANY.bankDetails && COMPANY.bankDetails[cur]) || COMPANY.bankDetails.CHF;
    html = html.replace(/\{\{BANK_IBAN\}\}/g, _bd.iban);
    html = html.replace(/\{\{BANK_BIC\}\}/g, _bd.bic);
    html = html.replace(/\{\{BANK_IID\}\}/g, _bd.iid);

    // Notes
    html = html.replace(/\{\{NOTES\}\}/g, templateNotesBlock(v.notes));

    const exportPatch4 = '<style>.page{height:auto !important; min-height:var(--page-h); overflow:visible !important; display:flex !important; flex-direction:column !important;} .page-inner{height:auto !important; min-height:0 !important; flex:1 1 auto !important;} .page > div:not(.page-inner){position:relative !important; bottom:auto !important; left:0 !important; right:0 !important; flex-shrink:0 !important; margin-left:0 !important; margin-right:0 !important; box-sizing:border-box !important;}</style>';
    html = html.replace(/<\/head>/i, exportPatch4 + '</head>');
    _lastOrderConfExportHtml = html;

    const previewPatch = '<style>body{background:#fff !important;padding:0 !important;} .page{margin:0 auto 20px !important;}</style>';
    const patched = html.replace(/<\/head>/i, previewPatch + '</head>');
    const escaped = patched.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    return `<iframe srcdoc="${escaped}" style="width:100%;min-width:820px;border:none;min-height:2400px;background:#fff;" onload="this.style.height=this.contentDocument.body.scrollHeight+40+'px'"></iframe>`;
  }

  // Fallback
  return `
  <div class="quote-header-bar">
    <div class="quote-logo-text">MySwissLab<sup class="quote-logo-plus">+</sup></div>
    <div class="quote-header-right"><span>${COMPANY.email}</span><span>${COMPANY.phone}</span><span class="quote-ref-badge">#OC-${esc(ref)}</span></div>
  </div>
  <div style="margin-bottom:20px;">
    <div class="quote-label">ORDER CONFIRMATION #OC-${esc(ref)}</div>
    <div class="quote-title">Order Confirmation</div>
  </div>
  ${statsBarBlock(v)}
  <div class="msl-meta">
    <div class="meta-block"><div class="lbl">Prepared For</div><div class="val">${esc(v.client_company) || '\u2014'}</div><div class="sub">${clientBlock(v)}</div></div>
    <div class="meta-block"><div class="lbl">Issued By</div><div class="val">${COMPANY.name}</div><div class="sub">${issuerBlock()}</div></div>
  </div>
  ${serviceTable(services)}
  ${addonTimelineBlock(services, v)}${addonInsuranceBlock(v)}${addonBundleBlock(services, v)}
  ${totalsBlock(totals, v.vat_rate, v.vat_note, v.deposit_pct)}
  ${notesBlock(v.notes)}
  ${footerBlock()}`;
}

// ── Standalone HTML Export ───────────────────────────

function wrapForExport(innerHTML) {
  // If we have a stored template export (full HTML with page sizing), use it for download
  if (_lastQuoteExportHtml) return _lastQuoteExportHtml;
  if (_lastProformaExportHtml) return _lastProformaExportHtml;
  if (_lastInvoiceExportHtml) return _lastInvoiceExportHtml;
  if (_lastOrderConfExportHtml) return _lastOrderConfExportHtml;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>MySwissLab — Document</title>
<style>${MSL_CSS}
@media print { .no-print { display: none } }
</style></head><body>
${innerHTML}
<button class="no-print" onclick="window.print()" style="position:fixed;bottom:20px;right:20px;background:#1a6b4a;color:white;border:none;padding:10px 22px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.2)">⬇ Print / Save PDF</button>
</body></html>`;
}

// ── MSL shared CSS (embedded in export) ─────────────

const MSL_CSS = `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
       padding: 32px; color: #1d1d1f; font-size: 12px; max-width: 820px; margin: 0 auto;
       word-wrap: break-word; overflow-wrap: break-word; }
.msl-banner { padding: 10px 16px; border-radius: 8px; font-size: 10px; margin-bottom: 20px; color: white; }
.msl-banner strong { display: block; font-size: 8px; letter-spacing: 2px;
                 text-transform: uppercase; opacity: 0.7; margin-bottom: 4px; }
.msl-logo { margin-bottom: 20px; }
.msl-logo h1 { font-size: 22px; font-weight: 800; color: #1a6b4a; }
.msl-ref { font-size: 11px; color: #6e6e73; margin-top: 2px; }
.msl-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
        background: #f5f5f7; padding: 16px; border-radius: 8px; margin-bottom: 20px; }
.meta-block .lbl { font-size: 9px; font-weight: 700; text-transform: uppercase;
                   letter-spacing: 1px; color: #6e6e73; margin-bottom: 4px; }
.meta-block .val { font-size: 12px; font-weight: 700; color: #1d1d1f; }
.meta-block .sub { font-size: 10px; color: #6e6e73; line-height: 1.7; margin-top: 2px; }
table { width: 100%; border-collapse: collapse; margin: 16px 0; table-layout: fixed; }
td, th { word-wrap: break-word; overflow-wrap: break-word; }
thead th { font-size: 9px; font-weight: 700; text-transform: uppercase;
           letter-spacing: 1px; color: #6e6e73; padding: 8px 10px;
           border-bottom: 2px solid #d2d2d7; text-align: left; }
tbody td { padding: 10px; border-bottom: 1px solid #f0f0f0; font-size: 11px; vertical-align: top; }
.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
.totals { text-align: right; background: #f5f5f7; padding: 14px 16px;
          border-radius: 8px; margin-top: 8px; }
.totals .row { display: flex; justify-content: space-between;
               padding: 3px 0; font-size: 11px; color: #6e6e73; }
.totals .grand { font-size: 16px; font-weight: 800; color: #1a6b4a;
                 margin-top: 8px; padding-top: 8px; border-top: 2px solid #d2d2d7; }
.totals .deposit { font-size: 13px; font-weight: 700; color: #5a3e8a;
                   margin-top: 6px; padding-top: 6px; border-top: 1px dashed #b39ddb; text-align: right; }
.bankbox { background: #e8f4ef; border-radius: 8px; padding: 14px 16px; margin: 16px 0; }
.bankbox .lbl { font-size: 9px; font-weight: 700; text-transform: uppercase;
                letter-spacing: 1px; color: #1a6b4a; margin-bottom: 8px; }
.bankbox .row { display: flex; justify-content: space-between;
                font-size: 11px; padding: 3px 0; }
.bankbox .row span:first-child { color: #6e6e73; }
.msl-steps { background: #e8f4ef; border-radius: 8px; padding: 16px; margin-top: 16px; }
.msl-steps h3 { font-size: 11px; font-weight: 700; color: #1a6b4a; margin-bottom: 10px; }
.step { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 6px; font-size: 10px; }
.step-num { width: 18px; height: 18px; border-radius: 50%; background: #1a6b4a;
            color: white; font-size: 9px; font-weight: 700;
            display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.msl-footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #d2d2d7;
          font-size: 9px; color: #6e6e73; line-height: 1.9; }
.guarantee { background: #f5f5f7; border-radius: 8px; padding: 12px 14px;
             font-size: 10px; color: #6e6e73; margin-top: 16px; }
.guarantee strong { color: #1d1d1f; }
.msl-warn { background: #fff8e1; border-radius: 6px; padding: 10px 14px;
        font-size: 10px; color: #7a6200; margin-bottom: 16px; }
.quote-header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
.quote-logo-text { font-size: 22px; font-weight: 700; color: #111; letter-spacing: -0.3px; }
.quote-logo-plus { font-size: 10px; color: #31AD8A; font-weight: 700; vertical-align: super; }
.quote-header-right { display: flex; align-items: center; gap: 16px; font-size: 9px; color: #6e6e73; letter-spacing: 0.2px; }
.quote-ref-badge { background: #31AD8A; color: #fff; font-size: 9px; font-weight: 700; padding: 4px 10px; border-radius: 3px; letter-spacing: 0.5px; }
.quote-label { font-size: 10px; font-weight: 700; color: #31AD8A; text-transform: uppercase; letter-spacing: 2.5px; margin-bottom: 6px; }
.quote-title { font-size: 30px; font-weight: 400; color: #111; line-height: 1.15; margin-bottom: 6px; }
.quote-dates-row { display: flex; gap: 40px; margin-bottom: 24px; }
.quote-date-label { font-size: 7.5px; font-weight: 700; color: #31AD8A; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 3px; }
.quote-date-value { font-size: 12px; font-weight: 700; color: #111; }
.quote-stats-bar { display: flex; background: #f5f5f7; padding: 12px 0; margin-bottom: 20px; border-radius: 0; }
.quote-stat { flex: 1; text-align: center; padding: 4px 8px; }
.quote-stat + .quote-stat { border-left: 1px solid #d2d2d7; }
.quote-stat-num { font-size: 16px; font-weight: 800; color: #31AD8A; }
.quote-stat-lbl { font-size: 7px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-top: 1px; }`;
