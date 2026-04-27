/**
 * PoseCoach.tsx
 *
 * Camera-based real-time posture analysis using MediaPipe Pose (Blazepose).
 * Loaded from CDN — no npm package required.
 *
 * Features:
 *  - Live camera feed with skeleton overlay drawn on a canvas
 *  - Joint angle computation (knee, hip, spine)
 *  - Exercise-specific rule engine with real-time feedback
 *  - Works 100% in-browser via WebAssembly (no server calls)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, CameraOff, AlertTriangle, CheckCircle2 } from 'lucide-react';

// ── CDN URLs for MediaPipe Pose ───────────────────────────────────────────────
const MEDIAPIPE_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404';
const DRAWING_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1675466124';

// ── Landmark indices (MediaPipe Pose 33-point model) ─────────────────────────
const LM = {
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,    RIGHT_ELBOW: 14,
  LEFT_HIP: 23,      RIGHT_HIP: 24,
  LEFT_KNEE: 25,     RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,    RIGHT_ANKLE: 28,
  LEFT_EAR: 7,       RIGHT_EAR: 8,
  NOSE: 0,
} as const;

// ── Types ──────────────────────────────────────────────────────────────────────
type Vec2 = { x: number; y: number; z?: number; visibility?: number };
type Landmarks = Vec2[];

type PoseRule = {
  id: string;
  message: string;
  severity: 'warning' | 'error' | 'ok';
};

export type PoseCoachExercise =
  | 'squat'
  | 'plank'
  | 'deadlift'
  | 'lunge'
  | 'pushup'
  | 'general';

type Props = {
  exercise?: PoseCoachExercise;
  exerciseName?: string;
  onClose: () => void;
};

// ── Geometry helpers ──────────────────────────────────────────────────────────

/** Angle at vertex B formed by A-B-C (0-180°) */
function angleDeg(a: Vec2, b: Vec2, c: Vec2): number {
  const ax = a.x - b.x, ay = a.y - b.y;
  const cx = c.x - b.x, cy = c.y - b.y;
  const dot = ax * cx + ay * cy;
  const magA = Math.sqrt(ax * ax + ay * ay);
  const magC = Math.sqrt(cx * cx + cy * cy);
  if (magA === 0 || magC === 0) return 0;
  return (Math.acos(Math.max(-1, Math.min(1, dot / (magA * magC)))) * 180) / Math.PI;
}

/** Midpoint of two landmarks */
function mid(a: Vec2, b: Vec2): Vec2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Check if landmark is sufficiently visible */
function visible(lm: Vec2 | undefined, threshold = 0.5): boolean {
  return !!lm && (lm.visibility ?? 1) >= threshold;
}

// ── Rule engines per exercise ─────────────────────────────────────────────────

