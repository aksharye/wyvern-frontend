/** @type {import('tailwindcss').Config}*/
const config = {
	content: ['./src/**/*.{html,js,svelte,ts}'],

	theme: {
		extend: {
			scale: {
				'-100': '-1',
			}
		}
	},

	plugins: []
};

module.exports = config;
