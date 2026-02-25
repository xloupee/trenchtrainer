import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { ScopeFirstAimIntro } from '../scenes/ScopeFirstAimIntro';
import { SoloPracticeTransition } from '../scenes/SoloPracticeTransition';
import { SoloModeClip } from '../scenes/SoloModeClip';
import { GameplayClip } from '../scenes/GameplayClip';
import { LevelUpRanksKinetic } from '../scenes/LevelUpRanksKinetic';
import { OutroNowLive } from '../scenes/OutroNowLive';
import { C } from '../lib/colors';
import {
  SCENE4_DURATION_FRAMES,
  SCENE5_DURATION_FRAMES,
  SCENE6_DURATION_FRAMES,
  SCENE2_DURATION_FRAMES,
  SCENE2_START_FRAME,
  SCENE3_DURATION_FRAMES,
  S4_S5_CRASH_FRAMES,
  S3_S4_WIPE_FRAMES,
  S2_S3_WIPE_FRAMES,
} from '../lib/sceneTransitions';

//
// Scene timing (60fps, 1142 frames total = 19.03 seconds)
//
// | Scene               | Start | End  | Frames | Duration |
// |---------------------|-------|------|--------|----------|
// | ScopeFirstAimIntro  |    0  |   73 |    73  |  1.22s   |
// | SoloModeClip        |  73   | 175  |   102  |  1.7s    |
// | SoloPracticeTransition |161 | 264  |   103  |  1.72s   |
// | GameplayClip        | 252   | 800  |   548  |  9.13s   |
// | LevelUpRanksKinetic | 786   | 1022 |   236  |  3.93s   |
// | OutroNowLive        | 1022  | 1142 |   120  |  2.0s    |

