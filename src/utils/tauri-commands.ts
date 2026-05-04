import { commands, type AppError, type Result } from '$infrastructure/bindings';

// Shared type utilities for Tauri commands
export type CommandName = keyof typeof commands;
export type CommandParams<T extends CommandName> = Parameters<(typeof commands)[T]>[0];
export type CommandResult<T extends CommandName> = Extract<
	Awaited<ReturnType<(typeof commands)[T]>>,
	{ status: 'ok' }
>['data'];

// Type guard for Result type with proper narrowing
function isResult(value: unknown): value is Result<unknown, AppError> {
	return (
		value !== null &&
		typeof value === 'object' &&
		'status' in value &&
		(value.status === 'ok' || value.status === 'error')
	);
}

// Type guard for successful Result
function isOkResult<T>(
	value: Result<unknown, AppError>
): value is Extract<Result<T, AppError>, { status: 'ok' }> {
	return value.status === 'ok';
}

// Type guard for command function
function isCommandFunction<T extends CommandName>(
	fn: unknown
): fn is (
	arg?: CommandParams<T>
) => Promise<Result<CommandResult<T>, AppError> | CommandResult<T>> {
	return typeof fn === 'function';
}

// Helper to build a command executor function
export function buildCommandExecutor<TCommand extends CommandName>(
	commandName: TCommand
): (args?: CommandParams<TCommand>) => Promise<CommandResult<TCommand>> {
	return (args?: CommandParams<TCommand>) => {
		if (args !== undefined) {
			return executeCommand(commandName, args);
		}
		return executeCommand(commandName);
	};
}

// Function overloads for executeCommand
export function executeCommand<T extends CommandName>(
	commandName: T,
	args: CommandParams<T>
): Promise<CommandResult<T>>;
export function executeCommand<T extends CommandName>(commandName: T): Promise<CommandResult<T>>;

// Implementation
export async function executeCommand<T extends CommandName>(
	commandName: T,
	args?: CommandParams<T>
): Promise<CommandResult<T>> {
	const commandFn = commands[commandName];

	// Validate command function exists
	if (!isCommandFunction<T>(commandFn)) {
		throw new Error(`Invalid command: ${commandName}`);
	}

	// Execute command with or without args
	const result = args !== undefined ? await commandFn(args) : await commandFn();

	// Type guard for Result type
	if (isResult(result)) {
		if (isOkResult<CommandResult<T>>(result)) {
			return result.data;
		}
		throw result.error;
	}

	// Direct return for non-Result types (already validated by type guard)
	if (result === null || result === undefined) {
		throw new Error(`Command ${commandName} returned invalid result`);
	}

	return result;
}
