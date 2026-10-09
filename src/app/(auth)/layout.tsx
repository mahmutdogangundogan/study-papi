import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col px-4 py-6 sm:items-center sm:justify-center">
      <div className="w-full sm:max-w-sm">
        <Logo />
        <div className="mt-10">{children}</div>
      </div>
    </div>
  );
}
