// LifePrint — PDF renderer built directly on jsPDF's UMD build.
// Layout rules: measure before drawing, never orphan a heading, repeat table headers,
// keep 0.6–0.75in margins, and number every page against a known total.

export const THEMES = {
  minimal: { display: 'helvetica', body: 'helvetica', accent: [35, 40, 43], ink: [35, 40, 43], soft: [110, 116, 120], rule: [225, 225, 222], tint: [246, 246, 244], radius: 1 },
  elegant: { display: 'times', body: 'times', accent: [58, 47, 38], ink: [43, 36, 30], soft: [122, 108, 92], rule: [224, 213, 194], tint: [244, 236, 221], radius: 1 },
  'modern-wellness': { display: 'times', body: 'helvetica', accent: [31, 64, 52], ink: [28, 42, 36], soft: [107, 125, 116], rule: [216, 224, 214], tint: [231, 239, 232], radius: 5 },
  clinical: { display: 'helvetica', body: 'helvetica', accent: [29, 63, 92], ink: [30, 37, 43], soft: [90, 102, 111], rule: [211, 219, 225], tint: [234, 240, 245], radius: 1 },
  feminine: { display: 'times', body: 'helvetica', accent: [125, 63, 86], ink: [59, 42, 49], soft: [140, 110, 120], rule: [240, 218, 222], tint: [251, 236, 239], radius: 7 },
  masculine: { display: 'helvetica', body: 'helvetica', accent: [22, 32, 42], ink: [22, 32, 42], soft: [95, 105, 112], rule: [207, 212, 214], tint: [232, 235, 236], radius: 0, upperHeadings: true },
  athletic: { display: 'helvetica', body: 'helvetica', accent: [18, 63, 47], ink: [20, 32, 27], soft: [96, 118, 106], rule: [207, 220, 210], tint: [223, 240, 226], radius: 2, upperHeadings: true },
  luxury: { display: 'times', body: 'times', accent: [122, 98, 49], ink: [36, 31, 24], soft: [106, 97, 82], rule: [221, 208, 174], tint: [245, 238, 218], radius: 0, rulesUnderHeadings: true },
  nature: { display: 'times', body: 'helvetica', accent: [74, 90, 43], ink: [42, 48, 32], soft: [110, 120, 90], rule: [220, 220, 192], tint: [238, 240, 220], radius: 4 },
  colorful: { display: 'helvetica', body: 'helvetica', accent: [161, 59, 106], ink: [41, 34, 44], soft: [120, 105, 118], rule: [236, 217, 227], tint: [253, 234, 242], radius: 6 },
  'print-bw': { display: 'helvetica', body: 'helvetica', accent: [0, 0, 0], ink: [17, 17, 17], soft: [68, 68, 68], rule: [153, 153, 153], tint: [240, 240, 240], radius: 0, mono: true },
};

const STATUS_TINT = {
  'Eat freely': [227, 239, 230],
  'Eat in moderation': [246, 238, 217],
  Occasional: [247, 232, 219],
  Avoid: [247, 226, 224],
};

const CALLOUT_COLORS = {
  info: { bar: [43, 88, 120], fill: [231, 238, 244] },
  caution: { bar: [168, 116, 28], fill: [251, 240, 217] },
  stop: { bar: [143, 47, 42], fill: [249, 228, 226] },
  urgent: { bar: [122, 31, 26], fill: [246, 220, 217] },
};

const PAGE = { w: 612, h: 792 };

function variantConfig(variant) {
  if (variant === 'mobile') return { margin: 46, body: 12, lead: 1.5, measure: 0.86, grayscale: false };
  if (variant === 'printer') return { margin: 50, body: 10.5, lead: 1.42, measure: 1, grayscale: true };
  return { margin: 50, body: 10.5, lead: 1.45, measure: 1, grayscale: false };
}

const gray = (rgb) => {
  const g = Math.round(0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]);
  return [g, g, g];
};

export function jsPDFAvailable() {
  return !!(window.jspdf && window.jspdf.jsPDF);
}

/* -------------------------------------------------------------------------- */

