import { notFound } from "next/navigation";

import { PublicConsentView } from "@/components/consent/public-consent-view";
import { dataApiClient } from "@/lib/data-api-client";

type Props = { params: Promise<{ token: string }> };

/**
 * Public consent management page — no OAuth required.
 * The token validates via /public/consent/{token} on the data-api.
 * If invalid/expired/revoked: 404.
 */
export default async function ConsentPage({ params }: Props) {
  const { token } = await params;

  let data;
  try {
    const res = await dataApiClient.raw(`/public/consent/${token}`, {
      op: "consent_validate_ssr",
    });
    if (!res.ok) notFound();
    data = await res.json();
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <PublicConsentView token={token} initialData={data} />
    </div>
  );
}
