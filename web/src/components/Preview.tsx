// SPDX-License-Identifier: MIT
// Copyright (C) 2026 Pooya Parsa <pooya@pi0.io>
// The guest preview panel: an iframe on /vm/<vmId>/<port>/ (preview.ts and
// the service worker public/vm-sw.js relay it to the guest's server), in a
// terminal-style frame with its title in the top border. On wide screens it
// is docked right of the stage and takes part of its width, so the terminal
// gets narrower: the bar on its left edge sets the split (kept in
// localStorage), and [□] fills the stage with it. On narrow screens it fills
// the stage. Covering the stage, it is a view like a terminal window:
// picking a window or the display hides it (preview.ts). A port field switches the port; the link opens the same URL in
// a tab, which works while this page stays open. Hidden (the status line's
// p segment, Ctrl-A p), the terminal gets its width back and the page in it
// stays loaded.
import { useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import { KW } from "../kw.ts";
import { closePreview, exportPreviewZip, openPreview, previewReady, previewUrl, setPreviewFill, useNarrow } from "../preview.ts";
import { useStore } from "../store.ts";
import { store } from "../ui.ts";

/** The panel's share of the row, and its limits (each side keeps at least MIN_PX). */
const SPLIT = 0.4, MIN_PX = 280;
const readSplit = (): number => {
	const v = Number(store("previewSplit"));
	return v >= 0.1 && v <= 0.9 ? v : SPLIT;
};

/**
 * A docked panel's left edge sets its share of the row (pointer capture: an
 * iframe under the pointer does not take the moves); kept in localStorage
 * under `key` when the drag ends.
 */
export function dragSplit(e: ReactPointerEvent<HTMLElement>, split: number, setSplit: (v: number) => void, setDragging: (on: boolean) => void, key: string): void {
	if (e.button !== 0) return;
	e.preventDefault();
	const el = e.currentTarget, row = el.closest("section")!.parentElement!;
	el.setPointerCapture(e.pointerId);
	setDragging(true);
	let last = split;
	const move = (ev: PointerEvent) => {
		const r = row.getBoundingClientRect();
		const lo = Math.min(0.5, MIN_PX / r.width), hi = Math.max(0.5, 1 - MIN_PX / r.width);
		last = Math.min(hi, Math.max(lo, (r.right - ev.clientX) / r.width));
		setSplit(last);
	};
	const up = () => {
		el.removeEventListener("pointermove", move);
		el.removeEventListener("pointerup", up);
		el.removeEventListener("pointercancel", up);
		setDragging(false);
		store(key, last.toFixed(3));
	};
	el.addEventListener("pointermove", move);
	el.addEventListener("pointerup", up);
	el.addEventListener("pointercancel", up);
}

export function Preview() {
	const p = useStore((s) => s.preview);
	const narrow = useNarrow();
	const [split, setSplit] = useState(readSplit);
	const [dragging, setDragging] = useState(false);
	const [wait, setWait] = useState<string | null>("Starting the preview…");
	const [field, setField] = useState("");
	const [nonce, setNonce] = useState(0);
	const [zipping, setZipping] = useState(false);
	const frame = useRef<HTMLIFrameElement>(null);
	const port = p?.port ?? 0;

	useEffect(() => { if (port) setField(String(port)); }, [port]);
	useEffect(() => {
		if (!port) return;
		let live = true;
		setWait("Waiting for the kernel and the preview's service worker…");
		previewReady().then(() => { if (live) setWait(null); }, (e: Error) => { if (live) setWait(e.message); });
		return () => { live = false; };
	}, [port]);

	if (!p) return null;
	const url = wait === null ? previewUrl(port, p.path) : "";
	const prefix = url && previewUrl(port, "");
	const fill = p.fill, docked = !narrow && !fill;

	const resize = (e: ReactPointerEvent<HTMLElement>) => dragSplit(e, split, setSplit, setDragging, "previewSplit");
	const submit = (e: FormEvent) => {
		e.preventDefault();
		if (Number(field) === port) setNonce((n) => n + 1);
		else if (!openPreview(field)) KW.ui!.toast(`Not a port: ${field}`);
	};
	const reload = () => {
		try { frame.current?.contentWindow?.location.reload(); } catch { setNonce((n) => n + 1); }
	};
	const downloadZip = async () => {
		if (zipping || !port) return;
		setZipping(true);
		try {
			await exportPreviewZip(port);
		} catch (e) {
			KW.ui?.toast(`Error al exportar ZIP: ${(e as Error)?.message ?? e}`);
		} finally {
			setZipping(false);
		}
	};
	const btn = "px-1 text-muted hover:text-fg disabled:opacity-40";

	return (
		<section
			id="preview" aria-label={`Preview of the guest's port ${port}`} hidden={!p.shown}
			className={`flex flex-col border border-line-strong bg-bg font-mono text-[12px] ${docked
				? "relative flex-none mt-[max(8px,var(--st))] mr-[max(8px,var(--sr))] mb-1"
				: "absolute inset-[max(8px,var(--st))_max(8px,var(--sr))_4px_max(8px,var(--sl))] z-[15] shadow-[0_16px_48px_rgba(0,0,0,.8)]"}`}
			style={docked ? { width: `calc(${(split * 100).toFixed(2)}% - max(8px, var(--sr)))` } : undefined}
		>
			<h2 className="absolute -top-2 left-3 bg-bg px-1.5 text-[12px] leading-4 font-normal text-fg">
				<span className="text-faint">┤</span> preview<span className="text-faint">:</span>{port} <span className="text-faint">├</span>
			</h2>
			<div className="absolute -top-2 right-3 flex bg-bg px-1 text-[12px] leading-4">
				<button id="preview-zip" type="button" className={btn} title="Descargar código del proyecto (.zip)" aria-label="Descargar código como ZIP" disabled={!url || zipping} onClick={() => void downloadZip()}>[{zipping ? "…" : "↓ zip"}]</button>
				<button id="preview-reload" type="button" className={btn} title="Reload" aria-label="Reload the preview" disabled={!url} onClick={reload}>[↻]</button>
				{!narrow && <button id="preview-max" type="button" className={btn} title={fill ? "Beside the terminal" : "Fill the stage"} aria-label={fill ? "Dock the preview beside the terminal" : "Fill the stage"} onClick={() => setPreviewFill(!fill)}>[{fill ? "▫" : "□"}]</button>}
				<button id="preview-close" type="button" className={btn} title="Close" aria-label="Close the preview" onClick={closePreview}>[×]</button>
			</div>
			<form onSubmit={submit} className="flex flex-none items-center gap-2 border-b border-line px-3 pt-3.5 pb-2">
				<label className="flex items-center gap-1.5 text-faint">port
					<input id="preview-port" type="text" inputMode="numeric" value={field} onChange={(e) => setField(e.currentTarget.value)} size={5}
						autoComplete="off" spellCheck={false} className="field h-6 w-16 px-1.5 text-[12px] text-fg" />
				</label>
				<button type="submit" className="btn btn-sm h-6">Go</button>
				{url && (
					<a id="preview-tab" href={url} target="_blank" rel="noopener" title="Open in a new tab (works while this page stays open)"
						className="min-w-0 truncate text-muted hover:text-fg">{url} ↗</a>
				)}
			</form>
			<div className="relative min-h-0 flex-1 bg-white">
				{url
					? <iframe key={`${url}#${nonce}`} ref={frame} id="preview-frame" src={url} data-kw-preview={`${prefix}/`} title={`The guest's port ${port}`}
						className={`absolute inset-0 h-full w-full border-0 ${dragging ? "pointer-events-none" : ""}`} allow="fullscreen" />
					: <p className="absolute inset-0 bg-bg p-4 text-muted">{wait}</p>}
			</div>
			{docked && (
				<div role="separator" aria-orientation="vertical" aria-label="Resize the preview" title="Drag to resize"
					onPointerDown={resize} className="absolute top-0 -left-2 z-[1] h-full w-3 cursor-ew-resize touch-none hover:bg-line/40" />
			)}
		</section>
	);
}
