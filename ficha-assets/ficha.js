/* Ficha de verificación: formulario + PDF generado en el navegador (jsPDF + autotable). */
(function () {
  'use strict';

  var RESULTADOS = [
    { v: 'Correcto', c: 'o-ok' },
    { v: 'A medias', c: 'o-warn' },
    { v: 'Desactualizado', c: 'o-warn' },
    { v: 'Error', c: 'o-bad' }
  ];

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  var params = new URLSearchParams(location.search);
  var P = params.get('p');
  var Q = window.FICHAS && window.FICHAS[P];

  /* ---------- selector si no hay pregunta ---------- */
  if (!Q) {
    $('selector').classList.remove('hide');
    var html = '';
    Object.keys(window.FICHAS).forEach(function (k) {
      var f = window.FICHAS[k];
      html += '<a href="ficha.html?p=' + f.n + '"><span>Pregunta ' + f.n + '</span>' + esc(f.title) + '</a>';
    });
    $('qlist').innerHTML = html;
    $('eyebrow').textContent = 'Ficha de verificación';
    $('titulo').textContent = 'Ficha de verificación';
    return;
  }

  /* ---------- encabezado ---------- */
  document.title = 'Ficha · Pregunta ' + Q.n;
  $('eyebrow').textContent = 'Pregunta ' + Q.n;
  $('titulo').textContent = Q.title;
  $('pregunta').textContent = Q.question;
  $('lnkInforme').href = 'informes-completos.html#p' + Q.n;
  $('ficha').classList.remove('hide');
  $('meta').textContent = Q.meta || '';

  /* ---------- informe con los datos marcados ---------- */
  function parts(arr) {
    if (!Array.isArray(arr)) arr = [arr];
    return arr.map(function (x) {
      if (typeof x === 'string') return esc(x);
      return '<span class="mk">[' + x.m + ']</span> <mark>' + esc(x.t) + '</mark>';
    }).join('');
  }
  (function renderInforme() {
    var out = '', ul = false;
    function closeUl() { if (ul) { out += '</ul>'; ul = false; } }
    Q.blocks.forEach(function (b) {
      if (b.h) { closeUl(); out += '<h3>' + esc(b.h) + '</h3>'; }
      else if (b.p) { closeUl(); out += '<p>' + parts(b.p) + '</p>'; }
      else if (b.li) { if (!ul) { out += '<ul>'; ul = true; } out += '<li>' + parts(b.li) + '</li>'; }
      else if (b.table) {
        closeUl();
        out += '<div class="tbl"><table><thead><tr>' + b.table.head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>';
        b.table.rows.forEach(function (r) { out += '<tr>' + r.map(function (c) { return '<td>' + parts(c) + '</td>'; }).join('') + '</tr>'; });
        out += '</tbody></table></div>';
      }
    });
    closeUl();
    $('informe').innerHTML = out;
  })();

  /* ---------- tarjetas de los 3 datos ---------- */
  (function renderDatos() {
    var out = '';
    Q.rows.forEach(function (r, i) {
      out += '<div class="dato" id="dato' + i + '">' +
        '<h3><span class="mk">[' + r.n + ']</span>' + esc(r.label) + '</h3>' +
        '<label class="lb" for="dice' + i + '">Qué dice el informe <small>(copiá el dato marcado)</small></label>' +
        '<textarea id="dice' + i + '" rows="2" autocomplete="off"></textarea>' +
        '<label class="lb">Fuente para comprobarlo</label>' +
        '<div class="src"><div class="sname">' + esc(r.sourceName) + '</div>' +
        '<div class="url">' + esc(r.url) + '</div>' +
        '<a class="btn alt" href="' + esc(r.url) + '" target="_blank" rel="noopener">Abrir la fuente</a>' +
        '<div class="ctrl">Buscá con <b>Ctrl + F</b>: <span class="ctrlf">' + esc(r.ctrlf) + '</span></div></div>' +
        '<label class="lb" for="fuente' + i + '">Qué dice la fuente <small>(copiá lo que encontraste)</small></label>' +
        '<textarea id="fuente' + i + '" rows="2" autocomplete="off"></textarea>' +
        '<label class="lb">Resultado</label>' +
        '<div class="opts" id="res' + i + '">' +
        RESULTADOS.map(function (o) {
          return '<label class="' + o.c + '"><input type="radio" name="res' + i + '" value="' + o.v + '"><span>' + o.v + '</span></label>';
        }).join('') + '</div></div>';
    });
    $('datos').innerHTML = out;
  })();

  /* ---------- guardado automático ---------- */
  var KEY = 'geniso-ficha-p' + Q.n;
  function getState() {
    var s = { integrantes: $('integrantes').value, curso: $('curso').value, opinion: $('opinion').value, rows: [] };
    Q.rows.forEach(function (r, i) {
      var chk = document.querySelector('input[name="res' + i + '"]:checked');
      s.rows.push({ dice: $('dice' + i).value, fuente: $('fuente' + i).value, res: chk ? chk.value : '' });
    });
    return s;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(getState())); } catch (e) { /* sin almacenamiento */ } }
  function grow(el) { el.style.height = 'auto'; el.style.height = Math.max(el.scrollHeight + 4, 70) + 'px'; }
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { return; }
    if (!raw) return;
    try {
      var s = JSON.parse(raw);
      $('integrantes').value = s.integrantes || '';
      if (s.curso) $('curso').value = s.curso;
      $('opinion').value = s.opinion || '';
      (s.rows || []).forEach(function (r, i) {
        if (!$('dice' + i)) return;
        $('dice' + i).value = r.dice || '';
        $('fuente' + i).value = r.fuente || '';
        if (r.res) {
          var el = document.querySelector('input[name="res' + i + '"][value="' + r.res + '"]');
          if (el) el.checked = true;
        }
      });
    } catch (e) { /* borrador inválido */ }
  }
  function updateScore() {
    var n = 0;
    Q.rows.forEach(function (r, i) {
      var chk = document.querySelector('input[name="res' + i + '"]:checked');
      if (chk && chk.value === 'Correcto') n++;
    });
    $('score').textContent = 'El informe acertó ' + n + ' de 3 datos.';
    return n;
  }
  load();
  updateScore();
  document.querySelectorAll('textarea').forEach(grow);

  var timer = null;
  document.addEventListener('input', function (e) {
    if (e.target.tagName === 'TEXTAREA') grow(e.target);
    if (e.target.classList) e.target.classList.remove('bad');
    clearTimeout(timer); timer = setTimeout(save, 300);
  });
  document.addEventListener('change', function (e) {
    if (e.target.type === 'radio') {
      var box = $(e.target.name); if (box) box.classList.remove('bad');
      updateScore(); save();
    }
  });

  $('btnBorrar').addEventListener('click', function () {
    if (!window.confirm('Se borra todo lo que escribiste en esta ficha. ¿Seguro?')) return;
    try { localStorage.removeItem(KEY); } catch (e) { /* nada */ }
    location.reload();
  });

  /* ---------- validación ---------- */
  function validar() {
    var faltan = [], primero = null;
    function marca(el, txt) { el.classList.add('bad'); faltan.push(txt); if (!primero) primero = el; }
    var s = getState();
    if (s.integrantes.trim().length < 3) marca($('integrantes'), 'Integrantes');
    if (s.curso.trim().length < 2) marca($('curso'), 'Curso');
    s.rows.forEach(function (r, i) {
      var n = Q.rows[i].n;
      if (r.dice.trim().length < 3) marca($('dice' + i), 'Dato [' + n + ']: qué dice el informe');
      if (r.fuente.trim().length < 3) marca($('fuente' + i), 'Dato [' + n + ']: qué dice la fuente');
      if (!r.res) marca($('res' + i), 'Dato [' + n + ']: resultado');
    });
    if (s.opinion.trim().length < 3) marca($('opinion'), 'La frase final');
    return { faltan: faltan, primero: primero, estado: s };
  }

  /* ---------- PDF ---------- */
  var OK_RANGES = [[0x20, 0x7E], [0xA0, 0x17F], [0x2010, 0x2027], [0x2030, 0x203A], [0x20AC, 0x20AC], [0x2122, 0x2122],
    [0x2190, 0x2193], [0x2212, 0x2212], [0x2260, 0x2265], [0x2713, 0x2713], [0x2022, 0x2022], [0x25CF, 0x25CF]];
  function okCp(cp) { for (var i = 0; i < OK_RANGES.length; i++) if (cp >= OK_RANGES[i][0] && cp <= OK_RANGES[i][1]) return true; return false; }
  function limpio(s, soloLatin1) {
    s = String(s == null ? '' : s).replace(/\r\n?/g, '\n').replace(/\t/g, ' ').replace(/[​-‍﻿­]/g, '');
    if (soloLatin1) {
      s = s.replace(/[‘’‚]/g, "'").replace(/[“”„]/g, '"').replace(/[–—−]/g, '-').replace(/…/g, '...').replace(/•/g, '-');
    }
    var out = '';
    for (var ch of s) {
      var cp = ch.codePointAt(0);
      if (ch === '\n') out += ch;
      else if (soloLatin1 ? (cp >= 0x20 && cp <= 0x7E) || (cp >= 0xA0 && cp <= 0xFF) : okCp(cp)) out += ch;
      else out += '?';
    }
    return out;
  }
  function slug(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
  }
  function b64(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('fuente');
      return r.arrayBuffer();
    }).then(function (buf) {
      var b = new Uint8Array(buf), s = '';
      for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
      return btoa(s);
    });
  }
  function cargarFuente(doc) {
    return Promise.all([b64('ficha-assets/DejaVuSans.subset.ttf'), b64('ficha-assets/DejaVuSans-Bold.subset.ttf')]).then(function (f) {
      doc.addFileToVFS('DejaVuSans.ttf', f[0]);
      doc.addFont('DejaVuSans.ttf', 'DejaVu', 'normal');
      doc.addFileToVFS('DejaVuSans-Bold.ttf', f[1]);
      doc.addFont('DejaVuSans-Bold.ttf', 'DejaVu', 'bold');
      return { name: 'DejaVu', latin1: false };
    }).catch(function () {
      return { name: 'helvetica', latin1: true };
    });
  }

  function fechaHora() {
    var d = new Date();
    function z(n) { return (n < 10 ? '0' : '') + n; }
    return z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + z(d.getHours()) + ':' + z(d.getMinutes());
  }

  function generar(estado, fuente) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    return cargarFuente(doc).then(function (F) {
      var L = function (s) { return limpio(s, F.latin1); };
      var W = 297, M = 15, top = 24, bottom = 18;
      var DARK = [30, 41, 59], BLUE = [29, 78, 216], GRAY = [100, 116, 139], LINE = [203, 213, 225];
      var base = { font: F.name, fontSize: 9, cellPadding: 2.4, overflow: 'linebreak', valign: 'top', lineColor: LINE, lineWidth: 0.25, textColor: DARK };
      var marg = { top: top, bottom: bottom, left: M, right: M };

      doc.setFont(F.name, 'bold'); doc.setFontSize(16); doc.setTextColor.apply(doc, DARK);
      doc.text(L('Ficha de entrega · Pregunta ' + Q.n + ' · ' + Q.title), M, top + 2);
      doc.setFont(F.name, 'normal'); doc.setFontSize(9.5); doc.setTextColor.apply(doc, GRAY);
      var qLines = doc.splitTextToSize(L(Q.question), W - 2 * M);
      doc.text(qLines, M, top + 8);
      var y = top + 8 + qLines.length * 4.4 + 3;

      var integ = estado.integrantes.trim().split('\n').map(function (x) { return x.trim(); }).filter(Boolean).join(', ');
      doc.autoTable({
        startY: y, margin: marg, theme: 'grid', styles: base,
        body: [
          [{ content: 'Integrantes', styles: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 38 } }, L(integ)],
          [{ content: 'Curso y fecha', styles: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 38 } }, L(estado.curso.trim() + ' · ' + fechaHora())]
        ]
      });
      y = doc.lastAutoTable.finalY + 6;

      var colores = { 'Correcto': [[209, 250, 229], [6, 95, 70]], 'A medias': [[254, 243, 199], [146, 64, 14]], 'Desactualizado': [[254, 243, 199], [146, 64, 14]], 'Error': [[254, 226, 226], [153, 27, 27]] };
      var body = Q.rows.map(function (r, i) {
        var e = estado.rows[i];
        return [
          '[' + r.n + ']\n' + r.label,
          L(e.dice.trim()),
          { content: L(r.sourceName + '\n' + r.url + '\nCtrl + F: "' + r.ctrlf + '"'), _url: r.url },
          L(e.fuente.trim()),
          e.res
        ];
      });
      doc.autoTable({
        startY: y, margin: marg, theme: 'grid', styles: base, rowPageBreak: 'avoid',
        head: [['Dato', 'Qué dice el informe', 'Fuente (link y Ctrl + F)', 'Qué dice la fuente', 'Resultado']].map(function (h) { return h.map(L); }),
        headStyles: { fillColor: DARK, textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 22, fontStyle: 'bold' }, 1: { cellWidth: 74 }, 2: { cellWidth: 70, fontSize: 8 }, 3: { cellWidth: 74 }, 4: { cellWidth: 27, fontStyle: 'bold' } },
        body: body,
        didParseCell: function (d) {
          if (d.section === 'body' && d.column.index === 4) {
            var c = colores[d.cell.raw];
            if (c) { d.cell.styles.fillColor = c[0]; d.cell.styles.textColor = c[1]; }
          }
        },
        didDrawCell: function (d) {
          if (d.section === 'body' && d.column.index === 2 && d.cell.raw && d.cell.raw._url) {
            doc.link(d.cell.x, d.cell.y, d.cell.width, d.cell.height, { url: d.cell.raw._url });
          }
        }
      });
      y = doc.lastAutoTable.finalY + 6;

      var n = 0;
      estado.rows.forEach(function (r) { if (r.res === 'Correcto') n++; });
      doc.autoTable({
        startY: y, margin: marg, theme: 'plain', styles: Object.assign({}, base, { lineWidth: 0 }),
        body: [
          [{ content: 'El informe acertó ' + n + ' de 3 datos.', styles: { fontStyle: 'bold', fontSize: 11, cellPadding: { top: 1, bottom: 3, left: 0, right: 0 } } }],
          [{ content: L('¿Confiarías en este informe sin revisarlo? ¿Por qué?'), styles: { fontStyle: 'bold', cellPadding: { top: 2, bottom: 1, left: 0, right: 0 } } }],
          [{ content: L(estado.opinion.trim()), styles: { cellPadding: { top: 0, bottom: 1, left: 0, right: 0 } } }]
        ]
      });

      /* encabezado y pie en todas las páginas */
      var total = doc.getNumberOfPages();
      for (var p = 1; p <= total; p++) {
        doc.setPage(p);
        doc.setFont(F.name, 'bold'); doc.setFontSize(8.5); doc.setTextColor.apply(doc, DARK);
        doc.text(L('EEM N° 3 D.E. 19 "Carlos Geniso"'), M, 12);
        var w1 = doc.getTextWidth(L('EEM N° 3 D.E. 19 "Carlos Geniso"'));
        doc.setFont(F.name, 'normal'); doc.setTextColor.apply(doc, GRAY);
        doc.text(L('  ·  Comunicación, Cultura y Sociedad  ·  5° TM'), M + w1, 12);
        doc.setDrawColor.apply(doc, BLUE); doc.setLineWidth(0.5); doc.line(M, 15, W - M, 15);
        doc.setDrawColor.apply(doc, LINE); doc.setLineWidth(0.25); doc.line(M, 193, W - M, 193);
        doc.setFontSize(8); doc.setFont(F.name, 'bold'); doc.setTextColor.apply(doc, DARK);
        doc.text('Taller El Profe', M, 198);
        var w2 = doc.getTextWidth('Taller El Profe');
        doc.setFont(F.name, 'normal'); doc.setTextColor.apply(doc, GRAY);
        var pie = L('  ·  servicio técnico de computadoras, desbloqueo de equipos  ·  ');
        doc.text(pie, M + w2, 198);
        var w3 = doc.getTextWidth(pie);
        doc.setTextColor.apply(doc, BLUE);
        doc.textWithLink('linktr.ee/Taller_El_Profe', M + w2 + w3, 198, { url: 'https://linktr.ee/Taller_El_Profe' });
        doc.setTextColor.apply(doc, GRAY);
        doc.text('Página ' + p + ' de ' + total, W - M, 198, { align: 'right' });
      }

      var nombre = 'Ficha-P' + Q.n + '-' + (slug(estado.curso) || 'curso') + '-' + (slug(estado.integrantes.trim().split('\n')[0]) || 'grupo') + '.pdf';
      doc.save(nombre);
      return nombre;
    });
  }

  $('btnPdf').addEventListener('click', function () {
    var box = $('mensaje'); box.innerHTML = '';
    var v = validar();
    if (v.faltan.length) {
      box.innerHTML = '<div class="msg err"><b>Falta completar:</b><ul>' + v.faltan.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
      if (v.primero && v.primero.scrollIntoView) v.primero.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
      box.innerHTML = '<div class="msg err">No se cargó el generador de PDF. Revisá la conexión y recargá la página: lo que escribiste está guardado.</div>';
      return;
    }
    var btn = $('btnPdf'); btn.disabled = true; btn.textContent = 'Generando…';
    save();
    generar(v.estado).then(function (nombre) {
      box.innerHTML = '<div class="msg ok"><b>Listo: se descargó ' + esc(nombre) + '.</b>' +
        '<ol><li>Abrí la clase en Classroom y entrá en <b>Trabajo de clase</b> → <b>Ver tarea</b>.</li>' +
        '<li>Adjuntá el PDF que se descargó.</li><li>Tocá <b>Entregar</b>.</li></ol>' +
        '<a class="btn" href="https://classroom.google.com/" target="_blank" rel="noopener">Abrir Classroom</a>' +
        '<p class="small">Si no ves el archivo, buscalo en la carpeta Descargas.</p></div>';
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }).catch(function (e) {
      box.innerHTML = '<div class="msg err">No se pudo generar el PDF (' + esc(e && e.message ? e.message : e) + '). Lo que escribiste está guardado: recargá la página y probá de nuevo.</div>';
    }).then(function () { btn.disabled = false; btn.textContent = 'Generar PDF'; });
  });
})();
