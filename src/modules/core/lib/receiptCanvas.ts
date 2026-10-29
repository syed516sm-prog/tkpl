import type { ReceiptPayload } from '../types/tkpl';
import { encodeQr } from './qr';
import {
  RECEIPT_CANVAS_HEIGHT,
  RECEIPT_CANVAS_WIDTH,
  formatReceiptAmount,
  receiptDate,
  receiptVerifyUrl,
  roleLabel,
} from './receipt';

// The header wordmark also carries the "Across Kadapa" script, so the line is
// kept short enough to clear it, and the crop keeps the lockup centred.
const HEADER_WORDMARK = '/assets/brand-logo.svg';

const FONT_STACK =
  "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif";
const DISPLAY_STACK = "'Segoe UI Black', 'Segoe UI', system-ui, sans-serif";
const MONO_STACK = "ui-monospace, 'Cascadia Mono', Consolas, 'Courier New', monospace";

const COLORS = {
  ink: '#070708',
  surface: '#101014',
  surface2: '#17171c',
  line: '#2a2a32',
  lime: '#b6ff2e',
  yellow: '#ffd21e',
  muted: '#9d9da8',
  white: '#ffffff',
};

export interface ReceiptCanvasOptions {
  origin?: string;
  organizerLine?: string;
  partnerLine?: string;
  logoCandidates?: string[];
}

const DEFAULT_LOGO_CANDIDATES = [HEADER_WORDMARK];

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined' || !src) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => {
      const retry = new Image();
      retry.onload = () => resolve(retry);
      retry.onerror = () => resolve(null);
      retry.src = src;
    };
    image.src = src;
  });
}

async function firstLoadableImage(candidates: string[]): Promise<HTMLImageElement | null> {
  for (const candidate of candidates) {
    const image = await loadImage(candidate);
    if (image) return image;
  }
  return null;
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const imageRatio = image.width / image.height;
  const boxRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = image.width;
  let sh = image.height;
  if (imageRatio > boxRatio) {
    sw = image.height * boxRatio;
    sx = (image.width - sw) / 2;
  } else {
    sh = image.width / boxRatio;
    sy = (image.height - sh) / 2;
  }
  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  font: (size: number) => string,
  minSize = 28
): number {
  let size = startSize;
  ctx.font = font(size);
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 2;
    ctx.font = font(size);
  }
  return size;
}

function drawQr(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number) {
  let matrix;
  try {
    matrix = encodeQr(text);
  } catch {
    return;
  }
  const quiet = 2;
  const cell = size / (matrix.size + quiet * 2);
  ctx.fillStyle = COLORS.white;
  roundRect(ctx, x, y, size, size, 12);
  ctx.fill();
  ctx.fillStyle = COLORS.ink;
  for (let row = 0; row < matrix.size; row += 1) {
    for (let col = 0; col < matrix.size; col += 1) {
      if (!matrix.modules[row][col]) continue;
      ctx.fillRect(
        x + (col + quiet) * cell,
        y + (row + quiet) * cell,
        Math.ceil(cell),
        Math.ceil(cell)
      );
    }
  }
}

/**
 * Draws the 1080x1350 receipt card. Pure canvas (no html-to-image) so the
 * downloaded PNG is byte-stable and there is no extra runtime dependency.
 */
