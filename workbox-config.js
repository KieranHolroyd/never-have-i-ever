const distDir = 'dist'

module.exports = {
    globDirectory: distDir,
    globPatterns: ['**/*.{js,css,svg}', '__app.html'],
    maximumFileSizeToCacheInBytes: 10000000, // 10 MB
};