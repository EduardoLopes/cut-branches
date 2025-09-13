import { commands, type AppError, type Result } from '$lib/bindings';

// Shared type utilities for Tauri commands
export type CommandName = keyof typeof commands;
export type CommandParams<T extends CommandName> = Parameters<(typeof commands)[T]>[0];
export type CommandResult<T extends CommandName> = Extract<
	Awaited<ReturnType<(typeof commands)[T]>>,
	{ status: 'ok' }
>['data'];

// Command execution utility
export async function executeCommand<T extends CommandName>(
	commandName: T,
	args?: CommandParams<T>
): Promise<CommandResult<T>> {
	const commandFn = commands[commandName];
	const result =
		args !== undefined
			? await (commandFn as (arg: CommandParams<T>) => unknown)(args)
			: await (commandFn as () => unknown)();

	if (result && typeof result === 'object' && 'status' in result) {
		const resultObj = result as Result<CommandResult<T>, AppError>;
		if (resultObj.status === 'ok') return resultObj.data;
		throw resultObj.error;
	}

	return result as CommandResult<T>;
}
