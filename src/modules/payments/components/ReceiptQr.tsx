import React, { useMemo } from 'react';
import { encodeQr } from '../../core/lib/qr';

interface ReceiptQrProps {
  value: string;
  size?: number;
  label?: string;
}

/** Dependency-free QR rendered as SVG modules (crisp in print and on retina). */
export const ReceiptQr: React.FC<ReceiptQrProps> = ({ value, size = 132, label }) => {
  const matrix = useMemo(() => {
    try {
      return encodeQr(value);
    } catch {
      return null;
    }
  }, [value]);

  if (!matrix) return null;

  const quiet = 2;
  const total = matrix.size + quiet * 2;
  const rects: React.ReactElement[] = [];
  for (let y = 0; y < matrix.size; y += 1) {
    for (let x = 0; x < matrix.size; x += 1) {
      if (!matrix.modules[y][x]) continue;
      rects.push(
        <rect
          key={`${x}-${y}`}
          x={x + quiet}
          y={y + quiet}
          width={1}
          height={1}
          fill="#070708"
        />
      );
    }
  }

  return (
    <svg
      role="img"
      aria-label={label ?? 'Receipt verification QR code'}
      viewBox={`0 0 ${total} ${total}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className="rounded-md bg-white p-1"
    >
      <rect x={0} y={0} width={total} height={total} fill="#ffffff" />
      {rects}
    </svg>
  );
};
