/** Every legal page shares one dark shell, so they read as one set of documents. */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#0A0A0C] text-white">
            <main id="main">{children}</main>
        </div>
    );
}
