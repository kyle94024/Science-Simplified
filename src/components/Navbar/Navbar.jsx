"use client";
import "./Navbar.scss";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { tenant } from "@/lib/config";
import useAuthStore from "@/store/useAuthStore";
import { useAuth } from "@/hooks/useAuth";

function Badge({ count, dot = false }) {
    if (!count || count <= 0) return null;
    return (
        <span className={`nav-badge${dot ? " nav-badge--dot" : ""}`}>
            {dot ? "" : count > 99 ? "99+" : count}
        </span>
    );
}

export default function Navbar() {
    const { user, isAdmin, role } = useAuthStore();
    const { logout } = useAuth();
    const [navbarOpen, setNavbarOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [counts, setCounts] = useState({ assignedArticles: 0, assignedTrials: 0, total: 0 });
    const pathname = usePathname();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Fetch notification counts — only for users who could have assignments
    useEffect(() => {
        const shouldFetch =
            !!user && (isAdmin || role === "editor" || role === "researcher");
        if (!shouldFetch) {
            setCounts({ assignedArticles: 0, assignedTrials: 0, total: 0 });
            return;
        }
        let mounted = true;
        async function load() {
            // Skip when tab is hidden — assignments change rarely, so there's
            // no value in polling background tabs (and it keeps the Neon
            // compute awake unnecessarily).
            if (typeof document !== "undefined" && document.visibilityState === "hidden") {
                return;
            }
            try {
                const res = await fetch("/api/notifications/my-counts", { cache: "no-store" });
                if (!res.ok) return;
                const data = await res.json();
                if (mounted) {
                    setCounts({
                        assignedArticles: data.assignedArticles || 0,
                        assignedTrials: data.assignedTrials || 0,
                        total: data.total || 0,
                    });
                }
            } catch (err) {
                // ignore
            }
        }
        load();
        // Poll every 5 minutes while the tab is visible.
        const interval = setInterval(load, 5 * 60 * 1000);
        // When the tab becomes visible again, refresh immediately so the
        // badge feels responsive after returning to the tab.
        const onVisibility = () => {
            if (document.visibilityState === "visible") load();
        };
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            mounted = false;
            clearInterval(interval);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [user, isAdmin, role, pathname]);

    const toggleNavbar = () => setNavbarOpen(!navbarOpen);
    const navbrand = `/assets/${tenant.pathName}/${tenant.logoWithText}`;

    // Notification logic — only show on Editor Tools menu trigger
    const isEditor = role === "editor";
    const isResearcher = role === "researcher";
    const showEditorTools = isEditor || isAdmin;
    const showResearcherLink = isResearcher || isAdmin;
    // Editor Tools dropdown badge = articles count (editors care about pending articles)
    const editorToolsCount = showEditorTools ? counts.assignedArticles : 0;

    // Scleroderma is presented as "Science Simplified, in partnership with the
    // Scleroderma Research Foundation" — its own entity collaborating with SRF.
    // It also hides the Clinical Trials feature.
    const isScleroderma = tenant.shortName === "Scleroderma";

    const navItems = [
        { href: "/", label: "Home" },
        { href: "/articles", label: "Articles" },
        { href: "/clinical-trials", label: "Clinical Trials" },
        { href: "/about", label: "About" },
        { href: "/contact", label: "Contact Us" },
    ].filter((item) => !(isScleroderma && item.href === "/clinical-trials"));

    return (
        <>
        {isScleroderma && (
            <div className="partner-bar">
                <div className="partner-bar__inner boxed padding">
                    <span className="partner-bar__text">
                        <strong>Science Simplified</strong>
                        <span className="partner-bar__sep">in partnership with the</span>
                        <span className="partner-bar__org">Scleroderma Research Foundation</span>
                    </span>
                    <a
                        className="partner-bar__link"
                        href="https://srfcure.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Visit srfcure.org →
                    </a>
                </div>
            </div>
        )}
        <nav className={`navbar ${tenant.shortName === "HS" ? "hs-mode" : tenant.shortName === "RUNX1" ? "runx1-mode" : tenant.shortName === "Scleroderma" ? "scleroderma-mode" : tenant.shortName === "Myositis" ? "myositis-mode" : ""}${scrolled ? " navbar--scrolled" : ""}`}>
            <div className="navbar-inner boxed padding">
                {/* Left logo — Scleroderma uses a Science Simplified wordmark + partner subtitle */}
                {isScleroderma ? (
                    <Link href="/" className="navbrand navbrand--text">
                        <span className="navbrand-title">Science Simplified</span>
                        <span className="navbrand-subtitle">
                            partnered with the Scleroderma Research Foundation
                        </span>
                    </Link>
                ) : (
                    <Link href="/" className="navbrand">
                        <Image
                            width={100}
                            height={50}
                            src={navbrand}
                            alt="Logo"
                            className="navbrand-img"
                        />
                    </Link>
                )}

                {/* Main nav */}
                <ul className="nav-links">
                    {navItems.map((item) => (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                className={
                                    pathname === item.href ||
                                    (item.href !== "/" && pathname.startsWith(item.href))
                                        ? "active"
                                        : ""
                                }
                            >
                                {item.label}
                            </Link>
                        </li>
                    ))}


                    {/* Editor dropdown */}
                    {showEditorTools && (
                        <li className="dropdown">
                            <span className="nav-with-badge">
                                Editor Tools ▾
                                <Badge count={editorToolsCount} />
                            </span>
                            <ul className="dropdown-menu">
                                {isEditor && (
                                    <li>
                                        <Link href="/assigned-articles" className="nav-dropdown-link">
                                            <span>Assigned Articles</span>
                                            <Badge count={counts.assignedArticles} />
                                        </Link>
                                    </li>
                                )}
                                {user && (
                                    <li>
                                        <Link href="/add-article">
                                            Add Article
                                        </Link>
                                    </li>
                                )}
                                {isAdmin && (
                                    <>
                                        <li>
                                            <Link href="/pending-articles">
                                                Pending Articles
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="/assign-articles">
                                                Assign Articles
                                            </Link>
                                        </li>
                                    </>
                                )}
                            </ul>
                        </li>
                    )}

                    {/* Researcher dashboard link — for researchers (admins too) */}
                    {isResearcher && (
                        <li className="dropdown">
                            <span className="nav-with-badge">
                                Expert Tools ▾
                                <Badge count={counts.total} />
                            </span>
                            <ul className="dropdown-menu">
                                <li>
                                    <Link href="/researcher/dashboard" className="nav-dropdown-link">
                                        <span>My Assignments</span>
                                        <Badge count={counts.total} />
                                    </Link>
                                </li>
                            </ul>
                        </li>
                    )}

                    {/* Admin dropdown */}
                    {isAdmin && (
                        <li className="dropdown">
                            <span>Admin Tools ▾</span>
                            <ul className="dropdown-menu">
                                <li>
                                    <Link href="/featured">
                                        Featured Articles
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/create-editor">
                                        Create Editor
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/magic-links">Magic Links</Link>
                                </li>
                                <li>
                                    <Link href="/admin/sync">Sync Trials</Link>
                                </li>
                                <li>
                                    <Link href="/admin/clinical-trials">Edit Trials</Link>
                                </li>
                                <li>
                                    <Link href="/admin/researchers">Researchers</Link>
                                </li>
                                {showResearcherLink && (
                                    <li>
                                        <Link href="/researcher/dashboard" className="nav-dropdown-link">
                                            <span>Expert Dashboard</span>
                                            <Badge count={counts.assignedTrials} />
                                        </Link>
                                    </li>
                                )}
                            </ul>
                        </li>

                    )}

                    {/* Profile dropdown */}
                    {user && (
                        <li className="dropdown">
                            <span>Profile ▾</span>
                            <ul className="dropdown-menu">
                                <li>
                                    <Link href="/profile">View Profile</Link>
                                </li>
                                <li>
                                    <Link href="/favorited-articles">
                                        Favorited Articles
                                    </Link>
                                </li>
                                <li>
                                    <button
                                        onClick={logout}
                                        className="logout-btn"
                                    >
                                        Logout
                                    </button>
                                </li>
                            </ul>
                        </li>
                    )}
                </ul>

                {/* Auth buttons */}
                {!user && (
                    <div className="auth-buttons">
                        <Link href="/login" className="btn">
                            Login
                        </Link>
                        <Link href="/signup" className="btn btn-primary">
                            Sign Up
                        </Link>
                    </div>
                )}

                {/* Mobile menu toggle */}
                <div className="mobile-toggle" onClick={toggleNavbar}>
                    {navbarOpen ? <X size={24} /> : <Menu size={24} />}
                </div>
            </div>

            {/* Mobile dropdown fallback */}
            {navbarOpen && (
                <div className="mobile-menu">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href} onClick={toggleNavbar}>
                            {item.label}
                        </Link>
                    ))}
                    {user ? (
                        <button
                            onClick={logout}
                            className="btn btn-outlined mt-2"
                        >
                            Logout
                        </button>
                    ) : (
                        <>
                            <Link href="/login" className="btn mt-2">
                                Login
                            </Link>
                            <Link
                                href="/signup"
                                className="btn btn-primary mt-2"
                            >
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>
            )}
        </nav>
        </>
    );
}
