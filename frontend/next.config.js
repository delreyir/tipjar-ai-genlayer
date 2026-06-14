/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_CONTRACT_ADDRESS: "0x504bca5b64a864cB1e327da7Cc260CA13830F514" },
};
module.exports = nextConfig;
