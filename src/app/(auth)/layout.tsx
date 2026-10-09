import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-10 sm:items-center sm:justify-center">
      <div className="w-full sm:max-w-sm">
        <Logo />
        <div className="mt-12">{children}</div>
      </div>
    </div>
  );
}
