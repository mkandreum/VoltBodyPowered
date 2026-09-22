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
 *  - Apple HIG & mobile-app-ui-design ergonomics (44pt touch targets, iOS spring bottom sheet)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CameraOff, AlertTriangle, CheckCircle2 } from 'lucide-react';

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
    const kneeInward = lKnee.x > lAnkle.x + 0.04;
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
    const lineY = lShoulder.y + (lAnkle.y - lShoulder.y) * ((lHip.x - lShoulder.x) / (lAnkle.x - lShoulder.x + 0.0001));
    const hipDelta = lHip.y - lineY;

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

  if (visible(lShoulder) && visible(lHip) && visible(lAnkle)) {
    const backAngle = angleDeg(lShoulder, lHip, lAnkle);
    if (backAngle < 150) {
      rules.push({ id: 'back-rounding', message: '⚠️ Espalda curvada — mantén columna neutra', severity: 'error' });
    } else {
      rules.push({ id: 'back-straight', message: '✅ Espalda recta', severity: 'ok' });
    }
  }

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

  if (visible(lShoulder) && visible(lElbow)) {
    const elbowX = lElbow.x;
    const shoulderX = lShoulder.x;
    if (Math.abs(elbowX - shoulderX) > 0.15) {
      rules.push({ id: 'elbow-flare', message: '⚠️ Codos muy abiertos — mantén a 45°', severity: 'warning' });
    } else {
      rules.push({ id: 'elbow-ok', message: '✅ Posición de codos correcta', severity: 'ok' });
    }
  }

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
    default: return rulesSquat(lm);
  }
}

// ── MediaPipe API surface types ──────────────────────────────────────────────
type MPPoseOptions = {
  locateFile: (file: string) => string;
};
type MPPoseConfig = {
  modelComplexity?: 0 | 1 | 2;
  smoothLandmarks?: boolean;
  enableSegmentation?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
};
type MPPoseResults = {
  image: HTMLVideoElement | HTMLCanvasElement | ImageBitmap;
  poseLandmarks?: Vec2[];
};
type MPPoseInstance = {
  setOptions(config: MPPoseConfig): void;
  onResults(callback: (results: MPPoseResults) => void): void;
  send(input: { image: HTMLVideoElement }): Promise<void>;
};
type MPPoseConstructor = new (options: MPPoseOptions) => MPPoseInstance;
type MPWindow = {
  Pose?: MPPoseConstructor;
  drawConnectors?: (ctx: CanvasRenderingContext2D, landmarks: Vec2[], connections: unknown, style: { color: string; lineWidth: number }) => void;
  drawLandmarks?: (ctx: CanvasRenderingContext2D, landmarks: Vec2[], style: { color: string; lineWidth: number; radius: number }) => void;
  POSE_CONNECTIONS?: unknown;
};

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
  const poseRef = useRef<MPPoseInstance | null>(null);
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
        await loadScript(`${DRAWING_BASE}/drawing_utils.js`);
        await loadScript(`${MEDIAPIPE_BASE}/pose.js`);

        if (cancelled) return;

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          });
        } catch {
          if (!cancelled) {
            setStatus('nocamera');
            setErrorMsg('No se pudo acceder a la cámara. Permite el permiso en tu navegador e inténtalo de nuevo.');
          }
          return;
        }

        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;

        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        const PoseClass = (window as unknown as MPWindow).Pose;
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

        pose.onResults((results: MPPoseResults) => {
          if (cancelled) return;
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(results.image as HTMLVideoElement, 0, 0, canvas.width, canvas.height);

          if (results.poseLandmarks) {
            const mpWin = window as unknown as MPWindow;
            if (mpWin.drawConnectors && mpWin.POSE_CONNECTIONS) {
              mpWin.drawConnectors(ctx, results.poseLandmarks, mpWin.POSE_CONNECTIONS, { color: '#00e5ff', lineWidth: 2 });
            }
            if (mpWin.drawLandmarks) {
              mpWin.drawLandmarks(ctx, results.poseLandmarks, { color: '#ff0080', lineWidth: 1, radius: 3 });
            }

            const rules = getRules(exercise, results.poseLandmarks as Landmarks);
            setFeedback(rules);
            setFrameCount((c) => c + 1);
          }
        });

        poseRef.current = pose;

        async function frame() {
          if (cancelled || !videoRef.current || videoRef.current.readyState < 2) {
            animFrameRef.current = requestAnimationFrame(frame);
            return;
          }
          await poseRef.current!.send({ image: videoRef.current });
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
      {/* Apple HIG Header with minimum 44pt tap target */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-xl border-b border-white/10 shrink-0 safe-top">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">🎥 POSECOACH IA</p>
          <p className="text-sm font-bold text-white truncate max-w-[200px]">{exerciseName ?? 'Análisis de postura'}</p>
        </div>
        <div className="flex items-center gap-3">
          {status === 'running' && (
            <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
              hasIssues
                ? 'bg-red-500/20 text-red-300 border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
            }`}>
              <span className={`w-2 h-2 rounded-full ${hasIssues ? 'bg-red-400' : 'bg-emerald-400'} animate-ping`} />
              {hasIssues ? 'Atención' : 'Postura Correcta'}
            </span>
          )}
          <button
            type="button"
            onClick={handleClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all touch-manipulation"
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
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 backdrop-blur-md px-6 text-center">
            <div className="w-12 h-12 border-3 border-[color:var(--app-accent)] border-t-transparent rounded-full animate-spin" />
            <div>
              <p className="text-sm font-bold text-white">Iniciando MediaPipe Pose…</p>
              <p className="text-xs text-gray-400 mt-1">Cargando modelos neuronales en tu dispositivo</p>
            </div>
          </div>
        )}
        {(status === 'error' || status === 'nocamera') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/95 px-8 text-center">
            {status === 'nocamera' ? (
              <CameraOff size={44} className="text-gray-400" />
            ) : (
              <AlertTriangle size={44} className="text-red-400" />
            )}
            <p className="text-sm font-semibold text-gray-200 max-w-sm">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* iOS Style Feedback Bottom Sheet */}
      <div className="shrink-0 bg-black/90 backdrop-blur-2xl border-t border-white/10 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[38vh] overflow-y-auto">
        <div className="w-10 h-1 rounded-full bg-white/25 mx-auto mb-3" />

        {status === 'running' && feedback.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-3 font-mono">
            Posiciónate de cuerpo entero frente a la cámara…
          </p>
        )}

        <div className="space-y-2">
          <AnimatePresence>
            {errors.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3 p-3 rounded-2xl bg-red-500/15 border border-red-500/30"
              >
                <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-red-200">{r.message}</span>
              </motion.div>
            ))}
            {warnings.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30"
              >
                <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-amber-200">{r.message}</span>
              </motion.div>
            ))}
            {oks.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3 p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25"
              >
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-xs font-medium text-emerald-200">{r.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {status === 'running' && frameCount > 0 && (
          <p className="text-[10px] text-gray-500 font-mono text-right mt-2 tabular-nums">
            MediaPipe Pose · frame #{frameCount}
          </p>
        )}
      </div>
    </div>
  );
}
