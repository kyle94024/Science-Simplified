"use client";

import Loader from "@/app/loading";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export const withResearcherAuth = (WrappedComponent) => {
  return function WithResearcherAuth(props) {
    const router = useRouter();
    const [authenticated, setAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const checkAuth = async () => {
        try {
          const response = await fetch("/api/auth/session");
          const user = await response.json();
          // Researchers, editors, OR admins pass through (editors can be
          // assigned trials too, and see them on the Expert Dashboard).
          if (
            user.isLoggedIn &&
            (user.role === "researcher" || user.role === "editor" || user.isAdmin)
          ) {
            setAuthenticated(true);
          } else {
            router.push("/login");
          }
        } catch {
          router.push("/login");
        } finally {
          setLoading(false);
        }
      };
      checkAuth();
    }, []);

    if (loading) return <Loader />;
    if (!authenticated) return null;

    return <WrappedComponent {...props} />;
  };
};