export const TrenchesDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const scene1Start = 0;
  const scene2Start = SCENE2_START_FRAME;
  const scene1Duration = scene2Start;
  const scene2End = scene2Start + SCENE2_DURATION_FRAMES;
  const wipe23Start = scene2End - S2_S3_WIPE_FRAMES;
  const scene3Start = wipe23Start;
  const scene3End = scene3Start + SCENE3_DURATION_FRAMES;
  const wipe34Start = scene3End - S3_S4_WIPE_FRAMES;
  const scene4Start = wipe34Start;
  const scene4End = scene4Start + SCENE4_DURATION_FRAMES;
  const crash45Start = scene4End - S4_S5_CRASH_FRAMES;
  const scene5Start = crash45Start;
  const scene5End = scene5Start + SCENE5_DURATION_FRAMES;
  const scene6Start = scene5End;
  const scene6End = scene6Start + SCENE6_DURATION_FRAMES;
  const hasWipe23 = S2_S3_WIPE_FRAMES > 0;
  const hasWipe34 = S3_S4_WIPE_FRAMES > 0;
  const hasCrash45 = S4_S5_CRASH_FRAMES > 0;

  const wipe23Progress = hasWipe23
    ? interpolate(frame, [wipe23Start, scene2End], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;
  const panelProgress = hasWipe34
    ? interpolate(frame, [wipe34Start, scene3End], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const panelEase = hasWipe34
    ? interpolate(panelProgress, [0, 0.28, 1], [0, 0.62, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const panelScale = hasWipe34
    ? interpolate(panelEase, [0, 1], [1, 0.72], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;
  const panelLift = hasWipe34
    ? interpolate(panelEase, [0, 1], [0, -52], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const sideSpread = hasWipe34
    ? interpolate(panelEase, [0, 1], [0, 185], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const centerLift = hasWipe34
    ? interpolate(panelEase, [0, 1], [0, -24], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const panelBlur = hasWipe34
    ? interpolate(panelEase, [0, 1], [0, 1.2], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const scene4InScale = hasWipe34
    ? interpolate(panelEase, [0, 1], [1.03, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;
  const scene4InY = hasWipe34
    ? interpolate(panelEase, [0, 1], [12, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const crash45Progress = hasCrash45
    ? interpolate(frame, [crash45Start, scene4End], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const scene4CrashScale = hasCrash45
    ? interpolate(crash45Progress, [0, 1], [1, 1.22], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;
  const scene4CrashBlur = hasCrash45
    ? interpolate(crash45Progress, [0, 1], [0, 6], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const scene4CrashOpacity = hasCrash45
    ? interpolate(crash45Progress, [0, 1], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;
  const scene5InScale = hasCrash45
    ? interpolate(crash45Progress, [0, 1], [0.86, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;
  const scene5InY = hasCrash45
    ? interpolate(crash45Progress, [0, 1], [18, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;
  const scene5InOpacity = hasCrash45
    ? interpolate(crash45Progress, [0, 1], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;
  const scene2ClipPath =
    hasWipe23
      ? frame < wipe23Start
        ? 'inset(0 0 0 0)'
        : `inset(0 0 0 ${wipe23Progress * 100}%)`
      : 'inset(0 0 0 0)';
  const scene3ClipPath = (() => {
    if (hasWipe23) {
      if (frame < wipe23Start) return 'inset(0 100% 0 0)';
      if (frame <= scene2End) return `inset(0 ${(1 - wipe23Progress) * 100}% 0 0)`;
    }
    return 'inset(0 0 0 0)';
  })();
  const scene4ClipPath = 'inset(0 0 0 0)';

  return (
    <>
      <AbsoluteFill style={{ background: C.bg }} />
      <Audio
        src={staticFile('groove-sauce-stan-town-main-version-40277-01-56.mp3')}
        volume={(f) =>
          0.7 *
          interpolate(f, [0, 11, 64, 122, 174, 213, 261, 308, 686, 800, 906, scene6End], [0, 0.82, 0.85, 0.9, 0.88, 0.86, 0.82, 0.72, 0.7, 0.62, 0.55, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        }
      />
      <Sequence from={scene1Start} durationInFrames={scene1Duration}>
        <ScopeFirstAimIntro />
      </Sequence>
      <Sequence from={scene2Start} durationInFrames={SCENE2_DURATION_FRAMES}>
        <AbsoluteFill style={{ clipPath: scene2ClipPath }}>
          <SoloModeClip />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={scene3Start} durationInFrames={SCENE3_DURATION_FRAMES}>
        <AbsoluteFill style={{ clipPath: scene3ClipPath }}>
          {hasWipe34 ? (
            <>
              <AbsoluteFill
                style={{
                  clipPath: 'inset(0 66.4% 0 0)',
                  transform: `translateX(${-sideSpread}px) translateY(${panelLift}px) scale(${panelScale})`,
                  filter: `blur(${panelBlur}px)`,
                }}
              >
                <SoloPracticeTransition />
              </AbsoluteFill>
              <AbsoluteFill
                style={{
                  clipPath: 'inset(0 33.2% 0 33.2%)',
                  transform: `translateY(${panelLift + centerLift}px) scale(${panelScale})`,
                  filter: `blur(${panelBlur}px)`,
                }}
              >
                <SoloPracticeTransition />
              </AbsoluteFill>
              <AbsoluteFill
                style={{
                  clipPath: 'inset(0 0 0 66.4%)',
                  transform: `translateX(${sideSpread}px) translateY(${panelLift}px) scale(${panelScale})`,
                  filter: `blur(${panelBlur}px)`,
                }}
              >
                <SoloPracticeTransition />
              </AbsoluteFill>
            </>
          ) : (
            <SoloPracticeTransition />
          )}
        </AbsoluteFill>
      </Sequence>
      <Sequence from={scene4Start} durationInFrames={SCENE4_DURATION_FRAMES}>
        <AbsoluteFill
          style={{
            clipPath: scene4ClipPath,
            transform: `translateY(${scene4InY}px) scale(${scene4InScale * scene4CrashScale})`,
            filter: `blur(${scene4CrashBlur}px)`,
            opacity: scene4CrashOpacity,
          }}
        >
          <GameplayClip />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={scene5Start} durationInFrames={SCENE5_DURATION_FRAMES}>
        <AbsoluteFill
          style={{
            transform: `translateY(${scene5InY}px) scale(${scene5InScale})`,
            opacity: scene5InOpacity,
          }}
        >
          <LevelUpRanksKinetic />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={scene6Start} durationInFrames={SCENE6_DURATION_FRAMES}>
        <OutroNowLive />
      </Sequence>
      {hasWipe23 && frame >= wipe23Start && frame <= scene2End ? (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 126,
              left: `calc(${wipe23Progress * 100}% - 63px)`,
              background:
                'linear-gradient(90deg, rgba(6,9,17,0) 0%, rgba(6,9,17,0.62) 24%, rgba(6,9,17,0.88) 50%, rgba(6,9,17,0.62) 76%, rgba(6,9,17,0) 100%)',
              filter: 'blur(0.6px)',
              opacity: 0.92,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 20,
              left: `calc(${wipe23Progress * 100}% - 9px)`,
              background:
                'linear-gradient(180deg, transparent 0%, rgba(74,222,128,0.65) 12%, rgba(74,222,128,0.75) 50%, rgba(74,222,128,0.65) 88%, transparent 100%)',
              filter: 'blur(1.5px)',
              opacity: 0.9,
            }}
          />
        </AbsoluteFill>
      ) : null}
    </>
  );
};
