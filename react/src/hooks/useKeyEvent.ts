import { useEffect, useCallback, useMemo } from "react";

/**
 * A keyboard combination to listen for.
 */
interface KeyCombination {
	/** Key names (`event.key`), compared case-insensitively, e.g. `['Control', 's']`. */
	keys: string[];
	/**
	 * When `true`, every key in {@link KeyCombination.keys} must be involved
	 * (all held for `keydown`, or the released key for `keyup`). When `false`,
	 * any single matching key triggers the action. Defaults to `false`.
	 */
	matchAll?: boolean;
}

/**
 * Props for the {@link useKeyEvent} hook.
 */
interface IEventProp {
	/** Callback invoked when the combination matches. The DOM event's default is prevented first. */
	returnedAction: () => void;
	/** DOM event to listen on. Defaults to `'keyup'`. */
	eventType?: keyof DocumentEventMap;
	/** The key combination to match. */
	combinations: KeyCombination;
}

/**
 * Runs an action when a keyboard key or key-combination is pressed.
 *
 * Adds a document-level listener for the lifetime of the component and removes
 * it on unmount.
 *
 * @param props - See {@link IEventProp}.
 * @param props.combinations - Keys to match, plus `matchAll` (default `false`).
 * @param props.eventType - DOM event name. Defaults to `'keyup'`.
 * @param props.returnedAction - Action to run on a match.
 *
 * @example
 * useKeyEvent({
 *   combinations: { keys: ['Control', 's'], matchAll: true },
 *   eventType: 'keydown',
 *   returnedAction: () => save(),
 * });
 */
export function useKeyEvent({
	combinations,
	eventType = "keyup",
	returnedAction,
}: IEventProp) {
	const pressedKeys = useMemo(() => new Set<string>(), []);

	const keysLower = useMemo(
		() => (combinations.keys || []).map(k => k.toLowerCase()),
		[combinations.keys]
	);

	const matchAll = combinations.matchAll ?? false;

	const handleListenedEvent = useCallback(
		(event: KeyboardEvent) => {
			const key = event.key.toLowerCase();

			if (eventType === "keydown") pressedKeys.add(key);
			if (eventType === "keyup") pressedKeys.delete(key);

			const match = matchAll
				? keysLower.every(k =>
					eventType === "keydown" ? pressedKeys.has(k) : k === key
				)
				: keysLower.includes(key);

			if (match) {
				event.preventDefault();
				returnedAction();
			}

			if (matchAll && eventType === "keyup") pressedKeys.clear();
		},
		[eventType, keysLower, matchAll, returnedAction, pressedKeys]
	);

	useEffect(() => {
		document.addEventListener(eventType, handleListenedEvent as any);
		return () => document.removeEventListener(eventType, handleListenedEvent as any);
	}, [eventType, handleListenedEvent]);
}
