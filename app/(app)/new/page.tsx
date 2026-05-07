import NewRequestForm from "@/components/NewRequestForm";

export default function NewRequestPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[17px] font-semibold text-foreground">New Request</h1>
        <p className="text-sm text-muted mt-0.5">Submit a bug report or feature request to the Nerdshouse team.</p>
      </div>
      <NewRequestForm />
    </div>
  );
}
