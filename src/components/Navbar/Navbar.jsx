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

export default function Navbar() {
    const { user, isAdmin, role } = useAuthStore();
    const { logout } = useAuth();
    const [navbarOpen, setNavbarOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const toggleNavbar = () => setNavbarOpen(!navbarOpen);
    const navbrand = `/assets/${tenant.pathName}/${tenant.logoWithText}`;

    return (
        <nav className={`navbar ${tenant.shortName === "HS" ? "hs-mode" : tenant.shortName === "RUNX1" ? "runx1-mode" : ""}${scrolled ? " navbar--scrolled" : ""}`}>
            <div className="navbar-inner boxed padding">
                {/* Left logo */}
                <Link href="/" className="navbrand">
                    <Image
                        width={100}
                        height={50}
                        src={navbrand}
                        alt="Logo"
                        className="navbrand-img"
                    />
                </Link>

                {/* Main nav */}
                <ul className="nav-links">
                    {[
                        { href: "/", label: "Home" },
                        { href: "/articles", label: "Articles" },
                        { href: "/clinical-trials", label: "Clinical Trials" },
                        { href: "/about", label: "About" },
                        { href: "/contact", label: "Contact Us" },
                    ].map((item) => (
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
                    {(role === "editor" || isAdmin) && (
                        <li className="dropdown">
                            <span>Editor Tools ▾</span>
                            <ul className="dropdown-menu">
                                {role === "editor" && (
                                    <li>
                                        <Link href="/assigned-articles">
                                            Assigned Articles
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
                    {[
  { name: "Home", href: "/" },
  { name: "Articles", href: "/articles" },
  { name: "Clinical Trials", href: "/clinical-trials" },
  { name: "About", href: "/about" },
  { name: "Contact Us", href: "/contact" },
].map((item) => (
  <Link key={item.name} href={item.href} onClick={toggleNavbar}>
    {item.name}
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
    );
}
