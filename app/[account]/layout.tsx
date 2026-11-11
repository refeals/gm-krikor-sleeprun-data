// Shared container. Each page below validates the account itself.
export default function AccountLayout({ children }: LayoutProps<"/[account]">) {
  return <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6">{children}</div>
}