class Renderer {
  constructor(doc, { theme, cfg, book }) {
    this.doc = doc;
    this.theme = theme;
    this.cfg = cfg;
    this.book = book;
    this.margin = cfg.margin;
    this.contentW = (PAGE.w - cfg.margin * 2) * cfg.measure;
    this.top = cfg.margin + 26;
    this.bottom = PAGE.h - cfg.margin - 26;
    this.y = this.top;
    this.pageChapters = {}; // page number -> chapter title (for running headers)
    this.currentChapter = '';
    this.chapterStart = {};
    this.frontPages = 0;
  }

  color(rgb) {
    return this.cfg.grayscale || this.theme.mono ? gray(rgb) : rgb;
  }

  setInk(rgb = this.theme.ink) {
    const c = this.color(rgb);
    this.doc.setTextColor(c[0], c[1], c[2]);
  }

  page() {
    return this.doc.getNumberOfPages();
  }

  newPage() {
    this.doc.addPage();
    this.y = this.top;
    this.pageChapters[this.page()] = this.currentChapter;
  }

  ensure(height) {
    if (this.y + height > this.bottom) {
      this.newPage();
      return true;
    }
    return false;
  }

  fontBody(size = this.cfg.body, style = 'normal') {
    this.doc.setFont(this.theme.body, style);
    this.doc.setFontSize(size);
    return size * this.cfg.lead;
  }

  fontDisplay(size, style = 'bold') {
    this.doc.setFont(this.theme.display, style);
    this.doc.setFontSize(size);
    return size * 1.22;
  }

  /* ---------------- primitives ---------------- */

  paragraph(text, { size = this.cfg.body, style = 'normal', color, indent = 0, gap = 6, width } = {}) {
    if (!text) return;
    const lh = this.fontBody(size, style);
    this.setInk(color || this.theme.ink);
    const lines = this.doc.splitTextToSize(String(text), (width || this.contentW) - indent);
    for (const line of lines) {
      this.ensure(lh);
      this.doc.text(line, this.margin + indent, this.y + size);
      this.y += lh;
    }
    this.y += gap;
  }

  heading(text, level = 2, reserveAfter = 0) {
    const size = level === 2 ? (this.cfg.body + 9) : (this.cfg.body + 2.5);
    const label = this.theme.upperHeadings ? String(text).toUpperCase() : String(text);
    const lh = this.fontDisplay(size, 'bold');
    const lines = this.doc.splitTextToSize(label, this.contentW);
    // A heading must never sit alone at the foot of a page: reserve room for
    // the heading plus two body lines.
    const headingH = lines.length * lh;
    const pageH = this.bottom - this.top;
    const reserve = Math.min(Math.max(reserveAfter, this.cfg.body * this.cfg.lead * 2), Math.max(pageH - headingH - 14, 0));
    const needed = headingH + reserve + 10;
    this.ensure(needed);
    this.setInk(this.theme.accent);
    for (const line of lines) {
      this.doc.text(line, this.margin, this.y + size * 0.86);
      this.y += lh;
    }
    if (level === 2 && this.theme.rulesUnderHeadings) {
      const c = this.color(this.theme.accent);
      this.doc.setDrawColor(c[0], c[1], c[2]);
      this.doc.setLineWidth(0.7);
      this.doc.line(this.margin, this.y + 2, this.margin + 54, this.y + 2);
      this.y += 8;
    }
    this.y += level === 2 ? 8 : 4;
  }

  list(items, ordered = false) {
    const size = this.cfg.body;
    const lh = size * this.cfg.lead;
    items.forEach((item, i) => {
      const bullet = ordered ? `${i + 1}.` : '•';
      this.fontBody(size);
      this.setInk();
      const lines = this.doc.splitTextToSize(String(item), this.contentW - 18);
      this.ensure(lines.length > 2 ? lh * 2 : lines.length * lh);
      lines.forEach((line, li) => {
        this.ensure(lh);
        if (li === 0) this.doc.text(bullet, this.margin + 2, this.y + size);
        this.doc.text(line, this.margin + 18, this.y + size);
        this.y += lh;
      });
      this.y += 2;
    });
    this.y += 5;
  }