function rulesSquat(lm: Landmarks): PoseRule[] {
  const rules: PoseRule[] = [];

  const lHip = lm[LM.LEFT_HIP], lKnee = lm[LM.LEFT_KNEE], lAnkle = lm[LM.LEFT_ANKLE];
  const rHip = lm[LM.RIGHT_HIP], rKnee = lm[LM.RIGHT_KNEE], rAnkle = lm[LM.RIGHT_ANKLE];
  const lShoulder = lm[LM.LEFT_SHOULDER];

  // Knee angle (depth check)
  if (visible(lHip) && visible(lKnee) && visible(lAnkle)) {
    const kneeAngle = angleDeg(lHip, lKnee, lAnkle);
    if (kneeAngle > 145) {
      rules.push({ id: 'depth', message: '⬇️ Baja más — rodilla a 90°', severity: 'warning' });
    } else if (kneeAngle < 60) {
      rules.push({ id: 'depth', message: '✅ Buena profundidad', severity: 'ok' });
    } else {
      rules.push({ id: 'depth', message: '✅ Profundidad correcta', severity: 'ok' });
    }
  }

  // Knee valgus: knee x should track between hip x and ankle x
  if (visible(lKnee) && visible(lAnkle) && visible(lHip)) {
    const kneeInward = lKnee.x > lAnkle.x + 0.04; // left knee collapsing right
    if (kneeInward) {
      rules.push({ id: 'valgus-left', message: '⚠️ Rodilla izquierda colapsando hacia dentro', severity: 'error' });
    }
  }
  if (visible(rKnee) && visible(rAnkle) && visible(rHip)) {
    const kneeInward = rKnee.x < rAnkle.x - 0.04;
    if (kneeInward) {
      rules.push({ id: 'valgus-right', message: '⚠️ Rodilla derecha colapsando hacia dentro', severity: 'error' });
    }
  }

  // Torso lean (hip angle vs vertical)
  if (visible(lShoulder) && visible(lHip) && visible(lKnee)) {
    const torsoAngle = angleDeg(lShoulder, lHip, lKnee);
    if (torsoAngle < 40) {
      rules.push({ id: 'lean', message: '⚠️ Demasiada inclinación hacia adelante', severity: 'warning' });
    } else {
      rules.push({ id: 'lean', message: '✅ Torso erguido', severity: 'ok' });
    }
  }

  return rules;
}

function rulesPlank(lm: Landmarks): PoseRule[] {
  const rules: PoseRule[] = [];

  const lShoulder = lm[LM.LEFT_SHOULDER];
  const lHip = lm[LM.LEFT_HIP];
  const lAnkle = lm[LM.LEFT_ANKLE];

  if (visible(lShoulder) && visible(lHip) && visible(lAnkle)) {
    // Hip height relative to shoulder-ankle line
    const lineY = lShoulder.y + (lAnkle.y - lShoulder.y) * ((lHip.x - lShoulder.x) / (lAnkle.x - lShoulder.x + 0.0001));
    const hipDelta = lHip.y - lineY; // positive = hip dropping

    if (hipDelta > 0.06) {
      rules.push({ id: 'hip-drop', message: '⚠️ Cadera cayendo — activa el core', severity: 'error' });
    } else if (hipDelta < -0.06) {
      rules.push({ id: 'hip-high', message: '⚠️ Cadera demasiado alta', severity: 'warning' });
    } else {
      rules.push({ id: 'alignment', message: '✅ Alineación correcta', severity: 'ok' });
    }
  }

  return rules;
}

function rulesDeadlift(lm: Landmarks): PoseRule[] {
  const rules: PoseRule[] = [];

  const lShoulder = lm[LM.LEFT_SHOULDER];
  const lHip = lm[LM.LEFT_HIP];
  const lKnee = lm[LM.LEFT_KNEE];
  const lAnkle = lm[LM.LEFT_ANKLE];

  // Back angle (shoulder over hips when lifting)
  if (visible(lShoulder) && visible(lHip) && visible(lAnkle)) {
    const backAngle = angleDeg(lShoulder, lHip, lAnkle);
    if (backAngle < 150) {
      rules.push({ id: 'back-rounding', message: '⚠️ Espalda curvada — mantén columna neutra', severity: 'error' });
    } else {
      rules.push({ id: 'back-straight', message: '✅ Espalda recta', severity: 'ok' });
    }
  }

  // Hip hinge depth
  if (visible(lHip) && visible(lKnee) && visible(lShoulder)) {
    const hipAngle = angleDeg(lShoulder, lHip, lKnee);
    if (hipAngle > 160) {
      rules.push({ id: 'hinge', message: '⬇️ Lleva más las caderas hacia atrás', severity: 'warning' });
    } else {
      rules.push({ id: 'hinge', message: '✅ Bisagra de cadera correcta', severity: 'ok' });
    }
  }

  return rules;
}

