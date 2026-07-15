"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { withAuth } from "@/components/withAuth/withAuth";
import PageHeader from "@/components/admin/PageHeader";
import SearchInput from "@/components/admin/SearchInput";
import EmptyState from "@/components/admin/EmptyState";
import { Pencil, X, RefreshCw, BadgeCheck, FileText, Loader2 } from "lucide-react";
import "./AssignmentsMap.scss";

/**
 * Admin assignment map — a floating-bubble / liquid view of who is assigned
 * what. Each editor/expert has a "home" cell on a grid laid out in reading
 * order; a lightweight force simulation lets everyone drift around home,
 * with their assigned articles tethered nearby. The canvas grows as tall as
 * it needs (the page scrolls down), so clusters get real breathing room even
 * with dozens of people. Only people with >= 1 assignment appear.
 *
 * Interactions:
 *  - drag any bubble to reposition it (the sim reflows around it)
 *  - click an article bubble  → open the article (edit view if pending)
 *  - hover an article bubble  → ✕ appears; removing takes TWO steps
 *                               (✕ → in-bubble "Remove?" confirm)
 *  - hover a person bubble    → name + green edit button → account editor
 *  - search                   → matching editors float to the top rows and
 *                               the rest dim out
 *
 * Not in any nav — reachable only from the "Assignment Map" button on
 * Assign Articles.
 */

const PERSON_R = 30; // editors are small now
const ARTICLE_R = 38;
const CELL_W = 250; // grid cell each person "homes" to
const CELL_H = 260;
const TOP_PAD = 52;
const MIN_H = 620;

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

function personMatches(p, q) {
    if (!q) return true;
    return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q)
    );
}

