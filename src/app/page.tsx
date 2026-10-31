import { UploadCard } from "@/components/upload/upload-card";

export default function Home() {
  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Share files, simply.
        </h1>
        <p className="text-muted-foreground">
          Share files up to 50 MB. No sign-up. Links expire automatically.
        </p>
      </div>
      <UploadCard />
    </div>
  );
}