  kv(pairs) {
    const size = this.cfg.body - 0.5;
    const lh = size * this.cfg.lead;
    const keyW = 128;
    for (const [k, v] of pairs) {
      this.fontBody(size, 'bold');
      const vLines = this.doc.splitTextToSize(String(v ?? '—'), this.contentW - keyW - 8);
      this.ensure(Math.max(lh, vLines.length * lh));
      this.setInk(this.theme.soft);
      this.fontBody(size, 'bold');
      this.doc.text(this.doc.splitTextToSize(String(k), keyW - 6)[0], this.margin, this.y + size);
      this.setInk();
      this.fontBody(size, 'normal');
      let yy = this.y;
      for (const line of vLines) {
        this.doc.text(line, this.margin + keyW, yy + size);
        yy += lh;
      }
      this.y = Math.max(this.y + lh, yy);
    }
    this.y += 6;
  }

  callout({ variant = 'info', title, text }) {
    const colors = CALLOUT_COLORS[variant] || CALLOUT_COLORS.info;
    const padX = 12;
    const padY = 10;
    const innerW = this.contentW - padX * 2 - 6;
    const titleSize = this.cfg.body + 0.5;
    const bodySize = this.cfg.body - 0.5;
    this.fontBody(titleSize, 'bold');
    const titleLines = title ? this.doc.splitTextToSize(String(title), innerW) : [];
    this.fontBody(bodySize);
    const textLines = this.doc.splitTextToSize(String(text || ''), innerW);
    const lh = bodySize * this.cfg.lead;
    const tlh = titleSize * 1.3;
    const boxH = padY * 2 + titleLines.length * tlh + textLines.length * lh;

    if (boxH > this.bottom - this.top) {
      // Too tall to keep whole: fall back to plain text so nothing is clipped.
      if (title) this.paragraph(title, { size: titleSize, style: 'bold', color: colors.bar, gap: 2 });
      this.paragraph(text, { size: bodySize, gap: 8 });
      return;
    }
    this.ensure(boxH + 6);
    const fill = this.color(colors.fill);
    const bar = this.color(colors.bar);
    this.doc.setFillColor(fill[0], fill[1], fill[2]);
    const r = this.theme.radius || 0;
    if (r) this.doc.roundedRect(this.margin, this.y, this.contentW, boxH, r, r, 'F');
    else this.doc.rect(this.margin, this.y, this.contentW, boxH, 'F');
    this.doc.setFillColor(bar[0], bar[1], bar[2]);
    this.doc.rect(this.margin, this.y, 3, boxH, 'F');

    let yy = this.y + padY;
    if (titleLines.length) {
      this.fontBody(titleSize, 'bold');
      this.setInk(colors.bar);
      for (const line of titleLines) {
        this.doc.text(line, this.margin + padX, yy + titleSize);
        yy += tlh;
      }
    }
    this.fontBody(bodySize, 'normal');
    this.setInk(this.theme.ink);
    for (const line of textLines) {
      this.doc.text(line, this.margin + padX, yy + bodySize);
      yy += lh;
    }
    this.y += boxH + 10;
  }

  tableMetrics({ columns, rows }) {
    const size = this.cfg.body - 1.5;
    const lh = size * 1.35;
    const padY = 5;
    const padX = 6;
    const weights = columns.map((c, i) => {
      const cells = rows.map((r) => String(r[i] ?? '').length);
      const longest = Math.max(String(c).length, ...(cells.length ? cells : [0]));
      return Math.min(Math.max(longest, 6), 42);
    });
    const totalW = weights.reduce((a, b) => a + b, 0);
    const widths = weights.map((w) => (w / totalW) * this.contentW);
    const measure = (cells, bold) => {
      this.fontBody(size, bold ? 'bold' : 'normal');
      let max = 1;
      cells.forEach((cell, i) => {
        const lines = this.doc.splitTextToSize(String(cell ?? ''), widths[i] - padX * 2);
        max = Math.max(max, lines.length);
      });
      return max * lh + padY * 2;
    };
    const headerH = measure(columns, true);
    const rowHeights = rows.map((r) => measure(r, false));
    return { size, lh, padX, padY, widths, measure, headerH, rowHeights, totalH: headerH + rowHeights.reduce((a, b) => a + b, 0) };
  }

