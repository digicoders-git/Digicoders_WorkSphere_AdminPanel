import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/** A4 dimensions in mm */
const A4_W_MM  = 210;
const A4_H_MM  = 297;
const MARGIN_MM = 10;
const CONTENT_W_MM = A4_W_MM  - MARGIN_MM * 2;
const CONTENT_H_MM = A4_H_MM  - MARGIN_MM * 2;

/** Render width in px — matches 210mm at 96dpi */
const RENDER_W_PX = 794;

// ── DOM helpers ────────────────────────────────────────────────────────────────

const prepareHost = (htmlContent) => {
    const host = document.createElement("div");
    host.innerHTML = htmlContent;
    Object.assign(host.style, {
        position:   "fixed",
        left:       "-10000px",
        top:        "0",
        width:      `${RENDER_W_PX}px`,
        background: "#ffffff",
        zIndex:     "-1",
        overflow:   "visible",
    });
    document.body.appendChild(host);

    const pageEl = host.querySelector(".page") || host;
    pageEl.style.width    = `${RENDER_W_PX}px`;
    pageEl.style.maxWidth = `${RENDER_W_PX}px`;
    pageEl.style.boxSizing = "border-box";

    return { host, pageEl };
};

const waitForImages = async (root) => {
    const imgs = [...root.querySelectorAll("img")];
    await Promise.all(imgs.map((img) => new Promise((resolve) => {
        if (!img.getAttribute("src")) { img.style.display = "none"; return resolve(); }
        if (img.complete && img.naturalWidth > 0) return resolve();
        img.onload  = resolve;
        img.onerror = () => { img.style.display = "none"; resolve(); };
        setTimeout(resolve, 4000);
    })));
};

const inlineImages = async (root) => {
    const imgs = [...root.querySelectorAll("img")];
    for (const img of imgs) {
        const src = img.getAttribute("src");
        if (!src || src.startsWith("data:")) continue;
        try {
            const abs = src.startsWith("http")
                ? src
                : `${window.location.origin}${src.startsWith("/") ? "" : "/"}${src}`;
            const res  = await fetch(abs, { mode: "cors", credentials: "omit" });
            if (!res.ok) continue;
            const blob = await res.blob();
            img.src = await new Promise((resolve, reject) => {
                const r = new FileReader();
                r.onload  = () => resolve(r.result);
                r.onerror = reject;
                r.readAsDataURL(blob);
            });
        } catch { /* keep original src */ }
    }
};

// ── Smart page-break detector ──────────────────────────────────────────────────
/**
 * Walk every direct child of .page and collect their bottom-edge Y positions
 * (relative to the top of the host element).
 * Returns a sorted array of "safe cut points" — pixel Y values where we can
 * slice the canvas without splitting a block.
 */
const collectSafeCutPoints = (host) => {
    const pageEl   = host.querySelector(".page") || host;
    const hostRect = host.getBoundingClientRect();
    const pageRect = pageEl.getBoundingClientRect();

    // Offset of .page top relative to host top
    const pageOffsetY = pageRect.top - hostRect.top;

    // Gather all "atomic" blocks — elements that should never be split
    const atomicSelectors = [
        ".module-card",
        ".section-block",
        ".salutation",
        ".system-banner",
        ".client-grid",
        ".cover",
        ".sign-row",
        ".footer",
        ".tech-line",
        ".notes",
        ".payment-qr-wrap",
        "tr",
    ];

    const safeCuts = new Set();

    // Walk direct children of .page to find natural gaps between top-level blocks
    const children = [...pageEl.children];
    for (const child of children) {
        const rect = child.getBoundingClientRect();
        const topY    = rect.top  - hostRect.top;
        const bottomY = rect.bottom - hostRect.top;
        safeCuts.add(Math.round(topY));
        safeCuts.add(Math.round(bottomY));
    }

    // Also add bottom edges of every atomic element
    for (const sel of atomicSelectors) {
        for (const el of host.querySelectorAll(sel)) {
            const rect    = el.getBoundingClientRect();
            const bottomY = rect.bottom - hostRect.top;
            safeCuts.add(Math.round(bottomY));
        }
    }

    return [...safeCuts].sort((a, b) => a - b);
};