function rulesLunge(lm: Landmarks): PoseRule[] {
  const rules: PoseRule[] = [];

  const lHip = lm[LM.LEFT_HIP], lKnee = lm[LM.LEFT_KNEE], lAnkle = lm[LM.LEFT_ANKLE];

  if (visible(lHip) && visible(lKnee) && visible(lAnkle)) {
    const kneeAngle = angleDeg(lHip, lKnee, lAnkle);
    if (lKnee.x > lAnkle.x + 0.05) {
      rules.push({ id: 'knee-forward', message: '⚠️ Rodilla adelantada al pie — retrocede más', severity: 'warning' });
    } else {
      rules.push({ id: 'knee-ok', message: '✅ Posición de rodilla correcta', severity: 'ok' });
    }
    if (kneeAngle > 130) {
      rules.push({ id: 'depth', message: '⬇️ Baja más la rodilla trasera', severity: 'warning' });
    }
  }

  return rules;
}

function rulesPushup(lm: Landmarks): PoseRule[] {
  const rules: PoseRule[] = [];

  const lShoulder = lm[LM.LEFT_SHOULDER];
  const lElbow = lm[LM.LEFT_ELBOW];
  const lHip = lm[LM.LEFT_HIP];
  const lAnkle = lm[LM.LEFT_ANKLE];

  // Elbow angle
  if (visible(lShoulder) && visible(lElbow)) {
    const elbowX = lElbow.x;
    const shoulderX = lShoulder.x;
    if (Math.abs(elbowX - shoulderX) > 0.15) {
      rules.push({ id: 'elbow-flare', message: '⚠️ Codos muy abiertos — mantén a 45°', severity: 'warning' });
    } else {
      rules.push({ id: 'elbow-ok', message: '✅ Posición de codos correcta', severity: 'ok' });
    }
  }

  // Body alignment
  if (visible(lShoulder) && visible(lHip) && visible(lAnkle)) {
    const bodyAngle = angleDeg(lShoulder, lHip, lAnkle);
    if (bodyAngle < 155) {
      rules.push({ id: 'body-line', message: '⚠️ Cuerpo no alineado — activa el core', severity: 'error' });
    } else {
      rules.push({ id: 'body-line', message: '✅ Línea corporal correcta', severity: 'ok' });
    }
  }

  return rules;
}

function getRules(exercise: PoseCoachExercise, lm: Landmarks): PoseRule[] {
  switch (exercise) {
    case 'squat': return rulesSquat(lm);
    case 'plank': return rulesPlank(lm);
    case 'deadlift': return rulesDeadlift(lm);
    case 'lunge': return rulesLunge(lm);
    case 'pushup': return rulesPushup(lm);
    default: return rulesSquat(lm); // best general rules
  }
}

