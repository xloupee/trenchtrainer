import TrenchesTrainer from "../../../components/TrenchesTrainer";

export default async function DuelPage({ searchParams }) {
  const params = await searchParams;
  const rawCode = Array.isArray(params?.code) ? params.code[0] : params?.code || "";
  return <TrenchesTrainer initialDuelCode={rawCode} />;
}