function AssignmentsMapPage() {
    const router = useRouter();
    const [people, setPeople] = useState(null); // null = loading
    const [error, setError] = useState(null);
    const [confirming, setConfirming] = useState(null); // {personId, articleId}
    const [removing, setRemoving] = useState(false);
    const [query, setQuery] = useState("");
    const [canvasH, setCanvasH] = useState(MIN_H);
    const [, setTick] = useState(0);

    const containerRef = useRef(null);
    const widthRef = useRef(1200);
    const heightRef = useRef(MIN_H);
    const nodesRef = useRef([]);
    const linksRef = useRef([]);
    const dragRef = useRef(null);
    const rafRef = useRef(null);
    const wasEmptyRef = useRef(true);
    const confirmingRef = useRef(null);

    // Mirror `confirming` into a ref so the pointer-tap handler always reads
    // the latest value (its closure is captured at pointer-down time).
    useEffect(() => {
        confirmingRef.current = confirming;
    }, [confirming]);

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

    const q = query.trim().toLowerCase();

    // People in display order: matches first (when searching), then by name.
    const orderedPeople = useMemo(() => {
        if (!people) return [];
        return [...people].sort((a, b) => {
            if (q) {
                const am = personMatches(a, q);
                const bm = personMatches(b, q);
                if (am !== bm) return am ? -1 : 1;
            }
            return (a.name || a.email || "").localeCompare(b.name || b.email || "");
        });
    }, [people, q]);

    // Set of matching person ids (null = no active filter → nothing dims).
    const matchingIds = useMemo(() => {
        if (!people || !q) return null;
        return new Set(people.filter((p) => personMatches(p, q)).map((p) => p.id));
    }, [people, q]);

    // Assign each person a grid "home" for the current width + order, and
    // size the canvas to fit all rows. Mutates existing nodes so the sim
    // animates people to their new spots (e.g. when search reorders them).
    const applyHomes = useCallback(() => {
        const w = widthRef.current || 1200;
        const cols = Math.max(1, Math.floor(w / CELL_W));
        const rows = Math.max(1, Math.ceil(orderedPeople.length / cols));
        const offX = Math.max(0, (w - cols * CELL_W) / 2);
        const byKey = new Map(nodesRef.current.map((n) => [n.key, n]));
        orderedPeople.forEach((p, i) => {
            const node = byKey.get(`p${p.id}`);
            if (!node) return;
            node.homeX = offX + (i % cols) * CELL_W + CELL_W / 2;
            node.homeY = TOP_PAD + Math.floor(i / cols) * CELL_H + CELL_H / 2;
        });
        const h = Math.max(MIN_H, TOP_PAD * 2 + rows * CELL_H);
        heightRef.current = h;
        setCanvasH(h);
    }, [orderedPeople]);

    // Build nodes when the data changes (initial positions = home, so no fly-in).
    useEffect(() => {
        if (!people) return;
        const w = widthRef.current || 1200;
        const cols = Math.max(1, Math.floor(w / CELL_W));
        const offX = Math.max(0, (w - cols * CELL_W) / 2);
        const base = [...people].sort((a, b) =>
            (a.name || a.email || "").localeCompare(b.name || b.email || "")
        );
        const nodes = [];
        const links = [];
        base.forEach((p, i) => {
            const hx = offX + (i % cols) * CELL_W + CELL_W / 2;
            const hy = TOP_PAD + Math.floor(i / cols) * CELL_H + CELL_H / 2;
            nodes.push({
                key: `p${p.id}`,
                type: "person",
                r: PERSON_R,
                x: hx,
                y: hy,
                vx: 0,
                vy: 0,
                homeX: hx,
                homeY: hy,
                phase: i * 1.7,
                person: p,
            });
            p.articles.forEach((a, j) => {
                const ang = (j / Math.max(p.articles.length, 1)) * Math.PI * 2 + i;
                const dist = PERSON_R + ARTICLE_R + 24;
                nodes.push({
                    key: `p${p.id}-a${a.id}`,
                    type: "article",
                    r: ARTICLE_R,
                    x: hx + Math.cos(ang) * dist,
                    y: hy + Math.sin(ang) * dist,
                    vx: 0,
                    vy: 0,
                    phase: i * 1.3 + j,
                    personId: p.id,
                    article: a,
                });
                links.push({ a: `p${p.id}`, b: `p${p.id}-a${a.id}` });
            });
        });
        nodesRef.current = nodes;
        linksRef.current = links;
        const rows = Math.max(1, Math.ceil(base.length / cols));
        const h = Math.max(MIN_H, TOP_PAD * 2 + rows * CELL_H);
        heightRef.current = h;
        setCanvasH(h);
    }, [people]);

    // Re-home when the order (search) or width changes.
    useEffect(() => {
        applyHomes();
    }, [applyHomes]);

    // Track canvas width.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const update = () => {
            widthRef.current = el.clientWidth;
            applyHomes();
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [people]);

    // When a search begins, scroll the canvas top into view so the matches
    // (which float to the top) are visible.
    useEffect(() => {
        const empty = !q;
        if (!empty && wasEmptyRef.current) {
            containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        wasEmptyRef.current = empty;
    }, [q]);

    // Force simulation.
    useEffect(() => {
        if (!people) return;
        const reduceMotion =
            typeof window !== "undefined" &&
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

        let frame = 0;
        const step = () => {
            const nodes = nodesRef.current;
            const w = widthRef.current;
            const h = heightRef.current;
            if (nodes.length === 0) {
                rafRef.current = requestAnimationFrame(step);
                return;
            }
            const t = performance.now();
            const byKey = new Map(nodes.map((n) => [n.key, n]));

            // Soft repulsion so bubbles don't overlap (distance-capped).
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
                    if (d2 > 300 * 300) continue;
                    const d = Math.sqrt(d2);
                    const minGap = A.r + B.r + 10;
                    const strength =
                        A.type === "person" && B.type === "person" ? 2000 : 1100;
                    let f = strength / d2;
                    if (d < minGap) f += (minGap - d) * 0.05;
                    const fx = (dx / d) * f;
                    const fy = (dy / d) * f;
                    A.vx -= fx;
                    A.vy -= fy;
                    B.vx += fx;
                    B.vy += fy;
                }
            }

            // Tether springs person ↔ article.
            for (const link of linksRef.current) {
                const A = byKey.get(link.a);
                const B = byKey.get(link.b);
                if (!A || !B) continue;
                const dx = B.x - A.x;
                const dy = B.y - A.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
                const rest = A.r + B.r + 26;
                const f = (d - rest) * 0.02;
                A.vx += (dx / d) * f;
                A.vy += (dy / d) * f;
                B.vx -= (dx / d) * f;
                B.vy -= (dy / d) * f;
            }

            for (const n of nodes) {
                // People are softly sprung to their grid home (keeps order +
                // uses the tall canvas); articles just follow their person.
                if (n.type === "person") {
                    n.vx += (n.homeX - n.x) * 0.02;
                    n.vy += (n.homeY - n.y) * 0.02;
                }
                if (!reduceMotion) {
                    // Gentle sway — small enough that bubbles stay easy to click.
                    n.vx += Math.sin(t * 0.00045 + n.phase) * 0.006;
                    n.vy += Math.cos(t * 0.00038 + n.phase * 1.3) * 0.006;
                }
                n.vx *= 0.9;
                n.vy *= 0.9;
                n.x += n.vx;
                n.y += n.vy;
                const pad = n.r + 6;
                n.x = Math.max(pad, Math.min(w - pad, n.x));
                n.y = Math.max(pad, Math.min(h - pad, n.y));
            }

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

            // Re-render at ~30fps (physics still steps every frame).
            frame++;
            if (frame % 2 === 0) setTick((v) => v + 1);
            rafRef.current = requestAnimationFrame(step);
        };

        rafRef.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafRef.current);
    }, [people]);

    // Pointer-based tap vs. drag. The bubbles drift continuously, so the
    // browser's native `click` is unreliable — mousedown and mouseup can land
    // on different targets and no click fires. Instead we track the pointer
    // ourselves: a press + release with almost no cursor movement is a "tap"
    // that opens the article the press started on, wherever the bubble drifted.
    const onBubblePointerDown = (node) => (e) => {
        if (e.button && e.button !== 0) return; // left button only
        const rect = containerRef.current.getBoundingClientRect();
        dragRef.current = {
            key: node.key,
            moved: false,
            startX: e.clientX,
            startY: e.clientY,
            pointer: { x: e.clientX - rect.left, y: e.clientY - rect.top },
        };
        const onMove = (ev) => {
            const d = dragRef.current;
            if (!d) return;
            if (Math.abs(ev.clientX - d.startX) + Math.abs(ev.clientY - d.startY) > 6) {
                d.moved = true;
            }
            const r = containerRef.current.getBoundingClientRect();
            d.pointer = { x: ev.clientX - r.left, y: ev.clientY - r.top };
        };
        const onUp = () => {
            const d = dragRef.current;
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            dragRef.current = null;
            if (d && !d.moved) handleTap(node); // released without dragging → a tap
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
    };

    const handleTap = (node) => {
        if (node.type !== "article") return; // tapping a person does nothing
        const a = node.article;
        if (!a || a.isMissing) return;
        // Ignore a tap on an article that's mid-removal-confirmation.
        const c = confirmingRef.current;
        if (c && c.articleId === a.id && c.personId === node.personId) return;
        router.push(a.isPublished ? `/articles/${a.id}` : `/pending-articles/${a.id}`);
    };

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
                        ? `${totals.people} ${totals.people === 1 ? "person" : "people"} · ${totals.articles} assigned article${totals.articles === 1 ? "" : "s"} — drag bubbles, click an article to open it`
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

            {/* Sticky toolbar: search (floats matches to top) + legend */}
            <div className="assignments-map__toolbar">
                <div className="assignments-map__search">
                    <SearchInput
                        value={query}
                        onChange={setQuery}
                        placeholder="Search editors by name or email…"
                        debounceMs={150}
                    />
                    {q && (
                        <span className="assignments-map__search-count">
                            {matchingIds ? matchingIds.size : 0} match
                            {(matchingIds ? matchingIds.size : 0) === 1 ? "" : "es"} — floated to top
                        </span>
                    )}
                </div>
                <div className="assignments-map__legend">
                    <span><i className="assignments-map__dot assignments-map__dot--person" /> Editor / expert</span>
                    <span><i className="assignments-map__dot assignments-map__dot--pending" /> Pending</span>
                    <span><i className="assignments-map__dot assignments-map__dot--published" /> Published</span>
                    <span><BadgeCheck size={13} /> Certified</span>
                </div>
            </div>

            <div
                className={`assignments-map__canvas${q ? " assignments-map__canvas--filtering" : ""}`}
                ref={containerRef}
                style={{ height: canvasH }}
            >
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
                                const dim = matchingIds && !matchingIds.has(A.person?.id ?? B.personId);
                                return (
                                    <line
                                        key={`${l.a}->${l.b}`}
                                        x1={A.x}
                                        y1={A.y}
                                        x2={B.x}
                                        y2={B.y}
                                        opacity={dim ? 0.12 : 1}
                                    />
                                );
                            })}
                        </svg>

                        {/* Bubbles */}
                        {nodes.map((n) => {
                            if (n.type === "person") {
                                const p = n.person;
                                const dim = matchingIds && !matchingIds.has(p.id);
                                return (
                                    <div
                                        key={n.key}
                                        className={`assignments-map__person${dim ? " assignments-map__person--dim" : ""}`}
                                        style={{
                                            width: n.r * 2,
                                            height: n.r * 2,
                                            transform: `translate(${n.x - n.r}px, ${n.y - n.r}px)`,
                                        }}
                                        onPointerDown={onBubblePointerDown(n)}
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
                                            <Pencil size={12} />
                                        </Link>
                                    </div>
                                );
                            }

                            const a = n.article;
                            const dim = matchingIds && !matchingIds.has(n.personId);
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
                                    }${dim ? " assignments-map__article--dim" : ""}`}
                                    style={{
                                        width: n.r * 2,
                                        height: n.r * 2,
                                        transform: `translate(${n.x - n.r}px, ${n.y - n.r}px)`,
                                    }}
                                    onPointerDown={onBubblePointerDown(n)}
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
                                                    onPointerDown={(e) => e.stopPropagation()}
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
                                                    onPointerDown={(e) => e.stopPropagation()}
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
                                            <FileText size={12} className="assignments-map__article-icon" />
                                            <span className="assignments-map__article-title">{a.title}</span>
                                            {a.isCertified && (
                                                <BadgeCheck size={13} className="assignments-map__certified" />
                                            )}
                                            <button
                                                type="button"
                                                className="assignments-map__remove"
                                                title="Remove this assignment"
                                                onPointerDown={(e) => e.stopPropagation()}
                                                onClick={startRemove(n.personId, a.id)}
                                            >
                                                <X size={11} />
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