// ── Load MediaPipe scripts dynamically ───────────────────────────────────────

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.crossOrigin = 'anonymous';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PoseCoach({ exercise = 'general', exerciseName, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<unknown>(null);
  const animFrameRef = useRef<number | null>(null);

  const [status, setStatus] = useState<'loading' | 'running' | 'error' | 'nocamera'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [feedback, setFeedback] = useState<PoseRule[]>([]);
  const [frameCount, setFrameCount] = useState(0);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  useEffect(() => {
    let cancelled = false;

    async function initPose() {
      try {
        // 1. Load MediaPipe Pose scripts from CDN
        await loadScript(`${DRAWING_BASE}/drawing_utils.js`);
        await loadScript(`${MEDIAPIPE_BASE}/pose.js`);

        if (cancelled) return;

        // 2. Camera access
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          });
        } catch {
          if (!cancelled) { setStatus('nocamera'); setErrorMsg('No se pudo acceder a la cámara. Permite el permiso e inténtalo de nuevo.'); }
          return;
        }

        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;

        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        // 3. Init MediaPipe Pose
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const PoseClass = (window as any).Pose;
        if (!PoseClass) throw new Error('MediaPipe Pose no se cargó correctamente.');

        const pose = new PoseClass({
          locateFile: (file: string) => `${MEDIAPIPE_BASE}/${file}`,
        });
        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pose.onResults((results: any) => {
          if (cancelled) return;
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

          if (results.poseLandmarks) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { drawConnectors, drawLandmarks, POSE_CONNECTIONS } = window as any;
            if (drawConnectors) {
              drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00e5ff', lineWidth: 2 });
            }
            if (drawLandmarks) {
              drawLandmarks(ctx, results.poseLandmarks, { color: '#ff0080', lineWidth: 1, radius: 3 });
            }

            const rules = getRules(exercise, results.poseLandmarks as Landmarks);
            setFeedback(rules);
            setFrameCount((c) => c + 1);
          }
        });

        poseRef.current = pose;

        // 4. Frame loop
        async function frame() {
          if (cancelled || !videoRef.current || videoRef.current.readyState < 2) {
            animFrameRef.current = requestAnimationFrame(frame);
            return;
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (poseRef.current as any).send({ image: videoRef.current });
          animFrameRef.current = requestAnimationFrame(frame);
        }

        if (!cancelled) {
          setStatus('running');
          animFrameRef.current = requestAnimationFrame(frame);
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setErrorMsg(err instanceof Error ? err.message : 'Error desconocido al cargar PoseCoach.');
        }
      }
    }

    void initPose();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [exercise, stopCamera]);

  const errors = feedback.filter((r) => r.severity === 'error');
  const warnings = feedback.filter((r) => r.severity === 'warning');
  const oks = feedback.filter((r) => r.severity === 'ok');
  const hasIssues = errors.length + warnings.length > 0;

  return (
    <div className="fixed inset-0 z-[80] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-b border-white/10 shrink-0">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500">🎥 PoseCoach</p>
          <p className="text-sm font-bold text-white">{exerciseName ?? 'Análisis de postura'}</p>
        </div>
        <div className="flex items-center gap-3">
          {status === 'running' && (
            <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
              hasIssues ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${hasIssues ? 'bg-red-400' : 'bg-emerald-400'} animate-pulse`} />
              {hasIssues ? 'Correcciones' : 'Postura OK'}
            </span>
          )}
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label="Cerrar PoseCoach"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Video / Canvas area */}
      <div className="relative flex-1 min-h-0 bg-black overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover opacity-0"
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Overlay states */}
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black">
            <div className="w-12 h-12 border-2 border-[color:var(--app-accent)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Cargando MediaPipe Pose…</p>
            <p className="text-xs text-gray-600">Puede tardar unos segundos la primera vez</p>
          </div>
        )}
        {(status === 'error' || status === 'nocamera') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black px-8 text-center">
            {status === 'nocamera' ? <CameraOff size={40} className="text-gray-500" /> : <AlertTriangle size={40} className="text-red-400" />}
            <p className="text-sm text-gray-300">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Feedback panel */}
      <div className="shrink-0 bg-black/90 backdrop-blur-md border-t border-white/10 px-4 py-3 max-h-[35vh] overflow-y-auto">
        {status === 'running' && feedback.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-2">Posiciónate delante de la cámara para ver el análisis…</p>
        )}
        <AnimatePresence>
          {errors.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 p-2.5 mb-2 rounded-xl bg-red-500/15 border border-red-500/30"
            >
              <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <span className="text-sm text-red-300">{r.message}</span>
            </motion.div>
          ))}
          {warnings.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 p-2.5 mb-2 rounded-xl bg-yellow-500/15 border border-yellow-500/30"
            >
              <AlertTriangle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
              <span className="text-sm text-yellow-300">{r.message}</span>
            </motion.div>
          ))}
          {oks.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 p-2 mb-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
            >
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-xs text-emerald-300">{r.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {status === 'running' && frameCount > 0 && (
          <p className="text-[10px] text-gray-700 text-right mt-1">MediaPipe Pose · frame #{frameCount}</p>
        )}
      </div>
    </div>
  );
}
