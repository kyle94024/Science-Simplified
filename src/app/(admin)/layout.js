export default function AdminLayout({ children }) {
    return (
        <div className="min-h-screen flex bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r shadow-sm hidden md:block">
                <div className="p-6 text-xl font-bold">Admin Panel</div>

                <nav className="px-4 space-y-2">
                    <a
                        href="/magic-links"
                        className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-200"
                    >
                        Magic Links
                    </a>

                    <a
                        href="/admin/clinical-trials"
                        className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-200"
                    >
                        Clinical Trials
                    </a>

                    <a
                        href="/admin/users"
                        className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-200"
                    >
                        Users (future)
                    </a>

                    <a
                        href="/admin/settings"
                        className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-200"
                    >
                        Settings (future)
                    </a>
                </nav>
            </aside>

            {/* Main content */}
            <main className="flex-1 p-6">{children}</main>
        </div>
    );
}
