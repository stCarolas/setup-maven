### How To Use

Add this step into workflow

```yaml
jobs:
  ...
  steps:

    - name: Set up Maven
      uses: stCarolas/setup-maven@v5
      with:
        maven-version: 3.8.2
```

### Development using [Docker](https://docs.docker.com/)

Clone this repository and build the project with command

```batch
docker run --rm -it -v "%PWD%:/usr/src/app" -w /usr/src/app node:12-alpine /bin/sh -c "npm i --no-bin-links && npm run format-check && npm run build"
```

**Note** that `%PWD%` is the project working directory in `Unix` format, such as: `/c/Users/source/repos/setup-maven`
