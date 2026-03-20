import { AbsoluteFill, Sequence } from "remotion";
import { TitleScene } from "./scenes/TitleScene";
import { UploadScene } from "./scenes/UploadScene";
import { TaggingScene } from "./scenes/TaggingScene";
import { MultiModelScene } from "./scenes/MultiModelScene";
import { GenerationScene } from "./scenes/GenerationScene";
import { HistoryScene } from "./scenes/HistoryScene";
import { ClosingScene } from "./scenes/ClosingScene";
import { COLORS } from "./theme";

export const Main = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgDeepest }}>
      <Sequence from={0} durationInFrames={150} premountFor={30}>
        <TitleScene />
      </Sequence>
      <Sequence from={150} durationInFrames={180} premountFor={30}>
        <UploadScene />
      </Sequence>
      <Sequence from={330} durationInFrames={180} premountFor={30}>
        <TaggingScene />
      </Sequence>
      <Sequence from={510} durationInFrames={180} premountFor={30}>
        <MultiModelScene />
      </Sequence>
      <Sequence from={690} durationInFrames={180} premountFor={30}>
        <GenerationScene />
      </Sequence>
      <Sequence from={870} durationInFrames={150} premountFor={30}>
        <HistoryScene />
      </Sequence>
      <Sequence from={1020} durationInFrames={180} premountFor={30}>
        <ClosingScene />
      </Sequence>
    </AbsoluteFill>
  );
};
