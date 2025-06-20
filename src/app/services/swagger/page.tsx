export default function SwaggerServicePage() {
  return (
    <div className="w-full h-screen">
      <iframe
        src={process.env.CORE_API_SWAGGER_URL}
        className="w-full h-screen"
      />
    </div>
  );
}
