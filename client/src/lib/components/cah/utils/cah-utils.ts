import type { CAHGameState, CAHPlayer } from '$lib/types';

export function getPhaseColor(phase: CAHGameState['phase']): string {
	switch (phase) {
		case 'waiting': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
		case 'selecting': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
		case 'judging': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
		case 'scoring': return 'bg-green-500/20 text-green-400 border-green-500/30';
		case 'game_over': return 'bg-red-500/20 text-red-400 border-red-500/30';
		default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
	}
}

export function getPhaseIcon(phase: CAHGameState['phase']): string {
	switch (phase) {
		case 'selecting': return 'check';
		case 'judging': return 'check-circle';
		case 'scoring': return 'star';
		case 'game_over': return 'x-circle';
		default: return 'question-mark-circle';
	}
}

export function getRankColor(rank: number): string {
	switch (rank) {
		case 1: return 'bg-yellow-500 text-black';
		case 2: return 'bg-slate-400 text-black';
		case 3: return 'bg-amber-600 text-white';
		default: return 'bg-slate-600 text-white';
	}
}

export function sortPlayersByScore(players: CAHPlayer[]): CAHPlayer[] {
	return [...players].sort((a, b) => b.score - a.score);
}

export function getPlayerInitials(name: string): string {
	return name.charAt(0).toUpperCase();
}

export function formatPhaseName(phase: CAHGameState['phase']): string {
	return phase.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}