  table({ columns, rows, caption }) {
    const { size, lh, padX, padY, widths, measure, headerH, rowHeights, totalH } = this.tableMetrics({ columns, rows });

    if (caption) this.paragraph(caption, { size: size - 0.5, color: this.theme.soft, gap: 3 });


    const drawRow = (cells, { bold = false, fill = null, statusIdx = -1 } = {}) => {
      const h = measure(cells, bold);
      if (this.y + h > this.bottom) {
        this.newPage();
        drawRow(columns, { bold: true, fill: this.theme.tint });
      }
      if (fill) {
        const f = this.color(fill);
        this.doc.setFillColor(f[0], f[1], f[2]);
        this.doc.rect(this.margin, this.y, this.contentW, h, 'F');
      }
      if (statusIdx >= 0 && STATUS_TINT[cells[statusIdx]]) {
        const f = this.color(STATUS_TINT[cells[statusIdx]]);
        const x = this.margin + widths.slice(0, statusIdx).reduce((a, b) => a + b, 0);
        this.doc.setFillColor(f[0], f[1], f[2]);
        this.doc.rect(x, this.y, widths[statusIdx], h, 'F');
      }
      this.fontBody(size, bold ? 'bold' : 'normal');
      this.setInk(bold ? this.theme.soft : this.theme.ink);
      let x = this.margin;
      cells.forEach((cell, i) => {
        const lines = this.doc.splitTextToSize(String(cell ?? ''), widths[i] - padX * 2);
        let yy = this.y + padY;
        for (const line of lines) {
          this.doc.text(line, x + padX, yy + size * 0.92);
          yy += lh;
        }
        x += widths[i];
      });
      const rc = this.color(this.theme.rule);
      this.doc.setDrawColor(rc[0], rc[1], rc[2]);
      this.doc.setLineWidth(0.4);
      this.doc.line(this.margin, this.y + h, this.margin + this.contentW, this.y + h);
      this.y += h;
    };

    // Keep the whole table together when it fits on a fresh page, and never
    // leave a header stranded with fewer than two rows under it.
    const pageH = this.bottom - this.top;
    if (this.y + totalH > this.bottom && totalH <= pageH) this.newPage();
    else this.ensure(headerH + rowHeights.slice(0, 2).reduce((a, b) => a + b, 0));
    drawRow(columns, { bold: true, fill: this.theme.tint });
    const statusIdx = columns.indexOf('Status');
    for (const row of rows) drawRow(row, { statusIdx });
    this.y += 10;
  }

  journal({ title, lines }) {
    const count = Math.max(2, lines || 6);
    const lh = 22;
    this.heading(title, 3, Math.min(count, 5) * lh);
    const rc = this.color(this.theme.rule);
    this.doc.setDrawColor(rc[0], rc[1], rc[2]);
    this.doc.setLineWidth(0.4);
    for (let i = 0; i < count; i += 1) {
      if (this.ensure(lh)) {
        this.doc.setDrawColor(rc[0], rc[1], rc[2]);
      }
      this.doc.line(this.margin, this.y + lh - 4, this.margin + this.contentW, this.y + lh - 4);
      this.y += lh;
    }
    this.y += 8;
  }

  /* ---------------- structures ---------------- */

  /** Rough height of the first unbreakable unit of a block, for orphan control. */
  firstUnitHeight(b) {
    if (!b) return 0;
    const lh = this.cfg.body * this.cfg.lead;
    switch (b.type) {
      case 'p': return lh * 2;
      case 'ul':
      case 'ol': return lh * 2;
      case 'kv': return lh * 2;
      case 'callout': return 56;
      case 'journal': return 60;
      case 'table': {
        const m = this.tableMetrics(b);
        const twoRows = m.headerH + m.rowHeights.slice(0, 2).reduce((a, x) => a + x, 0);
        const pageH = this.bottom - this.top;
        // If the table will be kept whole, the heading has to reserve the whole
        // thing; otherwise reserving the header plus two rows is enough.
        return m.totalH <= pageH - 90 ? m.totalH : twoRows;
      }
      default: return lh;
    }
  }