export async function drawReceiptCanvas(
  receipt: ReceiptPayload,
  options: ReceiptCanvasOptions = {}
): Promise<HTMLCanvasElement | null> {
  const canvas = document.createElement('canvas');
  canvas.width = RECEIPT_CANVAS_WIDTH;
  canvas.height = RECEIPT_CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const W = RECEIPT_CANVAS_WIDTH;
  const H = RECEIPT_CANVAS_HEIGHT;
  const origin =
    options.origin ?? (typeof window !== 'undefined' ? window.location.origin : 'https://www.tkpl.co.in');
  const verifyUrl = receiptVerifyUrl(receipt, origin);

  const [logo, photo] = await Promise.all([
    firstLoadableImage(options.logoCandidates ?? DEFAULT_LOGO_CANDIDATES),
    receipt.photo_url ? loadImage(receipt.photo_url) : Promise.resolve(null),
  ]);

  // Background
  const background = ctx.createLinearGradient(0, 0, W, H);
  background.addColorStop(0, '#08080a');
  background.addColorStop(0.55, '#0d0d11');
  background.addColorStop(1, '#111118');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W * 0.15, -80, 40, W * 0.15, -80, 720);
  glow.addColorStop(0, 'rgba(182,255,46,0.22)');
  glow.addColorStop(1, 'rgba(182,255,46,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 700);

  const glow2 = ctx.createRadialGradient(W * 0.95, H * 0.05, 30, W * 0.95, H * 0.05, 520);
  glow2.addColorStop(0, 'rgba(255,210,30,0.14)');
  glow2.addColorStop(1, 'rgba(255,210,30,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  // Card frame
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  roundRect(ctx, 24, 24, W - 48, H - 48, 40);
  ctx.stroke();

  // Header
  if (logo) {
    ctx.save();
    roundRect(ctx, 72, 64, 120, 120, 26);
    ctx.clip();
    drawImageCover(ctx, logo, 72, 64, 120, 120);
    ctx.restore();
  } else {
    ctx.fillStyle = COLORS.lime;
    ctx.font = `900 52px ${DISPLAY_STACK}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('T-KPL', 72, 124);
  }

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COLORS.lime;
  ctx.font = `900 44px ${DISPLAY_STACK}`;
  ctx.fillText('T-KPL', 214, 112);
  ctx.fillStyle = COLORS.white;
  ctx.font = `700 23px ${FONT_STACK}`;
  ctx.fillText('KADAPA PREMIER LEAGUE', 214, 146);
  ctx.fillStyle = COLORS.muted;
  ctx.font = `500 21px ${FONT_STACK}`;
  ctx.fillText('OFFICIAL PLAYER REGISTRATION RECEIPT', 214, 182);

  // PAID stamp (sits well right of the wordmark, low enough to clear the title)
  ctx.save();
  ctx.translate(W - 148, 190);
  ctx.rotate(-0.12);
  ctx.strokeStyle = 'rgba(182,255,46,0.75)';
  ctx.lineWidth = 4;
  roundRect(ctx, -76, -34, 152, 68, 14);
  ctx.stroke();
  ctx.fillStyle = COLORS.lime;
  ctx.font = `900 38px ${DISPLAY_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PAID', 0, 1);
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Divider
  ctx.strokeStyle = COLORS.line;
  ctx.beginPath();
  ctx.moveTo(72, 224);
  ctx.lineTo(W - 72, 224);
  ctx.stroke();

  // Photo
  const photoSize = 340;
  const photoX = 72;
  const photoY = 272;
  ctx.save();
  roundRect(ctx, photoX, photoY, photoSize, photoSize, 36);
  ctx.clip();
  ctx.fillStyle = COLORS.surface2;
  ctx.fillRect(photoX, photoY, photoSize, photoSize);
  if (photo) {
    drawImageCover(ctx, photo, photoX, photoY, photoSize, photoSize);
  } else {
    ctx.fillStyle = COLORS.muted;
    ctx.font = `700 30px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.fillText('PHOTO', photoX + photoSize / 2, photoY + photoSize / 2);
    ctx.textAlign = 'left';
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(182,255,46,0.55)';
  ctx.lineWidth = 5;
  roundRect(ctx, photoX, photoY, photoSize, photoSize, 36);
  ctx.stroke();

  // Player block
  const textX = photoX + photoSize + 48;
  const textWidth = W - textX - 72;

  const nameSize = fitText(
    ctx,
    receipt.full_name.toUpperCase(),
    textWidth,
    58,
    (size) => `900 ${size}px ${DISPLAY_STACK}`,
    34
  );
  ctx.fillStyle = COLORS.white;
  ctx.font = `900 ${nameSize}px ${DISPLAY_STACK}`;
  ctx.fillText(receipt.full_name.toUpperCase(), textX, photoY + 78);

  ctx.fillStyle = COLORS.lime;
  ctx.font = `800 30px ${FONT_STACK}`;
  ctx.fillText(roleLabel(receipt.role).toUpperCase(), textX, photoY + 124);

  ctx.fillStyle = COLORS.muted;
  ctx.font = `500 24px ${FONT_STACK}`;
  ctx.fillText('LOCALITY / TOWN', textX, photoY + 186);
  const localitySize = fitText(
    ctx,
    receipt.locality,
    textWidth,
    34,
    (size) => `700 ${size}px ${FONT_STACK}`,
    24
  );
  ctx.fillStyle = COLORS.white;
  ctx.font = `700 ${localitySize}px ${FONT_STACK}`;
  ctx.fillText(receipt.locality, textX, photoY + 228);

  ctx.fillStyle = COLORS.muted;
  ctx.font = `500 24px ${FONT_STACK}`;
  ctx.fillText('REGISTRATION NO', textX, photoY + 290);
  ctx.fillStyle = COLORS.yellow;
  ctx.font = `800 36px ${MONO_STACK}`;
  ctx.fillText(receipt.registration_no, textX, photoY + 334);

  // Amount panel
  const panelY = 660;
  ctx.fillStyle = COLORS.surface;
  roundRect(ctx, 72, panelY, W - 144, 168, 28);
  ctx.fill();
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  roundRect(ctx, 72, panelY, W - 144, 168, 28);
  ctx.stroke();

  ctx.fillStyle = COLORS.muted;
  ctx.font = `600 24px ${FONT_STACK}`;
  ctx.fillText('REGISTRATION FEE PAID', 112, panelY + 52);
  ctx.fillStyle = COLORS.lime;
  ctx.font = `900 84px ${DISPLAY_STACK}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(formatReceiptAmount(receipt), 108, panelY + 138);

  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.muted;
  ctx.font = `600 24px ${FONT_STACK}`;
  ctx.fillText('PAYMENT DATE (IST)', W - 112, panelY + 52);
  ctx.fillStyle = COLORS.white;
  ctx.font = `700 32px ${FONT_STACK}`;
  ctx.fillText(receiptDate(receipt.paid_at, receipt.submitted_at), W - 112, panelY + 98);
  ctx.fillStyle = COLORS.muted;
  ctx.font = `500 22px ${MONO_STACK}`;
  ctx.fillText(receipt.razorpay_payment_id ? `RZP ${receipt.razorpay_payment_id}` : 'PAID ONLINE', W - 112, panelY + 138);
  ctx.textAlign = 'left';

  // Receipt number band
  const bandY = 868;
  ctx.fillStyle = 'rgba(182,255,46,0.10)';
  roundRect(ctx, 72, bandY, W - 144, 132, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(182,255,46,0.40)';
  ctx.lineWidth = 2;
  roundRect(ctx, 72, bandY, W - 144, 132, 24);
  ctx.stroke();

  ctx.fillStyle = COLORS.lime;
  ctx.font = `600 24px ${FONT_STACK}`;
  ctx.fillText('RECEIPT NUMBER', 112, bandY + 48);
  const receiptNoSize = fitText(
    ctx,
    receipt.receipt_no,
    W - 224,
    52,
    (size) => `900 ${size}px ${MONO_STACK}`,
    30
  );
  ctx.fillStyle = COLORS.white;
  ctx.font = `900 ${receiptNoSize}px ${MONO_STACK}`;
  ctx.fillText(receipt.receipt_no, 110, bandY + 106);

  // QR + verification
  const qrSize = 176;
  const qrX = 72;
  const qrY = 1042;
  drawQr(ctx, verifyUrl, qrX, qrY, qrSize);

  ctx.fillStyle = COLORS.white;
  ctx.font = `800 28px ${FONT_STACK}`;
  ctx.fillText('Scan to verify this receipt', qrX + qrSize + 32, qrY + 56);
  ctx.fillStyle = COLORS.muted;
  ctx.font = `500 22px ${FONT_STACK}`;
  ctx.fillText('Verification needs Registration No', qrX + qrSize + 32, qrY + 92);
  ctx.fillText('+ Mobile No + Date of Birth.', qrX + qrSize + 32, qrY + 124);
  ctx.fillStyle = COLORS.lime;
  ctx.font = `600 20px ${MONO_STACK}`;
  const urlText = verifyUrl.replace(/^https?:\/\//, '');
  fitText(ctx, urlText, W - (qrX + qrSize + 32) - 72, 20, (size) => `600 ${size}px ${MONO_STACK}`, 14);
  ctx.font = `600 20px ${MONO_STACK}`;
  ctx.fillText(urlText, qrX + qrSize + 32, qrY + 160);

  // Footer
  ctx.strokeStyle = COLORS.line;
  ctx.beginPath();
  ctx.moveTo(72, 1240);
  ctx.lineTo(W - 72, 1240);
  ctx.stroke();

  ctx.fillStyle = COLORS.muted;
  ctx.font = `500 20px ${FONT_STACK}`;
  ctx.fillText(
    options.organizerLine ?? 'SULTAN SPORTS (KADAPA) · 9110744945',
    72,
    1278
  );
  ctx.textAlign = 'right';
  ctx.fillText(options.partnerLine ?? 'NR SPORTS (VEMPALLI) · 8919155512', W - 72, 1278);
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.white;
  ctx.font = `700 18px ${FONT_STACK}`;
  ctx.fillText('Paid online securely via Razorpay · Keep this receipt for your records.', 72, 1306);

  return canvas;
}

/** Render + download the receipt as a PNG. Resolves false when rendering fails. */
export async function downloadReceiptPng(
  receipt: ReceiptPayload,
  options: ReceiptCanvasOptions & { fileName: string }
): Promise<boolean> {
  const canvas = await drawReceiptCanvas(receipt, options);
  if (!canvas || typeof canvas.toBlob !== 'function') return false;

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), 'image/png');
  });
  if (!blob) return false;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = options.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
