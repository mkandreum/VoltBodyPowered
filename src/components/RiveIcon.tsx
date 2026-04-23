import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';

interface RiveIconProps {
  /** Path to the .riv animation file (e.g. "/animations/bolt.riv") */
  src: string;
  /** Name of the Rive state machine to run */
  stateMachine?: string;
  className?: string;
  width?: number;
  height?: number;
  /** Rendered when the .riv file is missing or fails to load */
  fallback: React.ReactNode;
}

/**
 * Renders a Rive vector animation with an automatic fallback.
 *
 * Usage:
 *   <RiveIcon src="/animations/bolt.riv" stateMachine="BoltState" width={24} height={24} fallback={<Zap />} />
 *
 * Place .riv files in the /public/animations/ directory.
 * When the file is absent the `fallback` prop is shown instead.
 */
export default function RiveIcon({
  src,
  stateMachine,
  className,
  width = 32,
  height = 32,
  fallback,
}: RiveIconProps) {
  const { RiveComponent, rive } = useRive({
    src,
    stateMachines: stateMachine ? [stateMachine] : undefined,
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  });

  if (!rive) return <>{fallback}</>;

  return (
    <RiveComponent
      className={className}
      style={{ width, height, display: 'inline-block' }}
      aria-hidden
    />
  );
}
