import Link from "next/link";
import { SearchXIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <SearchXIcon className="size-8 text-muted-foreground" aria-hidden />
      <div>
        <h1 className="text-lg font-medium">Page not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The page you are looking for does not exist.
        </p>
      </div>
      <Link href="/" className={buttonVariants()}>
        Back to AeroShare
      </Link>
    </div>
  );
}