  block(b, next) {
    switch (b.type) {
      case 'h2':
        this.heading(b.text, 2, this.firstUnitHeight(next));
        break;
      case 'h3':
        this.heading(b.text, 3, this.firstUnitHeight(next));
        break;
      case 'p':
        this.paragraph(b.text);
        if (b.why) {
          const w = b.why;
          this.paragraph(
            `Why: ${w.reason} — source: ${w.sourceType}${w.sourceReference ? ` (${w.sourceReference})` : ''}; confidence ${w.confidence}${w.temporary ? '; temporary and reintroducible' : ''}.`,
            { size: this.cfg.body - 1.5, style: 'italic', color: this.theme.soft, gap: 8 }
          );
        }
        break;
      case 'ul':
        this.list(b.items, false);
        break;
      case 'ol':
        this.list(b.items, true);
        break;
      case 'kv':
        this.kv(b.pairs);
        break;
      case 'table':
        this.table(b);
        break;
      case 'callout':
        this.callout(b);
        break;
      case 'journal':
        this.journal(b);
        break;
      case 'pagebreak':
        this.newPage();
        break;
      default:
        break;
    }
  }

  cover() {
    const { book } = this;
    this.pageChapters[1] = '';
    const accent = this.color(this.theme.accent);
    const tint = this.color(this.theme.tint);
    this.doc.setFillColor(tint[0], tint[1], tint[2]);
    this.doc.rect(0, 0, PAGE.w, PAGE.h, 'F');
    this.doc.setFillColor(accent[0], accent[1], accent[2]);
    this.doc.rect(0, 0, PAGE.w, 8, 'F');

    // wordmark
    this.doc.setDrawColor(accent[0], accent[1], accent[2]);
    this.doc.setLineWidth(1.4);
    this.doc.roundedRect(this.margin, 92, 34, 34, 6, 6, 'S');
    this.doc.setFont(this.theme.display, 'bold');
    this.doc.setFontSize(13);
    this.doc.setTextColor(accent[0], accent[1], accent[2]);
    this.doc.text('LifePrint', this.margin + 44, 114);

    this.doc.setFont(this.theme.display, 'bold');
    this.doc.setFontSize(34);
    const titleLines = this.doc.splitTextToSize(book.title, PAGE.w - this.margin * 2 - 40);
    let y = 300;
    for (const line of titleLines) {
      this.doc.text(line, this.margin, y);
      y += 40;
    }
    this.doc.setFont(this.theme.body, 'normal');
    this.doc.setFontSize(13);
    const soft = this.color(this.theme.soft);
    this.doc.setTextColor(soft[0], soft[1], soft[2]);
    this.doc.text(book.subtitle || 'Personalized edition', this.margin, y + 10);

    this.doc.setFontSize(10);
    const meta = [
      `Prepared for ${book.forName || 'you'}`,
      `Generated ${new Date(book.generatedAt).toLocaleDateString()}`,
      `${book.chapters.length} chapters · ${book.data.plan.days.length}-day meal plan`,
      book.style.replace(/-/g, ' '),
    ];
    let my = PAGE.h - 150;
    for (const line of meta) {
      this.doc.text(line, this.margin, my);
      my += 15;
    }
    this.doc.setFontSize(9);
    this.doc.text('Educational guidance — not medical advice.', this.margin, PAGE.h - 60);
  }

