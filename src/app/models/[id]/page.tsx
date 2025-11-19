export default async function ModelVersionPage({
  params,
}: {
  params: { id: string };
}) {
  return <div>Model ID: {params.id}</div>;
}
