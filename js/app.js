const TOOL_CONFIG = {
  "slug": "unix-timestamp-converter",
  "title": "Unix Timestamp Converter",
  "shortTitle": "Unix Time",
  "description": "Convert Unix timestamps to readable dates and turn local dates back into seconds or milliseconds.",
  "type": "timestamp",
  "color": "#475569",
  "accent": "#f59e0b",
  "timezones": [
    "UTC",
    "America/New_York",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Berlin",
    "Asia/Seoul",
    "Asia/Tokyo",
    "Asia/Singapore",
    "Australia/Sydney"
  ]
};

(function() {
  'use strict';

  let selectedFile = null;
  let selectedImage = null;
  let lastPrimaryText = '';

  const decimalUnits = {
    B: 1,
    KB: 1000,
    MB: 1000000,
    GB: 1000000000,
    TB: 1000000000000,
    PB: 1000000000000000
  };
  const binaryUnits = {
    KiB: 1024,
    MiB: 1048576,
    GiB: 1073741824,
    TiB: 1099511627776
  };
  const mimeTypes = {
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    html: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    zip: 'application/zip',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4'
  };

  function $(selector) {
    return document.querySelector(selector);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function(char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function formatNumber(value, digits) {
    if (!Number.isFinite(value)) return '-';
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits == null ? 6 : digits }).format(value);
  }

  function bytesToHuman(bytes) {
    if (!Number.isFinite(bytes)) return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let value = bytes;
    let index = 0;
    while (value >= 1000 && index < units.length - 1) {
      value /= 1000;
      index += 1;
    }
    return formatNumber(value, 2) + ' ' + units[index];
  }

  function setResult(html, primaryText) {
    const out = $('#result-output');
    if (out) out.innerHTML = html;
    lastPrimaryText = primaryText || out?.innerText || '';
  }

  function hideLoader() {
    const loader = document.getElementById('app-loader');
    if (loader) {
      loader.classList.add('hidden');
      setTimeout(function() {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      }, 260);
    }
  }

  function field(label, html, full) {
    return '<div class="field' + (full ? ' full' : '') + '"><label>' + label + '</label>' + html + '</div>';
  }

  function render() {
    const panel = $('#tool-panel');
    const notes = $('#tool-notes');
    if (!panel || !notes) return;
    notes.innerHTML = getNotes().map(function(note) { return '<li>' + escapeHtml(note) + '</li>'; }).join('');
    panel.innerHTML = getForm();
    attachToolEvents();
    calculate();
  }

  function getNotes() {
    const notes = {
      extension: [
        'Renaming an extension does not convert file contents.',
        'Use the download button only when you understand the target format.',
        'MIME hints help you spot common extension mistakes.'
      ],
      fileSize: [
        'Decimal KB uses 1,000 bytes; binary KiB uses 1,024 bytes.',
        'Storage vendors usually show decimal units.',
        'Operating systems often show binary-style sizes.'
      ],
      imageFormat: [
        'Images are decoded and re-encoded locally with canvas.',
        'JPEG quality affects file size and visual detail.',
        'Animated GIF frames are not preserved by canvas export.'
      ],
      imageSize: [
        'Lock ratio to avoid stretching images.',
        'DPI changes print size math, not screen pixels.',
        'Export is local and uses the browser canvas.'
      ],
      aspectRatio: [
        'Ratios are simplified with the greatest common divisor.',
        'Use presets for video and social media layouts.',
        'Leave one dimension blank to calculate it from a ratio.'
      ],
      transfer: [
        'Internet speeds are usually bits per second.',
        'File sizes are usually bytes.',
        'Real transfer time can be slower because of overhead.'
      ],
      timestamp: [
        'Unix seconds are 10 digits; milliseconds are 13 digits.',
        'Local time depends on your browser time zone.',
        'UTC output is best for logs and APIs.'
      ],
      timezone: [
        'Time zone math uses your browser Intl engine.',
        'DST is handled by the selected IANA time zone.',
        'Use UTC when sharing logs or backend times.'
      ],
      textCase: [
        'Case conversion happens locally.',
        'camelCase removes punctuation and spaces.',
        'Review acronyms before publishing title case text.'
      ],
      json: [
        'Validation happens in the browser.',
        'Formatter preserves data but changes whitespace.',
        'JSON does not allow comments or trailing commas.'
      ]
    };
    return notes[TOOL_CONFIG.type] || [];
  }

  function getForm() {
    const type = TOOL_CONFIG.type;
    if (type === 'extension') {
      return '<div class="form-grid">' +
        field('File name', '<input id="filename" value="report.final.txt" autocomplete="off">') +
        field('Target extension', '<input id="target-ext" value="csv" autocomplete="off">') +
        field('Optional file', '<input id="file-input" type="file">', true) +
        '</div><div class="button-row"><button class="primary-btn" data-action="download-renamed" type="button">Download renamed copy</button></div>';
    }
    if (type === 'fileSize') {
      return '<div class="form-grid">' +
        field('Value', '<input id="size-value" type="number" min="0" step="any" value="25">') +
        field('Unit', '<select id="size-unit"><option>MB</option><option>KB</option><option>GB</option><option>B</option><option>TB</option><option>PB</option><option>KiB</option><option>MiB</option><option>GiB</option><option>TiB</option></select>') +
        '</div>';
    }
    if (type === 'imageFormat') {
      return '<div class="form-grid">' +
        field('Image file', '<input id="image-input" type="file" accept="image/*">', true) +
        field('Output format', '<select id="image-format"><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option></select>') +
        field('Quality', '<input id="image-quality" type="range" min="0.1" max="1" step="0.05" value="0.9">') +
        '</div><div class="button-row"><button class="primary-btn" data-action="download-image" type="button">Download converted image</button></div>';
    }
    if (type === 'imageSize') {
      return '<div class="form-grid">' +
        field('Image file', '<input id="resize-input" type="file" accept="image/*">', true) +
        field('Width px', '<input id="resize-width" type="number" min="1" step="1" value="1920">') +
        field('Height px', '<input id="resize-height" type="number" min="1" step="1" value="1080">') +
        field('DPI', '<input id="resize-dpi" type="number" min="1" step="1" value="300">') +
        field('Lock ratio', '<select id="resize-lock"><option value="yes">Yes</option><option value="no">No</option></select>') +
        '</div><div class="button-row"><button class="primary-btn" data-action="download-resized" type="button">Download resized image</button><button class="ghost-btn" data-preset="1280x720" type="button">1280x720</button><button class="ghost-btn" data-preset="1080x1080" type="button">1080x1080</button></div>';
    }
    if (type === 'aspectRatio') {
      return '<div class="form-grid">' +
        field('Width', '<input id="ratio-width" type="number" min="0" step="1" value="1920">') +
        field('Height', '<input id="ratio-height" type="number" min="0" step="1" value="1080">') +
        field('Ratio width', '<input id="ratio-a" type="number" min="1" step="1" value="16">') +
        field('Ratio height', '<input id="ratio-b" type="number" min="1" step="1" value="9">') +
        '</div><div class="button-row"><button class="ghost-btn" data-ratio="16:9" type="button">16:9</button><button class="ghost-btn" data-ratio="4:3" type="button">4:3</button><button class="ghost-btn" data-ratio="1:1" type="button">1:1</button><button class="ghost-btn" data-ratio="9:16" type="button">9:16</button></div>';
    }
    if (type === 'transfer') {
      return '<div class="form-grid">' +
        field('File size', '<input id="transfer-size" type="number" min="0" step="any" value="4.7">') +
        field('Size unit', '<select id="transfer-size-unit"><option>GB</option><option>MB</option><option>KB</option><option>TB</option></select>') +
        field('Connection speed', '<input id="transfer-speed" type="number" min="0" step="any" value="100">') +
        field('Speed unit', '<select id="transfer-speed-unit"><option>Mbps</option><option>MB/s</option><option>Kbps</option><option>Gbps</option></select>') +
        '</div>';
    }
    if (type === 'timestamp') {
      return '<div class="form-grid">' +
        field('Unix timestamp', '<input id="timestamp-value" value="' + Math.floor(Date.now() / 1000) + '">') +
        field('Local date and time', '<input id="datetime-value" type="datetime-local">') +
        '</div><div class="button-row"><button class="ghost-btn" data-action="now" type="button">Use current time</button></div>';
    }
    if (type === 'timezone') {
      return '<div class="form-grid">' +
        field('Date and time', '<input id="tz-datetime" type="datetime-local">') +
        field('Source time zone', '<select id="tz-source">' + TOOL_CONFIG.timezones.map(function(tz) { return '<option value="' + tz + '">' + tz + '</option>'; }).join('') + '</select>') +
        '</div>';
    }
    if (type === 'textCase') {
      return '<div class="form-grid">' + field('Text', '<textarea id="text-input">launch faster with clean browser tools</textarea>', true) + '</div>';
    }
    if (type === 'json') {
      return '<div class="form-grid">' + field('JSON input', '<textarea id="json-input">{ "name": "DopaBrain", "tools": 25, "free": true }</textarea>', true) + '</div><div class="button-row"><button class="primary-btn" data-action="format-json" type="button">Format</button><button class="ghost-btn" data-action="minify-json" type="button">Minify</button><button class="ghost-btn" data-action="sample-json" type="button">Sample</button></div>';
    }
    return '';
  }

  function attachToolEvents() {
    document.querySelectorAll('#tool-panel input, #tool-panel select, #tool-panel textarea').forEach(function(el) {
      el.addEventListener('input', calculate);
      el.addEventListener('change', handleChange);
    });
    document.querySelectorAll('#tool-panel button').forEach(function(button) {
      button.addEventListener('click', handleButton);
    });
  }

  function handleChange(event) {
    if (event.target.id === 'file-input') selectedFile = event.target.files[0] || null;
    if (event.target.id === 'image-input') loadImageFile(event.target.files[0], false);
    if (event.target.id === 'resize-input') loadImageFile(event.target.files[0], true);
    calculate();
  }

  function handleButton(event) {
    const action = event.currentTarget.dataset.action;
    const preset = event.currentTarget.dataset.preset;
    const ratio = event.currentTarget.dataset.ratio;
    if (preset) {
      const parts = preset.split('x');
      $('#resize-width').value = parts[0];
      $('#resize-height').value = parts[1];
      calculate();
    }
    if (ratio) {
      const parts = ratio.split(':');
      $('#ratio-a').value = parts[0];
      $('#ratio-b').value = parts[1];
      calculate();
    }
    if (action === 'download-renamed') downloadRenamed();
    if (action === 'download-image') downloadCanvasImage('converted');
    if (action === 'download-resized') downloadResized();
    if (action === 'now') setTimestampNow();
    if (action === 'format-json' || action === 'minify-json') calculate(action);
    if (action === 'sample-json') {
      $('#json-input').value = '{ "name": "DopaBrain", "features": ["tools", "games", "tests"], "free": true }';
      calculate('format-json');
    }
  }

  function calculate(mode) {
    const type = TOOL_CONFIG.type;
    if (type === 'extension') return calcExtension();
    if (type === 'fileSize') return calcFileSize();
    if (type === 'imageFormat') return calcImageFormat();
    if (type === 'imageSize') return calcImageSize();
    if (type === 'aspectRatio') return calcAspectRatio();
    if (type === 'transfer') return calcTransfer();
    if (type === 'timestamp') return calcTimestamp();
    if (type === 'timezone') return calcTimezone();
    if (type === 'textCase') return calcTextCase();
    if (type === 'json') return calcJson(mode);
  }

  function cleanExt(value) {
    return String(value || '').trim().replace(/^\.+/, '').toLowerCase();
  }

  function calcExtension() {
    const filename = $('#filename')?.value || 'file.txt';
    const target = cleanExt($('#target-ext')?.value || 'txt');
    const base = filename.replace(/\.[^./\\]+$/, '');
    const current = (filename.match(/\.([^./\\]+)$/) || [null, 'none'])[1].toLowerCase();
    const next = target ? base + '.' + target : base;
    const mime = mimeTypes[target] || 'unknown';
    const selected = selectedFile ? '<div class="metric"><strong>' + escapeHtml(selectedFile.name) + '</strong><span>Selected file, ' + bytesToHuman(selectedFile.size) + '</span></div>' : '';
    setResult('<div class="metric-grid">' +
      '<div class="metric"><strong>' + escapeHtml(current) + '</strong><span>Current extension</span></div>' +
      '<div class="metric"><strong>' + escapeHtml(next) + '</strong><span>New file name</span></div>' +
      '<div class="metric"><strong>' + escapeHtml(mime) + '</strong><span>Target MIME hint</span></div>' +
      selected +
      '</div>', next);
  }

  function downloadRenamed() {
    if (!selectedFile) {
      alert('Choose a file first.');
      return;
    }
    const filename = $('#filename')?.value || selectedFile.name;
    const target = cleanExt($('#target-ext')?.value || 'txt');
    const base = filename.replace(/\.[^./\\]+$/, '');
    const next = target ? base + '.' + target : base;
    const blob = new Blob([selectedFile], { type: mimeTypes[target] || selectedFile.type || 'application/octet-stream' });
    downloadBlob(blob, next);
  }

  function calcFileSize() {
    const value = Number($('#size-value')?.value || 0);
    const unit = $('#size-unit')?.value || 'MB';
    const factor = decimalUnits[unit] || binaryUnits[unit] || 1;
    const bytes = value * factor;
    const rows = [
      ['Bytes', bytes],
      ['KB', bytes / decimalUnits.KB],
      ['MB', bytes / decimalUnits.MB],
      ['GB', bytes / decimalUnits.GB],
      ['TB', bytes / decimalUnits.TB],
      ['KiB', bytes / binaryUnits.KiB],
      ['MiB', bytes / binaryUnits.MiB],
      ['GiB', bytes / binaryUnits.GiB]
    ].map(function(row) {
      return '<tr><td>' + row[0] + '</td><td>' + formatNumber(row[1], row[0] === 'Bytes' ? 0 : 6) + '</td></tr>';
    }).join('');
    setResult('<div class="metric-grid"><div class="metric"><strong>' + bytesToHuman(bytes) + '</strong><span>Decimal human size</span></div><div class="metric"><strong>' + formatNumber(bytes, 0) + '</strong><span>Total bytes</span></div></div><div class="table-wrap"><table><thead><tr><th>Unit</th><th>Value</th></tr></thead><tbody>' + rows + '</tbody></table></div>', formatNumber(bytes, 0) + ' bytes');
  }

  function loadImageFile(file, resize) {
    if (!file) return;
    const img = new Image();
    img.onload = function() {
      selectedImage = img;
      if (resize) {
        const width = $('#resize-width');
        const height = $('#resize-height');
        if (width) width.value = img.naturalWidth || img.width;
        if (height) height.value = img.naturalHeight || img.height;
      }
      calculate();
    };
    img.onerror = function() {
      setResult('<p class="status-bad">Could not load that image.</p>', '');
    };
    img.src = URL.createObjectURL(file);
  }

  function canvasFromImage(width, height) {
    if (!selectedImage) return null;
    const canvas = document.createElement('canvas');
    canvas.width = width || selectedImage.naturalWidth || selectedImage.width;
    canvas.height = height || selectedImage.naturalHeight || selectedImage.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(selectedImage, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  function calcImageFormat() {
    if (!selectedImage) {
      setResult('<p>Choose an image to preview conversion details.</p>', '');
      return;
    }
    const format = $('#image-format')?.value || 'image/png';
    const quality = Number($('#image-quality')?.value || 0.9);
    const canvas = canvasFromImage();
    const dataUrl = canvas.toDataURL(format, quality);
    const approx = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
    setResult('<div class="metric-grid"><div class="metric"><strong>' + escapeHtml(format.replace('image/', '').toUpperCase()) + '</strong><span>Output format</span></div><div class="metric"><strong>' + bytesToHuman(approx) + '</strong><span>Estimated output size</span></div><div class="metric"><strong>' + canvas.width + ' x ' + canvas.height + '</strong><span>Pixels</span></div></div><img class="preview" alt="Converted preview" src="' + dataUrl + '">', format + ', ' + canvas.width + 'x' + canvas.height);
  }

  function downloadCanvasImage(prefix) {
    if (!selectedImage) {
      alert('Choose an image first.');
      return;
    }
    const format = $('#image-format')?.value || 'image/png';
    const quality = Number($('#image-quality')?.value || 0.9);
    const canvas = canvasFromImage();
    canvas.toBlob(function(blob) {
      downloadBlob(blob, prefix + '.' + format.replace('image/', '').replace('jpeg', 'jpg'));
    }, format, quality);
  }

  function calcImageSize() {
    const width = Number($('#resize-width')?.value || 0);
    const height = Number($('#resize-height')?.value || 0);
    const dpi = Number($('#resize-dpi')?.value || 300);
    const ratio = height ? width / height : 0;
    const printW = dpi ? width / dpi : 0;
    const printH = dpi ? height / dpi : 0;
    setResult('<div class="metric-grid"><div class="metric"><strong>' + formatNumber(width * height, 0) + '</strong><span>Total pixels</span></div><div class="metric"><strong>' + formatNumber(ratio, 4) + ':1</strong><span>Aspect ratio</span></div><div class="metric"><strong>' + formatNumber(printW, 2) + ' x ' + formatNumber(printH, 2) + ' in</strong><span>Print size at ' + dpi + ' DPI</span></div></div>', width + ' x ' + height + ' px');
  }

  function downloadResized() {
    if (!selectedImage) {
      alert('Choose an image first.');
      return;
    }
    const width = Number($('#resize-width')?.value || selectedImage.width);
    const height = Number($('#resize-height')?.value || selectedImage.height);
    const canvas = canvasFromImage(width, height);
    canvas.toBlob(function(blob) {
      downloadBlob(blob, 'resized-' + width + 'x' + height + '.png');
    }, 'image/png');
  }

  function gcd(a, b) {
    a = Math.abs(Math.round(a));
    b = Math.abs(Math.round(b));
    while (b) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a || 1;
  }

  function calcAspectRatio() {
    const width = Number($('#ratio-width')?.value || 0);
    const height = Number($('#ratio-height')?.value || 0);
    const a = Number($('#ratio-a')?.value || 16);
    const b = Number($('#ratio-b')?.value || 9);
    const divisor = gcd(width || a, height || b);
    const simplified = width && height ? Math.round(width / divisor) + ':' + Math.round(height / divisor) : a + ':' + b;
    const calcHeight = width && a && b ? width * b / a : 0;
    const calcWidth = height && a && b ? height * a / b : 0;
    setResult('<div class="metric-grid"><div class="metric"><strong>' + escapeHtml(simplified) + '</strong><span>Simplified ratio</span></div><div class="metric"><strong>' + formatNumber(calcHeight, 0) + ' px</strong><span>Height from width and ratio</span></div><div class="metric"><strong>' + formatNumber(calcWidth, 0) + ' px</strong><span>Width from height and ratio</span></div></div>', simplified);
  }

  function calcTransfer() {
    const size = Number($('#transfer-size')?.value || 0);
    const sizeUnit = $('#transfer-size-unit')?.value || 'GB';
    const speed = Number($('#transfer-speed')?.value || 0);
    const speedUnit = $('#transfer-speed-unit')?.value || 'Mbps';
    const bytes = size * (decimalUnits[sizeUnit] || 1);
    const bits = bytes * 8;
    const bitsPerSecond = speedUnit === 'Kbps' ? speed * 1000 : speedUnit === 'Mbps' ? speed * 1000000 : speedUnit === 'Gbps' ? speed * 1000000000 : speed * 8 * 1000000;
    const seconds = bitsPerSecond ? bits / bitsPerSecond : 0;
    const minutes = seconds / 60;
    const hours = minutes / 60;
    setResult('<div class="metric-grid"><div class="metric"><strong>' + formatDuration(seconds) + '</strong><span>Estimated time</span></div><div class="metric"><strong>' + formatNumber(minutes, 2) + '</strong><span>Minutes</span></div><div class="metric"><strong>' + formatNumber(hours, 2) + '</strong><span>Hours</span></div></div>', formatDuration(seconds));
  }

  function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '-';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);
    return (h ? h + 'h ' : '') + (m ? m + 'm ' : '') + s + 's';
  }

  function setTimestampNow() {
    const ts = $('#timestamp-value');
    const dt = $('#datetime-value');
    const now = new Date();
    if (ts) ts.value = Math.floor(now.getTime() / 1000);
    if (dt) dt.value = toDateTimeLocal(now);
    calculate();
  }

  function toDateTimeLocal(date) {
    const pad = function(n) { return String(n).padStart(2, '0'); };
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  function calcTimestamp() {
    const dt = $('#datetime-value');
    if (dt && !dt.value) dt.value = toDateTimeLocal(new Date());
    const raw = String($('#timestamp-value')?.value || '').trim();
    const numeric = Number(raw);
    const ms = raw.length >= 13 ? numeric : numeric * 1000;
    const date = Number.isFinite(ms) ? new Date(ms) : new Date();
    const fromDate = dt?.value ? new Date(dt.value) : date;
    setResult('<div class="metric-grid"><div class="metric"><strong>' + Math.floor(fromDate.getTime() / 1000) + '</strong><span>Seconds</span></div><div class="metric"><strong>' + fromDate.getTime() + '</strong><span>Milliseconds</span></div><div class="metric"><strong>' + escapeHtml(date.toISOString()) + '</strong><span>UTC from timestamp</span></div><div class="metric"><strong>' + escapeHtml(date.toLocaleString()) + '</strong><span>Local from timestamp</span></div></div>', date.toISOString());
  }

  function calcTimezone() {
    const input = $('#tz-datetime');
    if (input && !input.value) input.value = toDateTimeLocal(new Date());
    const source = $('#tz-source')?.value || 'UTC';
    const instant = dateFromZone(input.value, source);
    const rows = TOOL_CONFIG.timezones.map(function(tz) {
      return '<tr><td>' + escapeHtml(tz) + '</td><td>' + escapeHtml(formatInZone(instant, tz)) + '</td></tr>';
    }).join('');
    setResult('<div class="table-wrap"><table><thead><tr><th>Time zone</th><th>Local time</th></tr></thead><tbody>' + rows + '</tbody></table></div>', formatInZone(instant, source));
  }

  function dateFromZone(value, zone) {
    if (!value) return new Date();
    const parts = value.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!parts) return new Date(value);
    const utcGuess = Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]), Number(parts[4]), Number(parts[5]));
    const offset = zoneOffset(new Date(utcGuess), zone);
    return new Date(utcGuess - offset);
  }

  function zoneOffset(date, zone) {
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: zone, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const parts = formatter.formatToParts(date).reduce(function(acc, part) {
      acc[part.type] = part.value;
      return acc;
    }, {});
    const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    return asUtc - date.getTime();
  }

  function formatInZone(date, zone) {
    return new Intl.DateTimeFormat('en-US', { timeZone: zone, dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  function titleCase(text) {
    return text.toLowerCase().replace(/\b\w/g, function(char) { return char.toUpperCase(); });
  }

  function toWords(text) {
    return text.trim().split(/[^A-Za-z0-9]+/).filter(Boolean);
  }

  function calcTextCase() {
    const text = $('#text-input')?.value || '';
    const words = toWords(text);
    const variants = [
      ['UPPERCASE', text.toUpperCase()],
      ['lowercase', text.toLowerCase()],
      ['Title Case', titleCase(text)],
      ['Sentence case', text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()],
      ['camelCase', words.map(function(word, index) { word = word.toLowerCase(); return index ? word.charAt(0).toUpperCase() + word.slice(1) : word; }).join('')],
      ['snake_case', words.map(function(w) { return w.toLowerCase(); }).join('_')],
      ['kebab-case', words.map(function(w) { return w.toLowerCase(); }).join('-')]
    ];
    const rows = variants.map(function(item) {
      return '<tr><td>' + escapeHtml(item[0]) + '</td><td>' + escapeHtml(item[1]) + '</td></tr>';
    }).join('');
    setResult('<div class="table-wrap"><table><thead><tr><th>Case</th><th>Text</th></tr></thead><tbody>' + rows + '</tbody></table></div>', variants[0][1]);
  }

  function calcJson(mode) {
    const input = $('#json-input')?.value || '';
    try {
      const parsed = JSON.parse(input);
      const output = mode === 'minify-json' ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2);
      setResult('<p class="status-ok">Valid JSON</p><textarea readonly>' + escapeHtml(output) + '</textarea>', output);
    } catch (error) {
      setResult('<p class="status-bad">Invalid JSON: ' + escapeHtml(error.message) + '</p>', '');
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  }

  async function copyPrimary() {
    try {
      await navigator.clipboard.writeText(lastPrimaryText);
      const button = $('#copy-primary');
      if (button) {
        const old = button.textContent;
        button.textContent = 'Copied';
        setTimeout(function() { button.textContent = old; }, 900);
      }
    } catch (error) {}
  }

  function setupTheme() {
    let theme = 'dark';
    try { theme = localStorage.getItem(TOOL_CONFIG.slug + '_theme') || 'dark'; } catch (error) {}
    document.documentElement.setAttribute('data-theme', theme);
    const button = $('#theme-toggle');
    if (button) {
      button.addEventListener('click', function() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem(TOOL_CONFIG.slug + '_theme', next); } catch (error) {}
      });
    }
  }

  function setupLanguage() {
    const select = $('#language-select');
    if (select) {
      select.addEventListener('change', function() {
        if (window.i18n) window.i18n.setLanguage(select.value);
      });
    }
  }

  function setupDefaults() {
    if (TOOL_CONFIG.type === 'timestamp') setTimeout(setTimestampNow, 0);
    if (TOOL_CONFIG.type === 'timezone') {
      setTimeout(function() {
        const input = $('#tz-datetime');
        if (input && !input.value) input.value = toDateTimeLocal(new Date());
        const source = $('#tz-source');
        if (source) source.value = 'Asia/Seoul';
        calculate();
      }, 0);
    }
  }

  function init() {
    setupTheme();
    setupLanguage();
    render();
    setupDefaults();
    const copy = $('#copy-primary');
    if (copy) copy.addEventListener('click', copyPrimary);
    if (typeof gtag !== 'undefined') {
      gtag('event', 'utility_tool_view', { event_category: 'utility', tool_slug: TOOL_CONFIG.slug });
    }
    hideLoader();
  }

  document.addEventListener('DOMContentLoaded', function() {
    try {
      init();
    } catch (error) {
      setResult('<p class="status-bad">The tool could not initialize. Please refresh the page.</p>', '');
      hideLoader();
    }
  });
  window.addEventListener('load', hideLoader);
  setTimeout(hideLoader, 4500);
})();
