import { PlaybackQueueProvider } from "./components/playback-queue";

export default function MusicLayout({ children }: React.PropsWithChildren) {
  return <PlaybackQueueProvider>{children}</PlaybackQueueProvider>;
}