// ── Canvas capture ─────────────────────────────────────────────────────────────
const captureCanvas = async (htmlContent) => {
    const { host } = prepareHost(htmlContent);
    try {
        await inlineImages(host);
        await waitForImages(host);
        if (document.fonts?.ready) await document.fonts.ready;
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await new Promise((r) => setTimeout(r, 400));

        const safeCuts = collectSafeCutPoints(host);

        const canvas = await html2canvas(host, {
            scale:       2,
            useCORS:     true,
            allowTaint:  true,
            backgroundColor: "#ffffff",
            width:       RENDER_W_PX,
            windowWidth: RENDER_W_PX,
            logging:     false,
            imageTimeout: 15000,
        });

        return { canvas, safeCuts };
    } finally {
        document.body.removeChild(host);
    }
};

// ── Smart PDF builder ──────────────────────────────────────────────────────────
/**
 * Instead of slicing at fixed intervals, find the largest safe cut point
 * that fits within each page's height budget.
 * If a single block is taller than one page, fall back to slicing at the
 * page boundary (unavoidable) but that case is extremely rare.
 */
const buildSmartPdf = ({ canvas, safeCuts }, filename) => {
    const pdf = new jsPDF({
        orientation: "portrait",
        unit:        "mm",
        format:      "a4",
        compress:    true,
    });

    // Scale factor: canvas px → mm
    const pxPerMm      = canvas.width / CONTENT_W_MM;
    const pageHeightPx = Math.round(CONTENT_H_MM * pxPerMm);

    const totalH = canvas.height;
    if (totalH < 1) { pdf.save(filename); return; }

    let yPx       = 0;
    let pageIndex = 0;

    while (yPx < totalH) {
        if (pageIndex > 0) pdf.addPage();

        const budgetEnd = yPx + pageHeightPx;

        // Find the best safe cut ≤ budgetEnd that is > yPx
        // "Best" = largest value that doesn't exceed the page budget
        let cutAt = budgetEnd; // default: hard cut at page boundary
        for (const cut of safeCuts) {
            if (cut <= yPx) continue;          // already past
            if (cut > budgetEnd) break;        // beyond this page
            cutAt = cut;                       // keep updating — we want the largest
        }
        // Clamp to actual canvas height
        cutAt = Math.min(cutAt, totalH);

        const sliceH = cutAt - yPx;
        const minSlicePx = Math.round(24 * pxPerMm);
        if (sliceH < minSlicePx) {
            cutAt = Math.min(yPx + pageHeightPx, totalH);
            if (cutAt - yPx < 1) break;
        }
        const sliceH2 = cutAt - yPx;
        if (sliceH2 < 1) break;

        // Draw this slice onto a temp canvas
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width  = canvas.width;
        pageCanvas.height = Math.round(sliceH2);
        const ctx = pageCanvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
            canvas,
            0, yPx, canvas.width, sliceH2,
            0, 0,   canvas.width, sliceH2
        );

        const sliceHMm  = sliceH2 / pxPerMm;
        const imgData   = pageCanvas.toDataURL("image/jpeg", 0.93);
        pdf.addImage(imgData, "JPEG", MARGIN_MM, MARGIN_MM, CONTENT_W_MM, sliceHMm);

        yPx = cutAt;
        pageIndex++;
    }

    pdf.save(filename);
};

// ── Public API ─────────────────────────────────────────────────────────────────

/** Download PDF with smart page breaks — blocks never split mid-element */
export const renderHtmlToA4Pdf = async (htmlContent, filename = "quote.pdf") => {
    const result = await captureCanvas(htmlContent);
    buildSmartPdf(result, filename);
};

/** Open system print dialog — best text quality */
export const printQuoteHtml = (htmlContent) =>
    new Promise((resolve, reject) => {
        let printed = false;
        const iframe = document.createElement("iframe");
        iframe.setAttribute("title", "Quote print");
        Object.assign(iframe.style, {
            position:      "fixed",
            top:           "0",
            left:          "0",
            width:         "0",
            height:        "0",
            border:        "none",
            opacity:       "0",
            pointerEvents: "none",
        });
        document.body.appendChild(iframe);

        const cleanup = () => setTimeout(() => {
            if (iframe.parentNode) document.body.removeChild(iframe);
        }, 1500);

        const runPrint = () => {
            if (printed) return;
            printed = true;
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                cleanup();
                resolve();
            } catch (e) {
                cleanup();
                reject(e);
            }
        };

        iframe.onload = () => setTimeout(runPrint, 400);

        const doc = iframe.contentWindow?.document;
        if (!doc) {
            cleanup();
            reject(new Error("Print frame unavailable"));
            return;
        }
        doc.open();
        doc.write(htmlContent);
        doc.close();
    });
