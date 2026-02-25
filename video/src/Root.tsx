import React from 'react';
import { Composition } from 'remotion';
import { TrenchesDemo } from './compositions/TrenchesDemo';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="TrenchesDemo"
        component={TrenchesDemo}
        durationInFrames={1142}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};
