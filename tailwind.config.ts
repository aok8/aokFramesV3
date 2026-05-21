import type { Config } from "tailwindcss";

const config: Config = {
	content: ["./src/**/*.{html,js,svelte,ts}"],
	theme: {
		extend: {
			colors: {
				"near-black":   "#0e0e0e",
				"forest-green": "#2D4739",
				"rosy-brown":   "#9B8384",
				"warm-white":   "#f0ebe3",
				silver:         "#c8c0b8",
				gold:           "#b8936a",
			},
			fontFamily: {
				display: ["Cormorant Garamond", "Georgia", "serif"],
				ui:      ["Josefin Sans", "sans-serif"],
			},
		},
	},
};

export default config;
