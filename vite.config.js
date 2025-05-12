import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
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
  }
});
