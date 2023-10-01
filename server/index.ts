import figlet from 'figlet';
import server from 'bunrest';
const app = server();

app.get('/', (req, res) => {
	res.send(figlet.textSync('Never Have I Ever', { horizontalLayout: 'full' }));
});

app.listen(3000, () => {
	console.log(`Server running at http://localhost:3000/`);
});
