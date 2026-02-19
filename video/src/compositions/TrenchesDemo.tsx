import React from 'react';
import { Sequence } from 'remotion';
import { BrandStamp }  from '../scenes/BrandStamp';
import { GameUI }      from '../scenes/GameUI';
import { SignalFlash } from '../scenes/SignalFlash';
import { TxClick }     from '../scenes/TxClick';
import { ComboBurst }  from '../scenes/ComboBurst';
import { RankReveal }  from '../scenes/RankReveal';
import { CTA }         from '../scenes/CTA';

//
// Scene timing (60fps, 1650 frames total = 27.5 seconds)
//
// | Scene       | Start | End  | Frames | Duration |
// |-------------|-------|------|--------|----------|
// | BrandStamp  |    0  |  150 |   150  |  2.5s    |
// | GameUI      |  150  |  570 |   420  |  7.0s    |
// | SignalFlash |  570  |  810 |   240  |  4.0s    |
// | TxClick     |  810  |  990 |   180  |  3.0s    |
// | ComboBurst  |  990  | 1230 |   240  |  4.0s    |
// | RankReveal  | 1230  | 1410 |   180  |  3.0s    |
// | CTA         | 1410  | 1650 |   240  |  4.0s    |

export const TrenchesDemo: React.FC = () => {
  return (
    <>
      <Sequence from={0}    durationInFrames={150}>
        <BrandStamp />
      </Sequence>

      <Sequence from={150}  durationInFrames={420}>
        <GameUI />
      </Sequence>

      <Sequence from={570}  durationInFrames={240}>
        <SignalFlash />
      </Sequence>

      <Sequence from={810}  durationInFrames={180}>
        <TxClick />
      </Sequence>

      <Sequence from={990}  durationInFrames={240}>
        <ComboBurst />
      </Sequence>

      <Sequence from={1230} durationInFrames={180}>
        <RankReveal />
      </Sequence>

      <Sequence from={1410} durationInFrames={240}>
        <CTA />
      </Sequence>
    </>
  );
};
