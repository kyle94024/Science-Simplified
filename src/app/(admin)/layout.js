"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    PlusCircle,
    Clock,
    Users,
    Star,
    UserPlus,
    Link2,
    Beaker,
    RefreshCw,
    ChevronDown,
    ChevronRight,
    Menu,
    X,
    LayoutDashboard,
    Settings,
} from "lucide-react";

const navigationGroups = [
    {
        label: "Content",
        items: [
            { href: "/add-article", label: "Add Article", icon: PlusCircle },
            { href: "/pending-articles", label: "Pending Articles", icon: Clock },
            { href: "/assign-articles", label: "Assign Articles", icon: Users },
            { href: "/featured", label: "Featured", icon: Star },
        ],
    },
    {
        label: "Management",
        items: [
            { href: "/create-editor", label: "Create Editor", icon: UserPlus },
            { href: "/magic-links", label: "Magic Links", icon: Link2 },
        ],
    },
    {
        label: "Clinical Trials",
        items: [
            { href: "/admin/clinical-trials", label: "Trials List", icon: Beaker },
            { href: "/admin/sync", label: "Sync Trials", icon: RefreshCw },
        ],
    },
];

function NavItem({ item, isActive }) {
    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            className={`
                flex items-center gap-3 px-4 py-3 rounded-lg text-[1.4rem] font-medium
                transition-all duration-150
                ${
                    isActive
                        ? "bg-[rgba(76,177,159,0.1)] text-[#4cb19f]"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }
            `}
        >
            <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
            <span>{item.label}</span>
        </Link>
    );
}

function NavGroup({ group, pathname, isCollapsed, onToggle }) {
    const hasActiveItem = group.items.some((item) =>
        pathname.startsWith(item.href)
    );

    return (
        <div className="mb-2">
            <button
                onClick={onToggle}
                className="
                    w-full flex items-center justify-between px-4 py-2
                    text-[1.2rem] font-semibold text-gray-400 uppercase tracking-wider
                    hover:text-gray-600 transition-colors
                "
            >
                <span>{group.label}</span>
                {isCollapsed ? (
                    <ChevronRight size={14} />
                ) : (
                    <ChevronDown size={14} />
                )}
            </button>
            {!isCollapsed && (
                <div className="mt-1 space-y-1">
                    {group.items.map((item) => (
                        <NavItem
                            key={item.href}
                            item={item}
                            isActive={pathname.startsWith(item.href)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function AdminLayout({ children }) {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState({});

    const toggleGroup = (label) => {
        setCollapsedGroups((prev) => ({
            ...prev,
            [label]: !prev[label],
        }));
    };

    const SidebarContent = () => (
        <>
            {/* Logo/Title */}
            <div className="p-6 border-b border-gray-100">
                <Link href="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#4cb19f] rounded-lg flex items-center justify-center">
                        <LayoutDashboard size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-[1.6rem] font-bold text-gray-900">
                            Admin Panel
                        </h1>
                        <p className="text-[1.1rem] text-gray-500">
                            Science Simplified
                        </p>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 overflow-y-auto">
                {navigationGroups.map((group) => (
                    <NavGroup
                        key={group.label}
                        group={group}
                        pathname={pathname}
                        isCollapsed={collapsedGroups[group.label]}
                        onToggle={() => toggleGroup(group.label)}
                    />
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100">
                <Link
                    href="/"
                    className="
                        flex items-center gap-3 px-4 py-3 rounded-lg
                        text-[1.4rem] text-gray-500 hover:bg-gray-100 hover:text-gray-700
                        transition-colors
                    "
                >
                    <Settings size={18} />
                    <span>Back to Site</span>
                </Link>
            </div>
        </>
    );

    return (
        <div className="min-h-screen flex bg-gray-50">
            {/* Desktop Sidebar */}
            <aside className="w-72 bg-white border-r border-gray-200 hidden lg:flex flex-col fixed h-screen">
                <SidebarContent />
            </aside>

            {/* Mobile Menu Button */}
            <button
                onClick={() => setMobileMenuOpen(true)}
                className="
                    lg:hidden fixed top-4 left-4 z-40
                    p-3 bg-white rounded-lg shadow-md border border-gray-200
                    hover:bg-gray-50 transition-colors
                "
                aria-label="Open menu"
            >
                <Menu size={20} className="text-gray-700" />
            </button>

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={`
                    lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white
                    transform transition-transform duration-300 ease-in-out
                    ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
                    flex flex-col
                `}
            >
                <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg"
                    aria-label="Close menu"
                >
                    <X size={20} className="text-gray-500" />
                </button>
                <SidebarContent />
            </aside>

            {/* Main content */}
            <main className="flex-1 lg:ml-72">
                <div className="p-6 lg:p-8">{children}</div>
            </main>
        </div>
    );
}