  frontMatter() {
    // Disclaimer
    this.newPage();
    this.currentChapter = 'Read this first';
    this.pageChapters[this.page()] = this.currentChapter;
    this.heading('Read this first', 2);
    this.paragraph('This book was assembled from answers you gave and, where you provided them, documents you uploaded. It is educational material. It does not diagnose, treat, or cure any condition, and it is not a substitute for care from a physician, registered dietitian, or therapist.');
    this.callout({
      variant: 'caution',
      title: 'Where this book stops',
      text: 'It will not give you supplement doses, medication guidance, calorie prescriptions framed as clinical targets, or condition-specific limits such as carbohydrate dosing with insulin, protein and potassium limits in kidney disease, or protein restriction in liver disease. Those decisions belong to your clinician.',
    });
    this.paragraph('Nutrition figures throughout are estimates calculated from a seed database of common foods. They are not measured values, they were not verified against a laboratory analysis, and they should not be used as clinical targets.');
    this.paragraph('Food-sensitivity panels (IgG and similar) are not allergy tests. Where a finding came from one, this book labels it as a temporary, reintroducible signal with its confidence level and page citation, and schedules it for reintroduction rather than permanent removal.');
    this.paragraph('Store availability, product formulations, and menu items change without notice. Every store and restaurant suggestion in this book is a starting point for reading labels yourself, never a guarantee that an item is stocked or still compliant.');
    if (this.book.data.safetyFlags.length) {
      this.callout({
        variant: 'stop',
        title: `${this.book.data.safetyFlags.length} safety flag${this.book.data.safetyFlags.length === 1 ? '' : 's'} apply to you`,
        text: 'Each one is written out in full in the clinician review chapter, with the specific combination of your answers that triggered it. Please read that chapter before following this plan, and take it with you to your next appointment.',
      });
    }

    // How to use
    this.newPage();
    this.currentChapter = 'How to use this book';
    this.pageChapters[this.page()] = this.currentChapter;
    this.heading('How to use this book', 2);
    this.paragraph('Read the four statuses once, then use the index. Most people live in two chapters: the meal plan and the grocery guide.');
    this.table({
      columns: ['Status', 'What it means', 'How to use it'],
      rows: [
        ['Eat freely', 'Nothing in your answers argues against it.', 'Build most meals from this list.'],
        ['Eat in moderation', 'Fine in normal portions, worth watching.', 'Keep to the portion noted in the food guide.'],
        ['Occasional', 'A deliberate choice rather than a staple.', 'Plan it, enjoy it, do not build the week around it.'],
        ['Avoid', 'Excluded — the reason is printed beside it.', 'Check the reason: some are permanent, many are temporary.'],
      ],
    });
    this.paragraph('Every ruling names its source and confidence. Where a ruling is temporary, the reintroduction chapter tells you when and how to test it — one food at a time, with a watch window.');
    this.paragraph('Blank trackers and journal pages are meant to be written on. Print this book single-sided if you plan to use them.');
  }

  toc(pageMap) {
    this.newPage();
    this.currentChapter = 'Contents';
    this.pageChapters[this.page()] = this.currentChapter;
    this.heading('Contents', 2);
    const size = this.cfg.body;
    const lh = size * 1.72;
    const numX = this.margin + this.contentW;
    this.book.chapters.forEach((c, i) => {
      this.ensure(lh);
      this.fontBody(size, 'normal');
      this.setInk(this.theme.ink);
      const label = `${i + 1}.  ${c.title}`;
      const target = pageMap[c.id] || 0;
      const numText = target ? String(target) : '—';
      const numW = this.doc.getTextWidth('000');
      const labelLines = this.doc.splitTextToSize(label, this.contentW - numW - 26);
      const text = labelLines[0] + (labelLines.length > 1 ? '…' : '');
      this.doc.text(text, this.margin, this.y + size);
      // leader dots
      const textW = this.doc.getTextWidth(text);
      const dotsStart = this.margin + textW + 5;
      const dotsEnd = numX - numW - 6;
      if (dotsEnd > dotsStart) {
        const soft = this.color(this.theme.soft);
        this.doc.setTextColor(soft[0], soft[1], soft[2]);
        const dotW = this.doc.getTextWidth('.');
        const count = Math.max(0, Math.floor((dotsEnd - dotsStart) / dotW));
        this.doc.text('.'.repeat(count), dotsStart, this.y + size);
      }
      this.setInk(this.theme.accent);
      this.doc.text(numText, numX, this.y + size, { align: 'right' });
      if (target) {
        this.doc.link(this.margin, this.y, this.contentW, lh, { pageNumber: target });
      }
      this.y += lh;
    });
    this.y += 6;
    this.paragraph('Every entry above is a live link in the PDF. Page numbers are printed in the footer of every page.', { size: this.cfg.body - 1.5, color: this.theme.soft });
  }

