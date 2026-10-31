import type { Metadata } from "next";
import { Suspense } from "react";

import { DownloadCard, LoadingCard } from "@/components/download/download-card";

export const metadata: Metadata = {
  title: "Download file - AeroShare",
  description: "Download a file shared with AeroShare.",
  robots: { index: false },
};

async function ShareContent({ params }: { params: PageProps<"/s/[code]">["params"] }) {
  const { code } = await params;
  return <DownloadCard code={code} />;
}

export default function SharePage({ params }: PageProps<"/s/[code]">) {
  return (
    <Suspense fallback={<LoadingCard />}>
      <ShareContent params={params} />
    </Suspense>
  );
}
