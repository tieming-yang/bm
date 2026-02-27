type YouTubePlayerProps = {
  src: string;
  title: string;
};
export function YoutubePlayer({ src, title }: YouTubePlayerProps) {
  if (!src) return null;
  const youtubeUrl = new URL(src);
  const id = youtubeUrl.pathname.split("/").at(2);
  const withLoop = src + `?autoplay=1&loop=1&playlist=${id}`;

  return (
    <iframe
      className="aspect-video"
      src={withLoop}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  );
}
