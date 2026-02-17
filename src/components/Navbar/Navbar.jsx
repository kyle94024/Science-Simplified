"use client";
import "./Navbar.scss";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { tenant } from "@/lib/config";
import useAuthStore from "@/store/useAuthStore";
import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
    const { user, isAdmin, role } = useAuthStore();
    const { logout } = useAuth();
    const [navbarOpen, setNavbarOpen] = useState(false);

    const toggleNavbar = () => setNavbarOpen(!navbarOpen);
    const navbrand = `/assets/${tenant.pathName}/${tenant.logoWithText}`;

    return (
        <nav className={`navbar ${tenant.shortName === "HS" ? "hs-mode" : tenant.shortName === "RUNX1" ? "runx1-mode" : ""}`}>
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
                    <li>
                        <Link href="/">Home</Link>
                    </li>
                    <li>
                        <Link href="/articles">Articles</Link>
                    </li>
                    <li>
                        <Link href="/clinical-trials">Clinical Trials</Link>
                    </li>

                    <li>
                        <Link href="/about">About</Link>
                    </li>
                    <li>
                        <Link href="/contact">Contact Us</Link>
                    </li>
                    

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
                    {["Home", "Articles", "Clinical Trials", "About", "Contact Us"].map((name) => (
                        <Link
                            key={name}
                            href={`/${
                                name === "Home"
                                    ? ""
                                    : name.toLowerCase().replace(" ", "-")
                            }`}
                            onClick={toggleNavbar}
                        >
                            {name}
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
