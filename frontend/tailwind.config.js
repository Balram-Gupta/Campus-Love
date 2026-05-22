export default {
  content: {
    relative: true,
    files: ["./index.html", "./src/**/*.{js,jsx}"]
  },
  theme: {
    extend: {
      colors: {
        campus: {
          ink: "#15202b",
          muted: "#647184",
          line: "#d9e0ea",
          paper: "#f6f8fb",
          teal: "#0b7a75",
          rose: "#d43d61",
          gold: "#a67510"
        }
      },
      boxShadow: {
        soft: "0 20px 60px rgba(21, 32, 43, 0.12)"
      }
    }
  },
  plugins: []
};
