/** @type {import('next').NextConfig} */
const nextConfig = {
  // The app's chunks are served with CORS so JS Self-Profiling / LoAF
  // attribution can read their stacks; this is the documented option.
  crossOrigin: "anonymous",
};
export default nextConfig;
