import { v4 } from 'uuid';

export async function load({ params }) {
	return {
		newgame_nhie_id: v4(),
		newgame_cah_id: v4()
	};
}
