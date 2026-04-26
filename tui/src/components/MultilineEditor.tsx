import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Text, useInput, useStdin } from "ink";
import { colors } from "../theme.ts";

export interface MultilineEditorProps {
	defaultValue?: string;
	placeholder?: string;
	focused: boolean;
	onChange?(value: string): void;
	onSubmit?(value: string): void;
	onCancel?(): void;
}

interface Cursor {
	row: number;
	col: number;
}

function splitLines(value: string): string[] {
	const parts = value.split("\n");
	return parts.length > 0 ? parts : [""];
}

export function MultilineEditor({
	defaultValue = "",
	placeholder,
	focused,
	onChange,
	onSubmit,
	onCancel,
}: MultilineEditorProps) {
	const [lines, setLines] = useState<string[]>(() => splitLines(defaultValue));
	const [cursor, setCursor] = useState<Cursor>(() => {
		const init = splitLines(defaultValue);
		const row = Math.max(0, init.length - 1);
		return { row, col: init[row]?.length ?? 0 };
	});

	// Refs are written synchronously inside `commit` and the cursor-only
	// movers below so consecutive handler invocations within the same React
	// batch (e.g. ink's useInput firing 'readable' then our raw-stdin 'data'
	// listener firing for the same chunk, or two chunks arriving on the same
	// tick) read the post-update buffer instead of stale state. The
	// useEffect-based syncs stay as a belt-and-suspenders for any external
	// state mutation paths.
	const linesRef = useRef(lines);
	const cursorRef = useRef(cursor);
	useEffect(() => {
		linesRef.current = lines;
	}, [lines]);
	useEffect(() => {
		cursorRef.current = cursor;
	}, [cursor]);

	const onChangeRef = useRef(onChange);
	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	const commit = useCallback(
		(nextLines: string[], nextCursor: Cursor) => {
			linesRef.current = nextLines;
			cursorRef.current = nextCursor;
			setLines(nextLines);
			setCursor(nextCursor);
			onChangeRef.current?.(nextLines.join("\n"));
		},
		[],
	);

	// Cursor-only mutator that keeps `cursorRef` in lock-step with state.
	const setCursorSync = useCallback((next: Cursor) => {
		cursorRef.current = next;
		setCursor(next);
	}, []);

	const insertText = useCallback(
		(text: string) => {
			const cur = cursorRef.current;
			const ls = linesRef.current.slice();
			const row = ls[cur.row] ?? "";
			const before = row.slice(0, cur.col);
			const after = row.slice(cur.col);

			if (!text.includes("\n")) {
				ls[cur.row] = before + text + after;
				commit(ls, { row: cur.row, col: before.length + text.length });
				return;
			}
			const parts = text.split("\n");
			const first = parts[0] ?? "";
			const last = parts[parts.length - 1] ?? "";
			const middle = parts.slice(1, -1);
			const newRows = [
				before + first,
				...middle,
				last + after,
			];
			ls.splice(cur.row, 1, ...newRows);
			commit(ls, {
				row: cur.row + parts.length - 1,
				col: last.length,
			});
		},
		[commit],
	);

	const newline = useCallback(() => {
		const cur = cursorRef.current;
		const ls = linesRef.current.slice();
		const row = ls[cur.row] ?? "";
		const before = row.slice(0, cur.col);
		const after = row.slice(cur.col);
		ls.splice(cur.row, 1, before, after);
		commit(ls, { row: cur.row + 1, col: 0 });
	}, [commit]);

	const backspace = useCallback(() => {
		const cur = cursorRef.current;
		const ls = linesRef.current.slice();
		if (cur.col > 0) {
			const row = ls[cur.row] ?? "";
			ls[cur.row] = row.slice(0, cur.col - 1) + row.slice(cur.col);
			commit(ls, { row: cur.row, col: cur.col - 1 });
			return;
		}
		if (cur.row === 0) return;
		const prev = ls[cur.row - 1] ?? "";
		const curRow = ls[cur.row] ?? "";
		const newCol = prev.length;
		ls.splice(cur.row - 1, 2, prev + curRow);
		commit(ls, { row: cur.row - 1, col: newCol });
	}, [commit]);

	const forwardDelete = useCallback(() => {
		const cur = cursorRef.current;
		const ls = linesRef.current.slice();
		const row = ls[cur.row] ?? "";
		if (cur.col < row.length) {
			ls[cur.row] = row.slice(0, cur.col) + row.slice(cur.col + 1);
			commit(ls, cur);
			return;
		}
		if (cur.row >= ls.length - 1) return;
		const next = ls[cur.row + 1] ?? "";
		ls.splice(cur.row, 2, row + next);
		commit(ls, cur);
	}, [commit]);

	const moveLeft = useCallback(() => {
		const cur = cursorRef.current;
		if (cur.col > 0) {
			setCursorSync({ row: cur.row, col: cur.col - 1 });
			return;
		}
		if (cur.row === 0) return;
		const prev = linesRef.current[cur.row - 1] ?? "";
		setCursorSync({ row: cur.row - 1, col: prev.length });
	}, [setCursorSync]);

	const moveRight = useCallback(() => {
		const cur = cursorRef.current;
		const row = linesRef.current[cur.row] ?? "";
		if (cur.col < row.length) {
			setCursorSync({ row: cur.row, col: cur.col + 1 });
			return;
		}
		if (cur.row >= linesRef.current.length - 1) return;
		setCursorSync({ row: cur.row + 1, col: 0 });
	}, [setCursorSync]);

	const moveUp = useCallback(() => {
		const cur = cursorRef.current;
		if (cur.row === 0) {
			setCursorSync({ row: 0, col: 0 });
			return;
		}
		const prev = linesRef.current[cur.row - 1] ?? "";
		setCursorSync({ row: cur.row - 1, col: Math.min(cur.col, prev.length) });
	}, [setCursorSync]);

	const moveDown = useCallback(() => {
		const cur = cursorRef.current;
		if (cur.row >= linesRef.current.length - 1) {
			const row = linesRef.current[cur.row] ?? "";
			setCursorSync({ row: cur.row, col: row.length });
			return;
		}
		const next = linesRef.current[cur.row + 1] ?? "";
		setCursorSync({ row: cur.row + 1, col: Math.min(cur.col, next.length) });
	}, [setCursorSync]);

	const moveHome = useCallback(() => {
		const cur = cursorRef.current;
		setCursorSync({ row: cur.row, col: 0 });
	}, [setCursorSync]);

	const moveEnd = useCallback(() => {
		const cur = cursorRef.current;
		const row = linesRef.current[cur.row] ?? "";
		setCursorSync({ row: cur.row, col: row.length });
	}, [setCursorSync]);

	const killToEnd = useCallback(() => {
		const cur = cursorRef.current;
		const ls = linesRef.current.slice();
		const row = ls[cur.row] ?? "";
		ls[cur.row] = row.slice(0, cur.col);
		commit(ls, cur);
	}, [commit]);

	const killToStart = useCallback(() => {
		const cur = cursorRef.current;
		const ls = linesRef.current.slice();
		const row = ls[cur.row] ?? "";
		ls[cur.row] = row.slice(cur.col);
		commit(ls, { row: cur.row, col: 0 });
	}, [commit]);

	useInput(
		(input, key) => {
			if (key.escape) {
				onCancel?.();
				return;
			}
			// Newline (portable): Ctrl+J transmits LF (\n) as a distinct byte
			// from CR on every VT-style terminal regardless of "modify-other-keys"
			// settings. This is the recommended chord — Shift+Enter is unreliable
			// on default Apple Terminal, gnome-terminal, default iTerm2, and tmux
			// without extended-keys, where it sends plain \r identical to Enter.
			if (input === "\n" || (key.ctrl && input === "j")) {
				newline();
				return;
			}
			if (key.return) {
				// Shift+Enter for newline only fires on terminals that send a
				// distinguishable sequence (kitty, wezterm, xterm modifyOtherKeys=2).
				// Kept as a bonus path — Ctrl+J is the documented affordance.
				if (key.shift || key.meta) {
					newline();
					return;
				}
				onSubmit?.(linesRef.current.join("\n"));
				return;
			}
			// Convention: \x1b\r (Alt+Enter / "modify-other-keys" CR) inserts a
			// newline. ink strips the leading ESC, so we see input='\r' with
			// key.return=false — kept as an additional fallback.
			if (input === "\r" && !key.return) {
				newline();
				return;
			}
			// Backspace / Delete are owned by the raw stdin effect below — ink
			// collapses Backspace (\x7f) and forward-Delete (\x1b[3~) into a
			// single `key.delete` flag so we cannot disambiguate here. Skip both
			// flags to avoid applying the operation twice.
			if (key.backspace || key.delete) {
				return;
			}
			if (key.leftArrow) {
				moveLeft();
				return;
			}
			if (key.rightArrow) {
				moveRight();
				return;
			}
			if (key.upArrow) {
				moveUp();
				return;
			}
			if (key.downArrow) {
				moveDown();
				return;
			}
			if (key.tab) {
				// Tab is owned by the outer keymap (focus cycle). No-op.
				return;
			}
			if (key.ctrl) {
				if (input === "a") {
					moveHome();
					return;
				}
				if (input === "e") {
					moveEnd();
					return;
				}
				if (input === "k") {
					killToEnd();
					return;
				}
				if (input === "u") {
					killToStart();
					return;
				}
				// Other ctrl chords bubble to the outer keymap; ignore here.
				return;
			}
			if (key.meta) {
				return;
			}
			if (input && input.length > 0) {
				insertText(input);
			}
		},
		{ isActive: focused },
	);

	const { stdin, isRawModeSupported } = useStdin();

	useEffect(() => {
		if (!focused || !isRawModeSupported || !stdin) return;
		const handler = (chunk: Buffer | string) => {
			const s = typeof chunk === "string" ? chunk : chunk.toString("utf8");
			// Backspace / Delete are owned here — ink's parser collapses both
			// Backspace (\x7f) and forward-Delete (\x1b[3~) into a single
			// `key.delete` flag, so we route off the raw byte instead.
			if (s === "\x7f" || s === "\x08" || s === "\x1b\x7f") {
				backspace();
				return;
			}
			if (s === "\x1b[3~" || s === "\x1b[3$" || s === "\x1b[3^") {
				forwardDelete();
				return;
			}
			// Standalone Home/End escape sequences. We deliberately avoid
			// mis-firing inside multi-key bursts by requiring the sequence to
			// be the entire chunk.
			if (s === "\x1b[H" || s === "\x1bOH" || s === "\x1b[1~" || s === "\x1b[7~") {
				moveHome();
				return;
			}
			if (s === "\x1b[F" || s === "\x1bOF" || s === "\x1b[4~" || s === "\x1b[8~") {
				moveEnd();
			}
		};
		stdin.on("data", handler);
		return () => {
			stdin.off("data", handler);
		};
	}, [focused, isRawModeSupported, stdin, moveHome, moveEnd, backspace, forwardDelete]);

	const showPlaceholder =
		placeholder && lines.length === 1 && (lines[0] ?? "") === "";

	return (
		<Box flexDirection="column">
			{showPlaceholder ? (
				<Text color={colors.stoneGray}>{placeholder}</Text>
			) : (
				lines.map((line, idx) => (
					<EditorLine
						key={idx}
						line={line}
						isCursorRow={focused && cursor.row === idx}
						col={cursor.col}
					/>
				))
			)}
		</Box>
	);
}

interface EditorLineProps {
	line: string;
	isCursorRow: boolean;
	col: number;
}

function EditorLine({ line, isCursorRow, col }: EditorLineProps) {
	if (!isCursorRow) {
		return <Text color={colors.warmParchment}>{line.length === 0 ? " " : line}</Text>;
	}
	const before = line.slice(0, col);
	const at = line.slice(col, col + 1);
	const after = line.slice(col + 1);
	return (
		<Text color={colors.warmParchment}>
			{before}
			<Text inverse>{at.length > 0 ? at : " "}</Text>
			{after}
		</Text>
	);
}
