import { v4 } from 'uuid';

export async function load({ params }) {
	return {
		newgame_id: v4()
	};
}
