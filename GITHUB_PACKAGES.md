# GitHub Packages Setup

## Publishing to GitHub Packages

### 1. Create Personal Access Token
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token with `packages:write` and `packages:read` scopes
3. Copy the token (you won't see it again)

### 2. Configure npm
```bash
# Add GitHub Packages registry to npm
npm config set @pwarnock:registry https://npm.pkg.github.com/

# Login to GitHub Packages
npm login --scope=@pwarnock --registry=https://npm.pkg.github.com/

# Username: your GitHub username
# Password: your personal access token
# Email: your GitHub email
```

### 3. Publish Package
```bash
cd packages/cody-beads-integration
npm publish
```

## Installing from GitHub Packages

### Option 1: With .npmrc
Create `.npmrc` in your project:
```
@pwarnock:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Then install:
```bash
npm install @pwarnock/cody-beads@0.5.0
```

### Option 2: Environment Variable
```bash
export GITHUB_TOKEN=your_token_here
npm config set //npm.pkg.github.com/:_authToken $GITHUB_TOKEN
npm install @pwarnock/cody-beads@0.5.0
```

## Benefits of GitHub Packages

✅ **Integrated with GitHub**: Same authentication as GitHub
✅ **Private by default**: Control who can access your packages
✅ **Free for public repos**: No cost for open source projects
✅ **npm-compatible**: Works with existing npm workflows
✅ **Automatic publishing**: Can automate with GitHub Actions

## Comparison

| Feature | GitHub Packages | Public npm |
|----------|------------------|------------|
| Privacy | Private by default | Public |
| Authentication | GitHub tokens | npm tokens |
| Cost | Free for public repos | Free |
| Discovery | GitHub only | npm search |
| CI/CD | GitHub Actions native | Multiple options |