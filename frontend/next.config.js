/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_CONTRACT_ADDRESS: "0x5062F5D91E7F06f207F59331f87D107c71eB296C" },
};
module.exports = nextConfig;
