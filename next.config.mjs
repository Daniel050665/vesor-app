/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // PGlite (PostgreSQL embebido en WASM) y el driver de Postgres se cargan desde node_modules en el servidor.
    serverComponentsExternalPackages: ["@electric-sql/pglite", "postgres"],
  },
};

export default nextConfig;
