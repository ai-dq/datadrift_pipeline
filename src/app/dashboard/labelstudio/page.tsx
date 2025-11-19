export default function LabelStudioPage() {
  return (
    <div className="w-full h-screen">
      <iframe src={process.env.LABEL_STUDIO_URL} className="w-full h-screen" />
    </div>
  );
}
