import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { userStorage } from '../../services/db';

const BG = '#1e293b';
const DEFAULT_COLOR = '#60a5fa';
const DEFAULT_SIZE = 3;
const DEFAULT_TEXTURE = 'pen';

// Per-texture context settings applied before every stroke segment is
// stroked. Marker is a flat, lower opacity (so overlapping strokes darken,
// like real ink); pencil fakes graphite grain with a soft shadow in the
// stroke's own color instead of a crisp line.
const applyTexture = (ctx, texture) => {
  if (texture === 'marker') {
    ctx.globalAlpha = 0.4;
    ctx.shadowBlur = 0;
  } else if (texture === 'pencil') {
    ctx.globalAlpha = 0.85;
    ctx.shadowBlur = 4;
    ctx.shadowColor = ctx.strokeStyle;
  } else {
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
};

// Applies whatever the current stroke needs before it's stroked — shared by
// the live in-progress segment and the full-history replay in render(), so
// the two can never drift apart. Eraser strokes are just brush strokes that
// paint in the canvas's own background color rather than true
// globalCompositeOperation: 'destination-out': the canvas fill is a
// hardcoded slate, not transparent, so a real destination-out "hole" would
// punch through to whatever theme color sits behind the canvas element
// instead of matching it — painting over in BG sidesteps that entirely.
const applyStrokeStyle = (ctx, stroke) => {
  ctx.lineWidth = stroke.size;
  if (stroke.tool === 'eraser') {
    ctx.strokeStyle = BG;
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  } else {
    ctx.strokeStyle = stroke.color;
    applyTexture(ctx, stroke.texture);
  }
};

// Strokes are stored as vector point data in "world space" instead of a
// single raster snapshot — the old dataURL-per-frame approach couldn't
// support panning, since panning would just reveal blank canvas outside
// whatever was originally painted. Storing points means any resize, pan, or
// texture change can just redraw the same data from scratch.
const DoodleCanvas = forwardRef(function DoodleCanvas({ doodleKey, color = DEFAULT_COLOR, size = DEFAULT_SIZE, texture = DEFAULT_TEXTURE, isEraser = false, isPanMode = false }, ref) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const currentStrokeRef = useRef(null);
  const isDrawingRef = useRef(false);
  const dprRef = useRef(window.devicePixelRatio || 1);
  const sizeRef = useRef({ width: 0, height: 0 });
  const toolRef = useRef({ color, size, texture, isEraser });
  // The camera: every stored point is in "world space", and this is the
  // world-space coordinate currently sitting at the canvas's top-left corner.
  const panRef = useRef({ x: 0, y: 0 });
  const isPanModeRef = useRef(isPanMode);
  const isPanningRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    toolRef.current = { color, size, texture, isEraser };
  }, [color, size, texture, isEraser]);

  useEffect(() => {
    isPanModeRef.current = isPanMode;
  }, [isPanMode]);

  const persist = () => {
    userStorage.setItem(doodleKey, { strokes: strokesRef.current }).catch((err) => {
      console.warn('Failed to save doodle strokes to IndexedDB:', err);
    });
  };

  const drawStroke = (ctx, stroke) => {
    if (stroke.points.length < 2) return;
    ctx.save();
    applyStrokeStyle(ctx, stroke);
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    ctx.stroke();
    ctx.restore();
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width: cssWidth, height: cssHeight } = sizeRef.current;
    if (cssWidth <= 0 || cssHeight <= 0) return;

    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    // Everything from here down is drawn in world space — the viewport fill
    // above stays in screen space so it always covers the visible area
    // regardless of how far the camera has panned.
    ctx.translate(-panRef.current.x, -panRef.current.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of strokesRef.current) drawStroke(ctx, stroke);
  };

  useImperativeHandle(ref, () => ({
    clear() {
      strokesRef.current = [];
      render();
      userStorage.removeItem(doodleKey).catch(() => {});
      localStorage.removeItem(doodleKey);
    },
  }), [doodleKey]);

  // 1. Load strokes from IndexedDB asynchronously
  useEffect(() => {
    let isMounted = true;
    userStorage.getItem(doodleKey).then((saved) => {
      if (!isMounted) return;
      if (saved && Array.isArray(saved.strokes)) {
        strokesRef.current = saved.strokes;
        render();
      } else {
        // Fallback for legacy localStorage doodles
        try {
          const legacy = JSON.parse(localStorage.getItem(doodleKey));
          if (Array.isArray(legacy?.strokes)) {
            strokesRef.current = legacy.strokes;
            userStorage.setItem(doodleKey, { strokes: legacy.strokes });
            render();
          }
        } catch {}
      }
    });

    return () => { isMounted = false; };
  }, [doodleKey]);

  // 2. Setup canvas resize observer and wheel panning listeners
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = (cssWidth, cssHeight) => {
      if (cssWidth <= 0 || cssHeight <= 0) return;
      const prev = sizeRef.current;
      if (prev.width === cssWidth && prev.height === cssHeight) return;
      dprRef.current = window.devicePixelRatio || 1;
      sizeRef.current = { width: cssWidth, height: cssHeight };
      canvas.width = Math.max(1, Math.round(cssWidth * dprRef.current));
      canvas.height = Math.max(1, Math.round(cssHeight * dprRef.current));
      render();
    };

    let firstResize = true;
    let resizeTimer = null;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (firstResize) {
        firstResize = false;
        resize(width, height);
        return;
      }
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => resize(width, height), 120);
    });
    observer.observe(container);

    const onWheel = (e) => {
      e.preventDefault();
      panRef.current = { x: panRef.current.x + e.deltaX, y: panRef.current.y + e.deltaY };
      render();
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      observer.disconnect();
      clearTimeout(resizeTimer);
      canvas.removeEventListener('wheel', onWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const posFromEvent = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left + panRef.current.x,
      y: e.clientY - rect.top + panRef.current.y,
    };
  };

  const startDrawing = (e) => {
    canvasRef.current.setPointerCapture(e.pointerId);
    if (isPanModeRef.current) {
      isPanningRef.current = true;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const { x, y } = posFromEvent(e);
    currentStrokeRef.current = {
      color: toolRef.current.color,
      size: toolRef.current.size,
      texture: toolRef.current.texture,
      tool: toolRef.current.isEraser ? 'eraser' : 'brush',
      points: [{ x, y }],
    };
    isDrawingRef.current = true;
  };

  const draw = (e) => {
    if (isPanningRef.current) {
      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      panRef.current = { x: panRef.current.x - dx, y: panRef.current.y - dy };
      render();
      return;
    }

    if (!isDrawingRef.current) return;
    const { x, y } = posFromEvent(e);
    const stroke = currentStrokeRef.current;
    const prev = stroke.points[stroke.points.length - 1];
    stroke.points.push({ x, y });

    const ctx = canvasRef.current.getContext('2d');
    ctx.save();
    applyStrokeStyle(ctx, stroke);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
  };

  const stopDrawing = () => {
    isPanningRef.current = false;
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 1) {
      strokesRef.current.push(currentStrokeRef.current);
      persist();
    }
    currentStrokeRef.current = null;
  };

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
        className={`w-full h-full block touch-none ${isPanMode ? 'cursor-grab active:cursor-grabbing' : isEraser ? 'cursor-cell' : 'cursor-crosshair'}`}
      />
    </div>
  );
});

export default DoodleCanvas;
