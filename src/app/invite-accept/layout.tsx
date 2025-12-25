export default function InviteAcceptLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Standalone layout - no navbar, no app shell
    return <>{children}</>;
}
