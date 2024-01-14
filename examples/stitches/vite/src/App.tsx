import { useState } from 'react';
import viteLogo from '/vite.svg';
import * as styles from './app.css';
import reactLogo from './assets/react.svg';

function App() {
	const [count, setCount] = useState(0);

	return (
		<>
			<div>
				<a href="https://vitejs.dev" target="_blank" rel="noreferrer">
					<img src={viteLogo} className={styles.logo()} alt="Vite logo" />
				</a>
				<a href="https://react.dev" target="_blank" rel="noreferrer">
					<img
						src={reactLogo}
						className={`${styles.logo()} ${styles.react()}`}
						alt="React logo"
					/>
				</a>
			</div>
			<h1>Vite + React</h1>
			<div className={styles.card()}>
				<button type="button" onClick={() => setCount((count) => count + 1)}>
					count is {count}
				</button>
				<p>
					Edit <code>src/App.tsx</code> and save to test HMR
				</p>
			</div>
			<p className={styles.readTheDocs()}>
				Click on the Vite and React logos to learn more
			</p>
		</>
	);
}

export default App;
