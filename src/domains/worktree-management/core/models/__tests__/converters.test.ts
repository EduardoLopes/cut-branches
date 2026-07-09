import { describe, expect, it } from 'vitest';
import { WorktreeConverters } from '../converters';
import { Worktree } from '../worktree';
import type { Worktree as WorktreeData } from '$infrastructure/bindings';

function data(name: string): WorktreeData {
	return {
		name,
		path: `/repos/${name}`,
		branch: name,
		headSha: 'abc1234',
		isLocked: false,
		lockReason: null,
		isMain: false,
		isPrunable: false
	};
}

describe('WorktreeConverters', () => {
	it('converts a single DTO to a domain model and back', () => {
		const dto = data('wt1');
		const model = WorktreeConverters.fromData(dto);
		expect(model).toBeInstanceOf(Worktree);
		expect(model.getName()).toBe('wt1');
		expect(WorktreeConverters.toData(model)).toEqual(dto);
	});

	it('converts arrays in both directions', () => {
		const dtos = [data('wt1'), data('wt2')];
		const models = WorktreeConverters.fromDataArray(dtos);
		expect(models).toHaveLength(2);
		expect(models.every((m) => m instanceof Worktree)).toBe(true);
		expect(WorktreeConverters.toDataArray(models)).toEqual(dtos);
	});
});
