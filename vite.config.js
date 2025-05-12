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
        projects: resolve(__dirname, 'pages/projects.html'),
        contact: resolve(__dirname, 'pages/contact.html'),
        blogs: resolve(__dirname, 'pages/blogs.html'),
        about: resolve(__dirname, 'pages/about.html'),
        404: resolve(__dirname, '404.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: ({ name }) => {
          // Move HTML files to root
          if (name && name.endsWith('.html')) {
            return name.replace(/^pages\//, '');
          }
          return 'assets/[name].[ext]';
        },
      },
    },
  },
  plugins: [
    {
      name: 'rewrite-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const urls = {
            '/about': '/pages/about.html',
            '/projects': '/pages/projects.html',
            '/contact': '/pages/contact.html',
            '/blogs': '/pages/blogs.html',
            '/404': '/pages/404.html',
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