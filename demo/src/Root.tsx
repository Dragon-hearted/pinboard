import React from "react";
import { Composition, AbsoluteFill } from "remotion";
import { Main } from "./Main";
import { TitleScene } from "./scenes/TitleScene";
import { UploadScene } from "./scenes/UploadScene";
import { TaggingScene } from "./scenes/TaggingScene";
import { MultiModelScene } from "./scenes/MultiModelScene";
import { GenerationScene } from "./scenes/GenerationScene";
import { HistoryScene } from "./scenes/HistoryScene";
import { ClosingScene } from "./scenes/ClosingScene";
import { COLORS } from "./theme";

const SceneWrapper: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{backgroundColor: COLORS.bgDeepest}}>{children}</AbsoluteFill>
);

export const RemotionRoot = () => {
  return (
    <>
      <Composition id="Main" component={Main} durationInFrames={1200} fps={30} width={1920} height={1080} />
      <Composition id="TitleScene" component={() => <SceneWrapper><TitleScene /></SceneWrapper>} durationInFrames={150} fps={30} width={1920} height={1080} />
      <Composition id="UploadScene" component={() => <SceneWrapper><UploadScene /></SceneWrapper>} durationInFrames={180} fps={30} width={1920} height={1080} />
      <Composition id="TaggingScene" component={() => <SceneWrapper><TaggingScene /></SceneWrapper>} durationInFrames={180} fps={30} width={1920} height={1080} />
      <Composition id="MultiModelScene" component={() => <SceneWrapper><MultiModelScene /></SceneWrapper>} durationInFrames={180} fps={30} width={1920} height={1080} />
      <Composition id="GenerationScene" component={() => <SceneWrapper><GenerationScene /></SceneWrapper>} durationInFrames={180} fps={30} width={1920} height={1080} />
      <Composition id="HistoryScene" component={() => <SceneWrapper><HistoryScene /></SceneWrapper>} durationInFrames={150} fps={30} width={1920} height={1080} />
      <Composition id="ClosingScene" component={() => <SceneWrapper><ClosingScene /></SceneWrapper>} durationInFrames={180} fps={30} width={1920} height={1080} />
    </>
  );
};
