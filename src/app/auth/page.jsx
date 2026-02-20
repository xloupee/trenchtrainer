import AuthRouteClient from "../../components/auth/AuthRouteClient";

export default async function AuthPage({ searchParams }) {
  const params = await searchParams;
  const rawNext = Array.isArray(params?.next) ? params.next[0] : params?.next || "/play/solo";
  return <AuthRouteClient initialNext={rawNext} />;
}
