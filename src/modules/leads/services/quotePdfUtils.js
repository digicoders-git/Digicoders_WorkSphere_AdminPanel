import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/** A4 PDF layout (mm) */
export const A4 = {
    width: 210,
    height: 297,
    margin: 10,
};

export const A4_CONTENT = {
    width: A4.width - A4.margin * 2,
    height: A4.height - A4.margin * 2,
};

/** ~210mm content width at 96dpi */
export const QUOTE_RENDER_WIDTH_PX = 794;

const prepareHost = (htmlContent) => {
    const host = document.createElement("div");
    host.innerHTML = htmlContent;
    Object.assign(host.style, {
        position: "fixed",
        left: "-10000px",
        top: "0",
        width: `${QUOTE_RENDER_WIDTH_PX}px`,
        background: "#ffffff",
        zIndex: "-1",
        overflow: "visible",
    });
    document.body.appendChild(host);

    const pageEl = host.querySelector(".page") || host;
    pageEl.style.width = `${QUOTE_RENDER_WIDTH_PX}px`;
    pageEl.style.maxWidth = `${QUOTE_RENDER_WIDTH_PX}px`;
    pageEl.style.boxSizing = "border-box";

    return { host, pageEl };
};

const waitForImages = async (root) => {
    const imgs = [...root.querySelectorAll("img")];
    await Promise.all(
        imgs.map(
            (img) =>
                new Promise((resolve) => {
                    const finish = () => resolve();
                    if (!img.getAttribute("src")) {
                        img.style.display = "none";
                        return resolve();
                    }
                    if (img.complete && img.naturalWidth > 0) return resolve();
                    img.onload = finish;
                    img.onerror = () => {
                        img.style.display = "none";
                        finish();
                    };
                    setTimeout(finish, 4000);
                })
        )
    );
};

const inlineImages = async (root) => {
    const imgs = [...root.querySelectorAll("img")];
    for (const img of imgs) {
        const src = img.getAttribute("src");
        if (!src || src.startsWith("data:")) continue;
        try {
            const absolute = src.startsWith("http")
                ? src
                : `${window.location.origin}${src.startsWith("/") ? "" : "/"}${src}`;
            const res = await fetch(absolute, { mode: "cors", credentials: "omit" });
            if (!res.ok) continue;
            const blob = await res.blob();
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            img.src = dataUrl;
        } catch {
            /* keep original src; html2canvas may still render it */
        }
    }
};

const captureQuoteCanvas = async (htmlContent) => {
    const { host } = prepareHost(htmlContent);
    try {
        await inlineImages(host);
        await waitForImages(host);
        if (document.fonts?.ready) await document.fonts.ready;
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await new Promise((r) => setTimeout(r, 350));

        return await html2canvas(host, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            width: QUOTE_RENDER_WIDTH_PX,
            windowWidth: QUOTE_RENDER_WIDTH_PX,
            logging: false,
            imageTimeout: 15000,
        });
    } finally {
        document.body.removeChild(host);
    }
};

/**
 * Build PDF by slicing the canvas into true A4 pages (no full-page image offset).
 */
const canvasToPdf = (canvas, filename) => {
    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
    });

    const pxPerMm = canvas.width / A4_CONTENT.width;
    const pageHeightPx = Math.floor(A4_CONTENT.height * pxPerMm);

    if (pageHeightPx < 1 || canvas.height < 1) {
        pdf.save(filename);
        return;
    }

    let yPx = 0;
    let pageIndex = 0;

    while (yPx < canvas.height) {
        if (pageIndex > 0) pdf.addPage();

        const sliceH = Math.min(pageHeightPx, canvas.height - yPx);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceH;
        const ctx = pageCanvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, yPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

        const sliceHeightMm = sliceH / pxPerMm;
        const imgData = pageCanvas.toDataURL("image/jpeg", 0.92);
        pdf.addImage(imgData, "JPEG", A4.margin, A4.margin, A4_CONTENT.width, sliceHeightMm);

        yPx += pageHeightPx;
        pageIndex += 1;
    }

    pdf.save(filename);
};

/** Download PDF (auto-save file) */
export const renderHtmlToA4Pdf = async (htmlContent, filename = "quote.pdf") => {
    const canvas = await captureQuoteCanvas(htmlContent);
    canvasToPdf(canvas, filename);
};

/**
 * Open system print dialog — best text quality (user chooses "Save as PDF").
 */
export const printQuoteHtml = (htmlContent) =>
    new Promise((resolve, reject) => {
        const iframe = document.createElement("iframe");
        iframe.setAttribute("title", "Quote print");
        Object.assign(iframe.style, {
            position: "fixed",
            top: "0",
            left: "0",
            width: "0",
            height: "0",
            border: "none",
            opacity: "0",
            pointerEvents: "none",
        });
        document.body.appendChild(iframe);

        const cleanup = () => {
            setTimeout(() => {
                if (iframe.parentNode) document.body.removeChild(iframe);
            }, 1500);
        };

        const runPrint = () => {
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

        if (iframe.contentDocument?.readyState === "complete") {
            setTimeout(runPrint, 400);
        }
    });
