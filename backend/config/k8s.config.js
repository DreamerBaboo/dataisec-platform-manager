const config = {
  images: {
    // Default to environment variable or fallback to a default value
    busyboxImage: process.env.BUSYBOX_IMAGE || 'your-registry.com/busybox:latest'
  }
};

module.exports = config;