  chapters() {
    for (const chapter of this.book.chapters) {
      this.newPage();
      this.currentChapter = chapter.title;
      this.pageChapters[this.page()] = chapter.title;
      this.chapterStart[chapter.id] = this.page();
      this.heading(chapter.title, 2);
      const blocks = chapter.blocks.filter((b, i) => !(b.type === 'h2' && b.text === chapter.title && i === 0));
      blocks.forEach((b, i) => this.block(b, blocks[i + 1]));
    }
  }

  decorate() {
    const total = this.doc.getNumberOfPages();
    for (let p = 2; p <= total; p += 1) {
      this.doc.setPage(p);
      const rule = this.color(this.theme.rule);
      const soft = this.color(this.theme.soft);
      // running header
      this.doc.setFont(this.theme.body, 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(soft[0], soft[1], soft[2]);
      const chapterTitle = this.pageChapters[p] || '';
      this.doc.text(String(chapterTitle).slice(0, 62), this.margin, this.cfg.margin - 8);
      this.doc.text(this.book.title.slice(0, 46), PAGE.w - this.margin, this.cfg.margin - 8, { align: 'right' });
      this.doc.setDrawColor(rule[0], rule[1], rule[2]);
      this.doc.setLineWidth(0.4);
      this.doc.line(this.margin, this.cfg.margin - 4, PAGE.w - this.margin, this.cfg.margin - 4);
      // footer
      this.doc.line(this.margin, PAGE.h - this.cfg.margin + 4, PAGE.w - this.margin, PAGE.h - this.cfg.margin + 4);
      this.doc.setFontSize(8);
      this.doc.text('Educational guidance — not medical advice', this.margin, PAGE.h - this.cfg.margin + 16);
      this.doc.text(`Page ${p} of ${total}`, PAGE.w - this.margin, PAGE.h - this.cfg.margin + 16, { align: 'right' });
    }
  }
}

/* -------------------------------------------------------------------------- */

function buildOnce(book, { variant, pageMap }) {
  const { jsPDF } = window.jspdf;
  const cfg = variantConfig(variant);
  const theme = THEMES[book.style] || THEMES['modern-wellness'];
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  doc.setProperties({
    title: book.title,
    subject: 'Personalized nutrition and lifestyle guide (educational)',
    creator: 'LifePrint',
    author: 'LifePrint',
    keywords: 'nutrition, lifestyle, educational, personalized',
  });
  const r = new Renderer(doc, { theme, cfg, book });
  r.cover();
  r.frontMatter();
  r.toc(pageMap);
  r.chapters();
  r.decorate();
  return { doc, chapterStart: r.chapterStart, pages: doc.getNumberOfPages() };
}

/**
 * Renders the book to a PDF. Runs up to three passes so the table of contents
 * carries real page numbers and live links.
 */
export function renderPdf(book, { variant = 'standard' } = {}) {
  if (!jsPDFAvailable()) {
    throw new Error('The PDF library did not load. Check your connection and reload — or use “Print to PDF” from your browser as a fallback.');
  }
  let pageMap = {};
  let result = null;
  for (let pass = 0; pass < 3; pass += 1) {
    result = buildOnce(book, { variant, pageMap });
    const same = Object.keys(result.chapterStart).every((k) => result.chapterStart[k] === pageMap[k]);
    pageMap = result.chapterStart;
    if (same && pass > 0) break;
  }
  return result;
}

export function filenameFor(book, variant) {
  const slug = String(book.title || 'lifeprint-book')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
  const suffix = variant === 'standard' ? '' : `-${variant}`;
  return `${slug}${suffix}.pdf`;
}

export function downloadPdf(book, { variant = 'standard' } = {}) {
  const { doc, pages } = renderPdf(book, { variant });
  const name = filenameFor(book, variant);
  doc.save(name);
  return { pages, name };
}
