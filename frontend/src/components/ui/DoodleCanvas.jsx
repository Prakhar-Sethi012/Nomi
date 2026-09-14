import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const BG = '#1e293b';
const STROKE = '#60a5fa';

// A freehand canvas whose backing buffer is never trusted to stay put — the
// visible box resizes whenever ScratchpadView swaps between its embedded card
// and the fullscreen pop-out, and a naive canvas would either stretch/clip its
// coordinate space (pointer position drifting from the stroke) or wipe itself
// on every resize. Each settle re-backs the buffer at the container's new CSS
// size * devicePixelRatio, rescales the context so draw calls stay in
// CSS-pixel space, and repaints the last frame (snapshotted before the resize)
// stretched to fit, so strokes survive the switch.
const DoodleCanvas = forwardRef(function DoodleCanvas({ doodleKey }, ref) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const hasPaintedRef = useRef(false);
  const resizeTimerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    clear() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      localStorage.removeItem(doodleKey);
    },
  }), [doodleKey]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const redraw = (cssWidth, cssHeight) => {
      if (cssWidth <= 0 || cssHeight <= 0) return;
      const dpr = window.devicePixelRatio || 1;
      const ctx = canvas.getContext('2d');
      // Only snapshot the live canvas once something real has been painted to
      // it — on the very first call the backing store is still the browser's
      // blank 300x150 default, and that would shadow the actual saved doodle.
      const snapshot = hasPaintedRef.current ? canvas.toDataURL() : null;
      const source = snapshot || localStorage.getItem(doodleKey);

      canvas.width = Math.max(1, Math.round(cssWidth * dpr));
      canvas.height = Math.max(1, Math.round(cssHeight * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = STROKE;
      ctx.lineWidth = 3;

      const paintBg = () => {
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, cssWidth, cssHeight);
      };

      if (source) {
        const img = new Image();
        img.onload = () => { paintBg(); ctx.drawImage(img, 0, 0, cssWidth, cssHeight); };
        img.src = source;
      } else {
        paintBg();
      }
      hasPaintedRef.current = true;
    };

    let firstRun = true;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (firstRun) {
        firstRun = false;
        redraw(width, height);
        return;
      }
      // Debounced: the fullscreen expand/collapse transition fires this
      // dozens of times a second — only commit the buffer once size has
      // actually settled, so an in-flight resize doesn't stretch every frame.
      clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(() => redraw(width, height), 120);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      clearTimeout(resizeTimerRef.current);
    };
  }, [doodleKey]);

  const posFromEvent = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e) => {
    canvasRef.current.setPointerCapture(e.pointerId);
    const { x, y } = posFromEvent(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    const { x, y } = posFromEvent(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    canvasRef.current.getContext('2d').closePath();
    isDrawingRef.current = false;
    localStorage.setItem(doodleKey, canvasRef.current.toDataURL());
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
