"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { withAuth } from "@/components/withAuth/withAuth";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import { Pencil, X, RefreshCw, BadgeCheck, FileText, Loader2 } from "lucide-react";
import "./AssignmentsMap.scss";

/**
 * Admin assignment map — a floating-bubble / liquid view of who is assigned
 * what. Each editor/expert sits at the center of their little cluster with
 * their assigned articles tethered to them; a lightweight force simulation
 * keeps everything spaced out and gently drifting. Only people with at
 * least one assignment appear (the API omits the rest).
 *
 * Interactions:
 *  - drag any bubble to fling it around (the sim reflows around it)
 *  - click an article bubble  → open the article (edit view if pending)
 *  - hover an article bubble  → ✕ appears; removing takes TWO steps
 *                               (✕ → "Remove" confirm inside the bubble)
 *  - hover a person bubble    → green edit button → account editor
 *
 * This page is deliberately NOT in any nav — reachable only from the
 * "Assignment Map" button on Assign Articles.
 */

const PERSON_R = 52;
const ARTICLE_R = 44;

function initials(name = "") {
    return (
        name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0].toUpperCase())
            .join("") || "?"
    );
}

function AssignmentsMapPage() {
    const router = useRouter();
    const [people, setPeople] = useState(null); // null = loading
    const [error, setError] = useState(null);
    const [confirming, setConfirming] = useState(null); // {personId, articleId, step}
    const [removing, setRemoving] = useState(false);
    const [, setTick] = useState(0); // re-render driver for the sim

    const containerRef = useRef(null);
    const nodesRef = useRef([]); // [{key,type,r,x,y,vx,vy,phase,person?,article?}]
    const linksRef = useRef([]); // [{a: key, b: key}]
    const dragRef = useRef(null); // {key, moved, offX, offY}
    const rafRef = useRef(null);

    const load = useCallback(async () => {
        setError(null);
        setPeople(null);
        try {
            const res = await fetch("/api/admin/assignments-map", { cache: "no-store" });
            if (!res.ok) throw new Error(`Failed to load (${res.status})`);
            const data = await res.json();
            setPeople(data.people || []);
        } catch (e) {
            setError(e.message);
            setPeople([]);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // (Re)build simulation nodes whenever the data changes.
    useEffect(() => {
        if (!people || !containerRef.current) return;
        const { clientWidth: w, clientHeight: h } = containerRef.current;
        const cx = w / 2;
        const cy = h / 2;

        const nodes = [];
        const links = [];
        const N = people.length;
        people.forEach((p, i) => {
            // People start on a ring around the canvas center…
            const angle = (i / Math.max(N, 1)) * Math.PI * 2 - Math.PI / 2;
            const ringR = N > 1 ? Math.min(w, h) / 3.2 : 0;
            const px = cx + Math.cos(angle) * ringR;
            const py = cy + Math.sin(angle) * ringR;
            nodes.push({
                key: `p${p.id}`,
                type: "person",
                r: PERSON_R,
                x: px,
                y: py,
                vx: 0,
                vy: 0,
                phase: i * 2.4,
                person: p,
            });
            // …with their articles scattered on a small ring around them.
            p.articles.forEach((a, j) => {
                const aAngle = (j / Math.max(p.articles.length, 1)) * Math.PI * 2 + i;
                const dist = PERSON_R + ARTICLE_R + 40;
                nodes.push({
                    key: `p${p.id}-a${a.id}`,
                    type: "article",
                    r: ARTICLE_R,
                    x: px + Math.cos(aAngle) * dist + (Math.random() - 0.5) * 10,
                    y: py + Math.sin(aAngle) * dist + (Math.random() - 0.5) * 10,
                    vx: 0,
                    vy: 0,
                    phase: i * 1.7 + j,
                    personId: p.id,
                    article: a,
                });
                links.push({ a: `p${p.id}`, b: `p${p.id}-a${a.id}` });
            });
        });
        nodesRef.current = nodes;
        linksRef.current = links;
    }, [people]);

    // The force simulation loop.
    useEffect(() => {
        if (!people) return;
        const reduceMotion =
            typeof window !== "undefined" &&
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

        const step = () => {
            const el = containerRef.current;
            const nodes = nodesRef.current;
            if (!el || nodes.length === 0) {
                rafRef.current = requestAnimationFrame(step);
                return;
            }
            const w = el.clientWidth;
            const h = el.clientHeight;
            const cx = w / 2;
            const cy = h / 2;
            const t = performance.now();
            const byKey = new Map(nodes.map((n) => [n.key, n]));

            // Pairwise repulsion (soft "liquid" spacing)
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const A = nodes[i];
                    const B = nodes[j];
                    let dx = B.x - A.x;
                    let dy = B.y - A.y;
                    let d2 = dx * dx + dy * dy;
                    if (d2 === 0) {
                        dx = 0.5;
                        dy = 0.5;
                        d2 = 0.5;
                    }
                    const d = Math.sqrt(d2);
                    if (d > 420) continue;
                    const minGap = A.r + B.r + 14;
                    // Stronger shove between two people so clusters spread out
                    const strength =
                        A.type === "person" && B.type === "person" ? 5200 : 1600;
                    let f = strength / d2;
                    // Hard-ish collision correction when overlapping
                    if (d < minGap) f += (minGap - d) * 0.06;
                    const fx = (dx / d) * f;
                    const fy = (dy / d) * f;
                    A.vx -= fx;
                    A.vy -= fy;
                    B.vx += fx;
                    B.vy += fy;
                }
            }

            // Tether springs person ↔ article
            for (const link of linksRef.current) {
                const A = byKey.get(link.a);
                const B = byKey.get(link.b);
                if (!A || !B) continue;
                const dx = B.x - A.x;
                const dy = B.y - A.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
                const rest = A.r + B.r + 42;
                const f = (d - rest) * 0.018;
                const fx = (dx / d) * f;
                const fy = (dy / d) * f;
                A.vx += fx;
                A.vy += fy;
                B.vx -= fx;
                B.vy -= fy;
            }

            for (const n of nodes) {
                // People are gently pulled toward the middle of the canvas
                if (n.type === "person") {
                    n.vx += (cx - n.x) * 0.0016;
                    n.vy += (cy - n.y) * 0.0016;
                }
                // Gentle liquid drift
                if (!reduceMotion) {
                    n.vx += Math.sin(t * 0.00045 + n.phase) * 0.028;
                    n.vy += Math.cos(t * 0.00038 + n.phase * 1.3) * 0.028;
                }
                // Integrate + damp
                n.vx *= 0.9;
                n.vy *= 0.9;
                n.x += n.vx;
                n.y += n.vy;
                // Keep inside the canvas
                const pad = n.r + 6;
                n.x = Math.max(pad, Math.min(w - pad, n.x));
                n.y = Math.max(pad, Math.min(h - pad, n.y));
            }

            // Dragged node sticks to the pointer
            const drag = dragRef.current;
            if (drag?.pointer) {
                const n = byKey.get(drag.key);
                if (n) {
                    n.x = drag.pointer.x;
                    n.y = drag.pointer.y;
                    n.vx = 0;
                    n.vy = 0;
                }
            }

            setTick((v) => v + 1);
            rafRef.current = requestAnimationFrame(step);
        };

        rafRef.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafRef.current);
    }, [people]);

    // --- drag handling (drag vs click disambiguation) ---
    const onBubblePointerDown = (key) => (e) => {
        e.preventDefault();
        const rect = containerRef.current.getBoundingClientRect();
        dragRef.current = {
            key,
            moved: false,
            startX: e.clientX,
            startY: e.clientY,
            pointer: { x: e.clientX - rect.left, y: e.clientY - rect.top },
        };
        const onMove = (ev) => {
            const d = dragRef.current;
            if (!d) return;
            if (Math.abs(ev.clientX - d.startX) + Math.abs(ev.clientY - d.startY) > 5) {
                d.moved = true;
            }
            const r = containerRef.current.getBoundingClientRect();
            d.pointer = { x: ev.clientX - r.left, y: ev.clientY - r.top };
        };
        const onUp = () => {
            // Leave `moved` readable for the click handler that fires right after
            setTimeout(() => {
                dragRef.current = null;
            }, 0);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
    };

    const wasDrag = () => !!dragRef.current?.moved;

    // --- two-step removal ---
    const startRemove = (personId, articleId) => (e) => {
        e.stopPropagation();
        setConfirming({ personId, articleId });
    };

    const confirmRemove = async () => {
        if (!confirming || removing) return;
        setRemoving(true);
        try {
            const res = await fetch("/api/admin/trial-assignments", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    researcherId: confirming.personId,
                    articleId: confirming.articleId,
                }),
            });
            if (!res.ok) throw new Error("Remove failed");
            // Drop the article locally; drop the person too if it was their last
            setPeople((prev) =>
                (prev || [])
                    .map((p) =>
                        p.id === confirming.personId
                            ? { ...p, articles: p.articles.filter((a) => a.id !== confirming.articleId) }
                            : p
                    )
                    .filter((p) => p.articles.length > 0)
            );
        } catch (e) {
            setError(e.message);
        } finally {
            setRemoving(false);
            setConfirming(null);
        }
    };

    const openArticle = (article) => () => {
        if (wasDrag()) return;
        if (article.isMissing) return;
        router.push(article.isPublished ? `/articles/${article.id}` : `/edit-article/${article.id}`);
    };

    const totals = useMemo(() => {
        if (!people) return { people: 0, articles: 0 };
        return {
            people: people.length,
            articles: people.reduce((s, p) => s + p.articles.length, 0),
        };
    }, [people]);

    const nodes = nodesRef.current;
    const byKey = new Map(nodes.map((n) => [n.key, n]));

    return (
        <div className="animate-fadeIn assignments-map">
            <PageHeader
                title="Assignment Map"
                subtitle={
                    people
                        ? `${totals.people} ${totals.people === 1 ? "person" : "people"} · ${totals.articles} assigned article${totals.articles === 1 ? "" : "s"} — drag bubbles around, click an article to open it`
                        : "Loading assignments…"
                }
                backHref="/assign-articles"
                backLabel="Back to Assign Articles"
                actions={
                    <button type="button" className="assignments-map__refresh" onClick={load}>
                        <RefreshCw size={15} /> Refresh
                    </button>
                }
            />

            {error && <p className="assignments-map__error">{error}</p>}

            <div className="assignments-map__legend">
                <span><i className="assignments-map__dot assignments-map__dot--person" /> Editor / expert</span>
                <span><i className="assignments-map__dot assignments-map__dot--pending" /> Pending article</span>
                <span><i className="assignments-map__dot assignments-map__dot--published" /> Published</span>
                <span><BadgeCheck size={13} /> Certified</span>
            </div>

            <div className="assignments-map__canvas" ref={containerRef}>
                {people === null ? (
                    <div className="assignments-map__loading">
                        <Loader2 size={28} className="animate-spin" />
                    </div>
                ) : people.length === 0 ? (
                    <div className="assignments-map__empty">
                        <EmptyState
                            icon="users"
                            title="No assignments yet"
                            description="Assign an article to an editor and it will float here."
                        />
                    </div>
                ) : (
                    <>
                        {/* Tether lines */}
                        <svg className="assignments-map__edges">
                            {linksRef.current.map((l) => {
                                const A = byKey.get(l.a);
                                const B = byKey.get(l.b);
                                if (!A || !B) return null;
                                return (
                                    <line
                                        key={`${l.a}->${l.b}`}
                                        x1={A.x}
                                        y1={A.y}
                                        x2={B.x}
                                        y2={B.y}
                                    />
                                );
                            })}
                        </svg>

                        {/* Bubbles */}
                        {nodes.map((n) => {
                            if (n.type === "person") {
                                const p = n.person;
                                return (
                                    <div
                                        key={n.key}
                                        className="assignments-map__person"
                                        style={{
                                            width: n.r * 2,
                                            height: n.r * 2,
                                            transform: `translate(${n.x - n.r}px, ${n.y - n.r}px)`,
                                        }}
                                        onPointerDown={onBubblePointerDown(n.key)}
                                        title={`${p.name} — ${p.email}`}
                                    >
                                        {p.photo ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={p.photo} alt="" draggable={false} />
                                        ) : (
                                            <span className="assignments-map__initials">{initials(p.name)}</span>
                                        )}
                                        <span className="assignments-map__person-name">
                                            {p.name}
                                            <em>{p.role}</em>
                                        </span>
                                        <Link
                                            href={`/admin/accounts?focus=${p.id}`}
                                            className="assignments-map__edit"
                                            title={`Edit ${p.name}'s account`}
                                            onPointerDown={(e) => e.stopPropagation()}
                                        >
                                            <Pencil size={13} />
                                        </Link>
                                    </div>
                                );
                            }

                            const a = n.article;
                            const isConfirming =
                                confirming &&
                                confirming.personId === n.personId &&
                                confirming.articleId === a.id;
                            return (
                                <div
                                    key={n.key}
                                    className={`assignments-map__article${
                                        a.isPublished ? " assignments-map__article--published" : ""
                                    }${a.isMissing ? " assignments-map__article--missing" : ""}${
                                        isConfirming ? " assignments-map__article--confirming" : ""
                                    }`}
                                    style={{
                                        width: n.r * 2,
                                        height: n.r * 2,
                                        transform: `translate(${n.x - n.r}px, ${n.y - n.r}px)`,
                                    }}
                                    onPointerDown={onBubblePointerDown(n.key)}
                                    onClick={isConfirming ? undefined : openArticle(a)}
                                    title={a.title}
                                >
                                    {isConfirming ? (
                                        <div className="assignments-map__confirm">
                                            <span>Remove?</span>
                                            <div>
                                                <button
                                                    type="button"
                                                    className="assignments-map__confirm-yes"
                                                    disabled={removing}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        confirmRemove();
                                                    }}
                                                >
                                                    {removing ? "…" : "Remove"}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="assignments-map__confirm-no"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfirming(null);
                                                    }}
                                                >
                                                    Keep
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <FileText size={13} className="assignments-map__article-icon" />
                                            <span className="assignments-map__article-title">{a.title}</span>
                                            {a.isCertified && (
                                                <BadgeCheck size={14} className="assignments-map__certified" />
                                            )}
                                            <button
                                                type="button"
                                                className="assignments-map__remove"
                                                title="Remove this assignment"
                                                onPointerDown={(e) => e.stopPropagation()}
                                                onClick={startRemove(n.personId, a.id)}
                                            >
                                                <X size={12} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    );
}

export default withAuth(AssignmentsMapPage);
