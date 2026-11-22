const application = require('../config/application.json')
const [owner, repo] = new URL(application.repositoryUrl).pathname.slice(1).split('/')

module.exports = {
  extends: './electron-builder.yml',
  appId: application.appId,
  productName: application.productName,
  executableName: application.packageName,
  artifactName: '${name}-${version}-${os}-${arch}.${ext}',
  publish: [{ provider: 'github', owner, repo }],
  extraMetadata: {
    name: application.packageName,
    repository: { type: 'git', url: `${application.repositoryUrl}.git` }
  },
  nsis: { artifactName: '${name}-setup-${version}-${arch}.${ext}' },
  portable: { artifactName: '${name}-portable-${version}-${arch}.${ext}' }
}
