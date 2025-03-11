/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['angyi.oss-cn-beijing.aliyuncs.com']
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /leaflet.*\.png$/,
      use: [
        {
          loader: 'file-loader',
          options: {
            name: '[name].[ext]',
            outputPath: 'static/chunks/images'
          }
        }
      ]
    });
    return config;
  }
};

module.exports = nextConfig; 