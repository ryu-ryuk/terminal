import { resolve } from 'path';
import { defineConfig } from 'vite';

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
        main: resolve(__dirname, 'index.html'),
        projects: resolve(__dirname, 'projects.html'),
        contact: resolve(__dirname, 'contact.html'),
        blogs: resolve(__dirname, 'blogs.html'),
        about: resolve(__dirname, 'about.html'),
        404: resolve(__dirname, '404.html'),
      },
    },
  },
  plugins: [
    {
      name: 'rewrite-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const urls = {
            '/about': '/about.html',
            '/projects': '/projects.html',
            '/contact': '/contact.html',
            '/blogs': '/blogs.html',
            '/404': '/404.html',
            '/': '/index.html',
            '/index.html': '/index.html',
          };
          const rewrite = urls[req.url];
          if (rewrite) {
            req.url = rewrite;
          }
          next();
        });
      },
    },
  ],
});