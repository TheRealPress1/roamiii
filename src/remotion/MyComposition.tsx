import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

export const MyComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const scale = spring({
    frame,
    fps,
    config: {
      damping: 200,
    },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          fontSize: 80,
          fontWeight: 'bold',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Roamiii
      </div>
    </AbsoluteFill>
  );
};
