import DisplayClient from "@/components/display/DisplayClient";

type PageProps = {
  searchParams?: Promise<{
    session?: string;
  }>;
};

export default async function DisplayPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const sessionId = resolvedSearchParams.session ?? "";

  return <DisplayClient sessionId={sessionId} />;
}