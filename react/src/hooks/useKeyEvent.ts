import { useEffect, useCallback, useMemo } from "react";

/**
 * Represents a keyboard combination configuration.
 */
interface KeyCombination {
	keys: string[];
	matchAll?: boolean;
}

/**
 * Props for the `useKeyEvent` hook.
 */
interface IEventProp {
	returnedAction: () => void;
	eventType?: keyof DocumentEventMap;
	combinations: KeyCombination;
}

/**
 * React hook for listening to specific keyboard key combinations and executing an action.
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
