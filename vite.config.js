import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
  },
  preview: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        projects: 'pages/projects.html',
        contact: 'pages/contact.html',
        blogs: 'pages/blogs.html',
        about: 'pages/about.html',
      },
    },
  },
  plugins: [{
    name: 'rewrite-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urls = {
          '/about': '/pages/about.html',
          '/projects': '/pages/projects.html',
          '/contact': '/pages/contact.html',
          '/blogs': '/pages/blogs.html'
        };
        const rewrite = urls[req.url];
        if (rewrite) {
          req.url = rewrite;
        }
        next();
      });
    }
  }]
});
