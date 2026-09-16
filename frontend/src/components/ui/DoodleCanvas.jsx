import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const BG = '#1e293b';
const DEFAULT_COLOR = '#60a5fa';
const DEFAULT_SIZE = 3;

// Strokes are stored as vector point data in "world space" instead of a
// single raster snapshot — the old dataURL-per-frame approach couldn't
// support panning, since panning would just reveal blank canvas outside
// whatever was originally painted. Storing points means any resize, pan, or
// texture change can just redraw the same data from scratch.
const DoodleCanvas = forwardRef(function DoodleCanvas({ doodleKey, color = DEFAULT_COLOR, size = DEFAULT_SIZE }, ref) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const currentStrokeRef = useRef(null);
  const isDrawingRef = useRef(false);
  const dprRef = useRef(window.devicePixelRatio || 1);
  const sizeRef = useRef({ width: 0, height: 0 });
  const toolRef = useRef({ color, size });

  useEffect(() => {
    toolRef.current = { color, size };
  }, [color, size]);

  const persist = () => {
    try {
      localStorage.setItem(doodleKey, JSON.stringify({ strokes: strokesRef.current }));
    } catch {
      // Storage full or unavailable — the doodle just won't survive reload.
    }
  };

  const drawStroke = (ctx, stroke) => {
    if (stroke.points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
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

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of strokesRef.current) drawStroke(ctx, stroke);
  };

  useImperativeHandle(ref, () => ({
    clear() {
      strokesRef.current = [];
      render();
      localStorage.removeItem(doodleKey);
    },
  }), [doodleKey]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(doodleKey));
      strokesRef.current = Array.isArray(saved?.strokes) ? saved.strokes : [];
    } catch {
      strokesRef.current = [];
    }

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = (cssWidth, cssHeight) => {
      if (cssWidth <= 0 || cssHeight <= 0) return;
      dprRef.current = window.devicePixelRatio || 1;
      sizeRef.current = { width: cssWidth, height: cssHeight };
      canvas.width = Math.max(1, Math.round(cssWidth * dprRef.current));
      canvas.height = Math.max(1, Math.round(cssHeight * dprRef.current));
      render();
    };

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      resize(width, height);
    });
    observer.observe(container);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doodleKey]);

  const posFromEvent = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e) => {
    canvasRef.current.setPointerCapture(e.pointerId);
    const { x, y } = posFromEvent(e);
    currentStrokeRef.current = { color: toolRef.current.color, size: toolRef.current.size, points: [{ x, y }] };
    isDrawingRef.current = true;
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    const { x, y } = posFromEvent(e);
    const stroke = currentStrokeRef.current;
    const prev = stroke.points[stroke.points.length - 1];
    stroke.points.push({ x, y });

    const ctx = canvasRef.current.getContext('2d');
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
  };

  const stopDrawing = () => {
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
        className="w-full h-full block touch-none cursor-crosshair"
      />
    </div>
  );
});

export default DoodleCanvas;
